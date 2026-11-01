
import express from "express";
import mongoose from "mongoose";
import Studio from "../models/Studio.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
// Get All Studios: Explore Studios Page
router.get("/", async (req, res) => {
    try {
        const studios = await Studio.find().sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: studios.length,
            data: studios,
        });
    } catch (error) {
        console.error("Get All Studios Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch studios.",
        });
    }
});
// Get Featured Studios: Maximum 6
router.get("/featured", async (req, res) => {
    try {
        const studios = await Studio.find()
            .sort({ rating: -1, createdAt: -1 })
            .limit(6);

        return res.status(200).json({
            success: true,
            count: studios.length,
            data: studios,
        });
    } catch (error) {
        console.error("Featured Studios Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch featured studios.",
        });
    }
});

// Get My Studio Listings: Login Required
router.get("/my-listings", authMiddleware, async (req, res) => {
    try {
        const studios = await Studio.find({
            ownerEmail: req.user.email,
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: studios.length,
            data: studios,
        });
    } catch (error) {
        console.error("My Listings Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch your studio listings.",
        });
    }
});

// Get Single Studio
router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid studio ID.",
            });
        }

        const studio = await Studio.findById(req.params.id);

        if (!studio) {
            return res.status(404).json({
                success: false,
                message: "Studio not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: studio,
        });
    } catch (error) {
        console.error("Get Studio Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch studio.",
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
            !description?.trim() ||
            !Array.isArray(amenities)
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

        return res.status(201).json({
            success: true,
            message: "Studio added successfully!",
            data: newStudio,
        });
    } catch (error) {
        console.error("Add Studio Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to add studio.",
        });
    }
});

// Update Studio: Owner Only
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid studio ID.",
            });
        }

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
            !description?.trim() ||
            !Array.isArray(amenities)
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

        const updatedStudio = await Studio.findOneAndUpdate(
            {
                _id: req.params.id,
                ownerEmail: req.user.email,
            },
            {
                name: name.trim(),
                category,
                location: location.trim(),
                price: numericPrice,
                securityDeposit: numericDeposit,
                maxCapacity: numericCapacity,
                image: image.trim(),
                amenities,
                description: description.trim(),
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedStudio) {
            return res.status(404).json({
                success: false,
                message: "Studio not found or you are not its owner.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Studio updated successfully!",
            data: updatedStudio,
        });
    } catch (error) {
        console.error("Update Studio Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update studio.",
        });
    }
});

// Delete Studio: Owner Only
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid studio ID.",
            });
        }

        const deletedStudio = await Studio.findOneAndDelete({
            _id: req.params.id,
            ownerEmail: req.user.email,
        });

        if (!deletedStudio) {
            return res.status(404).json({
                success: false,
                message:
                    "Studio not found or you are not authorized to delete it.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Studio deleted successfully!",
            data: deletedStudio,
        });
    } catch (error) {
        console.error("Delete Studio Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete studio.",
        });
    }
});

export default router;
