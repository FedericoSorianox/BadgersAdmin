const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
// Try to connect to Dev DB if MONGODB_URI is not set to it
const uri = process.env.MONGODB_URI_DEV || 'mongodb://127.0.0.1:27017/BadgersAdminDev';

async function sync() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to', uri);
    
    // We only want to fix the collections we know have tenantId compound indexes
    const Settings = require('./models/Settings');
    const User = require('./models/User');
    const Member = require('./models/Member');
    
    console.log('Syncing indexes for Settings...');
    await Settings.syncIndexes();
    
    console.log('Syncing indexes for User...');
    await User.syncIndexes();
    
    console.log('Syncing indexes for Member...');
    await Member.syncIndexes();
    
    console.log('Indexes synced successfully!');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
sync();
