import { createHash, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { enrichMatchSummary } from "@/lib/match-enrichment";
import type { MatchSummary, PlayerSummary } from "@/lib/types";

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

export function normalizeParserSummary(summary: ParserSummary, fileName: string): MatchSummary {
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

async function writeUploadedDemo(file: File) {
  const uploadDir = path.join(process.cwd(), ".tmp", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const localName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const localPath = path.join(uploadDir, localName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(localPath, buffer);
  return localPath;
}

export async function tryParseWithService(file: File): Promise<MatchSummary | null> {
  const parserBaseUrl = process.env.PARSER_SERVICE_URL || "http://127.0.0.1:8081";
  let localPath: string | null = null;

  try {
    localPath = await writeUploadedDemo(file);

    const response = await fetch(`${parserBaseUrl}/parse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ demoPath: localPath }),
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ParserSummary;
    return normalizeParserSummary(payload, file.name);
  } catch {
    return null;
  } finally {
    if (localPath) {
      await rm(localPath, { force: true }).catch(() => undefined);
    }
  }
}
