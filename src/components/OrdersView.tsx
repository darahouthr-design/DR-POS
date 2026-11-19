import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bluetooth, CheckCircle2, ChevronDown, Loader2, Printer, Plus, Minus, Search, Trash2, X, Download, SlidersHorizontal } from 'lucide-react';
import { Icon3D } from './Icon3D';
import { Button, Field, ProductImage, Surface, inputClass } from './ui';
import {
  exportOrdersToExcel,
  formatMoney,
  getCurrencyMeta,
  inputAmountToUsd,
  roundUsdPrecision,
  tryBluetoothPrintKoreanReceipt,
  downloadOrderInvoiceAsPng,
  usdToInputAmount,
} from '../utils/helpers';
import { useI18n } from '../utils/i18nContext';
import type { TranslationDict } from '../utils/i18n';
import type {
  CurrencyCode,
  Order,
  OrderItem,
  Product,
  StaffMember,
  WorkspaceSettings,
} from '../types';

const DOM_PAGE_STEP = 40;

interface OrderCardProps {
  order: Order;
  productById: Map<string, Product>;
  currency: CurrencyCode;
  hideWarehouse: boolean;
  readOnly: boolean;
  bluetoothSize: '58mm' | '70mm' | '80mm';
  isDownloading: boolean;
  tOrders: TranslationDict['orders'];
  tCommon: TranslationDict['common'];
  onOpenReport: (order: Order) => void;
  onZoomImage?: (url: string, title: string) => void;
  onDownloadPng: (order: Order) => void;
  onBluetoothPrint: (order: Order) => void;
  onStandardPrint: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
}

