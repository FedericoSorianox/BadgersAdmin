import React from 'react';
import { Search, Filter } from 'lucide-react';

const MemberFilters = ({
    searchTerm,
    setSearchTerm,
    filterNotWhatsapp,
    setFilterNotWhatsapp
}) => {
    return (
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-4">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o cédula..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button
                onClick={() => setFilterNotWhatsapp(!filterNotWhatsapp)}
                className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-medium transition-all ${filterNotWhatsapp
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                title="Ver solo los que NO están en el grupo"
            >
                <Filter size={20} />
                <span className="hidden sm:inline">{filterNotWhatsapp ? 'Faltan en Grupo' : 'Filtrar WhatsApp'}</span>
            </button>
        </div>
    );
};

export default MemberFilters;
