import mongoose from "mongoose"
import {dbName} from "../constant.js"
export const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${dbName}`);
        console.log("MongoDB Connected successfully");
    } catch (error) {
        console.log("MongoDB Connection Error"+error);
    }
}