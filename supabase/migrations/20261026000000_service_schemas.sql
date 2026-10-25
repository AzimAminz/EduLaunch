-- One schema and one database role per service (database-per-service, on a shared Postgres).
-- Each role owns only its schema, so a service cannot read or change another service's tables.
-- Tables are created by each service's own Drizzle migrations (`pnpm db:migrate`).
-- Role passwords are set outside migrations by tools/scripts/setup-env.mjs, never committed.

do $$
declare
  svc text;
begin
  foreach svc in array array['catalogue', 'profile', 'recommendation', 'engagement', 'content'] loop
    if not exists (select 1 from pg_roles where rolname = svc || '_svc') then
      execute format('create role %I login noinherit', svc || '_svc');
    end if;
    -- postgres is not a superuser on Supabase; it needs SET (not INHERIT) to hand the schema to the role.
    execute format('grant %I to current_user with inherit false, set true', svc || '_svc');
    execute format('create schema if not exists %I authorization %I', svc, svc || '_svc');
    execute format('revoke all on schema %I from public', svc);
    execute format('alter role %I set search_path = %I', svc || '_svc', svc);
  end loop;
end
$$;

-- gen_random_uuid() lives in pg_catalog; pgvector is needed by the content service for search.
create extension if not exists vector with schema extensions;
grant usage on schema extensions to content_svc;
