import asyncio
from pathlib import Path
from uuid import uuid4

import pytest

from content_service.application.find_programmes import FindInstitutionProgrammes
from content_service.domain.ports import EpanduanRuns, EpanduanSource
from content_service.domain.source import DomainError
from content_service.infrastructure.epanduan_client import EpanduanUnavailable

FIXTURES = Path(__file__).parent / "fixtures"
DEGREES = (FIXTURES / "epanduan_stpm_S_UC_page1.html").read_text()


class FakeRuns(EpanduanRuns):
    def __init__(self, busy=False):
        self.busy = busy
        self.finished = None
        self.failed = None
        self.pages = 0

    def start(self, institution_code, requested_by):
        return None if self.busy else uuid4()

    def progress(self, run_id, pages_read):
        self.pages = pages_read

    def finish(self, run_id, programmes, pages_read):
        self.finished = (programmes, pages_read)

    def fail(self, run_id, error, pages_read):
        self.failed = (error, pages_read)

    def latest(self, institution_code):
        return None


class FakeSource(EpanduanSource):
    def __init__(self, pages_by_category, error_at=None):
        self.pages_by_category = pages_by_category
        self.error_at = error_at
        self.calls = []

    async def search(self, jenprog, category, institution_code):
        self.calls.append((jenprog, category, institution_code))
        if self.error_at == (jenprog, category):
            raise EpanduanUnavailable("ePanduan answered 503")
        for html in self.pages_by_category.get((jenprog, category), []):
            yield f"https://example/{category}", html


def run(use_case, code="UC"):
    run_id = use_case.start(code, None)
    asyncio.run(use_case.run(run_id, code))


def test_reads_each_category_and_merges_the_same_programme_into_one_with_both_routes():
    runs = FakeRuns()
    # The same degree list under STPM science and arts: one programme each, with route stpm once.
    source = FakeSource({("stpm", "S"): [DEGREES], ("stpm", "A"): [DEGREES]})
    run(FindInstitutionProgrammes(runs, source))
    programmes, pages = runs.finished
    assert [c[:2] for c in source.calls] == [("spm", "A"), ("stpm", "S"), ("stpm", "A")]
    assert pages == 2
    assert [p.code for p in programmes] == ["UC6522001", "UC6523003"]
    assert programmes[0].routes == ["stpm"]


def test_programmes_of_another_institution_are_not_kept():
    runs = FakeRuns()
    run(FindInstitutionProgrammes(runs, FakeSource({("stpm", "S"): [DEGREES]})), code="UM")
    assert runs.finished[0] == []


def test_an_error_stops_the_run_and_nothing_is_saved():
    runs = FakeRuns()
    run(FindInstitutionProgrammes(runs, FakeSource({("spm", "A"): [DEGREES]}, error_at=("stpm", "S"))))
    assert runs.finished is None
    assert runs.failed == ("unavailable: ePanduan answered 503", 1)


def test_a_second_run_waits_for_the_first_and_codes_are_checked():
    with pytest.raises(DomainError, match="already being read"):
        FindInstitutionProgrammes(FakeRuns(busy=True), FakeSource({})).start("UC", None)
    with pytest.raises(DomainError, match="two letters"):
        FindInstitutionProgrammes(FakeRuns(), FakeSource({})).start("UTEM", None)
