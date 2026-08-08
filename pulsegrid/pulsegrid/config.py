from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PULSEGRID_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://pulsegrid:pulsegrid@localhost:5432/pulsegrid"
    redis_url: str = "redis://localhost:6379/0"
    kafka_bootstrap: str = "localhost:9092"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    queue_maxsize: int = 1000
    worker_count: int = 4
    dedup_window_seconds: float = 300.0
    cache_ttl_seconds: int = 30
    load_shed_p4_threshold: int = 800
    circuit_breaker_failure_threshold: int = 5
    openai_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    rate_limit_per_minute: int = 120
    grpc_notification_port: int = 50051
    use_kafka: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
