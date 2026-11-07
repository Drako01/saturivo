import { test } from "node:test";
import { strict as assert } from "node:assert";
import { dashboard } from "../src/ui/html";
import { translate } from "../src/ui/localize";

test("bilingual strings", () => {
  assert.match(translate("es-AR", "title"), /Centro de Control/);
  assert.match(translate("en", "title"), /Control Center/);
});
test("HTML escapes workspace-controlled values and has CSP", () => {
  const markup = dashboard({
    target: "<img src=x onerror=alert(1)>", busy: false,
    history: [], message: "<script>alert(1)</script>",
  }, "en");
  assert(!markup.includes("<img src=x"));
  assert(!markup.includes("<script>alert(1)"));
  assert.match(markup, /Content-Security-Policy/);
  assert.match(markup, /data-action="runSmoke"/);
});
