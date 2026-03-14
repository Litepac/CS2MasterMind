# Litepac's Mastermind

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
- `plans.md`: active project plan and status board
- `incoming-demos`: canonical local folder for uploaded source demos and replay JSON files

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

Optional but recommended for DEM parsing:

Create `apps/web/.env.local` and point the app to the same Python you use manually:

```powershell
Copy-Item .env.local.example .env.local
```

Then edit `apps/web/.env.local`:

```text
PYTHON_EXECUTABLE=C:\Users\rasmu\AppData\Local\Programs\Python\Python312\python.exe
```

4. Use the current ingest flow:

- Open `http://localhost:3000`
- Click `Select Demo`
- Choose a `.dem` or `.viewer.json` file
- Click `Parse Demo`

This hits the internal Next.js ingest route at `app/api/ingest`.
Every file is copied into `skybox-light/incoming-demos`, so there is one stable place for local source files.

5. Run the parser service:

```powershell
cd ..\\..\\services\\parser-go
go run ./cmd/parser
```

## Notes

- The parser service is scaffolded as a clean boundary. It does not yet parse real demos.
- The web ingest route stores every uploaded file in `incoming-demos` before parsing.
- `.viewer.json` import is the most stable replay path right now.
- `.dem` parsing should use the same Python runtime as the legacy workflow. Set `PYTHON_EXECUTABLE` in `apps/web/.env.local` to your working Python 3.12 path.
- The existing prototype in the parent repo can be used as reference for events and replay concepts.
- Project progress and active priorities are tracked in `plans.md`.
