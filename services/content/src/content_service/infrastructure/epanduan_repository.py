from __future__ import annotations

from uuid import UUID

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from ..domain.epanduan import FoundProgramme
from ..domain.ports import EpanduanRuns

# A run still "running" after this long was cut off (for example the service restarted) and no longer blocks.
STALE_MINUTES = 30
# Older runs are removed; the newest few per institution are kept for comparison.
KEEP_RUNS = 5


class PostgresEpanduanRuns(EpanduanRuns):
    """Uses the content_svc role, whose search_path is the `content` schema."""

    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def start(self, institution_code: str, requested_by: UUID | None) -> UUID | None:
        with self._pool.connection() as conn:
            conn.execute(
                """update epanduan_run set status = 'failed', error = 'stopped: the service restarted', finished_at = now()
                   where institution_code = %s and status = 'running'
                     and started_at < now() - make_interval(mins => %s)""",
                (institution_code, STALE_MINUTES),
            )
            busy = conn.execute(
                "select 1 from epanduan_run where institution_code = %s and status = 'running'", (institution_code,)
            ).fetchone()
            if busy:
                return None
            row = conn.execute(
                "insert into epanduan_run (institution_code, requested_by) values (%s, %s) returning id",
                (institution_code, requested_by),
            ).fetchone()
            return row[0]

    def progress(self, run_id: UUID, pages_read: int) -> None:
        with self._pool.connection() as conn:
            conn.execute("update epanduan_run set pages_read = %s where id = %s", (pages_read, run_id))

    def finish(self, run_id: UUID, programmes: list[FoundProgramme], pages_read: int) -> None:
        with self._pool.connection() as conn, conn.transaction():
            with conn.cursor() as cur:
                cur.executemany(
                    "insert into epanduan_found (run_id, code, data) values (%s, %s, %s)",
                    [(run_id, p.code, Jsonb(p.to_dict())) for p in programmes],
                )
            row = conn.execute(
                """update epanduan_run set status = 'done', found = %s, pages_read = %s, finished_at = now()
                   where id = %s returning institution_code""",
                (len(programmes), pages_read, run_id),
            ).fetchone()
            conn.execute(
                """delete from epanduan_run where institution_code = %s and id not in (
                     select id from epanduan_run where institution_code = %s order by started_at desc limit %s)""",
                (row[0], row[0], KEEP_RUNS),
            )

    def fail(self, run_id: UUID, error: str, pages_read: int) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                "update epanduan_run set status = 'failed', error = %s, pages_read = %s, finished_at = now() where id = %s",
                (error[:500], pages_read, run_id),
            )

    def latest(self, institution_code: str) -> dict | None:
        with self._pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "select * from epanduan_run where institution_code = %s order by started_at desc limit 1",
                (institution_code,),
            )
            run = cur.fetchone()
            if not run:
                return None
            cur.execute("select data from epanduan_found where run_id = %s order by code", (run["id"],))
            programmes = [r["data"] for r in cur.fetchall()]
        return {
            "id": str(run["id"]),
            "institutionCode": run["institution_code"],
            "status": run["status"],
            "pagesRead": run["pages_read"],
            "found": run["found"],
            "error": run["error"],
            "startedAt": run["started_at"].isoformat(),
            "finishedAt": run["finished_at"].isoformat() if run["finished_at"] else None,
            "programmes": programmes,
        }
