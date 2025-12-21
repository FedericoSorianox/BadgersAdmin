const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Member = require('../models/Member');
const Product = require('../models/Product');

// Get payments (optionally filter by month/year)
router.get('/', async (req, res) => {
    try {
        const { month, year } = req.query;
        let query = {};
        if (month) query.month = month;
        if (year) query.year = year;

        const payments = await Payment.find(query).sort({ date: -1 });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get payments by member ID
router.get('/member/:memberId', async (req, res) => {
    try {
        const payments = await Payment.find({ memberId: req.params.memberId }).sort({ date: -1 });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get expenses
router.get('/expenses', async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Register payment
router.post('/', async (req, res) => {
    const payment = new Payment(req.body);
    try {
        // If it's a product sale, deduct stock
        if (req.body.type === 'Producto' && req.body.productId) {
            const product = await Product.findById(req.body.productId);
            if (!product) {
                return res.status(404).json({ message: 'Producto no encontrado' });
            }
            if (product.stock < (req.body.quantity || 1)) {
                return res.status(400).json({ message: `Stock insuficiente. Stock actual: ${product.stock}` });
            }
            product.stock -= (req.body.quantity || 1);
            await product.save();
        }

        const newPayment = await payment.save();
        res.status(201).json(newPayment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Create or update a status note (amount 0)
router.post('/note', async (req, res) => {
    try {
        const { memberId, memberName, month, year, comments } = req.body;

        // Check if there is already a note for this month
        let existingNote = await Payment.findOne({
            memberId,
            month,
            year,
            type: 'Nota'
        });

        if (existingNote) {
            existingNote.comments = comments;
            const updated = await existingNote.save();
            return res.json(updated);
        }

        const newNote = new Payment({
            memberId,
            memberName,
            month,
            year,
            amount: 0,
            type: 'Nota',
            comments
        });

        const savedNote = await newNote.save();
        res.status(201).json(savedNote);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Register expense
router.post('/expenses', async (req, res) => {
    const expense = new Expense(req.body);
    try {
        const newExpense = await expense.save();
        res.status(201).json(newExpense);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update expense
router.put('/expenses/:id', async (req, res) => {
    try {
        const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedExpense);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete expense
router.delete('/expenses/:id', async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.json({ message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Dashboard Stats
router.get('/stats', async (req, res) => {
    try {
        const activeMembers = await Member.countDocuments({ active: true });
        const inactiveMembers = await Member.countDocuments({ active: false });

        // Financials for current month (or all time if preferred, let's do all time for now or provide query)
        // Let's do a simple aggregation for now

        const payments = await Payment.find();
        const totalIncome = payments.reduce((acc, curr) => acc + curr.amount, 0);

        const expenses = await Expense.find();
        const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

        res.json({
            activeMembers,
            inactiveMembers,
            totalIncome,
            totalExpenses,
            netProfit: totalIncome - totalExpenses
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update payment
router.put('/:id', async (req, res) => {
    try {
        const updatedPayment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedPayment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete payment
router.delete('/:id', async (req, res) => {
    try {
        await Payment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Payment deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
