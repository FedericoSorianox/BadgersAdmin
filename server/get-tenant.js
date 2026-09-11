require('dotenv').config();
const mongoose = require('mongoose');

async function getTenant() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const tenants = await db.collection('tenants').find({}).toArray();
        console.log("Available Tenants:");
        tenants.forEach(t => console.log(`- Name: ${t.name}, Slug: ${t.slug}, ID: ${t._id}`));
    } finally {
        await mongoose.disconnect();
    }
}
getTenant();
