# TDS-Cli Notes

Use `advpls cli <script.ini>` for authenticated actions. On Windows the executable is usually `advpls.exe`; on Linux it is usually `advpls`. The script must be ANSI/CP1252.

Core TDS-Cli actions:

- `validate`: detect AppServer build and secure mode. Needs `server` and `port`; no authentication.
- `authentication`: connect to AppServer. Needs `server`, `port`, `secure`, `build`, `environment`, `user`, and `psw`.
- `compile`: compile or recompile sources into RPO. Needs authenticated session, `program`, `recompile`, and `includes`.
- `patchGen`: generate a patch from RPO resources. Needs authenticated session, `fileResource`, `patchType`, and either `saveLocal` or `saveRemote`.
- `patchInfo`: inspect a patch. Needs authenticated session, `patchFile`, `localPatch`, and optional `output`.
- `appre`: local precompile mode with `advpls appre -I <include> <sources>`. It does not commit to RPO.
- `quality`: skill-local static quality gate. It does not require `advpls`, AppServer, credentials, or network access.

RPO inspection actions use `advpls language-server` through `scripts/tds_lsp_client.js`, not `advpls cli`.

- `rpo-info`: calls `$totvsserver/rpoInfo`.
- `rpo-objects`: calls `$totvsserver/inspectorObjects`.
- `rpo-functions`: calls `$totvsserver/inspectorFunctions`.
- `rpo-check`: calls `$totvsserver/inspectorObjects` and compares `fileResource` basenames case-insensitively.

Dependency resolution:

- Prefer an explicit `advpls` path when provided.
- Otherwise use `TDS_ADVPLS_PATH`, the skill-local `@totvs/tds-ls`, the VS Code TDS extension, or `PATH`.
- If none exists, install `@totvs/tds-ls` with `npm --prefix <skill-dir> install @totvs/tds-ls --no-audit --no-fund`.
- Network-restricted environments may require command escalation/approval for the installation.

Important behavior:

- `compile program` accepts local source paths separated by comma or semicolon.
- `patchGen fileResource` accepts RPO resource names separated by comma or semicolon. Use basenames such as `MECOPYCLI.PRW` unless the environment requires a specific resource name.
- Patch generation packages what is already in RPO, so compile first for recent local changes.
- TDS-Cli uses `psw`, not `password`, for authentication.
- TDS Language Server authentication sends `encoding=CP1252` by default to preserve Windows-1252 behavior.
- Some TDS LS builds may fail to initialize outside the VS Code extension host. In that case, use patch generation/inspection as a fallback for RPO confirmation.
