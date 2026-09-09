const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
async function view() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/BadgersAdminDev');
  const collections = await mongoose.connection.db.collections();
  console.log(collections.map(c => c.collectionName));
  process.exit(0);
}
view();
