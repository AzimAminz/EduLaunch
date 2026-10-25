"""Applies migrations/*.sql in order, once each. Run: pnpm --filter @edulaunch/content-service db:migrate"""

from __future__ import annotations

from pathlib import Path

import psycopg

from ..config import get_settings

MIGRATIONS = Path(__file__).resolve().parents[3] / "migrations"


def main() -> None:
    with psycopg.connect(get_settings().database_url, autocommit=False) as conn:
        conn.execute("create table if not exists __migrations (name text primary key, applied_at timestamptz default now())")
        applied = {r[0] for r in conn.execute("select name from __migrations").fetchall()}
        for path in sorted(MIGRATIONS.glob("*.sql")):
            if path.name in applied:
                continue
            conn.execute(path.read_text())
            conn.execute("insert into __migrations (name) values (%s)", (path.name,))
            print(f"applied {path.name}")
        conn.commit()


if __name__ == "__main__":
    main()
