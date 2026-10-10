import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit2,
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State for Editing Product master non-quantity fields
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

  const handleOpenEdit = (product) => {
    setSelectedProduct(product);
    setEditFormData({
      id: product.id,
      name: product.name,
      type: product.type,
      category: product.category || '',
      unit: product.unit,
      minimumStock: String(product.minimumStock || 0),
      unitCost: String(product.unitCost || 0),
      color: product.color || '',
      specifications: product.specifications || '',
      status: product.status,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (submitting) return;

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
      });

      setSuccessMsg(`Product specifications updated successfully.`);
      setIsEditModalOpen(false);
      await loadProducts();
    } catch (err) {
      setErrorMsg(err.message || 'Error updating product');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q));
    const matchesType = selectedType === 'ALL' || p.type === selectedType;
    return matchesSearch && matchesType;
  });

  const totalStockCount = products.reduce((sum, p) => sum + (p.currentStock || 0), 0);
  const lowStockProducts = products.filter((p) => p.currentStock <= p.minimumStock && p.minimumStock > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Module Header - Clean and Prominent */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DFEF]">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#292235] tracking-tight">
            Inventory Management
          </h1>
          <p className="text-sm sm:text-base text-[#766D82] mt-1.5">
            Real-time stock tracking for raw materials, chemicals, and finished textile fabrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="p-2.5 border border-[#E8DFEF] bg-white rounded-xl hover:bg-[#FAF7FC] text-[#503568] transition cursor-pointer min-h-[44px]"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-[#7950A8]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Information Banner regarding Workflow Stock Ingestion */}
      <div className="bg-[#FAF7FC] border border-[#E8DFEF] rounded-2xl p-4 flex items-start gap-3 text-sm text-[#503568]">
        <Info className="w-5 h-5 text-[#7950A8] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Automated Stock Intake:</span> Inventory items and quantity balances are registered directly via the <span className="font-bold underline">Purchase Goods Receipt</span> workflow. Dispatches deduct stock on gate-out.
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-start justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Notice:</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* KPI Cards Strip - Clear, Uncluttered */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Catalog Items</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#292235] mt-1">{products.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Raw Materials</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#503568] mt-1">
            {products.filter((p) => p.type === 'RAW_MATERIAL').length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Finished Goods</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#7950A8] mt-1">
            {products.filter((p) => p.type === 'FINISHED_GOODS').length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFEF] shadow-2xs">
          <span className="text-xs uppercase font-bold text-[#766D82] tracking-wider">Low Stock Warnings</span>
          <p className={`text-2xl sm:text-3xl font-extrabold mt-1 ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
            {lowStockProducts.length}
          </p>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#766D82] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by code, name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-[#E8DFEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7950A8] bg-white min-h-[42px]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'RAW_MATERIAL', 'FINISHED_GOODS', 'WORK_IN_PROGRESS', 'CONSUMABLE'].map((tp) => (
            <button
              key={tp}
              onClick={() => setSelectedType(tp)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer min-h-[38px] ${
                selectedType === tp
                  ? 'bg-[#7950A8] text-white shadow-xs'
                  : 'bg-white text-[#766D82] hover:bg-[#FAF7FC] border border-[#E8DFEF]'
              }`}
            >
              {tp.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Products Table */}
      <div className="bg-white rounded-2xl border border-[#E8DFEF] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF7FC] border-b border-[#E8DFEF] text-[#766D82] uppercase text-xs font-semibold">
              <tr>
                <th className="py-3.5 px-4">Code / SKU</th>
                <th className="py-3.5 px-4">Item Name</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Current Stock</th>
                <th className="py-3.5 px-4">Reorder Level</th>
                <th className="py-3.5 px-4">Unit Cost</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3EEF8]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#766D82]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#7950A8]" />
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#766D82]">
                    No inventory products found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.minimumStock && p.minimumStock > 0;
                  return (
                    <tr key={p.id} className="hover:bg-[#FAF7FC] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#503568]">{p.code}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#292235]">{p.name}</div>
                        <div className="text-xs text-[#766D82]">{p.category} {p.color ? `• ${p.color}` : ''}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEE5F7] text-[#503568] border border-[#DFCFF0]">
                          {p.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className={`font-bold text-base ${isLow ? 'text-amber-600' : 'text-[#292235]'}`}>
                          {p.currentStock} {p.unit}
                        </div>
                        {isLow && (
                          <span className="text-xs text-amber-700 font-semibold">Low Stock Alert</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#766D82]">{p.minimumStock} {p.unit}</td>
                      <td className="py-3.5 px-4 font-medium text-[#292235]">₹{p.unitCost?.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-2 border border-[#E8DFEF] rounded-lg hover:bg-[#EEE5F7] text-[#503568] transition cursor-pointer"
                          title="Edit Master Specifications"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Master Specifications (Non-Quantity Fields Only) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#E8DFEF] text-[#292235] my-8">
            <div className="px-6 py-4 border-b border-[#E8DFEF] flex items-center justify-between bg-[#FAF7FC]">
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-5 h-5 text-[#7950A8]" />
                <h3 className="font-bold text-lg text-[#292235]">Edit Item Specifications</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-[#766D82] hover:text-[#292235] hover:bg-[#EEE5F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-6 space-y-4">
              {/* Product Code & Current Stock Badge */}
              <div className="flex items-center justify-between p-3.5 bg-[#FAF7FC] rounded-xl border border-[#E8DFEF]">
                <div>
                  <span className="text-xs uppercase font-bold text-[#766D82]">SKU Code</span>
                  <p className="font-mono font-bold text-base text-[#503568]">{selectedProduct?.code}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-bold text-[#766D82]">Live Stock</span>
                  <p className="font-bold text-base text-[#292235]">
                    {selectedProduct?.currentStock} {selectedProduct?.unit}
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-sm text-[#292235] mb-1.5">Item Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">Category</label>
                  <input
                    type="text"
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">Unit of Measure</label>
                  <select
                    value={editFormData.unit}
                    onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  >
                    <option value="KG">KG</option>
                    <option value="METER">METER</option>
                    <option value="ROLL">ROLL</option>
                    <option value="CONE">CONE</option>
                    <option value="LITER">LITER</option>
                    <option value="PIECE">PIECE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.minimumStock}
                    onChange={(e) => setEditFormData({ ...editFormData, minimumStock: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">
                    Standard Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormData.unitCost}
                    onChange={(e) => setEditFormData({ ...editFormData, unitCost: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">Color / Shade</label>
                  <input
                    type="text"
                    value={editFormData.color}
                    onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-sm text-[#292235] mb-1.5">Specifications</label>
                  <input
                    type="text"
                    value={editFormData.specifications}
                    onChange={(e) => setEditFormData({ ...editFormData, specifications: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E8DFEF] rounded-xl focus:ring-2 focus:ring-[#7950A8] focus:outline-none bg-[#FAF7FC] text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8DFEF] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 border border-[#E8DFEF] rounded-xl font-semibold text-[#766D82] hover:bg-[#FAF7FC] transition cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#7950A8] hover:bg-[#674191] text-white rounded-xl font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
