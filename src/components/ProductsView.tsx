import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, Camera, CheckCircle2, ChevronDown, GripVertical, PackagePlus, Plus, QrCode, Search, Upload, X } from 'lucide-react';
import { Icon3D } from './Icon3D';
import { BarcodeScannerModal, Button, Field, ProductCameraModal, ProductImage, Surface, inputClass } from './ui';
import {
  formatMoney,
  getCurrencyMeta,
  inputAmountToUsd,
  uploadProductPhotoUrl,
  usdToInputAmount,
} from '../utils/helpers';
import { useI18n } from '../utils/i18nContext';
import type { CurrencyCode, Product, WorkspaceSettings } from '../types';

interface ProductsViewProps {
  products: Product[];
  settings: WorkspaceSettings;
  currency: CurrencyCode;
  hideWarehouse: boolean;
  readOnly?: boolean;
  onSaveProduct: (payload: Partial<Product>) => Promise<boolean>;
  onUpdateProductImage?: (productId: string, imageUrl: string) => Promise<boolean>;
  onDeleteProduct: (id: string) => Promise<boolean>;
  onReorderProducts: (orderedIds: string[]) => Promise<void>;
  onZoomImage: (url: string, title: string) => void;
}

const sanitizeSignedInt = (raw: string): string => {
  const trimmed = raw.replace(/\s+/g, '');
  if (!trimmed) return '';
  const isNegative = trimmed.startsWith('-');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return isNegative ? '-' : '';
  return isNegative ? `-${digits}` : digits;
};

