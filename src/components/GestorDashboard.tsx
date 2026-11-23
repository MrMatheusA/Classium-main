import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../hooks/useAuth';
import {
  getGestorKpis,
  getActiveOrganizationId,
  getActiveOrganizationDetails,
} from '../lib/gestor/queries';
import { supabase } from '../lib/supabase';
import { mensagemErro, rpc } from '../services/escolaEscuta/api';
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
import { ArrowRight, Bell, BookOpen, Building2, CalendarDays, GraduationCap, Inbox, Megaphone, RefreshCw, Send, Users } from 'lucide-react';

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

/** Recado do Mural de Recados (mesma tabela do menu Mural de Recados) */
interface AnnouncementItem {
  id: string;
  titulo: string;
  resumo: string | null;
  conteudo: string | null;
  status: string;
  publicado_em: string | null;
  inicio_em: string | null;
  total_destinatarios: number | null;
}

type Publico = 'todos' | 'familias' | 'docentes';
const PUBLICOS: Record<Publico, { label: string; valor: Record<string, string> }> = {
  todos: { label: 'Famílias e professores', valor: { familias: 'todas', docentes: 'todos' } },
  familias: { label: 'Só famílias', valor: { familias: 'todas' } },
  docentes: { label: 'Só professores', valor: { docentes: 'todos' } },
};

async function loadMural(orgId: string): Promise<AnnouncementItem[]> {
  const { data, error } = await supabase
    .from('mural_recados')
    .select('id, titulo, resumo, conteudo, status, publicado_em, inicio_em, total_destinatarios')
    .eq('organization_id', orgId)
    .in('status', ['publicado', 'programado'])
    .order('publicado_em', { ascending: false, nullsFirst: false })
    .limit(20);
  if (error) throw new Error(mensagemErro(error));
  return (data as AnnouncementItem[]) || [];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function GestorDashboard() {
  const { currentUser, setActiveAdminTab } = usePlatform() as any;
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
  const [publico, setPublico] = useState<Publico>('todos');
  /** recado salvo que espera confirmação por ser de grande alcance */
  const [aConfirmar, setAConfirmar] = useState<{ id: string; total: number } | null>(null);
  const [muralError, setMuralError] = useState<string | null>(null);
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
        const [kpisData, orgData, mural] = await Promise.all([
          getGestorKpis(id),
          getActiveOrganizationDetails(id),
          loadMural(id).then(
            (list) => ({ list, error: null as string | null }),
            (err: Error) => ({ list: [] as AnnouncementItem[], error: err.message }),
          ),
        ]);
        setKpis(kpisData);
        setOrgDetails(orgData);
        setAnnouncements(mural.list);
        setMuralError(mural.error);
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

  /** Publica o recado salvo. Para muita gente, o sistema pede confirmação antes. */
  const publicar = async (recadoId: string, confirmado: boolean) => {
    const res = await rpc<any>('mural_publicar', { p_recado: recadoId, p_confirmado: confirmado });
    if (res.error) {
      setFormError(`${res.error} O texto ficou guardado como rascunho no Mural de Recados.`);
      return;
    }
    if (res.data?.precisa_confirmar) {
      setAConfirmar({ id: recadoId, total: res.data.total });
      return;
    }
    setAConfirmar(null);
    setNewTitle('');
    setNewBody('');
    setSuccessMsg(`Comunicado publicado para ${res.data?.total ?? 0} destinatário(s). Ele já aparece no Mural de Recados.`);
    await loadData(true);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    setAConfirmar(null);

    const titulo = newTitle.trim();
    const texto = newBody.trim();
    if (!titulo || !texto) return setFormError('Preencha o título e a mensagem.');

    const id = orgId || (await resolveOrgId());
    if (!id) return setFormError('Não identificamos sua escola. Atualize a página e tente de novo.');

    setIsSubmitting(true);
    try {
      // salva no Mural de Recados (mesma tabela do menu) e depois publica
      const resumo = texto.length > 200 ? `${texto.slice(0, 197).trimEnd()}…` : texto;
      const { data, error } = await supabase
        .from('mural_recados')
        .insert({
          organization_id: id,
          titulo,
          resumo,
          conteudo: texto,
          tipo: 'aviso',
          publico: PUBLICOS[publico].valor,
          fixado: false,
          exige_ciencia: false,
        })
        .select('id')
        .single();
      if (error) throw new Error(mensagemErro(error));
      await publicar((data as { id: string }).id, false);
    } catch (err: any) {
      console.error('[GestorDashboard] comunicado', err);
      setFormError(err?.message || 'Não foi possível publicar o comunicado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmarGrande = async () => {
    if (!aConfirmar) return;
    setIsSubmitting(true);
    try {
      await publicar(aConfirmar.id, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const abrirMural = () => setActiveAdminTab?.('ee-mural');

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
        <StatCard index={3} label="Recados no ar" value={<CountUp to={announcements.length} />} hint={`${kpis?.totalResponsaveis ?? 0} responsáveis cadastrados`} icon={Bell} tone="warning" />
      </div>

      {/* Comunicação */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader icon={Megaphone} title="Novo comunicado" subtitle="Publicado no Mural de Recados, com confirmação de leitura." />
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
            <Field label="Para quem">
              {(id) => (
                <select id={id} value={publico} onChange={(e) => setPublico(e.target.value as Publico)} className={inputCls}>
                  {(Object.keys(PUBLICOS) as Publico[]).map((k) => (
                    <option key={k} value={k}>
                      {PUBLICOS[k].label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            {aConfirmar ? (
              <div className="space-y-3 rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
                <p className="text-[14px] text-[var(--text-heading)]">
                  Este comunicado vai para <strong>{aConfirmar.total}</strong> pessoas. Confira o texto: depois de publicado, todos recebem o aviso.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" icon={Send} loading={isSubmitting} onClick={confirmarGrande}>
                    Sim, publicar para {aConfirmar.total}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setAConfirmar(null)} disabled={isSubmitting}>
                    Revisar texto
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="submit" icon={Send} loading={isSubmitting} className="w-full">
                {isSubmitting ? 'Publicando…' : 'Publicar comunicado'}
              </Button>
            )}
            <p className="text-center text-[12px] text-[var(--text-muted)]">
              Para anexos, imagem, ciência ou agendamento, use o{' '}
              <button type="button" onClick={abrirMural} className="font-semibold text-[var(--accent)] hover:underline">
                Mural de Recados
              </button>
              .
            </p>
          </form>
        </Card>

        <Card className="flex flex-col lg:col-span-3">
          <CardHeader
            icon={Bell}
            title="Últimos recados"
            subtitle="Os mais recentes primeiro."
            action={
              <button type="button" onClick={abrirMural} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--accent)] hover:underline">
                Abrir mural <ArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          />
          {muralError ? (
            <Alert tone="warning">Não foi possível carregar o mural: {muralError}</Alert>
          ) : announcements.length === 0 ? (
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
                      {ann.status === 'programado' ? `Programado · ${formatDate(ann.inicio_em || '')}` : formatDate(ann.publicado_em || '')}
                    </Badge>
                    {!!ann.total_destinatarios && <Badge>{ann.total_destinatarios} destinatário(s)</Badge>}
                  </div>
                  <h3 className="mt-2.5 text-[15px] font-semibold text-[var(--text-heading)]">{ann.titulo}</h3>
                  <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text-body)]">{ann.resumo || ann.conteudo}</p>
                </motion.li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </Page>
  );
}