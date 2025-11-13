from datetime import datetime
from typing import List

from pydantic import BaseModel


class EmployeeActivity(BaseModel):
    action: str
    description: str
    created_at: datetime


class EmployeeSalesPeriod(BaseModel):
    count: int
    amount: float


class EmployeeSalesSummary(BaseModel):
    total_count: int
    total_amount: float
    week: EmployeeSalesPeriod
    month: EmployeeSalesPeriod
    three_months: EmployeeSalesPeriod


class EmployeeSummary(BaseModel):
    id: int
    full_name: str
    username: str
    role: str
    permissions: List[str]
    sales: EmployeeSalesSummary
    recent_activity: List[EmployeeActivity]
