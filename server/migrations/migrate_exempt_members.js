const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
// Adjust path to models
const Member = require('../models/Member');

// Attempt to load .env from server root (one level up)
// We try .env.development first, then .env
const envPathDev = path.resolve(__dirname, '../.env.development');
const envPathProd = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPathDev });
if (!process.env.MONGODB_URI) {
    dotenv.config({ path: envPathProd });
}

const EXCLUDED_NAMES = [
    'Federico Soriano',
    'Gonzalo Fernandez',
    'Uiller Aguero',
    'Andrea Lostorto',
    'Guillermo Viera',
    'Mariana Peralta'
];

async function migrate() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('Updating exempt members...');
        const result = await Member.updateMany(
            { fullName: { $in: EXCLUDED_NAMES } },
            { $set: { isExempt: true } }
        );

        console.log(`Migration complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
