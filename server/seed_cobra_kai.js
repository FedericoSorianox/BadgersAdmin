const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Member = require('./models/Member');
const Product = require('./models/Product');
const Payment = require('./models/Payment');
const Expense = require('./models/Expense');
const Debt = require('./models/Debt');
const Tenant = require('./models/Tenant');

// --- DATA GENERATORS (Copied from seed_dev.js) ---

const firstNames = ['Juan', 'Maria', 'Pedro', 'Lucia', 'Carlos', 'Ana', 'Luis', 'Sofia', 'Miguel', 'Valentina', 'Jose', 'Camila', 'David', 'Florencia', 'Jorge', 'Agustina', 'Fernando', 'Martina', 'Ricardo', 'Victoria'];
const lastNames = ['Silva', 'Gonzalez', 'Rodriguez', 'Lopez', 'Martinez', 'Garcia', 'Perez', 'Sanchez', 'Romero', 'Sosa', 'Torres', 'Alvarez', 'Ruiz', 'Ramirez', 'Flores', 'Benitez', 'Acosta', 'Medina', 'Herrera', 'Pereira'];

const plans = [
    { type: 'Libre', cost: 2000 },
    { type: '8 Clases', cost: 1600 },
    { type: '12 Clases', cost: 1800 },
    { type: 'Pase Diario', cost: 300 }
];

const productCategories = ['Equipamiento', 'Indumentaria', 'Bebidas', 'Suplementos', 'Accesorios'];

const expenseConcepts = ['Alquiler Local', 'Luz', 'Agua', 'Internet', 'Limpieza', 'Mantenimiento Equipos', 'Publicidad', 'Articulos Oficina'];

// --- HELPERS ---

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const generatePhone = () => `09${getRandomInt(1, 9)}${getRandomInt(100000, 999999)}`;
const generateCI = () => `${getRandomInt(1, 5)}.${getRandomInt(100, 999)}.${getRandomInt(100, 999)}-${getRandomInt(0, 9)}`;

// --- SEED LOGIC ---

