import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  BackgroundId,
  DEFAULT_THEME,
  SidebarColorId,
  isBackgroundId,
  isSidebarColorId,
  themeToCssVars,
} from './panelThemes';

interface PanelTheme {
  sidebar: SidebarColorId;
  background: BackgroundId;
}

interface PanelThemeState extends PanelTheme {
  setSidebar: (id: SidebarColorId) => void;
  setBackground: (id: BackgroundId) => void;
  /** Volta para a cor da marca */
  reset: () => void;
  /** true quando o usuário escolheu uma cor diferente da marca */
  isCustom: boolean;
  /** variáveis CSS prontas para usar em style={} */
  cssVars: Record<string, string>;
}

const PanelThemeContext = createContext<PanelThemeState | null>(null);

function readStored(key: string): PanelTheme | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!isSidebarColorId(p?.sidebar) || !isBackgroundId(p?.background)) return null;
    return { sidebar: p.sidebar, background: p.background };
  } catch {
    return null;
  }
}

/**
 * Envolve só a área logada (painéis).
 * - `userId`: cada pessoa guarda a sua escolha.
 * - `defaultTheme`: a cor da marca, usada enquanto o usuário não escolher outra.
 */
export function PanelThemeProvider({
  children,
  userId,
  defaultTheme = DEFAULT_THEME,
}: {
  children: React.ReactNode;
  userId?: string | null;
  defaultTheme?: PanelTheme;
}) {
  const storageKey = `classium:panel-theme:${userId ?? 'anon'}`;
  const [custom, setCustom] = useState<PanelTheme | null>(() => readStored(storageKey));

  useEffect(() => {
    setCustom(readStored(storageKey));
  }, [storageKey]);

  const theme = custom ?? defaultTheme;
  const cssVars = useMemo(() => themeToCssVars(theme.sidebar, theme.background), [theme.sidebar, theme.background]);

  // aplica as variáveis no <html> enquanto os painéis estiverem abertos
  useEffect(() => {
    const root = document.documentElement;
    const vars = cssVars;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.dataset.panelSidebar = theme.sidebar;
    root.dataset.panelBackground = theme.background;
    return () => {
      Object.keys(vars).forEach((k) => root.style.removeProperty(k));
      delete root.dataset.panelSidebar;
      delete root.dataset.panelBackground;
    };
  }, [cssVars, theme.sidebar, theme.background]);

  const persist = (t: PanelTheme | null) => {
    setCustom(t);
    try {
      if (t) localStorage.setItem(storageKey, JSON.stringify(t));
      else localStorage.removeItem(storageKey);
    } catch {
      /* navegação privada */
    }
  };

  const value = useMemo<PanelThemeState>(
    () => ({
      ...theme,
      cssVars,
      isCustom: custom !== null,
      setSidebar: (id) => persist({ ...theme, sidebar: id }),
      setBackground: (id) => persist({ ...theme, background: id }),
      reset: () => persist(null),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme.sidebar, theme.background, custom, storageKey, cssVars],
  );

  return <PanelThemeContext.Provider value={value}>{children}</PanelThemeContext.Provider>;
}

export function usePanelTheme() {
  const ctx = useContext(PanelThemeContext);
  if (!ctx) throw new Error('usePanelTheme precisa estar dentro de <PanelThemeProvider>');
  return ctx;
}

/**
 * Área do painel com as cores aplicadas direto no elemento (style inline).
 * Assim nenhuma regra antiga do CSS, como [data-portal="..."] { --sidebar-bg: ... },
 * consegue sobrescrever a cor escolhida.
 */
export function PanelSurface({
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { [key: `data-${string}`]: string | undefined }) {
  const { cssVars } = usePanelTheme();
  return (
    <div
      {...rest}
      style={{ ...(cssVars as React.CSSProperties), backgroundColor: 'var(--bg-app)', color: 'var(--text-body)', ...style }}
    />
  );
}

/**
 * Cores para gráficos (recharts não lê var(--...) em atributos SVG).
 * Usa a cor escolhida pela escola/usuário; fora do painel, a cor padrão.
 */
export function useChartTheme() {
  const ctx = useContext(PanelThemeContext);
  const vars = ctx?.cssVars ?? themeToCssVars(DEFAULT_THEME.sidebar, DEFAULT_THEME.background);
  return useMemo(() => {
    const accent = vars['--accent'];
    return {
      accent,
      accentSoft: vars['--accent-soft'],
      heading: vars['--text-heading'],
      text: vars['--text-body'],
      muted: vars['--text-muted'],
      border: vars['--border'],
      card: vars['--bg-card'],
      success: '#2F9E74',
      warning: '#D98A1F',
      danger: '#D2453B',
      /** séries em ordem: marca, verde, âmbar, vermelho, violeta */
      series: [accent, '#2F9E74', '#D98A1F', '#D2453B', '#7C6BC4'],
      grid: 'rgba(16,24,40,0.07)',
      tooltip: {
        contentStyle: {
          background: vars['--bg-card'],
          border: `1px solid ${vars['--border']}`,
          borderRadius: 14,
          boxShadow: '0 18px 40px -20px rgba(16,24,40,0.35)',
          fontSize: 12,
          color: vars['--text-heading'],
          padding: '8px 12px',
        },
        labelStyle: { color: vars['--text-heading'], fontWeight: 600, marginBottom: 4 },
        itemStyle: { color: vars['--text-body'], padding: 0 },
        cursor: { fill: 'rgba(16,24,40,0.04)' },
      },
      axis: { stroke: vars['--text-muted'], fontSize: 12, tickLine: false, axisLine: false },
    };
  }, [vars]);
}