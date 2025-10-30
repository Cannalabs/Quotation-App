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

export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.detail || errorData.message || `POST ${path} ${res.status}`;
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function apiPut(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.detail || errorData.message || `PUT ${path} ${res.status}`;
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function apiDelete(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`DELETE ${path} ${res.status}`);
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

export async function saveEmailConfig(emailConfig) {
  return apiPost("/api/email/save-config", emailConfig);
}