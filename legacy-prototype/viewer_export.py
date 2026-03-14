"""
CS2 2D viewer data exporter.
Builds a richer JSON payload with frames, kills, utility, round metadata,
bomb events and a unified timeline for the HTML viewer.
"""

import argparse
import json
from pathlib import Path

import pandas as pd

try:
    from awpy import Demo
except Exception:
    from awpy.demo import Demo


def json_default(value):
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass
    if isinstance(value, Path):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


MAP_DATA = {
    "de_overpass": {"pos_x": -4831, "pos_y": 1781, "scale": 5.2},
    "de_dust2": {"pos_x": -2476, "pos_y": 3239, "scale": 4.4},
    "de_mirage": {"pos_x": -3230, "pos_y": 1713, "scale": 5.0},
    "de_inferno": {"pos_x": -2087, "pos_y": 3870, "scale": 4.9},
    "de_nuke": {"pos_x": -3453, "pos_y": 2887, "scale": 7.0},
    "de_ancient": {"pos_x": -2953, "pos_y": 2164, "scale": 5.0},
    "de_anubis": {"pos_x": -2796, "pos_y": 3328, "scale": 5.22},
    "de_vertigo": {"pos_x": -3168, "pos_y": 1762, "scale": 4.0},
    "de_train": {"pos_x": -2477, "pos_y": 2392, "scale": 4.7},
    "de_cache": {"pos_x": -2000, "pos_y": 3250, "scale": 5.5},
}

SAMPLE_RATE = 4
MAP_IMAGE_SIZE = 1024

UTILITY_TYPE_MAP = {
    "flashbang": "flash",
    "hegrenade": "he",
    "he_grenade": "he",
    "smokegrenade": "smoke",
    "smoke": "smoke",
    "molotov": "molotov",
    "incgrenade": "molotov",
    "incendiary": "molotov",
    "firebomb": "molotov",
    "decoy": "decoy",
}


def game_to_pixel(map_name, x, y):
    map_meta = MAP_DATA.get(map_name, MAP_DATA["de_dust2"])
    px = (x - map_meta["pos_x"]) / map_meta["scale"]
    py = (map_meta["pos_y"] - y) / map_meta["scale"]
    return round(px / MAP_IMAGE_SIZE, 4), round(py / MAP_IMAGE_SIZE, 4)


def safe_frame(table) -> pd.DataFrame:
    if table is None:
        return pd.DataFrame()
    try:
        return table.to_pandas()
    except Exception:
        return pd.DataFrame()


def first_value(row, names, default=None):
    for name in names:
        if name in row and pd.notna(row[name]):
            return row[name]
    return default


def clean_int(value, default=0):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return default
    try:
        return int(value)
    except Exception:
        return default


def clean_float(value, default=0.0):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return default
    try:
        return float(value)
    except Exception:
        return default


def clean_str(value, default=""):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return default
    return str(value)


def normalize_side(value):
    side = clean_str(value).lower()
    if side in {"ct", "counterterrorist", "counter-terrorist", "3"}:
        return "CT"
    if side in {"t", "terrorist", "2"}:
        return "T"
    return ""


def normalize_rounds(rounds_df: pd.DataFrame):
    rounds = []
    ct_score = 0
    t_score = 0

    for _, row in rounds_df.iterrows():
        row = row.to_dict()
        round_num = clean_int(first_value(row, ["round_num", "round", "round_number"]))
        start_tick = clean_int(first_value(row, ["start_tick", "round_start_tick", "official_start_tick"]))
        freeze_end_tick = clean_int(first_value(row, ["freeze_end_tick", "freezetime_end_tick", "freeze_time_end_tick"], start_tick))
        bomb_planted_tick = clean_int(first_value(row, ["bomb_plant_tick", "plant_tick", "bomb_planted_tick"]), -1)
        bomb_defused_tick = clean_int(first_value(row, ["bomb_defuse_tick", "defuse_tick", "bomb_defused_tick"]), -1)
        end_tick = clean_int(first_value(row, ["end_tick", "official_end_tick", "round_end_tick"], freeze_end_tick))
        winner_side = normalize_side(first_value(row, ["winner_side", "winning_side", "round_winner_side"]))
        winner_team = clean_str(first_value(row, ["winner_team", "winning_team", "winner", "round_winner"]))
        win_reason = clean_str(first_value(row, ["end_reason", "reason", "win_reason", "round_end_reason"]))
        if not winner_side:
            winner_side = normalize_side(winner_team)
        if winner_side == "CT":
            ct_score += 1
        elif winner_side == "T":
            t_score += 1

        rounds.append({
            "round": round_num,
            "start": start_tick,
            "freeze_end": freeze_end_tick,
            "end": end_tick,
            "plant_tick": bomb_planted_tick,
            "defuse_tick": bomb_defused_tick,
            "winner_side": winner_side,
            "winner_team": winner_team,
            "win_reason": win_reason,
            "score_ct": ct_score,
            "score_t": t_score,
        })

    return rounds


