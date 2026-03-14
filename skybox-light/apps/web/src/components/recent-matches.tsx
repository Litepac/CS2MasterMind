"use client";

import type { Route } from "next";
import Link from "next/link";
import type { MatchSummary } from "@/lib/types";

type RecentMatchesProps = {
  matches: MatchSummary[];
};

export function RecentMatches({ matches }: RecentMatchesProps) {
  return (
    <div className="rounded-[20px] border border-line bg-panel/90 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
          Recent Matches
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          {matches.length} stored
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {matches.map((match) => (
          <Link
            key={match.id}
            className="block rounded-[14px] border border-line bg-ink/80 p-3 transition hover:border-accent/40 hover:bg-ink"
            href={`/matches/${match.id}` as Route}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">{match.mapName}</div>
                <div className="mt-1 inline-flex rounded-full border border-line bg-black/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400">
                  {match.source}
                </div>
              </div>
              <div className="text-lg font-bold text-accent">{match.score}</div>
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
              <span>{match.rounds} rounds</span>
              <span>{new Date(match.uploadedAt).toLocaleString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
