"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ReplayStage } from "@/components/replay-stage";
import { Shell } from "@/components/shell";
import { getMatchById } from "@/lib/match-store";
import { buildRounds, buildTimeline, splitPlayers, topFraggers } from "@/lib/match-view";

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
  plant: "bg-emerald-300"
};

export default function MatchDetailsPage() {
  const params = useParams<{ id: string }>();
  const match = useMemo(() => getMatchById(params.id), [params.id]);
  const rounds = useMemo(() => (match ? buildRounds(match) : []), [match]);
  const timeline = useMemo(() => (match ? buildTimeline(match) : []), [match]);
  const [selectedRoundNumber, setSelectedRoundNumber] = useState(1);

  const selectedRound = useMemo(
    () => rounds.find((round) => round.number === selectedRoundNumber) || rounds[0] || null,
    [rounds, selectedRoundNumber]
  );
  const players = useMemo(() => (match ? topFraggers(match, 6) : []), [match]);
  const teams = useMemo(() => (match ? splitPlayers(match) : { ct: [], t: [] }), [match]);
  const labels = match ? MAP_LABELS[match.mapName] || ["A site", "B site", "Mid"] : [];
  const roundEvents = useMemo(
    () => timeline.filter((event) => event.roundNumber === selectedRound?.number),
    [selectedRound?.number, timeline]
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const selectedEvent = useMemo(
    () => roundEvents.find((event) => event.id === selectedEventId) || roundEvents[0] || null,
    [roundEvents, selectedEventId]
  );

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
      <div className="grid gap-4">
        <section className="rounded-[24px] border border-line bg-panel/90 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                Match report
              </div>
              <div className="mt-2 text-4xl font-bold">{match.mapName}</div>
              <div className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                {match.demoName}
              </div>
              <div className="mt-3 inline-flex rounded-full border border-line bg-black/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
                Data source: {match.source}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Link
                className="rounded-lg border border-line bg-ink/80 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-300"
                href="/"
              >
                Back
              </Link>
              <div className="rounded-[18px] border border-accent/30 bg-accent/10 px-4 py-3 text-right">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Final score
                </div>
                <div className="mt-1 text-4xl font-bold text-accent">{match.score}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-[18px] border border-line bg-ink/80 p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Selected round
              </div>
              <div className="mt-1 text-xl font-bold">R{selectedRound?.number}</div>
            </div>
            <div className="rounded-[18px] border border-line bg-ink/80 p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Winner
              </div>
              <div className="mt-1 text-xl font-bold text-white">{selectedRound?.winner}</div>
            </div>
            <div className="rounded-[18px] border border-line bg-ink/80 p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Round score
              </div>
              <div className="mt-1 text-xl font-bold">
                {selectedRound?.scoreCT}-{selectedRound?.scoreT}
              </div>
            </div>
            <div className="rounded-[18px] border border-line bg-ink/80 p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Ticks
              </div>
              <div className="mt-1 text-xl font-bold">{match.ticks}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_296px]">
          <div className="grid gap-4">
            <div className="rounded-[24px] border border-line bg-panel/90 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  Round strip
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Click a round
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {rounds.map((round) => (
                  <button
                    key={round.number}
                    className={[
                      "min-w-[82px] rounded-[16px] border px-2.5 py-2.5 text-left transition",
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
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      <span>R{round.number}</span>
                      <span>
                        {round.scoreCT}-{round.scoreT}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs font-semibold">
                      <span className={round.winner === "CT" ? "text-ct" : "text-t"}>
                        {round.winner}
                      </span>
                      <span className="text-slate-400">{round.headline}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[196px_minmax(0,1fr)]">
              <div className="rounded-[24px] border border-line bg-panel/90 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  Round review
                </div>
                <div className="mt-3 rounded-[18px] border border-line bg-ink/80 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    Headline
                  </div>
                  <div className="mt-2 text-xl font-bold">{selectedRound?.headline}</div>
                </div>
                <div className="mt-3 rounded-[18px] border border-line bg-ink/80 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    Summary
                  </div>
                  <div className="mt-2 text-base font-semibold">{selectedRound?.label}</div>
                  <div className="mt-2 text-xs text-slate-400">
                    Focus panel for round state, utility timing and replay-linked review context.
                  </div>
                </div>
                <div className="mt-3 rounded-[18px] border border-line bg-ink/80 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    Top fraggers
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {players.slice(0, 3).map((player) => (
                      <div key={player.id} className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{player.name}</span>
                        <span className="font-mono text-slate-400">{player.kills} K</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-line bg-panel/90 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    Replay stage
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    {match.mapName}
                  </div>
                </div>
                <ReplayStage
                  labels={labels}
                  match={match}
                  selectedEvent={selectedEvent}
                  selectedRound={selectedRound}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-line bg-panel/90 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  Timeline
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {roundEvents.length} events in round
                </div>
              </div>

              <div className="space-y-4">
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

                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {roundEvents.map((event) => (
                    <button
                      key={event.id}
                      className={[
                        "rounded-[18px] border bg-ink/80 p-3 text-left transition",
                        selectedEvent?.id === event.id
                          ? "border-accent/50 bg-accent/5"
                          : "border-line hover:border-line/80 hover:bg-white/[0.03]"
                      ].join(" ")}
                      onClick={() => setSelectedEventId(event.id)}
                      type="button"
                    >
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        {event.kind}
                      </div>
                      <div className="mt-2 text-base font-bold">{event.player}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {event.side} side at tick {event.tick}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[24px] border border-line bg-panel/90 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                CT roster
              </div>
              <div className="mt-3 space-y-2.5">
                {teams.ct.map((player) => (
                  <div key={player.id} className="rounded-[18px] border border-line bg-ink/80 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold">{player.name}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          CT side
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-ct">{player.kills}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          kills
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-line bg-panel/90 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                T roster
              </div>
              <div className="mt-3 space-y-2.5">
                {teams.t.map((player) => (
                  <div key={player.id} className="rounded-[18px] border border-line bg-ink/80 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold">{player.name}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          T side
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-t">{player.kills}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          kills
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-line bg-panel/90 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                Current event
              </div>
              <div className="mt-3 rounded-[18px] border border-line bg-ink/80 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold">
                      {selectedEvent ? selectedEvent.kind : "No event"}
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      {selectedEvent
                        ? `Round ${selectedEvent.roundNumber} - ${selectedEvent.side} side`
                        : "Select an event from the timeline"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {selectedEvent ? selectedEvent.tick : "-"}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      tick
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-300">
                  {selectedEvent
                    ? `${selectedEvent.player} is the active focus for this replay slice. ${selectedEvent.note}`
                    : "Timeline selection will drive contextual metadata here once replay events are normalized."}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-line bg-panel/90 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                Player report
              </div>
              <div className="mt-3 space-y-2.5">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-[18px] border border-line bg-ink/80 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold">{player.name}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          {player.side} side
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-right">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            K
                          </div>
                          <div className="text-lg font-bold">{player.kills}</div>
                        </div>
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            D
                          </div>
                          <div className="text-lg font-bold">{player.deaths}</div>
                        </div>
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            ADR
                          </div>
                          <div className="text-lg font-bold">{player.adr}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
