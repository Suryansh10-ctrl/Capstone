import app from "./src/app.js";
import { EventEmitter } from "events";

// Increase max listeners for proxy connections
EventEmitter.defaultMaxListeners = 100;

app.listen(3000, () => {
    console.log("router server is running on 3000");
});