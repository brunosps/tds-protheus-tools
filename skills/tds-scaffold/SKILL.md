---
name: tds-scaffold
description: "Generate Protheus structural code: MVC screens (ModelDef/ViewDef/MenuDef/BrowseDef with FWFormModel/FWFormView/FWFormBrowse, single-entity Modelo 1 and master-detail Modelo 3, validations, triggers) and Entry Points (Pontos de Entrada). Entry Points default to TLPP; AdvPL only when explicitly requested. Use when the user says 'create MVC screen', 'ModelDef ViewDef', 'FWFormModel', 'master-detail screen', 'create entry point', 'ponto de entrada', 'PARAMIXB', 'User Function hook'."
license: MIT
metadata:
  domain: Protheus
  author: brunosps
  version: '1.0.0'
  category: Code Generation
  attribution: "MVC and Entry Point templates/references adapted from totvs/engpro-advpl-tlpp-skills (MIT). See ATTRIBUTION.md."
---

# TDS Scaffold — Protheus MVC & Entry Point Generator

Generate two kinds of Protheus structural code, following TOTVS framework patterns and SonarQube clean-code rules:

1. **MVC screens** — `ModelDef`, `ViewDef`, `MenuDef`, and the `FWFormBrowse` main function.
2. **Entry Points** (Pontos de Entrada) — `User Function` hooks into standard routines.

## When to Use

- Creating a CRUD screen for a table (single-entity Modelo 1) or a header+items form (master-detail Modelo 3).
- Migrating legacy `AxCadastro`/`Mbrowse` screens to MVC.
- Adding validations, triggers, and entry-point hooks to MVC screens.
- Creating or documenting an Entry Point to customize a standard routine without changing its source.
- Designing a `PARAMIXB` interface and the Entry Point's return contract.

---

## Part 1 — MVC Screens

MVC separates business rules (Model), visual layout (View), and navigation/actions (Browse/Menu) via `FWFormModel`, `FWFormView`, and `FWFormBrowse`.

| Function | Purpose | Returns |
| --- | --- | --- |
| `ModelDef()` | Fields, validations, relationships, triggers | `FWFormModel` |
| `ViewDef()` | Panels, grids, layout | `FWFormView` |
| `MenuDef()` | CRUD + custom actions | Array |
| Main function | Builds `FWFormBrowse` and activates | — |

**Workflow:** (1) pick the pattern — single-entity vs. master-detail; (2) generate from the template, replacing aliases (`ZZ1…`) and IDs (`MYMOD01…`); (3) run the checklist.

| Reference | Read when |
| --- | --- |
| [references/mvc-code-templates.md](references/mvc-code-templates.md) | Generating MVC code (Modelo 1 / Modelo 3 templates, event/validation/commit handlers). |
| [references/mvc-api-reference.md](references/mvc-api-reference.md) | Customizing `FWFormStruct`, View layout (HBox/VBox/Folder), `MenuDef` actions and custom buttons. |
| [references/design-checklist.md](references/design-checklist.md) | Final completeness + SonarQube checklist (also used by Entry Points). |
| [references/sonarqube-rules-reference.md](references/sonarqube-rules-reference.md) | Full SonarQube rule catalog. |

Key compliance: persist with `FWFormCommit(oModel)` (never override `FormCommit`; intercept with `FWModelEvent`); no UI calls inside transaction/commit handlers; `Try-Catch` not `ErrorBlock`; `FWLogMsg()` not `ConOut()`; cache `GetMV()`/`ExistBlock()` before loops; no direct `DbSelectArea` on SX3 (use `FWFormStruct`/`FWSX3Util`).

---

## Part 2 — Entry Points (Pontos de Entrada)

A standard routine calls `ExistBlock("PE_NAME")`; if a matching `User Function` exists in the RPO, it runs and its return influences the routine. Parameters arrive via the `PARAMIXB` private array.

### TLPP First

**TLPP is the default output for every new Entry Point** (`#include "tlpp-core.th"`, type annotations, `Try-Catch`, namespaced helpers). Generate AdvPL (`.prw`) only when the user is explicit ("em AdvPL", "como .prw", "legacy"). If ambiguous, confirm.

### Mandatory Rules

- **Never** add the `U_` prefix to the function name — the compiler resolves it; adding it manually means the Entry Point never triggers (`User Function MT410INC()`, not `U_MT410INC()`).
- **File name = Entry Point name in uppercase + extension**, no namespace/prefix/suffix (`MT410INC.tlpp`).
- Validate `PARAMIXB` defensively (`Type("PARAMIXB") == "A"` and length).
- Extract logic to `Static Function` helpers; document with a `/*/{Protheus.doc}` block.
- Default return must be fail-safe (must not block the standard routine).

| Reference | Read when |
| --- | --- |
| [references/templates.md](references/templates.md) | TLPP (default) and AdvPL Entry Point code templates. |
| [references/paramixb-and-returns.md](references/paramixb-and-returns.md) | PARAMIXB layout format, return types, common EP categories. |
| [references/design-checklist.md](references/design-checklist.md) | Interface, defensive programming, code-quality, SonarQube checklist. |
| [references/troubleshooting.md](references/troubleshooting.md) | Entry Point not firing, wrong return, PARAMIXB issues. |

---

## Related Skills

- `tds-codex` — data dictionary (field/index names for `FWFormStruct`) and conventions.
- `tds-forge` — compile, quality-gate, and patch the generated source.
- `tds-modernizer` — migrate the result to TLPP if generated as AdvPL.
