const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI_DEV || 'mongodb+srv://thebadgers:Thebadgers2020!@honeybadger.ais1xut.mongodb.net/BadgersAdminDev?appName=HoneyBadger';
async function test() {
  await mongoose.connect(uri);
  const User = require('./models/User');
  const users = await User.find({ username: 'admin' });
  console.log('Admin users found:', users.map(u => ({ id: u._id, tenantId: u.tenantId, password: u.password })));
  process.exit(0);
}
test();
