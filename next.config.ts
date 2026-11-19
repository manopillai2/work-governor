import type { NextConfig } from "next";

import packageJson from "./package.json";

const nextConfig: NextConfig = {
  // Hide the Next.js dev-mode "N" indicator (bottom-left). Compile and
  // runtime errors still surface as overlays.
  devIndicators: false,
  // Only the version string reaches the browser (shown in the New UI's
  // sidebar and footer) -- not the rest of package.json.
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;
