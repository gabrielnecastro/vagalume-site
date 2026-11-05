# Vagalume — a job board built to be tested

🇺🇸 English · 🇧🇷 [Português](README.pt-BR.md)

![Vagalume home page](screenshots/home.png)

Vagalume is a fictional job board with a small course marketplace, made as a **target for
software testing practice**. It looks and behaves like a real product, but every flow was
designed to exercise a kind of test scenario, from a simple form to a payment gateway that
fails on purpose.

It runs locally in a few minutes, with a real database you fully control, so you can practice
UI, API, and data checks without breaking anything that matters.

> **Vibe coded:** this site was built with AI assistance, as a target for testing practice. It is not meant as a reference for production code.

## Why test Vagalume

- **Realistic flows:** two account types (candidate and company), dashboards, applications, reviews, a cart, and a checkout.
- **A clear test oracle:** the [QA Guide](#the-qa-guide) describes the expected behavior, so you know what is intentional and what is a defect.
- **Failures on purpose:** random errors, slow responses, and rate limits to practice waits, retries, and error handling.
- **The same rules in the UI and in the API:** the screen blocks invalid input and the API enforces the same rules, so you can bypass the UI and check both layers.
- **Test-friendly markup:** nearly every interactive element has a `data-testid` attribute.
- **Full control of the data:** PostgreSQL in Docker, with demo data you can reset at any time and query directly.
- **A documented API:** every endpoint in [Swagger](#api-documentation-swagger), ready to explore or import.

## Tech stack

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![OpenAPI](https://img.shields.io/badge/OpenAPI-6BA539?style=for-the-badge&logo=openapiinitiative&logoColor=white)

| Layer | Technology |
| --- | --- |
| Front end | HTML, CSS, and vanilla JavaScript (no framework), with a Web Component for the rating stars |
| Back end | [Node.js](https://nodejs.org) 22 and [Express](https://expressjs.com) 4 (REST API) |
| Database | [PostgreSQL](https://www.postgresql.org) 16 in [Docker](https://www.docker.com), accessed with plain SQL ([node-postgres](https://node-postgres.com)) |
| Authentication | JWT in an httpOnly cookie for users; HTTP Basic Auth for the admin; passwords hashed with scrypt |
| File upload | [Multer](https://github.com/expressjs/multer) (multipart/form-data) |
| API documentation | [OpenAPI](https://www.openapis.org) 3 with [Swagger UI](https://swagger.io/tools/swagger-ui/) |

## What you can practice

| Topic | Where in Vagalume |
| --- | --- |
| Forms and validation | Sign-up with two profiles and sign-in (`/pages/entrar.html`) |
| Authentication and roles | httpOnly session cookie; candidate vs. company permissions (401 and 403) |
| Search, filters, sorting, and pagination | Job list on the home page and `GET /api/jobs` |
| CRUD | Jobs in the company dashboard; work experience in the candidate dashboard |
| Drag and drop | Candidate kanban board in the company dashboard |
| File upload and download | Résumé upload (.pdf, .doc, .docx up to 5 MB); applicants exported as CSV |
| Cart and checkout | Course marketplace: coupons, a free course, and "already enrolled" (409) |
| Tricky UI elements | iframe, shadow DOM (rating stars), cookie banner, theme in `localStorage`, broken image, 404 page, 302 redirect |
| Flaky and slow behavior | Checkout fails ~15% of the time (502), an admin action fails ~35% (500), a 2.5 to 4 s admin action |
| Rate limits | Coupon (5 tries / 30 s), admin webhook and `/api/rate-limited` (5 / 10 s), with `Retry-After` |
| API testing | 60 documented operations, with 400, 401, 403, 404, 409, 422, 429, and 502 responses |
| Contract testing | The OpenAPI file ([`openapi.yaml`](openapi.yaml)) |
| Access control | Users can only change or delete their own data; the admin uses HTTP Basic Auth |
| Data checks | Confirm in the database what the screen cannot show |
| Load and performance | Catalog and search endpoints, plus `/api/slow`, `/api/flaky`, and `/api/status/:code` |

## QA documentation

The [`docs/`](docs/README.md) folder has my QA work on the candidate area: a functional specification written from the source code, with every rule confirmed against the running app, on screen and through the API.

| User stories | Business rules | Functional requirements | Screen vs. API divergences | New findings |
| :---: | :---: | :---: | :---: | :---: |
| **26** | **44** | **48** | **10** | **24** |

**Start here:**

- [Functional specification](docs/README.md): what the candidate area does, module by module, with acceptance criteria in Gherkin;
- [Screen vs. API divergences](docs/divergences.md): where the screen enforced a rule and the API did not, plus the findings;
- [Decisions and fixes](docs/decisions.md): what was decided about each point and what was fixed;
- [Validation reports](docs/results/validation/README.md): the evidence of each validation round.

The course marketplace, the employer area, and the admin panel are out of scope for now; they will be covered in a future round. The automated tests live in their own repositories.

## Getting started

### 1. Install the prerequisites

| Tool | Version | Check it with |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | 22 or higher (pinned in `.nvmrc`) | `node -v` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | any recent version | `docker --version` |
| [Git](https://git-scm.com) | any recent version | `git --version` |

**Docker Desktop must be open and running** before the next steps: the database runs inside it.

### 2. Get the code and install the dependencies

```bash
git clone https://github.com/gabrielnecastro/vagalume-site.git
cd vagalume-site
npm install
```

### 3. Start the database

```bash
npm run db:up
```

The first time, this downloads PostgreSQL 16, creates the tables, and loads the demo data.
It finishes when the database is ready.

### 4. Start the site

```bash
npm start
```

When you see `Vagalume (QA Playground) running at http://localhost:3000`, open:

| What | Address |
| --- | --- |
| The site | http://localhost:3000 |
| QA Guide | http://localhost:3000/pages/qa-docs.html |
| API documentation (Swagger) | http://localhost:3000/api-docs |
| Admin panel (`admin` / `admin123`) | http://localhost:3000/admin |

### 5. Stop everything

Press `Ctrl + C` in the terminal running the site, then stop the database with `npm run db:down`.
Your data is kept for the next `npm run db:up`. To start over from the demo data, run `npm run db:reset`.

### Troubleshooting

| Problem | Fix |
| --- | --- |
| `Could not connect to PostgreSQL` when starting the site | Open Docker Desktop and run `npm run db:up` again |
| Port 5432 is already in use (another PostgreSQL on your machine) | Copy `.env.example` to `.env` and change `POSTGRES_PORT` **and** the port in `DATABASE_URL` (e.g. to 5433), then run `npm run db:up` |
| Port 3000 is already in use | Run the site on another port: `PORT=4000 npm start` (macOS/Linux) or `$env:PORT=4000; npm start` (Windows PowerShell) |
| `The container name "/vagalume-db" is already in use` | An old copy of the database container exists: run `docker rm -f vagalume-db`, then `npm run db:up` |
| The data looks wrong or a test left a mess | `npm run db:reset` (it **wipes everything** and reloads the demo data) |

## Accounts and test data

| Use | Credentials |
|---|---|
| Candidate account (`/pages/entrar.html`) | `candidato@vagalume.test` / `demo123` |
| Company account — Nimbus Tech (`/pages/entrar.html`) | `empresa@vagalume.test` / `demo123` |
| Second company account — Arctic Games (`/pages/entrar.html`) | `empresa2@vagalume.test` / `demo123` |
| Other candidates (authors of the example reviews) | `fernanda@example.com` / `pass123` and `ricardo@example.com` / `pass123` |
| Admin panel (`/admin`, HTTP Basic Auth) | `admin` / `admin123` |
| Course coupons (cart) | `STUDENT10` (10%), `LAUNCH20` (20%), `CAREER5` (5%) |

Tips for reliable tests:

- **Create your own accounts** for tests that change data (`POST /api/auth/register` is the fastest way), and keep the demo accounts as they are.
- **Reset to a known state** at any time with `npm run db:reset`.
- **Set up and check data in the database** when the screen is not enough (see [Database](#database)).

## The QA Guide

The site has its own guide for testers at **[`/pages/qa-docs.html`](http://localhost:3000/pages/qa-docs.html)**
(the "QA Guide" link in the footer). It is the reference for what the site is expected to do:

- **Credentials** for the demo accounts and the admin panel;
- **UI scenarios** and where to find each one;
- **Failures on purpose**, built to be found and handled by tests;
- **REST API**: every endpoint, with its auth (session cookie or HTTP Basic Auth) and its rules.

![QA Guide page](screenshots/qa-guide.png)

The behavior described in the guide, including the failures on purpose, is intentional.
Anything else that differs from it is a defect, so finding one is part of the practice.

## API documentation (Swagger)

The whole REST API is documented in [`openapi.yaml`](openapi.yaml) (OpenAPI 3) and can be explored
and called at **[`/api-docs`](http://localhost:3000/api-docs)** while the site is running.

- **Session routes**: run `POST /api/auth/login` with "Try it out"; the browser keeps the
  `session` cookie and sends it on the next calls.
- **Admin routes**: click **Authorize** and use `admin` / `admin123`.
- The file can also be imported into Postman, Insomnia, or other API tools.

## Database

All data (companies, jobs, users, applications, reviews, courses, orders...) lives in a
**PostgreSQL 16** database running in Docker (`docker-compose.yml`). Data **survives server
restarts**; it is only wiped when you reset the database.

| Command | What it does |
|---|---|
| `npm run db:up` | Start Postgres (waits until it is healthy) |
| `npm run db:down` | Stop Postgres — data is kept in the `vagalume-pgdata` volume |
| `npm run db:reset` | **Wipe everything** and recreate the tables + demo data |
| `npm run db:psql` | Open a `psql` shell inside the container |
| `npm run db:logs` | Follow the database logs |

Schema and demo data are plain SQL in `db/init/` (`01-schema.sql`, `02-seed.sql`). Postgres runs
them automatically **only when the volume is empty** — after editing them, run `npm run db:reset`.

### Connection details

| | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `vagalume` |
| User / password | `vagalume` / `vagalume` |
| Connection string | `postgres://vagalume:vagalume@localhost:5432/vagalume` |

To change any of them (e.g. port 5432 is already used by another Postgres on your machine), copy
`.env.example` to `.env` and edit it — both Docker Compose and the app read it. The app uses the
`DATABASE_URL` variable.

> Column names are camelCase (`companyId`, `createdAt`...), so in raw SQL they must be
> double-quoted: `SELECT * FROM jobs WHERE "companyId" = 1`.

## Project structure

```
server.js           Express server (site routes + API)
database.js         PostgreSQL data layer (node-postgres, plain SQL)
docker-compose.yml  PostgreSQL 16 container
openapi.yaml        REST API documentation (served by Swagger UI at /api-docs)
db/init/            01-schema.sql (tables) and 02-seed.sql (demo data), run on first start
.env.example        connection settings (copy to .env to override)
public/          the site (no access authentication)
  index.html     home page with the full job listing
  pages/
    vaga.html, empresa.html, empresas.html, entrar.html
    candidato/painel.html   candidate dashboard (resume, preferences, applications, my courses...)
    empresa/painel.html     employer dashboard (jobs, candidate kanban, reviews received...)
    cursos.html, curso.html, carrinho.html, checkout-curso.html, pedido-curso-confirmado.html
    ajuda.html, termos.html, privacidade.html, qa-docs.html
  css/, js/, img/, img/courses/
docs/            QA documentation (specification, divergences, decisions, validation reports)
admin/           admin panel (lives outside /public — only served with HTTP Basic Auth)
uploads/         files uploaded through the app (resumes, logos)
screenshots/     images used in this README
```

## License

[MIT](LICENSE)
