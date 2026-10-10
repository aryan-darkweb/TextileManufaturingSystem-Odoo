import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export function InventoryView({ dbConnected, onOpenHealth }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State for New Product
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'RAW_MATERIAL',
    category: 'Yarn',
    unit: 'KG',
    initialStock: '100',
    minimumStock: '50',
    unitCost: '250',
    color: 'Natural Ecru',
    specifications: '30s Ne Combed Cotton',
  });

  const loadProducts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getProducts();
      if (res?.data) {
        setProducts(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch inventory products from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.createProduct({
        ...formData,
        initialStock: parseFloat(formData.initialStock) || 0,
        minimumStock: parseFloat(formData.minimumStock) || 0,
        unitCost: parseFloat(formData.unitCost) || 0,
      });

      setSuccessMsg(`Product ${formData.code} created successfully.`);
      setIsModalOpen(false);
      // Reset form
      setFormData({
        code: '',
        name: '',
        type: 'RAW_MATERIAL',
        category: 'Yarn',
        unit: 'KG',
        initialStock: '100',
        minimumStock: '50',
        unitCost: '250',
        color: 'Natural Ecru',
        specifications: '30s Ne Combed Cotton',
      });
      loadProducts();
    } catch (err) {
      setErrorMsg(err.message || 'Error creating product');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || p.type === selectedType;
    return matchesSearch && matchesType;
  });

  const lowStockItems = products.filter((p) => p.currentStock <= p.minimumStock);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Kishan's Module
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Raw yarn arriving at the gate & finished fabric rolls stored on shelves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Backend Notice:</p>
              <p>{errorMsg}</p>
              {!dbConnected && (
                <button
                  onClick={onOpenHealth}
                  className="mt-2 text-rose-900 underline font-semibold cursor-pointer"
                >
                  Configure Supabase Connection →
                </button>
              )}
            </div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-medium">Total Products</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{products.length}</p>
          <span className="text-[11px] text-slate-400">All registered SKUs</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-medium">Raw Material (Yarn)</span>
          <p className="text-2xl font-bold text-sky-600 mt-1">
            {products.filter((p) => p.type === 'RAW_MATERIAL').length}
          </p>
          <span className="text-[11px] text-slate-400">Cones & Bales in Store</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-medium">Finished Goods (Fabric)</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {products.filter((p) => p.type === 'FINISHED_GOODS').length}
          </p>
          <span className="text-[11px] text-slate-400">Ready rolls on shelves</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-medium">Low Stock Alerts</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockItems.length}</p>
          <span className="text-[11px] text-slate-400">Below threshold</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by SKU, name, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'RAW_MATERIAL', 'FINISHED_GOODS', 'WIP', 'CONSUMABLE'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedType === type
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Unit Cost</th>
                <th className="py-3 px-4">Specifications</th>
                <th className="py-3 px-4">Stock Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
                    Loading products from database...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No products found. Use <strong>"Add Product"</strong> above to register raw materials or fabric rolls.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.minimumStock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">{p.code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            p.type === 'RAW_MATERIAL'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : p.type === 'FINISHED_GOODS'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {p.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {p.currentStock} <span className="text-[10px] text-slate-500">{p.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">₹{p.unitCost}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={p.specifications}>
                        {p.specifications || 'Standard spec'}
                      </td>
                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Low Stock (Min: {p.minimumStock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Adequate Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">Register New Inventory SKU</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. YRN-COT-40"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 40s Combed Cotton Yarn Cone"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                  >
                    <option value="RAW_MATERIAL">RAW_MATERIAL (Yarn)</option>
                    <option value="FINISHED_GOODS">FINISHED_GOODS (Fabric)</option>
                    <option value="WIP">WIP (In-Process)</option>
                    <option value="CONSUMABLE">CONSUMABLE (Dyes/Chemicals)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Yarn, Denim, Cotton"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measure *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                  >
                    <option value="KG">KG</option>
                    <option value="METER">METER</option>
                    <option value="ROLL">ROLL</option>
                    <option value="CONE">CONE</option>
                    <option value="PIECE">PIECE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stock Intake</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Minimum Alert Level</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Color / Shade</label>
                  <input
                    type="text"
                    placeholder="e.g. Indigo Blue, Bleached White"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Specifications</label>
                  <input
                    type="text"
                    placeholder="e.g. 100% Combed Cotton, 30s count"
                    value={formData.specifications}
                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving to Database...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
