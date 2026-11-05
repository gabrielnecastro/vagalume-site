# Vagalume — QA Documentation: Candidate Area

2026-10-08, updated on 2026-11-04 · Gabriel Nunes e Castro

[← Site README](../README.md)

## Overview

This specification describes the current behavior of the candidate area in Vagalume, mapped directly from the source code (`server.js`, the pages in `public/`, and the PostgreSQL schema). Each module, in `product/requirements/`, lists user stories (US), business rules (BR), and functional requirements (FR), with unique numbering so test cases can trace back to them. Each rule was then confirmed against the running app, on screen and through the API:

```text
Rule (BR/FR) → Acceptance criteria → Check on screen, API and database → Result → Validation report
```

**In scope:** candidate sign-up and login, job search, applications, saved jobs, companies, reviews, the candidate dashboard, and the help center.

**Out of scope for now:** the course marketplace (catalog, cart, coupon, checkout, orders, and the "My courses" tab), the employer area, and the admin panel. They will be covered in a future round.

| Actor | Description |
| --- | --- |
| Visitor | Unauthenticated user. Browses jobs, companies, and help. |
| Candidate | Authenticated user with `role = candidate`. Applies to jobs, writes reviews, follows companies, and manages the dashboard. |
| Company | User with `role = employer`. Mentioned only where it restricts what a candidate can do. |

| Term | Meaning |
| --- | --- |
| Session | httpOnly `session` cookie holding a JWT (`sub` = user id, `role`). |
| Open job | Job with `status = open`. Other statuses (e.g. `closed`) do not accept applications through the UI. |
| Application status | `received`, `in_review`, `interview`, `approved`, `rejected` — changed by the company only. |
| Toast | Temporary floating message (4.5 s). |

