import { useAsOf, formatAsOfDate, LATEST_AS_OF_DATE } from "@/lib/asOfContext";
import { Calendar } from "lucide-react";

/**
 * Globalt valg av asOf-dato. Påvirker KPI/return-feltene i hele dashboardet.
 * Bygges/eksponering forblir på siste rapporterte dato.
 */
export function DateSelector({ variant = "light" }: { variant?: "light" | "dark" } = {}) {
  const { asOf, setAsOf, availableDates } = useAsOf();
  // Vis nyeste først i nedtrekket
  const reversed = [...availableDates].reverse();
  const isLatest = asOf === LATEST_AS_OF_DATE;
  const labelCls = variant === "dark" ? "text-xs text-white/80" : "text-xs text-muted-foreground";
  const iconCls = variant === "dark" ? "h-4 w-4 text-white/80" : "h-4 w-4 text-muted-foreground";
  const selectCls =
    variant === "dark"
      ? "rounded-md border border-white/30 bg-white/10 text-white px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-foreground"
      : "rounded-md border border-input bg-background px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring";
  const resetCls =
    variant === "dark" ? "text-xs text-white/80 hover:text-white underline" : "text-xs text-primary hover:underline";
  return (
    <div className="flex items-center gap-2">
      <Calendar className={iconCls} />
      <label htmlFor="asof-select" className={labelCls}>
        Per dato:
      </label>
      <select
        id="asof-select"
        value={asOf}
        onChange={(e) => setAsOf(e.target.value)}
        className={selectCls}
        data-testid="asof-selector"
      >
        {reversed.map((d) => (
          <option key={d} value={d}>
            {formatAsOfDate(d)}
            {d === LATEST_AS_OF_DATE ? " (siste)" : ""}
          </option>
        ))}
      </select>
      {!isLatest && (
        <button
          type="button"
          onClick={() => setAsOf(LATEST_AS_OF_DATE)}
          className={resetCls}
        >
          Tilbakestill
        </button>
      )}
    </div>
  );
}
