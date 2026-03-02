"""Kynari API — Privacy-first emotion detection backend."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import children, events, summaries


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown hooks."""
    # Startup: warm up database connection
    from database import get_supabase
    get_supabase()
    yield
    # Shutdown: cleanup if needed


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Privacy-first AI emotion detection API for toddlers. Raw audio never leaves the device.",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────

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
