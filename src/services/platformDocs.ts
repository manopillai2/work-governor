// Server-only. Platform documentation reference: basic, application-
// specific facts (identity types, access model, authentication and
// password settings, logging, change management, how to extract the
// data) taken from the product vendor's OFFICIAL documentation, used to
// ground checklists and the evidence-vs-data gap analysis.
//
// Rules this module enforces in code, not just in the prompt:
// - Stored first, internet second: a stored reference is reused until
//   it expires; research runs only when nothing usable is stored.
// - Official sites only: web search and fetch are restricted, by the
//   API's allowed_domains, to the vendor documentation domains
//   identified for the product.
// - Every fact must cite a page that was actually retrieved during the
//   research (a URL seen in a search or fetch result on an allowed
//   domain); facts with any other link are dropped.
// - In-house / unidentifiable applications get no research -- the
//   checklist then relies on SOX knowledge and the application context.

import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";

import { learningDb } from "@/db/learning-client";
import {
  platformReferences,
  type PlatformDocFact,
  type PlatformDocSource,
} from "@/db/learning-schema";
import { splitApplicationName } from "@/services/applicationName";

export type PlatformReference = typeof platformReferences.$inferSelect;

export type ApplicationDocsInput = {
  name: string;
  hosting?: string;
  applicationPurpose?: string;
  hostingDetails?: string;
  integrations?: string[];
  identityTypes?: string[];
};

const MODEL = "claude-opus-5-5";

const DAY = 24 * 60 * 60 * 1000;
// How long a stored reference is reused before it is researched again.
const TTL: Record<string, number> = {
  researched: 180 * DAY,
  no_public_docs: 30 * DAY,
  failed: 1 * DAY,
};

export const DOC_TOPICS = [
  "Identity types",
  "Access model",
  "Authentication & password policy",
  "Privileged access",
  "User provisioning & deprovisioning",
  "Audit logging",
  "Change management",
  "Data extraction",
] as const;

// Sites that are never a vendor's official documentation, even if the
// model suggests them.
const NEVER_OFFICIAL = [
  "wikipedia.org",
  "reddit.com",
  "stackoverflow.com",
  "stackexchange.com",
  "medium.com",
  "quora.com",
  "youtube.com",
  "linkedin.com",
  "github.com",
];

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------
// Names, domains, URLs

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// The full application name and its base product part, without an
// instance suffix: "Salesforce - CXT" and "Salesforce (CXT)" ->
// "salesforce cxt", "salesforce".
export function aliasesFor(applicationName: string): string[] {
  const full = normalizeName(applicationName);
  const base = normalizeName(
    splitApplicationName(applicationName).appName.replace(/\s*\([^)]*\)\s*$/, ""),
  );
  return [...new Set([full, base].filter(Boolean))];
}

function cleanDomain(value: string): string | null {
  const host = value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/^www\./, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return null;
  if (NEVER_OFFICIAL.some((d) => host === d || host.endsWith(`.${d}`))) return null;
  return host;
}

