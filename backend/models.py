from __future__ import annotations
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Text, Numeric, Boolean, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db import Base

# Customers
class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # New fields required by UI
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    vat_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    opportunity: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    opportunity_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    quotes: Mapped[List["Quote"]] = relationship(back_populates="customer", lazy="selectin")

# Products
class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)  # store unit price
    currency: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)

    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    available_for_quotations: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    deleted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    items: Mapped[List["QuoteItem"]] = relationship(back_populates="product", lazy="selectin")

# Quotes
class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="RESTRICT"))
    status: Mapped[str] = mapped_column(String(30), default="draft")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Added fields
    quotation_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    terms_and_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    discount_type: Mapped[str] = mapped_column(String(20), default="none")
    discount_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total_vat: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    deleted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Archive fields
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    customer: Mapped["Customer"] = relationship(back_populates="quotes", lazy="selectin")
    items: Mapped[List["QuoteItem"]] = relationship(back_populates="quote", cascade="all, delete-orphan", lazy="selectin")

    # Alias so frontend can use created_date
    @property
    def created_date(self) -> datetime:
        return self.created_at

# Quote items
class QuoteItem(Base):
    __tablename__ = "quote_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    quote_id: Mapped[int] = mapped_column(ForeignKey("quotes.id", ondelete="CASCADE"))
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    description: Mapped[str] = mapped_column(Text)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)

    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    line_total_vat: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    quote: Mapped["Quote"] = relationship(back_populates="items")
    product: Mapped[Optional["Product"]] = relationship(back_populates="items")

# Users
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200), index=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(50), default="user")  # admin, manager, user
    profile_picture_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # For future authentication
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Alias so frontend can use created_date
    @property
    def created_date(self) -> datetime:
        return self.created_at

# Company settings
class CompanySettings(Base):
    __tablename__ = "company_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_name: Mapped[str] = mapped_column(String(200), default="Grow United Italy")
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Structured address fields
    address_line1: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    vat_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Bank details
    bank_name_branch: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bank_address_line1: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bank_address_line2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    account_number: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    iban: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    bic_swift: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    default_vat_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())