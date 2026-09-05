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
                streamMode: "custom"
            }
        );

        for await (const chunk of response) {
            console.log(chunk);
            res.write(`data: ${chunk}\n\n`);
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
            res.write(`data: [ERROR] ${err.message}\n\n`);
            res.end();
        }
    }
});

export default agentRouter;