const { tenantStorage } = require('../utils/tenantContext');
const Tenant = require('../models/Tenant');
const jwt = require('jsonwebtoken');

const tenantMiddleware = async (req, res, next) => {
    let tenantId = null;
    let isSuper = false;

    // 1. Check User Token FIRST (Strongest identifier)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            if (decoded.user) {
                if (decoded.user.role === 'superadmin') {
                    isSuper = true;
                } else if (decoded.user.tenantId) {
                    tenantId = decoded.user.tenantId;
                }
            }
        } catch (e) {
            // Token invalid, let auth middleware handle later
        }
    }

    // 2. Check Header (Secondary identifier or for public access)
    const tenantSlug = req.headers['x-tenant-slug'];
    if (tenantSlug) {
        try {
            const tenant = await Tenant.findOne({ slug: { $regex: new RegExp(`^${tenantSlug}$`, 'i') } });
            if (tenant) {
                // If token already has a tenantId, they MUST match (unless SuperAdmin)
                if (tenantId && tenantId.toString() !== tenant._id.toString() && !isSuper) {
                    return res.status(403).json({ message: 'Acceso denegado: El gimnasio no coincide con su sesión.' });
                }
                tenantId = tenant._id;
            } else {
                return res.status(404).json({ message: `Gimnasio "${tenantSlug}" no encontrado.` });
            }
        } catch (error) {
            console.error('Tenant resolution error:', error);
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

    // Enforcement Logic
    // Enforcement Logic - RELAXED for Legacy Support
    // We allow requests without a tenantId to proceed, which will result in req.tenantId usually being undefined/null.
    // Controllers will then query { tenantId: null }, accessing the legacy/global data.
    /* 
    if (!isPublicPath) {
        if (!tenantId && !isSuper) {
            return res.status(401).json({ message: 'Identificación de gimnasio requerida. Use el subdominio correcto.' });
        }
    }
    */

    if (tenantId) {
        tenantStorage.run(new Map([['tenantId', tenantId]]), () => {
            req.tenantId = tenantId;
            next();
        });
    } else {
        next();
    }
};

module.exports = tenantMiddleware;
