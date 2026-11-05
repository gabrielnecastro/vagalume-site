# Module 5 — Candidate dashboard

[← Specification index](../../README.md) · [Screen vs. API divergences](../../divergences.md) · [Decisions and fixes](../../decisions.md) · [Global rules](../global-rules.md)

Page `/pages/candidato/painel.html`, with a side menu: Resume and experience, Job preferences, Job activity, Saved jobs (Module 3), Followed companies, Reviews and contributions, Account settings, Notifications, and Help center. "My courses" is out of scope.

## User stories

- **US-18** — As a candidate, I want to upload my résumé as a file to attach it to my applications.
- **US-19** — As a candidate, I want to add and remove work experience.
- **US-20** — As a candidate, I want to record job preferences (area, level, work model, salary, availability).
- **US-21** — As a candidate, I want to track the status of my applications.
- **US-22** — As a candidate, I want to see and unfollow the companies I follow.
- **US-23** — As a candidate, I want to change my name, city, and password.

## Acceptance criteria

The criteria below describe the expected behavior of the current version. Tags link each scenario to its rules (`@BR-xx`, `@FR-xx`, `@GR-xx`) and to the decision it came from (`@D-xx`, `@N-xx`). A scenario with no state tag is decided, and the app is expected to do what it says. Two tags mark exceptions: `@pending-decision` (the actual behavior is known, but the expected behavior has not been decided) and `@known-bug` (decided as a defect: the scenario describes the expected behavior and fails until the fix). Whether and when a scenario was checked against the running app is recorded only in the [validation reports](../../results/validation/README.md).

**Access to the dashboard**

```gherkin
Feature: Dashboard access

  @BR-35
  Scenario Outline: Only candidates see the dashboard
    Given I am <who>
    When I open "/pages/candidato/painel.html"
    Then I see "You need to sign in with a candidate account to see this dashboard." with a "Sign in" link
    And the dashboard is not shown

    Examples:
      | who                    |
      | not signed in          |
      | signed in as a company |

  @FR-32 @FR-33
  Scenario: Profile card and side menu
    Given I am signed in as a candidate named "Ana Souza" without a city
    When I open the dashboard
    Then the profile card shows "AS", "ANA SOUZA", and "City not specified"
    And "Resume and experience" is the only section shown, with its menu item highlighted
    When I click each menu item
    Then only that item's section is shown, and only that item is highlighted
    When I click ✏️
    Then "Account settings" is shown

  @BR-35 @D-09
  Scenario Outline: Candidate endpoints require the candidate role
    Given I am signed in as a company
    When I call "<route>"
    Then I get 403 "forbidden" with the message "Only "candidate" accounts can access this"
    And nothing is created or changed

    Examples:
      | route                         |
      | GET /api/users/me/experiences |
      | POST /api/users/me/experiences |
      | PUT /api/experiences/1        |
      | DELETE /api/experiences/1     |
      | GET /api/users/me/preferences |
      | PUT /api/users/me/preferences |
      | POST /api/users/me/resume     |
```

**US-18 — Upload my résumé**

