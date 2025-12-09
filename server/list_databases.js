const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const admin = mongoose.connection.db.admin();
        const result = await admin.listDatabases();
        console.log('Databases in cluster:');
        result.databases.forEach(db => {
            console.log(`- ${db.name} (Size: ${db.sizeOnDisk})`);
        });
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
