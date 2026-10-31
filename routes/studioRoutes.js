
const express = require("express");
const router = express.Router();

const Studio = require("../models/Studio");

// Get Featured Studios (Top 6)
router.get("/featured", async (req, res) => {
    try {
        const studios = await Studio.find()
            .sort({ rating: -1, createdAt: -1 })
            .limit(6);

        res.status(200).json({
            success: true,
            count: studios.length,
            data: studios,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch featured studios",
            error: error.message,
        });
    }
});

module.exports = router;
