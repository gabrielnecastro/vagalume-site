# Module 2 — Job search and details

[← Specification index](../../README.md) · [Screen vs. API divergences](../../divergences.md) · [Decisions and fixes](../../decisions.md) · [Global rules](../global-rules.md)

Home page (`/`) with the job list and filters, and job details (`/pages/vaga.html?id={id}`). Endpoints: `GET /api/jobs`, `GET /api/jobs/:id`.

## User stories

- **US-05** — As a visitor or candidate, I want to see the open jobs to discover opportunities.
- **US-06** — As a candidate, I want to search by keyword and filter by area, level, and work model to find matching jobs.
- **US-07** — As a candidate, I want to sort jobs by most recent or by title.
- **US-08** — As a candidate, I want to open a job and see its description, requirements, salary, and company details.

## Acceptance criteria

The criteria below describe the expected behavior of the current version. Tags link each scenario to its rules (`@BR-xx`, `@FR-xx`, `@GR-xx`) and to the decision it came from (`@D-xx`, `@N-xx`). A scenario with no state tag is decided, and the app is expected to do what it says. Two tags mark exceptions: `@pending-decision` (the actual behavior is known, but the expected behavior has not been decided) and `@known-bug` (decided as a defect: the scenario describes the expected behavior and fails until the fix). Whether and when a scenario was checked against the running app is recorded only in the [validation reports](../../results/validation/README.md).

**US-05 — See the open jobs**

```gherkin
Feature: Job list

  Background:
    Given I am on the home page "/"

  @BR-12 @BR-16 @FR-09 @FR-11
  Scenario: Open jobs on the home page
    Then I see "18 job(s) found"
    And I see 6 job cards
    And jobs that are not open are not listed
    And each card shows the logo, title, company, city, level, contract type, work model, and salary

  @FR-09 @N-21
  Scenario: Job and company text is shown as text
    Given a company tries to save the job title "<b>QA Html Job</b>" and the company name "<i>QA Html Co</i>"
    Then the API saves "QA Html Job" and "QA Html Co", without the tags
    And a title that is empty without its tags, such as "<b></b>", returns 422 "Required fields: title, area"
    And any text with tags already saved is shown on the cards as written, never as HTML

  @FR-12
  Scenario: Infinite scroll
    When I scroll to the end of the list
    Then I see "loading more jobs..." while the next page loads
    And 6 more jobs are added to the list, with no duplicates
    When I scroll to the end after the last page
    Then no new request is sent

  @BR-12
  Scenario: The API lists only open jobs by default
    When I call "GET /api/jobs" without the "status" parameter
    Then every job returned has the status "open"
    And with "status=all" the closed jobs are also returned
    And with "status=closed" only the closed jobs are returned

  @BR-16
  Scenario Outline: API pagination within the accepted range
    When I call "GET /api/jobs" with "<parameters>"
    Then I get 200 with page <page>, limit <limit>, and <jobs> jobs

    Examples:
      | parameters    | page | limit | jobs |
      |               | 1    | 10    | 10   |
      | limit=1       | 1    | 1     | 1    |
      | limit=100     | 1    | 100   | 18   |
      | limit=6&page=3 | 3   | 6     | 6    |

  @BR-16 @N-06
  Scenario Outline: API pagination outside the accepted range
    When I call "GET /api/jobs" with "<parameters>"
    Then I get 422 with an error message and no list

    Examples:
      | parameters |
      | limit=0    |
      | limit=-5   |
      | limit=101  |
      | limit=abc  |
      | page=0     |
      | page=-1    |
      | page=abc   |
      | limit=2.9  |
      | page=1.5   |
```

**US-06 — Search and filter jobs**

```gherkin
Feature: Search and filters

  Background:
    Given I am on the home page "/"

  @FR-10
  Scenario: The list reloads once I stop typing
    When I type "ana" in the search one letter at a time
    Then a single search request is sent, after the last letter
    # Implementation: about 250 ms after the last letter
    And I see "7 job(s) found"

  @BR-13
  Scenario Outline: Search ignores case and looks in the title, description, and company
    When I search for "<term>"
    Then the result lists <jobs>

    Examples:
      | term          | where it appears | jobs                                              |
      | QA AUTOMATION | title            | "QA Automation Analyst"                           |
      | BANKS         | description      | "Backend Node.js Developer"                       |
      | nimbus        | company          | "QA Automation Analyst", "Backend Node.js Developer" |

  @BR-13
  Scenario Outline: Requirements, city, and area are not searched
    When I search for "<term>"
    Then I see "0 job(s) found"

    Examples:
      | term           |
      | Express        |
      | Belo Horizonte |
      | healthcare     |

  @BR-13 @N-04
  Scenario: The API ignores spaces around the search term
    When I call "GET /api/jobs?q=%20qa%20"
    Then the result lists "QA Automation Analyst"

  @BR-14 @FR-10 @FR-11
  Scenario: Filters are combined
    When I select the area "Technology"
    Then I see "3 job(s) found"
    When I also select the level "Mid-level" and the work model "Remote"
    Then I see "2 job(s) found"
    And I see "Unity Game Developer" and "Backend Node.js Developer"
    When I change the work model to "On-site"
    Then I see "0 job(s) found"
    And I see "No jobs found with these filters."

  @BR-14
  Scenario Outline: Filters require the exact value
    When I call "GET /api/jobs?area=<area>"
    Then <result>

    Examples:
      | area       | result             |
      | Technology | 3 jobs are returned |
      | technology | no job is returned  |
      | Tech       | no job is returned  |

  @FR-13
  Scenario: Search from the header
    Given I am on the page of job 1
    When I type "nimbus" in the header search and press Enter
    Then I am taken to "/?q=nimbus"
    And the home search field shows "nimbus"
    And I see "2 job(s) found"
```

