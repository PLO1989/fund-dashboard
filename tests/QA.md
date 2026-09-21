# Return explorer QA inventory

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
