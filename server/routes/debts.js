const express = require('express');
const router = express.Router();
const Debt = require('../models/Debt');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

// Get pending debts (Protected)
router.get('/', auth, async (req, res) => {
    try {
        const query = { status: 'pending', tenantId: req.tenantId || null };
        const debts = await Debt.find(query)
            .sort({ date: -1 })
            .populate('memberId', 'fullName ci photoUrl phone');
        res.json(debts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// In-memory set for active in-flight debt creation requests per member to prevent race conditions
const activeDebtCreations = new Set();

// Create new debt (Fiado) (Protected)
router.post('/', auth, async (req, res) => {
    const { memberId, memberName, products, totalAmount } = req.body;

    if (!memberId || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: 'Datos de fiado incompletos (requiere socio y productos)' });
    }

    const lockKey = `${req.tenantId || 'global'}:${memberId}`;

    // 1. Prevent concurrent race conditions (e.g. rapid double-clicking within milliseconds)
    if (activeDebtCreations.has(lockKey)) {
        return res.status(409).json({ message: 'Ya se está procesando un fiado para este socio. Por favor espera un momento.' });
    }

    activeDebtCreations.add(lockKey);

    try {
        // 2. Prevent duplicate creation within a 10-second window (same member, same amount, same items)
        const tenSecondsAgo = new Date(Date.now() - 10000);
        const query = {
            memberId,
            totalAmount: Number(totalAmount),
            status: 'pending',
            createdAt: { $gte: tenSecondsAgo }
        };
        if (req.tenantId) query.tenantId = req.tenantId;

        const recentDuplicate = await Debt.findOne(query);

        if (recentDuplicate && Array.isArray(recentDuplicate.products) && recentDuplicate.products.length === products.length) {
            const isMatch = products.every(p => {
                const rp = recentDuplicate.products.find(item => 
                    String(item.productId) === String(p.productId) && 
                    Number(item.quantity) === Number(p.quantity)
                );
                return !!rp;
            });

            if (isMatch) {
                console.warn(`[Debts] Duplicate debt creation detected within 10s for member ${memberId}. Returning existing without double stock deduction.`);
                return res.status(200).json(recentDuplicate);
            }
        }

        // Verify and deduct stock and increment salesCount for each product
        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Producto no encontrado: ${item.productName}` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Stock insuficiente para ${product.name}. Stock actual: ${product.stock}` });
            }
            product.stock -= item.quantity;
            product.salesCount = (product.salesCount || 0) + item.quantity;
            await product.save();
        }

        const debt = new Debt({
            memberId,
            memberName,
            products,
            totalAmount,
            status: 'pending',
            tenantId: req.tenantId || null
        });

        const newDebt = await debt.save();
        res.status(201).json(newDebt);
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        activeDebtCreations.delete(lockKey);
    }
});

// Cancel / Delete pending debt (Protected)
router.delete('/:id', auth, async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (req.tenantId) {
            query.tenantId = req.tenantId;
        }

        const debt = await Debt.findOne(query);
        if (!debt) {
            return res.status(404).json({ message: 'Deuda no encontrada' });
        }

        if (debt.status === 'paid') {
            return res.status(400).json({ message: 'No se puede cancelar una deuda que ya fue totalmente pagada' });
        }

        if (debt.paidAmount && debt.paidAmount > 0) {
            return res.status(400).json({ 
                message: 'No se puede cancelar directamente una deuda con pagos parciales registrados. Primero revisa los pagos asociados.' 
            });
        }

        // Restore stock and decrease salesCount for each product in the cancelled debt
        if (Array.isArray(debt.products)) {
            for (const item of debt.products) {
                if (item.productId) {
                    const product = await Product.findById(item.productId);
                    if (product) {
                        const qty = Number(item.quantity) || 1;
                        product.stock = (product.stock || 0) + qty;
                        if (product.salesCount !== undefined) {
                            product.salesCount = Math.max(0, (product.salesCount || 0) - qty);
                        }
                        await product.save();
                    }
                }
            }
        }

        await Debt.deleteOne({ _id: debt._id });

        res.json({ 
            message: 'Deuda cancelada correctamente. Se restauró el stock de los productos.',
            deletedDebtId: debt._id 
        });
    } catch (err) {
        console.error('Error cancelling debt:', err);
        res.status(500).json({ message: err.message });
    }
});

// Pay debt (Full) (Protected)
router.put('/:id/pay', auth, async (req, res) => {
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
            paymentMethod: req.body.paymentMethod || 'Efectivo',
            date: new Date(),
            tenantId: debt.tenantId || req.tenantId || null
        });

        await payment.save();

        res.json({ message: 'Deuda pagada exitosamente', debt });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Partial Batch Payment with Specific Adjustments support (Protected)
router.post('/pay-partial', auth, async (req, res) => {
    try {
        const { memberId, amount, adjustments } = req.body;
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

        // 1. Apply Specific Adjustments FIRST if provided
        // adjustments: { debtId: amountToPay }
        if (adjustments && typeof adjustments === 'object') {
            for (const debt of debts) {
                const adjAmount = Number(adjustments[debt._id]);
                if (adjAmount && adjAmount > 0) {
                    const toPay = Math.min(adjAmount, remainingPayment, (debt.totalAmount - (debt.paidAmount || 0)));
                    
                    debt.paidAmount = (debt.paidAmount || 0) + toPay;
                    remainingPayment -= toPay;

                    if (debt.paidAmount >= debt.totalAmount - 0.01) {
                        debt.status = 'paid';
                        debt.paidDate = new Date();
                        debt.paidAmount = debt.totalAmount;
                        paidDebtsCount++;
                    }
                    await debt.save();
                }
            }
        }

        // 2. Iterate updates with FIFO for the REMAINING balance
        for (const debt of debts) {
            if (remainingPayment <= 0) break;
            
            // Reload debt to get fresh state after adjustments
            const freshDebt = await Debt.findById(debt._id);
            if (freshDebt.status === 'paid') continue;

            const debtTotal = freshDebt.totalAmount;
            const alreadyPaid = freshDebt.paidAmount || 0;
            const debtBalance = debtTotal - alreadyPaid;

            if (debtBalance <= 0) {
                freshDebt.status = 'paid';
                freshDebt.paidAmount = debtTotal;
                await freshDebt.save();
                continue;
            }

            const paymentForThis = Math.min(remainingPayment, debtBalance);

            freshDebt.paidAmount = alreadyPaid + paymentForThis;
            remainingPayment -= paymentForThis;

            if (freshDebt.paidAmount >= debtTotal - 0.01) {
                freshDebt.status = 'paid';
                freshDebt.paidDate = new Date();
                freshDebt.paidAmount = debtTotal;
                paidDebtsCount++;
            }

            await freshDebt.save();
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
                paymentMethod: req.body.paymentMethod || 'Efectivo',
                date: new Date(),
                tenantId: debts[0].tenantId || req.tenantId || null
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

// Public route to get pending debts for a specific member (Safe projection for member card)
router.get('/public/member/:memberId', async (req, res) => {
    try {
        const debts = await Debt.find({ 
            memberId: req.params.memberId, 
            status: 'pending' 
        })
        .select('products totalAmount paidAmount status date')
        .sort({ date: -1 });
        res.json(debts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
