import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Package, DollarSign, Settings, CreditCard, X } from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();

    const menuItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/members', icon: Users, label: 'Socios' },
        { path: '/inventory', icon: Package, label: 'Inventario' },
        { path: '/finances', icon: DollarSign, label: 'Finanzas' },
        { path: '/payments', icon: CreditCard, label: 'Pagos' },
        { path: '/admin', icon: Settings, label: 'Admin' },
    ];

    return (
        <>
            <div className={`
                w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col 
                fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} 
                md:translate-x-0 md:shadow-none
            `}>
                <div className="flex items-center justify-between gap-3 px-4 py-6 mb-6">
                    <div className="flex items-center gap-3">
                        <img
                            src="/badgers-logo.jpg"
                            alt="The Badgers"
                            className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div>
                            <h1 className="font-bold text-lg">Badgers Admin</h1>
                            <p className="text-xs text-slate-400">Panel de Control</p>
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

                <nav className="flex-1 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => onClose && onClose()} // Close on click mobile
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.label}</span>
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
                            <p className="text-xs text-slate-500">badgers@admin.com</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
