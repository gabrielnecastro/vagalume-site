# Module 4 — Companies and reviews

[← Specification index](../../README.md) · [Screen vs. API divergences](../../divergences.md) · [Decisions and fixes](../../decisions.md) · [Global rules](../global-rules.md)

Pages `/pages/empresas.html` (list), `/pages/empresa.html?id={id}` (profile), and the reviews section on the job details page. Endpoints: `GET /api/companies`, `GET /api/companies/:id`, `/jobs`, `/reviews`, `POST|DELETE /api/companies/:id/follow`, `GET|POST /api/jobs/:id/reviews`, `DELETE /api/reviews/:id`.

## User stories

- **US-13** — As a candidate, I want to see and search the registered companies to know who is hiring.
- **US-14** — As a candidate, I want to see a company's profile with its open jobs, average rating, and reviews.
- **US-15** — As a candidate, I want to follow and unfollow companies I'm interested in.
- **US-16** — As a candidate, I want to review a job with a rating and a comment, saying whether I was an employee, to help other candidates.
- **US-17** — As a candidate, I want to see and delete the reviews I posted.

## Acceptance criteria

The criteria below describe the expected behavior of the current version. Tags link each scenario to its rules (`@BR-xx`, `@FR-xx`, `@GR-xx`) and to the decision it came from (`@D-xx`, `@N-xx`). A scenario with no state tag is decided, and the app is expected to do what it says. Two tags mark exceptions: `@pending-decision` (the actual behavior is known, but the expected behavior has not been decided) and `@known-bug` (decided as a defect: the scenario describes the expected behavior and fails until the fix). Whether and when a scenario was checked against the running app is recorded only in the [validation reports](../../results/validation/README.md).

**US-13 — See and search companies**

```gherkin
Feature: Company list and search

  @FR-24
  Scenario: See the registered companies
    Given I am on "/pages/empresas.html"
    Then I see 10 company cards with logo, name, industry, and city
    And a company with reviews shows "★ {average}", for example "★ 4.5" for Nimbus Tech
    And a company without reviews shows "No reviews"
    And the search field shows "Search company by name, sector, or city..."

  @BR-27
  Scenario Outline: Search by name, industry, or city, ignoring case
    Given I am on "/pages/empresas.html"
    When I type "<term>" in the search field
    Then I see only <companies>

    Examples:
      | term     | companies                    |
      | nimbus   | Nimbus Tech                  |
      | TECH     | Nimbus Tech and Arctic Games |
      | design   | Pixel Studio                 |
      | curitiba | Trail Logistics              |

  @BR-27
  Scenario: Spaces around the term are ignored
    Given I am on "/pages/empresas.html"
    When I type "  remote  " in the search field
    Then I see only Vector Financial, Pixel Studio, and Compass Education

  @BR-27 @FR-24
  Scenario: No company found
    Given I am on "/pages/empresas.html"
    When I type "zzz" in the search field
    Then no company card is shown
    And I see "No companies found."
```

**US-14 — See a company's profile**

```gherkin
Feature: Company profile

  @FR-25
  Scenario: Company with reviews
    When I open "/pages/empresa.html?id=1"
    Then I see the logo, the name "Nimbus Tech", and "Technology · São Paulo, SP"
    And I see "4.5 out of 5 (2 reviews)" and the company description

  @FR-25
  Scenario: Company without reviews
    When I open "/pages/empresa.html?id=2"
    Then I see "No reviews yet"

  @FR-25 @N-16
  Scenario Outline: The stars show half stars
    Given a company's average is <average>
    When I open its profile
    Then the stars show <stars>

    Examples:
      | average | stars                      |
      | 4.2     | 4 full stars               |
      | 4.25    | 4 full stars and a half    |
      | 4.5     | 4 full stars and a half    |
      | 4.74    | 4 full stars and a half    |
      | 4.75    | 5 full stars               |

  @FR-25
  Scenario: Reviews section on the profile
    When I open "/pages/empresa.html?id=1"
    Then the "Reviews" section lists the 2 reviews of the company's jobs, newest first
    And each one shows author, date, stars, "Former employee" when applicable, and the comment

  @FR-25
  Scenario: Reviews section without reviews
    When I open "/pages/empresa.html?id=2"
    Then the "Reviews" section shows "There are no reviews for this company yet."

  @BR-28
  Scenario: Only open jobs are listed
    Given Grain Foods has the open job 3 and the closed job 4
    When I open "/pages/empresa.html?id=2"
    Then "Open jobs at this company" shows only job 3

  @BR-29
  Scenario: The average follows each new review
    Given Grain Foods has no reviews
    When candidates post reviews with 4, 5, and 4 stars, one after the other
    Then the company average becomes 4, then 4.5, then 4.4
    # 13 / 3 = 4.333, always rounded up (decided on 2026-11-04; it used to show 4.3)

  @FR-27
  Scenario Outline: Company that does not exist
    When I open "/pages/empresa.html?id=<id>"
    Then I see "Company not found. Back to companies."
    And "GET /api/companies/<id>" returns 404 "Company not found"

    Examples:
      | id  |
      | 999 |
      | abc |

  @FR-27 @N-14
  Scenario: Profile without an id
    When I open "/pages/empresa.html" without an id
    Then I see "Company not found. Back to companies."
    And the breadcrumb shows "company not found"
```

