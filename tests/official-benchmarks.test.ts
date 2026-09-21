import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import rawData from "../shared/benchmarkData.json";
import { validatePackage, indexGrowth, totalReturn, fundGrowth, PERIODS, rangeStart } from "../shared/performance";
import { funds } from "../client/src/lib/fundData";

const data = validatePackage(rawData);
const audit = JSON.parse(readFileSync(new URL("../benchmark-audit/source-import-2026-08-31/source-audit.json", import.meta.url), "utf8"));
const end = "2026-08-31";
const close = (actual: number | null, expected: number) => {
  assert.ok(actual !== null && Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
};
const assignments = {
  F0GBR04NJK: "OSEFX_TR_NOK",
  F00001GW7Y: "MSCI_ACWI_NET_TR_NOK",
  F0000125XE: "MSCI_ACWI_NET_TR_NOK",
  F00000ZFGS: "MSCI_ACWI_NET_TR_NOK",
  F00001GU8B: "MSCI_EM_NET_TR_NOK",
  F00000OAR8: "MSCI_EM_NET_TR_NOK",
  F0GBR05THA: "MSCI_WORLD_NET_TR_NOK",
  F00001EWFB: "BLOOMBERG_GLOBAL_AGG_TR_NOK_HEDGED",
  F000014RM8: "BLOOMBERG_GLOBAL_AGG_TR_NOK_HEDGED",
  F00000Z0Y3: "BLOOMBERG_GLOBAL_AGG_TR_NOK_HEDGED",
  F00000LKIE: "NBP_NOHYNH",
  F00001SEG2: "NBP_NORM123D3",
  F00000QLFG: "NBP_NORMFRN",
};

test("all 13 reporting benchmarks match the user's explicit assignments", () => {
  assert.deepEqual(data.assignments, assignments);
  assert.equal(funds.length, Object.keys(assignments).length);
  assert.equal(data.series.length, 8);
});

test("the official August import retains all 1020 complete month-end observations", () => {
  let count = 0;
  for (const series of data.series) {
    const imported = series.levels.filter(p => p.date <= end);
    const nbp = series.provider === "Nordic Bond Pricing";
    assert.equal(imported.length, nbp ? 140 : 120);
    assert.equal(imported[0].date, nbp ? "2015-01-31" : "2016-09-30");
    assert.equal(imported.at(-1)!.date, end);
    count += imported.length;
    assert.equal(series.currency, "NOK");
    assert.equal(series.returnType, nbp ? "GROSS_TR" : series.provider === "MSCI" ? "NET_TR" : "TR");
  }
  assert.equal(count, 1020);
});

test("every persisted observation exactly matches its audited workbook cell", () => {
  for (const series of data.series) {
    const origin = audit.series.find((s: any) => s.id === series.id);
    assert.ok(origin, `Missing provenance for ${series.id}`);
    const levels = new Map(series.levels.map(p => [p.date, p.level]));
    for (const point of origin.observations) {
      assert.equal(levels.get(point.date), point.level, `${series.id} ${point.levelCell}`);
      if (series.id.startsWith("NBP_")) assert.match(point.levelCell, /^F\d+$/);
    }
  }
});

test("NBP uses raw index levels, never cumulative percentages or partial September observations", () => {
  for (const [id, level, cumulative] of [
    ["NBP_NOHYNH", 201.34348934, 104.646155210207],
    ["NBP_NORM123D3", 128.42059048, 27.4377582219888],
    ["NBP_NORMFRN", 137.70066655, 37.4729214298324],
  ] as const) {
    const s = data.series.find(s => s.id === id)!;
    assert.equal(s.levels.find(p => p.date === end)!.level, level);
    assert.notEqual(level, cumulative);
    assert.ok(!s.levels.some(p => p.date === "2026-09-21"));
  }
  assert.equal(audit.excluded.length, 2);
  assert.deepEqual(audit.excluded.map((p: any) => [p.sheet, p.date, p.levelCell]),
    [["NORM123D3", "2026-09-21", "F4"], ["NORMFRN", "2026-09-21", "F4"]]);
});

test("NOK export levels are not converted again, and fixed income uses the hedged Global Aggregate", () => {
  assert.equal(data.series.find(s => s.id === "MSCI_ACWI_NET_TR_NOK")!.levels.find(p => p.date === end)!.level, 5961.8472368);
  assert.equal(data.series.find(s => s.id === "MSCI_WORLD_NET_TR_NOK")!.levels.find(p => p.date === end)!.level, 150214.7500256);
  const s = data.series.find(s => s.id === "BLOOMBERG_GLOBAL_AGG_TR_NOK_HEDGED")!;
  assert.equal(s.hedging, "NOK_HEDGED");
  close(totalReturn(indexGrowth(s, "2025-12-31", end)), (231.8033 / 230.81497 - 1) * 100);
  close(totalReturn(indexGrowth(s, "2021-08-31", end)), (231.8033 / 234.33118 - 1) * 100);
});

test("all 56 benchmark preset returns reconcile to source-level ratios, with the same base-100 start", () => {
  for (const series of data.series) {
    const origin = audit.series.find((s: any) => s.id === series.id);
    for (const period of PERIODS) {
      const start = rangeStart(end, period);
      const growth = indexGrowth(series, start, end)!;
      assert.equal(growth[0].date, start);
      assert.equal(growth[0].value, 100);
      assert.equal(growth.at(-1)!.date, end);
      close(totalReturn(growth), origin.checks[period].returnPct);
    }
  }
});

test("all available fund ranges match benchmark dates; Cusana's missing long fund history stays unavailable", () => {
  for (const fund of funds) {
    const series = data.series.find(s => s.id === data.assignments[fund.id])!;
    for (const period of PERIODS) {
      const start = rangeStart(end, period);
      const f = fundGrowth(fund.monthlyReturns, start, end);
      const b = indexGrowth(series, start, end)!;
      if (fund.id === "F00001GU8B" && ["3Y", "5Y"].includes(period)) {
        assert.equal(f, null);
      } else {
        assert.ok(f, `Unexpected missing fund range ${fund.id} ${period}`);
        assert.deepEqual(f.map(p => p.date), b.map(p => p.date));
      }
    }
  }
});
