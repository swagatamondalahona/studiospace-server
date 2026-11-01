
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
        const { studioId, bookingDate, startTime, endTime } = req.body;

        if (!studioId || !bookingDate || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: "All booking fields are required.",
            });
        }

        if (!mongoose.isValidObjectId(studioId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid studio ID.",
            });
        }

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

        const today = new Date().toISOString().slice(0, 10);

        if (bookingDate < today) {
            return res.status(400).json({
                success: false,
                message: "You cannot book a past date.",
            });
        }

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

        const studio = await Studio.findById(studioId);

        if (!studio) {
            return res.status(404).json({
                success: false,
                message: "Studio not found.",
            });
        }

        const userEmail = req.user.email.toLowerCase();
        const ownerEmail = String(studio.ownerEmail || "").toLowerCase();

        if (!ownerEmail) {
            return res.status(400).json({
                success: false,
                message: "Studio host information is incomplete.",
            });
        }

        if (ownerEmail === userEmail) {
            return res.status(403).json({
                success: false,
                message: "You cannot book your own studio.",
            });
        }

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

        const totalPrice = totalHours * studio.price;

        const newBooking = await Booking.create({
            studioId: studio._id,
            studioName: studio.name,
            studioImage: studio.image,
            customerName: req.user.name,
            customerEmail: userEmail,
            ownerEmail,
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
// GET MY BOOKINGS (CUSTOMER)
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
// GET HOST BOOKINGS
// ==========================================
router.get("/host-bookings", authMiddleware, async (req, res) => {
    try {
        const bookings = await Booking.find({
            ownerEmail: req.user.email.toLowerCase(),
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: bookings,
        });
    } catch (error) {
        console.error("Get Host Bookings Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch host bookings.",
        });
    }
});

// ==========================================
// HOST CONFIRM BOOKING
// ==========================================
router.patch("/:id/confirm", authMiddleware, async (req, res) => {
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
            ownerEmail: req.user.email.toLowerCase(),
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or you are not the studio owner.",
            });
        }

        if (booking.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: "Only pending bookings can be confirmed.",
            });
        }

        // Check overlapping confirmed bookings before confirmation
        const overlappingBooking = await Booking.findOne({
            _id: { $ne: booking._id },
            studioId: booking.studioId,
            bookingDate: booking.bookingDate,
            status: "Confirmed",
            startTime: { $lt: booking.endTime },
            endTime: { $gt: booking.startTime },
        });

        if (overlappingBooking) {
            return res.status(409).json({
                success: false,
                message: "This time slot conflicts with another confirmed booking.",
            });
        }

        // Update only if the booking is still Pending
        const updatedBooking = await Booking.findOneAndUpdate(
            {
                _id: booking._id,
                ownerEmail: req.user.email.toLowerCase(),
                status: "Pending",
            },
            {
                $set: { status: "Confirmed" },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedBooking) {
            return res.status(409).json({
                success: false,
                message: "This booking has already been updated.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Booking confirmed successfully!",
            data: updatedBooking,
        });
    } catch (error) {
        console.error("Confirm Booking Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to confirm booking.",
        });
    }
});

// ==========================================
// HOST REJECT BOOKING
// ==========================================
router.patch("/:id/reject", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID.",
            });
        }

        const updatedBooking = await Booking.findOneAndUpdate(
            {
                _id: id,
                ownerEmail: req.user.email.toLowerCase(),
                status: "Pending",
            },
            {
                $set: { status: "Cancelled" },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedBooking) {
            return res.status(404).json({
                success: false,
                message: "Pending booking not found or you are not the studio owner.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Booking rejected successfully!",
            data: updatedBooking,
        });
    } catch (error) {
        console.error("Reject Booking Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to reject booking.",
        });
    }
});

// ==========================================
// CUSTOMER CANCEL PENDING BOOKING
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

        const updatedBooking = await Booking.findOneAndUpdate(
            {
                _id: id,
                customerEmail: req.user.email.toLowerCase(),
                status: "Pending",
            },
            {
                $set: { status: "Cancelled" },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedBooking) {
            return res.status(404).json({
                success: false,
                message: "Pending booking not found or cannot be cancelled.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully!",
            data: updatedBooking,
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
