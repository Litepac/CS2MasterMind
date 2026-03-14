import type { EventKind, MatchSummary, PlayerSummary } from "@/lib/types";

export type RoundPreview = {
  number: number;
  winner: "CT" | "T";
  scoreCT: number;
  scoreT: number;
  label: string;
  headline: string;
};

export type TimelinePreview = {
  id: string;
  roundNumber: number;
  tick: number;
  kind: EventKind;
  player: string;
  side: "CT" | "T";
  note: string;
};

function parseScore(score: string) {
  const [ct, t] = score.split("-").map((value) => Number(value || 0));
  return { ct, t };
}

export function buildRounds(match: MatchSummary): RoundPreview[] {
  if (match.roundsData?.length) {
    return match.roundsData.map((round) => ({
      number: round.number,
      winner: round.winner,
      scoreCT: round.scoreCT,
      scoreT: round.scoreT,
      label: round.label,
      headline: round.headline
    }));
  }

  const { ct, t } = parseScore(match.score);
  const winners: ("CT" | "T")[] = [
    ...Array.from({ length: ct }, () => "CT" as const),
    ...Array.from({ length: t }, () => "T" as const)
  ];

  // Shuffle distribution without randomness so the strip looks less artificial.
  const ordered: ("CT" | "T")[] = [];
  let ctLeft = ct;
  let tLeft = t;
  for (let round = 1; round <= match.rounds; round += 1) {
    const pickT = round % 3 === 0 || (tLeft > ctLeft && round % 2 === 0);
    if (pickT && tLeft > 0) {
      ordered.push("T");
      tLeft -= 1;
    } else if (ctLeft > 0) {
      ordered.push("CT");
      ctLeft -= 1;
    } else if (tLeft > 0) {
      ordered.push("T");
      tLeft -= 1;
    }
  }

  let scoreCT = 0;
  let scoreT = 0;
  return ordered.map((winner, index) => {
    if (winner === "CT") scoreCT += 1;
    if (winner === "T") scoreT += 1;

    return {
      number: index + 1,
      winner,
      scoreCT,
      scoreT,
      label: winner === "CT" ? "CT hold" : "T convert",
      headline: winner === "CT" ? "Defense holds" : "Exec lands"
    };
  });
}

export function buildTimeline(match: MatchSummary): TimelinePreview[] {
  if (match.events?.length) {
    return match.events.map((event) => ({
      id: event.id,
      roundNumber: event.roundNumber,
      tick: event.tick,
      kind: event.kind,
      player: event.player,
      side: event.side,
      note: event.note
    }));
  }

  const rounds = buildRounds(match);
  const ctPlayers = match.players.filter((player) => player.side === "CT");
  const tPlayers = match.players.filter((player) => player.side === "T");
  const totalTicks = Math.max(match.ticks, 1);

  return rounds.flatMap((round, index) => {
    const startTick = Math.floor((index / rounds.length) * totalTicks);
    const endTick = Math.floor(((index + 1) / rounds.length) * totalTicks);
    const midTick = Math.floor((startTick + endTick) / 2);
    const winnerPool = round.winner === "CT" ? ctPlayers : tPlayers;
    const losingPool = round.winner === "CT" ? tPlayers : ctPlayers;

    const winner = winnerPool[index % winnerPool.length] || match.players[0];
    const victim = losingPool[index % losingPool.length] || match.players[0];

    return [
      {
        id: `kill-${round.number}`,
        roundNumber: round.number,
        tick: midTick,
        kind: "kill",
        player: winner.name,
        side: winner.side,
        note: "Opening duel changes the round state"
      },
      {
        id: `util-${round.number}`,
        roundNumber: round.number,
        tick: startTick + Math.floor((endTick - startTick) * 0.3),
        kind: round.number % 4 === 0 ? "plant" : round.number % 2 === 0 ? "smoke" : "flash",
        player: victim.name,
        side: victim.side,
        note: "Support utility defines the shape of the round"
      }
    ];
  });
}

export function splitPlayers(match: MatchSummary) {
  const ct = match.players.filter((player) => player.side === "CT");
  const t = match.players.filter((player) => player.side === "T");
  return { ct, t };
}

export function topFraggers(match: MatchSummary, limit = 5): PlayerSummary[] {
  return [...match.players].sort((left, right) => right.kills - left.kills).slice(0, limit);
}
