/**
 * Migration: Assign Legacy Data to The Badgers Tenant
 * 
 * Purpose: Associates all existing records that have tenantId: null
 * with The Badgers' tenant document, enabling multi-tenant isolation.
 * 
 * Safety:
 *   - DRY RUN by default (set DRY_RUN=false to apply changes)
 *   - Idempotent: skips records already assigned to a tenant
 *   - Does NOT modify amounts, dates, or any business data
 *   - Reports per-collection counts before and after
 *   - Has rollback capability (set ROLLBACK=true)
 * 
 * Usage:
 *   DRY_RUN=true node server/migrations/assign_legacy_to_badgers.js    # Preview only
 *   DRY_RUN=false node server/migrations/assign_legacy_to_badgers.js   # Apply changes
 *   ROLLBACK=true TENANT_ID=<id> node server/migrations/assign_legacy_to_badgers.js  # Undo
 * 
 * CRITICAL: DO NOT RUN AGAINST PRODUCTION WITHOUT REVIEW AND BACKUP.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Models
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const Debt = require('../models/Debt');
const CashRegister = require('../models/CashRegister');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

const DRY_RUN = process.env.DRY_RUN !== 'false';
const ROLLBACK = process.env.ROLLBACK === 'true';
const TENANT_SLUG = process.env.TENANT_SLUG || 'thebadgers';

// All collections that need tenant assignment
const COLLECTIONS = [
    { model: Member, name: 'Members' },
    { model: Payment, name: 'Payments' },
    { model: Expense, name: 'Expenses' },
    { model: Product, name: 'Products' },
    { model: Debt, name: 'Debts' },
    { model: CashRegister, name: 'CashRegisters' },
    { model: Notification, name: 'Notifications' },
    { model: Settings, name: 'Settings' },
];

async function connect() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        throw new Error('No MONGODB_URI or MONGO_URI found in environment. Set it in server/.env');
    }
    await mongoose.connect(uri);
    console.log(`✅ Connected to MongoDB`);
}

async function findOrCreateTenant(slug) {
    let tenant = await Tenant.findOne({ slug: { $regex: new RegExp(`^${slug}$`, 'i') } });
    
    if (!tenant) {
        if (DRY_RUN) {
            console.log(`⚠️  [DRY RUN] Tenant "${slug}" not found. Would create it.`);
            return null;
        }
        tenant = new Tenant({
            name: 'The Badgers',
            slug: slug,
            branding: {
                primaryColor: '#1a1a2e',
                sidebarText: 'The Badgers Admin'
            }
        });
        await tenant.save();
        console.log(`✅ Created tenant "${slug}" with ID: ${tenant._id}`);
    } else {
        console.log(`✅ Found existing tenant "${slug}" with ID: ${tenant._id}`);
    }
    
    return tenant;
}

async function migrate(tenantId) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(DRY_RUN ? '🔍 DRY RUN MODE — No changes will be made' : '🚀 LIVE MODE — Changes will be applied');
    console.log(`${'='.repeat(60)}\n`);
    
    const report = [];
    
    for (const { model, name } of COLLECTIONS) {
        // Count orphaned records (tenantId is null or missing)
        const orphanedCount = await model.countDocuments({
            $or: [{ tenantId: null }, { tenantId: { $exists: false } }]
        });
        
        const alreadyAssigned = await model.countDocuments({ tenantId: { $ne: null, $exists: true } });
        
        console.log(`📋 ${name}: ${orphanedCount} orphaned, ${alreadyAssigned} already assigned`);
        
        if (orphanedCount > 0 && !DRY_RUN) {
            const result = await model.updateMany(
                { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] },
                { $set: { tenantId: tenantId } }
            );
            console.log(`   ✅ Updated ${result.modifiedCount} records`);
            report.push({ collection: name, updated: result.modifiedCount });
        } else if (orphanedCount > 0) {
            console.log(`   ⏭️  Would update ${orphanedCount} records`);
            report.push({ collection: name, wouldUpdate: orphanedCount });
        } else {
            console.log(`   ✅ No action needed`);
            report.push({ collection: name, updated: 0 });
        }
    }
    
    // Handle Users separately: assign non-superadmin users without tenantId to this tenant
    const orphanedUsers = await User.countDocuments({
        role: { $ne: 'superadmin' },
        $or: [{ tenantId: null }, { tenantId: { $exists: false } }]
    });
    
    console.log(`📋 Users (non-superadmin): ${orphanedUsers} orphaned`);
    
    if (orphanedUsers > 0 && !DRY_RUN) {
        const result = await User.updateMany(
            { role: { $ne: 'superadmin' }, $or: [{ tenantId: null }, { tenantId: { $exists: false } }] },
            { $set: { tenantId: tenantId } }
        );
        console.log(`   ✅ Updated ${result.modifiedCount} user records`);
        report.push({ collection: 'Users', updated: result.modifiedCount });
    } else if (orphanedUsers > 0) {
        console.log(`   ⏭️  Would update ${orphanedUsers} user records`);
        report.push({ collection: 'Users', wouldUpdate: orphanedUsers });
    }
    
    return report;
}

async function rollback(tenantId) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(DRY_RUN ? '🔍 ROLLBACK DRY RUN' : '⚠️  ROLLBACK MODE — Setting tenantId back to null');
    console.log(`${'='.repeat(60)}\n`);
    
    if (!tenantId) {
        const id = process.env.TENANT_ID;
        if (!id) {
            throw new Error('TENANT_ID environment variable required for rollback');
        }
        tenantId = new mongoose.Types.ObjectId(id);
    }
    
    for (const { model, name } of COLLECTIONS) {
        const assignedCount = await model.countDocuments({ tenantId });
        console.log(`📋 ${name}: ${assignedCount} records with tenantId=${tenantId}`);
        
        if (assignedCount > 0 && !DRY_RUN) {
            const result = await model.updateMany(
                { tenantId },
                { $set: { tenantId: null } }
            );
            console.log(`   ↩️  Rolled back ${result.modifiedCount} records to tenantId: null`);
        } else if (assignedCount > 0) {
            console.log(`   ⏭️  Would roll back ${assignedCount} records`);
        }
    }
    
    // Rollback users
    const assignedUsers = await User.countDocuments({ tenantId, role: { $ne: 'superadmin' } });
    console.log(`📋 Users: ${assignedUsers} records with tenantId=${tenantId}`);
    if (assignedUsers > 0 && !DRY_RUN) {
        await User.updateMany(
            { tenantId, role: { $ne: 'superadmin' } },
            { $set: { tenantId: null } }
        );
        console.log(`   ↩️  Rolled back users`);
    }
}

async function rebuildIndexes() {
    console.log('\n📦 Rebuilding compound indexes...');
    
    try {
        // Drop old global unique index on ci if it exists
        const memberIndexes = await Member.collection.indexes();
        const oldCiIndex = memberIndexes.find(idx => idx.key && idx.key.ci === 1 && idx.unique && !idx.key.tenantId);
        if (oldCiIndex) {
            if (!DRY_RUN) {
                await Member.collection.dropIndex(oldCiIndex.name);
                console.log(`   ✅ Dropped old global unique index on Member.ci: "${oldCiIndex.name}"`);
            } else {
                console.log(`   ⏭️  Would drop old global unique index on Member.ci: "${oldCiIndex.name}"`);
            }
        }
        
        // Drop old global unique index on key if it exists
        const settingsIndexes = await Settings.collection.indexes();
        const oldKeyIndex = settingsIndexes.find(idx => idx.key && idx.key.key === 1 && idx.unique && !idx.key.tenantId);
        if (oldKeyIndex) {
            if (!DRY_RUN) {
                await Settings.collection.dropIndex(oldKeyIndex.name);
                console.log(`   ✅ Dropped old global unique index on Settings.key: "${oldKeyIndex.name}"`);
            } else {
                console.log(`   ⏭️  Would drop old global unique index on Settings.key: "${oldKeyIndex.name}"`);
            }
        }
        
        // Ensure new compound indexes exist
        if (!DRY_RUN) {
            await Member.syncIndexes();
            await Settings.syncIndexes();
            console.log('   ✅ Compound indexes synced for Member and Settings');
        } else {
            console.log('   ⏭️  Would sync compound indexes for Member and Settings');
        }
    } catch (error) {
        console.error('   ⚠️  Index rebuild error (may be safe to ignore if indexes already correct):', error.message);
    }
}

async function main() {
    try {
        await connect();
        
        if (ROLLBACK) {
            await rollback();
        } else {
            const tenant = await findOrCreateTenant(TENANT_SLUG);
            
            if (!tenant && DRY_RUN) {
                console.log('\n⚠️  Cannot proceed with dry run without existing tenant. Create the tenant first or run with DRY_RUN=false.');
                await mongoose.disconnect();
                process.exit(0);
            }
            
            if (tenant) {
                const report = await migrate(tenant._id);
                await rebuildIndexes();
                
                console.log(`\n${'='.repeat(60)}`);
                console.log('📊 MIGRATION REPORT');
                console.log(`${'='.repeat(60)}`);
                console.table(report);
            }
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Done. Disconnected from MongoDB.');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

main();
