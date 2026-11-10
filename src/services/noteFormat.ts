// Turns a stored note's free text into a display-only bullet
// structure. Stored note text is never changed -- notes are an audit
// record ("never add, remove, or reinterpret any fact"), so this only
// re-flows the exact same words into shorter, scannable points:
//
//   - each sentence (or "; "-separated clause, or explicit line)
//     becomes its own bullet;
//   - a "Label: a, b, c" sentence becomes a bold label with its list
//     items as sub-points;
//   - a long run of very short items (account names, emails, IDs)
//     becomes a compact wrapped group instead of a tall list.

export interface NoteBullet {
  // Text before a "Label:" split, shown bold. Absent for plain bullets.
  label?: string;
  // The bullet's own text (after the label, when there are no items).
  text?: string;
  // Sub-points split out of a "Label: a, b, c" list.
  items?: string[];
  // True when items are many and tiny -- render as compact chips.
  compact?: boolean;
}

const ABBREVIATIONS = new Set([
  "e.g.",
  "i.e.",
  "etc.",
  "vs.",
  "approx.",
  "no.",
  "nos.",
  "inc.",
  "ltd.",
  "co.",
  "corp.",
  "dept.",
  "mr.",
  "ms.",
  "mrs.",
  "dr.",
  "st.",
  "jr.",
  "sr.",
  "u.s.",
  "fig.",
]);

const LIST_MARKER = /^\s*(?:[-*•▪◦]|\d+[.)])\s+/;

// Splits on a separator only at paren/bracket depth 0, so commas inside
// "(8-hour timeout, ForceRelogin=True)" stay with their item.
function splitTopLevel(
  text: string,
  separator: ", " | "; "
): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === "(" || char === "[") {
      depth += 1;
    } else if (
      (char === ")" || char === "]") &&
      depth > 0
    ) {
      depth -= 1;
    } else if (
      depth === 0 &&
      text.startsWith(separator, i)
    ) {
      parts.push(text.slice(start, i));
      start = i + separator.length;
      i += separator.length - 1;
    }
  }

  parts.push(text.slice(start));

  return parts
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === "(" || char === "[") {
      depth += 1;
      continue;
    }

    if (
      (char === ")" || char === "]") &&
      depth > 0
    ) {
      depth -= 1;
      continue;
    }

    if (
      depth !== 0 ||
      (char !== "." &&
        char !== "!" &&
        char !== "?")
    ) {
      continue;
    }

    const next = text[i + 1];
    const afterSpace = text[i + 2];

    // Only a terminator followed by whitespace and a sentence-like
    // start ends a sentence -- "v59.0", "74.2%", "a@b.com" never do.
    if (
      next === undefined ||
      !/\s/.test(next) ||
      (afterSpace !== undefined &&
        !/[A-Z0-9"'(\[]/.test(afterSpace))
    ) {
      continue;
    }

    const lastWord =
      text
        .slice(start, i + 1)
        .split(/\s+/)
        .pop()
        ?.toLowerCase() ?? "";

    if (ABBREVIATIONS.has(lastWord)) {
      continue;
    }

    sentences.push(text.slice(start, i + 1));
    start = i + 1;
  }

  sentences.push(text.slice(start));

  return sentences
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function stripTrailingPeriod(text: string): string {
  return text.replace(/\.$/, "").trim();
}

// Display-only: "no per-profile overrides" -> "No per-profile
// overrides". Leaves identifiers like "iOS" or "cxt_api@x" alone.
function capitalize(text: string): string {
  return /^[a-z]+(?:\s|$)/.test(text)
    ? text[0].toUpperCase() + text.slice(1)
    : text;
}

function toBullet(clause: string): NoteBullet {
  const cleaned = capitalize(
    stripTrailingPeriod(clause)
  );

  // "Label: rest" -- a colon followed by a space (so "15:58:20" and
  // URLs never match) at depth 0, with a reasonably short label.
  const colonMatch = /^([^():]{2,80}?):\s+(.+)$/.exec(
    cleaned
  );

  if (!colonMatch) {
    return { text: cleaned };
  }

  const label = colonMatch[1].trim();
  const rest = colonMatch[2].trim();
  const items = splitTopLevel(rest, ", ").map(
    (item, index, all) =>
      index === all.length - 1
        ? item.replace(/^and\s+/i, "")
        : item
  );

  if (items.length < 3) {
    return { label, text: rest };
  }

  const compact =
    items.length > 12 &&
    items.every((item) => item.length <= 40);

  return { label, items, compact };
}

export function formatNoteBullets(
  rawText: string
): NoteBullet[] {
  const text = rawText.trim();

  if (!text) {
    return [];
  }

  // Notes the user already wrote as lines keep their own line breaks
  // as the bullet boundaries.
  const lines = text
    .split(/\n+/)
    .map((line) =>
      line.replace(LIST_MARKER, "").trim()
    )
    .filter(Boolean);

  const clauses = lines
    .flatMap(splitSentences)
    .flatMap((sentence) => {
      // Only break "; " clauses apart when each stands on its own --
      // "count: 660; inactive: 5,130" reads better kept together.
      const parts = splitTopLevel(sentence, "; ");
      return parts.every(
        (part) => part.length >= 30
      )
        ? parts
        : [sentence];
    });

  return clauses.map(toBullet);
}
