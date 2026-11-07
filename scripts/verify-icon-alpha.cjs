"use strict";
const assert = require("node:assert/strict");
const zlib = require("node:zlib");

// Pixel-level regression guard: the original logo accidentally contained a
// full-canvas background, turning its rounded corners into sharp corners.
function verifyCornersTransparent(png) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert(png.subarray(0, 8).equals(signature), "Icon must be PNG");
  let offset = 8, width = 0, height = 0, depth = 0, type = 0, trns, data = [];
  while (offset + 12 <= png.length) {
    const size = png.readUInt32BE(offset);
    const kind = png.toString("ascii", offset + 4, offset + 8);
    const start = offset + 8, end = start + size;
    assert(end + 4 <= png.length, "Malformed PNG chunk");
    const chunk = png.subarray(start, end);
    if (kind === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      depth = chunk[8];
      type = chunk[9];
      assert.equal(chunk[12], 0, "Interlaced icons are not supported by this QA guard");
    } else if (kind === "tRNS") trns = chunk;
    else if (kind === "IDAT") data.push(chunk);
    offset = end + 4;
    if (kind === "IEND") break;
  }
  assert.equal(width, 192, "Icon must be 192px wide");
  assert.equal(height, 192, "Icon must be 192px tall");
  assert.equal(depth, 8, "Icon PNG must use 8-bit depth");
  assert(type === 3 || type === 6, "Use indexed transparency or RGBA for the icon");
  const bpp = type === 6 ? 4 : 1, stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(data));
  let previous = Buffer.alloc(stride), cursor = 0;
  const alpha = (row, x) => type === 6 ? row[x * 4 + 3] : (trns?.[row[x]] ?? 255);
  const points = [];
  for (let y = 0; y < height; y++) {
    const filter = raw[cursor++];
    const scan = Buffer.from(raw.subarray(cursor, cursor + stride));
    assert.equal(scan.length, stride, "Truncated PNG");
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? scan[x - bpp] : 0;
      const above = previous[x];
      const upperLeft = x >= bpp ? previous[x - bpp] : 0;
      if (filter === 1) scan[x] = (scan[x] + left) & 255;
      else if (filter === 2) scan[x] = (scan[x] + above) & 255;
      else if (filter === 3) scan[x] = (scan[x] + Math.floor((left + above) / 2)) & 255;
      else if (filter === 4) {
        const p = left + above - upperLeft;
        const a = Math.abs(p - left), b = Math.abs(p - above), c = Math.abs(p - upperLeft);
        scan[x] = (scan[x] + (a <= b && a <= c ? left : b <= c ? above : upperLeft)) & 255;
      } else assert.equal(filter, 0, "Invalid PNG filter type");
    }
    if (y === 0 || y === height - 1) points.push(alpha(scan, 0), alpha(scan, width - 1));
    if (y === Math.floor(height / 2)) assert(alpha(scan, Math.floor(width / 2)) > 200, "Logo center must remain opaque");
    previous = scan;
    cursor += stride;
  }
  assert(points.every(value => value === 0), "All four logo corners must be fully transparent");
}
module.exports = { verifyCornersTransparent };
