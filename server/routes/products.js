const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { upload } = require('../config/cloudinary');
const auth = require('../middleware/auth');

// Get all products (Protected)
router.get('/', auth, async (req, res) => {
    try {
        const query = { tenantId: req.tenantId || null };
        const products = await Product.find(query).sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add product (Protected)
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const rawName = (req.body.name || '').trim();
        if (!rawName) {
            return res.status(400).json({ message: 'El nombre del producto es obligatorio' });
        }

        // Check for duplicate product names (case-insensitive) within this tenant
        const escapedName = rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existing = await Product.findOne({
            name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
            tenantId: req.tenantId || null
        });
        if (existing) {
            return res.status(400).json({ message: `Ya existe un producto con el nombre "${rawName}"` });
        }

        const productData = {
            name: rawName,
            costPrice: Number(req.body.costPrice) || 0,
            salePrice: Number(req.body.salePrice) || 0,
            stock: Number(req.body.stock) || 0,
            category: req.body.category,
            isQuickAccess: req.body.isQuickAccess === 'true' || req.body.isQuickAccess === true
        };

        if (req.file) {
            productData.imageUrl = req.file.path;
        }

        if (req.tenantId) {
            productData.tenantId = req.tenantId;
        }

        const product = new Product(productData);
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update product (Protected)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const rawName = req.body.name !== undefined ? (req.body.name || '').trim() : undefined;
        if (rawName !== undefined && !rawName) {
            return res.status(400).json({ message: 'El nombre del producto no puede estar vacío' });
        }

        // If name changed, verify no other product with same name exists in tenant
        if (rawName) {
            const escapedName = rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const existing = await Product.findOne({
                _id: { $ne: req.params.id },
                name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
                tenantId: req.tenantId || null
            });
            if (existing) {
                return res.status(400).json({ message: `Ya existe otro producto con el nombre "${rawName}"` });
            }
        }

        const productData = {};
        if (rawName !== undefined) productData.name = rawName;
        if (req.body.costPrice !== undefined) productData.costPrice = Number(req.body.costPrice);
        if (req.body.salePrice !== undefined) productData.salePrice = Number(req.body.salePrice);
        if (req.body.stock !== undefined) productData.stock = Number(req.body.stock);
        if (req.body.category !== undefined) productData.category = req.body.category;
        if (req.body.isQuickAccess !== undefined) {
            productData.isQuickAccess = req.body.isQuickAccess === 'true' || req.body.isQuickAccess === true;
        }

        if (req.file) {
            productData.imageUrl = req.file.path;
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, productData, { new: true });
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete product (Protected)
router.delete('/:id', auth, async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
