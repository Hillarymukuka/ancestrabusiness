from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field


class ReceiptSettingsBase(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=150)
    company_address: Optional[str] = None
    company_logo_url: Optional[str] = None
    company_tagline: Optional[str] = None
    footer_message: str = Field(..., min_length=1, max_length=500)
    qr_code_type: Literal["text", "url"] = "text"
    qr_code_content: Optional[str] = None


class ReceiptSettingsUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=150)
    company_address: Optional[str] = None
    company_tagline: Optional[str] = None
    footer_message: Optional[str] = Field(None, min_length=1, max_length=500)
    qr_code_type: Optional[Literal["text", "url"]] = None
    qr_code_content: Optional[str] = None


class ReceiptSettingsRead(ReceiptSettingsBase):
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
