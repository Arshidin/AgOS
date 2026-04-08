"""FastAPI app — Consulting Engine for Zengi Farms."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.calculate import router as calculate_router
from app.api.references import router as references_router

app = FastAPI(
    title="AGOS Consulting Engine",
    description="Расчётное ядро для инвестиционных проектов животноводческих ферм",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calculate_router, prefix="/api/v1")
app.include_router(references_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "consulting-engine"}
