# Working together on EduLaunch

## Branches and pull requests

- `main` always runs. Do not push to it directly.
- One branch per task: `feature/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
- Before opening a pull request, run `pnpm test && pnpm typecheck` and make sure both pass.
- Ask a teammate to review. Merge after one approval.

## Where new code goes

| You are adding… | Put it in |
|---|---|
| A business rule ("a draft needs another admin to approve") | `services/<svc>/src/modules/<feature>/domain/` + a `*.spec.ts` test |
| A new operation for the API | `application/` (use case) + `presentation/` (controller route) |
| Database access | `infrastructure/` repository, implementing the abstract class in `domain/` |
| A new table or column | the service's `infrastructure/db/schema.ts`, then `db:generate` (see [setup guide](docs/setup.md#adding-or-changing-a-database-table)) |
| Something two services both need to agree on | `packages/contracts` (events, DTOs) |
| A page or UI component | `apps/web` |

Keep business rules out of controllers and repositories, so they can be tested without a database.

## Commit messages

Short and in the imperative: `Add stream suggestion scoring`, `Fix offer chance when no data`.

## Secrets

Never commit `.env` files or keys. If you leak one by mistake, tell the team and run `pnpm env:setup` after changing it.
