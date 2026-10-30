import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert } from 'lucide-react';
import { findNav, usePortalNav, type NavItem } from '../navigation/portalNav';

import { AdminDashboardHome } from './admin/AdminDashboardHome';
import { AdminPedagogico } from './admin/AdminPedagogico';
import { AdminFinanceiro } from './admin/AdminFinanceiro';
import { AdminOutros } from './admin/AdminOutros';
import { CommunicationEditor } from './admin/CommunicationEditor';
import { AdminEstudantes } from './admin/AdminEstudantes';
import { AdminRadarRotina } from './admin/AdminRadarRotina';
import { AdminSecretaria } from './admin/AdminSecretaria';
import { AdminRelatorios } from './admin/AdminRelatorios';
import { AdminHorarioAula } from './admin/AdminHorarioAula';
import { EducaIntelligenceCenter } from './admin/EducaIntelligenceCenter';
import { SuperIaCenter } from './admin/SuperIaCenter';
import { ClassiumIntegrationHub } from './admin/EducaPlusIntegrationHub';
import { AdminTransporte } from './admin/AdminTransporte';
import { AdminGestaoParceiros } from './admin/AdminGestaoParceiros';
import AdminSmartHorarios from './admin/AdminSmartHorarios';
import { ErrorBoundary } from './common/ErrorBoundary';
import { Button, Card, EmptyState, Page, PillNav, EASE } from './ui/kit';

/** Abas antigas que saíram do painel */
const REMOVED_TABS = ['supabase_center'];

/** Módulos que já têm o próprio topo grande (não precisam da faixa) */
const HAS_OWN_HERO = [
  'gestao-parceiros',
  'comercial',
  'pedagogico',
  'horario-aula',
  'smart-horarios',
  'comunicacao',
  'agenda',
  'intelligence_center',
];

export function AdminDashboard() {
  const { activeAdminTab, setActiveAdminTab, schoolInfo, addAuditLog } = usePlatform();
  const { user, role, organizationId } = useAuth();
  const nav = usePortalNav();

  // dados de demonstração só quando ninguém está logado
  const demoMode = !user;
  const [selectedUnit, setSelectedUnit] = useState<string>('sede');

  // quem chegar numa aba removida volta para a visão geral
  useEffect(() => {
    if (REMOVED_TABS.includes(activeAdminTab)) setActiveAdminTab('dashboard');
  }, [activeAdminTab, setActiveAdminTab]);

  const hasAccess = nav.isAllowed(activeAdminTab);

  // registra só uma vez por aba bloqueada
  const loggedDenied = useRef<string | null>(null);
  useEffect(() => {
    if (hasAccess || loggedDenied.current === activeAdminTab || !addAuditLog) return;
    loggedDenied.current = activeAdminTab;
    addAuditLog(
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      activeAdminTab,
      `Perfil ${role || 'sem perfil'}`,
      `Tentativa de abrir o módulo ${activeAdminTab} sem permissão.`,
    );
  }, [hasAccess, activeAdminTab, role, addAuditLog]);

  const found = findNav('admin', activeAdminTab);
  const isHome = activeAdminTab === 'dashboard';

  return (
    <Page>
      {/* Faixa do módulo: descrição + atalhos para os módulos do mesmo grupo */}
      {!isHome && found && hasAccess && !HAS_OWN_HERO.includes(activeAdminTab) && <ModuleBanner sectionTitle={found.section.title} item={found.item} nav={nav} schoolName={schoolInfo?.name} />}

      {/* Conteúdo (o ErrorBoundary reinicia ao trocar de módulo) */}
      <ErrorBoundary key={activeAdminTab}>
        {!hasAccess ? (
          <Card>
            <EmptyState
              icon={ShieldAlert}
              title="Este módulo não está liberado para o seu perfil"
              text={`Peça à gestão da escola para liberar "${found?.item.label ?? 'este módulo'}" para você.`}
              action={<Button onClick={() => nav.go('dashboard')}>Voltar para o início</Button>}
            />
          </Card>
        ) : (
          <motion.div key={activeAdminTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-6">
            {(activeAdminTab === 'dashboard' || activeAdminTab === 'instituicao') && <AdminDashboardHome demoMode={demoMode} selectedUnit={selectedUnit} />}
            {activeAdminTab === 'intelligence_center' && <EducaIntelligenceCenter />}
            {activeAdminTab === 'integration_hub' && <ClassiumIntegrationHub />}
            {activeAdminTab === 'super_ia_center' && <SuperIaCenter />}
            {activeAdminTab === 'pessoas' && <AdminEstudantes />}
            {activeAdminTab === 'pedagogico' && <AdminPedagogico organizationId={organizationId || undefined} schoolInfo={schoolInfo} />}
            {activeAdminTab === 'relatorios' && <AdminRelatorios />}
            {activeAdminTab === 'documentos' && <AdminSecretaria initialView="documentos" />}
            {activeAdminTab === 'secretaria-tab' && <AdminSecretaria initialView="secretaria" />}
            {activeAdminTab === 'diario-disciplinar' && <AdminRadarRotina initialSubTab="disciplina" />}
            {activeAdminTab === 'radar-rotina' && <AdminRadarRotina />}
            {activeAdminTab === 'financeiro' && <AdminFinanceiro />}
            {activeAdminTab === 'horario-aula' && <AdminHorarioAula />}
            {activeAdminTab === 'smart-horarios' && <AdminSmartHorarios />}
            {activeAdminTab === 'comunicacao' && <CommunicationEditor />}
            {activeAdminTab === 'transporte' && <AdminTransporte selectedUnit={selectedUnit} />}
            {(activeAdminTab === 'gestao-parceiros' || activeAdminTab === 'comercial') && <AdminGestaoParceiros />}
            {['agenda', 'alimentacao', 'ia', 'configuracoes', 'achados-perdidos', 'portaria-qrcode'].includes(activeAdminTab) && (
              <AdminOutros tab={activeAdminTab} demoMode={demoMode} selectedUnit={selectedUnit} setSelectedUnit={setSelectedUnit} />
            )}
          </motion.div>
        )}
      </ErrorBoundary>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Faixa do módulo                                                     */
/* ------------------------------------------------------------------ */

function ModuleBanner({
  sectionTitle,
  item,
  nav,
  schoolName,
}: {
  sectionTitle: string;
  item: NavItem;
  nav: ReturnType<typeof usePortalNav>;
  schoolName?: string;
}) {
  const Icon = item.icon;
  const siblings = nav.sections.find((s) => s.title === sectionTitle)?.items ?? [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)]"
    >
      {/* fundo: grade de caderno na cor da marca, bem suave */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--accent-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--accent-soft) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to left, black, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(to left, black, transparent 70%)',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: 'var(--accent-soft)' }} />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-[0_12px_24px_-14px_rgba(16,24,40,0.6)]"
            style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}
          >
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              {sectionTitle}
              {schoolName ? <span className="font-medium normal-case tracking-normal text-[var(--text-muted)]"> · {schoolName}</span> : null}
            </p>
            <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-[var(--text-body)]">{item.description}</p>
          </div>
        </div>

        {siblings.length > 1 && (
          <div className="min-w-0 lg:max-w-[55%]">
            <PillNav<string>
              label={`Módulos de ${sectionTitle}`}
              items={siblings.map((s) => ({ id: String(s.id), label: s.label, icon: s.icon }))}
              value={String(item.id)}
              onChange={(id) => nav.go(id)}
            />
          </div>
        )}
      </div>
    </motion.section>
  );
}