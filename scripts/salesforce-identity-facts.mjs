#!/usr/bin/env node
// Cross-file facts for Salesforce identity / password controls, computed
// by code from the FULL exports: users joined to profiles, profile
// password policies and (optionally) login history. Per-file profiles
// (profile-data.mjs) can't answer "which ACTIVE accounts sit on a weak
// profile" or "how do accounts with expired passwords still sign in" --
// this does, so the readiness analysis gets exact numbers.
//
// Usage: node --max-old-space-size=6144 scripts/salesforce-identity-facts.mjs \
//          --user <User export> --profile <Profile export> \
//          [--policy <ProfilePasswordPolicy metadata>] [--org <PasswordPolicies>] [--login <LoginHistory>]
// Prints plain text to stdout.

import fs from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, a) => (v.startsWith("--") ? [...acc, [v.slice(2), a[i + 1]]] : acc), [])
);

const records = (file) => {
  if (!file) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return (Array.isArray(data) ? data : [data]).flatMap((p) => (Array.isArray(p?.records) ? p.records : []));
};
const n = (v) => v.toLocaleString("en-US");
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const day = (s) => (s ? String(s).slice(0, 10) : "-");
const list = (xs, max = 12) => (xs.length <= max ? xs.join(", ") : `${xs.slice(0, max).join(", ")} and ${xs.length - max} more`);

const users = records(args.user);
const profiles = records(args.profile);
const profileById = new Map(profiles.map((p) => [p.Id, p]));
const active = users.filter((u) => u.IsActive === true);
const sso = active.filter((u) => u.FederationIdentifier);
const local = active.filter((u) => !u.FederationIdentifier);
const asOf = active.map((u) => u.LastLoginDate).filter(Boolean).sort().at(-1) ?? new Date().toISOString();
const asOfDay = day(asOf);
const expired = (u) => u.PasswordExpirationDate && u.PasswordExpirationDate < asOf;
const profileName = (u) => profileById.get(u.ProfileId)?.Name ?? `(profile ${u.ProfileId} not in the profile export)`;

const out = [];
out.push(`### Salesforce identity facts (computed by code across the full User${args.policy ? ", Profile, ProfilePasswordPolicy" : " and Profile"}${args.login ? " and LoginHistory" : ""} exports; data as of ${asOfDay})`);
out.push(`Active accounts: ${n(active.length)} of ${n(users.length)}. With a FederationIdentifier (SSO): ${n(sso.length)}. Without (can rely on a Salesforce password): ${n(local.length)}.`);
out.push(`Note: User.LastPasswordChangeDate / PasswordExpirationDate are normally empty or irrelevant for SSO users -- ${n(sso.filter((u) => u.LastPasswordChangeDate).length)} SSO vs ${n(local.filter((u) => u.LastPasswordChangeDate).length)} local active accounts have a password-change date; ${n(sso.filter(expired).length)} SSO vs ${n(local.filter(expired).length)} local active accounts are past PasswordExpirationDate.`);

const byType = {};
for (const u of local) byType[u.UserType] = (byType[u.UserType] ?? 0) + 1;
out.push(`Local (non-SSO) active accounts by UserType: ${Object.entries(byType).map(([k, v]) => `${k} ${v}`).join(", ")}.`);

const flags = (p) =>
  [p?.PermissionsPasswordNeverExpires && "password never expires", p?.PermissionsApiUserOnly && "API only", p?.PermissionsIsSsoEnabled && "delegated SSO", p?.IsMustUseSso && "must use SSO"]
    .filter(Boolean)
    .join(", ");

if (local.length <= 60) {
  out.push("Local active accounts (profile | user type | flags | password changed | expires | last login):");
  for (const u of local) {
    out.push(`- ${profileName(u)} | ${u.UserType} | ${flags(profileById.get(u.ProfileId)) || "-"} | ${day(u.LastPasswordChangeDate)} | ${day(u.PasswordExpirationDate)}${expired(u) ? " (EXPIRED)" : ""} | ${day(u.LastLoginDate)}`);
  }
}

