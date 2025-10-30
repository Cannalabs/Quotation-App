import React, { createContext, useContext, useState, useEffect } from 'react';
import { CompanySettings } from '@/api/entities';
import logoImage from '@/assets/logo.png';
import { CONFIG } from '@/config/constants';

const CompanySettingsContext = createContext();

export const useCompanySettings = () => {
  const context = useContext(CompanySettingsContext);
  if (!context) {
    throw new Error('useCompanySettings must be used within a CompanySettingsProvider');
  }
  return context;
};

export const CompanySettingsProvider = ({ children }) => {
  const [companySettings, setCompanySettings] = useState({
    company_name: CONFIG.DEFAULT_COMPANY_NAME,
    address: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postal_code: "",
    country: "",
    phone: "",
    email: "",
    vat_number: "",
    website: "",
    logo_url: "",
    bank_name_branch: "",
    bank_address_line1: "",
    bank_address_line2: "",
    account_number: "",
    iban: "",
    bic_swift: "",
    default_vat_rate: CONFIG.DEFAULT_VAT_RATE
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCompanySettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const settings = await CompanySettings.list();
      if (settings.length > 0) {
        const setting = settings[0];
        setCompanySettings({
          company_name: setting.company_name || "",
          address: setting.address || "",
          address_line1: setting.address_line1 || "",
          address_line2: setting.address_line2 || "",
          city: setting.city || "",
          postal_code: setting.postal_code || "",
          country: setting.country || "",
          phone: setting.phone || "",
          email: setting.email || "",
          vat_number: setting.vat_number || "",
          website: setting.website || "",
          logo_url: setting.logo_url || "",
          bank_name_branch: setting.bank_name_branch || "",
          bank_address_line1: setting.bank_address_line1 || "",
          bank_address_line2: setting.bank_address_line2 || "",
          account_number: setting.account_number || "",
          iban: setting.iban || "",
          bic_swift: setting.bic_swift || "",
          default_vat_rate: setting.default_vat_rate !== undefined ? setting.default_vat_rate : CONFIG.DEFAULT_VAT_RATE
        });
      }
    } catch (err) {
      console.error('Error loading company settings:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCompanySettings = (newSettings) => {
    setCompanySettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  const getLogoUrl = () => {
    return companySettings.logo_url || logoImage;
  };

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const value = {
    companySettings,
    isLoading,
    error,
    loadCompanySettings,
    updateCompanySettings,
    getLogoUrl
  };

  return (
    <CompanySettingsContext.Provider value={value}>
      {children}
    </CompanySettingsContext.Provider>
  );
};
