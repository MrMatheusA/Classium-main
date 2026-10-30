import React, { useState } from 'react';
import { X, Building2, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';

interface CommercialEcosystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessOpenDashboard?: () => void;
}

export function CommercialEcosystemModal({
  isOpen,
  onClose,
  onSuccessOpenDashboard
}: CommercialEcosystemModalProps) {
  const { addAuditLog } = usePlatform();
  const [formData, setFormData] = useState({
    companyName: '',
    cnpj: '',
    contactName: '',
    email: '',
    phone: '',
    category: 'educacional',
    plan: 'ouro'
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addAuditLog) {
      addAuditLog('SUBMIT_ECOSYSTEM_PROPOSAL', 'Ecossistema Comercial', 'Nova Proposta', formData.companyName);
    }
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-gold/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-left overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-serif font-bold text-white">Proposta Enviada com Sucesso!</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              A proposta para a empresa <strong>{formData.companyName}</strong> foi protocolada. Você pode agora visualizar seu painel de parceiro preliminar.
            </p>
            <div className="pt-3 flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Fechar
              </button>
              {onSuccessOpenDashboard && (
                <button
                  onClick={() => {
                    onClose();
                    onSuccessOpenDashboard();
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-110 transition-all"
                >
                  Abrir Painel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 bg-amber-500/10 text-gold rounded-xl border border-gold/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-white">Novo Anunciante / Parceiro</h3>
                <p className="text-[11px] text-slate-400">Cadastrar empresa parceira para convênios e anúncios</p>
              </div>
            </div>

            <div className="border-t border-slate-800 my-4" />

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Razão Social / Nome Fantasia
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Livraria & Papelaria Saber Ltda"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    CNPJ / Documento
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="00.000.000/0001-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Plano de Convênio
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400/60"
                  >
                    <option value="prata">Plano Prata (Básico)</option>
                    <option value="ouro">Plano Ouro (Recomendado)</option>
                    <option value="diamante">Plano Diamante (Destaque Total)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Responsável de Contato
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do representante"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Telefone Comercial
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 3333-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  E-mail de Notificação
                </label>
                <input
                  type="email"
                  required
                  placeholder="comercial@empresa.com.br"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <span>Protocolar Convênio</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
