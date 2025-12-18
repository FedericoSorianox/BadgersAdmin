const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Middleware to ensure Super Admin
const isSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }
    next();
};

// @route   GET api/tenants
// @desc    Get all tenants
// @access  Super Admin
router.get('/', auth, isSuperAdmin, async (req, res) => {
    try {
        const tenants = await Tenant.find().sort({ createdAt: -1 });
        res.json(tenants);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET api/tenants/public/:slug
// @desc    Get tenant branding (Public)
// @access  Public
router.get('/public/:slug', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ slug: req.params.slug }).select('name slug branding');
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
        res.json(tenant);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST api/tenants
// @desc    Create a new tenant
// @access  Super Admin
router.post('/', auth, isSuperAdmin, async (req, res) => {
    const { name, slug, primaryColor, secondaryColor, logoUrl, sidebarText, sidebarLogoUrl, textColor, menuHoverColor, menuActiveColor, dashboardTitleColor, adminUsername, adminPassword } = req.body;

    try {
        let tenant = await Tenant.findOne({ slug });
        if (tenant) {
            return res.status(400).json({ message: 'Tenant already exists with that slug' });
        }

        // Validate User if provided
        if (adminUsername) {
            const existingUser = await User.findOne({ username: adminUsername });
            if (existingUser) {
                return res.status(400).json({ message: `User '${adminUsername}' already exists. Please choose another username.` });
            }
        }

        tenant = new Tenant({
            name,
            slug,
            branding: {
                primaryColor: primaryColor || '#3498db',
                secondaryColor: secondaryColor || '#2c3e50',
                logoUrl,
                sidebarText, // Let's use schema default if undefined
                sidebarLogoUrl,
                textColor: textColor || '#ffffff',
                menuHoverColor,
                menuActiveColor,
                dashboardTitleColor
            }
        });

        const savedTenant = await tenant.save();

        let createdUser = null;
        if (adminUsername && adminPassword) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);

            const newUser = new User({
                username: adminUsername,
                password: hashedPassword,
                role: 'admin',
                tenantId: savedTenant._id
            });
            createdUser = await newUser.save();
        }

        res.status(201).json({ tenant: savedTenant, user: createdUser });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT api/tenants/:id
// @desc    Update tenant
// @access  Super Admin
router.put('/:id', auth, isSuperAdmin, async (req, res) => {
    const { name, slug, primaryColor, secondaryColor, logoUrl, sidebarText, sidebarLogoUrl, textColor, menuHoverColor, menuActiveColor, dashboardTitleColor } = req.body;

    // Construct update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (slug) updateFields.slug = slug;

    // For branding, we want to update specific fields but keep others if not provided? 
    // Or just overwrite branding? Let's assume we send the full branding state or merge it.
    // Better to use $set for deep fields if we want granular updates, or just rebuild branding.
    // Given the form will send everything, let's rebuild branding, but we need to fetch existing first if we want partials?
    // Let's assume the client sends the full 'newTenant' state which includes all these fields.

    // We can't just pass req.body because branding is a nested object in Schema but flat in our form state logic (so far).
    // The POST route destructured them flat. The PUT should probably accept them flat too for consistency with frontend form.

    const brandingUpdate = {};
    if (primaryColor !== undefined) brandingUpdate['branding.primaryColor'] = primaryColor;
    if (secondaryColor !== undefined) brandingUpdate['branding.secondaryColor'] = secondaryColor;
    if (logoUrl !== undefined) brandingUpdate['branding.logoUrl'] = logoUrl;
    if (sidebarText !== undefined) brandingUpdate['branding.sidebarText'] = sidebarText;
    if (sidebarLogoUrl !== undefined) brandingUpdate['branding.sidebarLogoUrl'] = sidebarLogoUrl;
    if (textColor !== undefined) brandingUpdate['branding.textColor'] = textColor;
    if (menuHoverColor !== undefined) brandingUpdate['branding.menuHoverColor'] = menuHoverColor;
    if (menuActiveColor !== undefined) brandingUpdate['branding.menuActiveColor'] = menuActiveColor;
    if (dashboardTitleColor !== undefined) brandingUpdate['branding.dashboardTitleColor'] = dashboardTitleColor;

    try {
        const tenant = await Tenant.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    ...updateFields,
                    ...brandingUpdate
                }
            },
            { new: true }
        );
        res.json(tenant);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   DELETE api/tenants/:id
// @desc    Delete tenant
// @access  Super Admin
router.delete('/:id', auth, isSuperAdmin, async (req, res) => {
    try {
        await Tenant.findByIdAndDelete(req.params.id);
        // Warning: Should we delete all data associated? 
        // For safety, we keep data or require manual cleanup for now.
        res.json({ message: 'Tenant deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
