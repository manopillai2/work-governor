import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import MatrixRainBackground from "@/components/MatrixRainBackground";
import RoyalEffectBackground from "@/components/RoyalEffectBackground";
import RoyalCursor from "@/components/RoyalCursor";
import AppStateProvider from "@/components/AppStateProvider";

const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem('control-governor-theme');
  if (t === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    var r = localStorage.getItem('control-governor-rain-effect');
    if (r === 'on' || r === null) {
      document.documentElement.setAttribute('data-rain', 'on');
    }
  } else if (t === 'royal') {
    document.documentElement.setAttribute('data-theme', 'royal');
    var re = localStorage.getItem('control-governor-royal-effect');
    if (re === 'on' || re === null) {
      document.documentElement.setAttribute('data-royal-effect', 'on');
    }
  }
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
        {/* Hand-torn parchment edge for the royal theme's scroll cards
            (see .royal-scroll-torn in globals.css) -- a plain CSS
            clip-path: polygon() can only draw straight-line teeth, but
            the reference art shows soft, rounded, irregular curls, so
            this is an SVG clipPath with cubic-bezier curves instead.
            clipPathUnits="objectBoundingBox" makes its 0-1 coordinates
            scale to whatever box references it via `url(#...)`,
            regardless of that card's actual pixel width/height. Always
            mounted (zero visual footprint) rather than gated behind
            the royal theme, since it's inert until referenced. */}
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs>
            <clipPath id="royal-torn-clip" clipPathUnits="objectBoundingBox">
              <path d="M 0 0 L 1 0 C 0.9978 0.0067 0.9906 0.0267 0.9865 0.0400 C 0.9825 0.0533 0.9766 0.0667 0.9758 0.0800 C 0.9749 0.0933 0.9789 0.1067 0.9816 0.1200 C 0.9842 0.1333 0.9901 0.1467 0.9919 0.1600 C 0.9937 0.1733 0.9929 0.1867 0.9924 0.2000 C 0.9919 0.2133 0.9892 0.2267 0.9891 0.2400 C 0.9890 0.2533 0.9907 0.2667 0.9917 0.2800 C 0.9928 0.2933 0.9949 0.3067 0.9952 0.3200 C 0.9955 0.3333 0.9937 0.3467 0.9935 0.3600 C 0.9932 0.3733 0.9948 0.3867 0.9938 0.4000 C 0.9928 0.4133 0.9900 0.4267 0.9875 0.4400 C 0.9850 0.4533 0.9800 0.4667 0.9789 0.4800 C 0.9777 0.4933 0.9789 0.5067 0.9805 0.5200 C 0.9822 0.5333 0.9870 0.5467 0.9887 0.5600 C 0.9905 0.5733 0.9915 0.5867 0.9911 0.6000 C 0.9907 0.6133 0.9863 0.6267 0.9865 0.6400 C 0.9867 0.6533 0.9910 0.6667 0.9922 0.6800 C 0.9934 0.6933 0.9936 0.7067 0.9938 0.7200 C 0.9939 0.7333 0.9924 0.7467 0.9931 0.7600 C 0.9938 0.7733 0.9980 0.7867 0.9980 0.8000 C 0.9980 0.8133 0.9962 0.8267 0.9933 0.8400 C 0.9904 0.8533 0.9829 0.8667 0.9805 0.8800 C 0.9782 0.8933 0.9782 0.9067 0.9794 0.9200 C 0.9805 0.9333 0.9842 0.9467 0.9877 0.9600 C 0.9911 0.9733 0.9979 0.9933 1.0000 1.0000 L 0 1 C 0.0019 0.9933 0.0087 0.9733 0.0113 0.9600 C 0.0139 0.9467 0.0146 0.9333 0.0155 0.9200 C 0.0165 0.9067 0.0163 0.8933 0.0170 0.8800 C 0.0177 0.8667 0.0202 0.8533 0.0197 0.8400 C 0.0192 0.8267 0.0168 0.8133 0.0138 0.8000 C 0.0109 0.7867 0.0033 0.7733 0.0020 0.7600 C 0.0007 0.7467 0.0050 0.7333 0.0063 0.7200 C 0.0075 0.7067 0.0092 0.6933 0.0096 0.6800 C 0.0100 0.6667 0.0096 0.6533 0.0088 0.6400 C 0.0080 0.6267 0.0045 0.6133 0.0048 0.6000 C 0.0051 0.5867 0.0094 0.5733 0.0106 0.5600 C 0.0117 0.5467 0.0106 0.5333 0.0117 0.5200 C 0.0128 0.5067 0.0155 0.4933 0.0173 0.4800 C 0.0191 0.4667 0.0228 0.4533 0.0226 0.4400 C 0.0225 0.4267 0.0195 0.4133 0.0164 0.4000 C 0.0134 0.3867 0.0061 0.3733 0.0043 0.3600 C 0.0024 0.3467 0.0042 0.3333 0.0054 0.3200 C 0.0067 0.3067 0.0116 0.2933 0.0118 0.2800 C 0.0120 0.2667 0.0077 0.2533 0.0067 0.2400 C 0.0057 0.2267 0.0053 0.2133 0.0056 0.2000 C 0.0059 0.1867 0.0078 0.1733 0.0084 0.1600 C 0.0091 0.1467 0.0089 0.1333 0.0097 0.1200 C 0.0106 0.1067 0.0116 0.0933 0.0136 0.0800 C 0.0156 0.0667 0.0238 0.0533 0.0215 0.0400 C 0.0192 0.0267 0.0036 0.0067 0.0000 0.0000 Z" />
            </clipPath>
          </defs>
        </svg>
        <ThemeProvider>
          <MatrixRainBackground />
          <RoyalEffectBackground />
          <RoyalCursor />
          <AppStateProvider>{children}</AppStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
