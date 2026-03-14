import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { importLegacyReplayText, tryParseWithLegacyPython } from "@/lib/legacy-python";
import { tryParseWithServicePath } from "@/lib/ingest-parser";
import type { MatchSummary } from "@/lib/types";

export type IngestJobRecord = {
  id: string;
  fileName: string;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  source?: MatchSummary["source"];
  error?: string;
  detail?: string;
  summary?: MatchSummary;
};

const JOB_DIR = path.join(process.cwd(), ".tmp", "jobs");

async function ensureJobDir() {
  await mkdir(JOB_DIR, { recursive: true });
}

function jobPath(jobId: string) {
  return path.join(JOB_DIR, `${jobId}.json`);
}

export async function writeJob(record: IngestJobRecord) {
  await ensureJobDir();
  await writeFile(jobPath(record.id), JSON.stringify(record), "utf8");
}

export async function readJob(jobId: string): Promise<IngestJobRecord | null> {
  try {
    const raw = await readFile(jobPath(jobId), "utf8");
    return JSON.parse(raw) as IngestJobRecord;
  } catch {
    return null;
  }
}

export async function createJob(fileName: string) {
  const now = new Date().toISOString();
  const record: IngestJobRecord = {
    id: randomUUID(),
    fileName,
    status: "queued",
    createdAt: now,
    updatedAt: now
  };
  await writeJob(record);
  return record;
}

export async function startIngestJob(jobId: string, localPath: string, fileName: string) {
  const existing = await readJob(jobId);
  if (!existing) return;

  await writeJob({
    ...existing,
    status: "processing",
    updatedAt: new Date().toISOString()
  });

  try {
    const legacyResult = await tryParseWithLegacyPython(localPath, fileName);
    const summary = legacyResult.summary || (await tryParseWithServicePath(localPath, fileName));

    if (!summary) {
      await writeJob({
        ...existing,
        status: "failed",
        updatedAt: new Date().toISOString(),
        error: "Parsing failed. Export the demo to .viewer.json first, or verify local parser dependencies.",
        detail: legacyResult.error || "No output from legacy-python or parser-go"
      });
      return;
    }

    await writeJob({
      ...existing,
      status: "completed",
      updatedAt: new Date().toISOString(),
      source: summary.source,
      summary
    });
  } catch (error) {
    await writeJob({
      ...existing,
      status: "failed",
      updatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown ingest failure"
    });
  }
}

export async function createImmediateCompletedJob(fileName: string, summary: MatchSummary) {
  const job = await createJob(fileName);
  await writeJob({
    ...job,
    status: "completed",
    updatedAt: new Date().toISOString(),
    source: summary.source,
    summary
  });
  return job;
}

export async function importViewerJsonJob(fileName: string, rawText: string) {
  const summary = await importLegacyReplayText(rawText, fileName, fileName);
  const job = await createImmediateCompletedJob(fileName, summary);
  return { job, summary };
}
