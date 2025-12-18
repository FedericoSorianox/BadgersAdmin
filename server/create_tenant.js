const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Tenant = require('./models/Tenant');

// Load env
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: path.resolve(__dirname, '.env.development') });
} else {
    dotenv.config();
}

const createTenant = async () => {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    // Get args
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: node create_tenant.js <name> <slug> [primaryColor] [secondaryColor]');
        console.log('Example: node create_tenant.js "Gimnasio A" "gym-a" "#ff0000" "#000000"');
        process.exit(1);
    }

    const [name, slug, primaryColor, secondaryColor] = args;

    try {
        const newTenant = new Tenant({
            name,
            slug,
            branding: {
                primaryColor: primaryColor || '#3498db',
                secondaryColor: secondaryColor || '#2c3e50'
            }
        });

        await newTenant.save();
        console.log('✅ Tenant created successfully:');
        console.log(newTenant);
    } catch (error) {
        console.error('❌ Error creating tenant:', error.message);
    } finally {
        await mongoose.disconnect();
    }
};

createTenant();
