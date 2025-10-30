from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from db import get_session
from models import User
from schemas import UserCreate, UserUpdate, UserRead, UserPasswordUpdate, hash_password, verify_password
from auth import require_admin_role

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=List[UserRead])
async def list_users(
    q: str | None = Query(None),
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
):
    """List all users with optional search"""
    stmt = select(User).where(User.is_active == True).offset(skip).limit(limit)
    
    if q:
        like = f"%{q}%"
        stmt = select(User).where(
            User.is_active == True,
            (User.full_name.ilike(like) | User.email.ilike(like) | User.role.ilike(like))
        ).offset(skip).limit(limit)
    
    result = await session.execute(stmt)
    users = result.scalars().all()
    
    return users

@router.get("/deleted", response_model=List[UserRead])
async def list_deleted_users(
    session: AsyncSession = Depends(get_session),
):
    """List all deleted users (is_active = False)"""
    stmt = select(User).where(User.is_active == False)
    result = await session.execute(stmt)
    users = result.scalars().all()
    
    return users

@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
):
    """Get a specific user by ID"""
    stmt = select(User).where(User.id == user_id, User.is_active == True)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@router.post("", response_model=UserRead)
async def create_user(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_session),
    _: str = Depends(require_admin_role)
):
    """Create a new user"""
    # Check if email already exists
    existing_user = await session.execute(
        select(User).where(User.email == user_data.email)
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create new user
    user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        role=user_data.role,
        profile_picture_url=user_data.profile_picture_url,
        password_hash=hash_password(user_data.password)
    )
    
    session.add(user)
    
    try:
        await session.commit()
        await session.refresh(user)
        
        return user
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")

@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update an existing user"""
    # Get existing user
    stmt = select(User).where(User.id == user_id, User.is_active == True)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email already exists (excluding current user)
    if user_data.email and user_data.email != user.email:
        existing_user = await session.execute(
            select(User).where(User.email == user_data.email, User.id != user_id)
        )
        if existing_user.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already exists")
    
    # Update user fields
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    try:
        await session.commit()
        await session.refresh(user)
        
        return user
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    _: str = Depends(require_admin_role)
):
    """Soft delete a user (set is_active to False)"""
    # Get existing user
    stmt = select(User).where(User.id == user_id, User.is_active == True)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Soft delete by setting is_active to False
    user.is_active = False
    await session.commit()
    
    return {"message": "User deleted successfully"}


@router.post("/{user_id}/restore", response_model=UserRead)
async def restore_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    _: str = Depends(require_admin_role)
):
    """Restore a deleted user (set is_active to True)"""
    # Get deleted user
    stmt = select(User).where(User.id == user_id, User.is_active == False)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Deleted user not found")
    
    # Restore user
    user.is_active = True
    await session.commit()
    await session.refresh(user)
    
    return user

@router.post("/{user_id}/change-password", response_model=dict)
async def change_password(
    user_id: int,
    password_data: UserPasswordUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Change user password"""
    # Get existing user
    stmt = select(User).where(User.id == user_id, User.is_active == True)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(password_data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    user.password_hash = hash_password(password_data.new_password)
    await session.commit()
    
    return {"message": "Password updated successfully"}

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/verify-login", response_model=UserRead)
async def verify_login(
    login_data: LoginRequest,
    session: AsyncSession = Depends(get_session),
):
    """Verify user login credentials"""
    # Find user by email
    stmt = select(User).where(User.email == login_data.email, User.is_active == True)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        # Return 401 without logging - this is expected behavior for invalid credentials
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        # Return 401 without logging - this is expected behavior for invalid credentials
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return user
