# Return explorer QA inventory

## Relative risk update: QA inventory

- Validate sample SD and annualisation against analytically known fixtures and the independent variance/covariance identity for all available real fund windows.
- Require exact 36/60 aligned monthly observations; cover gaps, duplicates, opening levels, zero TE, negative IR, invalid values and Cusana's insufficient history.
- Check all 13 fund-detail pages show expected TE/IR and benchmark names on Risk/Risk-Adjusted tabs; never fall back to legacy provider fields.
- Change reporting date and benchmark assignment, unassign and restore, and verify recalculation in fund detail and comparison.
- Export the monthly calculation CSV, inspect 36+60 observations, endpoints and full precision.
- Inspect desktop, 375px and dark-style risk cards and comparison rows for long names, readable labels and overflow. Open/close the methodology disclosure.
- Regression: fund and benchmark data unchanged; existing return-explorer tests continue to pass.

## Claims and checks

| Feature | Functional evidence | Visual evidence |
|---|---|---|
| Base-100 chart and correct total return | Opening value 100 in exported CSV, independent compounding check | Desktop and 375px fund detail |
| Seven presets | Click each, confirm exact endpoints and monthly counts | Selected-state button and range label |
| Custom month-ends | Select historical endpoints, confirm values; reversed interval errors | Select controls and error state |
| Fixed-period bars | Compare table to curve results, cumulative 3Y/5Y | Full bar chart and table |
| Benchmark overlay | Session-only test fixture, assignment, matching endpoint returns | Both lines and grouped bars |
| Hide/show benchmark | Toggle off and back on | Both chart states |
| Import validation | Valid CSV/JSON, non-NOK, price-only, duplicates, gaps, future dates | Preview review and errors |
| Monthly revision approval | Replace an observation, explicit confirmation | Revision count |
| Mapping and packages | Assign, unassign, export, reimport | Named series, variant and coverage |
| Session scope | Navigation preserves preview; reload/reset restores published data | Unsaved banner and empty state |
| As-of handling | Change reporting date, verify reset; incomplete 3Y/5Y disabled | Date selector and disabled buttons |
| Mobile and dark mode | No horizontal page overflow, controls operable | 375px and dark desktop screenshots |

## Off-happy-path checks

- Select a start date after end date; require an explicit error without a plotted fabricated range.
- Select Cusana with less than three years of stored history; require 3Y/5Y N/A, not shortened returns.
- Upload USD or price-only data; require rejection and no state mutation.
- Reload after a synthetic preview import; require test data to disappear and no public persistence.

Synthetic fixtures exist only in unit tests and ephemeral browser memory, never in the shipped index package.

## Completed checks: initial implementation before official data

The 11 automated tests pass, including calculations, all-fund stored-snapshot reconciliation and the release importer's dry-run/merge/revision/audit paths. TypeScript checking and the production build pass. Existing fund return values were not changed; the data-module diff adds only a missing enrichment type declaration.

Interactive checks covered all seven presets, custom dates, reverse-range errors, both CSV exports, benchmark overlay/hide/show, explicit assignment/unassignment, confirmation-gated import, revision count, future/USD/price-only rejection, incomplete benchmark history, template/package downloads, reset, reload and historical as-of selection. Cusana's unavailable 3Y/5Y periods remain disabled and N/A.

Desktop (1440px), mobile (375px) and dark-style screenshots were inspected. The new chart and importer regions have no horizontal page overflow, clipped controls, overlapping text or runtime exceptions in these tested states. Exploratory checks included changing the global reporting date, shortening index coverage to one observation, and loading invalid fund routes. Synthetic preview fixtures were discarded and the release package remains empty pending official data.

The existing overview's hardcoded counts were corrected to derive from the actual 13-fund list. Build output retains non-blocking bundle-size and PostCSS warnings. No live site was republished.

## Official workbook integration: QA inventory

- Check all 8 series against workbook cells, full precision, expected counts, continuous month-end dates and a final date of 2026-08-31.
- Check all 13 user-confirmed fund mappings, including Global Aggregate for PIMCO, PGIM and BlueBay.
- Ensure NBP column F supplies levels; column G is audit-only, and both partial observations dated 2026-09-21 are excluded.
- Check every preset benchmark return against independently extracted source levels and confirm base 100 at each starting date.
- Navigate all 13 fund pages, verify correct benchmark names and values, visible line and bar overlays, persistence after reload, and the 8-row coverage table.
- Exercise presets, custom dates, benchmark hide/show, CSV exports and historical reporting dates with the saved real data.
- Retain Cusana's short-history N/A behavior and reject reversed custom ranges.
- Inspect desktop/mobile screenshots, long names, table scrolling, dark styles and console exceptions.

## Completed checks: official workbook integration

All 18 automated tests pass, including the seven added official-data regression tests. Every one of the 1,020 levels matches its audited source cell; all 56 index/preset calculations match independently computed workbook ratios. The 13 mappings are correct, with no change to `fundData.ts`.

