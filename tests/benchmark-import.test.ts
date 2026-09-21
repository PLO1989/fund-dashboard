import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { CSV_HEADER } from "../shared/performance";

test("release importer supports dry runs, atomic merges, revision approval, audit and assignment removals", () => {
  const dir = mkdtempSync(join(tmpdir(), "benchmark-import-test-"));
  const script = resolve("script/import-benchmarks.ts");
  const tsx = resolve("node_modules/.bin/tsx");
  const run = (...args: string[]) => execFileSync(tsx, [script, ...args], { cwd: dir, encoding: "utf8", stdio: "pipe" });
  const target = join(dir, "shared/benchmarkData.json");
  try {
    mkdirSync(join(dir, "shared"));
    const blank = '{"version":1,"series":[],"assignments":{}}';
    writeFileSync(target, blank);
    const input = join(dir, "input.csv");
    const csv = (date: string, level: number) => `${CSV_HEADER}\nQA_ONLY,Test Fixture,TEST_ONLY,NOK,TR,NA,${date},${level},\n`;
    writeFileSync(input, csv("2026-07-31", 100));
    assert.match(run(input, "--dry-run"), /"dryRun": true/);
    assert.equal(readFileSync(target, "utf8"), blank);
    run(input);
    assert.equal(JSON.parse(readFileSync(target, "utf8")).series[0].levels.length, 1);
    writeFileSync(input, csv("2026-08-31", 105));
    run(input);
    writeFileSync(input, csv("2026-08-31", 106));
    const beforeRevision = readFileSync(target, "utf8");
    assert.throws(() => run(input), /historical revisions detected/);
    assert.equal(readFileSync(target, "utf8"), beforeRevision);
    run(input, "--allow-revisions");
    assert.equal(JSON.parse(readFileSync(target, "utf8")).series[0].levels.at(-1).level, 106);
    assert.equal(readdirSync(join(dir, "benchmark-audit")).length, 3);
    writeFileSync(input, csv("2026-09-30", 110));
    assert.throws(() => run(input), /exceeds fund reporting date/);
    const pkg = JSON.parse(readFileSync(target, "utf8"));
    const json = join(dir, "package.json");
    pkg.assignments = { F0GBR04NJK: "QA_ONLY" };
    writeFileSync(json, JSON.stringify(pkg));
    run(json);
    assert.equal(JSON.parse(readFileSync(target, "utf8")).assignments.F0GBR04NJK, "QA_ONLY");
    pkg.assignments = {};
    writeFileSync(json, JSON.stringify(pkg));
    run(json);
    assert.deepEqual(JSON.parse(readFileSync(target, "utf8")).assignments, {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
