
require("dotenv").config();
const mongoose = require("mongoose");
const Studio = require("./models/Studio");

const studios = [
    {
        name: "The Creative Loft",
        image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
        category: "Photo Studios",
        price: 45,
        rating: 4.9,
        location: "Dhaka, Bangladesh",
        description: "A premium photography studio with professional lighting and creative space.",
    },
    {
        name: "Echo Sound Studio",
        image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04",
        category: "Sound Stages",
        price: 60,
        rating: 4.8,
        location: "Chittagong, Bangladesh",
        description: "Professional sound recording studio with high-quality audio equipment.",
    },
    {
        name: "Podcast Corner",
        image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc",
        category: "Podcast Rooms",
        price: 35,
        rating: 4.7,
        location: "Dhaka, Bangladesh",
        description: "A comfortable podcast recording room with microphones and acoustic treatment.",
    },
    {
        name: "Music Lab",
        image: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b",
        category: "Music Suites",
        price: 55,
        rating: 4.9,
        location: "Sylhet, Bangladesh",
        description: "A creative music production suite for musicians and producers.",
    },
    {
        name: "Art House Studio",
        image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f",
        category: "Art Workshops",
        price: 30,
        rating: 4.6,
        location: "Rajshahi, Bangladesh",
        description: "An inspiring art workshop for painting, drawing and creative activities.",
    },
    {
        name: "Cinema Production Space",
        image: "https://images.unsplash.com/photo-1485846234645-a62644f84728",
        category: "Photo Studios",
        price: 75,
        rating: 5.0,
        location: "Dhaka, Bangladesh",
        description: "A cinematic production space for professional video and photography shoots.",
    },
];

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected!");

        await Studio.deleteMany({});
        await Studio.insertMany(studios);

        console.log("6 Demo Studios Inserted Successfully!");
    } catch (error) {
        console.error("Seed Error:", error.message);
    } finally {
        await mongoose.disconnect();
    }
};

seedDatabase();
