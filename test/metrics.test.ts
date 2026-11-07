import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readK6Summary } from "../src/core/metrics";
import { renderK6Script } from "../src/core/k6";
import type { Scenario } from "../src/core/types";

test("k6 metric parsing", () => {
  const result = readK6Summary({ metrics: {
    http_reqs: { values: { count: 100, rate: 20 } },
    http_req_failed: { values: { rate: 0.01 } },
    http_req_duration: { values: { avg: 12, med: 10, "p(95)": 21, "p(99)": 30 } },
    dropped_iterations: { values: { count: 2 } },
  } });
  assert.equal(result.requests, 100);
  assert.equal(result.p95Ms, 21);
  assert.equal(result.p99Ms, 30);
  assert.equal(result.failedRate, 0.01);
  assert.equal(result.droppedIterations, 2);
  assert.throws(() => readK6Summary({ metrics: {} }), /no HTTP/);
});
test("safe generated k6 script supports both load models", () => {
  const scenario: Scenario = { id: "test", name: "Scenario", target: "http://127.0.0.1:8080/",
    model: "constant-vus", method: "GET", durationSeconds: 10, virtualUsers: 5 };
  const closed = renderK6Script(scenario, "/tmp/summary.json");
  const open = renderK6Script({ ...scenario, model: "constant-arrival-rate", arrivalRate: 25 }, "/tmp/summary.json");
  assert.match(closed, /constant-vus/);
  assert.match(open, /constant-arrival-rate/);
  assert.match(open, /"p\(99\)"/);
  assert.match(open, /redirects: 0/);
  assert.match(open, /iterationInTest/);
  assert.match(open, /sleep\(1\)/);
});

test("v2 ramping scenario renders bounded k6 stages", () => {
  const ramp: Scenario = {
    id: "ramp", name: "Ramp", target: "http://127.0.0.1:8080/",
    model: "ramping-vus", workloadVersion: 2, method: "GET",
    durationSeconds: 20, virtualUsers: 5,
    stages: [{ durationSeconds: 5, targetVus: 2 }, { durationSeconds: 10, targetVus: 5 },
      { durationSeconds: 5, targetVus: 0 }],
  };
  const source = renderK6Script(ramp, "/tmp/ramp-summary.json");
  assert.match(source, /ramping-vus/);
  assert.match(source, /"target":0/);
  assert.match(source, /"duration":"10s"/);
});

test("localhost is pinned to a loopback address instead of DNS or manipulated hosts-file entry", () => {
  const scenario: Scenario = {
    id: "local", name: "Local DNS pin", target: "http://localhost:8080/health",
    model: "constant-vus", method: "GET", durationSeconds: 10, virtualUsers: 1,
  };
  const generated = renderK6Script(scenario, "/tmp/local-summary.json");
  assert.match(generated, /"hosts":\{"localhost":"127\.0\.0\.1","localhost\.":"127\.0\.0\.1"\}/);
  assert.match(generated, /redirects: 0/);
});

test("status class distribution and target vs achieved arrivals survive k6 summary parsing", () => {
  const result = readK6Summary({ metrics: {
    http_reqs: { values: { count: 100, rate: 19.2 } },
    http_req_failed: { values: { rate: 0.1 } },
    http_req_duration: { values: { avg: 15, med: 12, "p(95)": 29, "p(99)": 40 } },
    saturivo_status_2xx: { values: { count: 90 } },
    saturivo_status_5xx: { values: { count: 10 } },
  } }, 25);
  assert.equal(result.targetArrivalRate, 25);
  assert.equal(result.achievedArrivalRate, 19.2);
  assert.equal(result.statusDistribution?.["2xx"], 90);
  assert.equal(result.statusDistribution?.["5xx"], 10);
  assert.equal(result.statusDistribution?.["4xx"], 0);
});

test("generated k6 script instruments HTTP response statuses without unbounded output", () => {
  const scenario: Scenario = {
    id: "status", name: "Response distribution", target: "http://127.0.0.1/",
    method: "GET", model: "constant-vus", virtualUsers: 1,
    durationSeconds: 10, maxRequests: 1000,
  };
  const script = renderK6Script(scenario, "/tmp/status.json");
  assert.match(script, /saturivo_status_5xx/);
  assert.match(script, /saturivo_status_unknown/);
  assert.match(script, /statuses\[group\]\.add\(1\)/);
  assert.match(script, /iterationInTest >= 1000/);
});
