import React, { useState } from 'react';
import { usePOS } from '../context/POSContext.tsx';
import { Product } from '../types/index.ts';
import { Icon3D } from '../components/icons/Icon3D.tsx';
import { formatMoney } from '../utils/translations.ts';
import { BarcodeScannerModal } from '../components/modals/BarcodeScannerModal.tsx';
import { playSound } from '../utils/sound.ts';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  Camera,
  Upload,
  ArrowUp,
  ArrowDown,
  Tag,
  Boxes,
  Barcode,
  Search,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const {
    products,
    categories,
    warehouses,
    settings,
    addProduct,
    updateProduct,
    deleteProduct,
    reorderProducts,
    setActiveZoomImage,
  } = usePOS();

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  // Scanner modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'form' | 'search'>('form');

  // Add/Edit Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSellingPrice, setFormSellingPrice] = useState<number>(0);
  const [formPromo, setFormPromo] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(10);
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState(categories[0]?.name || '');
  const [formWarehouse, setFormWarehouse] = useState(warehouses[0]?.name || '');

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormImage('https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80');
    setFormCostPrice(0);
    setFormSellingPrice(0);
    setFormPromo(0);
    setFormStock(10);
    setFormBarcode(String(Math.floor(88500000000 + Math.random() * 9999999)));
    setFormCategory(categories[0]?.name || '');
    setFormWarehouse(warehouses[0]?.name || '');
    setIsFormOpen(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsFormOpen(true);
    playSound.click();
  };

  const handleStartEdit = (p: Product) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormImage(p.image);
    setFormCostPrice(p.costPrice);
    setFormSellingPrice(p.sellingPrice);
    setFormPromo(p.promotionDiscount || 0);
    setFormStock(p.stock);
    setFormBarcode(p.barcode);
    setFormCategory(p.category);
    setFormWarehouse(p.warehouse);
    setIsFormOpen(true);
    playSound.click();
  };

  // Image upload handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Form submit
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('សូមបញ្ចូលឈ្មោះទំនិញ!');
      return;
    }

    if (editingId) {
      const existing = products.find((p) => p.id === editingId);
      if (existing) {
        await updateProduct({
          ...existing,
          name: formName,
          image: formImage || existing.image,
          costPrice: Number(formCostPrice) || 0,
          sellingPrice: Number(formSellingPrice) || 0,
          promotionDiscount: Number(formPromo) || 0,
          stock: Number(formStock) || 0,
          barcode: formBarcode,
          category: formCategory,
          warehouse: formWarehouse,
        });
      }
    } else {
      await addProduct({
        name: formName,
        image: formImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
        costPrice: Number(formCostPrice) || 0,
        sellingPrice: Number(formSellingPrice) || 0,
        promotionDiscount: Number(formPromo) || 0,
        stock: Number(formStock) || 0,
        barcode: formBarcode || String(Math.floor(88500000000 + Math.random() * 9999999)),
        category: formCategory,
        warehouse: formWarehouse,
      });
    }

    playSound.successChime();
    resetForm();
  };

  // Delete product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`តើអ្នកពិតជាចង់លុបទំនិញ "${name}" មែនទេ?`)) {
      playSound.warning();
      await deleteProduct(id);
    }
  };

  // Filtered products list
  const filtered = products
    .filter((p) => {
      const matchesCat = selectedCat === 'all' || p.category === selectedCat;
      const matchesSearch =
        search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-5 animate-in fade-in pb-16">
      {/* Top Header & Actions Bar */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon3D name="products" size={36} />
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              គ្រប់គ្រងទំនិញ (Products Management)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              សរុប {products.length} មុខទំនិញ · ផ្លាស់ប្តូរទីតាំង Reorder ឡើងចុះធ្វើសមកាលកម្មជាមួយ POS
            </p>
          </div>
        </div>

        <button
          onClick={handleStartAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 btn-3d"
        >
          <Plus size={16} />
          <span>+ បន្ថែមទំនិញថ្មី (Add Product)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខបាកូដ..."
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-none"
        >
          <option value="all">Categories ទាំងអស់</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Product Form Modal (Add / Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 px-6 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingId ? 'កែប្រែទំនិញ (Edit Product)' : 'បន្ថែមទំនិញថ្មី (Add Product)'}
              </h3>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ឈ្មោះ Product *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ឧ. កាហ្វេទឹកដោះគោ Iced Latte"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Upload Image & Preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  រូបភាព Product (Upload / URL)
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={formImage || 'https://placehold.co/100x100?text=Product'}
                    alt="Preview"
                    onClick={() => setActiveZoomImage(formImage)}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <div className="flex-1 space-y-2">
                    <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer font-bold text-slate-700 dark:text-slate-300 text-xs border border-slate-300 dark:border-slate-700">
                      <Upload size={14} />
                      <span>ជ្រើសរើសរូបភាពពីឧបករណ៍ (Upload File)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      placeholder="ឬបិទភ្ជាប់ Image URL..."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Cost & Selling Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    តម្លៃដើម (Cost Price $)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    តម្លៃលក់ (Selling Price $) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none font-bold"
                  />
                </div>
              </div>

              {/* Promo & Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ប្រម៉ូសិន (Promotion Discount %)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formPromo}
                    onChange={(e) => setFormPromo(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ចំនួនស្តុក (Stock Qty) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none font-bold"
                  />
                </div>
              </div>

              {/* Barcode with Camera Scan Button */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>បារកូដ (Barcode)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTarget('form');
                      setIsScannerOpen(true);
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Camera size={13} />
                    <span>បើកកាមេរ៉ាស្កេនបាកូដ</span>
                  </button>
                </label>
                <input
                  type="text"
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  placeholder="88501234001"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono outline-none"
                />
              </div>

              {/* Categories & Warehouse from Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categories (ពី Setting)
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ដាក់ទំនិញតាមឃ្លាំង (ពី Setting)
                  </label>
                  <select
                    value={formWarehouse}
                    onChange={(e) => setFormWarehouse(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.name}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 -mx-5 -mb-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20 btn-3d"
                >
                  <Save size={15} />
                  <span>ប៊ូតុងរក្សាទុក</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Form Carts Grid with Reorder Buttons and Image Zoom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((prod, index) => {
          const isFirst = index === 0;
          const isLast = index === filtered.length - 1;

          return (
            <div
              key={prod.id}
              className="card-3d relative flex flex-col justify-between p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3"
            >
              {/* Product Image Click for Zoom In / Zoom Out */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={prod.image}
                  alt={prod.name}
                  onClick={() => setActiveZoomImage(prod.image)}
                  className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-300"
                />

                {/* Stock badge */}
                <span
                  className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-black ${
                    prod.stock <= 10 ? 'bg-amber-500 text-white' : 'bg-black/60 text-white backdrop-blur'
                  }`}
                >
                  ស្តុក: {prod.stock}
                </span>

                {/* Promo */}
                {prod.promotionDiscount > 0 && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-500 text-white">
                    -{prod.promotionDiscount}%
                  </span>
                )}

                {/* Reorder Up / Down Controls (syncs order with POS!) */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur rounded-xl p-1">
                  <button
                    disabled={isFirst}
                    onClick={() => reorderProducts(index, index - 1)}
                    title="ផ្លាស់ទីឡើងលើ"
                    className="p-1 rounded-lg text-white hover:bg-white/20 disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    disabled={isLast}
                    onClick={() => reorderProducts(index, index + 1)}
                    title="ផ្លាស់ទីចុះក្រោម"
                    className="p-1 rounded-lg text-white hover:bg-white/20 disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                  {prod.name}
                </h4>
                <div className="text-[10px] text-slate-400 font-mono">
                  បាកូដ: {prod.barcode}
                </div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  {prod.category} · {prod.warehouse}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400">តម្លៃលក់:</span>
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      ${prod.sellingPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">តម្លៃដើម:</span>
                    <div className="text-xs text-slate-500 font-semibold">
                      ${prod.costPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons: Edit & Delete */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleStartEdit(prod)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Edit2 size={13} />
                  <span>ប៊ូតុងកែប្រែ</span>
                </button>
                <button
                  onClick={() => handleDeleteProduct(prod.id, prod.name)}
                  className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-colors"
                  title="លុប"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => {
          if (scannerTarget === 'form') {
            setFormBarcode(code);
          } else {
            setSearch(code);
          }
        }}
      />
    </div>
  );
};
