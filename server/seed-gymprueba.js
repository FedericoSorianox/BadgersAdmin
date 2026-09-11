require('dotenv').config();
const mongoose = require('mongoose');

// Models
const Tenant   = require('./models/Tenant');
const Member   = require('./models/Member');
const Product  = require('./models/Product');
const Payment  = require('./models/Payment');
const Expense  = require('./models/Expense');
const Debt     = require('./models/Debt');

const DEMO_MEMBERS = [
    { ci: '11111111', fullName: 'Carlos Sánchez',  phone: '099111111', planType: 'Musculación',  planCost: 2500, active: true },
    { ci: '22222222', fullName: 'Laura Gomez',   phone: '099222222', planType: 'Libre',        planCost: 3000, active: true },
    { ci: '33333333', fullName: 'Andrés López',     phone: '099333333', planType: 'Musculación',  planCost: 2500, active: true },
    { ci: '44444444', fullName: 'María Rodriguez',    phone: '099444444', planType: 'CrossFit',     planCost: 3500, active: true },
    { ci: '55555555', fullName: 'Martín Pérez',       phone: '099555555', planType: 'Libre',        planCost: 3000, active: true },
    { ci: '66666666', fullName: 'Sofía Martínez',    phone: '099666666', planType: 'Musculación',  planCost: 2500, active: true },
    { ci: '77777777', fullName: 'Juan Díaz',       phone: '099777777', planType: 'Libre',        planCost: 3000, active: false },
    { ci: '88888888', fullName: 'Ana González',  phone: '099888888', planType: 'CrossFit',     planCost: 3500, active: true },
    { ci: '99999999', fullName: 'Tomás Sánchez',      phone: '099999999', planType: 'Musculación',  planCost: 2500, active: true },
    { ci: '10101010', fullName: 'Lucía Ramírez',      phone: '099101010', planType: 'Libre',        planCost: 3000, active: true },
];

const DEMO_PRODUCTS = [
    { name: 'Proteína Whey 1kg',       costPrice: 1200, salePrice: 1800, stock: 8,  category: 'Suplementos', isQuickAccess: true },
    { name: 'Creatina 300g',           costPrice: 600,  salePrice: 950,  stock: 12, category: 'Suplementos', isQuickAccess: true },
    { name: 'Remera Entrenamiento',      costPrice: 350,  salePrice: 700,  stock: 15, category: 'Ropa' },
    { name: 'Agua Salus 500ml',      costPrice: 25,   salePrice: 60,   stock: 50, category: 'Bebidas', isQuickAccess: true },
    { name: 'Barra Cereal',       costPrice: 60,   salePrice: 120,  stock: 30, category: 'Snacks', isQuickAccess: true },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB.");

        const tenant = await Tenant.findOne({ slug: 'gymprueba' });
        if (!tenant) {
            console.log("Tenant gymprueba no encontrado.");
            process.exit(1);
        }
        
        const tenantId = tenant._id;
        console.log(`Poblando datos para tenant: ${tenant.name} (${tenantId})`);

        // Clean previous dummy data for this tenant just in case
        console.log("Limpiando datos viejos...");
        await Member.deleteMany({ tenantId });
        await Product.deleteMany({ tenantId });
        await Payment.deleteMany({ tenantId });
        await Expense.deleteMany({ tenantId });
        await Debt.deleteMany({ tenantId });

        console.log("Creando Miembros...");
        const memberDocs = await Member.insertMany(DEMO_MEMBERS.map(m => ({ ...m, tenantId })));
        
        console.log("Creando Productos...");
        const productDocs = await Product.insertMany(DEMO_PRODUCTS.map(p => ({ ...p, tenantId })));

        console.log("Creando Pagos...");
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const payments = [];
        // Active members pay cuota
        memberDocs.filter(m => m.active).forEach(m => {
            payments.push({
                memberId: m._id,
                memberName: m.fullName,
                memberCi: m.ci,
                month, year,
                amount: m.planCost,
                type: 'Cuota',
                paymentMethod: Math.random() > 0.5 ? 'Efectivo' : 'Digital',
                date: new Date(year, month - 1, Math.floor(Math.random() * 15) + 1),
                tenantId
            });
        });

        // Some product sales
        const agua = productDocs.find(p => p.name.includes('Agua'));
        const barra = productDocs.find(p => p.name.includes('Barra'));
        if (agua) payments.push({ memberId: memberDocs[0]._id, memberName: memberDocs[0].fullName, memberCi: memberDocs[0].ci, productName: agua.name, productId: agua._id, month, year, amount: agua.salePrice * 2, type: 'Venta', quantity: 2, paymentMethod: 'Efectivo', date: new Date(year, month - 1, 5), tenantId });
        if (barra) payments.push({ memberId: memberDocs[1]._id, memberName: memberDocs[1].fullName, memberCi: memberDocs[1].ci, productName: barra.name, productId: barra._id, month, year, amount: barra.salePrice, type: 'Venta', quantity: 1, paymentMethod: 'Digital', date: new Date(year, month - 1, 8), tenantId });

        await Payment.insertMany(payments);

        console.log("Creando Gastos...");
        const expenses = [
            { concept: 'Alquiler',          amount: 25000, category: 'Alquiler',   paymentMethod: 'Digital',   date: new Date(year, month - 1, 2), tenantId },
            { concept: 'Electricidad',             amount: 4500,  category: 'Servicios',  paymentMethod: 'Digital',   date: new Date(year, month - 1, 5), tenantId },
            { concept: 'Limpieza', amount: 2000,  category: 'Mantenimiento', paymentMethod: 'Efectivo',  date: new Date(year, month - 1, 10), tenantId },
        ];
        await Expense.insertMany(expenses);

        console.log("Creando Fiados...");
        if (agua) {
            const debts = [
                {
                    memberId: memberDocs[2]._id,
                    memberName: memberDocs[2].fullName,
                    products: [
                        { productId: agua._id, productName: agua.name, quantity: 2, amount: agua.salePrice },
                    ],
                    totalAmount: agua.salePrice * 2,
                    status: 'pending',
                    date: new Date(year, month - 1, 15),
                    tenantId
                }
            ];
            await Debt.insertMany(debts);
        }

        console.log("¡Datos ficticios creados correctamente!");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        mongoose.disconnect();
    }
}

seed();
