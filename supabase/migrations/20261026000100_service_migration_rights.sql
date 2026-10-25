-- Drizzle's migrator always runs `CREATE SCHEMA IF NOT EXISTS <schema>`, and Postgres checks the
-- database-level CREATE privilege before checking whether the schema exists.
-- Granting CREATE lets each role run its own migrations; it still has no access to other services' schemas.
grant create on database postgres to catalogue_svc, profile_svc, recommendation_svc, engagement_svc, content_svc;

-- "already exists, skipping" notices from re-runs are noise; show warnings and errors only.
do $$
declare svc text;
begin
  foreach svc in array array['catalogue', 'profile', 'recommendation', 'engagement', 'content'] loop
    execute format('alter role %I set client_min_messages = warning', svc || '_svc');
  end loop;
end
$$;
