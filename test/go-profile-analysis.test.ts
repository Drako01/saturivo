import { test } from "node:test";
import { strict as assert } from "node:assert";
import { analyzeGoroutineStacks, goroutineComparison } from "../src/core/go-profile-analysis";
test("classifies observed states without claiming a leak", () => {
  const input = [
    "goroutine 1 [running]:", "main.main()",
    "goroutine 12 [chan receive, 5 minutes]:", "main.work()",
    "goroutine 13 [chan receive]:", "main.work()",
    "goroutine 17 [IO wait]:", "net.(*pollDesc).wait()",
  ].join("\n");
  const result = analyzeGoroutineStacks(input);
  assert.equal(result.observedStacks, 4);
  assert.equal(result.states["chan receive"], 2);
  assert.equal(result.states["IO wait"], 1);
  assert.match(goroutineComparison(result, analyzeGoroutineStacks(input + "\ngoroutine 19 [running]:\n")),
    /not proof of goroutine leakage/);
});
