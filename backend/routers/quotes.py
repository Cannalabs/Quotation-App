from decimal import Decimal
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db import get_session
from models import Quote, QuoteItem, Product, Customer, User
from schemas import QuoteCreate, QuoteRead, QuoteUpdate, QuoteItemIn
from config import settings
from auth import require_admin_role, get_current_user_id, get_current_user

router = APIRouter(prefix="/api/quotes", tags=["Quotes"])

async def _commit_and_refresh(session: AsyncSession, obj):
    """Commit session and refresh object."""
    await session.commit()
    await session.refresh(obj)
    return obj

def _populate_quote_display_fields(quote: Quote):
    """Populate customer and product display fields on a quote object."""
    if quote.customer:
        quote.customer_name = quote.customer.name
        quote.customer_email = quote.customer.email
        quote.customer_phone = quote.customer.phone
        quote.customer_address = quote.customer.address
        quote.customer_contact_person = quote.customer.contact_person
        quote.customer_vat_number = quote.customer.vat_number
    for item in quote.items:
        if item.product:
            item.product_name = item.product.name
            item.product_sku = item.product.sku

async def _populate_quote_created_by_name(session: AsyncSession, quotes: list[Quote]) -> None:
    """Populate created_by_name for quotes."""
    created_by_ids = {q.created_by for q in quotes if q.created_by}
    if not created_by_ids:
        return
    
    user_res = await session.execute(select(User).where(User.id.in_(created_by_ids)))
    users = {u.id: u.full_name for u in user_res.scalars().all()}
    
    for quote in quotes:
        if quote.created_by:
            quote.created_by_name = users.get(quote.created_by)

def _validate_product_for_quote_item(session: AsyncSession, product_id: int, product: Product):
    """Validate product is available for use in quote items."""
    if product.deleted:
        raise HTTPException(400, f"Product {product_id} is deleted")
    if product.archived:
        raise HTTPException(400, f"Product {product_id} is archived")
    if not product.available_for_quotations:
        raise HTTPException(400, f"Product {product_id} is not available for quotations")

async def _get_quote_or_404(session: AsyncSession, quote_id: int) -> Quote:
    """Get quote by ID or raise 404."""
    res = await session.execute(select(Quote).where(Quote.id == quote_id))
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(404, "Quote not found")
    return quote

async def _validate_customer_for_quote(session: AsyncSession, customer_id: int) -> Customer:
    """Validate customer exists and is not archived for quote operations."""
    customer_res = await session.execute(select(Customer).where(Customer.id == customer_id))
    customer = customer_res.scalar_one_or_none()
    if not customer:
        raise HTTPException(404, f"Customer {customer_id} not found")
    if customer.archived:
        raise HTTPException(400, "Cannot use archived customer for quotes")
    return customer

def _generate_quotation_number(quote: Quote):
    """Generate quotation number if not already set."""
    if not quote.quotation_number:
        year = datetime.now(timezone.utc).year
        quote.quotation_number = settings.quotation_number_format.format(
            prefix=settings.quotation_prefix,
            year=year,
            id=quote.id
        )

def _validate_discount_against_subtotal(subtotal: Decimal, discount_type: str, discount_value: Decimal):
    """Validate that discount doesn't cause negative subtotal."""
    if discount_type == "fixed" and discount_value > subtotal:
        raise HTTPException(
            400, 
            f"Fixed discount ({discount_value}) cannot exceed subtotal ({subtotal}). "
            f"Maximum allowed discount is {subtotal}."
        )
    # For percentage discounts, the validation already happens in validators.py (0-100%)

async def _build_quote_item(session: AsyncSession, quote_id: int, item: QuoteItemIn) -> QuoteItem:
    """Build a QuoteItem from QuoteItemIn, validating product if provided."""
    quantity = item.quantity or Decimal("1")
    unit_price = item.unit_price
    vat_rate = item.vat_rate
    description = item.description

    if item.product_id is not None:
        pres = await session.execute(select(Product).where(Product.id == item.product_id))
        product = pres.scalar_one_or_none()
        if not product:
            raise HTTPException(400, f"Product {item.product_id} not found")
        _validate_product_for_quote_item(session, item.product_id, product)
        unit_price = unit_price if unit_price is not None else product.unit_price
        vat_rate = vat_rate if vat_rate is not None else product.vat_rate
        description = description or product.name

    unit_price = unit_price if unit_price is not None else Decimal("0")
    vat_rate = vat_rate if vat_rate is not None else Decimal("0")
    line_total = (quantity or Decimal("1")) * unit_price
    line_total_vat = (line_total * vat_rate) / Decimal("100")

    return QuoteItem(
        quote_id=quote_id,
        product_id=item.product_id,
        description=description or "",
        quantity=quantity,
        unit_price=unit_price,
        vat_rate=vat_rate,
        line_total=line_total,
        line_total_vat=line_total_vat,
    )

