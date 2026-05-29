# Attribution

This repository is a collection of authorial skills (`tds-*`). The executable toolchain in
**`tds-forge`** is original work. Several knowledge/generation skills incorporate reference
material adapted from two upstream projects, both licensed **MIT**:

- **totvs/engpro-advpl-tlpp-skills** — https://github.com/totvs/engpro-advpl-tlpp-skills (MIT)
- **jaylson/claude-skill-advpl** — https://github.com/jaylson/claude-skill-advpl (MIT)

Per the MIT license, the original copyright and permission notices are retained below. The
upstream skill *names* (e.g. `mvc-generator`, `code-review`, `query-builder`) are **not** reused;
this collection uses its own `tds-*` naming and authorship. Reference content (data dictionary,
templates, patterns, SonarQube catalog, TIR methods) was copied/adapted with the attribution noted
in each skill's `SKILL.md` frontmatter (`metadata.attribution`).

## Per-skill provenance

| Skill | Upstream source(s) | Notes |
| --- | --- | --- |
| `tds-forge` | — (original) | Executable Node CLI over TOTVS `advpls` (TDS-Cli) + TDS Language Server. The `convert-encoding` action reuses the `convert-encoding.{sh,bat}` scripts from totvs `utf8-to-cp1252-conversion` (MIT). |
| `tds-codex` | totvs `data-dictionary-lookup`, `code-review`; jaylson `claude-skill-advpl` | Dictionary SQL/columns + conventions + SonarQube catalog (totvs); essential functions, SX tables, common errors (jaylson). |
| `tds-scaffold` | totvs `mvc-generator`, `entry-point-designer` | MVC + Entry Point templates and references. |
| `tds-restkit` | totvs `fwrest-client-generator`, `tlpp-rest-endpoint-generator` | FWRest client + TLPP REST endpoint references. |
| `tds-sqlkit` | totvs `query-builder`, `sql-optimization`, `sql-code-review` | Build + optimize + review references. |
| `tds-modernizer` | totvs `advpl-to-tlpp-migration`, `refactor`, `refactor-method-complexity-reduce` | Migration + refactoring references. |
| `tds-testkit` | totvs `tir-test-generator` | TIR setup, patterns, webapp method reference. |

Out of scope (not copied): the upstream `superpowers/*` generic skills and `advpl-tlpp-sdd`
(spec-driven-development process).

---

## MIT License (upstream)

The upstream projects are distributed under the MIT License. A copy of the MIT License terms:

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Refer to each upstream repository for its exact `LICENSE` file and copyright holders.
