"""Application settings, read from ``TURNAROUND_*`` environment variables and an optional ``.env`` file."""

from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.contracts import DataSource

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATA_DIR = BACKEND_DIR / "data"


class Settings(BaseSettings):
    """Runtime configuration for the backend."""

    model_config = SettingsConfigDict(env_prefix="TURNAROUND_", env_file=BACKEND_DIR / ".env", extra="ignore")

    environment: Literal["development", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    planner: DataSource = DataSource.MODEL
    open_meteo_url: str = "https://api.open-meteo.com/v1/forecast"
    timezone: str = "America/Vancouver"
    data_dir: Path = DEFAULT_DATA_DIR
    openai_api_key: SecretStr | None = None
    openai_model: str = "gpt-6.2-sol"
    copilot_max_tool_rounds: int = 5

    @field_validator("openai_api_key", mode="before")
    @classmethod
    def _empty_key_is_unset(cls, value: Any) -> Any:
        """Treat an empty ``TURNAROUND_OPENAI_API_KEY=`` line as not configured."""
        return None if value == "" else value


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings, loaded once."""
    return Settings()
