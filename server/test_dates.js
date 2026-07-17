const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Member = require('./models/Member');

const testDates = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const activeMembers = await Member.find({
            $or: [
                { tenantId: null },
                { tenantId: { $exists: false } }
            ],
            active: true,
            isExempt: { $ne: true }
        });

        console.log(`Total Active Members: ${activeMembers.length}\n`);

        const selectedMonth = 6;
        const selectedYear = 2026;

        activeMembers.forEach(member => {
            const joinDate = new Date(member.joinDate || member.createdAt || new Date());
            const joinMonth = joinDate.getUTCMonth() + 1;
            const joinYear = joinDate.getUTCFullYear();

            const isExcluded = Number(selectedYear) < joinYear || (Number(selectedYear) === joinYear && Number(selectedMonth) < joinMonth);

            console.log(`Member: ${member.fullName}`);
            console.log(`  joinDate: ${member.joinDate}`);
            console.log(`  createdAt: ${member.createdAt}`);
            console.log(`  Resolved Join Date: ${joinDate.toISOString()} (Year: ${joinYear}, Month: ${joinMonth})`);
            console.log(`  Is Excluded for June 2026? ${isExcluded ? '❌ YES' : '✅ NO'}`);
            console.log('---');
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

testDates();
