// Application Configuration Constants
export const CONFIG = {
  // API Configuration
  API_BASE_URL: "",
  
  // Company Defaults
  DEFAULT_COMPANY_NAME: "Grow United Italy",
  DEFAULT_VAT_RATE: 4.0,
  
  // Timeout Configuration (in milliseconds)
  TIMEOUTS: {
    DEFAULT: 3000,
    UPLOAD: 4000,
    TOAST: 5000,
  },
  
  // File Upload Configuration
  MAX_FILE_SIZE_MB: 5,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB in bytes
  
  // Quote Configuration
  DEFAULT_QUOTE_VALIDITY_DAYS: 30,
  
  // UI Configuration
  TOAST_DELAY: 5000,
  
  // Validation Patterns
  PATTERNS: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^[\+]?[1-9][\d]{0,15}$/,
    VAT: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]{3})?$/,
  },
  
  // Date Formats
  DATE_FORMATS: {
    DISPLAY: 'MMM dd, yyyy',
    API: 'yyyy-MM-dd',
    DATETIME: 'yyyy-MM-dd\'T\'HH:mm:ss',
  },
  
  // Currency Configuration
  CURRENCY: {
    SYMBOL: '€',
    DECIMAL_PLACES: 2,
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
  },
};
