/*
 * Compare — side-by-side comparison of up to 6 funds
 */
import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  funds,
  getCumulativeGrowth,
  DATA_DATES,
  type Fund,
  type KpiSnapshot,
} from "@/lib/fundData";
import { useAsOf, getKpisForAsOf } from "@/lib/asOfContext";
import { DateSelector } from "@/components/DateSelector";
import { useBenchmarks } from "@/lib/benchmarkContext";
import { benchmarkRiskKpis } from "@shared/performance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  ClassBadge,
  SB1Logo,
  CHART_COLORS,
  formatCurrencyNOK,
  formatCompact,
} from "@/components/shared";

const MAX_SELECT = 6;
const DEFAULTS = ["F0GBR04NJK", "F00000VKZH"]; // Pareto + (PIMCO id may differ — pick first match)

type MetricKey = keyof Fund | "trackingError5Y";
type MetricFmt = "pct" | "num" | "raw" | "rating" | "riskPct";
type Direction = "higher" | "lower" | "none";

interface Metric {
  label: string;
  key: MetricKey;
  fmt: MetricFmt;
  decimals?: number;
  better?: Direction;
}

interface Section {
  title: string;
  metrics: Metric[];
}

const SECTIONS: Section[] = [
  {
    title: "Returns",
    metrics: [
      { label: "1 Month", key: "return1M", fmt: "pct", better: "higher" },
      { label: "YTD", key: "returnYTD", fmt: "pct", better: "higher" },
      { label: "6 Months", key: "return6M", fmt: "pct", better: "higher" },
      { label: "1 Year", key: "return1Y", fmt: "pct", better: "higher" },
      { label: "3 Year (Annualized)", key: "return3Y", fmt: "pct", better: "higher" },
      { label: "5 Year (Annualized)", key: "return5Y", fmt: "pct", better: "higher" },
      { label: "10 Year (Annualized)", key: "return10Y", fmt: "pct", better: "higher" },
    ],
  },
  {
    title: "Risk",
    metrics: [
      { label: "Std Dev 3Y", key: "stdDev3Y", fmt: "pct", better: "lower" },
      { label: "Std Dev 5Y", key: "stdDev5Y", fmt: "pct", better: "lower" },
      { label: "Max Drawdown", key: "maxDrawdown", fmt: "pct", better: "higher" },
      { label: "Downside Capture 3Y", key: "downsideCapture3Y", fmt: "num", better: "lower" },
      { label: "Upside Capture 3Y", key: "upsideCapture3Y", fmt: "num", better: "higher" },
    ],
  },
  {
    title: "Risk-Adjusted",
    metrics: [
      { label: "Sharpe 3Y", key: "sharpe3Y", fmt: "num", better: "higher" },
      { label: "Sharpe 5Y", key: "sharpe5Y", fmt: "num", better: "higher" },
      { label: "Sortino 3Y", key: "sortino3Y", fmt: "num", better: "higher" },
      { label: "Appraisal Ratio", key: "appraisalRatio", fmt: "num", better: "higher" },
    ],
  },
  {
    title: "Reporting Benchmark Risk (Annualised)",
    metrics: [
      { label: "Tracking Error 3Y", key: "trackingError3Y", fmt: "riskPct", better: "none" },
      { label: "Tracking Error 5Y", key: "trackingError5Y", fmt: "riskPct", better: "none" },
      { label: "Info Ratio 3Y", key: "infoRatio3Y", fmt: "num", better: "higher" },
      { label: "Info Ratio 5Y", key: "infoRatio5Y", fmt: "num", better: "higher" },
    ],
  },
  {
    title: "Relative",
    metrics: [
      { label: "Alpha 3Y", key: "alpha3Y", fmt: "pct", better: "higher" },
      { label: "Alpha 5Y", key: "alpha5Y", fmt: "pct", better: "higher" },
      { label: "Beta 3Y", key: "beta3Y", fmt: "num", better: "none" },
      { label: "Beta 5Y", key: "beta5Y", fmt: "num", better: "none" },
      { label: "R² 3Y", key: "rSquared3Y", fmt: "num", better: "none" },
    ],
  },
  {
    title: "Fund Info",
    metrics: [
      { label: "Star Rating", key: "morningstarRating", fmt: "rating", better: "higher" },
      { label: "NAV", key: "nav", fmt: "num", decimals: 4, better: "none" },
      { label: "Fund Size", key: "fundSize", fmt: "raw", better: "none" },
    ],
  },
];

