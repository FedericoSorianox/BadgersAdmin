const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI_DEV || 'mongodb+srv://thebadgers:Thebadgers2020!@honeybadger.ais1xut.mongodb.net/BadgersAdminDev?appName=HoneyBadger';

async function count() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const count = await db.collection('members').countDocuments();
  console.log('Members count:', count);
  process.exit(0);
}
count();
