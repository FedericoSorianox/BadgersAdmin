const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Build query: filter by tenantId if present (from x-tenant-slug header),
        // otherwise look for legacy users (tenantId: null) or superadmins
        const tenantId = req.tenantId || null;
        console.log(`[AUTH] Login attempt for user: '${username}', tenantId: ${tenantId}`);

        let user;
        if (tenantId) {
            // Tenant-specific login: find user belonging to this academy
            user = await User.findOne({ username, tenantId });
        } else {
            // Legacy / root domain login: find user with no tenant (The Badgers or superadmin)
            user = await User.findOne({ username, $or: [{ tenantId: null }, { tenantId: { $exists: false } }] });
        }

        if (!user) {
            console.log(`Login failed: User '${username}' not found for tenant ${tenantId || 'legacy'}`);
            return res.status(400).json({ message: 'User not found' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`Login failed: Password mismatch for '${username}'`);
            return res.status(400).json({ message: 'Password incorrect' });
        }

        // Return JWT
        const payload = {
            user: {
                id: user.id,
                role: user.role,
                tenantId: user.tenantId
            },
            tenantId: user.tenantId // For tenant middleware convenience
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        role: user.role,
                        tenantId: user.tenantId
                    }
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.get('/debug', async (req, res) => {
    const tenantId = req.tenantId || null;
    const username = 'admin';
    let user;
    if (tenantId) {
        user = await User.findOne({ username, tenantId });
    } else {
        user = await User.findOne({ username, $or: [{ tenantId: null }, { tenantId: { $exists: false } }] });
    }
    res.json({ tenantId, userFound: user ? user._id : null });
});

// @route   GET api/auth/user
// @desc    Get logged in user
// @access  Private
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
