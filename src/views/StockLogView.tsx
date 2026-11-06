import React, { useState } from 'react';
import { usePOS } from '../context/POSContext.tsx';
import { StockLog } from '../types/index.ts';
import { Icon3D } from '../components/icons/Icon3D.tsx';
import { playSound } from '../utils/sound.ts';
import {
  Boxes,
  Plus,
  Calendar,
  User,
  ArrowUpRight,
  Search,
  Save,
  X,
  PackagePlus,
} from 'lucide-react';

export const StockLogView: React.FC = () => {
  const { stockLogs, products, staffList, addStockLog } = usePOS();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedProdId, setSelectedProdId] = useState(products[0]?.id || '');
  const [addedQty, setAddedQty] = useState<number>(10);
  const [logNotes, setLogNotes] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(staffList[0]?.name || 'ហួត ដារ៉ា');

  const filtered = stockLogs.filter((log) => {
    if (!search.trim()) return true;
    return log.productName.toLowerCase().includes(search.toLowerCase());
  });

  const handleOpenAdd = () => {
    setSelectedProdId(products[0]?.id || '');
    setAddedQty(10);
    setLogNotes('នាំចូលស្តុកបន្ថែមប្រចាំសប្តាហ៍');
    setIsModalOpen(true);
    playSound.click();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    const prev = prod.stock;
    const next = prev + addedQty;

    await addStockLog({
      productId: prod.id,
      productName: prod.name,
      addedQuantity: addedQty,
      previousQuantity: prev,
      newQuantity: next,
      date: new Date().toISOString().split('T')[0],
      notes: logNotes,
      staffName: selectedStaff,
    });

    playSound.successChime();
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in pb-16">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon3D name="stock_log" size={36} />
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              ប្រវត្តិស្តុកទំនិញ (Stock Log History)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ប្រវត្តិនៃការបញ្ចូលស្តុកទំនិញបន្ថែម (ឈ្មោះទំនិញដែលបានបញ្ចូលស្តុក, កាលបរិច្ឆេទ)
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 btn-3d"
        >
          <PackagePlus size={16} />
          <span>+ បញ្ចូលស្តុកបន្ថែម (Restock Item)</span>
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
            placeholder="ស្វែងរកតាមឈ្មោះទំនិញដែលបានបញ្ចូលស្តុក..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Stock Log Standard Form Carts Grid */}
      {filtered.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          មិនមានប្រវត្តិនៃការបញ្ចូលស្តុកនៅឡើយទេ
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="card-3d relative flex flex-col justify-between p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {log.productName}
                  </h3>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Calendar size={11} />
                    <span>កាលបរិច្ឆេទបញ្ចូលស្តុក៖ {log.date}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                  <ArrowUpRight size={13} />
                  <span>+{log.addedQuantity}</span>
                </span>
              </div>

              {/* Quantity changes */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">ស្តុកចាស់:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    {log.previousQuantity}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-900 text-center">
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 block">ស្តុកថ្មី:</span>
                  <span className="font-black text-teal-700 dark:text-teal-300 text-sm">
                    {log.newQuantity}
                  </span>
                </div>
              </div>

              {/* Staff and notes */}
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                {log.staffName && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">អ្នកបញ្ចូលស្តុក:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.staffName}
                    </span>
                  </div>
                )}
                {log.notes && (
                  <div className="text-[10px] text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                    ចំណាំ៖ {log.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Stock Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 px-6 bg-teal-600 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                បញ្ចូលស្តុកទំនិញបន្ថែម (Restock Item)
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-white/80 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ជ្រើសរើសទំនិញ *
                </label>
                <select
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (ស្តុកបច្ចុប្បន្ន: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ចំនួនបន្ថែម (+ Quantity) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={addedQty}
                  onChange={(e) => setAddedQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  បុគ្គលិកទទួលបន្ទុក
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  កំណត់ចំណាំ
                </label>
                <textarea
                  rows={2}
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="ចំណាំបន្ថែមលើប្រភពទំនិញ ឬការដឹកជញ្ជូន..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none resize-none"
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
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 btn-3d"
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
