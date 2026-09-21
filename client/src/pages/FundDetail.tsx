/*
 * Fund Detail — deep-dive page per fund
 */
import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  getFundById,
  DATA_DATES,
  type Fund,
} from "@/lib/fundData";
import { useAsOf, getKpisForAsOf, formatAsOfDate } from "@/lib/asOfContext";
import { DateSelector } from "@/components/DateSelector";
import { ReturnExplorer } from "@/components/ReturnExplorer";
import { useBenchmarks } from "@/lib/benchmarkContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  ValueCell,
  StarRating,
  ClassBadge,
  SB1Logo,
  CHART_COLORS,
  formatCurrencyNOK,
} from "@/components/shared";

function ProfileItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm font-medium text-foreground mt-1 break-words">{value}</div>
    </div>
  );
}

function KpiRow({
  label,
  value,
  format = "pct",
  decimals = 2,
}: {
  label: string;
  value: number | null;
  format?: "pct" | "num";
  decimals?: number;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {format === "pct" ? (
        <ValueCell value={value} decimals={decimals} />
      ) : value === null ? (
        <span className="text-muted-foreground font-mono text-sm">N/A</span>
      ) : (
        <span className="font-mono text-sm">{value.toFixed(decimals)}</span>
      )}
    </div>
  );
}

export default function FundDetail() {
  const [, params] = useRoute("/fund/:id");
  const fund: Fund | undefined = params ? getFundById(params.id) : undefined;
  if (!fund) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Fund not found</h2>
          <Link href="/">
            <Button variant="outline">Back to overview</Button>
          </Link>
        </div>
      </div>
    );
  }
  return <FundDetailContent key={fund.id} fund={fund} />;
}

