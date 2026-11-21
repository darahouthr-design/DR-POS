import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Trash2, Upload, CheckCircle2, X, ChevronDown, Loader2, Clock3 } from 'lucide-react';
import { Icon3D } from './Icon3D';
import { Button, Field, ProductImage, Surface, inputClass } from './ui';
import { DatabaseProgressBar } from './DatabaseProgressBar';
import {
  formatMoney,
  getCurrencyMeta,
  inputAmountToUsd,
  normalizePhone,
  todayLocalISO,
  uploadImageToCloudinary,
  usdToInputAmount,
} from '../utils/helpers';
import { useI18n } from '../utils/i18nContext';
import type {
  CurrencyCode,
  Order,
  PriceRecordItem,
  PriceTier,
  ProblemCustomer,
  Product,
  StaffMember,
  StockLogEntry,
} from '../types';

/* =========================================================
   2. TRACK STAFF VIEW
   ========================================================= */
export const TrackStaffView: React.FC<{
  orders: Order[];
  staff: StaffMember[];
  currency: CurrencyCode;
}> = ({ orders, staff, currency }) => {
  const { t } = useI18n();
  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('day');
  const [targetDate, setTargetDate] = useState(todayLocalISO());
  const [selectedStaff, setSelectedStaff] = useState('ALL');
  const [visibleDetailsCount, setVisibleDetailsCount] = useState(60);

  useEffect(() => {
    setVisibleDetailsCount(60);
  }, [period, targetDate, selectedStaff]);

  const filteredOrders = useMemo(() => {
    const [yyyy, mm] = targetDate.split('-');
    return orders.filter((o) => {
      if (selectedStaff !== 'ALL' && o.staffName !== selectedStaff) return false;
      if (period === 'day') return o.date === targetDate;
      if (period === 'month') return o.date.startsWith(`${yyyy}-${mm}`);
      return o.date.startsWith(`${yyyy}-`);
    });
  }, [orders, period, targetDate, selectedStaff]);

  const visibleDetails = useMemo(
    () => filteredOrders.slice(0, visibleDetailsCount),
    [filteredOrders, visibleDetailsCount]
  );
  const remainingDetails = Math.max(0, filteredOrders.length - visibleDetailsCount);

  const staffTotals = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>();
    for (const st of staff) {
      map.set(st.name, { name: st.name, count: 0, total: 0 });
    }
    for (const o of filteredOrders) {
      const cur = map.get(o.staffName) || { name: o.staffName, count: 0, total: 0 };
      cur.count += 1;
      cur.total += o.totalAmount;
      map.set(o.staffName, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [staff, filteredOrders]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <Surface className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Icon3D name="track-staff" size={36} />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                {t.trackStaff.title}
              </h2>
              <p className="text-xs text-muted leading-snug">
                {t.trackStaff.subtitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:flex gap-2">
            {(['day', 'month', 'year'] as const).map((p) => (
              <Button
                key={p}
                tone={period === p ? 'primary' : 'quiet'}
                onClick={() => setPeriod(p)}
                className="min-h-11 sm:min-h-9 px-2.5 sm:px-3 text-xs"
              >
                {p === 'day' ? t.trackStaff.daily : p === 'month' ? t.trackStaff.monthly : t.trackStaff.yearly}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t.trackStaff.targetDateLabel}>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label={t.trackStaff.selectStaffLabel}>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">{t.trackStaff.allStaffOpt}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Summary per staff */}
        {staffTotals.length === 0 ? (
          <div className="border-t border-border/50 pt-4 text-center text-xs sm:text-sm text-muted">
            {t.trackStaff.emptySummary}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/50 pt-4">
            {staffTotals.map((st) => (
              <div key={st.name} className="rounded-control border border-border/70 p-3.5">
                <div className="flex items-center gap-2.5">
                  <Icon3D name="user" size={28} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{st.name}</p>
                    <p className="text-xs text-muted">{st.count} {t.trackStaff.ordersCountSuffix}</p>
                  </div>
                </div>
                <p className="mt-2 text-lg font-bold tabular-nums text-primary">
                  {formatMoney(st.total, currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Surface>

      {/* Detailed Sales Records */}
      <Surface className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold border-b border-border/50 pb-3 leading-snug">
          {t.trackStaff.detailsTitlePrefix}
        </h3>

        {filteredOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            {t.trackStaff.emptyDetails}
          </p>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-border/50 mt-2">
              {visibleDetails.map((ord) => (
                <div key={ord.id} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{ord.customerName}</span>
                    <span className="text-sm font-bold tabular-nums text-primary shrink-0">
                      {formatMoney(ord.totalAmount, currency)}
                    </span>
                  </div>
                  <p className="text-xs text-muted line-clamp-2">
                    {ord.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted tabular-nums">
                    <span className="font-medium text-foreground/80">{ord.staffName}</span>
                    <span>{ord.date} · {ord.time}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto mt-3">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted">
                    <th className="py-2.5 pr-3">{t.trackStaff.colSaleDate}</th>
                    <th className="py-2.5 px-3">{t.trackStaff.colStaff}</th>
                    <th className="py-2.5 px-3">{t.trackStaff.colCustomer}</th>
                    <th className="py-2.5 px-3">{t.trackStaff.colItems}</th>
                    <th className="py-2.5 pl-3 text-right">{t.trackStaff.colPrice}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {visibleDetails.map((ord) => (
                    <tr key={ord.id}>
                      <td className="py-3 pr-3 whitespace-nowrap tabular-nums text-muted">
                        {ord.date} · {ord.time}
                      </td>
                      <td className="py-3 px-3 font-medium">{ord.staffName}</td>
                      <td className="py-3 px-3">{ord.customerName}</td>
                      <td className="py-3 px-3 text-muted">
                        {ord.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                      </td>
                      <td className="py-3 pl-3 text-right font-semibold tabular-nums text-primary whitespace-nowrap">
                        {formatMoney(ord.totalAmount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {remainingDetails > 0 && (
              <div className="pt-4 flex justify-center border-t border-border/40 mt-3">
                <Button
                  tone="quiet"
                  onClick={() => setVisibleDetailsCount((prev) => prev + 60)}
                  className="w-full sm:w-auto min-h-10 px-4 text-xs"
                >
                  <ChevronDown className="h-4 w-4 shrink-0" />
                  <span>
                    {t.orders.showMoreScreenBtn.replace('{remaining}', String(remainingDetails))}
                  </span>
                </Button>
              </div>
            )}
          </>
        )}
      </Surface>
    </div>
  );
};

/* =========================================================
   ANALYTICS VIEW (Revenue, Profit, Top Staff, Top Products)
   ========================================================= */
export const AnalyticsView: React.FC<{
  orders: Order[];
  currency: CurrencyCode;
}> = ({ orders, currency }) => {
  const { t } = useI18n();
  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
    const totalCost = orders.reduce((s, o) => s + o.totalCost, 0);
    const netProfit = totalRevenue - totalCost;
    const paidTotal = orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((s, o) => s + o.totalAmount, 0);
    const unpaidTotal = orders
      .filter((o) => o.paymentStatus === 'unpaid')
      .reduce((s, o) => s + o.totalAmount, 0);

    const byStaff = new Map<string, { name: string; revenue: number; profit: number; orders: number }>();
    const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();

    for (const o of orders) {
      const st = byStaff.get(o.staffName) || { name: o.staffName, revenue: 0, profit: 0, orders: 0 };
      st.revenue += o.totalAmount;
      st.profit += o.totalAmount - o.totalCost;
      st.orders += 1;
      byStaff.set(o.staffName, st);

      for (const it of o.items) {
        const pr = byProduct.get(it.productName) || { name: it.productName, qty: 0, revenue: 0 };
        pr.qty += it.quantity;
        pr.revenue += it.unitPrice * it.quantity;
        byProduct.set(it.productName, pr);
      }
    }

    return {
      totalRevenue,
      totalCost,
      netProfit,
      paidTotal,
      unpaidTotal,
      topStaff: Array.from(byStaff.values()).sort((a, b) => b.revenue - a.revenue),
      topProducts: Array.from(byProduct.values()).sort((a, b) => b.qty - a.qty),
    };
  }, [orders]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <Surface className="p-4 sm:p-6">
        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
          <Icon3D name="analytics" size={36} />
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-foreground">
              {t.analytics.title}
            </h2>
            <p className="text-xs text-muted leading-snug">{t.analytics.subtitle}</p>
          </div>
        </div>

        <div className="mt-4 sm:mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-0 lg:divide-x lg:divide-border/50">
          <div className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pr-4">
            <p className="text-[11px] sm:text-xs text-muted">{t.analytics.totalRevenue}</p>
            <p className="text-lg sm:text-2xl font-bold tabular-nums text-foreground mt-1 truncate">
              {formatMoney(stats.totalRevenue, currency)}
            </p>
          </div>
          <div className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:px-4">
            <p className="text-[11px] sm:text-xs text-muted">{t.analytics.netProfit}</p>
            <p className="text-lg sm:text-2xl font-bold tabular-nums text-primary mt-1 truncate">
              {formatMoney(stats.netProfit, currency)}
            </p>
          </div>
          <div className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:px-4">
            <p className="text-[11px] sm:text-xs text-muted">{t.analytics.paidAmount}</p>
            <p className="text-lg sm:text-2xl font-bold tabular-nums text-foreground mt-1 truncate">
              {formatMoney(stats.paidTotal, currency)}
            </p>
          </div>
          <div className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pl-4">
            <p className="text-[11px] sm:text-xs text-muted">{t.analytics.unpaidAmount}</p>
            <p className="text-lg sm:text-2xl font-bold tabular-nums text-danger mt-1 truncate">
              {formatMoney(stats.unpaidTotal, currency)}
            </p>
          </div>
        </div>
      </Surface>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Surface className="p-4 sm:p-6">
          <div className="flex items-center gap-2.5 border-b border-border/50 pb-3">
            <Icon3D name="track-staff" size={32} />
            <h3 className="text-sm font-semibold">{t.analytics.topStaffTitle}</h3>
          </div>
          <div className="divide-y divide-border/40 mt-2">
            {stats.topStaff.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">{t.analytics.noStaffData}</p>
            ) : (
              stats.topStaff.map((s, idx) => (
                <div key={s.name} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs text-muted mr-2">#{idx + 1}</span>
                    <strong className="text-foreground break-words">{s.name}</strong>
                    <span className="ml-1.5 text-xs text-muted whitespace-nowrap">({s.orders} {t.analytics.invoicesSuffix})</span>
                  </div>
                  <div className="text-right tabular-nums shrink-0">
                    <div className="font-bold text-primary">{formatMoney(s.revenue, currency)}</div>
                    <div className="text-xs text-muted">{t.analytics.profitPrefix} {formatMoney(s.profit, currency)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Surface>

        <Surface className="p-4 sm:p-6">
          <div className="flex items-center gap-2.5 border-b border-border/50 pb-3">
            <Icon3D name="products" size={32} />
            <h3 className="text-sm font-semibold">{t.analytics.bestProductsTitle}</h3>
          </div>
          <div className="divide-y divide-border/40 mt-2">
            {stats.topProducts.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">{t.analytics.noProductData}</p>
            ) : (
              stats.topProducts.map((p, idx) => (
                <div key={p.name} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs text-muted mr-2">#{idx + 1}</span>
                    <strong className="text-foreground break-words">{p.name}</strong>
                  </div>
                  <div className="text-right tabular-nums shrink-0">
                    <div className="font-bold text-foreground">{t.analytics.soldPrefix} {p.qty} {t.analytics.unitsSuffix}</div>
                    <div className="text-xs text-primary">{formatMoney(p.revenue, currency)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
};

/* =========================================================
   3. PROBLEM CUSTOMERS VIEW (GLOBAL SYNC ACROSS ALL GMAILS)
   ========================================================= */
export const ProblemCustomersView: React.FC<{
  problemCustomers: ProblemCustomer[];
  orders: Order[];
  readOnly?: boolean;
  onAddProblemCustomer: (payload: {
    name: string;
    phone: string;
    note: string;
    sourceOrderId?: string;
  }) => Promise<boolean>;
  onDeleteProblemCustomer: (id: string) => Promise<boolean>;
}> = ({
  problemCustomers,
  orders,
  readOnly = false,
  onAddProblemCustomer,
  onDeleteProblemCustomer,
}) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!formOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFormOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen]);

  const openFormModal = () => {
    setFeedback('');
    setFormOpen(true);
  };

  const closeFormModal = () => {
    setFormOpen(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qNorm = normalizePhone(search);
    if (!q) return problemCustomers;
    return problemCustomers.filter((c) => {
      const byName = c.name.toLowerCase().includes(q);
      const byRawPhone = c.phone.toLowerCase().includes(q);
      const byNormPhone = qNorm.length > 0 && c.normalizedPhone.includes(qNorm);
      return byName || byRawPhone || byNormPhone;
    });
  }, [problemCustomers, search]);

  const handlePickFromOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    const found = orders.find((o) => o.id === orderId);
    if (found) {
      setName(found.customerName);
      setPhone(found.customerPhone);
      if (!note) setNote(`${t.problemCustomers.recordedFromOrderPrefix} ${found.orderNumber}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);
    const ok = await onAddProblemCustomer({
      name: name.trim(),
      phone: phone.trim(),
      note: note.trim(),
      sourceOrderId: selectedOrderId || undefined,
    });
    setBusy(false);
    if (ok) {
      setName('');
      setPhone('');
      setNote('');
      setSelectedOrderId('');
      setFormOpen(false);
      setFeedback(t.problemCustomers.saveSuccess);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Bar with Trigger Button for Add Problem Customer Form Cart */}
      <Surface className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Icon3D name="problem-customers" size={36} />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                {t.problemCustomers.title}
              </h2>
              <p className="text-xs text-muted leading-snug">
                {t.problemCustomers.subtitle}
              </p>
            </div>
          </div>

          {!readOnly && (
            <Button
              tone="danger"
              onClick={openFormModal}
              className="w-full sm:w-auto shrink-0 whitespace-nowrap"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t.problemCustomers.addNewBtn}</span>
            </Button>
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
      </Surface>

      {/* Search & List */}
      <Surface className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">
            {t.problemCustomers.listTitle} ({filtered.length})
          </h3>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.problemCustomers.searchPlaceholder}
            className={`${inputClass} sm:max-w-xs`}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{t.problemCustomers.emptyList}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-card border border-danger/35 bg-surface p-3.5 sm:p-4 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Icon3D name="problem-customers" size={32} />
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-sm text-foreground">{item.name}</p>
                    <p className="text-xs font-mono font-semibold text-danger">{item.phone}</p>
                    <p className="text-xs text-muted leading-snug">{item.note || t.problemCustomers.noNote}</p>
                  </div>
                </div>
                {!readOnly && (
                  <Button
                    tone="quiet"
                    onClick={() => onDeleteProblemCustomer(item.id)}
                    className="min-h-11 sm:min-h-9 px-3 text-danger shrink-0"
                    title={t.common.delete}
                    aria-label={t.common.delete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </Surface>

      {/* Standard Animated Pop-Up Modal for Add Problem Customer Form Cart */}
      <AnimatePresence>
        {!readOnly && formOpen && (
          <motion.div
            key="problem-customer-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t.problemCustomers.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={closeFormModal}
            className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-foreground/60 backdrop-blur-[2px] p-0 sm:p-4"
          >
            <motion.div
              key="problem-customer-card"
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

                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon3D name="problem-customers" size={36} />
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                        {t.problemCustomers.title}
                      </h2>
                      <p className="text-xs text-muted leading-snug line-clamp-1">
                        {t.problemCustomers.subtitle}
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
                  {orders.length > 0 && (
                    <Field
                      label={t.problemCustomers.pickFromOrderLabel}
                      hint={t.problemCustomers.pickFromOrderHint}
                    >
                      <select
                        value={selectedOrderId}
                        onChange={(e) => handlePickFromOrder(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">{t.problemCustomers.pickFromOrderPlaceholder}</option>
                        {orders
                          .filter((o) => Boolean(o.customerPhone))
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.customerName} — {o.customerPhone} ({o.orderNumber})
                            </option>
                          ))}
                      </select>
                    </Field>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label={t.problemCustomers.fieldName}>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t.problemCustomers.placeholderName}
                        className={inputClass}
                      />
                    </Field>
                    <Field label={t.problemCustomers.fieldPhone}>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t.problemCustomers.placeholderPhone}
                        className={inputClass}
                      />
                    </Field>
                    <Field label={t.problemCustomers.fieldNote}>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t.problemCustomers.placeholderNote}
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-border/50 pt-4">
                    <Button
                      tone="quiet"
                      onClick={closeFormModal}
                      className="w-full sm:w-auto"
                    >
                      {t.common.cancel}
                    </Button>
                    <Button
                      type="submit"
                      tone="danger"
                      disabled={readOnly || busy}
                      className="w-full sm:w-auto"
                    >
                      <Icon3D name="plus" size={20} /> {t.problemCustomers.saveBtn}
                    </Button>
                  </div>
                </form>
              </Surface>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* =========================================================
   7. DUE PAYMENTS VIEW
   ========================================================= */
export const DuePaymentsView: React.FC<{
  orders: Order[];
  currency: CurrencyCode;
  readOnly?: boolean;
  onUpdateOrder: (id: string, payload: Partial<Order>) => Promise<boolean>;
}> = ({ orders, currency, readOnly = false, onUpdateOrder }) => {
  const { t } = useI18n();
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [nextDueDate, setNextDueDate] = useState('');
  const [busy, setBusy] = useState(false);

  const dueOrders = useMemo(
    () =>
      orders
        .filter((o) => o.paymentStatus === 'unpaid' || Boolean(o.dueDate))
        .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')),
    [orders]
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <Surface className="p-4 sm:p-6">
        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
          <Icon3D name="due-payments" size={36} />
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-foreground">
              {t.duePayments.title}
            </h2>
            <p className="text-xs text-muted leading-snug">
              {t.duePayments.subtitle}
            </p>
          </div>
        </div>

        {dueOrders.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            {t.duePayments.emptyList}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {dueOrders.map((ord) => (
              <Surface key={ord.id} className="p-4 space-y-3 border border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon3D name="calendar" size={32} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{ord.customerName}</p>
                      <p className="text-xs text-muted tabular-nums truncate">
                        {ord.customerPhone || '-'} · {ord.orderNumber}
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-bold tabular-nums text-danger shrink-0">
                    {formatMoney(ord.totalAmount, currency)}
                  </span>
                </div>

                <div className="text-xs space-y-1 border-t border-border/40 pt-2.5">
                  <p>
                    <span className="text-muted">{t.duePayments.dueDatePrefix} </span>
                    <strong className="text-accent tabular-nums">
                      {ord.dueDate || t.duePayments.unscheduledDate}
                    </strong>
                  </p>
                  <p>
                    <span className="text-muted">{t.duePayments.staffPrefix} </span>
                    <span>{ord.staffName}</span> · <span className="text-muted">{t.duePayments.storePrefix} </span>
                    <span>{ord.storeName}</span>
                  </p>
                </div>

                {!readOnly && (
                  <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:justify-end gap-2 border-t border-border/40 pt-3">
                    <Button
                      tone="quiet"
                      onClick={() => {
                        setEditingOrder(ord);
                        setNextDueDate(ord.dueDate || todayLocalISO());
                      }}
                      className="min-h-11 sm:min-h-9 px-3 text-xs whitespace-normal text-center"
                    >
                      <Icon3D name="edit" size={18} /> {t.duePayments.editDueBtn}
                    </Button>
                    <Button
                      tone="primary"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        await onUpdateOrder(ord.id, { paymentStatus: 'paid', dueDate: '' });
                        setBusy(false);
                      }}
                      className="min-h-11 sm:min-h-9 px-3 text-xs whitespace-normal text-center"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0" /> {t.duePayments.markPaidBtn}
                    </Button>
                  </div>
                )}
              </Surface>
            ))}
          </div>
        )}
      </Surface>

      {editingOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/60 p-0 sm:p-4"
        >
          <Surface className="w-full max-w-md rounded-t-2xl sm:rounded-card p-4 sm:p-5 space-y-4 pb-safe">
            <div className="mx-auto h-1 w-10 rounded-full bg-border sm:hidden" />
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-sm font-semibold truncate pr-2">
                {t.duePayments.modalTitlePrefix} {editingOrder.customerName}
              </h3>
              <Button tone="quiet" onClick={() => setEditingOrder(null)} className="min-h-11 sm:min-h-9 px-3 shrink-0" aria-label={t.common.close}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Field label={t.duePayments.newDueDateLabel}>
              <input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                tone="quiet"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onUpdateOrder(editingOrder.id, { paymentStatus: 'paid', dueDate: '' });
                  setBusy(false);
                  setEditingOrder(null);
                }}
                className="w-full sm:w-auto"
              >
                {t.duePayments.closeDuePaidBtn}
              </Button>
              <Button
                tone="primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onUpdateOrder(editingOrder.id, {
                    dueDate: nextDueDate,
                    paymentStatus: 'unpaid',
                  });
                  setBusy(false);
                  setEditingOrder(null);
                }}
                className="w-full sm:w-auto"
              >
                {t.duePayments.saveNewDueBtn}
              </Button>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
};

/* =========================================================
   8. STAFF INFO VIEW
   ========================================================= */
export const StaffInfoView: React.FC<{
  staff: StaffMember[];
  onZoomImage: (url: string, title: string) => void;
}> = ({ staff, onZoomImage }) => {
  const { t } = useI18n();
  return (
    <Surface className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex items-center gap-3 border-b border-border/50 pb-4">
        <Icon3D name="staff-info" size={36} />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">
            {t.staffInfo.title}
          </h2>
          <p className="text-xs text-muted">
            {t.staffInfo.subtitle}
          </p>
        </div>
      </div>

      {staff.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {t.staffInfo.emptyList}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((st) => (
            <motion.div
              key={st.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-card border border-border bg-surface p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                {st.photoUrl ? (
                  <ProductImage
                    src={st.photoUrl}
                    alt={st.name}
                    className="h-14 w-14 shrink-0"
                    onZoom={onZoomImage}
                  />
                ) : (
                  <Icon3D name="user" size={44} />
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground">{st.name}</h3>
                  <p className="text-xs text-primary font-medium">{st.position || t.staffInfo.defaultPosition}</p>
                </div>
              </div>

              <div className="border-t border-border/40 pt-3 space-y-1.5 text-xs">
                <p>
                  <span className="text-muted">{t.staffInfo.phonePrefix} </span>
                  <strong className="text-foreground tabular-nums">{st.phone || '-'}</strong>
                </p>
                <p>
                  <span className="text-muted">{t.staffInfo.addressPrefix} </span>
                  <span className="text-foreground">{st.address || '-'}</span>
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Surface>
  );
};

/* =========================================================
   9. PRICE RECORD VIEW (MULTI-PRICE TIERS + CLOUDINARY)
   ========================================================= */
export const PriceRecordView: React.FC<{
  records: PriceRecordItem[];
  currency: CurrencyCode;
  readOnly?: boolean;
  onSaveRecord: (payload: {
    id?: string;
    productName: string;
    imageUrl: string;
    prices: PriceTier[];
  }) => Promise<boolean>;
  onDeleteRecord: (id: string) => Promise<boolean>;
  onZoomImage: (url: string, title: string) => void;
}> = ({ records, currency, readOnly = false, onSaveRecord, onDeleteRecord, onZoomImage }) => {
  const { t } = useI18n();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [prices, setPrices] = useState<PriceTier[]>([
    { id: 'tier-1', label: t.priceRecord.tierRetailDefault, amount: 0 },
    { id: 'tier-2', label: t.priceRecord.tierWholesaleDefault, amount: 0 },
  ]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const currencyMeta = getCurrencyMeta(currency);
  const prevCurrencyRef = useRef<CurrencyCode>(currency);

  useEffect(() => {
    if (!formOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFormOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen]);

  useEffect(() => {
    const prevCurrency = prevCurrencyRef.current;
    if (prevCurrency === currency) return;
    prevCurrencyRef.current = currency;
    setPrices((prev) =>
      prev.map((p) => ({
        ...p,
        amount: usdToInputAmount(inputAmountToUsd(p.amount, prevCurrency), currency),
      }))
    );
  }, [currency]);

  const resetForm = () => {
    setEditingId(null);
    setProductName('');
    setImageUrl('');
    setPrices([
      { id: 'tier-1', label: t.priceRecord.tierRetailDefault, amount: 0 },
      { id: 'tier-2', label: t.priceRecord.tierWholesaleDefault, amount: 0 },
    ]);
  };

  const openAddModal = () => {
    resetForm();
    setFeedback('');
    setFormOpen(true);
  };

  const closeFormModal = () => {
    setFormOpen(false);
    resetForm();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setImageUrl(url);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;
    setSaving(true);
    const ok = await onSaveRecord({
      id: editingId || undefined,
      productName: productName.trim(),
      imageUrl,
      prices: prices.map((p) => ({
        ...p,
        amount: inputAmountToUsd(Math.max(0, Number(p.amount) || 0), currency),
      })),
    });
    setSaving(false);
    if (ok) {
      setFeedback(t.priceRecord.saveSuccess);
      resetForm();
      setFormOpen(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Bar with Trigger Button */}
      <Surface className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Icon3D name="price-record" size={36} />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                {t.priceRecord.title}
              </h2>
              <p className="text-xs text-muted leading-snug">
                {t.priceRecord.subtitle}
              </p>
            </div>
          </div>

          {!readOnly && (
            <Button
              tone="primary"
              onClick={openAddModal}
              className="w-full sm:w-auto shrink-0 whitespace-nowrap"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t.priceRecord.addNewBtn}</span>
            </Button>
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
      </Surface>

      {/* Saved Price Records */}
      {records.length === 0 ? (
        <Surface className="p-8 text-center space-y-3">
          <p className="text-sm text-muted">{t.priceRecord.emptyList}</p>
          {!readOnly && (
            <Button tone="primary" onClick={openAddModal} className="whitespace-nowrap">
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t.priceRecord.addNewBtn}</span>
            </Button>
          )}
        </Surface>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {records.map((rec) => (
            <Surface key={rec.id} className="p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <ProductImage
                  src={rec.imageUrl}
                  alt={rec.productName}
                  className="h-36 w-full"
                  onZoom={onZoomImage}
                />
                <h3 className="font-semibold text-sm text-foreground">{rec.productName}</h3>
                <div className="divide-y divide-border/40 border-t border-border/40">
                  {rec.prices.map((pt) => (
                    <div key={pt.id} className="py-1.5 flex justify-between text-xs">
                      <span className="text-muted">{pt.label}</span>
                      <strong className="text-primary tabular-nums">
                        {formatMoney(pt.amount, currency)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              {!readOnly && (
                <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 border-t border-border/40 pt-3">
                  <Button
                    tone="quiet"
                    onClick={() => {
                      setEditingId(rec.id);
                      setProductName(rec.productName);
                      setImageUrl(rec.imageUrl);
                      setPrices(
                        rec.prices.map((p) => ({
                          ...p,
                          amount: usdToInputAmount(p.amount, currency),
                        }))
                      );
                      setFeedback('');
                      setFormOpen(true);
                    }}
                    className="min-h-11 sm:min-h-9 px-3 text-xs"
                  >
                    <Icon3D name="edit" size={16} /> {t.common.edit}
                  </Button>
                  <Button
                    tone="danger"
                    onClick={() => onDeleteRecord(rec.id)}
                    className="min-h-11 sm:min-h-9 px-3 text-xs"
                  >
                    <Icon3D name="trash" size={16} /> {t.common.delete}
                  </Button>
                </div>
              )}
            </Surface>
          ))}
        </div>
      )}

      {/* Animated Pop-Up Modal for Add / Edit Price Record Form Cart */}
      <AnimatePresence>
        {!readOnly && formOpen && (
          <motion.div
            key="price-record-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? t.priceRecord.editTitle : t.priceRecord.addNewBtn}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={closeFormModal}
            className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-foreground/60 backdrop-blur-[2px] p-0 sm:p-4"
          >
            <motion.div
              key="price-record-card"
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

                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon3D name="price-record" size={36} />
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                        {editingId ? t.priceRecord.editTitle : t.priceRecord.addNewBtn}
                      </h2>
                      <p className="text-xs text-muted leading-snug line-clamp-1">
                        {t.priceRecord.subtitle}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={t.priceRecord.fieldProductName}>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder={t.priceRecord.placeholderProductName}
                        className={inputClass}
                      />
                    </Field>

                    <Field label={t.priceRecord.fieldUploadPhoto}>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed border-primary/50 bg-background px-3 py-2 text-xs font-medium hover:bg-primary/5 transition-colors">
                          <Upload className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">
                            {uploading ? t.priceRecord.uploadingUrl : t.priceRecord.uploadPhotoBtn}
                          </span>
                          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                        </label>
                        {imageUrl && (
                          <ProductImage
                            src={imageUrl}
                            alt={productName || 'Preview'}
                            className="h-11 w-11 shrink-0"
                            onZoom={onZoomImage}
                          />
                        )}
                      </div>
                    </Field>
                  </div>

                  <div className="space-y-2.5 border-t border-border/50 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{t.priceRecord.tiersLabel}</span>
                      <Button
                        tone="quiet"
                        onClick={() =>
                          setPrices((prev) => [
                            ...prev,
                            {
                              id: `tier-${Date.now()}`,
                              label: `${t.priceRecord.tierDefaultPrefix} ${prev.length + 1}`,
                              amount: 0,
                            },
                          ])
                        }
                        className="min-h-11 sm:min-h-9 px-3 text-xs whitespace-nowrap"
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        <span>{t.priceRecord.addTierBtn}</span>
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {prices.map((tier, idx) => (
                        <div
                          key={tier.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-control border border-border/50 p-2 sm:border-0 sm:p-0"
                        >
                          <input
                            type="text"
                            value={tier.label}
                            onChange={(e) =>
                              setPrices((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, label: e.target.value } : p))
                              )
                            }
                            placeholder={t.priceRecord.placeholderTierName}
                            className={`${inputClass} flex-1 min-w-0`}
                          />
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1 sm:w-40">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                                {currencyMeta.symbol}
                              </span>
                              <input
                                type="number"
                                min="0"
                                step={currencyMeta.step}
                                value={tier.amount}
                                onChange={(e) =>
                                  setPrices((prev) =>
                                    prev.map((p, i) =>
                                      i === idx ? { ...p, amount: Number(e.target.value) || 0 } : p
                                    )
                                  )
                                }
                                placeholder={`${t.priceRecord.placeholderTierPrice} (${currencyMeta.inputLabel})`}
                                className={`${inputClass} w-full pl-8 tabular-nums`}
                              />
                            </div>
                            {prices.length > 1 && (
                              <Button
                                tone="danger"
                                onClick={() => setPrices((prev) => prev.filter((_, i) => i !== idx))}
                                className="min-h-11 px-3 shrink-0"
                                aria-label={t.common.delete}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-border/50 pt-4">
                    <Button
                      tone="quiet"
                      onClick={closeFormModal}
                      className="w-full sm:w-auto whitespace-nowrap"
                    >
                      {t.common.cancel}
                    </Button>
                    <Button
                      type="submit"
                      tone="primary"
                      disabled={saving || uploading}
                      className="w-full sm:w-auto whitespace-nowrap"
                    >
                      <Icon3D name="check" size={20} />
                      <span>{t.priceRecord.saveRecordBtn}</span>
                    </Button>
                  </div>
                </form>
              </Surface>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* =========================================================
   10. STOCK LOG VIEW (PAGINATED + PROGRESSIVE WINDOWING)
   ========================================================= */
const STOCK_LOG_DOM_STEP = 40;

const StockLogCard = React.memo<{
  log: StockLogEntry;
  addedDatePrefix: string;
  warehousePrefix: string;
}>(({ log, addedDatePrefix, warehousePrefix }) => (
  <Surface className="p-4 flex items-center justify-between gap-3">
    <div className="flex items-center gap-3 min-w-0">
      <Icon3D name="stock-log" size={34} />
      <div className="min-w-0">
        <p className="font-semibold text-sm text-foreground break-words leading-snug">{log.productName}</p>
        <p className="text-xs text-muted tabular-nums mt-0.5">
          {addedDatePrefix} <strong>{log.date}</strong>
        </p>
        <p className="text-xs text-muted truncate">{warehousePrefix} {log.warehouse}</p>
      </div>
    </div>
    <div className="text-right shrink-0 tabular-nums">
      <span className="text-sm font-bold text-primary">+{log.addedQuantity}</span>
      <p className="text-xs text-muted">
        {log.previousStock} → <strong>{log.newStock}</strong>
      </p>
    </div>
  </Surface>
));

export const StockLogView: React.FC<{
  stockLogs: StockLogEntry[];
  products: Product[];
  readOnly?: boolean;
  hasMoreStockLogs?: boolean;
  loadingMoreStockLogs?: boolean;
  onLoadMoreStockLogs?: () => Promise<void>;
  onAddStock: (productId: string, addedQuantity: number) => Promise<boolean>;
  onClearExpiredStockLogs?: () => Promise<number>;
  autoClearedCount?: number | null;
}> = ({
  stockLogs,
  products,
  readOnly = false,
  hasMoreStockLogs = false,
  loadingMoreStockLogs = false,
  onLoadMoreStockLogs,
  onAddStock,
  onClearExpiredStockLogs,
  autoClearedCount = null,
}) => {
  const { t } = useI18n();
  const [selectedProdId, setSelectedProdId] = useState(products[0]?.id || '');
  const [qty, setQty] = useState('10');
  const [busy, setBusy] = useState(false);
  const [clearingExpired, setClearingExpired] = useState(false);
  const [clearFeedback, setClearFeedback] = useState<{ count: number } | null>(null);
  const [visibleDomCount, setVisibleDomCount] = useState(STOCK_LOG_DOM_STEP);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (products.length === 0) {
      if (selectedProdId) setSelectedProdId('');
      return;
    }
    if (!selectedProdId || !products.some((p) => p.id === selectedProdId)) {
      setSelectedProdId(products[0].id);
    }
  }, [products, selectedProdId]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || visibleDomCount >= stockLogs.length) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleDomCount((prev) => Math.min(stockLogs.length, prev + STOCK_LOG_DOM_STEP));
        }
      },
      { rootMargin: '240px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleDomCount, stockLogs.length]);

  const visibleStockLogsSlice = useMemo(
    () => stockLogs.slice(0, visibleDomCount),
    [stockLogs, visibleDomCount]
  );
  const remainingDomLogs = Math.max(0, stockLogs.length - visibleDomCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Math.floor(Number(qty) || 0);
    if (!selectedProdId || num <= 0) return;
    setBusy(true);
    const ok = await onAddStock(selectedProdId, num);
    setBusy(false);
    if (ok) setQty('10');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Surface className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Icon3D name="stock-log" size={36} />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                {t.stockLog.title}
              </h2>
              <p className="text-xs text-muted leading-snug">
                {t.stockLog.subtitle}
              </p>
            </div>
          </div>

          {onClearExpiredStockLogs && (
            <Button
              tone="quiet"
              disabled={readOnly || clearingExpired}
              onClick={async () => {
                setClearingExpired(true);
                try {
                  const deleted = await onClearExpiredStockLogs();
                  setClearFeedback({ count: deleted });
                } finally {
                  setClearingExpired(false);
                }
              }}
              className="w-full lg:w-auto min-h-9 px-3 text-xs whitespace-nowrap shrink-0"
            >
              {clearingExpired ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 text-muted shrink-0" />
              )}
              <span>{t.stockLog.autoClearBtn}</span>
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted">
          <p className="inline-flex items-start sm:items-center gap-1.5 leading-snug">
            <Clock3 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <span>{t.stockLog.autoClearNote}</span>
          </p>
          {(clearFeedback !== null || (typeof autoClearedCount === 'number' && autoClearedCount > 0)) && (
            <p className="inline-flex items-center gap-1.5 font-medium text-primary shrink-0 tabular-nums">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {clearFeedback !== null
                  ? clearFeedback.count > 0
                    ? t.stockLog.autoClearedResult.replace('{count}', String(clearFeedback.count))
                    : t.stockLog.autoClearNone
                  : t.stockLog.autoClearedResult.replace('{count}', String(autoClearedCount))}
              </span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <Field label={t.stockLog.selectProductLabel}>
            <select
              value={selectedProdId}
              onChange={(e) => setSelectedProdId(e.target.value)}
              className={inputClass}
            >
              {products.length === 0 ? (
                <option value="">{t.stockLog.noProductsOpt}</option>
              ) : (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({t.stockLog.currentStockPrefix} {p.stock})
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field label={t.stockLog.addQtyLabel}>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={`${inputClass} tabular-nums`}
            />
          </Field>

          <Button
            type="submit"
            tone="primary"
            disabled={readOnly || busy || products.length === 0}
            className="w-full sm:w-auto"
          >
            <Icon3D name="plus" size={20} /> {t.stockLog.addStockBtn}
          </Button>
        </form>
      </Surface>

      {stockLogs.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-muted">
          {t.stockLog.emptyList}
        </Surface>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {visibleStockLogsSlice.map((log) => (
              <StockLogCard
                key={log.id}
                log={log}
                addedDatePrefix={t.stockLog.addedDatePrefix}
                warehousePrefix={t.stockLog.warehousePrefix}
              />
            ))}
          </div>

          <div ref={loadMoreSentinelRef} aria-hidden="true" className="h-1 w-full" />

          <DatabaseProgressBar
            active={loadingMoreStockLogs}
            variant="banner"
            label="កំពុងទាញប្រវត្តិស្តុកបន្ថែមពី Database.."
            resetKey={stockLogs.length}
          />

          {(remainingDomLogs > 0 || hasMoreStockLogs || stockLogs.length > 0) && (
            <Surface className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-muted tabular-nums">
                {t.stockLog.loadedSummary.replace('{count}', String(stockLogs.length))}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {remainingDomLogs > 0 && (
                  <Button
                    tone="quiet"
                    onClick={() => setVisibleDomCount((prev) => prev + STOCK_LOG_DOM_STEP)}
                    className="w-full sm:w-auto min-h-10 px-3.5 text-xs"
                  >
                    <ChevronDown className="h-4 w-4 shrink-0" />
                    <span>
                      {t.stockLog.showMoreScreenBtn.replace(
                        '{remaining}',
                        String(remainingDomLogs)
                      )}
                    </span>
                  </Button>
                )}

                {hasMoreStockLogs && onLoadMoreStockLogs ? (
                  <Button
                    tone="primary"
                    disabled={loadingMoreStockLogs}
                    onClick={onLoadMoreStockLogs}
                    className="w-full sm:w-auto min-h-10 px-4 text-xs"
                  >
                    {loadingMoreStockLogs ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    )}
                    <span>
                      {loadingMoreStockLogs ? t.stockLog.loadingMoreBtn : t.stockLog.loadMoreBtn}
                    </span>
                  </Button>
                ) : (
                  remainingDomLogs === 0 && (
                    <span className="text-xs font-medium text-muted">
                      {t.stockLog.allRecordsLoaded}
                    </span>
                  )
                )}
              </div>
            </Surface>
          )}
        </div>
      )}
    </div>
  );
};
