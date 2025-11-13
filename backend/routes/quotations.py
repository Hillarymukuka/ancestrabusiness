from datetime import date
from io import BytesIO

from fastapi import APIRouter, Depends, Response, HTTPException, status
from fpdf import FPDF
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
    company_name = str(settings.company_name) if settings and settings.company_name else "Your Company Inc."
    company_address = str(settings.company_address) if settings and settings.company_address else "1234 Company St, Company Town, ST 12345"
    
    # Generate quote number
    quote_number = generate_quote_number(db)
    
    # Create PDF with FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)
    
    # Company Header
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, company_name, ln=True)
    pdf.set_font("Arial", "", 10)
    pdf.multi_cell(0, 5, company_address)
    pdf.ln(5)
    
    # QUOTE Title
    pdf.set_font("Arial", "B", 32)
    pdf.cell(0, 15, "QUOTE", align="R", ln=True)
    pdf.ln(5)
    
    # Bill To and Quote Details (Two columns)
    pdf.set_font("Arial", "B", 10)
    y_position = pdf.get_y()
    
    # Left column - Bill To
    pdf.set_xy(10, y_position)
    pdf.cell(90, 6, "Bill To", ln=True)
    pdf.set_font("Arial", "", 10)
    pdf.set_x(10)
    pdf.cell(90, 6, quotation.customer_name, ln=True)
    if quotation.customer_address:
        pdf.set_x(10)
        pdf.cell(90, 6, quotation.customer_address, ln=True)
    if quotation.customer_city:
        pdf.set_x(10)
        pdf.cell(90, 6, quotation.customer_city, ln=True)
    
    # Right column - Quote details
    pdf.set_xy(110, y_position)
    pdf.set_font("Arial", "B", 10)
    pdf.cell(40, 6, "Quote #", align="L")
    pdf.set_font("Arial", "", 10)
    pdf.cell(0, 6, quote_number, align="R", ln=True)
    
    pdf.set_x(110)
    pdf.set_font("Arial", "B", 10)
    pdf.cell(40, 6, "Quote date", align="L")
    pdf.set_font("Arial", "", 10)
    pdf.cell(0, 6, quotation.quote_date.strftime('%d-%m-%Y'), align="R", ln=True)
    
    pdf.set_x(110)
    pdf.set_font("Arial", "B", 10)
    pdf.cell(40, 6, "Due date", align="L")
    pdf.set_font("Arial", "", 10)
    pdf.cell(0, 6, quotation.due_date.strftime('%d-%m-%Y'), align="R", ln=True)
    
    pdf.ln(10)
    
    # Items table header
    pdf.set_font("Arial", "B", 10)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(20, 8, "QTY", border=1, fill=True)
    pdf.cell(95, 8, "Description", border=1, fill=True)
    pdf.cell(35, 8, "Unit Price", border=1, align="R", fill=True)
    pdf.cell(40, 8, "Amount", border=1, align="R", fill=True, ln=True)
    
    # Items table rows
    pdf.set_font("Arial", "", 10)
    for item in quote_items:
        pdf.cell(20, 8, f"{item['quantity']:.2f}", border=1)
        pdf.cell(95, 8, item['description'][:40], border=1)
        pdf.cell(35, 8, f"ZMW {item['unit_price']:.2f}", border=1, align="R")
        pdf.cell(40, 8, f"ZMW {item['amount']:.2f}", border=1, align="R", ln=True)
    
    pdf.ln(5)
    
    # Totals section
    pdf.set_font("Arial", "B", 10)
    pdf.cell(150, 6, "Subtotal", align="R")
    pdf.set_font("Arial", "", 10)
    pdf.cell(40, 6, f"ZMW {subtotal:.2f}", align="R", ln=True)
    
    pdf.set_font("Arial", "B", 10)
    pdf.cell(150, 6, f"Sales Tax ({quotation.tax_rate}%)", align="R")
    pdf.set_font("Arial", "", 10)
    pdf.cell(40, 6, f"ZMW {tax_amount:.2f}", align="R", ln=True)
    
    pdf.set_font("Arial", "B", 11)
    pdf.cell(150, 8, "Total (ZMW)", align="R")
    pdf.cell(40, 8, f"ZMW {total:.2f}", align="R", ln=True)
    
    pdf.ln(10)
    
    # Terms and Conditions
    if quotation.terms:
        pdf.set_font("Arial", "B", 10)
        pdf.cell(0, 6, "Terms and Conditions", ln=True)
        pdf.set_font("Arial", "", 10)
        pdf.multi_cell(0, 5, quotation.terms)
        pdf.ln(2)
        pdf.cell(0, 5, f"Please make checks payable to: {company_name}", ln=True)
        pdf.ln(10)
    
    # Signature line
    pdf.ln(10)
    pdf.set_x(110)
    pdf.cell(80, 6, "_" * 50, align="R", ln=True)
    pdf.set_x(110)
    pdf.set_font("Arial", "", 9)
    pdf.cell(80, 5, "customer signature", align="R", ln=True)
    
    # Get PDF content
    pdf_content = bytes(pdf.output())
    
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
