import { serve } from "https://deno.land/std/http/server.ts";
import {
  acceptable,
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
} from "https://deno.land/std/ws/mod.ts";

const port = Deno.args[0] || "8080";
console.log(`websocket server is running on :${port}`);

const clients = new Map();
let clientId = 0;

function dispatch(msg) {
  for (const client of clients.values()) {
    client.send(msg);
  }
}

async function wsHandler(ws) {
  const id = ++clientId;
  clients.set(id, ws);
  dispatch(`Connected: [${id}]`);
  for await (const msg of ws) {
    console.log(`msg:${id}`, msg);
    if (typeof msg === "string") {
      dispatch(`[${id}]: ${msg}`);
    } else if (isWebSocketCloseEvent(msg)) {
      clients.delete(id);
      dispatch(`Closed: [${id}]`);
      break;
    }
  }
}

for await (const req of serve(`:${port}`)) {
  const { conn, r: bufReader, w: bufWriter, headers } = req;
  if (acceptable(req)) {
    try {
      acceptWebSocket({
        conn: req.conn,
        bufReader: req.r,
        bufWriter: req.w,
        headers: req.headers,
      }).then(wsHandler);
    } catch (err) {
      console.error(`failed to accept websocket: ${err}`);
      await req.respond({ status: 400 });
    }  
  }
}