"""Find one institution's programmes on ePanduan and keep what was found for an admin to review."""

from __future__ import annotations

import logging
import re
from uuid import UUID

from ..domain.epanduan import CATEGORIES_TO_READ, FoundProgramme
from ..domain.ports import EpanduanRuns, EpanduanSource
from ..domain.source import DomainError
from ..infrastructure.epanduan_parser import PageIncomplete, PageLayoutChanged, parse_listing

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
                self._runs.progress(run_id, pages, f"{jenprog}:{category}")
                page_no = 0
                async for url, html in self._source.search(jenprog, category, institution_code):
                    page_no += 1
                    page = parse_listing(html, jenprog, category, url, page=page_no)
                    pages += 1
                    for programme in page.programmes:
                        # The filter should only return this institution; anything else is ignored, not stored.
                        if programme.institution_code != institution_code:
                            continue
                        if programme.code in found:
                            found[programme.code].merge(programme)
                        else:
                            found[programme.code] = programme
                    self._runs.progress(run_id, pages, f"{jenprog}:{category}")
        except Exception as err:  # noqa: BLE001 - any failure ends the run and nothing is saved
            log.warning("ePanduan run %s for %s failed after %s pages: %s", run_id, institution_code, pages, err)
            self._runs.fail(run_id, _reason(err), pages)
            return
        self._runs.finish(run_id, sorted(found.values(), key=lambda p: p.code), pages)


def _reason(err: Exception) -> str:
    if isinstance(err, PageLayoutChanged):
        return f"layout_changed: {err}"
    if isinstance(err, PageIncomplete):
        return f"unavailable: incomplete page ({err})"
    name = err.__class__.__name__
    return f"unavailable: {err}" if name == "EpanduanUnavailable" else f"error: {name}"


class ReadSpecialRequirements:
    """Reads Syarat Khas for programmes an admin accepted, for every category each one is listed under."""

    def __init__(self, runs: EpanduanRuns, source: EpanduanSource) -> None:
        self._runs = runs
        self._source = source

    def start(self, institution_code: str, codes: list[str]) -> list[tuple[str, str, str]]:
        code = institution_code.strip().upper()
        if not INSTITUTION_CODE.match(code):
            raise DomainError("invalid_code", "An ePanduan institution code has two letters, for example UC")
        wanted = sorted({c.strip().upper() for c in codes if c.strip().upper().startswith(code)})[:200]
        items = [(c["jenprog"], c["category"], f["code"]) for f in self._runs.found(code, wanted) for c in f.get("categories", [])]
        if not items:
            raise DomainError("nothing_to_read", "None of these programmes is in the latest ePanduan run")
        self._runs.request_special(items)
        return items

    async def run(self, items: list[tuple[str, str, str]]) -> None:
        done: set[tuple[str, str]] = set()
        try:
            async for category, code, text in self._source.special_requirements(items):
                self._runs.save_special(code, category, text)
                done.add((category, code))
        except Exception as err:  # noqa: BLE001 - what was read is kept; the rest is marked failed
            log.warning("Reading Syarat Khas stopped after %s of %s: %s", len(done), len(items), err)
            self._runs.fail_special([i for i in items if (i[1], i[2]) not in done], _reason(err))
