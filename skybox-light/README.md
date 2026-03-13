# Skybox Light

Local-first CS2 demo analysis platform.

## Scope

V1 focuses on:
- uploading `.dem` files
- storing match metadata
- basic player and team stats
- round summaries
- clean base architecture for later 2D replay

## Structure

- `apps/web`: Next.js frontend
- `services/parser-go`: Go parser service
- `infra`: local infrastructure such as Postgres
- `docs`: architecture notes and contracts

## Local Setup

1. Start Postgres:

```powershell
docker compose -f infra/docker-compose.yml up -d
```

2. Install frontend dependencies:

```powershell
cd apps/web
npm install
```

3. Run the frontend:

```powershell
npm run dev
```

4. Use the current ingest flow:

- Open `http://localhost:3000`
- Click `Select Demo`
- Choose a `.dem` file
- Click `Parse Demo`

This hits the internal Next.js ingest route at `app/api/ingest`.

5. Run the parser service:

```powershell
cd ..\\..\\services\\parser-go
go run ./cmd/parser
```

## Notes

- The parser service is scaffolded as a clean boundary. It does not yet parse real demos.
- The web ingest route now tries `parser-go` first by writing the uploaded `.dem` to a temporary local file and POSTing its path to the parser service.
- If the parser service is not running, ingest falls back to mock data so the UI remains usable.
- The UI shows the current data source as either `parser-go` or `mock`.
- The existing prototype in the parent repo can be used as reference for events and replay concepts.
