import express from "express";
import morgan from "morgan";
import { createPod } from "./kubernetes/pod.js";
import { createService } from "./kubernetes/service.js";
import { cleanupOldSandboxes, getSandboxStatus } from "./kubernetes/cleanup.js";
import { v7 as uuid } from "uuid";
import { createSandboxKey } from "./config/redis.js";

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/sandbox/health", (req, res) => {
    res.status(200).json({
        message: "Sandbox API is healthy",
        status: "ok",
    });
});

app.get("/api/sandbox/status/:sandboxId", async (req, res) => {
    const { sandboxId } = req.params;
    try {
        const status = await getSandboxStatus(sandboxId);
        return res.status(200).json(status);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post("/api/sandbox/start", async (req, res) => {
    const sandboxId = uuid();

    try {
        // Automatically cleanup older sandbox pods to avoid cluster memory exhaustion
        cleanupOldSandboxes(1).catch(e => console.error("Async cleanup error:", e.message));

        await Promise.all([
            createPod(sandboxId),
            createService(sandboxId),
            createSandboxKey(sandboxId)
        ]);

        const sandboxHost = process.env.SANDBOX_HOST || "localhost";
        return res.status(200).json({
            message: "Sandbox environment created successfully",
            sandboxId,
            previewURL: `http://${sandboxId}.preview.${sandboxHost}`,
            agentURL: `http://${sandboxId}.agent.${sandboxHost}`
        });
    } catch (err) {
        console.error("Error creating sandbox environment:", err);
        return res.status(500).json({
            message: "Failed to create sandbox environment",
            error: err.message,
            details: err.response?.body || err.cause?.message || null
        });
    }
});

export default app;
