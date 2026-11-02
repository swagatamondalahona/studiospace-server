import "dotenv/config";
import { MongoClient } from "mongodb";

const studios = [
    {
        name: "The Creative Loft",
        image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
        category: "Photo Studios",
        price: 45,
        securityDeposit: 100,
        maxCapacity: 15,
        location: "Dhaka, Bangladesh",
        amenities: [
            "Professional Lighting",
            "Air Conditioning",
            "Wi-Fi",
            "Changing Room",
        ],
        description:
            "A premium photography studio with professional lighting and creative space.",
        ownerName: "Creative Loft Host",
        ownerEmail: "host@studiospace.com",
        rating: 4.9,
    },
    {
        name: "Echo Sound Studio",
        image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04",
        category: "Sound Stages",
        price: 60,
        securityDeposit: 150,
        maxCapacity: 10,
        location: "Chittagong, Bangladesh",
        amenities: [
            "Soundproof Room",
            "Professional Microphones",
            "Audio Mixer",
            "Wi-Fi",
        ],
        description:
            "Professional sound recording studio with high-quality audio equipment.",
        ownerName: "Echo Studio Host",
        ownerEmail: "host@studiospace.com",
        rating: 4.8,
    },
    {
        name: "Podcast Corner",
        image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc",
        category: "Podcast Rooms",
        price: 35,
        securityDeposit: 80,
        maxCapacity: 6,
        location: "Dhaka, Bangladesh",
        amenities: [
            "Microphones",
            "Acoustic Treatment",
            "Headphones",
            "Wi-Fi",
        ],
        description:
            "A comfortable podcast recording room with microphones and acoustic treatment.",
        ownerName: "Podcast Corner Host",
        ownerEmail: "host@studiospace.com",
        rating: 4.7,
    },
    {
        name: "Music Lab",
        image: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b",
        category: "Music Suites",
        price: 55,
        securityDeposit: 120,
        maxCapacity: 8,
        location: "Sylhet, Bangladesh",
        amenities: [
            "Music Instruments",
            "Audio Mixer",
            "Soundproof Room",
            "Wi-Fi",
        ],
        description:
            "A creative music production suite for musicians and producers.",
        ownerName: "Music Lab Host",
        ownerEmail: "host@studiospace.com",
        rating: 4.9,
    },
    {
        name: "Art House Studio",
        image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f",
        category: "Art Workshops",
        price: 30,
        securityDeposit: 60,
        maxCapacity: 12,
        location: "Rajshahi, Bangladesh",
        amenities: [
            "Painting Equipment",
            "Art Supplies",
            "Natural Lighting",
            "Wi-Fi",
        ],
        description:
            "An inspiring art workshop for painting, drawing and creative activities.",
        ownerName: "Art House Host",
        ownerEmail: "host@studiospace.com",
        rating: 4.6,
    },
    {
        name: "Cinema Production Space",
        image: "https://images.unsplash.com/photo-1485846234645-a62644f84728",
        category: "Photo Studios",
        price: 75,
        securityDeposit: 200,
        maxCapacity: 20,
        location: "Dhaka, Bangladesh",
        amenities: [
            "Cinema Lighting",
            "Camera Equipment",
            "Green Screen",
            "Air Conditioning",
        ],
        description:
            "A cinematic production space for professional video and photography shoots.",
        ownerName: "Cinema Space Host",
        ownerEmail: "host@studiospace.com",
        rating: 5.0,
    },
    {
        name: "Green Frame Photography Studio",
        image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
        category: "Photo Studios",
        price: 1500,
        securityDeposit: 100,
        maxCapacity: 15,
        location: "Dhanmondi, Dhaka",
        amenities: [
            "Professional Lighting",
            "Creative Backgrounds",
            "Photography Equipment",
        ],
        description:
            "A modern photography studio with professional lighting, creative backgrounds and photography equipment.",
        ownerName: "Green Frame Host",
        ownerEmail: "host@studiospace.com",
        rating: 0,
    },
];

const seedDatabase = async () => {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
        throw new Error("MONGODB_URI is missing from .env");
    }

    const client = new MongoClient(mongoURI);

    try {
        await client.connect();
        console.log("Connected to MongoDB for seeding!");

        const db = client.db(process.env.DB_NAME || "test");
        const studiosCollection = db.collection("studios");

        for (const studio of studios) {
            await studiosCollection.updateOne(
                { name: studio.name },
                {
                    $set: {
                        ...studio,
                        updatedAt: new Date(),
                    },
                    $setOnInsert: {
                        createdAt: new Date(),
                    },
                },
                { upsert: true }
            );
        }

        console.log(`${studios.length} Demo Studios Updated Successfully!`);
    } catch (error) {
        console.error("Seed Error:", error.message);
        process.exitCode = 1;
    } finally {
        await client.close();
    }
};

seedDatabase();
