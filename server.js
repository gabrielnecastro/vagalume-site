const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");

const db = require("./database");

// Express 4 does not catch errors thrown inside async handlers: a failed database
// query would leave the request hanging forever. ah() forwards them to the
// error handler at the bottom of this file (JSON 500 for /api, plain text otherwise).
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Safety net: without this, ANY unhandled async error somewhere in the app
// (a rejected promise, an "error" event with no listener, etc.) brings down the whole process and
// you'd have to restart the server by hand. Here we just log and keep running — better for a
// test environment that stays in use all the time than "crash and die" on every little error.
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException] the server is still running, but this shouldn't have happened:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection] the server is still running, but this shouldn't have happened:", reason);
});

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = "vagalume-qa-playground-secret"; // for testing only, never use in production

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// User text is stored without HTML tags.
// Removes tags such as <b> or </p> (a "<" followed by a letter or "/") and HTML comments;
// a lone "<" or ">" (e.g. "salary > 5k") is kept.
function stripTags(value) {
  if (typeof value !== "string") return value;
  return value.replace(/<!--[\s\S]*?-->/g, "").replace(/<\/?[a-zA-Z][^>]*>/g, "");
}

// Removes HTML tags from the listed text fields of an object, in place.
const JOB_TEXT_FIELDS = ["title", "area", "seniority", "contractType", "workModel", "city", "salary", "description", "requirements"];
const COMPANY_TEXT_FIELDS = ["name", "sector", "city", "description", "logo"];
function stripTextFields(obj, keys) {
  keys.forEach((k) => { if (typeof obj[k] === "string") obj[k] = stripTags(obj[k]); });
  return obj;
}

// No text field accepts only spaces, on screen or in the API.
const isBlank = (value) => typeof value === "string" && value.trim() === "";
const onlySpaces = (value) => typeof value === "string" && value.length > 0 && value.trim() === "";
const SPACES_MESSAGE = "This field can't contain only spaces";
// A password cannot contain spaces.
const PASSWORD_SPACES_MESSAGE = "The password can't contain spaces";

// Experience dates use yyyy-mm (month 01-12), and the end is not before the start.
function experienceDateError(startDate, endDate) {
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (startDate && !ym.test(startDate)) return { field: "startDate", message: "Use the format yyyy-mm" };
  if (endDate && !ym.test(endDate)) return { field: "endDate", message: "Use the format yyyy-mm" };
  if (startDate && endDate && endDate < startDate) return { field: "endDate", message: "End date must be after the start date" };
  return null;
}

function paginate(array, page, limit) {
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const start = (p - 1) * l;
  const items = array.slice(start, start + l);
  return { items, meta: { page: p, limit: l, total: array.length, totalPages: Math.max(Math.ceil(array.length / l), 1) } };
}

function signSession(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

// Builds the session check; `status` is the HTTP code returned when there is no valid session.
function authWithStatus(status) {
  return async function (req, res, next) {
    const token = req.cookies && req.cookies.session;
    if (!token) return res.status(status).json({ error: "not_authenticated", message: "Please log in to continue" });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await db.getUser(payload.sub);
      if (!user) return res.status(status).json({ error: "not_authenticated" });
      req.currentUser = user;
    } catch (err) {
      if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError" || err.name === "NotBeforeError") {
        return res.status(status).json({ error: "invalid_session", message: "Invalid or expired session" });
      }
      return next(err); // database error — not the user's fault, don't pretend the session is invalid
    }
    next();
  };
}
// A visitor gets 401 on any action that requires an account; 403 is only for a signed-in user with the wrong account type.
const requireAuth = authWithStatus(401);

function requireRole(role) {
  return (req, res, next) => {
    if (req.currentUser.role !== role) {
      return res.status(403).json({ error: "forbidden", message: `Only "${role}" accounts can access this` });
    }
    next();
  };
}

function basicAuthMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const [user, pass] = Buffer.from(encoded, "base64").toString().split(":");
    if (user === db.DEMO_ADMIN.username && pass === db.DEMO_ADMIN.password) {
      req.adminUser = user;
      return next();
    }
  }
  res.set("WWW-Authenticate", 'Basic realm="Vagalume Admin"');
  return res.status(401).send("Authentication required (Basic Auth)");
}

const rateBuckets = new Map();
function checkRateLimit(key, max, windowMs) {
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  rateBuckets.set(key, recent);
  return { limited: recent.length > max, remaining: Math.max(max - recent.length, 0) };
}

async function jobWithCompany(job) {
  if (!job) return null;
  const company = await db.getCompany(job.companyId);
  return { ...job, company: company ? { id: company.id, name: company.name, logo: company.logo, city: company.city } : null };
}

async function companyRating(companyId) {
  const items = await db.reviewsByCompany(companyId);
  if (!items.length) return { average: null, count: 0 };
  // The average always rounds up to 1 decimal place (4.21 -> 4.3, 4.333 -> 4.4).
  // toFixed(6) removes floating-point noise first, so an exact 4.3 stays 4.3.
  const raw = items.reduce((s, r) => s + r.rating, 0) / items.length;
  const average = Math.ceil(Number((raw * 10).toFixed(6))) / 10;
  return { average, count: items.length };
}

// ---------------------------------------------------------------------------
// Admin panel (Basic Auth) — static files live outside /public on purpose
// ---------------------------------------------------------------------------

app.use("/admin", basicAuthMiddleware, express.static(path.join(__dirname, "admin")));

