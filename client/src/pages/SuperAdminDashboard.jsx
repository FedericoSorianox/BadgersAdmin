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
                headers: { 'Authorization': `Bearer ${token} ` }
            });
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
                    sidebarText: '',
                    textColor: '#ffffff',
                    menuHoverColor: '',
                    menuActiveColor: '',
                    dashboardTitleColor: '',
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
        setNewTenant({
            name: tenant.name,
            slug: tenant.slug,
            primaryColor: tenant.branding.primaryColor,
            secondaryColor: tenant.branding.secondaryColor,
            primaryColor: tenant.branding.primaryColor,
            secondaryColor: tenant.branding.secondaryColor,
            logoUrl: tenant.branding.logoUrl || '',
            sidebarText: tenant.branding.sidebarText || '',
            textColor: tenant.branding.textColor || '#ffffff',
            menuHoverColor: tenant.branding.menuHoverColor || '',
            menuActiveColor: tenant.branding.menuActiveColor || '',
            menuActiveColor: tenant.branding.menuActiveColor || '',
            dashboardTitleColor: tenant.branding.dashboardTitleColor || '',
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
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                                <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Gimnasio' : 'Crear Nuevo Gimnasio'}</h3>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
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
                                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 p-2 rounded-lg border border-slate-300 transition-colors">
                                            <span className="text-xs font-semibold text-slate-600">Upload</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                        </label>
                                    </div>
                                    {uploading && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
                                </div>

                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h4 className="font-semibold text-slate-700 mb-3">{editingId ? 'Actualizar Credenciales Admin' : 'Usuario Administrador Inicial'}</h4>
                                    <div className="grid grid-cols-2 gap-4">
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Color Primario</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                className="h-10 w-10 rounded-lg cursor-pointer"
                                                value={newTenant.primaryColor}
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Color Secundario</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                className="h-10 w-10 rounded-lg cursor-pointer"
                                                value={newTenant.secondaryColor}
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Color Menu Hover</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                className="h-10 w-10 rounded-lg cursor-pointer"
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
                                                className="h-10 w-10 rounded-lg cursor-pointer"
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
                                                className="h-10 w-10 rounded-lg cursor-pointer"
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
                                </div>

                                {/* Button Colors */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Btn: Nueva Venta</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                className="h-10 w-10 rounded-lg cursor-pointer"
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
                                                className="h-10 w-10 rounded-lg cursor-pointer"
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
                                                className="h-10 w-10 rounded-lg cursor-pointer"
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
                                                className="h-10 w-10 rounded-lg cursor-pointer"
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
                                                className="h-10 w-10 rounded-lg cursor-pointer"
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
                                                className="h-10 w-10 rounded-lg cursor-pointer"
                                                value={newTenant.saveButtonColor || '#3b82f6'}
                                                onChange={e => setNewTenant({ ...newTenant, saveButtonColor: e.target.value })}
                                            />
                                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={newTenant.saveButtonColor || ''} onChange={e => setNewTenant({ ...newTenant, saveButtonColor: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                {/* Extended Branding Text/Logos */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Texto del Menu (Sidebar)</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Cobra Kai Admin"
                                            className="w-full p-2 border border-slate-200 rounded-lg"
                                            value={newTenant.sidebarText}
                                            onChange={e => setNewTenant({ ...newTenant, sidebarText: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Color Texto Menu</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                className="h-10 w-10 rounded-lg cursor-pointer"
                                                value={newTenant.textColor}
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


                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md"
                                    >
                                        {editingId ? 'Guardar Cambios' : 'Crear Gimnasio'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default SuperAdminDashboard;
