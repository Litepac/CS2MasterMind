import type { MatchEvent, MatchSummary, PlayerSummary, RoundSummary } from "@/lib/types";

type BaseMatchSummary = Omit<MatchSummary, "roundsData" | "events">;

function parseScore(score: string) {
  const [ct, t] = score.split("-").map((value) => Number(value || 0));
  return { ct, t };
}

function buildOrderedWinners(roundCount: number, score: string): ("CT" | "T")[] {
  const { ct, t } = parseScore(score);
  const ordered: ("CT" | "T")[] = [];
  let ctLeft = ct;
  let tLeft = t;

  for (let round = 1; round <= roundCount; round += 1) {
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
    } else {
      ordered.push(round % 2 === 0 ? "CT" : "T");
    }
  }

  return ordered;
}

function pickPlayer(players: PlayerSummary[], side: "CT" | "T", index: number) {
  const pool = players.filter((player) => player.side === side);
  return pool[index % Math.max(pool.length, 1)] || players[index % Math.max(players.length, 1)];
}

function buildRoundsAndEvents(base: BaseMatchSummary) {
  const totalTicks = Math.max(base.ticks, 1);
  const orderedWinners = buildOrderedWinners(base.rounds, base.score);

  let scoreCT = 0;
  let scoreT = 0;
  const roundsData: RoundSummary[] = [];
  const events: MatchEvent[] = [];

  orderedWinners.forEach((winner, index) => {
    const roundNumber = index + 1;
    const startTick = Math.floor((index / orderedWinners.length) * totalTicks);
    const endTick = Math.floor(((index + 1) / orderedWinners.length) * totalTicks) - 1;
    const roundSpan = Math.max(endTick - startTick, 1);
    const loser = winner === "CT" ? "T" : "CT";
    const opener = pickPlayer(base.players, winner, index);
    const utilityPlayer = pickPlayer(base.players, loser, index + 1);

    const flashEvent: MatchEvent = {
      id: `flash-${roundNumber}`,
      roundNumber,
      tick: startTick + Math.floor(roundSpan * 0.18),
      kind: "flash",
      player: utilityPlayer.name,
      side: utilityPlayer.side,
      note: "Early utility for map control"
    };
    const smokeEvent: MatchEvent = {
      id: `smoke-${roundNumber}`,
      roundNumber,
      tick: startTick + Math.floor(roundSpan * 0.34),
      kind: "smoke",
      player: utilityPlayer.name,
      side: utilityPlayer.side,
      note: "Smoke deployed to split the site"
    };
    const killEvent: MatchEvent = {
      id: `kill-${roundNumber}`,
      roundNumber,
      tick: startTick + Math.floor(roundSpan * 0.56),
      kind: "kill",
      player: opener.name,
      side: opener.side,
      note: "Opening duel changes the round state"
    };

    events.push(flashEvent, smokeEvent, killEvent);

    if (roundNumber % 4 === 0 || winner === "T") {
      events.push({
        id: `plant-${roundNumber}`,
        roundNumber,
        tick: startTick + Math.floor(roundSpan * 0.78),
        kind: "plant",
        player: pickPlayer(base.players, "T", index + 2).name,
        side: "T",
        note: "Bomb plant forces the late-round response"
      });
    }

    if (winner === "CT") scoreCT += 1;
    if (winner === "T") scoreT += 1;

    const roundEvents = events.filter((event) => event.roundNumber === roundNumber);
    roundsData.push({
      number: roundNumber,
      winner,
      scoreCT,
      scoreT,
      label: winner === "CT" ? "CT hold" : "T convert",
      headline: winner === "CT" ? "Defense holds" : "Exec lands",
      startTick,
      endTick,
      openingKillId: killEvent.id,
      utilityCount: roundEvents.filter((event) => event.kind !== "kill").length
    });
  });

  return { roundsData, events };
}

export function enrichMatchSummary(
  match: BaseMatchSummary & Partial<Pick<MatchSummary, "roundsData" | "events">>
): MatchSummary {
  if (match.roundsData?.length && match.events?.length) {
    return match as MatchSummary;
  }

  const enriched = buildRoundsAndEvents(match as BaseMatchSummary);
  return {
    ...match,
    roundsData: match.roundsData?.length ? match.roundsData : enriched.roundsData,
    events: match.events?.length ? match.events : enriched.events
  };
}
