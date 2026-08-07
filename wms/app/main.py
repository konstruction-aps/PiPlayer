from __future__ import annotations

import os
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Annotated

from fastapi import Depends, FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    func,
    select,
    text,
)
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://wms:wms@localhost:5432/wms",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    zone: Mapped[str] = mapped_column(String(64), default="GENERAL")

    inventory: Mapped[list[Inventory]] = relationship(back_populates="location")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str] = mapped_column(Text, default="")
    unit: Mapped[str] = mapped_column(String(16), default="EA")

    inventory: Mapped[list[Inventory]] = relationship(back_populates="product")


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (UniqueConstraint("product_id", "location_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=0)

    product: Mapped[Product] = relationship(back_populates="inventory")
    location: Mapped[Location] = relationship(back_populates="inventory")


class Movement(Base):
    __tablename__ = "movements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    from_location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id"), nullable=True
    )
    to_location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id"), nullable=True
    )
    quantity: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(64), default="ADJUST")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


def seed_if_empty(db: Session) -> None:
    if db.scalar(select(func.count()).select_from(Location)):
        return
    locations = [
        Location(code="RECV", name="Receiving Dock", zone="INBOUND"),
        Location(code="A-01-01", name="Aisle A / Bay 01 / Level 01", zone="STORAGE"),
        Location(code="SHIP", name="Shipping Dock", zone="OUTBOUND"),
    ]
    products = [
        Product(sku="WIDGET-100", name="Standard Widget", unit="EA"),
        Product(sku="BOLT-M8", name="M8 Hex Bolt", unit="BOX"),
    ]
    db.add_all(locations + products)
    db.flush()
    db.add(
        Inventory(
            product_id=products[0].id,
            location_id=locations[1].id,
            quantity=100,
        )
    )
    db.commit()


def find_product(db: Session, sku: str) -> Product | None:
    return db.scalar(
        select(Product).where(func.lower(Product.sku) == sku.strip().lower())
    )


def find_location(db: Session, code: str) -> Location | None:
    return db.scalar(
        select(Location).where(func.lower(Location.code) == code.strip().lower())
    )


def wait_for_db(retries: int = 30, delay_s: float = 2.0) -> None:
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except OperationalError as exc:
            last_error = exc
            print(f"Waiting for database ({attempt}/{retries})...")
            time.sleep(delay_s)
    raise RuntimeError(f"Database not ready after {retries} attempts") from last_error


@asynccontextmanager
async def lifespan(_: FastAPI):
    wait_for_db()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(title="WMS", version="0.1.0", lifespan=lifespan)
templates = Jinja2Templates(directory="templates")


class ProductIn(BaseModel):
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=128)
    description: str = ""
    unit: str = "EA"


class LocationIn(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=128)
    zone: str = "GENERAL"


class ReceiveIn(BaseModel):
    sku: str
    location_code: str
    quantity: int = Field(gt=0)
    note: str = ""


class ShipIn(BaseModel):
    sku: str
    location_code: str
    quantity: int = Field(gt=0)
    note: str = ""


class TransferIn(BaseModel):
    sku: str
    from_location_code: str
    to_location_code: str
    quantity: int = Field(gt=0)
    note: str = ""


def get_or_create_inventory(
    db: Session, product_id: int, location_id: int
) -> Inventory:
    row = db.scalar(
        select(Inventory).where(
            Inventory.product_id == product_id,
            Inventory.location_id == location_id,
        )
    )
    if row:
        return row
    row = Inventory(product_id=product_id, location_id=location_id, quantity=0)
    db.add(row)
    db.flush()
    return row


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request, db: DbSession):
    products = db.scalars(select(Product).order_by(Product.sku)).all()
    locations = db.scalars(select(Location).order_by(Location.code)).all()
    inventory = db.scalars(
        select(Inventory).order_by(Inventory.id)
    ).all()
    movements = db.scalars(
        select(Movement).order_by(Movement.id.desc()).limit(20)
    ).all()
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "products": products,
            "locations": locations,
            "inventory": inventory,
            "movements": movements,
        },
    )


@app.get("/api/products")
def list_products(db: DbSession):
    rows = db.scalars(select(Product).order_by(Product.sku)).all()
    return [
        {
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "description": p.description,
            "unit": p.unit,
        }
        for p in rows
    ]


