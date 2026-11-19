#!/usr/bin/env node
// Deterministic profile of one testing-data file: record counts, export
// completeness, and per-field value distributions -- computed by code
// from the FULL original file, so these numbers are facts the readiness
// analysis can rely on (the assistant only ever sees a truncated text
// excerpt of large files).
//
// Run as a separate process (see src/services/dataProfile.ts) so a
// several-hundred-MB export can't exhaust the dev server's memory.
//
// Usage: node --max-old-space-size=6144 scripts/profile-data.mjs <file> [displayName]
// Prints one JSON object to stdout.

import fs from "node:fs";
import path from "node:path";

const MAX_FIELDS_TRACKED = 600;
const MAX_FIELDS_SHOWN = 70;
const OUTLIER_MAX = 12;
const TOP_VALUES = 8;
const LOW_CARDINALITY = 40;
const DISTINCT_CAP = 5000;
const VALUE_CHARS = 80;
const TEXT_EXCERPT_CHARS = 6000;

const file = process.argv[2];
const displayName = process.argv[3] || path.basename(file);
const ext = path.extname(displayName).toLowerCase().slice(1);

function clip(v) {
  const s = String(v);
  return s.length > VALUE_CHARS ? `${s.slice(0, VALUE_CHARS)}…` : s;
}

// ---------- record extraction ----------

// Salesforce REST/Tooling query result pages: { totalSize, done, records }.
function isQueryPage(v) {
  return v && typeof v === "object" && !Array.isArray(v) && Array.isArray(v.records);
}

function looksLikeXml(s) {
  return typeof s === "string" && s.trimStart().startsWith("<");
}

// Leaf tags of a simple metadata XML document -> flat object. Repeated
// tags become "a; b".
function xmlLeaves(xml) {
  const out = {};
  const re = /<([A-Za-z_][\w.-]*)>([^<]*)<\/\1>/g;
  let m;
  while ((m = re.exec(xml))) {
    const key = m[1];
    const value = m[2].trim();
    out[key] = key in out ? `${out[key]}; ${value}` : value;
  }
  return out;
}

function flatten(obj, prefix = "", out = {}, depth = 0) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (k === "attributes") continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v) && depth < 2) {
      if (isQueryPage(v)) {
        out[`${key}.totalSize`] = v.totalSize ?? v.records.length;
      } else {
        flatten(v, key, out, depth + 1);
      }
    } else if (Array.isArray(v)) {
      out[key] = v.length === 0 ? "" : v.every((x) => typeof x !== "object") ? v.join("; ") : `[${v.length} items]`;
    } else {
      out[key] = v;
    }
  }
  return out;
}

function extractJson(data) {
  const notes = [];
  let records = [];
  let recordType = null;
  let reportedTotal = null;
  let complete = null;

  const pages = Array.isArray(data) && data.length > 0 && data.every(isQueryPage) ? data : isQueryPage(data) ? [data] : null;

  if (pages) {
    for (const p of pages) records.push(...p.records);
    reportedTotal = pages[0].totalSize ?? null;
    const last = pages[pages.length - 1];
    const moreAvailable = last.done === false || Boolean(last.nextRecordsUrl);
    complete = reportedTotal !== null ? records.length >= reportedTotal && !moreAvailable : !moreAvailable;
    if (!complete) {
      notes.push(
        `INCOMPLETE EXPORT: ${records.length.toLocaleString()} records fetched${reportedTotal !== null ? ` of ${reportedTotal.toLocaleString()} reported by the source` : ""}${moreAvailable ? " -- the last page says more records are available (pagination not finished)" : ""}.`
      );
    }
    recordType = records[0]?.attributes?.type ?? pages[0].entityTypeName ?? null;
    // "Complete" only relative to the query: an exactly round count
    // usually means the query itself had a LIMIT.
    if (complete && [1000, 2000, 5000, 10000, 20000, 50000, 100000].includes(records.length)) {
      notes.push(
        `LIKELY CAPPED: exactly ${records.length.toLocaleString()} records -- the query probably had a LIMIT, so this is a sample, not the full population. Check the date range below and re-pull without the cap.`
      );
    }
  } else if (Array.isArray(data)) {
    records = data.filter((r) => r && typeof r === "object");
    recordType = records[0]?.attributes?.type ?? null;
  } else if (data && typeof data === "object") {
    const values = Object.values(data);
    if (values.length > 0 && values.every(looksLikeXml)) {
      // Metadata API retrieve: { "<member>.<type>": "<xml>" }
      records = Object.entries(data).map(([name, xml]) => ({ _member: name, ...xmlLeaves(xml) }));
      const m = /<([A-Za-z]+)\s+xmlns=/.exec(values[0]);
      recordType = m ? `${m[1]} (metadata)` : "metadata";
    } else {
      const arrays = Object.entries(data).filter(([, v]) => Array.isArray(v) && v.some((x) => x && typeof x === "object"));
      if (arrays.length === 1) {
        records = arrays[0][1];
        recordType = arrays[0][0];
      } else {
        records = [data];
        recordType = "single object";
      }
    }
  }

  return { records: records.map((r) => flatten(r)), recordType, reportedTotal, complete, notes };
}

// Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const [header = [], ...body] = rows.filter((r) => r.some((x) => x !== ""));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ""])));
}

// ---------- field statistics ----------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?/;

function fieldStats(records) {
  const order = [];
  const stats = new Map();
  for (const r of records) {
    for (const [k, v] of Object.entries(r)) {
      let s = stats.get(k);
      if (!s) {
        if (order.length >= MAX_FIELDS_TRACKED) continue;
        s = { filled: 0, counts: new Map(), capped: false, numeric: true, min: null, max: null, dates: true, dmin: null, dmax: null };
        stats.set(k, s);
        order.push(k);
      }
      if (v === null || v === undefined || v === "") continue;
      s.filled++;
      const key = typeof v === "string" ? v : JSON.stringify(v);
      if (s.counts.has(key)) s.counts.set(key, s.counts.get(key) + 1);
      else if (s.counts.size < DISTINCT_CAP) s.counts.set(key, 1);
      else s.capped = true;
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : null;
      if (n === null) s.numeric = false;
      else {
        s.min = s.min === null ? n : Math.min(s.min, n);
        s.max = s.max === null ? n : Math.max(s.max, n);
      }
      if (typeof v === "string" && ISO_DATE.test(v)) {
        s.dmin = s.dmin === null || v < s.dmin ? v : s.dmin;
        s.dmax = s.dmax === null || v > s.dmax ? v : s.dmax;
      } else s.dates = false;
    }
  }
  return { order, stats };
}

