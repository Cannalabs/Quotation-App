from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db import get_session
from models import Quote, QuoteItem, Product
from schemas import QuoteCreate, QuoteRead, QuoteUpdate
from config import settings
from auth import require_admin_role

router = APIRouter(prefix="/api/quotes", tags=["Quotes"])

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
        discount_amount = discount_value
    
    # Apply discount to subtotal before VAT calculation
    discounted_subtotal = subtotal - discount_amount
    total_vat = discounted_subtotal * (total_vat / subtotal) if subtotal > 0 else Decimal("0")
    total = discounted_subtotal + total_vat
    
    return subtotal, total_vat, total

@router.get("", response_model=list[QuoteRead])
async def list_quotes(include_deleted: bool = False, session: AsyncSession = Depends(get_session)):
    from sqlalchemy.orm import selectinload
    stmt = select(Quote).options(selectinload(Quote.customer), selectinload(Quote.items).selectinload(QuoteItem.product))
    
    if not include_deleted:
        stmt = stmt.where(Quote.deleted == False)
    
    stmt = stmt.order_by(Quote.id.desc())
    res = await session.execute(stmt)
    quotes = res.scalars().unique().all()
    
    # Populate customer and product info for display
    for quote in quotes:
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
    
    return quotes

@router.get("/deleted", response_model=list[QuoteRead])
async def list_deleted_quotes(session: AsyncSession = Depends(get_session)):
    from sqlalchemy.orm import selectinload
    res = await session.execute(
        select(Quote)
        .options(selectinload(Quote.customer), selectinload(Quote.items).selectinload(QuoteItem.product))
        .where(Quote.deleted == True)
        .order_by(Quote.deleted_at.desc())
    )
    quotes = res.scalars().unique().all()
    
    # Populate customer and product info for display
    for quote in quotes:
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
    
    return quotes

@router.get("/{quote_id}", response_model=QuoteRead)
async def get_quote(quote_id: int, session: AsyncSession = Depends(get_session)):
    from sqlalchemy.orm import selectinload
    res = await session.execute(
        select(Quote)
        .options(selectinload(Quote.customer), selectinload(Quote.items).selectinload(QuoteItem.product))
        .where(Quote.id == quote_id)
    )
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(404, "Quote not found")
    
    # Populate customer and product info for display
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
    
    return quote

@router.post("", response_model=QuoteRead, status_code=201)
async def create_quote(payload: QuoteCreate, session: AsyncSession = Depends(get_session)):
    quote = Quote(
        customer_id=payload.customer_id,
        status=payload.status or "draft",
        notes=payload.notes,
        quotation_number=payload.quotation_number,
        valid_until=payload.valid_until,
        terms_and_conditions=payload.terms_and_conditions,
        discount_type=payload.discount_type or "none",
        discount_value=payload.discount_value or Decimal("0"),
    )
    session.add(quote)
    await session.flush()

    built_items: list[QuoteItem] = []
    for item in payload.items or []:
        quantity = item.quantity or Decimal("1")
        unit_price = item.unit_price
        vat_rate = item.vat_rate
        description = item.description

        if item.product_id is not None:
            pres = await session.execute(select(Product).where(Product.id == item.product_id))
            product = pres.scalar_one_or_none()
            if not product:
                raise HTTPException(400, f"Product {item.product_id} not found")
            unit_price = unit_price if unit_price is not None else product.unit_price
            vat_rate = vat_rate if vat_rate is not None else product.vat_rate
            description = description or product.name

        unit_price = unit_price if unit_price is not None else Decimal("0")
        vat_rate = vat_rate if vat_rate is not None else Decimal("0")
        line_total = (quantity or Decimal("1")) * unit_price
        line_total_vat = (line_total * vat_rate) / Decimal("100")

        built_items.append(QuoteItem(
            quote_id=quote.id,
            product_id=item.product_id,
            description=description or "",
            quantity=quantity,
            unit_price=unit_price,
            vat_rate=vat_rate,
            line_total=line_total,
            line_total_vat=line_total_vat,
        ))

    # Add items to session instead of assigning to relationship
    for item in built_items:
        session.add(item)
    
    quote.subtotal, quote.total_vat, quote.total = _totals_for_items(built_items, quote.discount_type, quote.discount_value)

    if not quote.quotation_number:
        year = datetime.utcnow().year
        quote.quotation_number = settings.quotation_number_format.format(
            prefix=settings.quotation_prefix,
            year=year,
            id=quote.id
        )

    await session.commit()
    await session.refresh(quote)
    return quote

@router.put("/{quote_id}", response_model=QuoteRead)
async def update_quote(quote_id: int, payload: QuoteUpdate, session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Quote).where(Quote.id == quote_id))
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(404, "Quote not found")

    header = payload.model_dump(exclude_unset=True, exclude={"items"})
    for k, v in header.items():
        setattr(quote, k, v)

    if payload.items is not None:
        quote.items.clear()
        built_items: list[QuoteItem] = []
        for item in payload.items:
            quantity = item.quantity or Decimal("1")
            unit_price = item.unit_price
            vat_rate = item.vat_rate
            description = item.description

            if item.product_id is not None:
                pres = await session.execute(select(Product).where(Product.id == item.product_id))
                product = pres.scalar_one_or_none()
                if not product:
                    raise HTTPException(400, f"Product {item.product_id} not found")
                unit_price = unit_price if unit_price is not None else product.unit_price
                vat_rate = vat_rate if vat_rate is not None else product.vat_rate
                description = description or product.name

            unit_price = unit_price if unit_price is not None else Decimal("0")
            vat_rate = vat_rate if vat_rate is not None else Decimal("0")
            line_total = (quantity or Decimal("1")) * unit_price
            line_total_vat = (line_total * vat_rate) / Decimal("100")

            built_items.append(QuoteItem(
                quote_id=quote.id,
                product_id=item.product_id,
                description=description or "",
                quantity=quantity,
                unit_price=unit_price,
                vat_rate=vat_rate,
                line_total=line_total,
                line_total_vat=line_total_vat,
            ))

        # Add items to session instead of assigning to relationship
        for item in built_items:
            session.add(item)
        
        quote.subtotal, quote.total_vat, quote.total = _totals_for_items(built_items, quote.discount_type, quote.discount_value)

    if not quote.quotation_number:
        year = datetime.utcnow().year
        quote.quotation_number = settings.quotation_number_format.format(
            prefix=settings.quotation_prefix,
            year=year,
            id=quote.id
        )

    await session.commit()
    await session.refresh(quote)
    return quote

@router.delete("/{quote_id}", response_model=QuoteRead)
async def delete_quote(quote_id: int, session: AsyncSession = Depends(get_session), _: str = Depends(require_admin_role)):
    res = await session.execute(select(Quote).where(Quote.id == quote_id))
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(404, "Quote not found")
    if quote.deleted:
        raise HTTPException(400, "Quote already deleted")
    
    # Soft delete
    quote.deleted = True
    quote.deleted_at = datetime.utcnow()
    await session.commit()
    await session.refresh(quote)
    return quote

@router.post("/{quote_id}/restore", response_model=QuoteRead)
async def restore_quote(quote_id: int, session: AsyncSession = Depends(get_session), _: str = Depends(require_admin_role)):
    res = await session.execute(select(Quote).where(Quote.id == quote_id))
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(404, "Quote not found")
    if not quote.deleted:
        raise HTTPException(400, "Quote is not deleted")
    
    # Restore quote
    quote.deleted = False
    quote.deleted_at = None
    await session.commit()
    await session.refresh(quote)
    return quote