Interactive tests visited all 13 fund pages and checked the named reporting index, 6M return, corresponding table cell, two line series and two bar series. Reload retained the saved data. The index table contains eight series, all 13 assignment controls match the package, and discard restores the saved assignment after an intentional edit.

Pareto checks exercised all seven presets, benchmark hide/show in both charts, a custom calendar-year interval, invalid reversed dates, historical as-of selection/reset and both CSV exports. The exported custom series starts with exactly 100 for both fund and index. Cusana's 3Y/5Y controls remain disabled and comparison cells remain N/A.

Desktop screenshots covered the line chart, bars, legends, tooltips and coverage table. At 375px, PIMCO's header/profile and long benchmark name, its line chart, Arctic's bars/table and the benchmark page were inspected. An existing fixed-income exposure tab overflow was found and fixed with wrapping; document width now equals viewport width (375px). Axis labels now preserve fractional index values rather than repeating integer-rounded labels. Dark-style rendering was inspected. No runtime page exceptions were observed.

Benchmark-dependent legacy risk metrics now have an explicit non-recalculation disclosure. The first deployment updated only the private preview; the user subsequently explicitly approved updating the live site.

## Approved live release

The security review found no blockers. All four high-severity build-tool advisories were patched through the lockfile; audit now reports zero critical/high/moderate findings and one low Windows-development-server-only advisory outside the deployed runtime. All 18 tests, typecheck and build passed again.

On 2026-09-21 the approved release was published to the existing `https://sb1-fond-dashboard.pplx.app` site, ID `851ee6d2-6e43-45ef-881e-25464487997e`. Publication reported Visibility `Public`.

Live browser verification after a full reload checked eight series, every one of the 13 mappings, Pareto/OSEFX 5Y at 78.33%, Arctic/NOHYNH 6M at 3.45%, both line and bar overlays, and saved data surviving another reload. No runtime page exceptions were observed. The browser was closed after testing.

## Completed checks: reporting-benchmark TE / IR

All 26 tests pass, plus TypeScript checking and production build. The eight additional tests cover sample vs population SD, percentage units, arithmetic vs geometric IR, negative active return, zero TE, boundary alignment, opening index levels, missing/duplicate/invalid observations, historical as-of dates and benchmark reassignment. For the 24 available fund/window combinations, both an independent variance/covariance identity and Python's statistics.stdev/mean reconcile to the calculated results (Python maximum permitted discrepancy 1e−12). Cusana's two incomplete windows remain null.

Browser checks visited all 13 fund pages and matched all 52 displayed TE/IR fields to the calculation audit, including N/A. Comparison checks matched Pareto, PIMCO and Cusana. Historical date selection changed Pareto 3Y TE from 5.70% to 4.70% at December 2025, and reset restored August 2026. Changing the session-only index assignment recomputed both detail and comparison; removing the assignment produced N/A and disabled export, never a legacy fallback. Discard restored the saved OSEFX mapping and metrics.

The method disclosure opens and closes. Pareto's calculation CSV contains exactly 36 three-year and 60 five-year observations, with matching endpoints and unrounded metrics. Desktop, 375px mobile and dark-style risk-card screenshots were inspected; mobile comparison uses its existing internal horizontal scroll and page width remains 375px. The dark screenshot was retaken after CSS transitions settled to confirm active-tab contrast. No runtime page exceptions, overlapping values or new page overflow were found.

Existing fund histories, currency conversion and official benchmark observations are unchanged. The new risk calculations are a preview update pending separate permission to republish; the earlier approved benchmark live release is unaffected. The separate monthly scheduled task now includes full-holdings completeness checks, dated exposure refreshes and fund-specific requests for user-supplied full holdings when extraction is incomplete.

## Approved TE / IR live release

The user explicitly approved publication on 2026-09-21. Commit `419bcde` passed all 26 tests, typecheck and production build again. The required independent security review reported PASS with no BLOCK or WARN findings; production-dependency audit reported zero vulnerabilities.

The release was published to `https://sb1-fond-dashboard.pplx.app`, retaining site ID `851ee6d2-6e43-45ef-881e-25464487997e` and app asset `a82171d2-7246-4567-922c-7ee7e623ad5e`. Publication reported Visibility `Public`. Visibility controls are available at `https://www.perplexity.ai/computer/a/a82171d2-7246-4567-922c-7ee7e623ad5e?open-publish=true`.

A fresh live-page reload verified all 52 TE/IR fields across the 13 funds against the full-precision audit, including Cusana's N/A values. Pareto, PIMCO and Cusana comparison-table fields matched. Pareto's live CSV exported 96 monthly observations across the 36/60-month windows. Historical reporting-date selection and reset worked. No runtime page exceptions were observed. This publication supersedes the preview-only status recorded above.
