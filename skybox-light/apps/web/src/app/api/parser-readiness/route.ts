import { NextResponse } from "next/server";
import { checkLegacyPythonReadiness } from "@/lib/legacy-python";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await checkLegacyPythonReadiness();
  return NextResponse.json(readiness);
}
