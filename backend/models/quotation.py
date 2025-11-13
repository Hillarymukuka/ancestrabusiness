from sqlalchemy import Column, Integer

from ..database import Base


class QuotationCounter(Base):
    __tablename__ = "quotation_counter"

    id = Column(Integer, primary_key=True, index=True)
    counter = Column(Integer, nullable=False, default=0)