```gherkin
Feature: Résumé upload

  @BR-36 @FR-34
  Scenario: Upload a résumé
    Given I am on "Resume and experience" in the dashboard
    When I choose the file "qa-m5-resume.pdf"
    Then I see its name next to "Choose file"
    When I click "Upload resume"
    Then I see "Resume uploaded: /uploads/{file}" and the toast "Resume uploaded successfully!"

  @FR-34
  Scenario: The uploaded résumé is shown when the dashboard opens
    Given I have uploaded a résumé
    When I reload the dashboard
    Then I see "Current resume: /uploads/{file}" with a link that opens the file in a new tab

  @BR-36
  Scenario: A new upload replaces the previous one
    Given I have uploaded a résumé
    When I upload another file
    Then my profile's résumé link points to the new file

  @BR-36
  Scenario: The API requires a file
    When I call "POST /api/users/me/resume" without a file
    Then I get 400 "no_file" with the message "No file was uploaded"

  @BR-36 @D-07
  Scenario: The API accepts only .pdf, .doc, and .docx
    When I call "POST /api/users/me/resume" with "qa.sh"
    Then I get 422 "invalid_file_type" with the message "Only .pdf, .doc, and .docx files are accepted"
    And my current résumé does not change

  @BR-36 @D-07
  Scenario: Submitting without a file gives feedback
    Given I am on "Resume and experience" without a chosen file
    When I click "Upload resume"
    Then I see "Choose a file to upload" and no request is sent

  @BR-36 @N-02
  Scenario: A file over 5 MB gets a size-limit error
    When I call "POST /api/users/me/resume" with a file of 5 MB + 10 bytes
    Then I get 422 "file_too_large" with the message "The file must be at most 5 MB"
    And on screen the same message appears without sending the file

  @BR-36
  Scenario: A file of exactly 5 MB is accepted
    When I call "POST /api/users/me/resume" with a .pdf file of exactly 5 MB
    Then I get 201 and the file becomes my current résumé

  @BR-36
  Scenario: The résumé keeps its extension and replaces the old file
    Given my current résumé was uploaded as "QA-CV.PDF" and is saved as "/uploads/{id}.pdf"
    When I upload "qa-cv.docx"
    Then the new résumé is saved as "/uploads/{id}.docx"
    And the old address returns 404
```

**US-19 — Add and remove work experience**

```gherkin
Feature: Work experience

  @FR-35
  Scenario: Cancel the experience form
    Given I clicked "+ Add experience" and typed a company
    When I click "Cancel"
    Then the form closes
    And when I open it again, the fields are empty

  @BR-37 @FR-35 @FR-36
  Scenario: Add a current job
    Given I clicked "+ Add experience"
    When I fill company "QA M5 Company", role "QA Analyst", start "2023-01", tick "Current job", describe "QA M5 description", and click "Save experience"
    Then I see the toast "Experience added" and the form closes
    And the list shows "2023-01 — current", "QA Analyst · QA M5 Company", and the description

  @BR-37
  Scenario Outline: Company and role are required in the API
    When I call "POST /api/users/me/experiences" without <field>
    Then I get 422 "validation_error" with the message "Company and role are required"

    Examples:
      | field   |
      | company |
      | role    |

  @FR-36
  Scenario: Remove the last experience
    Given I have one experience
    When I click "Remove"
    Then I see the toast "Experience removed"
    And I see "No experience added yet."

  @FR-36 @N-13
  Scenario: A failed removal shows an error
    Given I have one experience and my session has ended behind the page
    When I click "Remove"
    Then I see the error toast "Please log in to continue"
    And the experience stays in the list

  @FR-36
  Scenario: Current jobs first, then the most recent start
    Given I have the experiences "2019-01 — 2020-01", "2021-03 — current", "2022-05 — 2023-01", and one current with no start
    When I open "Resume and experience"
    Then the list shows "2021-03 — current", "? — current", "2022-05 — 2023-01", and "2019-01 — 2020-01", in this order
    And "GET /api/users/me/experiences" returns the same order

  @BR-38
  Scenario: Another candidate's experience
    Given another candidate has an experience entry
    When I call "PUT" or "DELETE" on "/api/experiences/{its id}"
    Then I get 404 "not_found" and the entry does not change

  @BR-37 @D-08
  Scenario Outline: Dates need the format yyyy-mm and an end after the start
    When I call "POST /api/users/me/experiences" with start "<start>" and end "<end>"
    Then I get 422 with the message "<message>", and the screen shows it under the field

    Examples:
      | start   | end     | message                               |
      | banana  | 2024-01 | Use the format yyyy-mm                |
      | 2023-13 | 2024-01 | Use the format yyyy-mm                |
      | 2023-1  | 2024-01 | Use the format yyyy-mm                |
      | 2023-01 | 2099-99 | Use the format yyyy-mm                |
      | 2024-05 | 2023-01 | End date must be after the start date |

  @BR-37 @FR-35
  Scenario: "Current job" disables the end date
    Given I opened "+ Add experience" and typed "2024-01" as the end
    When I tick "Current job"
    Then the end field is cleared and disabled
    When I untick it
    Then the end field is enabled again

  @BR-37 @FR-35
  Scenario: Without "Current job", the end date is required
    Given I filled company and role and left "Current job" unticked
    When I leave the end blank and click "Save experience"
    Then I see "End date is required" under the end field and nothing is saved

  @BR-37 @N-17
  Scenario Outline: No experience field accepts only spaces
    Given I opened "+ Add experience"
    When I fill the <field> with only spaces and click "Save experience"
    Then I see "<message>" under that field and nothing is saved
    And the API returns 422 with the same message

    Examples:
      | field       | message                              |
      | company     | Company and role are required        |
      | role        | Company and role are required        |
      | start       | This field can't contain only spaces |
      | end         | This field can't contain only spaces |
      | description | This field can't contain only spaces |

  @BR-37 @N-18
  Scenario: HTML tags are removed from the experience
    When I call "POST /api/users/me/experiences" with company "<i>QA</i> Co", role "<b>QA</b>", and description "<p>desc</p>"
    Then I get 201 and they are saved as "QA Co", "QA", and "desc"
```

