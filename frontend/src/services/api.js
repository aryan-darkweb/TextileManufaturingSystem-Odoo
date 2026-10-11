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
  getCustomerById: (id) => request(`/sales/customers/${id}`),
  createCustomer: (customerData) =>
    request('/sales/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    }),
  updateCustomer: (id, customerData) =>
    request(`/sales/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    }),

  // Buyer Management aliases
  getBuyers: () => request('/sales/customers'),
  getBuyerById: (id) => request(`/sales/customers/${id}`),
  createBuyer: (buyerData) =>
    request('/sales/customers', {
      method: 'POST',
      body: JSON.stringify(buyerData),
    }),
  updateBuyer: (id, buyerData) =>
    request(`/sales/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(buyerData),
    }),

  // Central Transactions Feed
  getTransactions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/accounting/transactions${query ? `?${query}` : ''}`);
  },
  getCentralTransactions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/accounting/transactions${query ? `?${query}` : ''}`);
  },

  // Accounting, Invoices & Financials
  getInvoices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/accounting/invoices${query ? `?${query}` : ''}`);
  },
  getInvoiceById: (id) => request(`/accounting/invoices/${id}`),
  createInvoice: (data) =>
    request('/accounting/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  recordBuyerPayment: (data) =>
    request('/accounting/payments/buyer', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSupplierBills: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/accounting/bills${query ? `?${query}` : ''}`);
  },
  createSupplierBill: (data) =>
    request('/accounting/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  recordSupplierPayment: (data) =>
    request('/accounting/payments/supplier', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  recordPayrollPayment: (data) =>
    request('/accounting/payroll/payout', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPayrollPayments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/accounting/payroll/payouts${query ? `?${query}` : ''}`);
  },
  recordBusinessExpense: (data) =>
    request('/accounting/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getBusinessExpenses: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/accounting/expenses${query ? `?${query}` : ''}`);
  },
  getOrderCosting: (salesOrderId) =>
    request(`/accounting/costing/by-order/${encodeURIComponent(String(salesOrderId || '').trim())}`),
  getOwnerFinancialSummary: (monthOrParams = '') => {
    let m = '';
    if (typeof monthOrParams === 'string') {
      m = monthOrParams;
    } else if (monthOrParams && typeof monthOrParams === 'object') {
      m = monthOrParams.month || '';
    }
    const query = m ? `?month=${encodeURIComponent(m)}` : '';
    return request(`/accounting/summary/month-end${query}`);
  },

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
  createPurchaseOrderFromShortage: (data) =>
    request('/purchase/orders/from-shortage', {
      method: 'POST',
      body: JSON.stringify(data),
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

  // Factory Operations - Manufacturing
  getFactoryToday: () => request('/manufacturing/factory-today'),
  getMachineDailyOutput: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/manufacturing/machines/daily-output${query ? `?${query}` : ''}`);
  },
  getMaterialShortages: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/manufacturing/materials/shortages${query ? `?${query}` : ''}`);
  },
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

  // Compatibility aliases
  getManufacturingOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/manufacturing/orders${query ? `?${query}` : ''}`);
  },
  getManufacturingMachines: () => request('/manufacturing/machines'),
  getQualityInspections: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/quality/inspections${query ? `?${query}` : ''}`);
  },
  // Streamlined Mill Flow Pipeline (Everest Textile Mill Core Model)
  getMillPipeline: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/mill-flow/pipeline${query ? `?${query}` : ''}`);
  },
  createMillBuyerOrder: (data) =>
    request('/mill-flow/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  orderMillYarn: (data) =>
    request('/mill-flow/yarn/order', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  startMillProduction: (data) =>
    request('/mill-flow/production/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  inspectMillQuality: (data) =>
    request('/mill-flow/quality/inspect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  dispatchMillFabric: (data) =>
    request('/mill-flow/dispatch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getOwnerMillFinancials: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/mill-flow/owner-financials${query ? `?${query}` : ''}`);
  },
  getMillMachines: () => request('/mill-flow/machines'),
  updateMillMachineStatus: (id, status) =>
    request(`/mill-flow/machines/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  advanceMillProductionStage: (id, data = {}) =>
    request(`/mill-flow/production/${id}/advance-stage`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

