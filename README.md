# tds-protheus-tools

A collection of **Claude/Agent skills for TOTVS Protheus** (AdvPL/TLPP) development — an executable
toolchain plus knowledge and code-generation skills, all under the `tds-*` namespace.

The collection is built around one differentiator: **`tds-forge`**, an executable Node CLI that
wraps the TOTVS `advpls` (TDS-Cli) and the TDS Language Server to actually compile, patch, inspect
the RPO, convert encoding, and run a static quality gate. The sibling skills add the knowledge and
generators that the toolchain operates on.

## Skills

| Skill | Type | What it does |
| --- | --- | --- |
| [`tds-forge`](skills/tds-forge/SKILL.md) | executable | Quality gate, compile, patch (gen/info), RPO inspection, appre, validate, `decompress-ch`, and `convert-encoding` — via `advpls` + LSP. The gate enforces a subset of the SonarQube catalog (security blocks, legacy/quality warns; `--gate-warn-only` to downgrade). |
| [`tds-codex`](skills/tds-codex/SKILL.md) | knowledge | Data dictionary (SX* tables), essential functions, common errors, conventions, SonarQube rule catalog. |
| [`tds-scaffold`](skills/tds-scaffold/SKILL.md) | generation | MVC screens (ModelDef/ViewDef/MenuDef) and Entry Points (TLPP-first). |
| [`tds-restkit`](skills/tds-restkit/SKILL.md) | generation | Consume external APIs (FWRest client) and expose TLPP REST endpoints (TTALK). |
| [`tds-sqlkit`](skills/tds-sqlkit/SKILL.md) | SQL | Build (Protheus-aware), optimize, and review SQL across PostgreSQL / SQL Server / Oracle. |
| [`tds-modernizer`](skills/tds-modernizer/SKILL.md) | modernization | Migrate AdvPL→TLPP and refactor / reduce cognitive complexity without changing behavior. |
| [`tds-testkit`](skills/tds-testkit/SKILL.md) | testing | Generate TIR (TOTVS Interface Robot) end-to-end tests in Python. |

## Install

Install the whole collection:

```bash
npx --yes skills add brunosps/tds-protheus-tools
```

Or a single skill:

```bash
npx --yes skills add brunosps/tds-protheus-tools --skill tds-forge
```

Skills install into `~/.claude/skills/<name>/`, each self-contained with its own `references/`
(and, for `tds-forge`, `scripts/` and `agents/`).

## `tds-forge` requirements

- **Node.js 18+** (`node`). `npm` if the CLI must auto-install `@totvs/tds-ls` / `vscode-jsonrpc`.
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

See [`skills/tds-forge/SKILL.md`](skills/tds-forge/SKILL.md) for the full action/option reference.

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

Do not commit `node_modules` or `package-lock.json`; `tds-forge` installs its runtime deps locally
when needed.

## Attribution & License

Skills are MIT-licensed. Knowledge/generation skills adapt reference material from
`totvs/engpro-advpl-tlpp-skills` and `jaylson/claude-skill-advpl` (both MIT) — see
[ATTRIBUTION.md](ATTRIBUTION.md).
