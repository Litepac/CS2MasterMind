"""
CS2 Demo Parser — Awpy 2.0
Parses .dem files using awpy and returns structured kill/round data.
"""

import pandas as pd
from pathlib import Path
from awpy import Demo


def parse_demo(demo_path: str | Path) -> dict:
    """
    Parse a CS2 .dem file using Awpy 2.0.
    Returns dict with: kills, rounds, damages, players, map, duration_ticks, demo_name
    """
    demo_path = Path(demo_path)
    if not demo_path.exists():
        raise FileNotFoundError(f"Demo not found: {demo_path}")

    print(f"  Parsing: {demo_path.name}")
    dem = Demo(str(demo_path))
    dem.parse()

    map_name = dem.header.get("map_name", "unknown") if dem.header else "unknown"

    kills_df = dem.kills.to_pandas() if dem.kills is not None else pd.DataFrame()
    kills_df = _normalize_kills(kills_df)

    rounds_df = dem.rounds.to_pandas() if dem.rounds is not None else pd.DataFrame()

    damages_df = dem.damages.to_pandas() if dem.damages is not None else pd.DataFrame()

    players = _get_players(kills_df)
    duration_ticks = int(kills_df["tick"].max()) if not kills_df.empty else 0

    print(f"  {len(kills_df)} kills | {len(rounds_df)} rounds | map: {map_name}")

    return {
        "kills": kills_df,
        "rounds": rounds_df,
        "damages": damages_df,
        "players": players,
        "map": map_name,
        "duration_ticks": duration_ticks,
        "demo_name": demo_path.stem,
    }


def _normalize_kills(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    # Awpy 2.0 uses round_num — rename to round
    df = df.rename(columns={"round_num": "round"})

    for col in ["attacker_name", "attacker_steamid", "victim_name", "victim_steamid", "weapon", "headshot", "round"]:
        if col not in df.columns:
            df[col] = None

    # Remove suicides and teamkills
    df = df[df["attacker_steamid"] != df["victim_steamid"]]
    if "attacker_team_num" in df.columns and "victim_team_num" in df.columns:
        df = df[df["attacker_team_num"] != df["victim_team_num"]]

    df["timestamp_sec"] = df["tick"] / 64.0
    df = _add_alive_counts(df)
    df = _add_time_to_kill(df)

    return df.reset_index(drop=True)


def _add_alive_counts(df: pd.DataFrame) -> pd.DataFrame:
    if "attacker_team_num" not in df.columns or "victim_team_num" not in df.columns:
        df["attackers_alive"] = 5
        df["victims_alive"] = 5
        return df

    result_rows = []
    for round_num, round_kills in df.groupby("round"):
        round_kills = round_kills.sort_values("tick").reset_index(drop=True)
        team_alive = {}
        for team in pd.concat([round_kills["victim_team_num"], round_kills["attacker_team_num"]]).dropna().unique():
            team_alive[int(team)] = 5

        for _, row in round_kills.iterrows():
            a_team = int(row["attacker_team_num"]) if pd.notna(row.get("attacker_team_num")) else None
            v_team = int(row["victim_team_num"]) if pd.notna(row.get("victim_team_num")) else None
            result_rows.append({
                **row.to_dict(),
                "attackers_alive": team_alive.get(a_team, 5),
                "victims_alive": team_alive.get(v_team, 5),
            })
            if v_team is not None and v_team in team_alive:
                team_alive[v_team] = max(0, team_alive[v_team] - 1)

    return pd.DataFrame(result_rows) if result_rows else df


def _add_time_to_kill(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["time_to_kill_ticks"] = 128
    for (_, attacker_sid), group in df.groupby(["round", "attacker_steamid"]):
        group = group.sort_values("tick")
        ticks = group["tick"].tolist()
        ttk = [128] + [ticks[i] - ticks[i-1] for i in range(1, len(ticks))]
        df.loc[group.index, "time_to_kill_ticks"] = ttk
    return df


def _get_players(kills_df: pd.DataFrame) -> list[dict]:
    players = {}
    for _, row in kills_df.iterrows():
        for name_col, sid_col, team_col in [
            ("attacker_name", "attacker_steamid", "attacker_team_num"),
            ("victim_name", "victim_steamid", "victim_team_num"),
        ]:
            name = row.get(name_col)
            sid = row.get(sid_col, "unknown")
            if name and pd.notna(name) and sid not in players:
                players[sid] = {"name": name, "steamid": str(sid), "team_num": row.get(team_col)}
    return list(players.values())
