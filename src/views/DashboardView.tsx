import React, { useState } from 'react';
import { usePOS } from '../context/POSContext.tsx';
import { Icon3D } from '../components/icons/Icon3D.tsx';
import { formatMoney } from '../utils/translations.ts';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Phone,
  User,
  Store,
  CheckCircle,
  PackageCheck,
  ChevronRight,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    orders,
    products,
    staffList,
    settings,
    setActivePage,
    setActiveZoomImage,
  } = usePOS();

  const [chartRange, setChartRange] = useState<'today' | 'week' | 'month'>('today');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter((o) => o.date === todayStr);

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const todayOrderCount = todayOrders.length;
  const todayItemsCount = todayOrders.reduce(
    (sum, o) => sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0),
    0
  );

  // Due payments from orders
  const duePaymentOrders = orders.filter(
    (o) => o.paymentStatus === 'unpaid' && o.dueDate
  );
  const totalPendingDue = duePaymentOrders.reduce((sum, o) => sum + o.total, 0);

  // Low stock products (<= 10)
  const lowStockProducts = products.filter((p) => p.stock <= 10);

  // Recent 6 orders
  const recentOrders = orders.slice(0, 6);

  // Mini Chart data simulation for week
  const weekDays = ['ច័ន្ទ (Mon)', 'អង្គារ (Tue)', 'ពុធ (Wed)', 'ព្រហ (Thu)', 'សុក្រ (Fri)', 'សៅរ៍ (Sat)', 'អាទិត្យ (Sun)'];
  const weekSales = [120, 185, 140, 260, 310, 450, todayRevenue > 0 ? todayRevenue : 290];
  const maxSale = Math.max(...weekSales, 100);

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-xs uppercase tracking-wide">
                DR-POS PRO Realtime
              </span>
              <span className="text-sky-200 text-xs">
                {new Date().toLocaleDateString('km-KH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              ផ្ទាំងគ្រប់គ្រងការលក់ និងស្តុក (Sales Dashboard)
            </h1>
            <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl">
              របាយការណ៍បច្ចុប្បន្នភាព Realtime ធ្វើសមកាលកម្មគ្រប់ឧបករណ៍ក្នុងពេលតែមួយ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePage('pos')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-indigo-900 font-extrabold text-xs shadow-lg hover:bg-indigo-50 btn-3d"
            >
              <Icon3D name="pos" size={24} />
              <span>បើកការលក់ POS</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Standard Summary Form Carts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today Revenue */}
        <div className="card-3d relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              ចំណូលលក់ថ្ងៃនេះ (Today Revenue)
            </span>
            <Icon3D name="revenue" size={36} />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {formatMoney(todayRevenue, settings.currency, settings.exchangeRates)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={14} />
              <span>ការលក់ជាក់ស្តែងថ្ងៃនេះ</span>
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
        </div>

        {/* Card 2: Total Orders */}
        <div className="card-3d relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              ចំនួនវិក្កយបត្រ (Today Orders)
            </span>
            <Icon3D name="orders" size={36} />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {todayOrderCount} <span className="text-sm font-semibold text-slate-400">វិក្កយបត្រ</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-sky-600 dark:text-sky-400">
              <ShoppingBag size={14} />
              <span>{todayItemsCount} ទំនិញលក់បាន</span>
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-sky-500 to-blue-500" />
        </div>

        {/* Card 3: Due Payments Pending */}
        <div className="card-3d relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              ប្រាក់ណាត់ទូទាត់ (Due Payments)
            </span>
            <Icon3D name="due_payments" size={36} />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              {formatMoney(totalPendingDue, settings.currency, settings.exchangeRates)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-500">
              <Clock size={14} />
              <span>{duePaymentOrders.length} អតិថិជនជំពាក់/ណាត់ថ្ងៃ</span>
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
        </div>

        {/* Card 4: Low Stock Alert */}
        <div className="card-3d relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              ស្តុកជិតអស់ (Low Stock &le; 10)
            </span>
            <Icon3D name="products" size={36} />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {lowStockProducts.length} <span className="text-sm font-semibold text-slate-400">មុខទំនិញ</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle size={14} />
              <span>ត្រូវការបន្ថែមស្តុកបន្ទាន់</span>
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        </div>
      </div>

      {/* Sales Trend Chart & Low Stock Side Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart Graphic (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-600" />
                <span>ក្រាហ្វិកទិន្នន័យលក់ (Sales Analytics)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ស្ថិតិលក់សប្តាហ៍នេះ និងប្រចាំថ្ងៃ
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              {(['today', 'week', 'month'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs capitalize transition-all ${
                    chartRange === r
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {r === 'today' ? 'ថ្ងៃនេះ' : r === 'week' ? 'សប្តាហ៍នេះ' : 'ខែនេះ'}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Bars */}
          <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2">
            {weekDays.map((day, idx) => {
              const val = weekSales[idx];
              const pct = Math.round((val / maxSale) * 100);
              const isToday = idx === 6;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${val}
                  </span>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden h-full flex items-end">
                    <div
                      style={{ height: `${pct}%` }}
                      className={`w-full rounded-t-xl transition-all duration-500 group-hover:brightness-110 ${
                        isToday
                          ? 'bg-gradient-to-t from-indigo-600 to-sky-400 shadow-md shadow-indigo-500/30'
                          : 'bg-gradient-to-t from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-500'
                      }`}
                    />
                  </div>
                  <span className={`text-[10px] font-medium truncate max-w-full text-center ${
                    isToday ? 'text-indigo-600 font-bold' : 'text-slate-500'
                  }`}>
                    {day.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock Quick Cart List (1 Col) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Icon3D name="products" size={26} />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {'ស្តុកជិតអស់ (<= 10)'}
                </h3>
                <p className="text-[10px] text-slate-500">មុខទំនិញត្រូវការទិញចូល</p>
              </div>
            </div>
            <button
              onClick={() => setActivePage('products')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
            >
              <span>គ្រប់គ្រង</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-64 pr-1">
            {lowStockProducts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                ស្តុកទំនិញទាំងអស់គ្រប់គ្រាន់ល្អ!
              </div>
            ) : (
              lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 transition-all hover:bg-amber-100/50"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    onClick={() => setActiveZoomImage(p.image)}
                    className="w-12 h-12 rounded-xl object-cover cursor-pointer hover:opacity-80"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate">{p.warehouse}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white">
                        សល់ {p.stock}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        ${p.sellingPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Due Payments Section (របាយការណ៍អតិថិជនណាត់ទូទាត់) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Icon3D name="due_payments" size={30} />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                របាយការណ៍អតិថិជនណាត់ទូទាត់ (Due Payment Customers)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                បង្ហាញកាលបរិច្ឆេទណាត់ទូទាត់, ឈ្មោះបុគ្គលិក, ឈ្មោះអតិថិជន, លេខទូរស័ព្ទ, ឈ្មោះហាង, តម្លៃសរុប
              </p>
            </div>
          </div>
          <button
            onClick={() => setActivePage('due_payments')}
            className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-1"
          >
            <span>មើលទាំងអស់ ({duePaymentOrders.length})</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {duePaymentOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
            មិនមានអតិថិជនជំពាក់ ឬ ណាត់ទូទាត់ទេនៅពេលនេះ
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {duePaymentOrders.map((ord) => (
              <div
                key={ord.id}
                className="card-3d p-4 rounded-2xl bg-gradient-to-br from-rose-50/70 to-pink-50/50 dark:from-rose-950/20 dark:to-slate-800/80 border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-rose-200/60 dark:border-rose-900/40 pb-2">
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold text-xs">
                    <Calendar size={14} />
                    <span>ថ្ងៃណាត់៖ {ord.dueDate}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                    មិនទាន់ទូទាត់
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-slate-400" />
                    <span className="font-bold text-slate-800 dark:text-white">
                      {ord.customerName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
                    <Phone size={13} className="text-slate-400" />
                    <span>{ord.customerPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
                    <Store size={13} className="text-slate-400" />
                    <span className="truncate">{ord.storeName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    បុគ្គលិកលក់៖ <span className="font-semibold text-slate-700 dark:text-slate-300">{ord.staffName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
                  <span className="text-[11px] font-semibold text-slate-500">តម្លៃសរុប៖</span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                    {formatMoney(ord.total, settings.currency, settings.exchangeRates)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders Section (ការបញ្ជាទិញថ្មីៗ) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Icon3D name="orders" size={30} />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ការបញ្ជាទិញថ្មីៗ (Recent Orders)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                កាលបរិច្ឆេទបញ្ជាទិញ, ឈ្មោះបុគ្គលិកលក់, ឈ្មោះអតិថិជន, ឈ្មោះទំនិញលក់បាន, តម្លែសរុប
              </p>
            </div>
          </div>
          <button
            onClick={() => setActivePage('orders')}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
          >
            <span>វិក្កយបត្រទាំងអស់ ({orders.length})</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentOrders.map((ord) => (
            <div
              key={ord.id}
              className="card-3d p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {ord.orderNumber}
                  </span>
                  <div className="text-[10px] text-slate-400">
                    {ord.date} {ord.time}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    ord.paymentStatus === 'paid'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {ord.paymentStatus === 'paid' ? 'ទូទាត់រួច' : 'មិនទាន់ទូទាត់'}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">អតិថិជន:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {ord.customerName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">បុគ្គលិកលក់:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {ord.staffName}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ទំនិញលក់បាន ({ord.items.length}):
                  </span>
                  <div className="line-clamp-2">
                    {ord.items.map((it) => `${it.productName} (x${it.quantity})`).join(', ')}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500">តម្លៃសរុប:</span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {formatMoney(ord.total, settings.currency, settings.exchangeRates)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
