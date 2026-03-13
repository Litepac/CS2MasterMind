import { enrichMatchSummary } from "@/lib/match-enrichment";
import { MatchSummary } from "@/lib/types";

const MAP_POOL = ["de_overpass", "de_mirage", "de_inferno", "de_anubis"];

function hashName(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function buildMockSummary(fileName: string, fileSize: number): MatchSummary {
  const seed = hashName(`${fileName}:${fileSize}`);
  const ct = 6 + (seed % 8);
  const t = Math.max(4, Math.min(13, 13 - Math.floor(seed % 5)));
  const rounds = Math.max(ct, t) + Math.min(ct, t);
  const mapName = MAP_POOL[seed % MAP_POOL.length];
  const uploadedAt = new Date().toISOString();

  return enrichMatchSummary({
    id: `match_${seed}`,
    demoName: fileName,
    mapName,
    score: `${ct}-${t}`,
    rounds,
    ticks: 28000 + (seed % 18000),
    uploadedAt,
    status: "parsed",
    source: "mock",
    players: [
      {
        id: `${seed}-ct-1`,
        name: "Player One",
        side: "CT",
        kills: 19,
        deaths: 15,
        adr: 82.4
      },
      {
        id: `${seed}-ct-2`,
        name: "Player Two",
        side: "CT",
        kills: 14,
        deaths: 17,
        adr: 71.9
      },
      {
        id: `${seed}-t-1`,
        name: "Player Three",
        side: "T",
        kills: 22,
        deaths: 13,
        adr: 91.2
      },
      {
        id: `${seed}-t-2`,
        name: "Player Four",
        side: "T",
        kills: 16,
        deaths: 18,
        adr: 68.5
      }
    ]
  });
}
