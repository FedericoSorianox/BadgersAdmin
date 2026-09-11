require('dotenv').config();
const mongoose = require('mongoose');

async function fix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB for fixing indexes");
        const db = mongoose.connection.db;

        // Drop ci_1 from members
        try {
            await db.collection('members').dropIndex('ci_1');
            console.log("Dropped ci_1 from members");
        } catch (e) {
            console.log("ci_1 not found or error:", e.message);
        }

        // Drop username_1 from users
        try {
            await db.collection('users').dropIndex('username_1');
            console.log("Dropped username_1 from users");
        } catch (e) {
            console.log("username_1 not found or error:", e.message);
        }

        // Drop key_1 from settings
        try {
            await db.collection('settings').dropIndex('key_1');
            console.log("Dropped key_1 from settings");
        } catch (e) {
            console.log("key_1 not found or error:", e.message);
        }

    } catch (err) {
        console.error("Connection error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Done.");
    }
}
fix();
