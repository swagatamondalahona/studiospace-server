import mongoose from "mongoose";
import { MongoClient } from "mongodb";

const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
    throw new Error("MONGODB_URI is missing from environment variables");
}

export const mongoClient = new MongoClient(mongoURI);

export const mongoDB = mongoClient.db();

export const connectDB = async () => {
    try {
        await mongoClient.connect();
        await mongoose.connect(mongoURI);

        console.log("MongoDB Connected Successfully!");
    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);
        process.exit(1);
    }
};