# Module 1 — Sign-up and authentication

[← Specification index](../../README.md) · [Screen vs. API divergences](../../divergences.md) · [Decisions and fixes](../../decisions.md) · [Global rules](../global-rules.md)

Page `/pages/entrar.html`, with "Sign in" and "Create account" tabs. Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

## User stories

- **US-01** — As a visitor, I want to create a candidate account so I can apply to jobs.
- **US-02** — As a candidate, I want to sign in with email and password to access my dashboard.
- **US-03** — As a candidate, I want my session to stay active so I don't have to sign in on every visit.
- **US-04** — As a candidate, I want to sign out to end my session.

## Acceptance criteria

The criteria below describe the expected behavior of the current version. Tags link each scenario to its rules (`@BR-xx`, `@FR-xx`, `@GR-xx`) and to the decision it came from (`@D-xx`, `@N-xx`). A scenario with no state tag is decided, and the app is expected to do what it says. Two tags mark exceptions: `@pending-decision` (the actual behavior is known, but the expected behavior has not been decided) and `@known-bug` (decided as a defect: the scenario describes the expected behavior and fails until the fix). Whether and when a scenario was checked against the running app is recorded only in the [validation reports](../../results/validation/README.md).

**US-01 — Create a candidate account**

```gherkin
Feature: Candidate sign-up

  Background:
    Given I am on "/pages/entrar.html"
    And I clicked the "Create account" tab
    And the "I'm a candidate" option is selected

  @BR-07 @FR-04 @FR-07
  Scenario: Successful sign-up
    When I fill in a name, an unregistered email, the password "senha123" and the confirmation "senha123"
    And I accept the terms of use
    And I click "Create account"
    Then I see the message "Account created successfully!"
    And I am redirected to "/pages/candidato/painel.html"
    And the header shows my first name instead of "Sign in"

  @BR-06
  Scenario: City is optional
    When I sign up without filling in the city
    Then the account is created and I am authenticated

  @FR-03
  Scenario: Submitting empty fields
    When I click "Create account" without filling in anything
    Then I see "Name is required" on the name field
    And I see "Email is required" on the email field
    And I see "Minimum of 6 characters" on the password field
    And I see "You need to accept the terms" below the terms

  @BR-04 @FR-03
  Scenario: Password confirmation mismatch
    When I fill in the password "senha123" and the confirmation "senha999"
    And I submit the form with the other fields valid
    Then I see "Passwords don't match" on the confirmation field

  @BR-03 @FR-04
  Scenario: Email already registered
    When I sign up with the email "candidato@vagalume.test"
    Then I see the message "An account with this email already exists"
    # Through the API, "CANDIDATO@vagalume.test" also returns 409 email_in_use

  @D-02 @D-03
  Scenario: The API enforces the same validations as the screen
    When I send the sign-up straight to the API with a 1-character password, an email without "@", or without acceptTerms: true
    Then I get 422 and no account is created

  @BR-04 @FR-03
  Scenario: Empty password and confirmation
    When I submit the sign-up with the password and the confirmation empty
    Then I see "Minimum of 6 characters" on the password field
    And I see "Passwords don't match" on the confirmation field

  @BR-04
  Scenario: The password cannot contain spaces
    When I fill in the password "senha 123" and the confirmation "senha 123"
    And I submit the form with the other fields valid
    Then I see "The password can't contain spaces" on the password field
    And the API returns 422 with the same message

  @BR-01 @BR-06
  Scenario Outline: Fields with only spaces are rejected
    When I fill <field> with only spaces and submit the form with the other fields valid
    Then I see "<message>" on that field and no account is created
    And the API returns 422

    Examples:
      | field    | message                              |
      | the name | Name is required                     |
      | the city | This field can't contain only spaces |

  @BR-01
  Scenario: A name made only of HTML tags is empty
    When I sign up through the API with the name "<b></b>"
    Then I get 422 "Name, email, password, and account type are required"
```

