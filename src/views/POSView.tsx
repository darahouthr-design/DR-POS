import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext.tsx';
import { Order } from '../types/index.ts';
import { Icon3D } from '../components/icons/Icon3D.tsx';
import { formatMoney } from '../utils/translations.ts';
import { BarcodeScannerModal } from '../components/modals/BarcodeScannerModal.tsx';
import { KoreanReceiptModal } from '../components/modals/KoreanReceiptModal.tsx';
import { playSound } from '../utils/sound.ts';
import confetti from 'canvas-confetti';
import {
  Search,
  Camera,
  Plus,
  Minus,
  Trash2,
  AlertOctagon,
  Calendar,
  User,
  Phone,
  MapPin,
  Store,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  X,
  UserX,
  ChevronDown,
  Percent,
} from 'lucide-react';

export const POSView: React.FC = () => {
  const {
    products,
    categories,
    warehouses,
    stores,
    groups,
    staffList,
    orders,
    problemCustomers,
    settings,
    cart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    createOrder,
    addProblemCustomer,
    setActiveZoomImage,
  } = usePOS();

  // Filter & Search states for products
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // POS Checkout Form Cart modal (បើកតាមរយៈ icon កន្ត្រកទំនិញនៅផ្នែកខាងលើ)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Checkout form fields
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedStore, setSelectedStore] = useState(stores[0]?.name || 'DR-POS សាខាធំ');
  const [selectedGroup, setSelectedGroup] = useState(groups[0]?.name || 'អតិថិជនទូទៅ');
  const [selectedStaff, setSelectedStaff] = useState(staffList[0]?.name || 'ហួត ដារ៉ា');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Korean Receipt Modal on completion
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Total quantity of items in cart
  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Calculation
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const discount = item.product.promotionDiscount || 0;
      const effectivePrice = item.product.sellingPrice * (1 - discount / 100);
      return sum + effectivePrice * item.quantity;
    }, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return subtotal * (discountPercent / 100);
  }, [subtotal, discountPercent]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  // Normalize phone for comparison
  const cleanPhone = (p: string) => p.replace(/\D/g, '');

  // Detect Problem Customer or Unpaid Balance Warning
  const phoneWarning = useMemo(() => {
    if (!customerPhone || cleanPhone(customerPhone).length < 5) return null;
    const cleaned = cleanPhone(customerPhone);

    // Check Problem Customers
    const probCust = problemCustomers.find(
      (pc) => cleanPhone(pc.phone).includes(cleaned) || cleaned.includes(cleanPhone(pc.phone))
    );
    if (probCust) {
      return {
        type: 'PROBLEM',
        message: `⚠️ ការព្រមាន៖ អតិថិជននេះ (${probCust.name}) ស្ថិតក្នុងបញ្ជីអតិថិជនមានបញ្ហា! ចំណាំ៖ "${probCust.notes}"`,
      };
    }

    // Check Unpaid orders
    const unpaidOrder = orders.find(
      (o) =>
        o.paymentStatus === 'unpaid' &&
        (cleanPhone(o.customerPhone).includes(cleaned) || cleaned.includes(cleanPhone(o.customerPhone)))
    );
    if (unpaidOrder) {
      return {
        type: 'UNPAID',
        message: `⚠️ ការព្រមាន៖ អតិថិជននេះមានប្រាក់ជំពាក់មិនទាន់ទូទាត់វិក្កយបត្រ #${unpaidOrder.orderNumber} សរុប $${unpaidOrder.total.toFixed(2)} (ណាត់ថ្ងៃ៖ ${unpaidOrder.dueDate || 'មិនទាន់កំណត់'})`,
      };
    }

    return null;
  }, [customerPhone, problemCustomers, orders]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesWh =
          settings.userAccess?.hideWarehouseReports ||
          selectedWarehouse === 'all' ||
          p.warehouse === selectedWarehouse;
        const matchesQuery =
          searchQuery.trim() === '' ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.barcode.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesWh && matchesQuery;
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [products, selectedCategory, selectedWarehouse, searchQuery, settings.userAccess?.hideWarehouseReports]);

  // Handle barcode scanned from camera with strict stock check
  const handleBarcodeScanned = (barcode: string) => {
    setSearchQuery(barcode);
    const matched = products.find((p) => p.barcode === barcode);
    if (matched) {
      if (matched.stock <= 0) {
        playSound.warning();
        alert(`⚠️ ទំនិញ "${matched.name}" (បាកូដ: ${barcode}) បានអស់ពីស្តុកហើយ! មិនអនុញ្ញាតអោយបញ្ជាទិញទេ។`);
        return;
      }
      const inCartItem = cart.find((it) => it.product.id === matched.id);
      if (inCartItem && inCartItem.quantity + 1 > matched.stock) {
        playSound.warning();
        alert(`⚠️ មិនអាចបន្ថែមបានទៀតទេ! ទំនិញ "${matched.name}" ក្នុងកន្ត្រកមាន ${inCartItem.quantity} ស្មើនឹងស្តុកសរុប (${matched.stock}) ហើយ។`);
        return;
      }
      addToCart(matched);
      playSound.addToCart();
    }
  };

  // Record as problem customer directly from POS checkout
  const handleSaveProblemCustomer = async () => {
    if (!customerName || !customerPhone) {
      alert('សូមបញ្ចូលឈ្មោះ និងលេខទូរស័ព្ទជាមុនសិន!');
      return;
    }
    await addProblemCustomer({
      name: customerName,
      phone: customerPhone,
      notes: notes || 'កត់ត្រាពីការលក់ POS: ជំពាក់មិនទាន់ទូទាត់ ឬមានបញ្ហា',
      reportedByStaff: selectedStaff,
    });
    playSound.warning();
    alert(`បានកត់ត្រា "${customerName}" ទៅក្នុងទំព័រ Problem Customers ដោយស្វ័យប្រវត្តិ!`);
  };

  // Complete checkout with strict out-of-stock validation
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('កន្ត្រកទំនិញទទេ មិនអាចបញ្ចប់ការទិញបានទេ!');
      return;
    }
    if (!customerName.trim()) {
      alert('សូមបំពេញឈ្មោះអតិថិជន (Customer Name required)!');
      return;
    }

    // Strict validation: No out-of-stock items allowed to be purchased
    for (const item of cart) {
      const prod = products.find((p) => p.id === item.product.id);
      if (!prod || prod.stock <= 0) {
        playSound.warning();
        alert(`⚠️ ទំនិញ "${item.product.name}" បានអស់ពីស្តុកហើយ! មិនអនុញ្ញាតអោយបញ្ជាទិញជាដាច់ខាត។`);
        return;
      }
      if (item.quantity > prod.stock) {
        playSound.warning();
        alert(`⚠️ ទំនិញ "${item.product.name}" ក្នុងកន្ត្រកមានចំនួន ${item.quantity} លើសពីស្តុកជាក់ស្តែង (នៅសល់តែ ${prod.stock})!`);
        return;
      }
    }

    const orderItems = cart.map((item) => {
      const discount = item.product.promotionDiscount || 0;
      const unitPrice = item.product.sellingPrice * (1 - discount / 100);
      return {
        productId: item.product.id,
        productName: item.product.name,
        image: item.product.image,
        costPrice: item.product.costPrice,
        sellingPrice: Number(unitPrice.toFixed(2)),
        quantity: item.quantity,
        total: Number((unitPrice * item.quantity).toFixed(2)),
      };
    });

    const newOrder = await createOrder({
      date: orderDate,
      time: new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' }),
      customerName,
      customerPhone: customerPhone || 'N/A',
      customerAddress: customerAddress || 'N/A',
      staffName: selectedStaff,
      storeName: selectedStore,
      groupName: selectedGroup,
      paymentStatus,
      notes,
      dueDate: paymentStatus === 'unpaid' ? dueDate : undefined,
      items: orderItems,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
    });

    // Confetti celebration
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
    });

    setIsCheckoutOpen(false);
    // Reset form
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setNotes('');
    setDueDate('');
    // Open Korean Receipt Modal for immediate print!
    setCompletedOrder(newOrder);
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      {/* Top Bar with Filter, Search, Barcode Camera, and Cart Icon Button */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-2.5 sm:space-y-3">
        {/* Row 1: Search Input + Top Cart Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Left Search Input */}
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកទំនិញតាមឈ្មោះ ឬលេខបាកូដ..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* ICON កន្ត្រកទំនិញ (Cart) ដាក់នៅផ្នែកខាងលើ (Top Cart Icon Button) */}
          <button
            onClick={() => {
              playSound.click();
              setIsCheckoutOpen(true);
            }}
            className="relative group flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/25 btn-3d ring-2 ring-emerald-400/40 select-none cursor-pointer flex-shrink-0"
            title="ចុចដើម្បីបើកទម្រង់បំពេញពត៍មានការលក់ (POS Checkout Form Cart)"
          >
            <div className="relative flex-shrink-0">
              <Icon3D name="cart" size={24} />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-rose-500 text-white font-black text-[9px] shadow-md animate-bounce">
                  {cartItemCount}
                </span>
              )}
            </div>

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1 leading-tight">
                <span className="text-xs font-black tracking-wide">
                  កន្ត្រក
                </span>
                <span className="hidden sm:inline text-[10px] text-emerald-200 font-semibold">
                  (Cart)
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-emerald-100 font-mono font-bold leading-tight">
                {formatMoney(total, settings.currency, settings.exchangeRates)}
              </span>
            </div>
          </button>
        </div>

        {/* Row 2: Camera Barcode Scan Button + Warehouse Filter (រៀបចំយ៉ាងមានរបៀបសម្រាប់ Mobile) */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {/* Camera Barcode Scanner Trigger Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-500/25 btn-3d transition-all"
            title="បើកកាមេរ៉ាស្កេនបាកូដ"
          >
            <Camera size={16} className="text-indigo-200" />
            <span className="text-[11px] sm:text-xs font-black whitespace-nowrap">
              បើកកាមេរ៉ាស្កេនបាកូដ
            </span>
          </button>

          {/* Warehouse Filter Dropdown (if enabled in settings) */}
          {!settings.userAccess?.hideWarehouseReports && (
            <div className="flex-1 relative">
              <div className="relative flex items-center">
                <div className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500 dark:text-indigo-400">
                  <Store size={14} />
                </div>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full appearance-none pl-7 sm:pl-8 pr-7 sm:pr-8 py-2 sm:py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer truncate"
                  title="ជ្រើសរើសឃ្លាំង"
                >
                  <option value="all">ឃ្លាំងទាំងអស់ ({products.length})</option>
                  {warehouses.map((w) => {
                    const countInWh = products.filter((p) => p.warehouse === w.name).length;
                    return (
                      <option key={w.id} value={w.name}>
                        {w.name} ({countInWh})
                      </option>
                    );
                  })}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex-shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
          }`}
        >
          ទាំងអស់ ({products.length})
        </button>
        {categories.map((c) => {
          const count = products.filter((p) => p.category === c.name).length;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex-shrink-0 ${
                selectedCategory === c.name
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Full-width Products Catalog Grid */}
      <div>
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            រកមិនឃើញទំនិញដែលត្រូវនឹងការស្វែងរកទេ
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
            {filteredProducts.map((p) => {
              const inCart = cart.find((it) => it.product.id === p.id);
              const inCartQty = inCart ? inCart.quantity : 0;
              const hasPromo = p.promotionDiscount > 0;
              const effectivePrice = hasPromo
                ? p.sellingPrice * (1 - p.promotionDiscount / 100)
                : p.sellingPrice;
              const isOutOfStock = p.stock <= 0;
              const isMaxInCart = inCartQty >= p.stock;
              const isAddDisabled = isOutOfStock || isMaxInCart;

              return (
                <div
                  key={p.id}
                  className={`card-3d group relative flex flex-col rounded-3xl bg-white dark:bg-slate-900 border ${
                    isOutOfStock
                      ? 'border-rose-300 dark:border-rose-900/60 opacity-80'
                      : 'border-slate-200 dark:border-slate-800'
                  } shadow-sm overflow-hidden p-3 transition-all hover:shadow-lg`}
                >
                  {/* Image with zoom click */}
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
                    <img
                      src={p.image}
                      alt={p.name}
                      onClick={() => setActiveZoomImage(p.image)}
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-zoom-in ${
                        isOutOfStock ? 'grayscale' : ''
                      }`}
                    />

                    {/* Stock badge */}
                    <span
                      className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-black shadow ${
                        isOutOfStock
                          ? 'bg-rose-600 text-white animate-pulse'
                          : isMaxInCart
                          ? 'bg-indigo-600 text-white'
                          : p.stock <= 10
                          ? 'bg-amber-500 text-white'
                          : 'bg-black/60 backdrop-blur-sm text-white'
                      }`}
                    >
                      {isOutOfStock
                        ? '❌ អស់ស្តុក'
                        : isMaxInCart
                        ? `គ្រប់ស្តុក (${p.stock})`
                        : p.stock <= 10
                        ? `⚠️ សល់: ${p.stock}`
                        : `សល់: ${p.stock}`}
                    </span>

                    {/* Promo discount badge */}
                    {hasPromo && !isOutOfStock && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-500 text-white animate-pulse">
                        -{p.promotionDiscount}%
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                        {p.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {p.barcode}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">
                          {formatMoney(effectivePrice, settings.currency, settings.exchangeRates)}
                        </div>
                        {hasPromo && (
                          <div className="text-[10px] text-slate-400 line-through">
                            ${p.sellingPrice.toFixed(2)}
                          </div>
                        )}
                      </div>

                      {/* Add to Cart button */}
                      <button
                        onClick={() => {
                          addToCart(p);
                          playSound.addToCart();
                        }}
                        disabled={isAddDisabled}
                        className={`p-2 rounded-xl text-white font-bold text-xs btn-3d shadow-md transition-all ${
                          isOutOfStock
                            ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-50'
                            : isMaxInCart
                            ? 'bg-amber-600 cursor-not-allowed opacity-75'
                            : inCart
                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25 ring-2 ring-emerald-400'
                            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
                        }`}
                        title={
                          isOutOfStock
                            ? 'ទំនិញនេះអស់ពីស្តុកហើយ មិនអាចបញ្ជាទិញបានទេ'
                            : isMaxInCart
                            ? 'ក្នុងកន្ត្រកមានស្មើនឹងចំនួនស្តុកហើយ'
                            : 'បញ្ចូលក្នុងកន្ត្រក'
                        }
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Quick Cart Button (ងាយស្រួលចុចពេល Scroll ចុះក្រោម) */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-5 right-5 z-30 animate-in fade-in slide-in-from-bottom-3">
          <button
            onClick={() => {
              playSound.click();
              setIsCheckoutOpen(true);
            }}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs shadow-2xl shadow-emerald-500/40 btn-3d ring-4 ring-white dark:ring-slate-900 cursor-pointer"
          >
            <div className="relative">
              <Icon3D name="cart" size={26} />
              <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white font-black text-[10px] shadow-md animate-bounce">
                {cartItemCount}
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight">បើកកន្ត្រកទំនិញ</span>
              <span className="text-[11px] text-emerald-100 font-mono">
                {formatMoney(total, settings.currency, settings.exchangeRates)}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* POS Checkout Form Cart Modal (ទម្រង់បំពេញពត៍មានការលក់) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 px-5 sm:px-6 bg-gradient-to-r from-indigo-700 via-indigo-800 to-sky-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon3D name="pos" size={30} />
                <div>
                  <h3 className="text-sm sm:text-base font-black">
                    ទម្រង់បំពេញពត៍មានការលក់ (POS Checkout Form Cart)
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-sky-200">
                    ត្រួតពិនិត្យកន្ត្រកទំនិញ បញ្ចូលពត៍មានអតិថិជន និងបញ្ចប់ការទិញ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                title="បិទ"
              >
                <X size={20} />
              </button>
            </div>

            {/* IMMEDIATE WARNING BANNER (ប្រសិនបើលេខទូរស័ព្ទប៉ះចំអតិថិជនមានបញ្ហា ឬមិនទាន់ទូទាត់) */}
            {phoneWarning && (
              <div className="p-3 px-5 bg-rose-600 text-white flex items-center gap-3 animate-pulse border-b border-rose-700">
                <AlertOctagon size={20} className="flex-shrink-0 text-amber-300" />
                <div className="flex-1 text-xs font-black">
                  {phoneWarning.message}
                </div>
              </div>
            )}

            {/* Modal Body: 2 Columns on Desktop, 1 Column on Mobile */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Cart Items List & Summary (5 cols on lg) */}
              <div className="lg:col-span-5 flex flex-col rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Icon3D name="cart" size={22} />
                    <span className="font-extrabold text-xs text-slate-800 dark:text-white">
                      កន្ត្រកទំនិញ ({cartItemCount} មុខ)
                    </span>
                  </div>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-[10px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      <span>សម្អាត</span>
                    </button>
                  )}
                </div>

                {/* Items Scrollable List */}
                <div className="flex-1 overflow-y-auto max-h-60 lg:max-h-80 py-3 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/80">
                  {cart.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <Icon3D name="cart" size={36} className="mx-auto opacity-40" />
                      <p className="text-xs font-semibold">កន្ត្រកទំនិញទទេ</p>
                      <p className="text-[10px] text-slate-500">
                        សូមជ្រើសរើសទំនិញក្នុង POS ដើម្បីបញ្ចូលកន្ត្រក
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => {
                      const discount = item.product.promotionDiscount || 0;
                      const unitPrice = item.product.sellingPrice * (1 - discount / 100);
                      const itemTotal = unitPrice * item.quantity;
                      const liveProd = products.find((p) => p.id === item.product.id) || item.product;
                      const isMaxQty = item.quantity >= liveProd.stock;

                      return (
                        <div
                          key={item.product.id}
                          className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs"
                        >
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            onClick={() => setActiveZoomImage(item.product.image)}
                            className="w-10 h-10 rounded-xl object-cover cursor-pointer flex-shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                              {item.product.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span>${unitPrice.toFixed(2)}/ឯកតា</span>
                              <span className="font-mono text-indigo-500 font-semibold">(សល់ស្តុក: {liveProd ? liveProd.stock : item.product.stock})</span>
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-700 p-0.5 rounded-lg border border-slate-200 dark:border-slate-600">
                            <button
                              onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                              className="w-5 h-5 flex items-center justify-center rounded text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600"
                              title="បន្ថយ"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="w-5 text-center font-bold text-[11px]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                              disabled={isMaxQty}
                              className={`w-5 h-5 flex items-center justify-center rounded text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600 ${
                                isMaxQty ? 'opacity-30 cursor-not-allowed text-slate-400' : ''
                              }`}
                              title={isMaxQty ? 'ស្មើនឹងចំនួនស្តុកដែលមានហើយ' : 'បន្ថែម'}
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <div className="w-14 text-right font-black text-slate-900 dark:text-white text-xs">
                            ${itemTotal.toFixed(2)}
                          </div>

                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Subtotal, Discount, and Total */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>តម្លៃសរុប (Subtotal):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Discount percentage input */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Percent size={12} />
                      <span>បញ្ចុះតម្លៃ (%):</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercent || ''}
                        onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                        placeholder="0"
                        className="w-16 px-2 py-1 text-right text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                      <span className="text-slate-400 font-mono">%</span>
                    </div>
                  </div>

                  {discountPercent > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>ទឹកប្រាក់បញ្ចុះ:</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                    <span className="font-extrabold text-xs">សរុបត្រូវទូទាត់:</span>
                    <div className="text-right">
                      <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 block leading-tight">
                        {formatMoney(total, settings.currency, settings.exchangeRates)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ${total.toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Checkout Form Fields (7 cols on lg) */}
              <div className="lg:col-span-7 space-y-3.5 text-xs">
                {/* Row 1: Date & Staff */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Calendar size={14} className="text-indigo-500" />
                      <span>កាលបរិច្ឆេទ (Date)</span>
                    </label>
                    <input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Briefcase size={14} className="text-indigo-500" />
                      <span>បុគ្គលិកលក់ (Sales Staff)</span>
                    </label>
                    <select
                      value={selectedStaff}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {staffList.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.position})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Customer Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <User size={14} className="text-indigo-500" />
                      <span>ឈ្មោះអតិថិជន (Customer Name) *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="ឧ. សុខ ហេង"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Phone size={14} className="text-indigo-500" />
                      <span>លេខទូរស័ព្ទ (Phone Number)</span>
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="ឧ. 012 345 678"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Row 3: Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <MapPin size={14} className="text-indigo-500" />
                    <span>អាស័យដ្ឋានអតិថិជន (Customer Address)</span>
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="ផ្ទះលេខ... ផ្លូវ... សង្កាត់... ខណ្ឌ..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Row 4: Store & Customer Group */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Store size={14} className="text-indigo-500" />
                      <span>ឈ្មោះហាង / សាខា (Store)</span>
                    </label>
                    <select
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {stores.map((st) => (
                        <option key={st.id} value={st.name}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Users size={14} className="text-indigo-500" />
                      <span>ឈ្មោះ Groups (Group)</span>
                    </label>
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.name}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 5: Payment Status & Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ស្ថានភាពទូទាត់ (Payment Status)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentStatus('paid')}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          paymentStatus === 'paid'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        <span>ទូទាត់រួច (Paid)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentStatus('unpaid')}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          paymentStatus === 'unpaid'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        <Clock size={14} />
                        <span>មិនទាន់ទូទាត់ (Unpaid)</span>
                      </button>
                    </div>
                  </div>

                  {paymentStatus === 'unpaid' && (
                    <div>
                      <label className="block text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
                        កាលបរិច្ឆេទណាត់ទូទាត់ (Due Date) *
                      </label>
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 text-xs outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  )}
                </div>

                {/* Row 6: Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    កំណត់ចំណាំ (Notes)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ចំណាំបន្ថែមលើការបញ្ជាទិញ..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Action Buttons: Record Problem Customer & Complete Sale */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleSaveProblemCustomer}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-700 dark:text-red-300 font-bold text-xs flex items-center justify-center gap-1.5 btn-3d"
                  >
                    <UserX size={15} />
                    <span>ប៊ូតុងកំណត់ត្រាអតិថិជនមានបញ្ហា</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteSale}
                    disabled={cart.length === 0}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 btn-3d disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    <span>បញ្ចប់ការទិញ (${total.toFixed(2)})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Korean Receipt Modal (Triggered immediately on completion or from orders) */}
      <KoreanReceiptModal
        order={completedOrder}
        onClose={() => setCompletedOrder(null)}
      />
    </div>
  );
};
