import { Router } from "express";
import agent from "../agents/code.agent.js";

const agentRouter = Router();

agentRouter.post("/invoke", async (req, res) => {
    try {
        const { message, projectId } = req.body;

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        });

        const response = await agent.stream(
            {
                messages: [
                    {
                        role: "user",
                        content: message
                    }
                ]
            },
            {
                context: {
                    projectId
                },
                streamMode: ["messages", "custom"]
            }
        );

        for await (const [mode, payload] of response) {
            if (mode === "custom") {
                const statusText = String(payload || "").trim();
                if (statusText) {
                    res.write(`data: ${JSON.stringify({ type: "status", message: statusText })}\n\n`);
                }
            } else if (mode === "messages") {
                const [messageChunk] = payload;
                
                // Determine message type (ai vs tool vs human)
                const msgType = messageChunk?.getType ? messageChunk.getType() : (messageChunk?._getType ? messageChunk._getType() : "");
                
                // Only stream tokens if this is an AI message (not a Tool result or Human prompt)
                if (msgType === "ai" || !msgType) {
                    let text = "";
                    if (typeof messageChunk?.content === "string") {
                        text = messageChunk.content;
                    } else if (Array.isArray(messageChunk?.content)) {
                        for (const part of messageChunk.content) {
                            if (typeof part === "string") text += part;
                            else if (part?.type === "text" && part.text) text += part.text;
                        }
                    }

                    // Ensure raw JSON tool results or file array dumps are not leaked as AI tokens
                    const trimmed = text.trim();
                    const isRawJson = (trimmed.startsWith("[") && trimmed.endsWith("]")) || 
                                     (trimmed.startsWith("{") && trimmed.endsWith("}"));

                    if (text && !isRawJson) {
                        res.write(`data: ${JSON.stringify({ type: "token", content: text })}\n\n`);
                    }
                }
            }
        }

        // Signal end of stream and close connection
        res.write(`data: [DONE]\n\n`);
        res.end();
    } catch (err) {
        console.error("Error invoking agent: ", err);
        if (!res.headersSent) {
            res.status(500).json({
                err: "Failed to invoke agent",
                details: err.message
            });
        } else {
            res.write(`data: ${JSON.stringify({ type: "status", message: `⚠️ Error: ${err.message}` })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
        }
    }
});

export default agentRouter;
