# Benchmark data workflow

The fund-detail return explorer compounds the existing NOK monthly total returns. It does not change the underlying fund histories, currency conversions or predecessor stitching. TE and IR are now calculated against the assigned reporting benchmark, independently of legacy provider KPIs. Reporting benchmark levels are separate from legacy Morningstar benchmark labels and X-Ray comparison slices.

## Calculations

- Fund base value is exactly 100 at the starting month-end. Subsequent values equal 100 multiplied by the product of `1 + monthly_return_pct / 100`.
- Benchmark values equal `100 × level(t) / level(start)`. Official total-return index levels must include the opening observation and all intervening month-ends.
- Returns are cumulative, including 3Y and 5Y. Excess return is the arithmetic fund return minus benchmark return, expressed in percentage points.
- Presets end at the selected reporting month-end. Custom ranges use exact month-end endpoints, with no daily interpolation.
- Missing history produces N/A, not zero, backfill or a shortened interval. Both series use identical dates.
- Price-only indices, foreign-currency levels, missing/duplicate months and metadata changes under an existing index ID are rejected.

## Relative risk calculations

The fund-detail Risk, Risk-Adjusted and Relative tabs and comparison table calculate 3Y and 5Y tracking error, information ratio, alpha, beta and R² from the assigned benchmark at the selected as-of date. `benchmarkRiskKpis` is the shared calculation entry point; stored provider TE/IR/alpha/beta values are never used as fallback.

For each exact 36/60-month window, subtract consecutive index-level monthly returns from the fund's already converted NOK monthly returns. TE is the sample standard deviation (n−1 denominator) of monthly active returns times sqrt(12). IR is mean monthly active return times 12 divided by annualised TE. This convention is arithmetic, not a CAGR difference; no risk-free rate enters either metric.

Require the opening index level and every month of both series. Missing, duplicate, nonfinite or malformed observations fail closed as N/A. Zero TE produces undefined IR (N/A); numerical TE below 1e−10 percentage points is treated as zero. Cusana lacks complete 3Y/5Y fund history as of August 2026.

Each fund's risk card exposes exact dates, matched observation counts, methodology and a full-precision monthly CSV audit. Session-only benchmark edits recompute the metrics without persisting or publishing them. Beta is the OLS slope of fund on benchmark monthly returns over the same window; alpha is the regression intercept × 12, annualised percentage points without a risk-free rate; R² is the squared correlation. Beta, alpha and R² are null when either series is constant. Capture metrics remain legacy provider measures and are explicitly labelled. Run `npx tsx script/export-relative-risk.ts <output-directory>` to reproduce the all-fund report, summary CSV and JSON observation audit.

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

The monthly task was extended on 2026-09-21 to retrieve all underlying holdings for every fund using supported pagination/export, not just the top ten. Record actual portfolio dates, retrieved and expected row counts, completeness and meaningful weight coverage. An unconfirmed 100-row result is not proof of a complete portfolio. Notify the user by fund if truncated, incomplete or of unknown completeness, requesting full dated Excel/CSV holdings; do not normalise partial weights or derive whole-fund exposures from a partial list.

Refresh provider-reported aggregate exposures independently each month: asset allocation, market maturity, countries, regions, sectors, style/size, equity statistics and applicable fixed-income duration, maturity, credit quality and yield. Keep actual source dates separate from performance as-of dates. Raw holdings and control reports remain outside the public static bundle. Failed mandatory updates preserve the last published dashboard, while already designated optional unavailable FI fields remain null with a warning.

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
