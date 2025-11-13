from datetime import date
from io import BytesIO

from fastapi import APIRouter, Depends, Response, HTTPException, status
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db
from ..utils.timezone import now_cat

router = APIRouter(prefix="/api/quotations", tags=["quotations"])


def generate_quote_number(db: Session) -> str:
    """Generate a unique quote number in format QT0012_date_year"""
    # Get or create counter record
    counter_record = db.query(models.QuotationCounter).first()
    if not counter_record:
        counter_record = models.QuotationCounter(counter=0)
        db.add(counter_record)
        db.commit()
    
    # Increment counter
    counter_record.counter += 1
    db.add(counter_record)
    db.commit()
    
    now = now_cat()
    # Format: QT{counter:04d}_{day:02d}{month:02d}_{year}
    return f"QT{counter_record.counter:04d}_{now.strftime('%d%m')}_{now.strftime('%Y')}"


@router.post("/generate-pdf", response_class=Response)
def generate_quotation_pdf(
    quotation: schemas.QuotationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    """
    Generate a quotation PDF based on the provided data.
    """
    # Validate products exist and get their details
    quote_items = []
    subtotal = 0.0
    
    for item in quotation.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {item.product_id} not found"
            )
        
        amount = item.quantity * item.unit_price
        subtotal += amount
        
        quote_items.append({
            "description": product.name,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "amount": amount,
        })
    
    # Calculate tax and total
    tax_amount = subtotal * (quotation.tax_rate / 100)
    total = subtotal + tax_amount
    
    # Get company settings
    settings = db.query(models.ReceiptSettings).first()
    company_name = settings.company_name if settings and settings.company_name else "Your Company Inc."
    company_address = settings.company_address if settings and settings.company_address else "1234 Company St, Company Town, ST 12345"
    
    # Generate quote number
    quote_number = generate_quote_number(db)
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=32,
        textColor=colors.HexColor('#333333'),
        alignment=TA_RIGHT,
        spaceAfter=30,
    )
    
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#333333'),
    )
    
    bold_style = ParagraphStyle(
        'BoldStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#333333'),
        fontName='Helvetica-Bold',
    )
    
    # Company header on left, Upload Logo placeholder on right
    header_data = [
        [
            Paragraph(f"<b>{company_name}</b><br/>{company_address}", header_style),
            Paragraph("", header_style),  # Placeholder for logo
        ]
    ]
    
    header_table = Table(header_data, colWidths=[100*mm, 80*mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10*mm))
    
    # QUOTE title
    elements.append(Paragraph("QUOTE", title_style))
    elements.append(Spacer(1, 10*mm))
    
    # Bill To and Quote details
    bill_to_customer = f"<b>Customer Name</b><br/>{quotation.customer_name or ''}"
    if quotation.customer_address:
        bill_to_customer += f"<br/>{quotation.customer_address}"
    if quotation.customer_city:
        bill_to_customer += f"<br/>{quotation.customer_city}"
    
    info_data = [
        [
            Paragraph("<b>Bill To</b>", bold_style),
            "",
            Paragraph("<b>Quote #</b>", bold_style),
            Paragraph(quote_number, header_style),
        ],
        [
            Paragraph(quotation.customer_name, header_style),
            "",
            Paragraph("<b>Quote date</b>", bold_style),
            Paragraph(quotation.quote_date.strftime('%d-%m-%Y'), header_style),
        ],
        [
            Paragraph(quotation.customer_address or "", header_style),
            "",
            Paragraph("<b>Due date</b>", bold_style),
            Paragraph(quotation.due_date.strftime('%d-%m-%Y'), header_style),
        ],
        [
            Paragraph(quotation.customer_city or "", header_style),
            "",
            "",
            "",
        ],
    ]
    
    info_table = Table(info_data, colWidths=[70*mm, 30*mm, 40*mm, 40*mm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (2, 0), (3, -1), 'RIGHT'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 15*mm))
    
    # Items table
    items_data = [
        [
            Paragraph("<b>QTY</b>", bold_style),
            Paragraph("<b>Description</b>", bold_style),
            Paragraph("<b>Unit Price</b>", bold_style),
            Paragraph("<b>Amount</b>", bold_style),
        ]
    ]
    
    for item in quote_items:
        items_data.append([
            Paragraph(f"{item['quantity']:.2f}", header_style),
            Paragraph(item['description'], header_style),
            Paragraph(f"ZMW {item['unit_price']:.2f}", header_style),
            Paragraph(f"ZMW {item['amount']:.2f}", header_style),
        ])
    
    items_table = Table(items_data, colWidths=[25*mm, 85*mm, 35*mm, 35*mm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.white),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (3, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 10*mm))
    
    # Totals section
    totals_data = [
        ["", "", Paragraph("<b>Subtotal</b>", bold_style), Paragraph(f"ZMW {subtotal:.2f}", header_style)],
        ["", "", Paragraph(f"<b>Sales Tax ({quotation.tax_rate}%)</b>", bold_style), Paragraph(f"ZMW {tax_amount:.2f}", header_style)],
        ["", "", Paragraph("<b>Total (ZMW)</b>", bold_style), Paragraph(f"<b>ZMW {total:.2f}</b>", bold_style)],
    ]
    
    totals_table = Table(totals_data, colWidths=[60*mm, 50*mm, 40*mm, 30*mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (2, 0), (3, -1), 'RIGHT'),
        ('LINEABOVE', (2, 2), (3, 2), 1, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 15*mm))
    
    # Terms and Conditions
    if quotation.terms:
        elements.append(Paragraph("<b>Terms and Conditions</b>", bold_style))
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph(quotation.terms, header_style))
        company_name_str = str(company_name) if company_name else "Your Company"
        elements.append(Paragraph(f"Please make checks payable to: {company_name_str}", header_style))
        elements.append(Spacer(1, 20*mm))
    
    # Signature line
    sig_data = [
        ["", Paragraph("_" * 50, header_style)],
        ["", Paragraph("customer signature", header_style)],
    ]
    sig_table = Table(sig_data, colWidths=[90*mm, 90*mm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
    ]))
    elements.append(sig_table)
    
    # Build PDF
    doc.build(elements)
    
    pdf_content = buffer.getvalue()
    buffer.close()
    
    # Return PDF as response using the quote number format
    filename = f"{quote_number}.pdf"
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )
