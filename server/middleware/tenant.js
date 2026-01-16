const { tenantStorage } = require('../utils/tenantContext');
const Tenant = require('../models/Tenant');
const jwt = require('jsonwebtoken');

const tenantMiddleware = async (req, res, next) => {
    let tenantId = null;

    // 1. Try Header (useful for public tenant pages or before login)
    const tenantSlug = req.headers['x-tenant-slug'];
    if (tenantSlug) {
        // Case-insensitive search for the slug
        const tenant = await Tenant.findOne({ slug: { $regex: new RegExp(`^${tenantSlug}$`, 'i') } });
        if (tenant) {
            tenantId = tenant._id;
        } else {
            // If a slug was provided but NO tenant found, this is a target error.
            return res.status(404).json({ message: `Gimnasio "${tenantSlug}" no encontrado.` });
        }
    }

    // 2. Try User Token (Stronger/Override)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            if (decoded.user && decoded.user.tenantId) {
                tenantId = decoded.user.tenantId;
            } else if (decoded.user && decoded.user.role === 'superadmin') {
                // SuperAdmins don't have a tenantId fixed, they access what is requested via slug or global
                // If they are on a slug-specific route, we use the tenantId from slug
                // If no slug, they stay global (tenantId = null)
            }
        } catch (e) {
            // Token invalid, let auth middleware handle later if needed
        }
    }

    // Paths that DON'T require a tenant context
    const publicPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/tenants/public',
        '/fix-promote-admin'
    ];

    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));

    // If we are NOT on a public path and still have no tenantId:
    // We allow SuperAdmin to proceed without tenantId (Global view)
    // But regular users or unauthenticated requests to private data must be blocked.
    if (!tenantId && !isPublicPath) {
        // Check if user is SuperAdmin (requires re-verifying token briefly or trusting previous check)
        // For simplicity, we check if the request is NOT to the superadmin allowed origins/paths if we wanted,
        // but the safest is to check the token again or pass the user object.

        let isSuper = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                if (decoded.user && decoded.user.role === 'superadmin') isSuper = true;
            } catch (e) { }
        }

        if (!isSuper) {
            // Block access to private routes without valid tenant identification
            return res.status(401).json({ message: 'Identificación de gimnasio requerida.' });
        }
    }

    if (tenantId) {
        tenantStorage.run(new Map([['tenantId', tenantId]]), () => {
            req.tenantId = tenantId;
            next();
        });
    } else {
        // Proceed without tenantId context (Global/SuperAdmin)
        next();
    }
};

module.exports = tenantMiddleware;
