"""Stripe billing router — checkout, webhook, and customer portal."""

import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from config import get_settings
from database import get_supabase
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


# ─── Request/Response Models ────────────────────────────────


class CheckoutRequest(BaseModel):
    plan: str = "monthly"  # "monthly" or "annual"
    success_url: str = "http://localhost:3000/dashboard?upgraded=true"
    cancel_url: str = "http://localhost:3000/upgrade"


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


# ─── Endpoints ──────────────────────────────────────────────


@router.post("/create-checkout-session", response_model=CheckoutResponse)
async def create_checkout_session(
    body: CheckoutRequest,
    user: dict = Depends(get_current_user),
):
    """Create a Stripe Checkout session for Pro subscription."""
    settings = get_settings()
    stripe.api_key = settings.stripe_secret_key

    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Billing not configured")

    price_id = (
        settings.stripe_price_monthly
        if body.plan == "monthly"
        else settings.stripe_price_annual
    )

    if not price_id:
        raise HTTPException(status_code=503, detail="Price not configured")

    db = get_supabase()

    # Get or create Stripe customer
    prefs = (
        db.table("user_preferences")
        .select("stripe_customer_id")
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )

    customer_id = (prefs.data or {}).get("stripe_customer_id")

    if not customer_id:
        customer = stripe.Customer.create(
            email=user.get("email", ""),
            metadata={"kynari_user_id": user["user_id"]},
        )
        customer_id = customer.id

        # Upsert preferences with customer ID
        db.table("user_preferences").upsert(
            {
                "user_id": user["user_id"],
                "stripe_customer_id": customer_id,
            },
            on_conflict="user_id",
        ).execute()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=body.success_url,
        cancel_url=body.cancel_url,
        metadata={"kynari_user_id": user["user_id"]},
    )

    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events (no auth — verified by signature)."""
    settings = get_settings()
    stripe.api_key = settings.stripe_secret_key

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook error")

    db = get_supabase()

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("kynari_user_id")
        subscription_id = session.get("subscription")

        if user_id:
            db.table("user_preferences").upsert(
                {
                    "user_id": user_id,
                    "tier": "pro",
                    "stripe_subscription_id": subscription_id,
                    "stripe_customer_id": session.get("customer"),
                },
                on_conflict="user_id",
            ).execute()
            logger.info(f"User {user_id} upgraded to Pro")

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        sub_id = subscription.get("id")

        # Find user by subscription ID and downgrade
        result = (
            db.table("user_preferences")
            .select("user_id")
            .eq("stripe_subscription_id", sub_id)
            .single()
            .execute()
        )

        if result.data:
            user_id = result.data["user_id"]
            db.table("user_preferences").update(
                {"tier": "free", "stripe_subscription_id": None}
            ).eq("user_id", user_id).execute()
            logger.info(f"User {user_id} downgraded to Free")

    return {"received": True}


@router.get("/portal", response_model=PortalResponse)
async def get_billing_portal(user: dict = Depends(get_current_user)):
    """Create a Stripe Customer Portal session for plan management."""
    settings = get_settings()
    stripe.api_key = settings.stripe_secret_key

    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Billing not configured")

    db = get_supabase()

    prefs = (
        db.table("user_preferences")
        .select("stripe_customer_id")
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )

    customer_id = (prefs.data or {}).get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(
            status_code=404, detail="No billing account found. Please subscribe first."
        )

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url="http://localhost:3000/dashboard",
    )

    return {"portal_url": session.url}
