---
name: tds-modernizer
description: "Modernize and refactor Protheus code. Migrate legacy AdvPL (.prw) to TLPP (.tlpp): includes/namespaces, type annotations, Try-Catch, REST migration, long identifiers, inline JSON, named parameters, access modifiers, StaticCall removal. Also surgical refactoring that preserves behavior: extract functions, rename, break down god functions, eliminate code smells, and reduce cognitive complexity below a threshold by extracting helper methods. Use when the user says 'migrate to TLPP', 'convert AdvPL', 'modernize .prw to .tlpp', 'add typing', 'refactor this code', 'extract function', 'reduce complexity', 'code smells', 'simplify method', 'cognitive complexity too high'."
license: MIT
metadata:
  domain: Protheus
  author: brunosps
  version: '1.0.0'
  category: Modernization
  attribution: "Migration and refactoring references adapted from totvs/engpro-advpl-tlpp-skills (MIT). See ATTRIBUTION.md."
---

# TDS Modernizer — AdvPL→TLPP Migration & Refactoring

Two related jobs: **migrate** legacy AdvPL to modern TLPP, and **refactor** code (in either language) without changing behavior.

---

## Part 1 — Migrate AdvPL → TLPP

Transform `.prw` into idiomatic `.tlpp`: swap legacy includes for `tlpp-core.th` and namespaces; add type annotations; replace `ErrorBlock` with `Try-Catch`; modernize REST; allow long identifiers; use inline JSON and named parameters; apply access modifiers; remove `StaticCall` (a `[CA2022]` security violation).

| Reference | Read when |
| --- | --- |
| [references/advpl-tlpp-feature-comparison.md](references/advpl-tlpp-feature-comparison.md) | Mapping an AdvPL construct to its TLPP equivalent (side-by-side). |
| [references/tlpp-migration-patterns.md](references/tlpp-migration-patterns.md) | Step-by-step transformation patterns and gotchas. |

**Migration workflow:** preserve behavior first (migrate syntax, keep logic), compile and quality-gate with `tds-forge`, then apply clean-code improvements. Generated/edited TLPP must be saved as **CP1252** (Windows-1252) with CRLF — use `tds-forge --action convert-encoding` if you authored UTF-8.

---

## Part 2 — Refactor (behavior-preserving)

Surgical, gradual improvements: extract functions, rename for clarity, break down god functions, improve type safety, eliminate code smells, apply patterns. Less drastic than a full rewrite.

**Reduce cognitive complexity:** when a method exceeds a complexity threshold, extract cohesive blocks into well-named `Static Function` helpers until each unit is below the target, keeping the public signature and behavior unchanged.

| Reference | Read when |
| --- | --- |
| [references/code-smells-and-patterns.md](references/code-smells-and-patterns.md) | Before/after examples for common smells and the refactoring that fixes each. |

---

## Related Skills

- `tds-forge` — compile + quality-gate to prove the migration/refactor didn't regress (and flag `StaticCall`, raw SQL, etc.); `convert-encoding` for CP1252.
- `tds-codex` — conventions and dictionary impact validation before changing fields/triggers.
- `tds-scaffold` — regenerate Entry Points/MVC in TLPP.
