from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.miniapp import router as miniapp_router
from app.core.config import settings

app = FastAPI(
    title="Beauty.dev API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.ENVIRONMENT}


app.include_router(miniapp_router, prefix="/api")
