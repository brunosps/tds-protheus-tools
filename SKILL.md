---
name: tds-protheus-tools
description: Compile Protheus AdvPL/TLPP sources, run a Protheus 12.1.2510 quality gate, generate PTM patches, inspect patch contents, and query RPO contents on Windows or Linux using TOTVS TDS-Cli/advpls and the TDS Language Server. Use when Codex needs to validate Protheus tenant-context safety, compile fontes, create a patch, validate TDS connectivity, run local appre precompile, inspect .ptm/.upd/.pak contents, verify resources/functions in an RPO, or prepare this skill for GitHub installation through npx skills. Use the default LOCALHOST/DEV/admin session unless the user asks to change it or connection/authentication fails.
---

# TDS Protheus Tools

Use this skill for Protheus quality validation, build, patch, and RPO inspection work through TOTVS TDS-Cli (`advpls`) and the TDS Language Server.

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

## GitHub / npx skills Distribution

Canonical repository:

```text
https://github.com/brunosps/tds-protheus-tools
```

Publish the skill folder as a GitHub repository with this root structure:

```text
tds-protheus-tools/
  SKILL.md
  agents/openai.yaml
  package.json
  .gitignore
  references/tds-cli-notes.md
  scripts/tds_protheus.mjs
  scripts/tds_lsp_client.js
  scripts/tds_protheus.ps1
  scripts/decompress_ch.py
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
