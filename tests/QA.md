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

## Completed checks: alpha, beta, R² and exposure refresh

All 29 tests pass (three new regression tests with exact-fraction fixtures cover beta/alpha/R² identities, perfect and inverse linear relations, leverage, zero covariance, constant series and fail-closed nulls), plus TypeScript checking and production build. The all-funds identity test now reconciles beta, annualised alpha and R² against an independent covariance computation for every available 3Y/5Y window, and asserts Cusana's nulls.

Browser checks on the dev server verified the recalculated Relative tab: Pareto alpha 3Y +4.33%, alpha 5Y +3.70%, beta 0.75/0.89, R² 0.73/0.79, each matching the full-precision CSV audit; the method box now renders on the Relative tab with updated TE/IR plus alpha/beta/R² methodology; the CSV export includes beta, alpha and r_squared columns. Comparison-table checks matched Pareto and PIMCO values and Cusana's N/A. Desktop and 375px mobile screenshots were inspected; no runtime page exceptions, overlaps or overflow were found.

Exposure data was refreshed from the Morningstar MCP on 2026-09-21: X-Ray portfolio analyses as of 2026-08-31 (asset allocation, market maturity, regions, style, statistics, sectors, FI sectors/style/maturity), top-10 holdings per fund (dates 2026-06-30 to 2026-08-31 by fund) and country datapoints. Equity sector/region/country charts and the FI style/maturity data now come from the fresh X-Ray values; per-fund holdings dates are shown on each Top 10 card. FI country coverage remains partial, as before (Morningstar HS datapoints classify part of fixed-income exposure only). NAV, monthly returns, KPI history, benchmark levels and manager-supplied FI details are unchanged.

## Approved alpha / beta / R² and exposure live release

The user's request extended the TE/IR release to alpha, beta and R² and a Morningstar exposure refresh. Commit `42d853f` passed all 29 tests, TypeScript checking and production build; the independent security review reported PASS with no BLOCK or WARN findings (one low-severity development-only esbuild advisory, outside the deployed runtime).

The release was published to `https://sb1-fond-dashboard.pplx.app`, retaining site ID `851ee6d2-6e43-45ef-881e-25464487997e`. Live verification matched Pareto's recalculated Relative tab (alpha 3Y +4.33% / 5Y +3.70%, beta 0.75/0.89, R² 0.73/0.79), Cusana's N/A and PIMCO's refreshed effective duration 6.35; sector and relative-tab screenshots were inspected and no runtime page exceptions were observed.

## Resumed four-fund exposure release (2026-11-06)

The unanswered approval covered publication of the sector, country and region
data already committed in `df5f1dc`. Financial data, calculations and browser UI
are unchanged during this resumption. Portfolio sources remain 2026-09-30 for
Polar, BNP and Guinness, and 2026-04-30 for Candriam. Fund returns remain
2026-10-31; saved index histories end 2026-09-30.

### Verification

- `npm test`: 33/33 pass, including two four-fund aggregate exposure tests and a
  guard against reintroducing global request-body parsers.
- `npm run check` and `npm run build`: pass. Existing non-blocking
  large-bundle/PostCSS warnings remain.
- All 17 fund pages: reporting benchmark, Returns, Risk, Risk-Adjusted, Relative
  and applicable Style tabs checked through the rendered UI.
- All 12 new exposure panels: populated, correct labels, inspected after chart
  animations finish on both 1440px desktop and 375px mobile.
- Equity/fixed-income/all filters: 11/6/17 rows. All sort controls and
  September/October reporting-date selectors exercised.
- Comparison: six selected funds, add/remove/re-add, date switching, benchmark
  labels and October N/A behavior verified.
- Returns: seven presets, custom dates, reversed-range rejection, benchmark
  visibility, growth/period/relative-risk CSV downloads verified.
- Benchmark page: eight series and 17 assignments; template/package downloads,
  temporary assignment changes, discard, malformed-file rejection and saved
  data after reload verified.
- Fixed-income regression: PIMCO sector, credit, maturity, region and country
  tabs exercised.
- No document-level horizontal overflow on 375px detail, comparison or benchmark
  pages. Return to desktop and subsequent chart interaction work.
