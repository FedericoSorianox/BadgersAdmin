const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI_DEV || 'mongodb+srv://thebadgers:Thebadgers2020!@honeybadger.ais1xut.mongodb.net/BadgersAdminDev?appName=HoneyBadger';
async function test() {
  await mongoose.connect(uri);
  const Tenant = require('./models/Tenant');
  const tenants = await Tenant.find();
  console.log('Tenants found:', tenants.map(t => ({ id: t._id, name: t.name, slug: t.slug })));
  process.exit(0);
}
test();
