# Fund dashboard release checks

## Scope

Resume the unanswered approval to publish the four-fund exposure update from
commit `df5f1dc`. The production data and UI remain unchanged from that approved
revision. Source dates are 2026-09-30 for Polar, BNP and Guinness and 2026-04-30
for Candriam. Performance remains 2026-10-31; official indices end 2026-09-30.
This file is outside the deployed `dist/public` folder.

The existing published site retains a backend binding. The resumed release also
removes unused global request-body parsers from the otherwise unchanged Express
server. The user explicitly approved the revised release, including this
security hardening, publication to the same address and the GitHub master update.

## Overview

- Start: Fund Dashboard.
- Change All, Equity and Fixed Income, then return to All.
- Expect 17, 11 and 6 funds respectively; sort columns remain usable.
- Change Per dato to September and back to October.
- Expect the selected dates and displayed returns to change consistently.
- Open a fund row and return with Back to overview.

## Fund detail and return analysis

- Start: a fund detail page.
- Open Returns, Risk, Risk-Adjusted, Relative and Style & Valuation.
- Expect the tab contents, reporting benchmark and source labels to remain visible.
- Click each return-period preset and Custom; change both month-end selectors.
- Toggle the benchmark off and on. Export growth and period-return CSVs.
- Expect exact date ranges, usable downloads and missing October benchmark
  returns/risk shown as N/A rather than substituted figures.
- Select a reversed custom date range and expect an explicit error.
- Select September and expect available official benchmark metrics.

## Four-fund exposure acceptance matrix

For Polar Global Tech, BNP Health Care Innov, Guinness Sust Energy and
Candriam Robotics, open the fund through the overview and exercise all three
Exposure tabs: Sectors, Regioner and Land.

- Each tab must show a populated chart, not an empty plot or unavailable message.
- The rendered sector, region and country labels must agree with the approved data.
- Source dates must not be advanced by this release.
- The top-ten holdings display remains a separate subset, not the source of
  the fund-level exposure calculations.
- Inspect the cards at desktop and 375px widths, including the longest labels.
- Return from mobile to desktop and recheck tab interaction.

## Existing fund and fixed-income regression

- Open an existing equity fund and a fixed-income fund.
- Exercise the risk tabs and the applicable exposure tabs, including FI Sectors,
  Kreditt, Modning, Regioner and Land where available.
- Expect existing figures and unavailable-state disclosures to remain unchanged.

## Comparison

- Open Compare Funds from the overview.
- Add the four new funds to the two initial selections; expect six selected.
- Remove and restore selections and change Per dato.
- Expect growth series, KPI columns and exact reporting benchmarks to update.
- October benchmark-dependent metrics must remain N/A.

## Benchmark data

- Open Benchmark data and inspect eight saved series and 17 assignments.
- Open and close File format and validation.
- Download the CSV template and publication package.
- Temporarily unassign and restore a fund; discard session changes.
- Upload malformed data and expect rejection without altering saved data.
- Reload and expect the eight official series and original assignments.
- No synthetic or session-only data may be included in the release.

## Hosted verification

- Open both the deployed preview and published URL in fresh browser contexts.
- Recheck all four funds' three exposure tabs and one unaffected main flow.
- Inspect desktop and 375px screenshots and check page overflow and runtime errors.
- Verify the published JavaScript bundle matches the reviewed build.

## Legacy backend regression

- Build and start the production server on a local test port.
- Verify the index and both public assets are served.
- Submit malformed JSON and compressed payloads to a non-existent API route.
- Expect no parsing/decompression error and a healthy process afterward.
- Confirm project source files are not served as their file contents.
- Preserve the existing backend binding and the default disabled trust proxy.
- The browser bundle and all approved financial data must remain byte-identical.

## Intentional exclusions

- No new benchmark levels, return data, holdings refresh or fund-class change.
- No new automation or changes to existing schedules.
- No claim that the older Candriam portfolio date is a current November snapshot.
- No claim that a top-ten holdings display is a complete portfolio.
