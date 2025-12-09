const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log(`Connected to Database: ${mongoose.connection.name}`);

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\n--- Collections Status ---');

        for (const col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} documents`);
        }

        console.log('\n--- Sample Data ---');
        const Member = require('./models/Member');
        const Product = require('./models/Product');

        const member = await Member.findOne();
        console.log('Sample Member:', member ? member.fullName : 'None');

        const product = await Product.findOne();
        console.log('Sample Product:', product ? product.name : 'None');

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
