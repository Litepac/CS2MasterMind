"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { RecentMatches } from "@/components/recent-matches";
import { ParserReadinessPanel } from "@/components/parser-readiness";
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
      <div className="grid gap-3">
        <section className="grid gap-3 xl:grid-cols-[1.05fr_0.5fr_0.75fr]">
          <UploadPanel onParsed={handleParsed} />
          <ParserReadinessPanel />
          <RecentMatches matches={matches} />
        </section>

        <section className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[20px] border border-line bg-panel/90 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                Last Parse
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Local control room
              </div>
            </div>
            <div className="mt-2 text-lg font-bold">Newest ingest snapshot</div>
            <div className="mt-1 text-xs text-slate-400">
              Parse a demo, validate the source, then jump straight into the match report.
            </div>
            {parsedMatch ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-[16px] border border-line bg-ink/80 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xl font-bold">{parsedMatch.mapName}</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        {parsedMatch.demoName}
                      </div>
                      <div className="mt-2 inline-flex rounded-full border border-line bg-black/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-300">
                        {parsedMatch.source === "legacy-python"
                          ? "Legacy Python replay"
                          : parsedMatch.source === "parser-go"
                            ? "Parser service"
                            : "Mock fallback"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-accent">{parsedMatch.score}</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
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
                  <div className="rounded-[16px] border border-line bg-ink/80 p-3">
                    <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      Source
                    </div>
                    <div className="mt-1 text-lg font-bold capitalize">{parsedMatch.source}</div>
                  </div>
                  <div className="rounded-[16px] border border-line bg-ink/80 p-3">
                    <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      Ticks
                    </div>
                    <div className="mt-1 text-lg font-bold">{parsedMatch.ticks}</div>
                  </div>
                  <div className="rounded-[16px] border border-line bg-ink/80 p-3">
                    <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      Parsed at
                    </div>
                    <div className="mt-1 text-sm font-bold">
                      {new Date(parsedMatch.uploadedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                {parsedMatch.sourcePath ? (
                  <div className="rounded-[16px] border border-line bg-ink/80 p-3">
                    <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      Saved source path
                    </div>
                    <div className="mt-1 break-all font-mono text-[10px] text-slate-300">{parsedMatch.sourcePath}</div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-line bg-ink/70 p-6 text-sm text-slate-400">
                No ingest result yet. Import a `.viewer.json` or parse a `.dem` successfully first.
              </div>
            )}
          </div>

          <div className="rounded-[20px] border border-line bg-panel/90 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                Top players
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Current parse
              </div>
            </div>
            <div className="mt-2 text-lg font-bold">
              Player snapshot
            </div>
            {topPlayers.length ? (
              <div className="mt-3 space-y-2">
                {topPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-[14px] border border-line bg-ink/80 px-3 py-2.5"
                  >
                    <div>
                      <div className="text-lg font-bold">{player.name}</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        {player.side} side
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-right">
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                          K
                        </div>
                        <div className="text-lg font-bold">{player.kills}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                          D
                        </div>
                        <div className="text-lg font-bold">{player.deaths}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-line bg-ink/70 p-6 text-sm text-slate-400">
                Player summaries will appear here after ingest.
              </div>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}
