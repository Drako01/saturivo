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

test("incomplete or corrupt k6 HTTP summary cannot be interpreted as zero failures", () => {
  const base = {
    http_reqs: { values: { count: 100, rate: 10 } },
    http_req_failed: { values: { rate: 0 } },
    http_req_duration: { values: { avg: 10, med: 9, "p(95)": 20, "p(99)": 30 } },
  };
  for (const broken of [
    { ...base, http_req_failed: undefined },
    { ...base, http_req_failed: { values: { rate: 1.5 } } },
    { ...base, http_req_duration: { values: { avg: 10, med: 9, "p(95)": 20 } } },
  ]) assert.throws(() => readK6Summary({ metrics: broken }), /missing or corrupt/);
});

test("v2 measured window isolates P95, errors and rates, with full-run request budget", () => {
  const phase = "{saturivo_phase:measurement}";
  const result = readK6Summary({ metrics: {
    http_reqs: { values: { count: 100, rate: 10 } },
    ["http_reqs"+phase]: { values: { count: 70, rate: 7 } },
    ["http_req_failed"+phase]: { values: { rate: 0.1 } },
    ["http_req_duration"+phase]: { values: {
      avg: 22, med: 15, "p(95)": 36, "p(99)": 55,
    } },
    saturivo_measure_status_2xx: { values: { count: 63 } },
    saturivo_measure_status_5xx: { values: { count: 7 } },
  } }, 10, 7);
  assert.equal(result.requests, 70);
  assert.equal(result.totalRequests, 100);
  assert.equal(result.requestsPerSecond, 10);
  assert.equal(result.achievedArrivalRate, 10);
  assert.equal(result.failedRate, 0.1);
  assert.equal(result.p95Ms, 36);
  assert.equal(result.statusDistribution?.["5xx"], 7);
  assert.throws(() => readK6Summary({ metrics: {
    http_reqs: { values: { count: 100, rate: 10 } },
    ["http_reqs"+phase]: { values: { count: 70, rate: 7 } },
    ["http_req_failed"+phase]: { values: { rate: 0.1 } },
    ["http_req_duration"+phase]: { values: {
      avg: 22, med: 15, "p(95)": 36, "p(99)": 55,
    } },
    saturivo_measure_status_2xx: { values: { count: 69 } },
  } }, undefined, 7), /status evidence is incomplete/);
});

test("phase-aware k6 script tags HTTP requests, keeps global cap and scopes only measured SLOs", () => {
  const scenario: Scenario = { id: "phase", name: "Measured", target: "http://127.0.0.1:8080/",
    method: "GET", model: "constant-vus", workloadVersion: 2, durationSeconds: 10,
    virtualUsers: 1, maxRequests: 1000, warmupSeconds: 2, cooldownSeconds: 2 };
  const generated = renderK6Script(scenario, "/tmp/phased.json");
  assert.match(generated, /currentTestRunDuration/);
  assert.match(generated, /saturivo_phase: phase/);
  assert.match(generated, /http_reqs\{saturivo_phase:measurement\}/);
  assert.match(generated, /saturivo_measure_status_2xx/);
  assert.match(generated, /iterationInTest >= 1000/);
  assert.match(renderK6Script({ ...scenario, warmupSeconds: 0, cooldownSeconds: 0 },
    "/tmp/unphased.json"), /iterationInTest >= 1000/);
});
