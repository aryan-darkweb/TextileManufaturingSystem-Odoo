// Frontend API Service - Communicates with monolithic Express backend on port 5000 (via Vite proxy or direct)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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
      err.message = `Cannot connect to TextileFlow backend at ${API_BASE_URL}. Ensure the Express server is running on port 5000.`;
    }
    throw err;
  }
}

export const api = {
  // System Health
  getHealth: () => request('/health'),

  // Inventory Management
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
  updateProduct: (id, productData) =>
    request(`/inventory/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    }),
  getLowStockAlerts: () => request('/inventory/low-stock'),
  recordInventoryTransaction: (txData) =>
    request('/inventory/transactions', {
      method: 'POST',
      body: JSON.stringify(txData),
    }),

  // Sales Orders
  getSalesOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/sales/orders${query ? `?${query}` : ''}`);
  },
  getSalesOrderById: (id) => request(`/sales/orders/${id}`),
  createSalesOrder: (orderData) =>
    request('/sales/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),
  updateSalesOrderStatus: (id, status) =>
    request(`/sales/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getCustomers: () => request('/sales/customers'),
  createCustomer: (customerData) =>
    request('/sales/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    }),

  // Purchase Management
  getSuppliers: () => request('/purchase/suppliers'),
  createSupplier: (supplierData) =>
    request('/purchase/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData),
    }),
  getPurchaseOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/purchase/orders${query ? `?${query}` : ''}`);
  },
  getPurchaseOrderById: (id) => request(`/purchase/orders/${id}`),
  createPurchaseOrder: (poData) =>
    request('/purchase/orders', {
      method: 'POST',
      body: JSON.stringify(poData),
    }),
  receivePurchaseOrderGoods: (id, receiveData) =>
    request(`/purchase/orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(receiveData),
    }),

  // Dispatch & Logistics
  getDispatches: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/dispatch${query ? `?${query}` : ''}`);
  },
  getEligibleDispatchOrders: () => request('/dispatch/eligible-orders'),
  createDispatch: (dispatchData) =>
    request('/dispatch', {
      method: 'POST',
      body: JSON.stringify(dispatchData),
    }),

  // Dashboard & Analytics
  getDashboardSummary: () => request('/dashboard/summary'),

  // Factory Operations (Integration Skeletons)
  getManufacturingStatus: () => request('/manufacturing/status'),
  getManufacturingMachines: () => request('/manufacturing/machines'),
  getManufacturingOrders: () => request('/manufacturing/orders'),
  getQualityStatus: () => request('/quality/status'),
  getQualityInspections: () => request('/quality/inspections'),
  getHrStatus: () => request('/hr/status'),
  getHrEmployees: () => request('/hr/employees'),
  getHrAttendance: () => request('/hr/attendance'),
};
