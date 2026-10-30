import React from 'react';
import { X, TrendingUp, Eye, MousePointerClick, Plus, Sparkles, BarChart3, CheckCircle2, ShieldCheck } from 'lucide-react';

interface AdvertiserDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewRegistration?: () => void;
}

export function AdvertiserDashboardModal({ isOpen, onClose, onOpenNewRegistration }: AdvertiserDashboardModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-gold/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-left overflow-hidden space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-gold rounded-xl border border-gold/30">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-white">Painel do Anunciante & Parceiro</h3>
              <p className="text-[11px] text-slate-400">Métricas de visibilidade e engajamento da comunidade escolar</p>
            </div>
          </div>
          {onOpenNewRegistration && (
            <button
              onClick={() => {
                onClose();
                onOpenNewRegistration();
              }}
              className="px-3 py-1.5 bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold text-xs rounded-xl hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Anúncio
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Eye className="w-4 h-4 text-blue-400" />
              <span>Impressões</span>
            </div>
            <p className="text-xl font-bold font-mono text-white">12.480</p>
            <span className="text-[10px] text-emerald-400 font-mono">+18% este mês</span>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <MousePointerClick className="w-4 h-4 text-gold" />
              <span>Cliques & Contatos</span>
            </div>
            <p className="text-xl font-bold font-mono text-white">438</p>
            <span className="text-[10px] text-emerald-400 font-mono">CTR 3.5%</span>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Status Selo</span>
            </div>
            <p className="text-sm font-bold text-emerald-400 mt-1">Homologado</p>
            <span className="text-[10px] text-slate-400 font-mono">Plano Diamante</span>
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Campanhas Ativas</h4>
          <div className="divide-y divide-slate-800/80">
            <div className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-200">Destaque Guia de Descontos & Benefícios</p>
                <p className="text-[10px] text-slate-400">Público: 100% dos Docentes e Funcionários da Rede</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-mono">
                Ativo
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-200">Vitrine Marketplace Família</p>
                <p className="text-[10px] text-slate-400">Público: Pais e Responsáveis Cadastrados</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-mono">
                Ativo
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
