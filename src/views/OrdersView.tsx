import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext.tsx';
import { Order, OrderItem } from '../types/index.ts';
import { Icon3D } from '../components/icons/Icon3D.tsx';
import { formatMoney } from '../utils/translations.ts';
import { KoreanReceiptModal } from '../components/modals/KoreanReceiptModal.tsx';
import { playSound } from '../utils/sound.ts';
import * as XLSX from 'xlsx';
import {
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  Bluetooth,
  Edit3,
  Trash2,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  Store,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Save,
  X,
  ChevronDown,
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const {
    orders,
    products,
    staffList,
    stores,
    groups,
    settings,
    updateOrder,
    deleteOrder,
  } = usePOS();

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [filterStaff, setFilterStaff] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for Korean Print Modal
  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  // Edit Order State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState('');

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Date range filter
      if (fromDate && o.date < fromDate) return false;
      if (toDate && o.date > toDate) return false;

      // Hour range filter
      if (fromTime && o.time < fromTime) return false;
      if (toTime && o.time > toTime) return false;

      // Staff filter
      if (filterStaff !== 'all' && o.staffName !== filterStaff) return false;

      // Store filter
      if (filterStore !== 'all' && o.storeName !== filterStore) return false;

      // Group filter
      if (filterGroup !== 'all' && o.groupName !== filterGroup) return false;

      // Search query (customer name, order number, phone)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = o.customerName.toLowerCase().includes(q);
        const matchesNum = o.orderNumber.toLowerCase().includes(q);
        const matchesPhone = o.customerPhone.toLowerCase().includes(q);
        if (!matchesName && !matchesNum && !matchesPhone) return false;
      }

      return true;
    });
  }, [orders, fromDate, toDate, fromTime, toTime, filterStaff, filterStore, filterGroup, searchQuery]);

  // Export to Excel (.xlsx) using xlsx library
  const handleExportExcel = () => {
    playSound.beep();
    const rows = filteredOrders.map((o) => ({
      'លេខវិក្កយបត្រ (Order ID)': o.orderNumber,
      'កាលបរិច្ឆេទ (Date)': o.date,
      'ម៉ោង (Time)': o.time,
      'ឈ្មោះអតិថិជន (Customer)': o.customerName,
      'លេខទូរស័ព្ទ (Phone)': o.customerPhone,
      'អាស័យដ្ឋាន (Address)': o.customerAddress,
      'បុគ្គលិកលក់ (Staff)': o.staffName,
      'ឈ្មោះហាង (Store)': o.storeName,
      'ក្រុម (Group)': o.groupName,
      'ស្ថានភាពទូទាត់ (Payment)': o.paymentStatus === 'paid' ? 'ទូទាត់រួច (Paid)' : 'មិនទាន់ទូទាត់ (Unpaid)',
      'ថ្ងៃណាត់ទូទាត់ (Due Date)': o.dueDate || '',
      'សរុបដុល្លារ ($ Total)': o.total,
      'ចំណាំ (Notes)': o.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DR_POS_Orders');
    XLSX.writeFile(workbook, `DR_POS_Orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Open Edit Order Modal
  const openEditModal = (order: Order) => {
    playSound.click();
    setEditingOrder(order);
    setEditCustomerName(order.customerName);
    setEditCustomerPhone(order.customerPhone);
    setEditCustomerAddress(order.customerAddress);
    setEditDate(order.date);
    setEditPaymentStatus(order.paymentStatus);
    setEditDueDate(order.dueDate || '');
    setEditNotes(order.notes || '');
    setEditItems([...order.items]);
  };

  // Save Order Edits
  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    const newSubtotal = editItems.reduce((sum, it) => sum + it.total, 0);
    const updated: Order = {
      ...editingOrder,
      customerName: editCustomerName,
      customerPhone: editCustomerPhone,
      customerAddress: editCustomerAddress,
      date: editDate,
      paymentStatus: editPaymentStatus,
      dueDate: editPaymentStatus === 'unpaid' ? editDueDate : undefined,
      notes: editNotes,
      items: editItems,
      subtotal: Number(newSubtotal.toFixed(2)),
      total: Number(newSubtotal.toFixed(2)),
    };
    await updateOrder(updated);
    playSound.successChime();
    setEditingOrder(null);
  };

  // Delete Order and restore product stock
  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (
      confirm(
        `តើអ្នកពិតជាចង់លុបវិក្កយបត្រ ${orderNumber} មែនទេ?\n\n(ប្រព័ន្ធនឹងបូកចំនួនស្តុកទំនិញក្នុងវិក្កយបត្រនេះចូលទៅកាន់ Products វិញដោយស្វ័យប្រវត្តិ)`
      )
    ) {
      playSound.warning();
      await deleteOrder(orderId);
      alert(`✅ បានលុបវិក្កយបត្រ ${orderNumber} និងបានបូកចំនួនស្តុកទំនិញចូលក្នុង Products វិញដោយជោគជ័យ!`);
    }
  };

  // Add product to edit list
  const handleAddProductToEdit = () => {
    const prod = products.find((p) => p.id === selectedAddProductId);
    if (!prod) return;
    const existingIndex = editItems.findIndex((it) => it.productId === prod.id);
    if (existingIndex >= 0) {
      const cloned = [...editItems];
      cloned[existingIndex].quantity += 1;
      cloned[existingIndex].total = cloned[existingIndex].quantity * cloned[existingIndex].sellingPrice;
      setEditItems(cloned);
    } else {
      setEditItems([
        ...editItems,
        {
          productId: prod.id,
          productName: prod.name,
          costPrice: prod.costPrice,
          sellingPrice: prod.sellingPrice,
          quantity: 1,
          total: prod.sellingPrice,
        },
      ]);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in pb-16">
      {/* Top Header & Actions Bar */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon3D name="orders" size={36} />
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              របាយការណ៍ការបញ្ជាទិញ (Orders History)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              សរុប {filteredOrders.length} វិក្កយបត្រ · ព្រីនចេញបែបកូរ៉េ និង Export Excel
            </p>
          </div>
        </div>

        {/* Action Buttons: Export Excel */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 btn-3d"
          >
            <Icon3D name="excel" size={20} />
            <span>ប៊ូតុង Export Excel</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar (Date range, Hour range, Staff, Store, Group) */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* Search Query */}
          <div className="lg:col-span-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកតាមលេខវិក្កយបត្រ, ឈ្មោះ, ទូរស័ព្ទ..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date: From */}
          <div>
            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
              ចាប់ពីថ្ងៃ:
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none"
            />
          </div>

          {/* Date: To */}
          <div>
            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
              រហូតដល់ថ្ងៃ:
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none"
            />
          </div>

          {/* Hour: From */}
          <div>
            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
              ចាប់ពីម៉ោង:
            </label>
            <input
              type="time"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
              className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none"
            />
          </div>

          {/* Hour: To */}
          <div>
            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
              រហូតដល់ម៉ោង:
            </label>
            <input
              type="time"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none"
            />
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
                setFromTime('');
                setToTime('');
                setFilterStaff('all');
                setFilterStore('all');
                setFilterGroup('all');
                setSearchQuery('');
              }}
              className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 transition-colors"
            >
              កំណត់ឡើងវិញ
            </button>
          </div>
        </div>

        {/* Second Row: Filter by Staff, Store, Groups */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
              Filter តាមបុគ្គលិកលក់:
            </label>
            <select
              value={filterStaff}
              onChange={(e) => setFilterStaff(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="all">បុគ្គលិកទាំងអស់ (All Staff)</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
              Filter តាមឈ្មោះហាង:
            </label>
            <select
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="all">ហាងទាំងអស់ (All Stores)</option>
              {stores.map((st) => (
                <option key={st.id} value={st.name}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
              Filter តាម Groups:
            </label>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="all">ក្រុមទាំងអស់ (All Groups)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Standard Form Cart List */}
      {filteredOrders.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          មិនមានទិន្នន័យវិក្កយបត្រដែលត្រូវនឹងការស្វែងរកនេះទេ
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="card-3d relative flex flex-col justify-between p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3"
            >
              {/* Cart Top Bar */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {ord.orderNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        ord.paymentStatus === 'paid'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-rose-500 text-white animate-pulse'
                      }`}
                    >
                      {ord.paymentStatus === 'paid' ? 'ទូទាត់រួច' : 'មិនទាន់ទូទាត់'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{ord.date}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{ord.time}</span>
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    {formatMoney(ord.total, settings.currency, settings.exchangeRates)}
                  </div>
                  <div className="text-[10px] text-slate-400">${ord.total.toFixed(2)} USD</div>
                </div>
              </div>

              {/* Customer and Staff details */}
              <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <User size={13} className="text-slate-400" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {ord.customerName}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({ord.customerPhone})
                  </span>
                </div>

                {ord.customerAddress && ord.customerAddress !== 'N/A' && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
                    <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{ord.customerAddress}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>បុគ្គលិកលក់:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {ord.staffName}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>ឈ្មោះហាង:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                    {ord.storeName}
                  </span>
                </div>

                {ord.dueDate && ord.paymentStatus === 'unpaid' && (
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center justify-between">
                    <span>កាលបរិច្ឆេទណាត់ទូទាត់:</span>
                    <span>{ord.dueDate}</span>
                  </div>
                )}

                {/* Items sold preview */}
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1 max-h-24 overflow-y-auto">
                  {ord.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span className="truncate flex-1 pr-2">
                        {it.productName} <span className="font-bold">x{it.quantity}</span>
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ${it.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {ord.notes && (
                  <div className="text-[10px] text-slate-400 italic">
                    ចំណាំ: {ord.notes}
                  </div>
                )}
              </div>

              {/* Action Buttons: Korean Print, Edit, Delete */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                {/* Print Korean Receipt */}
                <button
                  onClick={() => setPrintOrder(ord)}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors border border-indigo-200 dark:border-indigo-800"
                >
                  <Printer size={13} />
                  <span>ព្រីន (កូរ៉េ)</span>
                </button>

                {/* Edit */}
                <button
                  onClick={() => openEditModal(ord)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
                  title="កែប្រែ"
                >
                  <Edit3 size={14} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteOrder(ord.id, ord.orderNumber)}
                  className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-colors"
                  title="លុប"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 px-6 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  កែប្រែការបញ្ជាទិញ {editingOrder.orderNumber}
                </h3>
                <p className="text-[11px] text-slate-500">
                  កែប្រែទំនិញ, កាលបរិច្ឆេទ, ពត៍មានអតិថិជន, ស្ថានភាពទូទាត់
                </p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    កាលបរិច្ឆេទ (Date)
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ស្ថានភាពទូទាត់
                  </label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                  >
                    <option value="paid">ទូទាត់រួច (Paid)</option>
                    <option value="unpaid">មិនទាន់ទូទាត់ (Unpaid)</option>
                  </select>
                </div>
              </div>

              {editPaymentStatus === 'unpaid' && (
                <div>
                  <label className="block text-[11px] font-semibold text-rose-600 mb-1">
                    កាលបរិច្ឆេទណាត់ទូទាត់ (Due Date)
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-rose-50/50 text-xs outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ឈ្មោះអតិថិជន
                  </label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    លេខទូរស័ព្ទ
                  </label>
                  <input
                    type="text"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  អាស័យដ្ឋាន
                </label>
                <input
                  type="text"
                  value={editCustomerAddress}
                  onChange={(e) => setEditCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                />
              </div>

              {/* Items Management */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-white">
                    ទំនិញក្នុងវិក្កយបត្រ (Items)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={selectedAddProductId}
                      onChange={(e) => setSelectedAddProductId(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
                    >
                      <option value="">+ បន្ថែមទំនិញ...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${p.sellingPrice.toFixed(2)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddProductToEdit}
                      className="px-2 py-1 bg-indigo-600 text-white rounded-lg font-bold text-xs"
                    >
                      បញ្ចូល
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 divide-y divide-slate-200 dark:divide-slate-700 max-h-36 overflow-y-auto">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                      <span className="truncate flex-1">{item.productName}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            const cloned = [...editItems];
                            cloned[idx].quantity = val;
                            cloned[idx].total = val * cloned[idx].sellingPrice;
                            setEditItems(cloned);
                          }}
                          className="w-14 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-center text-xs"
                        />
                        <span className="w-16 text-right font-bold">${item.total.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  កំណត់ចំណាំ
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"
              >
                បោះបង់
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                <Save size={14} />
                <span>រក្សាទុកការកែប្រែ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Korean Receipt Modal for Thermal 58mm/70mm/80mm or Normal Print */}
      <KoreanReceiptModal
        order={printOrder}
        onClose={() => setPrintOrder(null)}
      />
    </div>
  );
};
