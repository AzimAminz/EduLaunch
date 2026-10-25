# EduLaunch — Service Architecture

Version 1 · 26 Oct 2026. This replaces the single Next.js app described in [system-design.md](system-design.md) §2: the team chose **microservices**, kept to five services so a small team can run them.

## Overview

```
Browser ──► apps/web (Next.js :3000) ──/api/*──► apps/gateway (NestJS :4000)
                │                                   │  checks Supabase JWT, role, rate limit
                │ sign-in                           │  adds x-internal-token + caller headers
                ▼                                   ├──► catalogue      :4101  schema catalogue
          Supabase Auth                             ├──► profile        :4102  schema profile
                                                    ├──► recommendation :4103  schema recommendation
                                                    ├──► engagement     :4104  schema engagement
                                                    └──► content (Python):4200 schema content

          services ◄──── RabbitMQ topic exchange "edulaunch.events" ────► services
          gateway  ────► Redis (60 s cache for anonymous catalogue reads)
          all      ────► Supabase Postgres (one schema + one database role per service)
```

## Services and the modules they own

| Service | System-design modules | Tables |
|---|---|---|
| catalogue | 3.3 Programme Catalogue, 3.4 Eligibility data, 3.10 Administration (review workflow) | institution, field, subject, program (incl. Form 4 streams), program_field, program_pathway, requirement, requirement_rule, merit_formula, admission_stat, career, activity |
| profile | 3.1 Identity (profile part), 3.2 Academic Profile, 3.5 Self Discovery, 3.7 Planning | account, student, academic_record, record_subject, assessment, activity_attempt, saved_program, roadmap, roadmap_step |
| recommendation | 3.4 Eligibility engine, 3.6 Recommendation | recommendation |
| engagement | 3.9 Notifications & Support | support_ticket, notification |
| content | 3.8 Content Pipeline, Ask AI (later) | data_source, extraction_draft, content_chunk |

Identity itself is **Supabase Auth**. `profile.account.id` is the Supabase user id; the admin role is `app_metadata.role = "admin"`.

## Rules

1. **Each service owns its data.** A service's database role can only use its own schema (`permission denied for schema …` otherwise). IDs from other services are stored without foreign keys.
2. **Synchronous reads go over HTTP** through internal endpoints (`/internal/*`), which the gateway never routes. Example: recommendation reads the student snapshot from profile.
3. **Changes are announced as events.** The service that changed something publishes; others react.

| Event | Published by | Consumed by | Effect |
|---|---|---|---|
| `catalogue.requirement.published` | catalogue (second admin approves) | recommendation, engagement | recompute affected students; notify students who saved the programme |
| `profile.academic-record.confirmed` | profile | recommendation | recompute that student |
| `profile.assessment.completed` | profile | recommendation | recompute that student |
| `recommendation.list.generated` | recommendation | — (dashboards later) | |
| `content.draft.created` | content | — (admin queue later) | |

4. **Only the gateway is public.** Services reject calls without the internal token (constant-time comparison).
5. **Same layers everywhere:** domain → application → infrastructure → presentation (see [setup.md](setup.md#where-things-are)).

## Local vs cloud

| Piece | Local | Cloud (later) |
|---|---|---|
| Postgres, Auth, Storage | `supabase start` (Docker) | Supabase project: `supabase link`, `supabase db push`, then `pnpm db:migrate` with the cloud `DATABASE_URL`s |
| JWT verification | ES256 via JWKS (HS256 secret also accepted locally) | JWKS from the project URL |
| RabbitMQ, Redis | `infra/docker/compose.yml` | Managed free tiers (for example CloudAMQP, Upstash) |
| Services | `pnpm dev` | One container each (`Dockerfile` in every service) |

## Trade-offs we accepted

- More moving parts than a single app. Kept manageable with one repo, shared packages and one bootstrap command.
- Network calls between services can fail. The gateway returns a friendly 503; events are durable and retried once.
- Running five services costs more than one in the cloud. For the demo, services can share one small host.
