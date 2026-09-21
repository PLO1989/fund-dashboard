import test from "node:test";
import assert from "node:assert/strict";
import { CSV_HEADER, fundGrowth, indexGrowth, rangeStart, monthEnd, monthDates, totalReturn, parseBenchmarkCsv, validatePackage, mergePackages } from "../shared/performance";
import type { BenchmarkPackage, BenchmarkSeries } from "../shared/schema";
import { funds, DATA_DATES } from "../client/src/lib/fundData";

const close = (a: number | null | undefined, b: number) => assert.ok(a != null && Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const empty: BenchmarkPackage = { version: 1, series: [], assignments: {} };
const fixture: BenchmarkSeries = {
  id: "TEST_ONLY", name: "Synthetic test fixture, never reporting data", provider: "UNIT_TEST",
  currency: "NOK", returnType: "TR", hedging: "NA",
  levels: [{ date: "2026-06-30", level: 200 }, { date: "2026-07-31", level: 220 }, { date: "2026-08-31", level: 231 }],
};
const csv = (date = "2026-08-31", level = "100", currency = "NOK", type = "TR") =>
  `${CSV_HEADER}\nTEST_ONLY,"Test, Index",UNIT_TEST,${currency},${type},NA,${date},${level},\n`;

test("month-end arithmetic handles leap years and all preset boundaries", () => {
  assert.equal(monthEnd("2024-03-31", -1), "2024-02-29");
  assert.equal(monthEnd("2025-03-31", -1), "2025-02-28");
  const expected = ["2026-07-31", "2026-05-31", "2026-02-28", "2025-12-31", "2025-08-31", "2023-08-31", "2021-08-31"];
  (["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y"] as const).forEach((p, i) => assert.equal(rangeStart("2026-08-31", p), expected[i]));
  assert.equal(rangeStart("2026-01-31", "YTD"), "2025-12-31");
  assert.equal(monthDates("2021-08-31", "2026-08-31").length, 60);
});
test("base 100 compounds start-exclusive monthly returns and preserves precision", () => {
  const growth = fundGrowth([{ date: "2026-06-30", value: 999 }, { date: "2026-07-31", value: 10 }, { date: "2026-08-31", value: 5 }], "2026-06-30", "2026-08-31")!;
  assert.deepEqual(growth[0], { date: "2026-06-30", value: 100 });
  close(growth.at(-1)?.value, 115.5); close(totalReturn(growth), 15.5);
  const bg = indexGrowth(fixture, "2026-06-30", "2026-08-31")!;
  close(totalReturn(bg), 15.5); assert.equal(bg[0].value, 100);
});
test("negative and zero returns remain valid and cumulative, not annualised", () => {
  const points = monthDates("2021-08-31", "2026-08-31").map(date => ({ date, value: 1 }));
  close(totalReturn(fundGrowth(points, "2021-08-31", "2026-08-31")), (1.01 ** 60 - 1) * 100);
  close(totalReturn(fundGrowth([{ date: "2026-08-31", value: -10 }], "2026-07-31", "2026-08-31")), -10);
  close(totalReturn(fundGrowth([{ date: "2026-08-31", value: 0 }], "2026-07-31", "2026-08-31")), 0);
});
test("gaps, duplicate months, invalid dates, reversed dates and insufficient history return N/A", () => {
  const p = { date: "2026-08-31", value: 2 };
  assert.equal(fundGrowth([p], "2026-06-30", "2026-08-31"), null);
  assert.equal(fundGrowth([p, p], "2026-07-31", "2026-08-31"), null);
  assert.equal(fundGrowth([p], "2026-08-31", "2026-07-31"), null);
  assert.equal(fundGrowth([p], "2026-08-31", "2026-08-31"), null);
  assert.equal(fundGrowth([p], "2026-07-30", "2026-08-31"), null);
  assert.equal(fundGrowth([{ ...p, value: NaN }], "2026-07-31", "2026-08-31"), null);
  assert.equal(indexGrowth(undefined, "2026-06-30", "2026-08-31"), null);
  assert.equal(indexGrowth(fixture, "2026-05-31", "2026-08-31"), null);
});
test("CSV accepts quoted names, BOM, source dates and Nordic decimal commas", () => {
  assert.equal(parseBenchmarkCsv("\uFEFF" + csv()).series[0].name, "Test, Index");
  const nordic = `${CSV_HEADER.replaceAll(",", ";")}\r\nTEST_ONLY;Test;UNIT_TEST;NOK;NET_TR;UNHEDGED;2026-05-31;100,125;2026-05-29\r\n`;
  const p = parseBenchmarkCsv(nordic).series[0].levels[0];
  assert.equal(p.level, 100.125); assert.equal(p.sourceDate, "2026-05-29");
});
test("CSV rejects price-only, USD, missing metadata, zero and invalid numbers", () => {
  for (const text of [csv(undefined, "0"), csv(undefined, "-1"), csv(undefined, "NaN"), csv(undefined, "100", "USD"), csv(undefined, "100", "NOK", "PRICE"), csv("2026-02-30"), csv("2026-08-28"), "date,level\n2026-08-31,100", CSV_HEADER]) {
    assert.throws(() => parseBenchmarkCsv(text));
  }
});
test("index validation rejects gaps, duplicates, conflicting metadata and bad assignments", () => {
  for (const levels of [[fixture.levels[0], fixture.levels[2]], [fixture.levels[0], fixture.levels[0]]]) {
    assert.throws(() => validatePackage({ ...empty, series: [{ ...fixture, levels }] }));
  }
  assert.throws(() => validatePackage({ ...empty, series: [fixture, fixture] }));
  assert.throws(() => validatePackage({ ...empty, assignments: { F123: "MISSING" } }));
  assert.throws(() => parseBenchmarkCsv(csv() + "TEST_ONLY,Changed,UNIT_TEST,NOK,TR,NA,2026-07-31,100,\n"));
  assert.throws(() => validatePackage({ ...empty, series: [{ ...fixture, levels: [{ date: "2026-08-31", level: 100, sourceDate: "2026-07-31" }] }] }));
});
test("monthly merges retain old levels, count revisions and reject a changed variant or skipped month", () => {
  const old = { ...empty, series: [fixture], assignments: { F0GBR04NJK: fixture.id } };
  const incoming = { ...empty, series: [{ ...fixture, levels: [{ date: "2026-08-31", level: 232 }, { date: "2026-09-30", level: 240 }] }] };
  const result = mergePackages(old, incoming);
  assert.equal(result.revisions, 1); assert.equal(result.additions, 1); assert.equal(result.data.series[0].levels.length, 4);
  assert.equal(result.data.assignments.F0GBR04NJK, fixture.id);
  assert.equal(old.series[0].levels.at(-1)!.level, 231);
  assert.throws(() => mergePackages(old, { ...empty, series: [{ ...fixture, returnType: "GROSS_TR" }] }));
  assert.throws(() => mergePackages(old, { ...empty, series: [{ ...fixture, levels: [{ date: "2026-10-31", level: 250 }] }] }));
});
test("all funds reconcile displayed 1M and YTD to stored snapshots within 0.01 pp", () => {
  for (const fund of funds) {
    for (const period of ["1M", "YTD"] as const) {
      const computed = totalReturn(fundGrowth(fund.monthlyReturns, rangeStart(DATA_DATES.performanceAsOf, period), DATA_DATES.performanceAsOf));
      const snapshot = fund.kpiHistory.find(k => k.asOf === DATA_DATES.performanceAsOf);
      const reported = period === "1M" ? snapshot?.return1M : snapshot?.returnYTD;
      assert.ok(computed !== null && reported != null && Math.abs(computed - reported) < 0.01, `${fund.id} ${period}: ${computed} vs ${reported}`);
    }
  }
});
test("Cusana cannot produce a 3Y or 5Y comparison from its shorter stored history", () => {
  const f = funds.find(f => f.id === "F00001GU8B")!;
  assert.equal(fundGrowth(f.monthlyReturns, rangeStart(DATA_DATES.performanceAsOf, "3Y"), DATA_DATES.performanceAsOf), null);
  assert.equal(fundGrowth(f.monthlyReturns, rangeStart(DATA_DATES.performanceAsOf, "5Y"), DATA_DATES.performanceAsOf), null);
});
