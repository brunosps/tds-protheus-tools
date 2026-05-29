---
name: tds-restkit
description: "Generate Protheus REST integration code, both directions. CONSUME external REST APIs with the FWRest client class (GET/POST/PUT/DELETE, headers, query/path params, JSON body, auth: No Auth / HTTP Basic / Bearer-JWT / OAuth 2.0, timeout, SSL, status handling). EXPOSE TLPP REST endpoints with annotation routing (@Get/@Post/@Put/@Patch/@Delete, oRest) following TOTVS API standards (TTALK): pagination, error model, standard headers, Swagger. Use when the user says 'consume REST API', 'call external API', 'FWRest', 'Bearer token AdvPL', 'create REST endpoint', 'TLPP REST', '@Get annotation', 'oRest endpoint'."
license: MIT
metadata:
  domain: Protheus
  author: brunosps
  version: '1.0.0'
  category: Code Generation
  attribution: "FWRest client and TLPP REST endpoint templates/references adapted from totvs/engpro-advpl-tlpp-skills (MIT). See ATTRIBUTION.md."
---

# TDS RestKit — Protheus REST Client & Endpoint Generator

Two complementary jobs. Pick the right one first:

- **Consuming** an external API from Protheus → use the **FWRest client** (Part 1).
- **Exposing** an endpoint from Protheus → use **TLPP REST annotations** (Part 2).

---

## Part 1 — Consume external APIs (FWRest client)

`FWRest` is the framework HTTP **client** class — the counterpart to the `@Get/@Post` server. It supports **GET, POST, PUT, DELETE** (no native PATCH) and handles SSL via `appserver.ini` socket config. Prefer it over legacy `HTTPCGet`/`HTTPCPost`/`HTTPQuote`.

Use when calling third-party APIs (CRMs, payment gateways, government services), sending JSON payloads, pulling data into a routine, or needing HTTP Basic / Bearer-JWT / OAuth 2.0 auth.

| Reference | Read when |
| --- | --- |
| [references/fwrest-api-reference.md](references/fwrest-api-reference.md) | FWRest object API — verbs, headers, path/query params, body, status codes, timeout, SSL. |
| [references/fwrest-authentication-patterns.md](references/fwrest-authentication-patterns.md) | No Auth, HTTP Basic, Bearer/JWT, OAuth 2.0 flows. |
| [references/fwrest-client-templates.md](references/fwrest-client-templates.md) | Ready GET/POST/PUT/DELETE client templates with TLPP try/catch and JSON (de)serialization. |

---

## Part 2 — Expose endpoints (TLPP REST)

Annotation-based routing with `@Get/@Post/@Put/@Patch/@Delete` and the `oRest` object, following the TOTVS API standard (TTALK): pagination, the standard error model, standard headers, and Swagger documentation.

Use when creating/extending a Protheus-served REST API, applying TTALK pagination/error conventions, or generating Swagger metadata.

| Reference | Read when |
| --- | --- |
| [references/tlpp-rest-endpoint-templates.md](references/tlpp-rest-endpoint-templates.md) | Endpoint templates — routing, request parsing, response building, pagination, error model. |
| [references/ttalk-standards-and-configuration.md](references/ttalk-standards-and-configuration.md) | TTALK standards, headers, status codes, `PrepareIn`/environment configuration. |

> Security: endpoints must not call `RpcSetEnv`/`RpcSetType` (gate rule `[BG1000]`). Configure `PrepareIn` and use the `tenantId` header instead. Validate this with `tds-forge --action quality`.

---

## Related Skills

- `tds-forge` — quality-gate (blocks `RpcSetEnv` in REST), compile, patch.
- `tds-codex` — data dictionary for the fields you serialize/consume.
- `tds-scaffold` — MVC screens that may call these clients/endpoints.
