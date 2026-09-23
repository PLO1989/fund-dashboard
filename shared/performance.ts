import { benchmarkPackageSchema, type BenchmarkPackage, type BenchmarkSeries, type RelativeRiskMetrics } from "./schema";

export type ReturnPoint = { date: string; value: number };
export const PERIODS = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y"] as const;
export type Period = typeof PERIODS[number];
export function monthEnd(date: string, offset = 0): string {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m + offset, 0)).toISOString().slice(0, 10);
}
export function isDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date;
}
export function isMonthEnd(date: string) {
  return isDate(date) && monthEnd(date) === date;
}
export function rangeStart(end: string, period: Period) {
  if (period === "YTD") return `${Number(end.slice(0, 4)) - 1}-12-31`;
  return monthEnd(end, -({ "1M": 1, "3M": 3, "6M": 6, "1Y": 12, "3Y": 36, "5Y": 60 }[period]));
}
export function monthDates(start: string, end: string): string[] {
  if (!isMonthEnd(start) || !isMonthEnd(end) || start >= end) return [];
  const n = (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 +
    Number(end.slice(5, 7)) - Number(start.slice(5, 7));
  if (n > 2400) return [];
  return Array.from({ length: n }, (_, i) => monthEnd(start, i + 1));
}
export function fundGrowth(returns: ReturnPoint[], start: string, end: string) {
  const dates = monthDates(start, end);
  const map = new Map<string, number>();
  for (const p of returns) {
    if (p.date <= start || p.date > end) continue;
    if (map.has(p.date) || !isMonthEnd(p.date) || !Number.isFinite(p.value) || p.value < -100) return null;
    map.set(p.date, p.value);
  }
  if (!dates.length || dates.some(d => !map.has(d))) return null;
  let value = 100;
  return [{ date: start, value }, ...dates.map(date => {
    value *= 1 + map.get(date)! / 100;
    return { date, value };
  })];
}
export function indexGrowth(series: BenchmarkSeries | undefined, start: string, end: string) {
  if (!series) return null;
  const dates = [start, ...monthDates(start, end)];
  if (dates.length < 2) return null;
  const levels = new Map(series.levels.map(p => [p.date, p.level]));
  // Never compress time, interpolate, or fabricate a zero-return month.
  if (dates.some(d => !levels.has(d))) return null;
  const base = levels.get(start)!;
  return dates.map(date => ({ date, value: levels.get(date)! / base * 100 }));
}
export function totalReturn(growth: ReturnPoint[] | null) {
  return growth ? growth[growth.length - 1].value - 100 : null;
}
/** Geometric annualised return (CAGR) in percent from a base-100 growth path.
 * Years = number of monthly returns / 12. Only meaningful for periods > 1 year. */
export function annualizedReturn(growth: ReturnPoint[] | null) {
  if (!growth || growth.length < 2) return null;
  const years = (growth.length - 1) / 12;
  return ((growth[growth.length - 1].value / 100) ** (1 / years) - 1) * 100;
}
/** Periods longer than one year are shown annualised in the period chart. */
export const ANNUALISED_PERIODS: readonly Period[] = ["3Y", "5Y"];

/** Ex-post sample tracking error and arithmetic information ratio, annualised.
 * Returns and TE use percentage points; IR is dimensionless. No risk-free rate.
 * Require every month of the exact interval and its opening benchmark level.
 */
export function relativeRisk(
  returns: ReturnPoint[], series: BenchmarkSeries | undefined, start: string, end: string,
): RelativeRiskMetrics | null {
  const dates = monthDates(start, end);
  if (!series || series.currency !== "NOK" || dates.length < 2 || !fundGrowth(returns, start, end)) return null;
  const levels = new Map<string, number>();
  for (const p of series.levels) {
    if (p.date < start || p.date > end) continue;
    if (!isMonthEnd(p.date) || !Number.isFinite(p.level) || p.level <= 0 || levels.has(p.date)) return null;
    levels.set(p.date, p.level);
  }
  if ([start, ...dates].some(date => !levels.has(date))) return null;
  const fundReturns = new Map(returns.map(p => [p.date, p.value]));
  const observations = dates.map((date, i) => {
    const previous = i ? dates[i - 1] : start;
    const benchmarkReturnPct = (levels.get(date)! / levels.get(previous)! - 1) * 100;
    const fundReturnPct = fundReturns.get(date)!;
    return { date, fundReturnPct, benchmarkReturnPct, activeReturnPct: fundReturnPct - benchmarkReturnPct };
  });
  const months = observations.length;
  const mean = observations.reduce((sum, p) => sum + p.activeReturnPct, 0) / months;
  const variance = observations.reduce((sum, p) => sum + (p.activeReturnPct - mean) ** 2, 0) / (months - 1);
  const rawTE = Math.sqrt(variance * 12);
  const annualizedMeanActiveReturnPct = mean * 12;
  if (!Number.isFinite(rawTE) || !Number.isFinite(annualizedMeanActiveReturnPct)) return null;
  // Numerical noise at machine precision must not create a spurious huge IR.
  const trackingErrorPct = rawTE < 1e-10 ? 0 : rawTE;

  // OLS regression of fund returns on benchmark returns over the same window.
  // Sample denominators cancel, so sums of squares are used directly.
  const meanFund = observations.reduce((sum, p) => sum + p.fundReturnPct, 0) / months;
  const meanBench = observations.reduce((sum, p) => sum + p.benchmarkReturnPct, 0) / months;
  let sumXY = 0, sumXX = 0, sumYY = 0;
  for (const p of observations) {
    const df = p.fundReturnPct - meanFund;
    const db = p.benchmarkReturnPct - meanBench;
    sumXY += df * db;
    sumXX += db * db;
    sumYY += df * df;
  }
  // A (near-)constant benchmark or fund series makes the regression undefined.
  const beta = sumXX < 1e-12 ? null : sumXY / sumXX;
  const alphaAnnualizedPct = beta === null ? null : (meanFund - beta * meanBench) * 12;
  const rSquared = sumXX < 1e-12 || sumYY < 1e-12 ? null : (sumXY * sumXY) / (sumXX * sumYY);

  return {
    start, end, months, trackingErrorPct, annualizedMeanActiveReturnPct,
    informationRatio: trackingErrorPct === 0 ? null : annualizedMeanActiveReturnPct / trackingErrorPct,
    beta, alphaAnnualizedPct, rSquared,
    observations,
  };
}

export function benchmarkRiskKpis(returns: ReturnPoint[], series: BenchmarkSeries | undefined, asOf: string) {
  const threeYear = relativeRisk(returns, series, rangeStart(asOf, "3Y"), asOf);
  const fiveYear = relativeRisk(returns, series, rangeStart(asOf, "5Y"), asOf);
  return {
    threeYear, fiveYear,
    trackingError3Y: threeYear?.trackingErrorPct ?? null,
    trackingError5Y: fiveYear?.trackingErrorPct ?? null,
    infoRatio3Y: threeYear?.informationRatio ?? null,
    infoRatio5Y: fiveYear?.informationRatio ?? null,
    alpha3Y: threeYear?.alphaAnnualizedPct ?? null,
    alpha5Y: fiveYear?.alphaAnnualizedPct ?? null,
    beta3Y: threeYear?.beta ?? null,
    beta5Y: fiveYear?.beta ?? null,
    rSquared3Y: threeYear?.rSquared ?? null,
    rSquared5Y: fiveYear?.rSquared ?? null,
  };
}
export function validatePackage(raw: unknown): BenchmarkPackage {
  const parsed = benchmarkPackageSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid benchmark metadata. Require NOK, NET_TR / GROSS_TR / TR and UNHEDGED / NOK_HEDGED / NA.");
  const data = parsed.data;
  const ids = new Set<string>();
  for (const s of data.series) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(s.id) || ["__proto__", "constructor", "prototype"].includes(s.id) || ids.has(s.id))
      throw new Error(`Invalid or duplicate benchmark ID: ${s.id}`);
    ids.add(s.id);
    s.levels.sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < s.levels.length; i++) {
      const p = s.levels[i];
      if (!isMonthEnd(p.date)) throw new Error(`${s.id}: ${p.date} must be a calendar month-end (YYYY-MM-DD).`);
      if (p.sourceDate && (!isDate(p.sourceDate) || p.sourceDate.slice(0, 7) !== p.date.slice(0, 7) || p.sourceDate > p.date))
        throw new Error(`${s.id}: invalid source_date for ${p.date}.`);
      if (i && monthEnd(s.levels[i - 1].date, 1) !== p.date)
        throw new Error(`${s.id}: duplicate or missing month before ${p.date}. Supply a continuous series.`);
    }
  }
  for (const [fund, id] of Object.entries(data.assignments)) {
    if (!/^F[A-Z0-9]+$/.test(fund) || !ids.has(id)) throw new Error(`Invalid assignment: ${fund} → ${id}`);
  }
  return data;
}

