# Global rules

[← Specification index](../README.md) · [Screen vs. API divergences](../divergences.md) · [Decisions and fixes](../decisions.md)

Rules that apply across every module. Each module rule that follows one of them is listed under "Applies to"; when a module rule and a global rule disagree, the module rule is the exception and says so. Global rules use the prefix `GR-xx`.

## Rules

| ID | Rule | Applies to | Origin |
| --- | --- | --- | --- |
| GR-01 | **User text is plain text.** HTML tags are removed from user text before it is saved, and text is always shown as written, never rendered as HTML (this also covers text saved with tags before the rule existed). A field that is empty after removing its tags counts as empty. | BR-01, BR-31, BR-37, BR-41, FR-09, FR-24, FR-25, FR-31, FR-36, FR-38 | N-11, N-18, N-21 |
| GR-02 | **No text field accepts only spaces.** Spaces around a value are removed before it is checked. A required field with only spaces counts as empty and shows that field's "required" error; an optional field with only spaces is rejected with "This field can't contain only spaces". | BR-01, BR-06, BR-13, BR-18, BR-31, BR-37, BR-41 | N-04, N-05, N-12, N-17, N-19, Q-03 |
| GR-03 | **The screen and the API enforce the same rules.** Every validation done on screen is also done by the API, with the same message. Only the behavior described in the QA guide (`/pages/qa-docs.html`) is intentional; any other gap between screen and API is a defect. | Every module | D-01 to D-10 |
| GR-04 | **Success feedback only after the API confirms.** A success toast or a state change on screen appears only when the API confirms the action. On failure, the screen shows an error toast (the API message or a default text) and keeps the previous state. | FR-20, FR-26, FR-36, FR-39, FR-40 | N-13 |
| GR-05 | **Error responses follow one format.** The API answers errors as JSON with an error code and a message: `400 invalid_json` for a body that is not valid JSON, `404 not_found` for an unknown route or resource, `409` for conflicts with the current state (`email_in_use`, `already_applied`, `job_closed`), and `422 validation_error` (or a more specific code) for invalid input. | Every API route; BR-03, BR-16, BR-21, BR-23, FR-48 | N-06, N-22 |
| GR-06 | **Not signed in vs. wrong account.** An action that requires an account returns `401 not_authenticated` to a visitor (the user may be allowed, but must sign in first). A signed-in user whose account type cannot do the action gets `403 forbidden` (for candidate routes: "Only "candidate" accounts can access this"). An invalid or expired session returns `401 invalid_session`. | BR-11, BR-20, BR-30, BR-35, BR-40 | D-09, Q-01 |
| GR-07 | **Another user's resource.** A user who tries to change or delete another user's resource gets `404 not_found` when the resource is private (only its owner can see it, so its existence is not revealed) and `403 forbidden` when it is public (anyone can see it, only the owner can change it). | BR-34 (reviews, public: 403), BR-38 (experiences, private: 404) | Q-02 |

## Open questions

None at the moment. New questions found while applying these rules go here, with the next `Q-xx` number.

## Decided questions

| # | Question | Decision | Date |
| --- | --- | --- | --- |
| Q-01 | Not signed in: 401 or 403? | `401` for a visitor on any action that requires an account; `403` only for a signed-in user with the wrong account type (GR-06). Applying while signed out returned 403 (N-03 decision reverted); fixed and validated on 2026-11-04. | 2026-11-04 |
| Q-02 | Another user's resource: 403 or 404? | Keep the current behavior and document the criterion: private resource → 404, public resource → 403 (GR-07). No code change. | 2026-11-04 |
| Q-03 | Requirements with only spaces: exception to GR-02? | No exception: requirements with only spaces are rejected with 422 "This field can't contain only spaces", like the other optional fields (BR-18 rewritten). The API used to save them empty; fixed and validated on 2026-11-04. | 2026-11-04 |
