"""
Extracts radar image + coordinates from CS2 VPK files.
Run: python extract_map.py de_overpass
"""

import sys
import re
import vpk
from pathlib import Path

CS2_PATHS = [
    r"C:\Programmer (x86)\Steam\steamapps\common\Counter-Strike Global Offensive",
    r"C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive",
    r"C:\Program Files\Steam\steamapps\common\Counter-Strike Global Offensive",
    r"D:\Steam\steamapps\common\Counter-Strike Global Offensive",
    r"D:\SteamLibrary\steamapps\common\Counter-Strike Global Offensive",
]

def find_cs2():
    for p in CS2_PATHS:
        path = Path(p)
        if path.exists():
            return path
    return None

def extract_map(map_name: str, output_dir: str = "maps"):
    cs2 = find_cs2()
    if not cs2:
        print("CS2 ikke fundet — rediger CS2_PATHS i scriptet")
        return

    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)

    vpk_path = cs2 / "game" / "csgo" / "maps" / f"{map_name}.vpk"
    if not vpk_path.exists():
        print(f"VPK ikke fundet: {vpk_path}")
        return

    print(f"Åbner {vpk_path.name} ({vpk_path.stat().st_size // 1024 // 1024} MB)...")
    pak = vpk.open(str(vpk_path))

    # --- Extract radar PNG ---
    radar_paths = [
        f"resource/overviews/{map_name}_radar.png",
        f"panorama/images/overheadmaps/{map_name}.png",
    ]
    for rp in radar_paths:
        try:
            data = pak[rp].read()
            out = output_dir / f"{map_name}_radar.png"
            out.write_bytes(data)
            print(f"  Radar gemt: {out}")
            break
        except KeyError:
            continue
    else:
        print("  Radar PNG ikke fundet i VPK")

    # --- Extract overview txt (coordinates) ---
    txt_path = f"resource/overviews/{map_name}.txt"
    try:
        txt = pak[txt_path].read().decode("utf-8", errors="ignore")
        pos_x = float(re.search(r'"pos_x"\s+"([^"]+)"', txt).group(1))
        pos_y = float(re.search(r'"pos_y"\s+"([^"]+)"', txt).group(1))
        scale = float(re.search(r'"scale"\s+"([^"]+)"', txt).group(1))
        print(f"\n  Koordinater:")
        print(f"  pos_x = {pos_x}")
        print(f"  pos_y = {pos_y}")
        print(f"  scale = {scale}")
        print(f"\n  Indsæt i viewer_export.py MAP_DATA:")
        print(f"  '{map_name}': {{'pos_x': {pos_x}, 'pos_y': {pos_y}, 'scale': {scale}}},")
    except (KeyError, AttributeError) as e:
        print(f"  Koordinater ikke fundet: {e}")

if __name__ == "__main__":
    map_name = sys.argv[1] if len(sys.argv) > 1 else "de_overpass"
    extract_map(map_name)
