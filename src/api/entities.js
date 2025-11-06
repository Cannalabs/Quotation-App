import { apiGet, apiPost, apiPut, apiDelete } from "./integrations";

// Sort helper (kept)
const sortItems = (items, sort) => {
  if (!sort) return items;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  return [...items].sort((a, b) => {
    const av = a?.[field], bv = b?.[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
};

// Customers -> backend
const normalizeCustomer = (c) => ({ 
  ...c, 
  company_name: c.company_name ?? c.name ?? "",
  contact_person: c.contact_person ?? "",
  created_date: c.created_date ?? c.created_at
});

// Transform frontend data to backend format
const transformCustomerForBackend = (data) => {
  const transformed = { ...data };
  // Map company_name to name for backend
  if (transformed.company_name) {
    transformed.name = transformed.company_name;
    delete transformed.company_name;
  }
  return transformed;
};

export const Customer = {
  async list(paramsOrSort) {
    let q, skip, limit, sort;
    if (typeof paramsOrSort === "string") sort = paramsOrSort;
    else if (paramsOrSort && typeof paramsOrSort === "object") ({ q, skip, limit, sort } = paramsOrSort);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (skip) params.set("skip", String(skip));
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    const data = await apiGet(`/api/customers${qs ? `?${qs}` : ""}`);
    const normalized = Array.isArray(data) ? data.map(normalizeCustomer) : [];
    return sortItems(normalized, sort);
  },
  async get(id) { return normalizeCustomer(await apiGet(`/api/customers/${id}`)); },
  async create(payload) { 
    const transformedPayload = transformCustomerForBackend(payload);
    return normalizeCustomer(await apiPost(`/api/customers`, transformedPayload)); 
  },
  async update(id, payload) { 
    const transformedPayload = transformCustomerForBackend(payload);
    return normalizeCustomer(await apiPut(`/api/customers/${id}`, transformedPayload)); 
  },
  async delete(id) { return apiDelete(`/api/customers/${id}`); },
};

// Products -> backend
export const Product = {
  async list(paramsOrSort) {
    let q, skip, limit, sort, includeDeleted;
    if (typeof paramsOrSort === "string") sort = paramsOrSort;
    else if (paramsOrSort && typeof paramsOrSort === "object") ({ q, skip, limit, sort, includeDeleted } = paramsOrSort);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (skip) params.set("skip", String(skip));
    if (limit) params.set("limit", String(limit));
    if (includeDeleted) params.set("include_deleted", "true");
    const qs = params.toString();
    const data = await apiGet(`/api/products${qs ? `?${qs}` : ""}`);
    return sortItems(Array.isArray(data) ? data : [], sort);
  },
  async get(id) { return apiGet(`/api/products/${id}`); },
  async create(payload) { return apiPost(`/api/products`, payload); },
  async update(id, payload) { return apiPut(`/api/products/${id}`, payload); },
  async delete(id) { return apiDelete(`/api/products/${id}`); },
  async restore(id) { return apiPost(`/api/products/${id}/restore`); },
  async listDeleted() { return apiGet(`/api/products/deleted`); },
};

// Quotes -> backend
// Transform frontend quote payload to backend schema
const transformQuoteForBackend = (payload) => {
  if (!payload) return payload;
  const {
    customer_id,
    status,
    notes,
    quotation_number,
    valid_until,
    terms_and_conditions,
    discount_type,
    discount_value,
    is_archived,
    archived_at,
    archived_by,
  } = payload;

  // Convert date string to ISO datetime if needed
  let validUntilISO = valid_until;
  if (valid_until && typeof valid_until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valid_until)) {
    // If it's just a date (YYYY-MM-DD), convert to full datetime
    validUntilISO = new Date(valid_until + 'T00:00:00').toISOString();
  }

  const result = {
    customer_id,
    status,
    notes,
    quotation_number,
    valid_until: validUntilISO,
    terms_and_conditions,
    discount_type: discount_type || "none",
    discount_value: discount_value || 0,
    is_archived,
    archived_at,
    archived_by,
  };

  // Only include items if they are provided in the payload
  if (payload.items !== undefined) {
    result.items = Array.isArray(payload.items)
      ? payload.items.map((it) => ({
          product_id: it.product_id ?? it.id ?? null,
          description: it.description ?? it.product_name ?? it.name ?? "",
          quantity: it.quantity ?? 1,
          unit_price: it.unit_price ?? it.price ?? 0,
          vat_rate: it.vat_rate ?? payload.vat_rate ?? 0,
        }))
      : [];
  }

  return result;
};

export const Quotation = {
  async list() { return apiGet(`/api/quotes`); },
  async get(id) { return apiGet(`/api/quotes/${id}`); },
  async create(payload) { return apiPost(`/api/quotes`, transformQuoteForBackend(payload)); },
  async update(id, payload) { return apiPut(`/api/quotes/${id}`, transformQuoteForBackend(payload)); },
  async delete(id) { return apiDelete(`/api/quotes/${id}`); },
  async restore(id) { return apiPost(`/api/quotes/${id}/restore`); },
  async listDeleted() { return apiGet(`/api/quotes/deleted`); },
};

// Company Settings -> backend
export const CompanySettings = {
  async get() { return apiGet(`/api/company-settings`); },
  async list() { 
    const settings = await apiGet(`/api/company-settings`);
    return [settings]; // Wrap in array to match list() expectation
  },
  async getPublic() { 
    // Public endpoint - no authentication required, only returns name and logo
    return apiGet(`/api/company-settings/public`); 
  },
  async update(patch) { return apiPut(`/api/company-settings`, patch); },
  async create(patch) { return apiPost(`/api/company-settings`, patch); },
};

// Countries -> backend
export const Country = {
  async list() { return apiGet(`/api/countries`); },
  async get(code) { return apiGet(`/api/countries/${code}`); },
};

// User authentication and management
const USER_KEY = "current_user";

export const User = {
  async me() {
    // Get user from localStorage
    const localUser = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    
    // If no local user, return null (not authenticated)
    if (!localUser) {
      return null;
    }
    
    // User ID must be a valid integer (database users only)
    const userIdNum = parseInt(localUser.id, 10);
    if (isNaN(userIdNum)) {
      // Invalid user ID format - clear and return null
      localStorage.removeItem(USER_KEY);
      return null;
    }
    
    // Fetch latest user data from database
    try {
      const dbUser = await apiGet(`/api/users/${userIdNum}`);
      // Update localStorage with fresh data from database
      const userData = {
        id: dbUser.id.toString(),
        full_name: dbUser.full_name,
        email: dbUser.email,
        role: dbUser.role,
        profile_picture_url: dbUser.profile_picture_url || ''
      };
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      return userData;
    } catch (error) {
      // If API fails (401/403 means token invalid, password changed, etc.), clear everything
      console.warn('Failed to fetch user from database, clearing session:', error);
      // Clear all auth data
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return null;
    }
  },
  async update(id, patch) {
    try {
      // Update in database via API
      const updatedUser = await apiPut(`/api/users/${id}`, patch);
      // Update localStorage with fresh data
      const userData = {
        id: updatedUser.id.toString(),
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        role: updatedUser.role,
        profile_picture_url: updatedUser.profile_picture_url || ''
      };
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  },
  async updateMyUserData(patch) {
    const u = await this.me();
    if (!u) {
      throw new Error('User not authenticated');
    }
    
    // User ID must be a valid integer (database users only)
    const userIdNum = parseInt(u.id, 10);
    if (isNaN(userIdNum)) {
      throw new Error('Invalid user ID');
    }
    
    // Update via API (database only)
    return await this.update(userIdNum, patch);
  },
  async login(email, password) {
    // This is handled by the AuthContext, but keeping for compatibility
    // All authentication is now done through the database API
    return { success: false, error: 'Please use AuthContext.login() for authentication' };
  },
  async logout() {
    // Clear user data and token from localStorage completely
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('access_token');
    return { success: true };
  },
  async isAuthenticated() {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    if (!user) return false;
    // User ID must be a valid integer (database users only)
    const userIdNum = parseInt(user.id, 10);
    return !isNaN(userIdNum);
  },
  async list() {
    try {
      const users = await apiGet("/api/users");
      return users || [];
    } catch (error) {
      console.error("Failed to fetch users:", error);
      throw error;
    }
  },
  async create(userData) {
    try {
      const newUser = await apiPost("/api/users", userData);
      return { success: true, user: newUser };
    } catch (error) {
      console.error("Failed to create user:", error);
      return { success: false, error: error.message || "Failed to create user" };
    }
  },
  async update(id, userData) {
    try {
      const updatedUser = await apiPut(`/api/users/${id}`, userData);
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error("Failed to update user:", error);
      return { success: false, error: error.message || "Failed to update user" };
    }
  },
  async delete(id) {
    try {
      await apiDelete(`/api/users/${id}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to delete user:", error);
      return { success: false, error: error.message || "Failed to delete user" };
    }
  },
  async listDeleted() {
    try {
      const users = await apiGet("/api/users/deleted");
      return users || [];
    } catch (error) {
      console.error("Failed to fetch deleted users:", error);
      throw error;
    }
  },
  async restore(id) {
    try {
      const restoredUser = await apiPost(`/api/users/${id}/restore`);
      return { success: true, user: restoredUser };
    } catch (error) {
      console.error("Failed to restore user:", error);
      return { success: false, error: error.message || "Failed to restore user" };
    }
  },
  async forgotPassword(email) {
    try {
      const response = await apiPost("/api/users/forgot-password", { email });
      return { success: true, message: response.message };
    } catch (error) {
      console.error("Failed to process forgot password request:", error);
      return { 
        success: true, // Still return success to prevent email enumeration
        message: "Please contact your administrator to reset your password."
      };
    }
  },
  async adminResetPassword(userId, newPassword) {
    try {
      const response = await apiPost(`/api/users/${userId}/reset-password`, { 
        new_password: newPassword 
      });
      return { success: true, message: response.message };
    } catch (error) {
      console.error("Failed to reset password:", error);
      return { success: false, error: error.message || "Failed to reset password" };
    }
  },
};

// Direct helpers (if used elsewhere)
export async function listCustomers({ q = "", skip = 0, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (skip) params.set("skip", String(skip));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  const data = await apiGet(`/api/customers${qs ? `?${qs}` : ""}`);
  return Array.isArray(data) ? data.map(normalizeCustomer) : [];
}
export async function createCustomer(payload) { return Customer.create(payload); }
export async function updateCustomer(id, payload) { return Customer.update(id, payload); }
export async function deleteCustomer(id) { return Customer.delete(id); }