import assert from "node:assert/strict";
import test from "node:test";
import { DATA_DATES, funds } from "../client/src/lib/fundData";

const addedFundIds = [
  "F000015JBX",
  "F00000PXH9",
  "F00000287K",
  "F00000Z7DE",
];

test("all four added funds retain populated aggregate exposure slices", () => {
  for (const id of addedFundIds) {
    const fund = funds.find((item) => item.id === id);
    assert.ok(fund, `Missing fund ${id}`);
    for (const slice of ["sectors", "regions", "countries"] as const) {
      const rows = fund.exposure[slice];
      assert.ok(rows.length > 0, `${fund.shortName}: missing ${slice}`);
      assert.equal(
        new Set(rows.map((row) => row.name)).size,
        rows.length,
        `${fund.shortName}: duplicate ${slice} labels`,
      );
      for (const row of rows) {
        assert.ok(row.name.trim(), `${id}: empty exposure label`);
        assert.ok(
          Number.isFinite(row.weight) && row.weight >= 0 && row.weight <= 100,
          `${fund.shortName}: invalid ${slice} weight`,
        );
      }
      const total = rows.reduce((sum, row) => sum + row.weight, 0);
      assert.ok(
        Math.abs(total - 100) < 0.05,
        `${fund.shortName}: ${slice} total ${total} is outside reporting-rounding tolerance`,
      );
    }
  }
});

test("four-fund exposure sources stay consistent and independently dated", () => {
  for (const id of addedFundIds) {
    const fund = funds.find((item) => item.id === id)!;
    const enrichment = fund.enrichment;
    assert.ok(enrichment?.equitySectors, `${id}: missing sector provenance`);
    assert.ok(enrichment.regional, `${id}: missing regional aggregate`);
    assert.deepEqual(enrichment.countriesFull, fund.exposure.countries);

    const sourceDate = enrichment.equitySectors.asOfDate?.slice(0, 10);
    assert.ok(sourceDate && /^\d{4}-\d{2}-\d{2}$/.test(sourceDate));
    assert.ok(sourceDate <= DATA_DATES.performanceAsOf);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(fund.holdingsDate));

    const sectorTotal = Object.values(enrichment.equitySectors.portfolio).reduce<number>(
      (sum, value) => sum + (value ?? 0),
      0,
    );
    assert.ok(Math.abs(sectorTotal - 100) < 0.05);
    assert.deepEqual(
      fund.exposure.regions.map((row) => row.weight),
      [
        enrichment.regional.americas,
        enrichment.regional.greaterEurope,
        enrichment.regional.greaterAsia,
      ],
    );
  }
});