def infer_round_windows(rounds, kills, utility, bomb_events, frame_ticks):
    if not rounds:
        return rounds

    by_round_ticks = {}
    for collection in (kills, utility, bomb_events):
        for event in collection:
            round_num = clean_int(event.get("round"), 0)
            if round_num <= 0:
                continue
            bucket = by_round_ticks.setdefault(round_num, [])
            bucket.append(clean_int(event.get("tick"), 0))
            end_tick = clean_int(event.get("end_tick"), clean_int(event.get("tick"), 0))
            bucket.append(end_tick)

    frame_min = min(frame_ticks) if frame_ticks else 0
    frame_max = max(frame_ticks) if frame_ticks else 0

    for index, round_meta in enumerate(rounds):
        round_num = round_meta["round"]
        event_ticks = sorted(tick for tick in by_round_ticks.get(round_num, []) if tick > 0)

        inferred_start = round_meta["start"]
        inferred_end = round_meta["end"]
        if event_ticks:
            inferred_start = max(frame_min, event_ticks[0] - 256)
            inferred_end = min(frame_max or event_ticks[-1], event_ticks[-1] + 256)

        if round_meta["start"] <= 0 and inferred_start > 0:
            round_meta["start"] = inferred_start
        if round_meta["freeze_end"] <= 0 and round_meta["start"] > 0:
            round_meta["freeze_end"] = round_meta["start"]
        if round_meta["end"] <= 0 and inferred_end > 0:
            round_meta["end"] = inferred_end

        if index > 0 and round_meta["start"] <= rounds[index - 1]["end"]:
            round_meta["start"] = rounds[index - 1]["end"] + 1
            if round_meta["freeze_end"] < round_meta["start"]:
                round_meta["freeze_end"] = round_meta["start"]
        if round_meta["end"] < round_meta["start"]:
            round_meta["end"] = round_meta["start"]

    for index, round_meta in enumerate(rounds[:-1]):
        next_round = rounds[index + 1]
        if next_round["start"] > round_meta["start"]:
            round_meta["end"] = min(round_meta["end"], next_round["start"] - 1)

    if rounds[-1]["end"] <= 0:
        rounds[-1]["end"] = frame_max
    return rounds


def build_players(ticks_pd: pd.DataFrame):
    player_index = {}
    for _, row in ticks_pd.iterrows():
        sid = clean_str(row.get("steamid", ""))
        name = clean_str(row.get("name", ""))
        team = clean_int(row.get("team_num", 0))
        if sid and sid not in player_index:
            player_index[sid] = {"name": name, "team": team, "steamid": sid}
        if sid in player_index and player_index[sid]["team"] == 0 and team != 0:
            player_index[sid]["team"] = team
        if sid in player_index and not player_index[sid]["name"] and name:
            player_index[sid]["name"] = name
    players = list(player_index.values())
    sid_to_idx = {player["steamid"]: idx for idx, player in enumerate(players)}
    return players, sid_to_idx


