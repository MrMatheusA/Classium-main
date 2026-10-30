import { RolePermissionMatrix, PermissionNode, PermissionSnapshot } from '../types/rbac';

const defaultActions = { view: true, create: true, edit: true, delete: true, export: true };

// 1. CLASSIUM ADMIN SUITE (ALL ENABLED)
const masterAdminPermissions: PermissionNode[] = [
  {
    id: 'm-dash',
    label: 'Dashboard Central Executive',
    type: 'menu',
    visible: true,
    actions: { ...defaultActions },
    children: [
      { id: 'm-dash-sub1', label: 'Indicadores Globais SaaS', type: 'submenu', visible: true, actions: { ...defaultActions } },
      { id: 'm-dash-sub2', label: 'Mapa de Escolas Ativas', type: 'submenu', visible: true, actions: { ...defaultActions } }
    ]
  },
  {
    id: 'm-inst',
    label: 'Instituições & Redes',
    type: 'menu',
    visible: true,
    actions: { ...defaultActions },
    children: [
      { id: 'm-inst-sub1', label: 'Gestão de Tenants', type: 'submenu', visible: true, actions: { ...defaultActions } },
      { id: 'm-inst-sub2', label: 'Aprovações & Onboarding', type: 'submenu', visible: true, actions: { ...defaultActions } }
    ]
  },
  {
    id: 'm-users',
    label: 'Usuários & Impersonação',
    type: 'menu',
    visible: true,
    actions: { ...defaultActions }
  },
  {
    id: 'm-plans',
    label: 'Planos & Assinaturas SaaS',
    type: 'menu',
    visible: true,
    actions: { ...defaultActions }
  },
  {
    id: 'm-fin',
    label: 'Financeiro Global',
    type: 'menu',
    visible: true,
    actions: { ...defaultActions }
  },
  {
    id: 'm-aud',
    label: 'Auditoria & Logs SOC/NOC',
    type: 'menu',
    visible: true,
    actions: { ...defaultActions }
  }
];

