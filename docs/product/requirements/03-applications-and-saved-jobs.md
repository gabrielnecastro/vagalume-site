# Module 3 — Applications and saved jobs

[← Specification index](../../README.md) · [Screen vs. API divergences](../../divergences.md) · [Decisions and fixes](../../decisions.md) · [Global rules](../global-rules.md)

A candidate can apply through the "Apply now" button on the job details page or through the shortcut on the cards (home page, company profile, and saved jobs). Endpoint: `POST /api/jobs/:id/apply`. Saved jobs are stored in the browser, not in the account (BR-25). _Implementation: `localStorage`, key `vagalume_saved_jobs`._

## User stories

- **US-09** — As a candidate, I want to apply to an open job with one click.
- **US-10** — As a candidate, I want to be told if I have already applied so I don't apply twice.
- **US-11** — As a candidate, I want to save jobs to review later.
- **US-12** — As a candidate, I want to see and remove my saved jobs on the dashboard.

## Acceptance criteria

The criteria below describe the expected behavior of the current version. Tags link each scenario to its rules (`@BR-xx`, `@FR-xx`, `@GR-xx`) and to the decision it came from (`@D-xx`, `@N-xx`). A scenario with no state tag is decided, and the app is expected to do what it says. Two tags mark exceptions: `@pending-decision` (the actual behavior is known, but the expected behavior has not been decided) and `@known-bug` (decided as a defect: the scenario describes the expected behavior and fails until the fix). Whether and when a scenario was checked against the running app is recorded only in the [validation reports](../../results/validation/README.md).

**US-09 — Apply to an open job**

```gherkin
Feature: Applying to a job

  @BR-20 @BR-22 @FR-18
  Scenario: Apply from a job card
    Given I am signed in as a candidate on the home page
    When I click "Apply now" on a job I have not applied to
    Then the button changes to "Applied ✅" and is disabled
    And I see the toast "Application sent successfully!"
    And the application is created with the status "received" and the date and time it was sent

  @FR-18
  Scenario: Apply from the job details page
    Given I am signed in as a candidate on the page of an open job I have not applied to
    When I click "Apply now"
    Then I see "Application sent ✅" and the button is disabled
    And I see the toast "Application sent successfully!"

  @BR-20 @FR-16
  Scenario Outline: A visitor is taken to sign-in
    Given I am not signed in
    When I click "Apply now" on <place>
    Then the toast "Sign in with a candidate account to apply" is shown
    And I am redirected to "/pages/entrar.html"

    Examples:
      | place                       |
      | a job card on the home page |
      | the job details page        |

  @FR-16 @N-10
  Scenario: The visitor reads the message on the sign-in page
    Given I am not signed in
    When I click "Apply now" on a job
    Then I am on "/pages/entrar.html"
    And the sign-in page shows "Sign in with a candidate account to apply"

  @BR-20 @BR-24 @FR-17
  Scenario: A company account cannot apply
    Given I am signed in as a company
    Then the job cards on the home page and on the company profile have no "Apply now" or save buttons
    And on the job details page the button shows "Employer accounts can't apply" and is disabled
    And "POST /api/jobs/:id/apply" returns 403

  @FR-20
  Scenario: Other errors re-enable the card button
    Given I am on the home page as a candidate
    And my session has ended in the meantime
    When I click "Apply now" on a job card
    Then I see the toast "Please log in to continue"
    And the button is enabled again

  @BR-23
  Scenario: A closed job cannot be applied to from its page
    When I open the page of the closed job 14
    Then the button shows "Job closed" and is disabled

  @BR-23 @D-01
  Scenario: The API rejects applications to a closed job
    Given I am signed in as a candidate
    When I call "POST /api/jobs/14/apply" for the closed job 14
    Then I get 409 with the error "job_closed" and the message "This job is no longer accepting applications."

  @BR-23 @N-23
  Scenario Outline: A job closed after the page loaded
    Given I opened <screen> while the job was open
    And the company closed the job afterwards
    When I click "Apply now"
    Then <result>
    And I do not see "Already applied"

    Examples:
      | screen                                             | result                                                                                                  |
      | the home page, the company profile, or Saved jobs  | the button shows "Job closed", disabled, and the error toast "This job is no longer accepting applications." |
      | the job page                                       | I see "This job is no longer accepting applications." and the button shows "Job closed", disabled        |

  @BR-20 @GR-06 @N-03
  Scenario: Applying while signed out returns 401
    Given I am not signed in
    When I call "POST /api/jobs/1/apply"
    Then I get 401 with the error "not_authenticated"
    And with an invalid session I get 401 with the error "invalid_session"
    # Fixed on 2026-11-04 (Q-01); the API used to return 403
```

**US-10 — Be told I have already applied**

```gherkin
Feature: Duplicate application

  Background:
    Given I am signed in as a candidate who has already applied to the job

  @BR-21 @FR-19
  Scenario: Apply again from a job card
    When I click "Apply now" on the job card
    Then the button changes to "Already applied" and is disabled

  @BR-21 @FR-19
  Scenario: Apply again from the job details page
    When I click "Apply now" on the job page
    Then I see "You have already applied to this job" and the button is disabled

  @FR-19 @N-09
  Scenario Outline: The applied state shows as soon as the screen loads
    When I open <screen>
    Then <state> without clicking anything

    Examples:
      | screen                                   | state                                                                      |
      | the page of a job I have applied to      | I see "You have already applied to this job" and the button is disabled  |
      | a job card for a job I have applied to   | the button shows "Already applied" and is disabled                        |

  @BR-21
  Scenario: The API rejects a second application
    When I call "POST /api/jobs/:id/apply" again for the same job
    Then I get 409 "already_applied" with "You have already applied to this job"
```

