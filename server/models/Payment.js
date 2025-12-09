const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    memberName: String,
    memberCi: String,
    productName: String, // For product sales
    month: Number,
    year: Number,
    amount: Number,
    type: { type: String, enum: ['Cuota', 'Producto', 'Venta'], default: 'Cuota' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
