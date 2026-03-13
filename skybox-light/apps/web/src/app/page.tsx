"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { RecentMatches } from "@/components/recent-matches";
import { UploadPanel } from "@/components/upload-panel";
import { getStoredMatches, saveParsedMatch } from "@/lib/match-store";
import type { MatchSummary } from "@/lib/types";

export default function HomePage() {
  const [parsedMatch, setParsedMatch] = useState<MatchSummary | null>(null);
  const [matches, setMatches] = useState<MatchSummary[]>([]);

  useEffect(() => {
    setMatches(getStoredMatches());
  }, []);

  const topPlayers = useMemo(() => {
    if (!parsedMatch) return [];
    return [...parsedMatch.players].sort((a, b) => b.kills - a.kills).slice(0, 4);
  }, [parsedMatch]);

  function handleParsed(summary: MatchSummary) {
    saveParsedMatch(summary);
    setParsedMatch(summary);
    setMatches(getStoredMatches());
  }

  return (
    <Shell>
      <div className="grid gap-4">
        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <UploadPanel onParsed={handleParsed} />
          <RecentMatches matches={matches} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[24px] border border-line bg-panel/90 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                Last Parse
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Local control room
              </div>
            </div>
            <div className="mt-3 text-xl font-bold">Newest ingest snapshot</div>
            <div className="mt-1 text-sm text-slate-400">
              Parse a demo, validate the source, then jump straight into the match report.
            </div>
            {parsedMatch ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-[20px] border border-line bg-ink/80 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-2xl font-bold">{parsedMatch.mapName}</div>
                      <div className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                        {parsedMatch.demoName}
                      </div>
                      <div className="mt-3 inline-flex rounded-full border border-line bg-black/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
                        {parsedMatch.source === "parser-go" ? "Parser service" : "Mock fallback"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-accent">{parsedMatch.score}</div>
                      <div className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                        {parsedMatch.rounds} rounds
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      className="inline-flex rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-accent transition hover:bg-accent/15"
                      href={`/matches/${parsedMatch.id}`}
                    >
                      Open Match Report
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[20px] border border-line bg-ink/80 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      Source
                    </div>
                    <div className="mt-2 text-xl font-bold capitalize">{parsedMatch.source}</div>
                  </div>
                  <div className="rounded-[20px] border border-line bg-ink/80 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      Ticks
                    </div>
                    <div className="mt-2 text-xl font-bold">{parsedMatch.ticks}</div>
                  </div>
                  <div className="rounded-[20px] border border-line bg-ink/80 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      Parsed at
                    </div>
                    <div className="mt-2 text-base font-bold">
                      {new Date(parsedMatch.uploadedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-line bg-ink/70 p-8 text-slate-400">
                No ingest result yet. Select a `.dem` file and run the mock parse route first.
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-line bg-panel/90 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                Top players
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Current parse
              </div>
            </div>
            <div className="mt-3 text-xl font-bold">
              Player snapshot
            </div>
            {topPlayers.length ? (
              <div className="mt-4 space-y-2.5">
                {topPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-[18px] border border-line bg-ink/80 px-4 py-3"
                  >
                    <div>
                      <div className="text-xl font-bold">{player.name}</div>
                      <div className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                        {player.side} side
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-5 text-right">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          K
                        </div>
                        <div className="text-xl font-bold">{player.kills}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          D
                        </div>
                        <div className="text-xl font-bold">{player.deaths}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          ADR
                        </div>
                        <div className="text-xl font-bold">{player.adr}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-line bg-ink/70 p-8 text-slate-400">
                Player summaries will appear here after ingest.
              </div>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}
