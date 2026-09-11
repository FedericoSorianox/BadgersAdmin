require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected");
    const db = mongoose.connection.db;
    
    const cols = await db.listCollections().toArray();
    for (const col of cols) {
        const collection = db.collection(col.name);
        const indexes = await collection.indexes();
        console.log(`\nCollection: ${col.name}`);
        indexes.forEach(idx => {
            console.log(`  Index: ${idx.name} - Unique: ${!!idx.unique} - Key: ${JSON.stringify(idx.key)}`);
        });
    }
    await mongoose.disconnect();
}
check();
