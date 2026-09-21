import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Download, Upload } from "lucide-react";
import { funds, DATA_DATES } from "@/lib/fundData";
import { useBenchmarks, downloadText } from "@/lib/benchmarkContext";
import { CSV_HEADER, parseBenchmarkCsv, validatePackage, mergePackages, rangeStart } from "@shared/performance";
import type { BenchmarkPackage } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Benchmarks() {
  const { data, setData, preview, reset } = useBenchmarks();
  const [candidate, setCandidate] = useState<ReturnType<typeof mergePackages> | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  async function upload(file?: File) {
    setError(""); setMessage(""); setCandidate(null); setConfirmed(false);
    if (!file) return;
    setLoading(true);
    try {
      if (file.size > 2_000_000) throw new Error("Maximum file size is 2 MB.");
      const text = await file.text();
      const isPackage = file.name.toLowerCase().endsWith(".json");
      const incoming: BenchmarkPackage = isPackage
        ? validatePackage(JSON.parse(text)) : parseBenchmarkCsv(text);
      const merged = mergePackages(data, incoming);
      // A reviewed package supplies the complete assignment map, including removals.
      if (isPackage) merged.data.assignments = incoming.assignments;
      if (Object.keys(merged.data.assignments).some(id => !funds.some(f => f.id === id))) throw new Error("The file contains an unknown fund assignment.");
      if (merged.data.series.some(s => s.levels.some(l => l.date > DATA_DATES.performanceAsOf)))
        throw new Error(`Index dates cannot exceed the current fund reporting date (${DATA_DATES.performanceAsOf}).`);
      setCandidate(merged);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read the file."); }
    finally { setLoading(false); }
  }
  return <div className="min-h-screen bg-background">
    <header className="bg-sb1-navy text-white"><div className="max-w-6xl mx-auto p-6">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/80" data-testid="link-benchmark-back"><ArrowLeft className="w-4 h-4" />Fund overview</Link>
      <h1 className="text-xl font-semibold mt-2">Benchmark data</h1>
      <p className="text-sm text-white/80 mt-2">Official index levels. Explicit assignments. No proxies.</p>
    </div></header>
    <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="p-4 rounded-md bg-muted text-sm space-y-2" data-testid="status-import-mode">
        {!preview && data.series.length > 0 && <p data-testid="status-saved-benchmarks"><strong>{data.series.length} saved index series · {Object.keys(data.assignments).length} fund assignments.</strong> These data are included in this dashboard version and remain available after reload.</p>}
        <p><strong>{preview ? "Unsaved session preview." : "Monthly file workflow."}</strong> Upload a CSV to validate and preview it. Your file stays in this browser session and is lost on reload; it is not uploaded to a server or saved to the live dashboard.</p>
        <p>After reviewing the fund assignments, download the publication package and provide it in the conversation. It can then be incorporated into the dashboard release. Only publish licensed index data where your distribution rights permit it.</p>
      </div>
      <Card><CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-lg font-semibold">Import index levels</h2>
          <p className="text-sm text-muted-foreground mt-1">NOK total-return indices only. Month-end levels, including the opening observation.</p></div>
          <Button variant="outline" data-testid="button-template" onClick={() => downloadText("benchmark_levels_template.csv", CSV_HEADER + "\n")}><Download className="w-4 h-4 mr-2" />CSV template</Button>
        </div>
        <p className="text-sm">For 5Y through {DATA_DATES.performanceAsOf}, supply 61 month-end levels from {rangeStart(DATA_DATES.performanceAsOf, "5Y")}. Prefer history from 2017-12-31 for the full existing custom-date range. Do not substitute a price-only index or an unhedged series for a NOK-hedged index.</p>
        <details className="text-sm"><summary className="cursor-pointer min-h-11 py-2" data-testid="toggle-file-help">File format and validation</summary>
          <div className="space-y-2 text-muted-foreground">
            <p className="break-words font-mono text-xs">{CSV_HEADER}</p>
            <p>Keep the existing dashboard benchmark_id for monthly updates; these stable internal identifiers are shown in the table below. For new series, use a unique stable identifier and the full official name for benchmark_name. currency = NOK; return_type = NET_TR, GROSS_TR or TR; hedging = UNHEDGED, NOK_HEDGED or NA. Keep metadata identical across all rows for a series.</p>
            <p>date is the calendar month-end in YYYY-MM-DD format. level is the official closing total-return index level for that month. Optional source_date preserves the actual last trading date. Comma-separated decimal-point files and semicolon-separated decimal-comma files are supported.</p>
            <p>Duplicate months, gaps, invalid levels, non-NOK currencies and price-only indices are rejected. Monthly additions are merged by index ID and date; historical revisions require review. JSON packages replace the complete assignment map; CSV preserves assignments. Maximum file size: 2 MB.</p>
          </div>
        </details>
        <label className="block text-sm font-medium" htmlFor="benchmark-file">Choose CSV or reviewed JSON package</label>
        <input id="benchmark-file" data-testid="input-benchmark-file" type="file" accept=".csv,.json" className="block max-w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-secondary file:text-secondary-foreground file:px-4 file:py-3" disabled={loading}
          onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        {loading && <p role="status">Validating file…</p>}
        {error && <p role="alert" className="text-destructive text-sm" data-testid="status-import-error">{error}</p>}
        {candidate && <div className="rounded-md border border-border p-4 space-y-3" data-testid="card-import-review">
          <p className="text-sm">{candidate.data.series.length} series after merge · {candidate.additions} new levels · {candidate.revisions} revised observations</p>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} data-testid="checkbox-confirm-official" />
            I confirm these are official total-return indices in the stated currency and hedging variant, and approve any revised observations for this preview.
          </label>
          <Button disabled={!confirmed} data-testid="button-apply-import" onClick={() => {
            setData(candidate.data); setCandidate(null); setMessage("Validated data loaded into this session. Confirm the fund assignments below, then export the package.");
          }}><Upload className="w-4 h-4 mr-2" />Apply to session preview</Button>
        </div>}
        {message && <p role="status" className="text-sm" data-testid="status-import-success">{message}</p>}
      </CardContent></Card>
      <Card><CardContent className="p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Available index series</h2>
        {!data.series.length ? <p className="text-sm text-muted-foreground mt-3" data-testid="status-no-series">No official index levels have been supplied. Fund-only charts remain available.</p> :
          <div className="overflow-x-auto mt-4"><table className="text-sm w-full"><thead><tr className="text-left"><th className="p-2">Index</th><th className="p-2">Variant</th><th className="p-2">Coverage</th><th className="p-2">Levels</th></tr></thead>
            <tbody>{data.series.map(s => <tr key={s.id} className="border-t border-border" data-testid={`row-index-${s.id}`}>
              <td className="p-2">{s.name}<div className="text-xs text-muted-foreground">{s.provider} · {s.id}</div></td>
              <td className="p-2">NOK · {s.returnType}<br />{s.hedging}</td><td className="p-2 font-mono text-xs">{s.levels[0].date}<br />{s.levels.at(-1)!.date}</td><td className="p-2">{s.levels.length}</td>
            </tr>)}</tbody></table></div>}
      </CardContent></Card>
      <Card><CardContent className="p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Fund-to-index assignments</h2>
        <p className="text-sm text-muted-foreground">The legacy benchmark labels below are reference metadata, not confirmed reporting assignments. Select an exact uploaded index for each fund; no automatic substitution is made. An assignment applies to the whole loaded history, so benchmark changes or blends require an approved historical composite series.</p>
        <div className="divide-y divide-border">{funds.map(f => <div key={f.id} className="grid md:grid-cols-2 gap-3 py-4 items-center">
          <div><Link href={`/fund/${f.id}`} className="text-sm font-semibold underline underline-offset-4" data-testid={`link-fund-${f.id}`}>{f.shortName}</Link>
            <p className="text-xs text-muted-foreground mt-1">Legacy label: {f.primaryBenchmark}</p></div>
          <label className="text-xs text-muted-foreground">Reporting benchmark
            <select className="mt-1 block w-full h-11 px-3 rounded-md border border-input bg-background text-foreground text-sm" data-testid={`assign-${f.id}`} value={data.assignments[f.id] || ""}
              disabled={!!candidate}
              onChange={e => {
                const assignments = { ...data.assignments };
                if (e.target.value) assignments[f.id] = e.target.value; else delete assignments[f.id];
                setData({ ...data, assignments });
              }}><option value="">Not assigned</option>{data.series.map(s => <option key={s.id} value={s.id}>{s.name} · {s.hedging}</option>)}</select>
          </label>
        </div>)}</div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={!data.series.length || !!candidate} data-testid="button-export-package" onClick={() => downloadText("benchmark_publication_package.json", JSON.stringify(data, null, 2), "application/json")}><Download className="w-4 h-4 mr-2" />Download publication package</Button>
          <Button variant="outline" disabled={!preview} data-testid="button-reset-preview" onClick={() => { reset(); setCandidate(null); setMessage("Session changes discarded. Restored saved dashboard benchmark data."); setError(""); }}>Discard session changes</Button>
        </div>
      </CardContent></Card>
    </main>
  </div>;
}