// KPI-feltene som hentes fra kpiHistory-snapshot ved valgt asOf-dato.
const KPI_KEYS = new Set<string>([
  "return1M",
  "returnYTD",
  "return6M",
  "return1Y",
  "return3Y",
  "return5Y",
  "stdDev3Y",
  "sharpe3Y",
  "maxDrawdown3Y",
]);

function getNum(f: Fund, k: MetricKey, kpi: KpiSnapshot | null, risk: ReturnType<typeof benchmarkRiskKpis>): number | null {
  if (k === "trackingError3Y" || k === "trackingError5Y" || k === "infoRatio3Y" || k === "infoRatio5Y") return risk[k];
  if (kpi && KPI_KEYS.has(k as string)) {
    const v = (kpi as any)[k];
    if (typeof v === "number") return v;
    return null;
  }
  const v = (f as any)[k];
  if (typeof v === "number") return v;
  return null;
}

function formatVal(value: number | null, fmt: MetricFmt, decimals = 2): string {
  if (value === null || value === undefined) return "—";
  if (fmt === "riskPct") return `${value.toFixed(decimals)}%`;
  if (fmt === "pct") {
    return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
  }
  if (fmt === "num") {
    return value.toFixed(decimals);
  }
  if (fmt === "raw") {
    return formatCurrencyNOK(value);
  }
  if (fmt === "rating") {
    return value.toString() + "★";
  }
  return String(value);
}

