import axios from "axios";
import { config } from "dotenv";
import { tool } from "langchain";
import * as z from "zod";

const BINARY_AND_HEAVY_EXTS = [
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".pdf", ".zip",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml"
];

function isReadableCodeFile(filepath) {
    if (!filepath || typeof filepath !== "string") return false;
    const lower = filepath.toLowerCase();
    return !BINARY_AND_HEAVY_EXTS.some(ext => lower.endsWith(ext));
}

export const listfiles = tool(
    async ({ }, config) => {
        const writer = config.writer;
        writer("🔍 Inspecting project files...\n");
        try {
            const response = await axios.get(
                `http://sandbox-service-${config.context.projectId}:3000/list-files`,
                { timeout: 8000 }
            );

            const count = response.data?.files?.length || 0;
            writer(`📁 Found ${count} project files\n`);
            return JSON.stringify(response.data.files || []);
        } catch (err) {
            writer("⚠️ Failed to list files\n");
            return JSON.stringify({ error: err.message });
        }
    },
    {
        name: "list_files",
        description: "List all files in the project directory.",
        schema: z.object({})
    }
);

export const readfile = tool(
    async ({ files }, config) => {
        const writer = config.writer;
        let fileArr = Array.isArray(files) ? files : [files];
        
        // Filter out binary assets and massive lockfiles to prevent timeouts
        fileArr = fileArr.filter(isReadableCodeFile).slice(0, 5);

        if (fileArr.length === 0) {
            writer("ℹ️ No readable source files requested\n");
            return JSON.stringify({ files: {} });
        }

        const fileListStr = fileArr.join(", ");
        writer(`📖 Reading ${fileListStr}...\n`);

        try {
            const response = await axios.get(
                `http://sandbox-service-${config.context.projectId}:3000/read-file?files=` + encodeURIComponent(fileArr.join(",")),
                { timeout: 12000 }
            );

            writer("✓ Files read successfully\n");
            return JSON.stringify(response.data);
        } catch (err) {
            writer(`⚠️ Could not read files: ${err.message}\n`);
            return JSON.stringify({ error: `Failed to read files: ${err.message}` });
        }
    },
    {
        name: "read_files",
        description: "Read the content of code files (e.g. src/App.jsx, src/index.css). Do NOT read images or lockfiles.",
        schema: z.object({
            files: z.array(z.string()).describe("List of relative file paths to read. Limit to specific relevant source code files.")
        })
    }
);

export const updatefile = tool(
    async ({ file, content }, config) => {
        const writer = config.writer;
        writer(`✏️ Updating ${file}...\n`);

        try {
            const response = await axios.patch(
                `http://sandbox-service-${config.context.projectId}:3000/update-file`,
                { updates: [{ file, content }] },
                { timeout: 12000 }
            );

            writer(`✓ Saved ${file}\n`);
            return JSON.stringify(response.data);
        } catch (err) {
            writer(`⚠️ Failed to update ${file}: ${err.message}\n`);
            return JSON.stringify({ error: `Failed to update ${file}: ${err.message}` });
        }
    },
    {
        name: "update_files",
        description: "Update or create a file in the project. The content must be a valid string.",
        schema: z.object({
            file: z.string().describe("Relative path of the file to update/create"),
            content: z.string().describe("Full file content string")
        })
    }
);
