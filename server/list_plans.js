const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Member = require('./models/Member');

const listPlans = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const stats = await Member.aggregate([
            { $group: { _id: "$planType", count: { $sum: 1 }, examples: { $push: "$fullName" } } }
        ]);
        console.log(JSON.stringify(stats, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

listPlans();
