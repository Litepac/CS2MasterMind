import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const replayPath = path.join(process.cwd(), ".tmp", "replays", `${id}.json`);

  try {
    const payload = await readFile(replayPath, "utf8");
    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Replay not found" }, { status: 404 });
  }
}
