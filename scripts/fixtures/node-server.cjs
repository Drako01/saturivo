"use strict";
const http = require("node:http");
const server = http.createServer((req, res) => {
  if (req.url !== "/health") {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { "content-type": "text/plain" }); res.end("ok");
});
server.listen(0, "127.0.0.1", () => {
  console.log("SATURIVO_PORT=" + server.address().port);
});
process.on("SIGTERM", () => server.close());
