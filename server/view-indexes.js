const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function view() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/BadgersAdminDev');
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    if (collection.collectionName === 'settings') {
      const indexes = await collection.indexes();
      console.log(indexes);
    }
  }
  process.exit(0);
}
view();