Test data: the demo accounts are listed in the [site README](../README.md#accounts-and-test-data) (candidate `candidato@vagalume.test` is John Doe). They are never changed during validation: each round creates its own accounts, listed in its [validation report](results/validation/README.md).

Expected behavior comes from the QA Guide (`/pages/qa-docs.html`), the official source: only what it describes is intentional. Every endpoint is in the [API documentation](../README.md#api-documentation-swagger) (`/api-docs`, from [`openapi.yaml`](../openapi.yaml)).

## Modules

| Module | User stories | Business rules | Functional requirements |
| --- | --- | --- | --- |
| [Module 1 — Sign-up and authentication](product/requirements/01-sign-up-and-authentication.md) | US-01 to US-04 | BR-01 to BR-11 | FR-01 to FR-08 |
| [Module 2 — Job search and details](product/requirements/02-job-search.md) | US-05 to US-08 | BR-12 to BR-19 | FR-09 to FR-15 |
| [Module 3 — Applications and saved jobs](product/requirements/03-applications-and-saved-jobs.md) | US-09 to US-12 | BR-20 to BR-26 | FR-16 to FR-23 |
| [Module 4 — Companies and reviews](product/requirements/04-companies-and-reviews.md) | US-13 to US-17 | BR-27 to BR-34 | FR-24 to FR-31 |
| [Module 5 — Candidate dashboard](product/requirements/05-candidate-dashboard.md) | US-18 to US-23 | BR-35 to BR-42 | FR-32 to FR-42 |
| [Module 6 — Help center and global features](product/requirements/06-help-and-global.md) | US-24 to US-26 | BR-43 to BR-44 | FR-43 to FR-48 |

Total: 26 user stories, 44 business rules, and 48 functional requirements.

## How I validate

Each check starts from a rule and confirms it at the layer where the rule actually lives:

- **Screen:** messages, field errors, redirects, and header state.
- **API:** status codes and error codes (`409 email_in_use`, `422 invalid_email_format`, `401 wrong_password`).
- **Database:** a success message only proves the screen printed some text. When the outcome is persistence (an account created, or a password stored as a hash), the check reads the database.

### Bypassing the screen

The most useful checks skip the form and call the API directly. That is how the divergences were found: the screen blocked a 1-character password, but `POST /api/auth/register` accepted it (D-02, fixed on 2026-10-17).

## Findings

All 10 were confirmed against the running app before the fixes of 2026-10-17:

| ID | Rule | What happened |
| --- | --- | --- |
| D-01 | BR-23 | The API accepts applications to closed jobs. The screen blocks them. |
| D-02 | BR-04 | The API accepts a password of any length on sign-up. |
| D-03 | FR-03 | The API accepts sign-ups without an email format check or terms acceptance. |
| D-04 | BR-31 | The API accepts review ratings such as 10, -3, or 999, which distorts the company's average rating. |
| D-05 | BR-34 | Review ownership is checked by author **name**: two candidates with the same name can delete each other's reviews. |
| D-06 | BR-10 / BR-11 | "Keep me signed in" sets a 30-day cookie, but the JWT expires after 7 days. *(Partial: the cookie lifetime was confirmed in code only.)* |
| D-07 | BR-36 | The résumé endpoint accepts any file type, including `.sh`. |
| D-08 | BR-37 | Experience dates are not validated: `banana`, `2099-99`, or an end date before the start date are all accepted. |
| D-09 | BR-35 | An employer account can use the candidate experience and preference endpoints. |
| D-10 | BR-42 | Password change has no confirmation field, and passwords are stored in plain text. |

On 2026-10-17 all 10 were [decided](decisions.md) as defects and fixed, so the screen and the API now enforce the same rules.

Two later decisions, Q-01 (a visitor who tries to apply gets 401) and Q-03 (job requirements with only spaces are rejected with 422), were fixed and validated on 2026-11-04.

## Global rules (summary)

[`product/global-rules.md`](product/global-rules.md) holds the rules that apply to every module (plain-text user input, fields with only spaces, the same validations on screen and in the API, feedback only after the API confirms, the error format, and access by account type), plus the open questions found while grouping them.

## Validation reports (summary)

The requirements describe only the current expected behavior. The evidence of each validation round (results per rule, findings, fixes, and test data) is in [`results/validation/`](results/validation/README.md), one report per round.

## Screen vs. API divergences (summary)

[`divergences.md`](divergences.md) lists the 10 places where the screen enforces a rule that the API does not (D-01 to D-10), the validation of each one against the running app, and the new findings (N-01 to N-24).

## Decisions and fixes (summary)

[`decisions.md`](decisions.md) records what the product owner decided about each divergence and finding, and the fixes of each day. Expected behavior follows the QA guide (`/pages/qa-docs.html`), the official source.

## Online copy

This repository is the only source of the specification. The online document on claude.ai is a read-only copy, updated at the end of each validation round. When the two differ, this repository is right.

## Identifiers

| Prefix | Meaning | Where |
| --- | --- | --- |
| `US-xx` | User story | `product/requirements/` |
| `BR-xx` | Business rule | `product/requirements/` |
| `FR-xx` | Functional requirement | `product/requirements/` |
| `GR-xx` | Global rule (applies to every module) | `product/global-rules.md` |
| `D-xx` | Screen vs. API divergence | `divergences.md` (decisions in `decisions.md`) |
| `N-xx` | New finding during validation | `divergences.md` (decisions in `decisions.md`) |

Numbering is unique across the whole specification, not per module: `BR-12` exists only once.

## Folder structure

```text
docs/
├── README.md              this page
├── product/
│   ├── requirements/      one file per module (current behavior only)
│   └── global-rules.md    rules that apply to every module
├── results/validation/    evidence and history of each validation round
├── divergences.md         screen vs. API divergences and findings
└── decisions.md           decisions and fixes of each day
```

The automated tests (Playwright, Cypress) live in their own repositories. Next step: a test strategy with a risk analysis, to set what to check first and why.
