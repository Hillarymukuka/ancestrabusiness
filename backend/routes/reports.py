from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Response, status
import io
from fpdf import FPDF
from ..utils.timezone import now_cat, format_cat_time
from .. import config as app_config
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db
from typing import Optional

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/summary", response_model=schemas.ReportSummary)
def get_summary(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.get_current_active_user),
):
    total_sales = db.query(func.coalesce(func.sum(models.Sale.total_amount), 0.0)).scalar() or 0.0
    total_expenses = db.query(func.coalesce(func.sum(models.Expense.amount), 0.0)).scalar() or 0.0
    total_profit = total_sales - total_expenses
    total_orders = db.query(func.coalesce(func.count(models.Sale.id), 0)).scalar() or 0

    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    sales_today = (
        db.query(func.coalesce(func.sum(models.Sale.total_amount), 0.0))
        .filter(models.Sale.created_at >= today_start)
        .scalar()
        or 0.0
    )

    low_stock_products = (
        db.query(models.Product)
        .filter(models.Product.quantity <= models.Product.reorder_level)
        .order_by(models.Product.quantity.asc())
        .all()
    )
    low_stock = [f"{p.name} ({p.quantity})" for p in low_stock_products]

    sales_vs_expenses = []
    for days_ago in range(6, -1, -1):
        target_day = today - timedelta(days=days_ago)
        day_start = datetime.combine(target_day, datetime.min.time())
        day_end = day_start + timedelta(days=1)

        sales_total = (
            db.query(func.coalesce(func.sum(models.Sale.total_amount), 0.0))
            .filter(models.Sale.created_at >= day_start)
            .filter(models.Sale.created_at < day_end)
            .scalar()
            or 0.0
        )
        expense_total = (
            db.query(func.coalesce(func.sum(models.Expense.amount), 0.0))
            .filter(models.Expense.expense_date == target_day)
            .scalar()
            or 0.0
        )
        sales_vs_expenses.append(
            schemas.ProfitPoint(
                period=target_day,
                sales=sales_total,
                expenses=expense_total,
                profit=sales_total - expense_total,
            )
        )

    def period_summary(label: str, days: int) -> schemas.PeriodSummary:
        start_date = today - timedelta(days=days - 1)
        start_datetime = datetime.combine(start_date, datetime.min.time())
        sales_total = (
            db.query(func.coalesce(func.sum(models.Sale.total_amount), 0.0))
            .filter(models.Sale.created_at >= start_datetime)
            .scalar()
            or 0.0
        )
        expense_total = (
            db.query(func.coalesce(func.sum(models.Expense.amount), 0.0))
            .filter(models.Expense.expense_date >= start_date)
            .scalar()
            or 0.0
        )
        return schemas.PeriodSummary(
            label=label,
            sales=sales_total,
            expenses=expense_total,
            profit=sales_total - expense_total,
        )

    period_summaries = [
        period_summary("Daily", 1),
        period_summary("Weekly", 7),
        period_summary("Monthly", 30),
    ]

    best_seller_rows = (
        db.query(
            models.Product.id.label("product_id"),
            models.Product.name.label("product_name"),
            models.Product.price.label("unit_price"),
            models.Product.quantity.label("quantity_on_hand"),
            func.coalesce(func.sum(models.SaleItem.quantity), 0).label("total_quantity"),
            func.coalesce(func.sum(models.SaleItem.subtotal), 0.0).label("total_revenue"),
        )
        .join(models.SaleItem, models.SaleItem.product_id == models.Product.id)
        .join(models.Sale, models.Sale.id == models.SaleItem.sale_id)
        .group_by(models.Product.id)
        .order_by(func.sum(models.SaleItem.quantity).desc())
        .limit(5)
        .all()
    )
    best_sellers = [
        schemas.BestSeller(
            product_id=row.product_id,
            product_name=row.product_name,
            unit_price=row.unit_price,
            total_quantity=int(row.total_quantity or 0),
            total_revenue=float(row.total_revenue or 0.0),
            status="In stock" if row.quantity_on_hand > 0 else "Out of stock",
        )
        for row in best_seller_rows
    ]

    # Sales by user (including deleted users)
    user_sales_rows = (
        db.query(
            models.Sale.created_by_id,
            models.User.full_name,
            func.coalesce(func.sum(models.Sale.total_amount), 0.0).label("total_sales"),
            func.count(models.Sale.id).label("total_transactions"),
        )
        .outerjoin(models.User, models.User.id == models.Sale.created_by_id)
        .group_by(models.Sale.created_by_id, models.User.full_name)
        .order_by(func.sum(models.Sale.total_amount).desc())
        .all()
    )
    
    sales_by_user = [
        schemas.UserSales(
            user_id=row.created_by_id,
            user_name=row.full_name if row.full_name else "Deleted User",
            total_sales=float(row.total_sales or 0.0),
            total_transactions=int(row.total_transactions or 0),
            is_deleted=row.full_name is None,
        )
        for row in user_sales_rows
    ]

    return schemas.ReportSummary(
        total_sales=total_sales,
        total_expenses=total_expenses,
        total_profit=total_profit,
        total_orders=total_orders,
        sales_today=sales_today,
        low_stock=low_stock,
        sales_vs_expenses=sales_vs_expenses,
        period_summaries=period_summaries,
        best_sellers=best_sellers,
        sales_by_user=sales_by_user,
    )



