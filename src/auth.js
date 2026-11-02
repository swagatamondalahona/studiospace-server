
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";

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

    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            prompt: "select_account",
        },
    },

    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ["google"],
        },
    },

    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
            strategy: "jwt",
        },
    },

    plugins: [
        jwt({
            sessionCookieCache: true,
        }),
    ],
});
