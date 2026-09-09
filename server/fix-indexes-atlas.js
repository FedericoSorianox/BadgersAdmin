const mongoose = require('mongoose');
const uri = 'mongodb+srv://thebadgers:Thebadgers2020!@honeybadger.ais1xut.mongodb.net/BadgersAdminDev?appName=HoneyBadger';

async function force() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const coll = db.collection('settings');
    await coll.dropIndex('key_1');
    console.log('Index key_1 dropped successfully from Atlas.');
  } catch(e) {
    console.error('Error dropping index from Atlas:', e.message);
  } finally {
    process.exit(0);
  }
}
force();