**US-20 — Record job preferences**

```gherkin
Feature: Job preferences

  @BR-39 @FR-37
  Scenario: Save and reload preferences
    Given I am on "Job preferences" in the dashboard
    When I choose area "Technology", level "Mid-level", work model "Remote", availability "15 days", leave the salary blank, and click "Save preferences"
    Then I see "Preferences saved ✅"
    And the API stores the salary as 0
    And after reloading the page the same choices are selected and the salary is blank

  @BR-39
  Scenario: Default availability
    Given I am a candidate who never saved preferences
    When I open "Job preferences"
    Then availability shows "Immediate" and the other fields "No preference" or blank

  @FR-37
  Scenario: Error saving preferences
    Given my session has ended behind the page
    When I click "Save preferences"
    Then I see "Error saving preferences"

  @BR-39
  Scenario: The screen does not accept a negative salary
    When I type -100 as the minimum salary and click "Save preferences"
    Then the browser blocks the form with "Value must be greater than or equal to 0."

  @BR-39 @N-20
  Scenario Outline: The API accepts only the screen's options
    When I call "PUT /api/users/me/preferences" with <field> set to <value>
    Then I get 422 with "field": "<field>" and the message "<message>"

    Examples:
      | field        | value      | message |
      | area         | "Space"    | Invalid value |
      | seniority    | "CEO"      | Invalid value |
      | workModel    | "Mars"     | Invalid value |
      | availability | "tomorrow" | Invalid value |
      | minSalary    | -500       | The minimum salary must be a whole number of 0 or more |
      | minSalary    | "abc"      | The minimum salary must be a whole number of 0 or more |
      | minSalary    | 4500.5     | The minimum salary must be a whole number of 0 or more |
```

**US-21 — Track my applications**

```gherkin
Feature: Job activity

  @BR-40 @FR-38
  Scenario: Applications from newest to oldest, with their status
    Given I applied to jobs 5, 1, and 2, in this order
    And the company moved job 1 to "interview" and job 2 to "rejected"
    When I open "Job activity"
    Then I see job 2, job 1, and job 5, in this order
    And each item shows the job title linking to its page, the company, "applied on {date}", and the status badge
    And the badges are "Rejected" (red), "Interview" (yellow), and "Received" (yellow)

  @FR-38
  Scenario Outline: Status labels
    Given the company moved my application to "<status>"
    When I open "Job activity"
    Then the badge shows "<label>" in <color>

    Examples:
      | status    | label     | color  |
      | received  | Received  | yellow |
      | in_review | In review | yellow |
      | interview | Interview | yellow |
      | approved  | Approved  | green  |
      | rejected  | Rejected  | red    |

  @BR-40
  Scenario: The candidate cannot change the status
    When I call "PATCH /api/applications/{my application}" with the status "approved"
    Then I get 403

  @FR-38
  Scenario: No applications
    Given I have never applied
    When I open "Job activity"
    Then I see "You haven't applied to any jobs yet."
```

