const studioRoutes = require("./routes/studioRoutes");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully!");
    })
    .catch((error) => {
        console.error("MongoDB Connection Error:", error.message);
    });

// Test API
app.get("/", (req, res) => {
    res.send("StudioSpace Server is Running!");
});
app.use("/api/studios", studioRoutes);
// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`StudioSpace Server running on port ${PORT}`);
});
