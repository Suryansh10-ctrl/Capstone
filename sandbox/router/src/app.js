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

const proxies = {};
const agentProxies = {};

function getProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}:80`;
    if(!proxies[sandboxId]) {
        proxies[sandboxId] = createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,
        })
    }
    return proxies[sandboxId];
}

function getAgentProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}:3000`;
    if(!agentProxies[sandboxId]) {
        agentProxies[sandboxId] = createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,
        })
    }
    return agentProxies[sandboxId];
}

app.use((req, res, next) => {
    const host = req.get("host");
    
    if (!host) {
        return res.status(400).json({ error: "No host header" });
    }

    const sandboxId = host.split(".")[0];

    if(host.split('.')[1] === "agent") {
        return getAgentProxy(sandboxId)(req, res, next);
    }else if(host.split('.')[1] === 'preview'){
        return getProxy(sandboxId)(req, res, next);
    }
    

    if (!sandboxId || sandboxId === "localhost") {
        return res.status(400).json({ error: "Invalid sandbox ID" });
    }


});

export default app;