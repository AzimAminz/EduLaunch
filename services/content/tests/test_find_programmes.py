import asyncio
from pathlib import Path
from uuid import uuid4

import pytest

from content_service.application.find_programmes import FindInstitutionProgrammes, ReadSpecialRequirements
from content_service.domain.epanduan import CATEGORIES_TO_READ
from content_service.domain.ports import EpanduanRuns, EpanduanSource
from content_service.domain.source import DomainError
from content_service.infrastructure.epanduan_client import EpanduanUnavailable

FIXTURES = Path(__file__).parent / "fixtures"
# The fixture keeps two programmes; its count says two as well, so it reads as a complete page.
DEGREES = (FIXTURES / "epanduan_stpm_S_UC_page1.html").read_text().replace("daripada 33 carian", "daripada 2 carian")


class FakeRuns(EpanduanRuns):
    def __init__(self, busy=False, found=None):
        self.busy = busy
        self.found_rows = found or []
        self.finished = None
        self.failed = None
        self.pages = 0
        self.categories = []
        self.special_rows = {}

    def start(self, institution_code, requested_by):
        return None if self.busy else uuid4()

    def progress(self, run_id, pages_read, category=None):
        self.pages = pages_read
        if category and category not in self.categories:
            self.categories.append(category)

    def finish(self, run_id, programmes, pages_read):
        self.finished = (programmes, pages_read)

    def fail(self, run_id, error, pages_read):
        self.failed = (error, pages_read)

    def latest(self, institution_code):
        return None

    def found(self, institution_code, codes):
        return [f for f in self.found_rows if f["code"] in codes]

    def request_special(self, items):
        for _, category, code in items:
            self.special_rows[(code, category)] = ("pending", None)

    def save_special(self, code, category, text):
        self.special_rows[(code, category)] = ("done", text)

    def fail_special(self, items, error):
        for _, category, code in items:
            if self.special_rows.get((code, category), ("",))[0] == "pending":
                self.special_rows[(code, category)] = ("failed", error)

    def special(self, codes):
        return []


class FakeSource(EpanduanSource):
    def __init__(self, pages_by_category=None, error_at=None, panels=None, panel_error_after=None):
        self.pages_by_category = pages_by_category or {}
        self.error_at = error_at
        self.panels = panels or {}
        self.panel_error_after = panel_error_after
        self.calls = []

    async def search(self, jenprog, category, institution_code):
        self.calls.append((jenprog, category, institution_code))
        if self.error_at == (jenprog, category):
            raise EpanduanUnavailable("ePanduan answered 503")
        for html in self.pages_by_category.get((jenprog, category), []):
            yield f"https://example/{category}", html

    async def special_requirements(self, items):
        for n, (_, category, code) in enumerate(items):
            if self.panel_error_after is not None and n >= self.panel_error_after:
                raise EpanduanUnavailable("ePanduan answered 503")
            yield category, code, self.panels.get((category, code))


def run(use_case, code="UC"):
    run_id = use_case.start(code, None)
    asyncio.run(use_case.run(run_id, code))


def test_reads_all_thirteen_categories_and_keeps_each_category_of_a_programme():
    runs = FakeRuns()
    # The same degree list under STPM science and arts: one record per programme, with both categories.
    source = FakeSource({("stpm", "S"): [DEGREES], ("stpm", "A"): [DEGREES]})
    run(FindInstitutionProgrammes(runs, source))
    programmes, pages = runs.finished
    assert [c[:2] for c in source.calls] == list(CATEGORIES_TO_READ)
    assert runs.categories == [f"{j}:{c}" for j, c in CATEGORIES_TO_READ]
    assert pages == 2
    assert [p.code for p in programmes] == ["UC6522001", "UC6523003"]
    assert [c.category for c in programmes[0].categories] == ["S", "A"]
    assert programmes[0].routes == ["stpm"]


def test_programmes_of_another_institution_are_not_kept():
    runs = FakeRuns()
    run(FindInstitutionProgrammes(runs, FakeSource({("stpm", "S"): [DEGREES]})), code="UM")
    assert runs.finished[0] == []


def test_a_page_still_cut_short_after_the_second_try_stops_the_run():
    runs = FakeRuns()
    cut = (FIXTURES / "epanduan_stpm_S_UC_page1.html").read_text()  # says 33, shows 2
    run(FindInstitutionProgrammes(runs, FakeSource({("stpm", "S"): [cut]})))
    assert runs.finished is None
    assert runs.failed[0].startswith("unavailable: incomplete page")


def test_an_error_stops_the_run_and_nothing_is_saved():
    runs = FakeRuns()
    run(FindInstitutionProgrammes(runs, FakeSource({("spm", "A"): [DEGREES]}, error_at=("stpm", "S"))))
    assert runs.finished is None
    assert runs.failed == ("unavailable: ePanduan answered 503", 1)


def test_a_second_run_waits_for_the_first_and_codes_are_checked():
    with pytest.raises(DomainError, match="already being read"):
        FindInstitutionProgrammes(FakeRuns(busy=True), FakeSource()).start("UC", None)
    with pytest.raises(DomainError, match="two letters"):
        FindInstitutionProgrammes(FakeRuns(), FakeSource()).start("UTEM", None)


FOUND = [
    {"code": "UC6522001", "categories": [{"jenprog": "stpm", "category": "S"}, {"jenprog": "stpm", "category": "G1"}]},
    {"code": "UC4481002", "categories": [{"jenprog": "spm", "category": "A"}]},
]


def test_special_requirements_are_read_for_each_category_of_the_accepted_programmes():
    runs = FakeRuns(found=FOUND)
    use_case = ReadSpecialRequirements(runs, FakeSource(panels={("S", "UC6522001"): "• PNGK 2.00"}))
    items = use_case.start("uc", ["UC6522001", "UC4481002", "UM1234567"])
    assert sorted(items) == [("spm", "A", "UC4481002"), ("stpm", "G1", "UC6522001"), ("stpm", "S", "UC6522001")]
    asyncio.run(use_case.run(items))
    assert runs.special_rows[("UC6522001", "S")] == ("done", "• PNGK 2.00")
    assert runs.special_rows[("UC6522001", "G1")] == ("done", None)


def test_what_was_read_is_kept_when_the_site_stops_answering():
    runs = FakeRuns(found=FOUND)
    use_case = ReadSpecialRequirements(runs, FakeSource(panels={("A", "UC4481002"): "• 5 kredit"}, panel_error_after=1))
    items = use_case.start("UC", ["UC4481002", "UC6522001"])
    asyncio.run(use_case.run(items))
    statuses = sorted(v[0] for v in runs.special_rows.values())
    assert statuses == ["done", "failed", "failed"]


def test_nothing_to_read_when_the_programmes_are_not_in_the_latest_run():
    with pytest.raises(DomainError, match="latest ePanduan run"):
        ReadSpecialRequirements(FakeRuns(found=FOUND), FakeSource()).start("UC", ["UC0000000"])
