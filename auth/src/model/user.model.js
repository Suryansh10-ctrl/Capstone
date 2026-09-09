import mongoose from "mongoose"


const UserSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    avatar: {
        type: String
    }
},{timestamps: true})

const user = mongoose.model("user", UserSchema);
export default user;