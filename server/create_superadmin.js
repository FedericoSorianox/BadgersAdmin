const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

// Load env
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: path.resolve(__dirname, '.env.development') });
} else {
    dotenv.config();
}

const createSuperAdmin = async () => {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    const username = 'superadmin';
    const password = 'superpassword123'; // Change this!

    try {
        let user = await User.findOne({ username });
        if (user) {
            console.log('Super Admin already exists');
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            username,
            password: hashedPassword,
            role: 'superadmin',
            tenantId: null // Global access
        });

        await user.save();
        console.log(`✅ Super Admin created.`);
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
    } catch (error) {
        console.error('❌ Error creating super admin:', error.message);
    } finally {
        await mongoose.disconnect();
    }
};

createSuperAdmin();
