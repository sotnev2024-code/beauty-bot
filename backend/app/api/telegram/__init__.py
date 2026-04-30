from fastapi import APIRouter

from app.api.telegram import webhook

router = APIRouter()
router.include_router(webhook.router)
