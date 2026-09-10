/**
 * dropLegacyIndexes.js — Drops old simple unique indexes that conflict with
 * the new compound indexes (tenantId + field).
 * 
 * Run once per database after deploying multi-tenant changes.
 * Safe to run multiple times (ignores already-dropped indexes).
 */
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGODB_URI;

const LEGACY_INDEXES = [
    { collection: 'settings', index: 'key_1' },
    { collection: 'members',  index: 'ci_1' },
    { collection: 'users',    index: 'username_1' }
];

async function drop() {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to: ${MONGO_URI.replace(/\/\/.*@/, '//***@')}`);
    const db = mongoose.connection.db;
    
    for (const { collection, index } of LEGACY_INDEXES) {
        try {
            await db.collection(collection).dropIndex(index);
            console.log(`✅ Dropped "${index}" from "${collection}"`);
        } catch (e) {
            if (e.code === 27 || e.message.includes('not found')) {
                console.log(`⏭️  "${index}" on "${collection}" — already gone`);
            } else {
                console.error(`❌ Error on "${collection}.${index}":`, e.message);
            }
        }
    }

    // Now sync the new compound indexes
    const User = require('../models/User');
    const Member = require('../models/Member');
    const Settings = require('../models/Settings');
    
    console.log('\nSyncing new compound indexes...');
    await User.syncIndexes();
    await Member.syncIndexes();
    await Settings.syncIndexes();
    console.log('✅ Indexes synced.');
    
    process.exit(0);
}
drop();
