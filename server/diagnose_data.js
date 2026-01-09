const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Member = require('./models/Member');
const Tenant = require('./models/Tenant');

console.log('🔍 DIAGNOSTIC SCRIPT - Analyzing Production Data');
console.log('=====================================\n');

const diagnose = async () => {
    try {
        console.log('📡 Connecting to:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected!\n');

        // List all tenants
        const tenants = await Tenant.find({});
        console.log('📋 Available Tenants:');
        tenants.forEach((t, i) => {
            console.log(`   ${i + 1}. ${t.name} (slug: ${t.slug}, id: ${t._id})`);
        });
        console.log('');

        // For each tenant, show member stats
        for (const tenant of tenants) {
            console.log(`\n═══════════════════════════════════════`);
            console.log(`📊 TENANT: ${tenant.name}`);
            console.log(`═══════════════════════════════════════`);

            const totalMembers = await Member.countDocuments({ tenantId: tenant._id });
            const activeMembers = await Member.countDocuments({ tenantId: tenant._id, active: true });

            console.log(`Total Members: ${totalMembers}`);
            console.log(`Active Members: ${activeMembers}\n`);

            // Get all unique plan types and costs
            const planStats = await Member.aggregate([
                { $match: { tenantId: tenant._id } },
                {
                    $group: {
                        _id: { planType: '$planType', planCost: '$planCost' },
                        count: { $sum: 1 },
                        activeCount: {
                            $sum: { $cond: ['$active', 1, 0] }
                        }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            console.log('📈 Members by Plan Type:');
            planStats.forEach(plan => {
                const planType = plan._id.planType || 'null';
                const planCost = plan._id.planCost || 'null';
                console.log(`   ${planType} - $${planCost}: ${plan.count} total (${plan.activeCount} active)`);
            });

            // Show sample members
            console.log('\n📋 Sample Members (first 10):');
            const sampleMembers = await Member.find({ tenantId: tenant._id })
                .limit(10)
                .select('fullName ci planType planCost active');

            sampleMembers.forEach(m => {
                const status = m.active ? '✅' : '❌';
                console.log(`   ${status} ${m.fullName} | CI: ${m.ci} | ${m.planType} - $${m.planCost}`);
            });

            // Check for members WITHOUT "Libre" or without 2000 cost
            const incorrectMembers = await Member.find({
                tenantId: tenant._id,
                $or: [
                    { planType: { $ne: 'Libre' } },
                    { planCost: { $ne: 2000 } }
                ]
            }).limit(10);

            if (incorrectMembers.length > 0) {
                console.log(`\n⚠️  Members that DON'T match "Libre - $2000" (showing first 10):`);
                incorrectMembers.forEach(m => {
                    const status = m.active ? 'Active' : 'Inactive';
                    console.log(`   - ${m.fullName} | ${m.planType} - $${m.planCost} (${status})`);
                });
            }

            // Check for exact matches
            const correctMembers = await Member.countDocuments({
                tenantId: tenant._id,
                planType: 'Libre',
                planCost: 2000
            });
            console.log(`\n✅ Members with EXACT "Libre - $2000": ${correctMembers}`);
        }

        console.log('\n\n🔍 DIAGNOSIS COMPLETE!\n');
        process.exit(0);

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

diagnose();
