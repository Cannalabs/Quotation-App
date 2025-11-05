from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from db import get_session
from models import Customer, Quote, User
from schemas import CustomerCreate, CustomerRead, CustomerUpdate
from auth import get_current_user_id, get_current_user

router = APIRouter(prefix="/api/customers", tags=["Customers"])

async def _commit_and_refresh(session: AsyncSession, obj):
    """Commit session and refresh object."""
    await session.commit()
    await session.refresh(obj)
    return obj

async def _get_customer_or_404(session: AsyncSession, customer_id: int) -> Customer:
    """Get customer by ID or raise 404."""
    res = await session.execute(select(Customer).where(Customer.id == customer_id))
    customer = res.scalar_one_or_none()
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer

def _normalize_customer_data(data: dict) -> dict:
    """Normalize customer data: handle tax_id -> vat_number mapping."""
    if "vat_number" not in data and data.get("tax_id"):
        data["vat_number"] = data["tax_id"]
    data.pop("tax_id", None)
    return data

async def _validate_customer_deletion(session: AsyncSession, customer_id: int):
    """Validate that customer can be deleted (no active quotes)."""
    quote_res = await session.execute(
        select(Quote).where(Quote.customer_id == customer_id, Quote.deleted == False)
    )
    quotes = quote_res.scalars().all()
    if quotes:
        quote_count = len(quotes)
        raise HTTPException(
            400, 
            f"Cannot delete customer with {quote_count} active quote(s). Archive or delete the quotes first."
        )

async def _populate_created_by_name(session: AsyncSession, customers: list[Customer]) -> None:
    """Populate created_by_name for customers."""
    created_by_ids = {c.created_by for c in customers if c.created_by}
    if not created_by_ids:
        return
    
    user_res = await session.execute(select(User).where(User.id.in_(created_by_ids)))
    users = {u.id: u.full_name for u in user_res.scalars().all()}
    
    for customer in customers:
        if customer.created_by:
            customer.created_by_name = users.get(customer.created_by)

@router.get("", response_model=list[CustomerRead])
async def list_customers(
    q: str | None = Query(None),
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    stmt = select(Customer).where(Customer.archived == False)
    
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Customer.name.ilike(like), Customer.email.ilike(like), Customer.phone.ilike(like)))
    
    stmt = stmt.offset(skip).limit(limit)
    res = await session.execute(stmt)
    customers = res.scalars().all()
    
    # Populate created_by_name
    await _populate_created_by_name(session, list(customers))
    
    return customers

@router.post("", response_model=CustomerRead, status_code=201)
async def create_customer(
    payload: CustomerCreate, 
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    data = _normalize_customer_data(payload.model_dump(exclude_unset=True))
    if user_id:
        data["created_by"] = user_id
    customer = Customer(**data)
    session.add(customer)
    await session.flush()
    
    # Populate created_by_name
    if customer.created_by:
        user_res = await session.execute(select(User).where(User.id == customer.created_by))
        user = user_res.scalar_one_or_none()
        if user:
            customer.created_by_name = user.full_name
    
    return await _commit_and_refresh(session, customer)

@router.get("/{customer_id}", response_model=CustomerRead)
async def get_customer(
    customer_id: int, 
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    customer = await _get_customer_or_404(session, customer_id)
    
    # Populate created_by_name
    await _populate_created_by_name(session, [customer])
    
    return customer

@router.put("/{customer_id}", response_model=CustomerRead)
async def update_customer(
    customer_id: int, 
    payload: CustomerUpdate, 
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    customer = await _get_customer_or_404(session, customer_id)
    data = _normalize_customer_data(payload.model_dump(exclude_unset=True))
    
    for k, v in data.items():
        setattr(customer, k, v)
    return await _commit_and_refresh(session, customer)

@router.delete("/{customer_id}", response_model=CustomerRead)
async def delete_customer(
    customer_id: int, 
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    customer = await _get_customer_or_404(session, customer_id)
    await _validate_customer_deletion(session, customer_id)
    
    await session.delete(customer)
    await session.commit()
    return customer