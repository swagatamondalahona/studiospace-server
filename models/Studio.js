
const mongoose = require("mongoose");

const studioSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        image: {
            type: String,
            required: true,
        },

        category: {
            type: String,
            required: true,
            enum: [
                "Photo Studios",
                "Sound Stages",
                "Podcast Rooms",
                "Music Suites",
                "Art Workshops",
            ],
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },

        location: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            required: true,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const Studio = mongoose.model("Studio", studioSchema);

module.exports = Studio;
