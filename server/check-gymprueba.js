const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.development') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function check() {
    await mongoose.connect(MONGO_URI);
    const Tenant = require('./models/Tenant');
    const User = require('./models/User');

    const tenant = await Tenant.findOne({ slug: 'gymprueba' });
    console.log('Tenant gymprueba:', tenant ? { id: tenant._id, name: tenant.name, slug: tenant.slug } : null);

    if (tenant) {
        const users = await User.find({ tenantId: tenant._id });
        console.log('Users for gymprueba:', users.map(u => ({ id: u._id, username: u.username, role: u.role })));
    }
    
    // Also list all tenants and all users to see what exists
    const allTenants = await Tenant.find();
    console.log('All tenants:', allTenants.map(t => ({ id: t._id, name: t.name, slug: t.slug })));

    const allUsers = await User.find();
    console.log('All users:', allUsers.map(u => ({ id: u._id, username: u.username, tenantId: u.tenantId })));

    process.exit(0);
}
check();
