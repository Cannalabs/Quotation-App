from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
import logging

from db import get_session
from models import User
from schemas import UserCreate, UserUpdate, UserRead, UserPasswordUpdate, AdminPasswordReset, ForgotPasswordRequest, hash_password, verify_password
from auth import require_admin_role, create_access_token, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/users", tags=["users"])

async def _commit_and_refresh(session: AsyncSession, obj):
    """Commit session and refresh object."""
    await session.commit()
    await session.refresh(obj)
    return obj

async def _get_user_or_404(session: AsyncSession, user_id: int, active_only: bool = True) -> User:
    """Get user by ID or raise 404."""
    stmt = select(User).where(User.id == user_id)
    if active_only:
        stmt = stmt.where(User.is_active == True)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def _check_email_exists(session: AsyncSession, email: str, exclude_user_id: int | None = None) -> bool:
    """Check if email already exists (optionally excluding a user ID)."""
    stmt = select(User).where(User.email == email)
    if exclude_user_id is not None:
        stmt = stmt.where(User.id != exclude_user_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None

@router.get("", response_model=List[UserRead])
async def list_users(
    q: str | None = Query(None),
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    """List all users with optional search"""
    stmt = select(User).where(User.is_active == True)
    
    if q:
        like = f"%{q}%"
        stmt = stmt.where(User.full_name.ilike(like) | User.email.ilike(like) | User.role.ilike(like))
    
    stmt = stmt.offset(skip).limit(limit)
    result = await session.execute(stmt)
    return result.scalars().all()

@router.get("/deleted", response_model=List[UserRead])
async def list_deleted_users(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin_role),
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
    current_user: User = Depends(get_current_user),
):
    """Get a specific user by ID"""
    user = await _get_user_or_404(session, user_id, active_only=True)
    
    # Non-admin users can only access their own profile
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only access your own profile")
    
    return user

@router.post("", response_model=UserRead)
async def create_user(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_session),
    _: str = Depends(require_admin_role)
):
    """Create a new user"""
    # Check if email already exists
    if await _check_email_exists(session, user_data.email):
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
        return await _commit_and_refresh(session, user)
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")

@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an existing user"""
    user = await _get_user_or_404(session, user_id, active_only=True)
    
    # Non-admin users can only update their own profile
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only update your own profile")
    
    # Non-admin users cannot change their role or is_active status
    if current_user.role != "admin":
        if user_data.role is not None or user_data.is_active is not None:
            raise HTTPException(status_code=403, detail="You cannot change role or active status")
    
    # Check if email already exists (excluding current user)
    if user_data.email and user_data.email != user.email:
        if await _check_email_exists(session, user_data.email, exclude_user_id=user_id):
            raise HTTPException(status_code=400, detail="Email already exists")
    
    # Update user fields
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    try:
        return await _commit_and_refresh(session, user)
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
    user = await _get_user_or_404(session, user_id, active_only=True)
    
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
    user = await _get_user_or_404(session, user_id, active_only=False)
    
    if user.is_active:
        raise HTTPException(status_code=400, detail="User is not deleted")
    
    # Restore user
    user.is_active = True
    return await _commit_and_refresh(session, user)

@router.post("/{user_id}/change-password", response_model=dict)
async def change_password(
    user_id: int,
    password_data: UserPasswordUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Change user password (requires current password)"""
    user = await _get_user_or_404(session, user_id, active_only=True)
    
    # Non-admin users can only change their own password
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only change your own password")
    
    # Verify current password
    if not verify_password(password_data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    user.password_hash = hash_password(password_data.new_password)
    await session.commit()
    
    return {"message": "Password updated successfully"}

@router.post("/{user_id}/reset-password", response_model=dict)
async def admin_reset_password(
    user_id: int,
    password_data: AdminPasswordReset,
    session: AsyncSession = Depends(get_session),
    _: str = Depends(require_admin_role)
):
    """Admin endpoint to reset any user's password (does not require current password)"""
    user = await _get_user_or_404(session, user_id, active_only=False)
    
    # Update password (admin doesn't need to know current password)
    user.password_hash = hash_password(password_data.new_password)
    await session.commit()
    
    return {"message": f"Password has been reset for user {user.email}"}

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/verify-login")
async def verify_login(
    login_data: LoginRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Verify user login credentials and return JWT access token.
    
    Returns:
        {
            "access_token": "jwt_token_string",
            "token_type": "bearer",
            "user": UserRead
        }
    """
    # Find user by email
    stmt = select(User).where(User.email == login_data.email, User.is_active == True)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    # Check if user exists
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user has a password_hash set
    if not user.password_hash:
        logger.warning(f"Login attempt for user {user.email} but password_hash is not set")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create JWT access token
    # JWT 'sub' (subject) must be a string according to JWT spec
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
    
    # Convert user to UserRead schema to exclude password_hash
    user_read = UserRead.model_validate(user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_read
    }

@router.post("/forgot-password", response_model=dict)
async def forgot_password(
    request: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_session),
):
    """Handle forgot password request - returns message to contact administrator"""
    # Always return the same message regardless of whether user exists
    # This prevents email enumeration attacks
    return {
        "message": "Please contact your administrator to reset your password.",
        "contact_admin": True
    }
