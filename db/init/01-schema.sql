-- =============================================================================
-- Vagalume QA Playground — schema (PostgreSQL)
--
-- Runs automatically the first time the Postgres container starts with an empty
-- volume (docker-entrypoint-initdb.d). To run it again: npm run db:reset
--
-- Column names are camelCase and "quoted" on purpose: the API returns rows
-- as-is, so the JSON keys (companyId, createdAt...) stay exactly the same as
-- in the old SQLite version. Query builders like Kysely quote identifiers
-- automatically, so this is transparent there.
-- =============================================================================

CREATE TABLE companies (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  sector      TEXT,
  city        TEXT,
  logo        TEXT,
  description TEXT
);

CREATE TABLE jobs (
  id             SERIAL PRIMARY KEY,
  "companyId"    INTEGER,
  title          TEXT NOT NULL,
  area           TEXT,
  seniority      TEXT,
  "contractType" TEXT,
  "workModel"    TEXT,
  city           TEXT,
  salary         TEXT,
  status         TEXT,
  description    TEXT,
  requirements   TEXT
);

CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL,
  city        TEXT,
  "companyId" INTEGER,
  "resumeUrl" TEXT
);

CREATE TABLE experiences (
  id          SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL,
  company     TEXT,
  role        TEXT,
  "startDate" TEXT, -- "YYYY-MM" (month precision, free text on purpose)
  "endDate"   TEXT,
  description TEXT
);

CREATE TABLE preferences (
  "userId"     INTEGER PRIMARY KEY,
  area         TEXT,
  seniority    TEXT,
  "workModel"  TEXT,
  "minSalary"  INTEGER,
  availability TEXT
);

CREATE TABLE applications (
  id          SERIAL PRIMARY KEY,
  "jobId"     INTEGER NOT NULL,
  "userId"    INTEGER NOT NULL,
  status      TEXT,
  "appliedAt" TIMESTAMPTZ
);

CREATE TABLE reviews (
  id            SERIAL PRIMARY KEY,
  "jobId"       INTEGER,
  "companyId"   INTEGER,
  "authorId"    INTEGER, -- account that wrote the review
  author        TEXT,    -- name shown on the review, as it was when it was written
  rating        INTEGER,
  comment       TEXT,
  "wasEmployee" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMPTZ
);

CREATE TABLE followed_companies (
  "userId"    INTEGER NOT NULL,
  "companyId" INTEGER NOT NULL,
  PRIMARY KEY ("userId", "companyId")
);

CREATE TABLE courses (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  instructor      TEXT,
  category        TEXT,
  level           TEXT,
  price           DOUBLE PRECISION,
  "originalPrice" DOUBLE PRECISION,
  image           TEXT,
  duration        INTEGER,
  "lessonsCount"  INTEGER,
  "studentsCount" INTEGER,
  "ratingAverage" DOUBLE PRECISION,
  "ratingCount"   INTEGER,
  description     TEXT,
  tags            JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE course_orders (
  id              SERIAL PRIMARY KEY,
  "userId"        INTEGER NOT NULL,
  items           JSONB NOT NULL DEFAULT '[]',
  "paymentMethod" TEXT,
  subtotal        DOUBLE PRECISION,
  discount        DOUBLE PRECISION,
  total           DOUBLE PRECISION,
  status          TEXT,
  "createdAt"     TIMESTAMPTZ
);

CREATE TABLE enrollments (
  id            SERIAL PRIMARY KEY,
  "userId"      INTEGER NOT NULL,
  "courseId"    INTEGER NOT NULL,
  "pricePaid"   DOUBLE PRECISION,
  "purchasedAt" TIMESTAMPTZ
);
