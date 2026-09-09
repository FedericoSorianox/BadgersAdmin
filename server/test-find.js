const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI_DEV || 'mongodb+srv://thebadgers:Thebadgers2020!@honeybadger.ais1xut.mongodb.net/BadgersAdminDev?appName=HoneyBadger';
async function test() {
  await mongoose.connect(uri);
  const Member = require('./models/Member');
  const count = await Member.countDocuments({ tenantId: null });
  console.log('Count with tenantId: null ->', count);
  process.exit(0);
}
test();
