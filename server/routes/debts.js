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

// Pay debt (Full)
router.put('/:id/pay', async (req, res) => {
    try {
        const debt = await Debt.findById(req.params.id);
        if (!debt) return res.status(404).json({ message: 'Deuda no encontrada' });
        if (debt.status === 'paid') return res.status(400).json({ message: 'Esta deuda ya está pagada' });

        // Mark as paid
        debt.status = 'paid';
        debt.paidDate = new Date();
        debt.paidAmount = debt.totalAmount; // Ensure consistency
        await debt.save();

        // Register in Finance (Payment)
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

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

// Partial Batch Payment
router.post('/pay-partial', async (req, res) => {
    try {
        const { memberId, amount } = req.body;
        const payAmount = Number(amount);

        if (!payAmount || payAmount <= 0) {
            return res.status(400).json({ message: 'Monto inválido' });
        }

        const debts = await Debt.find({ memberId, status: 'pending' }).sort({ date: 1 });

        if (debts.length === 0) {
            return res.status(404).json({ message: 'No se encontraron deudas pendientes' });
        }

        let remainingPayment = payAmount;
        let paidDebtsCount = 0;

        // Iterate updates
        for (const debt of debts) {
            if (remainingPayment <= 0) break;

            const debtTotal = debt.totalAmount;
            const alreadyPaid = debt.paidAmount || 0;
            const debtBalance = debtTotal - alreadyPaid;

            // SKIP if for some reason it's already fully paid but status says pending (sanity check)
            if (debtBalance <= 0) {
                debt.status = 'paid';
                debt.paidAmount = debtTotal; // fix it
                await debt.save();
                continue;
            }

            const paymentForThis = Math.min(remainingPayment, debtBalance);

            debt.paidAmount = alreadyPaid + paymentForThis;
            remainingPayment -= paymentForThis;

            if (debt.paidAmount >= debtTotal - 0.01) { // Tolerance for float
                debt.status = 'paid';
                debt.paidDate = new Date();
                debt.paidAmount = debtTotal; // Cap it clean
                paidDebtsCount++;
            }

            await debt.save();
        }

        const effectivePaid = payAmount - remainingPayment;

        if (effectivePaid > 0) {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const memberName = debts[0].memberName;

            const payment = new Payment({
                memberId,
                memberName,
                productName: 'Pago Parcial (Fiado)',
                month: currentMonth,
                year: currentYear,
                amount: effectivePaid,
                type: 'Producto',
                date: new Date()
            });

            await payment.save();
        }

        res.json({
            message: `Pago parcial de $${effectivePaid} registrado.`,
            remainingCredit: remainingPayment
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
