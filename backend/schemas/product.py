from typing import Optional

from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    product_code: Optional[str] = None
    category: str
    price: float
    quantity: int
    reorder_level: int


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    product_code: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    reorder_level: Optional[int] = None


class ProductRead(ProductBase):
    id: int

    class Config:
        orm_mode = True