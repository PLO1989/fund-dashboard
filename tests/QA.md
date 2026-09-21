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

## Completed checks

The 11 automated tests pass, including calculations, all-fund stored-snapshot reconciliation and the release importer's dry-run/merge/revision/audit paths. TypeScript checking and the production build pass. Existing fund return values were not changed; the data-module diff adds only a missing enrichment type declaration.

Interactive checks covered all seven presets, custom dates, reverse-range errors, both CSV exports, benchmark overlay/hide/show, explicit assignment/unassignment, confirmation-gated import, revision count, future/USD/price-only rejection, incomplete benchmark history, template/package downloads, reset, reload and historical as-of selection. Cusana's unavailable 3Y/5Y periods remain disabled and N/A.

Desktop (1440px), mobile (375px) and dark-style screenshots were inspected. The new chart and importer regions have no horizontal page overflow, clipped controls, overlapping text or runtime exceptions in these tested states. Exploratory checks included changing the global reporting date, shortening index coverage to one observation, and loading invalid fund routes. Synthetic preview fixtures were discarded and the release package remains empty pending official data.

The existing overview's hardcoded counts were corrected to derive from the actual 13-fund list. Build output retains non-blocking bundle-size and PostCSS warnings. No live site was republished.
