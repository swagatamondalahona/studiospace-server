
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { mongoClient, mongoDB } from "./config/database.js";

export const auth = betterAuth({
    database: mongodbAdapter(mongoDB, {
        client: mongoClient,
    }),

    secret: process.env.BETTER_AUTH_SECRET,

    baseURL:
        process.env.BETTER_AUTH_URL || "http://localhost:5000",

    trustedOrigins: [
        "http://localhost:3000",
        "https://studiospace-client-lime.vercel.app",
    ],

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 6,
    },
});
