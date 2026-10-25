from __future__ import annotations

from uuid import UUID

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from ..domain.ports import SourceRepository
from ..domain.source import CrawlStatus, OfficialSource


class PostgresSourceRepository(SourceRepository):
    """Uses the content_svc role, whose search_path is the `content` schema."""

    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def list_all(self) -> list[OfficialSource]:
        with self._pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute("select * from data_source order by created_at")
            return [self._to_domain(r) for r in cur.fetchall()]

    def add(self, s: OfficialSource) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                "insert into data_source (id, institution_id, source_url, source_type) values (%s, %s, %s, %s)",
                (s.id, s.institution_id, s.url, s.source_type),
            )

    def update(self, s: OfficialSource) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                """update data_source
                   set content_checksum = %s, last_checked_at = %s, crawl_status = %s, failure_reason = %s
                   where id = %s""",
                (s.content_checksum, s.last_checked_at, s.status.value, s.failure_reason, s.id),
            )

    def create_draft(self, source_id: UUID, source_checksum: str) -> UUID:
        with self._pool.connection() as conn:
            row = conn.execute(
                "insert into extraction_draft (source_id, source_checksum) values (%s, %s) returning id",
                (source_id, source_checksum),
            ).fetchone()
            assert row is not None
            return row[0]

    @staticmethod
    def _to_domain(r: dict) -> OfficialSource:
        return OfficialSource(
            id=r["id"],
            url=r["source_url"],
            source_type=r["source_type"],
            institution_id=r["institution_id"],
            content_checksum=r["content_checksum"],
            last_checked_at=r["last_checked_at"],
            status=CrawlStatus(r["crawl_status"]),
            failure_reason=r["failure_reason"],
        )
