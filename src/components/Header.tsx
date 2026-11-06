import React, { useState } from 'react';
import { usePOS } from '../context/POSContext.tsx';
import { Logo } from './Logo.tsx';
import { Icon3D } from './icons/Icon3D.tsx';
import {
  User,
  LogOut,
  LogIn,
  ChevronDown,
  Trash2,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    user,
    notifications,
    markNotificationRead,
    clearAllNotifications,
    openAuthModal,
    logout,
    setActivePage,
  } = usePOS();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo (Icon only, text completely removed as requested) */}
        <div className="flex items-center flex-shrink-0">
          <button
            onClick={() => setActivePage('dashboard')}
            className="flex items-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-2xl"
            title="DR-POS Dashboard"
          >
            <Logo size="sm" iconOnly={true} />
          </button>
        </div>

        {/* Right Action Tools: ONLY Notification and Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
              title="ការជូនដំណឹង (Notifications)"
            >
              <Icon3D name="bell" size={24} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white font-black text-[10px] shadow-md animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popup (Mobile-safe width and alignment) */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-24px)] sm:w-96 max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-3 px-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800 dark:text-white">
                      ការជូនដំណឹង (Notifications)
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                        {unreadCount} ថ្មី
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-[10px] text-slate-500 hover:text-rose-500 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={12} />
                      <span>សម្អាត</span>
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      មិនទាន់មានការជូនដំណឹងនៅឡើយទេ
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationRead(n.id);
                          if (n.type === 'order') setActivePage('orders');
                          if (n.type === 'low_stock') setActivePage('products');
                          if (n.type === 'due_payment') setActivePage('due_payments');
                          setIsNotifOpen(false);
                        }}
                        className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                          !n.read ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {n.type === 'order' && <Icon3D name="orders" size={24} />}
                          {n.type === 'low_stock' && <Icon3D name="products" size={24} />}
                          {n.type === 'due_payment' && <Icon3D name="due_payments" size={24} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {n.title}
                            </h4>
                            <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Account / Profile */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 sm:pl-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors"
                title={user.name}
              >
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-white leading-tight max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-500 max-w-[120px] truncate font-mono">
                    {user.email}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
              </button>
            ) : (
              <button
                onClick={openAuthModal}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 btn-3d"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Sign In / Create Account</span>
                <span className="sm:hidden text-xs">Sign In</span>
              </button>
            )}

            {/* User Menu Dropdown */}
            {isUserMenuOpen && user && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{user.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{user.email}</div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Gmail Multi-Device Sync Active</span>
                  </div>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => {
                      setActivePage('setting');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                  >
                    <Icon3D name="setting" size={18} />
                    <span>ការកំណត់ (Settings)</span>
                  </button>

                  <button
                    onClick={() => {
                      openAuthModal();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-colors text-left"
                  >
                    <User size={16} />
                    <span>ប្តូរគណនី (Switch Account)</span>
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors text-left"
                  >
                    <LogOut size={16} />
                    <span>ចាកចេញ (Sign Out)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