const seedData = async () => {
    try {
        console.log('Connecting to: ' + process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);

        console.log('Searching for Tenant "Cobra Kai"...');
        const tenant = await Tenant.findOne({ name: { $regex: /cobra kai/i } });

        if (!tenant) {
            console.error('❌ Tenant "Cobra Kai" not found! Please ensure it exists.');
            process.exit(1);
        }

        console.log(`✅ Found Tenant: ${tenant.name} (${tenant._id})`);
        const tenantId = tenant._id;

        // 1. CLEAR DATABASE FOR THIS TENANT ONLY
        console.log(`⚠️  Clearing existing data for tenant ${tenant.name}...`);
        await Promise.all([
            Member.deleteMany({ tenantId }),
            Product.deleteMany({ tenantId }),
            Payment.deleteMany({ tenantId }),
            Expense.deleteMany({ tenantId }),
            Debt.deleteMany({ tenantId })
        ]);
        console.log('Cleaned up tenant data.');

        // 2. CREATE MEMBERS
        console.log('Generating Members...');
        const members = [];
        for (let i = 0; i < 50; i++) {
            const plan = getRandomElement(plans);
            const member = new Member({
                tenantId: tenantId, // ! IMPORTANT
                ci: generateCI(),
                fullName: `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`,
                phone: generatePhone(),
                birthDate: getRandomDate(new Date(1980, 0, 1), new Date(2005, 0, 1)),
                planType: plan.type,
                planCost: plan.cost,
                active: Math.random() > 0.2, // 80% active
                createdAt: getRandomDate(new Date(2025, 0, 1), new Date())
            });
            members.push(member);
        }
        const savedMembers = await Member.insertMany(members);
        console.log(`Created ${savedMembers.length} members for ${tenant.name}.`);

        // 3. CREATE PRODUCTS
        console.log('Generating Products...');
        const products = [];
        const productNames = [
            'Guantes Boxeo Pro', 'Vendas 5m', 'Protector Bucal', 'Canilleras', 'Cabezal',
            'Remera Dojo', 'Short MMA', 'Rashguard', 'Gorra', 'Musculosa',
            'Agua Mineral', 'Gatorade', 'Proteina Whey', 'Creatina', 'Pre-Workout',
            'Cinta Tape', 'Tobillera', 'Rodillera', 'Bolso Deportivo', 'Toalla'
        ];

        for (const name of productNames) {
            const cost = getRandomInt(200, 2000);
            products.push({
                tenantId: tenantId, // ! IMPORTANT
                name: `${name}`,
                costPrice: cost,
                salePrice: Math.floor(cost * 1.5),
                stock: getRandomInt(0, 50),
                category: getRandomElement(productCategories),
                imageUrl: ''
            });
        }
        const savedProducts = await Product.insertMany(products);
        console.log(`Created ${savedProducts.length} products for ${tenant.name}.`);

        // 4. GENERATE HISTORY (Last 6 Months)
        console.log('Generating Financial History...');
        const today = new Date();
        const payments = [];
        const expenses = [];
        const activeMembers = savedMembers.filter(m => m.active);

        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const month = monthDate.getMonth() + 1; // 1-12
            const year = monthDate.getFullYear();

            // A. Monthly Quotas (Income)
            for (const member of activeMembers) {
                // Not everyone pays perfectly on time, add variability
                if (Math.random() > 0.1) {
                    payments.push({
                        tenantId: tenantId, // ! IMPORTANT
                        memberId: member._id,
                        memberName: member.fullName,
                        memberCi: member.ci,
                        month: month,
                        year: year,
                        amount: member.planCost,
                        type: 'Cuota',
                        date: getRandomDate(monthDate, new Date(year, month, 0)) // Random day in month
                    });
                }
            }

            // B. Product Sales (Income)
            const numSales = getRandomInt(10, 30);
            for (let j = 0; j < numSales; j++) {
                const product = getRandomElement(savedProducts);
                const buyer = getRandomElement(savedMembers);
                payments.push({
                    tenantId: tenantId, // ! IMPORTANT
                    memberId: buyer._id,
                    memberName: buyer.fullName,
                    memberCi: buyer.ci,
                    productName: product.name,
                    month: month,
                    year: year,
                    amount: product.salePrice,
                    type: 'Venta',
                    productId: product._id,
                    quantity: 1,
                    date: getRandomDate(monthDate, new Date(year, month, 0))
                });
            }

            // C. Expenses (Outcome)
            // Fixed
            expenses.push({
                tenantId: tenantId, // ! IMPORTANT
                concept: 'Alquiler Local',
                amount: 15000,
                category: 'Alquiler Local',
                date: new Date(year, month - 1, 5)
            });
            expenses.push({
                tenantId: tenantId, // ! IMPORTANT
                concept: 'Internet',
                amount: 1500,
                category: 'Internet',
                date: new Date(year, month - 1, 10)
            });

            // Variable
            const numExpenses = getRandomInt(3, 8);
            for (let k = 0; k < numExpenses; k++) {
                expenses.push({
                    tenantId: tenantId, // ! IMPORTANT
                    concept: getRandomElement(expenseConcepts),
                    amount: getRandomInt(500, 5000),
                    category: 'Otros',
                    date: getRandomDate(monthDate, new Date(year, month, 0))
                });
            }
        }
        await Payment.insertMany(payments);
        await Expense.insertMany(expenses);
        console.log(`Created ${payments.length} payments and ${expenses.length} expenses for ${tenant.name}.`);

        // 5. CREATE DEBTS
        console.log('Generating Debts...');
        const debts = [];
        const debtMembers = savedMembers.filter(() => Math.random() > 0.85); // 15% have debts

        for (const member of debtMembers) {
            const product = getRandomElement(savedProducts);
            debts.push({
                tenantId: tenantId, // ! IMPORTANT
                memberId: member._id,
                memberName: member.fullName,
                products: [{
                    productId: product._id,
                    productName: product.name,
                    quantity: 1,
                    amount: product.salePrice
                }],
                totalAmount: product.salePrice,
                status: 'pending',
                date: getRandomDate(new Date(today.getFullYear(), today.getMonth() - 2, 1), today)
            });
        }
        await Debt.insertMany(debts);
        console.log(`Created ${debts.length} debts for ${tenant.name}.`);

        console.log(`✅ SEEDING COMPLETE FOR TENANT: ${tenant.name} 🚀`);
        process.exit(0);

    } catch (err) {
        console.error('Seeding Error:', err);
        process.exit(1);
    }
};

seedData();
