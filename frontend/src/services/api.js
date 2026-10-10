// Frontend API Service - Communicates with monolithic Express backend on port 5000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.message || `Request failed with HTTP ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (!err.status) {
      // Network failure / server offline
      err.message = `Cannot connect to TextileFlow backend at ${API_BASE_URL}. Ensure the Express server is running on port 5000.`;
    }
    throw err;
  }
}

export const api = {
  // System Health
  getHealth: () => request('/health'),

  // Inventory (Kishan)
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory/products${query ? `?${query}` : ''}`);
  },
  getProductById: (id) => request(`/inventory/products/${id}`),
  createProduct: (productData) =>
    request('/inventory/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    }),
  getLowStockAlerts: () => request('/inventory/low-stock'),

  // Sales Orders (Kishan)
  getSalesOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/sales/orders${query ? `?${query}` : ''}`);
  },
  createSalesOrder: (orderData) =>
    request('/sales/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),
  getCustomers: () => request('/sales/customers'),
  createCustomer: (customerData) =>
    request('/sales/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    }),

  // Dashboard (Joint)
  getDashboardSummary: () => request('/dashboard/summary'),

  // Module integration status checks (Teammate Factory Ops)
  getManufacturingStatus: () => request('/manufacturing/status'),
  getQualityStatus: () => request('/quality/status'),
  getHrStatus: () => request('/hr/status'),
};
