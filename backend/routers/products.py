from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from datetime import datetime, timezone
from db import get_session
from models import Product, User
from schemas import ProductCreate, ProductRead, ProductUpdate
from auth import require_admin_role, get_current_user_id, get_current_user

router = APIRouter(prefix="/api/products", tags=["Products"])

async def _commit_and_refresh(session: AsyncSession, obj):
    """Commit session and refresh object."""
    await session.commit()
    await session.refresh(obj)
    return obj

async def _get_product_or_404(session: AsyncSession, product_id: int) -> Product:
    """Get product by ID or raise 404."""
    res = await session.execute(select(Product).where(Product.id == product_id))
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    return product

async def _soft_delete_product(session: AsyncSession, product: Product) -> Product:
    """Soft delete a product."""
    if product.deleted:
        raise HTTPException(400, "Product already deleted")
    product.deleted = True
    product.deleted_at = datetime.now(timezone.utc)
    return await _commit_and_refresh(session, product)

async def _restore_product(session: AsyncSession, product: Product) -> Product:
    """Restore a soft-deleted product."""
    if not product.deleted:
        raise HTTPException(400, "Product is not deleted")
    product.deleted = False
    product.deleted_at = None
    return await _commit_and_refresh(session, product)

async def _populate_created_by_name(session: AsyncSession, products: list[Product]) -> None:
    """Populate created_by_name for products."""
    created_by_ids = {p.created_by for p in products if p.created_by}
    if not created_by_ids:
        return
    
    user_res = await session.execute(select(User).where(User.id.in_(created_by_ids)))
    users = {u.id: u.full_name for u in user_res.scalars().all()}
    
    for product in products:
        if product.created_by:
            product.created_by_name = users.get(product.created_by)

@router.get("", response_model=list[ProductRead])
async def list_products(
    q: str | None = Query(None), 
    skip: int = 0, 
    limit: int = 50, 
    include_deleted: bool = False, 
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    stmt = select(Product)
    
    # Apply search filter if provided
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like), Product.category.ilike(like)))
    
    # Apply deleted filter
    if not include_deleted:
        stmt = stmt.where(Product.deleted == False)
    
    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)
    
    res = await session.execute(stmt)
    products = res.scalars().all()
    
    # Populate created_by_name
    await _populate_created_by_name(session, list(products))
    
    return products

@router.post("", response_model=ProductRead, status_code=201)
async def create_product(
    payload: ProductCreate, 
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    data = payload.model_dump(exclude_unset=True)
    if user_id:
        data["created_by"] = user_id
    product = Product(**data)
    session.add(product)
    await session.flush()
    
    # Populate created_by_name
    if product.created_by:
        user_res = await session.execute(select(User).where(User.id == product.created_by))
        user = user_res.scalar_one_or_none()
        if user:
            product.created_by_name = user.full_name
    
    return await _commit_and_refresh(session, product)

@router.get("/deleted", response_model=list[ProductRead])
async def list_deleted_products(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin_role),
):
    res = await session.execute(select(Product).where(Product.deleted == True).order_by(Product.deleted_at.desc()))
    products = res.scalars().all()
    
    # Populate created_by_name
    await _populate_created_by_name(session, list(products))
    
    return products

@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: int, 
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    product = await _get_product_or_404(session, product_id)
    
    # Populate created_by_name
    await _populate_created_by_name(session, [product])
    
    return product

@router.put("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: int, 
    payload: ProductUpdate, 
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    product = await _get_product_or_404(session, product_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(product, k, v)
    return await _commit_and_refresh(session, product)

@router.delete("/{product_id}", response_model=ProductRead)
async def delete_product(
    product_id: int, 
    session: AsyncSession = Depends(get_session), 
    _: User = Depends(require_admin_role),
):
    product = await _get_product_or_404(session, product_id)
    return await _soft_delete_product(session, product)

@router.post("/{product_id}/restore", response_model=ProductRead)
async def restore_product(
    product_id: int, 
    session: AsyncSession = Depends(get_session), 
    _: User = Depends(require_admin_role),
):
    product = await _get_product_or_404(session, product_id)
    return await _restore_product(session, product)