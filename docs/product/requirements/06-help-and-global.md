# Module 6 — Help center and global features

[← Specification index](../../README.md) · [Screen vs. API divergences](../../divergences.md) · [Decisions and fixes](../../decisions.md) · [Global rules](../global-rules.md)

Page `/pages/ajuda.html` and features shared by every page (header, footer, theme, cookies).

## User stories

- **US-24** — As a candidate, I want to read frequently asked questions to solve doubts on my own.
- **US-25** — As a visitor, I want to choose between light and dark theme.
- **US-26** — As a visitor, I want to accept or decline cookies.

## Acceptance criteria

The criteria below describe the expected behavior of the current version. Tags link each scenario to its rules (`@BR-xx`, `@FR-xx`, `@GR-xx`) and to the decision it came from (`@D-xx`, `@N-xx`). A scenario with no state tag is decided, and the app is expected to do what it says. Two tags mark exceptions: `@pending-decision` (the actual behavior is known, but the expected behavior has not been decided) and `@known-bug` (decided as a defect: the scenario describes the expected behavior and fails until the fix). Whether and when a scenario was checked against the running app is recorded only in the [validation reports](../../results/validation/README.md).

**US-24 — Read frequently asked questions**

```gherkin
Feature: Help center FAQ

  @FR-43
  Scenario: Open and close an answer
    Given I am on "/pages/ajuda.html"
    Then I see 3 questions with their answers closed
    When I click "Can I apply to a closed job?"
    Then only its answer opens: "No. Closed jobs stay visible for reference, but they no longer accept new applications."
    When I click the same question again
    Then the answer closes

  @FR-44
  Scenario: Simulated video
    Given I am on "/pages/ajuda.html"
    Then an iframe shows "▶ Video player (simulated)"

  @FR-45
  Scenario: External help center
    Given I am on "/pages/ajuda.html"
    Then the link "Visit our external help center" points to "https://support.example.com" and opens in a new tab
```

**US-25 — Choose light or dark theme**

```gherkin
Feature: Theme

  @BR-43 @FR-46
  Scenario: Toggle the theme without reloading
    Given the page is in dark theme
    When I click "☀️"
    Then the page turns light without reloading, and the button shows "🌙"
    When I click "🌙"
    Then the page turns dark, and the button shows "☀️"
    # Implementation: "vagalume_theme" becomes "light" and then "dark"

  @BR-43
  Scenario: The choice is kept on other pages
    Given I chose the light theme and the system prefers dark
    When I open another page
    Then the page is light

  @BR-43
  Scenario Outline: With no choice, the theme follows the system
    Given I never chose a theme and the system prefers <system>
    When I open a page
    Then the page is <system> and the button shows "<icon>"

    Examples:
      | system | icon |
      | light  | 🌙   |
      | dark   | ☀️   |
```

**US-26 — Accept or decline cookies**

```gherkin
Feature: Cookie banner

  @BR-44
  Scenario Outline: Answer the cookie banner
    Given I never answered the cookie banner in this browser
    When I open a page
    Then I see the cookie banner with a privacy policy link that opens in a new tab
    When I click "<button>"
    Then the banner closes
    And after reloading the page the banner does not appear
    # Implementation: "vagalume_cookie_consent" becomes "<value>"

    Examples:
      | button | value    |
      | Reject | rejected |
      | Accept | accepted |
```

**Global features**

```gherkin
Feature: Footer and missing pages

  @FR-47
  Scenario: Footer links
    When I open any page
    Then the footer has "Terms of Use" and "Privacy Policy", both opening in a new tab
    And "QA Guide" and "Admin panel" in the same tab

  @FR-48
  Scenario Outline: A page that does not exist
    When I open "<path>"
    Then I get 404 and the page "404 — Page not found" with "Back to jobs"

    Examples:
      | path            |
      | /nao-existe     |
      | /pages/xyz.html |
      | /vaga/999       |

  @FR-48
  Scenario: An API route that does not exist
    When I call "GET /api/xyz"
    Then I get 404 "not_found" with the message "This API route does not exist"
```

## Business rules

| ID | Rule |
| --- | --- |
| BR-43 | The theme choice is kept in the browser, on every page and after reloading. With no choice, it follows the operating system preference. _Implementation: `localStorage`, key `vagalume_theme` (`light` or `dark`)._ |
| BR-44 | The cookie banner appears until the user accepts or declines, and it does not come back after that in the same browser. _Implementation: `localStorage`, key `vagalume_cookie_consent` (`accepted` or `rejected`)._ |

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-43 | The help page must show 3 frequently asked questions as an accordion (opens and closes on click). |
| FR-44 | The help page must show a simulated video in an iframe. |
| FR-45 | The help page must offer a link to the external help center, opening in a new tab. |
| FR-46 | The theme button must toggle 🌙/☀️ and apply the theme without reloading the page. |
| FR-47 | The footer must contain links to the Terms of Use and Privacy Policy (new tab), QA Guide, and Admin panel. |
| FR-48 | Nonexistent routes must show the friendly 404 page. |
