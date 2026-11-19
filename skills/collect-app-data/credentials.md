# Credential Resolution

## Priority Order

1. **`.env` file** — read first. If all required vars for the app are present and non-empty, confirm with user and use them.
2. **User-provided** — if no credentials are found, prompt the user to supply credentials when running the `collect_users.py` script.

**Never guess, invent, or hardcode credential values.**

Do not use the same credentials for two different applications or projects unless the user explicitly approves.

---

## .env Handling

- Confirm `.env` is in `.gitignore` before adding any new vars.
- The `.env` file must never be committed or pushed to source control.
- Add new app vars as placeholders only — empty string values:
  ```
  APP_CLIENT_ID=
  APP_CLIENT_SECRET=
  APP_BASE_URL=
  ```
- Credentials filled in by the user manually; never populated by the skill.

---

## Auth Pattern by Platform

| Platform | Auth method | Where credentials live |
|---|---|---|
| REST + OAuth2 client_credentials | POST to token endpoint; bearer in header | `.env` |
| REST + Basic Auth | Base64 username:password in header | `.env` |
| REST + API Key | Header or query param | `.env` |
| REST + Bearer (pre-issued) | Bearer token in header | `.env` |
| Oracle DB | `oracledb` thin mode; user/pass | `.env` |
| MSSQL | `pymssql` with NTLM or SQL auth | `.env` |
| LDAP | `ldap3` SIMPLE or NTLM bind | `.env` |
| Microsoft Graph | MSAL `ConfidentialClientApplication` + client_credentials | `.env` |
| SAP RFC | `pyrfc`; user/pass or SNC | `.env` |
| File drop | No auth; path to local file | `os.environ` var for path |

---

## Security Rules (Client standard #10, #5, #192)

- All auth values sourced from `os.environ` only. Defaults are empty strings.
- Script exits with a clean, sanitized error if required vars are missing.
- No credential value appears in any `print`, `log`, f-string, or exception message — even partially.
- OAuth tokens held in memory only. Never written to disk.
- HTTPS enforced. Warn at startup if base URL is not `https://`.
- Timeout on every HTTP request (minimum `timeout=30`).
- Do not use the same credentials for two different applications or projects unless user explicitly approves.
