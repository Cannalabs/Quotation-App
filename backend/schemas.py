from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel, Field, EmailStr, ConfigDict, model_validator, field_serializer, field_validator
from datetime import datetime, timezone
import hashlib
from validators import (
    validate_vat_rate, validate_price, validate_quantity,
    validate_discount_type, validate_discount_value, validate_quote_status,
    validate_user_role, validate_email_port, validate_non_empty_string,
    validate_string_length
)

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

    @field_validator("default_vat_rate")
    @classmethod
    def validate_default_vat_rate(cls, v: Decimal) -> Decimal:
        return validate_vat_rate(v, "default_vat_rate")

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

    @field_validator("default_vat_rate")
    @classmethod
    def validate_default_vat_rate(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            return validate_vat_rate(v, "default_vat_rate")
        return v

# Email Settings
class EmailSettingsBase(BaseModel):
    mail_username: Optional[str] = None
    mail_password: Optional[str] = None  # Password - only for updates, not returned in reads
    mail_from: Optional[str] = None
    mail_from_name: str = "Grow United Italy"
    mail_port: int = 587
    mail_server: Optional[str] = None
    mail_tls: bool = True
    mail_ssl: bool = False
    mail_use_credentials: bool = True

    @field_validator("mail_port")
    @classmethod
    def validate_mail_port(cls, v: int) -> int:
        return validate_email_port(v)

class EmailSettingsRead(BaseModel):
    """Email settings read model - password is excluded for security"""
    id: int
    mail_username: Optional[str] = None
    # mail_password is EXCLUDED - never send password in API responses
    mail_from: Optional[str] = None
    mail_from_name: str = "Grow United Italy"
    mail_port: int = 587
    mail_server: Optional[str] = None
    mail_tls: bool = True
    mail_ssl: bool = False
    mail_use_credentials: bool = True
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EmailSettingsUpdate(BaseModel):
    mail_username: Optional[str] = None
    mail_password: Optional[str] = None
    mail_from: Optional[str] = None
    mail_from_name: Optional[str] = None
    mail_port: Optional[int] = None
    mail_server: Optional[str] = None
    mail_tls: Optional[bool] = None
    mail_ssl: Optional[bool] = None
    mail_use_credentials: Optional[bool] = None

    @field_validator("mail_port")
    @classmethod
    def validate_mail_port(cls, v: Optional[int]) -> Optional[int]:
        if v is not None:
            return validate_email_port(v)
        return v

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
    tax_id: Optional[str] = None  # Alias for vat_number, will be normalized in router
    source: Optional[str] = None
    opportunity: Optional[str] = None
    opportunity_address: Optional[str] = None
    archived: bool = False

    @field_validator("name", "contact_person")
    @classmethod
    def validate_required_fields(cls, v: str, info) -> str:
        field_name = info.field_name
        validated = validate_non_empty_string(v, field_name)
        return validate_string_length(validated, 200, field_name, required=True) or ""

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
    tax_id: Optional[str] = None  # Alias for vat_number, will be normalized in router
    source: Optional[str] = None
    opportunity: Optional[str] = None
    opportunity_address: Optional[str] = None
    archived: Optional[bool] = None

    @field_validator("name", "contact_person")
    @classmethod
    def validate_string_lengths(cls, v: Optional[str], info) -> Optional[str]:
        if v is not None:
            field_name = info.field_name
            max_length = 200
            return validate_string_length(v, max_length, field_name, required=False)
        return v

class CustomerRead(CustomerBase):
    id: int
    created_date: datetime = Field(alias="created_at")
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
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

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return validate_non_empty_string(v, "name")

    @field_validator("unit_price")
    @classmethod
    def validate_unit_price(cls, v: Decimal) -> Decimal:
        return validate_price(v, "unit_price", allow_zero=True)

    @field_validator("vat_rate")
    @classmethod
    def validate_vat_rate(cls, v: Decimal) -> Decimal:
        return validate_vat_rate(v, "vat_rate")

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

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_non_empty_string(v, "name")
        return v

    @field_validator("unit_price")
    @classmethod
    def validate_unit_price(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            return validate_price(v, "unit_price", allow_zero=True)
        return v

    @field_validator("vat_rate")
    @classmethod
    def validate_vat_rate(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            return validate_vat_rate(v, "vat_rate")
        return v

class ProductRead(ProductBase):
    id: int
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Quotes
class QuoteItemIn(BaseModel):
    product_id: Optional[int] = None
    description: Optional[str] = None
    quantity: Decimal = Field(default=Decimal("1"))
    unit_price: Optional[Decimal] = None
    vat_rate: Optional[Decimal] = None

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: Decimal) -> Decimal:
        return validate_quantity(v, "quantity")

    @field_validator("unit_price")
    @classmethod
    def validate_unit_price(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            return validate_price(v, "unit_price", allow_zero=True)
        return v

    @field_validator("vat_rate")
    @classmethod
    def validate_vat_rate(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            return validate_vat_rate(v, "vat_rate")
        return v

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

    @field_validator("customer_id")
    @classmethod
    def validate_customer_id(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("customer_id must be a positive integer")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> str:
        return validate_quote_status(v)

    @field_validator("discount_type")
    @classmethod
    def validate_discount_type(cls, v: Optional[str]) -> str:
        return validate_discount_type(v)

    @field_validator("valid_until")
    @classmethod
    def validate_valid_until(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            # Ensure timezone-aware datetime
            if v.tzinfo is None:
                v = v.replace(tzinfo=timezone.utc)
            # Valid until should be in the future (or at least not in the past)
            # We'll allow same day for now, but could be stricter
            return v
        return v

class QuoteCreate(QuoteBase):
    items: List[QuoteItemIn] = []

    @model_validator(mode="after")
    def validate_items(self):
        """Validate that quote has at least one item for non-draft statuses."""
        if self.status and self.status.lower() != "draft" and len(self.items) == 0:
            raise ValueError("Quote must have at least one item for non-draft statuses")
        return self
    
    @model_validator(mode="after")
    def validate_discount(self):
        """Validate discount_value against discount_type."""
        discount_type = self.discount_type or "none"
        discount_value = self.discount_value or Decimal("0")
        validate_discount_value(discount_value, discount_type)
        return self

class QuoteUpdate(BaseModel):
    customer_id: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    quotation_number: Optional[str] = None
    valid_until: Optional[datetime] = None
    terms_and_conditions: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[Decimal] = None
    items: Optional[List[QuoteItemIn]] = None
    
    # Archive fields
    is_archived: Optional[bool] = None
    archived_at: Optional[datetime] = None
    archived_by: Optional[str] = None

    @field_validator("customer_id")
    @classmethod
    def validate_customer_id(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("customer_id must be a positive integer")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_quote_status(v)
        return v

    @field_validator("discount_type")
    @classmethod
    def validate_discount_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_discount_type(v)
        return v

    @field_validator("valid_until")
    @classmethod
    def validate_valid_until(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            # Ensure timezone-aware datetime
            if v.tzinfo is None:
                v = v.replace(tzinfo=timezone.utc)
            return v
        return v

    @model_validator(mode="after")
    def validate_discount(self):
        """Validate discount_value against discount_type."""
        if self.discount_type is not None or self.discount_value is not None:
            discount_type = self.discount_type or "none"
            discount_value = self.discount_value or Decimal("0")
            validate_discount_value(discount_value, discount_type)
        return self

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
    
    # Created by info
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    
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

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        return validate_non_empty_string(v, "full_name")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        return validate_user_role(v)

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    profile_picture_url: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_non_empty_string(v, "full_name")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_user_role(v)
        return v

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

    @field_validator("current_password", "new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError("Password cannot be empty")
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v

class AdminPasswordReset(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError("Password cannot be empty")
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v

class ForgotPasswordRequest(BaseModel):
    email: str

class UserRead(UserBase):
    id: int
    is_active: bool
    created_date: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)