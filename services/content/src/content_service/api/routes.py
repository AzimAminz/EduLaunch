from __future__ import annotations

import hmac
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field, HttpUrl

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


class EpanduanRunRequest(BaseModel):
    institution_code: str = Field(alias="institutionCode", min_length=2, max_length=2)


@router.post("/epanduan/runs", status_code=202, dependencies=[Depends(require_admin)])
def start_epanduan_run(
    body: EpanduanRunRequest,
    request: Request,
    background: BackgroundTasks,
    x_user_id: Annotated[str, Header()] = "",
) -> dict:
    """Starts reading one institution's programmes from ePanduan; it takes a minute or two, so the answer comes at
    once and the page asks for the result with GET /epanduan/runs/latest."""
    use_case = request.app.state.find_programmes
    try:
        requested_by = UUID(x_user_id) if x_user_id else None
    except ValueError:
        requested_by = None
    code = body.institution_code.upper()
    run_id = use_case.start(code, requested_by)
    background.add_task(use_case.run, run_id, code)
    return {"id": str(run_id), "status": "running"}


@router.get("/epanduan/runs/latest", dependencies=[Depends(require_admin)])
def latest_epanduan_run(request: Request, institution_code: Annotated[str, Query(alias="institutionCode", pattern="^[A-Za-z]{2}$")]) -> dict:
    return {"run": request.app.state.epanduan_runs.latest(institution_code.upper())}


class SpecialRequirementsRequest(BaseModel):
    institution_code: str = Field(alias="institutionCode", min_length=2, max_length=2)
    codes: list[str] = Field(min_length=1, max_length=200)


@router.post("/epanduan/requirements", status_code=202, dependencies=[Depends(require_admin)])
def read_special_requirements(body: SpecialRequirementsRequest, request: Request, background: BackgroundTasks) -> dict:
    """Reads Syarat Khas for accepted programmes (every category each one is listed under), in the background."""
    use_case = request.app.state.read_requirements
    items = use_case.start(body.institution_code, body.codes)
    background.add_task(use_case.run, items)
    return {"pending": len(items)}


@router.get("/epanduan/requirements", dependencies=[Depends(require_admin)])
def special_requirements(request: Request, codes: Annotated[str, Query(max_length=2400)]) -> list[dict]:
    wanted = [c.strip().upper() for c in codes.split(",") if c.strip()][:200]
    return request.app.state.epanduan_runs.special(wanted)


@router.get("/epanduan/found", dependencies=[Depends(require_admin)])
def found_programmes(request: Request, codes: Annotated[str, Query(max_length=2400)]) -> list[dict]:
    """These programmes as the newest finished run of their institution found them (the code's first two letters)."""
    wanted = [c.strip().upper() for c in codes.split(",") if c.strip()][:200]
    by_institution: dict[str, list[str]] = {}
    for code in wanted:
        by_institution.setdefault(code[:2], []).append(code)
    runs = request.app.state.epanduan_runs
    return [found for prefix, group in by_institution.items() for found in runs.found(prefix, group)]
