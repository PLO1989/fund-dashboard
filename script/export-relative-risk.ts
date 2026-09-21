import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { funds, DATA_DATES } from "../client/src/lib/fundData";
import { benchmarkRiskKpis, validatePackage } from "../shared/performance";
import rawPackage from "../shared/benchmarkData.json";

const output = resolve(process.argv[2] || "risk-audit");
mkdirSync(output, { recursive: true });
const asOf = DATA_DATES.performanceAsOf;
const pkg = validatePackage(rawPackage);
const results = funds.map(fund => {
  const series = pkg.series.find(s => s.id === pkg.assignments[fund.id]);
  return {
    fundId: fund.id, fund: fund.shortName, benchmarkId: series?.id, benchmark: series?.name,
    firstFundMonth: fund.monthlyReturns.map(p => p.date).sort()[0],
    ...benchmarkRiskKpis(fund.monthlyReturns, series, asOf),
  };
});
writeFileSync(resolve(output, "relative-risk.json"), JSON.stringify({ asOf, results }, null, 2) + "\n");
const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const summaryRows = results.flatMap(f => (["3Y", "5Y"] as const).map(period => {
  const metric = period === "3Y" ? f.threeYear : f.fiveYear;
  return [f.fundId, f.fund, f.benchmarkId, period, metric?.start, asOf, metric?.months,
    metric?.trackingErrorPct, metric?.informationRatio, metric?.annualizedMeanActiveReturnPct,
    metric ? "complete" : "insufficient_history"];
}));
writeFileSync(resolve(output, "relative-risk-summary.csv"),
  "fund_id,fund_name,benchmark_id,period,start,end,months,tracking_error_annual_pct,information_ratio,annualized_mean_active_return_pct,status\n" +
  summaryRows.map(row => row.map(csv).join(",")).join("\n") + "\n");
const format = (x: number | null, percent = false) => x === null ? "N/A" : x.toFixed(2).replace(".", ",") + (percent ? " %" : "");
const report = `# SB1 Fond Dashboard: tracking error og information ratio

Beregnet per **31. august 2026** fra dashboardets eksisterende månedlige NOK-avkastning og de offisielle indeksnivåene du har levert. Ingen proxyer, nye valutakonverteringer eller endringer i fondenes avkastningshistorikk er benyttet.

## Resultater

| Fond | Referanseindeks | TE 3 år | IR 3 år | TE 5 år | IR 5 år |
|---|---|---:|---:|---:|---:|
${results.map(f => `| ${f.fund} | ${f.benchmark} | ${format(f.trackingError3Y, true)} | ${format(f.infoRatio3Y)} | ${format(f.trackingError5Y, true)} | ${format(f.infoRatio5Y)} |`).join("\n")}

## Perioder og metode

- **3 år:** 31.08.2023 til 31.08.2026, 36 månedsavkastninger. Åpningsnivået for indeksen er med for å beregne september 2023.
- **5 år:** 31.08.2021 til 31.08.2026, 60 månedsavkastninger. Åpningsnivået for indeksen er med for å beregne september 2021.
- **Månedlig meravkastning:** fondets NOK-avkastning minus indeksens NOK-avkastning. Indeksavkastning beregnes som nivå ved månedsslutt delt på forrige månedsnivå, minus én.
- **TE:** utvalgsstandardavvik av månedlig meravkastning (nevner n−1), multiplisert med kvadratroten av 12. TE rapporteres annualisert i prosent.
- **IR:** aritmetisk gjennomsnittlig månedlig meravkastning multiplisert med 12, delt på annualisert TE. IR er uten enhet; metoden bruker ikke differansen mellom geometriske årsavkastninger.
- **Risikofri rente:** inngår ikke i TE eller IR. Sharpe-forutsetningen på 4 % er uendret.
- **Manglende data:** krever nøyaktig 36 eller 60 sammenfallende måneder og samtlige indeksnivåer, inkludert åpningsnivå. Ingen interpolering, forkorting eller tilbakefall til eldre leverandørtall.
- **Null TE:** gir N/A for IR fordi forholdstallet da er udefinert.

## Avgrensninger

Cusana har 35 månedsobservasjoner fra oktober 2023 til august 2026 i den lagrede fondshistorikken. Derfor er både 3- og 5-årsverdier N/A, selv om indeksen har lang nok historikk. De øvrige 12 fondene har full dekning for begge perioder.

Det er beholdt samme forløperhistorikk og NOK-konverterte fondsserier som dashboardet allerede bruker. Dette er en ny beregning mot de brukerbekreftede referanseindeksene, ikke en ny innhenting eller sertifisering av underliggende fondsdata.

TE/IR reagerer på valgt rapporteringsdato og gjeldende indekskobling. En indekskobling gjelder hele historikken; eventuelle historiske bytter av referanseindeks må dokumenteres som en godkjent kjedet serie. Alpha, beta, capture og appraisal er ikke rekalkulert i denne oppdateringen og er merket separat i dashboardet.

## Datagrunnlag og etterprøvbarhet

Fondene kommer fra dashboardets eksisterende fondsmodul, og indeksene fra «Benchmark-fonddashboard_ex-NBP.xlsx» og «Benchmark-pris_NBP.xlsx», importert til den lagrede benchmarkpakken. For NBP brukes indeksnivået «Total Return (Gross, Unhedged)», ikke kolonnen for akkumulert avkastning.

CSV-filen med sammendrag inneholder uavrundede resultater. Fra hvert fonds Risk- eller Risk-Adjusted-fane kan du eksportere samtlige månedlige fonds-, indeks- og meravkastninger bak beregningen. Ingen nye data hentes eller publiseres ved en slik eksport.
`;
writeFileSync(resolve(output, "relative-risk-report.md"), report);
console.log(JSON.stringify({ asOf, output, results: results.map(({ threeYear, fiveYear, ...r }) => r) }, null, 2));
