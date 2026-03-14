import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createJob, importViewerJsonJob, startIngestJob } from "@/lib/ingest-jobs";
import { writeUploadedDemo } from "@/lib/ingest-parser";
import { ensureIncomingDemosDir, incomingDemosDir } from "@/lib/workspace-paths";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("demo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing demo file" }, { status: 400 });
  }

  if (file.name.endsWith(".viewer.json") || file.type.includes("json")) {
    try {
      const rawText = await file.text();
      await ensureIncomingDemosDir();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const savedPath = path.join(incomingDemosDir, `${Date.now()}-${safeName}`);
      await writeFile(savedPath, rawText, "utf8");
      const { job, summary } = await importViewerJsonJob(savedPath, rawText);
      return NextResponse.json({ mode: "completed", job, summary });
    } catch {
      return NextResponse.json({ error: "Invalid viewer.json file" }, { status: 400 });
    }
  }

  const localPath = await writeUploadedDemo(file);
  const job = await createJob(file.name);

  void startIngestJob(job.id, localPath, file.name);
  return NextResponse.json({ mode: "queued", job });
}
