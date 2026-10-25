from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated at start-up, like the Node services' loadEnv()."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 4200
    database_url: str
    internal_token: str = Field(min_length=16)
    # Only these domains count as official sources (suffix match).
    allowed_source_domains: list[str] = ["edu.my", "gov.my", "moe.gov.my", "mohe.gov.my"]
    crawler_user_agent: str = "EduLaunchBot/0.1 (university project; contact via site)"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
