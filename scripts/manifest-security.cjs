"use strict";
const assert = require("node:assert/strict");

/** Workspace settings may never choose a command executed as the user. */
function assertMachineOnlyExecutableSettings(manifest) {
  const properties = manifest?.contributes?.configuration?.properties ?? {};
  for (const [name, setting] of Object.entries(properties)) {
    if (/(?:path|binary|executable)$/i.test(name)) {
      assert.equal(setting.scope, "machine",
        name + " must be machine-scoped: workspace overrides can execute arbitrary binaries");
    }
  }
  assert.equal(properties["saturivo.k6Path"]?.scope, "machine");
  assert.equal(properties["saturivo.goProfilerOrigin"]?.scope, "machine");
}
module.exports = { assertMachineOnlyExecutableSettings };
