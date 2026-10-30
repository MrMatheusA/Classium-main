import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePlatform } from './PlatformContext';

export interface PlanBenefit {
  id: string;
  text: string;
  included: boolean;
}

export interface PlanHistoryEntry {
  id: string;
  date: string;
  author: string;
  action: string;
  details: string;
}

export interface SystemPlan {
  id: string;
  productKey: 'conecta_prof' | 'apoio_empresa' | 'apoio_prestador' | 'studio_prime' | 'smart_horarios' | 'gestor' | 'professor' | 'familia' | 'carreira' | 'rede_reforco' | 'marketplace' | string;
  productCategory: string;
  productName: string;
  
  name: string;
  price: number;
  originalPrice: number;
  period: 'Mensal' | 'Anual' | 'Semestral' | 'Vitalício';
  billingDetail?: string;
  description: string;
  features: string[];
  benefitsList: PlanBenefit[];
  
  iconName?: string;
  cardColor: string;
  buttonColor: string;
  badgeColor: string;
  buttonText: string;
  promoText?: string;
  
  displayOrder: number;
  highlightTag: 'Recomendado' | 'Popular' | 'Premium' | 'VIP' | 'Oculto' | 'Ativo' | 'Nenhum' | string;
  status: 'Ativo' | 'Oculto' | 'Desativado' | 'Arquivado';
  
  // Visual FX
  bgImage?: string;
  hasGlow: boolean;
  gradientStyle: string;
  borderColor: string;
  animationFX: 'none' | 'pulse' | 'shimmer' | 'border-glow';
  
  // Promoção Relâmpago / Tempo Limitado
  isPromoActive: boolean;
  promoOriginalPrice: number;
  promoPrice: number;
  promoBadgeText: string;
  promoStartDateTime: string;
  promoEndDateTime: string;
  showCountdown: boolean;
  
  history: PlanHistoryEntry[];
}

