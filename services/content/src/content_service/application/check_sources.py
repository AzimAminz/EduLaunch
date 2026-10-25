from __future__ import annotations

import logging
from dataclasses import dataclass, field

from ..domain.ports import SourceFetcher, SourceRepository

log = logging.getLogger(__name__)


@dataclass
class CheckReport:
    checked: int = 0
    changed: int = 0
    failed: int = 0
    draft_ids: list[str] = field(default_factory=list)


class CheckSources:
    """Weekly job: fetch every source, skip unchanged ones, queue a draft for each change.

    Unchanged pages never reach the LLM; this is the main cost saver. AI extraction of the
    queued drafts is a separate step (roadmap Sprint 11), always followed by admin review.
    """

    def __init__(self, repo: SourceRepository, fetcher: SourceFetcher) -> None:
        self._repo = repo
        self._fetcher = fetcher

    async def run(self) -> CheckReport:
        report = CheckReport()
        for source in self._repo.list_all():
            report.checked += 1
            try:
                page = await self._fetcher.fetch(source)
            except Exception as exc:  # noqa: BLE001 - one broken source must not stop the weekly run
                source.record_failure(str(exc))
                self._repo.update(source)
                report.failed += 1
                log.warning("source %s failed: %s", source.url, exc)
                continue
            if source.record_fetch(page.text):
                draft_id = self._repo.create_draft(source.id, source.content_checksum or "")
                report.changed += 1
                report.draft_ids.append(str(draft_id))
            self._repo.update(source)
        return report
