import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../hooks/useAuth';
import {
  getGestorKpis,
  getActiveOrganizationId,
  getActiveOrganizationDetails,
  getGestorComunicados,
  createAnnouncement,
} from '../lib/gestor/queries';
import { CountUp } from './landing/effects';
import {
  Alert,
  Badge,
  BrandHero,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Page,
  PageSkeleton,
  StatCard,
  inputCls,
  EASE,
} from './ui/kit';
import { Bell, BookOpen, Building2, CalendarDays, GraduationCap, Inbox, Megaphone, RefreshCw, Send, Users } from 'lucide-react';

interface GestorKpis {
  totalAlunos: number;
  totalProfessores: number;
  totalTurmas: number;
  totalResponsaveis: number;
  totalDisciplinas: number;
  aulasAtivas: number;
  comunicados: number;
}

interface OrganizationDetails {
  id: string;
  legal_name?: string;
  trade_name?: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  target?: string;
  published_at: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function GestorDashboard() {
  const { currentUser } = usePlatform();
  const { organizationId: authOrgId, user: authUser } = useAuth();

  const [kpis, setKpis] = useState<GestorKpis | null>(null);
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const userId: string | undefined = currentUser?.id || authUser?.id;

  /** Descobre a escola do usuário uma vez e reaproveita */
  const resolveOrgId = useCallback(async () => {
    let id: string | null | undefined = authOrgId || currentUser?.organizationId || currentUser?.organization_id;
    if (!id && userId) id = await getActiveOrganizationId(userId);
    return id || null;
  }, [authOrgId, currentUser?.organizationId, currentUser?.organization_id, userId]);

  const loadData = useCallback(
    async (manual = false) => {
      if (manual) setIsRefreshing(true);
      else setLoading(true);
      setErrorMessage(null);

      try {
        const id = await resolveOrgId();
        setOrgId(id);
        if (!id) {
          setErrorMessage('Ainda não encontramos uma escola ligada à sua conta. Termine o cadastro da escola ou fale com o suporte.');
          return;
        }
        const [kpisData, orgData, announcementsData] = await Promise.all([
          getGestorKpis(id),
          getActiveOrganizationDetails(id),
          getGestorComunicados(id),
        ]);
        setKpis(kpisData);
        setOrgDetails(orgData);
        setAnnouncements(announcementsData || []);
      } catch (err) {
        console.error('[GestorDashboard]', err);
        setErrorMessage('Não conseguimos carregar os indicadores agora. Tente atualizar em instantes.');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [resolveOrgId],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!newTitle.trim() || !newBody.trim()) return setFormError('Preencha o título e a mensagem.');

    const id = orgId || (await resolveOrgId());
    if (!id || !userId) return setFormError('Não identificamos sua escola. Atualize a página e tente de novo.');

    setIsSubmitting(true);
    try {
      await createAnnouncement(id, userId, newTitle.trim(), newBody.trim());
      setNewTitle('');
      setNewBody('');
      setSuccessMsg('Comunicado publicado.');
      await loadData(true);
    } catch (err) {
      console.error('[GestorDashboard] comunicado', err);
      setFormError('Não foi possível publicar agora. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  const orgLabel = orgDetails?.trade_name || orgDetails?.legal_name || 'Sua escola';
  const firstName = (currentUser?.name || '').split(/\s+/)[0];

  return (
    <Page>
      {/* Faixa da escola */}
      <BrandHero>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--sidebar-muted)' }}>
              <Building2 className="h-4 w-4" />
              {orgLabel}
            </p>
            <h1 className="mt-3 font-serif text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[38px]">
              {firstName ? `Olá, ${firstName}.` : 'Painel da gestão'}
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed" style={{ color: 'var(--sidebar-muted)' }}>
              Um resumo da escola hoje: alunos, professores, turmas e os comunicados que saíram para a comunidade.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => document.getElementById('announcement-title')?.focus()}
              className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold"
              style={{ background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-fg)' }}
            >
              <Megaphone className="h-4 w-4" />
              Novo comunicado
            </button>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold disabled:opacity-60"
              style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg-hover)', color: 'var(--sidebar-fg)' }}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </BrandHero>

      {errorMessage && <Alert tone="warning">{errorMessage}</Alert>}

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Alunos ativos" value={<CountUp to={kpis?.totalAlunos ?? 0} />} hint="Matrículas em andamento" icon={Users} />
        <StatCard index={1} label="Professores" value={<CountUp to={kpis?.totalProfessores ?? 0} />} hint="Corpo docente ligado à escola" icon={GraduationCap} tone="success" />
        <StatCard index={2} label="Turmas" value={<CountUp to={kpis?.totalTurmas ?? 0} />} hint={`${kpis?.totalDisciplinas ?? 0} disciplinas`} icon={BookOpen} tone="neutral" />
        <StatCard index={3} label="Comunicados" value={<CountUp to={kpis?.comunicados ?? 0} />} hint={`${kpis?.totalResponsaveis ?? 0} responsáveis cadastrados`} icon={Bell} tone="warning" />
      </div>

      {/* Comunicação */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader icon={Megaphone} title="Novo comunicado" subtitle="Vai para professores, equipe e famílias." />
          <form onSubmit={handleCreateAnnouncement} className="space-y-4" noValidate>
            <AnimatePresence>
              {(formError || successMsg) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Alert tone={formError ? 'danger' : 'success'}>{formError || successMsg}</Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <Field label="Título" required>
              {() => (
                <input
                  id="announcement-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={inputCls}
                  placeholder="Ex.: Reunião de pais do 3º bimestre"
                  maxLength={120}
                />
              )}
            </Field>
            <Field label="Mensagem" required hint={`${newBody.length}/1000`}>
              {(id) => (
                <textarea
                  id={id}
                  rows={6}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className={`${inputCls} resize-none`}
                  placeholder="Data, horário, local e o que as famílias precisam saber."
                  maxLength={1000}
                />
              )}
            </Field>
            <Button type="submit" icon={Send} loading={isSubmitting} className="w-full">
              {isSubmitting ? 'Publicando…' : 'Publicar comunicado'}
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col lg:col-span-3">
          <CardHeader
            icon={Bell}
            title="Mural de comunicados"
            subtitle="Os mais recentes primeiro."
            action={<Badge tone="accent">{announcements.length}</Badge>}
          />
          {announcements.length === 0 ? (
            <EmptyState icon={Inbox} title="Nenhum comunicado ainda" text="Publique o primeiro aviso para a comunidade da escola usando o formulário ao lado." />
          ) : (
            <ol className="-mr-2 max-h-[460px] space-y-3 overflow-y-auto pr-2">
              {announcements.map((ann, i) => (
                <motion.li
                  key={ann.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.04, ease: EASE }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-app)] p-4 transition-colors hover:border-[var(--accent)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(ann.published_at)}
                    </Badge>
                    {ann.target && <Badge>Para: {ann.target}</Badge>}
                  </div>
                  <h3 className="mt-2.5 text-[15px] font-semibold text-[var(--text-heading)]">{ann.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text-body)]">{ann.body}</p>
                </motion.li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </Page>
  );
}