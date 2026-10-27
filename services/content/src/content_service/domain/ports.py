from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass
from uuid import UUID

from .epanduan import FoundProgramme
from .source import OfficialSource


@dataclass(frozen=True)
class FetchedPage:
    url: str
    text: str


class SourceFetcher(ABC):
    """Port: downloads a source and returns its readable text."""

    @abstractmethod
    async def fetch(self, source: OfficialSource) -> FetchedPage: ...


class SourceRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[OfficialSource]: ...

    @abstractmethod
    def add(self, source: OfficialSource) -> None: ...

    @abstractmethod
    def update(self, source: OfficialSource) -> None: ...

    @abstractmethod
    def create_draft(self, source_id: UUID, source_checksum: str) -> UUID: ...


class EpanduanSource(ABC):
    """Port: the ePanduan programme list for one institution and one candidate category, page by page."""

    @abstractmethod
    def search(self, jenprog: str, category: str, institution_code: str) -> AsyncIterator[tuple[str, str]]:
        """Yields (url, html) for each result page."""

    @abstractmethod
    def special_requirements(self, items: list[tuple[str, str, str]]) -> AsyncIterator[tuple[str, str, str | None]]:
        """Syarat Khas for (jenprog, category, code) items; yields (category, code, text or None)."""


class EpanduanRuns(ABC):
    """Port: runs of 'find this institution's programmes on ePanduan' and what each run found."""

    @abstractmethod
    def start(self, institution_code: str, requested_by: UUID | None) -> UUID | None:
        """Starts a run, or returns None when one is already running for that institution."""

    @abstractmethod
    def progress(self, run_id: UUID, pages_read: int, category: str | None = None) -> None: ...

    @abstractmethod
    def finish(self, run_id: UUID, programmes: list[FoundProgramme], pages_read: int) -> None: ...

    @abstractmethod
    def fail(self, run_id: UUID, error: str, pages_read: int) -> None: ...

    @abstractmethod
    def latest(self, institution_code: str) -> dict | None:
        """The newest run with its programmes, as plain values."""

    @abstractmethod
    def found(self, institution_code: str, codes: list[str]) -> list[dict]:
        """These programmes as the newest finished run found them."""

    @abstractmethod
    def request_special(self, items: list[tuple[str, str, str]]) -> None:
        """Marks Syarat Khas for (jenprog, category, code) items as waiting to be read."""

    @abstractmethod
    def save_special(self, code: str, category: str, text: str | None) -> None: ...

    @abstractmethod
    def fail_special(self, items: list[tuple[str, str, str]], error: str) -> None:
        """Marks the items still waiting as failed."""

    @abstractmethod
    def special(self, codes: list[str]) -> list[dict]:
        """Syarat Khas (with status) for these programme codes, every category."""
