# Plans

This is the working plan for the parser-first reboot.

## Planned
- Add kill-attacker / victim positions if needed for direct replay overlays.
- Add player-facing direction and grenade trajectories to the replay format.
- Add direct player switching controls on stage, not only via roster.

## In Progress
- Tighten the first `mastermind.replay.json` viewer so event density and replay readability are good enough for iteration.
- Reduce utility spam in the timeline and event inspection so the viewer reflects actionable moments instead of raw event floods.

## Done
- Clone the upstream `demoinfocs-golang` repository into `demoinfocs-parser` for reference.
- Freeze `skybox-light` as a prototype/reference track rather than the long-term parser foundation.
- Build the first `mastermind.replay.json` schema draft.
- Export round metadata, kills, utility, bomb events, and sampled frames from a real `.dem`.
- Validate the exporter against `skybox-light/incoming-demos/testdemo.dem`.
- Get `mastermind-go` running locally with Go 1.26.1 and workspace-local build output.
- Add known map metadata and normalize player / utility coordinates for supported maps.
- Capture smoke and molotov durations via `endTick` in the replay format.
- Create a new minimal standalone viewer in `viewer/index.html` that loads `mastermind.replay.json`.
- Replace the neutral-grid-only stage with a radar-aware canvas that attempts to load the correct map image.
- Fix viewer round resolution so ticks between rounds no longer fall back to Round 1 incorrectly.
- Fix map metadata display in the viewer sidebar/header so loaded replay data is shown truthfully.
- Fix roster display so dead players no longer show `undefined HP`.
- Add first-pass player focus in the viewer via roster selection.
- Aggregate timeline utility markers so the first viewer no longer renders raw utility spam one-by-one.
- Make playback time-based instead of raw `requestAnimationFrame` speed.
- Skip inter-round dead-space in the viewer so stale corpse positions are not shown as if they were live round states.

## Blocked
- The viewer still needs cleaner event inspection and real facing / trajectory data before it resembles Skybox-level replay depth.
