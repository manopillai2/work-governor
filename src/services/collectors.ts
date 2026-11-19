// Shared (UI + server) definitions for data collection: connection
// presets per auth method, environment-variable naming, and the shapes
// the API returns. Secrets never appear in these shapes -- a secret
// variable only reports whether a value is saved.

export type ConnectionVariable = {
  name: string; // environment variable name the script reads, e.g. SALESFORCE_CXT_PROD_CLIENT_ID
  secret: boolean;
  value: string; // non-secret: the value; secret: "" (never sent to the browser)
  hasValue?: boolean; // secret only: a value is saved
  previousName?: string; // when renamed in the form: carry the saved value over
};

export type AppConnection = {
  id: string;
  applicationId: string;
  label: string;
  environment: string;
  platform: string;
  authMethod: string;
  variables: ConnectionVariable[];
  updatedAt: string;
};

export type SecurityReport = {
  passed: boolean;
  blockers: string[];
  warnings: string[];
};

export type CollectorScript = {
  id: string;
  applicationId: string;
  connectionId: string | null;
  version: number;
  code: string;
  appNotes: string;
  requirements: string[];
  instruction: string;
  changeSummary: string;
  questions: string[];
  source: "generated" | "imported";
  status: "draft" | "approved" | "rejected" | "needs_input";
  securityReport: SecurityReport;
  createdAt: string;
  reviewedAt: string | null;
};

export type CollectorRun = {
  id: string;
  applicationId: string;
  scriptId: string;
  scriptVersion?: number;
  controlName: string;
  status: "running" | "succeeded" | "failed" | "blocked";
  exitCode: number | null;
  log: string;
  outputFiles: Array<{ name: string; bytes: number }>;
  blockers: Array<{ name: string; text: string }>;
  evidenceIds: string[];
  startedAt: string;
  finishedAt: string | null;
};

export const PLATFORMS = ["REST", "SQL", "LDAP", "Graph", "SAP", "File drop", "Other"] as const;

export type AuthPreset = {
  key: string;
  label: string;
  platform: (typeof PLATFORMS)[number];
  variables: Array<{ suffix: string; secret: boolean; hint: string }>;
};

export const AUTH_PRESETS: AuthPreset[] = [
  {
    key: "oauth2_client_credentials",
    label: "OAuth2 client credentials (URL, client ID, client secret)",
    platform: "REST",
    variables: [
      { suffix: "BASE_URL", secret: false, hint: "https://… API base URL" },
      { suffix: "TOKEN_URL", secret: false, hint: "https://… token endpoint" },
      { suffix: "CLIENT_ID", secret: false, hint: "Client / consumer ID" },
      { suffix: "CLIENT_SECRET", secret: true, hint: "Client secret" },
    ],
  },
  {
    key: "basic",
    label: "Username & password (Basic auth)",
    platform: "REST",
    variables: [
      { suffix: "BASE_URL", secret: false, hint: "https://… API base URL" },
      { suffix: "USERNAME", secret: false, hint: "Service account username" },
      { suffix: "PASSWORD", secret: true, hint: "Service account password" },
    ],
  },
  {
    key: "api_key",
    label: "API key",
    platform: "REST",
    variables: [
      { suffix: "BASE_URL", secret: false, hint: "https://… API base URL" },
      { suffix: "API_KEY", secret: true, hint: "API key" },
    ],
  },
  {
    key: "bearer",
    label: "Pre-issued bearer token",
    platform: "REST",
    variables: [
      { suffix: "BASE_URL", secret: false, hint: "https://… API base URL" },
      { suffix: "TOKEN", secret: true, hint: "Bearer token" },
    ],
  },
  {
    key: "database",
    label: "Database (host, port, database / service, user, password)",
    platform: "SQL",
    variables: [
      { suffix: "DB_HOST", secret: false, hint: "Host name" },
      { suffix: "DB_PORT", secret: false, hint: "Port" },
      { suffix: "DB_NAME", secret: false, hint: "Database or service name" },
      { suffix: "DB_USER", secret: false, hint: "Database user" },
      { suffix: "DB_PASSWORD", secret: true, hint: "Database password" },
    ],
  },
  {
    key: "ldap",
    label: "LDAP bind",
    platform: "LDAP",
    variables: [
      { suffix: "LDAP_URL", secret: false, hint: "ldaps://host:636" },
      { suffix: "BASE_DN", secret: false, hint: "Search base DN" },
      { suffix: "BIND_USER", secret: false, hint: "Bind user / DN" },
      { suffix: "BIND_PASSWORD", secret: true, hint: "Bind password" },
    ],
  },
  {
    key: "graph",
    label: "Microsoft Graph (tenant, client ID, client secret)",
    platform: "Graph",
    variables: [
      { suffix: "TENANT_ID", secret: false, hint: "Tenant ID" },
      { suffix: "CLIENT_ID", secret: false, hint: "App (client) ID" },
      { suffix: "CLIENT_SECRET", secret: true, hint: "Client secret" },
    ],
  },
  { key: "custom", label: "Custom (add your own variables)", platform: "Other", variables: [] },
];

// "Salesforce - CXT" + "Prod" -> "SALESFORCE_CXT_PROD"
export function envPrefix(applicationName: string, environment: string): string {
  return `${applicationName} ${environment}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;

// Runtime settings the app (or the machine) provides -- not connection values.
const RUNTIME_VARS = new Set(["OUTPUT_DIR", "REQUESTS_CA_BUNDLE", "SSL_CERT_FILE", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "TZ", "HOME", "PATH"]);

// Environment variables a collector script reads, and whether each has a
// default in the script (optional) -- e.g. os.environ.get("X", "") or "10000".
export function scriptEnvVars(code: string): Array<{ name: string; optional: boolean }> {
  const out = new Map<string, boolean>();
  const re = /(?:os\.environ\.get|os\.getenv|environ\.get|getenv)\(\s*["']([A-Z][A-Z0-9_]*)["']\s*(?:,\s*(["'][^"']*["']|[^)]*))?\)(\s*or\s+[^\n]+)?|os\.environ\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g;
  for (const m of code.matchAll(re)) {
    const name = m[1] ?? m[4];
    if (!name || RUNTIME_VARS.has(name)) continue;
    const def = (m[2] ?? "").trim();
    const hasDefault = Boolean(m[3]) || (def !== "" && def !== '""' && def !== "''" && def !== "None");
    out.set(name, (out.get(name) ?? true) && hasDefault);
  }
  return [...out.entries()].map(([name, optional]) => ({ name, optional }));
}

// The variable-name tail used to match a connection value to a script
// variable with a different prefix: SALESFORCE_CXT_DEV_CLIENT_SECRET and
// SF_CXT_DEV_CLIENT_SECRET both end in CLIENT_SECRET.
export function matchByTail(wanted: string, available: string[]): string | undefined {
  const parts = wanted.split("_");
  for (const n of [3, 2, 1]) {
    if (parts.length <= n) continue;
    // A one-word tail only when it's distinctive (PASSWORD, USERNAME…), not ID/URL.
    if (n === 1 && parts[parts.length - 1].length < 6) continue;
    const tail = `_${parts.slice(-n).join("_")}`;
    const hit = available.filter((a) => a.endsWith(tail));
    if (hit.length === 1) return hit[0];
  }
  return undefined;
}
