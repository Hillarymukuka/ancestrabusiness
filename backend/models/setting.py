from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from ..database import Base


class ReceiptSettings(Base):
    __tablename__ = "receipt_settings"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(150), nullable=False, default="Ancestra Business")
    company_address = Column(Text, nullable=True)
    company_logo_url = Column(String(255), nullable=True)
    company_tagline = Column(String(255), nullable=True)
    footer_message = Column(Text, nullable=False, default="Thank you for shopping with us!")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
