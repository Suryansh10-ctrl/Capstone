import express from "express";
import morgan from "morgan";
import fs from "fs";
import path from "path";

const WORKING_DIR = '/workspace';
const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
     message: "Hello from sandbox agent",
     status: "success", 
    });
});

/**
 * @route GET /list-files
 * @desc List all files in the working directory and its subdirectories, Returns a JSON object with the path relative to working directory. exclude directories like node_modules, .git, and dist etc,
 * - eg. {
 *     "files: [
 *         "file1.txt",
 *         "subdir/file2.txt",
 *         "subdir/subsubdir/file3.txt"
 *     ]
 * }
 */

app.get("/list-files", async (req, res) => {
    const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".vite", ".next", "coverage"]);

    const listFiles = async (dir, baseDir) => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        const files = [];
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
            if (entry.isDirectory()) {
                if (!IGNORED_DIRS.has(entry.name)) {
                    files.push(...await listFiles(fullPath, baseDir));
                }
            } else {
                files.push(relativePath);
            }
        }
        return files;
    }

    try{
        const files = await listFiles(WORKING_DIR, WORKING_DIR);
        res.status(200).json({
            message: "List of files",
            files,
        });
    }catch(err){
        res.status(500).json({
            message: "Error listing files",
            error: err.message,
        });
    }
})  
/**
 * @route GET /read-file
 * @desc Read the contents of a file in the working directory, Returns a JSON object with the file content. 
 * - eg. {
 *     "file1.txt": "File content here"
 * }
 * full url query parameter: ?files=file1.txt,file2.txt
 */
app.get("/read-file", async(req,res)=>{
    const fileName = req.query.files;
    if(!fileName){
        return res.status(400).json({
            message: "File name is required",
            status: "error",
        });
    }

    const fileList = fileName.split(",");

    const results = await Promise.all(fileList.map(async (file) => {
        const filePath = path.join(WORKING_DIR, file);
        try{
            const content = await fs.promises.readFile(filePath, "utf-8");
            return {
                [filePath.replace(WORKING_DIR + "/", "")]: content
            }
        }catch(err){
            return {
                [filePath.replace(WORKING_DIR + "/", "")]: `Error reading file: ${err.message}`
            }
        }
    }));

    res.status(200).json({
        message: "File contents",
        files: results,
    });

});

app.patch("/update-file", async (req,res)=>{
    const updates = req.body.updates;
    if(!updates || !Array.isArray(updates)){
        return res.status(400).json({
            message: 'Invalid request body. Expected a JSON object with an "updates" property containing an array of file updates.',
            status: "error",
        });
    }

    const results = await Promise.all(updates.map(async (update) => {
        const {file, content} = update;
        const filePath = path.join(WORKING_DIR, file);
        try{
            await fs.promises.writeFile(filePath, content, "utf-8");
            return {
                [filePath.replace(WORKING_DIR + "/", "")]: "File updated successfully"
            }
        }catch(err){
            return {
                [filePath.replace(WORKING_DIR + "/", "")]: `Error updating file: ${err.message}`
            }
        }
    }));

    res.status(200).json({
        message: "File update results",
        results,
    })

})

app.post("/create-file", async (req,res)=>{
    const files = req.body.files;
    if(!files || !Array.isArray(files)){
        return res.status(400).json({
            message: 'Invalid request body. Expected a JSON object with a "files" property containing an array of file objects.',
            status: "error",
        });
    }

    const results =  await Promise.all(files.map(async (fileObj) => {
        const {file, content} = fileObj;
        const filePath = path.join(WORKING_DIR, file);
        try{
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs.promises.writeFile(filePath, content, "utf-8");
            return {
                [filePath.replace(WORKING_DIR + "/", "")]: "File created successfully"
            }
        }catch(err){
            return {
                [filePath.replace(WORKING_DIR + "/", "")]: `Error creating file: ${err.message}`
            }
        }
    }));

    return res.status(200).json({
        message: "File creation results",
        results,
    })
})

export default app;