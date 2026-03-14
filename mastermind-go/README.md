# Litepac's Mastermind Go

Parser-first reboot of the CS2 analysis stack.

This project exists because `skybox-light` proved that replay UI alone is not enough. The next version starts with a stable parser core and a clean replay data contract.

## Goals

V1 of this track focuses on:
- parse `.dem` files with `demoinfocs-golang`
- emit one clean replay JSON format
- drive a simple 2D replay view from real rounds, kills, utility, bomb events, and player positions
- add stats only after the replay/event data is trustworthy

## Workspace relationship

- `skybox-light`: prototype frontend and UX research
- `legacy-prototype`: old Python/html exporter reference
- `demoinfocs-parser`: upstream `demoinfocs-golang` clone for reference/examples
- `mastermind-go`: the new clean parser-based track

## Planned shape

- `cmd/exporter`: CLI to convert `.dem` -> `mastermind.replay.json`
- `internal/parser`: parser integration with `demoinfocs-golang`
- `internal/model`: canonical replay data model
- `internal/export`: JSON export layer
- `viewer/index.html`: minimal standalone replay viewer for the new format

## Inputs

Use demos from:
- [incoming-demos](C:/Users/rasmu/cs2_highlights/incoming-demos)
- [skybox-light/incoming-demos](C:/Users/rasmu/cs2_highlights/skybox-light/incoming-demos)

Canonical destination for this reboot:
- `mastermind-go/output`

## Prerequisites

- Go 1.24+ according to the upstream `demoinfocs-golang` README

## Current status

This track now runs locally and can export a first replay JSON from a real `.dem`.

Current verified command:

```powershell
cd C:\Users\rasmu\cs2_highlights\mastermind-go
go build -o .\bin\exporter.exe .\cmd\exporter
.\bin\exporter.exe -demo "C:\Users\rasmu\cs2_highlights\skybox-light\incoming-demos\testdemo.dem"
```

Current export coverage:
- map name
- map metadata
- players
- round windows
- kills
- utility events
- utility durations for smoke / molotov
- bomb events
- sampled frames with raw world coordinates and normalized radar coordinates

Known gaps:
- viewer exists but is still minimal and not yet visually validated from this shell
- event aggregation still needs tightening before UI use

## Viewer

Minimal viewer path:
- [viewer/index.html](C:/Users/rasmu/cs2_highlights/mastermind-go/viewer/index.html)

Current viewer scope:
- load a `mastermind.replay.json` file manually
- show rounds, score, roster, timeline and a simple 2D stage
- draw normalized player positions
- draw kill and utility marks from the new format
