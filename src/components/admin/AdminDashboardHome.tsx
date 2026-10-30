import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Award,
  Bell,
  Building,
  Edit2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Shield,
  Smartphone,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { useAuth } from '../../hooks/useAuth';
import { realtimeService } from '../../services/RealtimeService';
import { dashboardService } from '../../services/dashboardService';
import { institutionService, InstitutionData, ManagementTeamMember } from '../../services/institutionService';
import { DashboardHeaderUnificado } from './DashboardHeaderUnificado';
import { Badge, Button, Card, CardHeader, EmptyState, Skeleton, cx, EASE } from '../ui/kit';
import { CountUp } from '../landing/effects';

interface HomeProps {
  demoMode: boolean;
  selectedUnit: string;
}

interface WidgetState {
  value: number | string | null;
  loading: boolean;
  error: string | null;
}

type Tone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger';

export function AdminDashboardHome({ demoMode, selectedUnit }: HomeProps) {
  const { currentUser, setActiveAdminTab } = usePlatform();
  const { profile } = useAuth();

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Indicadores
  const [metrics, setMetrics] = useState<Record<string, WidgetState>>({
    students: { value: null, loading: true, error: null },
    guardians: { value: null, loading: true, error: null },
    announcements: { value: null, loading: true, error: null },
  });

  // Escola e equipe gestora
  const [schoolData, setSchoolData] = useState<InstitutionData | null>(null);
  const [schoolLoading, setSchoolLoading] = useState<boolean>(true);
  const [teamMembers, setTeamMembers] = useState<ManagementTeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState<boolean>(true);

  const activeOrgId =
    profile?.organization_id ||
    profile?.school_id ||
    currentUser?.organization_id ||
    currentUser?.school_id ||
    currentUser?.organizationId ||
    '11111111-1111-1111-1111-111111111111';

  // 1. Indicadores
  const fetchMetrics = useCallback(async () => {
    try {
      const data = await dashboardService.getMetrics(activeOrgId);
      setMetrics({
        students: { value: data.metrics.total_students, loading: false, error: null },
        guardians: { value: data.metrics.total_guardians, loading: false, error: null },
        announcements: { value: data.metrics.total_announcements, loading: false, error: null },
      });
    } catch (err: any) {
      console.warn('[AdminDashboardHome] Metrics error:', err);
      const failed = { value: 0, loading: false, error: 'Não carregou' };
      setMetrics({ students: failed, guardians: failed, announcements: failed });
    }
  }, [activeOrgId]);

  // 2. Escola e equipe
  const fetchSchoolAndTeam = useCallback(async () => {
    try {
      setSchoolLoading(true);
      setTeamLoading(true);
      const [org, team] = await Promise.all([
        institutionService.getOrganization(activeOrgId),
        institutionService.getManagementTeam(activeOrgId),
      ]);
      setSchoolData(org);
      setTeamMembers(team);
    } catch (err) {
      console.warn('[AdminDashboardHome] Error fetching school/team data:', err);
    } finally {
      setSchoolLoading(false);
      setTeamLoading(false);
    }
  }, [activeOrgId]);

  const fetchAll = useCallback(async () => {
    setIsSyncing(true);
    await Promise.all([fetchMetrics(), fetchSchoolAndTeam()]);
    setIsSyncing(false);
  }, [fetchMetrics, fetchSchoolAndTeam]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, selectedUnit, demoMode]);

  // Atualização em tempo real
  useEffect(() => {
    const unsubStudents = realtimeService.subscribe('dashboard_students_rt', { table: 'students' }, () => {
      fetchMetrics();
    });
    const unsubGuardians = realtimeService.subscribe('dashboard_guardians_rt', { table: 'guardians' }, () => {
      fetchMetrics();
    });
    const unsubAnnouncements = realtimeService.subscribe('dashboard_announcements_rt', { table: 'announcements' }, () => {
      fetchMetrics();
    });
    const unsubCommunications = realtimeService.subscribe('dashboard_communications_rt', { table: 'communications' }, () => {
      fetchMetrics();
    });
    const unsubOrganizations = realtimeService.subscribe('dashboard_organizations_rt', { table: 'organizations' }, () => {
      institutionService.getOrganization(activeOrgId).then(setSchoolData);
      fetchMetrics();
    });
    const unsubSchools = realtimeService.subscribe('dashboard_schools_rt', { table: 'schools' }, () => {
      institutionService.getOrganization(activeOrgId).then(setSchoolData);
      fetchMetrics();
    });
    const unsubTeam = realtimeService.subscribe('dashboard_management_team_rt', { table: 'school_management_team' }, () => {
      institutionService.getManagementTeam(activeOrgId).then(setTeamMembers);
      fetchMetrics();
    });
    const unsubStaff = realtimeService.subscribe('dashboard_school_staff_rt', { table: 'school_staff' }, () => {
      institutionService.getManagementTeam(activeOrgId).then(setTeamMembers);
      fetchMetrics();
    });

    const handleLocalUpdate = () => {
      fetchSchoolAndTeam();
      fetchMetrics();
    };
    window.addEventListener('classium_school_updated', handleLocalUpdate);

    return () => {
      unsubStudents();
      unsubGuardians();
      unsubAnnouncements();
      unsubCommunications();
      unsubOrganizations();
      unsubSchools();
      unsubTeam();
      unsubStaff();
      window.removeEventListener('classium_school_updated', handleLocalUpdate);
    };
  }, [fetchMetrics, fetchSchoolAndTeam, activeOrgId]);

  // Abre a janela de dados da escola (DashboardHeaderUnificado) na aba certa
  const handleOpenModalTab = (tab: 'cadastrais' | 'endereco' | 'termos' | 'gestao') => {
    window.dispatchEvent(new CustomEvent('classium_open_school_modal', { detail: { tab } }));
  };

  const roleTone = (role: string): Tone => {
    switch (role) {
      case 'Diretor(a) Geral':
        return 'accent';
      case 'Vice-Diretor(a)':
        return 'accent';
      case 'Pedagogo(a)':
        return 'success';
      case 'Coordenador(a) Pedagógico(a)':
        return 'success';
      case 'Supervisor(a)':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const NI = 'Não informado';
  const officialName = schoolData?.official_name || schoolData?.legal_name || schoolData?.name || NI;
  const fantasyName = schoolData?.fantasy_name || schoolData?.trade_name || NI;
  const cnpj = schoolData?.cnpj || schoolData?.document_number || NI;
  const stateRegistration = schoolData?.state_registration || schoolData?.settings?.state_registration || 'Isento ou não informado';
  const inep = schoolData?.inep_code || schoolData?.settings?.inep_code || NI;
  const address = schoolData?.address || schoolData?.settings?.address || 'Endereço não cadastrado';
  const city = schoolData?.city || schoolData?.settings?.city || '';
  const uf = schoolData?.state || schoolData?.settings?.state || '';
  const postalCode = schoolData?.postal_code || schoolData?.settings?.postal_code || NI;
  const email = schoolData?.email || NI;
  const phoneFixed = schoolData?.phone_fixed || schoolData?.phone || NI;
  const phoneMobile = schoolData?.phone_mobile || schoolData?.settings?.phone_mobile || NI;

  return (
    <div className="space-y-6 text-left">
      {/* Cabeçalho com os dados da escola (abre a janela de edição) */}
      <DashboardHeaderUnificado onDataUpdated={fetchSchoolAndTeam} />

      {/* Indicadores */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold text-[var(--text-heading)]">Resumo da escola</h2>
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={fetchAll} disabled={isSyncing} className={isSyncing ? '[&_svg]:animate-spin' : ''}>
            {isSyncing ? 'Atualizando…' : 'Atualizar'}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            index={0}
            title="Alunos"
            subtitle="matriculados"
            icon={Users}
            state={metrics.students}
            onRetry={fetchMetrics}
            actionLabel="Cadastrar aluno"
            onAction={() => setActiveAdminTab('pessoas')}
          />
          <MetricCard
            index={1}
            title="Responsáveis"
            subtitle="famílias no portal"
            icon={UserCheck}
            state={metrics.guardians}
            onRetry={fetchMetrics}
            actionLabel="Ver famílias"
            onAction={() => setActiveAdminTab('pessoas')}
          />
          <MetricCard
            index={2}
            title="Comunicados"
            subtitle="publicados"
            icon={Bell}
            state={metrics.announcements}
            onRetry={fetchMetrics}
            actionLabel="Novo comunicado"
            onAction={() => setActiveAdminTab('comunicacao')}
          />
          <MetricCard
            index={3}
            title="Equipe gestora"
            subtitle={teamMembers.length === 1 ? 'pessoa' : 'pessoas'}
            icon={Shield}
            state={{ value: teamMembers.length, loading: teamLoading, error: null }}
            onRetry={fetchSchoolAndTeam}
            actionLabel="Gerenciar equipe"
            onAction={() => handleOpenModalTab('gestao')}
          />
        </div>
      </section>

      {/* Equipe gestora */}
      <Card>
        <CardHeader
          icon={Users}
          title="Equipe gestora"
          subtitle="Direção e coordenação responsáveis pela escola"
          action={
            teamMembers.length > 0 ? (
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => handleOpenModalTab('gestao')}>
                Gerenciar
              </Button>
            ) : undefined
          }
        />

        {teamLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 rounded-3xl" />
            ))}
          </div>
        ) : teamMembers.length === 0 ? (
          <EmptyState
            compact
            icon={Users}
            title="Ninguém cadastrado na equipe gestora"
            text="Adicione direção, vice-direção, coordenação e pedagogia para aparecerem aqui e nos documentos."
            action={
              <Button icon={Plus} onClick={() => handleOpenModalTab('gestao')}>
                Adicionar a primeira pessoa
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member, i) => {
              const roleTitle = member.role === 'Outro' && member.custom_role_title ? member.custom_role_title : member.role;
              const initials =
                member.name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase() || 'GE';

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.04, ease: EASE }}
                  className="group relative rounded-3xl border border-[var(--border)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_20px_40px_-28px_rgba(16,24,40,0.5)]"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-serif text-[16px] font-semibold"
                      style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}
                    >
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-[var(--text-heading)]">{member.name}</p>
                      <div className="mt-1">
                        <Badge tone={roleTone(member.role)}>{roleTitle}</Badge>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenModalTab('gestao')}
                      className="rounded-xl p-2 text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] focus:opacity-100 group-hover:opacity-100"
                      title="Editar"
                      aria-label={`Editar ${member.name}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>

                  {(member.email || member.phone) && (
                    <div className="mt-4 space-y-1.5 border-t border-[var(--border)] pt-3 text-[13px] text-[var(--text-body)]">
                      {member.email && (
                        <a href={`mailto:${member.email}`} className="flex items-center gap-2 truncate hover:text-[var(--accent)]">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                          <span className="truncate">{member.email}</span>
                        </a>
                      )}
                      {member.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                          <span className="tabular-nums">{member.phone}</span>
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Dados da escola */}
      <Card>
        <CardHeader
          icon={Building}
          title="Dados da escola"
          subtitle="Informações que aparecem em documentos, boletins e comunicados"
          action={
            <Button size="sm" variant="secondary" icon={Edit2} onClick={() => handleOpenModalTab('cadastrais')}>
              Editar
            </Button>
          }
        />

        {schoolLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoGroup icon={Building} title="Identificação" onEdit={() => handleOpenModalTab('cadastrais')}>
              <InfoRow label="Razão social" value={officialName} strong />
              <InfoRow label="Nome fantasia" value={fantasyName} />
              <InfoRow label="CNPJ" value={cnpj} mono />
              <InfoRow label="Inscrição estadual" value={stateRegistration} mono />
            </InfoGroup>

            <InfoGroup icon={MapPin} title="Endereço" onEdit={() => handleOpenModalTab('endereco')}>
              <InfoRow label="Logradouro" value={address} strong />
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Cidade" value={[city, uf].filter(Boolean).join(' / ') || NI} />
                <InfoRow label="CEP" value={postalCode} mono />
              </div>
            </InfoGroup>

            <InfoGroup icon={Award} title="MEC / INEP" onEdit={() => handleOpenModalTab('termos')}>
              {inep === NI ? (
                <InfoRow label="Código INEP" value={NI} />
              ) : (
                <div>
                  <p className="text-[12px] text-[var(--text-muted)]">Código INEP</p>
                  <p className="mt-1 inline-flex rounded-xl px-3 py-1.5 text-[18px] font-semibold tabular-nums tracking-wide text-[var(--accent)]" style={{ background: 'var(--accent-soft)' }}>
                    {inep}
                  </p>
                </div>
              )}
            </InfoGroup>

            <InfoGroup icon={Phone} title="Contato" onEdit={() => handleOpenModalTab('cadastrais')}>
              <InfoLine icon={Mail} value={email} />
              <InfoLine icon={Phone} value={phoneFixed} />
              <InfoLine icon={Smartphone} value={phoneMobile} />
            </InfoGroup>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

function MetricCard({
  index = 0,
  title,
  subtitle,
  icon: Icon,
  state,
  onRetry,
  actionLabel,
  onAction,
}: {
  index?: number;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  state: WidgetState;
  onRetry: () => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const numeric = typeof state.value === 'number' ? state.value : Number(state.value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: EASE }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-26px_rgba(16,24,40,0.45)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'var(--accent-soft)' }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-[var(--text-muted)]">{title}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>

      <div className="relative mt-2 min-h-[56px]">
        {state.loading ? (
          <Skeleton className="mt-1 h-9 w-20 rounded-xl" />
        ) : state.error ? (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[13px] text-[#B42318]">{state.error}</span>
            <button type="button" onClick={onRetry} className="text-[13px] font-semibold text-[var(--accent)] hover:underline">
              Tentar de novo
            </button>
          </div>
        ) : (
          <>
            <p className="font-serif text-[36px] font-semibold leading-none tracking-[-0.02em] text-[var(--text-heading)] tabular-nums">
              {Number.isFinite(numeric) ? <CountUp to={numeric} duration={1.1} /> : state.value ?? 0}
            </p>
            {subtitle && <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">{subtitle}</p>}
          </>
        )}
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="relative mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-[13px] font-semibold text-[var(--text-body)] transition-colors hover:text-[var(--accent)]"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </motion.div>
  );
}

function InfoGroup({ icon: Icon, title, onEdit, children }: { icon: LucideIcon; title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="group flex flex-col rounded-3xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--accent)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-1.5 text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] focus:opacity-100 group-hover:opacity-100"
          title={`Editar ${title.toLowerCase()}`}
          aria-label={`Editar ${title.toLowerCase()}`}
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  const empty = /não informad|não cadastrad|isento ou não/i.test(value);
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-[var(--text-muted)]">{label}</p>
      <p
        className={cx(
          'mt-0.5 break-words text-[14px] leading-snug',
          strong ? 'font-semibold' : '',
          mono ? 'tabular-nums' : '',
          empty ? 'text-[var(--text-muted)]' : 'text-[var(--text-heading)]',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function InfoLine({ icon: Icon, value }: { icon: LucideIcon; value: string }) {
  const empty = /não informad/i.test(value);
  return (
    <p className={cx('flex items-center gap-2 text-[14px]', empty ? 'text-[var(--text-muted)]' : 'text-[var(--text-heading)]')}>
      <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
      <span className="truncate">{value}</span>
    </p>
  );
}