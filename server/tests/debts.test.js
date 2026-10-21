const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { tenantStorage } = require('../utils/tenantContext');
const Debt = require('../models/Debt');
const Product = require('../models/Product');
const Tenant = require('../models/Tenant');

// Mock auth middleware
jest.mock('../middleware/auth', () => {
    return (req, res, next) => next();
});

const debtsRoute = require('../routes/debts');

const app = express();
app.use(express.json());

// Mock Tenant Context middleware
app.use(async (req, res, next) => {
    const slug = req.headers['x-test-slug'];
    if (slug) {
        const tenant = await Tenant.findOne({ slug });
        if (tenant) {
            req.tenantId = tenant._id;
            return tenantStorage.run(new Map([['tenantId', tenant._id]]), next);
        }
    }
    
    req.tenantId = null;
    return tenantStorage.run(new Map([['tenantId', null]]), next);
});

app.use('/api/debts', debtsRoute);

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Debt.deleteMany({});
    await Product.deleteMany({});
    await Tenant.deleteMany({});
    jest.clearAllMocks();
});

describe('Debts API - Concurrency, Duplicate Prevention & Cancellation', () => {
    it('should create debt, deduct product stock and increment salesCount', async () => {
        const product = await Product.create({
            name: 'Natural Bars - Barrita B3ST',
            stock: 10,
            salePrice: 180,
            costPrice: 100,
            salesCount: 0
        });

        const memberId = new mongoose.Types.ObjectId();

        const res = await request(app)
            .post('/api/debts')
            .send({
                memberId,
                memberName: 'Mathias Goso',
                products: [{
                    productId: product._id,
                    productName: product.name,
                    quantity: 1,
                    amount: 180
                }],
                totalAmount: 180
            });

        expect(res.status).toBe(201);
        expect(res.body.totalAmount).toBe(180);

        const updatedProduct = await Product.findById(product._id);
        expect(updatedProduct.stock).toBe(9);
        expect(updatedProduct.salesCount).toBe(1);
    });

    it('should prevent duplicate debt creation within 10s window and avoid double stock deduction', async () => {
        const product = await Product.create({
            name: 'Natural Bars - Barrita B3ST',
            stock: 10,
            salePrice: 180,
            costPrice: 100,
            salesCount: 0
        });

        const memberId = new mongoose.Types.ObjectId();
        const payload = {
            memberId,
            memberName: 'Mathias Goso',
            products: [{
                productId: product._id,
                productName: product.name,
                quantity: 1,
                amount: 180
            }],
            totalAmount: 180
        };

        // First creation
        const res1 = await request(app).post('/api/debts').send(payload);
        expect(res1.status).toBe(201);

        // Immediate second creation (simulating rapid double-click)
        const res2 = await request(app).post('/api/debts').send(payload);
        expect(res2.status).toBe(200);
        expect(res2.body._id).toBe(res1.body._id); // Returns the same existing debt

        // Ensure only 1 debt in database
        const count = await Debt.countDocuments();
        expect(count).toBe(1);

        // Ensure stock only decremented once
        const updatedProduct = await Product.findById(product._id);
        expect(updatedProduct.stock).toBe(9);
        expect(updatedProduct.salesCount).toBe(1);
    });

    it('should delete/cancel pending debt and restore stock and salesCount', async () => {
        const product = await Product.create({
            name: 'Natural Bars - Barrita B3ST',
            stock: 10,
            salePrice: 180,
            costPrice: 100,
            salesCount: 2
        });

        const memberId = new mongoose.Types.ObjectId();
        const debt = await Debt.create({
            memberId,
            memberName: 'Mathias Goso',
            products: [{
                productId: product._id,
                productName: product.name,
                quantity: 1,
                amount: 180
            }],
            totalAmount: 180,
            status: 'pending'
        });

        const res = await request(app).delete(`/api/debts/${debt._id}`);
        expect(res.status).toBe(200);
        expect(res.body.deletedDebtId).toBe(debt._id.toString());

        // Check debt is gone from DB
        const deletedDebt = await Debt.findById(debt._id);
        expect(deletedDebt).toBeNull();

        // Check stock restored and salesCount decremented
        const updatedProduct = await Product.findById(product._id);
        expect(updatedProduct.stock).toBe(11);
        expect(updatedProduct.salesCount).toBe(1);
    });

    it('should not allow cancelling a debt that is already paid', async () => {
        const memberId = new mongoose.Types.ObjectId();
        const debt = await Debt.create({
            memberId,
            memberName: 'Mathias Goso',
            products: [],
            totalAmount: 180,
            status: 'paid'
        });

        const res = await request(app).delete(`/api/debts/${debt._id}`);
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('No se puede cancelar una deuda');
    });

    it('should not allow cancelling a debt with partial payments registered', async () => {
        const memberId = new mongoose.Types.ObjectId();
        const debt = await Debt.create({
            memberId,
            memberName: 'Mathias Goso',
            products: [],
            totalAmount: 180,
            paidAmount: 50,
            status: 'pending'
        });

        const res = await request(app).delete(`/api/debts/${debt._id}`);
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('pagos parciales');
    });
});
