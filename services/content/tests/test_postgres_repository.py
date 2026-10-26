"""Integration tests against the local Supabase database. Run with: pnpm test:integration"""

from uuid import uuid4

import pytest
from psycopg_pool import ConnectionPool

from content_service.config import get_settings
from content_service.domain.source import CrawlStatus, OfficialSource
from content_service.infrastructure.postgres_repository import PostgresSourceRepository

pytestmark = pytest.mark.integration

ALLOWED = ["edu.my"]


@pytest.fixture(scope="module")
def repo():
    pool = ConnectionPool(get_settings().database_url, min_size=1, max_size=2, open=True)
    created: list = []
    repository = PostgresSourceRepository(pool)
    original_add = repository.add

    def tracking_add(source):
        created.append(source.id)
        original_add(source)

    repository.add = tracking_add  # remember what we created so we can clean up
    yield repository
    with pool.connection() as conn:
        conn.execute("delete from data_source where id = any(%s)", (created,))
    pool.close()


def new_source() -> OfficialSource:
    return OfficialSource.register(f"https://test-{uuid4().hex[:8]}.edu.my/syarat", "html", ALLOWED)


def test_add_and_list(repo):
    s = new_source()
    repo.add(s)
    found = next(x for x in repo.list_all() if x.id == s.id)
    assert (found.url, found.status) == (s.url, CrawlStatus.NEW)


def test_update_keeps_checksum_and_status(repo):
    s = new_source()
    repo.add(s)
    s.record_fetch("Matematik gred B")
    repo.update(s)
    found = next(x for x in repo.list_all() if x.id == s.id)
    assert found.content_checksum == s.content_checksum
    assert found.status is CrawlStatus.CHANGED
    assert found.last_checked_at is not None


def test_create_draft_returns_new_id(repo):
    s = new_source()
    repo.add(s)
    s.record_fetch("text")
    repo.update(s)
    assert repo.create_draft(s.id, s.content_checksum or "") is not None
