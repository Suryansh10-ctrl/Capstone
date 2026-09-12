import Redis from "ioredis";
import { deleteService } from "../kubernetes/service.js";
import { deletePod } from "../kubernetes/pod.js";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redis = new Redis(redisUrl);
const subscriber = new Redis(redisUrl);

redis.on("error", (err) => {
    console.log("Redis error:", err.message);
});

subscriber.on("error", (err) => {
    console.log("Redis subscriber error:", err.message);
});

redis.on("connect", () => console.log("Redis client connected"));
subscriber.on("connect", () => console.log("Redis subscriber connected"));

export async function createSandboxKey(sandboxId) {
    const key = `sandbox:${sandboxId}`;
    console.log("Creating Redis key:", key);
    await redis.set(key, JSON.stringify({ status: "active" }), "EX", 120);
    console.log("Redis key created successfully:", key);
}

subscriber.on("ready", async () => {
    try {
        await subscriber.config("SET", "notify-keyspace-events", "Ex");
        console.log("Redis expiration notifications enabled");
        await subscriber.subscribe("__keyevent@0__:expired");
        console.log("Redis subscribed to key expiry events");
    } catch (err) {
        console.warn("Redis subscriber setup failed:", err.message);
    }
});

subscriber.on("message", async (channel, key) => {
    console.log(`Key expired: ${key}`);
    const sandboxId = key.split(":")[1];
    try {
        await deletePod(sandboxId);
        console.log(`Pod deleted: sandbox-pod-${sandboxId}`);
        await deleteService(sandboxId);
        console.log(`Service deleted: sandbox-service-${sandboxId}`);
    } catch (err) {
        console.log("Cleanup error:", err.message);
    }
});

export default { subscriber };
