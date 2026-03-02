"""JWT authentication middleware for FastAPI — Clerk Auth."""

import httpx
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
from jose.utils import base64url_decode
from functools import lru_cache
from config import get_settings

security = HTTPBearer()

# ─── JWKS Cache ──────────────────────────────────────────────

_jwks_cache: dict | None = None


def _get_clerk_issuer() -> str:
    """Derive the Clerk issuer URL from the publishable key."""
    settings = get_settings()
    # Clerk publishable keys encode the instance slug
    # The JWKS URL is at https://<instance>.clerk.accounts.dev/.well-known/jwks.json
    # But we can also use the Clerk Frontend API domain
    pk = settings.clerk_publishable_key
    if not pk:
        raise HTTPException(status_code=500, detail="Clerk publishable key not configured")
    
    # Decode the base64 part of the publishable key to get the domain
    import base64
    # pk_test_XXXX or pk_live_XXXX — the base64 part is after the prefix
    parts = pk.split("_", 2)
    if len(parts) < 3:
        raise HTTPException(status_code=500, detail="Invalid Clerk publishable key format")
    
    domain = base64.b64decode(parts[2] + "==").decode("utf-8").rstrip("$")
    return f"https://{domain}"


def _fetch_jwks() -> dict:
    """Fetch Clerk's JWKS (cached in memory)."""
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache

    issuer = _get_clerk_issuer()
    jwks_url = f"{issuer}/.well-known/jwks.json"
    
    response = httpx.get(jwks_url, timeout=10)
    response.raise_for_status()
    _jwks_cache = response.json()
    return _jwks_cache


def _get_signing_key(token: str) -> dict:
    """Get the RSA public key from JWKS that matches the token's kid."""
    jwks = _fetch_jwks()
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")
    
    for key in jwks.get("keys", []):
        if key["kid"] == kid:
            return key
    
    # If key not found, refresh cache and try again
    global _jwks_cache
    _jwks_cache = None
    jwks = _fetch_jwks()
    
    for key in jwks.get("keys", []):
        if key["kid"] == kid:
            return key
    
    raise HTTPException(status_code=401, detail="Unable to find signing key")


# ─── Auth Dependency ─────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Verify Clerk JWT token from Authorization header.
    Returns the decoded user payload (sub = user_id).
    """
    token = credentials.credentials

    try:
        signing_key = _get_signing_key(token)
        issuer = _get_clerk_issuer()
        
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=issuer,
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no subject")
        
        return {
            "user_id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role", "user"),
        }
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"Auth service unavailable: {str(e)}")
