import { NextResponse } from "next/server";
import { buildMockSummary } from "@/lib/ingest-mock";
import { tryParseWithService } from "@/lib/ingest-parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("demo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing demo file" }, { status: 400 });
  }

  const summary = (await tryParseWithService(file)) || buildMockSummary(file.name, file.size);
  return NextResponse.json(summary);
}
