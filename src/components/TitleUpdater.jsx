import { useEffect } from 'react';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';

const TitleUpdater = () => {
  const { companySettings, isLoading } = useCompanySettings();

  useEffect(() => {
    if (isLoading) return;

    const updateTitle = () => {
      const companyName = companySettings.company_name || "Grow United Italy";
      document.title = `${companyName} - Quote Builder`;
    };

    updateTitle();
  }, [companySettings.company_name, isLoading]);

  return null; // This component doesn't render anything
};

export default TitleUpdater;
