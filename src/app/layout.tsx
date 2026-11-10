import type { Metadata } from "next";
import { Figtree, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppStateProvider from "@/components/AppStateProvider";

const THEME_INIT_SCRIPT = `
try {
  document.documentElement.setAttribute('data-theme', 'light');
  // ?ui=hub / ?ui=classic picks the layout (and remembers it).
  var u = new URLSearchParams(location.search).get('ui');
  if (u === 'hub' || u === 'classic') localStorage.setItem('control-governor-ui', u);
  if (localStorage.getItem('control-governor-ui') === 'hub') {
    document.documentElement.setAttribute('data-ui', 'hub');
  }
} catch (e) {}
`;

// App fonts (both Classic and New UI layouts) -- wired up as
// --font-sans / --font-mono in globals.css.
const hubSans = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hub-sans",
});

const hubMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-hub-mono",
});

export const metadata: Metadata = {
  title: "Manoj Control Governor for CORE",
  description: "AI-powered personal compliance work assistant",
};

// The root page is otherwise statically prerendered and served with a
// year-long s-maxage, so a browser tab left open across a redeploy can
// silently keep running yesterday's JS bundle. Force dynamic rendering
// so every deploy is picked up immediately on the next request.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${hubSans.variable} ${hubMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AppStateProvider>{children}</AppStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
