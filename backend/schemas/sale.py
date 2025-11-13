from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel


class SaleItemBase(BaseModel):
    product_id: int
    quantity: int


class SaleItemCreate(SaleItemBase):
    price_override: Optional[float] = None


class SaleItemRead(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float


PaymentMethod = Literal["cash", "bank_transfer", "airtel_money", "mtn_money"]


class SaleBase(BaseModel):
    customer_name: Optional[str] = None
    payment_method: PaymentMethod = "cash"


class SaleCreate(SaleBase):
    items: List[SaleItemCreate]


class SaleRead(SaleBase):
    id: int
    created_at: datetime
    total_amount: float
    receipt_number: str
    items: List[SaleItemRead]

    class Config:
        orm_mode = True


class SaleReceipt(BaseModel):
    sale: SaleRead
    receipt_number: str
    issued_at: datetime
    html: str
    qr_code: str
    company_name: str
    company_logo_url: Optional[str] = None
    company_tagline: Optional[str] = None
    footer_message: str
