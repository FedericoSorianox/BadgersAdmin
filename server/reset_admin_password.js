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

const resetPassword = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    try {
        const username = 'admin';
        const newPassword = 'badgersadmin2025';

        const user = await User.findOne({ username });
        if (!user) {
            console.log('❌ User admin not found. Please run bootstrap_legacy.js first.');
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            user.password = hashedPassword;
            await user.save();
            console.log(`✅ Password for "${username}" has been RESET to "${newPassword}".`);
        }

    } catch (error) {
        console.error('❌ Error resetting password:', error.message);
    } finally {
        await mongoose.disconnect();
    }
};

resetPassword();
