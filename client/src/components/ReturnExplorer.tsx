import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Download, Database } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Fund } from "@/lib/fundData";
import { useBenchmarks, downloadText } from "@/lib/benchmarkContext";
import { PERIODS, rangeStart, monthEnd, fundGrowth, indexGrowth, totalReturn, type Period } from "@shared/performance";

const num = (v: number) => v.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v: number | null) => v === null ? "N/A" : `${v > 0 ? "+" : ""}${num(v)}%`;
const dateLabel = (d: string) => d.split("-").reverse().join(".");
const fundColor = "hsl(var(--chart-1))";
const benchmarkColor = "hsl(var(--chart-4))";
const tip = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" };
const selectClass = "h-11 rounded-md border border-input bg-background px-3 text-sm w-full";

export function ReturnExplorer({ fund, asOf }: { fund: Fund; asOf: string }) {
  const { data, preview } = useBenchmarks();
  const returns = useMemo(() => [...fund.monthlyReturns].sort((a, b) => a.date.localeCompare(b.date)), [fund]);
  const end = asOf;
  const [period, setPeriod] = useState<Period | "Custom">("6M");
  const [customStart, setCustomStart] = useState(end ? rangeStart(end, "6M") : "");
  const [customEnd, setCustomEnd] = useState(end || "");
  const [showBenchmark, setShowBenchmark] = useState(true);
  const series = data.series.find(s => s.id === data.assignments[fund.id]);
  if (!end || !returns.some(r => r.date === end)) return <Card><CardContent className="p-6" data-testid="status-fund-data-missing">
    No monthly fund return at the selected reporting date ({asOf}). The chart is not rolled back to an earlier endpoint.
  </CardContent></Card>;

  const start = period === "Custom" ? customStart : rangeStart(end, period);
  const finish = period === "Custom" ? customEnd : end;
  const valid = start < finish && finish <= end;
  const growth = valid ? fundGrowth(returns, start, finish) : null;
  const bg = growth ? indexGrowth(series, start, finish) : null;
  const total = totalReturn(growth), benchTotal = totalReturn(bg);
  const points = growth?.map((p, i) => ({ date: p.date, fund: p.value, benchmark: bg?.[i].value })) || [];
  const bars = PERIODS.map(p => {
    const s = rangeStart(end, p);
    const f = fundGrowth(returns, s, end);
    return { period: p, start: s, fund: totalReturn(f), benchmark: f ? totalReturn(indexGrowth(series, s, end)) : null };
  });
  const dates = [...new Set([monthEnd(returns[0].date, -1), ...returns.filter(r => r.date <= end).map(r => r.date)])];
  const warn = !series ? "No official benchmark assigned. Import index levels and confirm the mapping to enable comparisons."
    : !bg ? `Benchmark unavailable for this complete range. Available levels: ${dateLabel(series.levels[0].date)} to ${dateLabel(series.levels.at(-1)!.date)}.`
    : null;

  return <section className="space-y-6" aria-label="Total return analysis" data-testid="return-explorer">
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h2 className="text-lg font-semibold">Total return</h2>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-return-asof">
              NOK · Base 100 · Monthly observations · Reporting date {dateLabel(end)}
            </p>
          </div>
          <Button variant="outline" data-testid="button-export-growth" disabled={!growth} onClick={() => downloadText(
            `${fund.id}_${start}_${finish}_base100.csv`,
            `date,fund_base100,benchmark_base100\n${points.map(p => `${p.date},${p.fund.toFixed(8)},${p.benchmark?.toFixed(8) ?? ""}`).join("\n")}`
          )}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-5" role="group" aria-label="Return period">
          {[...PERIODS, "Custom" as const].map(p => <Button key={p}
            variant={period === p ? "default" : "outline"} className="min-h-11 min-w-11"
            aria-pressed={period === p} data-testid={`period-${p}`}
            disabled={p !== "Custom" && !fundGrowth(returns, rangeStart(end, p), end)}
            title={p !== "Custom" && !fundGrowth(returns, rangeStart(end, p), end) ? "Insufficient continuous fund history" : undefined}
            onClick={() => setPeriod(p)}>{p}</Button>)}
        </div>
        {period === "Custom" && <div className="grid sm:grid-cols-2 gap-3 mt-4 max-w-xl">
          <label className="text-sm">Start month-end
            <select className={`${selectClass} mt-1`} data-testid="select-start" value={customStart} onChange={e => setCustomStart(e.target.value)}>
              {!dates.includes(customStart) && <option value={customStart}>{dateLabel(customStart)}</option>}
              {dates.map(d => <option key={d} value={d}>{dateLabel(d)}</option>)}
            </select>
          </label>
          <label className="text-sm">End month-end
            <select className={`${selectClass} mt-1`} data-testid="select-end" value={customEnd} onChange={e => setCustomEnd(e.target.value)}>
              {!dates.includes(customEnd) && <option value={customEnd}>{dateLabel(customEnd)}</option>}
              {dates.map(d => <option key={d} value={d}>{dateLabel(d)}</option>)}
            </select>
          </label>
          <p className="text-xs text-muted-foreground sm:col-span-2">Month-end to month-end only. No daily interpolation. The return of the starting month is excluded.</p>
        </div>}
        <div className="flex flex-wrap gap-x-10 gap-y-4 my-6">
          <div><p className="text-xs text-muted-foreground">Fund total return</p><p className="font-mono text-xl font-semibold mt-1" data-testid="value-range-return">{pct(total)}</p></div>
          <div><p className="text-xs text-muted-foreground">Benchmark total return</p><p className="font-mono text-xl font-semibold mt-1" data-testid="value-benchmark-return">{pct(benchTotal)}</p></div>
          <div><p className="text-xs text-muted-foreground">Excess return</p><p className="font-mono text-xl font-semibold mt-1" data-testid="value-excess-return">{total !== null && benchTotal !== null ? `${num(total - benchTotal)} pp` : "N/A"}</p></div>
        </div>
        <p className="text-xs text-muted-foreground mb-3" data-testid="text-effective-range">{dateLabel(start)} to {dateLabel(finish)} · {growth ? growth.length - 1 : 0} monthly {growth?.length === 2 ? "return" : "returns"} · Start = 100</p>
        {!growth ? <div role="alert" data-testid="status-range-error" className="p-8 bg-muted rounded text-sm">
          {!valid ? "Start must precede end, and end cannot exceed the reporting date." : "Insufficient continuous fund history for this exact interval. Select another range."}
        </div> : <div className="h-72 sm:h-80" data-testid="chart-base100">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={d => d.slice(0, 7)} minTickGap={45} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={["auto", "auto"]} tickFormatter={v => Number(v).toFixed(0)} tick={{ fontSize: 12 }} width={45} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tip} labelFormatter={d => dateLabel(String(d))} formatter={(v: number) => num(v)} />
              <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 4" />
              <Line type="linear" dataKey="fund" name={fund.shortName} stroke={fundColor} strokeWidth={2.5} dot={points.length < 8} isAnimationActive={false} />
              {bg && showBenchmark && <Line type="linear" dataKey="benchmark" name={series!.name} stroke={benchmarkColor} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4 text-sm">
          <span className="flex items-center gap-2"><span className="w-5 border-t-[3px]" style={{ borderColor: fundColor }} />{fund.shortName}</span>
          {series && <label className="flex items-center gap-2 min-h-11 cursor-pointer break-words">
            <input type="checkbox" checked={showBenchmark} onChange={e => setShowBenchmark(e.target.checked)} data-testid="toggle-benchmark" />
            <span className="w-5 border-t-2 border-dashed shrink-0" style={{ borderColor: benchmarkColor }} />{series.name}
          </label>}
        </div>
        {series && <p className="text-xs text-muted-foreground mt-2" data-testid="text-benchmark-metadata">{series.provider} · {series.returnType} · NOK · {series.hedging} · {preview ? "Session preview, not saved" : "Published data"}</p>}
        {warn && <div className="rounded-md bg-muted p-3 mt-4 text-sm" data-testid="status-benchmark">{warn}</div>}
        <Link href="/benchmarks" data-testid="link-manage-benchmarks" className="inline-flex items-center gap-2 min-h-11 text-sm underline underline-offset-4 mt-2"><Database className="w-4 h-4" />Benchmark data &amp; assignments</Link>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div><h2 className="text-lg font-semibold">Returns by period</h2>
            <p className="text-sm text-muted-foreground mt-1">Cumulative total return in NOK, not annualised · All periods end {dateLabel(end)}</p></div>
          <Button variant="outline" data-testid="button-export-periods" onClick={() => downloadText(
            `${fund.id}_${end}_period_returns.csv`,
            `period,start,end,fund_return_pct,benchmark_return_pct\n${bars.map(r => `${r.period},${r.start},${end},${r.fund?.toFixed(8) ?? ""},${r.benchmark?.toFixed(8) ?? ""}`).join("\n")}`
          )}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
        </div>
        <div className="h-72 mt-5" data-testid="chart-period-bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 12, right: 10, left: 0, bottom: 0 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} interval={0} stroke="hsl(var(--muted-foreground))" />
              <YAxis width={45} tick={{ fontSize: 12 }} tickFormatter={v => `${Number(v).toFixed(0)}%`} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tip} formatter={(v: number) => pct(v)} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
              <Bar dataKey="fund" name={fund.shortName} fill={fundColor} maxBarSize={32} isAnimationActive={false} />
              {series && showBenchmark && <Bar dataKey="benchmark" name={series.name} fill={benchmarkColor} maxBarSize={32} isAnimationActive={false} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs mt-3" aria-label="Period chart legend">
          <span className="inline-flex items-center gap-2"><span className="w-3 h-3" style={{ background: fundColor }} />{fund.shortName}</span>
          {series && showBenchmark && <span className="inline-flex items-center gap-2"><span className="w-3 h-3" style={{ background: benchmarkColor }} />{series.name}</span>}
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm text-right" data-testid="table-period-returns">
            <caption className="sr-only">Cumulative total returns for fixed periods ending {end}</caption>
            <thead><tr><th className="text-left p-2">Period</th><th className="p-2">Fund</th><th className="p-2">Benchmark</th><th className="p-2">Excess (pp)</th></tr></thead>
            <tbody>{bars.map(r => <tr key={r.period} className="border-t border-border" data-testid={`row-period-${r.period}`}>
              <th className="text-left p-2 font-medium">{r.period}</th><td className="p-2 font-mono">{pct(r.fund)}</td>
              <td className="p-2 font-mono">{pct(r.benchmark)}</td><td className="p-2 font-mono">{r.fund !== null && r.benchmark !== null ? num(r.fund - r.benchmark) : "N/A"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">N/A means insufficient data, never zero return. Fixed-period bars use the reporting date, independently of the custom chart range. Existing 3Y/5Y KPI cards elsewhere remain annualised.</p>
      </CardContent>
    </Card>
  </section>;
}
