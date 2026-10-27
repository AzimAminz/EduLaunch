-- "Find this institution's programmes on ePanduan": each run and what it found (staging only; the catalogue changes
-- only when an admin accepts found programmes as drafts and another admin publishes them).

create table if not exists epanduan_run (
  id uuid primary key default gen_random_uuid(),
  institution_code text not null check (institution_code ~ '^[A-Z]{2}$'),
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  requested_by uuid,                          -- the admin (profile/auth id, no foreign key across services)
  pages_read integer not null default 0,
  found integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists epanduan_run_institution_idx on epanduan_run (institution_code, started_at desc);

create table if not exists epanduan_found (
  run_id uuid not null references epanduan_run (id) on delete cascade,
  code text not null check (code ~ '^[A-Z]{2}[0-9]{7}$'),
  data jsonb not null,                        -- plain cleaned values, never HTML
  primary key (run_id, code)
);
