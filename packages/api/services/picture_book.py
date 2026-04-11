"""AI Picture Book service — generates personalized storybooks.

Uses Claude for narrative text generation. Images generated client-side
or via a separate call if a Replicate key is configured.
"""

import json
import logging
import os

from database import fetch_one, fetch_all, execute_returning

logger = logging.getLogger(__name__)


# ─── Story Templates (fallback if Claude unavailable) ────────

STORY_TEMPLATES = {
    "bedtime": {
        "title": "{name}'s Dreamy Night",
        "pages": [
            "Once upon a time, little {name} was getting ready for bed. The stars outside were starting to twinkle, one by one.",
            "\"Time for pajamas!\" said Mama. {name} put on the softest, coziest pajamas — the ones with the tiny moons on them.",
            "{name} brushed teeth — scrub scrub scrub — and picked a favorite stuffed animal for bedtime cuddles.",
            "Mama read a story, and {name}'s eyes grew heavy like two little sleepy clouds. The world felt warm and safe.",
            "\"Goodnight, sweet {name},\" whispered Mama. And in the land of dreams, a thousand soft adventures waited. The end.",
        ],
    },
    "adventure": {
        "title": "{name}'s Big Adventure",
        "pages": [
            "One sunny morning, {name} found a magical map under the pillow! It showed a path through a whispering forest.",
            "{name} followed the path and met a friendly fox. \"Come with me!\" said the fox. \"There's something wonderful ahead!\"",
            "Together they crossed a bridge made of rainbows. Below, a gentle river sang a happy song.",
            "At the end of the path was a garden full of the biggest, most colorful flowers {name} had ever seen!",
            "{name} picked a golden flower and carried it home. \"Every adventure ends with something beautiful,\" said the fox. The end.",
        ],
    },
    "nature": {
        "title": "{name} and the Friendly Forest",
        "pages": [
            "In a forest not far away, the trees whispered {name}'s name. \"Come play with us!\" they rustled gently.",
            "A little bluebird landed on {name}'s finger. \"Tweet tweet!\" it sang. \"Follow me to the secret meadow!\"",
            "The meadow was full of butterflies — blue ones, yellow ones, and one special purple butterfly just for {name}.",
            "A gentle deer peeked out from behind a tree. {name} offered a leaf, and the deer nuzzled {name}'s hand.",
            "As the sun set, painting the sky orange and pink, {name} waved goodbye. \"See you tomorrow, friends!\" The end.",
        ],
    },
    "friendship": {
        "title": "{name}'s New Friend",
        "pages": [
            "{name} was playing in the park when a teddy bear appeared on the bench. It had the kindest button eyes.",
            "\"Hello!\" said {name}. The teddy bear's smile seemed to grow wider. {name} decided to name it Honey.",
            "Together, {name} and Honey went on the swings — higher and higher, touching the clouds!",
            "They had a picnic under the big oak tree. {name} shared crackers, and Honey shared warm, fuzzy hugs.",
            "At the end of the day, {name} carried Honey home. \"Best friends forever,\" {name} whispered. The end.",
        ],
    },
}


def _generate_from_template(child_name: str, theme: str) -> dict:
    """Use template fallback to generate a book (no AI needed)."""
    template = STORY_TEMPLATES.get(theme, STORY_TEMPLATES["bedtime"])
    title = template["title"].format(name=child_name)
    pages = []
    for i, text in enumerate(template["pages"]):
        pages.append({
            "page_number": i + 1,
            "text": text.format(name=child_name),
            "image_prompt": f"Children's {child_name} book illustration, page {i+1}, soft watercolor style, warm and gentle",
            "image_url": None,
        })
    return {"title": title, "pages": pages}


async def generate_book(
    parent_id: str,
    child_id: str | None,
    child_name: str,
    theme: str,
    style: str,
) -> dict | None:
    """Generate a picture book and store it in the database.

    Tries Claude for narrative generation first. Falls back to templates.
    """
    # Try Claude API if available
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if anthropic_key:
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=anthropic_key)
            prompt = f"""Generate a 5-page children's bedtime picture book for a baby named {child_name}.
Theme: {theme}
Style: {style}

Return ONLY valid JSON with this structure:
{{
  "title": "Book Title",
  "pages": [
    {{"page_number": 1, "text": "Story text for page 1", "image_prompt": "Illustration description"}},
    ...
  ]
}}

Rules:
- Each page should be 1-3 gentle, warm sentences
- Language should be simple enough for a toddler
- The story should have a comforting, positive arc
- Image prompts should be descriptive for {style}-style illustration
- Use {child_name} as the main character
- Make it soothing and age-appropriate"""

            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}],
            )

            text = response.content[0].text
            # Extract JSON from response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                book_data = json.loads(text[start:end])
            else:
                book_data = _generate_from_template(child_name, theme)

        except Exception as e:
            logger.warning(f"Claude generation failed, using template: {e}")
            book_data = _generate_from_template(child_name, theme)
    else:
        book_data = _generate_from_template(child_name, theme)

    # Store in database
    result = execute_returning(
        """
        INSERT INTO picture_books
            (parent_id, child_id, title, theme, style, pages_json, child_name, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'complete')
        RETURNING id::text, title, theme, style, child_name, pages_json, status, created_at
        """,
        (
            parent_id,
            child_id,
            book_data["title"],
            theme,
            style,
            json.dumps(book_data["pages"]),
            child_name,
        ),
    )

    if result:
        result["pages"] = result.pop("pages_json", [])
    return result


def get_book(book_id: str, parent_id: str) -> dict | None:
    """Get a single book by ID, verifying ownership."""
    row = fetch_one(
        """
        SELECT id::text, title, theme, style, child_name, pages_json, status, created_at
        FROM picture_books
        WHERE id = %s AND parent_id = %s
        """,
        (book_id, parent_id),
    )
    if row:
        row["pages"] = row.pop("pages_json", [])
    return row


def list_books(parent_id: str) -> list[dict]:
    """List all books for a parent."""
    rows = fetch_all(
        """
        SELECT id::text, title, theme, style, child_name,
               jsonb_array_length(pages_json) AS page_count, status, created_at
        FROM picture_books
        WHERE parent_id = %s
        ORDER BY created_at DESC
        """,
        (parent_id,),
    )
    return rows


def delete_book(book_id: str, parent_id: str) -> bool:
    """Delete a book, verifying ownership."""
    from database import execute
    row = fetch_one(
        "SELECT id FROM picture_books WHERE id = %s AND parent_id = %s",
        (book_id, parent_id),
    )
    if not row:
        return False
    execute("DELETE FROM picture_books WHERE id = %s", (book_id,))
    return True
