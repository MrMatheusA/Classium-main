import React, { useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Filter, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  BarChart3, 
  Plus, 
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';

interface CommercialPartnerItem {
  id: string;
  name: string;
  category: string;
  plan: 'Prata' | 'Ouro' | 'Diamante';
  status: 'Ativo' | 'Pendente' | 'Bloqueado';
  clicks: number;
  revenueMonthly: number;
  contact: string;
}

const INITIAL_PARTNERS: CommercialPartnerItem[] = [
  {
    id: '1',
    name: 'Papelaria & Livraria Cultura Escolar',
    category: 'Material & Livros',
    plan: 'Diamante',
    status: 'Ativo',
    clicks: 1420,
    revenueMonthly: 350.00,
    contact: 'contato@culturaescolar.com.br'
  },
  {
    id: '2',
    name: 'Instituto PsicoPedagógico Aprender Bem',
    category: 'Saúde & Psicopedagogia',
    plan: 'Ouro',
    status: 'Ativo',
    clicks: 890,
    revenueMonthly: 250.00,
    contact: 'clinica@aprenderbem.com.br'
  },
  {
    id: '3',
    name: 'Centro de Idiomas Global English',
    category: 'Idiomas & Cursos',
    plan: 'Prata',
    status: 'Pendente',
    clicks: 120,
    revenueMonthly: 150.00,
    contact: 'matriculas@globalenglish.com'
  }
];

export function CommercialAdminModule() {
  const { addAuditLog } = usePlatform();
  const [partners, setPartners] = useState<CommercialPartnerItem[]>(INITIAL_PARTNERS);
  const [filterText, setFilterText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'Todos' | 'Ativo' | 'Pendente'>('Todos');

  const filtered = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(filterText.toLowerCase()) || p.category.toLowerCase().includes(filterText.toLowerCase());
    const matchesStatus = selectedStatus === 'Todos' || p.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = (id: string) => {
    setPartners(prev => prev.map(p => {
      if (p.id === id) {
        const nextStatus = p.status === 'Ativo' ? 'Pendente' : 'Ativo';
        if (addAuditLog) {
          addAuditLog('TOGGLE_PARTNER_STATUS', 'Ecossistema Comercial', `Parceiro: ${p.name}`, `Status: ${nextStatus}`);
        }
        return { ...p, status: nextStatus as any };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Parceiros Homologados</span>
            <Building2 className="w-4 h-4 text-gold" />
          </div>
          <p className="text-2xl font-serif font-bold text-white">
            {partners.filter(p => p.status === 'Ativo').length}
          </p>
          <span className="text-[10px] text-emerald-400 font-mono">100% integrados à rede</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total de Cliques & Leads</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-serif font-bold text-white">
            {partners.reduce((acc, p) => acc + p.clicks, 0).toLocaleString('pt-BR')}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">Últimos 30 dias</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Receita de Patrocínio</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-serif font-bold text-emerald-400 font-mono">
            R$ {partners.reduce((acc, p) => acc + p.revenueMonthly, 0).toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">Previsão mensal</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gold" />
              Gestão de Convênios & Anunciantes
            </h3>
            <p className="text-xs text-slate-400">Homologação e controle de empresas do Guia de Benefícios</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar parceiro..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-gold/50"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold/50"
            >
              <option value="Todos">Todos</option>
              <option value="Ativo">Ativos</option>
              <option value="Pendente">Pendentes</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Parceiro / Empresa</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Plano</th>
                <th className="py-3 px-3">Cliques</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-850/40 transition-colors">
                  <td className="py-3 px-3">
                    <p className="font-bold text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{p.contact}</p>
                  </td>
                  <td className="py-3 px-3 text-slate-300">{p.category}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-gold border border-gold/30">
                      {p.plan}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-200">{p.clicks}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'Ativo'
                        ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                        : 'bg-amber-950 border border-amber-800 text-amber-400'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleToggleStatus(p.id)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] rounded-lg transition-colors"
                    >
                      {p.status === 'Ativo' ? 'Suspender' : 'Aprovar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
