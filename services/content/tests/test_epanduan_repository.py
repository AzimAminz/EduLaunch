"""Integration tests against the local Supabase database. Run with: pnpm test:integration"""

import pytest
from psycopg_pool import ConnectionPool

from content_service.config import get_settings
from content_service.domain.epanduan import FoundProgramme
from content_service.infrastructure.epanduan_repository import PostgresEpanduanRuns

pytestmark = pytest.mark.integration

# A code no real institution uses, so the test never touches real runs.
CODE = "ZZ"


@pytest.fixture
def runs():
    pool = ConnectionPool(get_settings().database_url, min_size=1, max_size=2, open=True)
    yield PostgresEpanduanRuns(pool)
    with pool.connection() as conn:
        conn.execute("delete from epanduan_run where institution_code = %s", (CODE,))
    pool.close()


def test_a_run_keeps_what_it_found_and_one_run_at_a_time(runs):
    run_id = runs.start(CODE, None)
    assert run_id is not None
    assert runs.start(CODE, None) is None  # still running
    runs.progress(run_id, 2)
    assert runs.latest(CODE)["status"] == "running"
    runs.finish(run_id, [FoundProgramme(code="ZZ1234567", name="Diploma Ujian", merit=80.5, routes=["spm"])], 3)
    latest = runs.latest(CODE)
    assert (latest["status"], latest["found"], latest["pagesRead"]) == ("done", 1, 3)
    assert latest["programmes"][0]["name"] == "Diploma Ujian"
    assert latest["programmes"][0]["routes"] == ["spm"]
    assert runs.start(CODE, None) is not None  # free again


def test_a_failed_run_says_why(runs):
    run_id = runs.start(CODE, None)
    runs.fail(run_id, "unavailable: ePanduan answered 503", 1)
    latest = runs.latest(CODE)
    assert (latest["status"], latest["error"], latest["programmes"]) == ("failed", "unavailable: ePanduan answered 503", [])
