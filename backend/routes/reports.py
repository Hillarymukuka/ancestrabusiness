from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Response, status
import io
from reportlab.lib.pagesizes import A4
from ..utils.timezone import now_cat, format_cat_time
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
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
        """Generate a PDF report (professional accounting style) using ReportLab and return it as an attachment."""
        summary = get_summary(db=db, _=current_user)

        # Ancestra brand colors - simple & elegant palette
        ANCESTRA_PRIMARY = colors.HexColor('#3b0270')      # Deep Purple
        ANCESTRA_ACCENT = colors.HexColor('#6f00ff')       # Vibrant Purple
        ANCESTRA_HIGHLIGHT = colors.HexColor('#ff4e00')    # Orange
        ANCESTRA_LIGHT = colors.HexColor('#fff1f1')        # Light Pink/Cream
        ANCESTRA_TEXT = colors.HexColor('#2d2d2d')         # Dark Gray
        ANCESTRA_GRAY = colors.HexColor('#666666')         # Medium Gray

        issued = now_cat().strftime("%d %b %Y %H:%M CAT")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=30*mm, bottomMargin=25*mm)
        styles = getSampleStyleSheet()
        normal = styles['Normal']
        
        # Modern professional styles
        title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                alignment=1,  # Center
                fontSize=24,
                textColor=ANCESTRA_PRIMARY,
                fontName='Helvetica-Bold',
                spaceAfter=6,
                spaceBefore=12
        )
        
        subtitle_style = ParagraphStyle(
                'Subtitle',
                parent=styles['Normal'],
                fontSize=10,
                textColor=ANCESTRA_GRAY,
                alignment=1,  # Center
                spaceAfter=20
        )
        
        section_heading_style = ParagraphStyle(
                'SectionHeading',
                parent=styles['Heading2'],
                fontSize=12,
                textColor=ANCESTRA_PRIMARY,
                fontName='Helvetica-Bold',
                spaceBefore=16,
                spaceAfter=8,
                borderPadding=4,
                leftIndent=0
        )

        heading = Paragraph("ANCESTRA BUSINESS REPORT", title_style)
        subtitle = Paragraph(f"Financial Overview & Performance Analysis<br/>{issued}", subtitle_style)

        flowables = [heading, subtitle, Spacer(1, 8)]

        # Simple elegant summary cards
        summary_data = [
                [Paragraph('<para align="center"><b>Total Sales</b></para>', normal), 
                 Paragraph('<para align="center"><b>Total Expenses</b></para>', normal), 
                 Paragraph('<para align="center"><b>Net Profit</b></para>', normal)],
                [Paragraph(f'<para align="center" fontSize="16" textColor="#3b0270"><b>ZMW {summary.total_sales:,.2f}</b></para>', normal), 
                 Paragraph(f'<para align="center" fontSize="16" textColor="#3b0270"><b>ZMW {summary.total_expenses:,.2f}</b></para>', normal), 
                 Paragraph(f'<para align="center" fontSize="16" textColor="#3b0270"><b>ZMW {summary.total_profit:,.2f}</b></para>', normal)],
        ]
        tbl = Table(summary_data, colWidths=[(A4[0]-40*mm)/3]*3)
        tbl.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), ANCESTRA_LIGHT),
                ('TEXTCOLOR', (0,0), (-1,0), ANCESTRA_PRIMARY),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,0), 10),
                ('TOPPADDING', (0,0), (-1,0), 10),
                ('BOTTOMPADDING', (0,0), (-1,0), 10),
                ('BACKGROUND', (0,1), (-1,1), colors.white),
                ('TOPPADDING', (0,1), (-1,1), 14),
                ('BOTTOMPADDING', (0,1), (-1,1), 14),
                ('BOX', (0,0), (-1,-1), 1.5, ANCESTRA_ACCENT),
                ('LINEBELOW', (0,0), (-1,0), 1, ANCESTRA_ACCENT),
        ]))
        flowables.append(tbl)
        flowables.append(Spacer(1, 20))

        # Period summaries with modern styling
        flowables.append(Paragraph('Period Summaries', section_heading_style))
        ps_data = [[ 'Period', 'Sales', 'Expenses', 'Profit' ]]
        for p in summary.period_summaries:
                ps_data.append([p.label, f"ZMW {p.sales:,.2f}", f"ZMW {p.expenses:,.2f}", f"ZMW {p.profit:,.2f}"])
        ps_tbl = Table(ps_data, colWidths=[50*mm, 50*mm, 50*mm, 50*mm])
        ps_tbl.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), ANCESTRA_ACCENT),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,0), 10),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING', (0,0), (-1,0), 8),
                ('BOTTOMPADDING', (0,0), (-1,0), 8),
                ('BACKGROUND', (0,1), (0,-1), ANCESTRA_LIGHT),
                ('GRID', (0,0), (-1,-1), 0.5, ANCESTRA_GRAY),
                ('ROWBACKGROUNDS', (1,1), (-1,-1), [colors.white, ANCESTRA_LIGHT]),
                ('TOPPADDING', (0,1), (-1,-1), 6),
                ('BOTTOMPADDING', (0,1), (-1,-1), 6),
        ]))
        flowables.append(ps_tbl)
        flowables.append(Spacer(1, 16))

        # Sales vs expenses table (last 7 days) with modern styling
        flowables.append(Paragraph('Sales vs Expenses (Last 7 Days)', section_heading_style))
        sev_data = [[ 'Date', 'Sales', 'Expenses', 'Profit' ]]
        for pt in summary.sales_vs_expenses:
                profit_color = '#059669' if pt.profit >= 0 else '#dc2626'
                sev_data.append([
                        pt.period.strftime('%d %b %Y'), 
                        f"ZMW {pt.sales:,.2f}", 
                        f"ZMW {pt.expenses:,.2f}", 
                        f"ZMW {pt.profit:,.2f}"
                ])
        sev_tbl = Table(sev_data, colWidths=[50*mm, 50*mm, 50*mm, 50*mm])
        sev_tbl.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), ANCESTRA_ACCENT),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,0), 10),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING', (0,0), (-1,0), 8),
                ('BOTTOMPADDING', (0,0), (-1,0), 8),
                ('BACKGROUND', (0,1), (0,-1), ANCESTRA_LIGHT),
                ('GRID', (0,0), (-1,-1), 0.5, ANCESTRA_GRAY),
                ('ROWBACKGROUNDS', (1,1), (-1,-1), [colors.white, ANCESTRA_LIGHT]),
                ('TOPPADDING', (0,1), (-1,-1), 6),
                ('BOTTOMPADDING', (0,1), (-1,-1), 6),
        ]))
        flowables.append(sev_tbl)
        flowables.append(Spacer(1, 16))

        # Best sellers with modern styling
        flowables.append(Paragraph('Best Selling Products', section_heading_style))
        bs_data = [[ 'Product', 'Unit Price', 'Qty Sold', 'Revenue', 'Status' ]]
        for b in summary.best_sellers:
                status_color = '#059669' if b.status == 'In stock' else '#dc2626'
                bs_data.append([
                        b.product_name, 
                        f"ZMW {b.unit_price:,.2f}", 
                        str(b.total_quantity), 
                        f"ZMW {b.total_revenue:,.2f}", 
                        b.status
                ])
        bs_tbl = Table(bs_data, colWidths=[60*mm, 35*mm, 30*mm, 40*mm, 35*mm])
        bs_tbl.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), ANCESTRA_ACCENT),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,0), 10),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('ALIGN', (0,1), (0,-1), 'LEFT'),  # Product names left-aligned
                ('TOPPADDING', (0,0), (-1,0), 8),
                ('BOTTOMPADDING', (0,0), (-1,0), 8),
                ('GRID', (0,0), (-1,-1), 0.5, ANCESTRA_GRAY),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, ANCESTRA_LIGHT]),
                ('TOPPADDING', (0,1), (-1,-1), 6),
                ('BOTTOMPADDING', (0,1), (-1,-1), 6),
        ]))
        flowables.append(bs_tbl)
        flowables.append(Spacer(1, 16))

        # Low stock with modern styling
        flowables.append(Paragraph('Low Stock Items', section_heading_style))
        if summary.low_stock:
                low_stock_style = ParagraphStyle(
                        'LowStock',
                        parent=normal,
                        fontSize=10,
                        textColor=ANCESTRA_HIGHLIGHT,
                        leftIndent=10
                )
                low_stock_text = ', '.join(summary.low_stock)
                flowables.append(Paragraph(low_stock_text, low_stock_style))
        else:
                no_low_stock_style = ParagraphStyle(
                        'NoLowStock',
                        parent=normal,
                        fontSize=10,
                        textColor=colors.HexColor('#059669'),
                        leftIndent=10
                )
                flowables.append(Paragraph('✓ All products are adequately stocked', no_low_stock_style))
        flowables.append(Spacer(1, 16))

        # Summary stats with modern styling
        stats_style = ParagraphStyle(
                'Stats',
                parent=normal,
                fontSize=10,
                textColor=ANCESTRA_TEXT,
                leftIndent=10,
                spaceAfter=4
        )
        flowables.append(Paragraph(f"<b>Total Orders:</b> {summary.total_orders}", stats_style))
        flowables.append(Paragraph(f"<b>Sales Today:</b> ZMW {summary.sales_today:,.2f}", stats_style))

        # Simple elegant header/footer
        def _draw_page(canvas, doc_obj):
            canvas.saveState()
            width, height = A4
            
            # Top accent stripe - simple elegant design
            canvas.setFillColor(ANCESTRA_ACCENT)
            canvas.rect(0, height - 4, width, 4, stroke=0, fill=1)

            # Header text - company name centered
            canvas.setFillColor(ANCESTRA_PRIMARY)
            canvas.setFont('Helvetica-Bold', 10)
            canvas.drawCentredString(width / 2, height - 18, "ANCESTRA BUSINESS")
            
            # Bottom accent stripe
            canvas.setFillColor(ANCESTRA_ACCENT)
            canvas.rect(0, 0, width, 4, stroke=0, fill=1)

            # Footer text
            canvas.setFillColor(ANCESTRA_GRAY)
            canvas.setFont('Helvetica', 8)
            try:
                settings = db.query(models.ReceiptSettings).first()
                footer_msg = str(settings.footer_message) if settings and getattr(settings, 'footer_message', None) else 'Powered by Ancestra Business Management System'
            except Exception:
                footer_msg = 'Powered by Ancestra Business Management System'
            
            canvas.drawString(20*mm, 8*mm, footer_msg)
            
            # Page number - elegant style
            canvas.setFillColor(ANCESTRA_PRIMARY)
            canvas.setFont('Helvetica', 8)
            page_num_text = f"Page {doc_obj.page}"
            canvas.drawRightString(width - 20*mm, 8*mm, page_num_text)

            canvas.restoreState()

        doc.build(flowables, onFirstPage=_draw_page, onLaterPages=_draw_page)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        filename = f"ancestra_report_{now_cat().strftime('%Y%m%d')}.pdf"
        return Response(
                content=pdf_bytes, 
                media_type="application/pdf", 
                headers={
                        "Content-Disposition": f"attachment; filename={filename}",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, OPTIONS",
                        "Access-Control-Allow-Headers": "*",
                }, 
                status_code=status.HTTP_200_OK
        )
