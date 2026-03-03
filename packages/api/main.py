"""Kynari API — Privacy-first baby need detection backend."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import children, events, summaries, analyze, feedback, context
from middleware.rate_limit import RateLimitMiddleware
from middleware.audit import AuditLogMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown hooks."""
    from database import try_connect_db
    try_connect_db()
    yield
    # Shutdown: close connection pool
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
