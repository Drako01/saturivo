"use strict";
const fs = require("node:fs");

function coverageRows(output) {
  const items = [];
  const parents = [];
  let inside = false;
  for (const line of output.split(/\r?\n/)) {
    if (line.includes("# start of coverage report")) { inside = true; continue; }
    if (line.includes("# end of coverage report")) break;
    if (!inside || !line.startsWith("#") || !line.includes("|")) continue;
    const left = line.slice(1, line.indexOf("|"));
    const name = left.trim();
    if (!name || /^(file|all files|-+)/.test(name)) continue;
    const level = (left.match(/^ */) || [""])[0].length;
    while (parents.length && parents[parents.length - 1].level >= level) parents.pop();
    const rest = line.slice(line.indexOf("|") + 1).split("|");
    const linePercent = Number(rest[0]?.trim());
    if (name.endsWith(".js") && rest[0]?.trim()) {
      items.push({ path: [...parents.map(p => p.name), name].join("/"),
        lines: linePercent });
    } else if (!rest[0]?.trim()) parents.push({ level, name });
  }
  return items;
}
function enforceCoverage(output) {
  const rows = coverageRows(output);
  const core = rows.filter(row => /(^|\/)src\/core\/[^/]+\.js$/.test(row.path));
  if (core.length < 15) throw new Error("Core coverage report incomplete: " + core.length + " modules");
  let lines = 0, covered = 0;
  for (const row of core) {
    const source = fs.readFileSync(row.path, "utf8");
    const count = source.split("\n").length;
    lines += count;
    covered += count * row.lines / 100;
  }
  const average = covered / lines * 100;
  const lifecycle = rows.find(row => /(^|\/)src\/run-lifecycle\.js$/.test(row.path));
  if (!lifecycle) throw new Error("RunLifecycle missing from coverage report");
  console.log("Saturivo measured core lines: " + average.toFixed(2) +
    "% across " + core.length + " files; lifecycle: " + lifecycle.lines.toFixed(2) + "%");
  if (average < 90) throw new Error("Core line coverage must stay >= 90%");
  if (lifecycle.lines < 80) throw new Error("RunLifecycle line coverage must stay >= 80%");
  return { coreLines: average, lifecycleLines: lifecycle.lines, coreFiles: core.length };
}
module.exports = { coverageRows, enforceCoverage };
