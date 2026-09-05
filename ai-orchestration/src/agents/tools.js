import axios from "axios";
import { config } from "dotenv";
import { tool } from "langchain";
import * as z from "zod";



export const listfiles = tool(
    async ({ },config) => {
        const writer = config.writer
        writer("Listing files \n")
        const response = await axios.get(`http://sandbox-service-${config.context.projectId}:3000/list-files`)

        writer("files listed successfully " + "Files: " +  response.data.files.join(",") + "\n")
        return JSON.stringify(response.data.files);
    },
    {
        name: "list_files",
        description: "List all the files in the project directory. This is useful for understanding what files are available to work with.",
        schema: z.object({})
    }
)

export const readfile = tool(
    async ({ files },config) => {
        const writer = config.writer;
        const fileList = Array.isArray(files) ? files.join(",") : files;
        writer("Reading files \n" + fileList + "\n");
        
        const response = await axios.get(`http://sandbox-service-${config.context.projectId}:3000/read-file?files=`+ encodeURIComponent(fileList))

        writer("Files read successfully \n")
        return JSON.stringify(response.data);
    },
    {
        name: "read_files",
        description: "Read the content of a file. This is useful for understanding the content of a file.",
        schema: z.object({
            files: z.array(z.string()).describe("The list of files relative paths to read. These should be files that were listed using the list_files tool or created later")
        })
    }
)

export const updatefile = tool(
    async ({ file, content },config) => {
        const writer = config.writer;
        writer(`Updating file: ${file}\n`);

        const response = await axios.patch(`http://sandbox-service-${config.context.projectId}:3000/update-file`, {
            updates: [{ file, content }]
        })

        writer("files updated successfully. \n" )
        return JSON.stringify(response.data);
    },
    {
        name: "update_files",
        description: "Update the content of a file. This is useful for modifying the content of a file. This tool can also use to create new files by providing a new file path and content. The tool will create the file if it does not exist.",
        schema: z.object({
            file: z.string().describe("The path of the file to update"),
            content: z.string().describe("The new content for the file, the content should should support json format")
        })
    }
)
