from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PULSEGRID_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://pulsegrid:pulsegrid@localhost:5432/pulsegrid"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    queue_maxsize: int = 1000
    worker_count: int = 4
    dedup_window_seconds: float = 300.0
    cache_ttl_seconds: int = 30


settings = Settings()