export const CSV_HEADER = "benchmark_id,benchmark_name,provider,currency,return_type,hedging,date,level,source_date";

function csvRows(text: string): string[][] {
  text = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  const first = text.split("\n")[0];
  const delimiter = first.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (c === delimiter || c === "\n")) {
      row.push(cell.trim()); cell = "";
      if (c === "\n") { if (row.some(Boolean)) rows.push(row); row = []; }
    } else cell += c;
  }
  if (quoted) throw new Error("CSV contains an unclosed quotation mark.");
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseBenchmarkCsv(text: string): BenchmarkPackage {
  if (text.length > 2_000_000) throw new Error("Maximum CSV size is 2 MB.");
  const rows = csvRows(text), headers = rows.shift() || [];
  const required = CSV_HEADER.split(",").filter(k => k !== "source_date");
  if (new Set(headers).size !== headers.length || required.some(h => !headers.includes(h)))
    throw new Error(`Required CSV columns: ${required.join(", ")}.`);
  if (!rows.length) throw new Error("The file contains no index levels.");
  const grouped = new Map<string, any>();
  rows.forEach((cells, i) => {
    if (cells.length !== headers.length) throw new Error(`CSV row ${i + 2}: column count does not match the header.`);
    const r = Object.fromEntries(headers.map((h, j) => [h, cells[j]]));
    if (!/^\d+(?:[.,]\d+)?$/.test(r.level)) throw new Error(`CSV row ${i + 2}: level must be a positive number without thousands separators.`);
    const meta = {
      id: r.benchmark_id, name: r.benchmark_name, provider: r.provider,
      currency: r.currency, returnType: r.return_type, hedging: r.hedging,
    };
    let s = grouped.get(meta.id);
    if (!s) { s = { ...meta, levels: [] }; grouped.set(meta.id, s); }
    for (const key of Object.keys(meta) as (keyof typeof meta)[]) {
      if (s[key] !== meta[key]) throw new Error(`CSV row ${i + 2}: metadata changes within ${meta.id}.`);
    }
    s.levels.push({ date: r.date, level: Number(r.level.replace(",", ".")), ...(r.source_date ? { sourceDate: r.source_date } : {}) });
  });
  return validatePackage({ version: 1, series: Array.from(grouped.values()), assignments: {} });
}

export function mergePackages(existing: BenchmarkPackage, incoming: BenchmarkPackage) {
  const series = new Map(existing.series.map(s => [s.id, structuredClone(s)]));
  let revisions = 0, additions = 0;
  for (const s of incoming.series) {
    const old = series.get(s.id);
    if (!old) { series.set(s.id, s); additions += s.levels.length; continue; }
    for (const key of ["name", "provider", "currency", "returnType", "hedging"] as const) {
      if (old[key] !== s[key]) throw new Error(`${s.id}: metadata differs from the stored series. Use a new ID for another index variant.`);
    }
    const levels = new Map(old.levels.map(p => [p.date, p]));
    for (const p of s.levels) {
      const previous = levels.get(p.date);
      if (previous && (previous.level !== p.level || previous.sourceDate !== p.sourceDate)) revisions++;
      if (!previous) additions++;
      levels.set(p.date, p);
    }
    old.levels = Array.from(levels.values());
  }
  return { data: validatePackage({
    version: 1, series: Array.from(series.values()),
    assignments: { ...existing.assignments, ...incoming.assignments },
  }), revisions, additions };
}

