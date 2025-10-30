from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db import get_session
from models import CompanySettings
from schemas import CompanySettingsRead, CompanySettingsUpdate
from config import settings

router = APIRouter(prefix="/api/company-settings", tags=["CompanySettings"])

@router.get("", response_model=CompanySettingsRead)
async def get_company_settings(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(CompanySettings).limit(1))
    settings = result.scalars().first()
    if not settings:
        company_settings = CompanySettings(company_name=settings.default_company_name, default_vat_rate=settings.default_vat_rate)
        session.add(company_settings)
        await session.commit()
        await session.refresh(company_settings)
        settings = company_settings
    return settings

@router.put("", response_model=CompanySettingsRead)
async def update_company_settings(payload: CompanySettingsUpdate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(CompanySettings).limit(1))
    settings = result.scalars().first()
    if not settings:
        settings = CompanySettings(company_name=settings.default_company_name)
        session.add(settings)
        await session.flush()

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)

    await session.commit()
    await session.refresh(settings)
    return settings