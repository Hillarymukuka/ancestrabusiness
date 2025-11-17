import base64
import mimetypes
from datetime import datetime
from io import BytesIO
from typing import Optional
from uuid import uuid4

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query, status
from ..utils.timezone import now_cat, format_cat_time
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import auth, config, models, schemas
from ..database import get_db
from ..utils.activity import log_activity

router = APIRouter(prefix="/api/sales", tags=["sales"])


SALE_CREATION_ROLES = {"owner", "manager", "cashier"}
PAYMENT_METHOD_LABELS = {
    "cash": "Cash",
    "bank_transfer": "Bank Transfer",
    "airtel_money": "Airtel Money",
    "mtn_money": "MTN Money",
}


def get_receipt_settings(db: Session) -> models.ReceiptSettings:
    settings = db.query(models.ReceiptSettings).first()
    if settings:
        return settings
    settings = models.ReceiptSettings()
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def resolve_logo_src(settings: models.ReceiptSettings) -> Optional[str]:
    logo_url = (settings.company_logo_url or "").strip()
    if not logo_url:
        return None
    if logo_url.startswith("data:"):
        return logo_url
    if logo_url.startswith("//"):
        return f"https:{logo_url}"
    if logo_url.startswith(("http://", "https://")):
        return logo_url
    if logo_url.startswith(config.MEDIA_URL):
        relative_path = logo_url[len(config.MEDIA_URL) :].lstrip("/\\")
        logo_path = config.MEDIA_ROOT / relative_path
        if logo_path.exists():
            mime_type = mimetypes.guess_type(logo_path.name)[0] or "image/png"
            encoded = base64.b64encode(logo_path.read_bytes()).decode("utf-8")
            return f"data:{mime_type};base64,{encoded}"
    return None


def ensure_sale_role(user: models.User) -> None:
    if user.role not in SALE_CREATION_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def generate_receipt_number() -> str:
    return f"AB-{now_cat().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"


def encode_qr_code(payload: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=6, border=1)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#3b0270", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def build_receipt_markup(
    sale: models.Sale,
    qr_code_url: str,
    receipt_settings: models.ReceiptSettings,
) -> str:
    issued_at = format_cat_time(sale.created_at, "%d %b %Y at %H:%M")
    payment_method = PAYMENT_METHOD_LABELS.get(
        sale.payment_method, sale.payment_method.replace("_", " ").title()
    )
    company_name = receipt_settings.company_name or "Ancestra Business"
    company_tagline = receipt_settings.company_tagline or "Small Business Sales Receipt"
    footer_message = receipt_settings.footer_message or "Thank you for supporting our business!"
    logo_src = resolve_logo_src(receipt_settings)
    logo_markup = f'<img src="{logo_src}" alt="{company_name} logo" class="logo" />' if logo_src else ""
    tagline_markup = f'<p class="tagline">{company_tagline}</p>' if company_tagline else ""
    items_rows = "".join(
        f"""
        <tr>
            <td>{item.product.name if item.product else 'Unknown'}</td>
            <td class="align-center">{item.quantity}</td>
            <td class="align-right">ZMW {item.unit_price:.2f}</td>
            <td class="align-right">ZMW {item.subtotal:.2f}</td>
        </tr>
        """
        for item in sale.items
    )

    return f"""
    <!doctype html>
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <title>Receipt {sale.receipt_number}</title>
        <style>
            body {{
                font-family: 'Satoshi', system-ui, sans-serif;
                background-color: #ffffff;
                color: #000000;
                margin: 0;
                padding: 0;
            }}
            .receipt {{
                width: 320px;
                margin: 0 auto;
                padding: 16px;
            }}
            .header {{
                text-align: center;
                margin-bottom: 8px;
            }}
            .header .logo {{
                height: 120px;
                margin-bottom: 6px;
                object-fit: contain;
            }}
            .header h1 {{
                font-size: 18px;
                margin: 0;
            }}
            .tagline {{
                font-size: 12px;
                margin: 4px 0 0;
            }}
            .section {{
                font-size: 12px;
                margin-bottom: 12px;
            }}
            .meta-row {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
            }}
            .meta-row span {{
                font-weight: 500;
            }}
            .meta-row strong {{
                font-weight: 600;
            }}
            .divider {{
                border-top: 1px dashed #000000;
                margin: 12px 0;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
            }}
            th, td {{
                padding: 4px 0;
                text-align: left;
                border-bottom: 1px dashed #000000;
            }}
            tbody tr:last-child td {{
                border-bottom: none;
            }}
            th {{
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }}
            .align-center {{
                text-align: center;
            }}
            .align-right {{
                text-align: right;
            }}
            .totals {{
                text-align: right;
                font-size: 14px;
                font-weight: 700;
                margin-top: 8px;
            }}
            .footer {{
                margin-top: 16px;
                text-align: center;
                font-size: 11px;
            }}
            .footer-message {{
                margin-bottom: 8px;
            }}
            .footer img {{
                width: 100px;
                height: 100px;
            }}
            @media print {{
                body {{
                    margin: 0;
                }}
                .receipt {{
                    width: 58mm;
                    padding: 12px;
                }}
                th, td {{
                    border-bottom: 1px dashed #000000;
                }}
            }}
        </style>
    </head>
    <body>
        <article class="receipt">
            <header class="header">
                {logo_markup}
                <h1>{company_name}</h1>
                {tagline_markup}
            </header>
            <section class="section">
                <div class="meta-row"><span>Receipt:</span><strong>{sale.receipt_number}</strong></div>
                <div class="meta-row"><span>Date:</span><strong>{issued_at}</strong></div>
                <div class="meta-row"><span>Customer:</span><strong>{sale.customer_name or 'Walk-in'}</strong></div>
                <div class="meta-row"><span>Payment:</span><strong>{payment_method}</strong></div>
            </section>
            <div class="divider"></div>
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="align-center">Qty</th>
                        <th class="align-right">Price</th>
                        <th class="align-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows}
                </tbody>
            </table>
            <div class="divider"></div>
            <div class="totals">
                Total ZMW {sale.total_amount:.2f}
            </div>
            <section class="footer">
                <div class="footer-message">{footer_message}</div>
                <img src="{qr_code_url}" alt="Receipt QR code" />
            </section>
        </article>
    </body>
    </html>
    """


