
import express from "express";
import Studio from "../models/Studio.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Get Featured Studios: Maximum 6
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
            message: "Failed to fetch featured studios.",
        });
    }
});

// Add New Studio: Login Required
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            name,
            category,
            location,
            price,
            securityDeposit,
            maxCapacity,
            image,
            amenities,
            description,
        } = req.body;

        if (
            !name?.trim() ||
            !category ||
            !location?.trim() ||
            price === undefined ||
            securityDeposit === undefined ||
            maxCapacity === undefined ||
            !image?.trim() ||
            !description?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required studio information.",
            });
        }

        const numericPrice = Number(price);
        const numericDeposit = Number(securityDeposit);
        const numericCapacity = Number(maxCapacity);

        if (
            !Number.isFinite(numericPrice) ||
            numericPrice <= 0 ||
            !Number.isFinite(numericDeposit) ||
            numericDeposit < 0 ||
            !Number.isInteger(numericCapacity) ||
            numericCapacity < 1
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid price, deposit and capacity.",
            });
        }

        if (!Array.isArray(amenities)) {
            return res.status(400).json({
                success: false,
                message: "Please provide amenities as a list.",
            });
        }

        const newStudio = await Studio.create({
            name: name.trim(),
            category,
            location: location.trim(),
            price: numericPrice,
            securityDeposit: numericDeposit,
            maxCapacity: numericCapacity,
            image: image.trim(),
            amenities,
            description: description.trim(),
            ownerName: req.user.name,
            ownerEmail: req.user.email,
        });

        res.status(201).json({
            success: true,
            message: "Studio added successfully!",
            data: newStudio,
        });
    } catch (error) {
        console.error("Add Studio Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to add studio.",
            error: error.message,
        });
    }
});

export default router;