**US-07 — Sort jobs**

```gherkin
Feature: Sorting

  Background:
    Given I am on the home page "/"

  @BR-15
  Scenario: Most recent first by default
    Then the sort shows "Most recent"
    And the first job is "Junior Game Designer" (id 20)
    And the jobs follow descending id order

  @BR-15 @FR-12
  Scenario: Sort by title A-Z
    When I select the sort "Title (A-Z)"
    And I scroll to the end of the list
    Then the 18 jobs are in alphabetical order
    And the first is "Accounting Intern" and the last is "Unity Game Developer"
```

**US-08 — See a job's details**

```gherkin
Feature: Job details

  @FR-14
  Scenario: Details of an open job
    When I open "/pages/vaga.html?id=1"
    Then I see the title "Backend Node.js Developer"
    And I see "Nimbus Tech · São Paulo, SP"
    And I see the tags "Technology", "Mid-level", "Full-time", and "Remote"
    And I see the salary "R$ 7,000 - R$ 9,500", the description, and the requirements
    And I see "4.5 out of 5 (2 reviews)" for the company
    And I see "View company profile →" linking to "/pages/empresa.html?id=1"

  @BR-17
  Scenario Outline: A job that is not open shows the notice and blocks applying
    When I open the page of job <id>
    Then I see "This job is no longer accepting applications."
    And the button shows "Job closed" and is disabled

    Examples:
      | id | status |
      | 14 | closed |
      | 4  | closed |
    # The same applies to any status other than "open", e.g. "paused"

  @BR-18
  Scenario: Job without requirements
    Given a job registered without requirements
    When I open its page
    Then I see "Not specified." under "Requirements"

  @BR-18 @GR-02 @N-05
  Scenario: Requirements with only spaces are rejected
    Given I am signed in as a company
    When I save a job with requirements containing only spaces
    Then I get 422 with the message "This field can't contain only spaces"
    And the job is not saved
    And on the company's job form the same message is shown and nothing is sent
    # Fixed on 2026-11-04 (Q-03); the API used to save the job with empty requirements

  @BR-18
  Scenario: Spaces around the requirements are removed
    When a company saves a job with the requirements "  Node.js  "
    Then the requirements are saved as "Node.js"

  @FR-15
  Scenario Outline: Missing or nonexistent job
    When I open "/pages/vaga.html<query>"
    Then I see "Job not found. Back to all jobs."
    And "Back to all jobs" links to "/"

    Examples:
      | query    |
      |          |
      | ?id=     |
      | ?id=9999 |
      | ?id=abc  |

  @BR-19
  Scenario: Legacy job address
    When I open "/vaga-antiga/14"
    Then I get 302 and am redirected to "/pages/vaga.html?id=14"

  @BR-19 @N-24
  Scenario Outline: A legacy address without a valid id
    When I open "/vaga-antiga/<id>"
    Then I get 404 and the page "404 — Page not found"

    Examples:
      | id  |
      | abc |
      | 0   |
      | -1  |
      | 1.5 |
    # Fixed on 2026-11-04 (N-24); it used to redirect any value
```

## Business rules

| ID | Rule |
| --- | --- |
| BR-12 | By default, the list shows only jobs with `status = open`. The API accepts `status=all` or a specific status. |
| BR-13 | The text search is not case-sensitive, ignores spaces around the term (on screen and in the API), and looks in the title, the description, and the company name. |
| BR-14 | Filters are combined (logical AND) and require an exact value. |
| BR-15 | Default sort: most recent first (descending id). Alternative on screen: title A-Z. |
| BR-16 | The home page loads 6 jobs per page. The API accepts `limit` from 1 to 100 (default 10) and `page` ≥ 1 (default 1). A value that is not a whole number or is outside this range returns 422, with no list. A page after the last one returns 200 with an empty list. |
| BR-17 | A job with a status other than `open` is still reachable through its details page, but shows a closed notice and blocks applying on screen. |
| BR-18 | The requirements are optional. A job without requirements shows "Not specified.". When a job is saved, the spaces around the requirements are removed, and requirements with only spaces are rejected with 422 "This field can't contain only spaces", like any other optional field (GR-02). |
| BR-19 | The legacy address `/vaga-antiga/{id}` redirects (302) to the job details page when the id is a whole number from 1 up; any other value shows the 404 page (N-24). |

**Filter values**

| Filter | Options |
| --- | --- |
| Area | Technology, Procurement, Operations, Finance, Consulting, Human Resources, Design, Marketing, Logistics, Healthcare, Customer Service, Education, Engineering |
| Level | Intern, Junior, Mid-level, Senior |
| Work model | Remote, Hybrid, On-site |
| Sort | Most recent, Title (A-Z) |

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-09 | The home page must list jobs as cards with logo, title, company, city, level, contract type, work model, and salary. These fields are shown as plain text, never as HTML, and the API removes HTML tags from the job and company fields before saving (N-21). |
| FR-10 | The search must reload the list once the user stops typing, not on every letter; filters reload the list when changed. _Implementation: the search waits about 250 ms after the last letter._ |
| FR-11 | The system must show "{n} job(s) found" and, with no results, "No jobs found with these filters.". |
| FR-12 | The list must load the next page when scrolling to the end (infinite scroll), with a "loading more jobs..." indicator. |
| FR-13 | The header search must go to the home page with the term already applied in `?q=`. |
| FR-14 | The details page must show title, company, city, tags (area, level, contract, model), salary, description, requirements, the company's average rating, and the "View company profile →" link. |
| FR-15 | A missing or nonexistent id must show "Job not found. Back to all jobs.". |
