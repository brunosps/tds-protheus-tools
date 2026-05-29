---
name: tds-sqlkit
description: "Build, optimize, and review SQL for Protheus and relational databases (PostgreSQL, SQL Server, Oracle). Builds safe queries with mandatory filters (D_E_L_E_T_, branch xFilial), suggests SIX-based indexes, generates Embedded SQL (preferring FWExecStatement) and Workarea (DBSelectArea/DBSeek) versions; optimizes slow queries (execution plans, indexing, pagination, batch ops); reviews SQL for injection, anti-patterns, and quality. Use when the user says 'build query', 'SQL for Protheus table', 'FWExecStatement', 'TCQuery', 'optimize SQL', 'slow query', 'index strategy', 'execution plan', 'review SQL', 'SQL security audit', 'SQL anti-patterns'."
license: MIT
metadata:
  domain: Protheus
  author: brunosps
  version: '1.0.0'
  category: SQL
  attribution: "Query-builder, SQL optimization and SQL code-review references adapted from totvs/engpro-advpl-tlpp-skills (MIT). See ATTRIBUTION.md."
---

# TDS SqlKit — Build, Optimize & Review SQL

Three SQL jobs in one skill. Identify the intent first:

- **Build** a new query for Protheus tables → Part 1.
- **Optimize** a slow/expensive query → Part 2.
- **Review** existing SQL for security/quality → Part 3.

---

## Part 1 — Build (Protheus-aware)

Generate safe, correct queries for Protheus tables. Always inject the mandatory filters and prefer parameter binding:

- Soft-delete filter `D_E_L_E_T_ = ' '` on every table.
- Branch scope via `xFilial()`/`FWxFilial()`.
- **Prefer `FWExecStatement()` with bind parameters (`?`)** over string concatenation (avoids the `[CA2050]` SQL-injection rule).
- Suggest the right index from SIX patterns; offer both Embedded SQL and Workarea (`DBSelectArea`/`DBSeek`) versions when relevant.

| Reference | Read when |
| --- | --- |
| [references/query-patterns-and-examples.md](references/query-patterns-and-examples.md) | Query templates and worked examples (FWExecStatement, TCQuery, Workarea). |
| [references/cross-database-compatibility.md](references/cross-database-compatibility.md) | Writing portable SQL across PostgreSQL / SQL Server / Oracle (functions, paging, dates). |

---

## Part 2 — Optimize

Tune query performance: execution-plan analysis, indexing strategy, pagination, batch operations, and monitoring across PostgreSQL, SQL Server, and Oracle.

| Reference | Read when |
| --- | --- |
| [references/sql-optimization.md](references/sql-optimization.md) | The optimization workflow and decision guide. |
| [references/sql-optimization-patterns.md](references/sql-optimization-patterns.md) | Concrete before/after tuning patterns (indexes, joins, paging, batching). |

---

## Part 3 — Review

Audit SQL for SQL-injection prevention, access control, code standards, and anti-patterns.

| Reference | Read when |
| --- | --- |
| [references/sql-security-patterns.md](references/sql-security-patterns.md) | Injection prevention, parameterization, access control. |
| [references/sql-performance-and-quality-patterns.md](references/sql-performance-and-quality-patterns.md) | Anti-pattern detection and maintainability checks. |
| [references/database-specific-best-practices.md](references/database-specific-best-practices.md) | Engine-specific best practices (PostgreSQL / SQL Server / Oracle). |

---

## Related Skills

- `tds-codex` — the data dictionary (tables/fields/indexes) behind the queries.
- `tds-forge` — quality-gate flags raw SQL concatenation (`[CA2050]`), missing `D_E_L_E_T_` (`[TDS-DELET]`) and missing `xFilial` (`[TDS-FILIAL]`).
