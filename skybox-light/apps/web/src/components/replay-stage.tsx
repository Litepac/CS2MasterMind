"use client";

import { useEffect, useMemo, useState } from "react";
import type { MatchSummary } from "@/lib/types";
import type { RoundPreview, TimelinePreview } from "@/lib/match-view";

type ReplayStageProps = {
  match: MatchSummary;
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
  return "#cbd5e1";
}

export function ReplayStage({ match, selectedRound, selectedEvent, labels }: ReplayStageProps) {
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

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current >= FRAME_COUNT - 1 ? 0 : current + 1));
    }, 260);
    return () => window.clearInterval(timer);
  }, [playing]);

  const players = useMemo(
    () =>
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
          y
        };
      }),
    [frameIndex, match.players, selectedRound]
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

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-line bg-[radial-gradient(circle_at_top,rgba(24,247,201,0.08),transparent_24%),linear-gradient(180deg,#081019_0%,#04080d_100%)] p-3">
      <div className="aspect-[1.25/0.72] rounded-[16px] border border-line bg-[#070d13]">
        <div className="relative h-full w-full">
          <div className="absolute inset-[10%] rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent)]" />
          <div className="absolute left-[16%] top-[20%] h-14 w-20 rounded-[16px] border border-white/10 bg-white/5" />
          <div className="absolute right-[16%] top-[16%] h-16 w-24 rounded-[16px] border border-white/10 bg-white/5" />
          <div className="absolute left-[30%] bottom-[16%] h-16 w-28 rounded-[16px] border border-white/10 bg-white/5" />
          <div className="absolute right-[18%] bottom-[20%] h-14 w-20 rounded-[16px] border border-white/10 bg-white/5" />

          {labels.map((label, index) => (
            <div
              key={label}
              className="absolute rounded-full border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-300"
              style={{
                left: `${16 + index * 14}%`,
                top: `${18 + (index % 2) * 24}%`
              }}
            >
              {label}
            </div>
          ))}

          {players.map((player) => (
            <div
              key={player.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
              style={{ left: `${player.x}%`, top: `${player.y}%` }}
            >
              <div
                className="h-3.5 w-3.5 rounded-full border border-black/40"
                style={{ backgroundColor: sideColor(player.side) }}
              />
              <div className="mt-1 whitespace-nowrap rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {player.name}
              </div>
            </div>
          ))}
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
              "This is a replay module shell. It already has round state, playback controls and a central stage ready for real player coordinates from the parser."}
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
            Frame {frameIndex + 1}/{FRAME_COUNT}
          </div>
        </div>

        <input
          className="mt-4 w-full accent-[#18f7c9]"
          max={FRAME_COUNT - 1}
          min={0}
          onChange={(event) => setFrameIndex(Number(event.target.value))}
          type="range"
          value={frameIndex}
        />
      </div>
    </div>
  );
}