**US-15 — Follow and unfollow companies**

```gherkin
Feature: Following companies

  @BR-30 @FR-26
  Scenario: Follow and unfollow a company
    Given I am signed in as a candidate on the profile of a company I don't follow
    When I click "+ Follow company"
    Then the button changes to "✓ Following"
    And I see the toast "You're now following this company"
    And after reloading the page the button still shows "✓ Following"
    When I click "✓ Following"
    Then the button changes to "+ Follow company"
    And I see the toast "You unfollowed this company"

  @FR-26 @N-13
  Scenario Outline: A failed follow or unfollow shows an error
    Given I am on the profile of a company I <state>
    And my session has ended behind the page
    When I click "<button>"
    Then I see the error toast "Please log in to continue"
    And the button still shows "<button>"

    Examples:
      | state        | button           |
      | don't follow | + Follow company |
      | follow       | ✓ Following      |

  @BR-30
  Scenario: Following twice does not create a duplicate
    Given I am signed in as a candidate who follows company 2
    When I call "POST /api/companies/2/follow" again
    Then I get 201
    And "GET /api/users/me/followed-companies" lists company 2 only once

  @BR-30 @FR-26
  Scenario Outline: Only candidates can follow companies
    Given I am <who>
    When I open "/pages/empresa.html?id=2"
    Then I see no follow button
    And "POST /api/companies/2/follow" returns <status>

    Examples:
      | who                     | status |
      | not signed in           | 401    |
      | signed in as a company  | 403    |
```

**US-16 — Review a job**

