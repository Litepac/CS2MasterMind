import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { EventKind, MatchEvent, MatchSummary, ReplayData, ReplayFramePlayer, ReplayPlayer, ReplayRound } from "@/lib/types";

const execFileAsync = promisify(execFile);

type LegacyPlayer = {
  name?: string;
  team?: number;
  steamid?: string;
};

type LegacyTimelineEvent = {
  kind?: string;
  tick?: number;
  round?: number;
  label?: string;
  accent?: string;
};

type LegacyKill = {
  tick?: number;
  round?: number;
  attacker?: string;
  victim?: string;
  weapon?: string;
  hs?: boolean;
};

type LegacyUtility = {
  type?: string;
  tick?: number;
  end_tick?: number;
  round?: number;
  player?: string;
};

type LegacyBomb = {
  type?: string;
  tick?: number;
  round?: number;
  player?: string;
};

type LegacyRound = {
  round?: number;
  start?: number;
  freeze_end?: number;
  end?: number;
  plant_tick?: number;
  defuse_tick?: number;
  winner_side?: string;
  winner_team?: string;
  win_reason?: string;
  score_ct?: number;
  score_t?: number;
  kill_count?: number;
  utility_count?: number;
  bomb_event_count?: number;
};

type LegacyReplay = {
  demo?: string;
  map?: string;
  sample_rate?: number;
  ticks_per_sec?: number;
  players?: LegacyPlayer[];
  rounds?: Record<string, LegacyRound>;
  kills?: LegacyKill[];
  utility?: LegacyUtility[];
  bomb_events?: LegacyBomb[];
  timeline?: LegacyTimelineEvent[];
  frames?: Record<string, ReplayFramePlayer[]>;
};

export type ParserReadiness = {
  ready: boolean;
  launcher: string | null;
  missing: string[];
  detail: string;
};

function normalizeSide(team: number | string | undefined): "CT" | "T" {
  const raw = String(team ?? "").toLowerCase();
  if (raw === "3" || raw === "ct") return "CT";
  return "T";
}

function normalizeKind(kind: string | undefined): EventKind | null {
  switch ((kind || "").toLowerCase()) {
    case "kill":
      return "kill";
    case "smoke":
      return "smoke";
    case "flash":
      return "flash";
    case "he":
      return "he";
    case "molotov":
      return "molotov";
    case "plant":
      return "plant";
    case "defuse":
      return "defuse";
    case "bomb_exploded":
      return "bomb_exploded";
    default:
      return null;
  }
}

function headlineForRound(winner: "CT" | "T", reason: string) {
  const normalized = reason.toLowerCase();
  if (normalized.includes("bomb_defused")) return "Retake succeeds";
  if (normalized.includes("bomb_exploded")) return "Post-plant converts";
  if (normalized.includes("time")) return winner === "CT" ? "Defense holds on time" : "Round closes on time";
  if (normalized.includes("ct_killed")) return "Exec lands";
  if (normalized.includes("t_killed")) return "Defense holds";
  return winner === "CT" ? "Defense holds" : "Exec lands";
}

function labelForRound(winner: "CT" | "T", reason: string) {
  const normalized = reason.toLowerCase();
  if (normalized.includes("bomb_defused")) return "CT defuse";
  if (normalized.includes("bomb_exploded")) return "T bomb";
  return winner === "CT" ? "CT hold" : "T convert";
}

function mapImageUrl(mapName: string) {
  return `https://raw.githubusercontent.com/2mlml/cs2-radar-images/master/${mapName}.png`;
}

