// Server-only. Automatic security gate for collector scripts, applied to
// every generated or imported version before it can be approved -- the
// mechanical part of the collect-app-data skill's security-enforcement
// checklist plus Work Governor's runtime contract (unattended, read-only,
// outputs to OUTPUT_DIR, credentials only from the environment).
// Blockers stop approval; warnings are shown to the reviewer.

import type { SecurityReport } from "./collectors";

// Strip comments and docstrings (a triple-quoted string standing alone
// as a statement) so documentation text doesn't trip -- or satisfy --
// the checks. Triple-quoted strings that are assigned (e.g. a SQL query)
// are kept.
function codeOnly(code: string): string {
  return code
    .replace(/\r\n?/g, "\n") // Windows line endings
    .replace(/^[ \t]*[rRbBuU]?("""|\'\'\')[\s\S]*?\1[ \t]*$/gm, "")
    .split("\n")
    .map((line) => line.replace(/(^|\s)#.*$/, ""))
    .join("\n");
}

// The call expression starting at `start` (balanced parentheses).
function callAt(code: string, start: number): string {
  const open = code.indexOf("(", start);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < code.length && i < open + 4000; i++) {
    if (code[i] === "(") depth++;
    else if (code[i] === ")" && --depth === 0) return code.slice(start, i + 1);
  }
  return code.slice(start, open + 4000);
}

export function checkCollectorScript(
  rawCode: string,
  opts: { envVarNames: string[]; secretValues: string[] }
): SecurityReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const code = codeOnly(rawCode);

  if (!rawCode.trim()) return { passed: false, blockers: ["The script is empty."], warnings };

  // Credential hygiene
  for (const value of opts.secretValues) {
    if (value.length >= 4 && rawCode.includes(value)) {
      blockers.push("A saved secret value appears literally in the script. Credentials must come only from environment variables.");
      break;
    }
  }
  // A variable NAMED like a credential (ends in password/secret/token/
  // key) assigned a literal that looks like one -- not an enum label like
  // "AUDIT_DERIVED" or a sentence.
  const hardcoded = /\b\w*(password|passwd|secret|token|api_?key|apikey)\s*=\s*["']([^"'\s]{6,})["']/gi;
  for (const m of code.matchAll(hardcoded)) {
    const value = m[2];
    if (/^[A-Z0-9_]+$/.test(value) || /^(changeme|placeholder|your[_-]|<.*>$|xxx)/i.test(value)) continue;
    if (!/environ|getenv/i.test(m[0])) {
      blockers.push(`Looks like a hard-coded credential: \`${m[0].slice(0, 60)}…\``);
      break;
    }
  }
  if (/print\([^)]*os\.environ\b(?!\.get\(\s*["']OUTPUT_DIR)/.test(code) || /print\(\s*os\.environ\s*\)/.test(code)) {
    blockers.push("Prints environment variables — could expose credentials.");
  }
  if (/\b(load_dotenv|dotenv_values)\s*\(/.test(code)) {
    warnings.push("Reads a .env file. Work Governor passes credentials as environment variables; any .env next to the script is not used.");
  }
  if (/\binput\s*\(|getpass\s*\(/.test(code)) {
    blockers.push("Prompts for input (input()/getpass()). Collector runs are unattended — missing values must end the run with a clean message.");
  }
  const referenced = opts.envVarNames.filter((n) => code.includes(n));
  const missing = opts.envVarNames.filter((n) => !code.includes(n));
  if (opts.envVarNames.length && referenced.length === 0) {
    warnings.push(`Doesn't read any of this connection's variables (${opts.envVarNames.join(", ")}).`);
  } else if (missing.length) {
    warnings.push(`Doesn't read these connection variables: ${missing.join(", ")}.`);
  }

  // Transport security
  if (/verify\s*=\s*False|CERT_NONE|_create_unverified_context|check_hostname\s*=\s*False/.test(code)) {
    blockers.push("TLS verification is turned off (verify=False / CERT_NONE). It must stay on.");
  }
  const callRe = /\b(requests|httpx|session|sess|client|http|self\.session|self\.client|self\.http)\.(get|post|put|patch|delete|request|head)\s*\(/g;
  let untimed = 0;
  for (const m of code.matchAll(callRe)) {
    const call = callAt(code, m.index ?? 0);
    // dict-style lookups like client.get("name") are not requests
    if (/\.get\s*\(\s*["'][\w.-]*["']\s*(,[^()]*)?\)$/.test(call)) continue;
    if (!/timeout\s*=/.test(call)) untimed++;
  }
  const clientWithTimeout = /(httpx\.(Client|AsyncClient)|requests\.Session)\s*\([^)]*timeout\s*=/.test(code) || /\.timeout\s*=/.test(code);
  if (untimed > 0 && !clientWithTimeout) {
    blockers.push(`${untimed} HTTP call(s) without a timeout. Every request needs timeout=30 or less.`);
  }
  if (/["']http:\/\//.test(code) && !/startswith\(\s*["']https:\/\//.test(code)) {
    warnings.push("Contains an http:// URL and no https:// check at startup.");
  }

  // Read-only scope
  const writes = [...code.matchAll(/\.(put|patch|delete)\s*\(/g)].length;
  if (writes) blockers.push(`Uses HTTP PUT/PATCH/DELETE (${writes}×). Collectors must be read-only.`);
  for (const m of code.matchAll(/\.post\s*\(/g)) {
    const around = code.slice(Math.max(0, (m.index ?? 0) - 300), (m.index ?? 0) + 300);
    if (!/token|oauth|auth|login|query|search|graphql|soql|ldap|bind|session/i.test(around)) {
      warnings.push("Uses an HTTP POST that doesn't look like authentication or a query — check it only reads data.");
      break;
    }
  }
  // Real statement shapes only, so English text ("request a grant and…")
  // doesn't count.
  if (/["'][^"']*\b(INSERT\s+INTO\s+[\w."\[]+|UPDATE\s+[\w."\[\]]+\s+SET\s+\w+\s*=|DELETE\s+FROM\s+[\w."\[]+|DROP\s+(TABLE|USER|INDEX|VIEW|SCHEMA)\s+\w+|ALTER\s+(TABLE|USER)\s+\w+|TRUNCATE\s+TABLE\s+\w+|GRANT\s+[\w ,]+\s+(ON|TO)\s+\w+|REVOKE\s+[\w ,]+\s+(ON|FROM)\s+\w+|MERGE\s+INTO\s+\w+)/i.test(code)) {
    blockers.push("Contains a SQL statement that changes data (INSERT/UPDATE/DELETE/DROP/ALTER/GRANT…). Collectors must be read-only.");
  }

  // Runtime safety
  if (/\b(subprocess|os\.system|os\.popen|pty\.spawn)\b/.test(code)) blockers.push("Runs shell commands (subprocess / os.system). Not allowed in a collector.");
  if (/\b(eval|exec)\s*\(/.test(code)) blockers.push("Uses eval()/exec(). Not allowed in a collector.");
  if (/shutil\.rmtree|os\.remove\(|os\.unlink\(/.test(code)) warnings.push("Deletes files — make sure it only touches its own OUTPUT_DIR.");
  if (!code.includes("OUTPUT_DIR")) {
    warnings.push("Doesn't use OUTPUT_DIR. The script runs from its own run folder, so files written next to it are collected; files written anywhere else are not.");
  }

  // Skill requirements
  if (!/def\s+write_blocker_file\s*\(/.test(code)) blockers.push("Missing the write_blocker_file() helper required by the collect-app-data skill.");
  if (!/collected_at/.test(code)) warnings.push("No collected_at timestamp found (the skill requires UTC ISO 8601 collected_at).");

  return { passed: blockers.length === 0, blockers: [...new Set(blockers)], warnings: [...new Set(warnings)] };
}

// Third-party imports a script needs (best effort), for pip install.
const STDLIB = new Set(
  "abc argparse array ast asyncio base64 binascii bisect calendar collections concurrent configparser contextlib copy csv dataclasses datetime decimal enum errno fnmatch functools getpass glob gzip hashlib heapq hmac html http io ipaddress itertools json logging math mimetypes operator os pathlib pickle platform pprint queue random re secrets shutil signal socket ssl statistics string struct sys tempfile textwrap threading time traceback typing unicodedata urllib uuid warnings xml zipfile zoneinfo __future__".split(" ")
);
const PIP_NAME: Record<string, string> = { jwt: "PyJWT", yaml: "PyYAML", dateutil: "python-dateutil", ldap3: "ldap3", msal: "msal", pyrfc: "pyrfc", pymssql: "pymssql", oracledb: "oracledb", httpx: "httpx", requests: "requests", openpyxl: "openpyxl", dotenv: "python-dotenv", hdbcli: "hdbcli", psycopg2: "psycopg2-binary", pyodbc: "pyodbc", zeep: "zeep" };

export function detectRequirements(code: string): string[] {
  const mods = new Set<string>();
  for (const m of codeOnly(code).matchAll(/^\s*(?:import|from)\s+([A-Za-z_][\w]*)/gm)) mods.add(m[1]);
  return [...mods].filter((m) => !STDLIB.has(m)).map((m) => PIP_NAME[m] ?? m).sort();
}