def build_frames(ticks_pd: pd.DataFrame, sid_to_idx, map_name):
    frames = {}
    for tick, group in ticks_pd.groupby("tick"):
        frame = []
        for _, row in group.iterrows():
            sid = clean_str(row.get("steamid", ""))
            px, py = game_to_pixel(map_name, clean_float(row.get("X", 0)), clean_float(row.get("Y", 0)))
            frame.append([
                sid_to_idx.get(sid, -1),
                px,
                py,
                1 if bool(row.get("is_alive", True)) else 0,
                clean_int(row.get("health", 100), 100),
                clean_int(row.get("armor_value", row.get("armor", 0)), 0),
                clean_int(row.get("has_defuser", 0), 0),
                clean_int(row.get("has_bomb", 0), 0),
            ])
        frames[str(clean_int(tick))] = frame
    return frames


def build_kill_events(kills_pd: pd.DataFrame, map_name):
    kill_events = []
    for _, row in kills_pd.iterrows():
        row = row.to_dict()
        ax, ay = game_to_pixel(
            map_name,
            clean_float(first_value(row, ["attacker_X", "attacker_x"])),
            clean_float(first_value(row, ["attacker_Y", "attacker_y"])),
        )
        vx, vy = game_to_pixel(
            map_name,
            clean_float(first_value(row, ["victim_X", "victim_x", "user_X", "user_x"])),
            clean_float(first_value(row, ["victim_Y", "victim_y", "user_Y", "user_y"])),
        )
        round_num = clean_int(first_value(row, ["round_num", "round"]))
        kill_events.append({
            "type": "kill",
            "tick": clean_int(row.get("tick", 0)),
            "round": round_num,
            "attacker": clean_str(first_value(row, ["attacker_name", "attacker"])),
            "victim": clean_str(first_value(row, ["victim_name", "user_name", "victim"])),
            "assister": clean_str(first_value(row, ["assister_name", "assister"])),
            "weapon": clean_str(row.get("weapon", "")).replace("weapon_", ""),
            "hs": bool(row.get("headshot", False)),
            "wallbang": bool(first_value(row, ["wallbang", "is_wallbang"], False)),
            "noscope": bool(first_value(row, ["noscope", "is_noscope"], False)),
            "trade": bool(first_value(row, ["is_trade", "trade_kill"], False)),
            "entry": bool(first_value(row, ["is_entry", "entry_kill"], False)),
            "ax": ax,
            "ay": ay,
            "vx": vx,
            "vy": vy,
        })
    return kill_events


def normalize_utility_type(raw_value):
    value = clean_str(raw_value).lower().replace("weapon_", "").replace("grenade_", "")
    if value.startswith("c") and len(value) > 1:
        value = value[1:]
    value = value.replace("grenade", "")
    return UTILITY_TYPE_MAP.get(value, value or "utility")


