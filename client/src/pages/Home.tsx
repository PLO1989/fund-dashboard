/*
 * SpareBank 1 Forvaltning — Portfolio Overview (Home)
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  funds,
  equityFunds,
  fixedIncomeFunds,
  DATA_DATES,
  type Fund,
  type KpiSnapshot,
} from "@/lib/fundData";
import { useAsOf, getKpisForAsOf, formatAsOfDate } from "@/lib/asOfContext";
import { DateSelector } from "@/components/DateSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GitCompare,
  TrendingUp,
  Activity,
  Briefcase,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  ValueCell,
  StarRating,
  ClassBadge,
  SB1Logo,
  CHART_COLORS,
  formatCurrencyNOK,
} from "@/components/shared";

type SortKey =
  | "name"
  | "class"
  | "ytd"
  | "6m"
  | "1y"
  | "3y"
  | "vol"
  | "sharpe"
  | "rating";
type SortDir = "asc" | "desc";

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align = "right",
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right" | "center";
}) {
  const active = currentSort === sortKey;
  const alignClass =
    align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right";
  return (
    <th className={`px-3 py-2.5 ${alignClass} text-xs font-semibold text-muted-foreground uppercase tracking-wide`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 ${
          align === "right" ? "ml-auto" : ""
        } hover:text-foreground transition-colors`}
        data-testid={`sort-${sortKey}`}
      >
        {label}
        {!active && <ArrowUpDown className="w-3 h-3 opacity-40" />}
        {active && currentDir === "asc" && <ArrowUp className="w-3 h-3" />}
        {active && currentDir === "desc" && <ArrowDown className="w-3 h-3" />}
      </button>
    </th>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {label}
            </div>
            <div
              className="font-mono text-2xl font-semibold text-foreground mt-1.5 tabular-nums"
              data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {value}
            </div>
            {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
          </div>
          <div className="w-10 h-10 rounded-md bg-sb1-navy/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-sb1-navy" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { asOf } = useAsOf();
  const [tab, setTab] = useState<"all" | "equity" | "fi">("all");
  const [sortKey, setSortKey] = useState<SortKey>("3y");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // KPI-er for valgt asOf-dato
  const kpisByFund = useMemo<Record<string, KpiSnapshot>>(() => {
    const m: Record<string, KpiSnapshot> = {};
    for (const f of funds) m[f.id] = getKpisForAsOf(f, asOf);
    return m;
  }, [asOf]);
  const k = (f: Fund) => kpisByFund[f.id];

  const list = useMemo<Fund[]>(() => {
    if (tab === "equity") return equityFunds;
    if (tab === "fi") return fixedIncomeFunds;
    return funds;
  }, [tab]);

  const sorted = useMemo(() => {
    const arr = [...list];
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const get = (f: Fund): number | string | null => {
        const kpi = k(f);
        switch (sortKey) {
          case "name":
            return f.shortName;
          case "class":
            return f.assetClass;
          case "ytd":
            return kpi.returnYTD;
          case "6m":
            return kpi.return6M;
          case "1y":
            return kpi.return1Y;
          case "3y":
            return kpi.return3Y;
          case "vol":
            return kpi.stdDev3Y;
          case "sharpe":
            return kpi.sharpe3Y;
          case "rating":
            return f.morningstarRating;
        }
      };
      const va = get(a);
      const vb = get(b);
      if (typeof va === "string" && typeof vb === "string") {
        return va.localeCompare(vb) * dir;
      }
      const na = va === null || va === undefined ? -Infinity : (va as number);
      const nb = vb === null || vb === undefined ? -Infinity : (vb as number);
      if (na === nb) return 0;
      return (na < nb ? -1 : 1) * dir;
    });
    return arr;
  }, [list, sortKey, sortDir, kpisByFund]);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "class" ? "asc" : "desc");
    }
  }

  // KPIs
  const totalAUM = useMemo(() => funds.reduce((s, f) => s + f.fundSize, 0), []);
  const avg1Y = useMemo(() => {
    const vals = funds.map((f) => k(f).return1Y).filter((v): v is number => v !== null);
    return vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  }, [kpisByFund]);
  const avgSharpe = useMemo(() => {
    const vals = funds.map((f) => k(f).sharpe3Y).filter((v): v is number => v !== null);
    return vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  }, [kpisByFund]);

  // Scatter
  const scatterData = useMemo(() => {
    return funds
      .filter((f) => k(f).stdDev3Y !== null && k(f).return3Y !== null)
      .map((f) => ({
        name: f.shortName,
        x: k(f).stdDev3Y!,
        y: k(f).return3Y!,
        assetClass: f.assetClass,
      }));
  }, [kpisByFund]);

  // AUM donut
  const aumData = useMemo(
    () =>
      funds.map((f) => ({
        name: f.shortName,
        value: f.fundSize,
      })),
    []
  );

  // Monthly returns bar chart — last 12 months across selected scope (use list)
  const monthlyBarData = useMemo(() => {
    // Collect last 12 months from all funds, indexed by YYYY-MM
    const monthSet = new Set<string>();
    list.forEach((f) => {
      f.monthlyReturns.slice(-12).forEach((r) => monthSet.add(r.date.slice(0, 7)));
    });
    const months = Array.from(monthSet).sort().slice(-12);
    return months.map((m) => {
      const row: any = { month: m };
      list.forEach((f) => {
        const r = f.monthlyReturns.find((mr) => mr.date.startsWith(m));
        row[f.shortName] = r ? r.value : null;
      });
      return row;
    });
  }, [list]);

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER — dark navy band */}
      <header className="bg-sb1-navy text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SB1Logo size={40} />
            <div>
              <h1 className="text-xl font-semibold tracking-tight" data-testid="text-header-title">
                SpareBank 1 Forvaltning
              </h1>
              <div className="text-sm text-white/70 -mt-0.5">Fund Dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DateSelector variant="dark" />
            <div className="hidden md:flex flex-col items-end text-[11px] text-white/60 leading-tight">
              <span>
                Holdings per{" "}
                <span className="font-mono text-white/80">{DATA_DATES.holdingsAsOf}</span>
              </span>
            </div>
            <Link href="/compare">
              <Button
                className="bg-white text-sb1-navy hover:bg-white/90 font-medium"
                data-testid="button-compare"
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Compare Funds
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        {/* KPI Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Wallet}
            label="Total AUM"
            value={formatCurrencyNOK(totalAUM)}
            sub="across 12 funds"
          />
          <KpiCard
            icon={TrendingUp}
            label="Avg Return 1Y"
            value={`${avg1Y >= 0 ? "+" : ""}${avg1Y.toFixed(2)}%`}
          />
          <KpiCard
            icon={Activity}
            label="Avg Sharpe 3Y"
            value={avgSharpe.toFixed(2)}
          />
          <KpiCard
            icon={Briefcase}
            label="Funds Managed"
            value="12"
            sub="6 Equity / 6 Fixed Income"
          />
        </section>

        {/* Tabs + Table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Fund Performance</h2>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-all">
                  All (12)
                </TabsTrigger>
                <TabsTrigger value="equity" data-testid="tab-equity">
                  Equity (6)
                </TabsTrigger>
                <TabsTrigger value="fi" data-testid="tab-fi">
                  Fixed Income (6)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 border-b border-border">
                  <tr>
                    <SortHeader
                      label="Fund"
                      sortKey="name"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={onSort}
                      align="left"
                    />
                    <SortHeader
                      label="Class"
                      sortKey="class"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={onSort}
                      align="left"
                    />
                    <SortHeader
                      label="YTD"
                      sortKey="ytd"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={onSort}
                    />
                    <SortHeader
                      label="6M"
                      sortKey="6m"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={onSort}
                    />
                    <SortHeader
                      label="1Y"
                      sortKey="1y"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={onSort}
                    />
                    <SortHeader
                      label="3Y Ann."
                      sortKey="3y"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={onSort}
                    />
                    <SortHeader
                      label="Vol 3Y"
                      sortKey="vol"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={onSort}
                    />
                    <SortHeader
                      label="Sharpe 3Y"
                      sortKey="sharpe"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={onSort}
                    />
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground">
                      Per dato
                    </th>
                    <SortHeader
                      label="Rating"
                      sortKey="rating"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={onSort}
                      align="center"
                    />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-border last:border-0 hover-elevate cursor-pointer"
                      data-testid={`row-fund-${f.id}`}
                    >
                      <td className="px-3 py-3">
                        <Link
                          href={`/fund/${f.id}`}
                          className="block group"
                        >
                          <div className="font-medium text-foreground group-hover:text-sb1-navy transition-colors">
                            {f.shortName}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {f.isin}
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <ClassBadge assetClass={f.assetClass} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ValueCell value={k(f).returnYTD} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ValueCell value={k(f).return6M} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ValueCell value={k(f).return1Y} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ValueCell value={k(f).return3Y} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        {k(f).stdDev3Y !== null ? (
                          <span className="font-mono text-sm">{k(f).stdDev3Y!.toFixed(2)}%</span>
                        ) : (
                          <span className="text-muted-foreground font-mono text-sm">N/A</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {k(f).sharpe3Y !== null ? (
                          <span className="font-mono text-sm">{k(f).sharpe3Y!.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground font-mono text-sm">N/A</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-muted-foreground font-mono">
                        {k(f).asOf}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          <StarRating rating={f.morningstarRating} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* Charts row */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Risk vs. Return (3Y)
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Annualized return vs. annualized volatility
              </p>
              <div className="h-72">
                <ResponsiveContainer>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Volatility"
                      unit="%"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                      label={{
                        value: "Volatility (3Y) %",
                        position: "insideBottom",
                        offset: -15,
                        style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Return"
                      unit="%"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                      label={{
                        value: "Return (3Y) %",
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                      }}
                    />
                    <RechartsTooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: any, name: string) => [`${value}%`, name]}
                      labelFormatter={(_, payload: any) =>
                        payload?.[0]?.payload?.name ?? ""
                      }
                    />
                    <Scatter data={scatterData}>
                      {scatterData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={d.assetClass === "Equity" ? "#1a3c7e" : "#e60000"}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sb1-navy" />
                  Equity
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sb1-red" />
                  Fixed Income
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">AUM Distribution</h3>
              <p className="text-xs text-muted-foreground mb-4">By fund (NOK)</p>
              <div className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={aumData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={1}
                      stroke="hsl(var(--background))"
                    >
                      {aumData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: any) => formatCurrencyNOK(v)}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: 10, lineHeight: "14px" }}
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Monthly Returns bar chart */}
        <section>
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Monthly Returns — Last 12 Months
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Grouped bar chart per fund
              </p>
              <div className="h-80">
                <ResponsiveContainer>
                  <BarChart data={monthlyBarData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                    />
                    <YAxis
                      unit="%"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: any) =>
                        typeof v === "number" ? `${v.toFixed(2)}%` : "—"
                      }
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 10 }}
                      iconSize={8}
                    />
                    {list.map((f, i) => (
                      <Bar
                        key={f.id}
                        dataKey={f.shortName}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="text-xs text-muted-foreground text-center py-4 border-t border-border">
          Data source: Morningstar · Performance as of {DATA_DATES.performanceAsOf} · Holdings as of {DATA_DATES.holdingsAsOf}
        </footer>
      </main>
    </div>
  );
}
