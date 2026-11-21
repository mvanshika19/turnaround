"""Application factory."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.dependencies import get_plan_store, get_planner, get_trail_repository
from app.api.router import api_router
from app.config import get_settings
from app.errors import PlanNotFoundError, TrailNotFoundError
from app.logging_config import configure_logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Build the singletons at startup so misconfiguration fails fast instead of on the first request."""
    get_trail_repository()
    get_plan_store()
    planner = get_planner()
    logger.info("Turnaround backend %s ready with the %s planner", __version__, planner.source.value)
    yield


async def _not_found_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Render a domain not-found error as a 404 with a plain-sentence ``detail``."""
    return JSONResponse(status_code=404, content={"detail": str(exc)})


def create_app() -> FastAPI:
    """Build the FastAPI application."""
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title="Turnaround API",
        version=__version__,
        description="Plans North Shore hikes and finds the latest safe time to turn around.",
        openapi_url="/api/openapi.json",
        docs_url="/api/docs",
        redoc_url=None,
        lifespan=_lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    app.add_exception_handler(TrailNotFoundError, _not_found_handler)
    app.add_exception_handler(PlanNotFoundError, _not_found_handler)
    app.include_router(api_router)
    return app


app = create_app()
