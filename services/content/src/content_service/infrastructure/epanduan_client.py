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
from .epanduan_parser import PageLayoutChanged, result_count

_TOKEN = re.compile(r'name="_token"\s+value="([^"]+)"')
# A ceiling on pages per category and institution, so a wrong filter can never walk the whole site.
MAX_PAGES = 60
PAGE_SIZE = 10


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
            yield list_url, page_one
            pages = min(MAX_PAGES, math.ceil(result_count(page_one) / PAGE_SIZE))
            for page in range(2, pages + 1):
                await asyncio.sleep(self._delay)
                url = f"{list_url}?page={page}"
                yield url, await self._get(client, url)

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