export const INITIAL_SYSTEM_PLANS: SystemPlan[] = [
  // 1. Plano Essencial Profissional (Profissionais Parceiros - R$ 99/mês)
  {
    id: 'plan_essencial_prof',
    productKey: 'conecta_prof',
    productCategory: 'Profissionais Parceiros',
    productName: 'Classium Conecta Profissional',
    name: 'Plano Essencial Profissional',
    price: 99,
    originalPrice: 99,
    period: 'Mensal',
    billingDetail: 'R$ 99/mês',
    description: 'Consolidação de visibilidade, conexão direta com alunos, gestão de perfil e agendamento digital no Classium Conecta.',
    features: ['Perfil Completo & Cartão 3D', 'Destaque e Alta Visibilidade', 'Agenda Digital Ativa', 'Link Direto WhatsApp & Redes', 'Selo Homologado Classium'],
    benefitsList: [
      { id: 'b1', text: 'Perfil Completo com Cartão Virtual 3D e Mini Currículo', included: true },
      { id: 'b2', text: 'Destaque e Prioridade de Busca por Região', included: true },
      { id: 'b3', text: 'Agenda Digital Ativa com Agendamentos', included: true },
      { id: 'b4', text: 'Link Direto para WhatsApp, Redes e Site Próprio', included: true },
      { id: 'b5', text: 'Selo Homologado de Confiança Verificado', included: true },
      { id: 'b6', text: 'Relatório Mensal de Visualizações e Interações', included: true },
    ],
    iconName: 'Crown',
    cardColor: 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/60 text-white',
    buttonColor: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold hover:brightness-110',
    badgeColor: 'bg-amber-500 text-slate-950 font-black',
    buttonText: 'ASSINAR PLANO ESSENCIAL',
    promoText: 'CONSOLIDADO • R$ 99/MÊS',
    displayOrder: 1,
    highlightTag: 'Popular',
    status: 'Ativo',
    hasGlow: true,
    gradientStyle: 'from-amber-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-amber-500/60',
    animationFX: 'border-glow',
    isPromoActive: false,
    promoOriginalPrice: 199,
    promoPrice: 99,
    promoBadgeText: 'Melhor Valor',
    promoStartDateTime: '',
    promoEndDateTime: '',
    showCountdown: false,
    history: [
      { id: 'h1', date: new Date().toISOString(), author: 'Sistema', action: 'Consolidação', details: 'Plano Essencial Profissional ativado (R$ 99/mês)' }
    ]
  },

  // 2. Plano Premium Institucional (Empresas e Instituições - R$ 299/mês)
  {
    id: 'plan_premium_inst',
    productKey: 'apoio_empresa',
    productCategory: 'Empresas & Instituições',
    productName: 'Divulgação Institucional Classium',
    name: 'Plano Premium Institucional',
    price: 299,
    originalPrice: 299,
    period: 'Mensal',
    billingDetail: 'R$ 299/mês',
    description: 'Solução completa para escolas e instituições de ensino com divulgação massiva, captação de leads e branding institucional.',
    features: ['Divulgação Massiva nos Painéis', 'Encaminhamento de Leads WhatsApp', 'Divulgação de Campanhas & Cupons', 'Co-branding Oficial Classium', 'Estatísticas Avançadas & Relatórios'],
    benefitsList: [
      { id: 'b1', text: 'Divulgação em Painéis de Docentes, Gestores e Alunos', included: true },
      { id: 'b2', text: 'Captação e Encaminhamento Automático de Leads WhatsApp', included: true },
      { id: 'b3', text: 'Divulgação de Campanhas, Bolsas e Cupons Especiais', included: true },
      { id: 'b4', text: 'Co-branding Oficial e Destaque de Marca', included: true },
      { id: 'b5', text: 'Relatórios de Alcance e Conversão Analíticos', included: true },
      { id: 'b6', text: 'Suporte Corporativo Prioritário', included: true },
    ],
    iconName: 'Building',
    cardColor: 'bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 border-blue-500/60 text-white',
    buttonColor: 'bg-blue-600 hover:bg-blue-500 text-white font-bold',
    badgeColor: 'bg-blue-500 text-white font-bold',
    buttonText: 'ASSINAR PLANO PREMIUM',
    promoText: 'INSTITUCIONAL • R$ 299/MÊS',
    displayOrder: 2,
    highlightTag: 'Recomendado',
    status: 'Ativo',
    hasGlow: true,
    gradientStyle: 'from-blue-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-blue-500/60',
    animationFX: 'shimmer',
    isPromoActive: false,
    promoOriginalPrice: 499,
    promoPrice: 299,
    promoBadgeText: 'Melhor Valor',
    promoStartDateTime: '',
    promoEndDateTime: '',
    showCountdown: false,
    history: [
      { id: 'h1', date: new Date().toISOString(), author: 'Sistema', action: 'Consolidação', details: 'Plano Premium Institucional ativado (R$ 299/mês)' }
    ]
  },

  // 3. Plano Corporativo Soluções (Prestadores de Serviço - R$ 399/mês)
  {
    id: 'plan_corporativo_sol',
    productKey: 'apoio_prestador',
    productCategory: 'Prestadores de Serviço & Obras',
    productName: 'Cadastro Prestador & Soluções',
    name: 'Plano Corporativo Soluções',
    price: 399,
    originalPrice: 399,
    period: 'Mensal',
    billingDetail: 'R$ 399/mês',
    description: 'Hub de negócios para fornecedores educacionais com acesso a licitações, cotações ativas e portfólio de projetos e obras.',
    features: ['Aviso Integrado de Licitações', 'Portfólio Ativo de Projetos & Obras', 'Central de Cotações & Orçamentos', 'Co-branding Exclusivo Classium', 'Suporte Técnico e Engenharia'],
    benefitsList: [
      { id: 'b1', text: 'Canal Integrado de Avisos de Licitação Escolar', included: true },
      { id: 'b2', text: 'Portfólio e Galeria Ativa de Projetos e Obras', included: true },
      { id: 'b3', text: 'Central de Cotações e Pedidos de Orçamento', included: true },
      { id: 'b4', text: 'Selo de Homologação Gestora Classium', included: true },
      { id: 'b5', text: 'Co-branding Exclusivo para Licitações e Parcerias', included: true },
      { id: 'b6', text: 'Suporte Técnico e de Engenharia Especializado', included: true },
    ],
    iconName: 'Sparkles',
    cardColor: 'bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border-purple-500/60 text-white',
    buttonColor: 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold',
    badgeColor: 'bg-purple-500 text-white font-bold',
    buttonText: 'ASSINAR PLANO CORPORATIVO',
    promoText: 'CORPORATIVO • R$ 399/MÊS',
    displayOrder: 3,
    highlightTag: 'VIP',
    status: 'Ativo',
    hasGlow: true,
    gradientStyle: 'from-purple-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-purple-500/60',
    animationFX: 'pulse',
    isPromoActive: false,
    promoOriginalPrice: 799,
    promoPrice: 399,
    promoBadgeText: 'Melhor Valor',
    promoStartDateTime: '',
    promoEndDateTime: '',
    showCountdown: false,
    history: [
      { id: 'h1', date: new Date().toISOString(), author: 'Sistema', action: 'Consolidação', details: 'Plano Corporativo Soluções ativado (R$ 399/mês)' }
    ]
  },

  // 4. Classium Studio Prime
  {
    id: 'plan_studio_mensal',
    productKey: 'studio_prime',
    productCategory: 'Classium Studio Prime',
    productName: 'Classium Studio PRIME',
    name: 'Plano Mensal',
    price: 39.90,
    originalPrice: 39.90,
    period: 'Mensal',
    billingDetail: 'Cobrado mensalmente. Cancele quando quiser.',
    description: 'Flexibilidade para o dia a dia pedagógico do docente com todos os geradores IA liberados.',
    features: ['Todos os 300+ geradores liberados', 'Exportação Word, PDF e Google Docs', 'Adaptação inclusiva (TEA/TDAH)', 'Suporte prioritário por e-mail'],
    benefitsList: [
      { id: 'b1', text: 'Todos os 300+ geradores de IA liberados', included: true },
      { id: 'b2', text: 'Exportação em Word, PDF e Google Docs', included: true },
      { id: 'b3', text: 'Adaptação inclusiva de conteúdos (TEA/TDAH/PDI)', included: true },
      { id: 'b4', text: 'Suporte prioritário por e-mail', included: true },
    ],
    iconName: 'Zap',
    cardColor: 'bg-slate-900/90 border-slate-700 text-white',
    buttonColor: 'bg-slate-800 hover:bg-slate-700 text-white font-bold',
    badgeColor: 'bg-slate-700 text-slate-300',
    buttonText: 'ASSINAR PLANO MENSAL',
    promoText: 'SEM FIDELIDADE',
    displayOrder: 1,
    highlightTag: 'Ativo',
    status: 'Ativo',
    hasGlow: false,
    gradientStyle: 'from-slate-900 to-slate-950',
    borderColor: 'border-slate-800',
    animationFX: 'none',
    isPromoActive: false,
    promoOriginalPrice: 39.90,
    promoPrice: 29.90,
    promoBadgeText: '',
    promoStartDateTime: '',
    promoEndDateTime: '',
    showCountdown: false,
    history: []
  },
  {
    id: 'plan_studio_anual',
    productKey: 'studio_prime',
    productCategory: 'Classium Studio Prime',
    productName: 'Classium Studio PRIME',
    name: 'Plano Anual Prime',
    price: 29.90,
    originalPrice: 39.90,
    period: 'Anual',
    billingDetail: '12x de R$ 29,90/mês (Equivalente a R$ 358,80/ano. Economia de R$ 120,00 no ano).',
    description: 'O melhor valor para docentes e escolas com acesso ilimitado e selo dourado no perfil.',
    features: ['Tudo do Plano Mensal com 25% de Desconto', 'Acesso Prioritário a novos modelos de IA', 'Selo Dourado VIP em seu perfil docente', 'Garantia incondicional de 7 dias grátis'],
    benefitsList: [
      { id: 'b1', text: 'Tudo do Plano Mensal com 25% de Desconto', included: true },
      { id: 'b2', text: 'Acesso Prioritário a novos modelos e modelos LLM avançados', included: true },
      { id: 'b3', text: 'Selo Dourado VIP em seu perfil docente', included: true },
      { id: 'b4', text: 'Garantia incondicional de 7 dias grátis', included: true },
    ],
    iconName: 'Crown',
    cardColor: 'bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 border-amber-400 text-white',
    buttonColor: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold hover:brightness-110 shadow-lg shadow-amber-500/20',
    badgeColor: 'bg-amber-400 text-slate-950 font-black',
    buttonText: '👑 QUERO SER PREMIUM — ATIVAR 7 DIAS GRÁTIS',
    promoText: '⭐ MAIS POPULAR — ECONOMIZE 25%',
    displayOrder: 2,
    highlightTag: 'Popular',
    status: 'Ativo',
    hasGlow: true,
    gradientStyle: 'from-amber-950/60 via-slate-900 to-slate-950',
    borderColor: 'border-amber-400',
    animationFX: 'border-glow',
    isPromoActive: true,
    promoOriginalPrice: 39.90,
    promoPrice: 29.90,
    promoBadgeText: '25% OFF - Garantia 7 Dias',
    promoStartDateTime: '2026-07-01T00:00',
    promoEndDateTime: '2026-12-31T23:59',
    showCountdown: true,
    history: []
  },

  // 5. Classium Smart Horários Premium
  {
    id: 'plan_smart_premium',
    productKey: 'smart_horarios',
    productCategory: 'Smart Horários Premium',
    productName: 'Classium Smart Horários Premium',
    name: 'Smart Horários Premium',
    price: 59.90,
    originalPrice: 59.90,
    period: 'Mensal',
    billingDetail: 'R$ 59,90/mês. Ideal para escolas individuais ou rede de escolas.',
    description: 'Sua escola ainda monta horários manualmente? Economize dias de trabalho com IA.',
    features: ['IA monta automaticamente', 'Corrige conflitos instantaneamente', 'Balanceamento carga horária', 'Publicação em tempo real', 'Multiunidades & várias escolas', 'Integração completa com o Classium'],
    benefitsList: [
      { id: 'b1', text: 'IA monta a grade de horários automaticamente', included: true },
      { id: 'b2', text: 'Corrige conflitos de professores instantaneamente', included: true },
      { id: 'b3', text: 'Balanceamento equitativo de carga horária e janelas', included: true },
      { id: 'b4', text: 'Publicação em tempo real no app dos professores', included: true },
      { id: 'b5', text: 'Suporte a multiunidades e turmas simultâneas', included: true },
      { id: 'b6', text: 'Integração nativa com o ecossistema Classium', included: true },
    ],
    iconName: 'Zap',
    cardColor: 'bg-gradient-to-br from-cyan-950/50 via-slate-900 to-slate-950 border-cyan-400/80 text-white',
    buttonColor: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-white font-bold hover:brightness-110 shadow-lg shadow-cyan-500/20',
    badgeColor: 'bg-cyan-400 text-slate-950 font-bold',
    buttonText: '⚡ ASSINAR AGORA — TESTAR 7 DIAS GRÁTIS',
    promoText: 'PLANO ENTERPRISE & REDES DE ENSINO',
    displayOrder: 1,
    highlightTag: 'Recomendado',
    status: 'Ativo',
    hasGlow: true,
    gradientStyle: 'from-cyan-950/60 via-slate-900 to-slate-950',
    borderColor: 'border-cyan-400/80',
    animationFX: 'pulse',
    isPromoActive: false,
    promoOriginalPrice: 99.90,
    promoPrice: 59.90,
    promoBadgeText: 'Desconto Exclusivo',
    promoStartDateTime: '',
    promoEndDateTime: '',
    showCountdown: false,
    history: []
  },

  // 6. Demais Planos do Ecossistema
  {
    id: 'plan_gestor',
    productKey: 'gestor',
    productCategory: 'Ecossistema ERP',
    productName: 'Classium Gestor',
    name: 'Plano Gestor Escolar',
    price: 299,
    originalPrice: 299,
    period: 'Mensal',
    billingDetail: 'R$ 299/mês por unidade escolar.',
    description: 'ERP completo para administração de escolas, turmas, notas e relatórios BI.',
    features: ['Gestão de Alunos', 'Boletim Inteligente', 'Suporte por Chat 24/7'],
    benefitsList: [
      { id: 'b1', text: 'Gestão completa de matrícula e quadro de turmas', included: true },
      { id: 'b2', text: 'Boletim Inteligente com gráficos em tempo real', included: true },
      { id: 'b3', text: 'Módulo de Comunicação com Responsáveis', included: true },
    ],
    iconName: 'Building',
    cardColor: 'bg-slate-900 border-slate-700 text-white',
    buttonColor: 'bg-blue-600 hover:bg-blue-500 text-white font-bold',
    badgeColor: 'bg-blue-500 text-white font-bold',
    buttonText: 'CONTRATAR GESTOR',
    promoText: 'ERP CENTRAL',
    displayOrder: 1,
    highlightTag: 'Ativo',
    status: 'Ativo',
    hasGlow: false,
    gradientStyle: 'from-slate-900 to-slate-950',
    borderColor: 'border-slate-700',
    animationFX: 'none',
    isPromoActive: false,
    promoOriginalPrice: 299,
    promoPrice: 249,
    promoBadgeText: '',
    promoStartDateTime: '',
    promoEndDateTime: '',
    showCountdown: false,
    history: []
  },
  {
    id: 'plan_professor',
    productKey: 'professor',
    productCategory: 'Ecossistema ERP',
    productName: 'Classium Professor',
    name: 'Plano Docente Individual',
    price: 49,
    originalPrice: 49,
    period: 'Mensal',
    billingDetail: 'R$ 49/mês',
    description: 'Módulo dedicado ao docente para chamada, avaliações e diário de classe por voz.',
    features: ['Diário de Classe Digital', 'Auto-correção de Provas', 'IA de Faltas'],
    benefitsList: [
      { id: 'b1', text: 'Diário de Classe Digital Sincronizado', included: true },
      { id: 'b2', text: 'Correção assistida por IA de provas', included: true },
      { id: 'b3', text: 'Lançamento de frequência em 1 clique', included: true },
    ],
    iconName: 'Award',
    cardColor: 'bg-slate-900 border-slate-700 text-white',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold',
    badgeColor: 'bg-emerald-500 text-white font-bold',
    buttonText: 'ASSINAR DOCENTE',
    promoText: 'Especialista',
    displayOrder: 2,
    highlightTag: 'Ativo',
    status: 'Ativo',
    hasGlow: false,
    gradientStyle: 'from-slate-900 to-slate-950',
    borderColor: 'border-slate-700',
    animationFX: 'none',
    isPromoActive: false,
    promoOriginalPrice: 49,
    promoPrice: 39,
    promoBadgeText: '',
    promoStartDateTime: '',
    promoEndDateTime: '',
    showCountdown: false,
    history: []
  },
  {
    id: 'plan_familia',
    productKey: 'familia',
    productCategory: 'Ecossistema ERP',
    productName: 'Classium Família',
    name: 'Plano Família Conectada',
    price: 19.90,
    originalPrice: 19.90,
    period: 'Mensal',
    billingDetail: 'R$ 19,90/mês por família.',
    description: 'Plataforma para responsáveis acompanharem o boletim, IA preditiva e notas.',
    features: ['Notificações WhatsApp', 'Alertas de Desempenho', 'Análise de Comportamento'],
    benefitsList: [
      { id: 'b1', text: 'Recebimento de tarefas e avisos via WhatsApp', included: true },
      { id: 'b2', text: 'Alertas automáticos de ausências e notas', included: true },
      { id: 'b3', text: 'Acesso a relatórios pedagógicos detalhados', included: true },
    ],
    iconName: 'Star',
    cardColor: 'bg-slate-900 border-slate-700 text-white',
    buttonColor: 'bg-cyan-600 hover:bg-cyan-500 text-white font-bold',
    badgeColor: 'bg-cyan-500 text-white font-bold',
    buttonText: 'ASSINAR FAMÍLIA',
    promoText: 'Família',
    displayOrder: 3,
    highlightTag: 'Ativo',
    status: 'Ativo',
    hasGlow: false,
    gradientStyle: 'from-slate-900 to-slate-950',
    borderColor: 'border-slate-700',
    animationFX: 'none',
    isPromoActive: false,
    promoOriginalPrice: 19.90,
    promoPrice: 14.90,
    promoBadgeText: '',
    promoStartDateTime: '',
    promoEndDateTime: '',
    showCountdown: false,
    history: []
  }
];

