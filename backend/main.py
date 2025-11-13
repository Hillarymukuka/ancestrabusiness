from contextlib import contextmanager
from datetime import date, datetime
from uuid import uuid4

from fastapi import FastAPI
from .utils.timezone import now_cat
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from . import auth, config
from .database import Base, SessionLocal, engine
from .models import Expense, Product, ReceiptSettings, Sale, SaleItem, User
from .routes import auth as auth_routes
from .routes import employees, expenses, products, reports, sales, settings, quotations

app = FastAPI(title="Ancestra Business API", version="0.1.0")

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://ancestrabusiness.pages.dev",
    "https://*.pages.dev",  # Allow all Cloudflare Pages preview deployments
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.mount(config.MEDIA_URL, StaticFiles(directory=config.MEDIA_ROOT), name="media")
app.include_router(auth_routes.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(expenses.router)
app.include_router(reports.router)
app.include_router(settings.router)
app.include_router(employees.router)
app.include_router(quotations.router)


@contextmanager
def session_scope():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    finally:
        session.close()


def ensure_sale_payment_method_column() -> None:
    inspector = inspect(engine)
    if "sales" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("sales")}
    if "payment_method" in columns:
        return

    with engine.begin() as connection:
        connection.execute(
            text("ALTER TABLE sales ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'")
        )


def ensure_sale_created_by_column() -> None:
    inspector = inspect(engine)
    if "sales" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("sales")}
    if "created_by_id" in columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE sales ADD COLUMN created_by_id INTEGER"))


def ensure_expense_receipt_column() -> None:
    inspector = inspect(engine)
    if "expenses" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("expenses")}
    if "receipt_path" in columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE expenses ADD COLUMN receipt_path VARCHAR(255)"))


def seed_data() -> None:
    with session_scope() as db:
        owner = db.query(User).filter(User.username == "owner").first()
        if not owner:
            owner = User(
                username="owner",
                full_name="Business Owner",
                role="owner",
                hashed_password=auth.get_password_hash("owner123"),
            )
            db.add(owner)

        if db.query(Product).count() == 0:
            products = [
                Product(name="Maize Flour 25kg", category="Food", price=120.0, quantity=50, reorder_level=10),
                Product(name="Cooking Oil 5L", category="Food", price=90.0, quantity=30, reorder_level=5),
                Product(name="Dish Soap", category="Cleaning", price=25.0, quantity=80, reorder_level=20),
            ]
            db.add_all(products)

        if db.query(Expense).count() == 0:
            expenses_seed = [
                Expense(description="Electricity Bill", category="Utilities", amount=350.0, expense_date=date.today()),
                Expense(description="Supplier Payment", category="Inventory", amount=500.0, expense_date=date.today()),
            ]
            db.add_all(expenses_seed)

        if not db.query(ReceiptSettings).first():
            db.add(ReceiptSettings())

        if db.query(Sale).count() == 0:
            product = db.query(Product).filter(Product.name == "Maize Flour 25kg").first()
            if product and product.quantity >= 2:
                product.quantity -= 2
                receipt_number = f"AB-{now_cat().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
                sale = Sale(
                    customer_name="Walk-in",
                    total_amount=product.price * 2,
                    receipt_number=receipt_number,
                    payment_method="cash",
                    created_by_id=owner.id if owner else None,
                )
                sale.items.append(
                    SaleItem(
                        product_id=product.id,
                        quantity=2,
                        unit_price=product.price,
                        subtotal=product.price * 2,
                    )
                )
                db.add(sale)

        if owner:
            db.query(Sale).filter(Sale.created_by_id.is_(None)).update(
                {"created_by_id": owner.id}, synchronize_session=False
            )


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_sale_payment_method_column()
    ensure_sale_created_by_column()
    ensure_expense_receipt_column()
    seed_data()


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
