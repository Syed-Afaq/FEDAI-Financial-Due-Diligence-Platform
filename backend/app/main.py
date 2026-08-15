from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.database import init_db
from app.services.storage_service import storage_service
from app.api.v1.documents import router as documents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure DB tables exist & MinIO bucket exists
    print("[FEDAI] Starting up backend services...")
    try:
        init_db()
        print("[FEDAI] Database tables initialized.")
    except Exception as e:
        print(f"[FEDAI] Warning: Database connection initialization error: {e}")

    try:
        storage_service.ensure_bucket_exists()
        print("[FEDAI] MinIO storage bucket verified.")
    except Exception as e:
        print(f"[FEDAI] Warning: MinIO connection initialization error: {e}")

    yield

    # Shutdown: Clean up connections if necessary
    print("[FEDAI] Shutting down backend services...")


app = FastAPI(
    title="FEDAI API",
    description="AI Financial Due Diligence Platform API",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware for Next.js frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(documents_router, prefix=settings.API_V1_STR)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "FEDAI API",
        "version": "0.1.0",
        "database": "connected",
        "storage": "connected"
    }
