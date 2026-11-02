import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";

const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
    throw new Error("MONGODB_URI is missing from environment variables");
}

// Native MongoDB Client
const mongoClient = new MongoClient(mongoURI);

// Databases & Collections
const authDB = mongoClient.db(process.env.AUTH_DB_NAME || "better-auth");
const appDB = mongoClient.db(process.env.DB_NAME || "test");

const studiosCollection = appDB.collection("studios");
const bookingsCollection = appDB.collection("bookings");

// Helper to validate 24-character hexadecimal ObjectId
const isValidObjectId = (id) => {
    return (
        typeof id === "string" &&
        ObjectId.isValid(id) &&
        new ObjectId(id).toString() === id
    );
};

// Allowed Client Origins for CORS and Better Auth
const allowedOrigins = [
    "http://localhost:3000",
    "https://studiospace-client-lime.vercel.app",
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];

// Better Auth Setup
export const auth = betterAuth({
    database: mongodbAdapter(authDB, {
        client: mongoClient,
    }),

    secret: process.env.BETTER_AUTH_SECRET,

    baseURL:
        process.env.BETTER_AUTH_URL ||
        "https://studiospace-server-ten.vercel.app",

    trustedOrigins: [
        "http://localhost:3000",
        "https://studiospace-client-lime.vercel.app",
        ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
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
        storeStateStrategy: "database",
        skipStateCookieCheck: true,
    },

    advanced: {
        useSecureCookies: true,
        defaultCookieAttributes: {
            sameSite: "none",
            secure: true,
            partitioned: true,
        },
    },

    onAPIError: {
        errorURL:
            process.env.CLIENT_URL ||
            "https://studiospace-client-lime.vercel.app/login",
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

// Authentication Middleware
const authMiddleware = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session || !session.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Please login first.",
            });
        }

        req.user = session.user;
        next();
    } catch (error) {
        console.error("Authentication Error:", error);
        return res.status(401).json({
            success: false,
            message: "Authentication failed.",
        });
    }
};

const app = express();

