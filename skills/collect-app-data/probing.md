# Probe Authoring

## What This Document Is

This document tells the skill HOW to write a probe — not what code to copy.
There are no per-application or per-platform templates. Every probe is authored from scratch using model knowledge, then docs lookup, then a user-supplied example as a fallback.

---

## Required Inputs Before Authoring

Confirm all four before writing a single line of probe code:

| Input | Purpose |
|---|---|
| **App name** | Folder naming and output file prefix |
| **Platform classifier** | Determines library and auth pattern |
| **Endpoint URI** | API base URL, `host:port`, LDAP URL — explicitly required; never guessed |
| **Secret location** | `.env` var name — confirm it exists, do not print values |

If any input is missing, ask before proceeding.

---

## Platform Classifiers

| Classifier | Library | Notes |
|---|---|---|
| `REST` | `httpx` (preferred over `requests`) | Default for HTTP APIs |
| `SQL/Oracle` | `oracledb` thin mode | No Oracle Instant Client needed |
| `SQL/MSSQL` | `pymssql` with NTLM or SQL auth | |
| `SQL/Postgres` | `psycopg2` | |
| `LDAP` | `ldap3` with paging | SimplePagedResultsControl |
| `Graph` | MSAL + `httpx` | Microsoft Graph API |
| `SAP/RFC` | `pyrfc` | SAP function modules |
| `SAP/HANA` | File drop (`openpyxl`) | ACTT xlsx extraction |
| `file drop` | `openpyxl`, `csv`, `json` | Local file parse |
| `other` | Determine from API spec | Ask user for library if unclear |

---

## Authoring Path — Try in Order

### 1. Known system (write directly from model knowledge)

For well-known platforms (REST APIs, Oracle, MSSQL, LDAP, Microsoft Graph, SAP),
write the probe directly. Model knowledge of these systems is reliable.

Examples of what "model knowledge" covers:
- REST: `httpx.Client`, bearer headers, `params={"page": n, "limit": 100}`, pagination via `Link` header or `next_page` field
- Oracle: `oracledb.connect(user, password, dsn)`, thin mode, `cursor.execute` with parameterized queries
- MSSQL: `pymssql.connect(server, user, password, database)`, NTLM via `domain\user`
- LDAP: `ldap3.Server`, `ldap3.Connection`, `SimplePagedResultsControl`, search with `BASE`/`SUBTREE` scope
- Microsoft Graph: `msal.ConfidentialClientApplication`, `acquire_token_for_client(scopes=[...])`

### 2. Less familiar system — query context7

When unsure about current library API or endpoint shape:

```
mcp__plugin_context7_context7__resolve-library-id  → find the library doc ID
mcp__plugin_context7_context7__query-docs           → get current API docs
```

Use for: less common SaaS APIs, newer SDK versions, vendor-specific SDKs.

### 3. Vendor docs — WebFetch

If the user provides an API reference URL, fetch it:

```
WebFetch(url=<user-supplied API reference URL>)
```

Do not guess URLs. Only fetch user-supplied or clearly canonical doc URLs.

### 4. Stuck — ask the user

If none of the above yields enough to write a probe:
- Ask for an example `curl` command, sample response payload, or library name.
- Ask once, precisely. Iterate from the answer.

---

## Exhaustive Probe Categories

Attempt all of the following for every REST app. Wrap each in try/except.
Failures are logged as warnings and written to `notes`. Never abort on optional endpoint failure.

### Account / user endpoints
`/users`, `/v1/users`, `/api/users`, `/accounts`, `/v1/accounts`,
`/admin/users`, `/admin/accounts`, `/api/v1/users`, `/api/v2/users`,
`/identities`, `/members`, `/principals`, `/subjects`

### Identity / auth-related endpoints
`/roles`, `/groups`, `/permissions`, `/entitlements`,
`/password-policy`, `/password-policies`,
`/mfa`, `/mfa-settings`, `/mfa-config`,
`/sso`, `/sso-config`, `/saml`, `/oidc`,
`/oauth-clients`, `/oauth2/clients`,
`/personal-access-tokens`, `/api-keys`, `/tokens`,
`/service-accounts`, `/service-principals`,
`/ldap`, `/directory`,
`/audit`, `/audit-log`, `/audit-events`,
`/sessions`, `/active-sessions`

### Pagination

Always paginate to retrieve all records. Check for:
- `page` / `per_page` / `limit` / `offset` query params
- `Link: <url>; rel="next"` response header
- `next_page`, `continuation_token`, `cursor`, `nextPageToken` in response body
- `X-MS-ContinuationToken` (Azure DevOps)
- `queryMore` pattern (Boomi)

Stop only when the response signals no more pages (empty next link, total reached, or empty result set).

### For SQL / Oracle / MSSQL / Postgres

Query these table categories (exact names determined by schema discovery):
- Users / accounts table
- Roles / groups table
- User-role assignment table
- Password policy table
- Session / activity log table (for last login)
- Privilege assignment table

Use parameterized queries only. Never concatenate user-controlled values into SQL.

### For LDAP

Search:
- User objects (`objectClass=person`, `objectClass=user`, `objectClass=inetOrgPerson`)
- Group objects (`objectClass=groupOfNames`, `objectClass=group`)
- Password policy objects (`objectClass=pwdPolicy`)

Retrieve all attributes in search (use `attributes=ldap3.ALL_ATTRIBUTES`).

---

## Probe Code Requirements

Every probe function must:

1. Accept credential values as parameters (never read env vars inside the probe function itself).
2. Return the raw response as-is — no extraction, no field filtering.
3. Handle HTTP errors gracefully: catch non-2xx, log status code (not response body verbatim), return `None`.
4. Include `timeout=30` on every HTTP call (client security standard: TLS-protected connections, #162).
5. Raise descriptive but sanitized exceptions — no credential values in error text (Client standard #182).
6. For paginated endpoints: loop until exhausted, collecting all pages before returning.
