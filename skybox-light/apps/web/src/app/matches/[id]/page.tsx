"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ReplayStage } from "@/components/replay-stage";
import { Shell } from "@/components/shell";
import { getMatchById } from "@/lib/match-store";
import { buildRounds, buildTimeline, splitPlayers } from "@/lib/match-view";
import type { ReplayData } from "@/lib/types";

const MAP_LABELS: Record<string, string[]> = {
  de_overpass: ["A site", "B site", "Short", "Heaven", "Fountain"],
  de_mirage: ["A site", "B site", "Mid", "Connector", "Palace"],
  de_inferno: ["A site", "B site", "Banana", "Arch", "Pit"],
  de_anubis: ["A site", "B site", "Mid", "Heaven", "Bridge"]
};

const EVENT_COLORS = {
  kill: "bg-red-400",
  smoke: "bg-slate-300",
  flash: "bg-yellow-300",
  he: "bg-orange-400",
  molotov: "bg-amber-500",
  plant: "bg-emerald-300",
  defuse: "bg-cyan-300",
  bomb_exploded: "bg-emerald-400"
};

export default function MatchDetailsPage() {
  const params = useParams<{ id: string }>();
  const match = useMemo(() => getMatchById(params.id), [params.id]);
  const rounds = useMemo(() => (match ? buildRounds(match) : []), [match]);
  const [selectedRoundNumber, setSelectedRoundNumber] = useState(1);
  const [replay, setReplay] = useState<ReplayData | null>(null);

  const selectedRound = useMemo(
    () => rounds.find((round) => round.number === selectedRoundNumber) || rounds[0] || null,
    [rounds, selectedRoundNumber]
  );
  const teams = useMemo(() => (match ? splitPlayers(match) : { ct: [], t: [] }), [match]);
  const labels = match ? MAP_LABELS[match.mapName] || ["A site", "B site", "Mid"] : [];
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReplay() {
      if (!match?.replayId) {
        setReplay(null);
        return;
      }

      try {
        const response = await fetch(`/api/replay/${match.replayId}`, { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setReplay(null);
          return;
        }
        const payload = (await response.json()) as ReplayData;
        if (!cancelled) setReplay(payload);
      } catch {
        if (!cancelled) setReplay(null);
      }
    }

    void loadReplay();
    return () => {
      cancelled = true;
    };
  }, [match?.replayId]);

  const timeline = useMemo(() => {
    if (replay) {
      return replay.timeline;
    }
    return match ? buildTimeline(match) : [];
  }, [match, replay]);
  const roundEvents = useMemo(
    () => timeline.filter((event) => event.roundNumber === selectedRound?.number),
    [selectedRound?.number, timeline]
  );
  const selectedEvent = useMemo(
    () => roundEvents.find((event) => event.id === selectedEventId) || roundEvents[0] || null,
    [roundEvents, selectedEventId]
  );
  const selectedRoundMeta = replay?.rounds[String(selectedRound?.number || 0)] || null;

  if (!match) {
    return (
      <Shell>
        <div className="rounded-3xl border border-line bg-panel/90 p-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">
            Match not found
          </div>
          <div className="mt-4 text-4xl font-bold">No stored match for `{params.id}`</div>
          <div className="mt-3 text-slate-300">
            Parse a demo first from the home page so the match gets stored in local browser state.
          </div>
          <Link
            className="mt-6 inline-flex rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-accent"
            href="/"
          >
            Back to dashboard
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid gap-3">
        <section className="rounded-[20px] border border-line bg-panel/90 p-3 shadow-2xl">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                Match report
              </div>
              <div className="mt-1 text-3xl font-bold">{match.mapName}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {match.demoName}
              </div>
              <div className="mt-2 inline-flex rounded-full border border-line bg-black/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-300">
                Data source: {match.source}
              </div>
              {match.sourcePath ? (
                <div className="mt-1 max-w-[780px] break-all font-mono text-[9px] text-slate-500">
                  {match.sourcePath}
                </div>
              ) : null}
            </div>

            <div className="flex items-start gap-3">
              <Link
                className="rounded-lg border border-line bg-ink/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300"
                href="/"
              >
                Back
              </Link>
              <div className="rounded-[14px] border border-accent/30 bg-accent/10 px-3 py-2 text-right">
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                  Final score
                </div>
                <div className="mt-1 text-3xl font-bold text-accent">{match.score}</div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <div className="rounded-[14px] border border-line bg-ink/80 p-2.5">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Selected round
              </div>
              <div className="mt-1 text-lg font-bold">R{selectedRound?.number}</div>
            </div>
            <div className="rounded-[14px] border border-line bg-ink/80 p-2.5">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Winner
              </div>
              <div className="mt-1 text-lg font-bold text-white">{selectedRound?.winner}</div>
            </div>
            <div className="rounded-[14px] border border-line bg-ink/80 p-2.5">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Round score
              </div>
              <div className="mt-1 text-lg font-bold">
                {selectedRound?.scoreCT}-{selectedRound?.scoreT}
              </div>
            </div>
            <div className="rounded-[14px] border border-line bg-ink/80 p-2.5">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Ticks
              </div>
              <div className="mt-1 text-lg font-bold">{match.ticks}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_232px]">
          <div className="grid gap-3">
            <div className="rounded-[20px] border border-line bg-panel/90 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                  Round strip
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                  Click a round
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {rounds.map((round) => (
                  <button
                    key={round.number}
                    className={[
                      "min-w-[74px] rounded-[13px] border px-2 py-2 text-left transition",
                      selectedRound?.number === round.number
                        ? "border-accent/50 bg-accent/10"
                        : "border-line bg-ink/70"
                    ].join(" ")}
                    onClick={() => {
                      setSelectedRoundNumber(round.number);
                      setSelectedEventId(null);
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
                      <span>R{round.number}</span>
                      <span>
                        {round.scoreCT}-{round.scoreT}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold">
                      <span className={round.winner === "CT" ? "text-ct" : "text-t"}>
                        {round.winner}
                      </span>
                      <span className="text-slate-400">{round.headline}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-line bg-panel/90 p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                    Replay stage
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                    {match.mapName}
                  </div>
                </div>
                <ReplayStage
                  labels={labels}
                  match={match}
                  replay={replay}
                  selectedEvent={selectedEvent}
                  selectedRound={selectedRound}
                />
              </div>

            <div className="rounded-[20px] border border-line bg-panel/90 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                  Timeline
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                  {roundEvents.length} events in round
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-full border border-line bg-ink/80 p-2">
                  <div className="relative h-8">
                    {roundEvents.map((event) => (
                      <button
                        key={event.id}
                        className={[
                          "absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition",
                          EVENT_COLORS[event.kind],
                          selectedEvent?.id === event.id ? "ring-2 ring-white/80" : ""
                        ].join(" ")}
                        onClick={() => setSelectedEventId(event.id)}
                        style={{
                          left: `${(event.tick / match.ticks) * 100}%`
                        }}
                        title={`${event.kind} - ${event.player}`}
                        type="button"
                      />
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
                  {roundEvents.map((event) => (
                    <button
                      key={event.id}
                      className={[
                        "rounded-[14px] border bg-ink/80 p-2.5 text-left transition",
                        selectedEvent?.id === event.id
                          ? "border-accent/50 bg-accent/5"
                          : "border-line hover:border-line/80 hover:bg-white/[0.03]"
                      ].join(" ")}
                      onClick={() => setSelectedEventId(event.id)}
                      type="button"
                    >
                      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                        {event.kind}
                      </div>
                      <div className="mt-1 text-sm font-bold">{event.player}</div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        {event.side} side at tick {event.tick}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[20px] border border-line bg-panel/90 p-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Round context
              </div>
              <div className="mt-2 rounded-[14px] border border-line bg-ink/80 p-3">
                <div className="text-base font-bold">{selectedRound?.headline}</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                  {selectedRound?.label}
                </div>
                <div className="mt-2 grid gap-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Winner</span>
                    <span className="font-semibold">{selectedRound?.winner}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Scoreline</span>
                    <span className="font-semibold">
                      {selectedRound?.scoreCT}-{selectedRound?.scoreT}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Utility events</span>
                    <span className="font-semibold">{selectedRoundMeta?.utility_count ?? roundEvents.filter((event) => event.kind !== "kill").length}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Kills</span>
                    <span className="font-semibold">{selectedRoundMeta?.kill_count ?? roundEvents.filter((event) => event.kind === "kill").length}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Win reason</span>
                    <span className="font-semibold">{selectedRoundMeta?.win_reason || "n/a"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-line bg-panel/90 p-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Rosters
              </div>
              <div className="mt-2 space-y-2">
                <div className="rounded-[14px] border border-line bg-ink/80 p-3">
                  <div className="mb-2 text-xs font-bold text-ct">CT</div>
                  <div className="space-y-2">
                    {teams.ct.map((player) => (
                      <div key={player.id} className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold">{player.name}</span>
                        <span className="font-mono text-slate-400">
                          {player.kills}/{player.deaths}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[14px] border border-line bg-ink/80 p-3">
                  <div className="mb-2 text-xs font-bold text-t">T</div>
                  <div className="space-y-2">
                    {teams.t.map((player) => (
                      <div key={player.id} className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold">{player.name}</span>
                        <span className="font-mono text-slate-400">
                          {player.kills}/{player.deaths}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-line bg-panel/90 p-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Focused event
              </div>
              <div className="mt-2 rounded-[14px] border border-line bg-ink/80 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-bold">
                      {selectedEvent ? selectedEvent.kind : "No event"}
                    </div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      {selectedEvent
                        ? `Round ${selectedEvent.roundNumber} - ${selectedEvent.side} side`
                        : "Select an event from the timeline"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {selectedEvent ? selectedEvent.tick : "-"}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      tick
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-300">
                  {selectedEvent
                    ? `${selectedEvent.player} is the active focus for this replay slice. ${selectedEvent.note}`
                    : "Timeline selection will drive contextual metadata here once replay events are normalized."}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
