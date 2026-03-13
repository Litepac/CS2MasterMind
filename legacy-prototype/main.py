#!/usr/bin/env python3
"""
CS2 Highlight Parser — Main entry point

Usage:
  # Parse a single demo file
  python main.py demo path/to/file.dem

  # Parse all demos in a folder
  python main.py folder path/to/demos/

  # Download + parse from FACEIT
  python main.py faceit <nickname> [--limit 10]

Environment:
  FACEIT_API_KEY   Your FACEIT API key (required for 'faceit' command)
"""

import sys
import argparse
from pathlib import Path

from parser import parse_demo
from highlights import detect_highlights
from report import generate_report


def process_demo(demo_path: Path, output_dir: Path):
    print(f"\n{'='*60}")
    print(f"Processing: {demo_path.name}")
    print('='*60)

    demo_info = parse_demo(demo_path)
    kills_df = demo_info["kills"]

    if kills_df.empty:
        print("  No kills found — skipping.")
        return None

    highlights = detect_highlights(kills_df, demo_info.get("rounds"))

    print(f"\n  Highlights detected: {len(highlights)}")
    for h in highlights[:10]:  # preview top 10
        print(f"    [{h.score:3d}] {h.type:<20} {h.description}")

    paths = generate_report(highlights, demo_info, output_dir)
    return paths


def cmd_demo(args):
    demo_path = Path(args.path)
    output_dir = Path(args.output)
    process_demo(demo_path, output_dir)


def cmd_folder(args):
    folder = Path(args.path)
    output_dir = Path(args.output)
    demos = list(folder.glob("*.dem"))
    if not demos:
        print(f"No .dem files found in {folder}")
        sys.exit(1)
    print(f"Found {len(demos)} demo(s) in {folder}")
    for demo in sorted(demos):
        process_demo(demo, output_dir)


def cmd_faceit(args):
    from faceit import FaceitClient
    client = FaceitClient()
    demo_dir = Path("demos")
    output_dir = Path(args.output)

    print(f"Fetching last {args.limit} matches for: {args.nickname}")
    demo_paths = client.download_player_demos(
        nickname=args.nickname,
        output_dir=demo_dir,
        limit=args.limit,
    )

    print(f"\nDownloaded {len(demo_paths)} demos. Parsing...")
    for demo_path in demo_paths:
        process_demo(demo_path, output_dir)


def main():
    parser = argparse.ArgumentParser(
        description="CS2 Demo Highlight Parser",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--output", "-o", default="output", help="Output directory (default: output/)")
    sub = parser.add_subparsers(dest="command", required=True)

    # demo
    p_demo = sub.add_parser("demo", help="Parse a single .dem file")
    p_demo.add_argument("path", help="Path to .dem file")
    p_demo.set_defaults(func=cmd_demo)

    # folder
    p_folder = sub.add_parser("folder", help="Parse all .dem files in a folder")
    p_folder.add_argument("path", help="Path to folder containing .dem files")
    p_folder.set_defaults(func=cmd_folder)

    # faceit
    p_faceit = sub.add_parser("faceit", help="Download and parse demos from FACEIT")
    p_faceit.add_argument("nickname", help="FACEIT nickname")
    p_faceit.add_argument("--limit", type=int, default=10, help="Number of recent matches (default: 10)")
    p_faceit.set_defaults(func=cmd_faceit)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
