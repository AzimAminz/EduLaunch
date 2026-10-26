# Setup guide

This guide gets EduLaunch running on your own computer. You only need to do the first part once.

[← Back to README](../README.md)

---

## Step 1 · Install the free tools (once)

| Tool | What it is for | Mac | Windows |
|---|---|---|---|
| **Node.js** 26.12.1 or newer | Runs the website and most of the system | `brew install node` | [nodejs.org](https://nodejs.org) |
| **pnpm** | Downloads the project's building blocks | `npm install -g pnpm` | `npm install -g pnpm` |
| **Docker Desktop** | Runs the database and helpers in the background | [docker.com](https://www.docker.com/products/docker-desktop) | Same link (turn on WSL 2 when asked) |
| **Supabase CLI** | Gives you a private copy of the database | `brew install supabase/tap/supabase` | `scoop install supabase` |
| **uv** | Runs the Python part | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | `winget install astral-sh.uv` |

Not sure if you have everything? After downloading the project (Step 2), run `node tools/scripts/bootstrap.mjs --check`. It tells you what is missing and how to install it.

---

## Step 2 · Download and set up the project

**Open Docker Desktop first** and wait until it says it is running. Then, in a terminal:

```bash
git clone <repository-link> edulaunch
cd edulaunch
node tools/scripts/bootstrap.mjs
```

This one command:

1. Checks your tools.
2. Downloads everything the project needs.
3. Starts your private database.
4. Creates your own settings files with new random passwords.
5. Starts the helpers (messages and fast storage).
6. Creates all the database tables.

The first run takes a few minutes because it downloads a lot. You can run it again at any time. It will not delete your data.

---

## Step 3 · Start EduLaunch

```bash
pnpm dev
```

When the messages stop scrolling, open these in your browser:

| Page | Address | What you will see |
|---|---|---|
| **Website** | http://localhost:3000 | EduLaunch itself |
| **Database viewer** | http://127.0.0.1:54323 | All tables and data (Supabase Studio) |
| **Test inbox** | http://127.0.0.1:54324 | Sign-up and password emails (none are really sent) |
| **Message dashboard** | http://127.0.0.1:15672 | The messages passed between parts. The username and password are in `infra/docker/.env` |

To stop, press **Ctrl + C** in the terminal. To stop the background helpers as well:

```bash
pnpm infra:down
pnpm db:stop
```

Next time, you only need: open Docker Desktop → `pnpm db:start` → `pnpm infra:up` → `pnpm dev`.

---

## Useful commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start everything, and reload when you save a file |
| `pnpm test` | Run the quick automatic checks (no database needed) |
| `pnpm test:integration` | Run the checks that use your local database (Supabase must be running) |
| `pnpm typecheck` | Look for mistakes in the code without running it |
| `pnpm build` | Prepare everything as it would run online |
| `pnpm doctor` | Check that your tools are installed |
| `pnpm db:migrate` | Add any new database tables or columns your teammates created |

Working on one part only? Add `--filter`, for example `pnpm --filter @edulaunch/catalogue-service dev`.

---

## Make your account an admin

1. Sign up on the website with your email.
2. Open the database viewer (http://127.0.0.1:54323) → **SQL Editor**, paste this with your own email, and press **Run**:

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
   where email = 'you@example.com';
   ```

3. Sign out and sign in again.

Only the database can give someone admin rights. Users cannot make themselves admin.

---

## Adding or changing a database table

Each part of the system has its own tables.

1. Change the table in `services/<part>/src/infrastructure/db/schema.ts`.
2. Run `pnpm --filter @edulaunch/<part>-service db:generate`. This writes the change as a file in `services/<part>/drizzle/`.
3. Run `pnpm db:migrate` to apply it to your database.
4. Commit the table change **and** the new file together, so your teammates get it too.

The Python part (`services/content`) keeps its changes as plain SQL files in `services/content/migrations/`.

---

## Where things are

```
apps/
  web/              The website
  gateway/          The "front door": checks sign-in and sends requests to the right part
services/
  catalogue/        Programmes, streams, entry requirements, careers
  profile/          Student results, interests, saved programmes, plans
  recommendation/   Eligibility checks, ranking and offer chances
  engagement/       Support requests and notifications
  content/          Watches official websites (Python)
packages/           Code shared by several parts
supabase/           Database settings
infra/docker/       Background helpers for your computer
tools/scripts/      The setup scripts
docs/               All documents and designs (not code)
```

Inside each part, the code is sorted the same way:

| Folder | What it holds |
|---|---|
| `domain/` | The rules, for example "another admin must approve a change". No database here. |
| `application/` | The steps for each action, for example "save a programme". |
| `infrastructure/` | Talking to the database and to other parts. |
| `presentation/` | The web addresses (endpoints) the part answers. |

---

## Something is not working?

| What you see | What to do |
|---|---|
| `Supabase is not running` | Open Docker Desktop, then run `pnpm db:start` |
| `port is already allocated` or `EADDRINUSE` | Another program is using that address. Close it, or stop the old `pnpm dev` |
| `Invalid environment variables` | Run `pnpm env:setup` (the database must be running) |
| Sign-in to the database fails after resetting it | Run `pnpm env:setup`, then `pnpm db:migrate` |
| Red errors in VS Code but the terminal is fine | Press Cmd/Ctrl + Shift + P → **TypeScript: Restart TS Server** |
| Anything else | Run `node tools/scripts/bootstrap.mjs` again. It fixes most problems. |

---

## Keeping things safe

- **Never share or commit** files named `.env` or `.env.local`. They hold your passwords, and each computer makes its own.
- Secret keys never go into the website code. The browser only gets the public key.
- Only the "front door" can be reached from outside. The other parts only accept requests that come through it.
