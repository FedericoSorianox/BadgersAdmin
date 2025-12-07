const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const csv = require('csv-parser');

// POST /api/upload/members
const Member = require('../models/Member');
const Product = require('../models/Product');
const Payment = require('../models/Payment');

// Helper to delete file after processing
const cleanup = (path) => fs.unlinkSync(path);

const Expense = require('../models/Expense');

// POST /api/upload/members
router.post('/members', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                // User CSV Headers: ci, foto_url, fecha_registro, nombre, celular, contacto_emergencia, emergencia_movil, fecha_nacimiento, tipo_cuota, enfermedades, comentarios, activo...
                const operations = results.map(row => {
                    // Extract plan cost from "Libre - $2000" if possible
                    let planCost = 2000;
                    if (row.tipo_cuota && row.tipo_cuota.includes('$')) {
                        const costPart = row.tipo_cuota.split('$')[1];
                        planCost = Number(costPart) || 2000;
                    }

                    return {
                        updateOne: {
                            filter: { ci: row.ci },
                            update: {
                                $set: {
                                    ci: row.ci,
                                    fullName: row.nombre,
                                    phone: row.celular,
                                    photoUrl: row.foto_url,
                                    planType: row.tipo_cuota || 'Libre',
                                    planCost: planCost,
                                    active: row.activo === 'true',
                                    medicalInfo: row.enfermedades,
                                    comments: row.comentarios,
                                    birthDate: row.fecha_nacimiento ? new Date(row.fecha_nacimiento) : null,
                                    emergencyContact: {
                                        name: row.contacto_emergencia || '',
                                        phone: row.emergencia_movil || ''
                                    }
                                }
                            },
                            upsert: true
                        }
                    };
                });

                if (operations.length > 0) {
                    await Member.bulkWrite(operations);
                }

                cleanup(req.file.path);
                res.json({ message: 'Socios importados correctamente', count: results.length });
            } catch (error) {
                console.error(error);
                cleanup(req.file.path);
                res.status(500).json({ message: 'Error procesando archivo', error: error.message });
            }
        });
});

// POST /api/upload/products
router.post('/products', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                // User CSV Headers: id, nombre, precio_costo, precio_venta, stock, ganancia, foto_url
                const products = results.map(row => ({
                    name: row.nombre,
                    costPrice: Number(row.precio_costo),
                    salePrice: Number(row.precio_venta),
                    stock: Number(row.stock) || 0,
                    category: 'General', // Default
                    imageUrl: row.foto_url
                }));

                // Use bulkWrite for products too to avoid duplicates? Or just insertMany. 
                // insertMany might fail on duplicates if unique index exists. For now insertMany is fine or we wipe?
                // Given "id" in CSV, maybe update? Let's use bulkWrite to be safe if they re-import.
                const operations = products.map(p => ({
                    updateOne: {
                        filter: { name: p.name }, // Match by name since ID might conflict or be irrelevant
                        update: { $set: p },
                        upsert: true
                    }
                }));

                if (operations.length > 0) {
                    await Product.bulkWrite(operations);
                }

                cleanup(req.file.path);
                res.json({ message: 'Productos importados correctamente', count: results.length });
            } catch (error) {
                console.error(error);
                cleanup(req.file.path);
                res.status(500).json({ message: 'Error procesando archivo', error: error.message });
            }
        });
});

// POST /api/upload/finance
router.post('/finance', upload.single('file'), (req, res) => {
    // This handles Cuota payments
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                // User CSV Headers: id, mes, año, monto, fecha_pago, metodo_pago, socio
                const payments = [];
                // Cache members to avoid N+1 queries. 
                const members = await Member.find({}, 'ci fullName _id');
                const memberMap = new Map(members.map(m => [m.ci, m]));

                for (const row of results) {
                    const member = memberMap.get(row.socio); // socio column has CI

                    payments.push({
                        memberId: member ? member._id : null,
                        memberName: member ? member.fullName : 'Unknown',
                        month: Number(row.mes),
                        year: Number(row.año),
                        amount: Number(row.monto),
                        type: 'Cuota',
                        date: row.fecha_pago ? new Date(row.fecha_pago) : new Date()
                    });
                }

                if (payments.length > 0) {
                    await Payment.insertMany(payments);
                }

                cleanup(req.file.path);
                res.json({ message: 'Pagos importados correctamente', count: results.length });
            } catch (error) {
                console.error(error);
                cleanup(req.file.path);
                res.status(500).json({ message: 'Error procesando archivo', error: error.message });
            }
        });
});

// POST /api/upload/sales
// Handles 'ventas.csv' as Payments of type 'Producto'
router.post('/sales', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                // User CSV Headers: id, producto_id, producto_nombre, cantidad, precio_unitario, total_venta, fecha_venta
                const payments = results.map(row => {
                    const date = row.fecha_venta ? new Date(row.fecha_venta) : new Date();
                    return {
                        month: date.getMonth() + 1,
                        year: date.getFullYear(),
                        amount: Number(row.total_venta),
                        type: 'Producto', // Mark as Product sale
                        date: date,
                        memberName: 'Venta Mostrador' // or Generic
                    };
                });

                if (payments.length > 0) {
                    await Payment.insertMany(payments);
                }

                cleanup(req.file.path);
                res.json({ message: 'Ventas importadas correctamente', count: results.length });
            } catch (error) {
                console.error(error);
                cleanup(req.file.path);
                res.status(500).json({ message: 'Error procesando archivo', error: error.message });
            }
        });
});


// POST /api/upload/expenses
router.post('/expenses', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                // User CSV Headers: id, concepto, monto, fecha, categoria, descripcion
                const expenses = results.map(row => ({
                    concept: row.concepto,
                    amount: Number(row.monto),
                    date: row.fecha ? new Date(row.fecha) : new Date(),
                    category: row.categoria || 'Otros',
                    description: row.descripcion
                }));

                if (expenses.length > 0) {
                    await Expense.insertMany(expenses);
                }

                cleanup(req.file.path);
                res.json({ message: 'Gastos importados correctamente', count: results.length });
            } catch (error) {
                console.error(error);
                cleanup(req.file.path);
                res.status(500).json({ message: 'Error procesando archivo', error: error.message });
            }
        });
});

module.exports = router;
