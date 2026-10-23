from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Nani AI Sales Caller"
    APP_ENV: str = "development"
    SECRET_KEY: str = "nani_ai_sales_caller_secret_key_naresh_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    FRONTEND_URL: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = "sqlite:///./calling_agent.db"

    # Telephony Provider: 'simulated', 'exotel', 'twilio'
    TELEPHONY_PROVIDER: str = "simulated"
    TELEPHONY_API_KEY: Optional[str] = "mock_key"
    TELEPHONY_API_SECRET: Optional[str] = "mock_secret"
    TELEPHONY_ACCOUNT_SID: Optional[str] = "mock_sid"
    TELEPHONY_VIRTUAL_NUMBER: str = "+918000123456"
    TELEPHONY_WEBHOOK_SECRET: str = "dev_webhook_secret_key_123"
    TELEPHONY_PUBLIC_URL: str = "http://localhost:8000"

    # Speech Synthesis & Recognition
    SARVAM_API_KEY: Optional[str] = None
    SARVAM_VOICE_ID: str = "bulbul:v1"
    SARVAM_MODEL: str = "saaras:v1"

    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_VOICE_ID: str = "pNInz6obpgDQGcFmaJgB"
    ELEVENLABS_MODEL: str = "eleven_multilingual_v2"

    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gpt-4o-mini"
    DEFAULT_VOICE_PROVIDER: str = "sarvam"

    # Regulatory & Compliance (TRAI Calling Window: 9:00 AM to 8:00 PM IST)
    TRAI_CALLING_WINDOW_START_HOUR: int = 9
    TRAI_CALLING_WINDOW_END_HOUR: int = 20
    MAX_CONCURRENT_CALLS_DEFAULT: int = 2
    CALL_RETRY_LIMIT: int = 3
    CALL_RETRY_INTERVAL_MINUTES: int = 60

    # Rate limiting & Anti-flooding
    MAX_CALLS_PER_MINUTE: int = 10

settings = Settings()
