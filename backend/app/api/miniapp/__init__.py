from fastapi import APIRouter

from app.api.miniapp import me

router = APIRouter()
router.include_router(me.router)
