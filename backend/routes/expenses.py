from datetime import date
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from .. import auth, config, models, schemas
from ..database import get_db
from ..utils.activity import log_activity

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

EXPENSE_MANAGER_ROLES = {"owner", "manager"}
ALLOWED_RECEIPT_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


def ensure_expense_role(user: models.User) -> None:
    if user.role not in EXPENSE_MANAGER_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def _build_receipt_url(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"{config.MEDIA_URL}/{path.lstrip('/')}"


async def _save_receipt(receipt: UploadFile) -> str:
    extension = ALLOWED_RECEIPT_TYPES.get(receipt.content_type or "")
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported receipt type. Upload PNG, JPG, WEBP, or PDF files.",
        )
    content = await receipt.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded receipt file is empty.")
    filename = f"{uuid4().hex}{extension}"
    destination = config.MEDIA_EXPENSE_RECEIPTS_DIR / filename
    destination.write_bytes(content)
    return f"expense_receipts/{filename}"


def _to_expense_read(expense: models.Expense) -> schemas.ExpenseRead:
    return schemas.ExpenseRead(
        id=expense.id,
        description=expense.description,
        category=expense.category,
        amount=expense.amount,
        expense_date=expense.expense_date,
        receipt_url=_build_receipt_url(expense.receipt_path),
    )


@router.post("/", response_model=schemas.ExpenseRead, status_code=status.HTTP_201_CREATED)
async def create_expense(
    description: str = Form(...),
    category: str = Form(...),
    amount: float = Form(...),
    expense_date: date = Form(...),
    receipt: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    ensure_expense_role(current_user)
    if amount < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")

    receipt_path: Optional[str] = None
    if receipt:
        receipt_path = await _save_receipt(receipt)

    expense = models.Expense(
        description=description,
        category=category,
        amount=amount,
        expense_date=expense_date,
        receipt_path=receipt_path,
    )
    db.add(expense)
    log_activity(db, current_user.id, "expense_created", f"Recorded expense {category} for ZMW {amount:.2f}")
    db.commit()
    db.refresh(expense)
    return _to_expense_read(expense)


@router.get("/", response_model=list[schemas.ExpenseRead])
def list_expenses(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.get_current_active_user),
):
    query = db.query(models.Expense)
    if start_date:
        query = query.filter(models.Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(models.Expense.expense_date <= end_date)
    if category:
        query = query.filter(models.Expense.category == category)
    expenses = query.order_by(models.Expense.expense_date.desc()).all()
    return [_to_expense_read(expense) for expense in expenses]


@router.put("/{expense_id}", response_model=schemas.ExpenseRead)
def update_expense(
    expense_id: int,
    expense_in: schemas.ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    ensure_expense_role(current_user)
    expense = db.get(models.Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    updates = expense_in.dict(exclude_unset=True)
    updates.pop("receipt_url", None)
    if "amount" in updates and updates["amount"] is not None and updates["amount"] < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")
    for field, value in updates.items():
        setattr(expense, field, value)
    log_activity(db, current_user.id, "expense_updated", f"Updated expense #{expense.id} ({expense.category})")
    db.commit()
    db.refresh(expense)
    return _to_expense_read(expense)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    ensure_expense_role(current_user)
    expense = db.get(models.Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    description = expense.description
    db.delete(expense)
    log_activity(db, current_user.id, "expense_deleted", f"Deleted expense #{expense_id} ({description})")
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