@app.post("/api/products", status_code=201)
def create_product(body: ProductIn, db: DbSession):
    if db.scalar(select(Product).where(Product.sku == body.sku)):
        raise HTTPException(409, "SKU already exists")
    product = Product(**body.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return {"id": product.id, "sku": product.sku}


@app.get("/api/locations")
def list_locations(db: DbSession):
    rows = db.scalars(select(Location).order_by(Location.code)).all()
    return [
        {"id": loc.id, "code": loc.code, "name": loc.name, "zone": loc.zone}
        for loc in rows
    ]


@app.post("/api/locations", status_code=201)
def create_location(body: LocationIn, db: DbSession):
    if db.scalar(select(Location).where(Location.code == body.code)):
        raise HTTPException(409, "Location code already exists")
    location = Location(**body.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return {"id": location.id, "code": location.code}


@app.get("/api/inventory")
def list_inventory(db: DbSession):
    rows = db.scalars(select(Inventory)).all()
    return [
        {
            "sku": row.product.sku,
            "product": row.product.name,
            "location": row.location.code,
            "quantity": row.quantity,
            "unit": row.product.unit,
        }
        for row in rows
        if row.quantity != 0
    ]


@app.post("/api/receive", status_code=201)
def receive_stock(body: ReceiveIn, db: DbSession):
    product = find_product(db, body.sku)
    location = find_location(db, body.location_code)
    if not product or not location:
        raise HTTPException(404, "Product or location not found")
    inv = get_or_create_inventory(db, product.id, location.id)
    inv.quantity += body.quantity
    db.add(
        Movement(
            product_id=product.id,
            from_location_id=None,
            to_location_id=location.id,
            quantity=body.quantity,
            reason="RECEIVE",
            note=body.note,
        )
    )
    db.commit()
    return {"sku": product.sku, "location": location.code, "quantity": inv.quantity}


@app.post("/api/ship", status_code=201)
def ship_stock(body: ShipIn, db: DbSession):
    product = find_product(db, body.sku)
    location = find_location(db, body.location_code)
    if not product or not location:
        raise HTTPException(404, "Product or location not found")
    inv = get_or_create_inventory(db, product.id, location.id)
    if inv.quantity < body.quantity:
        raise HTTPException(400, "Insufficient quantity")
    inv.quantity -= body.quantity
    db.add(
        Movement(
            product_id=product.id,
            from_location_id=location.id,
            to_location_id=None,
            quantity=body.quantity,
            reason="SHIP",
            note=body.note,
        )
    )
    db.commit()
    return {"sku": product.sku, "location": location.code, "quantity": inv.quantity}


@app.post("/api/transfer", status_code=201)
def transfer_stock(body: TransferIn, db: DbSession):
    product = find_product(db, body.sku)
    src = find_location(db, body.from_location_code)
    dst = find_location(db, body.to_location_code)
    if not product or not src or not dst:
        raise HTTPException(404, "Product or location not found")
    if src.id == dst.id:
        raise HTTPException(400, "Source and destination must differ")
    src_inv = get_or_create_inventory(db, product.id, src.id)
    if src_inv.quantity < body.quantity:
        raise HTTPException(400, "Insufficient quantity at source")
    dst_inv = get_or_create_inventory(db, product.id, dst.id)
    src_inv.quantity -= body.quantity
    dst_inv.quantity += body.quantity
    db.add(
        Movement(
            product_id=product.id,
            from_location_id=src.id,
            to_location_id=dst.id,
            quantity=body.quantity,
            reason="TRANSFER",
            note=body.note,
        )
    )
    db.commit()
    return {
        "sku": product.sku,
        "from": src.code,
        "to": dst.code,
        "moved": body.quantity,
    }


@app.post("/ui/receive")
def ui_receive(
    db: DbSession,
    sku: Annotated[str, Form()],
    location_code: Annotated[str, Form()],
    quantity: Annotated[int, Form()],
    note: Annotated[str, Form()] = "",
):
    receive_stock(
        ReceiveIn(
            sku=sku, location_code=location_code, quantity=quantity, note=note
        ),
        db,
    )
    return RedirectResponse("/", status_code=303)


@app.post("/ui/ship")
def ui_ship(
    db: DbSession,
    sku: Annotated[str, Form()],
    location_code: Annotated[str, Form()],
    quantity: Annotated[int, Form()],
    note: Annotated[str, Form()] = "",
):
    ship_stock(
        ShipIn(
            sku=sku, location_code=location_code, quantity=quantity, note=note
        ),
        db,
    )
    return RedirectResponse("/", status_code=303)


@app.post("/ui/transfer")
def ui_transfer(
    db: DbSession,
    sku: Annotated[str, Form()],
    from_location_code: Annotated[str, Form()],
    to_location_code: Annotated[str, Form()],
    quantity: Annotated[int, Form()],
    note: Annotated[str, Form()] = "",
):
    transfer_stock(
        TransferIn(
            sku=sku,
            from_location_code=from_location_code,
            to_location_code=to_location_code,
            quantity=quantity,
            note=note,
        ),
        db,
    )
    return RedirectResponse("/", status_code=303)
