# Benchmark data workflow

The fund-detail return explorer compounds the existing NOK monthly total returns. It does not change the underlying fund histories, currency conversions, predecessor stitching or existing annualised KPI cards. Reporting benchmark levels are separate from legacy Morningstar benchmark labels and X-Ray comparison slices.

## Calculations

- Fund base value is exactly 100 at the starting month-end. Subsequent values equal 100 multiplied by the product of `1 + monthly_return_pct / 100`.
- Benchmark values equal `100 × level(t) / level(start)`. Official total-return index levels must include the opening observation and all intervening month-ends.
- Returns are cumulative, including 3Y and 5Y. Excess return is the arithmetic fund return minus benchmark return, expressed in percentage points.
- Presets end at the selected reporting month-end. Custom ranges use exact month-end endpoints, with no daily interpolation.
- Missing history produces N/A, not zero, backfill or a shortened interval. Both series use identical dates.
- Price-only indices, foreign-currency levels, missing/duplicate months and metadata changes under an existing index ID are rejected.

## Initial setup

1. Obtain licensed, official NOK total-return levels in the correct gross/net and hedging variant. Do not relabel USD levels as NOK or treat FX translation as currency hedging.
2. Prepare CSV columns `benchmark_id,benchmark_name,provider,currency,return_type,hedging,date,level,source_date`. The last column is optional.
3. Open Benchmark data in the dashboard, upload CSV, review validation and confirm official data. An upload is a session-only preview, never an anonymous write to the live site.
4. Choose each fund's exact reporting index. Legacy labels are not confirmed assignments. A mapping applies to the full history; historical benchmark switches require a separately approved chained/composite series.
5. Download the publication package and provide it in the conversation. Packages replace the complete assignment map, including unassignments, while merging levels; CSV preserves assignments.
6. Run `npm run benchmarks:import -- package.json --dry-run`, then the same command without `--dry-run` after review. Monthly CSV additions can be imported through the same command.
7. Run `npm test`, `npm run check`, `npm run build`, review a deployed preview, then obtain publication approval.

## Monthly operations

Append each newly approved month-end level to the existing series. Keep stable IDs and metadata. Never reset index levels to 100 in the source file unless the provider's complete historical series is consistently rebased.

An import with changed historical observations fails unless `--allow-revisions` is explicitly passed. The import script archives before/input/after files under `benchmark-audit/` and prints a SHA-256 digest. These audit files are not part of the static public output; the static index levels themselves are visible to viewers of the published dashboard. Keep a licensed source archive outside the app as well.

The fund monthly refresh should update only `fundData.ts`, not `shared/benchmarkData.json`. The benchmark package persists in source between builds, independently of the 24-month KPI snapshot window. Missing benchmark months remain N/A until supplied.

## Confirmed workbook import through 2026-08-31

Eight user-supplied series are now saved in `shared/benchmarkData.json`, not merely loaded into browser memory. The import contains 1,020 index observations and 13 fund assignments. All supplied monthly history is retained.

| Funds | Reporting series ID | Variant |
|---|---|---|
| Pareto Aksje Norge | `OSEFX_TR_NOK` | Total return, NOK |
| GQG, Wellington, Artisan | `MSCI_ACWI_NET_TR_NOK` | Net total return, NOK, unhedged |
| Cusana, Brandes | `MSCI_EM_NET_TR_NOK` | Net total return, NOK, unhedged |
| KLP AksjeGlobal Indeks S | `MSCI_WORLD_NET_TR_NOK` | Net total return, NOK, unhedged |
| PIMCO, PGIM, BlueBay | `BLOOMBERG_GLOBAL_AGG_TR_NOK_HEDGED` | Total return, NOK-hedged |
| Arctic Nordic Corporate | `NBP_NOHYNH` | Gross total return, NOK, unhedged |
| Danske Norsk Obligasjon | `NBP_NORM123D3` | Gross total return, NOK, unhedged |
| Danske Kort Obligasjon | `NBP_NORMFRN` | Gross total return, NOK, unhedged |

These are stable internal dashboard IDs, not claims about official provider identifiers. Keep them unchanged when appending monthly observations. The confirmed PIMCO reporting index is Global Aggregate, regardless of legacy US Aggregate metadata in the fund dataset.

`script/extract-benchmark-workbooks.py` normalizes the supplied export layouts through the spreadsheet REPL. The `Price` sheet provides dates in row 9 and levels in rows 10–14. Export metadata explicitly says Norwegian Krone; the USD wording in MSCI source names does not trigger another currency conversion.

The NBP sheets use column A for dates and **column F, Total Return (Gross, Unhedged), for index levels**. Column G, Cumulative Return %, is retained in the source audit only and is never used as a level. Two partial observations dated 2026-09-21 in NORM123D3 and NORMFRN were excluded, not relabelled as month-end.

The five non-NBP series each cover 2016-09-30 to 2026-08-31 (120 observations). Each NBP series covers 2015-01-31 to 2026-08-31 (140 observations). Source filenames, SHA-256 hashes, exact cell addresses, exclusions and independently calculated preset return checks are archived under `benchmark-audit/source-import-2026-08-31/`.

For future monthly Excel deliveries, run the extractor against the new files and the approved fund reporting month-end, inspect exclusions and variant metadata, then pass the resulting JSON package to the release importer. The normal merge/revision approval process still applies. An export with a changed layout must be reviewed rather than guessed.

## Metadata rules

- `currency`: `NOK` only in this first implementation.
- `return_type`: `NET_TR`, `GROSS_TR`, or `TR`, using the provider's actual definition.
- `hedging`: `UNHEDGED`, `NOK_HEDGED`, or `NA` for domestic-currency indices.
- `date`: calendar month-end, ISO `YYYY-MM-DD`.
- `source_date`: optional actual provider valuation/trading date within that month, no later than the reporting date.
- `level`: positive full-precision index level. Decimal point for comma CSV; decimal comma is supported in semicolon CSV. No thousands separators.

Keep provider export files for provenance. File validation checks structure and internal consistency; it cannot independently certify that supplied data is authentic, licensed, or the correct investment benchmark.
