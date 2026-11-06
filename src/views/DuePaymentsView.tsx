import React, { useState } from 'react';
import { usePOS } from '../context/POSContext.tsx';
import { Order } from '../types/index.ts';
import { Icon3D } from '../components/icons/Icon3D.tsx';
import { formatMoney } from '../utils/translations.ts';
import { playSound } from '../utils/sound.ts';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Store,
  DollarSign,
  Edit2,
  CheckCircle,
  X,
  Search,
  AlertCircle,
} from 'lucide-react';

export const DuePaymentsView: React.FC = () => {
  const { orders, settings, updateOrder } = usePOS();
  const [search, setSearch] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [markPaid, setMarkPaid] = useState(false);

  // Due payments are orders where paymentStatus is unpaid AND dueDate is set
  const dueOrders = orders.filter(
    (o) =>
      o.paymentStatus === 'unpaid' &&
      (search.trim() === '' ||
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.customerPhone.includes(search) ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()))
  );

  const totalDueAmount = dueOrders.reduce((sum, o) => sum + o.total, 0);

  const handleOpenEdit = (ord: Order) => {
    playSound.click();
    setEditingOrder(ord);
    setNewDueDate(ord.dueDate || '');
    setMarkPaid(false);
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    const updated: Order = {
      ...editingOrder,
      dueDate: markPaid ? undefined : newDueDate,
      paymentStatus: markPaid ? 'paid' : 'unpaid',
      notes: markPaid
        ? `${editingOrder.notes ? editingOrder.notes + ' | ' : ''}បានទូទាត់រួចនៅថ្ងៃ ${new Date().toISOString().split('T')[0]}`
        : editingOrder.notes,
    };
    await updateOrder(updated);
    playSound.successChime();
    setEditingOrder(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in pb-16">
      {/* Top Banner & Summary */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon3D name="due_payments" size={36} />
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              របាយការណ៍អតិថិជនណាត់ទូទាត់ (Due Payments)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              អតិថិជនជំពាក់ ឬបានកំណត់កាលបរិច្ឆេទណាត់ទូទាត់ក្នុង Orders
            </p>
          </div>
        </div>

        <div className="px-5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
              សរុបប្រាក់ជំពាក់មិនទាន់ទូទាត់
            </span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400">
              {formatMoney(totalDueAmount, settings.currency, settings.exchangeRates)}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះអតិថិជន លេខទូរស័ព្ទ ឬវិក្កយបត្រ..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Due Payments Standard Form Cart Grid */}
      {dueOrders.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          មិនមានអតិថិជនជំពាក់ ឬណាត់ទូទាត់នៅឡើយទេ
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dueOrders.map((ord) => (
            <div
              key={ord.id}
              className="card-3d relative flex flex-col justify-between p-5 rounded-3xl bg-gradient-to-br from-rose-50/60 to-white dark:from-rose-950/20 dark:to-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-md space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/40 pb-2.5">
                <div>
                  <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                    {ord.orderNumber}
                  </span>
                  <div className="text-[10px] text-slate-400">
                    លក់នៅ៖ {ord.date} {ord.time}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-rose-600 dark:text-rose-400">
                    {formatMoney(ord.total, settings.currency, settings.exchangeRates)}
                  </div>
                  <div className="text-[10px] text-slate-400">${ord.total.toFixed(2)} USD</div>
                </div>
              </div>

              {/* Due Date Alert Card */}
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                  <Calendar size={14} />
                  <span>កាលបរិច្ឆេទណាត់ទូទាត់:</span>
                </span>
                <span className="font-black text-rose-700 dark:text-rose-300">
                  {ord.dueDate || 'មិនទាន់កំណត់'}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <User size={13} className="text-slate-400" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {ord.customerName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Phone size={13} className="text-slate-400" />
                  <span>{ord.customerPhone}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Store size={13} className="text-slate-400" />
                  <span className="truncate">{ord.storeName}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  បុគ្គលិកលក់៖ <span className="font-semibold text-slate-700 dark:text-slate-300">{ord.staffName}</span>
                </div>
                {ord.notes && (
                  <div className="text-[10px] text-slate-400 italic">
                    ចំណាំ៖ {ord.notes}
                  </div>
                )}
              </div>

              {/* Edit button */}
              <div className="pt-2 border-t border-rose-100 dark:border-rose-900/40">
                <button
                  onClick={() => handleOpenEdit(ord)}
                  className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-rose-200 dark:border-rose-800 btn-3d shadow-sm"
                >
                  <Edit2 size={13} />
                  <span>ប៊ូតុង Edit (កែប្រែ / បិទការណាត់ទូទាត់)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Due Payment Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 px-6 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                កែប្រែការណាត់ទូទាត់ {editingOrder.orderNumber}
              </h3>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-1">
                <div className="font-bold text-slate-800 dark:text-white">
                  អតិថិជន៖ {editingOrder.customerName}
                </div>
                <div className="text-slate-500">លេខទូរស័ព្ទ៖ {editingOrder.customerPhone}</div>
                <div className="text-base font-black text-rose-600">
                  ទឹកប្រាក់៖ ${editingOrder.total.toFixed(2)}
                </div>
              </div>

              {/* Toggle: Settle & Close Due Payment (ទូទាត់រួច) */}
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white block">
                    អតិថិជនបានទូទាត់រួចរាល់ (Mark as Paid)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    កំណត់បិទថ្ងៃណាត់ទូទាត់ និងដកចេញពីបញ្ជីជំពាក់
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={markPaid}
                  onChange={(e) => setMarkPaid(e.target.checked)}
                  className="w-5 h-5 rounded accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Edit Due Date if not settled */}
              {!markPaid && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    កែប្រែកាលបរិច្ឆេទណាត់ទូទាត់ថ្មី (New Due Date)
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 btn-3d"
                >
                  រក្សាទុក
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