// CORS Configuration with origin validation
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (
                allowedOrigins.includes(origin) ||
                origin.endsWith(".vercel.app")
            ) {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

// Better Auth Route Handler (Must be registered before express.json)
app.all("/api/auth/{*any}", toNodeHandler(auth));

// JSON Body Parser
app.use(express.json());

// Serverless / Auto-connect DB middleware
let isDBConnected = false;
app.use(async (req, res, next) => {
    try {
        if (!isDBConnected) {
            await mongoClient.connect();
            isDBConnected = true;
        }
        next();
    } catch (err) {
        console.error("MongoDB auto-connect warning:", err.message);
        next();
    }
});

// ==========================================
// ROOT HEALTH CHECK
// ==========================================
app.get("/", (req, res) => {
    res.send("StudioSpace Server is Running!");
});

// ==========================================
// STUDIO ROUTES
// ==========================================

// Get All Studios
app.get("/api/studios", async (req, res) => {
    try {
        const studios = await studiosCollection
            .find()
            .sort({ createdAt: -1 })
            .toArray();

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

// Get Featured Studios (Top 6 by rating, then createdAt)
app.get("/api/studios/featured", async (req, res) => {
    try {
        const studios = await studiosCollection
            .find()
            .sort({ rating: -1, createdAt: -1 })
            .limit(6)
            .toArray();

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

// Get My Studio Listings (Owner Only)
app.get("/api/studios/my-listings", authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email.toLowerCase();
        const studios = await studiosCollection
            .find({
                $or: [
                    { ownerEmail: userEmail },
                    { ownerEmail: req.user.email },
                ],
            })
            .sort({ createdAt: -1 })
            .toArray();

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

// Get Single Studio by ID
app.get("/api/studios/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid studio ID.",
            });
        }

        const studio = await studiosCollection.findOne({ _id: new ObjectId(id) });

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

// Add New Studio (Login Required)
app.post("/api/studios", authMiddleware, async (req, res) => {
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

        const validCategories = [
            "Photo Studios",
            "Sound Stages",
            "Podcast Rooms",
            "Music Suites",
            "Art Workshops",
        ];

        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: "Invalid studio category.",
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

        const now = new Date();
        const newStudioDoc = {
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
            ownerEmail: req.user.email.toLowerCase(),
            rating: 0,
            createdAt: now,
            updatedAt: now,
        };

        const result = await studiosCollection.insertOne(newStudioDoc);
        const createdStudio = { ...newStudioDoc, _id: result.insertedId };

        return res.status(201).json({
            success: true,
            message: "Studio added successfully!",
            data: createdStudio,
        });
    } catch (error) {
        console.error("Add Studio Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add studio.",
        });
    }
});

// Update Studio (Owner Only)
app.put("/api/studios/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
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

        const validCategories = [
            "Photo Studios",
            "Sound Stages",
            "Podcast Rooms",
            "Music Suites",
            "Art Workshops",
        ];

        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: "Invalid studio category.",
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

        const userEmail = req.user.email.toLowerCase();
        const updatedStudio = await studiosCollection.findOneAndUpdate(
            {
                _id: new ObjectId(id),
                $or: [
                    { ownerEmail: userEmail },
                    { ownerEmail: req.user.email },
                ],
            },
            {
                $set: {
                    name: name.trim(),
                    category,
                    location: location.trim(),
                    price: numericPrice,
                    securityDeposit: numericDeposit,
                    maxCapacity: numericCapacity,
                    image: image.trim(),
                    amenities,
                    description: description.trim(),
                    updatedAt: new Date(),
                },
            },
            { returnDocument: "after" }
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

// Delete Studio (Owner Only)
app.delete("/api/studios/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid studio ID.",
            });
        }

        const userEmail = req.user.email.toLowerCase();
        const deletedStudio = await studiosCollection.findOneAndDelete({
            _id: new ObjectId(id),
            $or: [
                { ownerEmail: userEmail },
                { ownerEmail: req.user.email },
            ],
        });

        if (!deletedStudio) {
            return res.status(404).json({
                success: false,
                message: "Studio not found or you are not authorized to delete it.",
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

// ==========================================
// BOOKING ROUTES
// ==========================================

// Create Booking (Login Required)
app.post("/api/bookings", authMiddleware, async (req, res) => {
    try {
        const { studioId, bookingDate, startTime, endTime } = req.body;

        if (!studioId || !bookingDate || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: "All booking fields are required.",
            });
        }

        if (!isValidObjectId(studioId)) {
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

        const studio = await studiosCollection.findOne({
            _id: new ObjectId(studioId),
        });

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

        const studioObjId = new ObjectId(studioId);

        // Check overlapping confirmed bookings
        const overlappingBooking = await bookingsCollection.findOne({
            $or: [
                { studioId: studioObjId },
                { studioId: String(studioId) },
            ],
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
        const now = new Date();

        const bookingDoc = {
            studioId: studioObjId,
            studioName: studio.name,
            studioImage: studio.image || "",
            customerName: req.user.name,
            customerEmail: userEmail,
            ownerEmail,
            bookingDate,
            startTime,
            endTime,
            totalHours,
            totalPrice,
            status: "Pending",
            createdAt: now,
            updatedAt: now,
        };

        const result = await bookingsCollection.insertOne(bookingDoc);
        const createdBooking = { ...bookingDoc, _id: result.insertedId };

        return res.status(201).json({
            success: true,
            message: "Booking request submitted successfully!",
            data: createdBooking,
        });
    } catch (error) {
        console.error("Create Booking Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create booking.",
        });
    }
});

// Get My Bookings (Customer Only)
app.get("/api/bookings/my-bookings", authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email.toLowerCase();
        const bookings = await bookingsCollection
            .find({
                $or: [
                    { customerEmail: userEmail },
                    { customerEmail: req.user.email },
                ],
            })
            .sort({ createdAt: -1 })
            .toArray();

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

// Get Host Bookings (Studio Owner Only)
app.get("/api/bookings/host-bookings", authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email.toLowerCase();
        const bookings = await bookingsCollection
            .find({
                $or: [
                    { ownerEmail: userEmail },
                    { ownerEmail: req.user.email },
                ],
            })
            .sort({ createdAt: -1 })
            .toArray();

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

// Host Confirm Booking
app.patch("/api/bookings/:id/confirm", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID.",
            });
        }

        const userEmail = req.user.email.toLowerCase();
        const booking = await bookingsCollection.findOne({
            _id: new ObjectId(id),
            $or: [
                { ownerEmail: userEmail },
                { ownerEmail: req.user.email },
            ],
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

        // Match studioId in both ObjectId and String formats
        const studioIdMatches = [booking.studioId];
        if (typeof booking.studioId === "string" && ObjectId.isValid(booking.studioId)) {
            studioIdMatches.push(new ObjectId(booking.studioId));
        } else if (booking.studioId instanceof ObjectId) {
            studioIdMatches.push(booking.studioId.toString());
        }

        // Check for conflicting confirmed bookings
        const overlappingBooking = await bookingsCollection.findOne({
            _id: { $ne: booking._id },
            studioId: { $in: studioIdMatches },
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

        const updatedBooking = await bookingsCollection.findOneAndUpdate(
            {
                _id: booking._id,
                status: "Pending",
            },
            {
                $set: {
                    status: "Confirmed",
                    updatedAt: new Date(),
                },
            },
            { returnDocument: "after" }
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

// Host Reject Booking
app.patch("/api/bookings/:id/reject", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID.",
            });
        }

        const userEmail = req.user.email.toLowerCase();
        const updatedBooking = await bookingsCollection.findOneAndUpdate(
            {
                _id: new ObjectId(id),
                status: "Pending",
                $or: [
                    { ownerEmail: userEmail },
                    { ownerEmail: req.user.email },
                ],
            },
            {
                $set: {
                    status: "Cancelled",
                    updatedAt: new Date(),
                },
            },
            { returnDocument: "after" }
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

// Customer Cancel Pending Booking
app.patch("/api/bookings/:id/cancel", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID.",
            });
        }

        const userEmail = req.user.email.toLowerCase();
        const updatedBooking = await bookingsCollection.findOneAndUpdate(
            {
                _id: new ObjectId(id),
                status: "Pending",
                $or: [
                    { customerEmail: userEmail },
                    { customerEmail: req.user.email },
                ],
            },
            {
                $set: {
                    status: "Cancelled",
                    updatedAt: new Date(),
                },
            },
            { returnDocument: "after" }
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

// ==========================================
// SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 5000;

// Connect to MongoDB and listen on PORT when run directly (local / non-serverless)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    mongoClient
        .connect()
        .then(() => {
            console.log("Connected to MongoDB via native driver successfully!");
            console.log(
                "App DB:",
                appDB.databaseName,
                "| Auth DB:",
                authDB.databaseName
            );
            app.listen(PORT, () => {
                console.log(`StudioSpace Server running on port ${PORT}`);
            });
        })
        .catch((error) => {
            console.error("Server startup failed:", error.message);
        });
}

// Export Express app for Vercel Serverless Function
export default app;
