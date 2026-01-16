import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';

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
        const root = document.documentElement;

        // Set initial/default colors
        root.style.setProperty('--primary', '#000000');
        root.style.setProperty('--secondary', '#1a1a1a');
        root.style.setProperty('--text-on-primary', '#ffffff');

        const hostname = window.location.hostname;
        const pathname = window.location.pathname;

        // 1. Skip branding if on superadmin route
        if (pathname.startsWith('/superadmin')) {
            setBranding({
                name: 'GymWorksPro Panel',
                primaryColor: '#000000',
                secondaryColor: '#1a1a1a',
                sidebarText: 'GymWorksPro SuperAdmin',
                textColor: '#ffffff',
                logoUrl: '/badgers-logo.jpg'
            });
            setLoading(false);
            return;
        }

        // 2. Identify Slug
        let slug = null;

        // List of possible root domains
        const rootDomains = [
            import.meta.env.VITE_ROOT_DOMAIN,
            'gymworkspro.com',
            'the-badgers.com',
            'localhost'
        ].filter(Boolean);

        for (const rootDomain of rootDomains) {
            if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
                slug = null;
                break;
            }
            if (hostname.endsWith(`.${rootDomain}`)) {
                slug = hostname.replace(`.${rootDomain}`, '').replace('www.', '');
                break;
            }
        }

        const resolveTenant = async () => {
            if (slug) {
                console.log('Detected Tenant Slug:', slug);
                // ALWAYS set the header if we have a slug, immediately
                axios.defaults.headers.common['x-tenant-slug'] = slug;

                try {
                    const res = await fetch(`${API_URL}/api/tenants/public/${slug}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.branding) {
                            setBranding({
                                ...data.branding,
                                name: data.name
                            });
                            setPartners(data.partners || []);
                            setTenantId(data._id);

                            // Apply dynamic colors
                            root.style.setProperty('--primary', data.branding.primaryColor);
                            root.style.setProperty('--secondary', data.branding.secondaryColor);
                            root.style.setProperty('--text-on-primary', data.branding.textColor || '#ffffff');

                            if (data.branding.menuHoverColor) root.style.setProperty('--menu-hover', data.branding.menuHoverColor);
                            if (data.branding.menuActiveColor) root.style.setProperty('--menu-active', data.branding.menuActiveColor);
                            if (data.branding.dashboardTitleColor) root.style.setProperty('--dashboard-title', data.branding.dashboardTitleColor);
                            if (data.branding.newSaleButtonColor) root.style.setProperty('--btn-new-sale', data.branding.newSaleButtonColor);
                            if (data.branding.newExpenseButtonColor) root.style.setProperty('--btn-new-expense', data.branding.newExpenseButtonColor);
                            if (data.branding.newFiadoButtonColor) root.style.setProperty('--btn-new-fiado', data.branding.newFiadoButtonColor);
                            if (data.branding.newMemberButtonColor) root.style.setProperty('--btn-new-member', data.branding.newMemberButtonColor);
                            if (data.branding.newProductButtonColor) root.style.setProperty('--btn-new-product', data.branding.newProductButtonColor);
                            if (data.branding.saveButtonColor) root.style.setProperty('--btn-save', data.branding.saveButtonColor);
                        }
                    } else {
                        console.warn(`Tenant branding fetch failed for "${slug}" (Status: ${res.status})`);
                    }
                } catch (error) {
                    console.error("Failed to load tenant branding", error);
                }
            } else {
                // Root Domain or No Slug
                delete axios.defaults.headers.common['x-tenant-slug'];
                setBranding({
                    name: 'GymWorksPro',
                    primaryColor: '#000000',
                    secondaryColor: '#1a1a1a',
                    sidebarText: 'GymWorksPro',
                    textColor: '#ffffff',
                    logoUrl: '/badgers-logo.jpg'
                });
            }
            setLoading(false);
        };

        resolveTenant();
    }, []);

    const value = { branding, partners, tenantId };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    );
};
