from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "FEDAI"
    API_V1_STR: str = "/api/v1"

    # PostgreSQL
    POSTGRES_USER: str = "fedai_user"
    POSTGRES_PASSWORD: str = "fedai_password"
    POSTGRES_DB: str = "fedai_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # MinIO
    MINIO_ROOT_USER: str = "admin"
    MINIO_ROOT_PASSWORD: str = "password123"
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_BUCKET_NAME: str = "fedai-documents"
    MINIO_SECURE: bool = False

    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333

    # LLM Settings
    LLM_PROVIDER: Optional[str] = "groq"
    LLM_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
