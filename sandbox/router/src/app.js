import express from "express";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

app.use(morgan("combined"));

app.get("/api/status/healthz", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/api/status/readyz", (req, res) => {
    res.status(200).json({ status: "ready" });
});

export const proxies = {};
export const agentProxies = {};

export function getProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}:80`;
    if(!proxies[sandboxId]) {
        proxies[sandboxId] = createProxyMiddleware({
            target,
            changeOrigin: false,
            onError: (err, req, res) => {
                console.error(`[Router Preview Proxy Error - ${sandboxId}]:`, err.message);
                if (res && res.writeHead && !res.headersSent) {
                    res.writeHead(502, { "Content-Type": "text/html" });
                    res.end("<h3>Sandbox preview is starting or busy. Please refresh in a moment.</h3>");
                }
            },
            on: {
                error: (err, req, res) => {
                    console.error(`[Router Preview Proxy Error - ${sandboxId}]:`, err.message);
                    if (res && res.writeHead && !res.headersSent) {
                        res.writeHead(502, { "Content-Type": "text/html" });
                        res.end("<h3>Sandbox preview is starting or busy. Please refresh in a moment.</h3>");
                    }
                }
            }
        })
    }
    return proxies[sandboxId];
}

export function getAgentProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}:3000`;
    if(!agentProxies[sandboxId]) {
        agentProxies[sandboxId] = createProxyMiddleware({
            target,
            changeOrigin: false,
            onError: (err, req, res) => {
                console.error(`[Router Agent Proxy Error - ${sandboxId}]:`, err.message);
                if (res && res.writeHead && !res.headersSent) {
                    res.writeHead(502, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Sandbox agent unavailable. Please retry shortly." }));
                }
            },
            on: {
                error: (err, req, res) => {
                    console.error(`[Router Agent Proxy Error - ${sandboxId}]:`, err.message);
                    if (res && res.writeHead && !res.headersSent) {
                        res.writeHead(502, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "Sandbox agent unavailable. Please retry shortly." }));
                    }
                }
            }
        })
    }
    return agentProxies[sandboxId];
}

app.use((req, res, next) => {
    const rawHost = req.get("host");
    
    if (!rawHost) {
        return res.status(400).json({ error: "No host header" });
    }

    const host = rawHost.split(":")[0];
    const parts = host.split(".");
    const sandboxId = parts[0];
    const type = parts[1];

    if (type === "agent") {
        return getAgentProxy(sandboxId)(req, res, next);
    } else if (type === "preview") {
        return getProxy(sandboxId)(req, res, next);
    }

    if (!sandboxId || sandboxId === "localhost") {
        return res.status(400).json({ error: "Invalid sandbox ID" });
    }
});

export default app;