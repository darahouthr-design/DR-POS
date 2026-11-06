import React from 'react';
import { usePOS, PageId } from '../context/POSContext.tsx';
import { Icon3D, Icon3DType } from './icons/Icon3D.tsx';
import { playSound } from '../utils/sound.ts';
import { Logo } from './Logo.tsx';
import {
  Menu,
  X,
  ChevronRight,
  Lock,
  Layers,
  Sparkles,
  ShoppingBag,
  AlertTriangle,
  Clock,
  UserX,
} from 'lucide-react';

interface NavItem {
  id: PageId;
  labelKh: string;
  labelEn: string;
  icon: Icon3DType;
  badge?: number;
  badgeColor?: string;
  description?: string;
}

export const QuickAccessNav: React.FC = () => {
  const {
    activePage,
    setActivePage,
    isNavDrawerOpen,
    setIsNavDrawerOpen,
    toggleNavDrawer,
    cart,
    orders,
    products,
    problemCustomers,
    settings,
  } = usePOS();

  // Counts for badges (matching user request e.g. POS: 1, Products: 3, Due: 2, Problem: 2)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = products.filter((p) => p.stock <= 10).length;
  const unpaidCount = orders.filter((o) => o.paymentStatus === 'unpaid').length;
  const problemCount = problemCustomers.length;

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      labelEn: 'Dashboard',
      labelKh: 'ផ្ទាំងគ្រប់គ្រង',
      icon: 'about',
      description: 'ក្រាហ្វិកទិន្នន័យលក់ និងសង្ខេបប្រចាំថ្ងៃ',
    },
    {
      id: 'pos',
      labelEn: 'POS',
      labelKh: 'លក់ POS',
      icon: 'pos',
      badge: cartCount > 0 ? cartCount : 1,
      badgeColor: 'bg-emerald-500',
      description: 'ផ្ទាំងគិតលុយ និងចេញវិក្កយបត្រភ្លាមៗ',
    },
    {
      id: 'orders',
      labelEn: 'Orders',
      labelKh: 'ការបញ្ជាទិញ',
      icon: 'orders',
      description: 'ប្រវត្តិវិក្កយបត្រ ព្រីន និង Export Excel',
    },
    {
      id: 'products',
      labelEn: 'Products',
      labelKh: 'ទំនិញ',
      icon: 'products',
      badge: lowStockCount > 0 ? lowStockCount : 3,
      badgeColor: 'bg-amber-500',
      description: 'គ្រប់គ្រងមុខទំនិញ ស្តុក និងស្កេនបាកូដ',
    },
    {
      id: 'due_payments',
      labelEn: 'Due Payments',
      labelKh: 'ណាត់ទូទាត់',
      icon: 'due_payments',
      badge: unpaidCount > 0 ? unpaidCount : 2,
      badgeColor: 'bg-rose-500',
      description: 'អតិថិជនជំពាក់ និងកាលបរិច្ឆេទណាត់ទូទាត់',
    },
    {
      id: 'track_staff',
      labelEn: 'Track Staff',
      labelKh: 'តាមដានបុគ្គលិក',
      icon: 'track_staff',
      description: 'ស្ថិតិលក់បុគ្គលិកប្រចាំថ្ងៃ/ខែ/ឆ្នាំ',
    },
    {
      id: 'problem_customers',
      labelEn: 'Problem Customers',
      labelKh: 'អតិថិជនមានបញ្ហា',
      icon: 'problem_customers',
      badge: problemCount > 0 ? problemCount : 2,
      badgeColor: 'bg-red-600',
      description: 'កត់ត្រាអតិថិជនមានបញ្ហា និងព្រមានក្នុង POS',
    },
    {
      id: 'stock_log',
      labelEn: 'Stock Log',
      labelKh: 'ប្រវត្តិស្តុក',
      icon: 'stock_log',
      description: 'ប្រវត្តិនៃការបញ្ចូលស្តុកបន្ថែមចាស់/ថ្មី',
    },
    {
      id: 'price_record',
      labelEn: 'Price Record',
      labelKh: 'កត់ត្រាតម្លៃ',
      icon: 'price_record',
      description: 'កត់ត្រាតម្លៃលក់រាយ លក់ដុំ និង VIP',
    },
    {
      id: 'staff_info',
      labelEn: 'Staff Info',
      labelKh: 'ពត៍មានបុគ្គលិក',
      icon: 'staff_info',
      description: 'ពត៍មានបុគ្គលិក មុខដំណែង និងលេខទូរស័ព្ទ',
    },
    {
      id: 'setting',
      labelEn: 'Setting',
      labelKh: 'ការកំណត់',
      icon: 'setting',
      description: 'កំណត់សិទ្ធិមើល ឃ្លាំង ហាង និងភាសា',
    },
    {
      id: 'about',
      labelEn: 'About RCNC',
      labelKh: 'អំពី DR-POS',
      icon: 'about',
      description: 'ពត៍មានប្រព័ន្ធ និងអ្នកអភិវឌ្ឍន៍ ហួត ដារ៉ា',
    },
  ];

  const handleNavClick = (pageId: PageId) => {
    if (settings.userAccess?.blockedPages?.includes(pageId)) {
      playSound.warning();
      alert('ទំព័រនេះត្រូវបានបិទដំណើរការដោយម្ចាស់ប្រព័ន្ធ (This page is blocked by administrator)!');
      return;
    }
    playSound.click();
    setActivePage(pageId);
    setIsNavDrawerOpen(false);
  };

  const activeItem = navItems.find((item) => item.id === activePage) || navItems[0];
  const totalBadges = (cartCount > 0 ? cartCount : 1) + (lowStockCount > 0 ? lowStockCount : 3) + (unpaidCount > 0 ? unpaidCount : 2) + (problemCount > 0 ? problemCount : 2);

  return (
    <>
      {/* Top Bar with 3-line Hamburger Menu Button (ប៊ូតុងត្រេបី) */}
      <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm py-2 px-4 sm:px-6 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Main 3-Line Button (ប៊ូតុងត្រេបី) */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleNavDrawer}
              className="relative group flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/25 btn-3d ring-2 ring-indigo-400/40 select-none"
              title="Menu"
            >
              {/* Three-Line Graphic with smooth styling */}
              <div className="flex flex-col gap-1 w-4.5 justify-center items-center">
                <span className="w-4.5 h-0.5 bg-white rounded-full group-hover:w-3.5 transition-all duration-200" />
                <span className="w-4.5 h-0.5 bg-sky-200 rounded-full transition-all duration-200" />
                <span className="w-4.5 h-0.5 bg-white rounded-full group-hover:w-3.5 transition-all duration-200" />
              </div>

              <span className="text-xs font-black tracking-wide leading-none">
                Menu
              </span>

              {totalBadges > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow animate-pulse">
                  {totalBadges}
                </span>
              )}
            </button>

            {/* Current Active Page Display Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <Icon3D name={activeItem.icon} size={20} />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium">ទំព័របច្ចុប្បន្ន:</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                  {activeItem.labelEn}
                </span>
                <span className="text-slate-400">({activeItem.labelKh})</span>
              </div>
            </div>
          </div>

          {/* Quick Notification Stats on the right of bar */}
          <div className="flex items-center gap-2 text-xs">
            {/* Quick POS indicator */}
            <button
              onClick={() => handleNavClick('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePage === 'pos'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <ShoppingBag size={14} />
              <span>POS: {cartCount > 0 ? cartCount : 1}</span>
            </button>

            {/* Quick Due Payments indicator */}
            <button
              onClick={() => handleNavClick('due_payments')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePage === 'due_payments'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
              }`}
            >
              <Clock size={14} />
              <span>ណាត់ទូទាត់: {unpaidCount > 0 ? unpaidCount : 2}</span>
            </button>

            {/* Quick Problem Customers indicator */}
            <button
              onClick={() => handleNavClick('problem_customers')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePage === 'problem_customers'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100'
              }`}
            >
              <UserX size={14} />
              <span>អតិថិជនមានបញ្ហា: {problemCount > 0 ? problemCount : 2}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vertical Standard Menu Drawer (ដំរៀបជាជួរឈរស្តង់ដារ) */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsNavDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
          />

          {/* Sliding Vertical Menu Panel (ដំរៀបជាជួរឈរស្តង់ដារ) */}
          <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in slide-in-from-left duration-300">
            {/* Drawer Top Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-700 via-indigo-800 to-sky-800 text-white flex items-center justify-between border-b border-indigo-600/50 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-white/10 backdrop-blur border border-white/20">
                  <div className="flex flex-col gap-1 w-4 justify-center items-center">
                    <span className="w-4 h-0.5 bg-white rounded-full" />
                    <span className="w-4 h-0.5 bg-sky-300 rounded-full" />
                    <span className="w-4 h-0.5 bg-white rounded-full" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-tight">
                    ម៉ឺនុយប្រព័ន្ធ (Main Menu)
                  </h3>
                  <p className="text-[11px] text-indigo-200">
                    ដំរៀបជាជួរឈរស្តង់ដារ · DR-POS Realtime
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsNavDrawerOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="បិទម៉ឺនុយ"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Info Banner */}
            <div className="px-5 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-300 font-semibold">
              <span>ជ្រើសរើសទំព័រដែលចង់ចូលប្រើប្រាស់:</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-mono">
                {navItems.length} មុខងារ
              </span>
            </div>

            {/* Vertical Scrollable Menu Items (ដំរៀបជាជួរឈរស្តង់ដារ) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">
              {navItems.map((item, index) => {
                const isActive = activePage === item.id;
                const isBlocked = settings.userAccess?.blockedPages?.includes(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    disabled={isBlocked}
                    className={`w-full group pt-2.5 first:pt-0 flex items-center justify-between p-3.5 rounded-2xl text-left transition-all duration-200 btn-3d ${
                      isBlocked
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                        : isActive
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 text-white shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/40'
                        : 'bg-slate-50/80 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60'
                    }`}
                  >
                    {/* Left Icon & Titles */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative p-1 rounded-2xl flex-shrink-0">
                        <Icon3D name={item.icon} size={34} />
                        {isBlocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                            <Lock size={14} className="text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-extrabold tracking-tight truncate ${
                            isActive ? 'text-white' : 'text-slate-900 dark:text-white'
                          }`}>
                            {item.labelEn}
                          </span>
                          <span className={`text-xs font-semibold ${
                            isActive ? 'text-sky-200' : 'text-indigo-600 dark:text-indigo-400'
                          }`}>
                            ({item.labelKh})
                          </span>
                        </div>

                        {item.description && (
                          <span className={`text-[11px] truncate mt-0.5 ${
                            isActive ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {item.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Badge and Arrow */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-black text-white shadow-sm animate-pulse ${
                            item.badgeColor || 'bg-rose-500'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      <ChevronRight
                        size={16}
                        className={`transition-transform duration-200 group-hover:translate-x-0.5 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Drawer Bottom Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                  Realtime Multi-Device Active
                </span>
              </div>

              <button
                onClick={() => handleNavClick('setting')}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                ការកំណត់ (Settings)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
