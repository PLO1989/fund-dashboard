import test from "node:test";
import assert from "node:assert/strict";
import { relativeRisk, benchmarkRiskKpis, monthDates, rangeStart, validatePackage } from "../shared/performance";
import type { BenchmarkSeries } from "../shared/schema";
import { funds, DATA_DATES } from "../client/src/lib/fundData";
import rawPackage from "../shared/benchmarkData.json";

const close = (a: number | null | undefined, b: number, tol = 1e-9) =>
  assert.ok(a != null && Math.abs(a - b) < tol, `${a} != ${b}`);
const start = "2026-05-31", end = "2026-08-31";
const dates = monthDates(start, end);
const fixture = (fundValues = [1, 2, 3], benchmarkValues = [0, 0, 0]) => {
  let level = 100;
  const series: BenchmarkSeries = {
    id: "TEST_ONLY", name: "Synthetic unit test only", provider: "UNIT_TEST",
    currency: "NOK", returnType: "TR", hedging: "NA",
    levels: [{ date: start, level }, ...dates.map((date, i) => ({ date, level: level *= 1 + benchmarkValues[i] / 100 }))],
  };
  return { series, returns: dates.map((date, i) => ({ date, value: fundValues[i] })) };
};

test("TE uses sample SD, percentage units and sqrt(12); IR uses arithmetic mean times 12", () => {
  const { returns, series } = fixture();
  const r = relativeRisk(returns, series, start, end)!;
  assert.equal(r.months, 3);
  close(r.trackingErrorPct, Math.sqrt(12));
  close(r.annualizedMeanActiveReturnPct, 24);
  close(r.informationRatio, 24 / Math.sqrt(12));
  assert.deepEqual(r.observations.map(p => p.activeReturnPct), [1, 2, 3]);
  const cagr = ((1.01 * 1.02 * 1.03) ** 4 - 1) * 100;
  assert.ok(Math.abs(r.informationRatio! - cagr / r.trackingErrorPct) > 0.1);
});

test("benchmark returns come from consecutive level ratios, not levels or cumulative returns", () => {
  const { returns, series } = fixture([3, 1, -2], [2, -1, 1]);
  const r = relativeRisk(returns, series, start, end)!;
  [1, 2, -3].forEach((value, i) => close(r.observations[i].activeReturnPct, value));
  close(r.trackingErrorPct, Math.sqrt(84));
  close(r.informationRatio, 0);
  const negative = relativeRisk(fixture([-1, -2, -3]).returns, fixture().series, start, end)!;
  close(negative.informationRatio, -24 / Math.sqrt(12));
});

test("constant active returns have zero TE and undefined IR, not infinity or zero IR", () => {
  for (const values of [[0, 0, 0], [2, 2, 2], [-1, -1, -1]]) {
    const f = fixture(values);
    const r = relativeRisk(f.returns, f.series, start, end)!;
    assert.equal(r.trackingErrorPct, 0);
    assert.equal(r.informationRatio, null);
  }
  const f = fixture([2, 2, 2], [2, 2, 2]);
  assert.equal(relativeRisk(f.returns, f.series, start, end)!.informationRatio, null);
});

test("exact boundaries are start-exclusive for fund returns, inclusive for opening index level", () => {
  const f = fixture();
  const returns = [{ date: start, value: 999 }, ...f.returns.toReversed(), { date: "2026-09-30", value: -99 }];
  const series = { ...f.series, levels: [...f.series.levels.toReversed(), { date: "2026-09-30", level: 999 }] };
  close(relativeRisk(returns, series, start, end)!.trackingErrorPct, Math.sqrt(12));
  assert.equal(relativeRisk(f.returns, { ...series, levels: series.levels.filter(p => p.date !== start) }, start, end), null);
});

test("missing fund or benchmark observations never shorten the window", () => {
  const f = fixture();
  for (let i = 0; i < 3; i++) {
    assert.equal(relativeRisk(f.returns.filter((_, j) => i !== j), f.series, start, end), null);
    assert.equal(relativeRisk(f.returns, { ...f.series, levels: f.series.levels.filter(p => p.date !== dates[i]) }, start, end), null);
  }
  assert.equal(relativeRisk(f.returns, undefined, start, end), null);
  assert.equal(relativeRisk(f.returns, f.series, end, start), null);
  assert.equal(relativeRisk(f.returns, f.series, start, start), null);
  assert.equal(relativeRisk(f.returns, f.series, "2026-07-31", end), null);
  assert.equal(relativeRisk(f.returns, f.series, "2026-05-30", end), null);
});

