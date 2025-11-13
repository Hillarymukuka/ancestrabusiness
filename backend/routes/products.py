import csv
import io
import random
import string
from typing import Dict, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db
from ..utils.activity import log_activity

router = APIRouter(prefix="/api/products", tags=["products"])


ALLOWED_MANAGEMENT_ROLES = {"owner", "manager"}


def ensure_role(user: models.User, allowed_roles: set[str]) -> None:
    if user.role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def generate_product_code(db: Session) -> str:
    """Generate a unique product code in the format PROD-XXXX where X is alphanumeric."""
    max_attempts = 100
    for _ in range(max_attempts):
        code = "PROD-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        existing = db.query(models.Product).filter(models.Product.product_code == code).first()
        if not existing:
            return code
    # Fallback to timestamp-based if random fails
    import time
    return f"PROD-{int(time.time() * 1000) % 100000000}"


@router.get("/", response_model=list[schemas.ProductRead])
def list_products(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.get_current_active_user),
):
    return db.query(models.Product).order_by(models.Product.name).all()


@router.post("/", response_model=schemas.ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    ensure_role(current_user, ALLOWED_MANAGEMENT_ROLES)
    existing = db.query(models.Product).filter(func.lower(models.Product.name) == product_in.name.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product already exists")
    
    # Auto-generate product code if not provided
    product_data = product_in.dict()
    if not product_data.get('product_code'):
        product_data['product_code'] = generate_product_code(db)
    
    product = models.Product(**product_data)
    db.add(product)
    log_activity(db, current_user.id, "product_created", f"Created product {product.name}")
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=schemas.ProductRead)
def update_product(
    product_id: int,
    product_in: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    ensure_role(current_user, ALLOWED_MANAGEMENT_ROLES)
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    changes = product_in.dict(exclude_unset=True)
    for field, value in changes.items():
        setattr(product, field, value)
    if changes:
        changed_fields = ", ".join(sorted(changes.keys()))
    else:
        changed_fields = "no changes"
    log_activity(db, current_user.id, "product_updated", f"Updated product {product.name} ({changed_fields})")
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    ensure_role(current_user, ALLOWED_MANAGEMENT_ROLES)
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product_name = product.name
    db.delete(product)
    log_activity(db, current_user.id, "product_deleted", f"Deleted product {product_name}")
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/export", response_class=Response)
def export_products(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.get_current_active_user),
):
    products = db.query(models.Product).order_by(models.Product.name).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "name", "product_code", "category", "price", "quantity", "reorder_level"])
    for product in products:
        writer.writerow(
            [
                product.id,
                product.name,
                product.product_code or "",
                product.category,
                f"{product.price:.2f}",
                product.quantity,
                product.reorder_level,
            ]
        )
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products.csv"},
    )


@router.post("/import", status_code=status.HTTP_200_OK)
async def import_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    ensure_role(current_user, ALLOWED_MANAGEMENT_ROLES)
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload must be a CSV file")

    try:
        content_bytes = await file.read()
        text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="Unable to decode CSV file; use UTF-8 encoding.") from exc

    if not text.strip():
        return {"created": 0, "updated": 0, "skipped": 0, "errors": []}

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is missing a header row.")

    created = 0
    updated = 0
    skipped = 0
    errors: list[str] = []

    def parse_int(value: Optional[str], field: str, row_number: int) -> Optional[int]:
        if value is None or value == "":
            return None
        try:
            return int(float(value))
        except ValueError:
            errors.append(f"Row {row_number}: Invalid integer for {field!r} -> {value!r}")
            return None

    def parse_float(value: Optional[str], field: str, row_number: int) -> Optional[float]:
        if value is None or value == "":
            return None
        try:
            return float(value)
        except ValueError:
            errors.append(f"Row {row_number}: Invalid number for {field!r} -> {value!r}")
            return None

    for row_number, row in enumerate(reader, start=2):
        normalized: Dict[str, str] = {
            (key or "").strip().lower(): (value or "").strip() for key, value in row.items()
        }

        product: Optional[models.Product] = None

        product_id = parse_int(normalized.get("id") or normalized.get("product_id"), "id", row_number)
        name = normalized.get("name") or normalized.get("product_name")
        product_code = normalized.get("product_code") or normalized.get("code")
        category = normalized.get("category")
        price = parse_float(normalized.get("price"), "price", row_number)
        quantity = parse_int(normalized.get("quantity"), "quantity", row_number)
        reorder_level = parse_int(normalized.get("reorder_level"), "reorder_level", row_number)

        if product_id:
            product = db.get(models.Product, product_id)
            if not product:
                errors.append(f"Row {row_number}: Product with id={product_id} not found; skipping.")
                skipped += 1
                continue
        elif product_code:
            product = (
                db.query(models.Product)
                .filter(func.lower(models.Product.product_code) == product_code.lower())
                .first()
            )
        elif name:
            product = (
                db.query(models.Product)
                .filter(func.lower(models.Product.name) == name.lower())
                .first()
            )

        if product:
            if name:
                product.name = name
            if product_code:
                product.product_code = product_code
            if category:
                product.category = category
            if price is not None:
                if price < 0:
                    errors.append(f"Row {row_number}: price must be positive.")
                else:
                    product.price = price
            if quantity is not None:
                if quantity < 0:
                    errors.append(f"Row {row_number}: quantity must be positive.")
                else:
                    product.quantity = quantity
            if reorder_level is not None:
                if reorder_level < 0:
                    errors.append(f"Row {row_number}: reorder_level must be positive.")
                else:
                    product.reorder_level = reorder_level
            updated += 1
            continue

        # Creating a new product requires mandatory fields
        if not name:
            errors.append(f"Row {row_number}: name is required to create a new product.")
            skipped += 1
            continue
        if category is None or category == "":
            errors.append(f"Row {row_number}: category is required to create a new product.")
            skipped += 1
            continue
        if price is None:
            errors.append(f"Row {row_number}: price is required to create a new product.")
            skipped += 1
            continue
        if price < 0:
            errors.append(f"Row {row_number}: price must be positive.")
            skipped += 1
            continue
        if quantity is None:
            errors.append(f"Row {row_number}: quantity is required to create a new product.")
            skipped += 1
            continue
        if quantity < 0:
            errors.append(f"Row {row_number}: quantity must be positive.")
            skipped += 1
            continue

        # Auto-generate product code if not provided
        if not product_code:
            product_code = generate_product_code(db)

        product = models.Product(
            name=name,
            product_code=product_code,
            category=category,
            price=price,
            quantity=quantity,
            reorder_level=reorder_level or 0,
        )
        db.add(product)
        created += 1

    if created or updated:
        log_activity(
            db,
            current_user.id,
            "product_import",
            f"Imported products: {created} created, {updated} updated, {skipped} skipped",
        )
        db.commit()
    else:
        db.rollback()

    return {"created": created, "updated": updated, "skipped": skipped, "errors": errors}