```gherkin
Feature: Reviewing a job

  @FR-28
  Scenario Outline: Visitors and companies cannot review
    Given I am <who>
    When I open the page of job 3
    Then the review form is not shown
    And I see "Sign in with a candidate account to review this job."

    Examples:
      | who                    |
      | not signed in          |
      | signed in as a company |

  @BR-30
  Scenario Outline: The API accepts reviews only from candidates
    Given I am <who>
    When I call "POST /api/jobs/3/reviews" with a rating and a comment
    Then I get <status>

    Examples:
      | who                    | status |
      | not signed in          | 401    |
      | signed in as a company | 403    |

  @FR-29
  Scenario: Review without stars
    Given I am signed in as a candidate on the page of job 3
    When I write a comment and click "Post review" without choosing stars
    Then I see "Select a rating from 1 to 5 stars"
    And no review is created

  @BR-31
  Scenario: Review without a comment on screen
    Given I am signed in as a candidate on the page of job 3
    When I choose 2 stars and click "Post review" with the comment empty
    Then the browser blocks the form with its required-field message
    And no review is created

  @BR-31
  Scenario Outline: The API requires a rating and a comment
    Given I am signed in as a candidate
    When I call "POST /api/jobs/3/reviews" without <field>
    Then I get 422 "validation_error" with the message "Rating and comment are required"

    Examples:
      | field     |
      | a rating  |
      | a comment |

  @BR-31 @BR-32 @FR-30 @FR-31
  Scenario: Post a review as a former employee
    Given I am signed in as a candidate on the page of job 3, which has no reviews
    When I choose 4 stars, write "QA M4 review with 4 stars", tick "I was hired / was an employee at this company", and click "Post review"
    Then I see the toast "Review posted!"
    And the form is cleared: no stars, an empty comment, and the box unticked
    And, without reloading the page, the list shows my name, today's date, 4 stars, the comment, and "Former employee"
    And the company rating changes from "No reviews yet" to "4 out of 5 (1 review)"
    And the review is saved with my account as author, the job, the job's company, and the creation date

  @BR-31
  Scenario: "I was an employee" is optional
    Given I am signed in as a candidate
    When I call "POST /api/jobs/3/reviews" with only a rating and a comment
    Then I get 201 and the review has "wasEmployee" false

  @BR-33
  Scenario: Only one review per job
    Given I have already reviewed job 3
    When I open the page of job 3
    Then the review form is not shown
    And I see "You have already reviewed this job"
    And "POST /api/jobs/3/reviews" returns 409 "already_reviewed" with "You have already reviewed this job"
    # Decided on 2026-11-04 (it used to accept several reviews on the same job)

  @BR-33
  Scenario: Reviewing again after deleting the review
    Given I have deleted my review of job 3
    When I open the page of job 3
    Then the review form is shown again and I can post a new review

  @FR-31
  Scenario: Job without reviews
    When I open the page of job 3, which has no reviews
    Then I see "There are no reviews for this job yet. Be the first to leave one!"

  @BR-31 @N-11
  Scenario: HTML tags are removed from the comment
    Given I am signed in as a candidate
    When I call "POST /api/jobs/3/reviews" with the comment "Ótima empresa <b>recomendo</b>"
    Then I get 201 and the comment is saved as "Ótima empresa recomendo"
    And the comment "nota 4 < 5 e salário > 5 mil" is saved as written

  @BR-31 @N-12
  Scenario Outline: A comment with only spaces or only tags is empty
    Given I am signed in as a candidate
    When I call "POST /api/jobs/3/reviews" with the comment <comment>
    Then I get 422 "validation_error" with the message "Rating and comment are required"

    Examples:
      | comment         |
      | of three spaces |
      | "<b></b>"       |
      | "<b> </b>"      |

  @FR-31 @N-15
  Scenario Outline: The review date is shown in Brazil time, in the browser's date format
    Given a review created on "2026-06-01T00:00:00Z"
    When I see it in a browser set to <language>, on a computer in any time zone
    Then its date shows "<date>", the date in Brazil (America/Sao_Paulo, UTC−3)

    Examples:
      | language            | date       |
      | English (US)        | 5/31/2026  |
      | Portuguese (Brazil) | 31/05/2026 |
    # The format follows the browser's language (decided on 2026-11-04)
    # Decided on 2026-11-04: Brazil time, whatever the viewer's time zone (it used to follow the viewer's time zone)

  @BR-31 @D-04
  Scenario Outline: The API rejects ratings outside 1 to 5
    Given I am signed in as a candidate
    When I call "POST /api/jobs/3/reviews" with the rating <rating> and a comment
    Then I get 422 with the message "The rating must be a whole number from 1 to 5"

    Examples:
      | rating |
      | 6      |
      | 10     |
      | -3     |
      | 4.5    |
      | "abc"  |
      | true   |
```

**US-17 — See and delete my reviews**

