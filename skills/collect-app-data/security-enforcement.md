# Security Enforcement

Enforces the client's security standards scoped to connection, testing, and data-collection activities.
Invoke this before writing any collector script. All checks are mandatory. No deferral.

---

## Credential Handling

Credentials come from a local `.env` file only, as defined in `credentials.md`.

- All auth values from `os.environ` — defaults must be empty strings.
- `.env` must be in `.gitignore` before any credential values are added.
- `.env` must never be committed or pushed to source control.
- No credential value (password, token, secret, API key, private key) may appear in any `print`, `log`, f-string, or exception message — even partially.
- OAuth tokens and session tokens held in memory only — never written to disk.
- Script exits with a clean, sanitized error if required vars are missing.

---

## Pre-Completion Checklist

Run all checks before declaring a script complete. Every item must pass.

### Credential Hygiene (Client standard #10, #5)
- [ ] No hardcoded credentials anywhere in the script
- [ ] All auth values from `os.environ` — defaults are empty strings
- [ ] Script exits with a sanitized error if required vars are missing
- [ ] No credential values in any `print`, `log`, f-string, or exception message
- [ ] `.env` confirmed in `.gitignore` before any vars were added

### Transport Security (Client standard #162, #165)
- [ ] Every HTTP/HTTPS request includes `timeout=30` (or lower)
- [ ] Base URL checked for `https://` at startup — exit if not
- [ ] TLS verification enabled (`verify=True`) — never `verify=False`
- [ ] No HTTP connection carries credentials or sensitive data

### Data Protection (Client standard #192)
- [ ] TLS for all data in transit
- [ ] No sensitive data in URLs or logs
- [ ] All output file patterns in `.gitignore` before the script is complete
- [ ] OAuth tokens / session tokens never written to disk
- [ ] Credential hashes or password history entries redacted before writing raw JSON

### Output File Safety (Client standard #192)
- [ ] Raw JSON files contain the complete API response — no fields dropped, no envelope stripped
- [ ] All account types present in all output files
- [ ] Password age threshold (180 days) consistently applied in analysis report
- [ ] `collected_at` is UTC in ISO 8601 format

### Access Control (Client standard #19)
- [ ] Script collects only the data it is authorized to collect
- [ ] Data collection stops when permissions are insufficient or authorization is unclear
- [ ] Read-only scope wherever the API or DB allows it

### Error Handling (Client standard #182)
- [ ] Exception handlers print sanitized messages — no raw API error body verbatim
- [ ] Auth failures logged with status code and URL only — never headers or body
- [ ] Script does not abort on optional endpoint failure — logs warning and continues
- [ ] Blockers are written to a blocker file (see below)

---

## Runtime Blocker Files

When `collect_users.py` encounters a connection failure, permission error, or data-collection
blocker, it must write a blocker file to the application folder automatically.

**Do not overwrite existing blocker files — create a new file each time.**

### Naming Convention
```
<AppFolder>/connection-blocker-YYYYMMDD-HHMMSS.md
<AppFolder>/data-collection-limitation-YYYYMMDD-HHMMSS.md
```

### Python Helper — Include in Every collect_users.py

```python
import os
from datetime import datetime, timezone

def write_blocker_file(
    app_folder: str,
    app_name: str,
    environment: str,
    endpoint: str,
    intended_data: str,
    auth_method: str,
    service_account: str,
    error_type: str,
    error_message: str,
    possible_access: list[str],
    alternatives: list[str],
    unknowns: list[str],
    next_steps: list[str],
) -> str:
    """Write a blocker file. Returns the file path written."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"connection-blocker-{ts}.md"
    path = os.path.join(app_folder, filename)

    lines = [
        "# Connection / Data Collection Blocker",
        "",
        f"**Date and Time:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC",
        f"**Application / Service:** {app_name}",
        f"**Environment:** {environment}",
        "",
        "## Target",
        f"- **Endpoint / URL / Table / Dataset:** {endpoint}",
        f"- **Intended Data to Collect:** {intended_data}",
        "",
        "## Authentication Used",
        f"- **Method:** {auth_method}",
        f"- **Service Account:** {service_account}",
        "",
        "## Blocker Details",
        f"- **Error Type:** {error_type}",
        f"- **Error Message (redacted):** {error_message}",
        "",
        "## Possible Required Access",
    ] + [f"- {a}" for a in possible_access] + [
        "",
        "## Alternative Approaches",
    ] + [f"- {a}" for a in alternatives] + [
        "",
        "## Assumptions and Unknowns",
    ] + [f"- {u}" for u in unknowns] + [
        "",
        "## Recommended Next Steps",
    ] + [f"{i+1}. {s}" for i, s in enumerate(next_steps)] + [
        "",
        "---",
        "**Credential Confirmation:** No credentials, tokens, secrets, passwords, private keys,",
        "or sensitive values were written to this file.",
    ]

    with open(path, "w") as f:
        f.write("\n".join(lines))

    print(f"Blocker file written: {path}")
    return path
```

### When to Call It

Call `write_blocker_file()` when:
- HTTP response is 401, 403, or 404 on an endpoint that should be accessible
- DB connection fails (ORA-12514, ORA-01031, timeout, etc.)
- An endpoint or table returns 0 results unexpectedly (document as a limitation)
- A required scope, role, or permission is missing
- Any access attempt is denied or unclear

Do not call it for: expected 404s on optional probed endpoints, pagination end-of-results, or
non-auth-related transient network errors (retry those first).

