
import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Studio from "../models/Studio.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// CREATE BOOKING
// ==========================================
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            studioId,
            bookingDate,
            startTime,
            endTime,
        } = req.body;

        // Required fields validation
        if (!studioId || !bookingDate || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: "All booking fields are required.",
            });
        }

        // Validate Studio ID
        if (!mongoose.isValidObjectId(studioId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid studio ID.",
            });
        }

        // Validate date and time formats
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

        if (
            !dateRegex.test(bookingDate) ||
            !timeRegex.test(startTime) ||
            !timeRegex.test(endTime)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking date or time.",
            });
        }

        // Validate actual calendar date
        const parsedDate = new Date(`${bookingDate}T00:00:00.000Z`);

        if (
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== bookingDate
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking date.",
            });
        }

        // Prevent past-date booking
        const today = new Date().toISOString().slice(0, 10);

        if (bookingDate < today) {
            return res.status(400).json({
                success: false,
                message: "You cannot book a past date.",
            });
        }

        // Validate booking duration
        if (startTime >= endTime) {
            return res.status(400).json({
                success: false,
                message: "End time must be after start time.",
            });
        }

        const [startHour, startMinute] = startTime.split(":").map(Number);
        const [endHour, endMinute] = endTime.split(":").map(Number);

        const totalMinutes =
            endHour * 60 +
            endMinute -
            (startHour * 60 + startMinute);

        const totalHours = totalMinutes / 60;

        if (totalHours < 1) {
            return res.status(400).json({
                success: false,
                message: "Minimum booking duration is 1 hour.",
            });
        }

        // Find Studio
        const studio = await Studio.findById(studioId);

        if (!studio) {
            return res.status(404).json({
                success: false,
                message: "Studio not found.",
            });
        }

        // Prevent booking own Studio
        if (
            studio.ownerEmail.toLowerCase() ===
            req.user.email.toLowerCase()
        ) {
            return res.status(403).json({
                success: false,
                message: "You cannot book your own studio.",
            });
        }

        // Check overlapping Confirmed bookings
        const overlappingBooking = await Booking.findOne({
            studioId,
            bookingDate,
            status: "Confirmed",
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
        });

        if (overlappingBooking) {
            return res.status(409).json({
                success: false,
                message: "This time slot is already booked.",
            });
        }

        // Calculate price on the server
        const totalPrice = totalHours * studio.price;

        // Create booking
        const newBooking = await Booking.create({
            studioId: studio._id,
            studioName: studio.name,
            studioImage: studio.image,
            customerName: req.user.name,
            customerEmail: req.user.email.toLowerCase(),
            ownerEmail: studio.ownerEmail.toLowerCase(),
            bookingDate,
            startTime,
            endTime,
            totalHours,
            totalPrice,
            status: "Pending",
        });

        return res.status(201).json({
            success: true,
            message: "Booking request submitted successfully!",
            data: newBooking,
        });
    } catch (error) {
        console.error("Create Booking Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create booking.",
        });
    }
});

// ==========================================
// GET MY BOOKINGS
// ==========================================
router.get("/my-bookings", authMiddleware, async (req, res) => {
    try {
        const bookings = await Booking.find({
            customerEmail: req.user.email.toLowerCase(),
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: bookings,
        });
    } catch (error) {
        console.error("Get My Bookings Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch bookings.",
        });
    }
});

// ==========================================
// CANCEL PENDING BOOKING
// ==========================================
router.patch("/:id/cancel", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID.",
            });
        }

        const booking = await Booking.findOne({
            _id: id,
            customerEmail: req.user.email.toLowerCase(),
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
        }

        if (booking.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: "Only pending bookings can be cancelled.",
            });
        }

        booking.status = "Cancelled";
        await booking.save();

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully!",
            data: booking,
        });
    } catch (error) {
        console.error("Cancel Booking Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to cancel booking.",
        });
    }
});

export default router;