**US-22 — See and unfollow followed companies**

```gherkin
Feature: Followed companies

  @FR-39
  Scenario: List and unfollow
    Given I follow Nimbus Tech and Grain Foods
    When I open "Followed companies"
    Then I see each company's logo, name, city, and an "Unfollow" button
    When I click "Unfollow" on Nimbus Tech
    Then I see the toast "You unfollowed this company"
    And only Grain Foods is left

  @FR-39 @N-13
  Scenario: A failed unfollow shows an error
    Given I follow Grain Foods and my session has ended behind the page
    When I click "Unfollow"
    Then I see the error toast "Please log in to continue"
    And Grain Foods stays in the list

  @FR-39
  Scenario: No followed companies
    Given I follow no company
    When I open "Followed companies"
    Then I see "You don't follow any companies yet."
```

**US-23 — Change my name, city, and password**

```gherkin
Feature: Account settings

  @BR-41 @FR-41
  Scenario: Change name and city
    Given I am on "Account settings"
    When I change the name to "QA M5 Renamed" and the city to "Belo Horizonte, MG" and click "Save changes"
    Then I see "Changes saved ✅"
    And the profile card shows "QA M5 RENAMED" and "Belo Horizonte, MG"

  @BR-41
  Scenario: The email cannot be changed
    Given I am on "Account settings"
    Then the email field is disabled
    And "PATCH /api/users/me" with a new email returns 200 and keeps the old email

  @BR-41
  Scenario Outline: Name and city with only spaces are rejected
    When I type only spaces in the <field> and click "Save changes"
    Then I see "<message>" under the field and nothing is saved
    And "PATCH /api/users/me" with the same value returns 422 with the same message

    Examples:
      | field | message                              |
      | name  | Name is required                     |
      | city  | This field can't contain only spaces |

  @BR-42 @FR-41
  Scenario Outline: Password change errors
    Given I am on "Account settings"
    When I fill current "<current>", new "<new>", confirmation "<confirm>" and click "Change password"
    Then I see "<message>"

    Examples:
      | current  | new      | confirm  | message                                              |
      | senha123 | senha456 | senha789 | Passwords don't match                                |
      | senha123 | senha456 |          | Passwords don't match                                |
      | wrong    | senha456 | senha456 | Current password is incorrect                        |
      | senha123 | abc      | abc      | The new password must be at least 6 characters long |
      | senha123 | senha 456 | senha 456 | The password can't contain spaces                  |

  @BR-42 @FR-41
  Scenario: Change the password
    When I fill current "senha123", new "senha456", confirmation "senha456" and click "Change password"
    Then I see "Password changed ✅" and the three fields are cleared
    And signing in with "senha123" returns 401 and with "senha456" returns 200

  @FR-42
  Scenario: Notification options are not saved
    Given I open "Notifications"
    Then "News by email" and "Alerts for matching jobs" are checked and "Emails from partners" is not
    When I toggle the three options and reload the page
    Then they are back to the original state
```

## Business rules

