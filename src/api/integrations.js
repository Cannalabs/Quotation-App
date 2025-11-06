// Minimal integration mocks for dev

// Returns a persistent data URL so it survives reloads (better than ObjectURL)
export async function UploadFile({ file }) {
  const file_url = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // data URL
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return { file_url };
}

import { CONFIG } from '@/config/constants';

const BASE_URL = CONFIG.API_BASE_URL;

// Helper function to get JWT token from localStorage
function getAccessToken() {
  try {
    return localStorage.getItem('access_token');
  } catch {
    return null;
  }
}

// Helper function to refresh access token
async function refreshAccessToken() {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return null;
    }
    
    const response = await fetch(`${BASE_URL}/api/users/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (response.ok) {
      const data = await response.json();
      const { access_token } = data;
      if (access_token) {
        localStorage.setItem('access_token', access_token);
        return access_token;
      }
    } else {
      // Refresh token invalid, expired, or password changed - clear everything
      // This happens when password was changed on another device
      localStorage.removeItem('current_user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      // Trigger a page reload or redirect to login if needed
      // The error will be caught by the calling function
    }
    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Clear tokens on error (e.g., password changed)
    localStorage.removeItem('current_user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return null;
  }
}

// Helper function to build headers with JWT token
function getHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Note: No warning here - token may be optional for some endpoints (e.g., company settings)
  return headers;
}

export async function apiGet(path) {
  const headers = getHeaders();
  const token = getAccessToken();
  
  // Debug: log only if token is missing (for troubleshooting)
  if (!token && (path.includes('/quotes') || path.includes('/customers') || path.includes('/products') || path.includes('/users'))) {
    console.warn(`API GET ${path} - No token found, request may fail`);
  }
  
  let res = await fetch(`${BASE_URL}${path}`, { 
    credentials: "include",
    headers,
  });
  
  // If 401 Unauthorized, try to refresh token and retry once
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry request with new token
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${BASE_URL}${path}`, { 
        credentials: "include",
        headers,
      });
    }
  }
  
  if (!res.ok) {
    // Handle 401 Unauthorized or 403 Forbidden - token expired, invalid, or missing
    if (res.status === 401 || res.status === 403) {
      console.warn(`${res.status} ${res.status === 401 ? 'Unauthorized' : 'Forbidden'} for ${path} - clearing tokens`);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('current_user');
      // Redirect to login will be handled by ProtectedRoute component
    }
    throw new Error(`GET ${path} ${res.status}`);
  }
  return res.json();
}

export async function apiPost(path, body) {
  const headers = getHeaders();
  const token = getAccessToken();
  
  let res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });
  
  // If 401 Unauthorized, try to refresh token and retry once
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry request with new token
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(body),
      });
    }
  }
  
  if (!res.ok) {
    // Handle 401 Unauthorized or 403 Forbidden - token expired, invalid, or missing
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('current_user');
    }
    const errorData = await res.json().catch(() => ({}));
    // Handle FastAPI validation errors
    if (Array.isArray(errorData.detail)) {
      // Pydantic validation errors - format them nicely
      const errorMessages = errorData.detail.map(err => {
        // Extract field name from location array (skip 'body' prefix)
        const fieldPath = err.loc?.slice(1) || [];
        const fieldName = fieldPath.join('.');
        
        // Clean up error message - remove "Value error, " prefix if present
        let msg = err.msg || '';
        if (msg.startsWith('Value error, ')) {
          msg = msg.substring('Value error, '.length);
        }
        
        // Format field name nicely (e.g., "discount_value" -> "Discount Value")
        const formattedField = fieldName
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        return fieldName ? `${formattedField}: ${msg}` : msg;
      }).join('\n');
      throw new Error(errorMessages);
    }
    const errorMessage = errorData.detail || errorData.message || `POST ${path} ${res.status}`;
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function apiPut(path, body) {
  const headers = getHeaders();
  const token = getAccessToken();
  
  let res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });
  
  // If 401 Unauthorized, try to refresh token and retry once
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry request with new token
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${BASE_URL}${path}`, {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify(body),
      });
    }
  }
  
  if (!res.ok) {
    // Handle 401 Unauthorized or 403 Forbidden - token expired, invalid, or missing
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('current_user');
    }
    const errorData = await res.json().catch(() => ({}));
    // Handle FastAPI validation errors
    if (Array.isArray(errorData.detail)) {
      // Pydantic validation errors - format them nicely
      const errorMessages = errorData.detail.map(err => {
        // Extract field name from location array (skip 'body' prefix)
        const fieldPath = err.loc?.slice(1) || [];
        const fieldName = fieldPath.join('.');
        
        // Clean up error message - remove "Value error, " prefix if present
        let msg = err.msg || '';
        if (msg.startsWith('Value error, ')) {
          msg = msg.substring('Value error, '.length);
        }
        
        // Format field name nicely (e.g., "discount_value" -> "Discount Value")
        const formattedField = fieldName
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        return fieldName ? `${formattedField}: ${msg}` : msg;
      }).join('\n');
      throw new Error(errorMessages);
    }
    const errorMessage = errorData.detail || errorData.message || `PUT ${path} ${res.status}`;
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function apiDelete(path) {
  const headers = getHeaders();
  const token = getAccessToken();
  
  let res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });
  
  // If 401 Unauthorized, try to refresh token and retry once
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry request with new token
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${BASE_URL}${path}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });
    }
  }
  
  if (!res.ok) {
    // Handle 401 Unauthorized or 403 Forbidden - token expired, invalid, or missing
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('current_user');
    }
    throw new Error(`DELETE ${path} ${res.status}`);
  }
  return res.json();
}

// Email API functions
export async function sendQuotationEmail(emailData) {
  return apiPost("/api/email/send-quotation", emailData);
}

export async function sendTestEmail(email) {
  return apiPost("/api/email/send-test", { to_email: email });
}

export async function getEmailConfigStatus() {
  return apiGet("/api/email/config-status");
}

export async function getEmailConfig() {
  return apiGet("/api/email/config");
}

export async function saveEmailConfig(emailConfig) {
  return apiPost("/api/email/save-config", emailConfig);
}