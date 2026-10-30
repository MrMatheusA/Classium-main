import React, { useState, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { SchoolInfo, SchoolUnit } from '../types';
import { BRAZILIAN_UFS, normalizeBrazilianUF } from '../lib/ufUtils';
import { 
  Building, MapPin, Phone, Mail, User, Shield, Check, ArrowRight,
  Sun, Moon, Cpu, Server, Users, Laptop, GraduationCap, CheckCircle2,
  Sparkles, AlertCircle, FileText, Lock, Globe, Database, Compass, ChevronRight,
  ChevronLeft, Layers, ShieldCheck, Heart, RefreshCw, KeyRound, CheckSquare,
  Square, ClipboardList, Info, HelpCircle
} from 'lucide-react';

export function OnboardingPage() {
  const { setMode, gestorAccount, setSchoolInfo, setSchoolUnits } = usePlatform();
  const { refreshProfile } = useAuth();
  
  // Theme state: choice between Light and Dark
  const [isDark, setIsDark] = useState<boolean>(true);

  // Prefill admin fields if gestorAccount exists
  React.useEffect(() => {
    if (gestorAccount) {
      setForm(prev => ({
        ...prev,
        adminNome: gestorAccount.name || '',
        adminEmail: gestorAccount.email || ''
      }));
    }
  }, [gestorAccount]);

  // Form Steps Wizard
  // Step 1: Dados da Instituição e Endereço
  // Step 2: Contatos e Responsável Legal
  // Step 3: Informações Acadêmicas e Configurações de Aula
  // Step 4: Criar Administrador e LGPD
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  // Form Fields State
  const [form, setForm] = useState({
    // Dados da Instituição
    nomeEscola: '',
    nomeFantasia: '',
    razaoSocial: '',
    cnpj: '',
    inep: '',
    categoria: 'Particular',

    // Endereço
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',

    // Contatos
    telefone: '',
    telefoneSec: '',
    whatsapp: '',
    emailInstitucional: '',
    site: '',

    // Responsável Legal
    respNome: '',
    respCargo: 'Diretor(a)',
    respTelefone: '',
    respEmail: '',

    // Informações Acadêmicas
    anoLetivo: '2026',
    qtdAlunos: '350',
    qtdProfessores: '28',
    qtdFuncionarios: '15',
    qtdSalas: '12',
    qtdTurnos: '2',
    sistemaEnsino: 'Apostilado Próprio',
    cargaHoraria: '800 horas/ano',

    // Configuração Inicial
    qtdModulos: '5 aulas',
    tempoAula: '50 minutos',
    
    // Recursos Ativos
    recursoAcademico: true,
    recursoFinanceiro: true,
    recursoComunicacao: true,
    recursoPedagogico: true,
    recursoTransporte: false,
    recursoRelatorios: true,

    // Criar Administrador
    adminNome: '',
    adminEmail: '',
    adminCpf: '',
    adminTelefone: '',
    adminSenha: '',
    adminConfirmarSenha: '',
    adminMfa: true,

    // LGPD
    chkAutorizacao: false,
    chkTermos: false,
    chkPrivacidade: false
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');

  // Provisioning animation state
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [provisioningStep, setProvisioningStep] = useState<number>(0);
  const provisioningMessages = [
    'Criando ambiente e alocando tenant...',
    'Configurando banco de dados isolado...',
    'Criando usuários administrativos...',
    'Configurando permissões do sistema...',
    'Preparando módulos acadêmico e financeiro...',
    'Tudo pronto!'
  ];

  // Success screen state
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Confetti particles state
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; top: number; size: number; color: string; delay: number; rotate: number }>>([]);

  // Mock auto-fill school profiles
  const handleAutoFill = () => {
    setForm({
      nomeEscola: 'Colégio Integral Visão do Futuro',
      nomeFantasia: 'Integral Visão',
      razaoSocial: 'Instituição de Ensino Visão do Futuro Ltda',
      cnpj: '12.345.678/0001-99',
      inep: '35123456',
      categoria: 'Particular',

      cep: '01311-200',
      endereco: 'Avenida Paulista',
      numero: '1578',
      complemento: 'Bloco B - Andar 3',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP',
      pais: 'Brasil',

      telefone: '(11) 3254-8900',
      telefoneSec: '(11) 3254-8901',
      whatsapp: '(11) 98888-7777',
      emailInstitucional: 'contato@colegiovisao.com.br',
      site: 'www.colegiovisao.com.br',

      respNome: 'Dra. Viviane de Albuquerque',
      respCargo: 'Diretora Geral',
      respTelefone: '(11) 99111-2222',
      respEmail: 'viviane@colegiovisao.com.br',

      anoLetivo: '2026',
      qtdAlunos: '480',
      qtdProfessores: '35',
      qtdFuncionarios: '22',
      qtdSalas: '18',
      qtdTurnos: '2',
      sistemaEnsino: 'Vanguardista Digital',
      cargaHoraria: '1.000 horas/ano',

      qtdModulos: '6 aulas',
      tempoAula: '50 minutos',
      
      recursoAcademico: true,
      recursoFinanceiro: true,
      recursoComunicacao: true,
      recursoPedagogico: true,
      recursoTransporte: true,
      recursoRelatorios: true,

      adminNome: 'Augusto Carlos de Souza',
      adminEmail: 'augusto.admin@colegiovisao.com.br',
      adminCpf: '123.456.789-00',
      adminTelefone: '(11) 97777-6666',
      adminSenha: 'AdminEduca2026',
      adminConfirmarSenha: 'AdminEduca2026',
      adminMfa: true,

      chkAutorizacao: true,
      chkTermos: true,
      chkPrivacidade: true
    });
    setErrors({});
  };

  // Simulate automatic address lookup when entering CEP
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setForm(prev => ({ ...prev, cep: rawVal }));

    // Auto fill simulated for common formats
    const cleanCep = rawVal.replace(/\D/g, '');
    if (cleanCep === '01311200' || cleanCep === '01311100') {
      setForm(prev => ({
        ...prev,
        endereco: 'Avenida Paulista',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
        pais: 'Brasil'
      }));
    } else if (cleanCep === '22021001') {
      setForm(prev => ({
        ...prev,
        endereco: 'Avenida Atlântica',
        bairro: 'Copacabana',
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
        pais: 'Brasil'
      }));
    } else if (cleanCep === '30110002') {
      setForm(prev => ({
        ...prev,
        endereco: 'Avenida do Contorno',
        bairro: 'Centro',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        pais: 'Brasil'
      }));
    }
  };

  // Standard field change handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  // Manual trigger for mock CEP search
  const triggerCepMockSearch = () => {
    if (!form.cep) {
      alert('Por favor, digite um CEP para buscar. Tente "01311-200" para simular.');
      return;
    }
    setForm(prev => ({
      ...prev,
      endereco: 'Rua das Flores Educacionais',
      bairro: 'Bairro Jardim Acadêmico',
      cidade: 'Florianópolis',
      estado: 'SC',
      pais: 'Brasil'
    }));
  };

  // Validation function per step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!form.nomeEscola.trim()) newErrors.nomeEscola = 'O nome da escola é obrigatório.';
      if (!form.cnpj.trim()) {
        newErrors.cnpj = 'O CNPJ é obrigatório.';
      } else {
        const cleanDoc = form.cnpj.replace(/\D/g, '');
        if (cleanDoc.length !== 14 && cleanDoc.length !== 11) {
          newErrors.cnpj = 'O documento institucional deve possuir 11 dígitos (CPF) ou 14 dígitos (CNPJ).';
        }
      }
      if (form.estado.trim() && !normalizeBrazilianUF(form.estado)) {
        newErrors.estado = 'Informe uma UF válida de 2 letras (ex: SP, RJ, SC).';
      }
    }

    if (step === 4) {
      if (!form.adminNome.trim()) newErrors.adminNome = 'O nome do administrador é obrigatório.';
      if (!form.adminEmail.trim() || !form.adminEmail.includes('@')) newErrors.adminEmail = 'Digite um e-mail válido.';
      if (!gestorAccount?.id && !form.adminSenha) {
        newErrors.adminSenha = 'A senha é obrigatória.';
      }
      if (form.adminSenha && form.adminSenha !== form.adminConfirmarSenha) {
        newErrors.adminConfirmarSenha = 'As senhas não coincidem.';
      }
      if (!form.chkAutorizacao) newErrors.chkAutorizacao = 'Você deve declarar que possui autorização.';
      if (!form.chkTermos) newErrors.chkTermos = 'Você deve aceitar os Termos de Uso.';
      if (!form.chkPrivacidade) newErrors.chkPrivacidade = 'Você deve aceitar a Política de Privacidade.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle step navigation
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Form submit handler - Real Supabase Organization Provisioning via Canonical RPC
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProvisioning) return;
    setSubmitError('');

    if (!validateStep(4)) return;

    // 1. Validar sessão autenticada real no Supabase Auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      setSubmitError('Sessão expirada ou não autenticada. Por favor, acesse novamente o login antes de provisionar a instituição.');
      return;
    }

    // 2. Iniciar animação controlada de provisionamento
    setIsProvisioning(true);
    setProvisioningStep(0);

    const schoolName = form.nomeEscola.trim() || form.razaoSocial.trim() || form.nomeFantasia.trim() || 'Nova Instituição';
    const fullAddress = [form.endereco, form.numero, form.complemento, form.bairro].filter(Boolean).join(', ');

    try {
      // 3. Executar RPC canônica de provisionamento: public.provision_gestor_organization
      const { data: rpcResult, error: rpcError } = await supabase.rpc('provision_gestor_organization', {
        p_name: schoolName,
        p_trade_name: form.nomeFantasia.trim() || null,
        p_document_number: form.cnpj.trim() || null,
        p_inep_code: form.inep.trim() || null,
        p_email: form.emailInstitucional.trim() || null,
        p_phone: form.telefone.trim() || form.whatsapp.trim() || null,
        p_address: fullAddress || null,
        p_city: form.cidade.trim() || null,
        p_state: normalizeBrazilianUF(form.estado) || null,
        p_postal_code: form.cep.trim() || null,
        p_website: form.site.trim() || null
      });

      if (rpcError) {
        setIsProvisioning(false);
        const errMsg = rpcError.message || 'Falha ao provisionar a organização.';
        if (
          errMsg.toLowerCase().includes('document') ||
          errMsg.toLowerCase().includes('cnpj') ||
          errMsg.toLowerCase().includes('cpf')
        ) {
          setSubmitError('Já existe uma organização cadastrada com este documento/CNPJ.');
        } else if (
          errMsg.toLowerCase().includes('already') ||
          errMsg.toLowerCase().includes('duplicat') ||
          errMsg.toLowerCase().includes('vinculo') ||
          errMsg.toLowerCase().includes('vínculo') ||
          errMsg.toLowerCase().includes('incompativel') ||
          errMsg.toLowerCase().includes('já possui') ||
          errMsg.toLowerCase().includes('organização ativa')
        ) {
          setSubmitError('Este usuário já possui uma organização ativa vinculada no sistema.');
        } else {
          setSubmitError(errMsg);
        }
        return;
      }

      // Validar objeto de erro se encapsulado na resposta JSONB
      if (rpcResult && typeof rpcResult === 'object') {
        const resObj = rpcResult as Record<string, any>;
        if (resObj.ok === false || resObj.success === false || resObj.error) {
          setIsProvisioning(false);
          setSubmitError(resObj.error || resObj.message || 'Erro ao processar o provisionamento da instituição.');
          return;
        }
      }

      const createdOrgId = (rpcResult && typeof rpcResult === 'object')
        ? (rpcResult as Record<string, any>).organization_id || (rpcResult as Record<string, any>).id || (rpcResult as Record<string, any>).organization?.id
        : null;

      if (!createdOrgId) {
        setIsProvisioning(false);
        setSubmitError('O serviço de provisionamento não retornou o identificador da organização criada.');
        return;
      }

      // 4. Atualizar PlatformContext para compatibilidade de UI
      const createdSchoolInfo: SchoolInfo = {
        name: schoolName,
        razaoSocial: form.razaoSocial || schoolName,
        cnpj: form.cnpj || '',
        inep: form.inep || '',
        address: fullAddress || '',
        municipio: form.cidade || '',
        estado: form.estado || '',
        cep: form.cep || '',
        telefone: form.telefone || '',
        whatsapp: form.whatsapp || '',
        email: form.emailInstitucional || '',
        site: form.site || '',
        logo: '',
        cover: '',
        director: form.adminNome || form.respNome || 'Gestor Escolar',
        schoolYear: `Ano Letivo ${form.anoLetivo || '2026'}`,
        city: form.cidade || ''
      };

      const createdSchoolUnit: SchoolUnit = {
        id: createdOrgId || 'org-main',
        name: form.nomeFantasia || schoolName || 'Unidade Sede',
        inep: form.inep || '',
        address: fullAddress || '',
        director: form.adminNome || form.respNome || 'Gestor Escolar',
        students: 0,
        teachers: 0,
        classes: 0,
        shifts: `${form.qtdTurnos || '2'} Turnos`,
        phone: form.telefone || '',
        email: form.emailInstitucional || '',
        logo: '',
        cover: '',
        primaryColor: '#0F4C81',
        secondaryColor: '#D4AF37',
        status: 'Homologada',
        city: form.cidade || ''
      };

      setSchoolInfo(createdSchoolInfo);
      setSchoolUnits([createdSchoolUnit]);

      // 5. Atualizar perfil e vínculo no AuthProvider canônico
      if (refreshProfile) {
        try {
          await refreshProfile();
        } catch (e) {
          console.warn('[Onboarding] Aviso ao atualizar perfil após provisionamento:', e);
        }
      }

      // 6. Concluir etapas de animação para sucesso
      setProvisioningStep(provisioningMessages.length - 1);
      setTimeout(() => {
        setIsProvisioning(false);
        setIsSuccess(true);
      }, 600);
    } catch (err: any) {
      setIsProvisioning(false);
      console.error('[Onboarding] Erro inesperado no provisionamento:', err);
      setSubmitError(err?.message || 'Falha inesperada ao conectar com o serviço de provisionamento.');
    }
  };

  // Provisioning progress timer
  useEffect(() => {
    if (isProvisioning) {
      const interval = setInterval(() => {
        setProvisioningStep(prev => {
          if (prev < provisioningMessages.length - 2) {
            return prev + 1;
          }
          return prev;
        });
      }, 700);
      return () => clearInterval(interval);
    }
  }, [isProvisioning]);

  // Generate Success Confetti
  useEffect(() => {
    if (isSuccess) {
      const colors = ['#2563EB', '#4F46E5', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#A855F7'];
      const generated = Array.from({ length: 120 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: -10 - Math.random() * 40,
        size: Math.random() * 10 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 5,
        rotate: Math.random() * 360
      }));
      setConfetti(generated);
    }
  }, [isSuccess]);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 relative overflow-hidden ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* BACKGROUND GRAPHIC NOISE / GLOW NODES */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent pointer-events-none z-0"></div>
      <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none z-0"></div>

      {/* FLOATING CONFETTI (ON SUCCESS) */}
      {isSuccess && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confetti.map(p => (
            <div
              key={p.id}
              className="absolute animate-bounce"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                opacity: 0.8,
                transform: `rotate(${p.rotate}deg)`,
                animation: `fall 3s linear infinite`,
                animationDelay: `${p.delay}s`
              }}
            />
          ))}
          <style>{`
            @keyframes fall {
              0% { top: -5%; transform: rotate(0deg) translateX(0); }
              50% { transform: rotate(180deg) translateX(15px); }
              100% { top: 105%; transform: rotate(360deg) translateX(-15px); }
            }
          `}</style>
        </div>
      )}

      {/* HEADER NAVBAR */}
      <header className={`relative z-10 border-b h-20 px-6 md:px-12 flex items-center justify-between backdrop-blur-md ${
        isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white/60'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-serif font-black text-xl shadow-lg shadow-blue-500/20">
            C
          </div>
          <div>
            <span className="font-serif text-lg font-bold tracking-tight block">Classium</span>
            <span className="text-[10px] font-mono opacity-60 uppercase tracking-widest block">Implantação Unificada</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider">
            Portal Oficial de Onboarding
          </span>

          {/* LIGHT / DARK MODE TOGGLE */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2.5 rounded-xl border transition-all ${
              isDark 
                ? 'border-slate-800 bg-slate-900 text-amber-400 hover:text-amber-300' 
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
            title="Alternar tema de cores"
            id="theme-toggle-button"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* SUCCESS SCREEN */}
      {isSuccess ? (
        <main className="max-w-4xl mx-auto px-6 py-20 relative z-10 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-3 max-w-2xl">
            <span className="text-xs uppercase font-mono font-bold text-emerald-500 tracking-[0.2em] block">🎉 Sincronização Concluída</span>
            <h2 className="text-3xl md:text-5xl font-serif font-extrabold tracking-tight">
              Sua escola foi cadastrada com sucesso!
            </h2>
            <p className={`text-base font-light leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              O ambiente da instituição <strong className="text-blue-500 font-bold">{form.nomeEscola}</strong> foi provisionado e configurado para suporte a múltiplas unidades escolares em conformidade estrita com a LGPD.
            </p>
          </div>

          {/* SCHOOL METRIC PREVIEW ON SUCCESS */}
          <div className={`w-full max-w-xl p-6 rounded-2xl border text-left grid grid-cols-2 sm:grid-cols-4 gap-6 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-md'
          }`}>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Escola</span>
              <span className="font-bold text-sm block truncate mt-0.5">{form.nomeFantasia || form.nomeEscola}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Categoria</span>
              <span className="font-bold text-sm block mt-0.5">{form.categoria}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Módulos</span>
              <span className="font-bold text-sm block mt-0.5">{form.qtdModulos}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Administrador</span>
              <span className="font-bold text-sm block truncate mt-0.5">{form.adminNome}</span>
            </div>
          </div>

          <p className={`text-xs max-w-md leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Agora você pode acessar o painel administrativo do Classium e começar a configurar alunos, professores, turmas e responsáveis.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={() => setMode('admin')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:scale-[1.02] flex items-center gap-2.5"
              id="goto-admin-dashboard"
            >
              <Building className="w-4 h-4" />
              <span>Ir para o Painel Administrativo</span>
            </button>
            <button
              onClick={() => {
                setIsSuccess(false);
                setCurrentStep(1);
              }}
              className={`px-8 py-4 border font-bold text-xs uppercase tracking-widest rounded-xl transition-all ${
                isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Fazer outro cadastro
            </button>
          </div>
        </main>
      ) : (
        
        /* REGULAR REGISTRATION HERO & FORM WIZARD */
        <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-16 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* COLUMN 1: INTRO HERO, ILLUSTRATION & TENANT TREE (Col 5) */}
          <section className="lg:col-span-5 space-y-10 text-left">
            
            {/* HERO INTRODUCTION */}
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-500 text-xs font-bold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Assistente de Implantação Classium
              </div>

              <h1 className="text-3xl md:text-5xl font-serif font-extrabold tracking-tight leading-tight">
                Bem-vindo ao <span className="text-blue-500">Classium</span>
              </h1>
              
              <h2 className={`text-lg md:text-xl font-light font-sans leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                A plataforma inteligente para gestão educacional. Cadastre sua instituição de ensino e tenha acesso à plataforma completa de gestão escolar inteligente.
              </h2>
            </div>

            {/* PREMIUM EDUCATION MODERN ILLUSTRATION */}
            <div className={`p-6 rounded-3xl border relative overflow-hidden backdrop-blur-md ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-lg'
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
              
              {/* VECTOR SIMULATION OF EDUCATION & TECH */}
              <div className="h-44 w-full relative flex items-center justify-center bg-blue-600/[0.02] border border-blue-500/10 rounded-2xl p-4 overflow-hidden">
                
                {/* School block at center */}
                <div className="absolute w-20 h-20 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex flex-col items-center justify-center z-10 shadow-md">
                  <Building className="w-8 h-8 text-blue-500 animate-pulse" />
                  <span className="text-[9px] font-mono font-bold mt-1 text-blue-400">ESCOLA</span>
                </div>

                {/* Left satellite: Teachers & Students */}
                <div className="absolute left-6 top-8 px-2.5 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center gap-1.5 shadow-sm">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <div className="text-[9px] font-bold">
                    <span className="block text-white leading-none">Professores</span>
                    <span className="block text-slate-400 font-normal leading-none mt-0.5">& Alunos</span>
                  </div>
                </div>

                {/* Right satellite: Computers & Tech */}
                <div className="absolute right-6 top-6 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-1.5 shadow-sm">
                  <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="text-[9px] font-bold">
                    <span className="block text-white leading-none">Tecnologia</span>
                    <span className="block text-slate-400 font-normal leading-none mt-0.5">Sistemas</span>
                  </div>
                </div>

                {/* Lower satellite: Dashboard & AI */}
                <div className="absolute bottom-4 right-1/4 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-1.5 shadow-sm">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <div className="text-[9px] font-bold">
                    <span className="block text-white leading-none">Dashboard IA</span>
                    <span className="block text-slate-400 font-normal leading-none mt-0.5">Educação Digital</span>
                  </div>
                </div>

                {/* Connector SVG lines */}
                <svg className="absolute inset-0 w-full h-full opacity-30 z-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 60,35 Q 120,50 180,35" stroke="#2563EB" strokeWidth="1.5" fill="none" strokeDasharray="4" />
                  <path d="M 180,35 Q 260,35 300,70" stroke="#10B981" strokeWidth="1.5" fill="none" strokeDasharray="4" />
                  <path d="M 60,35 Q 160,110 240,130" stroke="#F59E0B" strokeWidth="1.5" fill="none" strokeDasharray="4" />
                </svg>
              </div>

              <div className="mt-4 space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Educação Inteligente Integrada</h4>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Nossa plataforma une diretores, secretaria, docentes, alunos e responsáveis sob o mesmo ecossistema com dados unificados e alertas inteligentes.
                </p>
              </div>
            </div>

            {/* TENANT TREE ARCHITECTURE INFO PANEL */}
            <div className={`p-6 rounded-3xl border space-y-4 ${
              isDark ? 'bg-slate-900/20 border-slate-800' : 'bg-slate-100/50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Estrutura Multitenant (Tenant Organization)</h4>
              </div>

              <div className="space-y-3 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-blue-500">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Classium Root (Núcleo)</span>
                </div>
                
                <div className="pl-4 border-l border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <ChevronRight className="w-3 h-3" />
                    <span>Organização Criada ({form.nomeFantasia || 'Sua Escola'})</span>
                  </div>
                  
                  <div className="pl-4 border-l border-slate-700/60 space-y-1 text-slate-400 text-[10px]">
                    <div>📂 Dados Institucionais & INEP</div>
                    <div>⚙️ Configurações & Plano Ativo</div>
                    <div>🎨 Personalização de Logo e Cores</div>
                  </div>

                  <div className="flex items-center gap-2 text-emerald-400">
                    <ChevronRight className="w-3 h-3" />
                    <span>Administrador ({form.adminNome || 'Novo Admin'})</span>
                  </div>

                  <div className="flex items-center gap-2 text-amber-400">
                    <ChevronRight className="w-3 h-3" />
                    <span>Configurações Iniciais</span>
                  </div>
                  <div className="pl-4 border-l border-slate-700/60 text-slate-400 text-[10px]">
                    <span>⏱️ {form.qtdModulos} por turno / tempo de {form.tempoAula}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PREMIUM DIFFERENTIALS */}
            <div className="space-y-3.5 pt-2">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 block">Diferenciais de Segurança & Infraestrutura</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">🔒 Criptografia Ativa</span>
                    <span className="text-[10px] text-slate-400">Ambiente seguro com criptografia de ponta.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs">
                  <Server className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">☁️ Backup em Nuvem</span>
                    <span className="text-[10px] text-slate-400">Sincronização instantânea e redundante.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs">
                  <RefreshCw className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">⚡ Onboarding Veloz</span>
                    <span className="text-[10px] text-slate-400">Cadastre e configure em menos de 5 minutos.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs">
                  <Layers className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">📊 Escalabilidade Real</span>
                    <span className="text-[10px] text-slate-400">Preparado para múltiplas filiais.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs">
                  <Cpu className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">🤖 Configuração IA</span>
                    <span className="text-[10px] text-slate-400">Parametrização assistida por IA inteligente.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs">
                  <Building className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">🏫 Redes de Ensino</span>
                    <span className="text-[10px] text-slate-400">Suporta secretarias de educação e grupos.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ADMINISTRATOR FAST BYPASS SHORTCUTS */}
            <div className={`p-6 rounded-3xl border border-dashed transition-all ${
              isDark 
                ? 'bg-slate-950/60 border-blue-500/30' 
                : 'bg-blue-50/40 border-blue-200 shadow-sm'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-gold animate-pulse" />
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-gold block">
                  Atalhos do Administrador da Plataforma
                </span>
              </div>
              <p className={`text-xs font-light mb-4 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Acesse diretamente as áreas de testes sem a necessidade de preencher o formulário:
              </p>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => setMode('professor')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-amber-500/10 to-amber-500/20 hover:from-amber-500/20 hover:to-amber-500/30 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 transition-all hover:scale-[1.02]"
                >
                  <GraduationCap className="w-5 h-5 mb-1 text-amber-400" />
                  <span className="text-[11px] font-bold tracking-wide">Professor</span>
                </button>

                <button
                  onClick={() => setMode('family')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-emerald-500/20 hover:from-emerald-500/20 hover:to-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 transition-all hover:scale-[1.02]"
                >
                  <Users className="w-5 h-5 mb-1 text-emerald-400" />
                  <span className="text-[11px] font-bold tracking-wide">Família</span>
                </button>

                <button
                  onClick={() => setMode('admin')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-blue-500/10 to-blue-500/20 hover:from-blue-500/20 hover:to-blue-500/30 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 transition-all hover:scale-[1.02]"
                >
                  <Building className="w-5 h-5 mb-1 text-blue-400" />
                  <span className="text-[11px] font-bold tracking-wide">Gestão</span>
                </button>
              </div>
            </div>

          </section>

          {/* COLUMN 2: THE MAIN CARD & WIZARD FORM (Col 7) */}
          <section className="lg:col-span-7">
            
            <div className={`rounded-3xl border p-6 md:p-8 space-y-6 relative overflow-hidden backdrop-blur-md transition-all ${
              isDark 
                ? 'bg-slate-900/60 border-slate-800 shadow-2xl' 
                : 'bg-white border-slate-200 shadow-xl'
            }`}>
              
              {/* TOP HEADER & DEMO AUTO-FILL */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-dashed pb-5 border-slate-700/30">
                <div className="text-left">
                  <h3 className="text-xl font-serif font-extrabold tracking-tight">
                    Criar Nova Unidade Escolar
                  </h3>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Preencha as informações abaixo para implantar seu Classium.
                  </p>
                </div>

                <button
                  onClick={handleAutoFill}
                  className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
                  title="Preencher com dados de simulação escolares completos"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Demonstração Rápida (Preencher)</span>
                </button>
              </div>

              {/* PROGRESS STEP BAR */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-blue-500 uppercase tracking-widest">
                    Passo {currentStep} de {totalSteps}
                  </span>
                  <span className="text-slate-400">
                    {currentStep === 1 && 'Dados Institucionais & Endereço'}
                    {currentStep === 2 && 'Contatos & Responsável Geral'}
                    {currentStep === 3 && 'Parâmetros Acadêmicos & Módulos'}
                    {currentStep === 4 && 'Criar Administrador & LGPD'}
                  </span>
                </div>

                {/* Outer Progress Bar */}
                <div className={`h-2 rounded-full w-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  />
                </div>
              </div>

              {/* ACTION FORM */}
              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                {submitError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 animate-fade-in" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <div className="flex-1">
                      <span className="font-bold block text-red-400">Falha no Provisionamento da Instituição</span>
                      <span className="text-red-300">{submitError}</span>
                    </div>
                  </div>
                )}
                
                {/* STEP 1: DADOS DA INSTITUIÇÃO & ENDEREÇO */}
                {currentStep === 1 && (
                  <div className="space-y-5 animate-fade-in">
                    
                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-500 block">Dados da Instituição de Ensino</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Nome da Escola *</label>
                        <input
                          type="text"
                          name="nomeEscola"
                          required
                          value={form.nomeEscola}
                          onChange={handleChange}
                          placeholder="Ex: Escola de Ensino Fundamental Alvorada"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                        {errors.nomeEscola && (
                          <span className="text-[10px] text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors.nomeEscola}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Nome Fantasia</label>
                        <input
                          type="text"
                          name="nomeFantasia"
                          value={form.nomeFantasia}
                          onChange={handleChange}
                          placeholder="Ex: Alvorada Kids"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Razão Social</label>
                        <input
                          type="text"
                          name="razaoSocial"
                          value={form.razaoSocial}
                          onChange={handleChange}
                          placeholder="Ex: Centro Educacional Alvorada S/A"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">CNPJ *</label>
                        <input
                          type="text"
                          name="cnpj"
                          required
                          value={form.cnpj}
                          onChange={handleChange}
                          placeholder="Ex: 00.000.000/0001-00"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                        {errors.cnpj && (
                          <span className="text-[10px] text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors.cnpj}
                          </span>
                        )}
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Código INEP</label>
                        <input
                          type="text"
                          name="inep"
                          value={form.inep}
                          onChange={handleChange}
                          placeholder="Ex: 35123456"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Categoria da Unidade</label>
                        <select
                          name="categoria"
                          value={form.categoria}
                          onChange={handleChange}
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        >
                          <option value="Municipal">Municipal</option>
                          <option value="Estadual">Estadual</option>
                          <option value="Federal">Federal</option>
                          <option value="Particular">Particular</option>
                          <option value="Filantrópica">Filantrópica</option>
                          <option value="Técnica">Técnica</option>
                          <option value="Universidade">Universidade</option>
                          <option value="Faculdade">Faculdade</option>
                          <option value="Curso Livre">Curso Livre</option>
                        </select>
                      </div>

                    </div>

                    <div className="h-px bg-slate-700/20 my-4"></div>

                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-500 block">Endereço da Unidade</span>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      
                      <div className="sm:col-span-4 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">CEP</label>
                        <div className="relative">
                          <input
                            type="text"
                            name="cep"
                            value={form.cep}
                            onChange={handleCepChange}
                            placeholder="01311-200"
                            className={`w-full text-xs rounded-xl pl-4 pr-10 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={triggerCepMockSearch}
                            className="absolute right-2 top-2 p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10"
                            title="Buscar CEP automaticamente"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[9px] text-slate-500 block">Digite e aguarde, ou clique no ícone para preencher</span>
                      </div>

                      <div className="sm:col-span-8 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Endereço (Rua/Avenida)</label>
                        <input
                          type="text"
                          name="endereco"
                          value={form.endereco}
                          onChange={handleChange}
                          placeholder="Rua, Avenida, Praça"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-12 gap-4">
                      
                      <div className="sm:col-span-3 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Número</label>
                        <input
                          type="text"
                          name="numero"
                          value={form.numero}
                          onChange={handleChange}
                          placeholder="123"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                      <div className="sm:col-span-5 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Complemento</label>
                        <input
                          type="text"
                          name="complemento"
                          value={form.complemento}
                          onChange={handleChange}
                          placeholder="Ex: Bloco A"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                      <div className="sm:col-span-4 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Bairro</label>
                        <input
                          type="text"
                          name="bairro"
                          value={form.bairro}
                          onChange={handleChange}
                          placeholder="Bairro"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-12 gap-4">
                      
                      <div className="sm:col-span-5 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Cidade</label>
                        <input
                          type="text"
                          name="cidade"
                          value={form.cidade}
                          onChange={handleChange}
                          placeholder="Cidade"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Estado (UF)</label>
                        <select
                          name="estado"
                          value={form.estado}
                          onChange={handleChange}
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          } ${errors.estado ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                        >
                          <option value="">Selecione...</option>
                          {BRAZILIAN_UFS.map(uf => (
                            <option key={uf.sigla} value={uf.sigla}>
                              {uf.sigla} - {uf.nome}
                            </option>
                          ))}
                        </select>
                        {errors.estado && <p className="text-[10px] text-rose-500 font-medium">{errors.estado}</p>}
                      </div>

                      <div className="sm:col-span-4 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">País</label>
                        <input
                          type="text"
                          name="pais"
                          value={form.pais}
                          onChange={handleChange}
                          placeholder="Brasil"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                    </div>

                  </div>
                )}

                {/* STEP 2: CONTATOS & RESPONSÁVEL LEGAL */}
                {currentStep === 2 && (
                  <div className="space-y-5 animate-fade-in">
                    
                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-500 block">Canais de Contato Institucional</span>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Telefone Principal</label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="text"
                            name="telefone"
                            value={form.telefone}
                            onChange={handleChange}
                            placeholder="(11) 3333-4444"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Telefone Secundário</label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="text"
                            name="telefoneSec"
                            value={form.telefoneSec}
                            onChange={handleChange}
                            placeholder="(11) 3333-5555"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">WhatsApp Oficial</label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 absolute left-3 top-3.5 text-green-500" />
                          <input
                            type="text"
                            name="whatsapp"
                            value={form.whatsapp}
                            onChange={handleChange}
                            placeholder="(11) 99999-8888"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">E-mail Institucional</label>
                        <div className="relative">
                          <Mail className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="email"
                            name="emailInstitucional"
                            value={form.emailInstitucional}
                            onChange={handleChange}
                            placeholder="secretaria@escola.com.br"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Site da Instituição</label>
                        <div className="relative">
                          <Globe className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="text"
                            name="site"
                            value={form.site}
                            onChange={handleChange}
                            placeholder="www.escola.com.br"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                      </div>

                    </div>

                    <div className="h-px bg-slate-700/20 my-4"></div>

                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-500 block">Responsável Legal (Diretor/Coordenador/Reitor)</span>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div className="md:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Cargo de Direção</label>
                        <select
                          name="respCargo"
                          value={form.respCargo}
                          onChange={handleChange}
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        >
                          <option value="Diretor(a)">Diretor(a)</option>
                          <option value="Coordenador(a) Geral">Coordenador(a) Geral</option>
                          <option value="Reitor(a)">Reitor(a)</option>
                          <option value="Gestor(a) Administrativo">Gestor(a) Administrativo</option>
                          <option value="Proprietário(a)">Proprietário(a)</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Nome Completo</label>
                        <div className="relative">
                          <User className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="text"
                            name="respNome"
                            value={form.respNome}
                            onChange={handleChange}
                            placeholder="Nome completo do responsável legal"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Telefone Contato</label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="text"
                            name="respTelefone"
                            value={form.respTelefone}
                            onChange={handleChange}
                            placeholder="(11) 99999-8888"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">E-mail do Responsável</label>
                        <div className="relative">
                          <Mail className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="email"
                            name="respEmail"
                            value={form.respEmail}
                            onChange={handleChange}
                            placeholder="diretor@escola.com.br"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                      </div>

                    </div>

                  </div>
                )}

                {/* STEP 3: INFORMAÇÕES ACADÊMICAS & CONFIGURAÇÕES */}
                {currentStep === 3 && (
                  <div className="space-y-5 animate-fade-in">
                    
                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-500 block">Indicadores e Volumes de Alunos</span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Ano Letivo</label>
                        <input
                          type="text"
                          name="anoLetivo"
                          value={form.anoLetivo}
                          onChange={handleChange}
                          placeholder="2026"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Qtd Alunos (est.)</label>
                        <input
                          type="number"
                          name="qtdAlunos"
                          value={form.qtdAlunos}
                          onChange={handleChange}
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Qtd Professores</label>
                        <input
                          type="number"
                          name="qtdProfessores"
                          value={form.qtdProfessores}
                          onChange={handleChange}
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Qtd Funcionários</label>
                        <input
                          type="number"
                          name="qtdFuncionarios"
                          value={form.qtdFuncionarios}
                          onChange={handleChange}
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Salas de Aula</label>
                        <input
                          type="number"
                          name="qtdSalas"
                          value={form.qtdSalas}
                          onChange={handleChange}
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Turnos Ativos</label>
                        <input
                          type="number"
                          name="qtdTurnos"
                          value={form.qtdTurnos}
                          onChange={handleChange}
                          placeholder="2"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5 col-span-2">
                        <label className="text-xs font-bold text-slate-400">Sistema de Ensino</label>
                        <input
                          type="text"
                          name="sistemaEnsino"
                          value={form.sistemaEnsino}
                          onChange={handleChange}
                          placeholder="Ex: Anglo, Positivo, Próprio"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                    </div>

                    <div className="h-px bg-slate-700/20 my-4"></div>

                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-500 block">Grade Horária & Configurações de Módulo</span>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Carga Horária Total</label>
                        <input
                          type="text"
                          name="cargaHoraria"
                          value={form.cargaHoraria}
                          onChange={handleChange}
                          placeholder="800 horas/ano"
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Aulas por Turno (Módulos)</label>
                        <select
                          name="qtdModulos"
                          value={form.qtdModulos}
                          onChange={handleChange}
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        >
                          <option value="4 aulas">4 aulas</option>
                          <option value="5 aulas">5 aulas</option>
                          <option value="6 aulas">6 aulas</option>
                          <option value="Personalizado">Personalizado</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Duração de Aula</label>
                        <select
                          name="tempoAula"
                          value={form.tempoAula}
                          onChange={handleChange}
                          className={`w-full text-xs rounded-xl px-4 py-3 outline-none border transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                          }`}
                        >
                          <option value="45 minutos">45 minutos</option>
                          <option value="50 minutos">50 minutos</option>
                          <option value="60 minutos">60 minutos</option>
                          <option value="Personalizado">Personalizado</option>
                        </select>
                      </div>

                    </div>

                    <div className="h-px bg-slate-700/20 my-4"></div>

                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-500 block">Recursos Operacionais Ativos</span>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      
                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-700/30 cursor-pointer hover:bg-slate-700/10 transition-colors">
                        <input
                          type="checkbox"
                          name="recursoAcademico"
                          checked={form.recursoAcademico}
                          onChange={handleChange}
                          className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-opacity-20"
                        />
                        <div className="text-left text-[11px]">
                          <span className="font-bold block">Acadêmico</span>
                          <span className="text-[9px] text-slate-400">Notas e Frequência</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-700/30 cursor-pointer hover:bg-slate-700/10 transition-colors">
                        <input
                          type="checkbox"
                          name="recursoFinanceiro"
                          checked={form.recursoFinanceiro}
                          onChange={handleChange}
                          className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-opacity-20"
                        />
                        <div className="text-left text-[11px]">
                          <span className="font-bold block">Financeiro</span>
                          <span className="text-[9px] text-slate-400">Mensalidades & Caixa</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-700/30 cursor-pointer hover:bg-slate-700/10 transition-colors">
                        <input
                          type="checkbox"
                          name="recursoComunicacao"
                          checked={form.recursoComunicacao}
                          onChange={handleChange}
                          className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-opacity-20"
                        />
                        <div className="text-left text-[11px]">
                          <span className="font-bold block">Comunicação</span>
                          <span className="text-[9px] text-slate-400">Mensageria & Avisos</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-700/30 cursor-pointer hover:bg-slate-700/10 transition-colors">
                        <input
                          type="checkbox"
                          name="recursoPedagogico"
                          checked={form.recursoPedagogico}
                          onChange={handleChange}
                          className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-opacity-20"
                        />
                        <div className="text-left text-[11px]">
                          <span className="font-bold block">Pedagógico</span>
                          <span className="text-[9px] text-slate-400">Diário & Planejamento</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-700/30 cursor-pointer hover:bg-slate-700/10 transition-colors">
                        <input
                          type="checkbox"
                          name="recursoTransporte"
                          checked={form.recursoTransporte}
                          onChange={handleChange}
                          className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-opacity-20"
                        />
                        <div className="text-left text-[11px]">
                          <span className="font-bold block">Transporte</span>
                          <span className="text-[9px] text-slate-400">Rotas & Motoristas</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-700/30 cursor-pointer hover:bg-slate-700/10 transition-colors">
                        <input
                          type="checkbox"
                          name="recursoRelatorios"
                          checked={form.recursoRelatorios}
                          onChange={handleChange}
                          className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-opacity-20"
                        />
                        <div className="text-left text-[11px]">
                          <span className="font-bold block">Relatórios IA</span>
                          <span className="text-[9px] text-slate-400">Suporte Socioemocional</span>
                        </div>
                      </label>

                    </div>

                  </div>
                )}

                {/* STEP 4: CRIAR ADMINISTRADOR & LGPD */}
                {currentStep === 4 && (
                  <div className="space-y-5 animate-fade-in">
                    
                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-500 block">Credenciais do Administrador Principal</span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Nome Completo *</label>
                        <div className="relative">
                          <User className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="text"
                            name="adminNome"
                            required
                            value={form.adminNome}
                            onChange={handleChange}
                            placeholder="Nome do gestor do sistema"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                        {errors.adminNome && (
                          <span className="text-[10px] text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors.adminNome}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">E-mail Institucional *</label>
                        <div className="relative">
                          <Mail className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="email"
                            name="adminEmail"
                            required
                            value={form.adminEmail}
                            onChange={handleChange}
                            placeholder="admin@escola.com.br"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                        {errors.adminEmail && (
                          <span className="text-[10px] text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors.adminEmail}
                          </span>
                        )}
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">CPF do Administrador</label>
                        <div className="relative">
                          <FileText className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="text"
                            name="adminCpf"
                            value={form.adminCpf}
                            onChange={handleChange}
                            placeholder="123.456.789-00"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Celular Corporativo</label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="text"
                            name="adminTelefone"
                            value={form.adminTelefone}
                            onChange={handleChange}
                            placeholder="(11) 99999-7777"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Senha de Acesso *</label>
                        <div className="relative">
                          <KeyRound className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="password"
                            name="adminSenha"
                            required
                            value={form.adminSenha}
                            onChange={handleChange}
                            placeholder="Mínimo 8 caracteres"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                        {errors.adminSenha && (
                          <span className="text-[10px] text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors.adminSenha}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400">Confirmar Senha *</label>
                        <div className="relative">
                          <KeyRound className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                          <input
                            type="password"
                            name="adminConfirmarSenha"
                            required
                            value={form.adminConfirmarSenha}
                            onChange={handleChange}
                            placeholder="Repita a senha cadastrada"
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-3 outline-none border transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>
                        {errors.adminConfirmarSenha && (
                          <span className="text-[10px] text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors.adminConfirmarSenha}
                          </span>
                        )}
                      </div>

                    </div>

                    {/* TWO FACTOR AUTHENTICATION SIM/NAO */}
                    <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <span className="text-xs font-bold text-slate-300 block">🔑 Autenticação em Dois Fatores (MFA)</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Exigir verificação via celular por segurança adicionada.</span>
                      </div>
                      
                      <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-700/30 shrink-0 self-stretch sm:self-auto justify-center">
                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, adminMfa: true }))}
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            form.adminMfa ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, adminMfa: false }))}
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            !form.adminMfa ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Não
                        </button>
                      </div>
                    </div>

                    <div className="h-px bg-slate-700/20 my-4"></div>

                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-500 block">Segurança de Dados e Termos (LGPD)</span>

                    {/* LGPD CHECKBOXES */}
                    <div className="space-y-3">
                      
                      <label className="flex items-start gap-3 cursor-pointer text-xs group">
                        <input
                          type="checkbox"
                          name="chkAutorizacao"
                          checked={form.chkAutorizacao}
                          onChange={handleChange}
                          className="mt-0.5 w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-opacity-20"
                        />
                        <span className="text-slate-400 group-hover:text-slate-300 transition-colors">
                          Declaro que possuo autorização legal para cadastrar esta instituição escolar e atuar em nome dela.
                        </span>
                      </label>
                      {errors.chkAutorizacao && (
                        <span className="text-[10px] text-red-500 block pl-7">{errors.chkAutorizacao}</span>
                      )}

                      <label className="flex items-start gap-3 cursor-pointer text-xs group">
                        <input
                          type="checkbox"
                          name="chkTermos"
                          checked={form.chkTermos}
                          onChange={handleChange}
                          className="mt-0.5 w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-opacity-20"
                        />
                        <span className="text-slate-400 group-hover:text-slate-300 transition-colors">
                          Concordo com os <strong className="text-blue-500">Termos de Uso</strong> e as condições de licença de software Classium.
                        </span>
                      </label>
                      {errors.chkTermos && (
                        <span className="text-[10px] text-red-500 block pl-7">{errors.chkTermos}</span>
                      )}

                      <label className="flex items-start gap-3 cursor-pointer text-xs group">
                        <input
                          type="checkbox"
                          name="chkPrivacidade"
                          checked={form.chkPrivacidade}
                          onChange={handleChange}
                          className="mt-0.5 w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-opacity-20"
                        />
                        <span className="text-slate-400 group-hover:text-slate-300 transition-colors">
                          Concordo com a <strong className="text-blue-500">Política de Privacidade</strong> em consonância estrita com a LGPD brasileira.
                        </span>
                      </label>
                      {errors.chkPrivacidade && (
                        <span className="text-[10px] text-red-500 block pl-7">{errors.chkPrivacidade}</span>
                      )}

                    </div>

                  </div>
                )}

                {/* STEPS CONTROL BUTTONS */}
                <div className="flex justify-between items-center pt-6 border-t border-slate-700/20">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className={`px-5 py-3 border rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>
                  ) : (
                    <div></div>
                  )}

                  {currentStep < totalSteps ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-blue-500/10 hover:translate-x-0.5 flex items-center gap-1.5 ml-auto"
                    >
                      <span>Avançar</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:scale-[1.01] flex items-center gap-2 ml-auto"
                      id="submit-school-form"
                    >
                      <Building className="w-4.5 h-4.5 text-white" />
                      <span>Cadastrar minha Unidade Escolar</span>
                    </button>
                  )}
                </div>

              </form>

              {/* LIVE CONFIG SUMMARY PREVIEW DRAWER */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-100/30 border-slate-200'
              }`}>
                <div className="flex items-start gap-2 max-w-sm">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Resumo Acadêmico Inicial</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {form.nomeEscola ? `Instituição: ${form.nomeEscola}` : 'Aguardando preenchimento...'} 
                      {form.cep && ` | CEP: ${form.cep}`}
                    </span>
                  </div>
                </div>
                
                {form.nomeEscola && (
                  <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    {form.categoria} • {form.qtdAlunos || '0'} Alunos • {form.qtdModulos}
                  </span>
                )}
              </div>

            </div>

          </section>

        </main>
      )}

      {/* PROVISIONING ENVIRONMENT LOADING SCREEN OVERLAY */}
      {isProvisioning && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-50">
          <div className="max-w-md w-full mx-6 p-8 rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl space-y-6 text-center">
            
            {/* Spinning Indicator */}
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-serif font-bold text-white">Criando Unidade Escolar</h3>
              <p className="text-xs text-slate-400">Por favor, aguarde enquanto alocamos e configuramos seu ambiente isolado.</p>
            </div>

            {/* Simulated list with checklist animation */}
            <div className="space-y-3 pt-2 text-left font-mono text-[11px]">
              {provisioningMessages.map((msg, index) => {
                const isActive = provisioningStep === index;
                const isCompleted = provisioningStep > index;
                
                return (
                  <div 
                    key={index} 
                    className={`flex items-center gap-2.5 transition-all duration-300 ${
                      isActive ? 'text-blue-400 font-bold' : isCompleted ? 'text-emerald-500 opacity-60' : 'text-slate-600'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : isActive ? (
                      <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0"></div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-800 shrink-0"></div>
                    )}
                    <span>{msg}</span>
                  </div>
                );
              })}
            </div>

            {/* Inner progress bar */}
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${((provisioningStep + 1) / provisioningMessages.length) * 100}%` }}
              />
            </div>

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className={`relative z-10 py-8 px-6 md:px-12 border-t mt-12 transition-colors ${
        isDark ? 'border-slate-900 bg-slate-950/80 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
          <div className="text-center sm:text-left space-y-1">
            <span className="font-bold">Classium Inteligência Educacional Integrada</span>
            <p className="text-[10px] opacity-60">
              Primeiro assistente de implantação de rede escolar. Em estrita conformidade com a LGPD (Lei Geral de Proteção de Dados).
            </p>
          </div>

          <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1 text-emerald-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Criptografia Bancária SSL
            </span>
            <span className="hidden sm:inline opacity-30">|</span>
            <span className="text-blue-500">Ambiente Multi-Tenant v4.2</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
