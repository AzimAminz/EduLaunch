-- Which category a running import is reading, and Syarat Khas read for accepted programmes (per category).

alter table epanduan_run add column if not exists current_category text;

create table if not exists epanduan_requirement (
  code text not null check (code ~ '^[A-Z]{2}[0-9]{7}$'),
  jenprog text not null,
  category text not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  special_text text,                          -- plain text, never HTML
  error text,
  requested_at timestamptz not null default now(),
  read_at timestamptz,
  primary key (code, category)
);