| ID | Rule |
| --- | --- |
| BR-35 | The dashboard is shown only to an authenticated candidate. Visitors and companies see "You need to sign in with a candidate account to see this dashboard.". In the API, experiences, preferences, and the résumé upload require a candidate account; a company gets 403 "Only "candidate" accounts can access this". |
| BR-36 | Résumé: only .pdf, .doc, and .docx are accepted, on screen and in the API ("Only .pdf, .doc, and .docx files are accepted"); maximum size 5 MB, and a file of exactly 5 MB is accepted ("The file must be at most 5 MB"); without a file, the screen shows "Choose a file to upload". The file is saved with its extension, and a new upload replaces the previous one and deletes the old file. |
| BR-37 | Experience: company and role are required. Start and end use the format `yyyy-mm` (month 01 to 12), and the end cannot be before the start (D-08). "Current job" disables the end date and saves the experience as current; without it, the end date is required. No field accepts only spaces, and HTML tags are removed from every field before saving. |
| BR-38 | A candidate can only access, change, or delete their own experience entries; another user's entry returns 404. |
| BR-39 | Preferences are optional. They are saved to the candidate's profile and come back filled in when the dashboard opens; no screen or API route shows them to a company. The section says "Your preferences are saved to your profile. They are not shared with companies." Availability: Immediate (default), 15 days, 30 days. An empty salary is stored as 0. The API accepts only the screen's options: area, level, and work model from their lists or empty, availability `immediate`, `15days`, or `30days`, and a minimum salary that is a whole number of 0 or more; anything else returns 422 with the field. |
| BR-40 | Applications are listed from newest to oldest. The candidate does not change the status, only tracks it. |
| BR-41 | The email cannot be changed. A blank name or one with only spaces is rejected with "Name is required", and a city with only spaces with "This field can't contain only spaces"; HTML tags are removed from the name. |
| BR-42 | Changing the password requires the correct current password; the new one must have at least 6 characters and be confirmed in a second field, validated on screen and in the API. The new password cannot contain spaces: "The password can't contain spaces". The new password is stored only as a hash (D-10). |

**Application statuses shown**

| Status (API) | Label on screen | Badge color |
| --- | --- | --- |
| received | Received | Yellow (warn) |
| in\_review | In review | Yellow (warn) |
| interview | Interview | Yellow (warn) |
| approved | Approved | Green (ok) |
| rejected | Rejected | Red (err) |

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-32 | The profile card must show the initials (up to 2 letters), the name in uppercase, and the city (or "City not specified"); the ✏️ icon opens Account settings. |
| FR-33 | The side menu must show one section at a time, highlighting the active item. |
| FR-34 | When a file is chosen, its name must appear; after uploading, "Resume uploaded: {url}" and the toast "Resume uploaded successfully!". When the dashboard opens and a résumé was already uploaded, it shows "Current resume: {link}", opening in a new tab. |
| FR-35 | "+ Add experience" opens the form; "Cancel" clears and closes it; on save, the toast "Experience added" and the list is updated. The form has a "Current job" checkbox that clears and disables the end date, and each field shows its own error under it ("Company and role are required", "End date is required", "Use the format yyyy-mm", "End date must be after the start date", "This field can't contain only spaces"). |
| FR-36 | Each experience must show the period ("{start} — {end}" or "current"), role, company, description, and a "Remove" button (toast "Experience removed" only when the API confirms; on failure, an error toast and the entry stays). The fields are shown as plain text. With no entries: "No experience added yet.". The list shows current jobs first, then the most recent start; an entry with no start comes last in its group. |
| FR-37 | Preferences must load with the saved values and show "Preferences saved ✅" or "Error saving preferences". |
| FR-38 | Job activity must list the title (linking to the job), company, application date (in Brazil time, America/Sao_Paulo, in the date format of the browser's language), and status badge. With no entries: "You haven't applied to any jobs yet.". The title and company are shown as plain text, never as HTML (N-21). |
| FR-39 | Followed companies must list logo, name, city, and an "Unfollow" button (toast "You unfollowed this company" only when the API confirms; on failure, an error toast and the card stays). With no entries: "You don't follow any companies yet.". |
| FR-40 | Reviews and contributions must list stars, comment, a "View job" link, and a "Delete" button (toast "Review deleted" only when the API confirms; on failure, an error toast and the review stays). The comment is shown as plain text. The list shows the newest review first. With no entries: "You haven't posted any reviews yet.". |
| FR-41 | Account settings must show "Changes saved ✅" and update the profile card; changing the password must show "Password changed ✅" or the API error, and clear the form on success. The password form must have a confirmation field for the new password and show "Passwords don't match" when it differs. |
| FR-42 | Notifications must show three options (News by email and Alerts for matching jobs checked; Emails from partners unchecked). The options are illustrative and are not saved. |
