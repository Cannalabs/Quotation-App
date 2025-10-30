from typing import List
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyUrl, field_validator

class Settings(BaseSettings):
    database_url: AnyUrl | str = "postgresql+asyncpg://postgres:postgres@localhost:5432/grow"
    allowed_origins: List[str] = [
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.76:5173",
        "http://192.168.1.76:5174",
        "http://192.168.1.76:3000"
    ]
    
    # Company defaults
    default_company_name: str = "Grow United Italy"
    default_vat_rate: float = 4.00
    
    # Quotation configuration
    quotation_prefix: str = "QUO"
    quotation_number_format: str = "{prefix}/{year}/{id:04d}"
    
    # Timeout configuration (in milliseconds)
    default_timeout: int = 3000
    upload_timeout: int = 4000
    toast_timeout: int = 5000
    
    # File upload configuration
    max_file_size_mb: int = 5
    
    # Quote configuration
    default_quote_validity_days: int = 30
    
    # Email configuration
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = ""
    mail_from_name: str = "Grow United Italy"
    mail_port: int = 587
    mail_server: str = ""
    mail_tls: bool = True
    mail_ssl: bool = False
    mail_use_credentials: bool = True

    # Load env from backend/.env.conf regardless of working dir
    model_config = SettingsConfigDict(
        env_file=str((Path(__file__).resolve().parent / ".env.conf")),
        env_prefix="",
        case_sensitive=False,
    )

    # Allow comma-separated list in env (e.g., "a,b")
    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

settings = Settings()