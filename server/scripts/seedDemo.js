#!/usr/bin/env node
/**
 * seedDemo.js — Crea un gimnasio ficticio "Iron Temple Demo" con datos realistas.
 *
 * SEGURIDAD: Solo funciona contra bases de datos locales (localhost / 127.0.0.1).
 *            Nunca ejecutar contra producción. Para prod, usar el panel SuperAdmin.
 *
 * Uso:   node scripts/seedDemo.js
 * Reset: node scripts/seedDemo.js --reset   (borra y recrea todo el demo)
 */

const path = require('path');
const dotenv = require('dotenv');

// Load dev env
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const Tenant   = require('../models/Tenant');
const User     = require('../models/User');
const Member   = require('../models/Member');
const Product  = require('../models/Product');
const Payment  = require('../models/Payment');
const Expense  = require('../models/Expense');
const Debt     = require('../models/Debt');
const Settings = require('../models/Settings');

// ──────────────────────────────────────────────────────────────────────────────
// Safety: Block production database
// ──────────────────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/BadgersAdminDev';

// Block if pointing at the production database (BadgersAdmin without "Dev" suffix)
const isProd = MONGO_URI.includes('/BadgersAdmin?') || MONGO_URI.endsWith('/BadgersAdmin');
if (isProd) {
    console.error('❌ SEGURIDAD: Este script NO puede ejecutarse contra la base de PRODUCCIÓN.');
    console.error('   URI detectada apunta a "BadgersAdmin" (producción).');
    console.error('   Para crear un demo en producción, usá el panel SuperAdmin en gymworkspro.com/superadmin');
    process.exit(1);
}

const DEMO_SLUG = 'demo';
const DEMO_ADMIN_USER = 'admin';
const DEMO_ADMIN_PASS = 'demo1234';
const isReset = process.argv.includes('--reset');

// ──────────────────────────────────────────────────────────────────────────────
// Fictional Data — 100% inventado, ningún dato real
// ──────────────────────────────────────────────────────────────────────────────

const DEMO_TENANT = {
    name: 'Iron Temple Demo',
    slug: DEMO_SLUG,
    branding: {
        primaryColor: '#B8860B',      // Dark Goldenrod
        secondaryColor: '#1a1a2e',    // Deep navy
        logoUrl: '',                   // Will use default
        sidebarText: 'Iron Temple',
        textColor: '#FFD700',          // Gold text
        menuHoverColor: '#DAA520',
        menuActiveColor: '#B8860B',
        dashboardTitleColor: '#FFD700'
    },
    locale: {
        country: 'UY',
        currency: 'UYU',
        currencySymbol: '$',
        locale: 'es-UY',
        timezone: 'America/Montevideo',
        phonePrefix: '598'
    },
    notifications: {
        webhookUrl: '',  // No real webhook for demo
        paymentReminderTemplate: 'Hola {name}, te recordamos que tenés pendiente de pago en Iron Temple. Consultá tu estado aquí: {link}',
        fiadoReminderTemplate: 'Hola {name}, tenés consumos pendientes en Iron Temple. Detalle aquí: {link}'
    },
    partners: [
        { name: 'Carlos', percentage: 60 },
        { name: 'Marina', percentage: 40 }
    ],
    instructorHourlyRate: 600,
    lowStockThreshold: 3
};

const DEMO_MEMBERS = [
    { ci: '10000001', fullName: 'Martín Rodríguez',  phone: '59899100001', planType: 'Musculación',  planCost: 2500, active: true },
    { ci: '10000002', fullName: 'Lucía Fernández',   phone: '59899100002', planType: 'Libre',        planCost: 3000, active: true },
    { ci: '10000003', fullName: 'Santiago Pérez',     phone: '59899100003', planType: 'Musculación',  planCost: 2500, active: true },
    { ci: '10000004', fullName: 'Valentina López',    phone: '59899100004', planType: 'CrossFit',     planCost: 3500, active: true },
    { ci: '10000005', fullName: 'Mateo García',       phone: '59899100005', planType: 'Libre',        planCost: 3000, active: true },
    { ci: '10000006', fullName: 'Camila Martínez',    phone: '59899100006', planType: 'Musculación',  planCost: 2500, active: true },
    { ci: '10000007', fullName: 'Joaquín Díaz',       phone: '59899100007', planType: 'Libre',        planCost: 3000, active: false },
    { ci: '10000008', fullName: 'Isabella González',  phone: '59899100008', planType: 'CrossFit',     planCost: 3500, active: true },
    { ci: '10000009', fullName: 'Tomás Sánchez',      phone: '59899100009', planType: 'Musculación',  planCost: 2500, active: true },
    { ci: '10000010', fullName: 'Sofía Ramírez',      phone: '59899100010', planType: 'Libre',        planCost: 3000, active: true },
    { ci: '10000011', fullName: 'Benjamín Torres',    phone: '59899100011', planType: 'Musculación',  planCost: 2500, active: true },
    { ci: '10000012', fullName: 'Emma Flores',        phone: '59899100012', planType: 'CrossFit',     planCost: 3500, active: true },
    // Family group: head + dependent
    { ci: '10000013', fullName: 'Diego Vargas',       phone: '59899100013', planType: 'Familiar',     planCost: 4000, active: true, isFamilyHead: true },
    { ci: '10000014', fullName: 'Ana Vargas',         phone: '59899100014', planType: 'Familiar',     planCost: 0,    active: true }, // Dependent, linked below
    { ci: '10000015', fullName: 'Lucas Medina',       phone: '59899100015', planType: 'Musculación',  planCost: 2500, active: true, isExempt: true },
];