def _totals_for_items(items: list[QuoteItem], discount_type: str = "none", discount_value: Decimal = Decimal("0")) -> tuple[Decimal, Decimal, Decimal]:
    subtotal = Decimal("0")
    total_vat = Decimal("0")
    for it in items:
        subtotal += it.line_total or Decimal("0")
        total_vat += it.line_total_vat or Decimal("0")
    
    # Calculate discount
    discount_amount = Decimal("0")
    if discount_type == "percentage" and discount_value > 0:
        discount_amount = subtotal * (discount_value / Decimal("100"))
    elif discount_type == "fixed" and discount_value > 0:
        # Ensure fixed discount doesn't exceed subtotal (prevent negative totals)
        discount_amount = min(discount_value, subtotal)
    
    # Apply discount to subtotal before VAT calculation
    # Ensure discounted_subtotal never goes negative
    discounted_subtotal = max(Decimal("0"), subtotal - discount_amount)
    
    # Recalculate VAT proportionally based on discounted subtotal
    if subtotal > 0:
        total_vat = discounted_subtotal * (total_vat / subtotal)
    else:
        total_vat = Decimal("0")
    
    total = discounted_subtotal + total_vat
    
    return subtotal, total_vat, total

@router.get("", response_model=list[QuoteRead])
async def list_quotes(
    include_deleted: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    """
    List all quotes with pagination support.
    
    Args:
        include_deleted: Include soft-deleted quotes in results
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return (1-100)
    
    Returns:
        List of quotes with pagination applied
    """
    from sqlalchemy.orm import selectinload
    stmt = select(Quote).options(selectinload(Quote.customer), selectinload(Quote.items).selectinload(QuoteItem.product))
    
    if not include_deleted:
        stmt = stmt.where(Quote.deleted == False)
    
    stmt = stmt.order_by(Quote.id.desc())
    
    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)
    
    res = await session.execute(stmt)
    quotes = res.scalars().unique().all()
    
    # Populate customer and product info for display
    for quote in quotes:
        _populate_quote_display_fields(quote)
    
    # Populate created_by_name
    await _populate_quote_created_by_name(session, list(quotes))
    
    return quotes

@router.get("/deleted", response_model=list[QuoteRead])
async def list_deleted_quotes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin_role),
):
    """
    List deleted quotes with pagination support (Admin only).
    
    Args:
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return (1-100)
    
    Returns:
        List of deleted quotes with pagination applied
    """
    from sqlalchemy.orm import selectinload
    stmt = (
        select(Quote)
        .options(selectinload(Quote.customer), selectinload(Quote.items).selectinload(QuoteItem.product))
        .where(Quote.deleted == True)
        .order_by(Quote.deleted_at.desc())
    )
    
    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)
    
    res = await session.execute(stmt)
    quotes = res.scalars().unique().all()
    
    # Populate customer and product info for display
    for quote in quotes:
        _populate_quote_display_fields(quote)
    
    # Populate created_by_name
    await _populate_quote_created_by_name(session, list(quotes))
    
    return quotes

