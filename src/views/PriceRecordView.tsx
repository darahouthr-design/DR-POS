import React, { useState } from 'react';
import { usePOS } from '../context/POSContext.tsx';
import { PriceRecord } from '../types/index.ts';
import { Icon3D } from '../components/icons/Icon3D.tsx';
import { playSound } from '../utils/sound.ts';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Save,
  Upload,
  X,
  Search,
  DollarSign,
} from 'lucide-react';

export const PriceRecordView: React.FC = () => {
  const { priceRecords, addPriceRecord, updatePriceRecord, deletePriceRecord, setActiveZoomImage } = usePOS();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [productName, setProductName] = useState('');
  const [image, setImage] = useState('');
  const [notes, setNotes] = useState('');
  const [priceTiers, setPriceTiers] = useState<{ label: string; price: number }[]>([
    { label: 'លក់រាយ (Retail)', price: 0 },
    { label: 'លក់ដុំ (Wholesale)', price: 0 },
  ]);

  const filtered = priceRecords.filter((pr) => {
    if (!search.trim()) return true;
    return pr.productName.toLowerCase().includes(search.toLowerCase());
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setProductName('');
    setImage('https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80');
    setNotes('');
    setPriceTiers([
      { label: 'លក់រាយ (Retail)', price: 2.5 },
      { label: 'លក់ដុំ (Wholesale)', price: 2.0 },
      { label: 'តម្លៃ VIP (VIP)', price: 2.2 },
    ]);
    setIsModalOpen(true);
    playSound.click();
  };

  const handleOpenEdit = (rec: PriceRecord) => {
    setEditingId(rec.id);
    setProductName(rec.productName);
    setImage(rec.image);
    setNotes(rec.notes || '');
    setPriceTiers([...rec.prices]);
    setIsModalOpen(true);
    playSound.click();
  };

  const handleAddTier = () => {
    setPriceTiers([...priceTiers, { label: 'តម្លៃពិសេស (Special)', price: 0 }]);
  };

  const handleRemoveTier = (idx: number) => {
    setPriceTiers(priceTiers.filter((_, i) => i !== idx));
  };

  const handleUpdateTier = (idx: number, field: 'label' | 'price', value: any) => {
    const cloned = [...priceTiers];
    cloned[idx] = { ...cloned[idx], [field]: field === 'price' ? parseFloat(value) || 0 : value };
    setPriceTiers(cloned);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;

    if (editingId) {
      await updatePriceRecord({
        id: editingId,
        productName,
        image: image || 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
        prices: priceTiers,
        notes,
        updatedAt: new Date().toISOString().split('T')[0],
      });
    } else {
      await addPriceRecord({
        productName,
        image: image || 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
        prices: priceTiers,
        notes,
      });
    }

    playSound.successChime();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, pName: string) => {
    if (confirm(`តើអ្នកពិតជាចង់លុបកំណត់ត្រាតម្លៃ "${pName}" មែនទេ?`)) {
      playSound.warning();
      await deletePriceRecord(id);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in pb-16">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon3D name="price_record" size={36} />
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              កំណត់ត្រាតម្លៃទំនិញ (Price Records)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              កត់ត្រាតម្លៃទំនិញច្រើនកម្រិត (លក់រាយ, លក់ដុំ, VIP, តំណាងចែកចាយ)
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/25 btn-3d"
        >
          <Plus size={16} />
          <span>+ បន្ថែមកំណត់ត្រាតម្លៃ (Add Price Record)</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 text-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះទំនិញ..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Price Record Standard Form Cart Grid */}
      {filtered.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          មិនមានកំណត់ត្រាតម្លៃនៅឡើយទេ
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pr) => (
            <div
              key={pr.id}
              className="card-3d relative flex flex-col justify-between p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3"
            >
              {/* Product and Image */}
              <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <img
                  src={pr.image}
                  alt={pr.productName}
                  onClick={() => setActiveZoomImage(pr.image)}
                  className="w-16 h-16 rounded-2xl object-cover cursor-zoom-in border border-slate-200 dark:border-slate-700"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                    {pr.productName}
                  </h3>
                  <div className="text-[10px] text-slate-400 mt-1">
                    កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាព៖ {pr.updatedAt}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(pr)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(pr.id, pr.productName)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Multiple Selling Price Tiers (តម្លៃលក់ អាចកំណត់បានច្រើន) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  កម្រិតតម្លៃលក់ (Selling Price Tiers):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {pr.prices.map((tier, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 text-xs"
                    >
                      <span className="text-[10px] text-slate-500 block truncate">
                        {tier.label}
                      </span>
                      <span className="text-sm font-black text-amber-700 dark:text-amber-300">
                        ${tier.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {pr.notes && (
                <div className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                  {pr.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Price Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 px-6 bg-amber-600 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingId ? 'កែប្រែកំណត់ត្រាតម្លៃ' : 'បន្ថែមកំណត់ត្រាតម្លៃទំនិញ'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-white/80 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ឈ្មោះទំនិញ *
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="ឧ. កាហ្វេប្រណិត Iced Latte Special"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Upload Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Uploads រូបភាពទំនិញ
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={image || 'https://placehold.co/100x100?text=Price'}
                    alt="Preview"
                    onClick={() => setActiveZoomImage(image)}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-300 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1.5">
                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer font-bold text-slate-700 dark:text-slate-300 text-xs border border-slate-300 dark:border-slate-700">
                      <Upload size={14} />
                      <span>Upload File រូបភាព</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="ឬ Image URL..."
                      className="w-full px-3 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Multiple Selling Prices */}
              <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-white">
                    តម្លៃលក់ “អាចកំណត់បានច្រើន” (Multiple Prices):
                  </span>
                  <button
                    type="button"
                    onClick={handleAddTier}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    <Plus size={13} />
                    <span>បន្ថែមតម្លៃថ្មី</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {priceTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tier.label}
                        onChange={(e) => handleUpdateTier(idx, 'label', e.target.value)}
                        placeholder="ឈ្មោះប្រភេទតម្លៃ (ឧ. លក់រាយ, VIP)"
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                      />
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={tier.price}
                          onChange={(e) => handleUpdateTier(idx, 'price', e.target.value)}
                          className="w-full pl-6 pr-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                        />
                      </div>
                      {priceTiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTier(idx)}
                          className="p-1 text-rose-500 hover:text-rose-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  កំណត់ចំណាំ (Notes)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ចំណាំបន្ថែមលើកម្រិតតម្លៃ..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 btn-3d"
                >
                  <Save size={14} />
                  <span>រក្សាទុក</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
