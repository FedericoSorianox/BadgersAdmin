const mongoose = require('mongoose');
const uri = 'mongodb+srv://thebadgers:Thebadgers2020!@honeybadger.ais1xut.mongodb.net/BadgersAdminDev?appName=HoneyBadger';

async function force() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Drop key_1 in settings just in case
    try {
      await db.collection('settings').dropIndex('key_1');
      console.log('Index key_1 dropped successfully from settings.');
    } catch(e) {}
    
    // Drop ci_1 in members
    try {
      await db.collection('members').dropIndex('ci_1');
      console.log('Index ci_1 dropped successfully from members.');
    } catch(e) {}

  } catch(e) {
    console.error('Error dropping index from Atlas:', e.message);
  } finally {
    process.exit(0);
  }
}
force();
