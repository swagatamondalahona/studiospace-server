import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import bookingRoutes from "./routes/bookingRoutes.js";

import { auth } from "./src/auth.js";
import { connectDB } from "./src/config/database.js";
import studioRoutes from "./routes/studioRoutes.js";

const app = express();

app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "https://studiospace-client-lime.vercel.app",
        ],
        credentials: true,
    })
);

// Better Auth route — express.json() এর আগে রাখতে হবে
app.all("/api/auth/{*any}", toNodeHandler(auth));

// অন্যান্য API-এর জন্য JSON middleware
app.use(express.json());

// Test API
app.get("/", (req, res) => {
    res.send("StudioSpace Server is Running!");
});

// Studio API
app.use("/api/bookings", bookingRoutes);

// Database connection এবং Server start
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`StudioSpace Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();