import { useState, useEffect } from 'react';
import { Search, Plus, Package, AlertTriangle, CheckCircle, Loader2, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';

const Inventory = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        costPrice: 0,
        salePrice: 0,
        stock: 0,
        imageUrl: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/products`);
            setProducts(res.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Error al cargar inventario.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                category: product.category || '',
                costPrice: product.costPrice,
                salePrice: product.salePrice,
                stock: product.stock,
                imageUrl: product.imageUrl || ''
            });
            setImagePreview(product.imageUrl ? `${API_URL}${product.imageUrl}` : null);
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                category: '',
                costPrice: 0,
                salePrice: 0,
                stock: 0,
                imageUrl: ''
            });
            setImagePreview(null);
        }
        setImageFile(null);
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.name);
            formDataToSend.append('category', formData.category);
            formDataToSend.append('costPrice', formData.costPrice);
            formDataToSend.append('salePrice', formData.salePrice);
            formDataToSend.append('stock', formData.stock);

            if (imageFile) {
                formDataToSend.append('image', imageFile);
            }

            if (editingProduct) {
                await axios.put(`${API_URL}/api/products/${editingProduct._id}`, formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post(`${API_URL}/api/products`, formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            setModalOpen(false);
            fetchProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error al guardar producto');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;

        try {
            await axios.delete(`${API_URL}/api/products/${id}`);
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error al eliminar producto');
        }
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate Stats
    const totalProducts = products.length;
    const inventoryValue = products.reduce((acc, curr) => acc + (curr.costPrice * curr.stock), 0);
    const criticalStock = products.filter(p => p.stock <= 5).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Inventario</h1>
                    <p className="text-slate-500 mt-1">Control de stock y productos.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    style={{ backgroundColor: 'var(--btn-new-product, #2563eb)' }}
                    className="text-white hover:brightness-90 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm"
                >
                    <Plus size={20} />
                    Nuevo Producto
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="animate-spin text-blue-600" size={40} />
                </div>
            ) : error ? (
                <div className="p-8 text-center text-red-500">
                    <p>{error}</p>
                    <button onClick={fetchProducts} className="mt-4 text-blue-600 underline">Intentar nuevamente</button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <Package size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Total Productos</p>
                                <p className="text-2xl font-bold text-slate-800">{totalProducts}</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Stock Crítico</p>
                                <p className="text-2xl font-bold text-slate-800">{criticalStock}</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Valor Inventario</p>
                                <p className="text-2xl font-bold text-slate-800">${inventoryValue.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between gap-4">
                            <div className="relative max-w-md flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar producto..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button onClick={fetchProducts} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors" title="Recargar">
                                <RefreshCw size={18} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Producto</th>
                                        <th className="px-6 py-4">Categoría</th>
                                        <th className="px-6 py-4 text-right">Costo</th>
                                        <th className="px-6 py-4 text-right">Precio Venta</th>
                                        <th className="px-6 py-4 text-right">Ganancia</th>
                                        <th className="px-6 py-4 text-center">Stock</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredProducts.map((product) => {
                                        const profit = (product.salePrice || 0) - (product.costPrice || 0);
                                        return (
                                            <tr key={product._id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-700">
                                                    {product.name}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">
                                                    {product.category || 'General'}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-500">
                                                    ${product.costPrice}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-700">
                                                    ${product.salePrice}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-green-600">
                                                    ${profit}
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono font-medium">
                                                    {product.stock}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold
                                                        ${product.stock <= 3 ? 'bg-red-100 text-red-600' :
                                                            product.stock <= 7 ? 'bg-amber-100 text-amber-600' :
                                                                'bg-green-100 text-green-600'}`}>
                                                        {product.stock <= 3 ? 'Crítico' : product.stock <= 7 ? 'Bajo' : 'Normal'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleOpenModal(product)}
                                                        className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-all mr-1"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product._id)}
                                                        className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Modal for Add/Edit Product */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">
                            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio Costo</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={formData.costPrice}
                                        onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio Venta</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={formData.salePrice}
                                        onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Imagen del Producto</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setImageFile(file);
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setImagePreview(reader.result);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </div>

                            {imagePreview && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Vista Previa</label>
                                    <div className="flex justify-center p-4 bg-slate-50 rounded-lg">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="h-32 w-32 object-cover rounded-lg border-2 border-slate-200 shadow"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    style={{ backgroundColor: 'var(--btn-save, #2563eb)' }}
                                    className="flex-1 px-4 py-2 text-white rounded-lg hover:brightness-90 transition-all"
                                >
                                    {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