app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------------
// API documentation (Swagger UI), built from openapi.yaml
// ---------------------------------------------------------------------------

app.get("/openapi.yaml", (req, res) => res.type("text/yaml").sendFile(path.join(__dirname, "openapi.yaml")));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(null, { customSiteTitle: "Vagalume API", swaggerOptions: { url: "/openapi.yaml" } }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Authentication (httpOnly cookie) — candidate or employer
// ---------------------------------------------------------------------------

app.post("/api/auth/register", ah(async (req, res) => {
  const { email, password, role, city, companyName, acceptTerms } = req.body || {};
  const name = stripTags((req.body || {}).name);
  if (!name || isBlank(name) || !email || !password || !role) {
    return res.status(422).json({ error: "validation_error", message: "Name, email, password, and account type are required" });
  }
  if (!["candidate", "employer"].includes(role)) {
    return res.status(422).json({ error: "validation_error", message: "Invalid account type" });
  }
  // Same rules the screen already enforces.
  // The format requires something@domain.ext, which also rejects an email with spaces.
  if (!/^\S+@\S+\.\S+$/.test(String(email))) {
    return res.status(422).json({ error: "invalid_email_format", message: "Please enter a valid email address" });
  }
  if (String(password).length < 6) {
    return res.status(422).json({ error: "validation_error", message: "The password must be at least 6 characters long" });
  }
  if (/\s/.test(String(password))) {
    return res.status(422).json({ error: "validation_error", message: PASSWORD_SPACES_MESSAGE });
  }
  if (onlySpaces(city)) {
    return res.status(422).json({ error: "validation_error", field: "city", message: SPACES_MESSAGE });
  }
  if (acceptTerms !== true) {
    return res.status(422).json({ error: "validation_error", message: "You need to accept the terms" });
  }
  if (await db.getUserByEmail(email)) {
    return res.status(409).json({ error: "email_in_use", message: "An account with this email already exists" });
  }

  let companyId;
  if (role === "candidate") {
    // no company
  } else {
    // HTML tags are removed from the company name and city
    const cleanCompanyName = stripTags(companyName);
    const cleanCity = stripTags(city);
    if (!cleanCompanyName || isBlank(cleanCompanyName)) return res.status(422).json({ error: "validation_error", message: "Please provide the company name" });
    const company = await db.insertCompany({ name: cleanCompanyName, sector: "Not specified", city: cleanCity || "Not specified", logo: "/img/logos/default.svg", description: "" });
    companyId = company.id;
  }
  // Only the hash is stored
  const user = await db.insertUser({ name, email, password: db.hashPassword(password), role, city: role === "candidate" ? city || "" : null, companyId });
  res.cookie("session", signSession(user), { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 3600 * 1000 });
  res.status(201).json({ data: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId } });
}));

app.post("/api/auth/login", ah(async (req, res) => {
  const { email, password, remember } = req.body || {};
  const emailStr = String(email || ""); // no trim: an email with spaces is rejected
  const passStr = String(password || "");
  if (!emailStr && !passStr) {
    return res.status(422).json({ error: "missing_credentials", message: "Please enter your email and password" });
  }
  if (!emailStr) {
    return res.status(422).json({ error: "missing_email", message: "Please enter your email" });
  }
  if (!passStr) {
    return res.status(422).json({ error: "missing_password", message: "Please enter your password" });
  }
  if (!/^\S+@\S+\.\S+$/.test(emailStr)) {
    return res.status(422).json({ error: "invalid_email_format", message: "Please enter a valid email address" });
  }
  const user = await db.getUserByEmail(emailStr);
  if (!user) {
    return res.status(401).json({ error: "user_not_found", message: "No account found with this email" });
  }
  if (!db.verifyPassword(user.password, passStr)) {
    return res.status(401).json({ error: "wrong_password", message: "Incorrect password" });
  }
  // An account inserted straight into the database with a plain-text password is hashed on its first sign-in
  if (!db.isHashed(user.password)) await db.updateUser(user.id, { password: db.hashPassword(passStr) });
  const maxAge = remember ? 7 * 24 * 3600 * 1000 : undefined; // 7 days, the same lifetime as the JWT
  res.cookie("session", signSession(user), { httpOnly: true, sameSite: "lax", maxAge });
  res.json({ data: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId } });
}));

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("session");
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const u = req.currentUser;
  res.json({ data: { id: u.id, name: u.name, email: u.email, role: u.role, city: u.city, companyId: u.companyId, resumeUrl: u.resumeUrl || null } });
});

app.patch("/api/users/me", requireAuth, ah(async (req, res) => {
  const { city, currentPassword, newPassword, confirmPassword } = req.body || {};
  const name = stripTags((req.body || {}).name);
  const u = req.currentUser;
  const fields = {};
  // A blank name or one with only spaces is rejected
  if (name !== undefined && (name === null || isBlank(String(name)))) {
    return res.status(422).json({ error: "validation_error", field: "name", message: "Name is required" });
  }
  if (onlySpaces(city)) {
    return res.status(422).json({ error: "validation_error", field: "city", message: SPACES_MESSAGE });
  }
  if (newPassword) {
    if (!db.verifyPassword(u.password, currentPassword ?? "")) {
      return res.status(422).json({ error: "validation_error", message: "Current password is incorrect" });
    }
    if (String(newPassword).length < 6) {
      return res.status(422).json({ error: "validation_error", message: "The new password must be at least 6 characters long" });
    }
    if (/\s/.test(String(newPassword))) {
      return res.status(422).json({ error: "validation_error", message: PASSWORD_SPACES_MESSAGE });
    }
    if (confirmPassword !== newPassword) {
      // The new password must be confirmed
      return res.status(422).json({ error: "validation_error", message: "Passwords don't match" });
    }
    fields.password = db.hashPassword(newPassword); // Only the hash is stored
  }
  if (name) fields.name = name;
  if (city !== undefined) fields.city = city;
  const updated = await db.updateUser(u.id, fields);
  res.json({ data: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, city: updated.city, companyId: updated.companyId, resumeUrl: updated.resumeUrl || null } });
}));

