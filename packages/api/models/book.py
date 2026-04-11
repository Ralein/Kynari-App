"""Pydantic models for AI Picture Book."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BookPage(BaseModel):
    page_number: int
    text: str
    image_prompt: Optional[str] = None
    image_url: Optional[str] = None


class BookGenerateRequest(BaseModel):
    child_id: Optional[str] = None
    child_name: str
    theme: str = "bedtime"  # adventure | bedtime | nature | friendship
    style: str = "watercolor"  # watercolor | cartoon | storybook | pastel


class BookResponse(BaseModel):
    id: str
    title: str
    theme: str
    style: str
    child_name: Optional[str] = None
    pages: list[BookPage]
    status: str
    created_at: Optional[datetime] = None


class BookListItem(BaseModel):
    id: str
    title: str
    theme: str
    style: str
    child_name: Optional[str] = None
    page_count: int
    status: str
    created_at: Optional[datetime] = None
