/*
 * Shared dashboard components: ValueCell, StarRating, Logo, SortHeader, formatters
 */
import { Star } from "lucide-react";
import type { Fund } from "@/lib/fundData";

export function ValueCell({
  value,
  suffix = "%",
  decimals = 2,
}: {
  value: number | null | undefined;
  suffix?: string;
  decimals?: number;
}) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground font-mono text-sm">N/A</span>;
  }
  const isPositive = value >= 0;
  return (
    <span
      className={`font-mono text-sm font-medium ${
        isPositive ? "value-positive" : "value-negative"
      }`}
      data-testid={`value-${value.toFixed(decimals)}`}
    >
      {isPositive ? "+" : ""}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function PlainNum({
  value,
  decimals = 2,
  suffix = "",
}: {
  value: number | null | undefined;
  decimals?: number;
  suffix?: string;
}) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground font-mono text-sm">N/A</span>;
  }
  return (
    <span className="font-mono text-sm">
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex gap-0.5" aria-label={`${rating} stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating ? "fill-amber-500 text-amber-500" : "text-gray-300 dark:text-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

export function ClassBadge({ assetClass }: { assetClass: Fund["assetClass"] }) {
  const isEquity = assetClass === "Equity";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
        isEquity
          ? "bg-sb1-navy text-white"
          : "bg-secondary text-secondary-foreground border border-border"
      }`}
    >
      {isEquity ? "Equity" : "Fixed Income"}
    </span>
  );
}

/** Geometric SB1-inspired logomark: a circle containing a stylized "1" */
export function SB1Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SpareBank 1"
      className={className}
    >
      <circle cx="20" cy="20" r="18" fill="hsl(var(--sb1-red))" />
      <path
        d="M17 12 L22 12 L22 28 L19 28 L19 16 L15.5 17.5 Z"
        fill="white"
      />
    </svg>
  );
}

// Brand-aligned chart palette — navy-dominant with red accent
export const CHART_COLORS = [
  "#1a3c7e", // SB1 navy
  "#e60000", // SB1 red
  "#4a7bc2", // mid blue
  "#2d8659", // forest green
  "#b8860b", // dark gold
  "#6e3f8c", // muted purple
  "#1f4a7d",
  "#3a6cb0",
  "#8db5e0",
  "#b30000",
  "#0f2d5e",
  "#4d6e9e",
];

export function formatCurrencyNOK(value: number, withSuffix = true): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (withSuffix && abs >= 1e9) {
    return `NOK ${(value / 1e9).toFixed(2)}B`;
  }
  if (withSuffix && abs >= 1e6) {
    return `NOK ${(value / 1e6).toFixed(1)}M`;
  }
  return `NOK ${value.toLocaleString("nb-NO", { maximumFractionDigits: 0 })}`;
}

export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatNum(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "N/A";
  return value.toFixed(decimals);
}

/** Compact axis-style number formatter (1.2k, 3.4M) */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
}
