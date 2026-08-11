import Link from "next/link";

const CLASSIC = [
  {
    href: "/new-theme/console/green-crt",
    name: "Green Phosphor CRT",
    description:
      "Classic monochrome terminal. Black background, green-on-green text, scanlines, blinking cursor.",
    swatch: ["#000000", "#00ff41", "#003b0f", "#00ff41"],
  },
  {
    href: "/new-theme/console/amber-bloomberg",
    name: "Amber Bloomberg Terminal",
    description:
      "Financial-terminal feel. Amber monochrome data grid, function-key footer bar, scrolling ticker.",
    swatch: ["#0a0805", "#ffb000", "#3d2a00", "#ffb000"],
  },
  {
    href: "/new-theme/console/dos-bios",
    name: "Retro DOS / BIOS",
    description:
      "Classic blue-screen setup-menu look. Deep blue background, ASCII box-drawing borders, F-key hints.",
    swatch: ["#0000aa", "#ffffff", "#ffff55", "#00aaaa"],
  },
];

const CYBERPUNK = [
  {
    href: "/new-theme/console/matrix-hacker",
    name: "Matrix / Cyberpunk (original)",
    description:
      "Black background, neon green + magenta/cyan glow accents, glitch header, grid lines.",
    swatch: ["#000000", "#0aff9d", "#ff00c8", "#00e5ff"],
  },
  {
    href: "/new-theme/console/digital-rain",
    name: "Digital Rain",
    description:
      "The classic Matrix movie look — real animated falling green code behind the panels.",
    swatch: ["#000000", "#0aff41", "#0aff41", "#003b0f"],
  },
  {
    href: "/new-theme/console/tron-grid",
    name: "Tron Grid",
    description:
      "Monochrome cyan neon on black, receding 3D floor grid, glowing borders — no magenta.",
    swatch: ["#000000", "#5ef1ff", "#5ef1ff", "#000000"],
  },
  {
    href: "/new-theme/console/synthwave",
    name: "Synthwave",
    description:
      "80s retro-futurism. Purple-to-pink gradient sky, glowing sun, cyan horizon grid.",
    swatch: ["#1a0b2e", "#ff5f9e", "#5efce8", "#ffe066"],
  },
  {
    href: "/new-theme/console/blade-runner",
    name: "Blade Runner Noir",
    description:
      "Moody near-black with amber haze and teal accents, diagonal rain streaks.",
    swatch: ["#120d0a", "#ff9d3d", "#5ce1c4", "#120d0a"],
  },
  {
    href: "/new-theme/console/cyberpunk-2077",
    name: "Cyberpunk 2077",
    description:
      "Harsh black/yellow/magenta, chromatic-aberration glitch title, bold blocky borders.",
    swatch: ["#000000", "#fcee0a", "#ff2e63", "#00f0b5"],
  },
];

const IDE = [
  {
    href: "/new-theme/console/modern-ide",
    name: "VSCode Dark (original)",
    description:
      "Activity bar, file tabs, breadcrumb path, blue/green/yellow status colors.",
    swatch: ["#1e1e1e", "#252526", "#007acc", "#4ec9b0"],
  },
  {
    href: "/new-theme/console/dracula",
    name: "Dracula",
    description: "Purple-gray background, pink/cyan/green pastel neon accents.",
    swatch: ["#282a36", "#bd93f9", "#8be9fd", "#50fa7b"],
  },
  {
    href: "/new-theme/console/monokai",
    name: "Monokai",
    description: "Warm dark olive background, hot pink/orange/lime accents.",
    swatch: ["#272822", "#f92672", "#66d9ef", "#a6e22e"],
  },
  {
    href: "/new-theme/console/solarized-dark",
    name: "Solarized Dark",
    description: "Muted teal-black background, low-contrast warm accent palette.",
    swatch: ["#002b36", "#268bd2", "#b58900", "#2aa198"],
  },
  {
    href: "/new-theme/console/github-dark",
    name: "GitHub Dark",
    description: "Familiar GitHub.com dark mode — blue links, neutral grays.",
    swatch: ["#0d1117", "#58a6ff", "#3fb950", "#f85149"],
  },
  {
    href: "/new-theme/console/nord",
    name: "Nord",
    description: "Cool arctic blue-grays with muted frost-blue and green accents.",
    swatch: ["#2e3440", "#88c0d0", "#a3be8c", "#b48ead"],
  },
];

function Section({
  title,
  items,
}: {
  title: string;
  items: typeof CLASSIC;
}) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      <div className="space-y-3">
        {items.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            className="flex items-center gap-4 rounded-md border border-slate-800 p-4 transition hover:border-slate-600 hover:bg-slate-900/60"
          >
            <div className="flex shrink-0 gap-1">
              {v.swatch.map((color, i) => (
                <span
                  key={i}
                  className="h-8 w-8 rounded-sm border border-white/10"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-100">{v.name}</div>
              <p className="mt-0.5 text-sm text-slate-500">{v.description}</p>
            </div>
            <span className="ml-auto shrink-0 text-slate-700">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ConsoleGallery() {
  return (
    <main className="min-h-screen bg-black px-6 py-12 font-mono text-slate-300">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100">
            Console-style variants
          </h1>
          <Link
            href="/new-theme"
            className="text-xs text-slate-500 hover:text-slate-200"
          >
            ← all themes
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Same mock screen (Applications + control checklist + AI assistant),
          different console personalities — grouped by family.
        </p>

        <Section title="Classic terminal" items={CLASSIC} />
        <Section title="Neon / cyberpunk" items={CYBERPUNK} />
        <Section title="Code-editor themes" items={IDE} />
      </div>
    </main>
  );
}
