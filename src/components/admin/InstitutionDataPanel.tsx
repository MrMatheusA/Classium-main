import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { usePlatform } from '../../context/PlatformContext';
import { 
  Building, RefreshCw, Save, CheckCircle2, AlertTriangle, 
  Globe, Phone, Mail, FileText, Image as ImageIcon, Lock, Unlock, 
  Sparkles, AlertCircle, ShieldCheck, X, Smartphone, Hash, Radio,
  MapPin, Shield, Users, Award
} from 'lucide-react';
import { institutionService, InstitutionData } from '../../services/institutionService';

interface InstitutionDataPanelProps {
  className?: string;
}

type QuickActionTab = 'cadastrais' | 'endereco' | 'termos' | 'gestao';

export function InstitutionDataPanel({ className = '' }: InstitutionDataPanelProps) {
  const { currentUser } = usePlatform();
  const activeOrgId = currentUser?.organizationId || '11111111-1111-1111-1111-111111111111';

  const [activeSubTab, setActiveSubTab] = useState<QuickActionTab>('cadastrais');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [canEdit, setCanEdit] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [org, setOrg] = useState<InstitutionData | null>(null);

  // Form states matching school profile requirements
  const [officialName, setOfficialName] = useState<string>('');
  const [fantasyName, setFantasyName] = useState<string>('');
  const [cnpj, setCnpj] = useState<string>('');
  const [stateRegistration, setStateRegistration] = useState<string>('');
  const [inepCode, setInepCode] = useState<string>('');
  const [phoneFixed, setPhoneFixed] = useState<string>('');
  const [phoneMobile, setPhoneMobile] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [platformUrl, setPlatformUrl] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [operationalStatus, setOperationalStatus] = useState<string>('active');

  // Address & Extra Data
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');

  // Management Team Data
  const [directorName, setDirectorName] = useState<string>('');
  const [coordinatorName, setCoordinatorName] = useState<string>('');
  const [secretaryName, setSecretaryName] = useState<string>('');

  // Format CNPJ mask (00.000.000/0000-00)
  const formatCnpj = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 14);
    if (raw.length <= 2) return raw;
    if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`;
    if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
    if (raw.length <= 12) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
    return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`;
  };

  // Format Phone mask ((00) 00000-0000)
  const formatPhone = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  // Format CEP mask (00000-000)
  const formatCep = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 8);
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  };

  const loadOrganization = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await institutionService.getOrganization(activeOrgId);
      setOrg(data);
      setCanEdit(data.can_edit !== false);

      setOfficialName(data.official_name || data.legal_name || data.name || '');
      setFantasyName(data.fantasy_name || data.trade_name || '');
      setCnpj(data.cnpj || data.document_number || '');
      setStateRegistration(data.state_registration || data.settings?.state_registration || '');
      setInepCode(data.inep_code || data.settings?.inep_code || '');
      setPhoneFixed(data.phone_fixed || data.phone || '');
      setPhoneMobile(data.phone_mobile || data.settings?.phone_mobile || '');
      setEmail(data.email || '');
      setLogoUrl(data.logo_url || '');
      setPlatformUrl(data.platform_url || data.settings?.platform_url || 'https://classium.edu.br/portal');
      setWebsite(data.website || data.settings?.website || '');
      setOperationalStatus(data.status || 'active');

      setAddress(data.address || data.settings?.address || '');
      setCity(data.city || data.settings?.city || '');
      setState(data.state || data.settings?.state || '');
      setPostalCode(data.postal_code || data.settings?.postal_code || '');

      setDirectorName(data.settings?.director_name || '');
      setCoordinatorName(data.settings?.coordinator_name || '');
      setSecretaryName(data.settings?.secretary_name || '');
    } catch (err: any) {
      console.error('[InstitutionDataPanel] load error:', err);
      setErrorMessage('Não foi possível carregar as informações oficiais da escola. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganization();

    // Supabase Realtime Subscriptions for organizations and schools tables
    const orgChannel = supabase
      .channel(`public:org_institution_panel_${activeOrgId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'organizations'
      }, (payload) => {
        console.log('[InstitutionDataPanel] Realtime Organizations update:', payload);
        loadOrganization();
      })
      .subscribe();

    const schoolChannel = supabase
      .channel(`public:schools_institution_panel_${activeOrgId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'schools'
      }, (payload) => {
        console.log('[InstitutionDataPanel] Realtime Schools update:', payload);
        loadOrganization();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orgChannel);
      supabase.removeChannel(schoolChannel);
    };
  }, [activeOrgId]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setToast(null);

    const payload: Partial<InstitutionData> = {
      id: activeOrgId,
      official_name: officialName.trim(),
      legal_name: officialName.trim(),
      name: officialName.trim(),
      fantasy_name: fantasyName.trim(),
      trade_name: fantasyName.trim(),
      cnpj: cnpj.trim(),
      document_number: cnpj.trim(),
      state_registration: stateRegistration.trim(),
      inep_code: inepCode.trim(),
      phone_fixed: phoneFixed.trim(),
      phone: phoneFixed.trim() || phoneMobile.trim(),
      phone_mobile: phoneMobile.trim(),
      email: email.trim(),
      logo_url: logoUrl.trim(),
      platform_url: platformUrl.trim(),
      website: website.trim(),
      status: operationalStatus,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      postal_code: postalCode.trim(),
      settings: {
        ...(org?.settings || {}),
        official_name: officialName.trim(),
        fantasy_name: fantasyName.trim(),
        cnpj: cnpj.trim(),
        state_registration: stateRegistration.trim(),
        inep_code: inepCode.trim(),
        phone_fixed: phoneFixed.trim(),
        phone_mobile: phoneMobile.trim(),
        platform_url: platformUrl.trim(),
        website: website.trim(),
        status: operationalStatus,
        plan_status: org?.plan_status || 'STANDARD',
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
        director_name: directorName.trim(),
        coordinator_name: coordinatorName.trim(),
        secretary_name: secretaryName.trim()
      }
    };

    try {
      const res = await institutionService.updateOrganization(activeOrgId, payload);
      
      // Also sync to public.schools table if present
      try {
        await supabase
          .from('schools')
          .update({
            name: officialName.trim(),
            cnpj: cnpj.trim(),
            phone: phoneFixed.trim() || phoneMobile.trim(),
            email: email.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', activeOrgId);
      } catch (errSchools) {
        // Non-blocking if schools table has different schema
      }

      if (res.success) {
        setOrg(prev => ({ ...prev, ...res.data }));
        setToast({ 
          type: 'success', 
          message: 'Dados cadastrais da escola salvos com sucesso e sincronizados com o Supabase em tempo real!' 
        });
      } else {
        throw new Error(res.error || 'Falha ao salvar dados no Supabase.');
      }
    } catch (err: any) {
      console.error('[InstitutionDataPanel] save error:', err);
      setToast({ 
        type: 'error', 
        message: err.message || 'Erro ao persistir alterações cadastrais no banco de dados.' 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`space-y-6 text-left ${className}`}>
      
      {/* CABEÇALHO DA ESCOLA (Logo, Nome, CNPJ, Status) */}
      <div className="bg-slate-900/90 border border-gold/30 rounded-3xl p-6 md:p-8 backdrop-blur shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7F1D1D] to-slate-900 border border-gold/40 flex items-center justify-center font-serif text-gold font-bold text-2xl shadow-md overflow-hidden shrink-0">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo da Escola" 
                    className="w-full h-full object-contain p-1" 
                    onError={() => setLogoUrl('')} 
                  />
                ) : (
                  <span>{fantasyName ? fantasyName.charAt(0).toUpperCase() : 'C'}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-xl md:text-2xl font-extrabold text-white tracking-tight">
                    {fantasyName || officialName || 'Instituição de Ensino'}
                  </h3>
                  {canEdit ? (
                    <span className="text-[11px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-sans font-semibold flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> Edição Permitida
                    </span>
                  ) : (
                    <span className="text-[11px] bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-full font-sans font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Somente Leitura
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{officialName || 'Razão Social da Escola'}</span>
                  {cnpj && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-slate-300">CNPJ: {cnpj}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* BADGES DE STATUS & REALTIME */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-slate-950/90 border border-slate-800 px-3.5 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Realtime</span>
                <span className="text-xs font-bold text-emerald-400 uppercase font-mono">
                  SUPABASE
                </span>
              </div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 px-3.5 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Plano</span>
                <span className="text-xs font-bold text-white uppercase font-mono">
                  {org?.plan_status || 'STANDARD'}
                </span>
              </div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 px-3.5 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
              <ShieldCheck className={`w-3.5 h-3.5 ${operationalStatus === 'active' ? 'text-emerald-400' : 'text-amber-400'}`} />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Status Operacional</span>
                <span className={`text-xs font-bold font-mono uppercase ${operationalStatus === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {operationalStatus === 'active' ? 'Ativo' : 'Em Manutenção'}
                </span>
              </div>
            </div>

            <button
              onClick={loadOrganization}
              disabled={loading}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Recarregar dados cadastrais do Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-gold' : ''}`} />
              <span>Recarregar</span>
            </button>
          </div>
        </div>

        {/* BADGES DE AÇÃO RÁPIDA (Sub-abas) */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('cadastrais')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'cadastrais'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-gold/20'
                : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Dados Cadastrais</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('endereco')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'endereco'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-gold/20'
                : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Endereço & Unidade</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('termos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'termos'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-gold/20'
                : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Termos de Funcionamento</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('gestao')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'gestao'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-gold/20'
                : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Equipe Gestora</span>
          </button>
        </div>
      </div>

      {/* TOAST FEEDBACK */}
      {toast && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' 
            : 'bg-red-950/80 border-red-500/40 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {errorMessage && (
        <div className="p-6 bg-red-950/40 border border-red-500/40 rounded-3xl space-y-3">
          <div className="flex items-center gap-3 text-red-300">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-red-200">Aviso do Sistema</h3>
              <p className="text-xs text-red-300/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <div className="pt-2">
            <button 
              onClick={loadOrganization}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE DADOS CADASTRAIS COMPLETO */}
      {loading ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
          <RefreshCw className="w-8 h-8 text-gold animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-400">Carregando dados cadastrais oficiais do Supabase...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="w-full">
          <div className="w-full bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
            
            {/* SUB-ABA 1: DADOS CADASTRAIS */}
            {activeSubTab === 'cadastrais' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h4 className="font-serif text-base font-bold text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-gold" /> Identificação & Registro Oficial
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Informações fiscais, cadastrais e de comunicação da escola mantidas no Supabase.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  {/* Razão Social */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-gold" />
                      <span>Nome Oficial / Razão Social (legal_name)</span>
                      <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text"
                      value={officialName}
                      onChange={e => setOfficialName(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="ex: INFOREDE EM VEREADOR JOSÉ FERREIRA DE AGUIAR"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                      required
                    />
                  </div>

                  {/* Nome Fantasia */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>Nome Fantasia / Apelido (trade_name)</span>
                    </label>
                    <input 
                      type="text"
                      value={fantasyName}
                      onChange={e => setFantasyName(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="ex: Escola Municipal Vereador José Ferreira de Aguiar"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    />
                  </div>

                  {/* CNPJ */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>CNPJ / Documento (document_number)</span>
                    </label>
                    <input 
                      type="text"
                      value={cnpj}
                      onChange={e => setCnpj(formatCnpj(e.target.value))}
                      disabled={!canEdit || saving}
                      placeholder="00.000.000/0000-00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    />
                  </div>

                  {/* Inscrição Estadual */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                      <span>Inscrição Estadual (state_registration)</span>
                    </label>
                    <input 
                      type="text"
                      value={stateRegistration}
                      onChange={e => setStateRegistration(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="ex: 123.456.789.110"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    />
                  </div>

                  {/* Telefone Fixo */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Telefone Fixo (phone_fixed)</span>
                    </label>
                    <input 
                      type="text"
                      value={phoneFixed}
                      onChange={e => setPhoneFixed(formatPhone(e.target.value))}
                      disabled={!canEdit || saving}
                      placeholder="(11) 3456-7890"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    />
                  </div>

                  {/* Telefone Celular */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Telefone Celular (phone_mobile)</span>
                    </label>
                    <input 
                      type="text"
                      value={phoneMobile}
                      onChange={e => setPhoneMobile(formatPhone(e.target.value))}
                      disabled={!canEdit || saving}
                      placeholder="(11) 98765-4321"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    />
                  </div>

                  {/* Email Institucional */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Email Institucional (email)</span>
                    </label>
                    <input 
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="contato@joseferreira.educacao.gov.br"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    />
                  </div>

                  {/* Website Oficial */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>Website Oficial (website)</span>
                    </label>
                    <input 
                      type="url"
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="https://joseferreira.educacao.gov.br"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    />
                  </div>

                  {/* URL da Plataforma */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>URL da Plataforma (Web_URL)</span>
                    </label>
                    <input 
                      type="url"
                      value={platformUrl}
                      onChange={e => setPlatformUrl(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="https://classium.edu.br/portal"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    />
                  </div>

                  {/* Status Operacional */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Status Operacional</span>
                    </label>
                    <select
                      value={operationalStatus}
                      onChange={e => setOperationalStatus(e.target.value)}
                      disabled={!canEdit || saving}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <option value="active">Ativo (Operação Regular)</option>
                      <option value="maintenance">Em Manutenção Técnica</option>
                      <option value="inactive">Inativo / Recesso</option>
                    </select>
                  </div>

                  {/* URL do Logotipo */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>URL do Logotipo (Logo_URL)</span>
                    </label>
                    <div className="flex gap-3 items-center">
                      <input 
                        type="text"
                        value={logoUrl}
                        onChange={e => setLogoUrl(e.target.value)}
                        disabled={!canEdit || saving}
                        placeholder="https://exemplo.com/logo-escola.png"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                      />
                      {logoUrl && (
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                          <img src={logoUrl} alt="Preview" className="w-full h-full object-contain p-1" onError={() => setLogoUrl('')} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-ABA 2: ENDEREÇO & UNIDADE */}
            {activeSubTab === 'endereco' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h4 className="font-serif text-base font-bold text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gold" /> Localização & Unidade de Ensino
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Endereço da sede ou unidade escolar para relatórios e diários oficiais.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Logradouro / Endereço Completo</span>
                    </label>
                    <input 
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="ex: Rua das Palmeiras, 100 - Bairro Centro"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <span>Cidade</span>
                    </label>
                    <input 
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="ex: São Paulo"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <span>Estado (UF)</span>
                    </label>
                    <input 
                      type="text"
                      value={state}
                      onChange={e => setState(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="ex: SP"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <span>CEP</span>
                    </label>
                    <input 
                      type="text"
                      value={postalCode}
                      onChange={e => setPostalCode(formatCep(e.target.value))}
                      disabled={!canEdit || saving}
                      placeholder="00000-000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono outline-none focus:border-gold disabled:opacity-60 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-ABA 3: TERMOS & FUNCIONAMENTO */}
            {activeSubTab === 'termos' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h4 className="font-serif text-base font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gold" /> Parâmetros de Funcionamento & Regimento
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Código MEC/INEP, parâmetros de convênio e conformidade legal do estabelecimento.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-gold" />
                      <span>Código MEC / INEP</span>
                    </label>
                    <input 
                      type="text"
                      value={inepCode}
                      onChange={e => setInepCode(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="ex: 35012345"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono outline-none focus:border-gold disabled:opacity-60 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-gold" />
                      <span>Plano Licenciado Classium</span>
                    </label>
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono font-bold text-amber-400">
                      {org?.plan_status || 'STANDARD'} (Multi-tenant Ativo)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-ABA 4: EQUIPE GESTORA */}
            {activeSubTab === 'gestao' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h4 className="font-serif text-base font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-gold" /> Corpo Diretivo & Liderança Escolar
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Responsáveis técnicos e pedagógicos pelas atas, relatórios e certificados.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Diretor(a) Geral</span>
                    </label>
                    <input 
                      type="text"
                      value={directorName}
                      onChange={e => setDirectorName(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="ex: Prof. Carlos Alberto Ramos"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Coordenador(a) Pedagógico(a)</span>
                    </label>
                    <input 
                      type="text"
                      value={coordinatorName}
                      onChange={e => setCoordinatorName(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="ex: Profa. Mariana Souza"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Secretário(a) Escolar Responsável</span>
                    </label>
                    <input 
                      type="text"
                      value={secretaryName}
                      onChange={e => setSecretaryName(e.target.value)}
                      disabled={!canEdit || saving}
                      placeholder="ex: Helena Fernandes"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-gold disabled:opacity-60 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BOTÃO SALVAR ALTERAÇÕES */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-[11px] text-slate-500">
                {canEdit 
                  ? 'As alterações serão persistidas no Supabase e propagadas em tempo real.' 
                  : 'Visualização protegida por permissão de acesso.'}
              </span>

              <button
                type="submit"
                disabled={!canEdit || saving}
                className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-gold/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
      )}

    </section>
  );
}

export default InstitutionDataPanel;
