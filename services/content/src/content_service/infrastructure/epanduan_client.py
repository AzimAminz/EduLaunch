"""Reads ePanduan the way a visitor does: open the category page, tick one institution in the search form, press
Cari, then follow the page links. One request every few seconds, an honest user agent, and a stop at the first
error (no retries that hammer the site, no way around logins, CAPTCHAs or limits)."""

from __future__ import annotations

import asyncio
import math
import re
from collections.abc import AsyncIterator

import httpx

from ..domain.ports import EpanduanSource
from .epanduan_parser import PageIncomplete, PageLayoutChanged, parse_listing, requirement_text, result_count

_TOKEN = re.compile(r'name="_token"\s+value="([^"]+)"')
# A ceiling on pages per category and institution, so a wrong filter can never walk the whole site.
MAX_PAGES = 60
PAGE_SIZE = 10
# Requirement panels are small (about 6 KB), so they are read a little faster than list pages (3-9 MB).
REQUIREMENT_DELAY_SECONDS = 2.0


class EpanduanUnavailable(Exception):
    """The site answered with an error or did not answer; the run stops."""


class HttpEpanduanSource(EpanduanSource):
    def __init__(self, base_url: str, user_agent: str, delay_seconds: float = 4.0, timeout_seconds: float = 60.0) -> None:
        self._base = base_url.rstrip("/")
        self._user_agent = user_agent
        self._delay = delay_seconds
        self._timeout = timeout_seconds

    async def search(self, jenprog: str, category: str, institution_code: str) -> AsyncIterator[tuple[str, str]]:
        list_url = f"{self._base}/ProgramPengajian/kategoriCalon/{category}"
        # A fresh session per search: the site keeps the chosen filter in its session cookie.
        async with httpx.AsyncClient(
            headers={"User-Agent": self._user_agent, "Accept-Language": "ms,en;q=0.8"},
            timeout=self._timeout,
            follow_redirects=True,
        ) as client:
            first = await self._get(client, f"{list_url}?jenprog={jenprog}")
            token = _TOKEN.search(first)
            if not token:
                raise PageLayoutChanged("The search form has no token")
            await asyncio.sleep(self._delay)
            page_one = await self._send(
                client.post(
                    list_url,
                    data={"_token": token.group(1), "carianIPTA[]": institution_code, "searching": ""},
                    headers={"Referer": f"{list_url}?jenprog={jenprog}"},
                )
            )
            if not self._complete(page_one, 1):
                await asyncio.sleep(self._delay * 2)
                page_one = await self._get(client, f"{list_url}?page=1")
            yield list_url, page_one
            pages = min(MAX_PAGES, math.ceil(result_count(page_one) / PAGE_SIZE))
            for page in range(2, pages + 1):
                await asyncio.sleep(self._delay)
                url = f"{list_url}?page={page}"
                html = await self._get(client, url)
                # A page cut short in transfer is read once more after a pause; a second failure stops the run.
                if not self._complete(html, page):
                    await asyncio.sleep(self._delay * 2)
                    html = await self._get(client, url)
                yield url, html

    async def special_requirements(self, items: list[tuple[str, str, str]]) -> AsyncIterator[tuple[str, str, str | None]]:
        """Syarat Khas for (jenprog, category, programme code) items, as the page loads them when Syarat is pressed:
        open the category's list once for a session, then ask for each programme's panel. Yields (category, code,
        text or None when the panel is empty)."""
        by_category: dict[tuple[str, str], list[str]] = {}
        for jenprog, category, code in items:
            by_category.setdefault((jenprog, category), []).append(code)
        for (jenprog, category), codes in by_category.items():
            list_url = f"{self._base}/ProgramPengajian/kategoriCalon/{category}?jenprog={jenprog}"
            async with httpx.AsyncClient(
                headers={"User-Agent": self._user_agent, "Accept-Language": "ms,en;q=0.8"},
                timeout=self._timeout,
                follow_redirects=True,
            ) as client:
                await self._get(client, list_url)
                for code in codes:
                    await asyncio.sleep(REQUIREMENT_DELAY_SECONDS)
                    panel = await self._send(
                        client.get(
                            f"{self._base}/ProgramPengajian/modalSyarat/{category}/{code}",
                            headers={"X-Requested-With": "XMLHttpRequest", "Referer": list_url},
                        )
                    )
                    yield category, code, requirement_text(panel)
                await asyncio.sleep(self._delay)

    @staticmethod
    def _complete(html: str, page: int) -> bool:
        try:
            parse_listing(html, page=page)
        except PageIncomplete:
            return False
        return True

    async def _get(self, client: httpx.AsyncClient, url: str) -> str:
        return await self._send(client.get(url))

    @staticmethod
    async def _send(request) -> str:
        try:
            response = await request
        except httpx.HTTPError as err:
            raise EpanduanUnavailable(f"ePanduan did not answer: {err.__class__.__name__}") from err
        if response.status_code != 200:
            raise EpanduanUnavailable(f"ePanduan answered {response.status_code}")
        return response.text
