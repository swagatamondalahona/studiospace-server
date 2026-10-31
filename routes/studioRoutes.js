import express from "express";
import Studio from "../models/Studio.js";

const router = express.Router();

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

export default router;