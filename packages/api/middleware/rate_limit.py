"""In-memory sliding window rate limiter.

Per-user rate limits — no Redis required at this scale.
Falls back to IP address for unauthenticated requests.
"""

import time
import logging
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

logger = logging.getLogger(__name__)

# Rate limit configuration
RATE_LIMITS: dict[str, tuple[int, int]] = {
    # path_prefix: (max_requests, window_seconds)
    "/events/batch": (10, 60),  # 10 batch writes per minute
}
DEFAULT_LIMIT = (60, 60)  # 60 requests per minute for everything else


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding window rate limiter keyed by user_id or IP."""

    def __init__(self, app):
        super().__init__(app)
        # {key: [(timestamp, ...)]}
        self._windows: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting for health checks and docs
        if request.url.path in {"/health", "/", "/docs", "/openapi.json"}:
            return await call_next(request)

        # Determine the identity key
        key = self._get_key(request)
        limit, window = self._get_limit(request.url.path)

        # Clean old timestamps and check
        now = time.monotonic()
        window_key = f"{key}:{request.url.path.split('/')[1]}"
        timestamps = self._windows[window_key]

        # Remove expired entries
        cutoff = now - window
        self._windows[window_key] = [t for t in timestamps if t > cutoff]
        timestamps = self._windows[window_key]

        if len(timestamps) >= limit:
            retry_after = int(window - (now - timestamps[0]))
            logger.warning(
                f"Rate limit exceeded for {window_key}: "
                f"{len(timestamps)}/{limit} in {window}s"
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "retry_after": max(retry_after, 1),
                },
                headers={"Retry-After": str(max(retry_after, 1))},
            )

        # Record this request
        timestamps.append(now)

        return await call_next(request)

    def _get_key(self, request: Request) -> str:
        """Extract user identity for rate limiting."""
        # Try JWT user_id first
        try:
            auth = request.headers.get("authorization", "")
            if auth.startswith("Bearer "):
                from jose import jwt
                from config import get_settings

                token = auth[7:]
                settings = get_settings()
                payload = jwt.decode(
                    token,
                    settings.jwt_secret,
                    algorithms=["HS256"],
                    audience="authenticated",
                    options={"verify_exp": False},
                )
                user_id = payload.get("sub")
                if user_id:
                    return f"user:{user_id}"
        except Exception:
            pass

        # Fallback to IP
        ip = request.client.host if request.client else "unknown"
        return f"ip:{ip}"

    def _get_limit(self, path: str) -> tuple[int, int]:
        """Get rate limit for a specific path."""
        for prefix, limit in RATE_LIMITS.items():
            if path.startswith(prefix):
                return limit
        return DEFAULT_LIMIT
