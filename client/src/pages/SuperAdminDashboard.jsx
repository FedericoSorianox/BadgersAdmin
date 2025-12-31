import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Trash2, LogOut, Edit } from 'lucide-react';
import API_URL from '../config';

const SuperAdminDashboard = () => {
    const [tenants, setTenants] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null); // Track if we are editing
    const [newTenant, setNewTenant] = useState({
        name: '',
        slug: '',
        primaryColor: '#3498db',
        secondaryColor: '#2c3e50',
        logoUrl: '',
        sidebarText: '',
        textColor: '#ffffff',
        menuHoverColor: '',
        menuActiveColor: '',
        dashboardTitleColor: '',
        newSaleButtonColor: '',
        newExpenseButtonColor: '',
        newFiadoButtonColor: '',
        newMemberButtonColor: '',
        newProductButtonColor: '',
        saveButtonColor: '',
        partners: [{ name: '', percentage: 0 }, { name: '', percentage: 0 }],
        instructorHourlyRate: 0,
        adminUsername: '',
        adminPassword: ''
    });
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Enforce Domain for Super Admin in Production
        if (import.meta.env.MODE === 'production') {
            const hostname = window.location.hostname;
            if (hostname !== 'gymworkspro.com' && !hostname.includes('localhost')) {
                window.location.href = 'https://gymworkspro.com/superadmin';
                return;
            }
        }
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/tenants`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('isAuthenticated');
                window.location.href = '/login';
                return;
            }

            const data = await res.json();
            if (res.ok) setTenants(data);
        } catch (error) {
            console.error('Error fetching tenants:', error);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const url = editingId
            ? `${API_URL}/api/tenants/${editingId}`
            : `${API_URL}/api/tenants`;
        const method = editingId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newTenant)
            });

            if (res.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('isAuthenticated');
                window.location.href = '/login';
                return;
            }

            if (res.ok) {
                setShowModal(false);
                setEditingId(null);
                setNewTenant({
                    name: '',
                    slug: '',
                    primaryColor: '#3498db',
                    secondaryColor: '#2c3e50',
                    logoUrl: '',
                    sidebarText: '',
                    textColor: '#ffffff',
                    menuHoverColor: '',
                    menuActiveColor: '',
                    dashboardTitleColor: '',
                    newSaleButtonColor: '',
                    newExpenseButtonColor: '',
                    newFiadoButtonColor: '',
                    newMemberButtonColor: '',
                    newProductButtonColor: '',
                    saveButtonColor: '',
                    partners: [{ name: '', percentage: 0 }, { name: '', percentage: 0 }],
                    instructorHourlyRate: 0,
                    adminUsername: '',
                    adminPassword: ''
                });
                fetchTenants();
            } else {
                alert('Error saving tenant');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (tenant) => {
        setEditingId(tenant._id);
        const branding = tenant.branding || {};

        setNewTenant({
            name: tenant.name,
            slug: tenant.slug,
            primaryColor: branding.primaryColor || '#3498db',
            secondaryColor: branding.secondaryColor || '#2c3e50',
            logoUrl: branding.logoUrl || '',
            sidebarText: branding.sidebarText || '',
            textColor: branding.textColor || '#ffffff',
            menuHoverColor: branding.menuHoverColor || '',
            menuActiveColor: branding.menuActiveColor || '',
            dashboardTitleColor: branding.dashboardTitleColor || '',
            newSaleButtonColor: branding.newSaleButtonColor || '',
            newExpenseButtonColor: branding.newExpenseButtonColor || '',
            newFiadoButtonColor: branding.newFiadoButtonColor || '',
            newMemberButtonColor: branding.newMemberButtonColor || '',
            newProductButtonColor: branding.newProductButtonColor || '',
            saveButtonColor: branding.saveButtonColor || '',
            partners: tenant.partners && tenant.partners.length >= 2 ? tenant.partners : [{ name: '', percentage: 0 }, { name: '', percentage: 0 }],
            instructorHourlyRate: tenant.instructorHourlyRate || 0
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/tenants/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('isAuthenticated');
                window.location.href = '/login';
                return;
            }

            if (res.ok) fetchTenants();
        } catch (error) {
            console.error(error);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/images/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('isAuthenticated');
                window.location.href = '/login';
                return;
            }

            const data = await res.json();
            if (res.ok) {
                setNewTenant(prev => ({ ...prev, logoUrl: data.imageUrl }));
            } else {
                alert('Error uploading image');
            }
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Error updating image');
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('isAuthenticated');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-slate-900 text-white p-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Super Admin</h1>
                            <p className="text-xs text-slate-400">Tenant Management</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <LogOut size={20} />
                        <span>Salir</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Gimnasios (Tenants)</h2>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setNewTenant({
                                name: '',
                                slug: '',
                                primaryColor: '#3498db',
                                secondaryColor: '#2c3e50',
                                logoUrl: '',
                                sidebarText: '',
                                textColor: '#ffffff',
                                menuHoverColor: '',
                                menuActiveColor: '',
                                dashboardTitleColor: '',
                                newSaleButtonColor: '',
                                newExpenseButtonColor: '',
                                newFiadoButtonColor: '',
                                newMemberButtonColor: '',
                                newProductButtonColor: '',
                                saveButtonColor: '',
                                partners: [{ name: '', percentage: 0 }, { name: '', percentage: 0 }],
                                instructorHourlyRate: 0,
                                adminUsername: '',
                                adminPassword: ''
                            });
                            setShowModal(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-md"
                    >
                        <Plus size={20} />
                        Nuevo Gimnasio
                    </button>
                </div>

                {/* Tenant Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tenants.map(tenant => (
                        <div key={tenant._id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: tenant.branding.primaryColor }}>
                                    {tenant.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="space-x-2">
                                    <button onClick={() => handleEdit(tenant)} className="text-slate-400 hover:text-blue-500 transition-colors">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(tenant._id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 mb-1">{tenant.name}</h3>
                            <p className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block mb-4">
                                Slug: {tenant.slug}
                            </p>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tenant.branding.primaryColor }}></div>
                                    Primary: {tenant.branding.primaryColor}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tenant.branding.secondaryColor }}></div>
                                    Secondary: {tenant.branding.secondaryColor}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                <span className="text-xs text-slate-400">Created: {new Date(tenant.createdAt).toLocaleDateString()}</span>
                                <a href={`${window.location.protocol}//${tenant.slug}.${window.location.hostname.replace('www.', '')}${window.location.port ? ':' + window.location.port : ''}`} className="text-blue-600 text-sm hover:underline" target="_blank" rel="noopener noreferrer">
                                    Go to Dashboard →
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </main >

            {/* Create Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                                <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Gimnasio' : 'Crear Nuevo Gimnasio'}</h3>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="text-2xl font-light">×</span>
                                </button>
                            </div>

                            <div className="flex-1 min-h-0">
                                <form onSubmit={handleSave} className="flex flex-col lg:flex-row h-full">
                                    {/* Left Column: Form Inputs */}
                                    <div className="flex-1 flex flex-col border-r border-slate-100 min-h-0">
                                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-slate-900 border-b pb-2">Información General</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            value={newTenant.name}
                                                            onChange={e => setNewTenant({ ...newTenant, name: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL ID)</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            value={newTenant.slug}
                                                            onChange={e => setNewTenant({ ...newTenant, slug: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Logo del Gimnasio</label>
                                                    <div className="flex gap-2 items-center">
                                                        <input
                                                            type="text"
                                                            placeholder="https://..."
                                                            className="w-full p-2 border border-slate-200 rounded-lg"
                                                            value={newTenant.logoUrl}
                                                            onChange={e => setNewTenant({ ...newTenant, logoUrl: e.target.value })}
                                                        />
                                                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 p-2 rounded-lg border border-slate-300 transition-colors shrink-0">
                                                            <span className="text-xs font-semibold text-slate-600">Upload</span>
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                                        </label>
                                                    </div>
                                                    {uploading && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="font-bold text-slate-900 border-b pb-2">Apariencia y Colores</h4>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Color Primario (Acentos)</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                                                value={newTenant.primaryColor || '#3498db'}
                                                                onChange={e => setNewTenant({ ...newTenant, primaryColor: e.target.value })}
                                                            />
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 border border-slate-200 rounded-lg"
                                                                value={newTenant.primaryColor}
                                                                onChange={e => setNewTenant({ ...newTenant, primaryColor: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Color Secundario (Sidebar)</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                                                value={newTenant.secondaryColor || '#2c3e50'}
                                                                onChange={e => setNewTenant({ ...newTenant, secondaryColor: e.target.value })}
                                                            />
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 border border-slate-200 rounded-lg"
                                                                value={newTenant.secondaryColor}
                                                                onChange={e => setNewTenant({ ...newTenant, secondaryColor: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Extended Branding Colors */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Color Menu Hover</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                                                value={newTenant.menuHoverColor || '#000000'}
                                                                onChange={e => setNewTenant({ ...newTenant, menuHoverColor: e.target.value })}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="#..."
                                                                className="w-full p-2 border border-slate-200 rounded-lg"
                                                                value={newTenant.menuHoverColor || ''}
                                                                onChange={e => setNewTenant({ ...newTenant, menuHoverColor: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Color Menu Activo</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                                                value={newTenant.menuActiveColor || '#000000'}
                                                                onChange={e => setNewTenant({ ...newTenant, menuActiveColor: e.target.value })}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="#..."
                                                                className="w-full p-2 border border-slate-200 rounded-lg"
                                                                value={newTenant.menuActiveColor || ''}
                                                                onChange={e => setNewTenant({ ...newTenant, menuActiveColor: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Color Título Dashboard</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                                                value={newTenant.dashboardTitleColor || '#000000'}
                                                                onChange={e => setNewTenant({ ...newTenant, dashboardTitleColor: e.target.value })}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="#..."
                                                                className="w-full p-2 border border-slate-200 rounded-lg"
                                                                value={newTenant.dashboardTitleColor || ''}
                                                                onChange={e => setNewTenant({ ...newTenant, dashboardTitleColor: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Color Texto Menu</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                                                value={newTenant.textColor || '#ffffff'}
                                                                onChange={e => setNewTenant({ ...newTenant, textColor: e.target.value })}
                                                            />
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 border border-slate-200 rounded-lg"
                                                                value={newTenant.textColor}
                                                                onChange={e => setNewTenant({ ...newTenant, textColor: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Texto del Menu (Sidebar)</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Ej: Cobra Kai Admin"
                                                            className="w-full p-2 border border-slate-200 rounded-lg"
                                                            value={newTenant.sidebarText}
                                                            onChange={e => setNewTenant({ ...newTenant, sidebarText: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <h5 className="font-semibold text-slate-800 pt-2">Botones de Acción</h5>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Btn: Nueva Venta</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                                                value={newTenant.newSaleButtonColor || '#22c55e'}
                                                                onChange={e => setNewTenant({ ...newTenant, newSaleButtonColor: e.target.value })}
                                                            />
                                                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={newTenant.newSaleButtonColor || ''} onChange={e => setNewTenant({ ...newTenant, newSaleButtonColor: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Btn: Nuevo Gasto</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                                                value={newTenant.newExpenseButtonColor || '#ef4444'}
                                                                onChange={e => setNewTenant({ ...newTenant, newExpenseButtonColor: e.target.value })}
                                                            />
                                                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={newTenant.newExpenseButtonColor || ''} onChange={e => setNewTenant({ ...newTenant, newExpenseButtonColor: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Btn: Nuevo Fiado</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                                                value={newTenant.newFiadoButtonColor || '#f59e0b'}
                                                                onChange={e => setNewTenant({ ...newTenant, newFiadoButtonColor: e.target.value })}
                                                            />
                                                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={newTenant.newFiadoButtonColor || ''} onChange={e => setNewTenant({ ...newTenant, newFiadoButtonColor: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Btn: Nuevo Socio</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                                                value={newTenant.newMemberButtonColor || '#3b82f6'}
                                                                onChange={e => setNewTenant({ ...newTenant, newMemberButtonColor: e.target.value })}
                                                            />
                                                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={newTenant.newMemberButtonColor || ''} onChange={e => setNewTenant({ ...newTenant, newMemberButtonColor: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Btn: Nuevo Producto</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                                                value={newTenant.newProductButtonColor || '#3b82f6'}
                                                                onChange={e => setNewTenant({ ...newTenant, newProductButtonColor: e.target.value })}
                                                            />
                                                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={newTenant.newProductButtonColor || ''} onChange={e => setNewTenant({ ...newTenant, newProductButtonColor: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Btn: Guardar (General)</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                                                value={newTenant.saveButtonColor || '#3b82f6'}
                                                                onChange={e => setNewTenant({ ...newTenant, saveButtonColor: e.target.value })}
                                                            />
                                                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={newTenant.saveButtonColor || ''} onChange={e => setNewTenant({ ...newTenant, saveButtonColor: e.target.value })} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="font-bold text-slate-900 border-b pb-2">Configuración Avanzada</h4>

                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                                    <h4 className="font-semibold text-slate-700 mb-3">{editingId ? 'Actualizar Credenciales Admin' : 'Usuario Administrador Inicial'}</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">{editingId ? 'Nuevo Usuario (Opcional)' : 'Usuario Admin'}</label>
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                                value={newTenant.adminUsername}
                                                                onChange={e => setNewTenant({ ...newTenant, adminUsername: e.target.value })}
                                                                placeholder={editingId ? 'Dejar vacío para mantener actual' : "Ej: admin_cobra"}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">{editingId ? 'Nueva Contraseña (Opcional)' : 'Contraseña Admin'}</label>
                                                            <input
                                                                type="password"
                                                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                                value={newTenant.adminPassword}
                                                                onChange={e => setNewTenant({ ...newTenant, adminPassword: e.target.value })}
                                                                placeholder={editingId ? 'Dejar vacío para mantener actual' : "••••••••"}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                                    <h4 className="font-semibold text-slate-800 mb-3">Socios (Partners)</h4>
                                                    <div className="space-y-3">
                                                        {newTenant.partners.map((partner, index) => (
                                                            <div key={index} className="flex gap-3">
                                                                <div className="flex-1">
                                                                    <label className="text-xs text-slate-500 mb-1 block">Nombre Socio {index + 1}</label>
                                                                    <input
                                                                        type="text"
                                                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                                                        value={partner.name}
                                                                        onChange={e => {
                                                                            const updatedPartners = [...newTenant.partners];
                                                                            updatedPartners[index].name = e.target.value;
                                                                            setNewTenant({ ...newTenant, partners: updatedPartners });
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="w-24">
                                                                    <label className="text-xs text-slate-500 mb-1 block">% Reparto</label>
                                                                    <input
                                                                        type="number"
                                                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                                                        value={partner.percentage}
                                                                        onChange={e => {
                                                                            const updatedPartners = [...newTenant.partners];
                                                                            updatedPartners[index].percentage = parseFloat(e.target.value) || 0;
                                                                            setNewTenant({ ...newTenant, partners: updatedPartners });
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor Hora Instructor ($)</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                                        value={newTenant.instructorHourlyRate}
                                                        onChange={e => setNewTenant({ ...newTenant, instructorHourlyRate: parseFloat(e.target.value) || 0 })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Fixed Footer Buttons */}
                                        <div className="p-6 border-t border-slate-100 bg-white shrink-0 shadow-[0_-4px_6px_-2px_rgba(0,0,0,0.05)] z-10">
                                            <div className="flex justify-end gap-3 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowModal(false)}
                                                    className="px-6 py-2 text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md"
                                                >
                                                    {editingId ? 'Guardar Cambios' : 'Crear Gimnasio'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Live Preview */}
                                    <div className="hidden lg:block w-[450px] bg-slate-50 p-6 overflow-y-auto border-l border-slate-200">
                                        <div className="sticky top-0">
                                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <span className="bg-blue-100 text-blue-600 p-1 rounded text-xs">VISTA PREVIA</span>
                                                Dashboard Preview
                                            </h4>

                                            {/* Preview Container: Aspect-ratio monitor-like */}
                                            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-300 flex flex-col h-[500px]">
                                                <div className="flex h-full">
                                                    {/* Sidebar Preview */}
                                                    <div
                                                        className="w-1/3 p-3 flex flex-col gap-3 transition-colors duration-300"
                                                        style={{ backgroundColor: newTenant.secondaryColor || '#2c3e50' }}
                                                    >
                                                        {/* Logo / Brand */}
                                                        <div className="mb-2">
                                                            {newTenant.logoUrl ? (
                                                                <img src={newTenant.logoUrl} alt="Logo" className="w-10 h-10 object-contain mx-auto bg-white/10 rounded p-1" />
                                                            ) : (
                                                                <div className="h-10 w-10 mx-auto bg-white/20 rounded flex items-center justify-center font-bold text-white">
                                                                    {newTenant.name?.substring(0, 2).toUpperCase() || 'GYM'}
                                                                </div>
                                                            )}
                                                            <div className="text-center font-bold text-xs mt-2 break-words" style={{ color: newTenant.textColor || '#ffffff' }}>
                                                                {newTenant.sidebarText || newTenant.name || 'Your Gym'}
                                                            </div>
                                                        </div>

                                                        {/* Menu Items */}
                                                        <div className="space-y-1">
                                                            <div
                                                                className="p-2 rounded text-[10px] font-bold shadow-sm"
                                                                style={{
                                                                    backgroundColor: newTenant.menuActiveColor || '#000000',
                                                                    color: newTenant.textColor || '#ffffff'
                                                                }}
                                                            >
                                                                Dashboard
                                                            </div>
                                                            <div
                                                                className="p-2 rounded text-[10px] opacity-80"
                                                                style={{
                                                                    backgroundColor: newTenant.menuHoverColor || 'transparent',
                                                                    color: newTenant.textColor || '#ffffff'
                                                                }}
                                                            >
                                                                Miembros (Hover)
                                                            </div>
                                                            <div className="p-2 rounded text-[10px] opacity-60 flex gap-2 items-center" style={{ color: newTenant.textColor || '#ffffff' }}>
                                                                <span>Instructores</span>
                                                            </div>
                                                            <div className="p-2 rounded text-[10px] opacity-60 flex gap-2 items-center" style={{ color: newTenant.textColor || '#ffffff' }}>
                                                                <span>Pagos</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Main Content Preview */}
                                                    <div className="flex-1 bg-slate-50 overflow-y-auto">
                                                        {/* Top Header */}
                                                        <div className="h-12 bg-white shadow-sm flex items-center px-4 justify-between">
                                                            <div className="h-3 w-20 bg-slate-100 rounded"></div>
                                                            <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
                                                        </div>

                                                        <div className="p-4">
                                                            {/* Dashboard Title */}
                                                            <h2 className="text-sm font-bold mb-3" style={{ color: newTenant.dashboardTitleColor || '#000000' }}>
                                                                Panel de Control
                                                            </h2>

                                                            {/* Buttons Preview Grid */}
                                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                                                <button
                                                                    className="text-[10px] font-bold text-white py-2 rounded shadow-sm hover:opacity-90 transition-opacity"
                                                                    style={{ backgroundColor: newTenant.newSaleButtonColor || '#22c55e' }}
                                                                >
                                                                    + Venta
                                                                </button>
                                                                <button
                                                                    className="text-[10px] font-bold text-white py-2 rounded shadow-sm hover:opacity-90 transition-opacity"
                                                                    style={{ backgroundColor: newTenant.newExpenseButtonColor || '#ef4444' }}
                                                                >
                                                                    - Gasto
                                                                </button>
                                                                <button
                                                                    className="text-[10px] font-bold text-white py-2 rounded shadow-sm hover:opacity-90 transition-opacity"
                                                                    style={{ backgroundColor: newTenant.newFiadoButtonColor || '#f59e0b' }}
                                                                >
                                                                    + Fiado
                                                                </button>
                                                                <button
                                                                    className="text-[10px] font-bold text-white py-2 rounded shadow-sm hover:opacity-90 transition-opacity"
                                                                    style={{ backgroundColor: newTenant.newMemberButtonColor || '#3b82f6' }}
                                                                >
                                                                    + Socio
                                                                </button>
                                                                <button
                                                                    className="text-[10px] font-bold text-white py-2 rounded shadow-sm hover:opacity-90 transition-opacity"
                                                                    style={{ backgroundColor: newTenant.newProductButtonColor || '#3b82f6' }}
                                                                >
                                                                    + Prod.
                                                                </button>
                                                                <button
                                                                    className="text-[10px] font-bold text-white py-2 rounded shadow-sm hover:opacity-90 transition-opacity"
                                                                    style={{ backgroundColor: newTenant.saveButtonColor || '#3b82f6' }}
                                                                >
                                                                    Guardar
                                                                </button>
                                                            </div>

                                                            {/* Dummy Content Cards */}
                                                            <div className="space-y-2">
                                                                <div className="bg-white p-2 rounded shadow-sm border border-slate-100">
                                                                    <div className="flex justify-between mb-1">
                                                                        <div className="h-2 w-10 bg-slate-200 rounded"></div>
                                                                        <div className="h-2 w-4 bg-green-200 rounded"></div>
                                                                    </div>
                                                                    <div className="h-4 w-16 bg-slate-100 rounded mb-1"></div>
                                                                </div>
                                                                <div className="bg-white p-2 rounded shadow-sm border border-slate-100">
                                                                    <div className="flex justify-between mb-1">
                                                                        <div className="h-2 w-10 bg-slate-200 rounded"></div>
                                                                    </div>
                                                                    <div className="h-4 w-16 bg-slate-100 rounded mb-1"></div>
                                                                </div>
                                                                <div className="bg-white p-2 rounded shadow-sm border border-slate-100 opacity-50">
                                                                    <div className="h-2 w-full bg-slate-100 rounded"></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-3 text-center leading-relaxed">
                                                Esta vista previa muestra cómo se aplicarán los colores seleccionados en la estructura principal del dashboard.
                                            </p>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default SuperAdminDashboard;