- Local and hosted-preview checks produced no browser page errors.
- Screenshot evidence was retained outside the public deployment directory in
  the task's `fund-qa` folder, including desktop/mobile exposure matrices.

### Preserved frontend build

The approved exposure build and the hardened backend build have byte-identical
frontend output. Only these three files belong in the public static directory;
no source, environment file, local upload, test output or repository metadata
is included.

| File | SHA-256 |
|---|---|
| `index.html` | `f6534cf39ba1f75cc9f302397088ee2b90b0ce3b78730582615a47a68ba70761` |
| `assets/index-CGw4moRl.css` | `a3ccbaa6d12933857db96a228e4294b5204b37306519ccf5459e4dca7d7fa4ac` |
| `assets/index-DG6OSDi_.js` | `8b061a24c5ee59e040bd2cbf7be37917fd3cbbf613d92d83faea7ad139d646df` |

### Legacy backend hardening

The existing site retains a backend binding, so publication must supply its
backend configuration. The original server enabled unused JSON and URL-encoded
body parsers. Its installed body-parser version is affected by a remotely
reachable compressed-request denial of service when this middleware uses
default options ([GitHub security advisory](https://github.com/advisories/GHSA-27r3-jxmh-p828)).

The revised release removes both parser registrations and the unused `rawBody`
augmentation. Routes, public file directory, error handler, port selection and
financial frontend remain unchanged. The dependency remains bundled through
Express, but the application no longer registers its parsing/decompression path.

The security reviewer independently inspected the rebuilt bootstrap and tested
it locally. Index/assets returned the expected bytes. Malformed JSON, a gzip
frame with trailing bytes and invalid compressed form data did not trigger
parsing or crash the process; subsequent GETs remained healthy. Requests for
`server/index.ts`, `package.json`, `.env` and `.git/config` returned the HTML
fallback, not file contents. These are bounded regression checks, not exhaustive
penetration testing.

No publication blocker was identified in the patched configuration. Residual
dependency warnings remain: body-parser has no registered parser middleware;
proxy-addr uses default disabled trust proxy and no IP access controls; Zod
validates visitor-selected local files capped at 2,000,000 bytes before reading;
Vite/source-map-js findings concern development/build tooling. Zod collection
bounds are validation limits, not a guarantee against resource exhaustion.
These are configuration-specific mitigations, not dependency upgrades. Adding
APIs, body parsers or trusted-proxy handling requires another review.

The reviewed production configuration is
`PORT=5000 NODE_ENV=production node dist/index.cjs`, with production dependencies
installed using `npm ci --omit=dev`. The server's static root is `dist/public`;
both `dist/index.cjs` and `dist/public` must accompany the backend deployment.

### Publication status

The user explicitly approved publication of the exposure update together with
the limited security change and an update of the private GitHub repository's
master branch. Publication completed on 2026-11-06 at the existing
[SB1 Fond Dashboard](https://sb1-fond-dashboard.pplx.app) address, preserving
site ID `851ee6d2-6e43-45ef-881e-25464487997e` and Public visibility. The publication
receipt identifies app asset `9da74ef4-d402-487a-b023-3d0cb6778700`; the selected
existing preview asset is `a82171d2-7246-4567-922c-7ee7e623ad5e`.

A fresh browser context verified all 12 exposure panels on the public site at
both 1440px and 375px. Expected chart counts matched: Polar 5/3/11, BNP 1/3/10,
Guinness 5/3/10 and Candriam 5/3/8 for sectors/regions/countries. No mobile
document overflow or runtime page errors were observed. The live benchmark page
still lists eight saved series and 17 fund assignments. The comparison page
correctly returns October N/A and available September results.

The published HTML and CSS hashes exactly match the build manifest above.
Publication performs two documented backend-placeholder substitutions in the
JavaScript, replacing `__PORT_5000__` with `port/5000`. After those substitutions,
the local bundle equals the delivered bundle byte-for-byte; no financial data
or application code difference remains. The delivered JavaScript SHA-256 is
`cd2c18be16438d3c54c0142039bcf65a234519307fefbe748b75a69e9d695fbc`.
