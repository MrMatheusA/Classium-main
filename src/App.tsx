/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { PlansProvider } from './context/PlansContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { OnboardingPage } from './components/OnboardingPage';
import { GestorDashboard } from './components/GestorDashboard';
import { FamilyDashboard } from './components/FamilyDashboard';
import { ProfessorDashboard } from './components/ProfessorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AICommandPanel } from './components/AICommandPanel';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { FamilyProvider } from './contexts/FamilyContext';
import { MasterPortalProvider } from './context/MasterPortalContext';
import { getSupabaseEnvConfig } from './lib/supabase/config';
import { BrandThemeProvider, useBrandTheme, supabaseBrandThemeStore } from './theme/BrandThemeContext';
import { AccessProvider, useAccess } from './auth/AccessProvider';
import { PanelSurface, PanelThemeProvider } from './theme/PanelThemeContext';
import { useUrlSync } from './routing/useUrlSync';
import { BrandShield } from './components/BrandShield';
import { CommandPalette } from './components/header/CommandPalette';

import { MobileHeader } from './components/navigation/MobileHeader';
import { MobileDrawer } from './components/navigation/MobileDrawer';
import { BottomNavigation } from './components/navigation/BottomNavigation';

const PROTECTED_MODES = ['professor', 'family', 'admin', 'commands'];

function AppContent() {
  const { mode, setMode, activeAdminTab } = usePlatform();
  const { user, loading: authLoading } = useAuth();
  const { access, loading: accessLoading, passwordRecovery } = useAccess();
  const { brand, cssVars } = useBrandTheme();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const config = getSupabaseEnvConfig();

  // O perfil vem do banco (resolve_my_access). A equipe da escola usa o painel da gestão.
  const role = access.role === 'equipe' ? 'gestor' : access.role;
  const rawLoading = authLoading || (!!user && accessLoading);

  // Depois que o painel abriu, ele não some mais por causa de uma checagem de sessão em
  // segundo plano (ex.: ao voltar para a aba). Só a primeira carga mostra a tela de espera.
  const booted = React.useRef(false);
  if (!user && !authLoading) booted.current = false; // saiu da conta: a próxima entrada carrega do zero
  const loading = rawLoading && !booted.current;

  // Cada tela com seu endereço (/entrar, /gestao, ...)
  useUrlSync();

  // Os hooks ficam antes de qualquer return condicional (regra dos hooks do React)
  React.useEffect(() => {
    // usa rawLoading: durante uma checagem em segundo plano ninguém é redirecionado
    if (!config.isConfigured || rawLoading) return;

    // Sem usuário: área logada vira login
    if (!user) {
      if (PROTECTED_MODES.includes(mode)) setMode('login');
      return;
    }

    // Redefinição de senha ou senha provisória: fica no login até trocar
    if (passwordRecovery || access.mustChangePassword) {
      if (mode !== 'login') setMode('login');
      return;
    }

    if (role === 'admin') {
      if (!['admin', 'professor', 'family', 'commands'].includes(mode)) setMode('admin');
    } else if (role === 'gestor') {
      const target = access.needsOnboarding ? 'onboarding' : 'admin';
      if (mode !== target) setMode(target);
    } else if (role === 'docente') {
      if (mode !== 'professor') setMode('professor');
    } else if (role === 'familia') {
      if (mode !== 'family') setMode('family');
    } else if (PROTECTED_MODES.includes(mode) || mode === 'onboarding') {
      // parceiro ou sem perfil: o login explica e encerra a sessão
      setMode('login');
    }
  }, [config.isConfigured, user, role, mode, setMode, rawLoading, passwordRecovery, access.mustChangePassword, access.needsOnboarding]);

  if (!config.isConfigured) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#050b1a] p-6 text-white">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-rose-500 bg-slate-900 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="font-serif text-xl font-bold text-rose-400">Supabase não configurado no deploy</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            As variáveis de ambiente{' '}
            <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-xs text-rose-300">VITE_SUPABASE_URL</code> e{' '}
            <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-xs text-rose-300">VITE_SUPABASE_ANON_KEY</code> (ou{' '}
            <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-xs text-rose-300">NEXT_PUBLIC_</code>) não foram
            encontradas ou são inválidas.
          </p>
          <div className="rounded-lg border border-rose-500/20 bg-rose-950/40 p-4 text-left font-mono text-xs text-rose-300">
            <div>Erro: Supabase não configurado no deploy (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ ...cssVars, background: 'var(--bg-app)' }}>
        <div className="flex flex-col items-center gap-5">
          <div className="h-14 w-14 animate-pulse">
            <BrandShield size="100%" />
          </div>
          <div className="h-1 w-32 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
            <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] rounded-full" style={{ background: 'var(--accent)' }} />
          </div>
          <style>{'@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'}</style>
        </div>
      </div>
    );
  }

  // Telas públicas usam a cor da marca
  if (mode === 'landing') return <LandingPage />;

  if (mode === 'login') {
    return (
      <div style={cssVars}>
        <LoginPage />
      </div>
    );
  }

  if (mode === 'onboarding') {
    return (
      <div style={cssVars}>
        <OnboardingPage />
      </div>
    );
  }

  booted.current = true;

  const activePortal =
    mode === 'family' ? 'familia' : mode === 'professor' ? 'docente' : role === 'familia' ? 'familia' : role === 'docente' ? 'docente' : 'gestor';

  return (
    // Painéis: cor da marca por padrão; cada usuário pode trocar no Header
    <PanelThemeProvider userId={user?.id} defaultTheme={brand}>
      <PanelSurface data-portal={activePortal} className="relative flex h-screen flex-col overflow-hidden font-body">
        {/* Mobile Top Header (<lg) */}
        <MobileHeader onOpenDrawer={() => setIsDrawerOpen(true)} />

        {/* Slide-out Mobile Drawer */}
        <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

        <div className="flex min-w-0 flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Desktop Top Header (lg+) */}
            <div className="hidden lg:block">
              <Header />
            </div>
            <main className="relative flex-1 overflow-y-auto pb-20 md:pb-6" style={{ backgroundColor: 'var(--bg-app)' }}>
              {mode === 'family' && (role === 'familia' || role === 'admin') && <FamilyDashboard />}
              {mode === 'professor' && (role === 'docente' || role === 'admin') && <ProfessorDashboard />}
              {/* Gestão: o "Início" do gestor é o painel dele; os outros módulos ficam no AdminDashboard */}
              {mode === 'admin' &&
                (role === 'gestor' && activeAdminTab === 'dashboard' ? (
                  <GestorDashboard />
                ) : role === 'gestor' || role === 'admin' ? (
                  <AdminDashboard />
                ) : null)}
              {mode === 'commands' && role === 'admin' && <AICommandPanel />}
            </main>
          </div>
        </div>

        {/* Busca de módulos (Ctrl+K), uma só para o painel */}
        <CommandPalette />

        {/* Mobile Bottom Navigation (<md) */}
        <BottomNavigation onOpenMenu={() => setIsDrawerOpen(true)} />
      </PanelSurface>
    </PanelThemeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AccessProvider>
      <PlatformProvider>
        <BrandThemeProvider store={supabaseBrandThemeStore}>
          <PlansProvider>
            <FamilyProvider>
              <MasterPortalProvider>
                <AppContent />
              </MasterPortalProvider>
            </FamilyProvider>
          </PlansProvider>
        </BrandThemeProvider>
      </PlatformProvider>
      </AccessProvider>
    </AuthProvider>
  );
}