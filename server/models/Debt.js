const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    memberName: { type: String, required: true },
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: String,
        quantity: { type: Number, default: 1 },
        amount: Number // Unit price at the time of debt
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    date: { type: Date, default: Date.now },
    paidDate: Date,
    paidAmount: { type: Number, default: 0 }
}, { timestamps: true });

// Tenant Plugin
debtSchema.plugin(require('../plugins/tenantPlugin'));

module.exports = mongoose.model('Debt', debtSchema);
