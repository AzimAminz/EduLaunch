from __future__ import annotations

import hmac
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

from ..config import Settings, get_settings

router = APIRouter()


def require_student(
    settings: Annotated[Settings, Depends(get_settings)],
    x_internal_token: Annotated[str, Header()] = "",
    x_user_role: Annotated[str, Header()] = "",
    x_user_id: Annotated[str, Header()] = "",
) -> str:
    """Through the gateway, as a signed-in student; returns their account id."""
    if not hmac.compare_digest(x_internal_token, settings.internal_token):
        raise HTTPException(401, detail={"code": "unauthorized", "message": "Requests must come through the gateway"})
    if x_user_role != "student" or not x_user_id:
        raise HTTPException(403, detail={"code": "forbidden", "message": "Students only"})
    return x_user_id


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


# --- Result slips -------------------------------------------------------------------------------------------------

MAX_SLIP_BYTES = 8 * 1024 * 1024
SLIP_LIMIT = (10, 600)  # readings per student per 10 minutes
_slip_calls: dict[str, list[float]] = {}


class SlipRequest(BaseModel):
    mime: str = Field(max_length=40)
    data: str = Field(description="The file, base64-encoded", max_length=12 * 1024 * 1024)


@router.post("/slips/read")
def read_slip(body: SlipRequest, request: Request, student: Annotated[str, Depends(require_student)]) -> dict:
    """Reads a result slip into rows (code, name, grade, confidence) for the student to check. The file stays in
    memory for this request only: it is not stored or logged."""
    import base64
    import binascii
    import time

    now = time.monotonic()
    recent = [t for t in _slip_calls.get(student, []) if now - t < SLIP_LIMIT[1]]
    if len(recent) >= SLIP_LIMIT[0]:
        raise HTTPException(429, detail={"code": "too_many_readings", "message": "Too many slips read; try again in a few minutes"})
    _slip_calls[student] = [*recent, now]
    try:
        data = base64.b64decode(body.data, validate=True)
    except (binascii.Error, ValueError) as err:
        raise HTTPException(400, detail={"code": "invalid_file", "message": "The file could not be read"}) from err
    if len(data) > MAX_SLIP_BYTES:
        raise HTTPException(413, detail={"code": "file_too_large", "message": "The file is larger than 8 MB"})
    reading = request.app.state.slip_reader.read(data, body.mime)
    return {
        "source": reading.source,
        "examYear": reading.exam_year,
        "rows": [{"code": r.code, "name": r.name, "grade": r.grade, "confidence": r.confidence} for r in reading.rows],
    }
