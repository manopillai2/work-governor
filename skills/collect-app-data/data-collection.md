# Data Collection Rules

## Non-Negotiable Field Rules (CLAUDE.md)

1. **No filtering of raw API responses.** Raw JSON files must contain the complete
   API response — do not extract only the records array, drop envelope metadata, or
   omit any fields.

2. **All account types in all output files.** Include regular, admin, service,
   federated, locked, inactive, and any other account category returned by the API.
   No type may be silently excluded.

3. **No silent field drops.** Do not filter by prefix, type, or any other criterion.
   If a field is unavailable for a given account type, write an empty string — do not
   skip the column.

4. **Document limitations, never hide them.** If an API does not expose a field,
   document it in `notes` with reason. Use `null` or empty string as the value.

---

## Standard Normalized Schema

### Step 1 — Raw collection

Save all API/DB responses exactly as received. No extraction, no reshaping, no field drops.
Raw files: `<app>_raw_<endpoint>.json` — one per endpoint, full native schema.

### Step 2 — Normalization

Produce `<app>_users_report.json` by mapping raw fields to the CLAUDE.md standard schema as closely as possible:

```json
{
  "collected_at": "<ISO 8601 UTC>",
  "app": "<app name>",
  "account_id": "<tenant or account identifier>",
  "auth_method": "local | sso | hybrid",
  "local_accounts": [ ... ],
  "roles": [],
  "password_policy": {},
  "account_status_summary": {},
  "sso_config": {},
  "notes": { "<field>": "Not available via API — <reason>" }
}
```

**Normalization rules:**
- Map raw fields to standard schema fields where a clear equivalent exists.
- Fields with no standard equivalent: include them as-is under the nearest parent object (e.g., inside the account record or at the top level).
- Never drop a field because it doesn't fit the schema. If it can't be normalized, keep it.
- `local_accounts` and `roles` are always arrays, even if empty.
- `collected_at` is always UTC in ISO 8601 format.
- Document every unmapped or partially mapped field in `notes`.

---

## Per-Record Field Probing

For each account/user record, attempt to map these fields (empty string if absent):

**Identity and type**
`user_id`, `username`, `email`, `display_name`,
`userType`, `accountType`, `type`,
`isAdmin`, `isSuperAdmin`, `isServiceAccount`,
`department`, `title`, `manager`, `phone`

**Authentication and MFA**
`mfaEnabled`, `mfaMethod`, `mfaEnrolled`,
`authProvider`, `ssoEnabled`, `federatedId`, `externalId`, `source`

**Activity and access**
`lastLogin`, `lastLoginDate`, `loginCount`, `failedLoginAttempts`,
`isLocked`, `lockedUntil`, `lockedReason`

**Password**
`passwordNeverExpires`, `passwordExpires`, `passwordExpiresAt`,
`mustChangePassword`, `last_password_rotation`, `password_age_days`

**Lifecycle**
`createdAt`, `createdBy`, `updatedAt`, `deactivatedAt`, `status`

If a field is present in some records but not others, write empty string for records where it is absent — never drop the column from the CSV.

---

## Account Type Classification

Every account must be classified. Use this precedence:

1. App-native type field (e.g., `identity_type`, `userType`, `accountType`, `origin`)
2. Role membership (e.g., admin roles, service account role names)
3. Username pattern (e.g., `svc_`, `app_`, bot email domains)
4. Default to `"unknown"` — never leave blank

Classification is written to `account_type` in normalized CSV.

---

## Password Age Calculation

```python
from datetime import datetime, timezone

def password_age_days(last_rotation_iso: str | None) -> int | None:
    if not last_rotation_iso:
        return None
    dt = datetime.fromisoformat(last_rotation_iso.replace("Z", "+00:00"))
    return (datetime.now(timezone.utc) - dt).days
```

Flag threshold: **180 days** for analysis report and CSV annotation.

---

## Roles Collection

For each app, collect the full roles/groups list:
- Role ID, role name, description
- Whether the role is privileged/admin
- Member count if available

Map role names to each account's `roles[]` array. For DB sources, join through the
user-role assignment table using parameterized queries.

---

## Password Policy Collection

Collect all available password policy settings:
- Minimum/maximum length
- Complexity requirements
- History depth (no-reuse count)
- Lockout threshold and duration
- Expiry / rotation period
- MFA requirement
- Account suspension rules

Write each setting as a flat key-value pair in `<app>_users_report_password_policy.csv`.
If the API does not expose a policy, document every missing setting in `notes`.
