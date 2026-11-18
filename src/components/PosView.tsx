import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, Trash2, AlertTriangle, CheckCircle2, X, Camera, ChevronDown } from 'lucide-react';
import { Icon3D } from './Icon3D';
import { BarcodeScannerModal, Button, Field, ProductImage, Surface, inputClass } from './ui';
import {
  formatMoney,
  getCurrencyMeta,
  inputAmountToUsd,
  normalizePhone,
  roundUsdPrecision,
  todayLocalISO,
  usdToInputAmount,
} from '../utils/helpers';
import { useI18n } from '../utils/i18nContext';
import type {
  CartItem,
  CurrencyCode,
  Order,
  ProblemCustomer,
  Product,
  StaffMember,
  WorkspaceSettings,
} from '../types';

interface PosViewProps {
  products: Product[];
  orders: Order[];
  problemCustomers: ProblemCustomer[];
  staff: StaffMember[];
  settings: WorkspaceSettings;
  currency: CurrencyCode;
  hideWarehouse: boolean;
  lockedSaleName?: string;
  readOnly?: boolean;
  telegramUrl?: string;
  onCreateOrder: (payload: {
    date: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    storeName: string;
    groupName: string;
    staffName: string;
    paymentStatus: 'paid' | 'unpaid';
    note: string;
    dueDate: string;
    discountType: 'amount' | 'percent';
    discountValue: number;
    items: Array<{ productId: string; quantity: number; customUnitPrice?: number }>;
  }) => Promise<boolean>;
  onAddProblemCustomer: (payload: { name: string; phone: string; note: string }) => Promise<boolean>;
  onZoomImage: (url: string, title: string) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  orders,
  problemCustomers,
  staff,
  settings,
  currency,
  hideWarehouse,
  lockedSaleName,
  readOnly = false,
  telegramUrl,
  onCreateOrder,
  onAddProblemCustomer,
  onZoomImage,
}) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [scannerOpen, setScannerOpen] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'items' | 'form'>('items');
  const [mobileKeyboardOpen, setMobileKeyboardOpen] = useState(false);
  const cartDrawerRef = useRef<HTMLDivElement | null>(null);
  const cartSurfaceRef = useRef<HTMLDivElement | null>(null);
  const cartBodyRef = useRef<HTMLDivElement | null>(null);
  const vvBaselineHeightRef = useRef<number>(0);
  const vvPrevWidthRef = useRef<number>(0);

  // POS Checkout Form State
  const [date, setDate] = useState(todayLocalISO());
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [storeSearch, setStoreSearch] = useState('');
  const [storeName, setStoreName] = useState(settings.stores[0] || '');

  const [groupSearch, setGroupSearch] = useState('');
  const [groupName, setGroupName] = useState(settings.groups[0] || '');

  const [staffSearch, setStaffSearch] = useState('');
  const [staffName, setStaffName] = useState(lockedSaleName || staff[0]?.name || '');

  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Manual Item Price Override Drafts & Order Discount State
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountInput, setDiscountInput] = useState('');

  const currencyMeta = getCurrencyMeta(currency);
  const prevCurrencyRef = useRef<CurrencyCode>(currency);

  const [submitting, setSubmitting] = useState(false);
  const [formValidationAttempted, setFormValidationAttempted] = useState(false);
  const customerNameInputRef = useRef<HTMLInputElement | null>(null);
  const customerPhoneInputRef = useRef<HTMLInputElement | null>(null);
  const customerAddressInputRef = useRef<HTMLInputElement | null>(null);
  const storeSelectRef = useRef<HTMLSelectElement | null>(null);
  const groupSelectRef = useRef<HTMLSelectElement | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!readOnly) {
      setStatusFeedback((prev) => (prev?.message === t.pos.expiredError ? null : prev));
    }
  }, [readOnly, t.pos.expiredError]);

  // Mobile & Tablet virtual keyboard visualViewport pinning:
  // Keeps the entire POS Form Cart strictly above the on-screen keyboard on iOS & Android
  // and keeps focused form inputs scrolled cleanly in the visible center area.
  useEffect(() => {
    if (!cartDrawerOpen) {
      setMobileKeyboardOpen(false);
      return;
    }

    const vv = window.visualViewport;
    const initialWinScrollX = window.scrollX;
    const initialWinScrollY = window.scrollY;
    vvBaselineHeightRef.current = Math.max(window.innerHeight, vv?.height || 0);
    vvPrevWidthRef.current = vv?.width || window.innerWidth;

    const resetViewportZoomIfNeeded = () => {
      const curVv = window.visualViewport;
      if (curVv && curVv.scale > 1.01) {
        const meta = document.querySelector('meta[name="viewport"]');
        if (meta) {
          const prevContent = meta.getAttribute('content') || '';
          meta.setAttribute(
            'content',
            'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover'
          );
          window.requestAnimationFrame(() => {
            if (prevContent) {
              meta.setAttribute('content', prevContent);
            }
          });
        }
      }
      if (window.scrollX !== initialWinScrollX || window.scrollY !== initialWinScrollY) {
        window.scrollTo(initialWinScrollX, initialWinScrollY);
      }
    };

    const scrollActiveFieldInsideModal = (smooth = true) => {
      const bodyEl = cartBodyRef.current;
      const active = document.activeElement as HTMLElement | null;
      if (!bodyEl || !active || !bodyEl.contains(active)) return;
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)) return;
      const targetEl = (active.closest('label') as HTMLElement | null) || active;
      const bodyRect = bodyEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      if (bodyRect.height <= 0) return;

      const offsetInBody = targetRect.top - bodyRect.top;
      const desiredTopInBody = Math.max(10, Math.min(44, (bodyRect.height - targetRect.height) * 0.28));
      const nextScrollTop = Math.max(0, bodyEl.scrollTop + offsetInBody - desiredTopInBody);
      bodyEl.scrollTo({
        top: nextScrollTop,
        behavior: smooth ? 'smooth' : 'auto',
      });
    };

    const syncDrawerToVisualViewport = () => {
      const drawerEl = cartDrawerRef.current;
      const surfaceEl = cartSurfaceRef.current;
      if (!drawerEl || !surfaceEl) return;

      const curVv = window.visualViewport;
      const vvWidth = curVv ? curVv.width : window.innerWidth;
      const vvHeight = curVv ? curVv.height : window.innerHeight;
      const vvTop = curVv ? curVv.offsetTop : 0;

      if (Math.abs(vvWidth - vvPrevWidthRef.current) > 80) {
        vvPrevWidthRef.current = vvWidth;
        vvBaselineHeightRef.current = Math.max(window.innerHeight, vvHeight);
      }

      const active = document.activeElement as HTMLElement | null;
      const activeType =
        active?.tagName === 'INPUT' ? ((active as HTMLInputElement).type || '').toLowerCase() : '';
      const isEditingTextControl = Boolean(
        active &&
          drawerEl.contains(active) &&
          (active.tagName === 'TEXTAREA' ||
            (active.tagName === 'INPUT' &&
              !['checkbox', 'radio', 'button', 'submit', 'date'].includes(activeType)))
      );

      if (!isEditingTextControl || vvHeight >= window.innerHeight * 0.94) {
        vvBaselineHeightRef.current = Math.max(
          vvBaselineHeightRef.current,
          window.innerHeight,
          vvHeight
        );
      }

      const isNarrowOrTouch =
        vvWidth < 1024 ||
        (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) ||
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
      const shrinkFromWindow = vvHeight < window.innerHeight * 0.85;
      const shrinkFromBase =
        vvBaselineHeightRef.current > 0 && vvHeight < vvBaselineHeightRef.current * 0.82;
      const keyboardOpen =
        isNarrowOrTouch &&
        (shrinkFromWindow || shrinkFromBase || (isEditingTextControl && vvHeight < 580));

      setMobileKeyboardOpen(keyboardOpen);

      if (keyboardOpen) {
        drawerEl.style.top = `${Math.max(0, Math.round(vvTop))}px`;
        drawerEl.style.height = `${Math.max(220, Math.round(vvHeight))}px`;
        drawerEl.style.bottom = 'auto';
        const edgeGap = vvWidth >= 640 ? 12 : 4;
        surfaceEl.style.setProperty(
          '--pos-vv-max-h',
          `${Math.max(200, Math.floor(vvHeight - edgeGap))}px`
        );
        window.requestAnimationFrame(() => scrollActiveFieldInsideModal(false));
      } else {
        drawerEl.style.removeProperty('top');
        drawerEl.style.removeProperty('height');
        drawerEl.style.removeProperty('bottom');
        surfaceEl.style.removeProperty('--pos-vv-max-h');
        if (!isEditingTextControl) {
          resetViewportZoomIfNeeded();
        }
      }
    };

    let focusTimer1 = 0;
    let focusTimer2 = 0;
    let blurTimer = 0;

    const handleFocusIn = () => {
      if (blurTimer) window.clearTimeout(blurTimer);
      window.clearTimeout(focusTimer1);
      window.clearTimeout(focusTimer2);
      syncDrawerToVisualViewport();
      focusTimer1 = window.setTimeout(() => {
        syncDrawerToVisualViewport();
        scrollActiveFieldInsideModal(true);
      }, 90);
      focusTimer2 = window.setTimeout(() => {
        syncDrawerToVisualViewport();
        scrollActiveFieldInsideModal(true);
      }, 320);
    };

    const handleFocusOut = () => {
      if (blurTimer) window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        const active = document.activeElement;
        const stillEditingInsideDrawer =
          Boolean(active) &&
          Boolean(cartDrawerRef.current?.contains(active)) &&
          ['INPUT', 'SELECT', 'TEXTAREA'].includes(active!.tagName);
        if (!stillEditingInsideDrawer) {
          setMobileKeyboardOpen(false);
          const drawerEl = cartDrawerRef.current;
          if (drawerEl) {
            drawerEl.style.removeProperty('top');
            drawerEl.style.removeProperty('height');
            drawerEl.style.removeProperty('bottom');
          }
          cartSurfaceRef.current?.style.removeProperty('--pos-vv-max-h');
          resetViewportZoomIfNeeded();
        }
      }, 140);
    };

    const drawerEl = cartDrawerRef.current;
    syncDrawerToVisualViewport();
    vv?.addEventListener('resize', syncDrawerToVisualViewport);
    vv?.addEventListener('scroll', syncDrawerToVisualViewport);
    window.addEventListener('resize', syncDrawerToVisualViewport);
    drawerEl?.addEventListener('focusin', handleFocusIn);
    drawerEl?.addEventListener('focusout', handleFocusOut);

    return () => {
      window.clearTimeout(focusTimer1);
      window.clearTimeout(focusTimer2);
      window.clearTimeout(blurTimer);
      vv?.removeEventListener('resize', syncDrawerToVisualViewport);
      vv?.removeEventListener('scroll', syncDrawerToVisualViewport);
      window.removeEventListener('resize', syncDrawerToVisualViewport);
      drawerEl?.removeEventListener('focusin', handleFocusIn);
      drawerEl?.removeEventListener('focusout', handleFocusOut);
      if (drawerEl) {
        drawerEl.style.removeProperty('top');
        drawerEl.style.removeProperty('height');
        drawerEl.style.removeProperty('bottom');
      }
      cartSurfaceRef.current?.style.removeProperty('--pos-vv-max-h');
      setMobileKeyboardOpen(false);
      resetViewportZoomIfNeeded();
    };
  }, [cartDrawerOpen]);

  useEffect(() => {
    const prevCurrency = prevCurrencyRef.current;
    if (prevCurrency === currency) return;
    prevCurrencyRef.current = currency;
    setPriceDrafts({});
    if (discountType === 'amount' && discountInput.trim() !== '') {
      const prevNum = Math.max(0, Number(discountInput) || 0);
      const nextNum = usdToInputAmount(inputAmountToUsd(prevNum, prevCurrency), currency);
      setDiscountInput(nextNum > 0 ? String(nextNum) : '');
    }
  }, [currency, discountType, discountInput]);

  const deferredSearch = useDeferredValue(search);
  const POS_DOM_STEP = 48;
  const [visibleProdCount, setVisibleProdCount] = useState(POS_DOM_STEP);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleProdCount(POS_DOM_STEP);
  }, [deferredSearch, categoryFilter, warehouseFilter]);

  // Pre-sort products once when catalog updates; filter smoothly with deferred search
  const productsBySortOrder = useMemo(
    () => [...products].sort((a, b) => a.sortOrder - b.sortOrder),
    [products]
  );

  const sortedFilteredProducts = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return productsBySortOrder.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (!hideWarehouse && warehouseFilter !== 'ALL' && p.warehouse !== warehouseFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [productsBySortOrder, deferredSearch, categoryFilter, warehouseFilter, hideWarehouse]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || visibleProdCount >= sortedFilteredProducts.length) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleProdCount((prev) =>
            Math.min(sortedFilteredProducts.length, prev + POS_DOM_STEP)
          );
        }
      },
      { rootMargin: '260px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleProdCount, sortedFilteredProducts.length]);

  const visibleProductsSlice = useMemo(
    () => sortedFilteredProducts.slice(0, visibleProdCount),
    [sortedFilteredProducts, visibleProdCount]
  );
  const remainingProdCount = Math.max(0, sortedFilteredProducts.length - visibleProdCount);

  const cartQtyByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cart) {
      map.set(c.product.id, c.quantity);
    }
    return map;
  }, [cart]);

  const indexedOrderPhones = useMemo(
    () =>
      orders.map((o) => ({
        order: o,
        normPhone: normalizePhone(o.customerPhone),
      })),
    [orders]
  );

  // Phone Alert Detection (ignores spaces, symbols, +855, dashes, etc.)
  const phoneAlerts = useMemo(() => {
    const norm = normalizePhone(customerPhone);
    if (!norm || norm.length < 6) {
      return {
        problemMatch: null,
        unpaidOrders: [] as Order[],
        matchedOrders: [] as Order[],
      };
    }

    const problemMatch =
      problemCustomers.find((c) => {
        const target = c.normalizedPhone || normalizePhone(c.phone);
        return target && (target === norm || norm.endsWith(target) || target.endsWith(norm));
      }) || null;

    // All orders associated with this customer phone number or sourceOrderId
    const matchedOrders: Order[] = [];
    for (const entry of indexedOrderPhones) {
      if (problemMatch?.sourceOrderId && entry.order.id === problemMatch.sourceOrderId) {
        matchedOrders.push(entry.order);
        continue;
      }
      if (
        entry.normPhone &&
        (entry.normPhone === norm ||
          norm.endsWith(entry.normPhone) ||
          entry.normPhone.endsWith(norm))
      ) {
        matchedOrders.push(entry.order);
      }
    }

    const unpaidOrders = matchedOrders.filter((o) => o.paymentStatus === 'unpaid');

    return { problemMatch, unpaidOrders, matchedOrders };
  }, [customerPhone, problemCustomers, indexedOrderPhones]);

  // Auto-fill customer name if empty when a recognized problem customer phone is entered
  useEffect(() => {
    if (phoneAlerts.problemMatch && !customerName.trim()) {
      const cleanName = phoneAlerts.problemMatch.name.replace(/\s*\(.*?\)\s*/g, '').trim();
      setCustomerName(cleanName || phoneAlerts.problemMatch.name);
    }
  }, [phoneAlerts.problemMatch, customerName]);


  const filteredStores = useMemo(
    () =>
      settings.stores.filter((s) =>
        s.toLowerCase().includes(storeSearch.trim().toLowerCase())
      ),
    [settings.stores, storeSearch]
  );

  const filteredGroups = useMemo(
    () =>
      settings.groups.filter((g) =>
        g.toLowerCase().includes(groupSearch.trim().toLowerCase())
      ),
    [settings.groups, groupSearch]
  );

  const availableSalesAndStaff = useMemo(() => {
    const names = new Set<string>();
    const list: Array<{ id: string; name: string }> = [];
    for (const sp of settings.saleProfiles || []) {
      if (!sp.active) continue;
      const key = sp.name.trim().toLowerCase();
      if (key && !names.has(key)) {
        names.add(key);
        list.push({ id: sp.id, name: sp.name.trim() });
      }
    }
    for (const st of staff) {
      const key = st.name.trim().toLowerCase();
      if (key && !names.has(key)) {
        names.add(key);
        list.push({ id: st.id, name: st.name });
      }
    }
    return list;
  }, [settings.saleProfiles, staff]);

  const filteredStaff = useMemo(
    () =>
      availableSalesAndStaff.filter((st) =>
        st.name.toLowerCase().includes(staffSearch.trim().toLowerCase())
      ),
    [availableSalesAndStaff, staffSearch]
  );

  // Keep selected Store / Group / Staff in sync with workspace data & search filter
  useEffect(() => {
    if (filteredStores.length > 0 && !filteredStores.includes(storeName)) {
      setStoreName(filteredStores[0]);
    }
  }, [filteredStores, storeName]);

  useEffect(() => {
    if (filteredGroups.length > 0 && !filteredGroups.includes(groupName)) {
      setGroupName(filteredGroups[0]);
    }
  }, [filteredGroups, groupName]);

  useEffect(() => {
    if (lockedSaleName) {
      setStaffName(lockedSaleName);
      return;
    }
    if (filteredStaff.length > 0 && !filteredStaff.some((s) => s.name === staffName)) {
      setStaffName(filteredStaff[0].name);
    }
  }, [filteredStaff, staffName, lockedSaleName]);

  const effectiveStoreName = filteredStores.includes(storeName) ? storeName.trim() : '';
  const effectiveGroupName = filteredGroups.includes(groupName) ? groupName.trim() : '';

  const missingRequiredFields = useMemo(() => {
    const missing: Array<{
      key: 'customerName' | 'customerPhone' | 'customerAddress' | 'storeName' | 'groupName';
      label: string;
    }> = [];
    if (!customerName.trim()) {
      missing.push({ key: 'customerName', label: t.pos.fieldCustomerName });
    }
    if (!customerPhone.trim()) {
      missing.push({ key: 'customerPhone', label: t.pos.fieldPhone });
    }
    if (!customerAddress.trim()) {
      missing.push({ key: 'customerAddress', label: t.pos.fieldAddress });
    }
    if (!effectiveStoreName) {
      missing.push({ key: 'storeName', label: t.pos.fieldStore });
    }
    if (!effectiveGroupName) {
      missing.push({ key: 'groupName', label: t.pos.fieldGroups });
    }
    return missing;
  }, [
    customerName,
    customerPhone,
    customerAddress,
    effectiveStoreName,
    effectiveGroupName,
    t.pos.fieldCustomerName,
    t.pos.fieldPhone,
    t.pos.fieldAddress,
    t.pos.fieldStore,
    t.pos.fieldGroups,
  ]);

  const missingFieldKeys = useMemo(
    () => new Set(missingRequiredFields.map((m) => m.key)),
    [missingRequiredFields]
  );

  useEffect(() => {
    if (!cartDrawerOpen || checkoutStep !== 'form') {
      setFormValidationAttempted(false);
    }
  }, [cartDrawerOpen, checkoutStep]);

  // Keep cart products synced with live Firestore stock so multi-device stock-outs block checkout immediately
  const liveCart = useMemo(
    () =>
      cart.map((item) => {
        const latest = products.find((p) => p.id === item.product.id);
        return {
          ...item,
          product: latest || item.product,
          existsInCatalog: Boolean(latest),
        };
      }),
    [cart, products]
  );

  const cartStockIssues = useMemo(
    () =>
      liveCart.filter(
        (item) =>
          !item.existsInCatalog ||
          item.product.stock <= 0 ||
          item.quantity > item.product.stock
      ),
    [liveCart]
  );

  const hasStockBlocker = cartStockIssues.length > 0;

  const addToCart = (product: Product): boolean => {
    if (readOnly) {
      setStatusFeedback({
        type: 'error',
        message: t.pos.expiredError,
      });
      return false;
    }
    const latest = products.find((p) => p.id === product.id) || product;
    if (latest.stock <= 0) {
      setStatusFeedback({
        type: 'error',
        message: `${t.pos.outOfStockErrorPrefix}${latest.name}${t.pos.outOfStockErrorSuffix}`,
      });
      return false;
    }
    const existing = cart.find((it) => it.product.id === latest.id);
    if (existing && existing.quantity >= latest.stock) {
      setStatusFeedback({
        type: 'error',
        message: `${t.pos.insufficientStockPrefix}${latest.name}${t.pos.insufficientStockMiddle}${latest.stock}${t.pos.insufficientStockSuffix}`,
      });
      return false;
    }
    setCart((prev) => {
      const current = prev.find((it) => it.product.id === latest.id);
      if (current) {
        if (current.quantity >= latest.stock) return prev;
        return prev.map((it) =>
          it.product.id === latest.id
            ? { ...it, product: latest, quantity: it.quantity + 1 }
            : it
        );
      }
      return [...prev, { product: latest, quantity: 1 }];
    });
    return true;
  };

  const getCatalogUnitPrice = (prod: Product) =>
    Math.max(0, prod.sellingPrice - (prod.promotion || 0));

  const getEffectiveUnitPrice = (item: CartItem) =>
    item.customUnitPrice !== undefined && Number.isFinite(item.customUnitPrice)
      ? Math.max(0, item.customUnitPrice)
      : getCatalogUnitPrice(item.product);

  const handleManualPriceChange = (productId: string, rawVal: string) => {
    setPriceDrafts((prev) => ({ ...prev, [productId]: rawVal }));
    if (rawVal.trim() === '') {
      setCart((prev) =>
        prev.map((it) => (it.product.id === productId ? { ...it, customUnitPrice: 0 } : it))
      );
      return;
    }
    const parsed = Number(rawVal);
    if (!Number.isFinite(parsed)) return;
    const cleanUsd = inputAmountToUsd(Math.max(0, parsed), currency);
    setCart((prev) =>
      prev.map((it) => (it.product.id === productId ? { ...it, customUnitPrice: cleanUsd } : it))
    );
  };

  const handleManualPriceBlur = (productId: string) => {
    const draft = priceDrafts[productId];
    if (draft !== undefined && draft.trim() === '') {
      resetManualPrice(productId);
    }
  };

  const resetManualPrice = (productId: string) => {
    setPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setCart((prev) =>
      prev.map((it) =>
        it.product.id === productId ? { ...it, customUnitPrice: undefined } : it
      )
    );
  };

  const clearCartAll = () => {
    setCart([]);
    setPriceDrafts({});
    setDiscountType('amount');
    setDiscountInput('');
    setFormValidationAttempted(false);
  };

  useEffect(() => {
    if (cart.length === 0) {
      setPriceDrafts({});
      setDiscountType('amount');
      setDiscountInput('');
      return;
    }
    const activeIds = new Set(cart.map((c) => c.product.id));
    setPriceDrafts((prev) => {
      const hasStale = Object.keys(prev).some((id) => !activeIds.has(id));
      if (!hasStale) return prev;
      const next: Record<string, string> = {};
      for (const id of Object.keys(prev)) {
        if (activeIds.has(id)) next[id] = prev[id];
      }
      return next;
    });
  }, [cart]);

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.product.id !== productId) return it;
          const latestProd = products.find((p) => p.id === productId) || it.product;
          const nextQty = Math.min(latestProd.stock, it.quantity + delta);
          return { ...it, product: latestProd, quantity: nextQty };
        })
        .filter((it) => it.quantity > 0)
    );
  };

  const totalItems = useMemo(
    () => liveCart.reduce((sum, it) => sum + it.quantity, 0),
    [liveCart]
  );

  const cartSubtotal = useMemo(() => {
    const raw = liveCart.reduce(
      (sum, it) => sum + getEffectiveUnitPrice(it) * it.quantity,
      0
    );
    return roundUsdPrecision(raw);
  }, [liveCart]);

  const rawDiscountNum = Math.max(0, Number(discountInput) || 0);
  const clampedDiscountValue =
    discountType === 'percent'
      ? Math.min(100, Math.round(rawDiscountNum * 100) / 100)
      : inputAmountToUsd(rawDiscountNum, currency);

  const discountAmount = useMemo(() => {
    if (cartSubtotal <= 0 || clampedDiscountValue <= 0) return 0;
    if (discountType === 'percent') {
      return Math.min(
        cartSubtotal,
        roundUsdPrecision(cartSubtotal * (clampedDiscountValue / 100))
      );
    }
    return Math.min(cartSubtotal, clampedDiscountValue);
  }, [cartSubtotal, discountType, clampedDiscountValue]);

  const cartFinalTotal = useMemo(
    () => Math.max(0, roundUsdPrecision(cartSubtotal - discountAmount)),
    [cartSubtotal, discountAmount]
  );

  const discountCappedHint =
    (discountType === 'percent' && rawDiscountNum > 100) ||
    (discountType === 'amount' &&
      cartSubtotal > 0 &&
      rawDiscountNum > usdToInputAmount(cartSubtotal, currency));

  const handleFlagProblemCustomer = async () => {
    if (readOnly) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      setStatusFeedback({
        type: 'error',
        message: t.pos.problemFlagNeedInfo,
      });
      return;
    }
    const ok = await onAddProblemCustomer({
      name: customerName.trim(),
      phone: customerPhone.trim(),
      note: note.trim() || t.pos.problemFlagDefaultNote,
    });
    if (ok) {
      setStatusFeedback({
        type: 'success',
        message: t.pos.problemFlagSuccess,
      });
    }
  };

  const handleCompletePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || liveCart.length === 0) return;
    if (hasStockBlocker) {
      setStatusFeedback({
        type: 'error',
        message: t.pos.stockBlockerTitle,
      });
      setCheckoutStep('items');
      return;
    }
    setFormValidationAttempted(true);
    if (missingRequiredFields.length > 0) {
      const firstMissingKey = missingRequiredFields[0]?.key;
      const targetEl =
        firstMissingKey === 'customerName'
          ? customerNameInputRef.current
          : firstMissingKey === 'customerPhone'
          ? customerPhoneInputRef.current
          : firstMissingKey === 'customerAddress'
          ? customerAddressInputRef.current
          : firstMissingKey === 'storeName'
          ? storeSelectRef.current
          : groupSelectRef.current;
      window.requestAnimationFrame(() => {
        targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl?.focus();
      });
      return;
    }
    setSubmitting(true);
    setStatusFeedback(null);
    const ok = await onCreateOrder({
      date,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      storeName: effectiveStoreName,
      groupName: effectiveGroupName,
      staffName: lockedSaleName || staffName || availableSalesAndStaff[0]?.name || '',
      paymentStatus,
      note: note.trim(),
      dueDate: dueDate.trim(),
      discountType,
      discountValue: clampedDiscountValue,
      items: liveCart.map((c) => ({
        productId: c.product.id,
        quantity: c.quantity,
        ...(c.customUnitPrice !== undefined ? { customUnitPrice: c.customUnitPrice } : {}),
      })),
    });
    setSubmitting(false);
    if (ok) {
      clearCartAll();
      setFormValidationAttempted(false);
      setCheckoutStep('items');
      setCartDrawerOpen(false);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setNote('');
      setDueDate('');
      setPaymentStatus('paid');
      setStatusFeedback({
        type: 'success',
        message: t.pos.orderSavedSuccess,
      });
    }
  };

  const renderMatchedOrdersCard = (
    matchedList: Order[],
    problem?: ProblemCustomer | null
  ) => {
    // If no order in workspace matches, synthesize record from problem customer so all 6 fields are still presented
    const listToRender: Array<{
      id: string;
      orderNumber: string;
      storeName: string;
      staffName: string;
      totalAmount: number;
      paymentStatus: 'paid' | 'unpaid';
      date: string;
      time: string;
      dueDate?: string;
      note?: string;
    }> =
      matchedList.length > 0
        ? matchedList
        : problem
        ? [
            {
              id: problem.id,
              orderNumber: problem.sourceOrderId || t.pos.problemCustomerRecord,
              storeName: '-',
              staffName: t.pos.systemRecord,
              totalAmount: 0,
              paymentStatus: 'unpaid' as const,
              date: problem.createdAt ? problem.createdAt.split('T')[0] : t.pos.notSpecified,
              time:
                problem.createdAt && problem.createdAt.includes('T')
                  ? problem.createdAt.split('T')[1].slice(0, 5)
                  : t.pos.notSpecified,
              dueDate: '',
              note: problem.note || t.pos.problemCustomerRecord,
            },
          ]
        : [];

    if (listToRender.length === 0) return null;

    return (
      <div className="space-y-2 mt-2">
        <div className="flex items-center justify-between text-xs font-semibold text-danger">
          <span>{t.pos.matchedOrdersHistoryTitle}</span>
          <span className="text-[11px] text-muted font-normal tabular-nums">
            ({listToRender.length} {t.pos.recordsUnit})
          </span>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
          {listToRender.map((ord) => (
            <div
              key={ord.id}
              className="rounded-control border border-danger/45 bg-surface p-3 text-xs text-foreground space-y-2 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-1.5">
                <span className="font-mono font-bold text-primary">
                  {t.pos.invoiceLabel} {ord.orderNumber}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-control text-[11px] font-bold ${
                    ord.paymentStatus === 'paid'
                      ? 'bg-success/15 text-success border border-success/35'
                      : 'bg-danger/15 text-danger border border-danger/35'
                  }`}
                >
                  {ord.paymentStatus === 'paid' ? t.common.paid : t.common.unpaid}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs leading-relaxed">
                <div className="flex items-start justify-between sm:justify-start gap-2 min-w-0">
                  <span className="text-muted shrink-0">{t.pos.boughtAtStore}</span>
                  <strong className="text-foreground text-right sm:text-left break-words min-w-0">{ord.storeName || '-'}</strong>
                </div>
                <div className="flex items-start justify-between sm:justify-start gap-2 min-w-0">
                  <span className="text-muted shrink-0">{t.pos.salesStaffLabel}</span>
                  <strong className="text-foreground text-right sm:text-left break-words min-w-0">{ord.staffName || '-'}</strong>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
                  <span className="text-muted shrink-0">{t.pos.totalAmountField}</span>
                  <strong className="text-primary tabular-nums font-bold">
                    {formatMoney(ord.totalAmount, currency)}
                  </strong>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
                  <span className="text-muted shrink-0">{t.pos.paymentStatusField}</span>
                  <strong
                    className={
                      ord.paymentStatus === 'paid'
                        ? 'text-success font-bold'
                        : 'text-danger font-bold'
                    }
                  >
                    {ord.paymentStatus === 'paid' ? t.common.paid : t.common.unpaid}
                  </strong>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
                  <span className="text-muted shrink-0">{t.common.date}:</span>
                  <strong className="tabular-nums text-foreground">{ord.date}</strong>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
                  <span className="text-muted shrink-0">{t.common.time}:</span>
                  <strong className="tabular-nums text-foreground">{ord.time}</strong>
                </div>
              </div>
              {ord.dueDate && (
                <div className="text-[11px] text-accent pt-1 border-t border-border/40">
                  <span className="text-muted">{t.common.dueDate}: </span>
                  <strong className="tabular-nums">{ord.dueDate}</strong>
                </div>
              )}
              {ord.note && (
                <div className="text-[11px] text-danger/90 pt-0.5 break-words leading-relaxed">
                  <span className="text-muted">{t.pos.reasonNoteLabel} </span>
                  <span className="font-medium">{ord.note}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };


  return (
    <div className={`space-y-4 sm:space-y-5 ${cart.length > 0 && !cartDrawerOpen ? 'pb-20 md:pb-0' : ''}`}>
      {/* Top POS Filter & Cart Bar */}
      <Surface className="p-3.5 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Icon3D name="pos" size={34} />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-foreground truncate leading-snug">
                {t.pos.title}
              </h2>
              <p className="text-xs text-muted line-clamp-1">
                {t.pos.subtitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <Button tone="quiet" onClick={() => setScannerOpen(true)} className="w-full sm:w-auto">
              <Camera className="h-4 w-4 text-primary shrink-0" /> {t.pos.scanBarcode}
            </Button>

            <Button
              tone="primary"
              onClick={() => {
                setCartDrawerOpen(true);
                setCheckoutStep('items');
              }}
              className="w-full sm:w-auto relative"
            >
              <Icon3D name="cart" size={20} />
              <span>{t.pos.cartBtn} ({totalItems})</span>
              {totalItems > 0 && (
                <span className="font-bold tabular-nums hidden sm:inline">
                  · {formatMoney(cartFinalTotal, currency)}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-3.5 sm:mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.pos.searchPlaceholder}
            className={inputClass}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={inputClass}
            aria-label="Filter Category"
          >
            <option value="ALL">{t.pos.allCategories}</option>
            {settings.categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {!hideWarehouse && (
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className={inputClass}
              aria-label="Filter Warehouse"
            >
              <option value="ALL">{t.pos.allWarehouses}</option>
              {settings.warehouses.map((wh) => (
                <option key={wh} value={wh}>
                  {wh}
                </option>
              ))}
            </select>
          )}
        </div>

        {statusFeedback && (
          <div
            role={statusFeedback.type === 'error' ? 'alert' : 'status'}
            className={`mt-3 flex items-center justify-between gap-2 rounded-control border px-3.5 py-2 text-xs sm:text-sm ${
              statusFeedback.type === 'error'
                ? 'border-danger/45 bg-danger/10 text-danger font-medium'
                : 'border-primary/30 bg-primary/10 text-foreground'
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              {statusFeedback.type === 'error' ? (
                <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              )}
              <span className="break-words">{statusFeedback.message}</span>
            </span>
            <button
              type="button"
              onClick={() => setStatusFeedback(null)}
              className="text-xs text-muted hover:text-foreground cursor-pointer shrink-0"
            >
              {t.common.close}
            </button>
          </div>
        )}
      </Surface>

      {/* Product Grid (2-column compact cards on mobile, up to 4-col on desktop) */}
      {sortedFilteredProducts.length === 0 ? (
        <Surface className="p-8 sm:p-10 text-center text-sm text-muted">
          {products.length === 0
            ? t.pos.noProductsForSale
            : t.pos.noMatchingProducts}
        </Surface>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
            {visibleProductsSlice.map((prod) => {
              const inCartQty = cartQtyByProductId.get(prod.id) || 0;
              const effectivePrice = Math.max(0, prod.sellingPrice - (prod.promotion || 0));
              const isOutOfStock = prod.stock <= 0;

              return (
                <div key={prod.id}>
                <Surface
                  className={`p-2.5 sm:p-4 flex flex-col justify-between h-full space-y-2.5 sm:space-y-3 ${
                    isOutOfStock ? 'border-danger/40 opacity-90' : ''
                  }`}
                >
                  <div className="space-y-2 sm:space-y-3">
                    <div className="relative">
                      <ProductImage
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="h-28 sm:h-40 w-full"
                        onZoom={onZoomImage}
                      />
                      {isOutOfStock && (
                        <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-control bg-danger px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-danger-foreground shadow-xs">
                          {t.pos.outOfStockBadge}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug" title={prod.name}>
                        {prod.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-muted mt-0.5 truncate">
                        {prod.category}
                        {!hideWarehouse && prod.warehouse ? ` · ${prod.warehouse}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-2.5 sm:pt-3 space-y-2.5 sm:space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <div className="min-w-0">
                        <span className="text-sm sm:text-base font-bold tabular-nums text-primary">
                          {formatMoney(effectivePrice, currency)}
                        </span>
                        {prod.promotion > 0 && (
                          <span className="ml-1 text-[11px] sm:text-xs line-through text-muted tabular-nums">
                            {formatMoney(prod.sellingPrice, currency)}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] sm:text-xs tabular-nums ${
                          isOutOfStock
                            ? 'text-danger font-bold'
                            : prod.stock <= 10
                            ? 'text-danger font-semibold'
                            : 'text-muted font-semibold'
                        }`}
                      >
                        {isOutOfStock ? t.pos.stockZeroBadge : `${t.pos.stockLabel} ${prod.stock}`}
                      </span>
                    </div>

                    {inCartQty > 0 ? (
                      <div className="flex items-center justify-between gap-1 sm:gap-2">
                        <Button
                          tone="quiet"
                          disabled={readOnly}
                          onClick={() => updateCartQty(prod.id, -1)}
                          className="min-h-11 min-w-11 px-2"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span
                          className={`font-bold tabular-nums text-xs sm:text-sm text-center min-w-5 ${
                            inCartQty > prod.stock ? 'text-danger' : ''
                          }`}
                        >
                          {inCartQty}
                        </span>
                        <Button
                          tone="primary"
                          onClick={() => updateCartQty(prod.id, 1)}
                          disabled={readOnly || isOutOfStock || inCartQty >= prod.stock}
                          className="min-h-11 min-w-11 px-2"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        tone={isOutOfStock ? 'quiet' : 'primary'}
                        onClick={() => addToCart(prod)}
                        disabled={readOnly || isOutOfStock}
                        className={`w-full px-2 sm:px-4 text-xs sm:text-sm ${
                          isOutOfStock ? 'border-danger/35 text-danger bg-danger/5' : ''
                        }`}
                      >
                        <Icon3D name="cart" size={18} />
                        <span className="truncate">
                          {readOnly
                            ? t.pos.disabledExpired
                            : isOutOfStock
                            ? t.pos.outOfStockBtn
                            : t.pos.addToCartBtn}
                        </span>
                      </Button>
                    )}
                  </div>
                </Surface>
              </div>
            );
          })}
          </div>

          <div ref={loadMoreSentinelRef} aria-hidden="true" className="h-1 w-full" />

          {remainingProdCount > 0 && (
            <div className="flex justify-center pt-1">
              <Button
                tone="quiet"
                onClick={() => setVisibleProdCount((prev) => prev + POS_DOM_STEP)}
                className="w-full sm:w-auto min-h-10 px-4 text-xs"
              >
                <ChevronDown className="h-4 w-4 shrink-0" />
                <span>
                  {t.pos.showMoreProductsBtn.replace('{remaining}', String(remainingProdCount))}
                </span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Mobile Floating Quick Checkout Bar when Cart has items */}
      {cart.length > 0 && !cartDrawerOpen && (
        <div className="md:hidden fixed bottom-[4.15rem] inset-x-3 z-20">
          <Button
            tone="primary"
            onClick={() => {
              setCartDrawerOpen(true);
              setCheckoutStep('items');
            }}
            className="w-full min-h-12 justify-between px-4 py-2.5 shadow-float"
          >
            <span className="flex items-center gap-2 text-xs font-semibold tabular-nums">
              <Icon3D name="cart" size={20} />
              <span>
                {totalItems} {t.pos.mobileItemsUnit} · {formatMoney(cartFinalTotal, currency)}
              </span>
            </span>
            <span className="text-xs font-bold shrink-0">{t.pos.openCartCheckout}</span>
          </Button>
        </div>
      )}

      {/* Cart & Checkout Modal Form Card */}
      <AnimatePresence>
        {cartDrawerOpen && (
          <div
            ref={cartDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.pos.cartModalAria}
            className={`fixed inset-x-0 top-0 bottom-0 z-50 flex justify-center bg-foreground/60 ${
              mobileKeyboardOpen
                ? 'items-end p-0 sm:p-2'
                : 'items-end sm:items-center p-0 sm:p-5'
            }`}
            onClick={() => setCartDrawerOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.12 }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                ref={cartSurfaceRef}
                className="relative flex flex-col max-h-[min(92dvh,var(--pos-vv-max-h,92dvh))] rounded-t-2xl sm:rounded-card overflow-hidden border border-primary/30 bg-surface text-foreground ring-1 ring-primary/15 shadow-float min-w-0"
              >
                {/* Clean Emerald Top Accent Bar */}
                <div
                  aria-hidden="true"
                  className="relative z-20 h-1.5 w-full shrink-0 bg-gradient-to-r from-primary via-emerald-500 to-teal-500"
                />

                {/* Lightweight Static Ambient Pattern Layer inside Form Cart */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden z-0">
                  <div className="pos-cart-dot-grid absolute inset-0 opacity-20 dark:opacity-12" />
                </div>

                {/* Mobile Bottom-Sheet Drag Handle */}
                {!mobileKeyboardOpen && (
                  <div className="relative z-10 sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
                    <div className="w-10 h-1.5 rounded-full bg-border" />
                  </div>
                )}

                {/* Sticky Sheet Header & Animated 2-Step Segmented Tabs */}
                <div className="relative z-10 border-b border-border/60 bg-surface shrink-0">
                  <div
                    className={`flex items-center justify-between gap-2.5 px-4 sm:px-6 ${
                      mobileKeyboardOpen ? 'py-2' : 'py-3'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {!mobileKeyboardOpen && <Icon3D name="cart" size={30} />}
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-foreground truncate leading-snug">
                          {checkoutStep === 'items'
                            ? `${t.pos.cartStepItemsTitle} (${totalItems} ${t.pos.mobileItemsUnit})`
                            : t.pos.cartStepFormTitle}
                        </h3>
                        {!mobileKeyboardOpen && (
                          <p className="text-xs text-muted tabular-nums">
                            {t.pos.totalAmountLabel}{' '}
                            <strong className="text-primary">
                              {formatMoney(cartFinalTotal, currency)}
                            </strong>
                            {discountAmount > 0 && (
                              <span className="ml-1.5 text-danger">
                                ({t.pos.discountLabel} -{formatMoney(discountAmount, currency)})
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      tone="quiet"
                      onClick={() => setCartDrawerOpen(false)}
                      className={`${
                        mobileKeyboardOpen ? 'min-h-9 min-w-9 px-2.5' : 'min-h-11 min-w-11 px-3'
                      } shrink-0`}
                      aria-label={t.common.close}
                    >
                      <X className="h-4 w-4" />{' '}
                      {!mobileKeyboardOpen && (
                        <span className="hidden sm:inline">{t.common.close}</span>
                      )}
                    </Button>
                  </div>

                  {/* Animated Pill Step Switcher (Hidden briefly while keyboard is open to maximize form visibility) */}
                  {!mobileKeyboardOpen && (
                    <div className="px-4 sm:px-6 pb-3">
                      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-control border border-border/75 bg-background/85">
                        {([
                          { id: 'items' as const, label: `${t.pos.tabItems} (${totalItems})`, disabled: false },
                          {
                            id: 'form' as const,
                            label: t.pos.tabForm,
                            disabled: liveCart.length === 0 || hasStockBlocker,
                          },
                        ]).map((tab) => {
                          const active = checkoutStep === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              disabled={tab.disabled}
                              onClick={() => setCheckoutStep(tab.id)}
                              className={`relative min-h-10 rounded-control px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer truncate disabled:opacity-45 disabled:cursor-not-allowed ${
                                active
                                  ? 'text-primary-foreground'
                                  : 'text-muted hover:text-foreground'
                              }`}
                            >
                              {active && (
                                <motion.span
                                  layoutId="pos-cart-active-step"
                                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                  className="absolute inset-0 rounded-control bg-primary shadow-xs -z-0"
                                />
                              )}
                              <span className="relative z-10">{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Scrollable Body */}
                <div
                  ref={cartBodyRef}
                  className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-4"
                >
                  {readOnly && (
                    <div
                      role="alert"
                      className="rounded-control border border-danger/50 bg-danger/10 p-3.5 text-xs sm:text-sm text-danger space-y-2"
                    >
                      <p className="font-bold">
                        {t.pos.expiredCartAlert}
                      </p>
                      {telegramUrl && (
                        <a
                          href={telegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-105"
                        >
                          {t.header.contactDevTelegram}
                        </a>
                      )}
                    </div>
                  )}
                  {/* Strict Out-of-Stock / Insufficient Stock Blocker Banner */}
                  {hasStockBlocker && (
                    <div
                      role="alert"
                      className="rounded-control border border-danger bg-danger/10 p-3.5 text-xs sm:text-sm text-danger space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-start gap-2 font-bold leading-relaxed">
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5" />
                        <span>
                          {t.pos.stockBlockerTitle}
                        </span>
                      </div>
                      <ul className="list-disc pl-6 space-y-0.5 text-xs">
                        {cartStockIssues.map((issue) => (
                          <li key={issue.product.id}>
                            <strong>{issue.product.name}</strong> —{' '}
                            {!issue.existsInCatalog
                              ? t.pos.deletedFromSystem
                              : issue.product.stock <= 0
                              ? t.pos.outOfStockRemoveHint
                              : t.pos.stockRemainingSelected
                                  .replace('{stock}', String(issue.product.stock))
                                  .replace('{qty}', String(issue.quantity))}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Instant Phone Warning Banner on Top of POS Form Cart */}
                  {(phoneAlerts.problemMatch || phoneAlerts.unpaidOrders.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="alert"
                      className="rounded-control border border-danger bg-danger/10 p-3.5 text-sm text-danger space-y-2 shadow-xs"
                    >
                      <div className="flex items-start gap-2 font-bold text-xs sm:text-sm leading-relaxed">
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-danger mt-0.5" />
                        <span>
                          {phoneAlerts.problemMatch
                            ? t.pos.problemPhoneWarning
                            : t.pos.unpaidPhoneWarning}
                        </span>
                      </div>

                      {phoneAlerts.problemMatch && (
                        <div className="rounded-control bg-danger/10 p-2.5 text-xs text-foreground space-y-1 leading-relaxed">
                          <p>
                            {t.pos.customerLabel} <strong className="text-danger">{phoneAlerts.problemMatch.name}</strong> ({phoneAlerts.problemMatch.phone})
                          </p>
                          {phoneAlerts.problemMatch.note && (
                            <p className="text-xs text-muted break-words">
                              {t.pos.recordNoteLabel} <span className="text-danger font-medium">{phoneAlerts.problemMatch.note}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {phoneAlerts.unpaidOrders.length > 0 && (
                        <p className="text-xs font-semibold text-danger leading-relaxed">
                          {t.pos.unpaidInvoiceCountPrefix}{' '}
                          <strong className="underline">{phoneAlerts.unpaidOrders.length}</strong> {t.pos.unpaidInvoiceTotalLabel}{' '}
                          <strong className="underline tabular-nums">
                            {formatMoney(
                              phoneAlerts.unpaidOrders.reduce((s, o) => s + o.totalAmount, 0),
                              currency
                            )}
                          </strong>
                        </p>
                      )}

                      {renderMatchedOrdersCard(phoneAlerts.matchedOrders, phoneAlerts.problemMatch)}
                    </motion.div>
                  )}

                  {checkoutStep === 'items' ? (
                    <div className="space-y-3">
                      {cart.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted">
                          {t.pos.emptyCartMsg}
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-xs text-muted pb-1">
                            <span>{t.pos.selectedProductsCount} ({cart.length} {t.pos.mobileItemsUnit})</span>
                            <button
                              type="button"
                              onClick={clearCartAll}
                              className="min-h-9 px-2 font-medium text-danger hover:underline cursor-pointer"
                            >
                              {t.pos.clearCartBtn}
                            </button>
                          </div>
                          <div className="divide-y divide-border/50">
                              {liveCart.map((item) => {
                                const catalogUnit = getCatalogUnitPrice(item.product);
                                const unit = getEffectiveUnitPrice(item);
                                const isEdited =
                                  item.customUnitPrice !== undefined &&
                                  Math.abs(item.customUnitPrice - catalogUnit) > 0.0001;
                                const draftVal =
                                  priceDrafts[item.product.id] !== undefined
                                    ? priceDrafts[item.product.id]
                                    : String(usdToInputAmount(unit, currency));
                                const itemStockBlocked =
                                  !item.existsInCatalog ||
                                  item.product.stock <= 0 ||
                                  item.quantity > item.product.stock;

                                return (
                                  <div
                                    key={item.product.id}
                                    className={`py-3 space-y-2.5 ${
                                      itemStockBlocked ? 'bg-danger/5 -mx-2 px-2 rounded-control' : ''
                                    }`}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <ProductImage
                                          src={item.product.imageUrl}
                                          alt={item.product.name}
                                          className="h-12 w-12 shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                          <p className="font-semibold text-sm text-foreground break-words leading-snug">
                                            {item.product.name}
                                          </p>
                                          <p className="text-xs text-muted tabular-nums mt-0.5">
                                            {formatMoney(unit, currency)} × {item.quantity} ={' '}
                                            <strong className="text-foreground">
                                              {formatMoney(unit * item.quantity, currency)}
                                            </strong>{' '}
                                            ·{' '}
                                            <span
                                              className={
                                                itemStockBlocked
                                                  ? 'text-danger font-bold'
                                                  : ''
                                              }
                                            >
                                              {item.product.stock <= 0
                                                ? t.pos.outOfStockShort
                                                : `${t.pos.stockLeftShort} ${item.product.stock}`}
                                            </span>
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-end gap-2 shrink-0">
                                        <Button
                                          tone="quiet"
                                          onClick={() => updateCartQty(item.product.id, -1)}
                                          className="min-h-11 min-w-11 px-2.5"
                                          aria-label="Decrease quantity"
                                        >
                                          <Minus className="h-4 w-4" />
                                        </Button>
                                        <span className="min-w-8 text-center font-bold tabular-nums text-sm">
                                          {item.quantity}
                                        </span>
                                        <Button
                                          tone="quiet"
                                          onClick={() => updateCartQty(item.product.id, 1)}
                                          disabled={
                                            item.product.stock <= 0 ||
                                            item.quantity >= item.product.stock
                                          }
                                          className="min-h-11 min-w-11 px-2.5"
                                          aria-label="Increase quantity"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          tone="danger"
                                          onClick={() =>
                                            setCart((prev) =>
                                              prev.filter((x) => x.product.id !== item.product.id)
                                            )
                                          }
                                          className="min-h-11 min-w-11 px-2.5"
                                          aria-label="Remove item"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Quick inline manual unit price control in Cart step */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-background/70 border border-border/60 px-3 py-2">
                                      <span className="text-xs font-medium text-muted">
                                        {t.pos.editUnitPriceLabel} ({currencyMeta.inputLabel}):
                                        {isEdited && (
                                          <span className="ml-1.5 text-[11px] text-primary font-semibold">
                                            ({t.pos.originalPriceLabel} {formatMoney(catalogUnit, currency)})
                                          </span>
                                        )}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <div className="relative w-32">
                                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted font-semibold">
                                            {currencyMeta.symbol}
                                          </span>
                                          <input
                                            type="number"
                                            step={currencyMeta.step}
                                            min="0"
                                            value={draftVal}
                                            onChange={(e) =>
                                              handleManualPriceChange(item.product.id, e.target.value)
                                            }
                                            onBlur={() => handleManualPriceBlur(item.product.id)}
                                            aria-label={`${t.pos.editUnitPriceLabel} ${item.product.name}`}
                                            className="min-h-10 sm:min-h-9 w-full rounded-control border border-border bg-surface pl-7 pr-2 py-1 text-base sm:text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/35"
                                          />
                                        </div>
                                        {isEdited && (
                                          <button
                                            type="button"
                                            onClick={() => resetManualPrice(item.product.id)}
                                            className="min-h-9 rounded-control border border-border px-2.5 text-[11px] font-medium text-muted hover:text-foreground cursor-pointer"
                                          >
                                            {t.pos.resetOriginalPrice}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <form id="pos-checkout-form" noValidate onSubmit={handleCompletePurchase} className="space-y-4">
                      {formValidationAttempted && missingRequiredFields.length > 0 && (
                        <div
                          role="alert"
                          className="rounded-control border border-danger bg-danger/10 p-3.5 text-xs sm:text-sm text-danger space-y-1.5 shadow-xs"
                        >
                          <div className="flex items-start gap-2 font-bold leading-relaxed">
                            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5" />
                            <span>{t.pos.requiredFormAlertTitle}</span>
                          </div>
                          <ul className="list-disc pl-6 space-y-0.5 text-xs font-medium">
                            {missingRequiredFields.map((field) => (
                              <li key={field.key}>{field.label}</li>
                            ))}
                          </ul>
                          {(settings.stores.length === 0 || settings.groups.length === 0) && (
                            <p className="text-[11px] font-medium text-danger/90 pt-0.5 leading-relaxed">
                              {t.pos.requiredSettingsConfigHint}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="rounded-card border border-primary/20 bg-surface-elevated/90 p-3.5 sm:p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                        <Field label={t.pos.fieldDate}>
                          <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={inputClass}
                          />
                        </Field>

                        <Field label={t.pos.fieldCustomerName} required>
                          <input
                            ref={customerNameInputRef}
                            type="text"
                            required
                            aria-required="true"
                            aria-invalid={formValidationAttempted && missingFieldKeys.has('customerName')}
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder={t.pos.placeholderCustomerName}
                            className={`${inputClass} ${
                              formValidationAttempted && missingFieldKeys.has('customerName')
                                ? 'border-danger bg-danger/5 focus:border-danger focus:outline-danger/30'
                                : ''
                            }`}
                          />
                          {formValidationAttempted && missingFieldKeys.has('customerName') && (
                            <span className="block text-[11px] font-semibold text-danger">
                              {t.pos.requiredFieldEmptyError}
                            </span>
                          )}
                        </Field>

                        <div className="sm:col-span-2">
                          <Field label={t.pos.fieldPhone} required>
                            <div className="relative">
                              <input
                                ref={customerPhoneInputRef}
                                type="tel"
                                required
                                aria-required="true"
                                aria-invalid={formValidationAttempted && missingFieldKeys.has('customerPhone')}
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder={t.pos.placeholderPhone}
                                className={`${inputClass} ${
                                  phoneAlerts.problemMatch || phoneAlerts.unpaidOrders.length > 0
                                    ? 'border-danger focus:ring-danger/40 pr-10 bg-danger/5 font-semibold text-danger'
                                    : formValidationAttempted && missingFieldKeys.has('customerPhone')
                                    ? 'border-danger bg-danger/5 focus:border-danger focus:outline-danger/30'
                                    : ''
                                }`}
                              />
                              {(phoneAlerts.problemMatch || phoneAlerts.unpaidOrders.length > 0) && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-danger">
                                  <AlertTriangle className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            {formValidationAttempted && missingFieldKeys.has('customerPhone') && (
                              <span className="block text-[11px] font-semibold text-danger">
                                {t.pos.requiredFieldEmptyError}
                              </span>
                            )}
                          </Field>

                          {/* Inline Warning in POS Form Cart showing the 6 fields */}
                          {(phoneAlerts.problemMatch || phoneAlerts.unpaidOrders.length > 0) && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2.5 rounded-control border border-danger bg-danger/10 p-3 sm:p-3.5 space-y-2 shadow-xs"
                            >
                              <div className="flex items-start gap-2 text-danger font-bold text-xs sm:text-sm leading-relaxed">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>
                                  {phoneAlerts.problemMatch
                                    ? t.pos.problemPhoneWarning
                                    : t.pos.unpaidPhoneWarning}
                                </span>
                              </div>

                              {phoneAlerts.problemMatch && (
                                <p className="text-xs text-foreground break-words leading-relaxed">
                                  • {t.pos.customerLabel} <strong className="text-danger">{phoneAlerts.problemMatch.name}</strong> ({phoneAlerts.problemMatch.phone})
                                  {phoneAlerts.problemMatch.note ? ` — ${t.pos.recordNoteLabel} ${phoneAlerts.problemMatch.note}` : ''}
                                </p>
                              )}

                              {renderMatchedOrdersCard(phoneAlerts.matchedOrders, phoneAlerts.problemMatch)}
                            </motion.div>
                          )}
                        </div>

                        <div className="sm:col-span-2">
                          <Field label={t.pos.fieldAddress} required>
                            <input
                              ref={customerAddressInputRef}
                              type="text"
                              required
                              aria-required="true"
                              aria-invalid={formValidationAttempted && missingFieldKeys.has('customerAddress')}
                              value={customerAddress}
                              onChange={(e) => setCustomerAddress(e.target.value)}
                              placeholder={t.pos.placeholderAddress}
                              className={`${inputClass} ${
                                formValidationAttempted && missingFieldKeys.has('customerAddress')
                                  ? 'border-danger bg-danger/5 focus:border-danger focus:outline-danger/30'
                                  : ''
                              }`}
                            />
                            {formValidationAttempted && missingFieldKeys.has('customerAddress') && (
                              <span className="block text-[11px] font-semibold text-danger">
                                {t.pos.requiredFieldEmptyError}
                              </span>
                            )}
                          </Field>
                        </div>
                      </div>

                      {/* Search + Filter Store, Group, Sales Staff */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div
                          className={`rounded-control border p-3 shadow-xs space-y-2 ${
                            formValidationAttempted && missingFieldKeys.has('storeName')
                              ? 'border-danger bg-danger/5'
                              : 'border-border/75 bg-surface-elevated/85'
                          }`}
                        >
                          <span className="block text-xs font-semibold text-foreground leading-relaxed">
                            {t.pos.fieldStore}
                            <span className="ml-1 font-bold text-danger" aria-hidden="true">
                              *
                            </span>
                          </span>
                          <input
                            type="search"
                            value={storeSearch}
                            onChange={(e) => setStoreSearch(e.target.value)}
                            placeholder={t.pos.placeholderSearchStore}
                            className={inputClass}
                          />
                          <select
                            ref={storeSelectRef}
                            required
                            aria-required="true"
                            aria-invalid={formValidationAttempted && missingFieldKeys.has('storeName')}
                            value={effectiveStoreName}
                            onChange={(e) => setStoreName(e.target.value)}
                            className={`${inputClass} ${
                              formValidationAttempted && missingFieldKeys.has('storeName')
                                ? 'border-danger bg-danger/5 focus:border-danger focus:outline-danger/30'
                                : ''
                            }`}
                          >
                            {filteredStores.length === 0 ? (
                              <option value="">{t.pos.noStoreOption}</option>
                            ) : (
                              filteredStores.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))
                            )}
                          </select>
                          {formValidationAttempted && missingFieldKeys.has('storeName') && (
                            <span className="block text-[11px] font-semibold text-danger">
                              {t.pos.requiredFieldEmptyError}
                            </span>
                          )}
                        </div>

                        <div
                          className={`rounded-control border p-3 shadow-xs space-y-2 ${
                            formValidationAttempted && missingFieldKeys.has('groupName')
                              ? 'border-danger bg-danger/5'
                              : 'border-border/75 bg-surface-elevated/85'
                          }`}
                        >
                          <span className="block text-xs font-semibold text-foreground leading-relaxed">
                            {t.pos.fieldGroups}
                            <span className="ml-1 font-bold text-danger" aria-hidden="true">
                              *
                            </span>
                          </span>
                          <input
                            type="search"
                            value={groupSearch}
                            onChange={(e) => setGroupSearch(e.target.value)}
                            placeholder={t.pos.placeholderSearchGroup}
                            className={inputClass}
                          />
                          <select
                            ref={groupSelectRef}
                            required
                            aria-required="true"
                            aria-invalid={formValidationAttempted && missingFieldKeys.has('groupName')}
                            value={effectiveGroupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className={`${inputClass} ${
                              formValidationAttempted && missingFieldKeys.has('groupName')
                                ? 'border-danger bg-danger/5 focus:border-danger focus:outline-danger/30'
                                : ''
                            }`}
                          >
                            {filteredGroups.length === 0 ? (
                              <option value="">{t.pos.noGroupOption}</option>
                            ) : (
                              filteredGroups.map((g) => (
                                <option key={g} value={g}>
                                  {g}
                                </option>
                              ))
                            )}
                          </select>
                          {formValidationAttempted && missingFieldKeys.has('groupName') && (
                            <span className="block text-[11px] font-semibold text-danger">
                              {t.pos.requiredFieldEmptyError}
                            </span>
                          )}
                        </div>

                        <div className="rounded-control border border-border/75 bg-surface-elevated/85 p-3 shadow-xs space-y-2">
                          <span className="block text-xs font-semibold text-foreground leading-relaxed">
                            {t.pos.fieldSaleStaff}
                          </span>
                          {lockedSaleName ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                readOnly
                                value={lockedSaleName}
                                aria-label={t.pos.fieldSaleStaff}
                                className={`${inputClass} border-primary/50 bg-primary/10 font-semibold text-primary cursor-not-allowed`}
                              />
                              <span className="block text-[11px] font-medium text-muted leading-snug">
                                {t.pos.autoFilledSaleHint}
                              </span>
                            </div>
                          ) : (
                            <>
                              <input
                                type="search"
                                value={staffSearch}
                                onChange={(e) => setStaffSearch(e.target.value)}
                                placeholder={t.pos.placeholderSearchStaff}
                                className={inputClass}
                              />
                              <select
                                value={staffName}
                                onChange={(e) => setStaffName(e.target.value)}
                                className={inputClass}
                              >
                                {filteredStaff.length === 0 ? (
                                  <option value="">{t.pos.noStaffOption}</option>
                                ) : (
                                  filteredStaff.map((st) => (
                                    <option key={st.id} value={st.name}>
                                      {st.name}
                                    </option>
                                  ))
                                )}
                              </select>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="rounded-card border border-border/75 bg-surface-elevated/85 p-3.5 sm:p-4 shadow-xs space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                          <Field label={t.pos.fieldPaymentStatus}>
                            <select
                              value={paymentStatus}
                              onChange={(e) => setPaymentStatus(e.target.value as 'paid' | 'unpaid')}
                              className={inputClass}
                            >
                              <option value="paid">{t.pos.statusPaidOpt}</option>
                              <option value="unpaid">{t.pos.statusUnpaidOpt}</option>
                            </select>
                          </Field>

                          <Field label={t.pos.fieldDueDate}>
                            <input
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        <Field label={t.pos.fieldNotes}>
                          <textarea
                            rows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t.pos.placeholderNotes}
                            className={inputClass}
                          />
                        </Field>
                      </div>

                      {/* Manual Unit Price Adjustment & Discount inside POS Form Cart */}
                      <div className="rounded-card border border-primary/25 bg-primary/[0.03] dark:bg-primary/[0.06] p-3.5 sm:p-4 shadow-xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Icon3D name="price-record" size={24} />
                            <h4 className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                              {t.pos.manualPriceDiscountTitle}
                            </h4>
                          </div>
                          <span className="text-[11px] text-muted">
                            {t.pos.itemsUnitsSummary
                              .replace('{items}', String(cart.length))
                              .replace('{units}', String(totalItems))}
                          </span>
                        </div>

                        {/* Item-by-item Manual Unit Price Edit */}
                        <div className="space-y-2">
                          <span className="block text-xs font-medium text-muted">
                            {t.pos.manualPriceItemLabel} ({currencyMeta.inputLabel} {t.pos.perUnitSuffix})
                          </span>
                          <div className="divide-y divide-border/45 rounded-control border border-border/60 bg-surface px-3">
                            {cart.map((item) => {
                              const catalogUnit = getCatalogUnitPrice(item.product);
                              const unit = getEffectiveUnitPrice(item);
                              const isEdited =
                                item.customUnitPrice !== undefined &&
                                Math.abs(item.customUnitPrice - catalogUnit) > 0.0001;
                              const draftVal =
                                priceDrafts[item.product.id] !== undefined
                                  ? priceDrafts[item.product.id]
                                  : String(usdToInputAmount(unit, currency));

                              return (
                                <div
                                  key={item.product.id}
                                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-semibold text-foreground break-words leading-snug">
                                      {item.product.name}{' '}
                                      <span className="text-primary font-bold tabular-nums">
                                        × {item.quantity}
                                      </span>
                                    </p>
                                    <p className="text-[11px] text-muted tabular-nums">
                                      {t.pos.originalPriceLabel}: {formatMoney(catalogUnit, currency)}
                                      {isEdited && (
                                        <span className="ml-1.5 font-semibold text-primary">
                                          {t.pos.newEditedPricePrefix} {formatMoney(unit, currency)}
                                        </span>
                                      )}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                                    <div className="flex items-center gap-1.5">
                                      <div className="relative w-32">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted font-semibold">
                                          {currencyMeta.symbol}
                                        </span>
                                        <input
                                          type="number"
                                          step={currencyMeta.step}
                                          min="0"
                                          value={draftVal}
                                          onChange={(e) =>
                                            handleManualPriceChange(
                                              item.product.id,
                                              e.target.value
                                            )
                                          }
                                          onBlur={() => handleManualPriceBlur(item.product.id)}
                                          aria-label={`${t.pos.editUnitPriceLabel} ${item.product.name}`}
                                          className="min-h-11 sm:min-h-9 w-full rounded-control border border-border bg-background pl-7 pr-2 py-1.5 text-base sm:text-sm font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/35"
                                        />
                                      </div>
                                      {isEdited && (
                                        <button
                                          type="button"
                                          onClick={() => resetManualPrice(item.product.id)}
                                          className="min-h-11 sm:min-h-9 rounded-control border border-border bg-background px-2.5 text-[11px] font-medium text-muted hover:text-foreground cursor-pointer shrink-0"
                                        >
                                          {t.pos.resetOriginalPrice}
                                        </button>
                                      )}
                                    </div>

                                    <span className="min-w-20 text-right text-xs sm:text-sm font-bold tabular-nums text-foreground">
                                      {formatMoney(unit * item.quantity, currency)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Order-level Discount Control (Active Currency or %) */}
                        <div className="space-y-2.5 border-t border-border/50 pt-3">
                          <span className="block text-xs font-medium text-muted">
                            {t.pos.orderDiscountLabel}
                          </span>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setDiscountType('amount')}
                              className={`min-h-11 rounded-control border px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                                discountType === 'amount'
                                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                                  : 'border-border bg-surface text-muted hover:text-foreground'
                              }`}
                            >
                              {t.pos.discountAmountBtn} ({currencyMeta.inputLabel})
                            </button>
                            <button
                              type="button"
                              onClick={() => setDiscountType('percent')}
                              className={`min-h-11 rounded-control border px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                                discountType === 'percent'
                                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                                  : 'border-border bg-surface text-muted hover:text-foreground'
                              }`}
                            >
                              {t.pos.discountPercentBtn}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative flex-1 min-w-0">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                                {discountType === 'percent' ? '%' : currencyMeta.symbol}
                              </span>
                              <input
                                type="number"
                                step={discountType === 'percent' ? '0.01' : currencyMeta.step}
                                min="0"
                                max={discountType === 'percent' ? 100 : undefined}
                                value={discountInput}
                                onChange={(e) => setDiscountInput(e.target.value)}
                                placeholder={
                                  discountType === 'percent'
                                    ? t.pos.placeholderDiscountPercent
                                    : `${t.pos.placeholderDiscountAmount} (${currencyMeta.inputLabel})...`
                                }
                                className={`${inputClass} pl-8 tabular-nums font-semibold`}
                              />
                            </div>
                            {discountInput && (
                              <Button
                                tone="quiet"
                                onClick={() => setDiscountInput('')}
                                className="min-h-11 px-3 text-xs shrink-0"
                              >
                                {t.common.clear}
                              </Button>
                            )}
                          </div>

                          {discountType === 'percent' && (
                            <div className="flex flex-wrap gap-1.5">
                              {[5, 10, 15, 20, 30].map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setDiscountInput(String(pct))}
                                  className={`min-h-9 rounded-control border px-3 text-xs font-semibold tabular-nums cursor-pointer transition-colors ${
                                    Number(discountInput) === pct
                                      ? 'border-primary bg-primary/15 text-primary'
                                      : 'border-border bg-surface text-muted hover:text-foreground'
                                  }`}
                                >
                                  -{pct}%
                                </button>
                              ))}
                            </div>
                          )}

                          {discountCappedHint && (
                            <p className="text-[11px] font-medium text-danger leading-snug">
                              *{' '}
                              {discountType === 'percent'
                                ? t.pos.discountPercentCapHint
                                : t.pos.discountAmountCapHint}
                            </p>
                          )}
                        </div>

                        {/* Live Order Summary Totals */}
                        <div className="rounded-control border border-primary/30 bg-surface p-3.5 shadow-xs space-y-1.5 text-xs sm:text-sm">
                          <div className="flex items-center justify-between gap-2 text-muted">
                            <span>{t.pos.subtotalSummary}</span>
                            <strong className="tabular-nums text-foreground">
                              {formatMoney(cartSubtotal, currency)}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-danger">
                            <span>
                              {t.pos.discountSummary}
                              {discountType === 'percent' && clampedDiscountValue > 0
                                ? ` ${clampedDiscountValue}%`
                                : ''}
                              ):
                            </span>
                            <strong className="tabular-nums">
                              -{formatMoney(discountAmount, currency)}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t border-primary/20 pt-2.5 text-sm sm:text-base font-bold text-primary">
                            <span>{t.pos.netTotalSummary}</span>
                            <span className="tabular-nums">
                              {formatMoney(cartFinalTotal, currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>

                {/* Sticky Sheet Footer */}
                <div
                  className={`relative z-10 shrink-0 border-t border-border/60 bg-surface px-4 sm:px-6 ${
                    mobileKeyboardOpen ? 'py-2' : 'py-3 pb-safe'
                  }`}
                >
                  {checkoutStep === 'items' ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[11px] sm:text-xs text-muted block">
                          {t.pos.totalToPayLabel}
                        </span>
                        <p className="text-lg sm:text-xl font-bold tabular-nums text-primary truncate">
                          {formatMoney(cartFinalTotal, currency)}
                        </p>
                      </div>
                      <Button
                        tone="primary"
                        disabled={readOnly || liveCart.length === 0 || hasStockBlocker}
                        onClick={() => setCheckoutStep('form')}
                        className="px-5 shrink-0"
                      >
                        {t.pos.nextStepBtn}
                      </Button>
                    </div>
                  ) : mobileKeyboardOpen ? (
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        tone="quiet"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        }}
                        className="min-h-10 px-3 text-xs shrink-0"
                      >
                        {t.pos.hideKeyboardBtn}
                      </Button>
                      <Button
                        type="submit"
                        form="pos-checkout-form"
                        tone="primary"
                        disabled={readOnly || submitting || liveCart.length === 0 || hasStockBlocker}
                        className="min-h-10 flex-1 py-2 text-xs font-semibold truncate"
                      >
                        <Icon3D name="check" size={16} />
                        <span className="truncate tabular-nums">
                          {submitting
                            ? t.common.saving
                            : `${t.pos.completePurchaseBtn} · ${formatMoney(cartFinalTotal, currency)}`}
                        </span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formValidationAttempted && missingRequiredFields.length > 0 && (
                        <div
                          role="status"
                          className="flex items-start gap-2 rounded-control border border-danger/50 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger"
                        >
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span className="leading-snug">
                            {t.pos.requiredMissingListPrefix}{' '}
                            {missingRequiredFields.map((f) => f.label).join(', ')}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <Button
                          type="submit"
                          form="pos-checkout-form"
                          tone="primary"
                          disabled={readOnly || submitting || liveCart.length === 0 || hasStockBlocker}
                          className="w-full sm:w-auto sm:order-3 py-3 text-sm sm:text-base font-semibold"
                        >
                          <Icon3D name="check" size={18} />
                          <span className="tabular-nums">
                            {submitting
                              ? t.common.saving
                              : `${t.pos.completePurchaseBtn} · ${formatMoney(cartFinalTotal, currency)}`}
                          </span>
                        </Button>

                        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:order-1">
                          <Button
                            tone="quiet"
                            onClick={() => setCheckoutStep('items')}
                            className="w-full sm:w-auto text-xs sm:text-sm"
                          >
                            {t.pos.backStepBtn}
                          </Button>

                          <Button
                            tone="danger"
                            disabled={readOnly}
                            onClick={handleFlagProblemCustomer}
                            className="w-full sm:w-auto text-xs sm:text-sm sm:order-2"
                          >
                            <Icon3D name="problem-customers" size={18} />
                            <span className="truncate">{t.pos.flagProblemBtn}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          const found = products.find((p) => p.barcode === code);
          if (found) {
            const added = addToCart(found);
            if (added) {
              setStatusFeedback({
                type: 'success',
                message: t.pos.barcodeAddedMsg
                  .replace('{name}', found.name)
                  .replace('{code}', code),
              });
            }
          } else {
            setSearch(code);
            setStatusFeedback({
              type: 'success',
              message: t.pos.barcodeFoundMsg.replace('{code}', code),
            });
          }
        }}
      />
    </div>
  );
};
