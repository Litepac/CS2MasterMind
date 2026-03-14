import { enrichMatchSummary } from "@/lib/match-enrichment";
import type { MatchSummary } from "@/lib/types";

const STORAGE_KEY = "skybox-light.matches";
const STORAGE_VERSION_KEY = "skybox-light.storage-version";
const STORAGE_VERSION = "2";

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
  if (typeof window === "undefined") return [];

  try {
    const version = window.localStorage.getItem(STORAGE_VERSION_KEY);
    if (version !== STORAGE_VERSION) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
      return [];
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as MatchSummary[]) : [];
    return dedupe(parsed.filter((match) => match.source !== "mock"));
  } catch {
    return [];
  }
}

export function saveParsedMatch(match: MatchSummary) {
  if (typeof window === "undefined") return;

  const current = getStoredMatches();
  const next = dedupe([enrichMatchSummary(match), ...current]);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
}

export function getMatchById(matchId: string): MatchSummary | null {
  return getStoredMatches().find((match) => match.id === matchId) || null;
}
