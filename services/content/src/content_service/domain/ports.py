from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID

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
