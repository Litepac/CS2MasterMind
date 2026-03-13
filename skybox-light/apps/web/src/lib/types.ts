export type PlayerSummary = {
  id: string;
  name: string;
  side: "CT" | "T";
  kills: number;
  deaths: number;
  adr: number;
};

export type EventKind = "kill" | "smoke" | "flash" | "plant";

export type MatchEvent = {
  id: string;
  roundNumber: number;
  tick: number;
  kind: EventKind;
  player: string;
  side: "CT" | "T";
  note: string;
};

export type RoundSummary = {
  number: number;
  winner: "CT" | "T";
  scoreCT: number;
  scoreT: number;
  label: string;
  headline: string;
  startTick: number;
  endTick: number;
  openingKillId: string | null;
  utilityCount: number;
};

export type MatchSummary = {
  id: string;
  demoName: string;
  mapName: string;
  score: string;
  rounds: number;
  ticks: number;
  uploadedAt: string;
  status: "queued" | "parsed";
  source: "mock" | "parser-go";
  players: PlayerSummary[];
  roundsData: RoundSummary[];
  events: MatchEvent[];
};
