# Test strategy

[← Specification index](README.md) · [Screen vs. API divergences](divergences.md) · [Global rules](product/global-rules.md)

2026-11-06 · Gabriel Nunes e Castro

This page sets what to test first, how deep, at which layer, and in which suite. The analysis is per rule (business rules `BR-xx` and global rules `GR-xx`), not per module: inside one module, a password change can carry much more risk than the theme.

## Risk analysis

**Risk = Impact × Probability.** Each one is rated High, Medium, or Low. Under the labels, High = 3, Medium = 2, and Low = 1; the numbers are used only to order the queue.

### Impact: how much damage if it breaks?

| Level | Criterion | Example |
| --- | --- | --- |
| High | Blocks a main function (sign-up, sign-in, search, applying) or exposes data or security | A candidate cannot apply |
| Medium | Gives a wrong result, but the user can still go on | A search filter fails, but the job can still be found in the list |
| Low | Cosmetic, or with an easy workaround | A wrong color in the theme |

### Probability: how likely is it to break?

Based on the real history of the validation rounds ([divergences and findings](divergences.md)):

| Level | Criterion |
| --- | --- |
| High | The rule had at least one divergence (`D-xx`), or two or more findings (`N-xx`) |
| Medium | The rule had one finding |
| Low | The rule has no history |

A divergence weighs more than a finding because it shows the code had already drifted from the written rule.

A finding that affects the whole site counts for the global rule it belongs to. When a finding is also tied to a module rule, it counts for both: the module rule tests the specific case, and the global rule tests the behavior across the site.

### Risk: the combination

| Risk | Combinations | Score | Depth |
| --- | --- | --- | --- |
| High | High × High, High × Medium | 9 or 6 | API, database, and screen |
| Medium | Medium × Medium, High × Low | 4 or 3 | API and screen |
| Low | Medium × Low, Low × Low | 2 or 1 | Manual only |

Inside a risk level, the queue is ordered by score; on equal scores, the rule with the higher impact comes first.

## Test types

Two separate axes: the **layer** says what a test touches, and the **suite** says when it runs.

### Layer: what the test touches (set by the risk)

| Layer | What it does | Used for |
| --- | --- | --- |
| API | Calls the endpoint and checks the status, error code, and message, covering the variations (valid, invalid, limits, signed out, wrong account type) | High and Medium risk |
| Integration | API plus a database query | High risk, when the outcome is what was saved, or what must not have been saved |
| E2E | Real user flow in the browser: messages, field errors, redirects | The main flow of High and Medium risk rules |
| Manual | Exploratory check, not automated | Low risk, and anything that depends on visual judgment |

### Suite: when the test runs (set by the impact)

| Suite | What it holds | When it runs |
| --- | --- | --- |
| Smoke | The happy path, end to end, of the High impact rules that have one | First, on every change, in a few minutes |
| Regression | Every other automated test | In every validation round |

The smoke suite asks "does the site work?", so it follows the impact, not the risk: a High impact rule that never broke (such as BR-09, sign-in) is still part of it. Rules that only block something have no happy path and stay out of the smoke suite.

## Test plan per rule

### High risk (20)

