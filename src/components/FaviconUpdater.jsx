import { useEffect } from 'react';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
import logoImage from '@/assets/logo.png';

const FaviconUpdater = () => {
  const { getLogoUrl, isLoading } = useCompanySettings();

  useEffect(() => {
    if (isLoading) return;

    const updateFavicon = () => {
      const logoUrl = getLogoUrl();
      
      // Remove existing favicon links
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
      existingFavicons.forEach(link => link.remove());

      // Create new favicon link
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.href = logoUrl;
      
      // Add to head
      document.head.appendChild(link);
    };

    updateFavicon();
  }, [getLogoUrl, isLoading]);

  return null; // This component doesn't render anything
};

export default FaviconUpdater;
