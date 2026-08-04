import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { applications, evidenceDocuments } from "@/db/schema";
import {
  ALLOWED_EVIDENCE_EXTENSIONS,
  extractTextFromFile,
  getFileExtension,
} from "@/services/evidenceParser";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function createEvidenceId(): string {
  return `evidence-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const file = formData.get("file");
  const applicationId = formData.get("applicationId");
  const scope = formData.get("scope");
  const controlNamesRaw = formData.get("controlNames");
  const kind = formData.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "file is required." },
      { status: 400 }
    );
  }

  if (
    typeof applicationId !== "string" ||
    !applicationId.trim()
  ) {
    return NextResponse.json(
      { error: "applicationId is required." },
      { status: 400 }
    );
  }

  if (scope !== "all" && scope !== "selected") {
    return NextResponse.json(
      { error: "scope must be 'all' or 'selected'." },
      { status: 400 }
    );
  }

  if (kind !== "evidence" && kind !== "data") {
    return NextResponse.json(
      { error: "kind must be 'evidence' or 'data'." },
      { status: 400 }
    );
  }

  let controlNames: string[] = [];

  if (scope === "selected") {
    if (typeof controlNamesRaw !== "string") {
      return NextResponse.json(
        {
          error:
            "controlNames is required when scope is 'selected'.",
        },
        { status: 400 }
      );
    }

    try {
      const parsed = JSON.parse(controlNamesRaw);

      if (
        !Array.isArray(parsed) ||
        parsed.some(
          (name) => typeof name !== "string"
        )
      ) {
        throw new Error("not a string array");
      }

      controlNames = parsed;
    } catch {
      return NextResponse.json(
        {
          error:
            "controlNames must be a JSON array of strings.",
        },
        { status: 400 }
      );
    }
  }

  const extension = getFileExtension(file.name);

  if (
    !ALLOWED_EVIDENCE_EXTENSIONS.includes(
      extension
    )
  ) {
    return NextResponse.json(
      {
        error: `Unsupported file type ".${extension}". Supported: ${ALLOWED_EVIDENCE_EXTENSIONS.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  const [application] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.id, applicationId));

  if (!application) {
    return NextResponse.json(
      { error: `${applicationId} was not found.` },
      { status: 404 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let extractResult: {
    text: string;
    truncated: boolean;
  };

  try {
    extractResult = await extractTextFromFile(
      buffer,
      file.name
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to parse the file.",
      },
      { status: 400 }
    );
  }

  const appUploadDir = path.join(
    UPLOAD_ROOT,
    applicationId
  );

  await mkdir(appUploadDir, { recursive: true });

  const storedFilename = `${Date.now()}-${sanitizeFilename(file.name)}`;
  const storagePath = path.join(
    appUploadDir,
    storedFilename
  );

  await writeFile(storagePath, buffer);

  const id = createEvidenceId();

  const [inserted] = await db
    .insert(evidenceDocuments)
    .values({
      id,
      applicationId,
      filename: file.name,
      fileType: extension,
      storagePath: path.relative(
        process.cwd(),
        storagePath
      ),
      kind,
      scope,
      controlNames,
      extractedText: extractResult.text,
      truncated: extractResult.truncated,
    })
    .returning();

  return NextResponse.json({ evidence: inserted });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get(
    "applicationId"
  );

  const rows = applicationId
    ? await db
        .select()
        .from(evidenceDocuments)
        .where(
          eq(
            evidenceDocuments.applicationId,
            applicationId
          )
        )
    : await db.select().from(evidenceDocuments);

  return NextResponse.json({ evidence: rows });
}
