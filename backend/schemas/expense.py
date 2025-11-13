from datetime import date
from typing import Optional

from pydantic import BaseModel


class ExpenseBase(BaseModel):
    description: str
    category: str
    amount: float
    expense_date: date


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    expense_date: Optional[date] = None
    receipt_url: Optional[str] = None


class ExpenseRead(ExpenseBase):
    id: int
    receipt_url: Optional[str] = None

    class Config:
        orm_mode = True