**US-11 — Save jobs to review later**

```gherkin
Feature: Saving jobs

  @FR-21
  Scenario: Save and unsave from a job card
    Given I am on the home page
    When I click the bookmark icon on a job card
    Then the icon is pressed (aria-pressed="true")
    And I see the toast "Job saved"
    When I click the bookmark icon again
    Then the icon is no longer pressed (aria-pressed="false")
    And I see the toast "Job removed from saved"

  @BR-25
  Scenario: Saved jobs belong to the browser, not to the account
    Given I saved a job while signed in as a candidate
    When I sign out
    Then the job card still shows the bookmark pressed
    And I can save and unsave jobs without signing in
```

**US-12 — See and remove my saved jobs**

```gherkin
Feature: Saved jobs on the dashboard

  Background:
    Given I am signed in as a candidate
    And I open "Saved jobs" on my dashboard

  @FR-22
  Scenario: Remove a saved job from the list
    Given I have saved jobs
    When I click the bookmark icon on a saved job
    Then its card disappears from the list
    And I see the toast "Job removed from saved"

  @FR-22
  Scenario: Apply directly from the list
    Given I have saved a job I have not applied to
    When I click "Apply now" on its card
    Then the button changes to "Applied ✅"
    And I see the toast "Application sent successfully!"

  @BR-23 @N-07
  Scenario: A saved closed job cannot be applied to
    Given I have saved a job that is now closed
    Then its card stays in the list
    And its button shows "Job closed" and is disabled

  @FR-23
  Scenario Outline: No saved jobs
    Given <situation>
    Then I see "You haven't saved any jobs yet."

    Examples:
      | situation                              |
      | I have never saved a job               |
      | I have just removed my last saved job  |

  @BR-26 @N-08
  Scenario: A saved job that no longer exists stays with a tag
    Given I saved a job that was later deleted
    Then its card shows the job's title and company
    And the tag "This job is no longer available"
    And there is no "Apply now" button
    When I click the bookmark icon
    Then its card disappears from the list

  @BR-26 @N-08
  Scenario: A legacy saved entry has only the job id
    Given a saved job id that no longer exists and has no saved title or company
    Then its card shows only the tag "This job is no longer available" and the bookmark
```

## Business rules

| ID | Rule |
| --- | --- |
| BR-20 | Only authenticated users with a candidate account can apply. On screen, a visitor is taken to sign-in. Through the API, a visitor gets 401 `not_authenticated` and a company account gets 403 `forbidden` (GR-06). |
| BR-21 | Each candidate can apply only once per job. A repeat returns 409 `already_applied`. |
| BR-22 | Every application starts with status `received` and the submission date and time. |
| BR-23 | A closed job does not accept applications, on screen or through the API: the job page and the "Saved jobs" list show a disabled "Job closed" button, and `POST /api/jobs/:id/apply` returns 409 `job_closed` "This job is no longer accepting applications.". If the job is closed after the page loads, a click on "Apply now" shows "Job closed", disabled, and that message, not "Already applied" (N-23). |
| BR-24 | A company account does not see the apply and save buttons on cards; on the details page, the button appears disabled as "Employer accounts can't apply". |
| BR-25 | Saved jobs are per browser, not per account: they do not require sign-in, do not sync across devices, and are shared by anyone using the same browser. |
| BR-26 | A saved job that no longer exists stays in the "Saved jobs" list with its title and company, the tag "This job is no longer available", no "Apply now", and the bookmark to remove it. To make this possible, the browser saves the title and company together with the job id. Legacy entries (saved as a plain id, without title and company) show only the tag and the bookmark. |

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-16 | A visitor who clicks "Apply now" must be redirected to sign-in, and the sign-in page must show "Sign in with a candidate account to apply", so the visitor can read it. |
| FR-17 | A company must not be offered an application: the job cards show no "Apply now" or save buttons, and the job page shows the button "Employer accounts can't apply", disabled. |
| FR-18 | Application sent: on the card, the button changes to "Applied ✅"; on the details page, it shows "Application sent ✅" and disables the button; toast "Application sent successfully!". |
| FR-19 | Duplicate application: on the card, the button shows "Already applied"; on the details page, it shows "You have already applied to this job" and disables the button. This state appears as soon as the page or the cards load for a candidate who has already applied, not only after a click. |
| FR-20 | Other errors must re-enable the button (on cards) and show a toast with the API message or "Couldn't send the application". |
| FR-21 | The bookmark icon must toggle saving the job (`aria-pressed`), with the toast "Job saved" or "Job removed from saved". |
| FR-22 | The dashboard's "Saved jobs" section must list the saved jobs, allow applying directly, and remove the card when unchecked. |
| FR-23 | With no saved jobs, the dashboard must show "You haven't saved any jobs yet.". |
