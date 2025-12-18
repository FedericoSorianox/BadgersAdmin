const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');
const Tenant = require('./models/Tenant');

// Load env
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: path.resolve(__dirname, '.env.development') });
} else {
    dotenv.config();
}

const bootstrapLegacy = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    try {
        // 1. Create Default Tenant
        let tenant = await Tenant.findOne({ slug: 'badgers' });
        if (!tenant) {
            tenant = new Tenant({
                name: 'Badgers Admin',
                slug: 'badgers',
                branding: {
                    primaryColor: '#0052cc', // Example blue
                    secondaryColor: '#172b4d'
                }
            });
            await tenant.save();
            console.log('✅ Tenant "Badgers Admin" created.');
        } else {
            console.log('ℹ️ Tenant "Badgers Admin" already exists.');
        }

        // 2. Create Legacy User
        // The original hardcoded check was just password 'badgersadmin2025'.
        // We will create a user 'admin' with that password.
        const username = 'admin';
        const password = 'badgersadmin2025';

        let user = await User.findOne({ username });
        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = new User({
                username,
                password: hashedPassword,
                role: 'admin',
                tenantId: tenant._id
            });

            await user.save();
            console.log(`✅ User "${username}" created with legacy password.`);
        } else {
            // Update tenant link if missing (migration fix)
            if (!user.tenantId) {
                user.tenantId = tenant._id;
                await user.save();
                console.log(`✅ User "${username}" linked to tenant.`);
            }
            console.log(`ℹ️ User "${username}" already exists.`);
        }

    } catch (error) {
        console.error('❌ Error bootstrapping:', error.message);
    } finally {
        await mongoose.disconnect();
    }
};

bootstrapLegacy();
