const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const Member = require('../models/Member');

// Attempt to load .env based on --prod flag
const args = process.argv.slice(2);
const isProd = args.includes('--prod');

const envPathDev = path.resolve(__dirname, '../.env.development');
const envPathProd = path.resolve(__dirname, '../.env');

if (isProd) {
    dotenv.config({ path: envPathProd });
} else {
    dotenv.config({ path: envPathDev });
    if (!process.env.MONGODB_URI) {
        dotenv.config({ path: envPathProd });
    }
}

async function migrate() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        console.log('📡 Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // Find all members who do not have a joinDate in the database
        // In MongoDB, this matches fields that are null or do not exist
        const query = {
            $or: [
                { joinDate: { $exists: false } },
                { joinDate: null }
            ]
        };

        // Note: We bypass Mongoose defaults by using raw queries or finding them
        // But since we want to set joinDate dynamically to their individual createdAt, 
        // we can fetch them and update them one by one.
        const membersToMigrate = await Member.find(query);
        console.log(`🔍 Found ${membersToMigrate.length} members with missing joinDate.`);

        let updatedCount = 0;
        for (const member of membersToMigrate) {
            // Use createdAt if available, otherwise default to joinDate default or now
            const resolvedJoinDate = member.createdAt || new Date();
            
            await Member.updateOne(
                { _id: member._id },
                { $set: { joinDate: resolvedJoinDate } }
            );
            
            console.log(`   - Updated [${member.fullName}]: set joinDate to ${resolvedJoinDate.toISOString()}`);
            updatedCount++;
        }

        console.log(`\n🎉 Migration complete. Updated ${updatedCount} members.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
