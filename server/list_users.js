const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

// Load env
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: path.resolve(__dirname, '.env.development') });
} else {
    dotenv.config();
}

const listUsers = async () => {
    console.log('Connecting to:', process.env.MONGODB_URI); // Debug connection string (mask password?)
    // Mask password for safety in logs
    const safeUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
    console.log('Connecting to:', safeUri);

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    try {
        const users = await User.find({});
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- Username: '${u.username}', Role: ${u.role}, TenantId: ${u.tenantId}, ID: ${u._id}`);
        });

        if (users.length === 0) {
            console.log('⚠️ No users found! The collection is empty.');
        }

    } catch (error) {
        console.error('❌ Error listing users:', error.message);
    } finally {
        await mongoose.disconnect();
    }
};

listUsers();
