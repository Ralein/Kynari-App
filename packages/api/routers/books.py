"""AI Picture Book API router — generate and manage personalized storybooks."""

import logging
from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import get_current_user
from models.book import (
    BookGenerateRequest,
    BookResponse,
    BookListItem,
)
from services import picture_book
from database import fetch_one

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/books", tags=["books"])


@router.post("/generate", response_model=BookResponse)
async def generate_book(
    request: BookGenerateRequest,
    user: dict = Depends(get_current_user),
):
    """Generate a new personalized picture book.

    Uses Claude for narrative generation with template fallback.
    """
    # Validate child ownership if child_id provided
    if request.child_id:
        child = fetch_one(
            "SELECT id FROM children WHERE id = %s AND parent_id = %s",
            (request.child_id, user["user_id"]),
        )
        if not child:
            raise HTTPException(status_code=404, detail="Child not found")

    valid_themes = {"adventure", "bedtime", "nature", "friendship"}
    if request.theme not in valid_themes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid theme. Must be one of: {', '.join(sorted(valid_themes))}",
        )

    valid_styles = {"watercolor", "cartoon", "storybook", "pastel"}
    if request.style not in valid_styles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid style. Must be one of: {', '.join(sorted(valid_styles))}",
        )

    result = await picture_book.generate_book(
        parent_id=user["user_id"],
        child_id=request.child_id,
        child_name=request.child_name,
        theme=request.theme,
        style=request.style,
    )

    if not result:
        raise HTTPException(status_code=500, detail="Failed to generate book")

    return result


@router.get("/", response_model=list[BookListItem])
async def list_books(user: dict = Depends(get_current_user)):
    """List all picture books for the authenticated parent."""
    return picture_book.list_books(user["user_id"])


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(
    book_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a specific picture book by ID."""
    result = picture_book.get_book(book_id, user["user_id"])
    if not result:
        raise HTTPException(status_code=404, detail="Book not found")
    return result


@router.delete("/{book_id}")
async def delete_book(
    book_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a picture book."""
    success = picture_book.delete_book(book_id, user["user_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Book not found")
    return {"deleted": True, "book_id": book_id}
