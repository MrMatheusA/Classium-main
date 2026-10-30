import React, { useState, useEffect } from 'react';
import { usePlatform, PartnerAd, mapCanonicalPartnerToPartnerAd } from '../../context/PlatformContext';
import { PartnerPersistenceService } from '../../services/partnerPersistenceService';
import { PartnerService, UpdatePartnerPayload } from '../../services/partnerService';
import { 
  LayoutDashboard, UserCheck, CreditCard, Image as ImageIcon, Sparkles, 
  Eye, MousePointer, Users, CheckCircle2, AlertCircle, ShieldCheck, 
  LogOut, Save, RefreshCw, XCircle, Award, ExternalLink, Lock, KeyRound, 
  FileText, MessageSquare, Plus, Trash2, Edit3, ShieldAlert
} from 'lucide-react';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

interface PartnerPortalDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PartnerPortalDashboard({ isOpen, onClose }: PartnerPortalDashboardProps) {
  const { currentPartner: platformPartner, setCurrentPartner, updatePartnerAd, logoutPartner, changePartnerPassword, addAuditLog } = usePlatform();

  const currentPartner = platformPartner || PartnerPersistenceService.loadCurrentPartnerSession();

  useEffect(() => {
    if (!platformPartner && currentPartner) {
      setCurrentPartner(currentPartner);
    }
  }, [platformPartner, currentPartner, setCurrentPartner]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'card' | 'banner' | 'logo' | 'plan' | 'security'>('dashboard');

  // Local Form States synchronized with currentPartner
  const [partnerForm, setPartnerForm] = useState<Partial<PartnerAd>>(currentPartner || {});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');
  
  useEffect(() => {
    if (currentPartner) {
      setPartnerForm(prev => ({ ...currentPartner, ...prev }));
    }
  }, [currentPartner?.id]);

  // Security Form State
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(currentPartner?.twoFactorEnabled || false);

  if (!isOpen || !currentPartner) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    if (!currentPartner || !currentPartner.id || !isValidUUID(currentPartner.id)) {
      setSaveErrorMsg('Não foi possível identificar um parceiro válido com ID canônico (UUID).');
      return;
    }

    setIsSaving(true);

    try {
      // 1. Obter o registro canônico real do banco de dados imediatamente antes de montar o payload
      const canonical = await PartnerService.getPartnerById(currentPartner.id);

      // 2. Base de preservação integral do metadata canônico existente (sem perdas de chaves e sem defaults sintéticos)
      const baseMetadata: Record<string, unknown> = {
        ...(canonical.metadata || {})
      };

      // 3. Modificar exclusivamente os campos de apresentação permitidos pelo formulário
      const updatedMetadata: Record<string, unknown> = {
        ...baseMetadata
      };

      if (partnerForm.location !== undefined) {
        updatedMetadata.location = partnerForm.location;
      }
      if (partnerForm.subCategory !== undefined) {
        updatedMetadata.subCategory = partnerForm.subCategory;
      }
      if (partnerForm.price !== undefined) {
        updatedMetadata.price = partnerForm.price;
      }
      if (partnerForm.discountBadge !== undefined) {
        updatedMetadata.discountBadge = partnerForm.discountBadge;
      }
      if (partnerForm.primaryButtonText !== undefined) {
        updatedMetadata.primaryButtonText = partnerForm.primaryButtonText;
      }
      if (partnerForm.banner !== undefined) {
        updatedMetadata.banner = partnerForm.banner;
      }
      if (partnerForm.promoText !== undefined) {
        updatedMetadata.promoText = partnerForm.promoText;
      }
      if (partnerForm.logo !== undefined) {
        updatedMetadata.logo = partnerForm.logo;
      }
      if (partnerForm.sealText !== undefined) {
        updatedMetadata.sealText = partnerForm.sealText;
      }

      // 4. Montar o payload canônico para PUT /api/partners/:id (somente campos cadastrais diretos e metadata canônico atualizado)
      const updatePayload: UpdatePartnerPayload = {
        partner_name: (partnerForm.name !== undefined ? partnerForm.name : (canonical.partner_name || '')).trim(),
        email: partnerForm.email !== undefined ? partnerForm.email.trim() : (canonical.email || null),
        phone: partnerForm.whatsapp !== undefined ? partnerForm.whatsapp.trim() : (canonical.phone || null),
        website: partnerForm.website !== undefined ? partnerForm.website.trim() : (canonical.website || null),
        description: partnerForm.description !== undefined ? partnerForm.description.trim() : (canonical.description || null),
        metadata: updatedMetadata
      };

      // 5. Persistência real através da API canônica
      const updatedCanonical = await PartnerService.updatePartner(
        currentPartner.id,
        updatePayload
      );

      // 6. Converter o CanonicalPartner retornado para ViewModel e sincronizar a interface
      const updatedViewModel = mapCanonicalPartnerToPartnerAd(updatedCanonical);
      updatePartnerAd(updatedViewModel);
      setCurrentPartner(updatedViewModel);
      setPartnerForm(updatedViewModel);

      // 7. Atualizar cache de sessão auxiliar
      PartnerPersistenceService.saveCurrentPartnerSession(updatedViewModel);

      setSaveSuccessMsg('Alterações salvas com sucesso no banco de dados.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('[PartnerPortalDashboard] Erro ao persistir dados do parceiro:', err);
      setSaveErrorMsg('Não foi possível salvar as alterações. Tente novamente.');
      setTimeout(() => setSaveErrorMsg(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPass.length < 6) {
      setPassError('A nova senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setPassError('A confirmação de senha não confere com a nova senha.');
      return;
    }

    const res = changePartnerPassword(currentPartner.id, newPass);
    if (res.success) {
      setPassSuccess('Sua senha foi alterada com sucesso!');
      setNewPass('');
      setConfirmPass('');
      setCurrPass('');
    } else {
      setPassError(res.error || 'Erro ao alterar senha.');
    }
  };

  const handleToggle2FA = () => {
    const nextState = !twoFactorEnabled;
    setTwoFactorEnabled(nextState);
    updatePartnerAd({
      ...currentPartner,
      twoFactorEnabled: nextState,
      twoFactorMethod: 'email'
    });
    addAuditLog('TOGGLE_PARTNER_2FA', 'Portal do Parceiro', `Parceiro: ${currentPartner.name}`, `2FA ${nextState ? 'Ativado' : 'Desativado'}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto animate-fade-in text-left">
      <div className="bg-slate-900 border-2 border-gold/40 rounded-3xl max-w-6xl w-full h-[90vh] flex flex-col text-white shadow-2xl relative overflow-hidden">
        
        {/* TOP BAR BRANDING & SECURITY HEADER */}
        <div className="bg-slate-950 border-b border-slate-800 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <img 
              src={currentPartner.logo || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150'} 
              alt={currentPartner.name}
              className="w-10 h-10 rounded-xl object-cover border border-amber-500/50 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg text-white">{currentPartner.name}</h2>
                <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Plano {currentPartner.plan}
                </span>
                <span className="bg-emerald-950 border border-emerald-700 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Conta Ativa
                </span>
              </div>
              <p className="text-xs text-slate-400">
                CPF/CNPJ: <span className="font-mono text-slate-200">{currentPartner.cpfCnpj || '12.345.678/0001-90'}</span> • Perfil: <strong className="text-amber-400">ROLE_PARTNER</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Isolamento Total RBAC</span>
            </div>

            <button
              onClick={() => { logoutPartner(); onClose(); }}
              className="px-3.5 py-2 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT WITH SIDEBAR */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="w-full md:w-64 bg-slate-950/60 border-r border-slate-800/80 p-3 flex md:flex-col gap-1 overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-amber-400" /> Dashboard
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4 text-blue-400" /> Meu Perfil
            </button>

            <div className="pt-2 pb-1 text-[10px] uppercase font-bold text-slate-500 px-3 tracking-widest hidden md:block">
              Gestão de Anúncio
            </div>

            <button
              onClick={() => setActiveTab('card')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'card'
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Edit3 className="w-4 h-4 text-emerald-400" /> Editar Card
            </button>

            <button
              onClick={() => setActiveTab('banner')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'banner'
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-purple-400" /> Editar Banner
            </button>

            <button
              onClick={() => setActiveTab('logo')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'logo'
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Award className="w-4 h-4 text-yellow-400" /> Editar Logo / Foto
            </button>

            <div className="pt-2 pb-1 text-[10px] uppercase font-bold text-slate-500 px-3 tracking-widest hidden md:block">
              Assinatura & Segurança
            </div>

            <button
              onClick={() => setActiveTab('plan')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'plan'
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4 text-amber-400" /> Plano & Faturamento
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'security'
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4 text-rose-400" /> Segurança & Senha
            </button>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
            
            {saveSuccessMsg && (
              <div className="p-4 bg-emerald-950/90 border border-emerald-500 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {saveErrorMsg && (
              <div className="p-4 bg-rose-950/90 border border-rose-500 rounded-2xl text-rose-200 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{saveErrorMsg}</span>
              </div>
            )}

            {/* TAB 1: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 text-xs">
                {/* METRICS KPIS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Impressões (Views)</span>
                      <Eye className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="font-serif text-2xl font-black text-white">{currentPartner.views.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-emerald-400 font-bold">+18.4% este mês</p>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Cliques no Anúncio</span>
                      <MousePointer className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="font-serif text-2xl font-black text-white">{currentPartner.clicks.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-emerald-400 font-bold">Taxa CTR: {currentPartner.ctr || '23.4'}%</p>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Leads Recebidos</span>
                      <Users className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="font-serif text-2xl font-black text-white">{currentPartner.leadsGenerated.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-amber-400 font-bold">Famílias & Colégios</p>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Status da Assinatura</span>
                      <Award className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="font-serif text-xl font-black text-emerald-400">{currentPartner.subscriptionStatus || 'Ativa'}</p>
                    <p className="text-[10px] text-slate-400">Plano {currentPartner.plan}</p>
                  </div>
                </div>

                {/* LIVE CARD PREVIEW */}
                <div className="bg-slate-950/80 border border-amber-500/30 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-amber-400 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Pré-visualização do Seu Card em Tempo Real
                    </h3>
                    <span className="text-[11px] text-slate-400">Exibição pública no Marketplace Classium</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 max-w-2xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img src={currentPartner.logo || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150'} alt="" className="w-12 h-12 rounded-xl object-cover border border-amber-500/40" />
                        <div>
                          <h4 className="font-serif font-bold text-base text-white">{currentPartner.name}</h4>
                          <p className="text-xs text-amber-400">{currentPartner.subCategory}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold text-[10px]">
                        {currentPartner.sealText || 'PARCEIRO OFICIAL CLASSIUM'}
                      </span>
                    </div>

                    <p className="text-slate-300 leading-relaxed text-xs">{currentPartner.description}</p>

                    <div className="flex flex-wrap gap-2">
                      {(currentPartner.highlights || []).slice(0, 3).map((hl, i) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-slate-300">
                          ✓ {hl}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400">A partir de</span>
                        <p className="font-serif font-bold text-base text-emerald-400">{currentPartner.price || 'Sob Consulta'}</p>
                      </div>
                      <a 
                        href={currentPartner.website || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-xl font-serif font-bold text-xs uppercase flex items-center gap-1.5"
                      >
                        {currentPartner.primaryButtonText || 'CONHECER PARCEIRO'} <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* RECENT LEADS */}
                <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h3 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" /> Famílias & Professores Interessados (Leads Recebidos)
                  </h3>

                  <div className="space-y-2">
                    {(currentPartner.leadsList || []).map((lead) => (
                      <div key={lead.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-white">{lead.name}</h5>
                          <p className="text-slate-400 text-[11px]">{lead.email} • {lead.phone}</p>
                          <p className="text-slate-300 text-[11px] mt-1">"{lead.message}"</p>
                        </div>
                        <a 
                          href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=Olá ${lead.name}, sou da equipe da ${currentPartner.name} via Portal Classium!`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Falar no WhatsApp
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MEU PERFIL */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <h3 className="font-serif font-bold text-base text-amber-400">Informações Cadastrais da Empresa / Profissional</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Razão Social / Nome de Exibição</label>
                    <input 
                      type="text"
                      value={partnerForm.name || ''}
                      onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">CPF ou CNPJ (Restrito/Inalterável)</label>
                    <input 
                      type="text"
                      value={partnerForm.cpfCnpj || currentPartner.cpfCnpj || ''}
                      disabled
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-slate-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">E-mail Corporativo</label>
                    <input 
                      type="email"
                      value={partnerForm.email || ''}
                      onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">WhatsApp Comercial</label>
                    <input 
                      type="text"
                      value={partnerForm.whatsapp || ''}
                      onChange={(e) => setPartnerForm({ ...partnerForm, whatsapp: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Website Oficial</label>
                    <input 
                      type="text"
                      value={partnerForm.website || ''}
                      onChange={(e) => setPartnerForm({ ...partnerForm, website: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Localização / Abrangência</label>
                    <input 
                      type="text"
                      value={partnerForm.location || ''}
                      onChange={(e) => setPartnerForm({ ...partnerForm, location: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Descrição Oficial do Seu Serviço / Produto</label>
                  <textarea 
                    rows={4}
                    value={partnerForm.description || ''}
                    onChange={(e) => setPartnerForm({ ...partnerForm, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-serif font-black uppercase tracking-wider flex items-center gap-2 shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'SALVANDO DADOS...' : 'SALVAR DADOS DO PERFIL'}
                </button>
              </form>
            )}

            {/* TAB 3: EDITAR CARD */}
            {activeTab === 'card' && (
              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <h3 className="font-serif font-bold text-base text-emerald-400">Editar Conteúdo do Card de Exibição</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Subtítulo / Slogan de Apresentação</label>
                    <input 
                      type="text"
                      value={partnerForm.subCategory || ''}
                      onChange={(e) => setPartnerForm({ ...partnerForm, subCategory: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Preço / Valor de Referência</label>
                    <input 
                      type="text"
                      value={partnerForm.price || ''}
                      onChange={(e) => setPartnerForm({ ...partnerForm, price: e.target.value })}
                      placeholder="Ex: R$ 89,90 / sessão"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Selo / Badge de Desconto Exclusivo</label>
                    <input 
                      type="text"
                      value={partnerForm.discountBadge || ''}
                      onChange={(e) => setPartnerForm({ ...partnerForm, discountBadge: e.target.value })}
                      placeholder="Ex: 20% OFF Exclusivo Classium"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Texto do Botão Principal</label>
                    <input 
                      type="text"
                      value={partnerForm.primaryButtonText || ''}
                      onChange={(e) => setPartnerForm({ ...partnerForm, primaryButtonText: e.target.value })}
                      placeholder="Ex: CONHECER PARCEIRO"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-serif font-black uppercase tracking-wider flex items-center gap-2 shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'ATUALIZANDO CARD...' : 'ATUALIZAR CARD NO MARKETPLACE'}
                </button>
              </form>
            )}

            {/* TAB 4: EDITAR BANNER */}
            {activeTab === 'banner' && (
              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <h3 className="font-serif font-bold text-base text-purple-400">Personalização de Banner & Visual</h3>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">URL da Imagem do Banner de Capa</label>
                  <input 
                    type="text"
                    value={partnerForm.banner || ''}
                    onChange={(e) => setPartnerForm({ ...partnerForm, banner: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono text-xs"
                  />
                  {partnerForm.banner && (
                    <img src={partnerForm.banner} alt="Preview Banner" className="w-full h-32 object-cover rounded-xl mt-2 border border-slate-800" />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Texto Promocional do Banner</label>
                  <input 
                    type="text"
                    value={partnerForm.promoText || ''}
                    onChange={(e) => setPartnerForm({ ...partnerForm, promoText: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-serif font-black uppercase tracking-wider flex items-center gap-2 shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'SALVANDO BANNER...' : 'SALVAR BANNER'}
                </button>
              </form>
            )}

            {/* TAB 5: EDITAR LOGO */}
            {activeTab === 'logo' && (
              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <h3 className="font-serif font-bold text-base text-yellow-400">Logo e Identidade Visual</h3>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">URL da Logo / Imagem de Marca</label>
                  <input 
                    type="text"
                    value={partnerForm.logo || ''}
                    onChange={(e) => setPartnerForm({ ...partnerForm, logo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono text-xs"
                  />
                  {partnerForm.logo && (
                    <img src={partnerForm.logo} alt="Preview Logo" className="w-20 h-20 object-cover rounded-2xl mt-2 border border-amber-500/50" />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Texto do Selo de Homologação</label>
                  <input 
                    type="text"
                    value={partnerForm.sealText || ''}
                    onChange={(e) => setPartnerForm({ ...partnerForm, sealText: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-serif font-black uppercase tracking-wider flex items-center gap-2 shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'SALVANDO LOGO...' : 'SALVAR LOGO'}
                </button>
              </form>
            )}

            {/* TAB 6: PLANO & FATURAMENTO */}
            {activeTab === 'plan' && (
              <div className="space-y-6 text-xs">
                <div className="bg-gradient-to-r from-amber-950/80 to-yellow-950/40 border border-amber-500/40 p-6 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-amber-400 font-bold uppercase tracking-widest text-[10px]">Plano Atual</span>
                      <h3 className="font-serif font-bold text-2xl text-white">Plano {currentPartner.plan}</h3>
                    </div>
                    <span className="px-4 py-1.5 bg-emerald-500 text-slate-950 rounded-full font-black text-xs uppercase">
                      {currentPartner.subscriptionStatus || 'Ativa'}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">
                    Sua assinatura inclui posicionamento prioritário, selo oficial de homologação, leads ilimitados de escolas parceiras e estatísticas avançadas em tempo real.
                  </p>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => alert('Solicitação de renovação/upgrade registrada com sucesso. O gestor financeiro entrará em contato.')}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-serif font-bold text-xs uppercase rounded-xl shadow-md hover:brightness-110"
                    >
                      Renovar / Upgrade de Plano
                    </button>
                    <button 
                      onClick={() => alert('Sua solicitação de cancelamento foi aberta. Nossa equipe de relacionamento parceiro entrará em contato.')}
                      className="px-4 py-2.5 bg-slate-900 border border-red-800 text-red-300 font-bold text-xs rounded-xl hover:bg-red-950/50"
                    >
                      Cancelar Assinatura
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <h4 className="font-serif font-bold text-white text-sm">Histórico de Faturamento</h4>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2">Fatura ID</th>
                        <th className="py-2">Data</th>
                        <th className="py-2">Valor</th>
                        <th className="py-2">Plano</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(currentPartner.billingHistory || [
                        { id: 'f-101', date: '2026-07-01', amount: 'R$ 299,00', status: 'Pago', plan: currentPartner.plan },
                        { id: 'f-100', date: '2026-06-01', amount: 'R$ 299,00', status: 'Pago', plan: currentPartner.plan }
                      ]).map(f => (
                        <tr key={f.id} className="border-b border-slate-800/50">
                          <td className="py-2.5 font-mono text-slate-300">{f.id}</td>
                          <td className="py-2.5">{f.date}</td>
                          <td className="py-2.5 font-bold text-emerald-400">{f.amount}</td>
                          <td className="py-2.5">{f.plan}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full font-bold text-[10px]">
                              {f.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 7: SEGURANÇA */}
            {activeTab === 'security' && (
              <div className="space-y-6 text-xs">
                <form onSubmit={handleChangePasswordSubmit} className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h3 className="font-serif font-bold text-rose-400 text-sm flex items-center gap-2">
                    <KeyRound className="w-4 h-4" /> Alterar Senha de Acesso
                  </h3>

                  {passError && <div className="p-3 bg-red-950 border border-red-700 text-red-200 rounded-xl">{passError}</div>}
                  {passSuccess && <div className="p-3 bg-emerald-950 border border-emerald-700 text-emerald-200 rounded-xl">{passSuccess}</div>}

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Nova Senha</label>
                    <input 
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Confirmar Nova Senha</label>
                    <input 
                      type="password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="py-3 px-6 bg-gradient-to-r from-rose-600 to-red-600 text-white font-serif font-black uppercase tracking-wider rounded-xl shadow-md hover:brightness-110"
                  >
                    ALTERAR SENHA
                  </button>
                </form>

                <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-white text-sm">Autenticação de Dois Fatores (2FA)</h4>
                      <p className="text-slate-400 text-[11px]">Exigir código temporário enviado por e-mail no login.</p>
                    </div>
                    <button
                      onClick={handleToggle2FA}
                      className={`px-4 py-2 rounded-xl font-bold text-xs uppercase transition-all ${
                        twoFactorEnabled
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {twoFactorEnabled ? '2FA ATIVADO' : 'ATIVAR 2FA'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>

      </div>
    </div>
  );
}
