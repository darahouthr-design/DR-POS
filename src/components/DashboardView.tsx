import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Icon3D } from './Icon3D';
import { Button, Surface } from './ui';
import {
  formatCompactCount,
  formatCompactMoney,
  formatMoney,
  todayLocalISO,
} from '../utils/helpers';
import { useI18n } from '../utils/i18nContext';
import type { CurrencyCode, Order, PageId, Product } from '../types';

interface DashboardViewProps {
  orders: Order[];
  products: Product[];
  currency: CurrencyCode;
  saleName?: string;
  onNavigate: (page: PageId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  products,
  currency,
  saleName,
  onNavigate,
}) => {
  const { t } = useI18n();
  const [chartRange, setChartRange] = useState<'7d' | '14d' | '30d'>('7d');
  const today = todayLocalISO();

  const todayOrders = useMemo(() => orders.filter((o) => o.date === today), [orders, today]);
  const todayRevenue = useMemo(
    () => todayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    [todayOrders]
  );
  const todayProfit = useMemo(
    () => todayOrders.reduce((sum, o) => sum + (o.totalAmount - o.totalCost), 0),
    [todayOrders]
  );
  const todayItemsSold = useMemo(
    () =>
      todayOrders.reduce(
        (sum, o) => sum + o.items.reduce((itemSum, it) => itemSum + (it.quantity || 0), 0),
        0
      ),
    [todayOrders]
  );

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock <= 10).sort((a, b) => a.stock - b.stock),
    [products]
  );

  const duePaymentOrders = useMemo(
    () =>
      orders
        .filter((o) => o.paymentStatus === 'unpaid' || Boolean(o.dueDate))
        .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')),
    [orders]
  );

  const duePaymentTotal = useMemo(
    () => duePaymentOrders.reduce((s, o) => s + o.totalAmount, 0),
    [duePaymentOrders]
  );

  const ordersByDate = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const o of orders) {
      const cur = map.get(o.date);
      if (cur) {
        cur.total += o.totalAmount;
        cur.count += 1;
      } else {
        map.set(o.date, { total: o.totalAmount, count: 1 });
      }
    }
    return map;
  }, [orders]);

  const chartPoints = useMemo(() => {
    const count = chartRange === '7d' ? 7 : chartRange === '14d' ? 14 : 30;
    const days: Array<{ label: string; iso: string; total: number; count: number }> = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;
      const agg = ordersByDate.get(iso);
      days.push({
        label: `${m}/${day}`,
        iso,
        total: Math.round((agg?.total || 0) * 100) / 100,
        count: agg?.count || 0,
      });
    }
    return days;
  }, [ordersByDate, chartRange]);

  const maxChartVal = useMemo(() => {
    const m = Math.max(...chartPoints.map((d) => d.total), 10);
    return Math.ceil(m * 1.15);
  }, [chartPoints]);

  const periodTotal = useMemo(
    () => chartPoints.reduce((s, p) => s + p.total, 0),
    [chartPoints]
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Daily Sales Summary Form Card */}
      <Surface className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Icon3D name="money" size={36} />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                {t.dashboard.dailySalesTitle} ({today})
              </h2>
              <p className="text-xs text-muted leading-snug">
                {saleName
                  ? `${t.dashboard.salePersonalSubtitle} ${saleName}`
                  : t.dashboard.generalSummarySubtitle}
              </p>
            </div>
          </div>
          <Button tone="primary" onClick={() => onNavigate('pos')} className="w-full sm:w-auto shrink-0">
            <Icon3D name="pos" size={20} /> {t.dashboard.newSalePosBtn}
          </Button>
        </div>

        <div className="mt-4 sm:mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-0 lg:divide-x lg:divide-border/50">
          <div className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pr-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
            <Icon3D name="money" size={30} />
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted leading-snug">{t.dashboard.todayRevenue}</p>
              <p
                title={formatMoney(todayRevenue, currency)}
                className="text-lg sm:text-2xl font-bold tabular-nums text-foreground mt-0.5 truncate"
              >
                {formatCompactMoney(todayRevenue, currency)}
              </p>
              <p className="text-[11px] sm:text-xs text-muted mt-0.5">
                {formatCompactCount(todayOrders.length)} {t.dashboard.invoicesUnit}
              </p>
            </div>
          </div>

          <div className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:px-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
            <Icon3D name="analytics" size={30} />
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted leading-snug">
                {saleName ? t.dashboard.todayItemsSoldLabel : t.dashboard.todayNetProfit}
              </p>
              <p
                title={
                  saleName
                    ? `${todayItemsSold} ${t.dashboard.itemsSoldUnit}`
                    : formatMoney(todayProfit, currency)
                }
                className="text-lg sm:text-2xl font-bold tabular-nums text-primary mt-0.5 truncate"
              >
                {saleName
                  ? `${formatCompactCount(todayItemsSold)} ${t.dashboard.itemsSoldUnit}`
                  : formatCompactMoney(todayProfit, currency)}
              </p>
              <p className="text-[11px] sm:text-xs text-muted mt-0.5">
                {saleName ? t.dashboard.personalSaleOnlyNote : t.dashboard.calculatedFromCost}
              </p>
            </div>
          </div>

          <div className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:px-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
            <Icon3D name="due-payments" size={30} />
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted leading-snug">{t.dashboard.totalDueCustomers}</p>
              <p className="text-lg sm:text-2xl font-bold tabular-nums text-foreground mt-0.5">
                {formatCompactCount(duePaymentOrders.length)}
              </p>
              <p
                title={formatMoney(duePaymentTotal, currency)}
                className="text-[11px] sm:text-xs text-muted mt-0.5 truncate"
              >
                {t.common.total}: {formatCompactMoney(duePaymentTotal, currency)}
              </p>
            </div>
          </div>

          <div className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pl-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
            <Icon3D name="alert" size={30} />
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted leading-snug">{t.dashboard.lowStockCountLabel}</p>
              <p className="text-lg sm:text-2xl font-bold tabular-nums text-danger mt-0.5">
                {formatCompactCount(lowStockProducts.length)} {t.dashboard.itemsUnit}
              </p>
              <p className="text-[11px] sm:text-xs text-muted mt-0.5">{t.dashboard.needRestock}</p>
            </div>
          </div>
        </div>
      </Surface>

      {/* Sales Data Chart Form Card */}
      <Surface className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Icon3D name="dashboard" size={34} />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">{t.dashboard.salesChartTitle}</h2>
              <p className="text-xs text-muted">
                {t.dashboard.selectedPeriodTotal}{' '}
                <strong
                  title={formatMoney(periodTotal, currency)}
                  className="tabular-nums text-foreground"
                >
                  {formatCompactMoney(periodTotal, currency)}
                </strong>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:flex gap-2">
            {(['7d', '14d', '30d'] as const).map((r) => (
              <Button
                key={r}
                tone={chartRange === r ? 'primary' : 'quiet'}
                onClick={() => setChartRange(r)}
                className="min-h-11 sm:min-h-9 px-2.5 sm:px-3 py-1 text-xs"
              >
                {r === '7d' ? t.dashboard.days7 : r === '14d' ? t.dashboard.days14 : t.dashboard.days30}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4 w-full overflow-x-auto">
          <svg
            viewBox="0 0 760 250"
            className={`h-auto w-full ${chartRange === '7d' ? '' : 'min-w-[520px]'}`}
            role="img"
            aria-label={t.dashboard.chartAriaLabel}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = 205 - ratio * 165;
              const val = maxChartVal * ratio;
              return (
                <g key={idx}>
                  <line
                    x1="76"
                    y1={y}
                    x2="740"
                    y2={y}
                    stroke="var(--color-border)"
                    strokeDasharray={idx === 0 ? undefined : '4 4'}
                    strokeWidth="1"
                  />
                  <text
                    x="68"
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="var(--color-muted)"
                    style={{
                      paintOrder: 'stroke',
                      stroke: 'var(--color-surface)',
                      strokeWidth: '4px',
                      strokeLinejoin: 'round',
                    }}
                  >
                    {formatCompactMoney(val, currency)}
                  </text>
                </g>
              );
            })}

            {chartPoints.map((pt, i) => {
              const plotW = 656;
              const step = plotW / chartPoints.length;
              const barW = Math.min(34, Math.max(10, step * 0.56));
              const x = 80 + i * step + (step - barW) / 2;
              const barH = Math.max(2, (pt.total / maxChartVal) * 165);
              const y = 205 - barH;
              const showLabel =
                chartPoints.length <= 14 || i % 3 === 0 || i === chartPoints.length - 1;

              return (
                <g key={pt.iso}>
                  <title>
                    {pt.iso}: {formatMoney(pt.total, currency)} ({pt.count} {t.dashboard.invoicesUnit})
                  </title>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={barH}
                    rx="5"
                    fill={pt.iso === today ? 'var(--color-primary)' : 'oklch(0.62 0.10 165)'}
                  />
                  {pt.total > 0 && chartPoints.length <= 14 && (
                    <text
                      x={x + barW / 2}
                      y={Math.max(16, y - 8)}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight="600"
                      fill="var(--color-foreground)"
                      style={{
                        paintOrder: 'stroke',
                        stroke: 'var(--color-surface)',
                        strokeWidth: '4px',
                        strokeLinejoin: 'round',
                      }}
                    >
                      {formatCompactMoney(pt.total, currency)}
                    </text>
                  )}
                  {showLabel && (
                    <text
                      x={x + barW / 2}
                      y={228}
                      textAnchor="middle"
                      fontSize="11"
                      fill="var(--color-muted)"
                      style={{
                        paintOrder: 'stroke',
                        stroke: 'var(--color-surface)',
                        strokeWidth: '3px',
                        strokeLinejoin: 'round',
                      }}
                    >
                      {pt.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </Surface>

      {/* Middle Grid: Low Stock (<= 10) + Due Payment Customers Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Low Stock Alert Card */}
        <Surface className="lg:col-span-5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon3D name="box" size={34} />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-foreground">{t.dashboard.lowStockCardTitle}</h2>
                <p className="text-xs text-muted">{t.dashboard.lowStockCardSubtitle}</p>
              </div>
            </div>
            <Button tone="quiet" onClick={() => onNavigate('products')} className="min-h-11 sm:min-h-9 px-3 text-xs shrink-0">
              {saleName ? t.dashboard.viewProductsBtn : t.dashboard.manageStockBtn}
            </Button>
          </div>

          {lowStockProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              {products.length === 0
                ? t.dashboard.noProductsYet
                : t.dashboard.allStockSufficient}
            </p>
          ) : (
            <div className="divide-y divide-border/50 mt-2">
              {lowStockProducts.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate" title={p.name}>
                      {p.name}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {p.category} · {p.warehouse}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-danger">
                    {t.common.remaining} {formatCompactCount(p.stock)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </Surface>

        {/* Due Payment Customers Report Form Card */}
        <Surface className="lg:col-span-7 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon3D name="due-payments" size={34} />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-foreground">{t.dashboard.dueReportTitle}</h2>
                <p className="text-xs text-muted">{t.dashboard.dueReportSubtitle}</p>
              </div>
            </div>
            <Button tone="quiet" onClick={() => onNavigate('due-payments')} className="min-h-11 sm:min-h-9 px-3 text-xs shrink-0">
              {t.dashboard.viewAllBtn}
            </Button>
          </div>

          {duePaymentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{t.dashboard.noDueOrders}</p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-border/50 mt-2">
                {duePaymentOrders.slice(0, 8).map((o) => (
                  <div key={o.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{o.customerName}</span>
                      <span
                        title={formatMoney(o.totalAmount, currency)}
                        className="text-sm font-bold tabular-nums text-danger shrink-0"
                      >
                        {formatCompactMoney(o.totalAmount, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted">
                      <span className="tabular-nums">{o.customerPhone || '-'} · {o.staffName}</span>
                      <span className="font-medium text-accent tabular-nums shrink-0">
                        {o.dueDate || t.common.unscheduled}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto mt-3">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted">
                      <th className="py-2.5 pr-3">{t.dashboard.colDueDate}</th>
                      <th className="py-2.5 px-3">{t.dashboard.colStaff}</th>
                      <th className="py-2.5 px-3">{t.dashboard.colCustomerPhone}</th>
                      <th className="py-2.5 px-3">{t.dashboard.colStore}</th>
                      <th className="py-2.5 pl-3 text-right">{t.dashboard.colTotal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {duePaymentOrders.slice(0, 8).map((o) => (
                      <tr key={o.id}>
                        <td className="py-3 pr-3 whitespace-nowrap font-medium text-accent tabular-nums">
                          {o.dueDate || t.common.unscheduled}
                        </td>
                        <td className="py-3 px-3">{o.staffName}</td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-foreground">{o.customerName}</div>
                          <div className="text-xs text-muted tabular-nums">{o.customerPhone || '-'}</div>
                        </td>
                        <td className="py-3 px-3 text-xs text-muted">{o.storeName || '-'}</td>
                        <td
                          title={formatMoney(o.totalAmount, currency)}
                          className="py-3 pl-3 text-right font-semibold tabular-nums text-foreground whitespace-nowrap"
                        >
                          {formatCompactMoney(o.totalAmount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Surface>
      </div>

      {/* Recent / New Orders Form Card */}
      <Surface className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Icon3D name="orders" size={34} />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">{t.dashboard.recentOrdersTitle}</h2>
              <p className="text-xs text-muted">{t.dashboard.recentOrdersSubtitle}</p>
            </div>
          </div>
          <Button tone="quiet" onClick={() => onNavigate('orders')} className="min-h-11 sm:min-h-9 px-3 text-xs shrink-0">
            {t.dashboard.viewOrdersBtn}
          </Button>
        </div>

        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{t.dashboard.noOrdersYet}</p>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-border/50 mt-2">
              {orders.slice(0, 10).map((ord) => (
                <div key={ord.id} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate">{ord.customerName}</span>
                      <span className={`ml-2 text-[11px] font-medium ${ord.paymentStatus === 'paid' ? 'text-primary' : 'text-danger'}`}>
                        · {ord.paymentStatus === 'paid' ? t.common.paid : t.common.unpaid}
                      </span>
                    </div>
                    <span
                      title={formatMoney(ord.totalAmount, currency)}
                      className="text-sm font-bold tabular-nums text-foreground shrink-0"
                    >
                      {formatCompactMoney(ord.totalAmount, currency)}
                    </span>
                  </div>
                  <p className="text-xs text-muted line-clamp-2">
                    {ord.items.map((it) => `${it.productName} (x${it.quantity})`).join(', ')}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted tabular-nums">
                    <span>{ord.staffName}</span>
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
                    <th className="py-2.5 pr-3">{t.dashboard.colOrderDate}</th>
                    <th className="py-2.5 px-3">{t.dashboard.colStaff}</th>
                    <th className="py-2.5 px-3">{t.dashboard.colCustomerName}</th>
                    <th className="py-2.5 px-3">{t.dashboard.colSoldItems}</th>
                    <th className="py-2.5 pl-3 text-right">{t.dashboard.colTotal}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {orders.slice(0, 10).map((ord) => (
                    <tr key={ord.id}>
                      <td className="py-3 pr-3 whitespace-nowrap tabular-nums text-muted">
                        {ord.date} · {ord.time}
                      </td>
                      <td className="py-3 px-3 font-medium">{ord.staffName}</td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-foreground">{ord.customerName}</span>
                        <span className="ml-2 text-xs text-muted">
                          · {ord.paymentStatus === 'paid' ? t.common.paid : t.common.unpaid}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted">
                        {ord.items.map((it) => `${it.productName} (x${it.quantity})`).join(', ')}
                      </td>
                      <td
                        title={formatMoney(ord.totalAmount, currency)}
                        className="py-3 pl-3 text-right font-semibold tabular-nums whitespace-nowrap"
                      >
                        {formatCompactMoney(ord.totalAmount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Surface>
    </div>
  );
};
