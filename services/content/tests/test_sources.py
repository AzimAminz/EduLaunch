import asyncio
from uuid import UUID, uuid4

import pytest

from content_service.application.check_sources import CheckSources
from content_service.domain.ports import FetchedPage, SourceFetcher, SourceRepository
from content_service.domain.source import CrawlStatus, DomainError, OfficialSource

ALLOWED = ["edu.my", "gov.my"]


def test_only_official_https_domains_are_accepted():
    assert OfficialSource.register("https://www.contoh.edu.my/syarat", "html", ALLOWED)
    with pytest.raises(DomainError, match="not on the list"):
        OfficialSource.register("https://random-blog.com/syarat", "html", ALLOWED)
    with pytest.raises(DomainError, match="https"):
        OfficialSource.register("http://www.contoh.edu.my/syarat", "html", ALLOWED)
    with pytest.raises(DomainError):
        OfficialSource.register("https://evil-edu.my.attacker.com/", "html", ALLOWED)


def test_whitespace_only_changes_do_not_count():
    s = OfficialSource.register("https://a.edu.my/x", "html", ALLOWED)
    assert s.record_fetch("Matematik   gred B") is True
    assert s.record_fetch("Matematik gred B\n") is False
    assert s.status is CrawlStatus.UNCHANGED


class FakeRepo(SourceRepository):
    def __init__(self, sources):
        self.sources = sources
        self.drafts: list[UUID] = []

    def list_all(self):
        return self.sources

    def add(self, source):
        self.sources.append(source)

    def update(self, source):
        pass

    def create_draft(self, source_id, source_checksum):
        self.drafts.append(source_id)
        return uuid4()


class FakeFetcher(SourceFetcher):
    def __init__(self, pages: dict[str, str]):
        self.pages = pages

    async def fetch(self, source):
        if source.url not in self.pages:
            raise RuntimeError("404")
        return FetchedPage(source.url, self.pages[source.url])


def test_check_queues_drafts_only_for_changed_pages():
    a = OfficialSource.register("https://a.edu.my/x", "html", ALLOWED)
    a.record_fetch("old text")
    b = OfficialSource.register("https://b.edu.my/y", "html", ALLOWED)
    b.record_fetch("same")
    broken = OfficialSource.register("https://c.edu.my/z", "html", ALLOWED)
    repo = FakeRepo([a, b, broken])

    report = asyncio.run(CheckSources(repo, FakeFetcher({a.url: "new text", b.url: "same"})).run())

    assert (report.checked, report.changed, report.failed) == (3, 1, 1)
    assert repo.drafts == [a.id]
    assert broken.status is CrawlStatus.FAILED