function getBestIndex(values: (number | null)[], direction: Direction): number | null {
  if (direction === "none") return null;
  let bestIdx: number | null = null;
  let bestVal: number | null = null;
  values.forEach((v, i) => {
    if (v === null) return;
    if (bestVal === null) {
      bestIdx = i;
      bestVal = v;
      return;
    }
    if (direction === "higher" && v > bestVal) {
      bestVal = v;
      bestIdx = i;
    } else if (direction === "lower" && v < bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  });
  return bestIdx;
}

export default function Compare() {
  const { asOf } = useAsOf();
  const { data: benchmarks } = useBenchmarks();
  const reportingByFund = useMemo(() => Object.fromEntries(funds.map(f => [f.id, benchmarks.series.find(s => s.id === benchmarks.assignments[f.id])])), [benchmarks]);
  const riskByFund = useMemo(() => Object.fromEntries(funds.map(f => [f.id, benchmarkRiskKpis(f.monthlyReturns, reportingByFund[f.id], asOf)])), [reportingByFund, asOf]);
  const kpisByFund = useMemo<Record<string, KpiSnapshot>>(() => {
    const m: Record<string, KpiSnapshot> = {};
    for (const f of funds) m[f.id] = getKpisForAsOf(f, asOf);
    return m;
  }, [asOf]);
  // Pre-select Pareto + first PIMCO fund (by name) by default
  const initial = useMemo(() => {
    const set = new Set<string>();
    const pareto = funds.find((f) => f.shortName.toLowerCase().includes("pareto"));
    const pimco = funds.find((f) => f.shortName.toLowerCase().includes("pimco"));
    if (pareto) set.add(pareto.id);
    if (pimco) set.add(pimco.id);
    if (set.size === 0) set.add(funds[0].id);
    return set;
  }, []);
  const [selected, setSelected] = useState<Set<string>>(initial);

  const selectedFunds = useMemo(
    () => funds.filter((f) => selected.has(f.id)),
    [selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_SELECT) {
        next.add(id);
      }
      return next;
    });
  }

  // Build growth overlay
  const growthData = useMemo(() => {
    if (selectedFunds.length === 0) return [];
    // For each fund, getCumulativeGrowth already returns NOK 10,000-seeded values
    const seriesPerFund = selectedFunds.map((f) => {
      const g = getCumulativeGrowth(f);
      return g.map((p) => ({ date: p.date.slice(0, 7), value: Math.round(p.value) }));
    });
    // Align by union of months
    const allDates = new Set<string>();
    seriesPerFund.forEach((s) => s.forEach((p) => allDates.add(p.date)));
    const months = Array.from(allDates).sort();
    return months.map((m) => {
      const row: any = { date: m };
      selectedFunds.forEach((f, i) => {
        const p = seriesPerFund[i].find((x) => x.date === m);
        row[f.shortName] = p ? p.value : null;
      });
      return row;
    });
  }, [selectedFunds]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sb1-navy text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <Link href="/">
            <button
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors mb-3"
              data-testid="link-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to overview
            </button>
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SB1Logo size={36} />
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Compare Funds</h1>
                <div className="text-sm text-white/70 -mt-0.5">
                  Select up to {MAX_SELECT} funds to compare
                </div>
              </div>
            </div>
            <DateSelector variant="dark" />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
        {/* Fund selector */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-base font-semibold">Select Funds</h2>
              <span className="text-xs text-muted-foreground">
                {selected.size} of {MAX_SELECT} selected
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {funds.map((f) => {
                const isSelected = selected.has(f.id);
                const isDisabled = !isSelected && selected.size >= MAX_SELECT;
                return (
                  <label
                    key={f.id}
                    className={`flex items-start gap-2.5 p-3 rounded-md border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-sb1-navy bg-sb1-navy/5"
                        : "border-border hover-elevate"
                    } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    data-testid={`label-fund-${f.id}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => toggle(f.id)}
                      data-testid={`checkbox-${f.id}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {f.shortName}
                      </div>
                      <div className="mt-1">
                        <ClassBadge assetClass={f.assetClass} />
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Growth overlay */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-base font-semibold mb-1">Growth of NOK 10,000</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Cumulative performance over each fund's full history
            </p>
            <div className="h-96">
              {selectedFunds.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Select at least one fund
                </div>
              ) : (
                <ResponsiveContainer>
                  <LineChart data={growthData} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                      minTickGap={40}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                      tickFormatter={(v) => formatCompact(v)}
                      width={56}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: any) =>
                        typeof v === "number"
                          ? `NOK ${v.toLocaleString("nb-NO", { maximumFractionDigits: 0 })}`
                          : "—"
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                    {selectedFunds.map((f, i) => (
                      <Line
                        key={f.id}
                        type="monotone"
                        dataKey={f.shortName}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPI Comparison table */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-base font-semibold mb-3">KPI Comparison</h2>
            <p className="text-xs text-muted-foreground mb-3" data-testid="text-comparison-risk-method">TE / IR use each fund's reporting benchmark and exactly 36 / 60 monthly NOK returns ending {asOf}. TE = sample standard deviation of monthly active return × √12; IR = 12 × mean monthly active return / TE. Missing history or undefined IR is shown as N/A, never a legacy fallback. Different mandates and benchmarks limit cross-fund comparisons. Other benchmark-dependent metrics remain legacy provider measures.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide sticky left-0 bg-card">
                      Metric
                    </th>
                    {selectedFunds.map((f) => (
                      <th
                        key={f.id}
                        className="px-3 py-2.5 text-right text-xs font-semibold text-foreground"
                      >
                        <div className="truncate max-w-[140px]">{f.shortName}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border" data-testid="row-comparison-benchmarks">
                    <th className="px-3 py-2 text-left font-medium sticky left-0 bg-card">TE / IR benchmark</th>
                    {selectedFunds.map(f => <td key={f.id} className="px-3 py-2 text-right text-xs min-w-[160px] max-w-[240px]" data-testid={`comparison-benchmark-${f.id}`}>{reportingByFund[f.id]?.name ?? "Not assigned"}</td>)}
                  </tr>
                  {SECTIONS.map((sec) => (
                    <React.Fragment key={sec.title}>
                      <tr className="bg-secondary/40">
                        <td
                          colSpan={1 + selectedFunds.length}
                          className="px-3 py-2 text-xs font-semibold text-sb1-navy uppercase tracking-wide"
                        >
                          {sec.title}
                        </td>
                      </tr>
                      {sec.metrics.map((m) => {
                        const vals = selectedFunds.map((f) =>
                          getNum(f, m.key, kpisByFund[f.id] ?? null, riskByFund[f.id])
                        );
                        const bestIdx = getBestIndex(vals, m.better ?? "none");
                        return (
                          <tr
                            key={`${sec.title}-${m.label}`}
                            className="border-b border-border last:border-0"
                          >
                            <td className="px-3 py-2 text-sm text-muted-foreground sticky left-0 bg-card">
                              {m.label}
                            </td>
                            {selectedFunds.map((f, i) => {
                              const v = vals[i];
                              const isBest = bestIdx === i;
                              return (
                                <td
                                  key={f.id}
                                  className={`px-3 py-2 text-right font-mono text-sm ${
                                    isBest
                                      ? "font-bold text-sb1-navy"
                                      : "text-foreground"
                                  }`}
                                  data-testid={`cell-${f.id}-${m.label.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  {v === null && ["trackingError3Y", "trackingError5Y", "infoRatio3Y", "infoRatio5Y"].includes(m.key) ? "N/A" : formatVal(v, m.fmt, m.decimals)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <footer className="text-xs text-muted-foreground text-center py-4 border-t border-border">
          Performance as of {DATA_DATES.performanceAsOf} · Holdings as of {DATA_DATES.holdingsAsOf}
        </footer>
      </main>
    </div>
  );
}
