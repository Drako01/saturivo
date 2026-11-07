"use strict";
const { createHash } = require("node:crypto");
const { createServer } = require("node:http");

/** Disposable RFC 6455 handshake fixture; loopback only, no external deps. */
const server = createServer((_req, response) => {
  response.writeHead(404); response.end();
});
server.on("upgrade", (request, socket) => {
  const key = request.headers["sec-websocket-key"];
  if (request.url !== "/socket" || typeof key !== "string" || key.length > 128 ||
      request.headers.upgrade?.toLowerCase() !== "websocket") {
    socket.destroy(); return;
  }
  const accept = createHash("sha1").update(key +
    "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\n" +
    "Connection: Upgrade\r\n" +
    "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
  );
  socket.write(Buffer.from([0x81, 0x02, 0x6f, 0x6b])); // Unmasked server "ok".
  socket.on("error", () => undefined);
  socket.on("data", () => undefined);
  socket.setTimeout(2000, () => socket.destroy());
});
server.listen(0, "127.0.0.1", () => {
  console.log("SATURIVO_PORT=" + server.address().port);
});
process.on("SIGTERM", () => server.close());