```gherkin
Feature: My reviews

  @FR-40
  Scenario: See my reviews in the dashboard
    Given I am signed in as a candidate who has posted reviews
    When I open "Reviews and contributions" in the dashboard
    Then each review shows its stars, its comment, a "View job" link, and a "Delete" button

  @BR-34 @FR-40
  Scenario: Delete my own review
    Given I am on "Reviews and contributions" in the dashboard
    When I click "Delete" on one of my reviews
    Then I see the toast "Review deleted"
    And the review leaves the list and the job page

  @FR-40 @N-13
  Scenario: A failed delete shows an error
    Given I am on "Reviews and contributions" and my session has ended behind the page
    When I click "Delete" on one of my reviews
    Then I see the error toast "Please log in to continue"
    And the review stays in the list

  @BR-34
  Scenario: I cannot delete someone else's review
    Given I am signed in as a candidate
    When I call "DELETE /api/reviews/1", written by another author
    Then I get 403 "forbidden" with the message "You can only delete your own reviews"

  @BR-34
  Scenario: Reviews cannot be edited
    Given I am signed in as a candidate
    When I call "PUT /api/reviews/4" or "PATCH /api/reviews/4"
    Then I get 404 "This API route does not exist"

  @BR-34 @D-05
  Scenario: A candidate with the same name cannot delete my review
    Given candidate B has the same name as me
    Then B's "GET /api/users/me/reviews" does not list my review
    When B calls "DELETE" on my review
    Then B gets 403 "forbidden" with the message "You can only delete your own reviews"

  @BR-34 @D-05
  Scenario: Changing my name keeps my reviews
    Given I posted a review
    When I change my name in Account settings
    Then "Reviews and contributions" still lists my review
    And I can delete it
```

## Business rules

| ID | Rule |
| --- | --- |
| BR-27 | The company search runs on screen, is not case-sensitive, and matches name, industry, or city. |
| BR-28 | The company profile lists only jobs with `status = open`. |
| BR-29 | The company's average rating is the average of all reviews of its jobs, always rounded up to 1 decimal place (4.21 → 4.3, 4.25 → 4.3, 4.333 → 4.4; an exact 4.3 stays 4.3). With no reviews, the average is null. |
| BR-30 | Only candidates can follow companies and review jobs. Following the same company twice does not create a duplicate. |
| BR-31 | A rating (1 to 5 stars) and a comment are required in a review. The API accepts only a whole number from 1 to 5 and returns 422 "The rating must be a whole number from 1 to 5" otherwise. HTML tags are removed from the comment before saving, and a comment with only spaces or only tags counts as empty. "I was an employee" is optional (default: no). |
| BR-32 | The review records the author's account (used for ownership, BR-34), the job, the job's company, and the creation date. The author is shown by the account's current name. |
| BR-33 | A candidate can post only one review per job. A second review returns 409 `already_reviewed` "You have already reviewed this job", and the job page shows that message instead of the form. After deleting the review, the candidate can review the job again. |
| BR-34 | A candidate can delete only their own reviews. Ownership is checked by the account that wrote the review, not by the name, so a namesake cannot delete it and a rename keeps it. Reviews cannot be edited. |

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-24 | The company list must show logo, name, industry, city, and "★ {average}" or "No reviews"; with no results, "No companies found.". The search field shows "Search company by name, sector, or city...". Company and job fields are shown as plain text, never as HTML, here and in the profile's job list (N-21). |
| FR-25 | The profile must show logo, name, industry, city, stars, "{average} out of 5 ({n} review(s))" or "No reviews yet", and the description (or "This company hasn't added a description yet."). The stars show half stars: from x.25 to x.74 a half star; below x.25 the average rounds down, and from x.75 it rounds up. The profile also has a "Reviews" section listing all reviews of the company's jobs, newest first, with the same card as the job page (author, date, stars, "Former employee" badge, and comment, as plain text); with no reviews: "There are no reviews for this company yet.". |
| FR-26 | The follow button must appear only for candidates, toggling between "+ Follow company" and "✓ Following", with the toasts "You're now following this company" / "You unfollowed this company" only when the API confirms; on failure, an error toast with the API message (or "Couldn't follow this company" / "Couldn't unfollow this company") and the button unchanged. |
| FR-27 | A nonexistent company must show "Company not found. Back to companies.". The breadcrumb shows "company not found", also when the page has no `id`. |
| FR-28 | Visitors and companies must see, in place of the review form, "Sign in with a candidate account to review this job.". |
| FR-29 | Submitting a review without stars must show "Select a rating from 1 to 5 stars". |
| FR-30 | A posted review must show the toast "Review posted!", clear the form, and update the list and the company's rating without reloading the page. |
| FR-31 | Each review must show author, date, stars, comment, and the "Former employee" badge when applicable; author and comment are shown as plain text, never as HTML. The date is shown in Brazil time (America/Sao_Paulo), whatever the viewer's time zone, in the date format of the browser's language. With no reviews: "There are no reviews for this job yet. Be the first to leave one!". |