const DEMO_PRODUCTS = [
    { name: 'Proteína Whey 1kg',       costPrice: 1200, salePrice: 1800, stock: 8,  category: 'Suplementos', isQuickAccess: true },
    { name: 'Creatina 300g',           costPrice: 600,  salePrice: 950,  stock: 12, category: 'Suplementos', isQuickAccess: true },
    { name: 'Remera Iron Temple',      costPrice: 350,  salePrice: 700,  stock: 15, category: 'Ropa' },
    { name: 'Botella Shaker 750ml',    costPrice: 180,  salePrice: 350,  stock: 20, category: 'Accesorios' },
    { name: 'Guantes de Entrenamiento',costPrice: 400,  salePrice: 750,  stock: 6,  category: 'Accesorios' },
    { name: 'Barra de Proteína',       costPrice: 60,   salePrice: 120,  stock: 30, category: 'Snacks', isQuickAccess: true },
    { name: 'Agua Mineral 500ml',      costPrice: 25,   salePrice: 60,   stock: 50, category: 'Bebidas', isQuickAccess: true },
    { name: 'Pre-Workout 200g',        costPrice: 800,  salePrice: 1300, stock: 5,  category: 'Suplementos' },
];

const DEMO_SETTINGS = {
    partners: [
        { name: 'Carlos', hours: 120, daysOff: 0 },
        { name: 'Marina', hours: 80,  daysOff: 2 }
    ],
    partnerHourlyRate: 800,
    instructors: [
        { name: 'Prof. Ramiro', hours: 40 }
    ],
    instructorHourlyRate: 600,
    plans: [
        { name: 'Musculación', cost: 2500, type: 'Individual' },
        { name: 'Libre',       cost: 3000, type: 'Individual' },
        { name: 'CrossFit',    cost: 3500, type: 'Individual' },
        { name: 'Familiar',    cost: 4000, type: 'Familiar' }
    ],
    academySavingsBox: 15000,
    savingsPercentage: 10,
    tasks: [
        { name: 'Limpiar vestuarios', frequency: 'weekly', completedAt: null },
        { name: 'Revisar stock de productos', frequency: 'monthly', completedAt: null },
        { name: 'Publicar en redes sociales', frequency: 'weekly', completedAt: null }
    ]
};

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Conectado a ${MONGO_URI}`);

        // Check if demo already exists
        const existing = await Tenant.findOne({ slug: DEMO_SLUG });

        if (existing && !isReset) {
            console.log('⚠️  El tenant "demo" ya existe. Usá --reset para recrearlo.');
            process.exit(0);
        }

        if (existing && isReset) {
            console.log('🗑️  Borrando datos del demo anterior...');
            const tenantId = existing._id;
            await Promise.all([
                Member.deleteMany({ tenantId }),
                Product.deleteMany({ tenantId }),
                Payment.deleteMany({ tenantId }),
                Expense.deleteMany({ tenantId }),
                Debt.deleteMany({ tenantId }),
                Settings.deleteMany({ tenantId }),
                User.deleteMany({ tenantId }),
            ]);
            await Tenant.deleteOne({ _id: tenantId });
            console.log('   ✅ Datos anteriores eliminados.');
        }

        // 1. Create Tenant
        console.log('\n📋 Creando tenant "Iron Temple Demo"...');
        const tenant = await Tenant.create(DEMO_TENANT);
        const tenantId = tenant._id;
        console.log(`   ✅ Tenant creado: ${tenant.name} (slug: ${tenant.slug}, id: ${tenantId})`);

        // 2. Create Admin User
        console.log('\n👤 Creando usuario admin...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(DEMO_ADMIN_PASS, salt);
        await User.create({
            username: DEMO_ADMIN_USER,
            password: hashedPassword,
            role: 'admin',
            tenantId
        });
        console.log(`   ✅ Usuario: ${DEMO_ADMIN_USER} / Contraseña: ${DEMO_ADMIN_PASS}`);

        // 3. Create Members
        console.log('\n👥 Creando miembros ficticios...');
        const memberDocs = [];
        for (const m of DEMO_MEMBERS) {
            const doc = await Member.create({ ...m, tenantId });
            memberDocs.push(doc);
        }
        // Link family dependent (Ana Vargas → Diego Vargas)
        const diegoDoc = memberDocs.find(m => m.fullName === 'Diego Vargas');
        const anaDoc = memberDocs.find(m => m.fullName === 'Ana Vargas');
        if (diegoDoc && anaDoc) {
            anaDoc.familyId = diegoDoc._id;
            await anaDoc.save();
        }
        console.log(`   ✅ ${memberDocs.length} miembros creados.`);

        // 4. Create Products
        console.log('\n📦 Creando productos ficticios...');
        const productDocs = await Product.insertMany(
            DEMO_PRODUCTS.map(p => ({ ...p, tenantId }))
        );
        console.log(`   ✅ ${productDocs.length} productos creados.`);

        // 5. Create Settings
        console.log('\n⚙️  Creando configuración del demo...');
        await Settings.create({ key: 'admin_config', ...DEMO_SETTINGS, tenantId });
        console.log('   ✅ Settings creadas.');

        // 6. Create sample payments (current month)
        console.log('\n💰 Creando pagos de ejemplo del mes actual...');
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const payments = [];
        // 8 out of 15 members paid their monthly fee
        const paidMembers = memberDocs.filter(m => m.active && m.planCost > 0).slice(0, 8);
        for (const m of paidMembers) {
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
        }
        // 3 product sales
        const agua = productDocs.find(p => p.name.includes('Agua'));
        const barra = productDocs.find(p => p.name.includes('Barra'));
        const proteina = productDocs.find(p => p.name.includes('Whey'));
        if (agua) payments.push({ memberId: memberDocs[0]._id, memberName: memberDocs[0].fullName, memberCi: memberDocs[0].ci, productName: agua.name, productId: agua._id, month, year, amount: agua.salePrice * 2, type: 'Venta', quantity: 2, paymentMethod: 'Efectivo', date: new Date(year, month - 1, 5), tenantId });
        if (barra) payments.push({ memberId: memberDocs[3]._id, memberName: memberDocs[3].fullName, memberCi: memberDocs[3].ci, productName: barra.name, productId: barra._id, month, year, amount: barra.salePrice * 3, type: 'Venta', quantity: 3, paymentMethod: 'Digital', date: new Date(year, month - 1, 8), tenantId });
        if (proteina) payments.push({ memberId: memberDocs[4]._id, memberName: memberDocs[4].fullName, memberCi: memberDocs[4].ci, productName: proteina.name, productId: proteina._id, month, year, amount: proteina.salePrice, type: 'Venta', quantity: 1, paymentMethod: 'Efectivo', date: new Date(year, month - 1, 12), tenantId });

        await Payment.insertMany(payments);
        console.log(`   ✅ ${payments.length} pagos/ventas creados.`);

        // 7. Create sample expenses
        console.log('\n📉 Creando gastos de ejemplo...');
        const expenses = [
            { concept: 'Alquiler local',          amount: 25000, category: 'Alquiler',   paymentMethod: 'Digital',   date: new Date(year, month - 1, 1), tenantId },
            { concept: 'Electricidad',             amount: 4500,  category: 'Servicios',  paymentMethod: 'Digital',   date: new Date(year, month - 1, 5), tenantId },
            { concept: 'Compra proteínas mayoreo', amount: 8000,  category: 'Mercadería', paymentMethod: 'Efectivo',  date: new Date(year, month - 1, 3), tenantId },
            { concept: 'Reparación cinta',         amount: 3000,  category: 'Mantenimiento', paymentMethod: 'Efectivo', date: new Date(year, month - 1, 10), tenantId },
            { concept: 'Publicidad Instagram',     amount: 1500,  category: 'Marketing',  paymentMethod: 'Digital',   date: new Date(year, month - 1, 7), tenantId },
        ];
        await Expense.insertMany(expenses);
        console.log(`   ✅ ${expenses.length} gastos creados.`);

        // 8. Create sample debts (fiados)
        console.log('\n📝 Creando fiados de ejemplo...');
        if (agua && barra) {
            const debts = [
                {
                    memberId: memberDocs[5]._id,
                    memberName: memberDocs[5].fullName,
                    products: [
                        { productId: agua._id, productName: agua.name, quantity: 3, amount: agua.salePrice },
                        { productId: barra._id, productName: barra.name, quantity: 1, amount: barra.salePrice }
                    ],
                    totalAmount: (agua.salePrice * 3) + barra.salePrice,
                    status: 'pending',
                    date: new Date(year, month - 1, 6),
                    tenantId
                },
                {
                    memberId: memberDocs[8]._id,
                    memberName: memberDocs[8].fullName,
                    products: [
                        { productId: barra._id, productName: barra.name, quantity: 2, amount: barra.salePrice }
                    ],
                    totalAmount: barra.salePrice * 2,
                    status: 'pending',
                    date: new Date(year, month - 1, 9),
                    tenantId
                }
            ];
            await Debt.insertMany(debts);
            console.log(`   ✅ ${debts.length} fiados creados.`);
        }

        // Done!
        console.log('\n══════════════════════════════════════════════════════');
        console.log('🎉  ¡Demo "Iron Temple" creado exitosamente!');
        console.log('══════════════════════════════════════════════════════');
        console.log(`\n🌐 Acceso local: http://demo.localhost:5173`);
        console.log(`👤 Usuario: ${DEMO_ADMIN_USER}`);
        console.log(`🔑 Contraseña: ${DEMO_ADMIN_PASS}`);
        console.log('\n');

    } catch (err) {
        console.error('❌ Error durante el seed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
