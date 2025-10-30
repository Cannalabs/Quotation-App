from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel, Field, EmailStr, ConfigDict, model_validator, field_serializer
from datetime import datetime
import hashlib

def hash_password(password: str) -> str:
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return hash_password(password) == hashed

# Company Settings
class CompanySettingsBase(BaseModel):
    company_name: str = "Grow United Italy"
    address: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    vat_number: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    # Bank fields
    bank_name_branch: Optional[str] = None
    bank_address_line1: Optional[str] = None
    bank_address_line2: Optional[str] = None
    account_number: Optional[str] = None
    iban: Optional[str] = None
    bic_swift: Optional[str] = None
    default_vat_rate: Decimal = Field(default=Decimal("4.00"))

    @field_serializer("default_vat_rate", when_used="json")
    def _ser_default_vat_rate(self, v: Decimal):
        return float(v) if v is not None else 0.0

class CompanySettingsRead(CompanySettingsBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    address: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    vat_number: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    # Bank fields
    bank_name_branch: Optional[str] = None
    bank_address_line1: Optional[str] = None
    bank_address_line2: Optional[str] = None
    account_number: Optional[str] = None
    iban: Optional[str] = None
    bic_swift: Optional[str] = None
    default_vat_rate: Optional[Decimal] = None

# Customers
class CustomerBase(BaseModel):
    name: str
    email: str
    contact_person: str
    country: str = "Italy"
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    vat_number: Optional[str] = None
    source: Optional[str] = None
    opportunity: Optional[str] = None
    opportunity_address: Optional[str] = None
    archived: bool = False

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    contact_person: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    vat_number: Optional[str] = None
    source: Optional[str] = None
    opportunity: Optional[str] = None
    opportunity_address: Optional[str] = None
    archived: Optional[bool] = None

class CustomerRead(CustomerBase):
    id: int
    created_date: datetime = Field(alias="created_at")
    model_config = ConfigDict(from_attributes=True)

# Products
class ProductBase(BaseModel):
    name: str
    sku: Optional[str] = None
    description: Optional[str] = None
    unit_price: Decimal = Field(default=0)
    currency: Optional[str] = "EUR"
    category: Optional[str] = None
    vat_rate: Decimal = Field(default=0)
    active: Optional[bool] = True
    available_for_quotations: Optional[bool] = True
    archived: Optional[bool] = False

    @model_validator(mode="before")
    @classmethod
    def map_price_to_unit_price(cls, v):
        if isinstance(v, dict) and "unit_price" not in v and v.get("price") is not None:
            v = {**v, "unit_price": v["price"]}
        return v

    @field_serializer("unit_price", "vat_rate", when_used="json")
    def _ser_decimal(self, v: Decimal):
        return float(v) if v is not None else 0.0

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[Decimal] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    vat_rate: Optional[Decimal] = None
    active: Optional[bool] = None
    available_for_quotations: Optional[bool] = None
    archived: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def map_price_to_unit_price(cls, v):
        if isinstance(v, dict) and "unit_price" not in v and v.get("price") is not None:
            v = {**v, "unit_price": v["price"]}
        return v

class ProductRead(ProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Quotes
class QuoteItemIn(BaseModel):
    product_id: Optional[int] = None
    description: Optional[str] = None
    quantity: Decimal = Field(default=Decimal("1"))
    unit_price: Optional[Decimal] = None
    vat_rate: Optional[Decimal] = None

class QuoteItemRead(BaseModel):
    id: int
    product_id: Optional[int]
    description: str
    quantity: Decimal
    unit_price: Decimal
    vat_rate: Decimal
    line_total: Decimal
    line_total_vat: Decimal
    
    # Product info for display
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("quantity", "unit_price", "vat_rate", "line_total", "line_total_vat", when_used="json")
    def _ser_item_decimal(self, v: Decimal):
        return float(v) if v is not None else 0.0

class QuoteBase(BaseModel):
    customer_id: int
    status: Optional[str] = "draft"
    notes: Optional[str] = None
    quotation_number: Optional[str] = None
    valid_until: Optional[datetime] = None
    terms_and_conditions: Optional[str] = None
    discount_type: Optional[str] = "none"
    discount_value: Optional[Decimal] = Decimal("0")

class QuoteCreate(QuoteBase):
    items: List[QuoteItemIn] = []

class QuoteUpdate(BaseModel):
    customer_id: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    quotation_number: Optional[str] = None
    valid_until: Optional[datetime] = None
    terms_and_conditions: Optional[str] = None
    items: Optional[List[QuoteItemIn]] = None
    
    # Archive fields
    is_archived: Optional[bool] = None
    archived_at: Optional[datetime] = None
    archived_by: Optional[str] = None

class QuoteRead(QuoteBase):
    id: int
    subtotal: Decimal
    total_vat: Decimal
    total: Decimal
    created_date: datetime
    items: List[QuoteItemRead] = []
    
    # Archive fields
    is_archived: bool = False
    archived_at: Optional[datetime] = None
    archived_by: Optional[str] = None
    
    # Customer info for display
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    customer_contact_person: Optional[str] = None
    customer_vat_number: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("subtotal", "total_vat", "total", "discount_value", when_used="json")
    def _ser_quote_decimal(self, v: Decimal):
        return float(v) if v is not None else 0.0

# User schemas
class UserBase(BaseModel):
    full_name: str
    email: str
    role: str = "user"
    profile_picture_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    profile_picture_url: Optional[str] = None
    is_active: Optional[bool] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class UserRead(UserBase):
    id: int
    is_active: bool
    created_date: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)