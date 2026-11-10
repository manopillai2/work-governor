// "Compliance Hub" design preview -- borrows the visual language of the
// Untitled.png reference and applies it to Work Governor's real data
// (read-only, via useAppState / /api/state). Fonts are loaded here in
// the server module and handed down as class names.

import { Figtree, JetBrains_Mono } from "next/font/google";
import ComplianceHub from "./ComplianceHub";

const sans = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"] });

export default function ComplianceHubPreview() {
  return <ComplianceHub sansClass={sans.className} monoClass={mono.className} />;
}
