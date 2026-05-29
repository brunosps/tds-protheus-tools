---
name: tds-forge
description: Executable toolchain for TOTVS Protheus AdvPL/TLPP on Windows or Linux via TDS-Cli (advpls) and the TDS Language Server. Compiles fontes, runs a Protheus 12.1.2510 quality gate (tenant-context safety plus a SonarQube rule subset — security blocks, legacy/quality warns; --gate-warn-only downgrades), generates and inspects PTM/.upd/.pak patches, queries the RPO (resources/functions), runs local appre precompile, validates TDS connectivity, decompresses .ch/.th includes, and converts source encoding (UTF-8 <-> CP1252, preserving CRLF). Use when the user needs to validate, compile, patch, inspect the RPO, fix source encoding, or prepare this skill for npx skills install. Use the default LOCALHOST/DEV/admin session unless the user asks to change it or connection/authentication fails.
---

# TDS Forge

Use this skill for Protheus quality validation, build, patch, RPO inspection, and source-encoding conversion through TOTVS TDS-Cli (`advpls`) and the TDS Language Server. It is the executable core of the `tds-*` collection; the sibling skills (`tds-codex`, `tds-scaffold`, `tds-restkit`, `tds-sqlkit`, `tds-modernizer`, `tds-testkit`) provide the knowledge and generators it operates on.

## Non-Negotiables

- Prefer the portable Node CLI: `scripts/tds_protheus.mjs`.
- Use `scripts/tds_protheus.ps1` only as a Windows compatibility wrapper or when the user explicitly wants PowerShell.
- Run the `quality` action before compile/patch workflows when local sources are involved; `compile` already runs it automatically.
- Reuse current session credentials for authenticated commands.
- Use the default LOCALHOST connection when no override is provided: `127.0.0.1`, port `30600` with TDS-Cli fallback to `1234`, environment `DEV`, user `admin`, password `admin`.
- Ask for `server`, `port`, `environment`, `username`, and `password` only when the user asks to change them or when connection/authentication fails.
- Do not store non-default credentials in files, skill resources, repo files, memory, or final answers.
- Use temporary `.ini` files only; delete them after execution.
- If `advpls` is missing, let the Node CLI install `@totvs/tds-ls` and `vscode-jsonrpc` inside the skill directory; this may require network approval.
- Request filesystem escalation when writing outside the workspace, such as `C:\TOTVS\Patchs` on Windows or `~/TOTVS/Patchs` on Linux.
- Compile through a unique temp staging folder so `.ppo`, `.ppx*`, and `.errprw` files do not pollute the source tree.

## Requirements

- Node.js 18+ available as `node`.
- `npm` available if the skill must auto-install `@totvs/tds-ls` or `vscode-jsonrpc`.
- `advpls` for compile, patch, appre, and RPO actions. The `quality` action does not require `advpls`, AppServer, credentials, or network access.
- `python3` (or `python`) for the `decompress-ch` action; it does not require `advpls`, AppServer, credentials, or network access.
- `iconv` for the `convert-encoding` action (pre-installed on Linux/macOS; via Git Bash on Windows); it does not require `advpls`, AppServer, credentials, or network access.
- On Linux, set `TDS_INCLUDES` or pass `--includes` when includes are not in `/opt/totvs/includes`.

The CLI resolves `advpls` in this order:

1. `--advpls-path`.
2. `TDS_ADVPLS_PATH`.
3. `node_modules/@totvs/tds-ls/bin/<platform>/advpls` inside this skill.
4. Installed VS Code extension `totvs.tds-vscode-*`.
5. `advpls` or `advpls.exe` on `PATH`.
6. Automatic local install with `npm --prefix <skill-dir> install @totvs/tds-ls vscode-jsonrpc --no-audit --no-fund`.

## Defaults

- Build: `7.00.240223P`
- Secure: `false`
- Includes: `TDS_INCLUDES` when set; otherwise `C:\TOTVS\includes` on Windows or `/opt/totvs/includes` on Linux.
- Patch output folder: `TDS_PATCH_DIR` when set; otherwise `C:\TOTVS\Patchs` on Windows or `~/TOTVS/Patchs` on Linux.
- Server: `127.0.0.1`
- Port: `30600`, TDS-Cli fallback `1234`
- Environment: `DEV`
- User/password: `admin` / `admin`

If `.totvsls/servers.json` exists and the user names a configured server, use that server's address, port, build, secure flag, includes, and environment unless overridden.

## Portable CLI Usage

Resolve the script relative to this skill directory. The CLI accepts `--kebab-case`, `--camelCase`, or PowerShell-style `-PascalCase` options.

Run the quality gate without TDS-Cli:

```bash
node .codex/skills/tds-protheus-tools/scripts/tds_protheus.mjs \
  --action quality \
  --programs ./src/A.prw,./src/B.tlpp
```

Compile sources:

```bash
node .codex/skills/tds-protheus-tools/scripts/tds_protheus.mjs \
  --action compile \
  --programs ./src/A.prw,./src/B.prw \
  --recompile
```