| Rule | Subject | Impact | Probability | Score | API | Integration | E2E | Smoke |
| --- | --- | --- | --- | :---: | :---: | :---: | :---: | :---: |
| BR-04 | Password on sign-up | High | High (D-02, D-10) | 9 | ✓ | ✓ stored as a hash | ✓ | ✓ |
| BR-11 | Session expiry | High | High (D-06) | 9 | ✓ ¹ | — | — | — |
| BR-20 | Only candidates apply | High | High (N-03, N-10) | 9 | ✓ | ✓ nothing created | ✓ | ✓ |
| BR-23 | Closed job | High | High (D-01, N-07, N-23) | 9 | ✓ | ✓ nothing created | ✓ | ✓ |
| BR-31 | Review rating and comment | High | High (D-04, N-11, N-12) | 9 | ✓ | ✓ rating saved | ✓ | ✓ |
| BR-34 | Delete only your own review | High | High (D-05) | 9 | ✓ | ✓ review still there | ✓ | ✓ |
| BR-35 | Dashboard access | High | High (D-09) | 9 | ✓ | — | ✓ | ✓ |
| BR-36 | Résumé upload | High | High (D-07, N-02) | 9 | ✓ | ✓ file replaced | ✓ | ✓ |
| BR-42 | Password change | High | High (D-10) | 9 | ✓ | ✓ stored as a hash | ✓ | ✓ |
| GR-01 | User text is plain text | High | High (N-11, N-18, N-21) | 9 | ✓ | ✓ saved without tags | ✓ | — |
| GR-03 | Screen and API enforce the same rules | High | High (D-01 to D-10) | 9 | ✓ ² | — | — | — |
| GR-06 | Not signed in vs. wrong account | High | High (D-09) | 9 | ✓ | — | — | — |
| BR-13 | Text search | High | Medium (N-04) | 6 | ✓ | — | ✓ | ✓ |
| BR-39 | Preferences | High | Medium (N-20) | 6 | ✓ | ✓ values saved | ✓ | ✓ |
| BR-05 | Terms acceptance | Medium | High (D-03) | 6 | ✓ | ✓ nothing created | ✓ | — |
| BR-08 | Email format | Medium | High (D-03, N-01) | 6 | ✓ | ✓ nothing created | ✓ | — |
| BR-10 | "Keep me signed in" | Medium | High (D-06) | 6 | ✓ cookie | — | ✓ ³ | — |
| BR-37 | Work experience | Medium | High (D-08, N-17, N-18) | 6 | ✓ | ✓ clean value saved | ✓ | — |
| GR-02 | No field accepts only spaces | Medium | High (N-04, N-05, N-12, N-17, N-19) | 6 | ✓ | ✓ clean value saved | ✓ | — |
| GR-05 | Error response format | Medium | High (N-06, N-22) | 6 | ✓ | — | — | — |

¹ Nobody waits 7 days: the test uses an already expired session token, or checks that the token expires 604800 seconds after it is issued.
² GR-03 has no test of its own: it is covered when each rule checks the same validation on screen and through the API.
³ A new browser session simulates closing the browser; the test checks whether the session survives.

### Medium risk (10)

| Rule | Subject | Impact | Probability | Score | API | Integration | E2E | Smoke |
| --- | --- | --- | --- | :---: | :---: | :---: | :---: | :---: |
| BR-16 | Pagination | Medium | Medium (N-06) | 4 | ✓ | — | ✓ | — |
| BR-21 | One application per job | Medium | Medium (N-09) | 4 | ✓ | — | ✓ | — |
| BR-28 | Company profile | Medium | Medium (N-14) | 4 | ✓ | — | ✓ | — |
| BR-29 | Average rating | Medium | Medium (N-16) | 4 | ✓ | — | ✓ | — |
| BR-32 | Review data | Medium | Medium (N-15) | 4 | ✓ | — | ✓ | — |
| GR-04 | Success feedback only after the API confirms | Medium | Medium (N-13) | 4 | — | — | ✓ ⁴ | — |
| BR-03 | Unique email | High | Low | 3 | ✓ | — | ✓ | ✓ |
| BR-09 | Sign-in errors | High | Low | 3 | ✓ | — | ✓ | ✓ |
| BR-38 | Only your own experience entries | High | Low | 3 | ✓ | — | — ⁵ | ✓ |
| GR-07 | Another user's resource | High | Low | 3 | ✓ | — | — ⁵ | — |

⁴ The test makes the API call fail and checks that no success message appears and the previous state is kept.
⁵ The screen offers no access to another user's resource, so that case exists only in the API. In the smoke suite, BR-38 is the happy path: adding and removing your own experience entry.

### Low risk (21): manual

| Score | Rules |
| :---: | --- |
| 2 | BR-01, BR-02, BR-07, BR-12, BR-14, BR-17, BR-18, BR-19, BR-22, BR-26, BR-27, BR-30, BR-33, BR-40, BR-41 |
| 1 | BR-06, BR-15, BR-24, BR-25, BR-43, BR-44 |

### Totals

| | Rules |
| --- | :---: |
| API | 29 |
| Integration | 13 |
| E2E | 24 |
| Smoke | 13 |
| Manual | 21 |

Some smoke rules can share one test (BR-03 and BR-04 are the same sign-up).

## Order of work

1. API tests for the 20 High risk rules: that is where the 10 divergences were, and these tests are fast and stable.
2. Integration checks for the High risk rules that save data.
3. E2E tests for the High risk rules, starting with the smoke suite.
4. API and E2E tests for the Medium risk rules.

## Keeping it up to date

- **Impact** is set once per rule and reviewed only when a rule is added or the product changes focus.
- **Probability** is updated after each validation round: a new divergence or finding is added to its rule, and the rule moves up when it meets the criterion.
- When a rule changes risk level, its row moves to the new table, with the layers and suite of that level.
