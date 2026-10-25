-- Tables owned by the content service (schema `content`).

create table if not exists data_source (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid,                       -- catalogue service id, no foreign key across services
  source_url text not null unique,
  source_type text not null check (source_type in ('html', 'pdf')),
  content_checksum text,
  last_checked_at timestamptz,
  crawl_status text not null default 'new' check (crawl_status in ('new', 'unchanged', 'changed', 'failed')),
  failure_reason text,
  created_at timestamptz not null default now()
);

-- A changed page waiting for AI extraction and then admin review (never shown to students directly).
create table if not exists extraction_draft (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references data_source (id) on delete cascade,
  source_checksum text not null,
  status text not null default 'pending_extraction'
    check (status in ('pending_extraction', 'ready_for_review', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

-- Published text split into chunks for cited answers. 1024 dimensions fits bge-m3 embeddings.
create table if not exists content_chunk (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references data_source (id) on delete cascade,
  program_id uuid,
  chunk_text text not null,
  embedding extensions.vector(1024),
  source_version text not null
);
