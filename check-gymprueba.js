const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'server/.env.development') });
require('dotenv').config({ path: path.resolve(__dirname, 'server/.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function check() {
    await mongoose.connect(MONGO_URI);
    const Tenant = require('./server/models/Tenant');
    const User = require('./server/models/User');

    const tenant = await Tenant.findOne({ slug: 'gymprueba' });
    console.log('Tenant gymprueba:', tenant);

    if (tenant) {
        const users = await User.find({ tenantId: tenant._id });
        console.log('Users for gymprueba:', users.map(u => ({ id: u._id, username: u.username })));
    } else {
        console.log('Tenant gymprueba NOT found in DB:', MONGO_URI.replace(/\/\/.*@/, '//***@'));
    }
    process.exit(0);
}
check();
