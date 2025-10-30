from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from datetime import datetime
from db import get_session
from models import Product
from schemas import ProductCreate, ProductRead, ProductUpdate
from auth import require_admin_role

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("", response_model=list[ProductRead])
async def list_products(q: str | None = Query(None), skip: int = 0, limit: int = 50, include_deleted: bool = False, session: AsyncSession = Depends(get_session)):
    stmt = select(Product).offset(skip).limit(limit)
    if not include_deleted:
        stmt = stmt.where(Product.deleted == False)
    if q:
        like = f"%{q}%"
        stmt = select(Product).where(
            or_(Product.name.ilike(like), Product.sku.ilike(like), Product.category.ilike(like))
        ).offset(skip).limit(limit)
        if not include_deleted:
            stmt = stmt.where(Product.deleted == False)
    res = await session.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=ProductRead, status_code=201)
async def create_product(payload: ProductCreate, session: AsyncSession = Depends(get_session)):
    product = Product(**payload.model_dump(exclude_unset=True))
    session.add(product)
    await session.commit()
    await session.refresh(product)
    return product

@router.get("/deleted", response_model=list[ProductRead])
async def list_deleted_products(session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Product).where(Product.deleted == True).order_by(Product.deleted_at.desc()))
    return res.scalars().all()

@router.get("/{product_id}", response_model=ProductRead)
async def get_product(product_id: int, session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Product).where(Product.id == product_id))
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    return product

@router.put("/{product_id}", response_model=ProductRead)
async def update_product(product_id: int, payload: ProductUpdate, session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Product).where(Product.id == product_id))
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(product, k, v)
    await session.commit()
    await session.refresh(product)
    return product

@router.delete("/{product_id}", response_model=ProductRead)
async def delete_product(product_id: int, session: AsyncSession = Depends(get_session), _: str = Depends(require_admin_role)):
    res = await session.execute(select(Product).where(Product.id == product_id))
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    if product.deleted:
        raise HTTPException(400, "Product already deleted")
    
    # Soft delete
    product.deleted = True
    product.deleted_at = datetime.utcnow()
    await session.commit()
    await session.refresh(product)
    return product

@router.post("/{product_id}/restore", response_model=ProductRead)
async def restore_product(product_id: int, session: AsyncSession = Depends(get_session), _: str = Depends(require_admin_role)):
    res = await session.execute(select(Product).where(Product.id == product_id))
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    if not product.deleted:
        raise HTTPException(400, "Product is not deleted")
    
    # Restore product
    product.deleted = False
    product.deleted_at = None
    await session.commit()
    await session.refresh(product)
    return product