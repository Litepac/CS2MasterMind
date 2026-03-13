"use client";

import type { Route } from "next";
import Link from "next/link";
import type { MatchSummary } from "@/lib/types";

type RecentMatchesProps = {
  matches: MatchSummary[];
};

export function RecentMatches({ matches }: RecentMatchesProps) {
  return (
    <div className="rounded-[24px] border border-line bg-panel/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
          Recent Matches
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          {matches.length} stored
        </div>
      </div>
      <div className="mt-3 text-xl font-bold">
        Recent Matches
      </div>
      <div className="mt-4 space-y-2.5">
        {matches.map((match) => (
          <Link
            key={match.id}
            className="block rounded-[18px] border border-line bg-ink/80 p-4 transition hover:border-accent/40 hover:bg-ink"
            href={`/matches/${match.id}` as Route}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{match.mapName}</div>
                <div className="mt-2 inline-flex rounded-full border border-line bg-black/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  {match.source}
                </div>
              </div>
              <div className="text-xl font-bold text-accent">{match.score}</div>
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <span>{match.rounds} rounds</span>
              <span>{new Date(match.uploadedAt).toLocaleString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
