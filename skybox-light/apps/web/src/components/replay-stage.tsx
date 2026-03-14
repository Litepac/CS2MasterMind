"use client";

import { useEffect, useMemo, useState } from "react";
import type { MatchSummary, ReplayData, ReplayFramePlayer } from "@/lib/types";
import type { RoundPreview, TimelinePreview } from "@/lib/match-view";

type ReplayStageProps = {
  match: MatchSummary;
  replay: ReplayData | null;
  selectedRound: RoundPreview | null;
  selectedEvent: TimelinePreview | null;
  labels: string[];
};

const FRAME_COUNT = 36;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sideColor(side: "CT" | "T") {
  return side === "CT" ? "#57b9ff" : "#f39b55";
}

function kindColor(kind: TimelinePreview["kind"]) {
  if (kind === "kill") return "#ff6b6b";
  if (kind === "flash") return "#facc15";
  if (kind === "plant") return "#34d399";
  if (kind === "molotov") return "#fb923c";
  if (kind === "he") return "#f97316";
  if (kind === "defuse") return "#67e8f9";
  return "#cbd5e1";
}

function findNearestFrameIndex(frameTicks: number[], targetTick: number) {
  if (!frameTicks.length) return 0;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  frameTicks.forEach((tick, index) => {
    const distance = Math.abs(tick - targetTick);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function extractKillVictim(note: string, fallbackPlayer: string) {
  const fragMatch = note.match(/fragged\s+(.+?)\s+with/i);
  if (fragMatch?.[1]) {
    return fragMatch[1].trim();
  }

  const arrowMatch = note.match(/(.+?)\s*->\s*(.+)/);
  if (arrowMatch?.[2]) {
    return arrowMatch[2].trim();
  }

  if (fallbackPlayer.includes("->")) {
    return fallbackPlayer.split("->")[1].trim();
  }

  return null;
}

export function ReplayStage({ match, replay, selectedRound, selectedEvent, labels }: ReplayStageProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const roundNumber = selectedRound?.number ?? 1;
  const roundWinner = selectedRound?.winner ?? "CT";
  const scoreCT = selectedRound?.scoreCT ?? 0;
  const scoreT = selectedRound?.scoreT ?? 0;

  useEffect(() => {
    setFrameIndex(0);
    setPlaying(false);
  }, [selectedRound?.number]);

  const roundTickRange = useMemo(() => {
    if (!replay || !selectedRound) return [];
    const roundMeta = replay.rounds[String(selectedRound.number)];
    if (!roundMeta) return [];
    return Object.keys(replay.frames)
      .map(Number)
      .filter((tick) => tick >= roundMeta.start && tick <= roundMeta.end)
      .sort((left, right) => left - right);
  }, [replay, selectedRound]);

  const visibleFrameTicks = roundTickRange.length ? roundTickRange : Array.from({ length: FRAME_COUNT }, (_, index) => index);
  const maxFrameIndex = Math.max(visibleFrameTicks.length - 1, 0);

  useEffect(() => {
    setFrameIndex((current) => clamp(current, 0, maxFrameIndex));
  }, [maxFrameIndex]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current >= maxFrameIndex ? 0 : current + 1));
    }, 260);
    return () => window.clearInterval(timer);
  }, [maxFrameIndex, playing]);

  useEffect(() => {
    if (!selectedEvent || !visibleFrameTicks.length) return;
    setFrameIndex(findNearestFrameIndex(visibleFrameTicks, selectedEvent.tick));
  }, [selectedEvent?.id, selectedEvent?.tick, visibleFrameTicks]);

  const replayPlayers = useMemo(() => {
    if (!replay || !visibleFrameTicks.length) return null;
    const currentTick = visibleFrameTicks[Math.min(frameIndex, maxFrameIndex)];
    const frame = replay.frames[String(currentTick)] || [];
    return frame
      .map((entry: ReplayFramePlayer) => {
        const player = replay.players[entry[0]];
        if (!player) return null;
        return {
          id: player.id,
          name: player.name,
          side: player.side,
          x: clamp(entry[1] * 100, 2, 98),
          y: clamp(entry[2] * 100, 2, 98),
          alive: entry[3] === 1
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; side: "CT" | "T"; x: number; y: number; alive: boolean }>;
  }, [frameIndex, maxFrameIndex, replay, visibleFrameTicks]);

  const players = useMemo(
    () =>
      replayPlayers ||
      match.players.map((player, index) => {
        const sideShift = player.side === "CT" ? 0 : 1;
        const baseX = player.side === "CT" ? 22 + (index % 2) * 15 : 58 + (index % 2) * 10;
        const baseY = 18 + (index % 4) * 15;
        const drift = selectedRound ? selectedRound.number * 0.7 : 1;
        const x = clamp(baseX + Math.sin((frameIndex + index + sideShift) / 5) * 9 + drift, 8, 88);
        const y = clamp(baseY + Math.cos((frameIndex + index * 2) / 6) * 8, 10, 82);

        return {
          id: player.id,
          name: player.name,
          side: player.side,
          x,
          y,
          alive: true
        };
      }),
    [frameIndex, match.players, replayPlayers, selectedRound]
  );

  const eventLabel = useMemo(() => {
    if (selectedEvent) {
      return `${selectedEvent.player} ${selectedEvent.kind} on ${selectedEvent.side} side`;
    }
    if (!selectedRound) return "No round selected";
    if (frameIndex < 10) return "Default and early map control";
    if (frameIndex < 20) {
      return selectedRound.winner === "CT" ? "Defensive setup holds" : "T side pressure builds";
    }
    if (frameIndex < 30) {
      return selectedRound.winner === "CT" ? "CT retake pressure" : "Site hit and conversion";
    }
    return "Late-round cleanup";
  }, [frameIndex, selectedEvent, selectedRound]);

  const currentTick = visibleFrameTicks[Math.min(frameIndex, maxFrameIndex)] || selectedEvent?.tick || 0;
  const usingRealReplay = Boolean(replay && replayPlayers);

  const focusedNames = useMemo(() => {
    const names = new Set<string>();
    if (!selectedEvent) return names;
    names.add(selectedEvent.player);
    if (selectedEvent.kind === "kill") {
      const victim = extractKillVictim(selectedEvent.note, selectedEvent.player);
      if (victim) names.add(victim);
    }
    return names;
  }, [selectedEvent]);

  const focusedPlayers = useMemo(() => {
    return players.filter((player) => focusedNames.has(player.name));
  }, [focusedNames, players]);

  const killLine = useMemo(() => {
    if (!selectedEvent || selectedEvent.kind !== "kill" || focusedPlayers.length < 2) return null;
    const attacker = focusedPlayers.find((player) => player.name === selectedEvent.player) || focusedPlayers[0];
    const victimName = extractKillVictim(selectedEvent.note, selectedEvent.player);
    const victim = focusedPlayers.find((player) => player.name === victimName) || focusedPlayers.find((player) => player !== attacker);
    if (!attacker || !victim) return null;

    const dx = victim.x - attacker.x;
    const dy = victim.y - attacker.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return {
      left: attacker.x,
      top: attacker.y,
      length,
      angle
    };
  }, [focusedPlayers, selectedEvent]);

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-line bg-[radial-gradient(circle_at_top,rgba(24,247,201,0.08),transparent_24%),linear-gradient(180deg,#081019_0%,#04080d_100%)] p-3">
      <div className="aspect-[1.25/0.72] rounded-[16px] border border-line bg-[#070d13]">
        <div className="relative h-full w-full">
          {replay?.mapImageUrl ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center opacity-70"
                style={{ backgroundImage: `url(${replay.mapImageUrl})` }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,14,0.2),rgba(3,8,14,0.5))]" />
            </>
          ) : (
            <>
              <div className="absolute inset-[10%] rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent)]" />
              <div className="absolute left-[16%] top-[20%] h-14 w-20 rounded-[16px] border border-white/10 bg-white/5" />
              <div className="absolute right-[16%] top-[16%] h-16 w-24 rounded-[16px] border border-white/10 bg-white/5" />
              <div className="absolute left-[30%] bottom-[16%] h-16 w-28 rounded-[16px] border border-white/10 bg-white/5" />
              <div className="absolute right-[18%] bottom-[20%] h-14 w-20 rounded-[16px] border border-white/10 bg-white/5" />
            </>
          )}

          {labels.map((label, index) => (
            <div
              key={label}
              className="absolute rounded-full border border-white/10 bg-black/45 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-slate-400"
              style={{
                left: `${16 + index * 14}%`,
                top: `${18 + (index % 2) * 24}%`
              }}
            >
              {label}
            </div>
          ))}

          {selectedEvent ? (
            <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/55 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-200">
              {selectedEvent.kind} • tick {selectedEvent.tick}
            </div>
          ) : null}

          {killLine ? (
            <div
              className="absolute h-[2px] origin-left rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.6)]"
              style={{
                left: `${killLine.left}%`,
                top: `${killLine.top}%`,
                width: `${killLine.length}%`,
                transform: `rotate(${killLine.angle}deg)`
              }}
            />
          ) : null}

          {focusedPlayers.map((player) => (
            <div
              key={`${player.id}-focus`}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border animate-pulse"
              style={{
                left: `${player.x}%`,
                top: `${player.y}%`,
                width: selectedEvent?.kind === "kill" ? "28px" : "42px",
                height: selectedEvent?.kind === "kill" ? "28px" : "42px",
                borderColor: kindColor(selectedEvent?.kind || "flash"),
                boxShadow: `0 0 0 6px ${kindColor(selectedEvent?.kind || "flash")}22`
              }}
            />
          ))}

          {players.map((player, index) => {
            const focused = focusedNames.has(player.name);
            const showLabel = focused || !usingRealReplay || (!selectedEvent && index < 2);

            return (
            <div
              key={player.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
              style={{ left: `${player.x}%`, top: `${player.y}%` }}
            >
              <div
                className="rounded-full border border-black/40 shadow-[0_0_0_4px_rgba(0,0,0,0.14)]"
                style={{
                  width: focused ? "16px" : "12px",
                  height: focused ? "16px" : "12px",
                  backgroundColor: sideColor(player.side),
                  opacity: player.alive ? 1 : 0.35
                }}
              />
              {showLabel ? (
                <div
                  className={`mt-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    focused ? "bg-black/80 text-white" : "bg-black/55 text-slate-200"
                  }`}
                >
                  {player.name}
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px]">
        <div className="rounded-[16px] border border-line bg-ink/80 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Replay event
          </div>
          <div className="mt-2 text-base font-semibold">{eventLabel}</div>
          <div className="mt-2 text-xs text-slate-400">
            {selectedEvent?.note ||
              (usingRealReplay
                ? "Replay is using real frame coordinates and the actual radar image for this map."
                : "This is still the replay shell fallback. Real player coordinates will replace this once parser data is available.")}
          </div>
          {selectedEvent ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-300">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: kindColor(selectedEvent.kind) }}
              />
              Focused event: {selectedEvent.kind} at tick {selectedEvent.tick}
            </div>
          ) : null}
        </div>

        <div className="rounded-[16px] border border-line bg-ink/80 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Selected round
          </div>
          <div className="mt-2 text-2xl font-bold">R{roundNumber}</div>
          <div className="mt-1 text-xs text-slate-400">
            {roundWinner} win, score {scoreCT}-{scoreT}
          </div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Tick {currentTick}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-[16px] border border-line bg-ink/80 p-3">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-accent"
            onClick={() => setPlaying((value) => !value)}
            type="button"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            className="rounded-lg border border-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-300"
            onClick={() => setFrameIndex((value) => clamp(value - 1, 0, FRAME_COUNT - 1))}
            type="button"
          >
            -1
          </button>
          <button
            className="rounded-lg border border-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-300"
            onClick={() => setFrameIndex((value) => clamp(value + 1, 0, FRAME_COUNT - 1))}
            type="button"
          >
            +1
          </button>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Frame {Math.min(frameIndex + 1, maxFrameIndex + 1)}/{maxFrameIndex + 1}
          </div>
        </div>

        <input
          className="mt-4 w-full accent-[#18f7c9]"
          max={maxFrameIndex}
          min={0}
          onChange={(event) => setFrameIndex(Number(event.target.value))}
          type="range"
          value={frameIndex}
        />
      </div>
    </div>
  );
}
