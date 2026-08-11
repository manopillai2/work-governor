import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";
import MatrixRainBackground from "@/components/MatrixRainBackground";
import AppStateProvider from "@/components/AppStateProvider";

const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem('control-governor-theme');
  if (t === 'rain') document.documentElement.setAttribute('data-theme', 'rain');
} catch (e) {}
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ThemeToggle />
          <MatrixRainBackground />
          <AppStateProvider>{children}</AppStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
