from datetime import date
from typing import List

from pydantic import BaseModel


class ProfitPoint(BaseModel):
    period: date
    sales: float
    expenses: float
    profit: float


class PeriodSummary(BaseModel):
    label: str
    sales: float
    expenses: float
    profit: float


class BestSeller(BaseModel):
    product_id: int
    product_name: str
    unit_price: float
    total_quantity: int
    total_revenue: float
    status: str


class UserSales(BaseModel):
    user_id: int | None
    user_name: str
    total_sales: float
    total_transactions: int
    is_deleted: bool


class ReportSummary(BaseModel):
    total_sales: float
    total_expenses: float
    total_profit: float
    total_orders: int
    sales_today: float
    low_stock: List[str]
    sales_vs_expenses: List[ProfitPoint]
    period_summaries: List[PeriodSummary]
    best_sellers: List[BestSeller]
    sales_by_user: List[UserSales]
