# Repository Instructions

## Product
- This is a single-user, local-first CS2 demo analysis tool inspired by Skybox.
- Prioritize ingest pipeline, round summaries, match reports, and player stats before advanced replay.
- Treat the legacy prototype in the repo root as reference material, not as the architecture to copy.

## Stack
- Frontend: Next.js + TypeScript + Tailwind.
- Parser service: Go.
- Database: Postgres.
- Keep Python optional for later analytics or migration helpers, not as the app backbone.

## Engineering Rules
- Keep modules small and explicit.
- Prefer typed interfaces and boring, predictable code over clever abstractions.
- Minimize dependencies.
- Avoid auth, multi-user concerns, and cloud-specific complexity.
- Explain planned changes before large edits.
- When adding schema or API surface, update docs and example payloads.

## Current Priorities
1. Demo ingest flow.
2. Match metadata storage.
3. Basic player and team stats.
4. Round summaries and event timeline data model.
5. Replay UI only after the ingest and report pipeline is stable.
