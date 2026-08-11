import Link from "next/link";

const THEMES = [
  {
    href: "/new-theme/saas-minimal",
    name: "1. Modern SaaS Minimal",
    description:
      "Linear / Stripe / Vercel style. White canvas, sidebar nav, thin borders, one restrained accent color, dot status indicators.",
    swatch: ["#ffffff", "#f5f5f5", "#171717", "#e5e5e5"],
  },
  {
    href: "/new-theme/brutalist",
    name: "2. Neo-Brutalist",
    description:
      "Thick black borders, hard offset shadows, flat saturated colors, big bold uppercase type. No gradients, no softness.",
    swatch: ["#fffbe6", "#000000", "#ff6b9d", "#c4f542"],
  },
  {
    href: "/new-theme/console",
    name: "3. Dense Enterprise Console",
    description:
      "Bloomberg-terminal feel. Near-black background, monospace type, tight table rows, terminal green/amber accents.",
    swatch: ["#0b0e14", "#1a1f2b", "#4ade80", "#fbbf24"],
  },
  {
    href: "/new-theme/glass",
    name: "4. Glassmorphism",
    description:
      "Frosted translucent panels over a soft gradient backdrop, blurred layers, pill-shaped buttons and inputs.",
    swatch: ["#818cf8", "#f0abfc", "#ffffff33", "#a78bfa"],
  },
  {
    href: "/new-theme/editorial",
    name: "5. Warm Editorial",
    description:
      "Notion-esque. Warm off-white paper background, serif headings, muted terracotta accent, generous whitespace.",
    swatch: ["#fbfaf8", "#e7ddd0", "#b45309", "#44403c"],
  },
];

export default function ThemeGallery() {
  return (
    <main className="min-h-screen bg-white px-6 py-12 text-neutral-900">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Theme previews</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Five different design directions for the same screen (Applications
          + control checklist + AI assistant). Click into each — none are
          wired to real data or applied to the actual app yet.
        </p>

        <div className="mt-8 space-y-3">
          {THEMES.map((theme) => (
            <Link
              key={theme.href}
              href={theme.href}
              className="flex items-center gap-4 rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              <div className="flex shrink-0 gap-1">
                {theme.swatch.map((color, i) => (
                  <span
                    key={i}
                    className="h-8 w-8 rounded-md border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-900">
                  {theme.name}
                </div>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {theme.description}
                </p>
              </div>
              <span className="ml-auto shrink-0 text-neutral-300">→</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
