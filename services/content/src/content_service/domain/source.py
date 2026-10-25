from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from urllib.parse import urlparse
from uuid import UUID, uuid4


class DomainError(Exception):
    """Expected business failure; mapped to a 4xx response."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class CrawlStatus(StrEnum):
    NEW = "new"
    UNCHANGED = "unchanged"
    CHANGED = "changed"
    FAILED = "failed"


def checksum(text: str) -> str:
    """Whitespace-insensitive fingerprint, so layout-only changes do not trigger AI work."""
    return hashlib.sha256(re.sub(r"\s+", " ", text).strip().encode()).hexdigest()


@dataclass
class OfficialSource:
    """An official page or PDF the pipeline watches. Entity: identity is `id`."""

    url: str
    source_type: str
    institution_id: UUID | None = None
    id: UUID = field(default_factory=uuid4)
    content_checksum: str | None = None
    last_checked_at: datetime | None = None
    status: CrawlStatus = CrawlStatus.NEW
    failure_reason: str | None = None

    @classmethod
    def register(cls, url: str, source_type: str, allowed_domains: list[str], institution_id: UUID | None = None) -> OfficialSource:
        parsed = urlparse(url)
        if parsed.scheme != "https":
            raise DomainError("invalid_source", "Official sources must use https")
        host = (parsed.hostname or "").lower()
        if not any(host == d or host.endswith("." + d) for d in allowed_domains):
            raise DomainError("not_official", f"{host} is not on the list of official domains")
        if source_type not in ("html", "pdf"):
            raise DomainError("invalid_source", "Source type must be html or pdf")
        return cls(url=url, source_type=source_type, institution_id=institution_id)

    def record_fetch(self, text: str, now: datetime | None = None) -> bool:
        """Returns True when the content changed since the last check (first fetch counts as a change)."""
        new = checksum(text)
        changed = new != self.content_checksum
        self.content_checksum = new
        self.last_checked_at = now or datetime.now(UTC)
        self.status = CrawlStatus.CHANGED if changed else CrawlStatus.UNCHANGED
        self.failure_reason = None
        return changed

    def record_failure(self, reason: str, now: datetime | None = None) -> None:
        self.last_checked_at = now or datetime.now(UTC)
        self.status = CrawlStatus.FAILED
        self.failure_reason = reason[:500]
