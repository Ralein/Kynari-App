"""Audit logging middleware — logs all mutating API operations.

Captures user_id, action, path, status_code, and IP address for
COPPA compliance and security monitoring.
"""

import logging
from datetime import datetime, timezone

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

# Paths to skip logging (high-frequency reads, docs)
SKIP_PATHS = {"/health", "/", "/docs", "/openapi.json", "/redoc"}
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Middleware that logs all mutating API requests to the audit_logs table."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip non-mutating methods and system paths
        if request.method not in MUTATING_METHODS:
            return await call_next(request)

        if request.url.path in SKIP_PATHS:
            return await call_next(request)

        # Execute the request
        response = await call_next(request)

        # Extract user_id from auth header (best effort, don't fail)
        user_id = self._extract_user_id(request)
        ip_address = request.client.host if request.client else None

        # Log asynchronously (don't block the response)
        try:
            from database import get_supabase

            db = get_supabase()
            db.table("audit_logs").insert(
                {
                    "user_id": user_id,
                    "action": f"{request.method} {request.url.path}",
                    "resource_path": request.url.path,
                    "status_code": response.status_code,
                    "ip_address": ip_address,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            ).execute()
        except Exception as e:
            # Never let audit logging break the API
            logger.warning(f"Failed to write audit log: {e}")

        return response

    def _extract_user_id(self, request: Request) -> str | None:
        """Extract user_id from JWT token (best effort)."""
        try:
            auth = request.headers.get("authorization", "")
            if not auth.startswith("Bearer "):
                return None

            from jose import jwt
            from config import get_settings

            token = auth[7:]
            settings = get_settings()
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            return payload.get("sub")
        except Exception:
            return None
