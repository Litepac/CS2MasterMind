"""
FACEIT API Integration
Downloads demos for a player or match from FACEIT.
Requires a FACEIT API key: https://developers.faceit.com/
"""

import os
import requests
import time
from pathlib import Path

BASE_URL = "https://open.faceit.com/data/v4"
DEMO_DOWNLOAD_TIMEOUT = 300  # seconds


class FaceitClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("FACEIT_API_KEY")
        if not self.api_key:
            raise ValueError(
                "FACEIT API key required. Set FACEIT_API_KEY env var or pass api_key=..."
            )
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        })

    def get_player(self, nickname: str) -> dict:
        """Get player info by FACEIT nickname."""
        r = self.session.get(f"{BASE_URL}/players", params={"nickname": nickname})
        r.raise_for_status()
        return r.json()

    def get_player_matches(self, player_id: str, game: str = "cs2", limit: int = 20) -> list[dict]:
        """Get recent matches for a player."""
        r = self.session.get(
            f"{BASE_URL}/players/{player_id}/history",
            params={"game": game, "limit": limit, "offset": 0},
        )
        r.raise_for_status()
        return r.json().get("items", [])

    def get_match_details(self, match_id: str) -> dict:
        """Get full match details including demo URL."""
        r = self.session.get(f"{BASE_URL}/matches/{match_id}")
        r.raise_for_status()
        return r.json()

    def get_demo_url(self, match_id: str) -> str | None:
        """Extract demo download URL from match details."""
        details = self.get_match_details(match_id)
        demo_urls = details.get("demo_url", [])
        if isinstance(demo_urls, list) and demo_urls:
            return demo_urls[0]
        if isinstance(demo_urls, str):
            return demo_urls
        return None

    def download_demo(self, match_id: str, output_dir: str | Path = "demos") -> Path | None:
        """
        Download demo for a match. Returns path to downloaded .dem file.
        FACEIT demos are .gz compressed — we save as-is and decompress if needed.
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        demo_url = self.get_demo_url(match_id)
        if not demo_url:
            print(f"  No demo URL found for match {match_id}")
            return None

        # Filename from URL or match ID
        filename = demo_url.split("/")[-1].split("?")[0]
        if not filename.endswith((".dem", ".dem.gz")):
            filename = f"{match_id}.dem.gz"

        out_path = output_dir / filename

        if out_path.exists():
            print(f"  Demo already downloaded: {out_path.name}")
            return out_path

        print(f"  Downloading demo for match {match_id}...")
        r = requests.get(demo_url, stream=True, timeout=DEMO_DOWNLOAD_TIMEOUT)
        r.raise_for_status()

        total = int(r.headers.get("content-length", 0))
        downloaded = 0
        with open(out_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = downloaded / total * 100
                    print(f"\r  Progress: {pct:.0f}%", end="", flush=True)
        print()

        # Decompress if .gz
        if str(out_path).endswith(".gz"):
            out_path = _decompress_gz(out_path)

        print(f"  Saved: {out_path}")
        return out_path

    def download_player_demos(
        self,
        nickname: str,
        output_dir: str | Path = "demos",
        limit: int = 10,
        delay: float = 1.0,
    ) -> list[Path]:
        """
        Download demos for a player's last N matches.
        Returns list of downloaded .dem file paths.
        """
        print(f"Looking up player: {nickname}")
        player = self.get_player(nickname)
        player_id = player["player_id"]
        print(f"  Player ID: {player_id}")

        matches = self.get_player_matches(player_id, limit=limit)
        print(f"  Found {len(matches)} matches")

        paths = []
        for i, match in enumerate(matches):
            match_id = match["match_id"]
            print(f"\n[{i+1}/{len(matches)}] Match: {match_id}")
            try:
                path = self.download_demo(match_id, output_dir)
                if path:
                    paths.append(path)
            except Exception as e:
                print(f"  Error: {e}")
            time.sleep(delay)

        return paths


def _decompress_gz(gz_path: Path) -> Path:
    """Decompress a .gz file, return path to decompressed file."""
    import gzip
    out_path = gz_path.with_suffix("")  # removes .gz
    print(f"  Decompressing {gz_path.name}...")
    with gzip.open(gz_path, "rb") as f_in, open(out_path, "wb") as f_out:
        while chunk := f_in.read(1024 * 1024):
            f_out.write(chunk)
    gz_path.unlink()  # remove .gz
    return out_path
