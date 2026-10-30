// PostgreSQL data layer, using node-postgres ("pg") with plain SQL.
//
// The database runs in Docker (see docker-compose.yml). Tables and seed data are
// created by the SQL scripts in db/init/ the first time the container starts, so
// this file only talks to the database — it never creates or seeds anything.
//
//   npm run db:up      start Postgres
//   npm run db:reset   wipe everything and go back to the seed data (handy for QA)
//
// Every function here is async (returns a Promise), because pg talks to the
// database over the network — callers must `await` them.
//
// Column names are camelCase and must be "double-quoted" in SQL, otherwise
// Postgres folds them to lowercase (companyId -> companyid).

const path = require("path");
const { Pool } = require("pg");

// Load .env if it exists (Node 20.12+). On older Node, or without a .env, the
// default below is used — it matches docker-compose.yml.
try { process.loadEnvFile?.(path.join(__dirname, ".env")); } catch { /* no .env file */ }

const DATABASE_URL = process.env.DATABASE_URL || "postgres://vagalume:vagalume@localhost:5432/vagalume";

const pool = new Pool({ connectionString: DATABASE_URL });

// Without this, an idle client losing its connection (e.g. the container is
// restarted) would emit an unhandled "error" and crash the process.
pool.on("error", (err) => console.error("[db] idle client error:", err.message));

// NaN (e.g. Number("abc") from a URL) is not a valid Postgres value — send NULL,
// which is what SQLite used to store/compare for it.
const clean = (params) => params.map((p) => (typeof p === "number" && Number.isNaN(p) ? null : p));

// Ids come from the URL (/api/jobs/abc, /api/jobs/99999999999). Postgres would
// reject those with an error (500); SQLite just found nothing (404). toId() keeps
// the old behavior: anything that is not a valid INTEGER id matches no row.
const toId = (v) => (Number.isInteger(v) && v >= -2147483648 && v <= 2147483647 ? v : null);

async function many(sql, params = []) {
  const { rows } = await pool.query(sql, clean(params));
  return rows;
}
async function one(sql, params = []) {
  const { rows } = await pool.query(sql, clean(params));
  return rows[0] || null;
}
async function exec(sql, params = []) {
  const { rowCount } = await pool.query(sql, clean(params));
  return rowCount;
}

// ---------------------------------------------------------------------------
// Passwords (D-10, 10/17/2026): stored as a scrypt hash, never as plain text.
// Format: scrypt$<salt hex>$<hash hex>
// ---------------------------------------------------------------------------

const crypto = require("crypto");
const HASH_PREFIX = "scrypt$";

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(plain), salt, 64).toString("hex");
  return `${HASH_PREFIX}${salt}$${hash}`;
}
function isHashed(stored) {
  return typeof stored === "string" && stored.startsWith(HASH_PREFIX);
}
/** True when `plain` matches `stored`. A stored value still in plain text (an
 *  account inserted straight into the database) is compared as it is. */
function verifyPassword(stored, plain) {
  if (!isHashed(stored)) return stored === String(plain);
  const [, salt, hash] = stored.split("$");
  const expected = Buffer.from(hash, "hex");
  const actual = crypto.scryptSync(String(plain), salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

/** Fails fast with a readable message when Postgres is not reachable. */
async function ping() {
  await pool.query("SELECT 1");
}

/**
 * Small migrations for databases created before a schema change, so a reset is
 * not needed. Safe to run on every start.
 */
async function migrate() {
  // D-10 (10/17/2026): hash every password still stored in plain text (demo accounts included)
  const plainRows = (await pool.query("SELECT id, password FROM users WHERE password NOT LIKE 'scrypt$%'")).rows;
  for (const row of plainRows) {
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashPassword(row.password), row.id]);
  }
  // D-05 (10/17/2026): reviews belong to an account id, not to a name
  await pool.query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "authorId" INTEGER');
  // the three example reviews go to the example candidates (same as 02-seed.sql)
  const seedReviews = [
    [1, "ricardo@example.com"],
    [2, "fernanda@example.com"],
    [3, "ricardo@example.com"],
  ];
  for (const [reviewId, email] of seedReviews) {
    await pool.query(
      `UPDATE reviews r SET "authorId" = u.id, author = u.name
         FROM users u
        WHERE r.id = $1 AND r."authorId" IS NULL AND u.email = $2
          AND r.author IN ('Former employee', 'Interviewed candidate')`,
      [reviewId, email]
    );
  }
  // older reviews written by real accounts: link them when exactly one candidate has that name
  await pool.query(
    `UPDATE reviews r SET "authorId" = (SELECT u.id FROM users u WHERE u.name = r.author AND u.role = 'candidate')
      WHERE r."authorId" IS NULL
        AND (SELECT COUNT(*) FROM users u WHERE u.name = r.author AND u.role = 'candidate') = 1`
  );
}
async function close() {
  await pool.end();
}

