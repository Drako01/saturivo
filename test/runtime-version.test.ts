import { test } from "node:test";
import { strict as assert } from "node:assert";
import { saturivoVersion } from "../src/core/version";
import { renderWebSocketProbe } from "../src/core/websocket";
import { renderK6Script } from "../src/core/k6";

test("generated k6 and WebSocket scripts always use the packaged version", () => {
  const version = saturivoVersion();
  const signature = '"userAgent":"Saturivo/' + version + '"';
  assert.equal(version, require("../../package.json").version);
  assert(renderWebSocketProbe("ws://127.0.0.1:4040/", "/tmp/summary.json").includes(signature));
  assert(renderK6Script({ id: "smoke", name: "Smoke", target: "http://127.0.0.1:8080/",
    method: "GET", model: "constant-vus", durationSeconds: 10, virtualUsers: 1 },
    "/tmp/summary.json").includes(signature));
});
