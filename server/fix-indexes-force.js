const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI_DEV || 'mongodb://127.0.0.1:27017/BadgersAdminDev';

async function force() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const coll = db.collection('settings');
    await coll.dropIndex('key_1');
    console.log('Index key_1 dropped successfully.');
  } catch(e) {
    console.error('Error dropping index:', e.message);
  } finally {
    process.exit(0);
  }
}
force();