@router.get("/{quote_id}", response_model=QuoteRead)
async def get_quote(
    quote_id: int, 
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    from sqlalchemy.orm import selectinload
    res = await session.execute(
        select(Quote)
        .options(selectinload(Quote.customer), selectinload(Quote.items).selectinload(QuoteItem.product))
        .where(Quote.id == quote_id)
    )
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(404, "Quote not found")
    _populate_quote_display_fields(quote)
    
    # Populate created_by_name
    await _populate_quote_created_by_name(session, [quote])
    
    return quote

@router.post("", response_model=QuoteRead, status_code=201)
async def create_quote(
    payload: QuoteCreate, 
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    # Validate customer exists and is not archived
    await _validate_customer_for_quote(session, payload.customer_id)
    
    quote = Quote(
        customer_id=payload.customer_id,
        status=payload.status or "draft",
        notes=payload.notes,
        quotation_number=payload.quotation_number,
        valid_until=payload.valid_until,
        terms_and_conditions=payload.terms_and_conditions,
        discount_type=payload.discount_type or "none",
        discount_value=payload.discount_value or Decimal("0"),
        created_by=user_id,
    )
    session.add(quote)
    await session.flush()

    built_items: list[QuoteItem] = []
    for item in payload.items or []:
        built_items.append(await _build_quote_item(session, quote.id, item))

    # Add items to session instead of assigning to relationship
    for item in built_items:
        session.add(item)
    
    # Calculate subtotal first to validate discount
    temp_subtotal = sum(item.line_total or Decimal("0") for item in built_items)
    
    # Validate discount doesn't exceed subtotal
    _validate_discount_against_subtotal(temp_subtotal, quote.discount_type, quote.discount_value)
    
    quote.subtotal, quote.total_vat, quote.total = _totals_for_items(built_items, quote.discount_type, quote.discount_value)
    _generate_quotation_number(quote)
    await session.flush()
    
    # Commit first, then refresh with relationships loaded
    await session.commit()
    
    # Now reload with relationships using selectinload
    from sqlalchemy.orm import selectinload
    res = await session.execute(
        select(Quote)
        .options(selectinload(Quote.customer), selectinload(Quote.items).selectinload(QuoteItem.product))
        .where(Quote.id == quote.id)
    )
    quote = res.scalar_one()
    
    # Populate display fields (now customer and items are loaded)
    _populate_quote_display_fields(quote)
    
    # Populate created_by_name
    if quote.created_by:
        user_res = await session.execute(select(User).where(User.id == quote.created_by))
        user = user_res.scalar_one_or_none()
        if user:
            quote.created_by_name = user.full_name
    
    return quote

@router.put("/{quote_id}", response_model=QuoteRead)
async def update_quote(
    quote_id: int, 
    payload: QuoteUpdate, 
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    quote = await _get_quote_or_404(session, quote_id)
    if quote.deleted:
        raise HTTPException(400, "Cannot update deleted quote")
    if quote.is_archived:
        raise HTTPException(400, "Cannot update archived quote")
    
    # Validate customer exists if being updated
    if payload.customer_id is not None:
        await _validate_customer_for_quote(session, payload.customer_id)

    header = payload.model_dump(exclude_unset=True, exclude={"items"})
    for k, v in header.items():
        setattr(quote, k, v)

    if payload.items is not None:
        quote.items.clear()
        built_items: list[QuoteItem] = []
        for item in payload.items:
            built_items.append(await _build_quote_item(session, quote.id, item))

        # Add items to session instead of assigning to relationship
        for item in built_items:
            session.add(item)
        
        # Calculate subtotal first to validate discount
        temp_subtotal = sum(item.line_total or Decimal("0") for item in built_items)
        
        # Get current discount values (use updated values if provided, otherwise existing)
        current_discount_type = quote.discount_type
        current_discount_value = quote.discount_value
        
        # Validate discount doesn't exceed subtotal
        _validate_discount_against_subtotal(temp_subtotal, current_discount_type, current_discount_value)
        
        quote.subtotal, quote.total_vat, quote.total = _totals_for_items(built_items, current_discount_type, current_discount_value)
    else:
        # Recalculate totals even if items weren't updated (discount might have changed)
        # Get current discount values (use updated values if provided, otherwise existing)
        current_discount_type = quote.discount_type
        current_discount_value = quote.discount_value
        
        # Calculate subtotal from existing items
        temp_subtotal = sum(item.line_total or Decimal("0") for item in quote.items)
        
        # Validate discount doesn't exceed subtotal
        _validate_discount_against_subtotal(temp_subtotal, current_discount_type, current_discount_value)
        
        quote.subtotal, quote.total_vat, quote.total = _totals_for_items(quote.items, current_discount_type, current_discount_value)
    
    _generate_quotation_number(quote)
    return await _commit_and_refresh(session, quote)

@router.delete("/{quote_id}", response_model=QuoteRead)
async def delete_quote(
    quote_id: int, 
    session: AsyncSession = Depends(get_session), 
    _: User = Depends(require_admin_role),
):
    quote = await _get_quote_or_404(session, quote_id)
    if quote.deleted:
        raise HTTPException(400, "Quote already deleted")
    if quote.status == "confirmed":
        raise HTTPException(400, "Cannot delete confirmed quote")
    
    # Soft delete
    quote.deleted = True
    quote.deleted_at = datetime.now(timezone.utc)
    return await _commit_and_refresh(session, quote)

@router.post("/{quote_id}/restore", response_model=QuoteRead)
async def restore_quote(
    quote_id: int, 
    session: AsyncSession = Depends(get_session), 
    _: User = Depends(require_admin_role),
):
    quote = await _get_quote_or_404(session, quote_id)
    if not quote.deleted:
        raise HTTPException(400, "Quote is not deleted")
    
    # Restore quote
    quote.deleted = False
    quote.deleted_at = None
    return await _commit_and_refresh(session, quote)