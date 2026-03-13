import { enrichMatchSummary } from "@/lib/match-enrichment";
import type { MatchSummary } from "@/lib/types";
import { mockMatches } from "@/lib/mock-data";

const STORAGE_KEY = "skybox-light.matches";

function dedupe(matches: MatchSummary[]) {
  const byId = new Map<string, MatchSummary>();
  for (const match of matches) {
    byId.set(match.id, enrichMatchSummary(match));
  }
  return [...byId.values()].sort(
    (left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime()
  );
}

export function getStoredMatches(): MatchSummary[] {
  if (typeof window === "undefined") return mockMatches;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as MatchSummary[]) : [];
    return dedupe([...parsed, ...mockMatches]);
  } catch {
    return mockMatches;
  }
}

export function saveParsedMatch(match: MatchSummary) {
  if (typeof window === "undefined") return;

  const current = getStoredMatches().filter((item) => !mockMatches.some((mock) => mock.id === item.id));
  const next = dedupe([enrichMatchSummary(match), ...current]);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getMatchById(matchId: string): MatchSummary | null {
  return getStoredMatches().find((match) => match.id === matchId) || null;
}
