import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Package, DollarSign, Settings, CreditCard, X } from 'lucide-react';

import { useTenant } from '../context/TenantContext';

const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { branding } = useTenant();

    const menuItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/members', icon: Users, label: 'Socios' },
        { path: '/inventory', icon: Package, label: 'Inventario' },
        { path: '/finances', icon: DollarSign, label: 'Finanzas' },
        { path: '/payments', icon: CreditCard, label: 'Pagos' },
        { path: '/admin', icon: Settings, label: 'Admin' },
    ];

    console.log("Branding in Sidebar:", branding); // Debugging

    return (
        <>
            <div className={`
                w-56 bg-primary text-white h-screen overflow-y-auto p-3 flex flex-col 
                fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} 
                md:translate-x-0 md:shadow-none
            `} style={{ color: 'var(--text-on-primary, white)' }}>
                <div className="flex items-center justify-between gap-3 px-2 py-4 mb-4">
                    <div className="flex items-center gap-2">
                        <img
                            src={branding?.sidebarLogoUrl || branding?.logoUrl || "/badgers-logo.jpg"}
                            alt={branding?.name || "GymWorksPro"}
                            className="w-10 h-10 rounded-xl object-cover bg-white"
                        />
                        <div>
                            <h1 className="font-bold text-base leading-tight" style={{ color: 'var(--text-on-primary, white)' }}>
                                {branding?.sidebarText || branding?.name || "GymWorksPro"}
                            </h1>
                        </div>
                    </div>

                    {/* Close Button Mobile */}
                    <button
                        onClick={onClose}
                        className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => onClose && onClose()} // Close on click mobile
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${isActive
                                    ? 'shadow-sm'
                                    : 'hover:bg-black/5'
                                    }`}
                                style={{
                                    color: 'var(--text-on-primary, white)',
                                    backgroundColor: isActive ? 'var(--menu-active, rgba(255,255,255,0.2))' : 'transparent',
                                    fontWeight: isActive ? 'bold' : 'normal'
                                }}
                            >
                                <Icon size={18} />
                                <span className="font-medium text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto px-4 py-6 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                        <img
                            src="/badgers-logo.jpg"
                            alt="Admin"
                            className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                            <p className="text-sm font-medium">Administrador</p>
                            <p className="text-xs text-slate-500">admin@gymworkspro.com</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
