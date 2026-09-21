import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import { funds, type Fund, type KpiSnapshot } from "@/lib/fundData";

// Bygg den globale listen over tilgjengelige asOf-datoer fra kpiHistory.
// Vi tar union (intersection ville droppet nye fond med kort historikk).
function getAvailableAsOfDates(): string[] {
  const set = new Set<string>();
  for (const f of funds) {
    for (const k of f.kpiHistory || []) set.add(k.asOf);
  }
  return Array.from(set).sort();
}

export const AVAILABLE_AS_OF_DATES = getAvailableAsOfDates();
export const LATEST_AS_OF_DATE =
  AVAILABLE_AS_OF_DATES[AVAILABLE_AS_OF_DATES.length - 1] || "2026-04-30";

interface AsOfContextValue {
  asOf: string;
  setAsOf: (d: string) => void;
  availableDates: string[];
}

const AsOfContext = createContext<AsOfContextValue | null>(null);

export function AsOfProvider({ children }: { children: ReactNode }) {
  const [asOf, setAsOf] = useState<string>(LATEST_AS_OF_DATE);
  const value = useMemo(
    () => ({ asOf, setAsOf, availableDates: AVAILABLE_AS_OF_DATES }),
    [asOf]
  );
  return <AsOfContext.Provider value={value}>{children}</AsOfContext.Provider>;
}

export function useAsOf() {
  const ctx = useContext(AsOfContext);
  if (!ctx) throw new Error("useAsOf must be inside AsOfProvider");
  return ctx;
}

/**
 * Hent KPI-snapshot for et fond på en gitt asOf-dato.
 * Faller tilbake til siste tilgjengelige snapshot ≤ asOf for det fondet.
 */
export function getKpisForAsOf(fund: Fund, asOf: string): KpiSnapshot {
  const history = fund.kpiHistory || [];
  // Eksakt match først
  const exact = history.find((k) => k.asOf === asOf);
  if (exact) return exact;
  // Ellers siste snapshot ≤ asOf
  const eligible = history.filter((k) => k.asOf <= asOf);
  if (eligible.length > 0) return eligible[eligible.length - 1];
  // Ingen historikk: returner fra topp-nivå feltene (siste/nåværende)
  return {
    asOf,
    return1M: fund.return1M,
    returnYTD: fund.returnYTD,
    return6M: fund.return6M,
    return1Y: fund.return1Y,
    return3Y: fund.return3Y,
    return5Y: fund.return5Y,
    stdDev3Y: fund.stdDev3Y,
    sharpe3Y: fund.sharpe3Y,
    maxDrawdown3Y: null,
  };
}

/** Formatter "2026-04-30" → "30. apr 2026" på norsk. */
export function formatAsOfDate(d: string): string {
  const dt = new Date(d + "T00:00:00Z");
  const months = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
  const day = dt.getUTCDate();
  const mo = months[dt.getUTCMonth()];
  const yr = dt.getUTCFullYear();
  return `${day}. ${mo} ${yr}`;
}
