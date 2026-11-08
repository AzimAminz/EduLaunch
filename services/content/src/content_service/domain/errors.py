from __future__ import annotations


class DomainError(Exception):
    """Expected business failure; mapped to a 4xx response."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
