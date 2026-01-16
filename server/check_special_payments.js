const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Payment = require('./models/Payment');
const Member = require('./models/Member');
const Expense = require('./models/Expense');

const checkPayments = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const specialPayments = await Payment.find({
            $or: [
                { amount: 0 },
                { type: 'Nota' },
                { comments: /excluido|beca|gratis/i }
            ]
        }).populate('memberId', 'fullName ci');

        console.log(`Found ${specialPayments.length} special payment records:\n`);
        specialPayments.forEach(p => {
            console.log(`- Member: ${p.memberName || (p.memberId ? p.memberId.fullName : 'Unknown')}`);
            console.log(`  Date: ${p.month}/${p.year}`);
            console.log(`  Type: ${p.type}`);
            console.log(`  Comments: ${p.comments || 'No comments'}`);
            console.log('---');
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkPayments();