function FundDetailContent({ fund }: { fund: Fund }) {
  const { asOf } = useAsOf();
  const { data: benchmarks } = useBenchmarks();
  const reportingBenchmark = benchmarks.series.find(s => s.id === benchmarks.assignments[fund.id]);
  const [kpiTab, setKpiTab] = useState("returns");
  const [exposureTab, setExposureTab] = useState(
    fund.assetClass === "Fixed Income" ? "fi-sectors" : "sectors"
  );
  const kpi = useMemo(() => getKpisForAsOf(fund, asOf), [fund, asOf]);
  // Last 24 months bars
  const monthly24 = useMemo(
    () =>
      fund.monthlyReturns.filter(r => r.date <= asOf).slice(-24).map((r) => ({
        date: r.date.slice(0, 7),
        value: r.value,
      })),
    [fund, asOf]
  );

  // Exposure helpers
  const sectors = fund.exposure.sectors || [];
  const regions = fund.exposure.regions || [];
  // Use full country list from enrichment if available; fall back to the legacy top-15.
  const allCountries = fund.enrichment?.countriesFull && fund.enrichment.countriesFull.length > 0
    ? fund.enrichment.countriesFull
    : (fund.exposure.countries || []);
  const countries = allCountries.slice(0, 20);
  const isFI = fund.assetClass === "Fixed Income";
  const fi = fund.fi;
  const fiSectors = fi?.fiSectors || [];
  const creditQuality = fi?.creditQuality || [];
  const enr = fund.enrichment;

  // FI maturity buckets as chart data
  const fiMaturityData = useMemo(() => {
    if (!enr?.fiMaturity?.portfolio) return [] as { name: string; weight: number }[];
    const p = enr.fiMaturity.portfolio;
    const labels: [string, number | null][] = [
      ["1-3år", p.y1to3], ["3-5år", p.y3to5], ["5-7år", p.y5to7], ["7-10år", p.y7to10],
      ["10-15år", p.y10to15], ["15-20år", p.y15to20], ["20-30år", p.y20to30], ["30år+", p.yOver30],
    ];
    return labels
      .filter(([_, v]) => v !== null && v !== 0)
      .map(([name, v]) => ({ name, weight: v as number }));
  }, [enr]);

  // DM/EM data
  const dmEmData = useMemo(() => {
    if (!enr?.marketMaturity) return null;
    const m = enr.marketMaturity;
    return [
      { name: "Utviklede markeder", weight: m.developedMarkets ?? 0, benchmark: m.benchmark.developedMarkets ?? 0 },
      { name: "Emerging markets", weight: m.emergingMarkets ?? 0, benchmark: m.benchmark.emergingMarkets ?? 0 },
    ];
  }, [enr]);

  // Equity style 9-cell grid
  const styleGridCells = useMemo(() => {
    if (!enr?.equityStyle?.breakdown) return null;
    const b = enr.equityStyle.breakdown;
    return [
      ["Large Value", b.largeValue], ["Large Blend", b.largeBlend], ["Large Growth", b.largeGrowth],
      ["Mid Value", b.midValue], ["Mid Blend", b.midBlend], ["Mid Growth", b.midGrowth],
      ["Small Value", b.smallValue], ["Small Blend", b.smallBlend], ["Small Growth", b.smallGrowth],
    ] as [string, number | null][];
  }, [enr]);

  // FI style 9-cell grid (credit × duration)
  const fiStyleGridCells = useMemo(() => {
    if (!enr?.fiStyle?.breakdown) return null;
    const b = enr.fiStyle.breakdown;
    return [
      ["Høy / Begrenset", b.highLimited], ["Høy / Moderat", b.highModerate], ["Høy / Lang", b.highExtensive],
      ["Medium / Begrenset", b.mediumLimited], ["Medium / Moderat", b.mediumModerate], ["Medium / Lang", b.mediumExtensive],
      ["Lav / Begrenset", b.lowLimited], ["Lav / Moderat", b.lowModerate], ["Lav / Lang", b.lowExtensive],
    ] as [string, number | null][];
  }, [enr]);

  const topHoldings = useMemo(
    () => [...fund.holdings].sort((a, b) => b.weight - a.weight).slice(0, 10),
    [fund]
  );

  const isEquity = fund.assetClass === "Equity";

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
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
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-4 min-w-0">
              <SB1Logo size={36} className="mt-1 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-semibold tracking-tight" data-testid="text-fund-name">
                    {fund.fullName}
                  </h1>
                  <ClassBadge assetClass={fund.assetClass} />
                </div>
                <div className="text-sm text-white/70 mt-1 font-mono">
                  {fund.isin} · {fund.morningstarCategory}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <DateSelector variant="dark" />
              {fund.medalistRating && (
                <div className="text-right">
                  <div className="text-[10px] text-white/60 uppercase tracking-wide">
                    Medalist
                  </div>
                  <div className="text-sm font-semibold mt-0.5">{fund.medalistRating}</div>
                </div>
              )}
              {fund.morningstarRating !== null && (
                <div className="text-right">
                  <div className="text-[10px] text-white/60 uppercase tracking-wide">
                    Star Rating
                  </div>
                  <div className="mt-1">
                    <StarRating rating={fund.morningstarRating} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
        {/* Fund Profile row */}
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
              <ProfileItem
                label="ISIN"
                value={<span className="font-mono">{fund.isin}</span>}
              />
              <ProfileItem
                label="Inception"
                value={<span className="font-mono">{fund.inceptionDate}</span>}
              />
              <ProfileItem
                label="Category"
                value={<span className="text-xs">{fund.morningstarCategory}</span>}
              />
              <ProfileItem
                label="Reporting benchmark"
                value={<span className="text-xs" data-testid="text-reporting-benchmark">{reportingBenchmark?.name ?? "Not assigned"}</span>}
              />
              <ProfileItem
                label="Fund Size"
                value={
                  <span className="font-mono">
                    {fund.fundSizeFormatted || (fund.fundSize === null ? "N/A" : formatCurrencyNOK(fund.fundSize))}
                  </span>
                }
              />
              <ProfileItem
                label={`NAV (${fund.displayCurrency})`}
                value={
                  <>
                    <div className="font-mono">{fund.nav?.toFixed(4) ?? "N/A"}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {fund.navDate}
                    </div>
                  </>
                }
              />
            </div>
          </CardContent>
        </Card>

        <ReturnExplorer key={`${fund.id}-${asOf}`} fund={fund} asOf={asOf} />

        {/* KPI Scorecard tabs */}
        <Card>
          <CardContent className="p-5">
            <Tabs value={kpiTab} onValueChange={setKpiTab}>
              <TabsList className="mb-4 flex-wrap h-auto">
                <TabsTrigger value="returns" data-testid="tab-returns">Returns</TabsTrigger>
                <TabsTrigger value="risk" data-testid="tab-risk">Risk</TabsTrigger>
                <TabsTrigger value="risk-adj" data-testid="tab-risk-adj">Risk-Adjusted</TabsTrigger>
                <TabsTrigger value="relative" data-testid="tab-relative">Relative</TabsTrigger>
                {isEquity && (
                  <TabsTrigger value="style" data-testid="tab-style">
                    Style & Valuation
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="returns">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <KpiRow label="1 Month" value={kpi!.return1M} />
                  <KpiRow label="YTD" value={kpi!.returnYTD} />
                  <KpiRow label="6 Months" value={kpi!.return6M} />
                  <KpiRow label="1 Year" value={kpi!.return1Y} />
                  <KpiRow label="3 Year (Annualized)" value={kpi!.return3Y} />
                  <KpiRow label="5 Year (Annualized)" value={kpi!.return5Y} />
                  <KpiRow label="10 Year (Annualized)" value={fund.return10Y} />
                </div>
              </TabsContent>

              <TabsContent value="risk">
                <p className="text-xs text-muted-foreground mb-3" data-testid="text-legacy-risk-benchmark">Benchmark-dependent risk metrics below are legacy provider measures. They have not been recalculated against the reporting benchmark used in the total-return charts.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <KpiRow label="Std Dev 3Y" value={kpi!.stdDev3Y} />
                  <KpiRow label="Std Dev 5Y" value={fund.stdDev5Y} />
                  <KpiRow label="Max Drawdown" value={fund.maxDrawdown} />
                  <KpiRow label="Tracking Error 3Y" value={fund.trackingError3Y} />
                  <KpiRow
                    label="Downside Capture 3Y"
                    value={fund.downsideCapture3Y}
                    format="num"
                  />
                  <KpiRow
                    label="Upside Capture 3Y"
                    value={fund.upsideCapture3Y}
                    format="num"
                  />
                </div>
              </TabsContent>

              <TabsContent value="risk-adj">
                <p className="text-xs text-muted-foreground mb-3" data-testid="text-legacy-risk-adjusted-benchmark">Benchmark-dependent ratios below are legacy provider measures, not recalculated against the reporting benchmark used in the total-return charts.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <KpiRow label="Sharpe Ratio 3Y" value={kpi!.sharpe3Y} format="num" />
                  <KpiRow label="Sharpe Ratio 5Y" value={fund.sharpe5Y} format="num" />
                  <KpiRow label="Sortino 3Y" value={fund.sortino3Y} format="num" />
                  <KpiRow
                    label="Information Ratio 3Y"
                    value={fund.infoRatio3Y}
                    format="num"
                  />
                  <KpiRow
                    label="Information Ratio 5Y"
                    value={fund.infoRatio5Y}
                    format="num"
                  />
                  <KpiRow
                    label="Appraisal Ratio"
                    value={fund.appraisalRatio}
                    format="num"
                  />
                </div>
              </TabsContent>

              <TabsContent value="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <KpiRow label="Alpha 3Y" value={fund.alpha3Y} />
                  <KpiRow label="Alpha 5Y" value={fund.alpha5Y} />
                  <KpiRow label="Beta 3Y" value={fund.beta3Y} format="num" />
                  <KpiRow label="Beta 5Y" value={fund.beta5Y} format="num" />
                  <KpiRow label="R-Squared 3Y" value={fund.rSquared3Y} format="num" />
                  <KpiRow
                    label="Downside Capture 5Y"
                    value={fund.downsideCapture5Y}
                    format="num"
                  />
                </div>
              </TabsContent>

              {isEquity && (
                <TabsContent value="style">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <KpiRow label="P/E" value={fund.pe} format="num" />
                    <KpiRow label="P/B" value={fund.pb} format="num" />
                    <KpiRow label="P/CF" value={fund.pcf} format="num" />
                    <KpiRow label="P/S" value={fund.ps} format="num" />
                    <KpiRow label="P/FCF" value={fund.pfcf} format="num" />
                    <KpiRow label="LT Earnings Growth" value={fund.ltEarningsGrowth} />
                    <KpiRow label="Hist Earnings Growth" value={fund.histEarningsGrowth} />
                    <KpiRow label="Sales Growth" value={fund.salesGrowth} />
                    <KpiRow label="Net Margin" value={fund.netMargin} />
                    <KpiRow label="ROE" value={fund.roe} />
                    <KpiRow label="ROA" value={fund.roa} />
                    <KpiRow label="Debt to Capital" value={fund.debtToCapital} />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* Monthly Returns bars (24 mnd) */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-base font-semibold mb-1">Monthly Returns — Last 24 Months</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Green = positive · Red = negative
            </p>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={monthly24} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                    interval={2}
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
                  <Bar dataKey="value">
                    {monthly24.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.value >= 0 ? "hsl(var(--sb1-positive))" : "hsl(var(--sb1-negative))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Exposure + Top Holdings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-base font-semibold">Exposure</h2>
                <Tabs value={exposureTab} onValueChange={setExposureTab} className="min-w-0 max-w-full">
                  <TabsList className="h-auto flex-wrap justify-start">
                    {!isFI && (
                      <TabsTrigger value="sectors" data-testid="tab-sectors">
                        Sectors
                      </TabsTrigger>
                    )}
                    {isFI && (
                      <TabsTrigger value="fi-sectors" data-testid="tab-fi-sectors">
                        FI Sectors
                      </TabsTrigger>
                    )}
                    {isFI && (
                      <TabsTrigger value="credit" data-testid="tab-credit">
                        Kreditt
                      </TabsTrigger>
                    )}
                    {isFI && fiMaturityData.length > 0 && (
                      <TabsTrigger value="maturity" data-testid="tab-maturity">
                        Modning
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="regions" data-testid="tab-regions">
                      Regioner
                    </TabsTrigger>
                    <TabsTrigger value="countries" data-testid="tab-countries">
                      Land
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {exposureTab === "sectors" && (
                <div className="h-80">
                  <ResponsiveContainer>
                    <BarChart
                      data={sectors}
                      layout="vertical"
                      margin={{ top: 5, right: 30, bottom: 5, left: 70 }}
                    >
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        unit="%"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 11 }}
                        width={70}
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
                      <Bar dataKey="weight" fill="#1a3c7e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {exposureTab === "regions" && regions.length === 0 && (
                <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
                  Region-data ikke tilgjengelig for dette fondet.
                </div>
              )}
              {exposureTab === "regions" && regions.length > 0 && (
                <div className="h-80">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={regions}
                        dataKey="weight"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={1}
                        stroke="hsl(var(--background))"
                      >
                        {regions.map((_, i) => (
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
                        formatter={(v: any) =>
                          typeof v === "number" ? `${v.toFixed(2)}%` : "—"
                        }
                      />
                      <Legend
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: 10, lineHeight: "14px" }}
                        iconSize={8}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {exposureTab === "countries" && countries.length === 0 && (
                <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
                  Land-spesifikk fordeling ikke tilgjengelig for dette fondet (kun overordnede regioner).
                </div>
              )}
              {exposureTab === "countries" && countries.length > 0 && (
                <div className="h-80">
                  <ResponsiveContainer>
                    <BarChart
                      data={countries}
                      layout="vertical"
                      margin={{ top: 5, right: 30, bottom: 5, left: 80 }}
                    >
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        unit="%"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 11 }}
                        width={80}
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
                      <Bar dataKey="weight" fill="#1a3c7e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {exposureTab === "fi-sectors" && (
                <div className="h-80">
                  {fiSectors.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                      FI-sektorfordeling ikke tilgjengelig fra Morningstar for dette fondet.
                    </div>
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={fiSectors} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 110 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                        <XAxis type="number" unit="%" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} width={110} />
                        <RechartsTooltip
                          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          formatter={(v: any) => (typeof v === "number" ? `${v.toFixed(2)}%` : "—")}
                        />
                        <Bar dataKey="weight" fill="#1a3c7e" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {exposureTab === "credit" && (
                <div className="h-80">
                  {creditQuality.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                      Detaljert kredittkvalitet-fordeling ikke tilgjengelig fra Morningstar.
                      {fi?.averageCreditQuality && (
                        <span className="ml-1">Gjennomsnittlig: <span className="font-mono text-foreground">{fi.averageCreditQuality}</span></span>
                      )}
                    </div>
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={creditQuality} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 120 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                        <XAxis type="number" unit="%" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} width={120} />
                        <RechartsTooltip
                          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          formatter={(v: any) => (typeof v === "number" ? `${v.toFixed(2)}%` : "—")}
                        />
                        <Bar dataKey="weight" fill="#1a3c7e" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {exposureTab === "maturity" && (
                <div className="h-80">
                  {fiMaturityData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                      Modningsfordeling ikke tilgjengelig for dette fondet.
                    </div>
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={fiMaturityData} margin={{ top: 5, right: 20, bottom: 20, left: 5 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                        <YAxis unit="%" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                        <RechartsTooltip
                          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          formatter={(v: any) => (typeof v === "number" ? `${v.toFixed(2)}%` : "—")}
                        />
                        <Bar dataKey="weight" fill="#1a3c7e" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {isFI && fi && (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-base font-semibold mb-3">Fixed Income Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <KpiRow label="Yield to Maturity" value={fi.yieldToMaturity} />
                  <KpiRow label="Effective Duration (yrs)" value={fi.effectiveDuration} format="num" />
                  <KpiRow label="Modified Duration (yrs)" value={fi.modifiedDuration} format="num" />
                  <KpiRow label="Average Maturity (yrs)" value={fi.averageMaturity} format="num" />
                  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">Average Credit Quality</span>
                    <span className="font-mono text-sm">{fi.averageCreditQuality ?? "N/A"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-5">
              <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-base font-semibold">Top 10 Holdings</h2>
                <span className="text-xs text-muted-foreground font-mono">
                  As of {fund.holdingsDate}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Holding
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Weight
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topHoldings.length === 0 && (
                      <tr>
                        <td
                          colSpan={2}
                          className="text-center text-sm text-muted-foreground py-6"
                        >
                          No holdings data available
                        </td>
                      </tr>
                    )}
                    {topHoldings.map((h, i) => (
                      <tr
                        key={`${h.name}-${i}`}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-2 text-sm">{h.name}</td>
                        <td className="px-3 py-2 text-right font-mono text-sm">
                          {h.weight.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Underliggende fond-karakteristikker (utvidet) */}
        {enr && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DM/EM card — equity funds only */}
            {isEquity && dmEmData && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-base font-semibold mb-3">Utviklede vs. emerging markeder</h2>
                  <div className="space-y-3">
                    {dmEmData.map((row) => (
                      <div key={row.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-foreground">{row.name}</span>
                          <span className="font-mono">{row.weight.toFixed(2)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden relative">
                          <div
                            className="h-full bg-[#1a3c7e]"
                            style={{ width: `${Math.min(100, row.weight)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5 font-mono">
                          <span>Benchmark: {row.benchmark.toFixed(2)}%</span>
                          <span className={row.weight - row.benchmark >= 0 ? "text-[hsl(var(--sb1-positive))]" : "text-[hsl(var(--sb1-negative))]"}>
                            {row.weight - row.benchmark >= 0 ? "+" : ""}{(row.weight - row.benchmark).toFixed(2)}pp
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Equity Style Matrix — equity funds only */}
            {isEquity && styleGridCells && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                    <h2 className="text-base font-semibold">Stil-matrise</h2>
                    {enr.equityStyle?.avgMarketCap != null && (
                      <span className="text-xs text-muted-foreground font-mono">
                        Gj.snitt mkt cap: {Math.round(enr.equityStyle.avgMarketCap).toLocaleString("no-NO")}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1 items-stretch">
                    <div />
                    <div className="text-[10px] font-semibold text-muted-foreground text-center uppercase tracking-wide pb-1">Value</div>
                    <div className="text-[10px] font-semibold text-muted-foreground text-center uppercase tracking-wide pb-1">Blend</div>
                    <div className="text-[10px] font-semibold text-muted-foreground text-center uppercase tracking-wide pb-1">Growth</div>
                    {(["Large", "Mid", "Small"] as const).map((row, rIdx) => (
                      <>
                        <div key={`label-${row}`} className="text-[10px] font-semibold text-muted-foreground self-center uppercase tracking-wide pr-2 text-right">{row}</div>
                        {[0, 1, 2].map((col) => {
                          const idx = rIdx * 3 + col;
                          const cell = styleGridCells[idx];
                          const v = cell[1];
                          const pct = v ?? 0;
                          const intensity = Math.min(1, pct / 50);
                          return (
                            <div
                              key={`${row}-${col}`}
                              className="aspect-square flex items-center justify-center text-sm font-mono border border-border rounded"
                              style={{ background: `rgba(26, 60, 126, ${intensity})`, color: intensity > 0.5 ? "white" : "hsl(var(--foreground))" }}
                              title={cell[0]}
                            >
                              {pct > 0 ? `${pct.toFixed(0)}%` : ""}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* FI Style Matrix — fixed income only */}
            {isFI && fiStyleGridCells && fiStyleGridCells.some(c => c[1] !== null && c[1] !== 0) && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                    <h2 className="text-base font-semibold">Stil-matrise (kreditt × durasjon)</h2>
                    {enr.fiStyle?.effectiveDuration != null && (
                      <span className="text-xs text-muted-foreground font-mono">
                        Effektiv durasjon: {enr.fiStyle.effectiveDuration.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1 items-stretch">
                    <div />
                    <div className="text-[10px] font-semibold text-muted-foreground text-center uppercase tracking-wide pb-1">Begrenset</div>
                    <div className="text-[10px] font-semibold text-muted-foreground text-center uppercase tracking-wide pb-1">Moderat</div>
                    <div className="text-[10px] font-semibold text-muted-foreground text-center uppercase tracking-wide pb-1">Lang</div>
                    {(["Høy", "Medium", "Lav"] as const).map((row, rIdx) => (
                      <>
                        <div key={`fi-label-${row}`} className="text-[10px] font-semibold text-muted-foreground self-center uppercase tracking-wide pr-2 text-right">{row} kvalitet</div>
                        {[0, 1, 2].map((col) => {
                          const idx = rIdx * 3 + col;
                          const cell = fiStyleGridCells[idx];
                          const v = cell[1];
                          const pct = v ?? 0;
                          const intensity = Math.min(1, pct / 50);
                          return (
                            <div
                              key={`fi-${row}-${col}`}
                              className="aspect-square flex items-center justify-center text-sm font-mono border border-border rounded"
                              style={{ background: `rgba(26, 60, 126, ${intensity})`, color: intensity > 0.5 ? "white" : "hsl(var(--foreground))" }}
                              title={cell[0]}
                            >
                              {pct > 0 ? `${pct.toFixed(0)}%` : ""}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Equity vs benchmark statistics — equity funds only */}
            {isEquity && enr.equityStatistics && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-base font-semibold mb-3">Verdsettelse vs. benchmark</h2>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-1">Nøkkeltall</th>
                        <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-1">Portefølje</th>
                        <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-1">Benchmark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "P/E", p: enr.equityStatistics.portfolio.pe, b: enr.equityStatistics.benchmark.pe, fmt: (v: number) => v.toFixed(2) },
                        { label: "P/B", p: enr.equityStatistics.portfolio.pb, b: enr.equityStatistics.benchmark.pb, fmt: (v: number) => v.toFixed(2) },
                        { label: "P/CF", p: enr.equityStatistics.portfolio.pcf, b: enr.equityStatistics.benchmark.pcf, fmt: (v: number) => v.toFixed(2) },
                        { label: "P/S", p: enr.equityStatistics.portfolio.ps, b: enr.equityStatistics.benchmark.ps, fmt: (v: number) => v.toFixed(2) },
                        { label: "ROE %", p: enr.equityStatistics.portfolio.roe, b: enr.equityStatistics.benchmark.roe, fmt: (v: number) => `${v.toFixed(1)}%` },
                        { label: "ROA %", p: enr.equityStatistics.portfolio.roa, b: enr.equityStatistics.benchmark.roa, fmt: (v: number) => `${v.toFixed(1)}%` },
                        { label: "Net margin %", p: enr.equityStatistics.portfolio.netMargin, b: enr.equityStatistics.benchmark.netMargin, fmt: (v: number) => `${v.toFixed(1)}%` },
                        { label: "Gjeld / Kapital", p: enr.equityStatistics.portfolio.debtCapital, b: enr.equityStatistics.benchmark.debtCapital, fmt: (v: number) => `${v.toFixed(1)}%` },
                      ].map((r) => (
                        <tr key={r.label} className="border-b border-border last:border-0">
                          <td className="py-1.5 text-sm">{r.label}</td>
                          <td className="py-1.5 text-right font-mono text-sm">{r.p != null ? r.fmt(r.p) : "—"}</td>
                          <td className="py-1.5 text-right font-mono text-sm text-muted-foreground">{r.b != null ? r.fmt(r.b) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* FI manager-source card */}
            {isFI && enr.manager && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                    <h2 className="text-base font-semibold">Forvalter-rapportert nivellering</h2>
                    {enr.manager.asOf && (
                      <span className="text-xs text-muted-foreground font-mono">Per {enr.manager.asOf}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <KpiRow label={enr.manager.ytmMetric ?? "YTM"} value={enr.manager.ytm} format="pct" />
                    <KpiRow label="Effektiv durasjon (år)" value={enr.manager.duration} format="num" />
                    <KpiRow label="Gj.snitt løpetid (år)" value={enr.manager.avgMaturity} format="num" />
                  </div>
                  {enr.manager.sourceUrl && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Kilde: <a href={enr.manager.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#1a3c7e] underline hover:no-underline">Forvalter-faktaark</a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Asset Allocation (net) — any fund */}
            {enr.assetAllocation && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-base font-semibold mb-3">Asset Allocation (netto)</h2>
                  <div className="space-y-2">
                    {[
                      { label: "US Equity", p: enr.assetAllocation.portfolio.usEquity },
                      { label: "Non-US Equity", p: enr.assetAllocation.portfolio.nonUsEquity },
                      { label: "Obligasjoner", p: enr.assetAllocation.portfolio.bonds },
                      { label: "Kontanter (netto)", p: enr.assetAllocation.portfolio.cash },
                      { label: "Annet", p: enr.assetAllocation.portfolio.other },
                    ]
                      .filter((r) => r.p !== null && r.p !== 0)
                      .map((r) => (
                        <div key={r.label}>
                          <div className="flex items-center justify-between text-sm mb-0.5">
                            <span className="text-foreground">{r.label}</span>
                            <span className="font-mono">{(r.p as number).toFixed(2)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full ${(r.p as number) < 0 ? "bg-[hsl(var(--sb1-negative))]" : "bg-[#1a3c7e]"}`}
                              style={{ width: `${Math.min(100, Math.abs(r.p as number))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <footer className="text-xs text-muted-foreground text-center py-4 border-t border-border">
          Performance as of {DATA_DATES.performanceAsOf} · Holdings as of {DATA_DATES.holdingsAsOf}
        </footer>
      </main>
    </div>
  );
}