Generate a PTM patch from RPO resources:

```bash
node .codex/skills/tds-protheus-tools/scripts/tds_protheus.mjs \
  --action patch-gen \
  --file-resources MECOPYCLI.PRW,MA030ROT.PRW \
  --patch-name MECOPYCLI_20260511_114955 \
  --save-local ./patches
```

Inspect a patch:

```bash
node .codex/skills/tds-protheus-tools/scripts/tds_protheus.mjs \
  --action patch-info \
  --patch-file ./patches/MECOPYCLI.ptm
```

Query RPO resources:

```bash
node .codex/skills/tds-protheus-tools/scripts/tds_protheus.mjs \
  --action rpo-check \
  --file-resources MECOPYCLI.PRW,MA030ROT.PRW
```

Decompress TOTVS `.ch`/`.th` includes (raw zlib). The action streams raw bytes, so the original Windows-1252 (cp1252) encoding of each include is preserved verbatim — no decode/re-encode happens:

```bash
node .codex/skills/tds-protheus-tools/scripts/tds_protheus.mjs \
  --action decompress-ch \
  --source /path/to/compressed/includes \
  --dest /opt/totvs/includes
```

Convert source encoding between UTF-8 and CP1252 (Windows-1252). Skips pure-ASCII and already-target files, strips the UTF-8 BOM, preserves CRLF line endings and file permissions. Uses `iconv`; `--to cp1252` (default) delegates to `convert_encoding.{sh,bat}`, `--to utf8` runs the reverse inline:

```bash
node .codex/skills/tds-protheus-tools/scripts/tds_protheus.mjs \
  --action convert-encoding \
  --source ./src \
  --to cp1252 \
  --recursive \
  --dry-run
```

Options: `--source <file|dir>` (required), `--to cp1252|utf8` (default `cp1252`), `--recursive`, `--dry-run`, `--extensions "prw prg tlpp prx ch th"` (default). Requires `iconv`; no `advpls`, AppServer, credentials, or network access. Use this instead of editing cp1252 sources with text tools, which corrupt accented characters.

Windows compatibility form:

```powershell
& .codex\skills\tds-protheus-tools\scripts\tds_protheus.ps1 `
  -Action quality -Programs C:\path\A.prw,C:\path\B.tlpp