@router.get("/export", response_class=Response)
def export_report(
        db: Session = Depends(get_db),
        current_user: models.User = Depends(auth.get_current_active_user),
):
        """Generate a PDF report using fpdf2."""
        summary = get_summary(db=db, _=current_user)
        issued = now_cat().strftime("%d %b %Y %H:%M CAT")

        # Create PDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=20)
        
        # Title
        pdf.set_font("Arial", "B", 24)
        pdf.set_text_color(59, 2, 112)  # Purple
        pdf.cell(0, 15, "ANCESTRA BUSINESS REPORT", align="C", ln=True)
        
        # Subtitle
        pdf.set_font("Arial", "", 10)
        pdf.set_text_color(102, 102, 102)  # Gray
        pdf.cell(0, 6, f"Financial Overview & Performance Analysis", align="C", ln=True)
        pdf.cell(0, 6, issued, align="C", ln=True)
        pdf.ln(10)
        
        # Summary cards
        pdf.set_font("Arial", "B", 12)
        pdf.set_text_color(59, 2, 112)
        y_pos = pdf.get_y()
        
        # Total Sales
        pdf.set_xy(20, y_pos)
        pdf.cell(55, 8, "Total Sales", border=1, align="C")
        pdf.set_xy(20, y_pos + 8)
        pdf.set_font("Arial", "B", 14)
        pdf.cell(55, 10, f"ZMW {summary.total_sales:,.2f}", border=1, align="C")
        
        # Total Expenses
        pdf.set_xy(75, y_pos)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(60, 8, "Total Expenses", border=1, align="C")
        pdf.set_xy(75, y_pos + 8)
        pdf.set_font("Arial", "B", 14)
        pdf.cell(60, 10, f"ZMW {summary.total_expenses:,.2f}", border=1, align="C")
        
        # Net Profit
        pdf.set_xy(135, y_pos)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(55, 8, "Net Profit", border=1, align="C")
        pdf.set_xy(135, y_pos + 8)
        pdf.set_font("Arial", "B", 14)
        pdf.cell(55, 10, f"ZMW {summary.total_profit:,.2f}", border=1, align="C")
        
        pdf.set_y(y_pos + 25)
        
        # Period Summaries
        pdf.set_font("Arial", "B", 12)
        pdf.set_text_color(59, 2, 112)
        pdf.cell(0, 8, "Period Summaries", ln=True)
        
        pdf.set_font("Arial", "B", 10)
        pdf.set_fill_color(111, 0, 255)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(50, 8, "Period", border=1, fill=True)
        pdf.cell(45, 8, "Sales", border=1, fill=True, align="C")
        pdf.cell(45, 8, "Expenses", border=1, fill=True, align="C")
        pdf.cell(50, 8, "Profit", border=1, fill=True, align="C", ln=True)
        
        pdf.set_font("Arial", "", 10)
        pdf.set_text_color(0, 0, 0)
        for p in summary.period_summaries:
            pdf.cell(50, 8, p.label, border=1)
            pdf.cell(45, 8, f"ZMW {p.sales:,.2f}", border=1, align="C")
            pdf.cell(45, 8, f"ZMW {p.expenses:,.2f}", border=1, align="C")
            pdf.cell(50, 8, f"ZMW {p.profit:,.2f}", border=1, align="C", ln=True)
        
        pdf.ln(8)
        
        # Sales vs Expenses (Last 7 Days)
        pdf.set_font("Arial", "B", 12)
        pdf.set_text_color(59, 2, 112)
        pdf.cell(0, 8, "Sales vs Expenses (Last 7 Days)", ln=True)
        
        pdf.set_font("Arial", "B", 10)
        pdf.set_fill_color(111, 0, 255)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(50, 8, "Date", border=1, fill=True)
        pdf.cell(45, 8, "Sales", border=1, fill=True, align="C")
        pdf.cell(45, 8, "Expenses", border=1, fill=True, align="C")
        pdf.cell(50, 8, "Profit", border=1, fill=True, align="C", ln=True)
        
        pdf.set_font("Arial", "", 10)
        pdf.set_text_color(0, 0, 0)
        for pt in summary.sales_vs_expenses:
            pdf.cell(50, 8, pt.period.strftime('%d %b %Y'), border=1)
            pdf.cell(45, 8, f"ZMW {pt.sales:,.2f}", border=1, align="C")
            pdf.cell(45, 8, f"ZMW {pt.expenses:,.2f}", border=1, align="C")
            pdf.cell(50, 8, f"ZMW {pt.profit:,.2f}", border=1, align="C", ln=True)
        
        pdf.ln(8)
        
        # Best Sellers
        pdf.set_font("Arial", "B", 12)
        pdf.set_text_color(59, 2, 112)
        pdf.cell(0, 8, "Best Selling Products", ln=True)
        
        pdf.set_font("Arial", "B", 10)
        pdf.set_fill_color(111, 0, 255)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(60, 8, "Product", border=1, fill=True)
        pdf.cell(30, 8, "Price", border=1, fill=True, align="C")
        pdf.cell(25, 8, "Qty", border=1, fill=True, align="C")
        pdf.cell(40, 8, "Revenue", border=1, fill=True, align="C")
        pdf.cell(35, 8, "Status", border=1, fill=True, align="C", ln=True)
        
        pdf.set_font("Arial", "", 10)
        pdf.set_text_color(0, 0, 0)
        for b in summary.best_sellers:
            pdf.cell(60, 8, b.product_name[:25], border=1)
            pdf.cell(30, 8, f"ZMW {b.unit_price:,.2f}", border=1, align="C")
            pdf.cell(25, 8, str(b.total_quantity), border=1, align="C")
            pdf.cell(40, 8, f"ZMW {b.total_revenue:,.2f}", border=1, align="C")
            pdf.cell(35, 8, b.status, border=1, align="C", ln=True)
        
        pdf.ln(8)
        
        # Low Stock
        pdf.set_font("Arial", "B", 12)
        pdf.set_text_color(59, 2, 112)
        pdf.cell(0, 8, "Low Stock Items", ln=True)
        
        pdf.set_font("Arial", "", 10)
        if summary.low_stock:
            pdf.set_text_color(255, 78, 0)  # Orange
            pdf.multi_cell(0, 6, ', '.join(summary.low_stock))
        else:
            pdf.set_text_color(5, 150, 105)  # Green
            pdf.cell(0, 6, "All products are adequately stocked", ln=True)
        
        pdf.ln(6)
        
        # Additional Stats
        pdf.set_font("Arial", "", 10)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 6, f"Total Orders: {summary.total_orders}", ln=True)
        pdf.cell(0, 6, f"Sales Today: ZMW {summary.sales_today:,.2f}", ln=True)
        
        # Get PDF content
        pdf_content = bytes(pdf.output())

        filename = f"ancestra_report_{now_cat().strftime('%Y%m%d')}.pdf"
        return Response(
                content=pdf_content, 
                media_type="application/pdf", 
                headers={
                        "Content-Disposition": f"attachment; filename={filename}",
                        "Access-Control-Expose-Headers": "Content-Disposition",
                }, 
                status_code=status.HTTP_200_OK
        )
