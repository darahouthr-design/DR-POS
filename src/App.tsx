import React from 'react';
import { POSProvider, usePOS } from './context/POSContext.tsx';
import { Header } from './components/Header.tsx';
import { QuickAccessNav } from './components/QuickAccessNav.tsx';
import { AuthModal } from './components/modals/AuthModal.tsx';
import { ImageZoomModal } from './components/modals/ImageZoomModal.tsx';

// Views
import { DashboardView } from './views/DashboardView.tsx';
import { POSView } from './views/POSView.tsx';
import { OrdersView } from './views/OrdersView.tsx';
import { ProductsView } from './views/ProductsView.tsx';
import { DuePaymentsView } from './views/DuePaymentsView.tsx';
import { TrackStaffView } from './views/TrackStaffView.tsx';
import { ProblemCustomersView } from './views/ProblemCustomersView.tsx';
import { StockLogView } from './views/StockLogView.tsx';
import { PriceRecordView } from './views/PriceRecordView.tsx';
import { StaffInfoView } from './views/StaffInfoView.tsx';
import { SettingView } from './views/SettingView.tsx';
import { AboutView } from './views/AboutView.tsx';

const AppContent: React.FC = () => {
  const { activePage, isLoading } = usePOS();

  const renderActiveView = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardView />;
      case 'pos':
        return <POSView />;
      case 'orders':
        return <OrdersView />;
      case 'products':
        return <ProductsView />;
      case 'due_payments':
        return <DuePaymentsView />;
      case 'track_staff':
        return <TrackStaffView />;
      case 'problem_customers':
        return <ProblemCustomersView />;
      case 'stock_log':
        return <StockLogView />;
      case 'price_record':
        return <PriceRecordView />;
      case 'staff_info':
        return <StaffInfoView />;
      case 'setting':
        return <SettingView />;
      case 'about':
        return <AboutView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Header with App Logo, Realtime Status, Bell, Dark Mode, Language, Currency, Profile */}
      <Header />

      {/* Quick Access Navigation Bar (POS, Orders, Products, Due Payments, Track Staff, Problem Customers, Stock Log, Price Record, Staff Info, Setting, About) */}
      <QuickAccessNav />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center p-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-500">កំពុងធ្វើសមកាលកម្មទិន្នន័យ Realtime...</p>
            </div>
          </div>
        ) : (
          renderActiveView()
        )}
      </main>

      {/* Modals */}
      <AuthModal />
      <ImageZoomModal />
    </div>
  );
};

export default function App() {
  return (
    <POSProvider>
      <AppContent />
    </POSProvider>
  );
}
