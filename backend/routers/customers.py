from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from db import get_session
from models import Customer
from schemas import CustomerCreate, CustomerRead, CustomerUpdate

router = APIRouter(prefix="/api/customers", tags=["Customers"])

@router.get("", response_model=list[CustomerRead])
async def list_customers(
    q: str | None = Query(None),
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Customer).where(Customer.archived == False).offset(skip).limit(limit)
    if q:
        like = f"%{q}%"
        stmt = select(Customer).where(
            Customer.archived == False,
            or_(Customer.name.ilike(like), Customer.email.ilike(like), Customer.phone.ilike(like))
        ).offset(skip).limit(limit)
    res = await session.execute(stmt)
    customers = res.scalars().all()
    
    # created_date is automatically populated by the property in the model
    
    return customers

@router.post("", response_model=CustomerRead, status_code=201)
async def create_customer(payload: CustomerCreate, session: AsyncSession = Depends(get_session)):
    data = payload.model_dump(exclude_unset=True)
    if "vat_number" not in data and data.get("tax_id"):
        data["vat_number"] = data["tax_id"]
    data.pop("tax_id", None)

    customer = Customer(**data)
    session.add(customer)
    await session.commit()
    await session.refresh(customer)
    
    # created_date is automatically populated by the property in the model
    
    return customer

@router.get("/{customer_id}", response_model=CustomerRead)
async def get_customer(customer_id: int, session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Customer).where(Customer.id == customer_id))
    customer = res.scalar_one_or_none()
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    # created_date is automatically populated by the property in the model
    
    return customer

@router.put("/{customer_id}", response_model=CustomerRead)
async def update_customer(customer_id: int, payload: CustomerUpdate, session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Customer).where(Customer.id == customer_id))
    customer = res.scalar_one_or_none()
    if not customer:
        raise HTTPException(404, "Customer not found")

    data = payload.model_dump(exclude_unset=True)
    if "vat_number" not in data and data.get("tax_id"):
        data["vat_number"] = data["tax_id"]
    data.pop("tax_id", None)

    for k, v in data.items():
        setattr(customer, k, v)
    await session.commit()
    await session.refresh(customer)
    
    # created_date is automatically populated by the property in the model
    
    return customer

@router.delete("/{customer_id}", response_model=CustomerRead)
async def delete_customer(customer_id: int, session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Customer).where(Customer.id == customer_id))
    customer = res.scalar_one_or_none()
    if not customer:
        raise HTTPException(404, "Customer not found")
    await session.delete(customer)
    await session.commit()
    return customer