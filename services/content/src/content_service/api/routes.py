from __future__ import annotations

import hmac
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, HttpUrl

from ..application.check_sources import CheckSources
from ..config import Settings, get_settings
from ..domain.source import OfficialSource

router = APIRouter()


def require_admin(
    settings: Annotated[Settings, Depends(get_settings)],
    x_internal_token: Annotated[str, Header()] = "",
    x_user_role: Annotated[str, Header()] = "",
) -> None:
    """Same contract as the Node services: only the gateway can call us, and these routes are admin-only."""
    if not hmac.compare_digest(x_internal_token, settings.internal_token):
        raise HTTPException(401, detail={"code": "unauthorized", "message": "Requests must come through the gateway"})
    if x_user_role != "admin":
        raise HTTPException(403, detail={"code": "forbidden", "message": "Admins only"})


class NewSource(BaseModel):
    url: HttpUrl
    source_type: str = "html"
    institution_id: UUID | None = None


@router.get("/sources", dependencies=[Depends(require_admin)])
def list_sources(request: Request) -> list[dict]:
    return [
        {
            "id": str(s.id),
            "url": s.url,
            "type": s.source_type,
            "status": s.status.value,
            "lastCheckedAt": s.last_checked_at,
            "failureReason": s.failure_reason,
        }
        for s in request.app.state.sources.list_all()
    ]


@router.post("/sources", status_code=201, dependencies=[Depends(require_admin)])
def add_source(body: NewSource, request: Request, settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    source = OfficialSource.register(str(body.url), body.source_type, settings.allowed_source_domains, body.institution_id)
    request.app.state.sources.add(source)
    return {"id": str(source.id)}


@router.post("/sources/check", dependencies=[Depends(require_admin)])
async def check_now(request: Request) -> dict:
    report = await CheckSources(request.app.state.sources, request.app.state.fetcher).run()
    return report.__dict__
