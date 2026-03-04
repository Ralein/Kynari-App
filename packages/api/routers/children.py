"""Children CRUD router."""

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from models.schemas import ChildCreate, ChildResponse
from database import fetch_one, fetch_all, execute_returning, execute

router = APIRouter(prefix="/children", tags=["children"])


@router.post("/", response_model=ChildResponse, status_code=201)
async def create_child(child: ChildCreate, user: dict = Depends(get_current_user)):
    """Create a new child profile for the authenticated parent."""
    result = execute_returning(
        """
        INSERT INTO children (parent_id, name, date_of_birth, avatar_url)
        VALUES (%s, %s, %s, %s)
        RETURNING *
        """,
        (user["user_id"], child.name, child.date_of_birth.isoformat(), child.avatar_url),
    )

    if not result:
        raise HTTPException(status_code=500, detail="Failed to create child")

    return result


@router.get("/", response_model=list[ChildResponse])
async def list_children(user: dict = Depends(get_current_user)):
    """List all children for the authenticated parent."""
    rows = fetch_all(
        "SELECT * FROM children WHERE parent_id = %s",
        (user["user_id"],),
    )
    return rows


@router.get("/{child_id}", response_model=ChildResponse)
async def get_child(child_id: str, user: dict = Depends(get_current_user)):
    """Get a specific child by ID (must belong to authenticated parent)."""
    row = fetch_one(
        "SELECT * FROM children WHERE id = %s AND parent_id = %s",
        (child_id, user["user_id"]),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Child not found")
    return row


@router.put("/{child_id}", response_model=ChildResponse)
async def update_child(
    child_id: str, child: ChildCreate, user: dict = Depends(get_current_user)
):
    """Update a child profile."""
    # Verify ownership
    existing = fetch_one(
        "SELECT id FROM children WHERE id = %s AND parent_id = %s",
        (child_id, user["user_id"]),
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Child not found")

    result = execute_returning(
        """
        UPDATE children
        SET name = %s, date_of_birth = %s, avatar_url = %s
        WHERE id = %s
        RETURNING *
        """,
        (child.name, child.date_of_birth.isoformat(), child.avatar_url, child_id),
    )

    if not result:
        raise HTTPException(status_code=500, detail="Failed to update child")

    return result


@router.delete("/{child_id}")
async def delete_child(child_id: str, user: dict = Depends(get_current_user)):
    """Delete a child and all associated data (COPPA right-to-delete).

    Explicitly purges all child data before removing the profile,
    ensuring a complete audit trail of the deletion.
    """
    # Verify ownership
    existing = fetch_one(
        "SELECT id FROM children WHERE id = %s AND parent_id = %s",
        (child_id, user["user_id"]),
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Child not found")

    # Explicit data purge (creates audit trail)
    from services.data_retention import data_retention

    purge_result = await data_retention.purge_all_child_data(child_id)

    # Delete the child profile (FK CASCADE handles any remaining refs)
    execute("DELETE FROM children WHERE id = %s", (child_id,))

    return {
        "deleted": True,
        "child_id": child_id,
        **purge_result,
    }
