import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agent.embeddings.embedding_model import get_embedding_model
from app.agent.embeddings.vector_store import get_vector_store
from app.core.config import get_settings
from app.core.logger import configure_logging
from app.features.analytics.router import router as analytics_router
from app.features.chat.router import router as chat_router
from app.features.chat.threads_router import router as threads_router
from app.features.settings.router import router as settings_router

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida da aplicação FastAPI com aquecimento antecipado (eager loading)."""
    configure_logging()
    logger.info("Iniciando CineData Analytics Backend — Executando warm-up de embeddings...")
    try:
        embedding_mgr = get_embedding_model()
        embedding_mgr.warmup()

        vector_store = get_vector_store()
        vector_store.warmup()
        logger.info("Warm-up concluído: Modelo de embeddings e índice vetorial prontos para uso.")
    except Exception as exc:
        logger.error("Falha durante aquecimento de vetores no lifespan: %s", exc)

    try:
        yield
    finally:
        logger.info("Encerrando CineData Analytics Backend (Lifespan Shutdown).")


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="CineData Analytics API — Assistente de Inteligência Cinematográfica",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(settings_router)
app.include_router(chat_router)
app.include_router(threads_router)
app.include_router(analytics_router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.environment,
    }


def main():
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    main()
