from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from psycopg_pool import ConnectionPool

from .api.routes import router
from .application.find_programmes import FindInstitutionProgrammes, ReadSpecialRequirements
from .config import get_settings
from .domain.source import DomainError
from .infrastructure.epanduan_client import HttpEpanduanSource
from .infrastructure.epanduan_repository import PostgresEpanduanRuns
from .infrastructure.http_fetcher import HttpSourceFetcher
from .infrastructure.postgres_repository import PostgresSourceRepository


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    pool = ConnectionPool(settings.database_url, min_size=1, max_size=5, open=True)
    app.state.sources = PostgresSourceRepository(pool)
    app.state.fetcher = HttpSourceFetcher(settings.crawler_user_agent)
    app.state.epanduan_runs = PostgresEpanduanRuns(pool)
    epanduan = HttpEpanduanSource(settings.epanduan_base_url, settings.crawler_user_agent, settings.epanduan_delay_seconds)
    app.state.find_programmes = FindInstitutionProgrammes(app.state.epanduan_runs, epanduan)
    app.state.read_requirements = ReadSpecialRequirements(app.state.epanduan_runs, epanduan)
    yield
    await app.state.fetcher.aclose()
    pool.close()


app = FastAPI(title="EduLaunch content service", lifespan=lifespan, docs_url=None, redoc_url=None)
app.include_router(router)


@app.exception_handler(DomainError)
async def domain_error(_: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"code": exc.code, "message": str(exc)})


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "time": datetime.now(UTC).isoformat()}
