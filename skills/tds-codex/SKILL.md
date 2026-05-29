---
name: tds-codex
description: "Protheus AdvPL/TLPP knowledge base. Looks up the TOTVS Protheus data dictionary (SX2 tables, SX3 fields, SIX indexes, SX6 parameters MV_*, SX5 generic tables, SX7 triggers, SX1 questions, SX9 relationships, SXB lookups), essential AdvPL/TLPP functions, common errors and their fixes, ProtheusDOC conventions, and the SonarQube rule catalog. Use when the user asks 'what fields does SA1 have', 'index of SE1', 'parameter MV_ESTADO', 'generic table 12', 'how do I use FWExecStatement / Posicione / dbSeek', 'why does my query return empty', 'ProtheusDOC format', 'SonarQube rule CA2050', or needs dictionary impact validation during refactors/migrations."
license: MIT
metadata:
  domain: Protheus
  author: brunosps
  version: '1.0.0'
  category: Knowledge
  attribution: "Data dictionary, conventions and SonarQube catalog adapted from totvs/engpro-advpl-tlpp-skills (MIT); essential functions, SX tables and common errors adapted from jaylson/claude-skill-advpl (MIT). See ATTRIBUTION.md."
---

# TDS Codex — Protheus AdvPL/TLPP Knowledge Base

Reference knowledge for working with TOTVS Protheus: the data dictionary, the most-used AdvPL/TLPP functions, the errors you hit most often, coding conventions, and the SonarQube rule catalog. This is a read-and-cite skill — it answers questions and validates impact; it does not run anything (use `tds-forge` for the executable toolchain).

## When to Use

- Discover a table's fields, types, sizes, indexes, sharing mode (Exclusive/Shared).
- Look up a parameter (`MV_*`), generic table (SX5), trigger (SX7), question (SX1), or relationship (SX9).
- Recall how an essential function works (`FWExecStatement`, `Posicione`, `dbSeek`, `xFilial`, `RecLock`, JSON APIs, …).
- Diagnose a common AdvPL/TLPP error and apply the known fix.
- Confirm ProtheusDOC / naming / charset conventions before generating or reviewing code.
- Check a SonarQube rule id (e.g. `CA2050`, `BG1000`) and its required alternative.
- Validate dictionary impact during a refactor or migration (does this change touch fields, triggers, indexes, parameters, relationships?).

## Reference Files (progressive disclosure)

| Reference | Read when |
| --- | --- |
| [references/tabelas-sx.md](references/tabelas-sx.md) | Quick map of the SX* dictionary tables and their keys/purpose. |
| [references/sql-queries.md](references/sql-queries.md) | Running dictionary queries — fields, indexes, parameters, triggers, questions, relationships, lookups, combined views. Includes the mandatory `execute-sql` rules (TRIM, `d_e_l_e_t_`, lowercase, base table without enterprise suffix). |
| [references/column-reference.md](references/column-reference.md) | Interpreting query results — every column of SX2/SX3/SIX/SX6/SX5/SX7/SX1/SX9/SXB with type, values, and meaning. |
| [references/funcoes-essenciais.md](references/funcoes-essenciais.md) | Recalling the signature/behavior of the most-used AdvPL/TLPP functions. |
| [references/erros-comuns.md](references/erros-comuns.md) | Diagnosing a runtime/compile error and its standard fix. |
| [references/documentation-and-conventions.md](references/documentation-and-conventions.md) | ProtheusDOC blocks, naming, and TOTVS coding conventions. |
| [references/sonarqube-rules-reference.md](references/sonarqube-rules-reference.md) | The full SonarQube rule catalog (G1 security, G2 performance, G3 legacy, G4 metadata, G5 clean code). |

## Mandatory Rules for Dictionary Queries

1. Always filter soft-deletes: `d_e_l_e_t_ = ' '`.
2. Columns are **lowercase** (`x3_campo`, never `X3_CAMPO`).
3. Use `TRIM()` on `character` comparisons (trailing spaces).
4. Use the **base** table without enterprise suffix: `sx3`, `sx2`, `six` — never `sx3t10`.

## Response Format

When presenting a table, lead with its name + description (SX2), state the sharing mode and unique key, then a markdown table of fields (Field / Title / Type / Size / Dec / Required / Context) and a list of indexes. Note virtual fields, triggers, and special validations. See `references/sql-queries.md` for the queries and `references/column-reference.md` for column meanings.

## Related Skills

- `tds-forge` — executable quality gate that enforces a subset of the SonarQube catalog (`[CA2050]` etc.).
- `tds-sqlkit` — build/optimize/review the SQL whose tables you look up here.
- `tds-scaffold` / `tds-modernizer` — generate or migrate code using these conventions.
