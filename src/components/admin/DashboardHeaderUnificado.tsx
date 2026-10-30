import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { usePlatform } from '../../context/PlatformContext';
import { useAuth } from '../../hooks/useAuth';
import { 
  Building, MapPin, Shield, Users, Clock, Calendar, CloudSun,
  FileText, CheckCircle2, AlertTriangle, X, Plus, Trash2, Edit2,
  Save, RefreshCw, Smartphone, Phone, Mail, Globe, Image as ImageIcon,
  Award, UserCheck, Check, Sparkles, Lock, Unlock, School
} from 'lucide-react';
import { 
  institutionService, 
  InstitutionData, 
  ManagementTeamMember, 
  ManagementRole 
} from '../../services/institutionService';
import { RealtimeService } from '../../services/RealtimeService';
import { fetchLiveWeather } from '../../services/weatherService';

const realtimeService = RealtimeService.getInstance();

interface DashboardHeaderUnificadoProps {
  className?: string;
  onDataUpdated?: () => void;
  openTabRequested?: ModalTab | null;
}

type ModalTab = 'cadastrais' | 'endereco' | 'termos' | 'gestao';

export function DashboardHeaderUnificado({ className = '', onDataUpdated, openTabRequested }: DashboardHeaderUnificadoProps) {
  const { currentUser } = usePlatform();
  const { profile } = useAuth();
  const activeOrgId = 
    profile?.organization_id || 
    profile?.school_id || 
    currentUser?.organization_id || 
    currentUser?.school_id || 
    currentUser?.organizationId || 
    '11111111-1111-1111-1111-111111111111';

  // 1. Digital Clock & Date (Brasília Timezone: America/Sao_Paulo)
  const [brasiliaTime, setBrasiliaTime] = useState<string>('');
  const [brasiliaDate, setBrasiliaDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      const timeStr = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);

      const dateStr = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(now);

      setBrasiliaTime(timeStr);
      setBrasiliaDate(dateStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Organization / School State
  const [org, setOrg] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [canEdit, setCanEdit] = useState<boolean>(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [weather, setWeather] = useState<{ temp: number; description: string; source: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('cadastrais');

  // Form Fields
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

  // Address & ViaCEP State
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  const [cepLoading, setCepLoading] = useState<boolean>(false);
  const [cepFeedback, setCepFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Management Team Members List
  const [teamMembers, setTeamMembers] = useState<ManagementTeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState<boolean>(false);

  // Add/Edit Member Sub-Modal
  const [isMemberModalOpen, setIsMemberModalOpen] = useState<boolean>(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string>('');
  const [memberRole, setMemberRole] = useState<ManagementRole>('Vice-Diretor(a)');
  const [memberCustomRole, setMemberCustomRole] = useState<string>('');
  const [memberEmail, setMemberEmail] = useState<string>('');
  const [memberPhone, setMemberPhone] = useState<string>('');

  // Delete Member Confirmation Modal State
  const [memberToDelete, setMemberToDelete] = useState<ManagementTeamMember | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  // Masks
  const formatCnpj = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14);
    if (raw.length <= 2) return raw;
    if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`;
    if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
    if (raw.length <= 12) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
    return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`;
  };

  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  const formatCep = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 8);
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  };

  // Auto ViaCEP Lookup
  const searchCep = async (cepValue: string) => {
    const cleaned = cepValue.replace(/\D/g, '');
    if (cleaned.length !== 8) return;

    setCepLoading(true);
    setCepFeedback(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      if (!res.ok) throw new Error('Não foi possível conectar ao serviço de CEP.');
      const data = await res.json();
      
      if (data.erro) {
        setCepFeedback({ success: false, message: 'CEP não encontrado na base de dados dos Correios.' });
      } else {
        const fullStreet = [data.logradouro, data.bairro].filter(Boolean).join(' - ');
        if (fullStreet) setAddress(fullStreet);
        if (data.localidade) setCity(data.localidade);
        if (data.uf) setState(data.uf);
        setCepFeedback({ 
          success: true, 
          message: `Endereço localizado via CEP: ${data.localidade} - ${data.uf}. Campos preenchidos (editáveis).` 
        });
      }
    } catch (err: any) {
      console.warn('[DashboardHeaderUnificado] ViaCEP error:', err);
      setCepFeedback({ success: false, message: 'Erro ao consultar o CEP. Preencha manualmente.' });
    } finally {
      setCepLoading(false);
    }
  };

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const formatted = formatCep(val);
    setPostalCode(formatted);
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 8) {
      searchCep(cleaned);
    } else {
      setCepFeedback(null);
    }
  };

  // External trigger for opening modal
  useEffect(() => {
    if (openTabRequested) {
      setActiveTab(openTabRequested);
      setIsModalOpen(true);
    }
  }, [openTabRequested]);

  // Listen for global custom events to open modal
  useEffect(() => {
    const handleCustomOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab?: ModalTab }>;
      if (customEvent.detail && customEvent.detail.tab) {
        setActiveTab(customEvent.detail.tab);
        setIsModalOpen(true);
      } else {
        setIsModalOpen(true);
      }
    };

    window.addEventListener('classium_open_school_modal', handleCustomOpen);
    return () => {
      window.removeEventListener('classium_open_school_modal', handleCustomOpen);
    };
  }, []);

  // Load Organization & Team Data
  const loadData = async () => {
    setLoading(true);
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

      // Load Management Team
      const team = await institutionService.getManagementTeam(activeOrgId);
      setTeamMembers(team);
    } catch (err) {
      console.error('[DashboardHeaderUnificado] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Weather query from Open-Meteo external API based on city
  useEffect(() => {
    const targetCity = city || org?.city || 'São Paulo';
    fetchLiveWeather(targetCity).then(setWeather).catch(() => {});
  }, [city, org?.city]);

  useEffect(() => {
    loadData();

    // Supabase Realtime Channels via unified RealtimeService
    const unsubOrganizations = realtimeService.subscribe(
      'unified_org_rt',
      { table: 'organizations' },
      () => { loadData(); }
    );

    const unsubSchools = realtimeService.subscribe(
      'unified_school_rt',
      { table: 'schools' },
      () => { loadData(); }
    );

    const unsubTeam = realtimeService.subscribe(
      'unified_team_rt',
      { table: 'school_management_team' },
      () => {
        institutionService.getManagementTeam(activeOrgId).then(setTeamMembers);
      }
    );

    const unsubStaff = realtimeService.subscribe(
      'unified_staff_rt',
      { table: 'school_staff' },
      () => {
        institutionService.getManagementTeam(activeOrgId).then(setTeamMembers);
      }
    );

    return () => {
      unsubOrganizations();
      unsubSchools();
      unsubTeam();
      unsubStaff();
    };
  }, [activeOrgId]);

  // Open Modal on Specific Tab
  const handleOpenModal = (tab: ModalTab) => {
    setActiveTab(tab);
    setIsModalOpen(true);
  };

  // Save Organization Data
  const handleSaveOrganization = async (e?: React.FormEvent) => {
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
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim()
      }
    };

    try {
      const res = await institutionService.updateOrganization(activeOrgId, payload);
      
      // Update public.schools table
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
      } catch (e) {}

      if (res.success) {
        setOrg(prev => ({ ...prev, ...res.data }));
        setToast({ 
          type: 'success', 
          message: 'Dados cadastrais da escola salvos com sucesso e sincronizados em tempo real!' 
        });
        window.dispatchEvent(new CustomEvent('classium_school_updated'));
        if (onDataUpdated) onDataUpdated();
      } else {
        throw new Error(res.error || 'Falha ao salvar dados no Supabase.');
      }
    } catch (err: any) {
      console.error('[DashboardHeaderUnificado] Save error:', err);
      setToast({ 
        type: 'error', 
        message: err.message || 'Erro ao persistir alterações no banco de dados.' 
      });
    } finally {
      setSaving(false);
    }
  };

  // Team Member Modal Handlers
  const handleOpenAddMember = () => {
    setEditingMemberId(null);
    setMemberName('');
    setMemberRole('Vice-Diretor(a)');
    setMemberCustomRole('');
    setMemberEmail('');
    setMemberPhone('');
    setIsMemberModalOpen(true);
  };

  const handleOpenEditMember = (m: ManagementTeamMember) => {
    setEditingMemberId(m.id);
    setMemberName(m.name);
    setMemberRole(m.role || 'Vice-Diretor(a)');
    setMemberCustomRole(m.custom_role_title || '');
    setMemberEmail(m.email || '');
    setMemberPhone(m.phone || '');
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;

    setTeamLoading(true);
    try {
      if (editingMemberId) {
        await institutionService.updateManagementTeamMember(activeOrgId, editingMemberId, {
          name: memberName.trim(),
          role: memberRole,
          custom_role_title: memberRole === 'Outro' ? memberCustomRole.trim() : undefined,
          email: memberEmail.trim(),
          phone: memberPhone.trim()
        });
      } else {
        await institutionService.addManagementTeamMember(activeOrgId, {
          name: memberName.trim(),
          role: memberRole,
          custom_role_title: memberRole === 'Outro' ? memberCustomRole.trim() : undefined,
          email: memberEmail.trim(),
          phone: memberPhone.trim(),
          is_active: true
        });
      }

      const updated = await institutionService.getManagementTeam(activeOrgId);
      setTeamMembers(updated);
      setIsMemberModalOpen(false);
      setToast({ type: 'success', message: 'Membro da Equipe Gestora salvo com sucesso!' });
      window.dispatchEvent(new CustomEvent('classium_school_updated'));
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Erro ao salvar membro da equipe.' });
    } finally {
      setTeamLoading(false);
    }
  };

  const handlePromptDeleteMember = (member: ManagementTeamMember) => {
    setMemberToDelete(member);
  };

  const confirmDeleteMember = async (member: ManagementTeamMember) => {
    if (!member || !member.id) return;
    setDeletingMemberId(member.id);

    try {
      const res = await institutionService.deleteManagementTeamMember(activeOrgId, member.id);
      if (res.success) {
        // Optimistically remove from state by unique ID
        setTeamMembers(prev => prev.filter(m => m.id !== member.id));
        setMemberToDelete(null);
        setToast({ type: 'success', message: `Integrante "${member.name}" removido da Equipe Gestora com sucesso.` });

        // Synchronize with database
        const fresh = await institutionService.getManagementTeam(activeOrgId);
        setTeamMembers(fresh);

        window.dispatchEvent(new CustomEvent('classium_school_updated'));
        if (onDataUpdated) onDataUpdated();
      } else {
        throw new Error(res.error || 'Falha ao excluir o integrante do banco de dados.');
      }
    } catch (err: any) {
      console.error('[DashboardHeaderUnificado] Delete error:', err);
      setToast({ type: 'error', message: err.message || 'Erro ao remover membro.' });
      setMemberToDelete(null);
    } finally {
      setDeletingMemberId(null);
    }
  };

  const currentSchoolName = fantasyName || officialName || org?.fantasy_name || org?.name || 'Escola não informada';
  const currentCnpj = cnpj || org?.cnpj || 'Não informado';
  const currentCity = city || org?.city || '';
  const userName = profile?.name || currentUser?.name || 'Gestor Escolar';

  return (
    <div className={`w-full ${className}`}>
      
      {/* ============================================================ */}
      {/* CARTÃO ÚNICO UNIFICADO: TEMA CLARO MODERNO, ELEGANTE E NÍTIDO */}
      {/* ============================================================ */}
      <div className="w-full bg-white border border-slate-200/90 p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow text-left">
        
        {/* Soft Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="space-y-4 relative z-10">
          
          {/* IDENTIDADE DA ESCOLA (Logo/Ícone, Nome Oficial, CNPJ e Badge de Edição) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center font-serif text-[#1E3A5F] font-bold text-xl shadow-xs overflow-hidden shrink-0">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo da Escola" 
                    className="w-full h-full object-contain p-1" 
                    onError={() => setLogoUrl('')} 
                  />
                ) : (
                  <School className="w-6 h-6 text-[#1E3A5F]" />
                )}
              </div>
              <div>
                <h3 className="font-serif text-lg md:text-xl font-extrabold text-[#0F172A] tracking-tight leading-snug">
                  {currentSchoolName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600 flex-wrap">
                  <span className="font-mono text-slate-700">CNPJ: {currentCnpj}</span>
                  <span className="text-slate-300">•</span>
                  {canEdit ? (
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" /> Edição Permitida
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      <Lock className="w-3 h-3 text-slate-500" /> Somente Leitura
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SAUDAÇÃO E PROPÓSITO DO PAINEL */}
          <div className="space-y-1 pt-1">
            <h2 className="text-xl md:text-2xl font-serif font-bold text-[#0F172A] tracking-tight">
              Olá, {userName}.
            </h2>
            <p className="text-slate-600 text-xs md:text-sm font-normal max-w-3xl leading-relaxed">
              Painel Unificado de Gestão Escolar Classium. Acompanhe os indicadores vitais da instituição e gerencie os dados cadastrais oficiais em tempo real.
            </p>
          </div>

          {/* CONTEXTO OPERACIONAL: CLIMA, HORA E DATA DE BRASÍLIA */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 pt-1">
            <span 
              className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 cursor-help font-medium"
              title={`${weather?.source || 'Open-Meteo API'} (Serviço Meteorológico Externo · Não Supabase)`}
            >
              <CloudSun className="w-4 h-4 text-amber-600" /> 
              <span>
                {currentCity ? `${currentCity} · ` : ''}
                {weather ? `${weather.temp}°C ${weather.description}` : 'Consultando clima...'}
              </span>
            </span>

            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 font-mono font-medium">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>{brasiliaTime || '--:--:--'} (Brasília)</span>
            </span>

            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 font-mono font-medium">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{brasiliaDate || '--/--/----'}</span>
            </span>
          </div>

          {/* LINHA DIVISÓRIA SUTIL */}
          <div className="w-full h-px bg-slate-100 my-3" />

          {/* 4 BOTÕES DE AÇÃO DE GESTÃO CADASTRAL */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1">
            <button
              type="button"
              onClick={() => handleOpenModal('cadastrais')}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-xs group"
            >
              <Building className="w-3.5 h-3.5 text-[#1E3A5F] transition-colors" />
              <span>Dados Cadastrais</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenModal('endereco')}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-xs group"
            >
              <MapPin className="w-3.5 h-3.5 text-[#1E3A5F] transition-colors" />
              <span>Endereço & Unidade</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenModal('termos')}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-xs group"
            >
              <Shield className="w-3.5 h-3.5 text-[#1E3A5F] transition-colors" />
              <span>Termos de Funcionamento</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenModal('gestao')}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-xs group"
            >
              <Users className="w-3.5 h-3.5 text-[#1E3A5F] transition-colors" />
              <span>Equipe Gestora</span>
            </button>
          </div>

        </div>
      </div>

      {/* TOAST FEEDBACK */}
      {toast && (
        <div className={`mt-4 p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL PRINCIPAL: EDIÇÃO DOS DADOS CADASTRAIS DA ESCOLA        */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-left">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1E3A5F]">
                  {activeTab === 'cadastrais' && <Building className="w-5 h-5 text-[#1E3A5F]" />}
                  {activeTab === 'endereco' && <MapPin className="w-5 h-5 text-[#1E3A5F]" />}
                  {activeTab === 'termos' && <Shield className="w-5 h-5 text-[#1E3A5F]" />}
                  {activeTab === 'gestao' && <Users className="w-5 h-5 text-[#1E3A5F]" />}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    {activeTab === 'cadastrais' && 'Dados Cadastrais & Fiscais'}
                    {activeTab === 'endereco' && 'Endereço & Unidade Escolar'}
                    {activeTab === 'termos' && 'Termos de Funcionamento & INEP'}
                    {activeTab === 'gestao' && 'Equipe Gestora & Corpo Diretivo'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentSchoolName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Bar */}
            <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/40 flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('cadastrais')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'cadastrais' 
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-[#1E3A5F]" />
                <span>Dados Cadastrais</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('endereco')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'endereco' 
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#1E3A5F]" />
                <span>Endereço & Unidade</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('termos')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'termos' 
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-[#1E3A5F]" />
                <span>Termos de Funcionamento</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gestao')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'gestao' 
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-[#1E3A5F]" />
                <span>Equipe Gestora</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white text-slate-800">
              
              {/* TAB 1: DADOS CADASTRAIS (SIMPLIFICADO: APENAS RAZÃO SOCIAL, CNPJ, IE E CONTATOS) */}
              {activeTab === 'cadastrais' && (
                <div className="space-y-5 animate-fade-in text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Identificação Fiscal & Contatos Institucionais</p>
                      <p className="text-[11px] text-slate-500">Campos essenciais para emissão de documentos oficiais e comunicação.</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Sincronizado Supabase
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Razão Social / Nome Oficial */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-[#1E3A5F]" />
                        <span>Nome Oficial / Razão Social (legal_name)</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        value={officialName}
                        onChange={e => setOfficialName(e.target.value)}
                        disabled={!canEdit || saving}
                        placeholder="ex: INFOREDE EM VEREADOR JOSÉ FERREIRA DE AGUIAR"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 transition-all"
                        required
                      />
                    </div>

                    {/* CNPJ */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#1E3A5F]" />
                        <span>CNPJ / Documento</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        value={cnpj}
                        onChange={e => setCnpj(formatCnpj(e.target.value))}
                        disabled={!canEdit || saving}
                        placeholder="00.000.000/0000-00"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 transition-all"
                      />
                    </div>

                    {/* Inscrição Estadual */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Inscrição Estadual</span>
                      </label>
                      <input 
                        type="text"
                        value={stateRegistration}
                        onChange={e => setStateRegistration(e.target.value)}
                        disabled={!canEdit || saving}
                        placeholder="ex: 123.456.789.110"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 transition-all"
                      />
                    </div>

                    {/* Telefone Fixo */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Telefone Fixo</span>
                      </label>
                      <input 
                        type="text"
                        value={phoneFixed}
                        onChange={e => setPhoneFixed(formatPhone(e.target.value))}
                        disabled={!canEdit || saving}
                        placeholder="(11) 3456-7890"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 transition-all"
                      />
                    </div>

                    {/* Telefone Celular / WhatsApp */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Telefone Celular / WhatsApp</span>
                      </label>
                      <input 
                        type="text"
                        value={phoneMobile}
                        onChange={e => setPhoneMobile(formatPhone(e.target.value))}
                        disabled={!canEdit || saving}
                        placeholder="(11) 98765-4321"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 transition-all"
                      />
                    </div>

                    {/* Email Institucional */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>Email Institucional Oficial</span>
                      </label>
                      <input 
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={!canEdit || saving}
                        placeholder="contato@joseferreira.educacao.gov.br"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ENDEREÇO & UNIDADE (COM AUTO-PREENCHIMENTO VIACEP) */}
              {activeTab === 'endereco' && (
                <div className="space-y-5 animate-fade-in text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <p className="font-bold text-slate-900 text-xs">Localização da Unidade Escolar</p>
                    <p className="text-[11px] text-slate-500">Digite o CEP para preenchimento automático pelo ViaCEP ou insira os dados manualmente.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* CEP com Auto-lookup ViaCEP */}
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#1E3A5F]" />
                          <span>CEP</span>
                        </span>
                        {cepLoading && (
                          <span className="text-[10px] text-blue-600 flex items-center gap-1 font-normal">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Buscando...
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={postalCode}
                          onChange={handlePostalCodeChange}
                          disabled={!canEdit || saving}
                          placeholder="00000-000"
                          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 transition-all"
                        />
                      </div>
                    </div>

                    {/* Cidade */}
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="font-bold text-slate-700">Cidade</label>
                      <input 
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        disabled={!canEdit || saving}
                        placeholder="ex: São Paulo"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 transition-all"
                      />
                    </div>

                    {/* Estado (UF) */}
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="font-bold text-slate-700">Estado (UF)</label>
                      <input 
                        type="text"
                        value={state}
                        onChange={e => setState(e.target.value)}
                        disabled={!canEdit || saving}
                        placeholder="ex: SP"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 transition-all uppercase"
                        maxLength={2}
                      />
                    </div>

                    {/* Logradouro / Endereço Completo */}
                    <div className="space-y-1.5 md:col-span-3">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>Logradouro / Endereço Completo</span>
                      </label>
                      <input 
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        disabled={!canEdit || saving}
                        placeholder="ex: Rua das Palmeiras, 100 - Bairro Centro"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 transition-all"
                      />
                    </div>
                  </div>

                  {/* Feedback do ViaCEP */}
                  {cepFeedback && (
                    <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-fade-in ${
                      cepFeedback.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{cepFeedback.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TERMOS DE FUNCIONAMENTO (SIMPLIFICADO: APENAS CÓDIGO MEC/INEP) */}
              {activeTab === 'termos' && (
                <div className="space-y-5 animate-fade-in text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#1E3A5F]" />
                        <span>Identificação Regulatória da Escola</span>
                      </h4>
                      <p className="text-slate-500 text-xs">
                        Informe o código de registro oficial atribuído pelo Ministério da Educação (MEC) e pelo Censo Escolar INEP.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                        <Award className="w-4 h-4 text-[#1E3A5F]" />
                        <span>Código MEC / INEP</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        value={inepCode}
                        onChange={e => setInepCode(e.target.value)}
                        disabled={!canEdit || saving}
                        placeholder="ex: 35012345"
                        className="w-full max-w-md bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 transition-all shadow-xs"
                      />
                      <p className="text-[11px] text-slate-500">
                        Este código é inserido automaticamente em diários de classe, históricos escolares e relatórios oficiais.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: EQUIPE GESTORA (COM BOTÃO + ADICIONAR MEMBRO E SUPORTE A TODOS OS CARGOS) */}
              {activeTab === 'gestao' && (
                <div className="space-y-5 animate-fade-in text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#1E3A5F]" />
                        <span>Corpo Diretivo & Liderança Escolar</span>
                      </h4>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Gestores responsáveis pelas decisões administrativas e pedagógicas da unidade.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddMember}
                      className="px-3.5 py-2 bg-[#1E3A5F] hover:bg-[#152942] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Adicionar Membro</span>
                    </button>
                  </div>

                  {/* Listagem de Membros da Equipe */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                    {teamMembers.length === 0 ? (
                      <div className="col-span-2 p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500">
                        Nenhum integrante cadastrado na equipe gestora. Clique em "+ Adicionar Membro".
                      </div>
                    ) : (
                      teamMembers.map(member => (
                        <div 
                          key={member.id}
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-all relative group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1E3A5F] border border-blue-200 px-2.5 py-0.5 rounded-full">
                                {member.role === 'Outro' && member.custom_role_title 
                                  ? member.custom_role_title 
                                  : member.role}
                              </span>
                              
                              <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditMember(member);
                                  }}
                                  aria-label={`Editar ${member.name}`}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg cursor-pointer transition-colors"
                                  title="Editar integrante"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePromptDeleteMember(member);
                                  }}
                                  disabled={deletingMemberId === member.id}
                                  aria-label={`Excluir ${member.name}`}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                                  title="Excluir integrante"
                                >
                                  {deletingMemberId === member.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <h5 className="font-serif text-sm font-bold text-slate-900">
                              {member.name}
                            </h5>

                            <div className="space-y-1 text-slate-600 text-[11px]">
                              {member.email && (
                                <div className="flex items-center gap-1.5 truncate">
                                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{member.email}</span>
                                </div>
                              )}
                              {member.phone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{member.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-[11px] text-slate-500">
                Alterações sincronizadas com o banco de dados do Supabase.
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Fechar
                </button>

                {activeTab !== 'gestao' && (
                  <button
                    type="button"
                    onClick={handleSaveOrganization}
                    disabled={!canEdit || saving}
                    className="px-6 py-2.5 bg-[#1E3A5F] hover:bg-[#152942] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
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
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUB-MODAL: ADICIONAR / EDITAR MEMBRO DA EQUIPE GESTORA        */}
      {/* ============================================================ */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-left">
            
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <h4 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1E3A5F]" />
                <span>{editingMemberId ? 'Editar Integrante da Equipe' : 'Adicionar Membro à Equipe Gestora'}</span>
              </h4>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-5 space-y-4 text-xs bg-white">
              {/* Nome */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nome Completo *</label>
                <input 
                  type="text"
                  value={memberName}
                  onChange={e => setMemberName(e.target.value)}
                  placeholder="ex: Profa. Juliana Medeiros"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              {/* Cargo */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Cargo de Liderança *</label>
                <select
                  value={memberRole}
                  onChange={e => setMemberRole(e.target.value as ManagementRole)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="Diretor(a) Geral">Diretor(a) Geral</option>
                  <option value="Vice-Diretor(a)">Vice-Diretor(a)</option>
                  <option value="Pedagogo(a)">Pedagogo(a)</option>
                  <option value="Supervisor(a)">Supervisor(a)</option>
                  <option value="Coordenador(a) Pedagógico(a)">Coordenador(a) Pedagógico(a)</option>
                  <option value="Outro">Outro (Personalizado)</option>
                </select>
              </div>

              {/* Cargo Personalizado (se 'Outro') */}
              {memberRole === 'Outro' && (
                <div className="space-y-1 animate-fade-in">
                  <label className="font-bold text-[#1E3A5F]">Título do Cargo Personalizado *</label>
                  <input 
                    type="text"
                    value={memberCustomRole}
                    onChange={e => setMemberCustomRole(e.target.value)}
                    placeholder="ex: Orientador(a) Educacional, Secretário(a) Geral"
                    className="w-full bg-white border border-blue-300 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              )}

              {/* Email */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email Institucional</label>
                <input 
                  type="email"
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  placeholder="ex: juliana.medeiros@joseferreira.educacao.gov.br"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Telefone / WhatsApp</label>
                <input 
                  type="text"
                  value={memberPhone}
                  onChange={e => setMemberPhone(formatPhone(e.target.value))}
                  placeholder="(11) 98765-4321"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={teamLoading}
                  className="px-5 py-2 bg-[#1E3A5F] hover:bg-[#152942] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {teamLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Salvar Membro</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONFIRMAÇÃO DE EXCLUSÃO DE MEMBRO DE EQUIPE GESTORA           */}
      {/* ============================================================ */}
      {memberToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in text-left">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-slate-900">
                  Remover membro da equipe gestora?
                </h3>
                <p className="text-xs text-slate-500">
                  Ação com exclusão persistida no Supabase
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Você está prestes a remover este integrante da equipe gestora. Essa ação será persistida diretamente no banco de dados e o membro deixará de estar vinculado a esta unidade escolar.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nome:</span>
                <span className="font-bold text-slate-900">{memberToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cargo:</span>
                <span className="font-semibold text-[#1E3A5F]">
                  {memberToDelete.role === 'Outro' && memberToDelete.custom_role_title 
                    ? memberToDelete.custom_role_title 
                    : memberToDelete.role}
                </span>
              </div>
              {memberToDelete.email && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">E-mail:</span>
                  <span className="text-slate-700 truncate max-w-[200px]">{memberToDelete.email}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ação:</span>
                <span className="text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded-full border border-red-200 text-[10px]">
                  Remover vínculo da escola
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/80 text-[10px] text-slate-400 font-mono">
                <span>ID do Registro:</span>
                <span className="truncate max-w-[180px]">{memberToDelete.id}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                disabled={deletingMemberId !== null}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteMember(memberToDelete)}
                disabled={deletingMemberId !== null}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {deletingMemberId === memberToDelete.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removendo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar remoção</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default DashboardHeaderUnificado;
