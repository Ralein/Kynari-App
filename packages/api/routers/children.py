"""Children CRUD router."""

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from models.schemas import ChildCreate, ChildResponse
from database import get_supabase

router = APIRouter(prefix="/children", tags=["children"])


@router.post("/", response_model=ChildResponse, status_code=201)
async def create_child(child: ChildCreate, user: dict = Depends(get_current_user)):
    """Create a new child profile for the authenticated parent."""
    db = get_supabase()

    data = {
        "parent_id": user["user_id"],
        "name": child.name,
        "date_of_birth": child.date_of_birth.isoformat(),
        "avatar_url": child.avatar_url,
    }

    result = db.table("children").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create child")

    return result.data[0]


@router.get("/", response_model=list[ChildResponse])
async def list_children(user: dict = Depends(get_current_user)):
    """List all children for the authenticated parent."""
    db = get_supabase()
    result = db.table("children").select("*").eq("parent_id", user["user_id"]).execute()
    return result.data or []


@router.get("/{child_id}", response_model=ChildResponse)
async def get_child(child_id: str, user: dict = Depends(get_current_user)):
    """Get a specific child by ID (must belong to authenticated parent)."""
    db = get_supabase()
    result = (
        db.table("children")
        .select("*")
        .eq("id", child_id)
        .eq("parent_id", user["user_id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Child not found")

    return result.data


@router.put("/{child_id}", response_model=ChildResponse)
async def update_child(
    child_id: str, child: ChildCreate, user: dict = Depends(get_current_user)
):
    """Update a child profile."""
    db = get_supabase()

    # Verify ownership
    existing = (
        db.table("children")
        .select("id")
        .eq("id", child_id)
        .eq("parent_id", user["user_id"])
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Child not found")

    update_data = {
        "name": child.name,
        "date_of_birth": child.date_of_birth.isoformat(),
        "avatar_url": child.avatar_url,
    }

    result = db.table("children").update(update_data).eq("id", child_id).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update child")

    return result.data[0]


@router.delete("/{child_id}")
async def delete_child(child_id: str, user: dict = Depends(get_current_user)):
    """Delete a child and all associated data (cascade via FK)."""
    db = get_supabase()

    # Verify ownership
    existing = (
        db.table("children")
        .select("id")
        .eq("id", child_id)
        .eq("parent_id", user["user_id"])
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Child not found")

    db.table("children").delete().eq("id", child_id).execute()

    return {"deleted": True, "child_id": child_id}