```

## Quality Gate 12.1.2510

`quality` and `compile` block direct tenant/user context mutation in `.prw` and `.tlpp` sources:

- Direct assignment to `cEmpAnt`, `__cUserId`, `cFilAnt`, or `cNumEmp`.
- Local/private/public/static declarations that initialize those names.
- By-reference mutation risk with `@cEmpAnt`, `@__cUserId`, `@cFilAnt`, or `@cNumEmp`.

Read access is allowed, such as `Local cEmp := cEmpAnt` or `If cEmpAnt == "01"`.

Correction guidance:

- For jobs and routines, prepare context at thread start; use `RpcSetEnv()` only inside a new `StartJob`, `SmartJob`, or equivalent thread.
- For REST, use `PrepareIn` and the `tenantId` header.
- For SOAP, use specialist URI/`PrepareIn` configuration per company/branch.
- For branch filters, prefer `xFilial()` or `FWxFilial()`.
- Preserve work areas with `FwGetArea()` and `FwRestArea()` around alias navigation.

Additional blocking `.prw` validation errors:

- `Static Function` names longer than 10 characters.
- `User Function` declared with `U_` in source.
- `User Function` names longer than 8 characters.
- Missing explicit `Return` in `Static Function` or `User Function`.
- TLPP JSON literal syntax in ADVPL `.prw` sources.
- `MsgInfo()`, `MsgAlert()`, `MsgStop()`, `Alert()`, or `InputBox()` inside `Begin Transaction` / `End Transaction`.

Non-blocking `.prw` warnings:

- `Private` or `Public` declarations.
- Both `PROTHEUS.CH` and `TOTVS.CH` included in the same source.
- Macro substitution with `&`.
- Long or complex codeblocks.
- `DbSelectArea()` without nearby workarea restore pattern.
- `fCreate()` or `fOpen()` with absolute Windows paths.
- String comparison with single `=` inside conditions.
- JSON indexed property access in conditions without `HasProperty()`.

### SonarQube rule catalog (engpro.totvs)

The gate also evaluates the AdvPL/TLPP SonarQube catalog (see `references/sonarqube-rules-reference.md`). Each finding is tagged with its rule id, e.g. `[CA2050]`. **Security (G1) blocks; legacy/quality (G2/G3/G4) warns.** These rules apply to both `.prw` and `.tlpp`.

Blocking (security, `[id]`):

- `[CA2022]` `StaticCall()` — use `FWLoadModel()`/`FWLoadMenuDef()` or a direct namespace call.
- `[CA2023]` `PTInternal()` — prohibited.
- `[CA2052]` Hardcoded credential (var named `*senha*/*pass*/*pwd*/*secret*/*token*/*apikey*` assigned a string literal) — read from `GetMV()`/AppServer config.
- `[CA2053]` `CREATE PROCEDURE` in source — use SPManager.
- `[CA2050]` SQL injection: a **bare variable** concatenated into a SQL value (`= '" + cVar + "'`). Framework calls (`xFilial()`, `RetSqlName()`, `FWxFilial()`, …) are excluded. Use `FWExecStatement()` with bind parameters.
- `[BG1000]` `RpcSetEnv()`/`RpcSetType()` inside a REST/SOAP source (detected via `@Get/@Post/...`, `WSRESTFUL`, `WSMETHOD`, `WSSERVICE`) — configure `PrepareIn`.

Warning (legacy/quality, `[id]`):

- `[CA1004]` `ConOut()`/`OutErr()`/`?` console output — use `FWLogMsg()`.
- `[CA1000]` ISAM `MSCREATE`/`DBCREATE`/`CRIATRAB` — use `FWTemporaryTable`.
- `[CA1003]` `GetMV`/`SuperGetMV`/`ExistBlock`/`AllUsers`/`Pergunte`/`Type` inside a loop — cache before the loop.
- `[CA2000–CA2012]` direct `DbSelectArea`/`DbUseArea` on system tables (`SM0`, `SIX`, `SX1`–`SXG`, …) — use the framework API.
- `[CA4000]` inline `IIf()`/`IF()` ternary — prefer `If/Else/EndIf` (rolled up once per file).
- `[CA3001]` `#INCLUDE`/filename not lowercase (rolled up once per file).
- `[CA1005]` `.ini` file reference (rolled up once per file).
- `[TDS-DELET]` SQL with `RetSqlName()` but no `D_E_L_E_T_` filter.
- `[TDS-FILIAL]` SQL with `RetSqlName()` but no `xFilial()`/`FWxFilial()`.
- `[TDS-TCQUERY]` `TCQuery` opened without `DbCloseArea()`.
- `[TDS-RECLOCK]` `RecLock()` without a nearby `MsUnLock()`.

### Bypassing blocking rules for legacy compiles

`--gate-warn-only` downgrades **all** blocking rules (including the legacy tenant-context and name-length checks) to warnings, so the gate prints findings but does not abort. Use it to compile legacy sources that intentionally violate a security/style rule:

```bash
node scripts/tds_protheus.mjs --action compile --programs ./src/Legacy.prw --gate-warn-only --recompile
```

Standard TOTVS sources whose function names exceed the length limits (e.g. `nfsexmlenv.prw`) fail the legacy name-length rules regardless of the SonarQube catalog; compile them with `--gate-warn-only` or via `advpls` directly.

## GitHub / npx skills Distribution

Canonical repository:

```text
https://github.com/brunosps/tds-protheus-tools
```

Publish the skill folder as a GitHub repository with this root structure:

```text
tds-protheus-tools/                  # collection repository
  skills/tds-forge/                  # this skill (executable toolchain)
    SKILL.md
    agents/openai.yaml
    package.json
    references/tds-cli-notes.md
    scripts/tds_protheus.mjs
    scripts/tds_lsp_client.js
    scripts/tds_protheus.ps1
    scripts/decompress_ch.py
    scripts/convert_encoding.sh
    scripts/convert_encoding.bat
  skills/tds-codex/ ...              # sibling knowledge/generation skills
```

Install from GitHub with:

```bash
npx --yes skills add brunosps/tds-protheus-tools
```

If the repository contains multiple skills or the installer needs an explicit skill name:

```bash
npx --yes skills add brunosps/tds-protheus-tools --skill tds-protheus-tools
```

Do not commit `node_modules` or `package-lock.json`; the CLI installs runtime dependencies locally when needed.

For local development after cloning:

```bash
git clone https://github.com/brunosps/tds-protheus-tools.git
cd tds-protheus-tools
npm run validate:syntax
python ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py .
```

## Workflow

1. Identify the operation: quality, compile, patch generation, patch inspection, RPO inspection, validate, or appre.
2. Use `quality` for static checks; it should run without Protheus connectivity.
3. Use current session credentials/defaults for authenticated operations.
4. Confirm source paths, RPO resource names, or patch path when ambiguous.
5. Run the bundled portable CLI with temporary credential handling and temp compile staging.
6. Report relevant gate errors, TDS log lines, JSON result, patch path, patch contents, RPO resource status, or RPO function status.

## Notes

- `patchGen` packages resources from the RPO. Compile sources first when the user's intent is to patch recent local changes.
- `compile` aborts before TDS-Cli if any quality gate rule fails.
- `patchInfo` requires authentication and reads a local patch when `localPatch=True`.
- `rpo-*` actions use the TDS Language Server requests that VS Code uses, such as `$totvsserver/inspectorObjects`, `$totvsserver/inspectorFunctions`, and `$totvsserver/rpoInfo`.
- `rpo-check` is the preferred way to verify whether a resource exists in an RPO without generating a patch.
- `appre` is useful for quick syntax/preprocessor checks but does not prove the source compiled into the RPO.
- See `references/tds-cli-notes.md` for exact action parameters.
