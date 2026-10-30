import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BackgroundId,
  DEFAULT_THEME,
  SidebarColorId,
  isBackgroundId,
  isSidebarColorId,
  themeToCssVars,
} from './panelThemes';
import { supabase } from '../lib/supabase';

/**
 * Tema da MARCA: a cor que o dono da plataforma escolhe.
 * Vale para a landing, a tela de login e é o padrão dos painéis
 * (cada usuário ainda pode trocar a cor do próprio painel).
 *
 * Onde fica salvo: no Supabase (platform_settings, chave 'brand_theme'),
 * com cópia no navegador para a página abrir já na cor certa.
 * A futura área administrativa só precisa chamar useBrandTheme().setBrand(...).
 */

export interface BrandTheme {
  sidebar: SidebarColorId;
  background: BackgroundId;
}

export interface BrandThemeStore {
  load: () => Promise<BrandTheme | null>;
  save: (theme: BrandTheme) => Promise<void>;
}

const STORAGE_KEY = 'classium:brand-theme';

export const localBrandThemeStore: BrandThemeStore = {
  async load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? sanitize(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  },
  async save(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch {
      /* sem armazenamento: segue em memória */
    }
  },
};

/**
 * Tema salvo no Supabase: platform_settings, chave 'brand_theme'.
 * Qualquer visitante lê (a landing precisa); só o admin geral grava (regra do banco).
 * Se a leitura falhar, cai no que estiver salvo no navegador.
 */
export const supabaseBrandThemeStore: BrandThemeStore = {
  async load() {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'brand_theme')
        .maybeSingle();
      if (error || !data) return localBrandThemeStore.load();
      const theme = sanitize(data.value);
      if (theme) await localBrandThemeStore.save(theme); // abre mais rápido da próxima vez
      return theme;
    } catch {
      return localBrandThemeStore.load();
    }
  },
  async save(theme) {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key: 'brand_theme', value: theme }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    await localBrandThemeStore.save(theme);
  },
};

function sanitize(v: unknown): BrandTheme | null {
  const o = v as Partial<BrandTheme> | null;
  if (!o) return null;
  return {
    sidebar: isSidebarColorId(o.sidebar) ? o.sidebar : DEFAULT_THEME.sidebar,
    background: isBackgroundId(o.background) ? o.background : DEFAULT_THEME.background,
  };
}

/** Prévia pelo link: ?cor=verde&fundo=azul-claro (não salva nada). Útil para mostrar ao cliente. */
function readUrlPreview(): Partial<BrandTheme> {
  try {
    const q = new URLSearchParams(window.location.search);
    const cor = q.get('cor');
    const fundo = q.get('fundo');
    return {
      ...(isSidebarColorId(cor) ? { sidebar: cor } : {}),
      ...(isBackgroundId(fundo) ? { background: fundo } : {}),
    };
  } catch {
    return {};
  }
}

interface BrandThemeState {
  brand: BrandTheme;
  /** Variáveis CSS prontas para aplicar num elemento (style={cssVars}) */
  cssVars: React.CSSProperties;
  ready: boolean;
  /** Para a futura tela administrativa */
  setBrand: (theme: BrandTheme) => Promise<void>;
}

const BrandThemeContext = createContext<BrandThemeState | null>(null);

export function BrandThemeProvider({
  children,
  store = localBrandThemeStore,
}: {
  children: React.ReactNode;
  store?: BrandThemeStore;
}) {
  const [saved, setSaved] = useState<BrandTheme>(DEFAULT_THEME);
  const [ready, setReady] = useState(false);
  const [preview] = useState(readUrlPreview);

  useEffect(() => {
    let alive = true;
    store.load().then((t) => {
      if (!alive) return;
      if (t) setSaved(t);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [store]);

  const brand = useMemo<BrandTheme>(() => ({ ...saved, ...preview }), [saved, preview]);

  const setBrand = useCallback(
    async (t: BrandTheme) => {
      setSaved(t);
      await store.save(t);
    },
    [store],
  );

  const value = useMemo<BrandThemeState>(
    () => ({
      brand,
      cssVars: themeToCssVars(brand.sidebar, brand.background) as React.CSSProperties,
      ready,
      setBrand,
    }),
    [brand, ready, setBrand],
  );

  return <BrandThemeContext.Provider value={value}>{children}</BrandThemeContext.Provider>;
}

export function useBrandTheme() {
  const ctx = useContext(BrandThemeContext);
  if (!ctx) throw new Error('useBrandTheme precisa estar dentro de <BrandThemeProvider>');
  return ctx;
}