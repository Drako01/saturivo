import { test } from "node:test";
import { strict as assert } from "node:assert";
import { assertAllowedTarget, isLoopbackHost, validateScenario } from "../src/core/validation";
import type { Scenario } from "../src/core/types";

const policy = { allowRemoteTargets: false, maxVirtualUsers: 30 };
const scenario: Scenario = {
  id: "test", name: "Test", target: "http://127.0.0.1:8080/",
  method: "GET", model: "constant-vus", durationSeconds: 10, virtualUsers: 5,
};
test("loopback parsing", () => {
  for (const host of ["localhost", "LOCALHOST.", "127.0.0.1", "127.1.2.3", "[::1]"]) {
    assert.equal(isLoopbackHost(host), true);
  }
  for (const host of ["example.com", "10.0.0.1", "169.254.169.254", "0.0.0.0"]) {
    assert.equal(isLoopbackHost(host), false);
  }
});
test("safe target defaults", () => {
  assert.equal(assertAllowedTarget(scenario.target, policy).hostname, "127.0.0.1");
  assert.throws(() => assertAllowedTarget("https://example.com", policy), /Remote targets/);
  assert.throws(() => assertAllowedTarget("file:///etc/passwd", policy), /Only http/);
  assert.throws(() => assertAllowedTarget("http://user:pass@localhost", policy), /Credentials/);
  assert.throws(() => assertAllowedTarget("http://localhost/#foo", policy), /fragments/);
});
test("strict bounded workloads", () => {
  assert.equal(validateScenario(scenario, policy).virtualUsers, 5);
  assert.equal(validateScenario(scenario, policy).maxRequests, 10000);
  assert.throws(() => validateScenario({ ...scenario, maxRequests: 100001 }, policy), /Maximum requests/);
  assert.throws(() => validateScenario({ ...scenario, maxRequests: 500 },
    { ...policy, maxRequests: 200 }), /request budget/);
  assert.throws(() => validateScenario({ ...scenario, virtualUsers: 31 }, policy), /ceiling/);
  assert.throws(() => validateScenario({ ...scenario, durationSeconds: 1000 }, policy), /Duration/);
  assert.throws(() => validateScenario({ ...scenario, method: "POST" as "GET" }, policy), /GET/);
  assert.throws(() => validateScenario({ ...scenario, model: "constant-arrival-rate", arrivalRate: 501 }, policy), /rate/);
  assert.equal(validateScenario({ ...scenario, model: "constant-arrival-rate", arrivalRate: 25 }, policy).arrivalRate, 25);
});