function hostAllowed(url: string, domains: string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function urlKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function isFresh(ref: PlatformReference): boolean {
  const ttl = TTL[ref.status] ?? DAY;
  return Date.now() - new Date(ref.researchedAt).getTime() < ttl;
}

// ---------------------------------------------------------------------
// Stored lookups (no internet)

async function allReferences(): Promise<PlatformReference[]> {
  try {
    return await learningDb.select().from(platformReferences);
  } catch (error) {
    console.error("Unable to load platform references (continuing without them):", error);
    return [];
  }
}

function findByAlias(rows: PlatformReference[], applicationName: string): PlatformReference | undefined {
  const [full, base] = aliasesFor(applicationName);
  // Prefer the full-name match (it may have been identified from
  // context). The base name ("salesforce" from "Salesforce - CXT") only
  // matches an identified product, never another in-house application
  // that happens to share a prefix.
  const exact = rows.find((r) => r.aliases.includes(full) || r.id === full);
  if (exact || !base) return exact;
  return rows.find((r) => !r.id.startsWith("unidentified:") && (r.id === base || r.aliases.includes(base)));
}

// Stored references for these application names (and for any stored
// product named in `freeText`, e.g. an application about to be
// created). Never goes to the internet.
export async function getStoredReferences(
  applicationNames: string[],
  freeText = "",
): Promise<PlatformReference[]> {
  const rows = await allReferences();
  const found = new Map<string, PlatformReference>();
  for (const name of applicationNames) {
    const hit = findByAlias(rows, name);
    if (hit) found.set(hit.id, hit);
  }
  const text = ` ${normalizeName(freeText)} `;
  if (text.trim()) {
    for (const row of rows) {
      if (row.status !== "researched") continue;
      const names = [normalizeName(row.productName), ...row.aliases].filter((n) => n.length >= 3);
      if (names.some((n) => text.includes(` ${n} `))) found.set(row.id, row);
    }
  }
  return [...found.values()];
}

// ---------------------------------------------------------------------
// Prompt formatting

export function formatReferencesForPrompt(refs: PlatformReference[], charBudget = 14_000): string {
  const usable = refs.filter((r) => r.status === "researched" && r.facts.length > 0);
  const lines: string[] = [];
  for (const ref of refs.filter((r) => r.status !== "researched")) {
    lines.push(
      `- ${ref.productName}: no official documentation reference (${ref.note || ref.status}). Rely on SOX knowledge and the application context; do not cite documentation for it.`,
    );
  }
  for (const ref of usable) {
    const block = [
      `### ${ref.productName}${ref.vendor ? ` (${ref.vendor})` : ""} -- official documentation, researched ${new Date(ref.researchedAt).toISOString().slice(0, 10)}`,
      ref.summary,
      ...(ref.facts.some((f) => f.topic === "Identity types")
        ? [
            "REQUIRED IDENTITY COVERAGE -- every identity, password/authentication and access checklist for this product must include an item naming each of these identity types:",
            ...ref.facts
              .filter((f) => f.topic === "Identity types")
              .map((f) => `  * ${f.fact}`),
          ]
        : []),
      "Sources:",
      ...ref.sources.map((s, i) => `[D${i + 1}] ${s.title} -- ${s.url}`),
      "Facts:",
      ...ref.facts.map((f) => {
        const idx = ref.sources.findIndex((s) => urlKey(s.url) === urlKey(f.sourceUrl));
        return `- (${f.topic}) ${f.fact} [D${idx + 1}]`;
      }),
    ].join("\n");
    lines.push(block);
  }
  const text = lines.join("\n\n");
  return text.length > charBudget ? `${text.slice(0, charBudget)}\n[... reference truncated]` : text;
}

// Every source URL in these references, for validating citations the
// model puts on checklist items / readiness items.
export function referenceUrls(refs: PlatformReference[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const ref of refs) for (const s of ref.sources) map.set(urlKey(s.url), s.url);
  return map;
}

// Keep only citations that are sources of the given references.
export function keepKnownUrls(urls: unknown, known: Map<string, string>): string[] {
  if (!Array.isArray(urls)) return [];
  const out = new Set<string>();
  for (const u of urls) {
    if (typeof u !== "string") continue;
    const hit = known.get(urlKey(u));
    if (hit) out.add(hit);
  }
  return [...out];
}

// ---------------------------------------------------------------------
// Identification: which product is this, and where are its official docs?

type Identification = {
  isPublicProduct: boolean;
  productName: string;
  vendor: string;
  officialDocDomains: string[];
  reason: string;
};

function describeApplication(app: ApplicationDocsInput): string {
  return [
    ["Application name", app.name],
    ["Hosting", app.hosting],
    ["Purpose", app.applicationPurpose],
    ["Hosting and architecture", app.hostingDetails],
    ["Integrations", app.integrations?.join(", ")],
    ["Known identity types", app.identityTypes?.join(", ")],
  ]
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

async function identify(app: ApplicationDocsInput): Promise<Identification> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            isPublicProduct: { type: "boolean" },
            productName: { type: "string" },
            vendor: { type: "string" },
            officialDocDomains: { type: "array", items: { type: "string" } },
            reason: { type: "string" },
          },
          required: ["isPublicProduct", "productName", "vendor", "officialDocDomains", "reason"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "user",
        content: `Identify the commercial or open-source software product behind this application, so its official vendor documentation can be researched for a SOX IT general controls review.

${describeApplication(app)}

Application names often carry an internal instance or business-unit suffix (e.g. "Salesforce - CXT" is Salesforce). Use the context to tell which product it is when the name alone doesn't.

Return:
- isPublicProduct: true only if this is a recognizable product with public vendor documentation. false for in-house/custom applications, or when you cannot tell which product it is -- do not guess.
- productName: the product's canonical name (e.g. "Salesforce", "SAP S/4HANA", "IBM Maximo"); the application name if not a public product.
- vendor: the vendor, or "".
- officialDocDomains: 1-4 hostnames that host the vendor's OWN official product documentation (e.g. "help.salesforce.com", "developer.salesforce.com"). Only vendor-owned domains -- never community forums, blogs, wikis, resellers or third-party sites. Empty if not a public product.
- reason: one short sentence.`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("The model declined to identify the product.");
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
  const parsed = JSON.parse(text) as Identification;
  const domains = [...new Set((parsed.officialDocDomains ?? []).map(cleanDomain).filter((d): d is string => !!d))].slice(0, 4);
  return {
    isPublicProduct: parsed.isPublicProduct === true && domains.length > 0,
    productName: String(parsed.productName || app.name).trim(),
    vendor: String(parsed.vendor ?? "").trim(),
    officialDocDomains: domains,
    reason: String(parsed.reason ?? "").trim(),
  };
}

// ---------------------------------------------------------------------
// Research: official documentation only, every fact cited

const RECORD_TOOL: Anthropic.Tool = {
  name: "record_platform_reference",
  description:
    "Record the documentation reference once research is finished. Call it exactly once, at the end.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Two to four plain sentences on what matters about this product for SOX IT general controls.",
      },
      facts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topic: { type: "string", enum: [...DOC_TOPICS] },
            fact: { type: "string", description: "One specific, plain-language fact stated on the cited page." },
            sourceUrl: { type: "string", description: "The exact URL of the retrieved page that states the fact." },
            sourceTitle: { type: "string" },
          },
          required: ["topic", "fact", "sourceUrl", "sourceTitle"],
          additionalProperties: false,
        },
      },
    },
    required: ["summary", "facts"],
    additionalProperties: false,
  },
};