### Blocker File Required Fields

| Field | What to write |
|---|---|
| Endpoint / URL / Table | Path only — no credentials in URL |
| Auth Method | Method name only (OAuth2, Basic Auth, Bearer, DB user/pass) |
| Service Account | Account name only — no password, token, or secret |
| Error Message | Redact all secrets, tokens, and passwords |
| Possible Required Access | Scopes, roles, groups, grants, or IP allowlist entries |
| Alternative Approaches | Other endpoints, tables, queries, or data sources to try |
| Credential Confirmation | Must appear at the bottom of every file |

---

## Blocking Patterns

| Pattern detected | Standard | Action |
|---|---|---|
| Hardcoded credential, token, or API key | Client standard #10, #5 | BLOCK. Require env var from `.env`. |
| `verify=False` on any HTTPS call | Client standard #165 | BLOCK. Remove. Fix the cert root cause. |
| Missing `timeout=` on HTTP call | Client standard #162 | BLOCK. Add `timeout=30`. |
| Credential value in `print` or log | Client standard #52, #182 | BLOCK. Remove. |
| `SELECT` including credential column | Client standard #192 | BLOCK. Exclude credential columns explicitly. |
| Output file written without `.gitignore` check | Client standard #192 | BLOCK. Verify `.gitignore` first. |
| Token written to disk | Client standard #10, #192 | BLOCK. Memory only. |
| Raw 401/403 response body printed verbatim | Client standard #182 | BLOCK. Log status code only. |
| Data collection continuing after auth/permission denied | Client standard #19 | BLOCK. Write blocker file and stop. |
| `.env` committed or pushed to source control | Client standard #10, #5 | BLOCK. Remove from history. |

---

## Secure Code Patterns

### Credential Loading

```python
import os, sys

BASE_URL = os.environ.get("APP_BASE_URL", "")
CLIENT_ID = os.environ.get("APP_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("APP_CLIENT_SECRET", "")

missing = [k for k, v in {
    "APP_BASE_URL": BASE_URL,
    "APP_CLIENT_ID": CLIENT_ID,
    "APP_CLIENT_SECRET": CLIENT_SECRET,
}.items() if not v]
if missing:
    sys.exit(f"ERROR: Required environment variables not set: {', '.join(missing)}")

if not BASE_URL.startswith("https://"):
    sys.exit(f"ERROR: BASE_URL must use HTTPS. Got: {BASE_URL[:20]}...")
```

### HTTP Request

```python
import requests

resp = requests.get(
    url,
    headers={"Authorization": f"Bearer {token}"},  # token in memory only
    timeout=30,
    verify=True,  # never False
)
resp.raise_for_status()
```

### Sanitized Error Logging

```python
# SAFE — status code and URL only; never headers or response body
except requests.HTTPError as e:
    status = e.response.status_code
    url_safe = e.request.url.split("?")[0]
    print(f"WARNING: HTTP {status} on {url_safe}")
    if status in (401, 403):
        write_blocker_file(
            app_folder=APP_FOLDER,
            app_name=APP_NAME,
            environment="prod",
            endpoint=url_safe,
            intended_data="<describe what was being collected>",
            auth_method="OAuth2 client_credentials",
            service_account=os.environ.get("APP_CLIENT_ID", "unknown"),
            error_type=f"HTTP {status}",
            error_message=f"HTTP {status} — access denied (response body redacted)",
            possible_access=["<scope or role that may be needed>"],
            alternatives=["<alternative endpoint or approach>"],
            unknowns=["Whether the service account has been provisioned with the required scope"],
            next_steps=["Submit access request for <scope>", "Confirm service account is active"],
        )
```

### DB Connection with Blocker

```python
import oracledb

try:
    conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=dsn)
    print(f"Connected: host={HOSTNAME}, service={SERVICE}")
except oracledb.DatabaseError as e:
    err_msg = e.args[0].message if e.args else str(e)
    print(f"WARNING: DB connection failed — {err_msg} (host={HOSTNAME}, service={SERVICE})")
    write_blocker_file(
        app_folder=APP_FOLDER,
        app_name=APP_NAME,
        environment="prod",
        endpoint=f"{HOSTNAME}:{PORT}/{SERVICE}",
        intended_data="Oracle DB user and role data",
        auth_method="Oracle DB user/password",
        service_account=DB_USER,
        error_type="OracleDB connection error",
        error_message=err_msg,  # no credentials in err_msg
        possible_access=["SELECT on relevant schema tables", "Network access to DB host"],
        alternatives=["Try alternate service name or port"],
        unknowns=["Whether VPN is required", "Whether service is registered"],
        next_steps=["Confirm DB connectivity from this host", "Submit DB access request"],
    )
    raise SystemExit(1)
```

---

## Pushback — No Override

| User says | Response |
|---|---|
| "It's just a test / POC" | ITGC audit data is sensitive regardless of use. All rules apply. |
| "We can fix security later" | The fix takes the same effort now. Here is the secure version. |
| "The `.env` file is private" | `.env` files get committed accidentally. `.gitignore` is non-negotiable. |
| "I need to see the raw error" | Log internally with a sanitized message. Debug locally with your credentials. |
| "Just `verify=False` for now" | Certificate errors indicate a network or config problem. Fix the root cause. |
| "I don't have permission but let me try anyway" | Stop. Write a blocker file. Do not attempt unauthorized access. |

