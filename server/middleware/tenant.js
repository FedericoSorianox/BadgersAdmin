const { tenantStorage } = require('../utils/tenantContext');
const Tenant = require('../models/Tenant');
const jwt = require('jsonwebtoken');

const tenantMiddleware = async (req, res, next) => {
    let tenantId = null;
    let isSuper = false;

    // Paths that DON'T require a tenant context
    const publicPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/tenants/public'
    ];
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
    // Public member profile routes don't require tenant resolution
    const isPublicMemberPath = req.path.match(/^\/api\/members\/public\//);

    // 1. Extract tenantId from JWT (authoritative source for authenticated requests)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            if (decoded.user) {
                if (decoded.user.role === 'superadmin') {
                    isSuper = true;
                }
                // tenantId from JWT is the single source of truth for non-superadmin users
                if (decoded.user.tenantId) {
                    tenantId = decoded.user.tenantId;
                }
            }
        } catch (e) {
            // Token invalid — auth middleware will reject later if route requires auth
        }
    }

    // 2. x-tenant-slug header: only used for public/unauthenticated routes (login, register)
    //    OR by superadmin to explicitly select a tenant context
    const tenantSlug = req.headers['x-tenant-slug'];
    if (tenantSlug && (isPublicPath || isSuper)) {
        try {
            const tenant = await Tenant.findOne({ slug: { $regex: new RegExp(`^${tenantSlug}$`, 'i') } });
            if (tenant) {
                if (isSuper) {
                    // SuperAdmin can switch context via header
                    tenantId = tenant._id;
                } else {
                    // Public route: use the slug to resolve tenant
                    tenantId = tenant._id;
                }
            } else {
                return res.status(404).json({ message: `Gimnasio "${tenantSlug}" no encontrado.` });
            }
        } catch (error) {
            console.error('Tenant resolution error:', error);
        }
    }

    // 3. For non-superadmin authenticated requests, IGNORE x-tenant-slug header
    //    The tenantId from JWT is canonical and cannot be overridden by the client.
    if (tenantSlug && !isPublicPath && !isSuper && authHeader) {
        // Validate that slug matches JWT tenantId (prevent cross-tenant spoofing)
        try {
            const tenant = await Tenant.findOne({ slug: { $regex: new RegExp(`^${tenantSlug}$`, 'i') } });
            if (tenant && tenantId && tenantId.toString() !== tenant._id.toString()) {
                return res.status(403).json({ message: 'Acceso denegado: El gimnasio no coincide con su sesión.' });
            }
        } catch (error) {
            console.error('Tenant validation error:', error);
        }
    }

    // Set tenantId on request and run within AsyncLocalStorage context
    req.tenantId = tenantId || null;

    if (tenantId) {
        tenantStorage.run(new Map([['tenantId', tenantId]]), () => {
            next();
        });
    } else {
        // Legacy mode: no tenant context (The Badgers legacy data has tenantId: null)
        next();
    }
};

module.exports = tenantMiddleware;

