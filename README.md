# tds-protheus-tools

A collection of **Claude/Agent skills for TOTVS Protheus** (AdvPL/TLPP) development — one executable
toolchain plus knowledge and code-generation skills, all under the `tds-*` namespace.

The collection is built around its differentiator: **`tds-forge`**, an executable Node CLI that wraps
the TOTVS `advpls` (TDS-Cli) and the TDS Language Server to actually compile, patch, inspect the RPO,
convert source encoding, and run a static quality gate. The six sibling skills add the knowledge and
generators the toolchain operates on.

---

## Install (`npx skills add`)

The skills are installed with the [`skills`](https://www.npmjs.com/package/skills) CLI. It auto-detects
the agent (Claude Code, etc.) and, by default, installs **project-level** when you are inside a project,
otherwise **global** (`~/.claude/skills/`). Use `-g` to force global.

> **Note:** `skills add <owner>/<repo>` pulls from the repository's **default branch on GitHub**. The
> collection layout lives on the branch that introduced it — push/merge it to the default branch
> first, or install from a local clone (below).

### From GitHub (after the collection is on the default branch)

```bash
# install the whole collection, globally, for the detected agent
npx --yes skills add brunosps/tds-protheus-tools -g --skill '*' -y

# just list what the repo offers (no install)
npx --yes skills add brunosps/tds-protheus-tools --list

# install a single skill
npx --yes skills add brunosps/tds-protheus-tools -g --skill tds-forge -y
```

### From a local clone (works today)

```bash
git clone https://github.com/brunosps/tds-protheus-tools.git
npx --yes skills add ./tds-protheus-tools -g --skill '*' -y
# or copy files instead of symlinking:
npx --yes skills add ./tds-protheus-tools -g --skill '*' --copy -y
```

Useful flags: `-s, --skill '*'` (all skills, or a name), `-a, --agent '*'` (all agents),
`-l, --list` (list only), `--copy` (copy instead of symlink), `--all` (= `--skill '*' --agent '*' -y`).
Manage with `npx skills list`, `npx skills update`, `npx skills remove`.

After install, each skill lives self-contained in `~/.claude/skills/<name>/` with its own `references/`
(and, for `tds-forge`, `scripts/` and `agents/`).

---

## The skills

### `tds-forge` — executable toolchain ⭐ (original)

The core. A portable Node CLI (`scripts/tds_protheus.mjs`, with a PowerShell wrapper) over TOTVS
`advpls` and the TDS Language Server.

- **Quality gate** (`--action quality`, also run automatically before `compile`): static analysis of
  `.prw`/`.tlpp` enforcing Protheus 12.1.2510 tenant-context safety **plus a SonarQube rule subset** —
  **security blocks** (`[CA2022]` StaticCall, `[CA2023]` PTInternal, `[CA2050]` SQL injection on bare
  variables, `[CA2052]` hardcoded credentials, `[CA2053]` CREATE PROCEDURE, `[BG1000]` RpcSetEnv/Type
  in REST/SOAP), **legacy/quality warns** (`[CA1000]`, `[CA1003]`, `[CA1004]`, `[CA2000–CA2012]`,
  `[CA3001]`, `[CA4000]`, `[CA1005]`, plus authorial `[TDS-DELET]`/`[TDS-FILIAL]`/`[TDS-TCQUERY]`/
  `[TDS-RECLOCK]`). `--gate-warn-only` downgrades every blocking rule to a warning for legacy compiles.
- **Compile** (`--action compile`) through a temp staging folder so artifacts never pollute the tree.
- **Patches** — generate PTM (`--action patch-gen`) and inspect `.ptm`/`.upd`/`.pak` (`--action patch-info`).
- **RPO inspection** — `rpo-info`/`rpo-objects`/`rpo-functions`/`rpo-check` via the LSP requests VS Code uses.
- **`appre`** local precompile, **`validate`** TDS connectivity.
- **`decompress-ch`** — decompress TOTVS `.ch`/`.th` includes (raw zlib, preserves cp1252).
- **`convert-encoding`** — convert sources between UTF-8 and CP1252 (Windows-1252), preserving CRLF and
  permissions, skipping ASCII, stripping BOM. Solves accent corruption when editing cp1252 sources.

See [`skills/tds-forge/SKILL.md`](skills/tds-forge/SKILL.md) for every action/option.
**Credit:** original work. The `convert-encoding` shell/batch scripts are adapted from totvs
`utf8-to-cp1252-conversion` (MIT); the SonarQube rule catalog (`references/sonarqube-rules-reference.md`)
is from totvs `engpro-advpl-tlpp-skills` (MIT).

### `tds-codex` — knowledge base

Reference knowledge: the Protheus **data dictionary** (SX1/SX2/SX3/SX5/SX6/SX7/SX9/SXA/SXB/SIX — fields,
indexes, parameters, triggers, questions, relationships, lookups, with the mandatory `execute-sql`
rules), the most-used **AdvPL/TLPP functions**, **common errors** and their fixes, **ProtheusDOC**/naming
conventions, and the full **SonarQube rule catalog**. A read-and-cite skill — also used to validate
dictionary impact during refactors/migrations.
**Credit:** data dictionary, conventions and SonarQube catalog adapted from totvs `data-dictionary-lookup`
and `code-review`; essential functions, SX tables and common errors adapted from jaylson
`claude-skill-advpl`. Both MIT.

### `tds-scaffold` — MVC & Entry Point generator

Generate Protheus structural code: **MVC screens** (`ModelDef`/`ViewDef`/`MenuDef`/`FWFormBrowse`,
single-entity Modelo 1 and master-detail Modelo 3, validations, triggers) and **Entry Points** (Pontos
de Entrada). Entry Points default to **TLPP** (AdvPL only when explicitly requested) and enforce the hard
rules (never use the `U_` prefix; file name = EP name uppercase; defensive `PARAMIXB`; fail-safe return).
**Credit:** MVC and Entry Point templates/references adapted from totvs `mvc-generator` and
`entry-point-designer` (MIT).

### `tds-restkit` — REST client & endpoint generator

Both directions of REST integration: **consume** external APIs with the **FWRest** client class
(GET/POST/PUT/DELETE, headers, params, JSON body, auth: No Auth / HTTP Basic / Bearer-JWT / OAuth 2.0,
timeout, SSL), and **expose** TLPP REST endpoints with annotation routing (`@Get/@Post/@Put/@Patch/@Delete`,
`oRest`) following TOTVS API standards (**TTALK**: pagination, error model, headers, Swagger).
**Credit:** FWRest client and TLPP REST endpoint references adapted from totvs `fwrest-client-generator`
and `tlpp-rest-endpoint-generator` (MIT).

### `tds-sqlkit` — build, optimize & review SQL

Three SQL jobs: **build** Protheus-aware queries (mandatory `D_E_L_E_T_`/branch filters, SIX-based index
hints, `FWExecStatement` vs Workarea), **optimize** slow queries (execution plans, indexing, pagination,
batching across PostgreSQL/SQL Server/Oracle), and **review** SQL (injection prevention, anti-patterns,
quality).
**Credit:** query-builder, optimization and code-review references adapted from totvs `query-builder`,
`sql-optimization` and `sql-code-review` (MIT).

### `tds-modernizer` — AdvPL→TLPP migration & refactoring

**Migrate** legacy `.prw` to idiomatic `.tlpp` (includes/namespaces, type annotations, Try-Catch, REST
migration, long identifiers, inline JSON, named parameters, access modifiers, `StaticCall` removal) and
**refactor** without changing behavior (extract functions, break down god functions, eliminate smells,
reduce cognitive complexity below a threshold by extracting helpers).
**Credit:** migration and refactoring references adapted from totvs `advpl-to-tlpp-migration`, `refactor`
and `refactor-method-complexity-reduce` (MIT).

### `tds-testkit` — TIR end-to-end tests

Generate Python end-to-end tests that drive Protheus SmartClient/Webapp screens with **TIR (TOTVS
Interface Robot)**: CRUD and MVC screens, grid interaction, reports, field validation, message-box
assertions, plus environment setup and the exact Webapp method reference.
**Credit:** TIR setup, patterns and webapp method references adapted from totvs `tir-test-generator` (MIT).

---

## Credits & inspiration

This collection is authorial work (its own `tds-*` naming, descriptions, and the original `tds-forge`
CLI), but the knowledge and generator skills were built by **copying and adapting reference content**
from two excellent open-source projects, both **MIT-licensed**:

- **[totvs/engpro-advpl-tlpp-skills](https://github.com/totvs/engpro-advpl-tlpp-skills)** — the TOTVS
  EngPro AdvPL/TLPP skills collection (dictionary, MVC, REST, SQL, migration, refactor, TIR, encoding
  conversion, SonarQube catalog). Source of most of the reference material here.
- **[jaylson/claude-skill-advpl](https://github.com/jaylson/claude-skill-advpl)** — a Claude AdvPL
  knowledge skill (essential functions, SX tables, common errors), folded into `tds-codex`.

The upstream skill *names* are **not** reused. Out of scope (not copied): the upstream `superpowers/*`
generic skills and `advpl-tlpp-sdd` (spec-driven-development process).

Full per-skill provenance and the MIT notice are in **[ATTRIBUTION.md](ATTRIBUTION.md)**.

---

## `tds-forge` requirements

- **Node.js 18+** (`node`); `npm` if the CLI must auto-install `@totvs/tds-ls` / `vscode-jsonrpc`.
- **`advpls`** (TDS-Cli) for compile/patch/appre/RPO actions. The `quality` action needs none of
  `advpls`, AppServer, credentials, or network.
- **`python3`** for `decompress-ch`; **`iconv`** for `convert-encoding`.
- On Linux, set `TDS_INCLUDES` or pass `--includes` if includes are not in `/opt/totvs/includes`.

```bash
# quality gate (no TDS-Cli needed)
node skills/tds-forge/scripts/tds_protheus.mjs --action quality --programs ./src/A.prw,./src/B.tlpp

# compile a legacy source, downgrading blocking gate rules to warnings
node skills/tds-forge/scripts/tds_protheus.mjs --action compile --programs ./src/Legacy.prw --gate-warn-only --recompile

# convert sources to CP1252 (preserves CRLF), dry-run first
node skills/tds-forge/scripts/tds_protheus.mjs --action convert-encoding --source ./src --recursive --dry-run
```

---

## Layout

```text
tds-protheus-tools/
  README.md
  ATTRIBUTION.md
  .gitignore
  skills/
    tds-forge/      SKILL.md  agents/  package.json  references/  scripts/
    tds-codex/      SKILL.md  references/
    tds-scaffold/   SKILL.md  references/
    tds-restkit/    SKILL.md  references/
    tds-sqlkit/     SKILL.md  references/
    tds-modernizer/ SKILL.md  references/
    tds-testkit/    SKILL.md  references/
```

Do not commit `node_modules` or `package-lock.json`; `tds-forge` installs its runtime deps locally when
needed. Skills are MIT-licensed.
