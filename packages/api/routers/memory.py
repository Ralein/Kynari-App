"""Memory Garden API router — milestones and weekly narratives."""

import logging
from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import get_current_user
from models.memory import (
    MilestoneCreate,
    MilestoneResponse,
    MemoryGardenResponse,
)
from services import memory_garden
from database import fetch_one

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/memory", tags=["memory"])


def _verify_child_ownership(child_id: str, user_id: str) -> None:
    child = fetch_one(
        "SELECT id FROM children WHERE id = %s AND parent_id = %s",
        (child_id, user_id),
    )
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")


@router.get("/garden/{child_id}", response_model=MemoryGardenResponse)
async def get_garden(
    child_id: str,
    user: dict = Depends(get_current_user),
):
    """Get the full Memory Garden — milestones + weekly narratives."""
    _verify_child_ownership(child_id, user["user_id"])
    return memory_garden.get_garden(child_id)


@router.post("/milestones", response_model=MilestoneResponse, status_code=201)
async def create_milestone(
    request: MilestoneCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new milestone for a child."""
    _verify_child_ownership(request.child_id, user["user_id"])

    valid_types = {"first_smile", "first_laugh", "first_word", "first_step", "custom"}
    if request.type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid type. Must be one of: {', '.join(sorted(valid_types))}",
        )

    result = memory_garden.create_milestone(
        child_id=request.child_id,
        milestone_type=request.type,
        title=request.title,
        description=request.description,
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create milestone")
    return result


@router.get("/milestones/{child_id}", response_model=list[MilestoneResponse])
async def list_milestones(
    child_id: str,
    user: dict = Depends(get_current_user),
):
    """List all milestones for a child."""
    _verify_child_ownership(child_id, user["user_id"])
    return memory_garden.list_milestones(child_id)


@router.delete("/milestones/{milestone_id}")
async def delete_milestone(
    milestone_id: str,
    child_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a milestone."""
    _verify_child_ownership(child_id, user["user_id"])
    success = memory_garden.delete_milestone(milestone_id, child_id)
    if not success:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return {"deleted": True}
