"""
Business rule validators for input validation.
These validators enforce business rules and data integrity constraints.
"""
from decimal import Decimal
from datetime import datetime, timezone
from typing import Any
from pydantic import field_validator, model_validator
from fastapi import HTTPException

# Valid quote statuses
VALID_QUOTE_STATUSES = {"draft", "sent", "confirmed", "rejected", "archived"}

# Valid discount types
VALID_DISCOUNT_TYPES = {"none", "percentage", "fixed"}

# Valid user roles
VALID_USER_ROLES = {"admin", "manager", "user"}


def validate_vat_rate(v: Decimal | float | int | None, field_name: str = "vat_rate") -> Decimal:
    """Validate VAT rate is between 0 and 100."""
    if v is None:
        return Decimal("0")
    if isinstance(v, (float, int)):
        v = Decimal(str(v))
    if not isinstance(v, Decimal):
        v = Decimal(str(v))
    
    if v < 0 or v > 100:
        raise ValueError(f"{field_name} must be between 0 and 100, got {v}")
    return v


def validate_price(v: Decimal | float | int | None, field_name: str = "price", allow_zero: bool = True) -> Decimal:
    """Validate price is non-negative."""
    if v is None:
        return Decimal("0")
    if isinstance(v, (float, int)):
        v = Decimal(str(v))
    if not isinstance(v, Decimal):
        v = Decimal(str(v))
    
    if v < 0:
        raise ValueError(f"{field_name} must be non-negative, got {v}")
    if not allow_zero and v == 0:
        raise ValueError(f"{field_name} must be greater than 0, got {v}")
    return v


def validate_quantity(v: Decimal | float | int | None, field_name: str = "quantity") -> Decimal:
    """Validate quantity is positive."""
    if v is None:
        return Decimal("1")
    if isinstance(v, (float, int)):
        v = Decimal(str(v))
    if not isinstance(v, Decimal):
        v = Decimal(str(v))
    
    if v <= 0:
        raise ValueError(f"{field_name} must be greater than 0, got {v}")
    return v


def validate_discount_type(v: str | None) -> str:
    """Validate discount type is one of the allowed values."""
    if v is None:
        return "none"
    v = v.lower().strip()
    if v not in VALID_DISCOUNT_TYPES:
        raise ValueError(f"discount_type must be one of {VALID_DISCOUNT_TYPES}, got {v}")
    return v


def validate_discount_value(v: Decimal | float | int | None, discount_type: str | None = None, subtotal: Decimal | None = None) -> Decimal:
    """Validate discount value is non-negative and appropriate for discount type.
    
    For fixed discounts, ensures discount doesn't exceed subtotal (if provided).
    """
    if v is None:
        return Decimal("0")
    if isinstance(v, (float, int)):
        v = Decimal(str(v))
    if not isinstance(v, Decimal):
        v = Decimal(str(v))
    
    if v < 0:
        raise ValueError(f"discount_value must be non-negative, got {v}")
    
    # If discount type is percentage, value should be between 0 and 100
    if discount_type == "percentage" and v > 100:
        raise ValueError(f"discount_value for percentage discount must be between 0 and 100, got {v}")
    
    # If discount type is fixed and subtotal is provided, ensure discount doesn't exceed subtotal
    if discount_type == "fixed" and subtotal is not None:
        if v > subtotal:
            raise ValueError(f"discount_value for fixed discount cannot exceed subtotal ({subtotal}), got {v}")
    
    return v


def validate_quote_status(v: str | None) -> str:
    """Validate quote status is one of the allowed values."""
    if v is None:
        return "draft"
    v = v.lower().strip()
    if v not in VALID_QUOTE_STATUSES:
        raise ValueError(f"status must be one of {VALID_QUOTE_STATUSES}, got {v}")
    return v


def validate_user_role(v: str | None) -> str:
    """Validate user role is one of the allowed values."""
    if v is None:
        return "user"
    v = v.lower().strip()
    if v not in VALID_USER_ROLES:
        raise ValueError(f"role must be one of {VALID_USER_ROLES}, got {v}")
    return v


def validate_email_port(v: int | None) -> int:
    """Validate email port is in valid range."""
    if v is None:
        return 587
    if not isinstance(v, int):
        try:
            v = int(v)
        except (ValueError, TypeError):
            raise ValueError(f"mail_port must be an integer, got {v}")
    
    if v < 1 or v > 65535:
        raise ValueError(f"mail_port must be between 1 and 65535, got {v}")
    return v


def validate_string_length(v: str | None, max_length: int, field_name: str, required: bool = False) -> str | None:
    """Validate string length."""
    if v is None:
        if required:
            raise ValueError(f"{field_name} is required")
        return None
    
    if not isinstance(v, str):
        v = str(v)
    
    if len(v) > max_length:
        raise ValueError(f"{field_name} must be at most {max_length} characters, got {len(v)}")
    
    if required and len(v.strip()) == 0:
        raise ValueError(f"{field_name} cannot be empty")
    
    return v.strip() if v else None


def validate_non_empty_string(v: str | None, field_name: str) -> str:
    """Validate string is not empty."""
    if v is None:
        raise ValueError(f"{field_name} is required")
    
    if not isinstance(v, str):
        v = str(v)
    
    v = v.strip()
    if len(v) == 0:
        raise ValueError(f"{field_name} cannot be empty")
    
    return v