type RecordInput = {
  summary: string;
  facts: Array<PlatformDocFact & { sourceTitle: string }>;
};

// URLs (and titles) of pages actually returned by web search / fetch.
function collectRetrieved(content: Anthropic.ContentBlock[], into: Map<string, PlatformDocSource>) {
  for (const block of content) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content) into.set(urlKey(r.url), { url: r.url, title: r.title });
    } else if (block.type === "web_fetch_tool_result" && block.content.type === "web_fetch_result") {
      const title = block.content.content.title || block.content.url;
      into.set(urlKey(block.content.url), { url: block.content.url, title });
    }
  }
}

async function research(app: ApplicationDocsInput, id: Identification) {
  const tools: Anthropic.ToolUnion[] = [
    { type: "web_search_20260209", name: "web_search", allowed_domains: id.officialDocDomains, max_uses: 8 },
    { type: "web_fetch_20260209", name: "web_fetch", allowed_domains: id.officialDocDomains, max_uses: 8 },
    RECORD_TOOL,
  ];

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Research the official documentation for ${id.productName}${id.vendor ? ` (${id.vendor})` : ""} to support a SOX IT general controls review of an application built on it.

${describeApplication(app)}

Find the basic, product-specific facts an auditor needs, for each of these topics where the documentation covers it:
${DOC_TOPICS.map((t) => `- ${t}`).join("\n")}

Focus on what differs from product to product: every kind of identity the product has (human users, service/integration users, API-only users, connected apps / OAuth clients, admins), how access is granted (roles, profiles, permission sets, groups), the password / credential / session / MFA settings and where they are configured, which audit logs exist and how long they are kept, how changes reach production, and which APIs, objects or reports expose users, permissions, settings and logs for read-only extraction.

Rules:
- Use only pages you actually retrieved with web_search or web_fetch in this conversation. Searches and fetches are limited to the vendor's official documentation sites.
- Every fact must be stated on the page you cite, and sourceUrl must be that page's exact URL as it appeared in the search or fetch result.
- Prefer 10-25 concrete facts over general statements. Leave a topic out rather than guess.
- When you are done, call record_platform_reference exactly once.`,
    },
  ];

  const retrieved = new Map<string, PlatformDocSource>();
  let record: RecordInput | undefined;

  // Server-side tool loops can pause (pause_turn); resume a few times.
  for (let turn = 0; turn < 5 && !record; turn++) {
    const response = await anthropic.messages
      .stream({
        model: MODEL,
        max_tokens: 32000,
        output_config: { effort: "medium" },
        tools,
        messages,
      })
      .finalMessage();

    collectRetrieved(response.content, retrieved);

    const call = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === RECORD_TOOL.name,
    );
    if (call) {
      record = call.input as RecordInput;
      break;
    }
    if (response.stop_reason === "refusal") throw new Error("The model declined the documentation research.");
    if (response.stop_reason !== "pause_turn") {
      // Finished without recording: ask once more for the record.
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: "Call record_platform_reference now with what you found." });
      continue;
    }
    messages.push({ role: "assistant", content: response.content });
  }

  if (!record) throw new Error("The research finished without recording a reference.");

  // Keep only facts citing a page that was really retrieved, on an
  // official domain.
  const facts: PlatformDocFact[] = [];
  const sources = new Map<string, PlatformDocSource>();
  for (const f of record.facts ?? []) {
    const key = urlKey(f.sourceUrl ?? "");
    const seen = retrieved.get(key);
    if (!seen || !hostAllowed(seen.url, id.officialDocDomains) || !f.fact?.trim()) continue;
    facts.push({ topic: f.topic, fact: f.fact.trim(), sourceUrl: seen.url });
    if (!sources.has(key)) sources.set(key, { url: seen.url, title: f.sourceTitle?.trim() || seen.title });
  }
  const dropped = (record.facts?.length ?? 0) - facts.length;
  if (dropped > 0) {
    console.warn(`[platform docs] ${id.productName}: dropped ${dropped} fact(s) citing pages that were not retrieved from official domains`);
  }
  return { summary: String(record.summary ?? "").trim(), facts, sources: [...sources.values()] };
}

// ---------------------------------------------------------------------
// Resolve: stored first, research only when needed

const inFlight = new Map<string, Promise<PlatformReference | null>>();

async function save(row: typeof platformReferences.$inferInsert): Promise<PlatformReference> {
  const [saved] = await learningDb
    .insert(platformReferences)
    .values(row)
    .onConflictDoUpdate({ target: platformReferences.id, set: { ...row } })
    .returning();
  return saved;
}

// Point these aliases at `targetId` only.
async function moveAliases(aliases: string[], targetId: string, rows: PlatformReference[]) {
  for (const row of rows) {
    if (row.id === targetId) continue;
    const kept = row.aliases.filter((a) => !aliases.includes(a));
    if (kept.length !== row.aliases.length) {
      await learningDb.update(platformReferences).set({ aliases: kept }).where(eq(platformReferences.id, row.id));
    }
  }
}

export type ResolveOptions = {
  // Re-identify the product even if the name is already mapped (the
  // application context changed).
  reidentify?: boolean;
  // Research again even if a fresh stored reference exists.
  forceRefresh?: boolean;
};

export async function resolvePlatformReference(
  app: ApplicationDocsInput,
  options: ResolveOptions = {},
): Promise<PlatformReference | null> {
  const key = `${normalizeName(app.name)}|${options.reidentify ? 1 : 0}|${options.forceRefresh ? 1 : 0}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const work = resolveUncached(app, options).finally(() => inFlight.delete(key));
  inFlight.set(key, work);
  return work;
}

