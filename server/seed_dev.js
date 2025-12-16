require('dotenv').config({ path: '.env.development' });
const mongoose = require('mongoose');
const Member = require('./models/Member');
const Product = require('./models/Product');
const Payment = require('./models/Payment'); // Assuming this exists or Transaction
// If 'Payment' isn't the transaction model, I'll check 'Finance' or similar in routes.
// Based on file list, there is a Payment.js and Expense.js.
// And 'routes/finance.js'.

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to ' + process.env.MONGODB_URI);

        // Clear existing dev data
        await Member.deleteMany({});
        await Product.deleteMany({});
        // Add other clear actions if needed

        console.log('Cleared Dev Database');

        // Create Members
        const members = await Member.insertMany([
            {
                ci: '11111111',
                fullName: 'Juan Perez (Dev)',
                phone: '099123456',
                planType: 'Libre',
                planCost: 2000,
                active: true,
                createdAt: new Date()
            },
            {
                ci: '22222222',
                fullName: 'Maria Garcia (Dev - Pending)',
                phone: '098654321',
                planType: '3 Clases',
                planCost: 1500,
                active: false,
                createdAt: new Date()
            },
            {
                ci: '33333333',
                fullName: 'Carlos Lopez (Dev)',
                phone: '091234567',
                planType: 'Libre',
                planCost: 2000,
                active: true,
                createdAt: new Date()
            }
        ]);
        console.log('Seeded Members');

        // Create Products
        await Product.insertMany([
            {
                name: 'Guantes de Boxeo (Dev)',
                costPrice: 1000,
                salePrice: 2500,
                stock: 10,
                category: 'Equipamiento',
                createdAt: new Date()
            },
            {
                name: 'Vendas (Dev)',
                costPrice: 200,
                salePrice: 500,
                stock: 50,
                category: 'Accesorios',
                createdAt: new Date()
            },
            {
                name: 'Remera Gimnasio (Dev)',
                costPrice: 600,
                salePrice: 1200,
                stock: 20,
                category: 'Indumentaria',
                createdAt: new Date()
            }
        ]);
        console.log('Seeded Products');

        console.log('Seeding Complete');
        process.exit(0);
    } catch (err) {
        console.error('Seeding Error:', err);
        process.exit(1);
    }
};

seedData();
