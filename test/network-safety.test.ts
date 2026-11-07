import { test } from "node:test";
import { strict as assert } from "node:assert";
import { isPublicIp, pinnedTargetHosts } from "../src/core/network-safety";
import { assertAllowedTarget } from "../src/core/validation";
import { renderK6Script } from "../src/core/k6";
import type { Scenario } from "../src/core/types";

const policy = { allowRemoteTargets: true, maxVirtualUsers: 5 };
const scenario: Scenario = {
  id: "dns", name: "Authorized remote workload",
  target: "https://api.example.test/status", method: "GET", model: "constant-vus",
  durationSeconds: 10, virtualUsers: 1, maxRequests: 1000,
};
test("special-use IPv4 and IPv6 addresses are never accepted as remote destinations", () => {
  const denied = [
    "0.0.0.0", "10.1.2.3", "127.1.2.3", "169.254.169.254",
    "172.16.0.1", "192.168.0.1", "100.64.0.1",
    "192.0.2.2", "198.18.0.1", "198.51.100.1", "203.0.113.5",
    "224.0.0.1", "255.255.255.255", "::1", "::ffff:7f00:1",
    "::ffff:c0a8:101", "fc00::1", "fe80::1", "2001:db8::1",
    "2001:0db8::1", "2001::1", "2001:10::1", "2001:20::1",
    "2002:7f00:1::", "2002:c0a8:101::", "3ffe::1",
  ];
  for (const address of denied) assert.equal(isPublicIp(address), false, address);
  for (const address of ["8.8.8.8", "1.1.1.1", "2001:4860:4860::8888"]) {
    assert.equal(isPublicIp(address), true, address);
  }
  for (const raw of [
    "http://169.254.169.254/metadata", "https://10.0.0.7/",
    "http://[::ffff:127.0.0.1]/", "http://[fc00::7]/",
  ]) assert.throws(() => assertAllowedTarget(raw, policy), /Private or special-use/);
  assert.equal(assertAllowedTarget("https://8.8.8.8/", policy).hostname, "8.8.8.8");
});

test("DNS rebinding or mixed public/private results fail closed", async () => {
  const signal = new AbortController().signal;
  const resolve = (answers: readonly string[]) => async () => answers;
  for (const addresses of [
    ["8.8.8.8", "127.0.0.1"], ["10.0.0.2"], ["169.254.169.254"],
    [], ["unparsable"], ["2001:db8::1"], Array.from({length: 17}, () => "8.8.8.8"),
  ]) {
    await assert.rejects(pinnedTargetHosts(scenario.target, signal, resolve(addresses)),
      /Remote DNS/);
  }
});

test("approved public remote address is pinned in generated k6 script", async () => {
  const hosts = await pinnedTargetHosts(scenario.target, new AbortController().signal,
    async () => ["8.8.8.8", "1.1.1.1"]);
  assert.deepEqual(hosts, { "api.example.test": "8.8.8.8" });
  const script = renderK6Script(scenario, "/tmp/summary.json", hosts);
  assert.match(script, /"hosts":\{"api\.example\.test":"8\.8\.8\.8"\}/);
  assert.match(script, /redirects: 0/);
  const local = await pinnedTargetHosts("http://localhost:8090", new AbortController().signal,
    async () => { throw new Error("Local hosts must never query DNS"); });
  assert.equal(local.localhost, "127.0.0.1");
});

test("abort before DNS resolution launches no resolver", async () => {
  const controller = new AbortController(); controller.abort();
  let invoked = false;
  await assert.rejects(pinnedTargetHosts(scenario.target, controller.signal, async () => {
    invoked = true; return ["8.8.8.8"];
  }), /Cancelled/);
  assert.equal(invoked, false);
});

test("6to4, Teredo and zero-padded reserved IPv6 cannot bypass DNS pinning", async () => {
  const signal = new AbortController().signal;
  for (const address of ["2002:7f00:1::", "2001:0db8::7", "2001::1", "3ffe::1"]) {
    await assert.rejects(pinnedTargetHosts(scenario.target, signal, async () => [address]),
      /Remote DNS/, address);
  }
  for (const address of ["2002:7f00:1::", "2001:0db8::7", "2001:20::1"]) {
    assert.throws(() => assertAllowedTarget("http://[" + address + "]/", policy),
      /Private or special-use/, address);
  }
  assert.deepEqual(await pinnedTargetHosts(scenario.target, signal, async () =>
    ["2001:4860:4860::8888"]), { "api.example.test": "2001:4860:4860::8888" });
});
