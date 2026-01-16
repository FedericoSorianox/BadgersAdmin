import { createContext, useContext, useState, useEffect } from 'react';

const TenantContext = createContext();

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
    const [branding, setBranding] = useState({
        name: 'Badgers Admin',
        primaryColor: '#000000', // Badgers Black
        secondaryColor: '#1a1a1a', // Badgers Dark
        logoUrl: '/gymworkspro-logo.png',
        sidebarText: 'Badgers Admin',
        textColor: '#ffffff'
    });

    const [partners, setPartners] = useState([]);

    const [tenantId, setTenantId] = useState(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Set initial/default colors immediately to match invalid/loading state
        const root = document.documentElement;
        if (loading) {
            root.style.setProperty('--primary', '#000000');
            root.style.setProperty('--secondary', '#1a1a1a');
            root.style.setProperty('--text-on-primary', '#ffffff');
        }

        const hostname = window.location.hostname;
        let slug = null;

        // Parse subdomain
        // Case 1: localhost (e.g., cobrakai.localhost)
        // Case 2: production (e.g., cobrakai.badgers.com)
        const parts = hostname.split('.');

        // SKIP branding if on superadmin route
        if (window.location.pathname.startsWith('/superadmin')) {
            console.log('Super Admin Route - Skipping Tenant Branding');
            setBranding({
                name: 'GymWorksPro Panel',
                primaryColor: '#000000',
                secondaryColor: '#1a1a1a',
                sidebarText: 'GymWorksPro SuperAdmin',
                textColor: '#ffffff',
                logoUrl: '/badgers-logo.jpg' // Use generic logo or GymWorksPro specific if available
            });
            const root = document.documentElement;
            root.style.setProperty('--primary', '#000000');
            root.style.setProperty('--secondary', '#1a1a1a');
            root.style.setProperty('--text-on-primary', '#ffffff');

            setLoading(false);
            return;
        }

        const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || 'localhost';

        // Escape rootDomain for Regex (e.g., "." -> "\.")
        const escapedRoot = rootDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Regex to capture subdomain:
        // ^(.*)\.ROOT_DOMAIN$
        // e.g. "^(.*)\.gymworkspro\.com$"
        // If local: "^(.*)\.localhost$"

        // Case 1: Subdomain exists (e.g. cobra.gymworkspro.com or cobra.localhost)
        const regex = new RegExp(`^(.*)\\.${escapedRoot}$`, 'i');
        const match = hostname.match(regex);

        if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
            // Root Domain (Landing / SuperAdmin)
            console.log(`Detected Root Domain: ${rootDomain}`);
            setBranding({
                name: 'GymWorksPro',
                primaryColor: '#000000',
                secondaryColor: '#1a1a1a',
                sidebarText: 'GymWorksPro',
                textColor: '#ffffff',
                logoUrl: '/badgers-logo.jpg' // Generic Logo
            });
            const root = document.documentElement;
            root.style.setProperty('--primary', '#000000');
            root.style.setProperty('--secondary', '#1a1a1a');
            root.style.setProperty('--text-on-primary', '#ffffff');
            setLoading(false);
            return;
        }

        if (match && match[1]) {
            const potentialSlug = match[1];
            if (potentialSlug !== 'www') {
                slug = potentialSlug;
            } else {
                // www.root.com is treated as root above usually, but if regex caught it:
                // Handled by the first if block ideally, but safety check:
                setLoading(false);
                return;
            }
        } else {
            // Fallback for weird cases or IP access (treat as root/no tenant)
            // Or if we are on a completely different domain not matching ROOT_DOMAIN
            console.log('Hostname does not match ROOT_DOMAIN, assuming standalone or misconfig');
        }

        if (slug) {
            console.log('Detected Tenant Slug:', slug);
            // Set Global Axios Header
            // We need to import axios to set this if we want it global
            // Dynamic import to avoid top-level dependency if preferred, or just rely on window/global config
            // Better: We should probably export a configured axios instance, but changing the global default is easiest for now
            // given the codebase uses raw 'axios' imports.
            import('axios').then(axios => {
                axios.default.defaults.headers.common['x-tenant-slug'] = slug;

                // Fetch branding AFTER setting the header
                // Note: We used to call fetchBranding here inside the promise, or outside?
                // `fetchBranding` below relies on API call.

                const fetchBranding = async () => {
                    try {
                        // Fetch branding for this tenant
                        // We can reuse the same endpoint but now the header is set!
                        // Or call a specific public endpoint by slug
                        const API_URL = (await import('../config')).default;
                        const res = await fetch(`${API_URL}/api/tenants/public/${slug}`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.branding) {
                                setBranding({
                                    ...data.branding,
                                    name: data.name // Ensure we have the tenant name if needed
                                });
                                setPartners(data.partners || []);
                                setTenantId(data._id);

                                // Apply colors
                                const root = document.documentElement;
                                root.style.setProperty('--primary', data.branding.primaryColor);
                                root.style.setProperty('--secondary', data.branding.secondaryColor);
                                // Set text color on primary background
                                root.style.setProperty('--text-on-primary', data.branding.textColor || '#ffffff');

                                // Extended colors
                                if (data.branding.menuHoverColor) root.style.setProperty('--menu-hover', data.branding.menuHoverColor);
                                if (data.branding.menuActiveColor) root.style.setProperty('--menu-active', data.branding.menuActiveColor);
                                if (data.branding.dashboardTitleColor) root.style.setProperty('--dashboard-title', data.branding.dashboardTitleColor);

                                // Button Colors
                                if (data.branding.newSaleButtonColor) root.style.setProperty('--btn-new-sale', data.branding.newSaleButtonColor);
                                if (data.branding.newExpenseButtonColor) root.style.setProperty('--btn-new-expense', data.branding.newExpenseButtonColor);
                                if (data.branding.newFiadoButtonColor) root.style.setProperty('--btn-new-fiado', data.branding.newFiadoButtonColor);
                                if (data.branding.newMemberButtonColor) root.style.setProperty('--btn-new-member', data.branding.newMemberButtonColor);
                                if (data.branding.newProductButtonColor) root.style.setProperty('--btn-new-product', data.branding.newProductButtonColor);
                                if (data.branding.saveButtonColor) root.style.setProperty('--btn-save', data.branding.saveButtonColor);
                            }
                        }
                    } catch (error) {
                        console.error("Failed to load tenant branding", error);
                    } finally {
                        setLoading(false);
                    }
                };

                fetchBranding();
            });

        } else {
            // Fallback or System Admin View (no tenant header)
            import('axios').then(axios => {
                delete axios.default.defaults.headers.common['x-tenant-slug'];
                setLoading(false);
            });
            // Reset to defaults if needed
            setBranding({
                name: 'Badgers Admin',
                primaryColor: '#000000',
                secondaryColor: '#1a1a1a',
                sidebarText: 'Badgers Admin',
                textColor: '#ffffff',
                logoUrl: '/badgers-logo.jpg' // Default logo
            });
            // Reset extended vars
            const root = document.documentElement;
            root.style.setProperty('--primary', '#000000');
            root.style.setProperty('--secondary', '#1a1a1a');
            root.style.setProperty('--text-on-primary', '#ffffff');

            root.style.removeProperty('--menu-hover');
            root.style.removeProperty('--menu-active');
            root.style.removeProperty('--dashboard-title');
        }

    }, []);

    const value = {
        branding,
        partners,
        tenantId
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    );
};
