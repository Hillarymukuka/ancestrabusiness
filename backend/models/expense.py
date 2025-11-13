from sqlalchemy import Column, Date, Float, Integer, String

from ..database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    expense_date = Column(Date, nullable=False)
    receipt_path = Column(String(255), nullable=True)
