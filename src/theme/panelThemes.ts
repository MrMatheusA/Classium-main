/**
 * Temas dos painéis internos do Classium.
 *
 * A pessoa escolhe duas coisas:
 *   1. a cor da barra lateral (e do destaque dos botões, abas e links)
 *   2. o fundo da área de trabalho
 *
 * Tudo vira variável CSS em :root, então qualquer componente que use
 * var(--sidebar-bg), var(--accent) etc. muda de cor sozinho.
 */

export type SidebarColorId = 'verde' | 'azul' | 'marrom' | 'lilas' | 'amarelo';
export type BackgroundId = 'gelo' | 'azul-claro';

export interface SidebarColor {
  id: SidebarColorId;
  label: string;
  /** Inspiração, aparece como dica no seletor */
  hint: string;
  sidebarBg: string;
  sidebarBgHover: string;
  sidebarFg: string;
  sidebarMuted: string;
  sidebarActiveBg: string;
  sidebarActiveFg: string;
  sidebarBorder: string;
  /** Cor de ação no conteúdo (botões, links, abas) */
  accent: string;
  accentHover: string;
  accentFg: string;
  /** Versão clarinha do acento para fundos de selo, linha selecionada etc. */
  accentSoft: string;
  /** Destaque desenhado à mão no título da landing (sobre a cor da barra) */
  heroHighlight: string;
}

export interface Background {
  id: BackgroundId;
  label: string;
  app: string;
  card: string;
  cardAlt: string;
  border: string;
  heading: string;
  text: string;
  muted: string;
}

export const SIDEBAR_COLORS: SidebarColor[] = [
  {
    id: 'verde',
    label: 'Verde',
    hint: 'Quadro-negro',
    sidebarBg: '#1F4D3F',
    sidebarBgHover: 'rgba(255,255,255,0.08)',
    sidebarFg: '#F1F6F3',
    sidebarMuted: 'rgba(241,246,243,0.62)',
    sidebarActiveBg: '#FFFFFF',
    sidebarActiveFg: '#1F4D3F',
    sidebarBorder: 'rgba(255,255,255,0.10)',
    accent: '#2E7D5B',
    accentHover: '#25684B',
    accentFg: '#FFFFFF',
    accentSoft: '#E3F2EA',
    heroHighlight: '#F2C94C',
  },
  {
    id: 'azul',
    label: 'Azul',
    hint: 'Caderno',
    sidebarBg: '#1E3A5F',
    sidebarBgHover: 'rgba(255,255,255,0.08)',
    sidebarFg: '#F0F4FA',
    sidebarMuted: 'rgba(240,244,250,0.62)',
    sidebarActiveBg: '#FFFFFF',
    sidebarActiveFg: '#1E3A5F',
    sidebarBorder: 'rgba(255,255,255,0.10)',
    accent: '#2F6DB5',
    accentHover: '#255A97',
    accentFg: '#FFFFFF',
    accentSoft: '#E4EEFA',
    heroHighlight: '#F2C94C',
  },
  {
    id: 'marrom',
    label: 'Marrom',
    hint: 'Madeira da carteira',
    sidebarBg: '#5A3A28',
    sidebarBgHover: 'rgba(255,255,255,0.08)',
    sidebarFg: '#FBF4EE',
    sidebarMuted: 'rgba(251,244,238,0.62)',
    sidebarActiveBg: '#FFFFFF',
    sidebarActiveFg: '#5A3A28',
    sidebarBorder: 'rgba(255,255,255,0.10)',
    accent: '#9A5B34',
    accentHover: '#804A29',
    accentFg: '#FFFFFF',
    accentSoft: '#F6EADF',
    heroHighlight: '#F2C94C',
  },
  {
    id: 'lilas',
    label: 'Lilás',
    hint: 'Lápis de cor',
    sidebarBg: '#4B3F7A',
    sidebarBgHover: 'rgba(255,255,255,0.08)',
    sidebarFg: '#F4F2FB',
    sidebarMuted: 'rgba(244,242,251,0.64)',
    sidebarActiveBg: '#FFFFFF',
    sidebarActiveFg: '#4B3F7A',
    sidebarBorder: 'rgba(255,255,255,0.10)',
    accent: '#6E5BB8',
    accentHover: '#5B4A9E',
    accentFg: '#FFFFFF',
    accentSoft: '#EEEAFB',
    heroHighlight: '#F2C94C',
  },
  {
    // Amarelo é claro: o texto da barra fica escuro para manter a leitura
    id: 'amarelo',
    label: 'Amarelo',
    hint: 'Lápis escolar',
    sidebarBg: '#F2C94C',
    sidebarBgHover: 'rgba(58,46,5,0.08)',
    sidebarFg: '#3A2E05',
    sidebarMuted: 'rgba(58,46,5,0.66)',
    sidebarActiveBg: '#3A2E05',
    sidebarActiveFg: '#FFF8DC',
    sidebarBorder: 'rgba(58,46,5,0.14)',
    accent: '#8A6500',
    accentHover: '#6F5100',
    accentFg: '#FFFFFF',
    accentSoft: '#FDF3D2',
    heroHighlight: '#3A2E05',
  },
];

