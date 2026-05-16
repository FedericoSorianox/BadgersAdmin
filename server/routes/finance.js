const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Member = require('../models/Member');
const Product = require('../models/Product');
const CashRegister = require('../models/CashRegister');

// Get payments (optionally filter by month/year)
router.get('/', async (req, res) => {
    try {
        const { month, year } = req.query;
        let query = { tenantId: req.tenantId || null };
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
        const query = { memberId: req.params.memberId, tenantId: req.tenantId || null };
        const payments = await Payment.find(query).sort({ date: -1 });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Annual Analytics Endpoint (Optimized)
router.get('/analytics/annual', async (req, res) => {
    try {
        const { year } = req.query;
        if (!year) return res.status(400).json({ message: 'Year is required' });

        const tenantId = req.tenantId || null;
        const targetYear = Number(year);

        const pipeline = [
            {
                $match: {
                    tenantId: tenantId,
                    $or: [
                        { year: targetYear },
                        {
                            date: {
                                $gte: new Date(`${targetYear}-01-01`),
                                $lte: new Date(`${targetYear}-12-31`)
                            }
                        }
                    ],
                    $or: [
                        { type: 'Cuota' },
                        { type: { $exists: false } },
                        { type: null }
                    ]
                }
            },
            {
                $addFields: {
                    computedMonth: {
                        $ifNull: [
                            "$month",
                            { $month: "$date" }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$computedMonth",
                    count: { $sum: 1 },
                    revenue: { $sum: "$amount" }
                }
            },
            {
                $project: {
                    _id: 0,
                    month: "$_id",
                    count: 1,
                    revenue: 1
                }
            },
            {
                $sort: { month: 1 }
            }
        ];

        const results = await Payment.aggregate(pipeline);
        res.json(results);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: err.message });
    }
});

// Get expenses
router.get('/expenses', async (req, res) => {
    try {
        const query = { tenantId: req.tenantId || null };
        const expenses = await Expense.find(query).sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Register payment
router.post('/', async (req, res) => {
    const paymentData = req.body;
    if (req.tenantId) paymentData.tenantId = req.tenantId;
    const payment = new Payment(paymentData);
    try {
        // If it's a product sale, deduct stock and increment salesCount
        if (req.body.type === 'Producto' && req.body.productId) {
            const product = await Product.findById(req.body.productId);
            if (!product) {
                return res.status(404).json({ message: 'Producto no encontrado' });
            }
            if (product.stock < (req.body.quantity || 1)) {
                return res.status(400).json({ message: `Stock insuficiente. Stock actual: ${product.stock}` });
            }
            product.stock -= (req.body.quantity || 1);
            product.salesCount = (product.salesCount || 0) + (req.body.quantity || 1);
            await product.save();
        }

        const newPayment = await payment.save();
        res.status(201).json(newPayment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Create or update a status note (amount 0)
// Update task.md [x] Create 'Licencia' registration endpoint in finance.js
router.post('/license', async (req, res) => {
    try {
        const { memberId, memberName, month, year } = req.body;
        const tenantId = req.tenantId || null;

        // Check if already has a license for this period
        let existing = await Payment.findOne({ memberId, month, year, type: 'Licencia', tenantId });
        if (existing) return res.json(existing);

        // Delete any existing "Cuota" payment if any (reverting it)
        await Payment.deleteMany({ memberId, month, year, type: 'Cuota', tenantId });

        const license = new Payment({
            memberId,
            memberName,
            month,
            year,
            amount: 0,
            type: 'Licencia',
            tenantId
        });

        const saved = await license.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/condone', async (req, res) => {
    try {
        const { memberId, memberName, month, year } = req.body;
        const tenantId = req.tenantId || null;

        // Check if already has a condoned status for this period
        let existing = await Payment.findOne({ memberId, month, year, type: 'Condonado', tenantId });
        if (existing) return res.json(existing);

        // Delete any existing "Cuota" payment if any (reverting it)
        await Payment.deleteMany({ memberId, month, year, type: 'Cuota', tenantId });

        const condoned = new Payment({
            memberId,
            memberName,
            month,
            year,
            amount: 0,
            type: 'Condonado',
            tenantId
        });

        const saved = await condoned.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/note', async (req, res) => {
    try {
        const { memberId, memberName, month, year, comments } = req.body;
        const tenantId = req.tenantId || null;

        let query = { memberId, month, year, type: 'Nota', tenantId };
        let existingNote = await Payment.findOne(query);

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
            comments,
            tenantId
        });

        const savedNote = await newNote.save();
        res.status(201).json(savedNote);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Register expense
router.post('/expenses', async (req, res) => {
    const expenseData = req.body;
    if (req.tenantId) expenseData.tenantId = req.tenantId;
    const expense = new Expense(expenseData);
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
        const query = { tenantId: req.tenantId || null };
        const activeMembers = await Member.countDocuments({ ...query, active: true });
        const inactiveMembers = await Member.countDocuments({ ...query, active: false });

        // Financials for current month (or all time if preferred, let's do all time for now or provide query)
        // Let's do a simple aggregation for now

        const payments = await Payment.find(query);
        const totalIncome = payments.reduce((acc, curr) => acc + curr.amount, 0);

        const expenses = await Expense.find(query);
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

// Get cash registers
router.get('/cash-register', async (req, res) => {
    try {
        const query = { tenantId: req.tenantId || null };
        const registers = await CashRegister.find(query).sort({ date: -1 }).limit(30);
        res.json(registers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Register cash register close
router.post('/cash-register', async (req, res) => {
    const data = req.body;
    if (req.tenantId) data.tenantId = req.tenantId;
    const register = new CashRegister(data);
    try {
        const saved = await register.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get cash detail for current day (list of individual records)
router.get('/cash-detail', async (req, res) => {
    try {
        const { localDate } = req.query;
        const tenantId = req.tenantId || null;
        
        let startOfDay, endOfDay;
        if (localDate) {
            // Handle local date from client (YYYY-MM-DD)
            startOfDay = new Date(`${localDate}T00:00:00.000Z`);
            // Adjust for Uruguay timezone if we want to be precise, but better to just use the start/end of that "calendar" day string.
            // Actually, if we send ISO string from client it might be better.
            // Let's assume client sends the actual start and end or just the date string.
            // If client sends 2026-05-16, we want to capture everything that the client considers 2026-05-16.
            // However, the database stores Dates in UTC.
            // A sale at 21:00 PM Friday (local) is 00:00 AM Saturday (UTC).
            // If the user wants "only today's sales", and today is Saturday, they DON'T want that 21:00 PM Friday sale.
            // So we need to calculate the UTC range that corresponds to the local day.
            
            // Assuming localDate is YYYY-MM-DD from a system in -03:00
            // Start of 2026-05-16 local is 2026-05-16T03:00:00.000Z
            // End of 2026-05-16 local is 2026-05-17T02:59:59.999Z
            
            // To make it generic, we can pass the offset or just the full ISO range.
            // Let's keep it simple: the client will pass localDate, and we'll use a conservative range or just trust the client's "today".
            // Actually, the most robust way is for the client to pass the start and end timestamps.
            
            startOfDay = new Date(`${localDate}T00:00:00`);
            endOfDay = new Date(`${localDate}T23:59:59.999`);
        } else {
            startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
        }

        const baseQuery = {
            tenantId,
            date: { $gte: startOfDay, $lte: endOfDay }
        };

        const payments = await Payment.find(baseQuery).sort({ date: -1 });
        const expenses = await Expense.find(baseQuery).sort({ date: -1 });

        res.json({ payments, expenses });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get cash summary for current day
router.get('/cash-summary', async (req, res) => {
    try {
        const { localDate } = req.query;
        const tenantId = req.tenantId || null;
        
        let startOfDay, endOfDay;
        if (localDate) {
            startOfDay = new Date(`${localDate}T00:00:00`);
            endOfDay = new Date(`${localDate}T23:59:59.999`);
        } else {
            startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
        }

        const query = {
            tenantId,
            paymentMethod: 'Efectivo',
            date: { $gte: startOfDay, $lte: endOfDay }
        };

        const payments = await Payment.find(query);
        const cashIn = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        const expenses = await Expense.find(query);
        const cashOut = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        res.json({ cashIn, cashOut });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
