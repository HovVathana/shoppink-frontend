import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Request deduplication cache
const pendingRequests = new Map();

// Request deduplication helper
const dedupeRequest = (key: string, requestFn: () => Promise<any>) => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, promise);
  return promise;
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second default timeout
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log errors for debugging
    if (error.response) {
      // Server responded with error status
      console.error('[API Error]', {
        url: error.config?.url,
        status: error.response.status,
        message: error.response.data?.message || error.message,
      });
    } else if (error.request) {
      // Request made but no response received (network error)
      console.error('[Network Error]', {
        url: error.config?.url,
        message: error.message,
      });
    } else {
      // Error in request setup
      console.error('[Request Error]', error.message);
    }

    // Only handle 401 errors for auth endpoints or when explicitly unauthorized
    if (
      error.response?.status === 401 &&
      error.config?.url?.includes("/auth/me")
    ) {
      Cookies.remove("token");
      // Don't automatically redirect, let the AuthContext handle it
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  signup: (email: string, password: string, name: string) =>
    api.post("/auth/signup", { email, password, name }),

  getMe: () => api.get("/auth/me"),

  updateProfile: (data: { name?: string; profilePicture?: string }) =>
    api.put("/auth/profile", data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put("/auth/change-password", data),
};

// Products API
export const productsAPI = {
  getAll: (params?: any, bustCache = false) => {
    const finalParams = bustCache ? { ...params, _t: Date.now() } : params;
    return api.get("/products", { params: finalParams });
  },

  getById: (id: string) => api.get(`/products/${id}`),

  create: (data: any) => {
    // Check if data is FormData (for file uploads)
    if (data instanceof FormData) {
      return api.post("/products", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    }
    return api.post("/products", data);
  },

  update: (id: string, data: any) => {
    // Check if data is FormData (for file uploads)
    if (data instanceof FormData) {
      return api.put(`/products/${id}`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    }
    return api.put(`/products/${id}`, data);
  },

  delete: (id: string) => api.delete(`/products/${id}`),

  updateNote: (id: string, note: string) =>
    api.patch(`/products/${id}/note`, { note }),
};

// Product Options API
export const productOptionsAPI = {
  // Option Groups
  createOptionGroup: (productId: string, data: any) =>
    api.post(`/product-options/${productId}/groups`, data),

  updateOptionGroup: (groupId: string, data: any) =>
    api.put(`/product-options/groups/${groupId}`, data),

  // Option Groups with image upload
  createOptionGroupWithImage: (productId: string, formData: FormData) =>
    api.post(`/product-options/${productId}/groups`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  updateOptionGroupWithImage: (groupId: string, formData: FormData) =>
    api.put(`/product-options/groups/${groupId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  // Image-only update endpoints
  updateOptionGroupImage: (groupId: string, formData: FormData) =>
    api.put(`/product-options/groups/${groupId}/image`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  updateOptionImage: (optionId: string, formData: FormData) =>
    api.put(`/product-options/options/${optionId}/image`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  deleteOptionGroup: (groupId: string) =>
    api.delete(`/product-options/groups/${groupId}`),

  // Options
  createOption: (groupId: string, data: any) =>
    api.post(`/product-options/groups/${groupId}/options`, data),

  updateOption: (optionId: string, data: any) =>
    api.put(`/product-options/options/${optionId}`, data),

  // Options with image upload
  createOptionWithImage: (groupId: string, formData: FormData) =>
    api.post(`/product-options/groups/${groupId}/options`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  updateOptionWithImage: (optionId: string, formData: FormData) =>
    api.put(`/product-options/options/${optionId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  deleteOption: (optionId: string) =>
    api.delete(`/product-options/options/${optionId}`),
};

// Categories API
export const categoriesAPI = {
  getAll: (params?: any, bustCache = false) => {
    const finalParams = bustCache ? { ...params, _t: Date.now() } : params;
    return api.get("/categories", { params: finalParams });
  },

  getAllActive: () => dedupeRequest('categories-active', () => api.get("/categories/all")),

  getById: (id: string) => api.get(`/categories/${id}`),

  create: (data: any) => api.post("/categories", data),

  update: (id: string, data: any) => api.put(`/categories/${id}`, data),

  delete: (id: string) => api.delete(`/categories/${id}`),
};

// Drivers API with request deduplication
export const driversAPI = {
  getAll: (params?: any, bustCache = false) => {
    // Add timestamp to bust cache when needed
    const finalParams = bustCache ? { ...params, _t: Date.now() } : params;
    const key = `drivers-all-${JSON.stringify(finalParams || {})}`;
    return dedupeRequest(key, () => api.get("/drivers", { params: finalParams }));
  },

  getAllActive: () => dedupeRequest('drivers-active', () => api.get("/drivers/all")),

  getById: (id: string) => api.get(`/drivers/${id}`),

  create: async (data: any) => {
    const result = await api.post("/drivers", data);
    // Clear all driver-related cached requests
    for (const key of pendingRequests.keys()) {
      if (key.includes('drivers')) {
        pendingRequests.delete(key);
      }
    }
    return result;
  },

  update: async (id: string, data: any) => {
    const result = await api.put(`/drivers/${id}`, data);
    // Clear all driver-related cached requests
    for (const key of pendingRequests.keys()) {
      if (key.includes('drivers')) {
        pendingRequests.delete(key);
      }
    }
    return result;
  },

  delete: async (id: string) => {
    const result = await api.delete(`/drivers/${id}`);
    // Clear all driver-related cached requests
    for (const key of pendingRequests.keys()) {
      if (key.includes('drivers')) {
        pendingRequests.delete(key);
      }
    }
    return result;
  },
};

// Orders API (Enhanced) with timeout optimization
export const ordersAPI = {
  getAll: (params?: any, bustCache = false) => {
    const finalParams = bustCache ? { ...params, _t: Date.now() } : params;
    return api.get("/orders", { params: finalParams });
  },

  getById: (id: string) => api.get(`/orders/${id}`),

  create: (data: any) => api.post("/orders", data, { timeout: 15000 }), // 15 second timeout
  update: (id: string, data: any) => api.put(`/orders/${id}`, data, { timeout: 15000 }),

  updateState: (id: string, state: string) =>
    api.put(`/orders/${id}/state`, { state }),

  assignDriver: (id: string, driverId: string | null, assignedAt?: string) =>
    api.put(`/orders/${id}/driver`, { driverId, assignedAt }),

  // Print tracking methods
  markAsPrinted: (id: string) =>
    api.put(`/orders/${id}/mark-printed`, { isPrinted: true }),

  resetPrintStatus: (id: string) =>
    api.put(`/orders/${id}/reset-print`, { isPrinted: false }),

  getStats: () => api.get("/orders/stats/summary"),
  delete: (id: string) => api.delete(`/orders/${id}`),
  getDuplicatePhones: () => api.get("/orders/duplicates/phone"),
  
  uploadPickupProof: (id: string, formData: FormData) =>
    api.post(`/orders/${id}/pickup-proof`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  batchSearchByPhone: (phoneNumbers: string[]) =>
    api.post("/orders/batch/phone", { phoneNumbers }),
};

// Blacklist Phones API with request deduplication and caching
export const blacklistAPI = {
  getAll: (bustCache = false) => {
    const key = bustCache ? `blacklist-phones-all-${Date.now()}` : 'blacklist-phones-all';
    return dedupeRequest(key, () => api.get("/blacklist-phones", { params: bustCache ? { _t: Date.now() } : {} }));
  },
  create: (data: { phone: string; reason?: string }) =>
    api.post("/blacklist-phones", data),
  delete: (id: string) => api.delete(`/blacklist-phones/${id}`),
  check: (phone: string) =>
    dedupeRequest(`blacklist-phone-check-${phone}`, () => api.get("/blacklist-phones/check", { params: { phone } })),
};

// Dashboard API with request deduplication
export const dashboardAPI = {
  getStats: () => dedupeRequest('dashboard-stats', () => api.get("/dashboard/stats")),

  getRevenueChart: () => dedupeRequest('dashboard-revenue', () => api.get("/dashboard/charts/revenue")),

  getOrdersChart: () => dedupeRequest('dashboard-orders', () => api.get("/dashboard/charts/orders")),
};

// Staff API
export const staffAPI = {
  getAll: (params?: any, bustCache = false) => {
    const finalParams = bustCache ? { ...params, _t: Date.now() } : params;
    return api.get("/staff", { params: finalParams });
  },
  getById: (id: string) => api.get(`/staff/${id}`),
  create: (data: any) => api.post("/staff", data),
  update: (id: string, data: any) => api.put(`/staff/${id}`, data),
  delete: (id: string) => api.delete(`/staff/${id}`),
  toggleStatus: (id: string) => api.patch(`/staff/${id}/toggle-status`),
  getPermissions: () => api.get("/staff/permissions/list"),
  getRolePermissions: (role: string) =>
    api.get(`/staff/roles/${role}/permissions`),
};

// Public API (no authentication required)
const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Public Products API (for customer-facing pages)
export const publicProductsAPI = {
  getAll: (params?: any) => publicApi.get("/public/products", { params }),
  getById: (id: string) => publicApi.get(`/public/products/${id}`),
};

// Public Categories API (for customer-facing pages)
export const publicCategoriesAPI = {
  getAll: () => publicApi.get("/public/categories"),
};

// Customer Orders API (for customer-facing order placement)
export const customerOrdersAPI = {
  create: (orderData: FormData) =>
    publicApi.post("/customer-orders", orderData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  getByOrderNumber: (orderNumber: string) =>
    publicApi.get(`/customer-orders/${orderNumber}`),
  getAll: (params?: { page?: number; limit?: number; search?: string }, bustCache = false) => {
    const finalParams = bustCache ? { ...params, _t: Date.now() } : params;
    return api.get("/customer-orders", { params: finalParams });
  },
  getById: (id: string) => api.get(`/customer-orders/${id}`),
  update: (id: string, orderData: FormData) =>
    api.put(`/customer-orders/${id}`, orderData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  delete: (id: string) => api.delete(`/customer-orders/${id}`),
};

export default api;
