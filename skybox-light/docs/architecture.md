# Architecture

## V1 Boundaries

- `web` owns UI, upload workflow, match views, player views.
- `parser-go` owns demo ingest and normalized analysis payloads.
- Postgres stores match metadata and report-oriented projections.

## Near-Term Flow

1. User uploads demo from the web app.
2. Web stores file metadata and submits parse request.
3. Parser service returns normalized match payload.
4. Web persists match, players, rounds, and summary stats.
5. UI renders match report and player views.

## Later

- event explorer
- 2D replay module
- pattern finder
- prep views
