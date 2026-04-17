"""Kynari API — Privacy-first baby need detection backend."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import children, events, summaries, analyze, feedback, context, playbook, soundscape, voice, books, memory
from middleware.rate_limit import RateLimitMiddleware
from middleware.audit import AuditLogMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown hooks."""
    from database import try_connect_db
    try_connect_db()

    # Background Jobs initialization
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from services.memory_garden import detect_milestones_job, generate_weekly_narrative_job

        app.state.scheduler = AsyncIOScheduler()
        # Check for milestones every hour
        app.state.scheduler.add_job(detect_milestones_job, 'interval', hours=1, id='detect_milestones')
        # Generate weekly narrative on Monday at 3 AM
        app.state.scheduler.add_job(generate_weekly_narrative_job, 'cron', day_of_week='mon', hour=3, id='weekly_narrative')

        app.state.scheduler.start()
        logger.info("APScheduler started.")
    except ImportError:
        logger.warning("APScheduler not installed — background jobs disabled.")
        app.state.scheduler = None
    except Exception as e:
        logger.error("Failed to start APScheduler: %s", e)
        app.state.scheduler = None

    yield

    # Shutdown: stop scheduler and close connection pool
    if getattr(app.state, "scheduler", None) is not None:
        app.state.scheduler.shutdown()
    from database import close_pool
    close_pool()


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Privacy-first AI baby need detection API. "
        "Analyzes cry audio, facial distress, and contextual metadata "
        "to predict baby needs (hungry, diaper, sleepy, pain, calm). "
        "Raw audio never leaves the device."
    ),
    lifespan=lifespan,
)

# ─── Security Headers ────────────────────────────────────────


@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=()"
    return response


# ─── Middleware Stack (order matters: last added = first executed) ─

app.add_middleware(AuditLogMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────

app.include_router(children.router)
app.include_router(events.router)
app.include_router(summaries.router)
app.include_router(analyze.router)
app.include_router(feedback.router)
app.include_router(context.router)
app.include_router(playbook.router)
app.include_router(soundscape.router)
app.include_router(voice.router)
app.include_router(books.router)
app.include_router(memory.router)


# ─── Health Check ────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": settings.app_version}


@app.get("/", tags=["system"])
async def root():
    """Root endpoint — API info."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
    }
