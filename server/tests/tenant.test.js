const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { tenantStorage } = require('../utils/tenantContext');
const tenantPlugin = require('../plugins/tenantPlugin');

// Create a dummy schema and apply the plugin
const DummySchema = new mongoose.Schema({
    name: String
});
DummySchema.plugin(tenantPlugin);

let mongoServer;
let DummyModel;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    DummyModel = mongoose.model('Dummy', DummySchema);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await DummyModel.deleteMany({});
});

describe('Tenant Plugin Isolation', () => {
    it('should assign tenantId on save if context exists', async () => {
        const tenantId = new mongoose.Types.ObjectId();
        
        await tenantStorage.run(new Map([['tenantId', tenantId]]), async () => {
            const doc = new DummyModel({ name: 'Tenant 1 Doc' });
            await doc.save();
            expect(doc.tenantId).toBeDefined();
            expect(doc.tenantId.toString()).toBe(tenantId.toString());
        });
    });

    it('should assign tenantId = null on save if no context exists (legacy behavior)', async () => {
        const doc = new DummyModel({ name: 'Legacy Doc' });
        await doc.save();
        expect(doc.tenantId).toBeUndefined();
    });

    it('should isolate queries between tenants', async () => {
        const tenant1 = new mongoose.Types.ObjectId();
        const tenant2 = new mongoose.Types.ObjectId();
        
        // Seed documents
        await tenantStorage.run(new Map([['tenantId', tenant1]]), async () => {
            await DummyModel.create({ name: 'T1 Doc A' });
            await DummyModel.create({ name: 'T1 Doc B' });
        });

        await tenantStorage.run(new Map([['tenantId', tenant2]]), async () => {
            await DummyModel.create({ name: 'T2 Doc A' });
        });

        // Query in Tenant 1 context
        await tenantStorage.run(new Map([['tenantId', tenant1]]), async () => {
            const docs = await DummyModel.find();
            expect(docs).toHaveLength(2);
            expect(docs[0].name).toContain('T1');
        });

        // Query in Tenant 2 context
        await tenantStorage.run(new Map([['tenantId', tenant2]]), async () => {
            const docs = await DummyModel.find();
            expect(docs).toHaveLength(1);
            expect(docs[0].name).toBe('T2 Doc A');
        });
    });

    it('should not leak cross-tenant on findOne', async () => {
        const tenant1 = new mongoose.Types.ObjectId();
        const tenant2 = new mongoose.Types.ObjectId();
        
        let docT1;
        await tenantStorage.run(new Map([['tenantId', tenant1]]), async () => {
            docT1 = await DummyModel.create({ name: 'T1 Doc' });
        });

        // Attempt to find docT1 from tenant2 context
        await tenantStorage.run(new Map([['tenantId', tenant2]]), async () => {
            const found = await DummyModel.findOne({ _id: docT1._id });
            expect(found).toBeNull();
        });
    });

    it('should not allow cross-tenant updates', async () => {
        const tenant1 = new mongoose.Types.ObjectId();
        const tenant2 = new mongoose.Types.ObjectId();
        
        let docT1;
        await tenantStorage.run(new Map([['tenantId', tenant1]]), async () => {
            docT1 = await DummyModel.create({ name: 'T1 Doc' });
        });

        // Attempt to update docT1 from tenant2 context
        await tenantStorage.run(new Map([['tenantId', tenant2]]), async () => {
            const result = await DummyModel.updateOne({ _id: docT1._id }, { name: 'Hacked' });
            expect(result.matchedCount).toBe(0);
        });

        // Verify it was not updated
        await tenantStorage.run(new Map([['tenantId', tenant1]]), async () => {
            const found = await DummyModel.findOne({ _id: docT1._id });
            expect(found.name).toBe('T1 Doc');
        });
    });
});
