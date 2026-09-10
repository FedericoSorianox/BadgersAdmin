const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI_DEV || 'mongodb+srv://thebadgers:Thebadgers2020!@honeybadger.ais1xut.mongodb.net/BadgersAdminDev?appName=HoneyBadger';
const bcrypt = require('bcryptjs');

async function test() {
  await mongoose.connect(uri);
  const User = require('./models/User');
  const Tenant = require('./models/Tenant');

  const tenant = await Tenant.findOne({ slug: 'demo' });
  const tenantId = tenant._id;

  const user = await User.findOne({ username: 'admin', tenantId });
  console.log('User found:', user);

  const isMatch = await bcrypt.compare('demo1234', user.password);
  console.log('Password match?', isMatch);

  process.exit(0);
}
test();
