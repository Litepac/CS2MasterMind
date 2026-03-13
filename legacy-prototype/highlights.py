"""
CS2 Highlight Detection Engine
Detects: Multikills, Aces, Clutches, Knife/Pistol kills, Fast sprays, Quick reactions
"""

import pandas as pd
from dataclasses import dataclass, field
from typing import Optional

PISTOLS = {
    "weapon_glock", "weapon_usp_silencer", "weapon_p2000",
    "weapon_p250", "weapon_cz75a", "weapon_tec9", "weapon_fiveseven",
    "weapon_deagle", "weapon_revolver", "weapon_dual berettas"
}

TICKS_PER_SECOND = 64  # CS2 default
FAST_SPRAY_WINDOW_TICKS = int(TICKS_PER_SECOND * 3)   # 3 seconds between kills
MIN_REACTION_TICKS = int(TICKS_PER_SECOND * 0.15)     # 150ms min (below = wallbang/spam)
MAX_REACTION_TICKS = int(TICKS_PER_SECOND * 0.55)     # 550ms max for "quick reaction"


@dataclass
class Highlight:
    type: str
    tick: int
    timestamp_sec: float
    round_num: int
    attacker: str
    attacker_steamid: str
    description: str
    score: int  # priority score for sorting
    kills: list = field(default_factory=list)
    extra: dict = field(default_factory=dict)

    def to_dict(self):
        return {
            "type": self.type,
            "tick": self.tick,
            "timestamp_sec": round(self.timestamp_sec, 2),
            "timestamp_fmt": self._fmt_time(),
            "round": self.round_num,
            "attacker": self.attacker,
            "attacker_steamid": self.attacker_steamid,
            "description": self.description,
            "score": self.score,
            "kill_count": len(self.kills),
            "extra": self.extra,
        }

    def _fmt_time(self):
        m = int(self.timestamp_sec // 60)
        s = int(self.timestamp_sec % 60)
        return f"{m:02d}:{s:02d}"


def detect_highlights(kills_df: pd.DataFrame, rounds_df: pd.DataFrame = None) -> list[Highlight]:
    """
    Main entry point. Takes a kills dataframe and returns sorted highlights.
    Expected kill columns:
        tick, attacker_name, attacker_steamid, victim_name, victim_steamid,
        weapon, headshot, round, attacker_team_num, victim_team_num,
        attackers_alive (optional), victims_alive (optional)
    """
    highlights = []

    if kills_df.empty:
        return highlights

    # Normalize column names
    kills_df = kills_df.copy()
    kills_df["timestamp_sec"] = kills_df["tick"] / TICKS_PER_SECOND

    # Group kills by round and attacker
    for (round_num, attacker_sid), group in kills_df.groupby(["round", "attacker_steamid"]):
        group = group.sort_values("tick")
        attacker_name = group.iloc[0]["attacker_name"]
        kills_list = group.to_dict("records")

        # --- ACE ---
        if len(group) == 5:
            h = Highlight(
                type="ACE",
                tick=group.iloc[0]["tick"],
                timestamp_sec=group.iloc[0]["timestamp_sec"],
                round_num=round_num,
                attacker=attacker_name,
                attacker_steamid=attacker_sid,
                description=f"ACE! {attacker_name} tog alle 5 i runde {round_num}",
                score=100,
                kills=kills_list,
            )
            highlights.append(h)
            continue  # Ace already covers multikill

        # --- MULTIKILLS (3K, 4K) ---
        if len(group) >= 3:
            label = f"{len(group)}K"
            score = 60 + (len(group) - 3) * 20  # 3K=60, 4K=80
            h = Highlight(
                type=f"MULTIKILL_{label}",
                tick=group.iloc[0]["tick"],
                timestamp_sec=group.iloc[0]["timestamp_sec"],
                round_num=round_num,
                attacker=attacker_name,
                attacker_steamid=attacker_sid,
                description=f"{label} af {attacker_name} i runde {round_num}",
                score=score,
                kills=kills_list,
            )
            highlights.append(h)

    # --- CLUTCHES (1vX) ---
    if "attackers_alive" in kills_df.columns and "victims_alive" in kills_df.columns:
        highlights += _detect_clutches(kills_df)

    # --- KNIFE KILLS ---
    knife_kills = kills_df[kills_df["weapon"] == "weapon_knife"]
    for _, row in knife_kills.iterrows():
        h = Highlight(
            type="KNIFE_KILL",
            tick=row["tick"],
            timestamp_sec=row["timestamp_sec"],
            round_num=row["round"],
            attacker=row["attacker_name"],
            attacker_steamid=row["attacker_steamid"],
            description=f"KNIV! {row['attacker_name']} knifede {row['victim_name']} i runde {row['round']}",
            score=75,
            kills=[row.to_dict()],
        )
        highlights.append(h)

    # --- PISTOL KILLS (non-eco context — single highlight for noteworthy ones) ---
    pistol_kills = kills_df[kills_df["weapon"].isin(PISTOLS)]
    # Only flag deagle headshots or pistol multikills (already caught above if 3K+)
    deagle_hs = pistol_kills[
        (pistol_kills["weapon"] == "weapon_deagle") & (pistol_kills["headshot"] == True)
    ]
    for _, row in deagle_hs.iterrows():
        h = Highlight(
            type="DEAGLE_HEADSHOT",
            tick=row["tick"],
            timestamp_sec=row["timestamp_sec"],
            round_num=row["round"],
            attacker=row["attacker_name"],
            attacker_steamid=row["attacker_steamid"],
            description=f"Deagle HS! {row['attacker_name']} → {row['victim_name']} i runde {row['round']}",
            score=45,
            kills=[row.to_dict()],
        )
        highlights.append(h)

    # --- FAST SPRAYS (multiple kills within 3s) ---
    highlights += _detect_fast_sprays(kills_df)

    # --- QUICK REACTIONS ---
    highlights += _detect_quick_reactions(kills_df)

    # Deduplicate: if same tick/attacker covered by higher-score highlight, remove lower
    highlights = _deduplicate(highlights)

    return sorted(highlights, key=lambda h: h.score, reverse=True)


def _detect_clutches(kills_df: pd.DataFrame) -> list[Highlight]:
    """Detect 1vX situations where the player wins."""
    highlights = []
    for (round_num, attacker_sid), group in kills_df.groupby(["round", "attacker_steamid"]):
        group = group.sort_values("tick")
        # Find moment where attackers_alive == 1 and they still get kills
        solo_kills = group[group["attackers_alive"] == 1]
        if solo_kills.empty:
            continue
        enemies_at_start = solo_kills.iloc[0].get("victims_alive", 0)
        if enemies_at_start < 2:
            continue
        attacker_name = group.iloc[0]["attacker_name"]
        score = 50 + enemies_at_start * 10  # 1v2=70, 1v3=80, etc.
        h = Highlight(
            type=f"CLUTCH_1v{enemies_at_start}",
            tick=solo_kills.iloc[0]["tick"],
            timestamp_sec=solo_kills.iloc[0]["timestamp_sec"],
            round_num=round_num,
            attacker=attacker_name,
            attacker_steamid=attacker_sid,
            description=f"CLUTCH 1v{enemies_at_start}! {attacker_name} i runde {round_num}",
            score=score,
            kills=solo_kills.to_dict("records"),
            extra={"enemies_at_clutch_start": int(enemies_at_start)},
        )
        highlights.append(h)
    return highlights


def _detect_fast_sprays(kills_df: pd.DataFrame) -> list[Highlight]:
    """Two kills within 3 seconds = fast spray."""
    highlights = []
    for (round_num, attacker_sid), group in kills_df.groupby(["round", "attacker_steamid"]):
        group = group.sort_values("tick").reset_index(drop=True)
        if len(group) < 2:
            continue
        for i in range(len(group) - 1):
            tick_diff = group.iloc[i + 1]["tick"] - group.iloc[i]["tick"]
            if tick_diff <= FAST_SPRAY_WINDOW_TICKS:
                attacker_name = group.iloc[i]["attacker_name"]
                h = Highlight(
                    type="FAST_SPRAY",
                    tick=group.iloc[i]["tick"],
                    timestamp_sec=group.iloc[i]["timestamp_sec"],
                    round_num=round_num,
                    attacker=attacker_name,
                    attacker_steamid=attacker_sid,
                    description=f"Hurtig spray! {attacker_name} fik 2 kills på {tick_diff/TICKS_PER_SECOND:.1f}s i runde {round_num}",
                    score=30,
                    kills=[group.iloc[i].to_dict(), group.iloc[i + 1].to_dict()],
                    extra={"time_between_kills_sec": round(tick_diff / TICKS_PER_SECOND, 2)},
                )
                highlights.append(h)
    return highlights


def _detect_quick_reactions(kills_df: pd.DataFrame) -> list[Highlight]:
    """Kill within 150-550ms = quick reaction time."""
    highlights = []
    if "time_to_kill_ticks" not in kills_df.columns:
        return highlights
    quick = kills_df[
        (kills_df["time_to_kill_ticks"] >= MIN_REACTION_TICKS) &
        (kills_df["time_to_kill_ticks"] <= MAX_REACTION_TICKS)
    ]
    for _, row in quick.iterrows():
        reaction_ms = int(row["time_to_kill_ticks"] / TICKS_PER_SECOND * 1000)
        h = Highlight(
            type="QUICK_REACTION",
            tick=row["tick"],
            timestamp_sec=row["timestamp_sec"],
            round_num=row["round"],
            attacker=row["attacker_name"],
            attacker_steamid=row["attacker_steamid"],
            description=f"Hurtig reaktion! {row['attacker_name']} → {row['victim_name']} på {reaction_ms}ms",
            score=25,
            kills=[row.to_dict()],
            extra={"reaction_ms": reaction_ms},
        )
        highlights.append(h)
    return highlights


def _deduplicate(highlights: list[Highlight]) -> list[Highlight]:
    """Remove lower-score highlights that share the same tick+attacker as a higher-score one."""
    seen = {}
    result = []
    for h in sorted(highlights, key=lambda x: x.score, reverse=True):
        key = (h.tick, h.attacker_steamid, h.round_num)
        if key not in seen:
            seen[key] = True
            result.append(h)
    return result
