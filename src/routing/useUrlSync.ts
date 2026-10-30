import { useEffect, useRef } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { supabase } from '../lib/supabase';
import { DEFAULT_TAB, findNav, findNavBySlug, navIntent, type PortalKind, type TabId } from '../navigation/portalNav';

/**
 * Dá um endereço próprio para cada tela e para cada módulo dos painéis.
 *
 *   /                          landing
 *   /entrar                    login
 *   /cadastro/escola           cadastro do gestor
 *   /cadastro/familia          cadastro da família
 *   /primeiros-passos          onboarding
 *   /gestao                    painel da gestão (início)
 *   /gestao/estudantes         módulo Estudantes (e assim por diante)
 *   /professor/alunos          módulo Alunos do professor
 *   /familia/recados           aba Recados da família
 *   /comandos                  painel de comandos (admin)
 *
 * - Recarregar a página (F5) mantém o módulo aberto.
 * - Voltar/avançar do navegador passam pelos módulos.
 * - Se algum código voltar sozinho para "Início" logo depois de abrir o painel ou de o
 *   Supabase renovar a sessão (ao voltar para a aba), a escolha da pessoa é restaurada.
 *
 * O servidor precisa devolver o index.html para qualquer caminho (vercel.json / _redirects).
 */

type Platform = ReturnType<typeof usePlatform>;
type Mode = Platform['mode'];
type LoginFlow = 'login' | 'register-gestor' | 'register-family';

interface Route {
  path: string;
  mode: string;
  flow?: LoginFlow;
  title: string;
  portal?: PortalKind;
}

const ROUTES: Route[] = [
  { path: '/', mode: 'landing', title: 'Classium · Gestão escolar conectada' },
  { path: '/entrar', mode: 'login', flow: 'login', title: 'Entrar · Classium' },
  { path: '/cadastro/escola', mode: 'login', flow: 'register-gestor', title: 'Criar conta da escola · Classium' },
  { path: '/cadastro/familia', mode: 'login', flow: 'register-family', title: 'Criar conta família · Classium' },
  { path: '/primeiros-passos', mode: 'onboarding', title: 'Primeiros passos · Classium' },
  { path: '/gestao', mode: 'admin', title: 'Gestão · Classium', portal: 'admin' },
  { path: '/professor', mode: 'professor', title: 'Professor · Classium', portal: 'professor' },
  { path: '/familia', mode: 'family', title: 'Família · Classium', portal: 'family' },
  { path: '/comandos', mode: 'commands', title: 'Comandos · Classium' },
];

const PANEL_MODES = ['admin', 'professor', 'family', 'commands'];

/** janela (ms) em que uma volta automática para "Início" é desfeita */
const GUARD_MS = 4000;

function normalize(path: string) {
  const p = path.replace(/\/+$/, '');
  return p === '' ? '/' : p.toLowerCase();
}

function parsePath(path: string): { route: Route; slug: string } | null {
  const p = normalize(path);
  const exact = ROUTES.find((r) => r.path === p);
  if (exact) return { route: exact, slug: '' };
  const panel = ROUTES.find((r) => r.portal && p.startsWith(r.path + '/'));
  if (panel) return { route: panel, slug: p.slice(panel.path.length + 1).split('/')[0] };
  return null;
}

function routeFromState(mode: string, flow: LoginFlow | undefined): Route | undefined {
  if (mode === 'login') return ROUTES.find((r) => r.mode === 'login' && r.flow === (flow ?? 'login'));
  return ROUTES.find((r) => r.mode === mode);
}

export function useUrlSync() {
  const platform = usePlatform();
  const {
    mode,
    setMode,
    activeAdminTab,
    setActiveAdminTab,
    activeFamilyTab,
    setActiveFamilyTab,
    activeProfessorTab,
    setActiveProfessorTab,
  } = platform;
  // loginFlow / setLoginFlow existem no PlatformContext (a landing já usa setLoginFlow)
  const loginFlow = (platform as Platform & { loginFlow?: LoginFlow }).loginFlow;
  const setLoginFlow = (platform as Platform & { setLoginFlow?: (f: LoginFlow) => void }).setLoginFlow;

  const fromBrowser = useRef(false);
  const prevMode = useRef<string>(mode as string);
  const mounted = useRef(false);
  const guardUntil = useRef(0);

  const getTab = (portal: PortalKind): TabId =>
    portal === 'admin' ? activeAdminTab : portal === 'family' ? activeFamilyTab : (activeProfessorTab as TabId);

  const setTab = (portal: PortalKind, id: TabId) => {
    if (portal === 'admin') setActiveAdminTab(id as any);
    else if (portal === 'family') setActiveFamilyTab(id as number);
    else setActiveProfessorTab(id as any);
  };

  const applyPath = (path: string) => {
    const parsed = parsePath(path) ?? { route: ROUTES[0], slug: '' };
    const { route, slug } = parsed;
    fromBrowser.current = true;
    if (route.flow && setLoginFlow) setLoginFlow(route.flow);
    if (route.mode !== mode) setMode(route.mode as Mode);
    if (route.portal) {
      const item = slug ? findNavBySlug(route.portal, slug) : null;
      const id = item ? item.id : DEFAULT_TAB[route.portal];
      navIntent.set(route.portal, id);
      setTab(route.portal, id);
    }
  };

  // 1) ao abrir: o endereço manda
  useEffect(() => {
    if (parsePath(window.location.pathname)) {
      applyPath(window.location.pathname);
      guardUntil.current = Date.now() + GUARD_MS;
    } else {
      // caminho desconhecido → início
      window.history.replaceState(null, '', '/' + window.location.search);
    }
    mounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) voltar / avançar do navegador
  useEffect(() => {
    const onPop = () => applyPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  });

  // 3) a sessão foi checada de novo (ex.: voltou para a aba): protege a aba escolhida
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        guardUntil.current = Date.now() + GUARD_MS;
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // 4) o app mudou de tela ou de módulo → atualiza o endereço
  const route = routeFromState(mode as string, loginFlow);
  const portal = route?.portal;
  const tab = portal ? getTab(portal) : null;

  useEffect(() => {
    if (!mounted.current || !route) return;
    const previous = prevMode.current;
    prevMode.current = mode as string;

    // Algum código voltou sozinho para "Início" logo após abrir/renovar a sessão? Desfaz.
    if (
      portal &&
      tab === DEFAULT_TAB[portal] &&
      Date.now() < guardUntil.current &&
      navIntent.portal === portal &&
      navIntent.id !== null &&
      navIntent.id !== DEFAULT_TAB[portal] &&
      findNav(portal, navIntent.id)
    ) {
      setTab(portal, navIntent.id);
      return;
    }

    const item = portal && tab !== null ? findNav(portal, tab)?.item : null;
    const path = route.path + (item && item.slug ? `/${item.slug}` : '');
    document.title = item && item.slug ? `${item.label} · Classium` : route.title;

    if (fromBrowser.current) {
      fromBrowser.current = false;
      return;
    }
    if (normalize(window.location.pathname) === path) return;

    // Redirecionamentos automáticos não entram no histórico, senão o "voltar" fica preso:
    // painel → login (sessão expirou) e login → painel (acabou de entrar).
    const isRedirect =
      (PANEL_MODES.includes(previous) && route.mode === 'login') ||
      (previous === 'login' && (PANEL_MODES.includes(route.mode) || route.mode === 'onboarding'));

    // mantém ?cor=... só na landing (prévia de tema)
    const url = path + (route.mode === 'landing' ? window.location.search : '');
    if (isRedirect) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);

    if (previous !== mode) window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loginFlow, tab]);
}