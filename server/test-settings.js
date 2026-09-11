require('dotenv').config();
const mongoose = require('mongoose');
const { tenantStorage } = require('./utils/tenantContext');
const Settings = require('./models/Settings');
const Tenant = require('./models/Tenant');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const tenant = await Tenant.findOne();
    if (!tenant) {
        console.log("No tenant found");
        process.exit(1);
    }
    console.log("Testing with tenant ID:", tenant._id);

    tenantStorage.run(new Map([['tenantId', tenant._id]]), async () => {
        try {
            console.log("tenantId in store:", tenantStorage.getStore().get('tenantId'));
            
            let settings = await Settings.findOne({ key: 'admin_config' });
            console.log("Found settings?", !!settings);

            if (!settings) {
                console.log("Creating new settings...");
                settings = new Settings({
                    partners: [],
                    partnerHourlyRate: 1000,
                    instructors: [],
                    instructorHourlyRate: 500,
                    savingsPercentage: 10,
                    tasks: []
                });
                
                await settings.save();
                console.log("Settings created successfully!");
            }
            
            console.log("All good.");
        } catch (e) {
            console.error("Error occurred:", e);
        } finally {
            mongoose.disconnect();
        }
    });
}
test();
