import dotenv from "dotenv";
dotenv.config();
import {ChatMistralAI} from "@langchain/mistralai"
import {listfiles, readfile, updatefile} from "./tools.js"
import {createAgent} from "langchain";


const model = new ChatMistralAI({
    model: "mistral-medium-latest",
    apiKey: process.env.MISTRAL_API_KEY,
    temperature: 0.7,
})

const agent = createAgent({
    model, 
    tools: [listfiles, readfile, updatefile],
})

const response = await agent.invoke({
    messages: [
        {
            role: "user",
            content: "create a simple snake game using react and css"
        }
    ]
})

console.log(response.messages.at(-1).content);