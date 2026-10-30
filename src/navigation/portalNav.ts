import { useMemo } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Bus,
  Calendar,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  GraduationCap,
  Home,
  Megaphone,
  MessageSquare,
  Plug,
  QrCode,
  Radar,
  Settings2,
  ShieldAlert,
  Shirt,
  Sparkles,
  Stethoscope,
  Store,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../hooks/useAuth';

/*
 * Mapa único da navegação dos painéis.
 * Sidebar, Header (título e busca Ctrl+K), AdminDashboard e a URL usam este arquivo,
 * então um módulo novo só precisa ser cadastrado aqui.
 */

export type PortalKind = 'admin' | 'family' | 'professor';
export type TabId = string | number;

export interface NavItem<T extends TabId = TabId> {
  id: T;
  label: string;
  icon: LucideIcon;
  description?: string;
  /** pedaço da URL: /gestao/<slug> */
  slug: string;
  tag?: string;
  /** false = só aparece na busca (Ctrl+K), não na barra lateral */
  inSidebar?: boolean;
}

export interface NavSection<T extends TabId = TabId> {
  title: string;
  items: NavItem<T>[];
}

/* ------------------------------------------------------------------ */
/* Gestão / administração                                              */
/* ------------------------------------------------------------------ */

export const ADMIN_NAV: NavSection<string>[] = [
  {
    title: 'Visão geral',
    items: [
      { id: 'dashboard', slug: '', label: 'Início', icon: Home, description: 'Matrículas, frequência e indicadores da escola.' },
      { id: 'instituicao', slug: 'escola', label: 'Dados da escola', icon: Building2, description: 'Razão social, CNPJ, endereço e equipe gestora.', inSidebar: false },
    ],
  },
  {
    title: 'Secretaria',
    items: [
      { id: 'pessoas', slug: 'estudantes', label: 'Estudantes', icon: Users, description: 'Cadastro, documentos, matrículas e responsáveis.' },
      { id: 'secretaria-tab', slug: 'secretaria', label: 'Secretaria', icon: ClipboardList, description: 'Requerimentos, transferências e processos.', inSidebar: false },
      { id: 'documentos', slug: 'documentos', label: 'Documentos', icon: FileText, description: 'Históricos, declarações e certidões.', inSidebar: false },
    ],
  },
  {
    title: 'Pedagógico',
    items: [
      { id: 'pedagogico', slug: 'pedagogico', label: 'Pedagógico', icon: BookOpen, description: 'Planos de aula, BNCC e acompanhamento das turmas.' },
      { id: 'horario-aula', slug: 'horarios', label: 'Horário de aula', icon: Clock, description: 'Professores por turma, sala e disciplina.' },
      { id: 'smart-horarios', slug: 'montar-horarios', label: 'Montar horários', icon: Sparkles, description: 'Monta a grade respeitando as restrições dos professores.' },
      { id: 'intelligence_center', slug: 'inteligencia', label: 'Inteligência pedagógica', icon: Brain, description: 'Alertas de rendimento e de risco de evasão.', inSidebar: false },
      { id: 'relatorios', slug: 'relatorios', label: 'Relatórios', icon: BarChart3, description: 'Relatórios gerenciais e acadêmicos.', inSidebar: false },
    ],
  },
  {
    title: 'Comunicação',
    items: [
      { id: 'comunicacao', slug: 'comunicados', label: 'Comunicados', icon: MessageSquare, description: 'Avisos para famílias, professores e equipe.' },
      { id: 'agenda', slug: 'calendario', label: 'Calendário', icon: Calendar, description: 'Feriados, conselhos de classe, reuniões e eventos.' },
    ],
  },
  {
    title: 'Rotina',
    items: [
      { id: 'transporte', slug: 'transporte', label: 'Transporte', icon: Bus, description: 'Rotas, veículos, motoristas e paradas.' },
      { id: 'alimentacao', slug: 'cardapio', label: 'Cardápio', icon: Utensils, description: 'Cardápios e restrições alimentares.' },
      { id: 'achados-perdidos', slug: 'achados-e-perdidos', label: 'Achados e perdidos', icon: Shirt, description: 'Itens encontrados na escola e devoluções.' },
      { id: 'portaria-qrcode', slug: 'portaria', label: 'Portaria', icon: QrCode, description: 'Entrada de visitantes e retirada de alunos por QR Code.' },
      { id: 'radar-rotina', slug: 'rotina', label: 'Rotina escolar', icon: Radar, description: 'Entradas, saídas e intervalos do dia.', inSidebar: false },
      { id: 'diario-disciplinar', slug: 'disciplinar', label: 'Diário disciplinar', icon: ShieldAlert, description: 'Ocorrências e acompanhamento.', inSidebar: false },
    ],
  },
  {
    title: 'Rede e gestão',
    items: [
      { id: 'ia', slug: 'carreira', label: 'Carreira e benefícios', icon: Briefcase, description: 'Planos de carreira, avaliação e capacitação.' },
      { id: 'gestao-parceiros', slug: 'parceiros', label: 'Parceiros', icon: Store, description: 'Profissionais e empresas parceiras da escola.' },
      { id: 'financeiro', slug: 'financeiro', label: 'Financeiro', icon: DollarSign, description: 'Mensalidades, cobrança e fluxo de caixa.', inSidebar: false },
      { id: 'comercial', slug: 'comercial', label: 'Comercial', icon: TrendingUp, description: 'Captação de alunos e campanhas de matrícula.', inSidebar: false },
      { id: 'super_ia_center', slug: 'assistente', label: 'Assistente IA', icon: Sparkles, description: 'Materiais e apoio pedagógico com IA.', inSidebar: false },
      { id: 'integration_hub', slug: 'integracoes', label: 'Integrações', icon: Plug, description: 'Catracas e sistemas externos.', inSidebar: false },
      { id: 'configuracoes', slug: 'configuracoes', label: 'Configurações', icon: Settings2, description: 'Privacidade (LGPD), termos e parâmetros da escola.', inSidebar: false },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Família (ids numéricos usados pelo FamilyDashboard)                 */
/* ------------------------------------------------------------------ */

export const FAMILY_NAV: NavSection<number>[] = [
  {
    title: 'Meu filho',
    items: [
      { id: 2, slug: '', label: 'Alunos e vínculo', icon: UserCheck, description: 'Seus filhos ligados à escola.' },
      { id: 1, slug: 'dados', label: 'Dados cadastrais', icon: User, description: 'Seus dados e os do aluno.' },
      { id: 15, slug: 'horario', label: 'Horário de aula', icon: Clock, description: 'A grade da semana.' },
    ],
  },
  {
    title: 'Dia a dia',
    items: [
      { id: 3, slug: 'recados', label: 'Recados', icon: Megaphone, description: 'Comunicados da escola e dos professores.' },
      { id: 4, slug: 'rotina', label: 'Radar de rotina', icon: Radar, description: 'Entrada, saída e o dia na escola.' },
      { id: 5, slug: 'calendario', label: 'Calendário escolar', icon: Calendar, description: 'Provas, feriados e eventos.' },
      { id: 13, slug: 'cardapio', label: 'Cardápio', icon: Utensils, description: 'O que é servido na semana.' },
      { id: 7, slug: 'portaria', label: 'Retirada na portaria', icon: QrCode, description: 'QR Code para buscar o aluno.' },
      { id: 6, slug: 'achados-e-perdidos', label: 'Achados e perdidos', icon: Shirt, description: 'Itens encontrados na escola.' },
    ],
  },
  {
    title: 'Mais',
    items: [
      { id: 9, slug: 'especialistas', label: 'Especialistas', icon: Stethoscope, description: 'Profissionais parceiros da escola.' },
      { id: 14, slug: 'configuracoes', label: 'Configurações', icon: Settings2, description: 'Aparência e preferências.' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Professor                                                           */
/* ------------------------------------------------------------------ */

export const PROFESSOR_NAV: NavSection<string>[] = [
  {
    title: 'Sala de aula',
    items: [
      { id: 'dashboard', slug: '', label: 'Início', icon: Home, description: 'Suas turmas e o dia de hoje.' },
      { id: 'alunos', slug: 'alunos', label: 'Alunos', icon: Users, description: 'Lista e ficha dos alunos.' },
      { id: 'seating', slug: 'mapa-da-sala', label: 'Mapa da sala', icon: GraduationCap, description: 'Onde cada aluno senta.' },
      { id: 'occurrences', slug: 'diario', label: 'Diário de bordo', icon: Activity, description: 'Ocorrências e registros da aula.' },
      { id: 'calendar', slug: 'calendario', label: 'Calendário', icon: Calendar, description: 'Aulas, provas e eventos.' },
    ],
  },
  {
    title: 'Ferramentas',
    items: [
      { id: 'relatorios_ia', slug: 'relatorios', label: 'Relatórios', icon: FileText, tag: 'IA', description: 'Relatórios dos alunos com ajuda da IA.' },
      { id: 'studio', slug: 'atividades', label: 'Gerador de atividades', icon: Sparkles, tag: 'IA', description: 'Atividades prontas para imprimir.' },
      { id: 'ia', slug: 'carreira', label: 'Carreira e benefícios', icon: Briefcase, description: 'Formação e benefícios.' },
    ],
  },
];

export const NAV_BY_PORTAL: Record<PortalKind, NavSection<any>[]> = {
  admin: ADMIN_NAV,
  family: FAMILY_NAV,
  professor: PROFESSOR_NAV,
};

export const DEFAULT_TAB: Record<PortalKind, TabId> = { admin: 'dashboard', family: 2, professor: 'dashboard' };

export const PORTAL_LABEL: Record<PortalKind, string> = {
  admin: 'Gestão escolar',
  family: 'Portal da Família',
  professor: 'Portal do Professor',
};

/** Procura o módulo pelo id */
export function findNav(portal: PortalKind, id: TabId) {
  for (const section of NAV_BY_PORTAL[portal]) {
    const item = section.items.find((i) => i.id === id);
    if (item) return { section, item };
  }
  return null;
}

/** Procura o módulo pelo pedaço da URL */
export function findNavBySlug(portal: PortalKind, slug: string) {
  const s = (slug || '').toLowerCase();
  for (const section of NAV_BY_PORTAL[portal]) {
    const item = section.items.find((i) => i.slug === s);
    if (item) return item;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Permissões da matriz de perfis (mesma regra de antes)               */
/* ------------------------------------------------------------------ */

const MATRIX_ALIASES: Record<string, string[]> = {
  dashboard: ['dash'],
  intelligence_center: ['intel'],
  super_ia_center: ['superai', 'super ia'],
  instituicao: ['inst', 'institu'],
  pessoas: ['estud', 'estudante'],
  pedagogico: ['pedag', 'pedagóg'],
  comunicacao: ['comun', 'comunica'],
  agenda: ['cal', 'calend', 'agenda'],
  'horario-aula': ['horar', 'horário', 'grade'],
  transporte: ['transp', 'transport'],
  alimentacao: ['alim', 'alimenta'],
  'achados-perdidos': ['achad', 'achado'],
  'portaria-qrcode': ['port', 'portaria', 'acesso'],
  ia: ['carr', 'carreira'],
  financeiro: ['fin', 'financ'],
  relatorios: ['relat', 'relatór'],
  'radar-rotina': ['radar'],
  configuracoes: ['config', 'configur'],
};

export function makeVisibilityCheck(roleMatrix: unknown, isSuperAdmin = false) {
  return (id: string) => {
    if (isSuperAdmin) return true;
    if (!Array.isArray(roleMatrix)) return true;
    const aliases = MATRIX_ALIASES[id] ?? [];

    const find = (nodes: any[]): boolean | null => {
      for (const node of nodes) {
        if (!node) continue;
        const nid = String(node.id || '');
        const lowId = nid.toLowerCase();
        const lowLabel = String(node.label || '').toLowerCase();
        const matches = nid === id || nid.endsWith(id) || aliases.some((a) => lowId.includes(a) || lowLabel.includes(a));
        if (matches) return Boolean(node.visible);
        if (Array.isArray(node.children)) {
          const res = find(node.children);
          if (res !== null) return res;
        }
      }
      return null;
    };

    const found = find(roleMatrix);
    return found !== null ? found : true;
  };
}

/* ------------------------------------------------------------------ */
/* Intenção de navegação                                               */
/* Guarda a última aba que a PESSOA escolheu. Serve para o useUrlSync  */
/* desfazer quando algum código volta sozinho para "Início" (ex.: ao   */
/* renovar a sessão).                                                  */
/* ------------------------------------------------------------------ */

export const navIntent = {
  portal: null as PortalKind | null,
  id: null as TabId | null,
  at: 0,
  set(portal: PortalKind, id: TabId) {
    this.portal = portal;
    this.id = id;
    this.at = Date.now();
  },
};

/* ------------------------------------------------------------------ */
/* Hook: menu do portal atual, já filtrado por permissão               */
/* ------------------------------------------------------------------ */

export function usePortalNav() {
  const auth = useAuth();
  const role = auth.role;
  const { hasPermission } = usePermissions();
  const {
    mode,
    activeFamilyTab,
    setActiveFamilyTab,
    activeAdminTab,
    setActiveAdminTab,
    activeProfessorTab,
    setActiveProfessorTab,
    permissionMatrix,
  } = usePlatform();

  const isFamily = mode === 'family' || (mode !== 'admin' && mode !== 'commands' && mode !== 'professor' && role === 'familia');
  const isProfessor = !isFamily && (mode === 'professor' || (mode !== 'admin' && mode !== 'commands' && role === 'docente'));
  const portal: PortalKind = isFamily ? 'family' : isProfessor ? 'professor' : 'admin';

  const isAllowed = useMemo(() => {
    if (portal === 'admin') {
      const roleMatrix = permissionMatrix && role ? permissionMatrix[role] : null;
      return makeVisibilityCheck(roleMatrix, role === 'admin');
    }
    if (portal === 'family') {
      return (id: TabId) => isFamily || hasPermission(`menu.family.${id}`) || hasPermission('family_access');
    }
    return (id: TabId) => isProfessor || hasPermission(`menu.professor.${id}`) || hasPermission('professor_access');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal, role, permissionMatrix, isFamily, isProfessor]);

  const activeId: TabId = portal === 'admin' ? activeAdminTab : portal === 'family' ? activeFamilyTab : activeProfessorTab;

  /** todos os módulos permitidos (inclui os que só aparecem na busca) */
  const sections = useMemo(
    () =>
      NAV_BY_PORTAL[portal]
        .map((s) => ({ ...s, items: s.items.filter((i) => isAllowed(i.id as never)) }))
        .filter((s) => s.items.length > 0),
    [portal, isAllowed],
  );

  /** só os da barra lateral */
  const sidebarSections = useMemo(
    () => sections.map((s) => ({ ...s, items: s.items.filter((i) => i.inSidebar !== false) })).filter((s) => s.items.length > 0),
    [sections],
  );

  const go = (id: TabId) => {
    navIntent.set(portal, id);
    if (portal === 'admin') setActiveAdminTab(id as any);
    else if (portal === 'family') setActiveFamilyTab(id as number);
    else setActiveProfessorTab(id as any);
  };

  const current = findNav(portal, activeId);

  return {
    portal,
    portalLabel: PORTAL_LABEL[portal],
    sections,
    sidebarSections,
    activeId,
    current,
    isAllowed: isAllowed as (id: TabId) => boolean,
    go,
  };
}