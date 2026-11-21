"""Aggregates every route module under the ``/api`` prefix."""

from fastapi import APIRouter

from app.api.routes import copilot, health, plans, trails

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(trails.router)
api_router.include_router(plans.router)
api_router.include_router(copilot.router)
