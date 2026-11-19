# Output Files

## Required Output Types (All 6 — Every Script, Every Run)

| File | Description |
|---|---|
| `<app>_raw_<endpoint>.json` | One per attempted endpoint; full response as-is. If the call failed, write `{"error": "<status_code>", "endpoint": "<url>", "message": "<sanitized>"}` |
| `<app>_users_report.json` | Normalized standard schema (see `data-collection.md`) |
| `<app>_users_report.csv` | Standard columns: `app`, `user_id`, `username`, `status`, `roles`, `last_password_rotation`, `password_age_days`, `account_type` |
| `<app>_users_report_password_policy.csv` | Password policy flat CSV — one row per setting: `setting`, `value`. Document N/A settings here. |
| `<app>_accounts_normalized.csv` | Union of all probed fields; one row per account; all raw fields flattened; app-specific columns allowed |
| `<app>_accounts_analysis.txt` | Human-readable risk analysis report (see sections below) |

All output files are written to the app's own folder: `<AppName>/`.
All patterns must be covered by `.gitignore` before the script is considered complete.

---

## Analysis Report Sections (`<app>_accounts_analysis.txt`)

The report must contain all of the following sections. If data is unavailable for a
section, state "Not available via API — [reason]" rather than omitting the section.

### 1. Header
- App name
- Generated timestamp (UTC)
- Source file / collection method
- Total record count

### 2. What These Accounts Are
- Contextual description of the app's user model (1–3 sentences)
- Note whether the app has local accounts, federated/SSO accounts, or both

### 3. Account Type Breakdown
| Type | Count |
| Admin | N |
| Regular user | N |
| Service account | N |
| SSO-federated | N |
| Unknown | N |

### 4. Account Status Summary
- Total accounts
- Active / Inactive / Locked
- Never logged in (count)
- Have email address (count)

### 5. Authentication Method Breakdown
- Local authentication count
- SSO / federated count
- Unknown / unclassified count

### 6. MFA Adoption
- Enabled count
- Disabled count
- Unknown count
- Adoption rate % (if data available)
- If MFA data is not available: "Not available via API — [reason]"

### 7. Password Policy
- All settings with values
- For each unavailable setting: "N/A — not available via API"

### 8. Password Age Report (Threshold: 180 Days)
- Accounts with known password age: N
- Accounts with no password rotation record: N
- Accounts with password age > 180 days (all statuses): N
- Accounts with password age > 365 days (all statuses): N
- **Active accounts** with password age > 180 days: N
- **Active + have logged in + password > 180 days** (stale-active, highest risk): N

### 9. Active Accounts with Password > 180 Days
Table sorted by password age descending:
`username | password_age_days | last_login`

### 10. Active Accounts That Have Never Logged In
`username | password_age_days`

### 11. Locked Accounts
`username | lock_reason (if available)`

### 12. API Tokens / Service Accounts / OAuth Clients
- Count of each type collected
- Summary of scopes or roles if available
- If not collected: state why

### 13. Footer
- Pointer to normalized CSV: "Full account detail: `<app>_accounts_normalized.csv`"

---

## File Naming

| App name | File prefix |
|---|---|
| `Blackline` | `blackline_` |
| `Lodestar` with service tag | `lodestar_<SERVICE>_<HOST-FRAGMENT>_` |
| Any other | `<lowercase_app_name>_` |

Raw files: `<prefix>raw_<endpoint_slug>.json`
Example: `servicenow_raw_users.json`, `lodestar_raw_lsuser_LDSTPRD_lmeae1.json`

---

## .gitignore Patterns

Before creating any output file, verify these patterns are in `.gitignore`:

```
*_raw_*.json
*_users_report.json
*_users_report.csv
*_users_report_password_policy.csv
*_accounts_normalized.csv
*_accounts_analysis.txt
*_schema_report.txt
*_raw_schema_*.json
.env
```

If any pattern is missing, add it before writing files.
