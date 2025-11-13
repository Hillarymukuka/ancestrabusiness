from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from ..utils.timezone import now_cat
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/employees", tags=["employees"])

MANAGEMENT_ROLES = {"owner", "manager"}
PERMISSIONS_MAP = {
    "owner": [
        "Full system access",
        "Manage users and roles",
        "Adjust inventory and pricing",
        "Review sales and reports",
    ],
    "manager": [
        "Manage inventory and pricing",
        "Review sales and reports",
        "Record sales transactions",
    ],
    "cashier": [
        "Record sales transactions",
        "View assigned inventory levels",
    ],
}


def ensure_management(user: models.User) -> None:
    if user.role not in MANAGEMENT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def _sales_stats(db: Session, user_id: int, created_after: Optional[datetime] = None) -> tuple[int, float]:
    query = db.query(
        func.count(models.Sale.id),
        func.coalesce(func.sum(models.Sale.total_amount), 0.0),
    ).filter(models.Sale.created_by_id == user_id)
    if created_after:
        query = query.filter(models.Sale.created_at >= created_after)
    count, amount = query.one()
    return int(count or 0), float(amount or 0.0)


@router.get("/", response_model=list[schemas.EmployeeSummary])
def list_employees(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
) -> list[schemas.EmployeeSummary]:
    ensure_management(current_user)

    now = now_cat()
    week_start = now - timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    three_months_start = now - timedelta(days=90)

    users = db.query(models.User).order_by(models.User.full_name).all()
    summaries: list[schemas.EmployeeSummary] = []

    for user in users:
        total_count, total_amount = _sales_stats(db, user.id)
        week_count, week_amount = _sales_stats(db, user.id, week_start)
        month_count, month_amount = _sales_stats(db, user.id, month_start)

        activities = (
            db.query(models.ActivityLog)
            .filter(models.ActivityLog.user_id == user.id)
            .order_by(models.ActivityLog.created_at.desc())
            .limit(5)
            .all()
        )

        three_count, three_amount = _sales_stats(db, user.id, three_months_start)

        summaries.append(
            schemas.EmployeeSummary(
                id=user.id,
                full_name=user.full_name,
                username=user.username,
                role=user.role,
                permissions=PERMISSIONS_MAP.get(user.role, []),
                sales=schemas.EmployeeSalesSummary(
                    total_count=total_count,
                    total_amount=total_amount,
                    week=schemas.EmployeeSalesPeriod(count=week_count, amount=week_amount),
                    month=schemas.EmployeeSalesPeriod(count=month_count, amount=month_amount),
                    three_months=schemas.EmployeeSalesPeriod(count=three_count, amount=three_amount),
                ),
                recent_activity=[
                    schemas.EmployeeActivity(
                        action=activity.action,
                        description=activity.description,
                        created_at=activity.created_at,
                    )
                    for activity in activities
                ],
            )
        )

    return summaries


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
) -> dict:
    """
    Delete an employee account.
    
    Important: This only deletes the user account. All sales, activity logs,
    and other data created by this employee are preserved for audit purposes.
    """
    ensure_management(current_user)
    
    # Prevent self-deletion
    if employee_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    employee = db.query(models.User).filter(models.User.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Store employee info for response
    employee_name = employee.full_name
    
    # Manually set foreign key references to NULL to preserve data
    # This ensures sales and activity logs are kept even after user deletion
    db.query(models.Sale).filter(models.Sale.created_by_id == employee_id).update(
        {"created_by_id": None}, synchronize_session=False
    )
    db.query(models.ActivityLog).filter(models.ActivityLog.user_id == employee_id).update(
        {"user_id": None}, synchronize_session=False
    )
    
    # Now safe to delete the user account
    db.delete(employee)
    db.commit()
    
    return {
        "message": f"Employee '{employee_name}' deleted successfully. Their sales and activity data has been preserved."
    }
