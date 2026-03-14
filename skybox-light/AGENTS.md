# Repository Instructions

## Product
- This is a single-user, local-first CS2 demo analysis tool inspired by Skybox.
- Prioritize correct ingest, correct map/replay data, trustworthy stats, and compact review workflows before advanced polish.
- Treat the legacy prototype in the repo root as reference material, not as the architecture to copy.

## Stack
- Frontend: Next.js + TypeScript + Tailwind.
- Parser service: Go.
- Database: Postgres.
- Python is allowed as a local parser bridge while DEM ingest is being made reliable. Do not remove a working Python path before there is a verified replacement.

## Engineering Rules
- Keep modules small and explicit.
- Prefer typed interfaces and boring, predictable code over clever abstractions.
- Minimize dependencies.
- Avoid auth, multi-user concerns, and cloud-specific complexity.
- Explain planned changes before large edits.
- When adding schema or API surface, update docs and example payloads.
- Do not stop at partial fixes when the task can be carried through implementation and verification in the same work session.
- Prefer removing weak or misleading UI/stats over showing impressive but untrustworthy data.
- Do not use mock data for core replay, map, round, event, or player-stat flows unless the UI labels it explicitly as mock and the real path is blocked.

## Planning Workflow
- The repository plan lives in `plans.md`.
- Keep plan items under exactly these sections:
  - `Planned`
  - `In Progress`
  - `Done`
  - `Blocked`
- Update `plans.md` when starting substantial work, when scope changes, and when a milestone is verified.
- Move items instead of duplicating them.
- Keep items concrete and testable.

## Current Priorities
1. Reliable DEM and `.viewer.json` ingest with actionable errors.
2. Real map assets and correct replay coordinate rendering.
3. Trustworthy round, event, and player-stat normalization.
4. Compact match review UI driven by real data.
5. Replace stopgap parser pieces only after the replacement is verified end-to-end.
