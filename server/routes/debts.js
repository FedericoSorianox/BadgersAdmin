const express = require('express');
const router = express.Router();
const Debt = require('../models/Debt');
const Product = require('../models/Product');
const Payment = require('../models/Payment');

// Get pending debts
router.get('/', async (req, res) => {
    try {
        const debts = await Debt.find({ status: 'pending' })
            .sort({ date: -1 })
            .populate('memberId', 'fullName ci photoUrl');
        res.json(debts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new debt (Fiado)
router.post('/', async (req, res) => {
    try {
        const { memberId, memberName, products, totalAmount } = req.body;

        // Verify and deduct stock for each product
        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Producto no encontrado: ${item.productName}` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Stock insuficiente para ${product.name}. Stock actual: ${product.stock}` });
            }
            product.stock -= item.quantity;
            await product.save();
        }

        const debt = new Debt({
            memberId,
            memberName,
            products,
            totalAmount,
            status: 'pending'
        });

        const newDebt = await debt.save();
        res.status(201).json(newDebt);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Pay debt
router.put('/:id/pay', async (req, res) => {
    try {
        const debt = await Debt.findById(req.params.id);
        if (!debt) return res.status(404).json({ message: 'Deuda no encontrada' });
        if (debt.status === 'paid') return res.status(400).json({ message: 'Esta deuda ya está pagada' });

        // Mark as paid
        debt.status = 'paid';
        debt.paidDate = new Date();
        await debt.save();

        // Register in Finance (Payment)
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Create one payment record for the total amount of the debt
        // Or create individual payment records per product? Let's do a consolidated one for simplicity as "Pago Fiado"
        // But for better tracking, maybe individually? The user wants "money counted when paid".
        // Let's record a single payment entry with details.

        const payment = new Payment({
            memberId: debt.memberId,
            memberName: debt.memberName,
            productName: `Pago Fiado (${debt.products.map(p => p.productName).join(', ')})`,
            month: currentMonth,
            year: currentYear,
            amount: debt.totalAmount,
            type: 'Producto', // Classify as sale
            date: new Date()
        });

        await payment.save();

        res.json({ message: 'Deuda pagada exitosamente', debt });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
