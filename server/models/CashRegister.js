const mongoose = require('mongoose');

const CashRegisterSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    initialBalance: { type: Number, required: true },
    cashIn: { type: Number, required: true },
    cashOut: { type: Number, required: true },
    expectedBalance: { type: Number, required: true },
    actualBalance: { type: Number, required: true },
    difference: { type: Number, required: true },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
});

CashRegisterSchema.plugin(require('../plugins/tenantPlugin'));

module.exports = mongoose.model('CashRegister', CashRegisterSchema);