const parseSignedDelta = (raw: string): number => {
  if (!raw || raw === '-') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  settings,
  currency,
  hideWarehouse,
  readOnly = false,
  onSaveProduct,
  onUpdateProductImage,
  onDeleteProduct,
  onReorderProducts,
  onZoomImage,
}) => {
  const { t } = useI18n();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [costPrice, setCostPrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [promotion, setPromotion] = useState('0');
  const [stock, setStock] = useState('10');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState(settings.categories[0] || '');
  const [warehouse, setWarehouse] = useState(settings.warehouses[0] || '');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scannerMode, setScannerMode] = useState<'toolbar' | 'form' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [photoCameraTarget, setPhotoCameraTarget] = useState<
    { mode: 'form' } | { mode: 'item'; product: Product } | null
  >(null);
  const [cameraSaving, setCameraSaving] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [uploadFeedback, setUploadFeedback] = useState('');
  const [feedback, setFeedback] = useState('');

  // Quick inline stock adjust state (auto add or subtract with '-')
  const [quickStockId, setQuickStockId] = useState<string | null>(null);
  const [quickStockInput, setQuickStockInput] = useState('');
  const [quickStockSaving, setQuickStockSaving] = useState(false);

  // Long-press reorder state
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.sortOrder - b.sortOrder),
    [products]
  );
  const [localOrder, setLocalOrder] = useState<Product[]>(sortedProducts);
  const [activeReorderId, setActiveReorderId] = useState<string | null>(null);
  const PRODUCTS_DOM_STEP = 40;
  const [visibleProdCount, setVisibleProdCount] = useState(PRODUCTS_DOM_STEP);
  const longPressTimerRef = useRef<number | null>(null);

  const trimmedSearch = deferredSearch.trim().toLowerCase();
  const isFiltering = trimmedSearch.length > 0;

  const filteredProducts = useMemo(() => {
    if (!trimmedSearch) return localOrder;
    return localOrder.filter(
      (p) =>
        p.name.toLowerCase().includes(trimmedSearch) ||
        (p.barcode || '').toLowerCase().includes(trimmedSearch)
    );
  }, [localOrder, trimmedSearch]);

  const visibleProductsList = useMemo(
    () =>
      activeReorderId || isFiltering
        ? filteredProducts
        : filteredProducts.slice(0, visibleProdCount),
    [activeReorderId, isFiltering, filteredProducts, visibleProdCount]
  );
  const remainingProdCount =
    activeReorderId || isFiltering
      ? 0
      : Math.max(0, filteredProducts.length - visibleProdCount);

  const currencyMeta = getCurrencyMeta(currency);
  const prevCurrencyRef = useRef<CurrencyCode>(currency);

  useEffect(() => {
    setLocalOrder(sortedProducts);
  }, [sortedProducts]);

  useEffect(() => {
    if (readOnly) {
      setFormOpen(false);
      setQuickStockId(null);
      setActiveReorderId(null);
      setPhotoCameraTarget(null);
      setScannerMode((prev) => (prev === 'form' ? null : prev));
    }
  }, [readOnly]);

  useEffect(() => {
    if (!formOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !scannerMode && !photoCameraTarget) {
        setFormOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen, scannerMode, photoCameraTarget]);

  useEffect(() => {
    const prevCurrency = prevCurrencyRef.current;
    if (prevCurrency === currency) return;
    prevCurrencyRef.current = currency;

    if (editingId) {
      const target = products.find((p) => p.id === editingId);
      if (target) {
        setCostPrice(String(usdToInputAmount(target.costPrice, currency)));
        setSellingPrice(String(usdToInputAmount(target.sellingPrice, currency)));
        setPromotion(String(usdToInputAmount(target.promotion || 0, currency)));
        return;
      }
    }

    const convertDraft = (raw: string) => {
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return raw;
      return String(usdToInputAmount(inputAmountToUsd(n, prevCurrency), currency));
    };
    setCostPrice((prev) => convertDraft(prev));
    setSellingPrice((prev) => convertDraft(prev));
    setPromotion((prev) => convertDraft(prev));
  }, [currency, editingId, products]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setImageUrl('');
    setCostPrice('0');
    setSellingPrice('0');
    setPromotion('0');
    setStock('10');
    setBarcode('');
    setCategory(settings.categories[0] || '');
    setWarehouse(settings.warehouses[0] || '');
    setUploadFeedback('');
  };

  const openAddModal = (prefill?: { name?: string; barcode?: string }) => {
    if (readOnly) return;
    resetForm();
    if (prefill?.name) setName(prefill.name);
    if (prefill?.barcode) setBarcode(prefill.barcode.slice(0, 120));
    setFeedback('');
    setFormOpen(true);
  };

  const handleQrBarcodeDetected = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    if (scannerMode === 'form') {
      setBarcode(code.slice(0, 120));
      return;
    }

    const norm = code.toLowerCase();
    const matched =
      products.find((p) => (p.barcode || '').trim().toLowerCase() === norm) ||
      products.find((p) => p.name.trim().toLowerCase() === norm) ||
      products.find((p) => (p.barcode || '').toLowerCase().includes(norm));

    if (matched) {
      setActiveReorderId(null);
      setSearchQuery(matched.barcode?.trim() || matched.name);
      setFeedback(
        t.products.scanFoundMsg.replace('{name}', matched.name).replace('{code}', code)
      );
      return;
    }

    if (!readOnly) {
      resetForm();
      setBarcode(code.slice(0, 120));
      setFormOpen(true);
      setFeedback(t.products.scanNotFoundAddMsg.replace('{code}', code));
    } else {
      setSearchQuery(code);
      setFeedback(t.products.scanNotFoundReadOnlyMsg.replace('{code}', code));
    }
  };

  const closeFormModal = () => {
    setFormOpen(false);
    resetForm();
  };

  const editingProduct = useMemo(
    () => (editingId ? products.find((p) => p.id === editingId) : undefined),
    [editingId, products]
  );
  const currentOldStock = editingProduct?.stock ?? 0;
  const editStockDelta = editingId ? parseSignedDelta(stock) : 0;
  const computedEditNextStock = Math.max(0, currentOldStock + editStockDelta);

  const loadForEdit = (p: Product) => {
    if (readOnly) return;
    setQuickStockId(null);
    setQuickStockInput('');
    setEditingId(p.id);
    setName(p.name);
    setImageUrl(p.imageUrl);
    setCostPrice(String(usdToInputAmount(p.costPrice, currency)));
    setSellingPrice(String(usdToInputAmount(p.sellingPrice, currency)));
    setPromotion(String(usdToInputAmount(p.promotion || 0, currency)));
    setStock('');
    setBarcode(p.barcode);
    setCategory(p.category || settings.categories[0] || '');
    setWarehouse(p.warehouse || settings.warehouses[0] || '');
    setUploadFeedback('');
    setFeedback('');
    setFormOpen(true);
  };

  const toggleQuickStock = (p: Product) => {
    if (readOnly) return;
    if (quickStockId === p.id) {
      setQuickStockId(null);
      setQuickStockInput('');
      return;
    }
    setQuickStockId(p.id);
    setQuickStockInput('');
    setFeedback('');
  };

  const handleQuickStockSave = async (prod: Product) => {
    if (readOnly) return;
    const delta = parseSignedDelta(quickStockInput);
    if (delta === 0 || quickStockSaving) return;
    const nextStock = Math.max(0, prod.stock + delta);
    setQuickStockSaving(true);
    const ok = await onSaveProduct({
      id: prod.id,
      name: prod.name,
      imageUrl: prod.imageUrl,
      costPrice: prod.costPrice,
      sellingPrice: prod.sellingPrice,
      promotion: prod.promotion || 0,
      stock: nextStock,
      barcode: prod.barcode,
      category: prod.category,
      warehouse: prod.warehouse,
    });
    setQuickStockSaving(false);
    if (ok) {
      setFeedback(
        t.products.stockUpdatedMsg
          .replace('{name}', prod.name)
          .replace('{old}', String(prod.stock))
          .replace('{next}', String(nextStock))
      );
      setQuickStockId(null);
      setQuickStockInput('');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setUploadFeedback('');
    try {
      const url = await uploadProductPhotoUrl(file);
      setImageUrl(url);
      setUploadFeedback(t.products.uploadSuccess);
    } catch {
      setUploadFeedback(t.products.photoUploadError);
    } finally {
      setUploading(false);
    }
  };

  const openItemCamera = (prod: Product) => {
    if (readOnly) return;
    setCameraError('');
    setPhotoCameraTarget({ mode: 'item', product: prod });
  };

  const openFormCamera = () => {
    if (readOnly) return;
    setCameraError('');
    setPhotoCameraTarget({ mode: 'form' });
  };

  const handleConfirmCapturedPhoto = async (file: File) => {
    if (!photoCameraTarget || cameraSaving) return;
    setCameraSaving(true);
    setCameraError('');
    try {
      const uploadedUrl = await uploadProductPhotoUrl(file);
      if (photoCameraTarget.mode === 'form') {
        setImageUrl(uploadedUrl);
        setUploadFeedback(t.products.uploadSuccess);
        setPhotoCameraTarget(null);
        return;
      }

      const targetProd = photoCameraTarget.product;
      const saved = onUpdateProductImage
        ? await onUpdateProductImage(targetProd.id, uploadedUrl)
        : await onSaveProduct({
            id: targetProd.id,
            name: targetProd.name,
            imageUrl: uploadedUrl,
            costPrice: targetProd.costPrice,
            sellingPrice: targetProd.sellingPrice,
            promotion: targetProd.promotion || 0,
            stock: targetProd.stock,
            barcode: targetProd.barcode,
            category: targetProd.category,
            warehouse: targetProd.warehouse,
          });

      if (!saved) {
        setCameraError(t.products.photoUploadError);
        return;
      }

      if (editingId === targetProd.id) {
        setImageUrl(uploadedUrl);
      }
      setFeedback(t.products.photoSavedMsg.replace('{name}', targetProd.name));
      setPhotoCameraTarget(null);
    } catch {
      setCameraError(t.products.photoUploadError);
    } finally {
      setCameraSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !name.trim()) return;
    const finalStock = editingId
      ? computedEditNextStock
      : Math.max(0, Math.floor(Number(stock) || 0));

    setSaving(true);
    const ok = await onSaveProduct({
      id: editingId || undefined,
      name: name.trim(),
      imageUrl,
      costPrice: inputAmountToUsd(Math.max(0, Number(costPrice) || 0), currency),
      sellingPrice: inputAmountToUsd(Math.max(0, Number(sellingPrice) || 0), currency),
      promotion: inputAmountToUsd(Math.max(0, Number(promotion) || 0), currency),
      stock: finalStock,
      barcode: barcode.trim(),
      category: category || settings.categories[0] || t.common.general,
      warehouse: warehouse || settings.warehouses[0] || '',
    });
    setSaving(false);
    if (ok) {
      setFeedback(editingId ? t.products.saveSuccessEdit : t.products.saveSuccessAdd);
      resetForm();
      setFormOpen(false);
    }
  };

  // Long press handlers (~350ms hold unlocks reorder mode for drag/move)
  const handlePointerDownCard = (id: string) => {
    if (readOnly) return;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      setActiveReorderId(id);
    }, 350);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const moveItemByIndex = async (index: number, direction: -1 | 1) => {
    if (readOnly) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= localOrder.length) return;
    const next = [...localOrder];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    setLocalOrder(next);
    await onReorderProducts(next.map((p) => p.id));
  };

  const handleDragSwap = async (dragId: string, overId: string) => {
    if (readOnly || dragId === overId) return;
    const fromIdx = localOrder.findIndex((p) => p.id === dragId);
    const toIdx = localOrder.findIndex((p) => p.id === overId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...localOrder];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setLocalOrder(next);
    await onReorderProducts(next.map((p) => p.id));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Product List Card with Trigger Button for Animated Add/Edit Form Cart */}
      <Surface className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Icon3D name="box" size={36} />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                {readOnly ? t.products.listTitleReadOnly : t.products.listTitleEditable}
              </h3>
              {readOnly && (
                <p className="text-xs text-muted leading-snug">
                  {t.products.listSubtitleReadOnly}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              tone="quiet"
              onClick={() => setScannerMode('toolbar')}
              className="w-full sm:w-auto whitespace-nowrap"
              title={t.ui.scannerTitle}
            >
              <QrCode className="h-4 w-4 text-primary shrink-0" />
              <span>{t.products.scanQrBarcodeBtn}</span>
            </Button>
            {!readOnly && activeReorderId && (
              <Button
                tone="quiet"
                onClick={() => setActiveReorderId(null)}
                className="w-full sm:w-auto min-h-11 sm:min-h-10 text-xs whitespace-nowrap"
              >
                {t.products.doneReorderBtn}
              </Button>
            )}
            {!readOnly && (
              <Button
                tone="primary"
                onClick={() => openAddModal()}
                className="w-full sm:w-auto whitespace-nowrap"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>{t.products.addNewBtn}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search by Product Name / Barcode + Live Result Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.products.searchPlaceholder}
              aria-label={t.products.searchPlaceholder}
              className={`${inputClass} pl-10 ${searchQuery ? 'pr-10' : ''}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t.products.clearSearchBtn}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-control text-muted hover:text-foreground hover:bg-background cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {localOrder.length > 0 && (
            <span className="text-xs font-medium text-muted tabular-nums shrink-0 sm:px-1">
              {t.products.searchCountLabel
                .replace('{shown}', String(filteredProducts.length))
                .replace('{total}', String(localOrder.length))}
            </span>
          )}
        </div>

        {feedback && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-control border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-xs font-medium text-foreground"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{feedback}</span>
            </span>
            <button
              type="button"
              onClick={() => setFeedback('')}
              aria-label={t.common.close}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:text-foreground cursor-pointer shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="space-y-3">
          {localOrder.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-muted">
                {readOnly
                  ? t.products.emptyReadOnly
                  : t.products.emptyEditable}
              </p>
              {!readOnly && (
                <Button tone="primary" onClick={() => openAddModal()} className="whitespace-nowrap">
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>{t.products.addNewBtn}</span>
                </Button>
              )}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-muted">
                {t.products.noSearchResults.replace('{query}', searchQuery.trim())}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  tone="quiet"
                  onClick={() => setSearchQuery('')}
                  className="whitespace-nowrap"
                >
                  <X className="h-4 w-4 shrink-0" />
                  <span>{t.products.clearSearchBtn}</span>
                </Button>
                {!readOnly && (
                  <Button
                    tone="primary"
                    onClick={() => openAddModal({ name: searchQuery.trim() })}
                    className="whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>
                      {t.products.addMatchingProductBtn.replace('{query}', searchQuery.trim())}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          ) : null}
          {visibleProductsList.map((prod) => {
            const orderIdx = localOrder.findIndex((item) => item.id === prod.id);
            const idx = orderIdx >= 0 ? orderIdx : 0;
            const isReordering = !readOnly && !isFiltering && activeReorderId === prod.id;
            const effective = Math.max(0, prod.sellingPrice - (prod.promotion || 0));

            return (
              <motion.div
                key={prod.id}
                layout={localOrder.length <= 30 && !isFiltering}
                draggable={!readOnly && !isFiltering && Boolean(activeReorderId)}
                onDragStart={(e) => {
                  if (readOnly || isFiltering) return;
                  (e as unknown as React.DragEvent).dataTransfer?.setData('text/plain', prod.id);
                }}
                onDragOver={(e) => {
                  if (readOnly || isFiltering) return;
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  if (readOnly || isFiltering) return;
                  e.preventDefault();
                  const dragId =
                    (e as unknown as React.DragEvent).dataTransfer?.getData('text/plain') ||
                    activeReorderId;
                  if (dragId) {
                    handleDragSwap(dragId, prod.id);
                  }
                }}
                onPointerDown={() => {
                  if (!readOnly && !isFiltering) handlePointerDownCard(prod.id);
                }}
                onPointerUp={clearLongPressTimer}
                onPointerLeave={clearLongPressTimer}
                className={`rounded-card border p-4 transition-colors ${
                  isReordering
                    ? 'border-primary bg-primary/8 shadow-float cursor-grabbing'
                    : 'border-border/80 bg-surface'
                }`}
              >
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 xl:gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    {!readOnly && (
                      <div
                        className="text-muted cursor-grab shrink-0 pt-2 sm:pt-0"
                        title={t.products.dragHint}
                      >
                        <GripVertical className="h-5 w-5" />
                      </div>
                    )}

                    <ProductImage
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="h-20 w-20 shrink-0"
                      onZoom={onZoomImage}
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-muted">#{idx + 1}</span>
                        <h4 className="font-semibold text-sm text-foreground break-words leading-snug">{prod.name}</h4>
                      </div>
                      <p className="text-xs text-muted break-words leading-relaxed">
                        {t.products.categoryPrefix} {prod.category}
                        {!hideWarehouse && prod.warehouse ? ` · ${t.products.warehousePrefix} ${prod.warehouse}` : ''}
                        {prod.barcode ? ` · ${t.products.barcodePrefix} ${prod.barcode}` : ''}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
                        {!readOnly && (
                          <span>
                            {t.products.costPrefix} <strong>{formatMoney(prod.costPrice, currency)}</strong>
                          </span>
                        )}
                        <span>
                          {t.products.sellPrefix} <strong className="text-primary">{formatMoney(effective, currency)}</strong>
                        </span>
                        {prod.promotion > 0 && (
                          <span className="text-accent">
                            {t.products.promoPrefix} -{formatMoney(prod.promotion, currency)}
                          </span>
                        )}
                        <span className={prod.stock <= 10 ? 'text-danger font-bold' : 'text-foreground'}>
                          {t.products.stockPrefix} {prod.stock}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!readOnly && (
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        clearLongPressTimer();
                      }}
                      className="grid grid-cols-2 sm:flex sm:flex-wrap xl:flex-nowrap items-center gap-2 shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-border/40"
                    >
                      <Button
                        tone="quiet"
                        onClick={() => moveItemByIndex(idx, -1)}
                        disabled={idx === 0 || isFiltering}
                        className="min-h-11 sm:min-h-9 px-2.5 text-xs whitespace-nowrap"
                        title={t.products.moveUp}
                        aria-label={t.products.moveUp}
                      >
                        <ArrowUp className="h-4 w-4 shrink-0" /> <span className="sm:hidden">{t.products.moveUp}</span>
                      </Button>
                      <Button
                        tone="quiet"
                        onClick={() => moveItemByIndex(idx, 1)}
                        disabled={idx === localOrder.length - 1 || isFiltering}
                        className="min-h-11 sm:min-h-9 px-2.5 text-xs whitespace-nowrap"
                        title={t.products.moveDown}
                        aria-label={t.products.moveDown}
                      >
                        <ArrowDown className="h-4 w-4 shrink-0" /> <span className="sm:hidden">{t.products.moveDown}</span>
                      </Button>
                      <Button
                        tone="quiet"
                        onClick={() => openItemCamera(prod)}
                        className="min-h-11 sm:min-h-9 px-3 text-xs whitespace-nowrap"
                        title={t.ui.cameraPhotoTitle}
                      >
                        <Camera className="h-4 w-4 text-primary shrink-0" />
                        <span>{t.products.capturePhotoBtn}</span>
                      </Button>
                      <Button
                        tone={quickStockId === prod.id ? 'primary' : 'quiet'}
                        onClick={() => toggleQuickStock(prod)}
                        className="min-h-11 sm:min-h-9 px-3 text-xs whitespace-nowrap"
                      >
                        <PackagePlus className={`h-4 w-4 shrink-0 ${quickStockId === prod.id ? '' : 'text-primary'}`} />
                        <span>{t.products.adjustStockBtn}</span>
                      </Button>
                      <Button
                        tone="quiet"
                        onClick={() => loadForEdit(prod)}
                        className="min-h-11 sm:min-h-9 px-3 text-xs whitespace-nowrap"
                      >
                        <Icon3D name="edit" size={16} /> <span>{t.common.edit}</span>
                      </Button>
                      <Button
                        tone="danger"
                        onClick={() => onDeleteProduct(prod.id)}
                        className="min-h-11 sm:min-h-9 px-3 text-xs whitespace-nowrap"
                      >
                        <Icon3D name="trash" size={16} /> <span>{t.common.delete}</span>
                      </Button>
                    </div>
                  )}
                </div>

                {!readOnly && quickStockId === prod.id && (
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      clearLongPressTimer();
                    }}
                    className="mt-3 pt-3 border-t border-border/60 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5"
                  >
                    {(() => {
                      const delta = parseSignedDelta(quickStockInput);
                      const nextStock = Math.max(0, prod.stock + delta);
                      return (
                        <>
                          <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
                            <span className="text-muted">
                              {t.products.oldStockLabel} <strong className="text-foreground">{prod.stock}</strong>
                            </span>
                            {delta !== 0 && (
                              <>
                                <span className={delta > 0 ? 'font-semibold text-primary' : 'font-semibold text-danger'}>
                                  ({delta > 0 ? `+${delta}` : delta})
                                </span>
                                <span className="text-muted">→</span>
                                <span className="text-muted">
                                  {t.products.newStockLabel}{' '}
                                  <strong className={delta > 0 ? 'text-primary' : 'text-danger'}>
                                    {nextStock}
                                  </strong>
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                              type="text"
                              autoFocus
                              value={quickStockInput}
                              onChange={(e) => setQuickStockInput(sanitizeSignedInt(e.target.value))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleQuickStockSave(prod);
                                } else if (e.key === 'Escape') {
                                  setQuickStockId(null);
                                  setQuickStockInput('');
                                }
                              }}
                              placeholder={t.products.placeholderStockAdjust}
                              className={`${inputClass} min-h-10 sm:w-44 tabular-nums`}
                            />
                            <Button
                              tone="primary"
                              onClick={() => handleQuickStockSave(prod)}
                              disabled={quickStockSaving || delta === 0}
                              className="min-h-10 px-3 text-xs shrink-0 whitespace-nowrap"
                            >
                              {quickStockSaving ? t.common.saving : t.common.save}
                            </Button>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickStockId(null);
                                setQuickStockInput('');
                              }}
                              aria-label={t.common.close}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border/70 bg-background text-muted hover:text-foreground cursor-pointer shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            );
          })}
          {remainingProdCount > 0 && (
            <div className="pt-2 flex justify-center">
              <Button
                tone="quiet"
                onClick={() => setVisibleProdCount((prev) => prev + PRODUCTS_DOM_STEP)}
                className="w-full sm:w-auto min-h-10 px-4 text-xs"
              >
                <ChevronDown className="h-4 w-4 shrink-0" />
                <span>
                  {t.products.showMoreProductsBtn.replace(
                    '{remaining}',
                    String(remainingProdCount)
                  )}
                </span>
              </Button>
            </div>
          )}
        </div>
      </Surface>

      {/* 2. Animated Pop-Up Modal for Add / Edit Product Form Cart */}
      <AnimatePresence>
        {!readOnly && formOpen && (
          <motion.div
            key="product-form-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? t.products.editTitle : t.products.addTitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={closeFormModal}
            className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-foreground/60 backdrop-blur-[2px] p-0 sm:p-4"
          >
            <motion.div
              key="product-form-card"
              initial={{ opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl"
            >
              <Surface className="w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-t-2xl sm:rounded-card shadow-float overflow-hidden">
                <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                  <div className="h-1 w-10 rounded-full bg-border" />
                </div>

                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon3D name="products" size={36} />
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                        {editingId ? t.products.editTitle : t.products.addTitle}
                      </h2>
                      <p className="text-xs text-muted leading-snug line-clamp-1">
                        {t.products.subtitle}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeFormModal}
                    aria-label={t.common.close}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-control border border-border/70 bg-background text-muted hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 pb-safe"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label={t.products.fieldName}>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t.products.placeholderName}
                        className={inputClass}
                      />
                    </Field>

                    <Field label={`${t.products.fieldCostPrice} (${currencyMeta.inputLabel})`}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                          {currencyMeta.symbol}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step={currencyMeta.step}
                          required
                          value={costPrice}
                          onChange={(e) => setCostPrice(e.target.value)}
                          className={`${inputClass} pl-8 tabular-nums`}
                        />
                      </div>
                    </Field>

                    <Field label={`${t.products.fieldSellingPrice} (${currencyMeta.inputLabel})`}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                          {currencyMeta.symbol}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step={currencyMeta.step}
                          required
                          value={sellingPrice}
                          onChange={(e) => setSellingPrice(e.target.value)}
                          className={`${inputClass} pl-8 tabular-nums`}
                        />
                      </div>
                    </Field>

                    <Field label={`${t.products.fieldPromotion} (${currencyMeta.inputLabel})`}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                          {currencyMeta.symbol}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step={currencyMeta.step}
                          value={promotion}
                          onChange={(e) => setPromotion(e.target.value)}
                          className={`${inputClass} pl-8 tabular-nums`}
                        />
                      </div>
                    </Field>

                    <Field label={editingId ? t.products.fieldStockAdjust : t.products.fieldStock}>
                      {editingId ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={stock}
                            onChange={(e) => setStock(sanitizeSignedInt(e.target.value))}
                            placeholder={t.products.placeholderStockAdjust}
                            className={`${inputClass} tabular-nums`}
                          />
                          <p className="text-[11px] tabular-nums leading-snug text-muted">
                            {t.products.oldStockLabel} <strong className="text-foreground">{currentOldStock}</strong>
                            {editStockDelta !== 0 && (
                              <>
                                {' '}
                                <span className={editStockDelta > 0 ? 'font-semibold text-primary' : 'font-semibold text-danger'}>
                                  {editStockDelta > 0 ? `+ ${editStockDelta}` : `- ${Math.abs(editStockDelta)}`}
                                </span>{' '}
                                → {t.products.newStockLabel}{' '}
                                <strong className={editStockDelta > 0 ? 'text-primary' : 'text-danger'}>
                                  {computedEditNextStock}
                                </strong>
                              </>
                            )}
                          </p>
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={stock}
                          onChange={(e) => setStock(e.target.value)}
                          className={`${inputClass} tabular-nums`}
                        />
                      )}
                    </Field>

                    <Field label={t.products.fieldBarcode}>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          placeholder={t.products.placeholderBarcode}
                          className={`${inputClass} font-mono flex-1`}
                        />
                        <Button
                          tone="quiet"
                          onClick={() => setScannerMode('form')}
                          title={t.products.scanCameraTitle}
                          className="px-3 shrink-0"
                        >
                          <QrCode className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                    </Field>

                    <Field label={t.products.fieldCategory}>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={inputClass}
                      >
                        {settings.categories.length === 0 ? (
                          <option value="">{t.products.generalOption}</option>
                        ) : (
                          settings.categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))
                        )}
                      </select>
                    </Field>

                    {!hideWarehouse && (
                      <Field label={t.products.fieldWarehouse}>
                        <select
                          value={warehouse}
                          onChange={(e) => setWarehouse(e.target.value)}
                          className={inputClass}
                        >
                          {settings.warehouses.length === 0 ? (
                            <option value="">{t.products.noWarehouseOption}</option>
                          ) : (
                            settings.warehouses.map((w) => (
                              <option key={w} value={w}>
                                {w}
                              </option>
                            ))
                          )}
                        </select>
                      </Field>
                    )}

                    <Field label={t.products.fieldUploadPhoto}>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed border-primary/50 bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-primary/5 transition-colors">
                          <Upload className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">
                            {uploading ? t.products.uploadingUrl : t.products.choosePhotoBtn}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <Button
                          tone="quiet"
                          onClick={openFormCamera}
                          disabled={uploading || saving}
                          title={t.ui.cameraPhotoTitle}
                          className="min-h-11 px-3 shrink-0 text-xs whitespace-nowrap"
                        >
                          <Camera className="h-4 w-4 text-primary shrink-0" />
                          <span>{t.products.capturePhotoBtn}</span>
                        </Button>
                        {imageUrl && (
                          <ProductImage
                            src={imageUrl}
                            alt={name || 'Preview'}
                            className="h-11 w-11 shrink-0"
                            onZoom={onZoomImage}
                          />
                        )}
                      </div>
                    </Field>
                  </div>

                  {uploadFeedback && (
                    <p
                      role="status"
                      className={`text-xs font-medium ${
                        uploadFeedback === t.products.uploadFailed ||
                        uploadFeedback === t.products.photoUploadError
                          ? 'text-danger'
                          : 'text-primary'
                      }`}
                    >
                      {uploadFeedback}
                    </p>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-border/50 pt-4">
                    <Button
                      tone="quiet"
                      onClick={closeFormModal}
                      className="w-full sm:w-auto whitespace-nowrap"
                    >
                      {editingId ? t.products.cancelEditBtn : t.common.cancel}
                    </Button>
                    <Button
                      type="submit"
                      tone="primary"
                      disabled={saving || uploading}
                      className="w-full sm:w-auto whitespace-nowrap"
                    >
                      <Icon3D name="check" size={20} />
                      <span>
                        {saving
                          ? t.common.saving
                          : editingId
                          ? t.products.saveChangesBtn
                          : t.products.saveProductBtn}
                      </span>
                    </Button>
                  </div>
                </form>
              </Surface>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BarcodeScannerModal
        open={Boolean(scannerMode)}
        onClose={() => setScannerMode(null)}
        onDetected={handleQrBarcodeDetected}
      />

      {!readOnly && (
        <ProductCameraModal
          open={Boolean(photoCameraTarget)}
          productName={
            photoCameraTarget?.mode === 'item'
              ? photoCameraTarget.product.name
              : name.trim() || (editingId ? t.products.editTitle : t.products.addTitle)
          }
          saving={cameraSaving}
          errorMessage={cameraError}
          onClose={() => {
            if (!cameraSaving) {
              setPhotoCameraTarget(null);
              setCameraError('');
            }
          }}
          onConfirmPhoto={handleConfirmCapturedPhoto}
        />
      )}
    </div>
  );
};