function renderField(name, s) {
  {
    const distinct = s.counts.size;
    const field = { name, filled: s.filled, distinct: s.capped ? `${DISTINCT_CAP}+` : distinct };
    if (s.filled === 0) return field;
    if (distinct <= LOW_CARDINALITY && !s.capped) {
      field.values = [...s.counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_VALUES).map(([v, c]) => [clip(v), c]);
      if (distinct > TOP_VALUES) field.moreValues = distinct - TOP_VALUES;
    } else if (s.numeric && s.min !== null) {
      field.range = [s.min, s.max];
    } else if (s.dates && s.dmin) {
      field.range = [clip(s.dmin), clip(s.dmax)];
    } else {
      // High-cardinality text (IDs, names, emails): counts only, plus
      // the most repeated values when there are any repeats.
      const repeats = [...s.counts.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (repeats.length) field.topRepeats = repeats.map(([v, c]) => [clip(v), c]);
    }
    return field;
  }
}

// Compliance-relevant columns first; noisy preference/address columns
// last. Everything not shown is still listed by name.
const RELEVANT = /pass|pwd|login|logon|lock|frozen|active|status|type|profile|role|permission|perm|licen|federat|sso|saml|mfa|two.?factor|auth|api|integrat|service|system|admin|expir|created|last|disabled|enabled|policy|session|ip|account|user.?name|username|email|name|manager|department|title|group|member|assignee|owner/i;
const NOISE = /^(EmailPreferences|UserPreferences|StayInTouch|Street|City|State|PostalCode|Country|Latitude|Longitude|GeocodeAccuracy|Address|Fax|Phone|MobilePhone|Signature|SenderName|SenderEmail|BadgeText|TimeZoneSidKey|LocaleSidKey|LanguageLocaleKey|EmailEncodingKey|StartDay|EndDay|Suffix|MiddleName)/;

function pickFields(order, stats) {
  const score = (n) => {
    const s = stats.get(n);
    if (!s || s.filled === 0) return -2;
    if (NOISE.test(n)) return -1;
    return RELEVANT.test(n) ? 2 : 0;
  };
  const ranked = order.map((n, i) => ({ n, i, sc: score(n) })).sort((a, b) => b.sc - a.sc || a.i - b.i);
  const shown = ranked.filter((r) => r.sc >= 0).slice(0, MAX_FIELDS_SHOWN).sort((a, b) => a.i - b.i).map((r) => r.n);
  const notShown = order.filter((n) => !shown.includes(n));
  return { shown, notShown };
}

const ACTIVE_FIELDS = ["IsActive", "isActive", "Active", "active", "status", "Status", "IsFrozen"];

function activePredicate(records) {
  const field = ACTIVE_FIELDS.find((f) => records.some((r) => r[f] !== undefined && r[f] !== ""));
  if (!field || field === "IsFrozen") return null;
  const isActive = (v) => v === true || /^(true|active|enabled|yes|1)$/i.test(String(v ?? "").trim());
  const count = records.filter((r) => isActive(r[field])).length;
  if (count === 0 || count === records.length) return null;
  return { field, test: (r) => isActive(r[field]), count };
}

const LABEL_FIELDS = ["_member", "fullName", "DeveloperName", "Name", "Username", "username", "name", "user_id", "Id"];

// Minority values of low-cardinality fields, with which records hold
// them -- e.g. which profiles allow 8-character passwords.
function outliers(records, fields, labelField) {
  if (!labelField) return [];
  const out = [];
  for (const f of fields) {
    if (!f.values || f.values.length < 2 || f.name === labelField) continue;
    const [top] = f.values[0];
    for (const [value, count] of f.values.slice(1)) {
      if (count > OUTLIER_MAX) continue;
      const labels = records.filter((r) => clip(r[f.name] ?? "") === value).map((r) => clip(r[labelField])).slice(0, OUTLIER_MAX);
      out.push({ field: f.name, value, count, typical: top, records: labels });
    }
  }
  return out.slice(0, 40);
}

function profileRecords(records) {
  const { order, stats } = fieldStats(records);
  const { shown, notShown } = pickFields(order, stats);
  const fields = shown.map((n) => renderField(n, stats.get(n)));
  const labelField = LABEL_FIELDS.find((f) => order.includes(f) && stats.get(f).filled > 0) ?? null;
  const result = { fields, otherFields: notShown, labelField, outliers: outliers(records, fields, labelField) };

  // Same view restricted to active records, for the relevant columns --
  // compliance is about active accounts.
  const active = activePredicate(records);
  if (active) {
    const subset = records.filter(active.test);
    const sub = fieldStats(subset);
    result.active = {
      field: active.field,
      count: active.count,
      fields: shown
        .filter((n) => RELEVANT.test(n) && sub.stats.get(n))
        .map((n) => renderField(n, sub.stats.get(n)))
        .filter((f) => f.filled > 0 && (f.values || f.range))
        .slice(0, 40),
    };
  }
  return result;
}

// ---------- main ----------

function main() {
  const size = fs.statSync(file).size;
  const base = { filename: displayName, bytes: size };

  if (ext === "json") {
    const raw = fs.readFileSync(file, "utf8");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return { ...base, format: "json", error: `Not valid JSON: ${e.message}`, textExcerpt: raw.slice(0, TEXT_EXCERPT_CHARS) };
    }
    const { records, recordType, reportedTotal, complete, notes } = extractJson(data);
    return { ...base, format: "json", recordType, recordCount: records.length, reportedTotal, complete, notes, ...profileRecords(records) };
  }

  if (ext === "csv") {
    const records = parseCsv(fs.readFileSync(file, "utf8"));
    return { ...base, format: "csv", recordType: null, recordCount: records.length, reportedTotal: null, complete: null, notes: [], ...profileRecords(records) };
  }

  // Text and anything else: an excerpt (these are usually run logs or
  // written analyses, not datasets).
  const raw = fs.readFileSync(file, "utf8");
  return {
    ...base,
    format: ext || "text",
    lineCount: raw.split("\n").length,
    textExcerpt: raw.slice(0, TEXT_EXCERPT_CHARS),
    notes: raw.length > TEXT_EXCERPT_CHARS ? [`Text file: first ${TEXT_EXCERPT_CHARS.toLocaleString()} of ${raw.length.toLocaleString()} characters shown.`] : [],
  };
}

try {
  process.stdout.write(JSON.stringify(main()));
} catch (e) {
  process.stdout.write(JSON.stringify({ filename: displayName, error: e instanceof Error ? e.message : String(e) }));
}
