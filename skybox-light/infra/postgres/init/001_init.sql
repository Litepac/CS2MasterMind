create table if not exists matches (
  id uuid primary key,
  demo_name text not null,
  map_name text not null,
  tick_count integer not null default 0,
  round_count integer not null default 0,
  source_path text,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key,
  match_id uuid not null references matches(id) on delete cascade,
  steam_id text,
  player_name text not null,
  team_side text not null,
  kills integer not null default 0,
  deaths integer not null default 0,
  assists integer not null default 0,
  adr numeric(8,2) not null default 0
);
