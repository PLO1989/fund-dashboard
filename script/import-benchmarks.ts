import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
import { funds, DATA_DATES } from "../client/src/lib/fundData";
import { parseBenchmarkCsv, validatePackage, mergePackages } from "../shared/performance";

// Reviewed release-time import only. No write endpoint is exposed to site visitors.
// npm run benchmarks:import -- levels.csv [--allow-revisions] [--dry-run]
try {
  const args = process.argv.slice(2);
  const input = args.find(a => !a.startsWith("--"));
  if (!input || args.some(a => a.startsWith("--") && !["--allow-revisions", "--dry-run"].includes(a))) {
    throw new Error("Usage: npm run benchmarks:import -- file.csv|package.json [--allow-revisions] [--dry-run]");
  }
  const path = resolve("shared/benchmarkData.json");
  const before = readFileSync(path, "utf8");
  const existing = validatePackage(JSON.parse(before));
  const raw = readFileSync(resolve(input), "utf8");
  if (Buffer.byteLength(raw, "utf8") > 2_000_000) throw new Error("Maximum input size is 2 MB.");
  const isPackage = extname(input).toLowerCase() === ".json";
  if (!isPackage && extname(input).toLowerCase() !== ".csv") throw new Error("Use CSV or JSON.");
  const incoming = isPackage ? validatePackage(JSON.parse(raw)) : parseBenchmarkCsv(raw);
  const result = mergePackages(existing, incoming);
  if (isPackage) result.data.assignments = incoming.assignments;
  for (const id of Object.keys(result.data.assignments)) {
    if (!funds.some(f => f.id === id)) throw new Error(`Unknown fund ID: ${id}`);
  }
  for (const s of result.data.series) {
    if (s.levels.some(p => p.date > DATA_DATES.performanceAsOf))
      throw new Error(`${s.id}: date exceeds fund reporting date ${DATA_DATES.performanceAsOf}.`);
  }
  if (result.revisions && !args.includes("--allow-revisions"))
    throw new Error(`${result.revisions} historical revisions detected. Review them and rerun with --allow-revisions.`);
  const digest = createHash("sha256").update(raw).digest("hex");
  console.log(JSON.stringify({
    asOf: DATA_DATES.performanceAsOf, series: result.data.series.length,
    assignments: result.data.assignments, additions: result.additions, revisions: result.revisions,
    sha256: digest, dryRun: args.includes("--dry-run"),
  }, null, 2));
  if (!args.includes("--dry-run")) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const archive = resolve("benchmark-audit", `${stamp}-${digest.slice(0, 12)}`);
    mkdirSync(archive, { recursive: true });
    writeFileSync(resolve(archive, "before.json"), before);
    writeFileSync(resolve(archive, `input${isPackage ? ".json" : ".csv"}`), raw);
    const after = JSON.stringify(result.data, null, 2) + "\n";
    writeFileSync(resolve(archive, "after.json"), after);
    writeFileSync(path + ".tmp", after);
    renameSync(path + ".tmp", path);
    console.log("Validated benchmark data saved. Rebuild, review the preview, and approve publication separately.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