// ---------------------------------------------------------------------------
// Row <-> API shape helpers
// ---------------------------------------------------------------------------

function pick(obj, keys) {
  const out = {};
  keys.forEach((k) => { if (obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}

function toReview(row) {
  if (!row) return null;
  return { ...row, wasEmployee: !!row.wasEmployee };
}

function toCourse(row) {
  if (!row) return null;
  // tags is JSONB, so pg already returns it as an array
  const { ratingAverage, ratingCount, tags, ...rest } = row;
  return { ...rest, rating: { average: ratingAverage, count: ratingCount }, tags: tags || [] };
}

function toOrder(row) {
  if (!row) return null;
  // items is JSONB, so pg already returns it as an array
  return { ...row, items: row.items || [] };
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

function companies() {
  return many("SELECT * FROM companies ORDER BY id");
}
function getCompany(id) {
  return one("SELECT * FROM companies WHERE id = $1", [toId(id)]);
}
function insertCompany({ name, sector, city, logo, description }) {
  return one(
    "INSERT INTO companies (name, sector, city, logo, description) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [name, sector, city, logo, description]
  );
}
const COMPANY_FIELDS = ["name", "sector", "city", "logo", "description"];
async function updateCompany(id, fields) {
  const current = await getCompany(id);
  if (!current) return null;
  const next = { ...current, ...pick(fields, COMPANY_FIELDS) };
  return one(
    "UPDATE companies SET name=$1, sector=$2, city=$3, logo=$4, description=$5 WHERE id=$6 RETURNING *",
    [next.name, next.sector, next.city, next.logo, next.description, id]
  );
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

function jobs() {
  return many("SELECT * FROM jobs ORDER BY id");
}
function getJob(id) {
  return one("SELECT * FROM jobs WHERE id = $1", [toId(id)]);
}
function insertJob(fields) {
  const j = {
    companyId: fields.companyId,
    title: fields.title,
    area: fields.area,
    seniority: fields.seniority || "Mid-level",
    contractType: fields.contractType || "Full-time",
    workModel: fields.workModel || "On-site",
    city: fields.city || "",
    salary: fields.salary || "Negotiable",
    status: fields.status || "open",
    description: fields.description || "",
    requirements: fields.requirements || "",
  };
  return one(
    `INSERT INTO jobs ("companyId", title, area, seniority, "contractType", "workModel", city, salary, status, description, requirements)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [j.companyId, j.title, j.area, j.seniority, j.contractType, j.workModel, j.city, j.salary, j.status, j.description, j.requirements]
  );
}
const JOB_FIELDS = ["title", "area", "seniority", "contractType", "workModel", "city", "salary", "status", "description", "requirements"];
async function updateJob(id, fields) {
  const current = await getJob(id);
  if (!current) return null;
  const next = { ...current, ...pick(fields, JOB_FIELDS) };
  return one(
    `UPDATE jobs SET title=$1, area=$2, seniority=$3, "contractType"=$4, "workModel"=$5, city=$6, salary=$7, status=$8, description=$9, requirements=$10
     WHERE id=$11 RETURNING *`,
    [next.title, next.area, next.seniority, next.contractType, next.workModel, next.city, next.salary, next.status, next.description, next.requirements, id]
  );
}
async function deleteJob(id) {
  return (await exec("DELETE FROM jobs WHERE id = $1", [toId(id)])) > 0;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

function users() {
  return many("SELECT * FROM users ORDER BY id");
}
function getUser(id) {
  return one("SELECT * FROM users WHERE id = $1", [toId(id)]);
}
function getUserByEmail(email) {
  return one("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
}
function insertUser({ name, email, password, role, city, companyId }) {
  return one(
    `INSERT INTO users (name, email, password, role, city, "companyId") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, email, password, role, city ?? null, companyId ?? null]
  );
}
async function updateUser(id, fields) {
  const current = await getUser(id);
  if (!current) return null;
  const next = { ...current, ...fields };
  return one(
    `UPDATE users SET name=$1, city=$2, password=$3, "resumeUrl"=$4 WHERE id=$5 RETURNING *`,
    [next.name, next.city, next.password, next.resumeUrl, id]
  );
}

// ---------------------------------------------------------------------------
// Experiences
// ---------------------------------------------------------------------------

function experiencesByUser(userId) {
  return many(`SELECT * FROM experiences WHERE "userId" = $1 ORDER BY id`, [toId(userId)]);
}
function getExperience(id) {
  return one("SELECT * FROM experiences WHERE id = $1", [toId(id)]);
}
function insertExperience({ userId, company, role, startDate, endDate, description }) {
  return one(
    `INSERT INTO experiences ("userId", company, role, "startDate", "endDate", description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, company, role, startDate || null, endDate || null, description || ""]
  );
}
const EXPERIENCE_FIELDS = ["company", "role", "startDate", "endDate", "description"];
async function updateExperience(id, fields) {
  const current = await getExperience(id);
  if (!current) return null;
  const next = { ...current, ...pick(fields, EXPERIENCE_FIELDS) };
  return one(
    `UPDATE experiences SET company=$1, role=$2, "startDate"=$3, "endDate"=$4, description=$5 WHERE id=$6 RETURNING *`,
    [next.company, next.role, next.startDate, next.endDate, next.description, id]
  );
}
async function deleteExperience(id) {
  return (await exec("DELETE FROM experiences WHERE id = $1", [toId(id)])) > 0;
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

async function getPreferences(userId) {
  const row = await one(`SELECT * FROM preferences WHERE "userId" = $1`, [toId(userId)]);
  if (!row) return {};
  const { userId: _drop, ...rest } = row;
  return rest;
}
async function setPreferences(userId, fields) {
  const current = await getPreferences(userId);
  const next = { ...current, ...fields };
  await exec(
    `INSERT INTO preferences ("userId", area, seniority, "workModel", "minSalary", availability) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT ("userId") DO UPDATE SET area=EXCLUDED.area, seniority=EXCLUDED.seniority, "workModel"=EXCLUDED."workModel",
       "minSalary"=EXCLUDED."minSalary", availability=EXCLUDED.availability`,
    [userId, next.area ?? null, next.seniority ?? null, next.workModel ?? null, next.minSalary ?? null, next.availability ?? null]
  );
  return getPreferences(userId);
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

function applications() {
  return many("SELECT * FROM applications ORDER BY id");
}
function applicationsByUser(userId) {
  return many(`SELECT * FROM applications WHERE "userId" = $1`, [toId(userId)]);
}
function applicationsByJob(jobId) {
  return many(`SELECT * FROM applications WHERE "jobId" = $1`, [toId(jobId)]);
}
function getApplication(id) {
  return one("SELECT * FROM applications WHERE id = $1", [toId(id)]);
}
async function hasApplied(jobId, userId) {
  return !!(await one(`SELECT 1 FROM applications WHERE "jobId" = $1 AND "userId" = $2`, [toId(jobId), toId(userId)]));
}
function insertApplication({ jobId, userId, status, appliedAt }) {
  return one(
    `INSERT INTO applications ("jobId", "userId", status, "appliedAt") VALUES ($1, $2, $3, $4) RETURNING *`,
    [jobId, userId, status, appliedAt]
  );
}
function updateApplicationStatus(id, status) {
  return one("UPDATE applications SET status = $1 WHERE id = $2 RETURNING *", [status, toId(id)]);
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

async function reviewsByJob(jobId) {
  return (await many(`SELECT * FROM reviews WHERE "jobId" = $1 ORDER BY "createdAt" DESC`, [toId(jobId)])).map(toReview);
}
async function reviewsByCompany(companyId) {
  return (await many(`SELECT * FROM reviews WHERE "companyId" = $1 ORDER BY "createdAt" DESC`, [toId(companyId)])).map(toReview);
}
async function reviewsByAuthorId(authorId) {
  // D-05 (10/17/2026): by account id, so a rename or a namesake does not change the list
  return (await many(`SELECT * FROM reviews WHERE "authorId" = $1 ORDER BY "createdAt" DESC, id DESC`, [toId(authorId)])).map(toReview);
}
async function reviewsByAuthor(author) {
  // Decision of 10/17/2026: newest first, like the other review lists
  return (await many(`SELECT * FROM reviews WHERE author = $1 ORDER BY "createdAt" DESC, id DESC`, [author])).map(toReview);
}
async function allReviews() {
  return (await many("SELECT * FROM reviews ORDER BY id")).map(toReview);
}
async function getReview(id) {
  return toReview(await one("SELECT * FROM reviews WHERE id = $1", [toId(id)]));
}
async function insertReview({ jobId, companyId, authorId, author, rating, comment, wasEmployee, createdAt }) {
  return toReview(
    await one(
      `INSERT INTO reviews ("jobId", "companyId", "authorId", author, rating, comment, "wasEmployee", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [jobId, companyId, authorId, author, rating, comment, !!wasEmployee, createdAt]
    )
  );
}
async function deleteReview(id) {
  return (await exec("DELETE FROM reviews WHERE id = $1", [toId(id)])) > 0;
}

// ---------------------------------------------------------------------------
// Followed companies
// ---------------------------------------------------------------------------

async function followedCompanyIds(userId) {
  return (await many(`SELECT "companyId" FROM followed_companies WHERE "userId" = $1`, [toId(userId)])).map((r) => r.companyId);
}
async function isFollowing(userId, companyId) {
  return !!(await one(`SELECT 1 FROM followed_companies WHERE "userId" = $1 AND "companyId" = $2`, [toId(userId), toId(companyId)]));
}
async function followCompany(userId, companyId) {
  await exec(`INSERT INTO followed_companies ("userId", "companyId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [toId(userId), toId(companyId)]);
}
async function unfollowCompany(userId, companyId) {
  await exec(`DELETE FROM followed_companies WHERE "userId" = $1 AND "companyId" = $2`, [toId(userId), toId(companyId)]);
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

async function courses() {
  return (await many("SELECT * FROM courses ORDER BY id")).map(toCourse);
}
async function getCourse(id) {
  return toCourse(await one("SELECT * FROM courses WHERE id = $1", [toId(id)]));
}
async function deleteCourse(id) {
  return (await exec("DELETE FROM courses WHERE id = $1", [toId(id)])) > 0;
}

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

function enrollmentsByUser(userId) {
  return many(`SELECT * FROM enrollments WHERE "userId" = $1`, [toId(userId)]);
}
async function enrolledCourseIds(userId) {
  return (await many(`SELECT "courseId" FROM enrollments WHERE "userId" = $1`, [toId(userId)])).map((r) => r.courseId);
}
async function insertEnrollment({ userId, courseId, pricePaid, purchasedAt }) {
  await exec(
    `INSERT INTO enrollments ("userId", "courseId", "pricePaid", "purchasedAt") VALUES ($1, $2, $3, $4)`,
    [userId, courseId, pricePaid, purchasedAt]
  );
}

// ---------------------------------------------------------------------------
// Course orders
// ---------------------------------------------------------------------------

async function courseOrders() {
  return (await many("SELECT * FROM course_orders ORDER BY id DESC")).map(toOrder);
}
async function ordersByUser(userId) {
  return (await many(`SELECT * FROM course_orders WHERE "userId" = $1 ORDER BY id DESC`, [toId(userId)])).map(toOrder);
}
async function getOrder(id, userId) {
  return toOrder(await one(`SELECT * FROM course_orders WHERE id = $1 AND "userId" = $2`, [toId(id), toId(userId)]));
}
async function insertOrder({ userId, items, paymentMethod, subtotal, discount, total, status, createdAt }) {
  return toOrder(
    await one(
      `INSERT INTO course_orders ("userId", items, "paymentMethod", subtotal, discount, total, status, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, JSON.stringify(items), paymentMethod, subtotal, discount, total, status, createdAt]
    )
  );
}

// ---------------------------------------------------------------------------

const COURSE_COUPONS = { STUDENT10: 0.1, LAUNCH20: 0.2, CAREER5: 0.05 };
const DEMO_ADMIN = { username: "admin", password: "admin123" }; // used for /admin (HTTP Basic Auth)

module.exports = {
  pool, ping, migrate, close, DATABASE_URL, hashPassword, isHashed, verifyPassword,
  companies, getCompany, insertCompany, updateCompany,
  jobs, getJob, insertJob, updateJob, deleteJob,
  users, getUser, getUserByEmail, insertUser, updateUser,
  experiencesByUser, getExperience, insertExperience, updateExperience, deleteExperience,
  getPreferences, setPreferences,
  applications, applicationsByUser, applicationsByJob, getApplication, hasApplied, insertApplication, updateApplicationStatus,
  reviewsByJob, reviewsByCompany, reviewsByAuthor, reviewsByAuthorId, allReviews, getReview, insertReview, deleteReview,
  followedCompanyIds, isFollowing, followCompany, unfollowCompany,
  courses, getCourse, deleteCourse,
  enrollmentsByUser, enrolledCourseIds, insertEnrollment,
  courseOrders, ordersByUser, getOrder, insertOrder,
  COURSE_COUPONS, DEMO_ADMIN,
};