function getPythonCandidates() {
  const explicit = process.env.PYTHON_EXECUTABLE?.trim();
  const candidates = [
    explicit ? { cmd: explicit, args: [] as string[], label: explicit } : null,
    { cmd: "py", args: ["-3.12"] as string[], label: "py -3.12" },
    { cmd: "py", args: ["-3"] as string[], label: "py -3" },
    { cmd: "python", args: [] as string[], label: "python" }
  ].filter(Boolean) as Array<{ cmd: string; args: string[]; label: string }>;

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.cmd}|${candidate.args.join(" ")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function runExporter(demoPath: string, outputPath: string) {
  const exporterPath = path.resolve(process.cwd(), "..", "..", "..", "legacy-prototype", "viewer_export.py");
  const commands = getPythonCandidates().map((candidate) => ({
    cmd: candidate.cmd,
    args: [...candidate.args, exporterPath, demoPath, "-o", outputPath],
    label: candidate.label
  }));

  for (const candidate of commands) {
    try {
      const result = await execFileAsync(candidate.cmd, candidate.args, {
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 16
      });
      return { ok: true as const, command: `${candidate.label} ${candidate.args.join(" ")}`, stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown process failure";
      const stderr = typeof error === "object" && error && "stderr" in error ? String((error as { stderr?: string }).stderr || "") : "";
      const stdout = typeof error === "object" && error && "stdout" in error ? String((error as { stdout?: string }).stdout || "") : "";
      if (stderr || stdout) {
        return {
          ok: false as const,
          command: `${candidate.label} ${candidate.args.join(" ")}`,
          stdout,
          stderr: stderr || message
        };
      }
    }
  }

  return {
    ok: false as const,
    command: "py/python",
    stdout: "",
    stderr: "No Python launcher was able to execute viewer_export.py"
  };
}

async function runPythonCheck(command: string, args: string[]) {
  try {
    const result = await execFileAsync(command, args, {
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 4
    });
    return {
      ok: true as const,
      stdout: String(result.stdout || "").trim(),
      stderr: String(result.stderr || "").trim()
    };
  } catch (error) {
    return {
      ok: false as const,
      stdout: typeof error === "object" && error && "stdout" in error ? String((error as { stdout?: string }).stdout || "").trim() : "",
      stderr: typeof error === "object" && error && "stderr" in error ? String((error as { stderr?: string }).stderr || "").trim() : error instanceof Error ? error.message : "Unknown process failure"
    };
  }
}

function normalizePlayers(players: LegacyPlayer[] | undefined, kills: LegacyKill[] | undefined): ReplayPlayer[] {
  const killList = kills || [];
  return (players || []).map((player, index) => ({
    id: player.steamid || `legacy-${index}`,
    name: player.name || `Player ${index + 1}`,
    side: normalizeSide(player.team)
  }));
}

function buildPlayerStats(replayPlayers: ReplayPlayer[], kills: LegacyKill[] | undefined) {
  const killList = kills || [];
  return replayPlayers.map((player) => {
    const playerKills = killList.filter((event) => event.attacker === player.name).length;
    const playerDeaths = killList.filter((event) => event.victim === player.name).length;
    return {
      id: player.id,
      name: player.name,
      side: player.side,
      kills: playerKills,
      deaths: playerDeaths,
      adr: 0
    };
  });
}

function normalizeTimelineEvent(
  id: string,
  roundNumber: number,
  tick: number,
  kind: EventKind,
  player: string,
  side: "CT" | "T",
  note: string
): MatchEvent {
  return {
    id,
    roundNumber,
    tick,
    kind,
    player,
    side,
    note
  };
}

function guessSideFromPlayer(playerSide: Map<string, "CT" | "T">, player: string, fallback: "CT" | "T" = "CT") {
  return playerSide.get(player) || fallback;
}

function extractPlayerFromLabel(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return "Unknown";
  if (trimmed.includes("->")) {
    return trimmed.split("->")[0].trim();
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1) {
    const last = parts[parts.length - 1].toLowerCase();
    if (["smoke", "molotov", "flash", "he", "plant", "defuse"].includes(last)) {
      return parts.slice(0, -1).join(" ");
    }
  }
  return trimmed;
}

function compressUtilityEvents(rawUtility: LegacyUtility[]) {
  const sorted = [...rawUtility].sort((left, right) => {
    return Number(left.round || 0) - Number(right.round || 0) ||
      String(left.player || "").localeCompare(String(right.player || "")) ||
      String(left.type || "").localeCompare(String(right.type || "")) ||
      Number(left.tick || 0) - Number(right.tick || 0);
  });

  const compressed: Array<LegacyUtility & { tick: number; end_tick: number }> = [];

  for (const event of sorted) {
    const round = Number(event.round || 0);
    const type = String(event.type || "");
    const player = String(event.player || "");
    const tick = Number(event.tick || 0);
    const endTick = Number(event.end_tick ?? event.tick ?? 0);
    const previous = compressed[compressed.length - 1];

    const canMerge =
      previous &&
      Number(previous.round || 0) === round &&
      String(previous.type || "") === type &&
      String(previous.player || "") === player &&
      tick <= Number(previous.end_tick || previous.tick || 0) + 64;

    if (canMerge) {
      previous.end_tick = Math.max(Number(previous.end_tick || previous.tick || 0), endTick);
      continue;
    }

    compressed.push({
      ...event,
      round,
      tick,
      end_tick: Math.max(tick, endTick)
    });
  }

  return compressed;
}

function normalizeRounds(rounds: Record<string, LegacyRound> | undefined, kills: LegacyKill[] | undefined) {
  const replayRounds: Record<string, ReplayRound> = {};
  const roundsData: MatchSummary["roundsData"] = [];
  const sorted = Object.values(rounds || {}).sort((left, right) => Number(left.round || 0) - Number(right.round || 0));
  const killList = kills || [];

  for (const round of sorted) {
    const number = Number(round.round || 0);
    const winner = normalizeSide(round.winner_side || round.winner_team) as "CT" | "T";
    const openingKill = killList.find((event) => Number(event.round || 0) === number);
    replayRounds[String(number)] = {
      round: number,
      start: Number(round.start || 0),
      freeze_end: Number(round.freeze_end || 0),
      end: Number(round.end || 0),
      plant_tick: Number(round.plant_tick ?? -1),
      defuse_tick: Number(round.defuse_tick ?? -1),
      winner_side: winner,
      winner_team: String(round.winner_team || ""),
      win_reason: String(round.win_reason || ""),
      score_ct: Number(round.score_ct || 0),
      score_t: Number(round.score_t || 0),
      kill_count: Number(round.kill_count || 0),
      utility_count: Number(round.utility_count || 0),
      bomb_event_count: Number(round.bomb_event_count || 0)
    };
    roundsData.push({
      number,
      winner,
      scoreCT: Number(round.score_ct || 0),
      scoreT: Number(round.score_t || 0),
      label: labelForRound(winner, String(round.win_reason || "")),
      headline: headlineForRound(winner, String(round.win_reason || "")),
      startTick: Number(round.start || 0),
      endTick: Number(round.end || 0),
      openingKillId: openingKill ? `kill-${number}-${Number(openingKill.tick || 0)}` : null,
      utilityCount: Number(round.utility_count || 0)
    });
  }

  return { replayRounds, roundsData };
}

function buildEvents(replayPlayers: ReplayPlayer[], raw: LegacyReplay) {
  const playerSide = new Map(replayPlayers.map((player) => [player.name, player.side]));

  const killEvents = (raw.kills || []).map((kill) => {
    const roundNumber = Number(kill.round || 0);
    const player = String(kill.attacker || "Unknown");
    return normalizeTimelineEvent(
      `kill-${roundNumber}-${Number(kill.tick || 0)}`,
      roundNumber,
      Number(kill.tick || 0),
      "kill",
      player,
      guessSideFromPlayer(playerSide, player, "CT"),
      `${player} fragged ${String(kill.victim || "Unknown")} with ${String(kill.weapon || "weapon")}${kill.hs ? " (HS)" : ""}`
    );
  });

  const utilityEvents = compressUtilityEvents(raw.utility || []).map((event) => {
    const roundNumber = Number(event.round || 0);
    const player = String(event.player || "Unknown");
    const kind = normalizeKind(event.type);
    if (!kind) return null;
    return normalizeTimelineEvent(
      `${String(event.type || "utility")}-${roundNumber}-${Number(event.tick || 0)}-${player}`,
      roundNumber,
      Number(event.tick || 0),
      kind,
      player,
      guessSideFromPlayer(playerSide, player, "T"),
      `${player} used ${String(kind)} utility`
    );
  }).filter(Boolean) as MatchEvent[];

  const bombEvents = (raw.bomb_events || []).map((event) => {
    const roundNumber = Number(event.round || 0);
    const player = String(event.player || "Bomb");
    const kind = normalizeKind(event.type);
    if (!kind) return null;
    return normalizeTimelineEvent(
      `${String(event.type || "bomb")}-${roundNumber}-${Number(event.tick || 0)}`,
      roundNumber,
      Number(event.tick || 0),
      kind,
      player,
      "T",
      `${String(event.type || "bomb").replaceAll("_", " ")} event`
    );
  }).filter(Boolean) as MatchEvent[];

  const timelineSource = (raw.timeline || []).map((event, index) => {
    const kind = normalizeKind(event.kind || event.accent);
    if (!kind) return null;
    const roundNumber = Number(event.round || 0);
    const label = String(event.label || kind);
    const player = extractPlayerFromLabel(label);
    const fallbackSide = kind === "plant" || kind === "bomb_exploded" ? "T" : "CT";

    return normalizeTimelineEvent(
      `timeline-${roundNumber}-${Number(event.tick || 0)}-${index}`,
      roundNumber,
      Number(event.tick || 0),
      kind,
      player,
      guessSideFromPlayer(playerSide, player, fallbackSide),
      label
    );
  }).filter(Boolean) as MatchEvent[];

  const timelineBase = timelineSource.length ? timelineSource : [...killEvents, ...utilityEvents, ...bombEvents];
  const dedupe = new Map<string, MatchEvent>();
  for (const event of timelineBase) {
    const key = `${event.roundNumber}:${event.tick}:${event.kind}:${event.player}:${event.note}`;
    if (!dedupe.has(key)) {
      dedupe.set(key, event);
    }
  }
  const timeline = [...dedupe.values()].sort((left, right) => left.tick - right.tick || left.kind.localeCompare(right.kind));

  return { killEvents, utilityEvents, bombEvents, timeline };
}

function buildReplayData(matchId: string, raw: LegacyReplay) {
  const players = normalizePlayers(raw.players, raw.kills);
  const { replayRounds, roundsData } = normalizeRounds(raw.rounds, raw.kills);
  const { killEvents, utilityEvents, bombEvents, timeline } = buildEvents(players, raw);

  const replay: ReplayData = {
    id: matchId,
    demo: String(raw.demo || "demo"),
    map: String(raw.map || "de_overpass"),
    mapImageUrl: mapImageUrl(String(raw.map || "de_overpass")),
    sampleRate: Number(raw.sample_rate || 4),
    ticksPerSec: Number(raw.ticks_per_sec || 64),
    players,
    rounds: replayRounds,
    kills: killEvents,
    utility: utilityEvents,
    bombEvents,
    timeline,
    frames: raw.frames || {}
  };

  return { replay, roundsData };
}

function buildSummaryEvents(events: MatchEvent[]) {
  const byRound = new Map<number, MatchEvent[]>();
  for (const event of events) {
    const bucket = byRound.get(event.roundNumber) || [];
    bucket.push(event);
    byRound.set(event.roundNumber, bucket);
  }

  return [...byRound.values()].flatMap((roundEvents) => {
    const ordered = [...roundEvents].sort((left, right) => left.tick - right.tick);
    const utility = ordered.find((event) => event.kind !== "kill");
    const kill = ordered.find((event) => event.kind === "kill");
    const plant = ordered.find((event) => event.kind === "plant");
    return [utility, kill, plant].filter(Boolean) as MatchEvent[];
  });
}

async function writeReplayCache(replay: ReplayData) {
  const replayDir = path.join(process.cwd(), ".tmp", "replays");
  await mkdir(replayDir, { recursive: true });
  const replayPath = path.join(replayDir, `${replay.id}.json`);
  await writeFile(replayPath, JSON.stringify(replay), "utf8");
}

async function normalizeLegacyReplay(raw: LegacyReplay, fileName: string, sourcePath?: string) {
  const baseId = createHash("sha1")
    .update(`${fileName}:${String(raw.map || "unknown")}:${Object.keys(raw.frames || {}).length}`)
    .digest("hex")
    .slice(0, 12);
  const matchId = `legacy_${baseId}`;
  const { replay, roundsData } = buildReplayData(matchId, raw);
  const playerStats = buildPlayerStats(replay.players, raw.kills);
  const lastRound = roundsData[roundsData.length - 1];

  await writeReplayCache(replay);

  const summary: MatchSummary = {
    id: matchId,
    replayId: matchId,
    demoName: fileName,
    sourcePath,
    mapName: replay.map,
    mapImageUrl: replay.mapImageUrl,
    score: `${lastRound?.scoreCT ?? 0}-${lastRound?.scoreT ?? 0}`,
    rounds: roundsData.length,
    ticks: Math.max(...Object.keys(replay.frames).map((tick) => Number(tick)), 0),
    uploadedAt: new Date().toISOString(),
    status: "parsed",
    source: "legacy-python",
    players: playerStats,
    roundsData,
    events: buildSummaryEvents(replay.timeline)
  };

  return summary;
}

export async function importLegacyReplayText(rawText: string, fileName: string, sourcePath?: string) {
  const raw = JSON.parse(rawText) as LegacyReplay;
  return normalizeLegacyReplay(raw, fileName, sourcePath);
}

export async function tryParseWithLegacyPython(demoPath: string, fileName: string) {
  const tempDir = path.join(process.cwd(), ".tmp", "legacy");
  await mkdir(tempDir, { recursive: true });
  const outputPath = path.join(tempDir, `${createHash("sha1").update(`${fileName}:${Date.now()}`).digest("hex").slice(0, 12)}.viewer.json`);

  try {
    const result = await runExporter(demoPath, outputPath);
    if (!result.ok) {
      return {
        summary: null,
        error: `${result.command}\n${result.stderr || result.stdout || "Legacy exporter failed"}`
      };
    }

    const rawText = await readFile(outputPath, "utf8");
    const summary = await importLegacyReplayText(rawText, fileName, demoPath);
    return { summary, error: null };
  } catch (error) {
    return {
      summary: null,
      error: error instanceof Error ? error.message : "Unknown legacy parser error"
    };
  } finally {
    await rm(outputPath, { force: true }).catch(() => undefined);
  }
}

export async function checkLegacyPythonReadiness(): Promise<ParserReadiness> {
  const readinessScript = [
    "import importlib.util",
    "missing=[]",
    "if importlib.util.find_spec('pandas') is None: missing.append('pandas')",
    "awpy_demo_ok = False",
    "try:",
    "    from awpy import Demo as _Demo",
    "    awpy_demo_ok = True",
    "except Exception:",
    "    try:",
    "        from awpy.demo import Demo as _Demo",
    "        awpy_demo_ok = True",
    "    except Exception:",
    "        missing.append('awpy:Demo')",
    "print('OK' if not missing else 'MISSING:' + ','.join(missing))"
  ].join("\n");

  const checks = getPythonCandidates().map((candidate) => ({
    launcher: candidate.label,
    command: candidate.cmd,
    args: [...candidate.args, "-c", readinessScript]
  }));

  for (const check of checks) {
    const result = await runPythonCheck(check.command, check.args);
    const combined = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

    if (!result.ok) {
      continue;
    }

    if (result.stdout === "OK") {
      return {
        ready: true,
        launcher: check.launcher,
        missing: [],
        detail: `Ready via ${check.launcher}`
      };
    }

    if (result.stdout.startsWith("MISSING:")) {
      const missing = result.stdout.replace("MISSING:", "").split(",").map((part) => part.trim()).filter(Boolean);
      return {
        ready: false,
        launcher: check.launcher,
        missing,
        detail: `${check.launcher} is available, but missing: ${missing.join(", ")}`
      };
    }

    return {
      ready: false,
      launcher: check.launcher,
      missing: [],
      detail: combined || `Unexpected readiness output from ${check.launcher}`
    };
  }

  return {
    ready: false,
    launcher: null,
    missing: ["python-launcher"],
    detail: "No working Python launcher was found. The app could not execute `py -3` or `python`."
  };
}