def build_utility_events(map_name, grenade_df, smoke_df, inferno_df):
    raw_events = []

    for _, row in grenade_df.iterrows():
        row = row.to_dict()
        tick = clean_int(first_value(row, ["tick", "throw_tick", "start_tick"]))
        end_tick = clean_int(first_value(row, ["end_tick", "destroy_tick", "expire_tick"]), tick)
        util_type = normalize_utility_type(first_value(row, ["grenade_type", "weapon", "type", "name"]))
        if util_type.endswith("projectile"):
            util_type = util_type[:-10]
        if util_type not in {"flash", "he", "decoy"}:
            continue
        px, py = game_to_pixel(
            map_name,
            clean_float(first_value(row, ["X", "x", "entity_X", "landing_X", "dest_X"])),
            clean_float(first_value(row, ["Y", "y", "entity_Y", "landing_Y", "dest_Y"])),
        )
        raw_events.append({
            "type": util_type,
            "tick": tick,
            "end_tick": end_tick,
            "round": clean_int(first_value(row, ["round_num", "round"])),
            "player": clean_str(first_value(row, ["thrower_name", "player_name", "user_name"])),
            "team": clean_int(first_value(row, ["thrower_team_num", "team_num", "team"])),
            "x": px,
            "y": py,
        })

    for _, row in smoke_df.iterrows():
        row = row.to_dict()
        start_tick = clean_int(first_value(row, ["start_tick", "tick", "spawn_tick"]))
        end_tick = clean_int(first_value(row, ["end_tick", "destroy_tick", "expire_tick"]), start_tick + 1152)
        px, py = game_to_pixel(
            map_name,
            clean_float(first_value(row, ["X", "x", "entity_X"])),
            clean_float(first_value(row, ["Y", "y", "entity_Y"])),
        )
        raw_events.append({
            "type": "smoke",
            "tick": start_tick,
            "end_tick": end_tick,
            "round": clean_int(first_value(row, ["round_num", "round"])),
            "player": clean_str(first_value(row, ["thrower_name", "player_name", "user_name"])),
            "team": clean_int(first_value(row, ["thrower_team_num", "team_num", "team"])),
            "x": px,
            "y": py,
        })

    for _, row in inferno_df.iterrows():
        row = row.to_dict()
        start_tick = clean_int(first_value(row, ["start_tick", "tick", "spawn_tick"]))
        end_tick = clean_int(first_value(row, ["end_tick", "destroy_tick", "expire_tick"]), start_tick + 448)
        px, py = game_to_pixel(
            map_name,
            clean_float(first_value(row, ["X", "x", "entity_X"])),
            clean_float(first_value(row, ["Y", "y", "entity_Y"])),
        )
        raw_events.append({
            "type": "molotov",
            "tick": start_tick,
            "end_tick": end_tick,
            "round": clean_int(first_value(row, ["round_num", "round"])),
            "player": clean_str(first_value(row, ["thrower_name", "player_name", "user_name"])),
            "team": clean_int(first_value(row, ["thrower_team_num", "team_num", "team"])),
            "x": px,
            "y": py,
        })

    raw_events.sort(key=lambda item: (item["round"], item["type"], item["player"], item["tick"]))

    events = []
    grouped = {}
    for event in raw_events:
        key = (
            event["round"],
            event["type"],
            event["player"],
            event["team"],
            round(event["x"], 3),
            round(event["y"], 3),
        )
        existing = grouped.get(key)

        # Merge repeated entity/tick rows for the same utility into one event span.
        if existing and event["tick"] <= existing["end_tick"] + 16:
            existing["tick"] = min(existing["tick"], event["tick"])
            existing["end_tick"] = max(existing["end_tick"], event["end_tick"])
            continue

        item = dict(event)
        grouped[key] = item
        events.append(item)

    return events


def build_bomb_events(bomb_df, rounds):
    events = []
    if not bomb_df.empty:
        for _, row in bomb_df.iterrows():
            row = row.to_dict()
            action = clean_str(first_value(row, ["event", "action", "bomb_action", "type"])).lower()
            if not action:
                action = "bomb"
            round_num = clean_int(first_value(row, ["round_num", "round"]))
            events.append({
                "type": action,
                "tick": clean_int(first_value(row, ["tick", "event_tick"])),
                "round": round_num,
                "player": clean_str(first_value(row, ["player_name", "user_name", "planter_name", "defuser_name"])),
                "site": clean_str(first_value(row, ["site", "bombsite"])).upper(),
            })

    known = {(event["tick"], event["type"], event["round"]) for event in events}
    for round_meta in rounds:
        if round_meta["plant_tick"] >= 0:
            key = (round_meta["plant_tick"], "plant", round_meta["round"])
            if key not in known:
                events.append({
                    "type": "plant",
                    "tick": round_meta["plant_tick"],
                    "round": round_meta["round"],
                    "player": "",
                    "site": "",
                })
        if round_meta["defuse_tick"] >= 0:
            key = (round_meta["defuse_tick"], "defuse", round_meta["round"])
            if key not in known:
                events.append({
                    "type": "defuse",
                    "tick": round_meta["defuse_tick"],
                    "round": round_meta["round"],
                    "player": "",
                    "site": "",
                })
    events.sort(key=lambda item: (item["tick"], item["type"]))
    return events


def build_round_timeline(rounds, kills, utility, bomb_events):
    by_round = {}
    for round_meta in rounds:
        round_num = round_meta["round"]
        by_round[str(round_num)] = {
            **round_meta,
            "kill_count": sum(1 for event in kills if event["round"] == round_num),
            "utility_count": sum(1 for event in utility if event["round"] == round_num),
            "bomb_event_count": sum(1 for event in bomb_events if event["round"] == round_num),
        }
    return by_round


