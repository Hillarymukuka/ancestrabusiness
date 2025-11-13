from datetime import date
from typing import List

from pydantic import BaseModel


class QuotationItemCreate(BaseModel):
    product_id: int
    quantity: float
    unit_price: float


class QuotationCreate(BaseModel):
    customer_name: str
    customer_address: str | None = None
    customer_city: str | None = None
    quote_date: date
    due_date: date
    items: List[QuotationItemCreate]
    terms: str | None = "Payment is due in 14 days"
    tax_rate: float = 5.0  # 5% default


class QuotationItemRead(BaseModel):
    description: str
    quantity: float
    unit_price: float
    amount: float


class QuotationRead(BaseModel):
    quote_number: str
    customer_name: str
    customer_address: str | None
    customer_city: str | None
    quote_date: date
    due_date: date
    items: List[QuotationItemRead]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    terms: str
