"""JWT authentication middleware for FastAPI."""

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from config import get_settings

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Verify JWT token from Authorization header.
    Returns the decoded user payload (sub = user_id).
    """
    settings = get_settings()
    token = credentials.credentials

    try:
        # Supabase JWTs use HS256 with the JWT secret
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no subject")
        return {"user_id": user_id, "email": payload.get("email"), "role": payload.get("role")}
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