**US-02 — Sign in with email and password**

```gherkin
Feature: Sign-in

  Background:
    Given I am on "/pages/entrar.html" on the "Sign in" tab

  @BR-07 @FR-06
  Scenario: Successful candidate sign-in
    When I enter "candidato@vagalume.test" and the password "demo123"
    And I click "Sign in"
    Then I see the message "Welcome, John Doe!"
    And I am redirected to "/pages/candidato/painel.html"

  @BR-03
  Scenario: Email with uppercase letters
    When I submit the sign-in with the email "CANDIDATO@Vagalume.Test" and the password "demo123"
    Then the sign-in is accepted

  @BR-03
  Scenario: Email with spaces is rejected
    When I enter the email "  candidato@vagalume.test  " and the password "demo123"
    And I click "Sign in"
    Then I see "Invalid email format (e.g.: name@domain.com)" on the email field
    And I am not authenticated
    # On sign-up the message is "Invalid email", the same as for an invalid email

  @BR-08 @BR-09 @FR-05
  Scenario Outline: Sign-in error messages
    When I enter the email "<email>" and the password "<password>"
    And I click "Sign in"
    Then I see "<email_error>" on the email field
    And I see "<password_error>" on the password field
    And I see the general message "<message>"

    Examples:
      | email                     | password | email_error                                  | password_error       | message                              |
      |                           |          | Email is required                            | Password is required | Please enter your email and password |
      |                           | demo123  | Email is required                            |                      | Please enter your email              |
      | abc@abc                   | demo123  | Invalid email format (e.g.: name@domain.com) |                      | Please enter a valid email address   |
      | abc                       |          | Invalid email format (e.g.: name@domain.com) | Password is required | Please enter a valid email address   |
      | candidato@vagalume.test   |          |                                              | Password is required | Please enter your password           |
      | ninguem.qa@vagalume.test  | demo123  | This email is not registered                 |                      | No account found with this email     |
      | candidato@vagalume.test   | errada   |                                              | Incorrect password   | Incorrect password                   |

  @BR-09
  Scenario: Password is case-sensitive
    When I submit the sign-in with "candidato@vagalume.test" and the password "DEMO123"
    Then the sign-in is rejected with "Incorrect password"

  @N-22
  Scenario: A request body that is not valid JSON
    When I call "POST /api/auth/login" with the body "{email:candidato@vagalume.test,password:demo123}"
    Then I get 400 "invalid_json" with the message "The request body is not valid JSON"
    # The same applies to every API route
```

**US-03 — Keep the session active**

```gherkin
Feature: Session lifetime

  @BR-11
  Scenario: Session expires after 7 days
    Given I have a session issued more than 7 days ago
    When I access an authenticated area
    Then I get 401 with "Invalid or expired session"

  @BR-11
  Scenario: Session younger than 7 days is still valid
    Given I have a session issued 6 days ago
    When I access an authenticated area
    Then I am still authenticated

  @BR-10
  Scenario: Sign-in without "Keep me signed in"
    When I sign in without checking "Keep me signed in"
    Then my session ends when I close the browser
    # Implementation: Set-Cookie has no Max-Age or Expires

  @BR-10 @D-06
  Scenario: Sign-in with "Keep me signed in"
    When I sign in checking "Keep me signed in"
    Then my session lasts 7 days, even after I close the browser
    # Implementation: the cookie has Max-Age=604800, and the token expires 604800 seconds after it is issued
```

**US-04 — Sign out**

```gherkin
Feature: Sign-out

  Background:
    Given I am authenticated as a candidate on my dashboard

  @FR-08
  Scenario: Sign out from the dashboard menu
    When I click "Sign out"
    Then I am redirected to the home page
    And the header shows "Sign in" again
    And "/api/auth/me" starts returning 401

  @BR-35
  Scenario: Dashboard is blocked after signing out
    Given I have just signed out
    When I access "/pages/candidato/painel.html"
    Then I see "You need to sign in with a candidate account to see this dashboard."
    And I see the "Sign in" link to "/pages/entrar.html"
```

