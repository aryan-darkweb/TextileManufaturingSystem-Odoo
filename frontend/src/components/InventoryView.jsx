import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  Search,
  RefreshCw,
  CheckCircle,
  X,
  Edit2,
  SlidersHorizontal,
  History,
  Layers,
  Info
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetails, setProductDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State for Creating Product
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

  // Form State for Editing Product
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    type: 'RAW_MATERIAL',
    category: '',
    unit: 'KG',
    minimumStock: '',
    unitCost: '',
    color: '',
    specifications: '',
    status: 'ACTIVE',
    currentStock: '',
    adjustmentReason: '',
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
      setErrorMsg(err.message || 'Failed to fetch inventory products from database');
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

      setSuccessMsg(`Product ${formData.code.toUpperCase()} registered successfully.`);
      setIsModalOpen(false);
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

  const handleOpenEdit = (product) => {
    setEditFormData({
      id: product.id,
      code: product.code,
      name: product.name,
      type: product.type,
      category: product.category,
      unit: product.unit,
      minimumStock: String(product.minimumStock),
      unitCost: String(product.unitCost),
      color: product.color || '',
      specifications: product.specifications || '',
      status: product.status || 'ACTIVE',
      currentStock: String(product.currentStock),
      adjustmentReason: '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.updateProduct(editFormData.id, {
        name: editFormData.name,
        type: editFormData.type,
        category: editFormData.category,
        unit: editFormData.unit,
        minimumStock: parseFloat(editFormData.minimumStock) || 0,
        unitCost: parseFloat(editFormData.unitCost) || 0,
        color: editFormData.color,
        specifications: editFormData.specifications,
        status: editFormData.status,
        currentStock: parseFloat(editFormData.currentStock),
        adjustmentReason: editFormData.adjustmentReason || 'Direct stock update',
      });

      setSuccessMsg(`Product ${editFormData.code} updated successfully.`);
      setIsEditModalOpen(false);
      loadProducts();
    } catch (err) {
      setErrorMsg(err.message || 'Error updating product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInspect = async (product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
    try {
      const res = await api.getProductById(product.id);
      if (res?.data) {
        setProductDetails(res.data);
      }
    } catch {
      setProductDetails(product);
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
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#292235]">Inventory Management</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EEE5F7] text-[#503568] border border-[#DFCFF0]">
              Raw Materials & Finished Goods
            </span>
          </div>
          <p className="text-xs text-[#766D82] mt-1">
            Yarn stock at the gate, work-in-progress batches, and finished fabric rolls in storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="p-2 border border-[#E8DFEF] bg-white rounded-lg hover:bg-[#FAF7FC] text-[#503568] transition cursor-pointer"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#7950A8] hover:bg-[#674191] text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Material / Product</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice:</p>
              <p>{errorMsg}</p>
            </div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-[11px] text-[#766D82] uppercase font-semibold">Total SKUs</span>
          <p className="text-2xl font-bold text-[#292235] mt-1">{products.length}</p>
          <span className="text-[11px] text-[#766D82]">Registered items in database</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-[11px] text-[#766D82] uppercase font-semibold">Raw Yarn (Cones)</span>
          <p className="text-2xl font-bold text-[#7950A8] mt-1">
            {products.filter((p) => p.type === 'RAW_MATERIAL').length}
          </p>
          <span className="text-[11px] text-[#766D82]">Inward store stock</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-[11px] text-[#766D82] uppercase font-semibold">Finished Fabric</span>
          <p className="text-2xl font-bold text-[#503568] mt-1">
            {products.filter((p) => p.type === 'FINISHED_GOODS').length}
          </p>
          <span className="text-[11px] text-[#766D82]">Rolls ready for dispatch</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-[11px] text-[#766D82] uppercase font-semibold">Low Stock Warnings</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockItems.length}</p>
          <span className="text-[11px] text-[#766D82]">Below alert threshold</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E8DFEF] shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#766D82] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search SKU, item name, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#E8DFEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7950A8] focus:border-transparent bg-[#FAF7FC]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {['ALL', 'RAW_MATERIAL', 'FINISHED_GOODS', 'WIP', 'CONSUMABLE'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedType === type
                  ? 'bg-[#503568] text-white shadow-2xs'
                  : 'bg-[#FAF7FC] text-[#766D82] hover:bg-[#EEE5F7]'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-[#E8DFEF] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7FC] border-b border-[#E8DFEF] text-[#766D82] uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Material / Product Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Available Stock</th>
                <th className="py-3 px-4">Unit Cost</th>
                <th className="py-3 px-4">Health</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3EEF8]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#766D82]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#7950A8]" />
                    Loading inventory records...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#766D82]">
                    No inventory records found. Use <strong>"Add Material / Product"</strong> above to register raw yarn or finished fabric.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.minimumStock;
                  return (
                    <tr key={p.id} className="hover:bg-[#FAF7FC] transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-[#292235]">{p.code}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#292235]">{p.name}</div>
                        {p.specifications && (
                          <div className="text-[11px] text-[#766D82] truncate max-w-xs">{p.specifications}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEE5F7] text-[#503568] border border-[#DFCFF0]">
                          {p.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#766D82]">{p.category}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#292235]">{p.currentStock}</span>{' '}
                        <span className="text-[11px] text-[#766D82]">{p.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-[#292235] font-medium">₹{p.unitCost}</td>
                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Low Stock (Min: {p.minimumStock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Adequate Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleInspect(p)}
                            className="p-1.5 rounded-md hover:bg-[#EEE5F7] text-[#503568] transition cursor-pointer"
                            title="Inspect History"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-md hover:bg-[#EEE5F7] text-[#7950A8] transition cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-[#E8DFEF] text-[#292235]">
            <div className="px-6 py-4 border-b border-[#E8DFEF] flex items-center justify-between bg-[#FAF7FC]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#7950A8]" />
                <h3 className="font-bold text-sm text-[#292235]">Register New Textile Material / SKU</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. YRN-COT-40"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 40s Combed Cotton Yarn Cone"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Material Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  >
                    <option value="RAW_MATERIAL">RAW_MATERIAL (Yarn)</option>
                    <option value="FINISHED_GOODS">FINISHED_GOODS (Fabric)</option>
                    <option value="WIP">WIP (In-Process)</option>
                    <option value="CONSUMABLE">CONSUMABLE (Dyes/Chemicals)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Yarn, Denim, Cotton"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Unit of Measure *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
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
                  <label className="block font-semibold text-[#292235] mb-1">Initial Stock Intake</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Low Stock Alert Level</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Color / Shade</label>
                  <input
                    type="text"
                    placeholder="e.g. Indigo Blue, Bleached White"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Specifications</label>
                  <input
                    type="text"
                    placeholder="e.g. 100% Combed Cotton, 30s count"
                    value={formData.specifications}
                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8DFEF] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFEF] rounded-lg font-semibold text-[#766D82] hover:bg-[#FAF7FC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#7950A8] hover:bg-[#674191] text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving to Database...' : 'Register Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Product */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-[#E8DFEF] text-[#292235]">
            <div className="px-6 py-4 border-b border-[#E8DFEF] flex items-center justify-between bg-[#FAF7FC]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#7950A8]" />
                <h3 className="font-bold text-sm text-[#292235]">Edit Material: {editFormData.code}</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Material Type</label>
                  <select
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  >
                    <option value="RAW_MATERIAL">RAW_MATERIAL (Yarn)</option>
                    <option value="FINISHED_GOODS">FINISHED_GOODS (Fabric)</option>
                    <option value="WIP">WIP (In-Process)</option>
                    <option value="CONSUMABLE">CONSUMABLE</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Current Stock Level</label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.currentStock}
                    onChange={(e) => setEditFormData({ ...editFormData, currentStock: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.unitCost}
                    onChange={(e) => setEditFormData({ ...editFormData, unitCost: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Low Stock Warning Threshold</label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.minimumStock}
                    onChange={(e) => setEditFormData({ ...editFormData, minimumStock: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292235] mb-1">Color / Shade</label>
                  <input
                    type="text"
                    value={editFormData.color}
                    onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#292235] mb-1">Specifications</label>
                <input
                  type="text"
                  value={editFormData.specifications}
                  onChange={(e) => setEditFormData({ ...editFormData, specifications: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#292235] mb-1">Adjustment Reason (Audit Log)</label>
                <input
                  type="text"
                  placeholder="e.g. Physical inventory count reconciliation"
                  value={editFormData.adjustmentReason}
                  onChange={(e) => setEditFormData({ ...editFormData, adjustmentReason: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8DFEF] rounded-lg focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC]"
                />
              </div>

              <div className="pt-3 border-t border-[#E8DFEF] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFEF] rounded-lg font-semibold text-[#766D82] hover:bg-[#FAF7FC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#7950A8] hover:bg-[#674191] text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Inspect Product Details & Transactions */}
      {isDetailModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-[#E8DFEF] text-[#292235]">
            <div className="px-6 py-4 border-b border-[#E8DFEF] flex items-center justify-between bg-[#FAF7FC]">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#7950A8]" />
                <h3 className="font-bold text-sm text-[#292235]">Material Details & Audit History</h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#FAF7FC] p-3.5 rounded-xl border border-[#E8DFEF]">
                <div>
                  <span className="text-[#766D82] block">SKU Code:</span>
                  <span className="font-mono font-bold text-[#292235] text-sm">{selectedProduct.code}</span>
                </div>
                <div>
                  <span className="text-[#766D82] block">Product Name:</span>
                  <span className="font-bold text-[#292235]">{selectedProduct.name}</span>
                </div>
                <div>
                  <span className="text-[#766D82] block">Current Stock:</span>
                  <span className="font-bold text-[#7950A8] text-sm">{selectedProduct.currentStock} {selectedProduct.unit}</span>
                </div>
                <div>
                  <span className="text-[#766D82] block">Threshold Warning:</span>
                  <span className="font-bold text-[#292235]">{selectedProduct.minimumStock} {selectedProduct.unit}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#292235] mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#7950A8]" /> Recent Stock Movements & Audits
                </h4>
                <div className="border border-[#E8DFEF] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {productDetails?.inventoryTransactions?.length > 0 ? (
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#FAF7FC] text-[#766D82] border-b border-[#E8DFEF]">
                        <tr>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Quantity</th>
                          <th className="py-2 px-3">Ref</th>
                          <th className="py-2 px-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F3EEF8]">
                        {productDetails.inventoryTransactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="py-2 px-3 font-semibold text-[#503568]">{tx.type}</td>
                            <td className="py-2 px-3 font-bold">
                              {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                            </td>
                            <td className="py-2 px-3 text-[#766D82]">{tx.referenceNumber || '—'}</td>
                            <td className="py-2 px-3 text-[#766D82]">
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-4 text-center text-[#766D82]">
                      No movement transactions recorded for this product yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 bg-[#7950A8] text-white rounded-lg font-semibold hover:bg-[#674191] transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
