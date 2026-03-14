import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { enrichMatchSummary } from "@/lib/match-enrichment";
import type { MatchSummary, PlayerSummary } from "@/lib/types";
import { ensureIncomingDemosDir, incomingDemosDir } from "@/lib/workspace-paths";

type ParserPlayer = {
  name?: string;
  steam?: string;
  side?: string;
  kills?: number;
  deaths?: number;
  adr?: number;
};

type ParserSummary = {
  id?: string;
  demo_name?: string;
  map?: string;
  rounds?: number;
  ticks?: number;
  parsed_at?: string;
  players?: ParserPlayer[];
};

function normalizeSide(value: string | undefined, index: number): "CT" | "T" {
  if (value?.toUpperCase() === "CT") return "CT";
  if (value?.toUpperCase() === "T") return "T";
  return index % 2 === 0 ? "CT" : "T";
}

function parseScoreFromPlayers(players: PlayerSummary[]) {
  const ctFragPower = players
    .filter((player) => player.side === "CT")
    .reduce((sum, player) => sum + player.kills, 0);
  const tFragPower = players
    .filter((player) => player.side === "T")
    .reduce((sum, player) => sum + player.kills, 0);

  const total = Math.max(ctFragPower + tFragPower, 1);
  const ctRounds = Math.max(0, Math.min(13, Math.round((ctFragPower / total) * 13)));
  const tRounds = Math.max(0, Math.min(13, 13 - ctRounds));
  return `${ctRounds}-${tRounds}`;
}

export function normalizeParserSummary(summary: ParserSummary, fileName: string, sourcePath?: string): MatchSummary {
  const players: PlayerSummary[] = (summary.players || []).map((player, index) => ({
    id: player.steam || `${summary.id || "parser"}-${index}`,
    name: player.name || `Player ${index + 1}`,
    side: normalizeSide(player.side, index),
    kills: player.kills || 0,
    deaths: player.deaths || 0,
    adr: Number((player.adr || 0).toFixed(1))
  }));

  const fallbackId = createHash("sha1")
    .update(`${fileName}:${summary.map || "unknown"}:${summary.ticks || 0}`)
    .digest("hex")
    .slice(0, 12);

  return enrichMatchSummary({
    id: summary.id || `parser_${fallbackId}`,
    demoName: summary.demo_name || fileName,
    sourcePath,
    mapName: summary.map || "unknown_map",
    score: parseScoreFromPlayers(players),
    rounds: summary.rounds || 0,
    ticks: summary.ticks || 0,
    uploadedAt: summary.parsed_at || new Date().toISOString(),
    status: "parsed",
    source: "parser-go",
    players
  });
}

export async function writeUploadedDemo(file: File) {
  await ensureIncomingDemosDir();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const localName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const localPath = path.join(incomingDemosDir, localName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(localPath, buffer);
  return localPath;
}

export async function tryParseWithServicePath(demoPath: string, fileName: string): Promise<MatchSummary | null> {
  const parserBaseUrl = process.env.PARSER_SERVICE_URL || "http://127.0.0.1:8081";

  try {
    const response = await fetch(`${parserBaseUrl}/parse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ demoPath }),
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ParserSummary;
    return normalizeParserSummary(payload, fileName, demoPath);
  } catch {
    return null;
  }
}

export async function tryParseWithService(file: File): Promise<MatchSummary | null> {
  const localPath = await writeUploadedDemo(file);
  return tryParseWithServicePath(localPath, file.name);
}
