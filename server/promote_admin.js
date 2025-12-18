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

const promoteAdmin = async () => {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    const username = 'admin';

    try {
        let user = await User.findOne({ username });
        if (!user) {
            console.log(`❌ User '${username}' not found.`);
            process.exit(1);
        }

        user.role = 'superadmin';
        // Ensure tenantId is null for superadmin so they can see everything (global access)
        user.tenantId = null;

        await user.save();
        console.log(`✅ User '${username}' is now a Super Admin.`);

    } catch (error) {
        console.error('❌ Error promoting user:', error.message);
    } finally {
        await mongoose.disconnect();
    }
};

promoteAdmin();
