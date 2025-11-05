from config import settings as app_settings
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db import get_session
from models import CompanySettings, User
from schemas import CompanySettingsRead, CompanySettingsUpdate
from auth import get_current_user, require_admin_role, get_current_user_optional
from typing import Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/company-settings", tags=["CompanySettings"])

class CompanyPublicInfo(BaseModel):
    """Public company information - only name and logo for display purposes"""
    company_name: str
    logo_url: Optional[str] = None
    model_config = {"from_attributes": True}

async def _commit_and_refresh(session: AsyncSession, obj):
    """Commit session and refresh object."""
    await session.commit()
    await session.refresh(obj)
    return obj

async def _get_or_create_company_settings(session: AsyncSession) -> CompanySettings:
    """Get existing company settings or create default one."""
    result = await session.execute(select(CompanySettings).limit(1))
    company_settings = result.scalars().first()
    if not company_settings:
        company_settings = CompanySettings(
            company_name=app_settings.default_company_name,
            default_vat_rate=app_settings.default_vat_rate
        )
        session.add(company_settings)
        await _commit_and_refresh(session, company_settings)
    return company_settings

@router.get("", response_model=CompanySettingsRead)
async def get_company_settings(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin_role),
):
    """
    Get company settings. Requires admin authentication to protect sensitive information
    like bank details, IBAN, account numbers, etc.
    """
    return await _get_or_create_company_settings(session)

@router.get("/public", response_model=CompanyPublicInfo)
async def get_company_public_info(
    session: AsyncSession = Depends(get_session),
):
    """
    Get public company information (name and logo only).
    This endpoint is publicly accessible for login page and other public views.
    Does not expose sensitive information like bank details, IBAN, etc.
    """
    settings = await _get_or_create_company_settings(session)
    return CompanyPublicInfo(
        company_name=settings.company_name,
        logo_url=settings.logo_url
    )

@router.put("", response_model=CompanySettingsRead)
async def update_company_settings(
    payload: CompanySettingsUpdate, 
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin_role),
):
    company_settings = await _get_or_create_company_settings(session)
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company_settings, field, value)

    return await _commit_and_refresh(session, company_settings)