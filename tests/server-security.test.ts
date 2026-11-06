import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("read-only production server does not enable request-body parsing", () => {
  const source = readFileSync(
    new URL("../server/index.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /\bexpress\s*\.\s*(json|urlencoded|raw|text)\s*\(/,
    "Do not add global body parsers to this read-only dashboard",
  );
  assert.doesNotMatch(source, /\brawBody\b/);
});