const OrderCard = React.memo<OrderCardProps>(
  ({
    order,
    productById,
    currency,
    hideWarehouse,
    readOnly,
    bluetoothSize,
    isDownloading,
    tOrders,
    tCommon,
    onOpenReport,
    onZoomImage,
    onDownloadPng,
    onBluetoothPrint,
    onStandardPrint,
    onEdit,
    onDelete,
  }) => (
    <div>
      <Surface
        onClick={() => onOpenReport(order)}
        className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 h-full flex flex-col justify-between cursor-pointer hover:border-primary/45 hover:shadow-card transition-all"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/50 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon3D name="orders" size={30} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono font-semibold text-xs sm:text-sm text-foreground">
                    {order.orderNumber}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      order.paymentStatus === 'paid' ? 'text-primary' : 'text-danger'
                    }`}
                  >
                    · {order.paymentStatus === 'paid' ? tCommon.paid : tCommon.unpaid}
                  </span>
                </div>
                <p className="text-xs text-muted tabular-nums">
                  {order.date} · {tOrders.atTime} {order.time}
                </p>
              </div>
            </div>

            <div className="text-right ml-auto">
              <p className="text-base sm:text-lg font-bold tabular-nums text-primary">
                {formatMoney(order.totalAmount, currency)}
              </p>
              {order.dueDate && (
                <p className="text-[11px] sm:text-xs text-accent font-medium tabular-nums">
                  {tOrders.dueAt} {order.dueDate}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs leading-relaxed">
            <div className="min-w-0">
              <span className="text-muted">{tOrders.customerLabel} </span>
              <strong className="text-foreground break-words">{order.customerName}</strong>
            </div>
            <div className="min-w-0">
              <span className="text-muted">{tOrders.phoneLabel} </span>
              <strong className="text-foreground tabular-nums break-words">{order.customerPhone || '-'}</strong>
            </div>
            <div className="min-w-0">
              <span className="text-muted">{tOrders.addressLabel} </span>
              <span className="text-foreground break-words">{order.customerAddress || '-'}</span>
            </div>
            <div className="min-w-0">
              <span className="text-muted">{tOrders.staffLabel} </span>
              <strong className="text-foreground break-words">{order.staffName}</strong>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <span className="text-muted">{tOrders.storeLabel} </span>
              <span className="text-foreground font-medium break-words">{order.storeName || '-'}</span>
              <span className="text-muted"> / {tOrders.groupLabel} </span>
              <span className="text-foreground font-medium break-words">{order.groupName || '-'}</span>
            </div>
            {!hideWarehouse && (
              <div className="min-w-0">
                <span className="text-muted">{tOrders.warehouseLabel} </span>
                <span className="text-foreground break-words">{order.warehouse || '-'}</span>
              </div>
            )}
          </div>

          <div className="border-t border-border/40 pt-3 space-y-2">
            {order.items.map((it, idx) => {
              const prodImage = productById.get(it.productId)?.imageUrl || '';
              return (
                <div
                  key={`${it.productId}-${idx}`}
                  className="flex items-center justify-between gap-2.5 rounded-control border border-border/50 bg-background/60 px-2.5 py-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <ProductImage
                      src={prodImage}
                      alt={it.productName}
                      className="h-11 w-11 shrink-0"
                      onZoom={onZoomImage}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate leading-snug">
                        {it.productName}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted tabular-nums mt-0.5">
                        <span>
                          {formatMoney(it.unitPrice, currency)} ×{' '}
                          <strong className="text-foreground">{it.quantity}</strong>
                        </span>
                        {it.catalogUnitPrice !== undefined &&
                          Math.abs(it.catalogUnitPrice - it.unitPrice) > 0.001 && (
                            <span className="text-primary font-medium">
                              {tOrders.priceEditedTag}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                  <span className="tabular-nums text-xs font-semibold text-foreground shrink-0">
                    {formatMoney(it.unitPrice * it.quantity, currency)}
                  </span>
                </div>
              );
            })}
            {(order.discountAmount || 0) > 0 && (
              <div className="flex justify-between gap-2 text-xs text-danger pt-1.5 border-t border-dashed border-border/50">
                <span>
                  {tOrders.discountLabel}
                  {order.discountType === 'percent' && order.discountValue
                    ? ` (${order.discountValue}%)`
                    : ''}
                  :
                </span>
                <strong className="tabular-nums">
                  -{formatMoney(order.discountAmount || 0, currency)}
                </strong>
              </div>
            )}
          </div>

          {order.note && (
            <p className="text-xs text-muted border-t border-border/40 pt-2">
              {tOrders.noteLabel} {order.note}
            </p>
          )}
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 border-t border-border/50 pt-3"
        >
          <Button
            tone="quiet"
            onClick={() => onDownloadPng(order)}
            disabled={isDownloading}
            className="w-full sm:w-auto min-h-11 sm:min-h-9 px-2.5 sm:px-3 text-xs"
            title={tOrders.invoicePngBtn}
          >
            <Download className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">
              {isDownloading ? tOrders.downloadingPng : tOrders.invoicePngBtn}
            </span>
          </Button>
          <Button
            tone="quiet"
            onClick={() => onBluetoothPrint(order)}
            className="w-full sm:w-auto min-h-11 sm:min-h-9 px-2.5 sm:px-3 text-xs"
          >
            <Bluetooth className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">Bluetooth ({bluetoothSize})</span>
          </Button>
          <Button
            tone="quiet"
            onClick={() => onStandardPrint(order)}
            className="w-full sm:w-auto min-h-11 sm:min-h-9 px-2.5 sm:px-3 text-xs"
          >
            <Printer className="h-3.5 w-3.5 shrink-0" /> {tOrders.standardPrintBtn}
          </Button>
          {!readOnly && (
            <>
              <Button
                tone="quiet"
                onClick={() => onEdit(order)}
                className="w-full sm:w-auto min-h-11 sm:min-h-9 px-2.5 sm:px-3 text-xs"
              >
                <Icon3D name="edit" size={16} /> {tCommon.edit}
              </Button>
              <Button
                tone="danger"
                onClick={() => onDelete(order)}
                className="col-span-2 sm:col-span-1 w-full sm:w-auto min-h-11 sm:min-h-9 px-3 text-xs sm:ml-auto"
              >
                <Icon3D name="trash" size={16} /> {tCommon.delete}
              </Button>
            </>
          )}
        </div>
      </Surface>
    </div>
  )
);

interface OrdersViewProps {
  orders: Order[];
  products: Product[];
  staff: StaffMember[];
  settings: WorkspaceSettings;
  currency: CurrencyCode;
  hideWarehouse: boolean;
  lockedSaleName?: string;
  readOnly?: boolean;
  hasMoreOrders?: boolean;
  loadingMoreOrders?: boolean;
  onLoadMoreOrders?: () => Promise<void>;
  onZoomImage?: (url: string, title: string) => void;
  onUpdateOrder: (id: string, payload: Partial<Order>) => Promise<boolean>;
  onDeleteOrder: (id: string) => Promise<boolean>;
  onDeleteAllOrders: (ids: string[]) => Promise<boolean>;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  products,
  staff,
  settings,
  currency,
  hideWarehouse,
  lockedSaleName,
  readOnly = false,
  hasMoreOrders = false,
  loadingMoreOrders = false,
  onLoadMoreOrders,
  onZoomImage,
  onUpdateOrder,
  onDeleteOrder,
  onDeleteAllOrders,
}) => {
  const { t, lang } = useI18n();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [storeFilter, setStoreFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'paid' | 'unpaid'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleDomCount, setVisibleDomCount] = useState(DOM_PAGE_STEP);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const [bluetoothSize, setBluetoothSize] = useState<'58mm' | '70mm' | '80mm'>('80mm');
  const [printPreviewOrder, setPrintPreviewOrder] = useState<{
    order: Order;
    mode: '58mm' | '70mm' | '80mm' | 'standard';
    btMessage?: string;
  } | null>(null);

  const [reportOrder, setReportOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<Order | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const deferredFilters = useDeferredValue({
    dateFrom,
    dateTo,
    timeFrom,
    timeTo,
    staffFilter,
    storeFilter,
    groupFilter,
    warehouseFilter,
    paymentStatusFilter,
    searchQuery,
  });

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const filteredOrders = useMemo(() => {
    const {
      dateFrom: df,
      dateTo: dt,
      timeFrom: tf,
      timeTo: tt,
      staffFilter: sf,
      storeFilter: stf,
      groupFilter: gf,
      warehouseFilter: wf,
      paymentStatusFilter: psf,
      searchQuery: sq,
    } = deferredFilters;
    const q = sq.trim().toLowerCase();
    const qDigits = q.replace(/[^0-9]/g, '');

    return orders.filter((o) => {
      if (df && o.date < df) return false;
      if (dt && o.date > dt) return false;
      if (tf && o.time < tf) return false;
      if (tt && o.time > tt) return false;
      if (sf !== 'ALL' && o.staffName !== sf) return false;
      if (stf !== 'ALL' && o.storeName !== stf) return false;
      if (gf !== 'ALL' && o.groupName !== gf) return false;
      if (!hideWarehouse && wf !== 'ALL' && o.warehouse !== wf) return false;
      if (psf !== 'ALL' && o.paymentStatus !== psf) return false;
      if (q) {
        const nameMatch = (o.customerName || '').toLowerCase().includes(q);
        const orderNoMatch = (o.orderNumber || '').toLowerCase().includes(q);
        const rawPhone = (o.customerPhone || '').toLowerCase();
        const phoneMatch =
          rawPhone.includes(q) ||
          (qDigits.length >= 2 && rawPhone.replace(/[^0-9]/g, '').includes(qDigits));
        if (!nameMatch && !orderNoMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [orders, deferredFilters, hideWarehouse]);

  const filteredOrdersTotal = useMemo(
    () => filteredOrders.reduce((s, o) => s + o.totalAmount, 0),
    [filteredOrders]
  );

  const visibleOrdersSlice = useMemo(
    () => filteredOrders.slice(0, visibleDomCount),
    [filteredOrders, visibleDomCount]
  );

  const remainingDomOrders = Math.max(0, filteredOrders.length - visibleOrdersSlice.length);

  useEffect(() => {
    setVisibleDomCount(DOM_PAGE_STEP);
  }, [
    deferredFilters.dateFrom,
    deferredFilters.dateTo,
    deferredFilters.timeFrom,
    deferredFilters.timeTo,
    deferredFilters.staffFilter,
    deferredFilters.storeFilter,
    deferredFilters.groupFilter,
    deferredFilters.warehouseFilter,
    deferredFilters.paymentStatusFilter,
    deferredFilters.searchQuery,
  ]);

  useEffect(() => {
    if (remainingDomOrders <= 0) return;
    const node = loadMoreSentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleDomCount((prev) => prev + DOM_PAGE_STEP);
        }
      },
      { rootMargin: '240px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [remainingDomOrders]);

  const currencyMeta = getCurrencyMeta(currency);
  const [editStockError, setEditStockError] = useState('');

  useEffect(() => {
    if (!productPickerOpen && !reportOrder && !filtersOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (productPickerOpen) {
          setProductPickerOpen(false);
        } else if (reportOrder) {
          setReportOrder(null);
        } else if (filtersOpen) {
          setFiltersOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [productPickerOpen, reportOrder, filtersOpen]);

  const sortedPickerProducts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const ordered = [...products].sort((a, b) => a.sortOrder - b.sortOrder);
    if (!q) return ordered;
    return ordered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [products, pickerSearch]);

  const openEditModal = (order: Order) => {
    setEditingOrder({
      ...order,
      discountValue:
        order.discountType === 'percent'
          ? order.discountValue || 0
          : usdToInputAmount(order.discountValue || 0, currency),
    });
    setEditItems(
      order.items.map((it) => ({
        ...it,
        unitPrice: usdToInputAmount(it.unitPrice, currency),
      }))
    );
    setProductPickerOpen(false);
    setPickerSearch('');
    setEditStockError('');
  };

  const getMaxEditableQty = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return Number.MAX_SAFE_INTEGER;
    const origQty =
      editingOrder?.items.find((i) => i.productId === productId)?.quantity || 0;
    return Math.max(0, prod.stock + origQty);
  };

  const handleAddProductToEdit = (targetProductId: string) => {
    const prod = products.find((p) => p.id === targetProductId);
    if (!prod) return;
    const maxAvail = getMaxEditableQty(prod.id);
    const currentInEdit = editItems.find((i) => i.productId === prod.id)?.quantity || 0;
    if (maxAvail <= 0) {
      setEditStockError(t.orders.outOfStockAddError.replace('{name}', prod.name));
      return;
    }
    if (currentInEdit >= maxAvail) {
      setEditStockError(
        t.orders.maxAvailableStockError
          .replace('{name}', prod.name)
          .replace('{max}', String(maxAvail))
      );
      return;
    }
    setEditStockError('');
    setEditItems((prev) => {
      const existing = prev.find((i) => i.productId === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === prod.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          unitPrice: usdToInputAmount(
            Math.max(0, prod.sellingPrice - (prod.promotion || 0)),
            currency
          ),
          costPrice: prod.costPrice,
          warehouse: prod.warehouse,
        },
      ];
    });
  };

  const editSubtotal = useMemo(
    () =>
      roundUsdPrecision(
        editItems.reduce(
          (s, it) => s + inputAmountToUsd(Math.max(0, Number(it.unitPrice) || 0), currency) * it.quantity,
          0
        )
      ),
    [editItems, currency]
  );

  const editDiscountAmount = useMemo(() => {
    if (!editingOrder || editSubtotal <= 0) return 0;
    const val = Math.max(0, Number(editingOrder.discountValue) || 0);
    if (editingOrder.discountType === 'percent') {
      return Math.min(
        editSubtotal,
        roundUsdPrecision(editSubtotal * (Math.min(100, val) / 100))
      );
    }
    return Math.min(editSubtotal, inputAmountToUsd(val, currency));
  }, [editingOrder, editSubtotal, currency]);

  const editNetTotal = Math.max(0, roundUsdPrecision(editSubtotal - editDiscountAmount));

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || editItems.length === 0) return;
    setBusy(true);
    const isPercent = editingOrder.discountType === 'percent';
    const ok = await onUpdateOrder(editingOrder.id, {
      date: editingOrder.date,
      customerName: editingOrder.customerName,
      customerPhone: editingOrder.customerPhone,
      customerAddress: editingOrder.customerAddress,
      paymentStatus: editingOrder.paymentStatus,
      dueDate: editingOrder.dueDate,
      note: editingOrder.note,
      storeName: editingOrder.storeName,
      groupName: editingOrder.groupName,
      staffName: editingOrder.staffName,
      discountType: editingOrder.discountType || 'amount',
      discountValue: isPercent
        ? Math.max(0, Number(editingOrder.discountValue) || 0)
        : inputAmountToUsd(Math.max(0, Number(editingOrder.discountValue) || 0), currency),
      items: editItems.map((it) => ({
        ...it,
        unitPrice: inputAmountToUsd(Math.max(0, Number(it.unitPrice) || 0), currency),
      })),
    });
    setBusy(false);
    if (ok) {
      setEditingOrder(null);
    }
  };

  const handleBluetoothPrint = async (order: Order) => {
    const res = await tryBluetoothPrintKoreanReceipt(order, bluetoothSize, currency, lang);
    setPrintPreviewOrder({
      order,
      mode: bluetoothSize,
      btMessage: res.message,
    });
  };

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadInvoicePng = async (order: Order, bluetoothOnly = false) => {
    const activePaperWidth =
      printPreviewOrder && printPreviewOrder.order.id === order.id && printPreviewOrder.mode !== 'standard'
        ? printPreviewOrder.mode
        : bluetoothSize;
    try {
      setDownloadingId(order.id);
      await downloadOrderInvoiceAsPng(order, currency, activePaperWidth, bluetoothOnly);
    } finally {
      setDownloadingId(null);
    }
  };


  const activeFilterCount = [
    dateFrom,
    dateTo,
    timeFrom,
    timeTo,
    staffFilter !== 'ALL' ? staffFilter : '',
    storeFilter !== 'ALL' ? storeFilter : '',
    groupFilter !== 'ALL' ? groupFilter : '',
    !hideWarehouse && warehouseFilter !== 'ALL' ? warehouseFilter : '',
    paymentStatusFilter !== 'ALL' ? paymentStatusFilter : '',
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header Card with Filter Trigger, Search Bar, Print Controls & Export Excel */}
      <Surface className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/50 pb-3.5 sm:pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Icon3D name="orders" size={34} />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                  {lockedSaleName
                    ? `${t.orders.saleTitlePrefix} ${lockedSaleName} (${filteredOrders.length})`
                    : `${t.orders.allTitlePrefix} (${filteredOrders.length})`}
                </h2>
                <p className="text-xs text-muted">
                  {t.orders.totalAmountLabel}{' '}
                  <strong className="text-primary tabular-nums">
                    {formatMoney(filteredOrdersTotal, currency)}
                  </strong>
                  {lockedSaleName && (
                    <span className="ml-2 text-primary font-medium">
                      {t.orders.saleOnlyHint}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
            <Button
              tone={filtersOpen || activeFilterCount > 0 ? 'primary' : 'quiet'}
              onClick={() => setFiltersOpen(true)}
              className="w-full sm:w-auto min-h-10 px-3.5 text-xs whitespace-nowrap"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span>
                {t.orders.filtersBtn}
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </span>
            </Button>

            <div className="flex items-center justify-between sm:justify-start gap-2 rounded-control border border-border bg-background px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-foreground shrink-0">
                <Bluetooth className="h-4 w-4 text-primary shrink-0" />
                <span>{t.orders.printWidthLabel}</span>
              </span>
              <div className="flex items-center gap-1">
                {(['58mm', '70mm', '80mm'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setBluetoothSize(sz)}
                    className={`min-h-10 sm:min-h-8 rounded px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                      bluetoothSize === sz
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <Button
              tone="primary"
              onClick={() => exportOrdersToExcel(filteredOrders, currency)}
              className="w-full sm:w-auto"
            >
              <Icon3D name="excel" size={20} /> {t.orders.exportExcelBtn}
            </Button>

            {!readOnly && filteredOrders.length > 0 && (
              <Button
                tone="danger"
                onClick={() => {
                  setStatusMessage('');
                  setConfirmDeleteAll(true);
                }}
                disabled={busy}
                className="w-full sm:w-auto whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                <span>{t.orders.deleteAllBtn}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Invoice Search Bar & Quick Payment Status Filter */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:items-center gap-2 sm:gap-2.5">
          <div className="relative min-w-0 sm:flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.orders.searchOrdersPlaceholder}
              aria-label={t.orders.searchOrdersPlaceholder}
              className={`${inputClass} min-h-10 pl-9 ${searchQuery ? 'pr-9' : 'pr-3'} min-w-0`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t.orders.clearFilters}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-control text-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={paymentStatusFilter}
            onChange={(e) =>
              setPaymentStatusFilter(e.target.value as 'ALL' | 'paid' | 'unpaid')
            }
            aria-label={t.orders.allStatuses}
            className={`${inputClass} min-h-10 min-w-0 w-full sm:w-52 sm:shrink-0`}
          >
            <option value="ALL">{t.orders.allStatuses}</option>
            <option value="paid">{t.common.paid}</option>
            <option value="unpaid">{t.common.unpaid}</option>
          </select>
        </div>

        {statusMessage && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-control border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-xs font-medium text-foreground"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{statusMessage}</span>
            </span>
            <button
              type="button"
              onClick={() => setStatusMessage('')}
              aria-label={t.common.close}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:text-foreground cursor-pointer shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </Surface>

      {/* Order Form Cards List (Progressive Windowing + Firestore Cursor Pagination) */}
      {filteredOrders.length === 0 ? (
        <Surface className="p-10 text-center space-y-3">
          <p className="text-sm text-muted">{t.orders.noMatchingOrders}</p>
          {(searchQuery.trim() || activeFilterCount > 0) && (
            <Button
              tone="quiet"
              onClick={() => {
                setSearchQuery('');
                setDateFrom('');
                setDateTo('');
                setTimeFrom('');
                setTimeTo('');
                setStaffFilter('ALL');
                setStoreFilter('ALL');
                setGroupFilter('ALL');
                setWarehouseFilter('ALL');
                setPaymentStatusFilter('ALL');
              }}
              className="min-h-10 px-4 text-xs"
            >
              {t.orders.clearFilters}
            </Button>
          )}
        </Surface>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleOrdersSlice.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                productById={productById}
                currency={currency}
                hideWarehouse={hideWarehouse}
                readOnly={readOnly}
                bluetoothSize={bluetoothSize}
                isDownloading={downloadingId === order.id}
                tOrders={t.orders}
                tCommon={t.common}
                onOpenReport={setReportOrder}
                onZoomImage={onZoomImage}
                onDownloadPng={handleDownloadInvoicePng}
                onBluetoothPrint={handleBluetoothPrint}
                onStandardPrint={(o) => setPrintPreviewOrder({ order: o, mode: 'standard' })}
                onEdit={openEditModal}
                onDelete={setConfirmDeleteOrder}
              />
            ))}
          </div>

          <div ref={loadMoreSentinelRef} aria-hidden="true" className="h-1 w-full" />

          {(remainingDomOrders > 0 || hasMoreOrders || orders.length > 0) && (
            <Surface className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-muted tabular-nums">
                {t.orders.loadedSummary.replace('{count}', String(orders.length))}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {remainingDomOrders > 0 && (
                  <Button
                    tone="quiet"
                    onClick={() => setVisibleDomCount((prev) => prev + DOM_PAGE_STEP)}
                    className="w-full sm:w-auto min-h-10 px-3.5 text-xs"
                  >
                    <ChevronDown className="h-4 w-4 shrink-0" />
                    <span>
                      {t.orders.showMoreScreenBtn.replace(
                        '{remaining}',
                        String(remainingDomOrders)
                      )}
                    </span>
                  </Button>
                )}

                {hasMoreOrders && onLoadMoreOrders ? (
                  <Button
                    tone="primary"
                    disabled={loadingMoreOrders}
                    onClick={onLoadMoreOrders}
                    className="w-full sm:w-auto min-h-10 px-4 text-xs"
                  >
                    {loadingMoreOrders ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    )}
                    <span>
                      {loadingMoreOrders ? t.orders.loadingMoreBtn : t.orders.loadMoreBtn}
                    </span>
                  </Button>
                ) : (
                  remainingDomOrders === 0 && (
                    <span className="text-xs font-medium text-muted">
                      {t.orders.allRecordsLoaded}
                    </span>
                  )
                )}
              </div>
            </Surface>
          )}
        </div>
      )}

      {/* KOREAN PRINT RECEIPT PREVIEW & PRINT MODAL */}
      {printPreviewOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Korean Print Receipt"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/65 backdrop-blur-[2px] p-0 sm:p-4"
          onClick={() => setPrintPreviewOrder(null)}
        >
          <Surface
            className="w-full max-w-lg flex flex-col max-h-[92dvh] rounded-t-2xl sm:rounded-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-border" />
            </div>

            <div className="flex items-center justify-between border-b border-border/60 px-4 sm:px-5 py-3 shrink-0">
              <h3 className="text-sm font-semibold truncate pr-2">
                {t.orders.printPreviewTitle} — {printPreviewOrder.mode})
              </h3>
              <Button
                tone="quiet"
                onClick={() => setPrintPreviewOrder(null)}
                className="min-h-11 min-w-11 px-2.5 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
              {printPreviewOrder.btMessage && (
                <p className="text-xs text-primary font-medium">{printPreviewOrder.btMessage}</p>
              )}

              {/* Printable Area in 100% Korean Form */}
              <div className="flex justify-center bg-background p-3 sm:p-4 rounded-control overflow-x-auto">
                <div
                  id="drpos-print-area"
                  style={{
                    width:
                      printPreviewOrder.mode === '58mm'
                        ? '220px'
                        : printPreviewOrder.mode === '70mm'
                        ? '265px'
                        : printPreviewOrder.mode === '80mm'
                        ? '302px'
                        : '100%',
                  }}
                  className="bg-white text-black p-4 rounded border border-neutral-300 text-xs space-y-2.5 font-sans"
                >
                  <div className="text-center border-b border-dashed border-neutral-400 pb-2">
                    <p className="text-base font-bold tracking-tight">DR-POS 영수증</p>
                    <p className="text-[11px] text-neutral-600">주문 확인서 / 거래명세표</p>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">주문번호:</span>
                      <span className="font-mono">{printPreviewOrder.order.orderNumber}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">주문일시:</span>
                      <span>
                        {printPreviewOrder.order.date} {printPreviewOrder.order.time}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">고객성명:</span>
                      <span>{printPreviewOrder.order.customerName}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">전화번호:</span>
                      <span>{printPreviewOrder.order.customerPhone || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">배송주소:</span>
                      <span className="text-right">{printPreviewOrder.order.customerAddress || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">매장 / 그룹:</span>
                      <span className="text-right">
                        {printPreviewOrder.order.storeName || '-'} / {printPreviewOrder.order.groupName || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">담당직원:</span>
                      <span>{printPreviewOrder.order.staffName || '-'}</span>
                    </div>
                  </div>

                  {printPreviewOrder.mode === 'standard' && (
                    <div className="border-y border-dashed border-neutral-400 py-2 space-y-1.5 text-[11px]">
                      <div className="flex justify-between font-bold">
                        <span>품목명 / 수량</span>
                        <span>금액</span>
                      </div>
                      {printPreviewOrder.order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between gap-2">
                          <span>
                            {it.productName} × {it.quantity}
                          </span>
                          <span className="tabular-nums font-medium">
                            {formatMoney(it.unitPrice * it.quantity, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={`space-y-1 text-[11px] ${
                      printPreviewOrder.mode !== 'standard'
                        ? 'border-t border-dashed border-neutral-400 pt-2'
                        : ''
                    }`}
                  >
                    {printPreviewOrder.mode === 'standard' &&
                      (printPreviewOrder.order.discountAmount || 0) > 0 && (
                        <>
                          <div className="flex justify-between text-neutral-600">
                            <span>소계금액:</span>
                            <span className="tabular-nums">
                              {formatMoney(
                                printPreviewOrder.order.subtotalAmount ??
                                  printPreviewOrder.order.items.reduce(
                                    (s, it) => s + it.unitPrice * it.quantity,
                                    0
                                  ),
                                currency
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between text-red-700 font-semibold">
                            <span>
                              할인금액
                              {printPreviewOrder.order.discountType === 'percent' &&
                              printPreviewOrder.order.discountValue
                                ? ` (${printPreviewOrder.order.discountValue}%)`
                                : ''}
                              :
                            </span>
                            <span className="tabular-nums">
                              -{formatMoney(printPreviewOrder.order.discountAmount || 0, currency)}
                            </span>
                          </div>
                        </>
                      )}
                    <div className="flex justify-between text-sm font-bold">
                      <span>총 합계금액:</span>
                      <span className="tabular-nums">
                        {formatMoney(printPreviewOrder.order.totalAmount, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">결제상태:</span>
                      <span className="font-bold">
                        {printPreviewOrder.order.paymentStatus === 'paid' ? '결제완료' : '미결제'}
                      </span>
                    </div>
                    {printPreviewOrder.mode === 'standard' && printPreviewOrder.order.dueDate && (
                      <div className="flex justify-between">
                        <span className="font-semibold">결제예정일:</span>
                        <span>{printPreviewOrder.order.dueDate}</span>
                      </div>
                    )}
                    {printPreviewOrder.mode === 'standard' && printPreviewOrder.order.note && (
                      <div className="pt-1">
                        <span className="font-semibold">비고: </span>
                        <span>{printPreviewOrder.order.note}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-neutral-400 pt-2 text-center text-[10px] text-neutral-600">
                    이용해 주셔서 감사합니다 · DR-POS
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-border/60 bg-surface px-4 sm:px-5 py-3 pb-safe grid grid-cols-2 sm:flex sm:flex-wrap justify-end gap-2">
              <Button
                tone="quiet"
                onClick={() =>
                  handleDownloadInvoicePng(
                    printPreviewOrder.order,
                    printPreviewOrder.mode !== 'standard'
                  )
                }
                disabled={downloadingId === printPreviewOrder.order.id}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <Download className="h-4 w-4 text-primary shrink-0" />
                <span>
                  {downloadingId === printPreviewOrder.order.id ? t.orders.downloadingPng : t.orders.downloadPngBtn}
                </span>
              </Button>
              <Button tone="primary" onClick={() => window.print()} className="w-full sm:w-auto text-xs sm:text-sm">
                <Printer className="h-4 w-4 shrink-0" /> {t.orders.printNowBtn}
              </Button>
              <Button
                tone="quiet"
                onClick={() => setPrintPreviewOrder(null)}
                className="col-span-2 sm:col-span-1 w-full sm:w-auto text-xs sm:text-sm sm:order-first"
              >
                {t.common.close}
              </Button>
            </div>
          </Surface>
        </div>
      )}

      {/* EDIT ORDER MODAL */}
      {editingOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.orders.editModalTitle}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/65 backdrop-blur-[2px] p-0 sm:p-4"
          onClick={() => setEditingOrder(null)}
        >
          <Surface
            className="w-full max-w-2xl flex flex-col max-h-[92dvh] rounded-t-2xl sm:rounded-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-border" />
            </div>

            <div className="flex items-center justify-between border-b border-border/60 px-4 sm:px-6 py-3 shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm sm:text-base font-semibold truncate">
                  {t.orders.editModalTitle} ({editingOrder.orderNumber})
                </h3>
                <p className="text-xs text-muted tabular-nums">
                  {t.orders.newTotalLabel}{' '}
                  <strong className="text-primary">
                    {formatMoney(editNetTotal, currency)}
                  </strong>
                  {editDiscountAmount > 0 && (
                    <span className="ml-1.5 text-danger">
                      ({t.pos.discountLabel} -{formatMoney(editDiscountAmount, currency)})
                    </span>
                  )}
                </p>
              </div>
              <Button
                tone="quiet"
                onClick={() => setEditingOrder(null)}
                className="min-h-11 min-w-11 px-2.5 shrink-0"
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form
              id="edit-order-form"
              onSubmit={handleSaveEdit}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4"
            >
              {/* Add or Adjust Products in Order */}
              <div className="space-y-2.5 border-b border-border/50 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="block text-sm font-semibold">{t.orders.addOrEditItemsLabel}</span>
                  <Button
                    tone="primary"
                    onClick={() => {
                      setPickerSearch('');
                      setEditStockError('');
                      setProductPickerOpen(true);
                    }}
                    className="w-full sm:w-auto min-h-10 px-3.5 text-xs whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>{t.orders.openAddProductPickerBtn}</span>
                  </Button>
                </div>

                {editStockError && (
                  <p role="alert" className="text-xs font-semibold text-danger">
                    {editStockError}
                  </p>
                )}

                <div className="divide-y divide-border/40 mt-2">
                  {editItems.map((it) => (
                    <div
                      key={it.productId}
                      className="py-2.5 space-y-2 text-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="font-medium truncate">{it.productName}</span>
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted font-semibold">
                              {currencyMeta.symbol}
                            </span>
                            <input
                              type="number"
                              step={currencyMeta.step}
                              min="0"
                              value={it.unitPrice}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value) || 0);
                                setEditItems((prev) =>
                                  prev.map((x) =>
                                    x.productId === it.productId ? { ...x, unitPrice: val } : x
                                  )
                                );
                              }}
                              aria-label={`${t.pos.editUnitPriceLabel} ${it.productName}`}
                              className="min-h-11 sm:min-h-9 w-full rounded-control border border-border bg-background pl-7 pr-2 py-1 text-xs font-semibold tabular-nums"
                            />
                          </div>
                          <Button
                            tone="quiet"
                            onClick={() =>
                              setEditItems((prev) =>
                                prev
                                  .map((x) =>
                                    x.productId === it.productId
                                      ? { ...x, quantity: x.quantity - 1 }
                                      : x
                                  )
                                  .filter((x) => x.quantity > 0)
                              )
                            }
                            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 px-2.5"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="min-w-7 text-center font-bold tabular-nums">{it.quantity}</span>
                          <Button
                            tone="quiet"
                            disabled={it.quantity >= getMaxEditableQty(it.productId)}
                            onClick={() => {
                              const maxAvail = getMaxEditableQty(it.productId);
                              if (it.quantity >= maxAvail) {
                                setEditStockError(
                                  t.orders.maxAvailableStockError
                                    .replace('{name}', it.productName)
                                    .replace('{max}', String(maxAvail))
                                );
                                return;
                              }
                              setEditStockError('');
                              setEditItems((prev) =>
                                prev.map((x) =>
                                  x.productId === it.productId
                                    ? { ...x, quantity: x.quantity + 1 }
                                    : x
                                )
                              );
                            }}
                            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 px-2.5"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            tone="danger"
                            onClick={() =>
                              setEditItems((prev) => prev.filter((x) => x.productId !== it.productId))
                            }
                            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 px-2.5"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit Order Discount Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
                  <Field label={t.orders.discountTypeLabel}>
                    <select
                      value={editingOrder.discountType || 'amount'}
                      onChange={(e) =>
                        setEditingOrder({
                          ...editingOrder,
                          discountType: e.target.value as 'amount' | 'percent',
                        })
                      }
                      className={inputClass}
                    >
                      <option value="amount">{t.orders.discountTypeAmount} ({currencyMeta.inputLabel})</option>
                      <option value="percent">{t.orders.discountTypePercent}</option>
                    </select>
                  </Field>
                  <Field
                    label={
                      editingOrder.discountType === 'percent'
                        ? t.orders.discountPercentInput
                        : `${t.orders.discountAmountInput} (${currencyMeta.inputLabel})`
                    }
                  >
                    <input
                      type="number"
                      step={editingOrder.discountType === 'percent' ? '0.01' : currencyMeta.step}
                      min="0"
                      max={editingOrder.discountType === 'percent' ? 100 : undefined}
                      value={editingOrder.discountValue ?? 0}
                      onChange={(e) =>
                        setEditingOrder({
                          ...editingOrder,
                          discountValue: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Field label={t.orders.editDate}>
                  <input
                    type="date"
                    value={editingOrder.date}
                    onChange={(e) => setEditingOrder({ ...editingOrder, date: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label={t.orders.editCustomerName}>
                  <input
                    type="text"
                    value={editingOrder.customerName}
                    onChange={(e) =>
                      setEditingOrder({ ...editingOrder, customerName: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label={t.orders.editPhone}>
                  <input
                    type="tel"
                    value={editingOrder.customerPhone}
                    onChange={(e) =>
                      setEditingOrder({ ...editingOrder, customerPhone: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label={t.orders.editAddress}>
                  <input
                    type="text"
                    value={editingOrder.customerAddress}
                    onChange={(e) =>
                      setEditingOrder({ ...editingOrder, customerAddress: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label={t.orders.editPaymentStatus}>
                  <select
                    value={editingOrder.paymentStatus}
                    onChange={(e) =>
                      setEditingOrder({
                        ...editingOrder,
                        paymentStatus: e.target.value as 'paid' | 'unpaid',
                      })
                    }
                    className={inputClass}
                  >
                    <option value="paid">{t.common.paid}</option>
                    <option value="unpaid">{t.common.unpaid}</option>
                  </select>
                </Field>
                <Field label={t.orders.editDueDate}>
                  <input
                    type="date"
                    value={editingOrder.dueDate}
                    onChange={(e) => setEditingOrder({ ...editingOrder, dueDate: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label={t.orders.editNote}>
                <textarea
                  rows={2}
                  value={editingOrder.note}
                  onChange={(e) => setEditingOrder({ ...editingOrder, note: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </form>

            <div className="shrink-0 border-t border-border/60 bg-surface px-4 sm:px-6 py-3 pb-safe grid grid-cols-2 sm:flex justify-end gap-2">
              <Button
                tone="quiet"
                onClick={() => {
                  setProductPickerOpen(false);
                  setEditingOrder(null);
                }}
                className="w-full sm:w-auto"
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                form="edit-order-form"
                tone="primary"
                disabled={busy || editItems.length === 0}
                className="w-full sm:w-auto"
              >
                <Icon3D name="check" size={18} /> {t.orders.saveChangesBtn}
              </Button>
            </div>
          </Surface>
        </div>
      )}

      {/* ANIMATED POP-UP PRODUCT PICKER FORM CART FOR EDIT ORDER */}
      <AnimatePresence>
        {editingOrder && productPickerOpen && (
          <motion.div
            key="edit-order-product-picker-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t.orders.pickerModalTitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => setProductPickerOpen(false)}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-foreground/65 backdrop-blur-[2px] p-0 sm:p-4"
          >
            <motion.div
              key="edit-order-product-picker-card"
              initial={{ opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <Surface className="w-full max-h-[90dvh] sm:max-h-[85dvh] flex flex-col rounded-t-2xl sm:rounded-card shadow-float overflow-hidden">
                <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                  <div className="h-1 w-10 rounded-full bg-border" />
                </div>

                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 sm:px-6 py-3.5 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon3D name="products" size={32} />
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
                        {t.orders.pickerModalTitle}
                      </h3>
                      <p className="text-xs text-muted truncate tabular-nums">
                        {editingOrder.orderNumber} · {t.orders.newTotalLabel}{' '}
                        <strong className="text-primary">{formatMoney(editNetTotal, currency)}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductPickerOpen(false)}
                    aria-label={t.common.close}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-control border border-border/70 bg-background text-muted hover:text-foreground cursor-pointer shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Search by Product Name */}
                <div className="px-4 sm:px-6 py-3 border-b border-border/50 bg-background/40 shrink-0 space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                      type="text"
                      autoFocus
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder={t.orders.searchProductPlaceholder}
                      className={`${inputClass} pl-9 pr-9`}
                    />
                    {pickerSearch && (
                      <button
                        type="button"
                        onClick={() => setPickerSearch('')}
                        aria-label={t.common.clear}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-muted hover:text-foreground cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {editStockError && (
                    <p role="alert" className="text-xs font-semibold text-danger">
                      {editStockError}
                    </p>
                  )}
                </div>

                {/* Selectable Product Cart Items */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-2.5">
                  {sortedPickerProducts.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted">
                      {t.orders.noSearchProductsFound}
                    </div>
                  ) : (
                    sortedPickerProducts.map((prod) => {
                      const maxAvail = getMaxEditableQty(prod.id);
                      const currentInEdit = editItems.find((i) => i.productId === prod.id)?.quantity || 0;
                      const remainingToAdd = Math.max(0, maxAvail - currentInEdit);
                      const effectivePrice = Math.max(0, prod.sellingPrice - (prod.promotion || 0));
                      const depleted = maxAvail <= 0 || currentInEdit >= maxAvail;

                      return (
                        <div
                          key={prod.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-card border p-3 transition-colors ${
                            currentInEdit > 0
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-border/80 bg-surface'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ProductImage
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="h-14 w-14 shrink-0"
                            />
                            <div className="min-w-0 space-y-0.5">
                              <h4 className="text-sm font-semibold text-foreground break-words leading-snug">
                                {prod.name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs tabular-nums">
                                <span className="font-semibold text-primary">
                                  {formatMoney(effectivePrice, currency)}
                                </span>
                                <span className={remainingToAdd <= 0 ? 'text-danger font-semibold' : 'text-muted'}>
                                  {t.orders.availableLeftPrefix} {remainingToAdd}
                                </span>
                                {currentInEdit > 0 && (
                                  <span className="font-semibold text-foreground">
                                    · {t.orders.inOrderQtyLabel} {currentInEdit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 shrink-0">
                            {currentInEdit > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  tone="quiet"
                                  onClick={() => {
                                    setEditStockError('');
                                    setEditItems((prev) =>
                                      prev
                                        .map((x) =>
                                          x.productId === prod.id
                                            ? { ...x, quantity: x.quantity - 1 }
                                            : x
                                        )
                                        .filter((x) => x.quantity > 0)
                                    );
                                  }}
                                  className="min-h-10 min-w-10 px-2"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="min-w-6 text-center text-sm font-bold tabular-nums">
                                  {currentInEdit}
                                </span>
                              </div>
                            )}

                            <Button
                              tone={depleted ? 'quiet' : 'primary'}
                              disabled={depleted}
                              onClick={() => handleAddProductToEdit(prod.id)}
                              className="min-h-10 px-3 text-xs whitespace-nowrap"
                            >
                              <Plus className="h-4 w-4 shrink-0" />
                              <span>{depleted ? t.orders.outOfStockOpt : t.orders.addProductBtn}</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="shrink-0 border-t border-border/60 bg-surface px-4 sm:px-6 py-3 pb-safe flex items-center justify-between gap-3">
                  <span className="text-xs text-muted tabular-nums">
                    {t.orders.inOrderQtyLabel}{' '}
                    <strong className="text-foreground">
                      {editItems.reduce((s, it) => s + it.quantity, 0)}
                    </strong>
                  </span>
                  <Button
                    tone="primary"
                    onClick={() => setProductPickerOpen(false)}
                    className="min-h-10 px-5 text-xs sm:text-sm"
                  >
                    <Icon3D name="check" size={18} />
                    <span>{t.orders.doneAddingBtn}</span>
                  </Button>
                </div>
              </Surface>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE ORDER CONFIRMATION DIALOG */}
      {confirmDeleteOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/65 backdrop-blur-[2px] p-3 sm:p-4"
        >
          <Surface className="w-full max-w-md p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-semibold text-danger">
              {t.orders.deleteModalTitle} ({confirmDeleteOrder.orderNumber})
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              {t.orders.deleteModalBodyPrefix} <strong>{confirmDeleteOrder.customerName}</strong> {t.orders.deleteModalBodySuffix}
            </p>
            <div className="grid grid-cols-2 sm:flex justify-end gap-2">
              <Button tone="quiet" onClick={() => setConfirmDeleteOrder(null)} className="w-full sm:w-auto">
                {t.common.cancel}
              </Button>
              <Button
                tone="danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onDeleteOrder(confirmDeleteOrder.id);
                  setBusy(false);
                  setConfirmDeleteOrder(null);
                }}
                className="w-full sm:w-auto whitespace-normal text-center text-xs sm:text-sm"
              >
                {t.orders.confirmDeleteRestoreBtn}
              </Button>
            </div>
          </Surface>
        </div>
      )}

      {/* DELETE ALL ORDERS CONFIRMATION DIALOG (DOES NOT RESTORE STOCK) */}
      <AnimatePresence>
        {confirmDeleteAll && (
          <motion.div
            key="delete-all-orders-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t.orders.deleteAllModalTitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={() => {
              if (!busy) setConfirmDeleteAll(false);
            }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/65 backdrop-blur-[2px] p-3 sm:p-4"
          >
            <motion.div
              key="delete-all-orders-card"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Surface className="w-full p-5 sm:p-6 space-y-4 shadow-float">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-danger leading-snug">
                    {t.orders.deleteAllModalTitle} ({filteredOrders.length})
                  </h3>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmDeleteAll(false)}
                    aria-label={t.common.close}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-border/70 bg-background text-muted hover:text-foreground cursor-pointer shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  {t.orders.deleteAllModalBody.replace('{count}', String(filteredOrders.length))}
                </p>
                <div className="grid grid-cols-2 sm:flex justify-end gap-2 pt-1">
                  <Button
                    tone="quiet"
                    disabled={busy}
                    onClick={() => setConfirmDeleteAll(false)}
                    className="w-full sm:w-auto"
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    tone="danger"
                    disabled={busy || filteredOrders.length === 0}
                    onClick={async () => {
                      const targetIds = filteredOrders.map((o) => o.id);
                      const count = targetIds.length;
                      setBusy(true);
                      const ok = await onDeleteAllOrders(targetIds);
                      setBusy(false);
                      if (ok) {
                        setConfirmDeleteAll(false);
                        setStatusMessage(
                          t.orders.deleteAllSuccess.replace('{count}', String(count))
                        );
                      }
                    }}
                    className="w-full sm:w-auto whitespace-normal text-center text-xs sm:text-sm"
                  >
                    {busy ? t.common.saving : t.orders.confirmDeleteAllNoRestoreBtn}
                  </Button>
                </div>
              </Surface>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ANIMATED ORDER DETAIL REPORT MODAL WITH PRODUCT IMAGES */}
      <AnimatePresence>
        {reportOrder && (
          <motion.div
            key="order-detail-report-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={`${t.orders.orderReportTitle} (${reportOrder.orderNumber})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => setReportOrder(null)}
            className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-foreground/65 backdrop-blur-[2px] p-0 sm:p-4"
          >
            <motion.div
              key="order-detail-report-card"
              initial={{ opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <Surface className="w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-t-2xl sm:rounded-card shadow-float overflow-hidden">
                <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                  <div className="h-1 w-10 rounded-full bg-border" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 sm:px-6 py-3.5 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon3D name="orders" size={34} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
                          {t.orders.orderReportTitle} ({reportOrder.orderNumber})
                        </h3>
                        <span
                          className={`text-xs font-semibold ${
                            reportOrder.paymentStatus === 'paid' ? 'text-primary' : 'text-danger'
                          }`}
                        >
                          · {reportOrder.paymentStatus === 'paid' ? t.common.paid : t.common.unpaid}
                        </span>
                      </div>
                      <p className="text-xs text-muted tabular-nums">
                        {reportOrder.date} · {t.orders.atTime} {reportOrder.time}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportOrder(null)}
                    aria-label={t.common.close}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-control border border-border/70 bg-background text-muted hover:text-foreground cursor-pointer shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Report Content Body */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                  {/* Customer & Metadata Summary */}
                  <div className="rounded-card border border-border/70 bg-background/50 p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs leading-relaxed">
                    <div className="min-w-0">
                      <span className="text-muted">{t.orders.customerLabel} </span>
                      <strong className="text-foreground break-words">{reportOrder.customerName}</strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted">{t.orders.phoneLabel} </span>
                      <strong className="text-foreground tabular-nums break-words">
                        {reportOrder.customerPhone || '-'}
                      </strong>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <span className="text-muted">{t.orders.addressLabel} </span>
                      <span className="text-foreground break-words">
                        {reportOrder.customerAddress || '-'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted">{t.orders.staffLabel} </span>
                      <strong className="text-foreground break-words">{reportOrder.staffName}</strong>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <span className="text-muted">{t.orders.storeLabel} </span>
                      <span className="text-foreground font-medium break-words">
                        {reportOrder.storeName || '-'}
                      </span>
                      <span className="text-muted"> / {t.orders.groupLabel} </span>
                      <span className="text-foreground font-medium break-words">
                        {reportOrder.groupName || '-'}
                      </span>
                    </div>
                    {!hideWarehouse && (
                      <div className="min-w-0">
                        <span className="text-muted">{t.orders.warehouseLabel} </span>
                        <span className="text-foreground break-words">
                          {reportOrder.warehouse || '-'}
                        </span>
                      </div>
                    )}
                    {reportOrder.dueDate && (
                      <div className="min-w-0">
                        <span className="text-muted">{t.orders.dueAt} </span>
                        <strong className="text-accent tabular-nums">{reportOrder.dueDate}</strong>
                      </div>
                    )}
                    {reportOrder.note && (
                      <div className="min-w-0 sm:col-span-2 pt-1 border-t border-border/50">
                        <span className="text-muted">{t.orders.noteLabel} </span>
                        <span className="text-foreground break-words">{reportOrder.note}</span>
                      </div>
                    )}
                  </div>

                  {/* Ordered Products List with Product Images */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                      {t.orders.orderItemsSectionTitle} ({reportOrder.items.length})
                    </h4>
                    <div className="space-y-2.5">
                      {reportOrder.items.map((it, idx) => {
                        const prodImage = productById.get(it.productId)?.imageUrl || '';
                        return (
                          <div
                            key={`${it.productId}-${idx}`}
                            className="flex items-center justify-between gap-3 rounded-card border border-border/80 bg-surface p-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <ProductImage
                                src={prodImage}
                                alt={it.productName}
                                className="h-16 w-16 shrink-0"
                                onZoom={onZoomImage}
                              />
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-xs font-mono text-muted">#{idx + 1}</span>
                                  <h5 className="text-sm font-semibold text-foreground break-words leading-snug">
                                    {it.productName}
                                  </h5>
                                  {it.catalogUnitPrice !== undefined &&
                                    Math.abs(it.catalogUnitPrice - it.unitPrice) > 0.001 && (
                                      <span className="text-[11px] text-primary font-medium">
                                        {t.orders.priceEditedTag}
                                      </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted tabular-nums">
                                  <span>
                                    {t.orders.unitPriceLabel}{' '}
                                    <strong className="text-foreground">
                                      {formatMoney(it.unitPrice, currency)}
                                    </strong>
                                  </span>
                                  <span>
                                    {t.orders.quantityLabel}{' '}
                                    <strong className="text-foreground">× {it.quantity}</strong>
                                  </span>
                                  {!hideWarehouse && it.warehouse && (
                                    <span>
                                      {t.orders.warehouseLabel} {it.warehouse}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold tabular-nums text-primary">
                                {formatMoney(it.unitPrice * it.quantity, currency)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div className="rounded-card border border-primary/25 bg-primary/5 p-3.5 sm:p-4 space-y-1.5 text-xs sm:text-sm tabular-nums">
                    {(reportOrder.discountAmount || 0) > 0 && (
                      <>
                        <div className="flex justify-between gap-2 text-muted">
                          <span>{t.orders.subtotalLabel}</span>
                          <span>
                            {formatMoney(
                              reportOrder.subtotalAmount ??
                                reportOrder.items.reduce(
                                  (sum, it) => sum + it.unitPrice * it.quantity,
                                  0
                                ),
                              currency
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2 text-danger font-medium">
                          <span>
                            {t.orders.discountLabel}
                            {reportOrder.discountType === 'percent' && reportOrder.discountValue
                              ? ` (${reportOrder.discountValue}%)`
                              : ''}
                            :
                          </span>
                          <span>-{formatMoney(reportOrder.discountAmount || 0, currency)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-center gap-2 pt-1 text-sm sm:text-base font-bold text-foreground">
                      <span>{t.orders.totalAmountLabel}</span>
                      <span className="text-primary text-base sm:text-lg">
                        {formatMoney(reportOrder.totalAmount, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="shrink-0 border-t border-border/60 bg-surface px-4 sm:px-6 py-3 pb-safe grid grid-cols-2 sm:flex sm:flex-wrap justify-end gap-2">
                  <Button
                    tone="quiet"
                    onClick={() => handleDownloadInvoicePng(reportOrder)}
                    disabled={downloadingId === reportOrder.id}
                    className="w-full sm:w-auto min-h-10 px-3 text-xs"
                  >
                    <Download className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      {downloadingId === reportOrder.id
                        ? t.orders.downloadingPng
                        : t.orders.invoicePngBtn}
                    </span>
                  </Button>
                  <Button
                    tone="quiet"
                    onClick={() => handleBluetoothPrint(reportOrder)}
                    className="w-full sm:w-auto min-h-10 px-3 text-xs"
                  >
                    <Bluetooth className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">Bluetooth ({bluetoothSize})</span>
                  </Button>
                  <Button
                    tone="quiet"
                    onClick={() => setPrintPreviewOrder({ order: reportOrder, mode: 'standard' })}
                    className="w-full sm:w-auto min-h-10 px-3 text-xs"
                  >
                    <Printer className="h-3.5 w-3.5 shrink-0" /> {t.orders.standardPrintBtn}
                  </Button>
                  {!readOnly && (
                    <Button
                      tone="quiet"
                      onClick={() => {
                        const target = reportOrder;
                        setReportOrder(null);
                        openEditModal(target);
                      }}
                      className="w-full sm:w-auto min-h-10 px-3 text-xs"
                    >
                      <Icon3D name="edit" size={16} /> {t.common.edit}
                    </Button>
                  )}
                  <Button
                    tone="primary"
                    onClick={() => setReportOrder(null)}
                    className="col-span-2 sm:col-span-1 w-full sm:w-auto min-h-10 px-4 text-xs sm:ml-auto"
                  >
                    {t.common.close}
                  </Button>
                </div>
              </Surface>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ANIMATED POP-UP ORDERS FILTER FORM CART */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            key="orders-filter-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t.orders.filtersBtn}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => setFiltersOpen(false)}
            className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-foreground/65 backdrop-blur-[2px] p-0 sm:p-4"
          >
            <motion.div
              key="orders-filter-card"
              initial={{ opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <Surface className="w-full max-h-[90dvh] sm:max-h-[85dvh] flex flex-col rounded-t-2xl sm:rounded-card shadow-float overflow-hidden">
                <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                  <div className="h-1 w-10 rounded-full bg-border" />
                </div>

                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 sm:px-6 py-3.5 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-primary/12 text-primary shrink-0">
                      <SlidersHorizontal className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
                        {t.orders.filtersBtn}
                        {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                      </h3>
                      <p className="text-xs text-muted truncate tabular-nums">
                        {t.orders.allTitlePrefix} ({filteredOrders.length})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    aria-label={t.common.close}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-control border border-border/70 bg-background text-muted hover:text-foreground cursor-pointer shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                    <Field label={t.orders.fromDate}>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className={`${inputClass} min-w-0`}
                      />
                    </Field>
                    <Field label={t.orders.toDate}>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className={`${inputClass} min-w-0`}
                      />
                    </Field>
                    <Field label={t.orders.fromTime}>
                      <input
                        type="time"
                        value={timeFrom}
                        onChange={(e) => setTimeFrom(e.target.value)}
                        className={`${inputClass} min-w-0`}
                      />
                    </Field>
                    <Field label={t.orders.toTime}>
                      <input
                        type="time"
                        value={timeTo}
                        onChange={(e) => setTimeTo(e.target.value)}
                        className={`${inputClass} min-w-0`}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 pt-3 border-t border-border/50">
                    {lockedSaleName ? (
                      <div className="flex items-center min-w-0 rounded-control border border-primary/40 bg-primary/8 px-3 py-2 text-xs font-semibold text-primary truncate">
                        Sale: {lockedSaleName}
                      </div>
                    ) : (
                      <select
                        value={staffFilter}
                        onChange={(e) => setStaffFilter(e.target.value)}
                        className={`${inputClass} min-w-0`}
                      >
                        <option value="ALL">{t.orders.allStaff}</option>
                        {Array.from(
                          new Set([
                            ...(settings.saleProfiles || []).map((sp) => sp.name),
                            ...staff.map((s) => s.name),
                          ])
                        ).map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      value={storeFilter}
                      onChange={(e) => setStoreFilter(e.target.value)}
                      className={`${inputClass} min-w-0`}
                    >
                      <option value="ALL">{t.orders.allStores}</option>
                      {settings.stores.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    <select
                      value={groupFilter}
                      onChange={(e) => setGroupFilter(e.target.value)}
                      className={`${inputClass} min-w-0`}
                    >
                      <option value="ALL">{t.orders.allGroups}</option>
                      {settings.groups.map((gr) => (
                        <option key={gr} value={gr}>
                          {gr}
                        </option>
                      ))}
                    </select>

                    {!hideWarehouse && (
                      <select
                        value={warehouseFilter}
                        onChange={(e) => setWarehouseFilter(e.target.value)}
                        className={`${inputClass} min-w-0`}
                      >
                        <option value="ALL">{t.orders.allWarehouses}</option>
                        {settings.warehouses.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      value={paymentStatusFilter}
                      onChange={(e) =>
                        setPaymentStatusFilter(e.target.value as 'ALL' | 'paid' | 'unpaid')
                      }
                      aria-label={t.orders.allStatuses}
                      className={`${inputClass} min-w-0 ${!hideWarehouse ? 'col-span-2' : ''}`}
                    >
                      <option value="ALL">{t.orders.allStatuses}</option>
                      <option value="paid">{t.common.paid}</option>
                      <option value="unpaid">{t.common.unpaid}</option>
                    </select>
                  </div>
                </div>

                <div className="shrink-0 border-t border-border/60 bg-surface px-4 sm:px-6 py-3 pb-safe flex flex-col-reverse sm:flex-row sm:justify-between gap-2.5">
                  <Button
                    tone="quiet"
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                      setTimeFrom('');
                      setTimeTo('');
                      setStaffFilter('ALL');
                      setStoreFilter('ALL');
                      setGroupFilter('ALL');
                      setWarehouseFilter('ALL');
                      setPaymentStatusFilter('ALL');
                    }}
                    disabled={activeFilterCount === 0}
                    className="w-full sm:w-auto"
                  >
                    {t.orders.clearFilters}
                  </Button>
                  <Button
                    tone="primary"
                    onClick={() => setFiltersOpen(false)}
                    className="w-full sm:w-auto min-w-28"
                  >
                    <Icon3D name="check" size={18} />
                    <span>{t.orders.doneAddingBtn}</span>
                  </Button>
                </div>
              </Surface>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