async function resolveUncached(app: ApplicationDocsInput, options: ResolveOptions): Promise<PlatformReference | null> {
  if (!app.name.trim() || !process.env.ANTHROPIC_API_KEY) return null;
  const aliases = aliasesFor(app.name);
  let rows = await allReferences();

  const stored = findByAlias(rows, app.name);
  if (stored && !options.reidentify && !options.forceRefresh && isFresh(stored)) return stored;

  let id: Identification;
  try {
    id = await identify(app);
  } catch (error) {
    console.error(`[platform docs] identification failed for "${app.name}":`, error);
    return stored ?? null;
  }

  if (!id.isPublicProduct) {
    const rowId = `unidentified:${aliases[0]}`;
    rows = await allReferences();
    await moveAliases(aliases, rowId, rows);
    return save({
      id: rowId,
      productName: app.name,
      vendor: "",
      officialDomains: [],
      aliases,
      status: "no_public_docs",
      summary: "",
      facts: [],
      sources: [],
      note: id.reason || "Not matched to a product with public vendor documentation.",
      model: MODEL,
      researchedAt: new Date(),
    });
  }

  const productId = normalizeName(id.productName);
  rows = await allReferences();
  const product = rows.find((r) => r.id === productId);
  const mergedAliases = [...new Set([...(product?.aliases ?? []), ...aliases])];
  await moveAliases(aliases, productId, rows);

  // Same product already researched and still fresh: reuse it.
  if (product && isFresh(product) && product.status === "researched" && !options.forceRefresh) {
    if (mergedAliases.length !== product.aliases.length) {
      const [updated] = await learningDb
        .update(platformReferences)
        .set({ aliases: mergedAliases })
        .where(eq(platformReferences.id, productId))
        .returning();
      return updated;
    }
    return product;
  }

  console.log(`[platform docs] researching ${id.productName} on ${id.officialDocDomains.join(", ")}`);
  try {
    const found = await research(app, id);
    return save({
      id: productId,
      productName: id.productName,
      vendor: id.vendor,
      officialDomains: id.officialDocDomains,
      aliases: mergedAliases,
      status: found.facts.length > 0 ? "researched" : "no_public_docs",
      summary: found.summary,
      facts: found.facts,
      sources: found.sources,
      note:
        found.facts.length > 0
          ? ""
          : `Searched ${id.officialDocDomains.join(", ")} but found no usable documentation pages.`,
      model: MODEL,
      researchedAt: new Date(),
    });
  } catch (error) {
    console.error(`[platform docs] research failed for ${id.productName}:`, error);
    // Keep an older good copy rather than replacing it with a failure.
    if (product?.status === "researched") return product;
    return save({
      id: productId,
      productName: id.productName,
      vendor: id.vendor,
      officialDomains: id.officialDocDomains,
      aliases: mergedAliases,
      status: "failed",
      summary: "",
      facts: [],
      sources: [],
      note: error instanceof Error ? error.message : "Research failed.",
      model: MODEL,
      researchedAt: new Date(),
    });
  }
}
