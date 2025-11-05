"""
Authentication and authorization utilities
"""
from fastapi import HTTPException, Depends, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db import get_session
from models import User
from config import settings

# Security scheme for JWT tokens
security = HTTPBearer()

def create_access_token(data: dict) -> str:
    """
    Create a JWT access token with user data.
    
    Args:
        data: Dictionary containing user information (typically user_id, email, role)
    
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_session)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    Raises 401 Unauthorized if token is invalid or user doesn't exist.
    
    Args:
        credentials: HTTPBearer credentials containing the JWT token
        session: Database session
    
    Returns:
        User object from database
    
    Raises:
        HTTPException: 401 if authentication fails
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        # Convert string back to int for database lookup
        try:
            user_id: int = int(user_id_str)
        except (ValueError, TypeError):
            raise credentials_exception
    except JWTError as e:
        # Log the error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"JWT validation failed: {str(e)}")
        raise credentials_exception
    
    # Fetch user from database
    result = await session.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    session: AsyncSession = Depends(get_session)
) -> Optional[User]:
    """
    Optional dependency to get the current authenticated user.
    Returns None if no token is provided or token is invalid.
    Useful for endpoints that work with or without authentication.
    
    Args:
        credentials: Optional HTTPBearer credentials
        session: Database session
    
    Returns:
        User object if authenticated, None otherwise
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            return None
        # Convert string back to int for database lookup
        try:
            user_id: int = int(user_id_str)
        except (ValueError, TypeError):
            return None
    except JWTError:
        return None
    
    # Fetch user from database
    result = await session.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    
    return user

def get_current_user_id(user: User = Depends(get_current_user)) -> int:
    """
    Dependency to get the current user ID from authenticated user.
    This replaces the old X-User-Id header approach.
    
    Args:
        user: Current authenticated user
    
    Returns:
        User ID as integer
    """
    return user.id

def get_current_user_role(user: User = Depends(get_current_user)) -> str:
    """
    Dependency to get the current user's role from authenticated user.
    
    Args:
        user: Current authenticated user
    
    Returns:
        User role as string
    """
    return user.role

def require_admin_role(user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require admin role for protected endpoints.
    Raises 403 Forbidden if user is not an admin.
    
    Args:
        user: Current authenticated user
    
    Returns:
        User object if admin
    
    Raises:
        HTTPException: 403 if user is not admin
    """
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required for this operation"
        )
    return user