interface PlansContextType {
  plans: SystemPlan[];
  getPlanById: (id: string) => SystemPlan | undefined;
  getPlansByProductKey: (key: string) => SystemPlan[];
  updatePlan: (updatedPlan: SystemPlan, authorName?: string) => void;
  publishPlan: (planId: string, authorName?: string) => Promise<boolean>;
  duplicatePlan: (planId: string, authorName?: string) => SystemPlan;
  togglePlanStatus: (planId: string, authorName?: string) => void;
  archivePlan: (planId: string, authorName?: string) => void;
  lastPublishTimestamp: string;
}

const PlansContext = createContext<PlansContextType | undefined>(undefined);

export function PlansProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<SystemPlan[]>(() => {
    const saved = localStorage.getItem('educa_system_plans_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing stored system plans', e);
      }
    }
    return INITIAL_SYSTEM_PLANS;
  });

  const [lastPublishTimestamp, setLastPublishTimestamp] = useState<string>(
    new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );

  const { addAuditLog } = usePlatform();

  // Save to localStorage whenever plans state changes
  useEffect(() => {
    localStorage.setItem('educa_system_plans_v2', JSON.stringify(plans));
  }, [plans]);

  // Automated timer check: Auto-expire active promotions when promoEndDateTime has passed
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      let hasChanges = false;

      setPlans(prevPlans => {
        return prevPlans.map(plan => {
          if (plan.isPromoActive && plan.promoEndDateTime) {
            const endDate = new Date(plan.promoEndDateTime).getTime();
            if (now >= endDate) {
              hasChanges = true;
              return {
                ...plan,
                isPromoActive: false,
                price: plan.originalPrice,
                promoBadgeText: '',
                history: [
                  ...plan.history,
                  {
                    id: 'h_' + Date.now(),
                    date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    author: 'SISTEMA AUTOMÁTICO',
                    action: 'EXPIRAÇÃO DE PROMOÇÃO',
                    details: `Promoção encerrada automaticamente. Preço restaurado para R$ ${plan.originalPrice}`
                  }
                ]
              };
            }
          }
          return plan;
        });
      });

      if (hasChanges) {
        addAuditLog('SYSTEM_PROMO_EXPIRE', 'Sistema', 'Planos', 'Promoção encerrada automaticamente por atingimento da data limite');
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(timer);
  }, [addAuditLog]);

  const getPlanById = (id: string) => {
    return plans.find(p => p.id === id);
  };

  const getPlansByProductKey = (key: string) => {
    return plans.filter(p => p.productKey === key && p.status !== 'Arquivado');
  };

  const updatePlan = (updatedPlan: SystemPlan, authorName = 'ClassiumAdmin') => {
    const updatedHistory: PlanHistoryEntry = {
      id: 'h_' + Date.now(),
      date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      author: authorName,
      action: 'Edição de Plano',
      details: `Valores e recursos atualizados (Preço: R$ ${updatedPlan.price})`
    };

    const finalPlan = {
      ...updatedPlan,
      history: [updatedHistory, ...updatedPlan.history]
    };

    setPlans(prev => prev.map(p => p.id === updatedPlan.id ? finalPlan : p));
  };

  const publishPlan = async (planId: string, authorName = 'ClassiumAdmin'): Promise<boolean> => {
    const nowStr = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setLastPublishTimestamp(nowStr);

    setPlans(prev => prev.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          history: [
            {
              id: 'h_' + Date.now(),
              date: nowStr,
              author: authorName,
              action: 'Publicação Global',
              details: 'Alterações publicadas em tempo real em todos os módulos da plataforma'
            },
            ...p.history
          ]
        };
      }
      return p;
    }));

    addAuditLog('PUBLISH_PLAN_GLOBAL', authorName, `Plano ID: ${planId}`, 'Publicado em tempo real em todas as telas da plataforma');
    return true;
  };

  const duplicatePlan = (planId: string, authorName = 'ClassiumAdmin'): SystemPlan => {
    const existing = getPlanById(planId);
    if (!existing) throw new Error('Plano não encontrado');

    const newId = 'plan_' + existing.productKey + '_' + Date.now();
    const duplicated: SystemPlan = {
      ...existing,
      id: newId,
      name: `${existing.name} (Cópia)`,
      displayOrder: existing.displayOrder + 1,
      history: [
        {
          id: 'h_' + Date.now(),
          date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          author: authorName,
          action: 'Duplicação',
          details: `Duplicado a partir do plano ${existing.name}`
        }
      ]
    };

    setPlans(prev => [...prev, duplicated]);
    addAuditLog('DUPLICATE_PLAN', authorName, `Novo Plano: ${duplicated.name}`, `Clonado de ${existing.name}`);
    return duplicated;
  };

  const togglePlanStatus = (planId: string, authorName = 'ClassiumAdmin') => {
    setPlans(prev => prev.map(p => {
      if (p.id === planId) {
        const nextStatus = p.status === 'Ativo' ? 'Desativado' : 'Ativo';
        addAuditLog('TOGGLE_PLAN_STATUS', authorName, p.name, `Status alterado para ${nextStatus}`);
        return { ...p, status: nextStatus };
      }
      return p;
    }));
  };

  const archivePlan = (planId: string, authorName = 'ClassiumAdmin') => {
    setPlans(prev => prev.map(p => {
      if (p.id === planId) {
        addAuditLog('ARCHIVE_PLAN', authorName, p.name, 'Plano arquivado do ecossistema');
        return { ...p, status: 'Arquivado' };
      }
      return p;
    }));
  };

  return (
    <PlansContext.Provider value={{
      plans,
      getPlanById,
      getPlansByProductKey,
      updatePlan,
      publishPlan,
      duplicatePlan,
      togglePlanStatus,
      archivePlan,
      lastPublishTimestamp
    }}>
      {children}
    </PlansContext.Provider>
  );
}

export function usePlans() {
  const context = useContext(PlansContext);
  if (!context) {
    throw new Error('usePlans deve ser usado dentro de um PlansProvider');
  }
  return context;
}
