const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    concept: { type: String, required: true }, // concepto
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    category: { type: String, default: 'Otros' },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', ExpenseSchema);