if (profiles.length) {
  const flagged = profiles.filter((p) => p.PermissionsPasswordNeverExpires || p.PermissionsApiUserOnly);
  out.push(`Profiles with 'Password Never Expires' or 'API Only' (active / local accounts):`);
  for (const p of flagged) {
    const a = active.filter((u) => u.ProfileId === p.Id);
    out.push(`- ${p.Name}: ${flags(p)} -- ${a.length} active, ${a.filter((u) => !u.FederationIdentifier).length} local`);
  }
  out.push(`Profiles with 'must use SSO' (IsMustUseSso): ${profiles.filter((p) => p.IsMustUseSso).length} of ${profiles.length}.`);
}

if (args.policy) {
  const raw = JSON.parse(fs.readFileSync(args.policy, "utf8"));
  const leaf = (x, t) => (new RegExp(`<${t}>([^<]*)</${t}>`).exec(x) ?? [])[1];
  const org = records(args.org)[0] ?? {};
  const orgLen = Number(org.MinimumPasswordLength) || 12;
  const policies = Object.entries(raw)
    .filter(([, x]) => typeof x === "string")
    .map(([key, x]) => ({
      name: leaf(x, "profile") || key.split("_profilePasswordPolicy")[0].replace(/_/g, " "),
      len: Number(leaf(x, "minimumPasswordLength")),
      exp: Number(leaf(x, "passwordExpiration")),
      complexity: Number(leaf(x, "passwordComplexity")),
      attempts: Number(leaf(x, "maxLoginAttempts")),
      history: Number(leaf(x, "passwordHistory")),
    }));
  // Below the org-wide policy on any of these is "weaker".
  const weaker = policies.filter((p) => p.len < orgLen || p.complexity < 2 || p.attempts > 3 || p.history < 5 || p.exp > 90);
  out.push(`Profile password policies: ${policies.length}; differing from the org-wide standard on length/complexity/attempts/history/expiry: ${weaker.length}. (complexity codes: 0 none, 1 letters+numbers, 2 +special characters, 3 upper/lower/numbers, 4 upper/lower/numbers/special)`);
  for (const p of weaker) {
    const a = active.filter((u) => norm(profileById.get(u.ProfileId)?.Name) === norm(p.name));
    const prof = profiles.find((x) => norm(x.Name) === norm(p.name));
    out.push(`- ${p.name}: length ${p.len}, expiry ${p.exp}d, complexity ${p.complexity}, attempts ${p.attempts}, history ${p.history}${prof ? `; profile flags: ${flags(prof) || "none"}` : ""} -- ${a.length} active (${a.filter((u) => !u.FederationIdentifier).length} local)`);
  }
}

if (args.login) {
  const logins = records(args.login);
  const times = logins.map((l) => l.LoginTime).filter(Boolean).sort();
  out.push(`LoginHistory export: ${n(logins.length)} rows covering ${times[0] ?? "?"} -> ${times.at(-1) ?? "?"}${[1000, 2000, 5000, 10000, 20000, 50000].includes(logins.length) ? " (exactly a round number -- probably capped by a query LIMIT, so a sample)" : ""}.`);
  const localById = new Map(local.map((u) => [u.Id, u]));
  const agg = new Map();
  for (const l of logins) {
    const u = localById.get(l.UserId);
    if (!u) continue;
    const key = `${profileName(u)}${expired(u) ? " (password expired)" : ""} | ${l.LoginType} | ${l.Status}`;
    agg.set(key, (agg.get(key) ?? 0) + 1);
  }
  if (agg.size) {
    out.push("Local accounts' sign-ins in that window (profile | login type | status: count). 'Remote Access 2.0' = OAuth token, 'Other Apex API' = API login with username/password:");
    for (const [k, v] of [...agg.entries()].sort()) out.push(`- ${k}: ${n(v)}`);
  }
}

process.stdout.write(out.join("\n"));
