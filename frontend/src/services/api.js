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

  // Factory Operations - Manufacturing
  getFactoryToday: () => request('/manufacturing/factory-today'),
  getProductionOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/manufacturing/orders${query ? `?${query}` : ''}`);
  },
  getProductionOrderById: (id) => request(`/manufacturing/orders/${id}`),
  getOrderTrace: (id) => request(`/manufacturing/orders/${id}/trace`),
  createProductionOrder: (data) =>
    request('/manufacturing/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  startStage: (orderId, data) =>
    request(`/manufacturing/orders/${orderId}/stages/start`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  completeStage: (orderId, data) =>
    request(`/manufacturing/orders/${orderId}/stages/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateOrderStatus: (orderId, status) =>
    request(`/manufacturing/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getMachines: () => request('/manufacturing/machines'),
  updateMachineStatus: (id, status) =>
    request(`/manufacturing/machines/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getMaterialRequirements: (orderId) =>
    request(`/manufacturing/materials/requirement-vs-available/${orderId}`),
  getProductionStatusBySalesOrder: (salesOrderId) =>
    request(`/manufacturing/status/by-sales-order/${salesOrderId}`),

  // Factory Operations - Quality Control
  getInspections: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/quality/inspections${query ? `?${query}` : ''}`);
  },
  createInspection: (data) =>
    request('/quality/inspections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateInspection: (id, data) =>
    request(`/quality/inspections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getDispatchReadyBySalesOrder: (salesOrderId) =>
    request(`/quality/dispatch-ready/by-sales-order/${salesOrderId}`),
  getDispatchReadyByProductionOrder: (productionOrderId) =>
    request(`/quality/dispatch-ready/${productionOrderId}`),
  getDefectRate: (productionOrderId, productId = null) => {
    const query = productId ? `?productId=${productId}` : '';
    return request(`/quality/defect-rate/${productionOrderId || 'summary'}${query}`);
  },

  // Factory Operations - HR & Attendance
  getEmployees: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/hr/employees${query ? `?${query}` : ''}`);
  },
  getEmployeeById: (id) => request(`/hr/employees/${id}`),
  createEmployee: (data) =>
    request('/hr/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEmployee: (id, data) =>
    request(`/hr/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  recordBulkAttendance: (data) =>
    request('/hr/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/hr/attendance${query ? `?${query}` : ''}`);
  },
  getAttendanceSummary: (month = '') => {
    const query = month ? `?month=${month}` : '';
    return request(`/hr/attendance/summary${query}`);
  },
};
