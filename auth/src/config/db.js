import mongoose from "mongoose"


export const connectDB = async() => {
    try{
        await mongoose.connect(process.env.AUTH_MONGO_URI);
        console.log("MongoDB connected");
    }catch(err){
        console.error("MongoDB connection Error: ",err);
        process.exit();
    }
};