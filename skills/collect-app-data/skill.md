---
name: collect-app-data
description: Use when user wants to collect identity/access/password data from an enterprise app. Triggers on: "/collect-app-data", "I need to collect data from [App]", "add [App] to the collectors", "build a collector for [App]", "get user data from [App]", "set up [App] collection".
---

# collect-app-data Skill

Guides building a complete, secure identity and access data collector for any enterprise app.
Follows all project conventions from CLAUDE.md. Produces exhaustive, unfiltered audit data.

## Sub-documents

Read these before working in each area:

- [credentials.md](credentials.md) — credential resolution, auth patterns, `.env` handling
- [probing.md](probing.md) — probe authoring from scratch, platform classifiers, authoring path
- [data-collection.md](data-collection.md) — field rules, account types, per-record probing
- [output-files.md](output-files.md) — 6 output types, analysis report, file naming
- [security-enforcement.md](security-enforcement.md) — pre-completion checklist, blocking patterns, blocker file behavior, secure code patterns

---

## Skill Flow

Ask questions one at a time. Only ask when information cannot be derived automatically.

### Step 1 — Confirm inputs

Before writing any code, confirm all of the following:

| Input | Required | Notes |
|---|---|---|
| App name | Yes | PascalCase — becomes folder name |
| Platform classifier | Yes | REST / SQL / LDAP / SAP / Graph / file drop / other |
| Endpoint URI | Yes | API base URL, `host:port`, or LDAP URL — never guess |
| Credential location | Yes | `.env` var names — confirm they exist, do not print values |

If the app folder already exists, read `<AppName>/app-notes.md` for env vars, endpoints, known limitations, and output file names before proceeding. If the file does not exist, it will be created in Step 6.

If any input is still missing after reading app-notes: ask for it before proceeding.

### Step 2 — Resolve credentials

See `credentials.md`. Confirm all required env vars are set and non-empty before proceeding.

### Step 3 — Author probes

See `probing.md`.
- Classify the platform.
- Follow the authoring path (model knowledge → context7 → vendor docs → user example).
- No templates. Every probe authored from scratch.
- Probe all endpoint categories exhaustively.

### Step 4 — Build collector

See `data-collection.md` and `output-files.md`.
- All 6 output types in a single run.
- No field filtering. No account type exclusions. No silent omissions.
- Full pagination on all list endpoints.
- Include the `write_blocker_file()` helper from `security-enforcement.md` — call it at every
  connection failure, auth denial, or missing-permission event.

### Step 5 — Security enforcement

See `security-enforcement.md`.
- Run the full pre-completion checklist before declaring the script done.
- Block on any violation — no exceptions, no deferral to "fix later".
- Verify all blocker file call sites are wired in before marking complete.

### Step 6 — Update project files

| File | Action |
|---|---|
| `<AppName>/collect_users.py` | Create new script |
| `<AppName>/app-notes.md` | Create (or update) — env vars, endpoints, limitations, output files, scripts |
| `.env` | Add new app's env var placeholders (no real values) |
| `.gitignore` | Add all new output file patterns if not already covered |

---

## Out of Scope

- Running / testing the collector against live credentials
- Parsing proprietary binary formats
- Building UI or dashboards on collected data
- Cross-app correlation or deduplication of accounts