## Business rules

| ID | Rule |
| --- | --- |
| BR-01 | Name, email, password, and account type are required on sign-up. A name with only spaces counts as empty, and HTML tags are removed from the name before saving. |
| BR-02 | The account type must be `candidate` or `employer`; the screen selects candidate by default. |
| BR-03 | The email is unique in the system and is not case-sensitive (the same comparison applies on sign-in). Sign-up and sign-in reject an email containing spaces, on screen and in the API, showing an error on the email field. A duplicate returns 409 `email_in_use`. |
| BR-04 | The password must have at least 6 characters and the confirmation must match. The screen and the API enforce the 6-character minimum; on screen, an empty confirmation shows "Passwords don't match". The password cannot contain spaces: "The password can't contain spaces", on screen and in the API. The password is stored only as a hash, never as plain text (D-10). |
| BR-05 | Accepting the terms of use is required, on screen and in the API (`acceptTerms: true`). |
| BR-06 | The candidate's city is optional, but a city with only spaces is rejected with "This field can't contain only spaces", on screen and in the API. |
| BR-07 | After a successful sign-up or sign-in, the user is already authenticated and is redirected to the dashboard for their account type (candidate: `/pages/candidato/painel.html`). _Implementation: the redirect happens about 600 ms after the success message._ |
| BR-08 | Sign-in and sign-up require an email in a valid format (`something@domain.ext`), on screen and in the API. |
| BR-09 | Sign-in distinguishes "email not registered" (401 `user_not_found`) from "wrong password" (401 `wrong_password`). The password is case-sensitive: "DEMO123" does not sign in when the password is "demo123". |
| BR-10 | Without "Keep me signed in", the session ends when the browser closes. With the option, the session lasts 7 days, even after the browser closes (BR-11). The session created on sign-up also lasts 7 days. _Implementation: the `session` cookie has no `Max-Age` or `Expires` without the option, and `Max-Age=604800` (7 days) with it and on sign-up._ |
| BR-11 | A session expires 7 days after it starts. An invalid or expired session returns 401 `invalid_session`. _Implementation: the session is a JWT that expires 604800 seconds after it is issued._ |

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-01 | The system must let the user switch between the sign-in and sign-up tabs. |
| FR-02 | Sign-up must offer the choice "I'm a candidate" / "I'm a company", showing the City field for candidates. |
| FR-03 | On sign-up submission, the system must validate: name filled in, valid email, password ≥ 6, matching confirmation, and terms accepted, showing an error below each field. An empty email shows "Email is required"; an empty confirmation shows "Passwords don't match". |
| FR-04 | The system must show "Account created successfully!" when sign-up completes, or the message returned by the API on error. |
| FR-05 | Sign-in must show a specific message for: both fields empty, empty email, invalid email, empty password, unregistered email, and wrong password. When more than one field has an error (e.g. an invalid email and an empty password), each field shows its own error at the same time. |
| FR-06 | A successful sign-in must show "Welcome, {name}!". |
| FR-07 | The header must show the authenticated user's first name instead of "Sign in", linking to their dashboard. |
| FR-08 | The dashboard's "Sign out" button must delete the session cookie and redirect to the home page. |

**Sign-in error messages**

| Scenario | Field | General message |
| --- | --- | --- |
| Empty email and password | Email is required / Password is required | Please enter your email and password |
| Empty email | Email is required | Please enter your email |
| Invalid email | Invalid email format (e.g.: name@domain.com) | Please enter a valid email address |
| Empty password | Password is required | Please enter your password |
| Invalid email and empty password | Invalid email format (e.g.: name@domain.com) / Password is required | Please enter a valid email address |
| Unregistered email | This email is not registered | No account found with this email |
| Wrong password | Incorrect password | Incorrect password |
