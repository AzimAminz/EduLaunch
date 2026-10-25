from __future__ import annotations

import re
from html.parser import HTMLParser
from typing import ClassVar

import httpx

from ..domain.ports import FetchedPage, SourceFetcher
from ..domain.source import OfficialSource


class _TextExtractor(HTMLParser):
    """Keeps visible text; drops scripts, styles, navigation and footers."""

    SKIP: ClassVar[frozenset[str]] = frozenset({"script", "style", "nav", "footer", "header", "noscript"})

    def __init__(self) -> None:
        super().__init__()
        self._depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in self.SKIP:
            self._depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in self.SKIP and self._depth:
            self._depth -= 1

    def handle_data(self, data: str) -> None:
        if not self._depth and data.strip():
            self.parts.append(data.strip())


class HttpSourceFetcher(SourceFetcher):
    """Polite crawler: identifies itself, times out, follows redirects. PDFs are handled in Sprint 10."""

    def __init__(self, user_agent: str, timeout_seconds: float = 20.0) -> None:
        self._client = httpx.AsyncClient(headers={"User-Agent": user_agent}, timeout=timeout_seconds, follow_redirects=True)

    async def fetch(self, source: OfficialSource) -> FetchedPage:
        if source.source_type != "html":
            raise NotImplementedError("PDF extraction is not implemented yet")
        response = await self._client.get(source.url)
        response.raise_for_status()
        parser = _TextExtractor()
        parser.feed(response.text)
        return FetchedPage(url=str(response.url), text=re.sub(r"\s+", " ", " ".join(parser.parts)))

    async def aclose(self) -> None:
        await self._client.aclose()