export const BACKGROUNDS: Background[] = [
  {
    id: 'gelo',
    label: 'Branco gelo',
    app: '#F6F7F9',
    card: '#FFFFFF',
    cardAlt: '#F1F3F6',
    border: 'rgba(16,24,40,0.08)',
    heading: '#141A24',
    text: '#2B3340',
    muted: '#667085',
  },
  {
    id: 'azul-claro',
    label: 'Azul claro',
    app: '#EAF2FB',
    card: '#FFFFFF',
    cardAlt: '#F2F7FD',
    border: 'rgba(30,58,95,0.10)',
    heading: '#132238',
    text: '#2A3A52',
    muted: '#5F7189',
  },
];

export const DEFAULT_THEME = { sidebar: 'azul' as SidebarColorId, background: 'gelo' as BackgroundId };

export const isSidebarColorId = (v: unknown): v is SidebarColorId => SIDEBAR_COLORS.some((c) => c.id === v);
export const isBackgroundId = (v: unknown): v is BackgroundId => BACKGROUNDS.some((b) => b.id === v);

export function getSidebarColor(id: SidebarColorId) {
  return SIDEBAR_COLORS.find((c) => c.id === id) ?? SIDEBAR_COLORS[1];
}

export function getBackground(id: BackgroundId) {
  return BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
}

/** Converte a escolha em variáveis CSS. */
export function themeToCssVars(sidebarId: SidebarColorId, backgroundId: BackgroundId): Record<string, string> {
  const s = getSidebarColor(sidebarId);
  const b = getBackground(backgroundId);
  return {
    '--sidebar-bg': s.sidebarBg,
    '--sidebar-bg-hover': s.sidebarBgHover,
    '--sidebar-fg': s.sidebarFg,
    '--sidebar-muted': s.sidebarMuted,
    '--sidebar-active-bg': s.sidebarActiveBg,
    '--sidebar-active-fg': s.sidebarActiveFg,
    '--sidebar-border': s.sidebarBorder,
    '--accent': s.accent,
    '--accent-hover': s.accentHover,
    '--accent-fg': s.accentFg,
    '--accent-soft': s.accentSoft,
    '--hero-highlight': s.heroHighlight,
    '--bg-app': b.app,
    // nomes que o Header e outros componentes já usam
    '--bg-card': b.card,
    '--bg-card-alt': b.cardAlt,
    '--border': b.border,
    '--text-heading': b.heading,
    '--text-body': b.text,
    '--text-muted': b.muted,
    // apelidos: nomes antigos que componentes do projeto ainda usam
    '--sidebar-text': s.sidebarFg,
    '--sidebar-text-muted': s.sidebarMuted,
    '--sidebar-active-text': s.sidebarActiveFg,
  };
}