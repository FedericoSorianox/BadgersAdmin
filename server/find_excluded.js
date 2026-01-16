const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Member = require('./models/Member');

const findExcluded = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const members = await Member.find({
            $or: [
                { planCost: 0 },
                { planType: /excluido|beca|gratis/i },
                { comments: /excluido|beca|gratis/i }
            ]
        });

        console.log(`Found ${members.length} potentially excluded members:\n`);
        members.forEach(m => {
            console.log(`- ${m.fullName} (CI: ${m.ci})`);
            console.log(`  Plan: ${m.planType} - $${m.planCost}`);
            console.log(`  Comments: ${m.comments || 'No comments'}`);
            console.log(`  Tenant: ${m.tenantId || 'Main'}`);
            console.log('---');
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

findExcluded();
