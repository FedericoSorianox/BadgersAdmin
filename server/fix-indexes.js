const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function fix() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/BadgersAdminDev');
  console.log('Connected to DB');
  
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    const indexes = await collection.indexes();
    for (let index of indexes) {
      // Check if it's an old unique index that doesn't include tenantId
      if (index.unique && index.name !== '_id_' && !index.key.tenantId) {
        console.log(`Dropping index ${index.name} from ${collection.collectionName}`);
        await collection.dropIndex(index.name);
      }
    }
  }
  console.log('Done');
  process.exit(0);
}
fix();
