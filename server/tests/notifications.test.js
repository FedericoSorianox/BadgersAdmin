const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { tenantStorage } = require('../utils/tenantContext');
const Tenant = require('../models/Tenant');

// Mock auth middleware and axios before requiring routes
jest.mock('../middleware/auth', () => {
    return (req, res, next) => next();
});
const axios = require('axios');
jest.mock('axios');

const notificationsRoute = require('../routes/notifications');

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

app.use('/api/notifications', notificationsRoute);

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    
    // Set simulated mode off so we can test the real webhook dispatch block
    process.env.NODE_ENV = 'production';
    process.env.DISABLE_NOTIFICATIONS = 'false';
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Tenant.deleteMany({});
    jest.clearAllMocks();
});

describe('Webhook Proxy Isolation & Security', () => {
    it('should fail if no webhook URL is configured anywhere', async () => {
        delete process.env.N8N_WEBHOOK_URL; // ensure empty
        
        const res = await request(app)
            .post('/api/notifications/send-reminder')
            .send({ phone: '1234', memberName: 'Test', amount: 100 });
            
        expect(res.statusCode).toBe(500);
        expect(res.body.message).toMatch(/Webhook URL not configured/);
    });

    it('should use global N8N_WEBHOOK_URL for legacy users (tenantId = null)', async () => {
        process.env.N8N_WEBHOOK_URL = 'https://global-webhook.local';
        axios.post.mockResolvedValueOnce({ data: 'ok' });

        const res = await request(app)
            .post('/api/notifications/send-reminder')
            .send({ phone: '1234', memberName: 'Test', amount: 100, memberId: new mongoose.Types.ObjectId().toString() });
            
        expect(res.statusCode).toBe(200);
        expect(axios.post).toHaveBeenCalledWith('https://global-webhook.local', expect.any(Object));
    });

    it('should use tenant specific webhook URL if configured', async () => {
        const tenant = await Tenant.create({ 
            name: 'Tenant 1', 
            slug: 't1',
            notifications: { webhookUrl: 'https://tenant1-webhook.local' }
        });

        axios.post.mockResolvedValueOnce({ data: 'ok' });

        const res = await request(app)
            .post('/api/notifications/send-reminder')
            .set('x-test-slug', 't1')
            .send({ phone: '1234', memberName: 'Test', amount: 100, memberId: new mongoose.Types.ObjectId().toString() });
            
        expect(res.statusCode).toBe(200);
        expect(axios.post).toHaveBeenCalledWith('https://tenant1-webhook.local', expect.any(Object));
    });

    it('should fallback to global webhook if tenant has no specific URL', async () => {
        process.env.N8N_WEBHOOK_URL = 'https://global-webhook.local';
        const tenant = await Tenant.create({ 
            name: 'Tenant 2', 
            slug: 't2',
            notifications: { webhookUrl: '' } // Empty string
        });

        axios.post.mockResolvedValueOnce({ data: 'ok' });

        const res = await request(app)
            .post('/api/notifications/send-reminder')
            .set('x-test-slug', 't2')
            .send({ phone: '1234', memberName: 'Test', amount: 100, memberId: new mongoose.Types.ObjectId().toString() });
            
        expect(res.statusCode).toBe(200);
        expect(axios.post).toHaveBeenCalledWith('https://global-webhook.local', expect.any(Object));
    });
});
