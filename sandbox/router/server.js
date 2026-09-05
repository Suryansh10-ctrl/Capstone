import app from "./src/app.js";
import { EventEmitter } from "events";
import httpProxy from "http-proxy";

EventEmitter.defaultMaxListeners = 100;

const wsProxy = httpProxy.createProxyServer({
    changeOrigin: false,
    ws: true
});

wsProxy.on("error", (err, req, socket) => {
    console.error("[WS Proxy Error]:", err.message);
    if (socket && socket.writable && !socket.destroyed) {
        socket.end();
    }
});

wsProxy.on("open", (proxySocket) => {
    console.log("[WS Proxy] Connection opened to upstream");
});

wsProxy.on("close", (res, socket, head) => {
    console.log("[WS Proxy] Connection closed");
});

const server = app.listen(3000, () => {
    console.log("router server is running on 3000");
});

server.on("upgrade", (req, socket, head) => {
    socket.on("error", (err) => {
        console.error("Upgrade socket error:", err.message);
    });

    const rawHost = req.headers.host;
    console.log("[WS Upgrade] Host:", rawHost, "URL:", req.url);

    if (!rawHost) {
        console.error("[WS Upgrade] No host header, destroying socket");
        socket.destroy();
        return;
    }

    const host = rawHost.split(":")[0];
    const parts = host.split(".");
    const sandboxId = parts[0];
    const type = parts[1];

    console.log("[WS Upgrade] sandboxId:", sandboxId, "type:", type);

    if (type === "agent") {
        const target = `ws://sandbox-service-${sandboxId}:3000`;
        console.log("[WS Upgrade] Proxying agent WS to:", target);
        wsProxy.ws(req, socket, head, { target });
    } else if (type === "preview") {
        const target = `ws://sandbox-service-${sandboxId}:80`;
        console.log("[WS Upgrade] Proxying preview WS to:", target);
        wsProxy.ws(req, socket, head, { target });
    } else {
        console.error("[WS Upgrade] Unknown type:", type, "- destroying socket");
        socket.destroy();
    }
});