app.get("/basic-auth", basicAuthMiddleware, (req, res) => {
  res.send(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Basic Auth OK</title></head>` +
      `<body style="font-family:sans-serif;padding:40px"><h1 data-testid="basic-auth-success">Successfully authenticated via Basic Auth!</h1>` +
      `<p>User: ${req.adminUser}</p><a href="/">Back to Vagalume</a></body></html>`
  );
});

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

app.get("/api/companies", ah(async (req, res) => {
  const items = await Promise.all((await db.companies()).map(async (c) => ({ ...c, rating: await companyRating(c.id) })));
  res.json({ data: items });
}));

app.get("/api/companies/:id", ah(async (req, res) => {
  const company = await db.getCompany(Number(req.params.id));
  if (!company) return res.status(404).json({ error: "not_found", message: "Company not found" });
  res.json({ data: { ...company, rating: await companyRating(company.id) } });
}));

app.get("/api/companies/:id/jobs", ah(async (req, res) => {
  const items = await Promise.all((await db.jobs()).filter((j) => j.companyId === Number(req.params.id)).map(jobWithCompany));
  res.json({ data: items });
}));

app.get("/api/companies/:id/reviews", ah(async (req, res) => {
  const items = await db.reviewsByCompany(Number(req.params.id));
  res.json({ data: items });
}));

app.put("/api/companies/:id", requireAuth, requireRole("employer"), ah(async (req, res) => {
  const company = await db.getCompany(Number(req.params.id));
  if (!company) return res.status(404).json({ error: "not_found" });
  if (company.id !== req.currentUser.companyId) return res.status(403).json({ error: "forbidden", message: "You can only edit your own company" });
  const fields = stripTextFields({ ...(req.body || {}) }, COMPANY_TEXT_FIELDS);
  if (fields.name !== undefined && (!fields.name || isBlank(fields.name))) {
    return res.status(422).json({ error: "validation_error", message: "Please provide the company name" });
  }
  const updated = await db.updateCompany(company.id, fields);
  res.json({ data: updated });
}));

app.post("/api/companies/:id/follow", requireAuth, requireRole("candidate"), ah(async (req, res) => {
  const companyId = Number(req.params.id);
  if (!await db.getCompany(companyId)) return res.status(404).json({ error: "not_found" });
  await db.followCompany(req.currentUser.id, companyId);
  res.status(201).json({ ok: true });
}));

app.delete("/api/companies/:id/follow", requireAuth, requireRole("candidate"), ah(async (req, res) => {
  await db.unfollowCompany(req.currentUser.id, Number(req.params.id));
  res.status(204).end();
}));

app.get("/api/users/me/followed-companies", requireAuth, ah(async (req, res) => {
  const ids = await db.followedCompanyIds(req.currentUser.id);
  const items = await Promise.all((await db.companies()).filter((c) => ids.includes(c.id)).map(async (c) => ({ ...c, rating: await companyRating(c.id) })));
  res.json({ data: items });
}));

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

app.get("/api/jobs", ah(async (req, res) => {
  let items = await Promise.all((await db.jobs()).map(jobWithCompany));
  const { q, area, seniority, contractType, workModel, city, companyId, status, sort, order } = req.query;

  // A limit or page that is not a whole number or is out of range returns 422.
  const { page: pageParam, limit: limitParam } = req.query;
  if (limitParam !== undefined && (!/^\d+$/.test(String(limitParam)) || Number(limitParam) < 1 || Number(limitParam) > 100)) {
    return res.status(422).json({ error: "validation_error", message: "limit must be a whole number from 1 to 100" });
  }
  if (pageParam !== undefined && (!/^\d+$/.test(String(pageParam)) || Number(pageParam) < 1)) {
    return res.status(422).json({ error: "validation_error", message: "page must be a whole number greater than or equal to 1" });
  }

  items = items.filter((j) => (status === "all" ? true : status ? j.status === status : j.status === "open"));
  // The search ignores spaces around the term, like the screen.
  const needle = q ? String(q).trim().toLowerCase() : "";
  if (needle) {
    items = items.filter((j) => j.title.toLowerCase().includes(needle) || j.description.toLowerCase().includes(needle) || (j.company && j.company.name.toLowerCase().includes(needle)));
  }
  if (area) items = items.filter((j) => j.area === area);
  if (seniority) items = items.filter((j) => j.seniority === seniority);
  if (contractType) items = items.filter((j) => j.contractType === contractType);
  if (workModel) items = items.filter((j) => j.workModel === workModel);
  if (city) items = items.filter((j) => j.city === city);
  if (companyId) items = items.filter((j) => j.companyId === Number(companyId));

  if (sort && items.length && sort in items[0]) {
    const dir = order === "desc" ? -1 : 1;
    items.sort((a, b) => (a[sort] > b[sort] ? dir : a[sort] < b[sort] ? -dir : 0));
  } else {
    items.sort((a, b) => b.id - a.id);
  }

  const { items: pageItems, meta } = paginate(items, req.query.page, req.query.limit);
  res.json({ data: pageItems, meta });
}));

app.get("/api/jobs/:id", ah(async (req, res) => {
  const job = await db.getJob(Number(req.params.id));
  if (!job) return res.status(404).json({ error: "not_found", message: "Job not found" });
  res.json({ data: await jobWithCompany(job) });
}));

app.post("/api/jobs", requireAuth, requireRole("employer"), ah(async (req, res) => {
  const body = stripTextFields({ ...(req.body || {}) }, JOB_TEXT_FIELDS);
  if (!body.title || !body.area || isBlank(body.title) || isBlank(body.area)) return res.status(422).json({ error: "validation_error", message: "Required fields: title, area" });
  // Requirements are optional, but requirements with only spaces are rejected, like any optional field.
  if (onlySpaces(body.requirements)) return res.status(422).json({ error: "validation_error", field: "requirements", message: SPACES_MESSAGE });
  if (typeof body.requirements === "string") body.requirements = body.requirements.trim();
  const job = await db.insertJob({ ...body, companyId: req.currentUser.companyId });
  res.status(201).json({ data: await jobWithCompany(job) });
}));

app.put("/api/jobs/:id", requireAuth, requireRole("employer"), ah(async (req, res) => {
  const job = await db.getJob(Number(req.params.id));
  if (!job) return res.status(404).json({ error: "not_found" });
  if (job.companyId !== req.currentUser.companyId) return res.status(403).json({ error: "forbidden", message: "You can only edit jobs posted by your company" });
  const fields = stripTextFields({ ...(req.body || {}) }, JOB_TEXT_FIELDS);
  if ((fields.title !== undefined && (!fields.title || isBlank(fields.title))) || (fields.area !== undefined && (!fields.area || isBlank(fields.area)))) {
    return res.status(422).json({ error: "validation_error", message: "Required fields: title, area" });
  }
  // Requirements are optional, but requirements with only spaces are rejected, like any optional field.
  if (onlySpaces(fields.requirements)) return res.status(422).json({ error: "validation_error", field: "requirements", message: SPACES_MESSAGE });
  if (typeof fields.requirements === "string") fields.requirements = fields.requirements.trim();
  const updated = await db.updateJob(job.id, fields);
  res.json({ data: await jobWithCompany(updated) });
}));

app.delete("/api/jobs/:id", requireAuth, requireRole("employer"), ah(async (req, res) => {
  const job = await db.getJob(Number(req.params.id));
  if (!job) return res.status(404).json({ error: "not_found" });
  if (job.companyId !== req.currentUser.companyId) return res.status(403).json({ error: "forbidden" });
  await db.deleteJob(job.id);
  res.status(204).end();
}));

// old job that "moved" — classic redirect scenario
// The legacy address redirects only a whole job id (1 or more); anything else is a page that does not exist.
app.get("/vaga-antiga/:id", (req, res, next) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) return next();
  res.redirect(302, `/pages/vaga.html?id=${req.params.id}`);
});

// ---------------------------------------------------------------------------
// Reviews (of a job/company, written by candidates or former employees)
// ---------------------------------------------------------------------------

app.get("/api/jobs/:id/reviews", ah(async (req, res) => {
  const items = await db.reviewsByJob(Number(req.params.id));
  res.json({ data: items });
}));

app.post("/api/jobs/:id/reviews", requireAuth, requireRole("candidate"), ah(async (req, res) => {
  const jobId = Number(req.params.id);
  const job = await db.getJob(jobId);
  if (!job) return res.status(404).json({ error: "not_found", message: "Job not found" });
  const { rating, wasEmployee } = req.body || {};
  const comment = stripTags((req.body || {}).comment);
  if (!rating || !comment || isBlank(comment)) return res.status(422).json({ error: "validation_error", message: "Rating and comment are required" });
  // Only a whole number from 1 to 5, the same range as the stars on screen
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5 || typeof rating === "boolean") {
    return res.status(422).json({ error: "validation_error", field: "rating", message: "The rating must be a whole number from 1 to 5" });
  }
  // One review per candidate per job; after deleting it, the candidate can review the job again
  const mine = await db.reviewsByAuthorId(req.currentUser.id);
  if (mine.some((r) => r.jobId === jobId)) {
    return res.status(409).json({ error: "already_reviewed", message: "You have already reviewed this job" });
  }
  const review = await db.insertReview({
    jobId,
    companyId: job.companyId,
    authorId: req.currentUser.id,
    author: req.currentUser.name,
    rating: Number(rating),
    comment,
    wasEmployee: !!wasEmployee,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ data: review });
}));

app.get("/api/users/me/reviews", requireAuth, ah(async (req, res) => {
  res.json({ data: await db.reviewsByAuthorId(req.currentUser.id) });
}));

app.delete("/api/reviews/:id", requireAuth, ah(async (req, res) => {
  const review = await db.getReview(Number(req.params.id));
  if (!review) return res.status(404).json({ error: "not_found" });
  // Ownership by account id, not by name
  if (review.authorId !== req.currentUser.id) return res.status(403).json({ error: "forbidden", message: "You can only delete your own reviews" });
  await db.deleteReview(review.id);
  res.status(204).end();
}));

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

app.post("/api/jobs/:id/apply", requireAuth, requireRole("candidate"), ah(async (req, res) => {
  const jobId = Number(req.params.id);
  const job = await db.getJob(jobId);
  if (!job) return res.status(404).json({ error: "not_found", message: "Job not found" });
  // A job that is not open does not accept applications, as the FAQ says.
  if (job.status !== "open") {
    return res.status(409).json({ error: "job_closed", message: "This job is no longer accepting applications." });
  }
  if (await db.hasApplied(jobId, req.currentUser.id)) {
    return res.status(409).json({ error: "already_applied", message: "You have already applied to this job" });
  }
  const application = await db.insertApplication({ jobId, userId: req.currentUser.id, status: "received", appliedAt: new Date().toISOString() });
  res.status(201).json({ data: application });
}));

app.get("/api/applications/me", requireAuth, requireRole("candidate"), ah(async (req, res) => {
  const items = (
    await Promise.all(
      (await db.applicationsByUser(req.currentUser.id)).map(async (a) => ({ ...a, job: await jobWithCompany(await db.getJob(a.jobId)) }))
    )
  ).sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
  res.json({ data: items });
}));

app.get("/api/jobs/:id/applications", requireAuth, requireRole("employer"), ah(async (req, res) => {
  const job = await db.getJob(Number(req.params.id));
  if (!job) return res.status(404).json({ error: "not_found" });
  if (job.companyId !== req.currentUser.companyId) return res.status(403).json({ error: "forbidden" });
  const items = await Promise.all(
    (await db.applicationsByJob(job.id)).map(async (a) => {
      const u = await db.getUser(a.userId);
      return { ...a, candidate: u ? { id: u.id, name: u.name, email: u.email, city: u.city, resumeUrl: u.resumeUrl || null } : null };
    })
  );
  res.json({ data: items });
}));

const APPLICATION_STATUSES = ["received", "in_review", "interview", "approved", "rejected"];

app.patch("/api/applications/:id", requireAuth, requireRole("employer"), ah(async (req, res) => {
  const application = await db.getApplication(Number(req.params.id));
  if (!application) return res.status(404).json({ error: "not_found" });
  const job = await db.getJob(application.jobId);
  if (!job || job.companyId !== req.currentUser.companyId) return res.status(403).json({ error: "forbidden" });
  const { status } = req.body || {};
  if (!APPLICATION_STATUSES.includes(status)) return res.status(422).json({ error: "validation_error", message: "Invalid status" });
  const updated = await db.updateApplicationStatus(application.id, status);
  res.json({ data: updated });
}));

// ---------------------------------------------------------------------------
// Candidate resume (experiences) and preferences
// ---------------------------------------------------------------------------

// Experiences are listed like a résumé — the current job first,
// then by start date, most recent first; entries without a start date go last.
function compareExperiences(a, b) {
  const currentA = !a.endDate, currentB = !b.endDate;
  if (currentA !== currentB) return currentA ? -1 : 1;
  if (!a.startDate !== !b.startDate) return a.startDate ? -1 : 1;
  if (a.startDate !== b.startDate) return a.startDate < b.startDate ? 1 : -1;
  return b.id - a.id;
}

// Experiences, preferences, and the résumé are for candidate accounts only
app.get("/api/users/me/experiences", requireAuth, requireRole("candidate"), ah(async (req, res) => {
  res.json({ data: (await db.experiencesByUser(req.currentUser.id)).sort(compareExperiences) });
}));

app.post("/api/users/me/experiences", requireAuth, requireRole("candidate"), ah(async (req, res) => {
  const body = req.body || {};
  const [company, role, startDate, endDate, description] = ["company", "role", "startDate", "endDate", "description"].map((k) => stripTags(body[k]));
  if (!company || !role || isBlank(company) || isBlank(role)) return res.status(422).json({ error: "validation_error", message: "Company and role are required" });
  for (const [k, v] of Object.entries({ startDate, endDate, description })) {
    if (onlySpaces(v)) return res.status(422).json({ error: "validation_error", field: k, message: SPACES_MESSAGE });
  }
  const dateError = experienceDateError(startDate, endDate);
  if (dateError) return res.status(422).json({ error: "validation_error", ...dateError });
  const exp = await db.insertExperience({ userId: req.currentUser.id, company, role, startDate, endDate, description: description || "" });
  res.status(201).json({ data: exp });
}));

app.put("/api/experiences/:id", requireAuth, requireRole("candidate"), ah(async (req, res) => {
  const exp = await db.getExperience(Number(req.params.id));
  if (!exp || exp.userId !== req.currentUser.id) return res.status(404).json({ error: "not_found" });
  const fields = { ...(req.body || {}) };
  for (const k of ["company", "role", "startDate", "endDate", "description"]) if (k in fields) fields[k] = stripTags(fields[k]);
  if (("company" in fields && (!fields.company || isBlank(fields.company))) || ("role" in fields && (!fields.role || isBlank(fields.role)))) {
    return res.status(422).json({ error: "validation_error", message: "Company and role are required" });
  }
  for (const k of ["startDate", "endDate", "description"]) {
    if (onlySpaces(fields[k])) return res.status(422).json({ error: "validation_error", field: k, message: SPACES_MESSAGE });
  }
  const dateError = experienceDateError(
    "startDate" in fields ? fields.startDate : exp.startDate,
    "endDate" in fields ? fields.endDate : exp.endDate
  );
  if (dateError) return res.status(422).json({ error: "validation_error", ...dateError });
  const updated = await db.updateExperience(exp.id, fields);
  res.json({ data: updated });
}));

app.delete("/api/experiences/:id", requireAuth, requireRole("candidate"), ah(async (req, res) => {
  const exp = await db.getExperience(Number(req.params.id));
  if (!exp || exp.userId !== req.currentUser.id) return res.status(404).json({ error: "not_found" });
  await db.deleteExperience(exp.id);
  res.status(204).end();
}));

app.get("/api/users/me/preferences", requireAuth, requireRole("candidate"), ah(async (req, res) => {
  res.json({ data: await db.getPreferences(req.currentUser.id) });
}));

// Preferences accept only the values the screen offers
const PREFERENCE_OPTIONS = {
  area: ["Technology", "Procurement", "Operations", "Finance", "Consulting", "Human Resources", "Design", "Marketing", "Logistics", "Healthcare", "Customer Service", "Education", "Engineering"],
  seniority: ["Intern", "Junior", "Mid-level", "Senior"],
  workModel: ["Remote", "Hybrid", "On-site"],
};
const AVAILABILITY_OPTIONS = ["immediate", "15days", "30days"];

app.put("/api/users/me/preferences", requireAuth, requireRole("candidate"), ah(async (req, res) => {
  const fields = { ...(req.body || {}) };
  for (const [key, options] of Object.entries(PREFERENCE_OPTIONS)) {
    if (key in fields && fields[key] !== "" && fields[key] !== null && !options.includes(fields[key])) {
      return res.status(422).json({ error: "validation_error", field: key, message: "Invalid value" });
    }
  }
  if ("availability" in fields && !AVAILABILITY_OPTIONS.includes(fields.availability)) {
    return res.status(422).json({ error: "validation_error", field: "availability", message: "Invalid value" });
  }
  if ("minSalary" in fields) {
    if (fields.minSalary === "" || fields.minSalary === null) fields.minSalary = 0; // An empty salary is stored as 0
    if (typeof fields.minSalary !== "number" || !Number.isInteger(fields.minSalary) || fields.minSalary < 0) {
      return res.status(422).json({ error: "validation_error", field: "minSalary", message: "The minimum salary must be a whole number of 0 or more" });
    }
  }
  res.json({ data: await db.setPreferences(req.currentUser.id, fields) });
}));

// ---------------------------------------------------------------------------
// Course marketplace (catalog, cart, coupon, checkout) — simulates a real
// e-commerce flow inside Vagalume, to practice cart/purchase flows
// ---------------------------------------------------------------------------

app.get("/api/courses", ah(async (req, res) => {
  let items = await db.courses();
  const { q, category, level, sort, order } = req.query;

  if (q) {
    const needle = String(q).toLowerCase();
    items = items.filter(
      (c) => c.title.toLowerCase().includes(needle) || c.instructor.toLowerCase().includes(needle) || c.tags.some((t) => t.toLowerCase().includes(needle))
    );
  }
  if (category) items = items.filter((c) => c.category === category);
  if (level) items = items.filter((c) => c.level === level);

  if (sort && items.length && sort in items[0]) {
    const dir = order === "desc" ? -1 : 1;
    items.sort((a, b) => (a[sort] > b[sort] ? dir : a[sort] < b[sort] ? -dir : 0));
  } else {
    items.sort((a, b) => a.id - b.id);
  }

  const { items: pageItems, meta } = paginate(items, req.query.page, req.query.limit);
  res.json({ data: pageItems, meta });
}));

app.get("/api/courses/:id", ah(async (req, res) => {
  const course = await db.getCourse(Number(req.params.id));
  if (!course) return res.status(404).json({ error: "not_found", message: "Course not found" });
  res.json({ data: course });
}));

app.get("/api/users/me/enrollments", requireAuth, ah(async (req, res) => {
  const items = (
    await Promise.all(
      (await db.enrollmentsByUser(req.currentUser.id)).map(async (e) => ({ ...e, course: (await db.getCourse(e.courseId)) || null }))
    )
  ).sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt));
  res.json({ data: items });
}));

app.post("/api/courses/coupons/apply", ah(async (req, res) => {
  const { limited, remaining } = checkRateLimit(`course-coupon:${req.ip}`, 5, 30000);
  if (limited) {
    res.set("Retry-After", "30");
    return res.status(429).json({ error: "rate_limited", message: "Too many coupon attempts. Please wait a few seconds." });
  }
  const code = String((req.body && req.body.code) || "").toUpperCase().trim();
  if (!(code in db.COURSE_COUPONS)) {
    return res.status(404).json({ error: "invalid_coupon", message: "Invalid or expired coupon", remaining });
  }
  res.json({ data: { code, discount: db.COURSE_COUPONS[code] }, remaining });
}));

// course cart checkout — simulates a payment gateway (latency + failure) just like a real e-commerce site
app.post("/api/courses/checkout", requireAuth, ah(async (req, res, next) => {
  const { items, paymentMethod, couponCode } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(422).json({ error: "validation_error", message: "Your cart is empty" });
  }

  let subtotal = 0;
  const courseList = [];
  for (const it of items) {
    const course = await db.getCourse(Number(it.courseId));
    if (!course) return res.status(404).json({ error: "not_found", message: `Course ${it.courseId} not found` });
    courseList.push(course);
    subtotal += course.price;
  }

  const enrolledIds = await db.enrolledCourseIds(req.currentUser.id);
  const already = courseList.filter((c) => enrolledIds.includes(c.id));
  if (already.length) {
    return res.status(409).json({ error: "already_enrolled", message: `You are already enrolled in: ${already.map((c) => c.title).join(", ")}` });
  }

  const discount = couponCode && db.COURSE_COUPONS[String(couponCode).toUpperCase()] ? db.COURSE_COUPONS[String(couponCode).toUpperCase()] : 0;
  const total = Number((subtotal * (1 - discount)).toFixed(2));

  // simulated payment gateway: 1.2 to 3s of latency + ~15% chance of failure (skipped when the total is R$ 0)
  const delay = total === 0 ? 0 : 1200 + Math.random() * 1800;
  setTimeout(async () => {
    try {
      if (total > 0 && Math.random() < 0.15) {
        return res.status(502).json({ error: "payment_gateway_timeout", message: "The payment gateway didn't respond in time. Please try again." });
      }
      const createdAt = new Date().toISOString();
      const order = await db.insertOrder({
        userId: req.currentUser.id,
        items: courseList.map((c) => ({ courseId: c.id, title: c.title, price: c.price })),
        paymentMethod: paymentMethod || "card",
        subtotal: Number(subtotal.toFixed(2)),
        discount,
        total,
        status: "paid",
        createdAt,
      });
      for (const c of courseList) {
        await db.insertEnrollment({ userId: req.currentUser.id, courseId: c.id, pricePaid: c.price * (1 - discount), purchasedAt: createdAt });
      }
      res.status(201).json({ data: order });
    } catch (err) {
      next(err); // this callback runs outside ah(), so hand database errors to the error handler ourselves
    }
  }, delay);
}));

app.get("/api/courses/orders/me", requireAuth, ah(async (req, res) => {
  res.json({ data: await db.ordersByUser(req.currentUser.id) });
}));

app.get("/api/courses/orders/:id", requireAuth, ah(async (req, res) => {
  const order = await db.getOrder(Number(req.params.id), req.currentUser.id);
  if (!order) return res.status(404).json({ error: "not_found", message: "Order not found" });
  res.json({ data: order });
}));

// ---------------------------------------------------------------------------
// Uploads (resume, profile photo, company logo)
// ---------------------------------------------------------------------------

const upload = multer({ dest: path.join(__dirname, "uploads"), limits: { fileSize: 5 * 1024 * 1024 } });

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file", message: "No file was uploaded (field 'file')" });
  res.status(201).json({ data: { originalName: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype, url: `/uploads/${req.file.filename}` } });
});

// The résumé keeps its extension, only .pdf/.doc/.docx are accepted,
// and a new résumé deletes the previous file.
const RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];
const UPLOADS_DIR = path.join(__dirname, "uploads");
const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString("hex") + path.extname(file.originalname).toLowerCase()),
  }),
  // multer rejects a file whose size reaches the limit, so the limit is 5 MB + 1 byte: exactly 5 MB is accepted
  limits: { fileSize: 5 * 1024 * 1024 + 1 },
});
const removeUpload = (url) => {
  if (typeof url !== "string" || !url.startsWith("/uploads/")) return;
  fs.unlink(path.join(UPLOADS_DIR, path.basename(url)), () => {}); // a missing file is not an error
};

// A file over 5 MB returns 422 instead of a 500
const resumeSingle = (req, res, next) =>
  resumeUpload.single("file")(req, res, (err) => {
    if (err && err.code === "LIMIT_FILE_SIZE") {
      return res.status(422).json({ error: "file_too_large", field: "file", message: "The file must be at most 5 MB" });
    }
    next(err);
  });

app.post("/api/users/me/resume", requireAuth, requireRole("candidate"), resumeSingle, ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file", message: "No file was uploaded" });
  if (!RESUME_EXTENSIONS.includes(path.extname(req.file.originalname).toLowerCase())) {
    removeUpload(`/uploads/${req.file.filename}`);
    return res.status(422).json({ error: "invalid_file_type", field: "file", message: "Only .pdf, .doc, and .docx files are accepted" });
  }
  const previous = req.currentUser.resumeUrl;
  const url = `/uploads/${req.file.filename}`;
  await db.updateUser(req.currentUser.id, { resumeUrl: url });
  if (previous && previous !== url) removeUpload(previous);
  res.status(201).json({ data: { url } });
}));

app.get("/api/download/applicants.csv", requireAuth, requireRole("employer"), ah(async (req, res) => {
  const jobIds = (await db.jobs()).filter((j) => j.companyId === req.currentUser.companyId).map((j) => j.id);
  const rows = await Promise.all(
    (await db.applications())
      .filter((a) => jobIds.includes(a.jobId))
      .map(async (a) => {
        const u = await db.getUser(a.userId);
        const j = await db.getJob(a.jobId);
        return `${a.id},"${u ? u.name : ""}","${u ? u.email : ""}","${j ? j.title : ""}",${a.status}`;
      })
  );
  res.set("Content-Type", "text/csv");
  res.set("Content-Disposition", "attachment; filename=applicants.csv");
  res.send("id,name,email,job,status\n" + rows.join("\n"));
}));

// ---------------------------------------------------------------------------
// Admin panel (Basic Auth)
// ---------------------------------------------------------------------------

const adminApi = express.Router();
adminApi.use(basicAuthMiddleware);

adminApi.get("/jobs", ah(async (req, res) => res.json({ data: await Promise.all((await db.jobs()).map(jobWithCompany)) })));
adminApi.delete("/jobs/:id", ah(async (req, res) => {
  if (!await db.getJob(Number(req.params.id))) return res.status(404).json({ error: "not_found" });
  await db.deleteJob(Number(req.params.id));
  res.status(204).end();
}));
adminApi.get("/reviews", ah(async (req, res) => res.json({ data: await db.allReviews() })));
adminApi.delete("/reviews/:id", ah(async (req, res) => {
  if (!await db.getReview(Number(req.params.id))) return res.status(404).json({ error: "not_found" });
  await db.deleteReview(Number(req.params.id));
  res.status(204).end();
}));
adminApi.get("/companies", ah(async (req, res) => res.json({ data: await db.companies() })));

adminApi.get("/courses", ah(async (req, res) => res.json({ data: await db.courses() })));
adminApi.delete("/courses/:id", ah(async (req, res) => {
  if (!await db.getCourse(Number(req.params.id))) return res.status(404).json({ error: "not_found" });
  await db.deleteCourse(Number(req.params.id));
  res.status(204).end();
}));
adminApi.get("/course-orders", ah(async (req, res) => {
  const items = await Promise.all(
    (await db.courseOrders()).map(async (o) => {
      const u = await db.getUser(o.userId);
      return { ...o, userName: u ? u.name : "unknown" };
    })
  );
  res.json({ data: items });
}));

adminApi.post("/sync-feed", (req, res) => {
  setTimeout(() => res.json({ ok: true, message: "Job feed resynced with partners" }), 2500 + Math.random() * 1500);
});
adminApi.post("/reprocess-applications", ah(async (req, res) => {
  if (Math.random() < 0.35) return res.status(500).json({ error: "integration_error", message: "Failed to connect to the external ATS (please try again)" });
  res.json({ ok: true, reprocessed: (await db.applications()).length });
}));
adminApi.post("/test-webhook", (req, res) => {
  const { limited, remaining } = checkRateLimit("admin-webhook", 5, 10000);
  if (limited) {
    res.set("Retry-After", "10");
    return res.status(429).json({ error: "rate_limited", message: "Maximum of 5 webhook tests every 10s" });
  }
  res.json({ ok: true, remaining });
});

app.use("/api/admin", adminApi);

// ---------------------------------------------------------------------------
// Generic API testing utilities
// ---------------------------------------------------------------------------

app.get("/api/status/:code", (req, res) => {
  const code = parseInt(req.params.code, 10);
  if (Number.isNaN(code) || code < 100 || code > 599) return res.status(400).json({ error: "invalid_status", message: "Please provide a valid HTTP status code (100-599)" });
  res.status(code).json({ requestedStatus: code, message: `Response with status ${code}` });
});

app.get("/api/slow", (req, res) => {
  const ms = Math.min(Math.max(parseInt(req.query.ms, 10) || 3000, 0), 15000);
  setTimeout(() => res.json({ waitedMs: ms, message: "Response delayed on purpose" }), ms);
});

app.get("/api/flaky", (req, res) => {
  // 0 is a valid rate; the default 0.3 is used only when the value is missing or not a number
  const parsed = parseFloat(req.query.failRate);
  const failRate = Math.min(Math.max(Number.isNaN(parsed) ? 0.3 : parsed, 0), 1);
  if (Math.random() < failRate) return res.status(500).json({ error: "random_failure", message: "Random failure (on purpose)" });
  res.json({ ok: true, message: "It worked this time" });
});

app.get("/api/rate-limited", (req, res) => {
  const { limited, remaining } = checkRateLimit(`generic:${req.ip}`, 5, 10000);
  if (limited) {
    res.set("Retry-After", "10");
    return res.status(429).json({ error: "rate_limited", message: "Maximum of 5 requests every 10s" });
  }
  res.json({ ok: true, remaining });
});

app.get("/api/redirect", (req, res) => res.redirect(302, "/api/redirect-target"));
app.get("/api/redirect-target", (req, res) => res.json({ landed: true, message: "You've reached the final redirect destination" }));

app.use("/api", (req, res) => res.status(404).json({ error: "not_found", message: "This API route does not exist" }));

// ---------------------------------------------------------------------------
// Friendly 404 for HTML pages
// ---------------------------------------------------------------------------

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, "public", "404.html")));

// ---------------------------------------------------------------------------
// Error handler — anything passed to next(err), e.g. a database that is down
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // A request body that is not valid JSON is the caller's error, not the server's
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "invalid_json", message: "The request body is not valid JSON" });
  }
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err.message);
  if (res.headersSent) return;
  if (req.originalUrl.startsWith("/api")) {
    return res.status(500).json({ error: "internal_error", message: "Something went wrong on our side. Please try again." });
  }
  res.status(500).send("Internal server error");
});

// ---------------------------------------------------------------------------
// HTTP server
// The WebSocket (/ws) was removed with the simulated
// notifications, the online counter, and the help center chat.
// ---------------------------------------------------------------------------

const server = http.createServer(app);

// Check the database before accepting requests, so a stopped container shows a
// clear message instead of every page failing later.
db.ping()
  .then(() => db.migrate())
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Vagalume (QA Playground) running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    const safeUrl = db.DATABASE_URL.replace(/\/\/([^:/@]+):[^@]*@/, "//$1:***@");
    console.error(`\nCould not connect to PostgreSQL at ${safeUrl}\n  ${err.message}\n`);
    console.error("Is the database running? Start it with:  npm run db:up\n");
    process.exit(1);
  });
