---
name: tds-testkit
description: "Generate TIR (TOTVS Interface Robot) end-to-end test scripts in Python for Protheus SmartClient/Webapp screens. Supports CRUD screen tests, MVC screen tests, grid interaction, report tests, field validation, and message-box assertions. Use when the user says 'TIR test', 'interface test', 'e2e test Protheus', 'SmartClient test', 'Webapp test', 'screen test', 'create Python test for Protheus screen', or 'automate Protheus UI test'."
license: MIT
metadata:
  domain: Protheus
  author: brunosps
  version: '1.0.0'
  category: Testing
  attribution: "TIR setup, patterns and webapp method references adapted from totvs/engpro-advpl-tlpp-skills (MIT). See ATTRIBUTION.md."
---

# TDS TestKit — TIR End-to-End Test Generator

Generate Python end-to-end tests that drive Protheus SmartClient/Webapp screens with **TIR (TOTVS Interface Robot)**.

## When to Use

- Automating a CRUD or MVC screen test (include / edit / delete / view).
- Interacting with grids (add/edit/remove rows, cell assertions).
- Driving and validating reports.
- Asserting field values, validations, and message boxes.

## Workflow

1. Identify the screen type (CRUD/MVC/report/grid) and the routine/program to open.
2. Start from the matching pattern in `references/tir-test-patterns.md`.
3. Use the exact TIR method names/signatures from `references/tir-webapp-methods-reference.md`.
4. Apply the environment/setup and best practices from `references/tir-setup-and-best-practices.md` (connection, user/branch, waits, teardown).

| Reference | Read when |
| --- | --- |
| [references/tir-setup-and-best-practices.md](references/tir-setup-and-best-practices.md) | Setting up the TIR environment, login/branch, stable waits, teardown, and test hygiene. |
| [references/tir-test-patterns.md](references/tir-test-patterns.md) | Ready test patterns — CRUD, MVC, grid, report, validation, message-box assertions. |
| [references/tir-webapp-methods-reference.md](references/tir-webapp-methods-reference.md) | The TIR Webapp method API (exact names, parameters, usage). |

## Related Skills

- `tds-scaffold` — the MVC screens these tests exercise.
- `tds-forge` — compile the routine under test before running the UI test.