def build_timeline_events(kills, utility, bomb_events):
    events = []
    for kill in kills:
        events.append({
            "kind": "kill",
            "tick": kill["tick"],
            "round": kill["round"],
            "label": f'{kill["attacker"]} -> {kill["victim"]}',
            "accent": "kill",
        })
    for util in utility:
        label = f'{util["player"]} {util["type"]}'.strip()
        events.append({
            "kind": util["type"],
            "tick": util["tick"],
            "round": util["round"],
            "label": label or util["type"],
            "accent": util["type"],
        })
    for bomb in bomb_events:
        events.append({
            "kind": bomb["type"],
            "tick": bomb["tick"],
            "round": bomb["round"],
            "label": bomb["type"].upper(),
            "accent": "bomb",
        })
    events.sort(key=lambda item: (item["tick"], item["kind"]))
    return events


def export_viewer_data(demo_path: str | Path, output_path: str | Path = None):
    demo_path = Path(demo_path)
    print(f"Parsing demo: {demo_path.name}")

    dem = Demo(str(demo_path))
    dem.parse()

    map_name = dem.header.get("map_name", "de_dust2") if dem.header else "de_dust2"
    print(f"  Map: {map_name}")

    print("  Extracting player positions...")
    ticks_df = dem.parse_ticks(
        player_props=["X", "Y", "Z", "team_num", "health", "armor_value", "name", "steamid", "is_alive", "has_defuser", "has_bomb"]
    )
    ticks_pd = ticks_df.to_pandas()

    all_ticks = sorted(ticks_pd["tick"].unique())
    sampled_ticks = [tick for idx, tick in enumerate(all_ticks) if idx % SAMPLE_RATE == 0]
    ticks_pd = ticks_pd[ticks_pd["tick"].isin(sampled_ticks)]

    kills_pd = safe_frame(getattr(dem, "kills", None))
    rounds_pd = safe_frame(getattr(dem, "rounds", None))
    grenade_pd = safe_frame(getattr(dem, "grenades", None))
    smoke_pd = safe_frame(getattr(dem, "smokes", None))
    inferno_pd = safe_frame(getattr(dem, "infernos", None))
    bomb_pd = safe_frame(getattr(dem, "bomb", None))

    players, sid_to_idx = build_players(ticks_pd)
    print(f"  {len(players)} players, {len(sampled_ticks)} ticks sampled")

    print("  Building frames...")
    frames = build_frames(ticks_pd, sid_to_idx, map_name)
    kills = build_kill_events(kills_pd, map_name)
    rounds = normalize_rounds(rounds_pd)
    utility = build_utility_events(map_name, grenade_pd, smoke_pd, inferno_pd)
    bomb_events = build_bomb_events(bomb_pd, rounds)
    rounds = infer_round_windows(rounds, kills, utility, bomb_events, sampled_ticks)
    round_index = build_round_timeline(rounds, kills, utility, bomb_events)
    timeline = build_timeline_events(kills, utility, bomb_events)

    output = {
        "demo": demo_path.stem,
        "map": map_name,
        "sample_rate": SAMPLE_RATE,
        "ticks_per_sec": 64,
        "players": players,
        "rounds": round_index,
        "kills": kills,
        "utility": utility,
        "bomb_events": bomb_events,
        "timeline": timeline,
        "frames": frames,
    }

    out_path = Path(output_path) if output_path else demo_path.with_suffix(".viewer.json")
    print(f"  Writing {out_path.name}...")
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(output, handle, separators=(",", ":"), ensure_ascii=False, default=json_default)

    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"\n  Done! {out_path} ({size_mb:.1f} MB)")
    print(
        "  Frames: "
        f'{len(frames)}, Kills: {len(kills)}, Utility: {len(utility)}, '
        f'Bomb events: {len(bomb_events)}, Rounds: {len(round_index)}'
    )
    return out_path


def main():
    parser = argparse.ArgumentParser(description="Export CS2 demo to enriched 2D viewer JSON")
    parser.add_argument("demo", help="Path to .dem file")
    parser.add_argument("--output", "-o", help="Output JSON path")
    args = parser.parse_args()
    export_viewer_data(args.demo, args.output)


if __name__ == "__main__":
    main()
