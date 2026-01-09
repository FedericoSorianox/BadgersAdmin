const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Member = require('./models/Member');
const Product = require('./models/Product');
const Payment = require('./models/Payment');
const Expense = require('./models/Expense');
const Debt = require('./models/Debt');
const Tenant = require('./models/Tenant');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const tenantName = args.find(arg => arg.startsWith('--tenant='))?.split('=')[1];

console.log('🧹 PRODUCTION DATA CLEANUP SCRIPT');
console.log('=====================================');
console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (Preview Only)' : '⚠️  LIVE EXECUTION'}`);
console.log(`Database: ${process.env.MONGODB_URI}`);
console.log('');

const cleanupProduction = async () => {
    try {
        // 1. CONNECT TO DATABASE
        console.log('📡 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected!\n');

        // 2. IDENTIFY TENANT
        let tenant;
        if (tenantName) {
            tenant = await Tenant.findOne({
                $or: [
                    { name: { $regex: new RegExp(tenantName, 'i') } },
                    { slug: tenantName }
                ]
            });
        } else {
            // List all tenants for user to choose
            const tenants = await Tenant.find({});
            console.log('📋 Available tenants:');
            tenants.forEach((t, i) => {
                console.log(`   ${i + 1}. ${t.name} (slug: ${t.slug})`);
            });
            console.log('\n⚠️  Please run script with --tenant=<name or slug>');
            console.log('   Example: node cleanup_production.js --tenant="Badgers"\n');
            process.exit(0);
        }

        if (!tenant) {
            console.error(`❌ Tenant "${tenantName}" not found!`);
            process.exit(1);
        }

        console.log(`🎯 Target Tenant: ${tenant.name} (${tenant._id})`);
        console.log('');

        const tenantId = tenant._id;

        // 3. ANALYZE CURRENT STATE
        console.log('📊 CURRENT STATE ANALYSIS');
        console.log('=====================================');

        const totalMembers = await Member.countDocuments({ tenantId });
        const activeMembers = await Member.countDocuments({ tenantId, active: true });
        const correctMembers = await Member.countDocuments({
            tenantId,
            planType: 'Libre',
            planCost: 2000
        });
        const incorrectMembers = await Member.countDocuments({
            tenantId,
            $or: [
                { planType: { $ne: 'Libre' } },
                { planCost: { $ne: 2000 } }
            ]
        });

        console.log(`Total Members: ${totalMembers}`);
        console.log(`Active Members: ${activeMembers}`);
        console.log(`✅ Correct Members (Libre - $2000): ${correctMembers}`);
        console.log(`❌ Incorrect Members (to be deleted): ${incorrectMembers}`);
        console.log('');

        // 4. IDENTIFY DATA TO DELETE
        console.log('🔍 IDENTIFYING DATA TO DELETE');
        console.log('=====================================');

        // Find members that don't match the correct plan
        const membersToDelete = await Member.find({
            tenantId,
            $or: [
                { planType: { $ne: 'Libre' } },
                { planCost: { $ne: 2000 } }
            ]
        }).limit(10); // Show first 10 as sample

        const memberIdsToDelete = await Member.find({
            tenantId,
            $or: [
                { planType: { $ne: 'Libre' } },
                { planCost: { $ne: 2000 } }
            ]
        }).distinct('_id');

        console.log(`\n📋 Sample of members to be deleted (showing first 10 of ${incorrectMembers}):`);
        membersToDelete.forEach(m => {
            console.log(`   - ${m.fullName} | CI: ${m.ci} | Plan: ${m.planType} - $${m.planCost}`);
        });
        console.log('');

        // Count related data
        const paymentsToDelete = await Payment.countDocuments({
            tenantId,
            memberId: { $in: memberIdsToDelete }
        });

        const debtsToDelete = await Debt.countDocuments({
            tenantId,
            memberId: { $in: memberIdsToDelete }
        });

        // Also look for seed-specific expenses (the fixed ones from seed files)
        const seedExpenses = await Expense.countDocuments({
            tenantId,
            $or: [
                { concept: 'Alquiler Local', amount: 15000 },
                { concept: 'Internet', amount: 1500 }
            ]
        });

        console.log('📊 Related data to be deleted:');
        console.log(`   - Payments: ${paymentsToDelete}`);
        console.log(`   - Debts: ${debtsToDelete}`);
        console.log(`   - Seed Expenses (Alquiler 15000, Internet 1500): ${seedExpenses}`);
        console.log('');

        // 5. SUMMARY
        console.log('📝 CLEANUP SUMMARY');
        console.log('=====================================');
        console.log(`Will DELETE:`);
        console.log(`   ❌ ${incorrectMembers} members (not Libre - $2000)`);
        console.log(`   ❌ ${paymentsToDelete} payments (linked to incorrect members)`);
        console.log(`   ❌ ${debtsToDelete} debts (linked to incorrect members)`);
        console.log(`   ❌ ${seedExpenses} seed expenses`);
        console.log('');
        console.log(`Will KEEP:`);
        console.log(`   ✅ ${correctMembers} members (Libre - $2000)`);
        console.log('');

        // 6. EXECUTION OR DRY RUN
        if (isDryRun) {
            console.log('🔍 DRY RUN COMPLETE - No data was deleted');
            console.log('To execute the cleanup, run without --dry-run flag:');
            console.log(`   node cleanup_production.js --tenant="${tenant.name}"`);
            console.log('');
        } else {
            console.log('⚠️  ⚠️  ⚠️  WARNING ⚠️  ⚠️  ⚠️');
            console.log('This will PERMANENTLY DELETE data from PRODUCTION!');
            console.log('');
            console.log('Type "DELETE PRODUCTION DATA" to confirm (case-sensitive):');
            console.log('Or press Ctrl+C to cancel...');
            console.log('');

            // Wait for user confirmation
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            readline.question('Confirmation: ', async (answer) => {
                if (answer === 'DELETE PRODUCTION DATA') {
                    console.log('\n🗑️  EXECUTING CLEANUP...\n');

                    // Delete in order: debts, payments, expenses, then members
                    const deletedDebts = await Debt.deleteMany({
                        tenantId,
                        memberId: { $in: memberIdsToDelete }
                    });
                    console.log(`✅ Deleted ${deletedDebts.deletedCount} debts`);

                    const deletedPayments = await Payment.deleteMany({
                        tenantId,
                        memberId: { $in: memberIdsToDelete }
                    });
                    console.log(`✅ Deleted ${deletedPayments.deletedCount} payments`);

                    const deletedExpenses = await Expense.deleteMany({
                        tenantId,
                        $or: [
                            { concept: 'Alquiler Local', amount: 15000 },
                            { concept: 'Internet', amount: 1500 }
                        ]
                    });
                    console.log(`✅ Deleted ${deletedExpenses.deletedCount} seed expenses`);

                    const deletedMembers = await Member.deleteMany({
                        tenantId,
                        $or: [
                            { planType: { $ne: 'Libre' } },
                            { planCost: { $ne: 2000 } }
                        ]
                    });
                    console.log(`✅ Deleted ${deletedMembers.deletedCount} members`);

                    console.log('\n✅ CLEANUP COMPLETE!');

                    // Final verification
                    const remainingMembers = await Member.countDocuments({ tenantId });
                    const remainingActive = await Member.countDocuments({ tenantId, active: true });
                    console.log('\n📊 FINAL STATE:');
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

        if (isDryRun) {
            process.exit(0);
        }

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

cleanupProduction();