test("duplicate, malformed, nonfinite and nonpositive data fail closed", () => {
  const f = fixture();
  assert.equal(relativeRisk([...f.returns, f.returns[0]], f.series, start, end), null);
  assert.equal(relativeRisk(f.returns, { ...f.series, levels: [...f.series.levels, f.series.levels[0]] }, start, end), null);
  for (const value of [NaN, Infinity, -101]) {
    assert.equal(relativeRisk([{ ...f.returns[0], value }, ...f.returns.slice(1)], f.series, start, end), null);
  }
  for (const level of [NaN, Infinity, 0, -1]) {
    assert.equal(relativeRisk(f.returns, { ...f.series, levels: [{ ...f.series.levels[0], level }, ...f.series.levels.slice(1)] }, start, end), null);
  }
  assert.equal(relativeRisk(f.returns, { ...f.series, levels: [...f.series.levels, { date: "2026-07-15", level: 100 }] }, start, end), null);
  assert.equal(relativeRisk(f.returns, { ...f.series, currency: "USD" as "NOK" }, start, end), null);
});

test("all official mappings have exact 36/60-month windows except Cusana, without legacy fallback", () => {
  const pkg = validatePackage(rawPackage);
  let available = 0;
  for (const fund of funds) {
    const series = pkg.series.find(s => s.id === pkg.assignments[fund.id]);
    const risk = benchmarkRiskKpis(fund.monthlyReturns, series, DATA_DATES.performanceAsOf);
    if (fund.id === "F00001GU8B") {
      assert.equal(risk.threeYear, null); assert.equal(risk.fiveYear, null);
      assert.equal(risk.trackingError3Y, null); assert.equal(risk.infoRatio3Y, null);
      continue;
    }
    available++;
    for (const [period, metric, count] of [["3Y", risk.threeYear, 36], ["5Y", risk.fiveYear, 60]] as const) {
      assert.ok(metric, fund.id);
      assert.equal(metric.months, count);
      assert.equal(metric.start, rangeStart(DATA_DATES.performanceAsOf, period));
      assert.equal(metric.end, DATA_DATES.performanceAsOf);
      assert.equal(metric.observations.at(-1)!.date, DATA_DATES.performanceAsOf);
      // Independent variance/covariance identity, not the implementation's active-return SD.
      const xs = metric.observations.map(p => p.fundReturnPct);
      const ys = metric.observations.map(p => p.benchmarkReturnPct);
      const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
      const mx = mean(xs), my = mean(ys);
      const cov = (a: number[], b: number[], ma: number, mb: number) =>
        a.reduce((sum, v, i) => sum + (v - ma) * (b[i] - mb), 0) / (a.length - 1);
      close(metric.trackingErrorPct, Math.sqrt(12 * (cov(xs, xs, mx, mx) + cov(ys, ys, my, my) - 2 * cov(xs, ys, mx, my))));
      close(metric.informationRatio, 12 * (mx - my) / metric.trackingErrorPct);
    }
    const missing = benchmarkRiskKpis(fund.monthlyReturns, undefined, DATA_DATES.performanceAsOf);
    assert.equal(missing.trackingError3Y, null);
    assert.equal(missing.infoRatio5Y, null);
  }
  assert.equal(available, 12);
});

test("selected reporting dates and assignment changes recompute rather than use latest or provider metrics", () => {
  const pkg = validatePackage(rawPackage);
  const fund = funds.find(f => f.id === "F0GBR04NJK")!;
  const own = pkg.series.find(s => s.id === pkg.assignments[fund.id])!;
  const latest = benchmarkRiskKpis(fund.monthlyReturns, own, DATA_DATES.performanceAsOf);
  const past = benchmarkRiskKpis(fund.monthlyReturns, own, "2025-12-31");
  assert.equal(past.threeYear!.end, "2025-12-31");
  assert.equal(past.threeYear!.months, 36);
  assert.notEqual(latest.trackingError3Y, past.trackingError3Y);
  assert.notEqual(latest.trackingError3Y, fund.trackingError3Y);
  const other = benchmarkRiskKpis(fund.monthlyReturns, pkg.series.find(s => s.id === "MSCI_WORLD_NET_TR_NOK"), DATA_DATES.performanceAsOf);
  assert.notEqual(latest.trackingError3Y, other.trackingError3Y);
});
