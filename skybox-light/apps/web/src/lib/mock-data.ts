import { enrichMatchSummary } from "@/lib/match-enrichment";
import type { MatchSummary } from "@/lib/types";

const baseMatches = [
  {
    id: "match_001",
    demoName: "og-vs-nemesis-overpass.dem",
    mapName: "de_overpass",
    score: "13-10",
    rounds: 23,
    ticks: 39105,
    uploadedAt: "2026-03-13T00:10:00.000Z",
    status: "parsed" as const,
    source: "mock" as const,
    players: [
      { id: "m1-1", name: "lambert", side: "T" as const, kills: 21, deaths: 14, adr: 88.3 },
      { id: "m1-2", name: "cadian", side: "T" as const, kills: 18, deaths: 15, adr: 80.4 },
      { id: "m1-3", name: "sellter", side: "CT" as const, kills: 17, deaths: 17, adr: 78.2 },
      { id: "m1-4", name: "yiksrezo", side: "CT" as const, kills: 19, deaths: 16, adr: 82.1 }
    ]
  },
  {
    id: "match_002",
    demoName: "nemesis-vs-mix-mirage.dem",
    mapName: "de_mirage",
    score: "13-8",
    rounds: 21,
    ticks: 35418,
    uploadedAt: "2026-03-12T23:41:00.000Z",
    status: "parsed" as const,
    source: "mock" as const,
    players: [
      { id: "m2-1", name: "sellter", side: "CT" as const, kills: 20, deaths: 12, adr: 90.1 },
      { id: "m2-2", name: "spooke", side: "T" as const, kills: 16, deaths: 18, adr: 69.8 },
      { id: "m2-3", name: "mag1k3y", side: "CT" as const, kills: 18, deaths: 13, adr: 83.4 },
      { id: "m2-4", name: "adamB", side: "T" as const, kills: 14, deaths: 19, adr: 64.2 }
    ]
  }
];

export const mockMatches: MatchSummary[] = baseMatches.map((match) => enrichMatchSummary(match));
