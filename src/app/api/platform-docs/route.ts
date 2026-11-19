// Platform documentation reference for one application (see
// services/platformDocs.ts).
//   GET  ?name=<application name>  -- the stored reference, never researches
//   POST { application, refresh? } -- stored reference, researching the
//        vendor's official documentation when none is stored / it expired
//        (or always, with refresh: true)

import { NextResponse } from "next/server";

import {
  getStoredReferences,
  resolvePlatformReference,
  type ApplicationDocsInput,
} from "@/services/platformDocs";

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const [reference] = await getStoredReferences([name]);
  return NextResponse.json({ reference: reference ?? null });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const app = body.application as ApplicationDocsInput | undefined;
    if (!app?.name?.trim()) {
      return NextResponse.json({ error: "application.name is required." }, { status: 400 });
    }
    const reference = await resolvePlatformReference(
      {
        name: app.name,
        hosting: app.hosting,
        applicationPurpose: app.applicationPurpose,
        hostingDetails: app.hostingDetails,
        integrations: Array.isArray(app.integrations) ? app.integrations : [],
        identityTypes: Array.isArray(app.identityTypes) ? app.identityTypes : [],
      },
      { forceRefresh: body.refresh === true, reidentify: body.refresh === true },
    );
    return NextResponse.json({ reference });
  } catch (error) {
    console.error("Platform docs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Documentation research failed." },
      { status: 500 },
    );
  }
}
