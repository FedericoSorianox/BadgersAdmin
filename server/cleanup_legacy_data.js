const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Member = require('./models/Member');
const Product = require('./models/Product');
const Payment = require('./models/Payment');
const Expense = require('./models/Expense');
const Debt = require('./models/Debt');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

console.log('🧹 LEGACY DATA CLEANUP SCRIPT');
console.log('=====================================');
console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (Preview Only)' : '⚠️  LIVE EXECUTION'}`);
console.log(`Database: ${process.env.MONGODB_URI}`);
console.log('');

const cleanupLegacyData = async () => {
    try {
        // 1. CONNECT TO DATABASE
        console.log('📡 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected!\n');

        // 2. ANALYZE CURRENT STATE
        console.log('📊 CURRENT STATE ANALYSIS');
        console.log('=====================================');

        // Count legacy data (without tenantId)
        const legacyMembers = await Member.countDocuments({
            $or: [
                { tenantId: null },
                { tenantId: { $exists: false } }
            ]
        });
        const legacyActiveMembers = await Member.countDocuments({
            $or: [
                { tenantId: null },
                { tenantId: { $exists: false } }
            ],
            active: true
        });

        // Count seed data (with tenantId)
        const seedMembers = await Member.countDocuments({
            tenantId: { $exists: true, $ne: null }
        });
        const seedActiveMembers = await Member.countDocuments({
            tenantId: { $exists: true, $ne: null },
            active: true
        });

        console.log('LEGACY DATA (your real production data - NO tenantId):');
        console.log(`   ✅ Total Members: ${legacyMembers}`);
        console.log(`   ✅ Active Members: ${legacyActiveMembers}`);
        console.log('');
        console.log('SEED DATA (incorrect data - HAS tenantId):');
        console.log(`   ❌ Total Members: ${seedMembers}`);
        console.log(`   ❌ Active Members: ${seedActiveMembers}`);
        console.log('');

        // 3. SHOW SAMPLES
        console.log('📋 Sample of LEGACY data (will be KEPT):');
        const legacySample = await Member.find({
            $or: [
                { tenantId: null },
                { tenantId: { $exists: false } }
            ]
        }).limit(5).select('fullName ci planType planCost active');

        legacySample.forEach(m => {
            const status = m.active ? '✅' : '❌';
            console.log(`   ${status} ${m.fullName} | ${m.planType} - $${m.planCost}`);
        });
        console.log('');

        console.log('📋 Sample of SEED data (will be DELETED):');
        const seedSample = await Member.find({
            tenantId: { $exists: true, $ne: null }
        }).limit(5).select('fullName ci planType planCost active tenantId');

        seedSample.forEach(m => {
            const status = m.active ? 'Active' : 'Inactive';
            console.log(`   ❌ ${m.fullName} | ${m.planType} - $${m.planCost} (${status})`);
        });
        console.log('');

        // Count related seed data to delete
        const seedMemberIds = await Member.find({
            tenantId: { $exists: true, $ne: null }
        }).distinct('_id');

        const seedPayments = await Payment.countDocuments({
            tenantId: { $exists: true, $ne: null }
        });

        const seedExpenses = await Expense.countDocuments({
            tenantId: { $exists: true, $ne: null }
        });

        const seedDebts = await Debt.countDocuments({
            tenantId: { $exists: true, $ne: null }
        });

        const seedProducts = await Product.countDocuments({
            tenantId: { $exists: true, $ne: null }
        });

        console.log('📊 Seed data to be deleted:');
        console.log(`   ❌ Members: ${seedMembers}`);
        console.log(`   ❌ Payments: ${seedPayments}`);
        console.log(`   ❌ Expenses: ${seedExpenses}`);
        console.log(`   ❌ Debts: ${seedDebts}`);
        console.log(`   ❌ Products: ${seedProducts}`);
        console.log('');

        // 4. SUMMARY
        console.log('📝 CLEANUP SUMMARY');
        console.log('=====================================');
        console.log(`Will DELETE (all data WITH tenantId):`);
        console.log(`   ❌ ${seedMembers} members`);
        console.log(`   ❌ ${seedPayments} payments`);
        console.log(`   ❌ ${seedExpenses} expenses`);
        console.log(`   ❌ ${seedDebts} debts`);
        console.log(`   ❌ ${seedProducts} products`);
        console.log('');
        console.log(`Will KEEP (all legacy data WITHOUT tenantId):`);
        console.log(`   ✅ ${legacyMembers} members (${legacyActiveMembers} active)`);
        console.log('');

        // 5. EXECUTION OR DRY RUN
        if (isDryRun) {
            console.log('🔍 DRY RUN COMPLETE - No data was deleted');
            console.log('To execute the cleanup, run without --dry-run flag:');
            console.log(`   node cleanup_legacy_data.js`);
            console.log('');
            process.exit(0);
        } else {
            console.log('⚠️  ⚠️  ⚠️  WARNING ⚠️  ⚠️  ⚠️');
            console.log('This will PERMANENTLY DELETE all data WITH tenantId from PRODUCTION!');
            console.log('Your legacy data (without tenantId) will be PRESERVED.');
            console.log('');
            console.log('Type "DELETE SEED DATA" to confirm (case-sensitive):');
            console.log('Or press Ctrl+C to cancel...');
            console.log('');

            // Wait for user confirmation
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            readline.question('Confirmation: ', async (answer) => {
                if (answer === 'DELETE SEED DATA') {
                    console.log('\n🗑️  EXECUTING CLEANUP...\n');

                    // Delete all data WITH tenantId
                    const deletedDebts = await Debt.deleteMany({
                        tenantId: { $exists: true, $ne: null }
                    });
                    console.log(`✅ Deleted ${deletedDebts.deletedCount} seed debts`);

                    const deletedPayments = await Payment.deleteMany({
                        tenantId: { $exists: true, $ne: null }
                    });
                    console.log(`✅ Deleted ${deletedPayments.deletedCount} seed payments`);

                    const deletedExpenses = await Expense.deleteMany({
                        tenantId: { $exists: true, $ne: null }
                    });
                    console.log(`✅ Deleted ${deletedExpenses.deletedCount} seed expenses`);

                    const deletedProducts = await Product.deleteMany({
                        tenantId: { $exists: true, $ne: null }
                    });
                    console.log(`✅ Deleted ${deletedProducts.deletedCount} seed products`);

                    const deletedMembers = await Member.deleteMany({
                        tenantId: { $exists: true, $ne: null }
                    });
                    console.log(`✅ Deleted ${deletedMembers.deletedCount} seed members`);

                    console.log('\n✅ CLEANUP COMPLETE!');

                    // Final verification
                    const remainingMembers = await Member.countDocuments({
                        $or: [
                            { tenantId: null },
                            { tenantId: { $exists: false } }
                        ]
                    });
                    const remainingActive = await Member.countDocuments({
                        $or: [
                            { tenantId: null },
                            { tenantId: { $exists: false } }
                        ],
                        active: true
                    });
                    console.log('\n📊 FINAL STATE (Legacy Data):');
                    console.log(`   Total Members: ${remainingMembers}`);
                    console.log(`   Active Members: ${remainingActive}`);
                    console.log('');

                    readline.close();
                    process.exit(0);
                } else {
                    console.log('\n❌ Confirmation not received. Aborting cleanup.');
                    console.log('   No data was deleted.\n');
                    readline.close();
                    process.exit(0);
                }
            });
        }

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

cleanupLegacyData();