def to_sale_read(sale: models.Sale) -> schemas.SaleRead:
    return schemas.SaleRead(
        id=sale.id,
        customer_name=sale.customer_name,
        created_at=sale.created_at,
        total_amount=sale.total_amount,
        receipt_number=sale.receipt_number,
        payment_method=sale.payment_method,
        items=[
            schemas.SaleItemRead(
                product_id=item.product_id,
                product_name=item.product.name if item.product else "",
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal,
            )
            for item in sale.items
        ],
    )


@router.post("/", response_model=schemas.SaleRead, status_code=status.HTTP_201_CREATED)
def create_sale(
    sale_in: schemas.SaleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    ensure_sale_role(current_user)
    if not sale_in.items:
        raise HTTPException(status_code=400, detail="Sale must include items")

    sale = models.Sale(
        customer_name=sale_in.customer_name,
        payment_method=sale_in.payment_method,
        created_by_id=current_user.id,
    )
    total_amount = 0.0

    for item in sale_in.items:
        product = db.get(models.Product, item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}",
            )
        unit_price = item.price_override if item.price_override is not None else product.price
        subtotal = unit_price * item.quantity
        total_amount += subtotal
        product.quantity -= item.quantity

        sale_item = models.SaleItem(
            product_id=product.id,
            quantity=item.quantity,
            unit_price=unit_price,
            subtotal=subtotal,
        )
        sale.items.append(sale_item)

    sale.total_amount = total_amount
    sale.receipt_number = generate_receipt_number()
    while (
        db.query(models.Sale)
        .filter(models.Sale.receipt_number == sale.receipt_number)
        .first()
    ):
        sale.receipt_number = generate_receipt_number()
    db.add(sale)
    db.commit()
    db.refresh(sale)
    sale = (
        db.query(models.Sale)
        .options(joinedload(models.Sale.items).joinedload(models.SaleItem.product))
        .filter(models.Sale.id == sale.id)
        .first()
    )
    log_activity(
        db,
        current_user.id,
        "sale_created",
        f"Recorded sale {sale.receipt_number} for ZMW {sale.total_amount:.2f}",
    )
    return to_sale_read(sale)


@router.get("/", response_model=list[schemas.SaleRead])
def list_sales(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    customer: Optional[str] = Query(None),
    product_id: Optional[int] = Query(None),
    mine: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    query = db.query(models.Sale).options(joinedload(models.Sale.items).joinedload(models.SaleItem.product))

    if start_date:
        query = query.filter(models.Sale.created_at >= start_date)
    if end_date:
        query = query.filter(models.Sale.created_at <= end_date)
    if customer:
        query = query.filter(func.lower(models.Sale.customer_name) == customer.lower())
    if product_id:
        query = query.join(models.Sale.items).filter(models.SaleItem.product_id == product_id)

    # If mine is true, restrict results to the current user's sales
    if mine:
        query = query.filter(models.Sale.created_by_id == current_user.id)

    sales = query.order_by(models.Sale.created_at.desc()).all()
    return [to_sale_read(sale) for sale in sales]


@router.get("/{sale_id}/receipt", response_model=schemas.SaleReceipt)
def get_sale_receipt(
    sale_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.get_current_active_user),
):
    sale = (
        db.query(models.Sale)
        .options(joinedload(models.Sale.items).joinedload(models.SaleItem.product))
        .filter(models.Sale.id == sale_id)
        .first()
    )
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    receipt_settings = get_receipt_settings(db)
    
    # Use custom QR code content if configured, otherwise use receipt details
    if receipt_settings.qr_code_content:
        qr_payload = receipt_settings.qr_code_content
    else:
        # Default: encode receipt details
        qr_payload = f"{sale.receipt_number}|{sale.total_amount:.2f}|{sale.created_at.isoformat()}"
    
    qr_code_url = encode_qr_code(qr_payload)
    html = build_receipt_markup(sale, qr_code_url, receipt_settings)
    sale_read = to_sale_read(sale)

    return schemas.SaleReceipt(
        sale=sale_read,
        receipt_number=sale.receipt_number,
        issued_at=sale.created_at,
        html=html,
        qr_code=qr_code_url,
        company_name=receipt_settings.company_name,
        company_logo_url=receipt_settings.company_logo_url,
        company_tagline=receipt_settings.company_tagline,
        footer_message=receipt_settings.footer_message,
    )
