import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext.tsx';
import { Icon3D } from '../components/icons/Icon3D.tsx';
import { formatMoney } from '../utils/translations.ts';
import {
  User,
  Calendar,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Award,
  ChevronRight,
  Phone,
  Briefcase,
} from 'lucide-react';

export const TrackStaffView: React.FC = () => {
  const { staffList, orders, settings } = usePOS();
  const [selectedStaffName, setSelectedStaffName] = useState<string>(
    staffList[0]?.name || 'all'
  );
  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('day');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const currentYearStr = todayStr.substring(0, 4); // YYYY

  // Filter orders by staff and time period
  const staffOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStaff =
        selectedStaffName === 'all' || o.staffName === selectedStaffName;
      if (!matchStaff) return false;

      if (period === 'day') {
        return o.date === todayStr;
      }
      if (period === 'month') {
        return o.date.startsWith(currentMonthStr);
      }
      if (period === 'year') {
        return o.date.startsWith(currentYearStr);
      }
      return true;
    });
  }, [orders, selectedStaffName, period, todayStr, currentMonthStr, currentYearStr]);

  const totalSalesRevenue = staffOrders.reduce((sum, o) => sum + o.total, 0);
  const totalItemsSold = staffOrders.reduce(
    (sum, o) => sum + o.items.reduce((iSum, it) => iSum + it.quantity, 0),
    0
  );

  return (
    <div className="space-y-5 animate-in fade-in pb-16">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon3D name="track_staff" size={36} />
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              តាមដានការលក់បុគ្គលិក (Track Staff Performance)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ទិន្នន័យលក់បុគ្គលិកម្នាក់ៗប្រចាំ ថ្ងៃ/ខែ/ឆ្នាំ (កាលបរិច្ឆេទលក់, ឈ្មោះអតិថិជន, ឈ្មោះទំនិញលក់បាន, តម្លៃ)
            </p>
          </div>
        </div>

        {/* Time Period Filter Tabs */}
        <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs">
          {(['day', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-xl font-bold transition-all ${
                period === p
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {p === 'day' ? 'ប្រចាំថ្ងៃ (Today)' : p === 'month' ? 'ប្រចាំខែ (Month)' : 'ប្រចាំឆ្នាំ (Year)'}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Filter Selector Cards */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setSelectedStaffName('all')}
          className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 btn-3d ${
            selectedStaffName === 'all'
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Award size={16} />
          <span>បុគ្គលិកទាំងអស់ ({staffList.length})</span>
        </button>

        {staffList.map((s) => {
          const isSelected = selectedStaffName === s.name;
          const staffTotal = orders
            .filter((o) => o.staffName === s.name)
            .reduce((sum, o) => sum + o.total, 0);

          return (
            <button
              key={s.id}
              onClick={() => setSelectedStaffName(s.name)}
              className={`p-3 px-4 rounded-2xl border text-xs transition-all flex items-center gap-3 flex-shrink-0 btn-3d ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white border-transparent shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                {s.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="font-bold leading-tight">{s.name}</div>
                <div className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {s.position} · ${staffTotal.toFixed(0)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Staff Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-3d p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">ចំណូលលក់សរុប:</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {formatMoney(totalSalesRevenue, settings.currency, settings.exchangeRates)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {period === 'day' ? 'ថ្ងៃនេះ' : period === 'month' ? 'ខែនេះ' : 'ឆ្នាំនេះ'}
          </div>
        </div>

        <div className="card-3d p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">ចំនួនវិក្កយបត្រលក់បាន:</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {staffOrders.length} <span className="text-xs font-normal text-slate-400">វិក្កយបត្រ</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">ការបញ្ជាទិញជាក់ស្តែង</div>
        </div>

        <div className="card-3d p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">ចំនួនទំនិញលក់បាន:</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {totalItemsSold} <span className="text-xs font-normal text-slate-400">ឯកតា</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">មុខទំនិញសរុប</div>
        </div>
      </div>

      {/* Staff Sales History Details Grid (Form Carts) */}
      {staffOrders.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          មិនមានទិន្នន័យការលក់សម្រាប់បុគ្គលិកនេះក្នុងកំឡុងពេលនេះទេ
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffOrders.map((ord) => (
            <div
              key={ord.id}
              className="card-3d p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {ord.orderNumber}
                  </span>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Calendar size={11} />
                    <span>កាលបរិច្ឆេទលក់៖ {ord.date} {ord.time}</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ord.paymentStatus === 'paid'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {ord.paymentStatus === 'paid' ? 'ទូទាត់រួច' : 'មិនទាន់ទូទាត់'}
                </span>
              </div>

              {/* Info: ឈ្មោះអតិថិជន, បុគ្គលិកលក់ */}
              <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">ឈ្មោះអតិថិជន:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {ord.customerName}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">បុគ្គលិកលក់:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {ord.staffName}
                  </span>
                </div>

                {/* ឈ្មោះទំនិញលក់បាន List */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 mt-2">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">
                    ឈ្មោះទំនិញលក់បាន ({ord.items.length}):
                  </span>
                  {ord.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px]">
                      <span className="truncate pr-2">
                        {it.productName} <span className="font-bold text-slate-900 dark:text-white">x{it.quantity}</span>
                      </span>
                      <span className="font-semibold">${it.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Price */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">តម្លៃសរុប:</span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {formatMoney(ord.total, settings.currency, settings.exchangeRates)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
