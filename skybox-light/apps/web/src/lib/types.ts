export type PlayerSummary = {
  id: string;
  name: string;
  side: "CT" | "T";
  kills: number;
  deaths: number;
  adr: number;
};

export type EventKind = "kill" | "smoke" | "flash" | "he" | "molotov" | "plant" | "defuse" | "bomb_exploded";

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
  sourcePath?: string;
  mapName: string;
  mapImageUrl?: string;
  replayId?: string;
  score: string;
  rounds: number;
  ticks: number;
  uploadedAt: string;
  status: "queued" | "parsed";
  source: "mock" | "parser-go" | "legacy-python";
  players: PlayerSummary[];
  roundsData: RoundSummary[];
  events: MatchEvent[];
};

export type ReplayPlayer = {
  id: string;
  name: string;
  side: "CT" | "T";
};

export type ReplayFramePlayer = [
  playerIndex: number,
  x: number,
  y: number,
  alive: number,
  health: number,
  armor: number,
  hasDefuser: number,
  hasBomb: number
];

export type ReplayRound = {
  round: number;
  start: number;
  freeze_end: number;
  end: number;
  plant_tick: number;
  defuse_tick: number;
  winner_side: "CT" | "T" | "";
  winner_team: string;
  win_reason: string;
  score_ct: number;
  score_t: number;
  kill_count: number;
  utility_count: number;
  bomb_event_count: number;
};

export type ReplayData = {
  id: string;
  demo: string;
  map: string;
  mapImageUrl: string;
  sampleRate: number;
  ticksPerSec: number;
  players: ReplayPlayer[];
  rounds: Record<string, ReplayRound>;
  kills: MatchEvent[];
  utility: MatchEvent[];
  bombEvents: MatchEvent[];
  timeline: MatchEvent[];
  frames: Record<string, ReplayFramePlayer[]>;
};
