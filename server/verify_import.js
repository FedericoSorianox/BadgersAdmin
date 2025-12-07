const mongoose = require('mongoose');
require('dotenv').config();

const Member = require('./models/Member');
const Product = require('./models/Product');
const Payment = require('./models/Payment');
const Expense = require('./models/Expense');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const members = await Member.countDocuments();
        const products = await Product.countDocuments();
        const payments = await Payment.countDocuments();
        const expenses = await Expense.countDocuments();

        console.log(`Members: ${members}`);
        console.log(`Products: ${products}`);
        console.log(`Payments: ${payments}`);
        console.log(`Expenses: ${expenses}`);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
