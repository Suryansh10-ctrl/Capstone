import axios from "axios";
import { tool } from "langchain";
import * as z from "zod";



export const listfiles = tool(
    async ({ }) => {
        console.log("=======================")
        console.log("using listfiles tool")
        console.log("=======================")

        const response = await axios.get("http://01a05d2e-9628-7443-a2e1-35c52fa9f47c.agent.localhost/list-files")

        console.log("=======================")
        console.log("response from listfiles tool", response.data)
        console.log("=======================")

        return JSON.stringify(response.data.files);
    },
    {
        name: "list_files",
        description: "List all the files in the project directory. This is useful for understanding what files are available to work with.",
        schema: z.object({})
    }
)

export const readfile = tool(
    async ({ files }) => {
        console.log("=======================")
        console.log("using readfile tool with files", files)
        console.log("=======================")

        const fileList = Array.isArray(files) ? files.join(",") : files;
        const response = await axios.get("http://01a05d2e-9628-7443-a2e1-35c52fa9f47c.agent.localhost/read-file?files=" + encodeURIComponent(fileList))

        console.log("=======================")
        console.log("response from read files tool", response.data)
        console.log("=======================")

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
    async ({ file, content }) => {

        console.log("=======================")
        console.log("using updatefile tool with file", file)
        console.log("=======================")


        const response = await axios.patch("http://01a05d2e-9628-7443-a2e1-35c52fa9f47c.agent.localhost/update-file", {
            updates: [{ file, content }]
        })

        console.log("=======================")
        console.log("response from update files tool", response.data)
        console.log("=======================")

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
