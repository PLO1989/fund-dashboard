import { createContext, useContext, useState, type ReactNode } from "react";
import initialData from "@shared/benchmarkData.json";
import { validatePackage } from "@shared/performance";
import type { BenchmarkPackage } from "@shared/schema";

export const publishedBenchmarks = validatePackage(initialData);
const Context = createContext<{
  data: BenchmarkPackage;
  setData: (data: BenchmarkPackage) => void;
  preview: boolean;
  reset: () => void;
} | null>(null);
export function BenchmarkProvider({ children }: { children: ReactNode }) {
  const [data, update] = useState(publishedBenchmarks);
  const [preview, setPreview] = useState(false);
  return <Context.Provider value={{
    data, preview,
    setData: value => { update(validatePackage(value)); setPreview(true); },
    reset: () => { update(publishedBenchmarks); setPreview(false); },
  }}>{children}</Context.Provider>;
}
export function useBenchmarks() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("BenchmarkProvider missing");
  return ctx;
}
export function downloadText(name: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
