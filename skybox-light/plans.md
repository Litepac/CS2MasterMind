# Plans

This file is the working project plan for `skybox-light`.
Move items between sections as work progresses. Keep entries concrete.

## Planned
- Add clearer ingest status/history so failed DEM jobs keep their exact parser error and success jobs expose the saved source path.
- Add a watch-folder or batch-ingest flow on top of `incoming-demos`.
- Build round/event filters and focused event inspection on top of the real replay timeline.
- Add trustworthy stats panels back only after they are derived from verified replay data.

## In Progress
- Make the 2D replayer the primary product surface and use it as the center of the match review workflow.
- Replace placeholder replay styling with a real map-first stage that favors the imported radar asset and real player positions.
- Remove reliance on mock data from the main review flow and keep `.viewer.json` as the trusted replay import path while DEM ingest is hardened.
- Normalize legacy replay import more strictly so round winners, score progression, kill counts, and player stats come directly from replay data instead of heuristics.
- Build round/event filters and focused event inspection on top of the real replay timeline.

## Done
- Split the old prototype into `legacy-prototype` and the new app into `skybox-light`.
- Build the Next.js app shell and match report routes.
- Add local match storage in the web app.
- Add `.viewer.json` import through the web ingest route.
- Add a local ingest-job queue for `.dem` parsing.
- Persist uploaded source files into `skybox-light/incoming-demos`.
- Capture Python parser stderr/stdout and show concrete ingest errors in the UI.
- Add parser readiness checks for the local Python bridge (`py -3`, `pandas`, `awpy`) and surface status in the UI.
- Tighten legacy replay round headlines and reduce noisy utility/bomb timeline events from imported `.viewer.json` data.
- Unify the canonical `incoming-demos` path under `skybox-light` and show saved source paths in the dashboard and match view.
- Add map-focused replay overlays such as kill links, utility highlights, and cleaner labels on top of the real radar image.
- Add `awpy` compatibility fallback in the legacy exporter and readiness check so `Demo` can resolve from either `awpy` or `awpy.demo`.
- Make the web app prefer an explicit Python runtime via `PYTHON_EXECUTABLE` instead of relying on the default Windows launcher.
- Make the legacy exporter JSON-safe for numpy/pandas scalar values so `.viewer.json` writing does not fail on `int32` serialization.
- Compress the dashboard and match chrome so the replay view gets more space and the UI feels less oversized.
- Push the repo to GitHub and align the default branch history.
- Define `plans.md` + `AGENTS.md` workflow so project state and priorities are tracked in-repo.

## Blocked
- DEM parsing from the web app is blocked until `apps/web/.env.local` points to the same working Python runtime as the legacy flow, or until the default launcher resolves to a compatible Python with the right `awpy` API.
