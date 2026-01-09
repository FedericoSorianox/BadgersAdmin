const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { upload } = require('../config/cloudinary');

// Get all products
router.get('/', async (req, res) => {
    try {
        const query = { tenantId: req.tenantId || null };
        const products = await Product.find(query).sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add product
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const productData = {
            name: req.body.name,
            costPrice: Number(req.body.costPrice),
            salePrice: Number(req.body.salePrice),
            stock: Number(req.body.stock),
            category: req.body.category
        };

        // If an image was uploaded, save its path
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

// Update product
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const productData = {
            name: req.body.name,
            costPrice: Number(req.body.costPrice),
            salePrice: Number(req.body.salePrice),
            stock: Number(req.body.stock),
            category: req.body.category
        };

        // If a new image was uploaded, update the path
        if (req.file) {
            productData.imageUrl = req.file.path;
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, productData, { new: true });
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
