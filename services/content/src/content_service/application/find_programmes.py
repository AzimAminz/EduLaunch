"""Find one institution's programmes on ePanduan and keep what was found for an admin to review."""

from __future__ import annotations

import logging
import re
from uuid import UUID

from ..domain.epanduan import CATEGORIES_TO_READ, CATEGORY_ROUTES, FoundProgramme
from ..domain.ports import EpanduanRuns, EpanduanSource
from ..domain.source import DomainError
from ..infrastructure.epanduan_parser import PageLayoutChanged, parse_listing

log = logging.getLogger(__name__)

INSTITUTION_CODE = re.compile(r"^[A-Z]{2}$")


class FindInstitutionProgrammes:
    def __init__(self, runs: EpanduanRuns, source: EpanduanSource) -> None:
        self._runs = runs
        self._source = source

    def start(self, institution_code: str, requested_by: UUID | None) -> UUID:
        """Registers the run; `run` then does the slow reading (in the background)."""
        code = institution_code.strip().upper()
        if not INSTITUTION_CODE.match(code):
            raise DomainError("invalid_code", "An ePanduan institution code has two letters, for example UC")
        run_id = self._runs.start(code, requested_by)
        if run_id is None:
            raise DomainError("run_in_progress", "This institution is already being read; wait for it to finish")
        return run_id

    async def run(self, run_id: UUID, institution_code: str) -> None:
        found: dict[str, FoundProgramme] = {}
        pages = 0
        try:
            for jenprog, category in CATEGORIES_TO_READ:
                route = CATEGORY_ROUTES[(jenprog, category)]
                async for url, html in self._source.search(jenprog, category, institution_code):
                    page = parse_listing(html, route, url)
                    pages += 1
                    for programme in page.programmes:
                        # The filter should only return this institution; anything else is ignored, not stored.
                        if programme.institution_code != institution_code:
                            continue
                        if programme.code in found:
                            found[programme.code].merge(programme)
                        else:
                            found[programme.code] = programme
                    self._runs.progress(run_id, pages)
        except Exception as err:  # noqa: BLE001 - any failure ends the run and nothing is saved
            log.warning("ePanduan run %s for %s failed after %s pages: %s", run_id, institution_code, pages, err)
            self._runs.fail(run_id, _reason(err), pages)
            return
        self._runs.finish(run_id, sorted(found.values(), key=lambda p: p.code), pages)


def _reason(err: Exception) -> str:
    if isinstance(err, PageLayoutChanged):
        return f"layout_changed: {err}"
    name = err.__class__.__name__
    return f"unavailable: {err}" if name == "EpanduanUnavailable" else f"error: {name}"
