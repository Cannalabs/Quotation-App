from config import settings as app_settings
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db import get_session
from models import CompanySettings
from schemas import CompanySettingsRead, CompanySettingsUpdate

router = APIRouter(prefix="/api/company-settings", tags=["CompanySettings"])

@router.get("", response_model=CompanySettingsRead)
async def get_company_settings(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(CompanySettings).limit(1))
    company_settings = result.scalars().first()
    if not company_settings:
        company_settings = CompanySettings(company_name=app_settings.default_company_name, default_vat_rate=app_settings.default_vat_rate)
        session.add(company_settings)
        await session.commit()
        await session.refresh(company_settings)
        # replaced: settings = company_settings
    return company_settings

@router.put("", response_model=CompanySettingsRead)
async def update_company_settings(payload: CompanySettingsUpdate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(CompanySettings).limit(1))
    company_settings = result.scalars().first()
    if not company_settings:
        company_settings = CompanySettings(company_name=app_settings.default_company_name)
        session.add(company_settings)
        await session.flush()

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company_settings, field, value)

    await session.commit()
    await session.refresh(company_settings)
    return company_settings