# Repository Instructions

## Product
- This is the parser-first reboot of Litepac's Mastermind.
- The 2D replay is the primary product surface.
- Parsing correctness, replay fidelity, and clean event modeling come before extra dashboards and stats.

## Stack
- Core parser: Go
- Parse engine: `demoinfocs-golang`
- Output: JSON replay contract consumed by a separate UI later

## Engineering Rules
- Keep the replay contract explicit and versioned.
- Prefer fewer, trustworthy fields over broad but unreliable metadata.
- Do not introduce mock data in the core parser/export path.
- Preserve deterministic output structure so the frontend can rely on it.
- Keep CLI behavior simple and local-first.

## Planning Workflow
- The active plan lives in `plans.md`.
- Keep exactly these sections:
  - `Planned`
  - `In Progress`
  - `Done`
  - `Blocked`
- Update the plan when starting substantial work and when a milestone is verified.

## Current Priorities
1. Parse a real `.dem` via `demoinfocs-golang`
2. Define one canonical replay JSON format
3. Export rounds, kills, utility, bomb events, and sampled player positions
4. Validate against one known demo before broadening scope