// 2. HELPER TO CREATE STANDARDIZED 19-MENU MASTER TREE FOR INTERNAL SCHOOL PANELS
function createStandardMenuTree(
  prefix: string,
  visibilities: Record<string, boolean> = {}
): PermissionNode[] {
  const isVis = (key: string, defaultVal = true) => 
    visibilities[key] !== undefined ? visibilities[key] : defaultVal;

  return [
    {
      id: `${prefix}-dash`,
      label: 'Dashboard Geral',
      type: 'menu',
      visible: isVis('dash', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-dash-sub1`, label: 'Indicadores Globais & Métricas', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-dash-b1`, label: 'Botão Exportar Relatório em PDF', type: 'button', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-dash-f1`, label: 'Métrica Resumida', type: 'field', visible: true }
      ]
    },
    {
      id: `${prefix}-inst`,
      label: 'Instituição',
      type: 'menu',
      visible: isVis('inst', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-inst-sub1`, label: 'Ficha Institucional', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-inst-sub2`, label: 'Unidades & Prédios', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-inst-sub3`, label: 'Alterar Capa & Banner', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-inst-sub4`, label: 'Ajustar Logo Oficial', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-func`,
      label: 'Funcionários',
      type: 'menu',
      visible: isVis('func', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-func-sub1`, label: 'Quadro de Funcionários', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-func-sub2`, label: 'Novo Cadastro de Colaborador', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-func-b1`, label: 'Botão Desativar Conta', type: 'button', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-estud`,
      label: 'Estudantes',
      type: 'menu',
      visible: isVis('estud', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-estud-sub1`, label: 'Lista Geral de Alunos', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-estud-sub2`, label: 'Matrículas Eletrônicas', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-estud-sub3`, label: 'Transferências Escolares', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-estud-b1`, label: 'Novo Cadastro', type: 'button', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-estud-b2`, label: 'Editar Prontuário', type: 'button', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-estud-b3`, label: 'Excluir Matrícula', type: 'button', visible: false, actions: { ...defaultActions } },
        { id: `${prefix}-estud-b4`, label: 'Exportar PDF / Excel', type: 'button', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-prof`,
      label: 'Professores',
      type: 'menu',
      visible: isVis('prof', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-prof-sub1`, label: 'Corpo Docente', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-prof-sub2`, label: 'Atribuição de Aulas', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-pedag`,
      label: 'Pedagógico',
      type: 'menu',
      visible: isVis('pedag', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-pedag-sub1`, label: 'Projetos Pedagógicos', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-pedag-sub2`, label: 'Planos de Ensino', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-pedag-sub3`, label: 'Ocorrências Pedagógicas', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-comun`,
      label: 'Comunicação',
      type: 'menu',
      visible: isVis('comun', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-comun-sub1`, label: 'Mural de Anúncios', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-comun-sub2`, label: 'Disparo de Recados', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-cal`,
      label: 'Calendário/Agenda',
      type: 'menu',
      visible: isVis('cal', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-cal-sub1`, label: 'Eventos da Escola', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-cal-sub2`, label: 'Feriados & Recessos', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-transp`,
      label: 'Transporte',
      type: 'menu',
      visible: isVis('transp', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-transp-sub1`, label: 'Frota de Veículos', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-transp-sub2`, label: 'Rotas & Pontos', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-alim`,
      label: 'Alimentação',
      type: 'menu',
      visible: isVis('alim', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-alim-sub1`, label: 'Cardápio Semanal', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-alim-sub2`, label: 'Restrições & Alergias', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-achad`,
      label: 'Achados e Perdidos',
      type: 'menu',
      visible: isVis('achad', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-achad-sub1`, label: 'Itens Cadastrados', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-achad-sub2`, label: 'Devoluções Registradas', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-port`,
      label: 'Controle de Acesso',
      type: 'menu',
      visible: isVis('port', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-port-sub1`, label: 'Acesso de Entrada e Saída', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-port-sub2`, label: 'Crachás Virtuais', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-smart`,
      label: 'ClassiumSmart (Smart Horários)',
      type: 'menu',
      visible: isVis('smart', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-smart-sub1`, label: 'Gerador Automático de Horários', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-smart-sub2`, label: 'Matriz de Restrições', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-studio`,
      label: 'ClassiumStudio',
      type: 'menu',
      visible: isVis('studio', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-studio-sub1`, label: 'Estúdio de Criação & Edição', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-studio-sub2`, label: 'Gerador de Conteúdos IA Prime', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-comercial`,
      label: 'Ecossistema Comercial',
      type: 'menu',
      visible: isVis('comercial', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-comercial-sub1`, label: 'Gestão de Assinaturas', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-comercial-sub2`, label: 'Parceiros & Cards', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-carr`,
      label: 'Carreira & Benefícios',
      type: 'menu',
      visible: isVis('carr', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-carr-sub1`, label: 'Rede de Vantagens Classium', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-carr-sub2`, label: 'Parceiros Credenciados', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-fin`,
      label: 'Financeiro',
      type: 'menu',
      visible: isVis('fin', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-fin-sub1`, label: 'Faturamento Mensal', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-fin-sub2`, label: 'Inadimplência', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-relat`,
      label: 'Relatórios',
      type: 'menu',
      visible: isVis('relat', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-relat-sub1`, label: 'Indicadores de Desempenho', type: 'submenu', visible: true, actions: { ...defaultActions } },
        { id: `${prefix}-relat-sub2`, label: 'Exportação em Excel / PDF', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-radar`,
      label: 'Radar de Rotina',
      type: 'menu',
      visible: isVis('radar', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-radar-sub1`, label: 'Monitoramento de Presença', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    },
    {
      id: `${prefix}-config`,
      label: 'Configurações',
      type: 'menu',
      visible: isVis('config', true),
      actions: { ...defaultActions },
      children: [
        { id: `${prefix}-config-sub1`, label: 'Parâmetros do Sistema', type: 'submenu', visible: true, actions: { ...defaultActions } }
      ]
    }
  ];
}

// CLASSIUM GESTOR (ALL 19 STANDARDIZED MENUS ACTIVE)
const gestorPermissions: PermissionNode[] = createStandardMenuTree('g', {
  dash: true, inst: true, func: true, estud: true, prof: true, pedag: true, comun: true, cal: true,
  transp: true, alim: true, achad: true, port: true, smart: true, studio: true, carr: true, fin: true,
  relat: true, radar: true, config: true
});

// 3. CLASSIUM DOCENTE
const professorPermissions: PermissionNode[] = [
  { id: 'p-dash', label: 'Dashboard Docente', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'p-class', label: 'Minhas Turmas', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'p-stud', label: 'Alunos', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'p-seat', label: 'Visão da Sala', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'p-attend', label: 'Frequência', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'p-occur', label: 'Diário de Bordo (Ocorrências)', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'p-rep', label: 'Notas e Avaliações', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'p-rec', label: 'Reconhecimentos & Medalhas', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'p-cal', label: 'Calendário de Aulas', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'p-ai-rep', label: 'Relatórios Inteligentes', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'p-[#111827]', label: 'Carreira & Benefícios', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'p-studio', label: 'Classium Studio Prime', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'p-config', label: 'Configurações', type: 'menu', visible: true, actions: { ...defaultActions } }
];

// 4. CLASSIUM FAMÍLIA
const familyPermissions: PermissionNode[] = [
  { id: 'f-cad', label: 'Dados Cadastrais', type: 'menu', visible: true, actions: { view: true, create: false, edit: true, delete: false, export: true } },
  { id: 'f-horario', label: 'Horário de Aula', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'f-rec', label: 'Recados da Escola', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'f-radar', label: 'Radar de Rotina', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'f-cal', label: 'Calendário Geral', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'f-alim', label: 'Alimentação Escolar', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'f-achad', label: 'Achados e Perdidos', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'f-qr', label: 'Controle de Acesso', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'f-transp', label: 'Transporte Escolar', type: 'menu', visible: true, actions: { ...defaultActions } },
  { id: 'f-conecta', label: 'Encontre um Especialista', type: 'menu', visible: true, actions: { ...defaultActions } }
];

// 5. CLASSIUM PEDAGÓGICO (STANDARDIZED 19-MENU TREE)
const pedagogoPermissions: PermissionNode[] = createStandardMenuTree('pd', {
  dash: true, inst: true, func: false, estud: true, prof: true, pedag: true, comun: true, cal: true,
  transp: true, alim: true, achad: true, port: true, smart: true, studio: true, carr: true, fin: false,
  relat: true, radar: true, config: true
});

// 6. CLASSIUM SECRETARIA (STANDARDIZED 19-MENU TREE)
const secretariaPermissions: PermissionNode[] = createStandardMenuTree('sec', {
  dash: true, inst: true, func: true, estud: true, prof: true, pedag: true, comun: true, cal: true,
  transp: true, alim: true, achad: true, port: true, smart: true, studio: true, carr: true, fin: true,
  relat: true, radar: true, config: true
});

// 7. CLASSIUM DISCIPLINA (STANDARDIZED 19-MENU TREE)
const disciplinarioPermissions: PermissionNode[] = createStandardMenuTree('disc', {
  dash: true, inst: true, func: false, estud: true, prof: true, pedag: true, comun: true, cal: true,
  transp: true, alim: true, achad: true, port: true, smart: true, studio: true, carr: true, fin: false,
  relat: true, radar: true, config: true
});

export const DEFAULT_ROLE_PERMISSION_MATRIX: RolePermissionMatrix = {
  ROLE_ADMIN_MASTER: masterAdminPermissions,
  admin: gestorPermissions,
  professor: professorPermissions,
  family: familyPermissions,
  pedagogo: pedagogoPermissions,
  secretaria: secretariaPermissions,
  disciplinario: disciplinarioPermissions
};

export const INITIAL_PERMISSION_SNAPSHOTS: PermissionSnapshot[] = [
  {
    id: 'snap-001',
    name: 'Snapshot Padrão Classium v5 (Homologado)',
    timestamp: '2026-07-27 09:00:00',
    createdBy: 'Engenheiro Master Classium',
    note: 'Configuração original com isolamento completo de perfis tenant e 18 menus autorizados para ClassiumGestor.',
    matrix: DEFAULT_ROLE_PERMISSION_MATRIX
  },
  {
    id: 'snap-002',
    name: 'Snapshot Restritivo Ensino Fundamental II',
    timestamp: '2026-07-20 14:30:00',
    createdBy: 'Engenheiro Master Classium',
    note: 'Perfis ajustados com restrição rigorosa de exportação de dados para secretaria.',
    matrix: DEFAULT_ROLE_PERMISSION_MATRIX
  }
];
