import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { RealtimeService } from '../../services/RealtimeService';
import { sanitizeHtml } from '../../utils/sanitize';
import {
  fetchOrganizationAnnouncements,
  fetchCommunicationAudience,
  publishOrganizationAnnouncement,
  updateOrganizationAnnouncement,
  deleteOrganizationAnnouncement,
  purgeExpiredCommunications,
  AnnouncementItem,
  AudienceClass,
  AudienceStudent,
  AudienceGuardian,
} from '../../services/communicationRpcService';
import {
  Building,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  GraduationCap,
  Layers,
  MessageSquare,
  PenTool,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Tag,
  Trash2,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  Skeleton,
  TableShell,
  Toast,
  Toggle,
  cx,
  inputCls,
  tdCls,
  thCls,
  EASE,
} from '../ui/kit';

interface AdminComunicacaoProps {
  organizationId?: string;
  onOpenEditor?: () => void;
}

type ItemStatus = 'published' | 'scheduled' | 'draft' | 'expired';
type TargetMode = 'all' | 'family' | 'classes' | 'students' | 'guardians' | 'staff';
type Tone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger';

const STATUS_META: Record<ItemStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  published: { label: 'Publicado', tone: 'success', icon: CheckCircle2 },
  scheduled: { label: 'Agendado', tone: 'warning', icon: Clock },
  draft: { label: 'Rascunho', tone: 'neutral', icon: Tag },
  expired: { label: 'Expirado', tone: 'danger', icon: Clock },
};

/** Nome amigável para o público gravado no banco ("all", "classes"...) */
function targetLabel(raw?: string | null) {
  const t = (raw || 'all').toLowerCase();
  if (t === 'all' || t === 'todos') return 'Toda a escola';
  if (t === 'family' || t === 'all_families') return 'Famílias';
  if (t.includes('class') || t.includes('turma')) return 'Turmas';
  if (t.includes('student') || t.includes('aluno')) return 'Estudantes';
  if (t.includes('guardian')) return 'Responsáveis';
  if (t.includes('teacher') || t.includes('prof')) return 'Professores';
  if (t.includes('staff') || t.includes('func') || t.includes('gestao')) return 'Equipe';
  return raw || 'Toda a escola';
}

const TARGET_MODES: { id: TargetMode; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'Toda a escola', icon: Building },
  { id: 'family', label: 'Todas as famílias', icon: Users },
  { id: 'classes', label: 'Turmas', icon: GraduationCap },
  { id: 'students', label: 'Estudantes', icon: User },
  { id: 'guardians', label: 'Responsáveis', icon: Users },
  { id: 'staff', label: 'Equipe e professores', icon: ShieldCheck },
];

const PUBLISH_ACTIONS: { id: 'publish' | 'schedule' | 'draft'; label: string; desc: string }[] = [
  { id: 'publish', label: 'Publicar agora', desc: 'Aparece na hora para quem recebe' },
  { id: 'schedule', label: 'Agendar', desc: 'Sai na data programada' },
  { id: 'draft', label: 'Rascunho', desc: 'Fica salvo, ninguém vê' },
];

export function AdminComunicacao({ organizationId, onOpenEditor }: AdminComunicacaoProps) {
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [canManage, setCanManage] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);
  const [purging, setPurging] = useState<boolean>(false);
  const [confirmPurge, setConfirmPurge] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Janelas
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<AnnouncementItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Formulário
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formCategory, setFormCategory] = useState('Geral');
  const [formTargetMode, setFormTargetMode] = useState<TargetMode>('all');
  const [formSelectedClasses, setFormSelectedClasses] = useState<string[]>([]);
  const [formSelectedStudents, setFormSelectedStudents] = useState<string[]>([]);
  const [formSelectedGuardians, setFormSelectedGuardians] = useState<string[]>([]);
  const [formRequiresConfirmation, setFormRequiresConfirmation] = useState(false);
  const [formRequiresSignature, setFormRequiresSignature] = useState(false);
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formPublishAction, setFormPublishAction] = useState<'publish' | 'schedule' | 'draft'>('publish');

  // Público real
  const [audienceClasses, setAudienceClasses] = useState<AudienceClass[]>([]);
  const [audienceStudents, setAudienceStudents] = useState<AudienceStudent[]>([]);
  const [, setAudienceGuardians] = useState<AudienceGuardian[]>([]);
  const [searchStudentTerm, setSearchStudentTerm] = useState('');

  const showToast = (message: string, tone: 'success' | 'danger' = 'success') => setToast({ message, tone });

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const loadAnnouncements = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchOrganizationAnnouncements(organizationId);
      if (res.error) setErrorMessage(res.error);
      if (res.data) {
        setItems(res.data.items || []);
        setTotal(res.data.total ?? res.data.items?.length ?? 0);
        setCanManage(res.data.can_manage ?? true);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch (err: any) {
      console.error('[AdminComunicacao] Exception loading announcements:', err);
      setErrorMessage(err?.message || 'Não foi possível carregar os comunicados.');
    } finally {
      setLoading(false);
    }
  };

  const loadAudience = async () => {
    try {
      const res = await fetchCommunicationAudience(organizationId);
      if (res.data) {
        setAudienceClasses(res.data.classes || []);
        setAudienceStudents(res.data.students || []);
        setAudienceGuardians(res.data.guardians || []);
      }
    } catch (err) {
      console.warn('[AdminComunicacao] Audience load error:', err);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    loadAudience();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  // Atualização em tempo real
  useEffect(() => {
    const realtimeService = RealtimeService.getInstance();
    const filter = organizationId ? `organization_id=eq.${organizationId}` : undefined;

    const unsubComms = realtimeService.subscribe(`admin_comms_${organizationId || 'global'}`, { table: 'communications', filter }, () => loadAnnouncements());
    const unsubRecipients = realtimeService.subscribe(`admin_recipients_${organizationId || 'global'}`, { table: 'communication_recipients', filter }, () =>
      loadAnnouncements(),
    );

    const handleLocalUpdate = () => loadAnnouncements();
    window.addEventListener('classium_communications_updated', handleLocalUpdate);

    return () => {
      unsubComms();
      unsubRecipients();
      window.removeEventListener('classium_communications_updated', handleLocalUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const handleRunPurge = async () => {
    setPurging(true);
    try {
      const res = await purgeExpiredCommunications(organizationId);
      if (res.success) {
        showToast(`${res.purged_count ?? 0} comunicado(s) com mais de 30 dias foram apagados.`);
        setConfirmPurge(false);
        loadAnnouncements();
      } else {
        setErrorMessage(res.error || 'Não foi possível apagar os comunicados antigos.');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Não foi possível apagar os comunicados antigos.');
    } finally {
      setPurging(false);
    }
  };

  const getItemStatus = (item: AnnouncementItem): ItemStatus => {
    if (item.status) {
      const lower = item.status.toLowerCase();
      if (['published', 'scheduled', 'draft', 'expired'].includes(lower)) return lower as ItemStatus;
    }
    const now = new Date();
    if (item.expires_at && new Date(item.expires_at) < now) return 'expired';
    if (item.published_at) return new Date(item.published_at) > now ? 'scheduled' : 'published';
    return 'draft';
  };

  const getClassName = (item: AnnouncementItem): string => {
    if (item.class?.name) return item.class.name;
    if (item.class_name) return item.class_name;
    if (item.target_class) return item.target_class;
    return '—';
  };

  const getAuthorDisplay = (item: AnnouncementItem): { name: string; email: string } => {
    const name = item.sender_name || item.author_name || item.author?.name || '';
    const email = item.author_email || item.author?.email || '';
    if (name && email) return { name, email };
    if (name) return { name, email: '' };
    if (email) return { name: email.split('@')[0], email };
    return { name: 'Gestão escolar', email: '' };
  };

  const formatDatePtBR = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const resetForm = () => {
    setFormTitle('');
    setFormBody('');
    setFormCategory('Geral');
    setFormTargetMode('all');
    setFormSelectedClasses([]);
    setFormSelectedStudents([]);
    setFormSelectedGuardians([]);
    setFormRequiresConfirmation(false);
    setFormRequiresSignature(false);
    setFormExpiresAt('');
    setFormPublishAction('publish');
    setSearchStudentTerm('');
    setFormError(null);
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (item: AnnouncementItem) => {
    resetForm();
    setEditingItem(item);
    setFormTitle(item.title);
    setFormBody(item.content || item.body || '');
    setFormCategory(item.category || 'Geral');
    const target = (item.target_type || item.target || 'all').toLowerCase();
    setFormTargetMode((['all', 'family', 'classes', 'students', 'guardians', 'staff'].includes(target) ? target : 'all') as TargetMode);
    setFormSelectedClasses(item.target_ids || []);
    setFormRequiresConfirmation(item.requires_confirmation || false);
    setFormRequiresSignature(item.requires_signature || false);
    setFormExpiresAt(item.expires_at ? item.expires_at.slice(0, 16) : '');
    setFormPublishAction(item.status === 'draft' ? 'draft' : item.status === 'scheduled' ? 'schedule' : 'publish');
    setShowCreateModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formBody.trim()) return setFormError('Preencha o título e o texto do comunicado.');
    if (formTargetMode === 'classes' && formSelectedClasses.length === 0) return setFormError('Escolha pelo menos uma turma.');
    if (formTargetMode === 'students' && formSelectedStudents.length === 0) return setFormError('Escolha pelo menos um estudante.');
    setFormError(null);

    setIsSubmitting(true);
    try {
      if (editingItem) {
        const res = await updateOrganizationAnnouncement(
          editingItem.id,
          {
            title: formTitle.trim(),
            content: formBody.trim(),
            body: formBody.trim(),
            category: formCategory,
            target_type: formTargetMode,
            requires_signature: formRequiresSignature,
            requires_confirmation: formRequiresConfirmation,
            status: formPublishAction === 'draft' ? 'draft' : formPublishAction === 'schedule' ? 'scheduled' : 'published',
            expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
          },
          organizationId,
        );
        if (!res.success) throw new Error(res.error || 'Não foi possível salvar.');
        showToast('Comunicado atualizado.');
      } else {
        const res = await publishOrganizationAnnouncement({
          p_title: formTitle.trim(),
          p_body: formBody.trim(),
          p_category: formCategory,
          p_mode: formTargetMode,
          p_class_ids: formTargetMode === 'classes' ? formSelectedClasses : null,
          p_student_ids: formTargetMode === 'students' ? formSelectedStudents : null,
          p_guardian_ids: formTargetMode === 'guardians' ? formSelectedGuardians : null,
          p_publish_now: formPublishAction === 'publish',
          p_status: formPublishAction === 'draft' ? 'draft' : formPublishAction === 'schedule' ? 'scheduled' : 'published',
          p_requires_signature: formRequiresSignature,
          p_requires_confirmation: formRequiresConfirmation,
          p_expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
          organization_id: organizationId,
        });
        if (res.error || !res.data?.ok) throw new Error(res.error || res.data?.message || 'Não foi possível gravar.');
        const n = res.data.recipients_count || 1;
        showToast(formPublishAction === 'draft' ? 'Rascunho salvo.' : `Comunicado enviado para ${n} ${n === 1 ? 'pessoa' : 'pessoas'}.`);
      }
      setShowCreateModal(false);
      await loadAnnouncements();
    } catch (err: any) {
      console.error('[AdminComunicacao] Form submit error:', err);
      setFormError(err?.message || 'Não foi possível salvar. Tente de novo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);
    try {
      const res = await deleteOrganizationAnnouncement(deletingItem.id, organizationId);
      if (!res.success) throw new Error(res.error || 'Não foi possível excluir.');
      showToast('Comunicado excluído.');
      setDeletingItem(null);
      await loadAnnouncements();
    } catch (err: any) {
      console.error('[AdminComunicacao] Delete error:', err);
      showToast(err?.message || 'Não foi possível excluir.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------------- Lista filtrada ---------------- */

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (searchTerm.trim()) {
          const lower = searchTerm.toLowerCase();
          const author = getAuthorDisplay(item);
          const hit =
            (item.title || '').toLowerCase().includes(lower) ||
            (item.content || item.body || '').toLowerCase().includes(lower) ||
            author.name.toLowerCase().includes(lower) ||
            author.email.toLowerCase().includes(lower);
          if (!hit) return false;
        }
        if (statusFilter !== 'all' && getItemStatus(item) !== statusFilter) return false;
        if (targetFilter !== 'all') {
          const t = (item.target_type || item.target || 'all').toLowerCase();
          if (targetFilter === 'everyone' && t !== 'all' && t !== 'todos') return false;
          if (targetFilter === 'family' && t !== 'family' && t !== 'all_families') return false;
          if (targetFilter === 'classes' && !t.includes('class') && !t.includes('turma')) return false;
          if (targetFilter === 'students' && !t.includes('student') && !t.includes('aluno')) return false;
          if (targetFilter === 'staff' && !t.includes('staff') && !t.includes('prof') && !t.includes('teacher')) return false;
        }
        if (classFilter !== 'all' && getClassName(item) !== classFilter) return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, searchTerm, statusFilter, targetFilter, classFilter],
  );

  const uniqueClasses = useMemo(() => Array.from(new Set(items.map(getClassName).filter((c) => c && c !== '—'))), [items]);

  const counts = useMemo(() => {
    const t = (i: AnnouncementItem) => (i.target_type || i.target || '').toLowerCase();
    return {
      total: items.length,
      todos: items.filter((i) => ['all', 'todos', 'all_families', 'family'].includes(t(i))).length,
      turmas: items.filter((i) => t(i).includes('class') || t(i).includes('turma')).length,
      alunos: items.filter((i) => t(i).includes('student') || t(i).includes('aluno')).length,
      professores: items.filter((i) => t(i).includes('teacher') || t(i).includes('prof')).length,
      equipe: items.filter((i) => t(i).includes('staff') || t(i).includes('func') || t(i).includes('gestao')).length,
    };
  }, [items]);

  const hasFilters = searchTerm || statusFilter !== 'all' || targetFilter !== 'all' || classFilter !== 'all';

  const studentOptions = useMemo(() => {
    const q = searchStudentTerm.trim().toLowerCase();
    const list = q ? audienceStudents.filter((s) => (s.name || '').toLowerCase().includes(q)) : audienceStudents;
    return list.slice(0, 200);
  }, [audienceStudents, searchStudentTerm]);

  /* ---------------- Tela ---------------- */

  return (
    <div className="space-y-6 text-left">
      {/* Topo */}
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--accent-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--accent-soft) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 55% 90% at 100% 0%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 55% 90% at 100% 0%, black, transparent)',
          }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
              <MessageSquare className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-serif text-[24px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)]">
                Mural de comunicados <span className="ml-1 align-middle text-[14px] font-sans font-medium text-[var(--text-muted)]">{total}</span>
              </h2>
              <p className="mt-1 max-w-xl text-[14px] text-[var(--text-muted)]">Tudo o que a escola publicou. Comunicados com mais de 30 dias são apagados automaticamente.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Button icon={Plus} onClick={handleOpenCreateModal}>
                Novo comunicado
              </Button>
            )}
            {onOpenEditor && (
              <Button variant="secondary" icon={PenTool} onClick={onOpenEditor}>
                Editor de texto
              </Button>
            )}
            {canManage && (
              <Button variant="ghost" icon={Trash2} onClick={() => setConfirmPurge(true)}>
                Apagar antigos
              </Button>
            )}
            <button
              type="button"
              onClick={loadAnnouncements}
              aria-label="Atualizar"
              title="Atualizar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </section>

      {/* Números */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total', value: counts.total, icon: Layers },
          { label: 'Para todos', value: counts.todos, icon: Users },
          { label: 'Para turmas', value: counts.turmas, icon: GraduationCap },
          { label: 'Para estudantes', value: counts.alunos, icon: User },
          { label: 'Para professores', value: counts.professores, icon: GraduationCap },
          { label: 'Para a equipe', value: counts.equipe, icon: Building },
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: EASE }}
              className="bg-[var(--bg-card)] px-5 py-4"
            >
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-muted)]">
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </p>
              <p className="mt-1 font-serif text-[28px] font-semibold leading-none tabular-nums text-[var(--text-heading)]">{m.value}</p>
            </motion.div>
          );
        })}
      </div>

      {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}

      {/* Lista */}
      <Card padded={false} className="overflow-hidden">
        <div className="grid gap-3 border-b border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              aria-label="Buscar comunicado"
              placeholder="Buscar por título, texto ou autor"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cx(inputCls, 'pl-10')}
            />
          </div>
          <select aria-label="Situação" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="all">Todas as situações</option>
            <option value="published">Publicados</option>
            <option value="scheduled">Agendados</option>
            <option value="draft">Rascunhos</option>
            <option value="expired">Expirados</option>
          </select>
          <select aria-label="Público" value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)} className={inputCls}>
            <option value="all">Todos os públicos</option>
            <option value="everyone">Toda a escola</option>
            <option value="family">Famílias</option>
            <option value="classes">Turmas</option>
            <option value="students">Estudantes</option>
            <option value="staff">Equipe e professores</option>
          </select>
          <select aria-label="Turma" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={inputCls}>
            <option value="all">Todas as turmas</option>
            {uniqueClasses.map((cls, idx) => (
              <option key={`cls-${cls}-${idx}`} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {loading && items.length === 0 ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={MessageSquare}
              title={hasFilters ? 'Nenhum comunicado com esses filtros' : 'Nenhum comunicado publicado ainda'}
              text={hasFilters ? 'Tente outra busca ou limpe os filtros.' : 'O que você publicar aparece aqui e no Portal da Família.'}
              action={
                hasFilters ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setTargetFilter('all');
                      setClassFilter('all');
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : canManage ? (
                  <Button icon={Plus} onClick={handleOpenCreateModal}>
                    Escrever o primeiro
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <TableShell minWidth={920}>
            <thead className="bg-[var(--bg-card-alt)]">
              <tr>
                <th className={thCls}>Comunicado</th>
                <th className={thCls}>Para</th>
                <th className={thCls}>Autor</th>
                <th className={thCls}>Data</th>
                <th className={cx(thCls, 'text-center')}>Leituras</th>
                <th className={thCls}>Situação</th>
                <th className={cx(thCls, 'text-right')}>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredItems.map((item, idx) => {
                const status = getItemStatus(item);
                const st = STATUS_META[status];
                const StIcon = st.icon;
                const cls = getClassName(item);
                const author = getAuthorDisplay(item);
                return (
                  <tr key={item.id || `row-${idx}`} className="group cursor-pointer transition-colors hover:bg-[var(--bg-card-alt)]" onClick={() => setSelectedAnnouncement(item)}>
                    <td className={cx(tdCls, 'max-w-[340px]')}>
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-[var(--text-heading)] transition-colors group-hover:text-[var(--accent)]">{item.title}</p>
                        {item.category && item.category !== 'Geral' && <Badge>{item.category}</Badge>}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[13px] text-[var(--text-muted)]">{stripHtml(item.content || item.body || '')}</p>
                    </td>
                    <td className={tdCls}>
                      <p className="font-medium text-[var(--text-heading)]">{targetLabel(item.target_type || item.target)}</p>
                      {cls !== '—' && <p className="text-[12px] text-[var(--text-muted)]">{cls}</p>}
                    </td>
                    <td className={cx(tdCls, 'whitespace-nowrap')}>
                      <p className="text-[var(--text-heading)]">{author.name}</p>
                      {author.email && <p className="text-[12px] text-[var(--text-muted)]">{author.email}</p>}
                    </td>
                    <td className={cx(tdCls, 'whitespace-nowrap text-[13px] tabular-nums')}>{formatDatePtBR(item.published_at || item.created_at)}</td>
                    <td className={cx(tdCls, 'text-center tabular-nums')}>
                      <span className="inline-flex items-center gap-1.5 text-[var(--text-heading)]">
                        <Eye className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        {item.reads_count ?? 0}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <Badge tone={st.tone} className="whitespace-nowrap">
                        <StIcon className="h-3.5 w-3.5" />
                        {st.label}
                      </Badge>
                    </td>
                    <td className={cx(tdCls, 'whitespace-nowrap px-3 text-right')}>
                      <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <IconAction icon={Eye} label="Ver" onClick={() => setSelectedAnnouncement(item)} />
                        {canManage && <IconAction icon={Edit3} label="Editar" onClick={() => handleOpenEditModal(item)} />}
                        {canManage && <IconAction icon={Trash2} label="Excluir" danger onClick={() => setDeletingItem(item)} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </Card>

      {/* Novo / editar */}
      <Modal
        open={showCreateModal}
        onClose={() => !isSubmitting && setShowCreateModal(false)}
        size="lg"
        title={editingItem ? 'Editar comunicado' : 'Novo comunicado'}
        subtitle="Escreva, escolha quem recebe e publique"
        footer={
          <>
            <Button variant="secondary" disabled={isSubmitting} onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="announcement-form" icon={Send} loading={isSubmitting}>
              {editingItem ? 'Salvar alterações' : formPublishAction === 'draft' ? 'Salvar rascunho' : formPublishAction === 'schedule' ? 'Agendar' : 'Publicar'}
            </Button>
          </>
        }
      >
        <form id="announcement-form" onSubmit={handleSubmitForm} className="space-y-6">
          {formError && <Alert tone="danger">{formError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Título" required>
                {(id) => (
                  <input id={id} required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex.: Reunião de pais do 3º bimestre" className={inputCls} />
                )}
              </Field>
            </div>
            <Field label="Categoria">
              {(id) => (
                <select id={id} value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className={inputCls}>
                  <option value="Geral">Geral</option>
                  <option value="Pedagógico">Pedagógico</option>
                  <option value="Reunião">Reunião de pais</option>
                  <option value="Disciplinar">Disciplinar</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Eventos">Eventos</option>
                  <option value="Urgente">Urgente</option>
                </select>
              )}
            </Field>
          </div>

          <Field label="Texto" required hint={`${formBody.length} caracteres`}>
            {(id) => (
              <textarea
                id={id}
                required
                rows={7}
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="O que a família vai ler no Portal da Família e no mural…"
                className={cx(inputCls, 'resize-y leading-relaxed')}
              />
            )}
          </Field>

          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-[var(--text-heading)]">Quem recebe</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TARGET_MODES.map((mode) => {
                const Icon = mode.icon;
                const active = formTargetMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFormTargetMode(mode.id)}
                    aria-pressed={active}
                    className={cx(
                      'flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-[13px] font-medium transition-all',
                      active ? 'border-[var(--accent)] text-[var(--text-heading)] ring-4 ring-[var(--accent-soft)]' : 'border-[var(--border)] text-[var(--text-body)] hover:border-[var(--accent)]',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }} />
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {formTargetMode === 'classes' && (
              <div className="mt-3 rounded-2xl bg-[var(--bg-card-alt)] p-3">
                <p className="mb-2 text-[12px] text-[var(--text-muted)]">{audienceClasses.length} turmas</p>
                <div className="grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
                  {audienceClasses.map((cls) => (
                    <CheckTile
                      key={cls.id}
                      checked={formSelectedClasses.includes(cls.id)}
                      onChange={(v) => setFormSelectedClasses((prev) => (v ? [...prev, cls.id] : prev.filter((id) => id !== cls.id)))}
                      label={cls.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {formTargetMode === 'students' && (
              <div className="mt-3 rounded-2xl bg-[var(--bg-card-alt)] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[12px] text-[var(--text-muted)]">
                    {formSelectedStudents.length} de {audienceStudents.length} escolhidos
                  </p>
                  <input
                    type="search"
                    aria-label="Filtrar estudantes"
                    placeholder="Filtrar"
                    value={searchStudentTerm}
                    onChange={(e) => setSearchStudentTerm(e.target.value)}
                    className={cx(inputCls, 'h-9 max-w-[200px] py-1.5 text-[13px]')}
                  />
                </div>
                <div className="grid max-h-44 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {studentOptions.map((st) => (
                    <CheckTile
                      key={st.id}
                      checked={formSelectedStudents.includes(st.id)}
                      onChange={(v) => setFormSelectedStudents((prev) => (v ? [...prev, st.id] : prev.filter((id) => id !== st.id)))}
                      label={st.name}
                      hint={st.class_name}
                    />
                  ))}
                </div>
              </div>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-[var(--border)] p-4">
              <p className="text-[13px] font-semibold text-[var(--text-heading)]">O que pedir da família</p>
              <ToggleRow label="Assinatura" hint="O responsável assina pelo app" checked={formRequiresSignature} onChange={setFormRequiresSignature} />
              <ToggleRow label="Confirmação de leitura" hint="Registra quando foi lido" checked={formRequiresConfirmation} onChange={setFormRequiresConfirmation} />
            </div>
            <div className="rounded-2xl border border-[var(--border)] p-4">
              <Field label="Sai do mural em (opcional)" hint="Sem data, sai depois de 30 dias.">
                {(id) => <input id={id} type="datetime-local" value={formExpiresAt} onChange={(e) => setFormExpiresAt(e.target.value)} className={inputCls} />}
              </Field>
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-[var(--text-heading)]">Quando</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {PUBLISH_ACTIONS.map((act) => {
                const active = formPublishAction === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setFormPublishAction(act.id)}
                    aria-pressed={active}
                    className={cx(
                      'rounded-2xl border px-4 py-3 text-left transition-all',
                      active ? 'border-[var(--accent)] ring-4 ring-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--accent)]',
                    )}
                  >
                    <p className="text-[14px] font-semibold text-[var(--text-heading)]">{act.label}</p>
                    <p className="text-[12px] text-[var(--text-muted)]">{act.desc}</p>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </form>
      </Modal>

      {/* Ver */}
      <Modal
        open={Boolean(selectedAnnouncement)}
        onClose={() => setSelectedAnnouncement(null)}
        size="lg"
        title={selectedAnnouncement?.title || ''}
        subtitle={selectedAnnouncement ? `${selectedAnnouncement.category || 'Geral'} · ${formatDatePtBR(selectedAnnouncement.published_at || selectedAnnouncement.created_at)}` : ''}
        footer={
          <>
            {canManage && selectedAnnouncement && (
              <Button
                variant="secondary"
                icon={Edit3}
                onClick={() => {
                  const item = selectedAnnouncement;
                  setSelectedAnnouncement(null);
                  handleOpenEditModal(item);
                }}
              >
                Editar
              </Button>
            )}
            <Button onClick={() => setSelectedAnnouncement(null)}>Fechar</Button>
          </>
        }
      >
        {selectedAnnouncement && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
              {[
                ['Para', targetLabel(selectedAnnouncement.target_type || selectedAnnouncement.target)],
                ['Turma', getClassName(selectedAnnouncement)],
                ['Autor', getAuthorDisplay(selectedAnnouncement).name],
                ['Leituras', String(selectedAnnouncement.reads_count ?? 0)],
              ].map(([l, v]) => (
                <div key={l} className="bg-[var(--bg-card)] px-4 py-3">
                  <p className="text-[12px] text-[var(--text-muted)]">{l}</p>
                  <p className="mt-0.5 truncate text-[14px] font-semibold text-[var(--text-heading)]">{v}</p>
                </div>
              ))}
            </div>

            <div
              className="whitespace-pre-wrap rounded-2xl bg-[var(--bg-card-alt)] p-5 text-[14px] leading-relaxed text-[var(--text-body)]"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedAnnouncement.content || selectedAnnouncement.body || '') }}
            />

            {(selectedAnnouncement.requires_signature || selectedAnnouncement.requires_confirmation) && (
              <div className="flex flex-wrap gap-2">
                {selectedAnnouncement.requires_signature && (
                  <Badge tone="warning">
                    <ShieldCheck className="h-3.5 w-3.5" /> Pede assinatura
                  </Badge>
                )}
                {selectedAnnouncement.requires_confirmation && (
                  <Badge tone="accent">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Pede confirmação de leitura
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Excluir */}
      <Modal
        open={Boolean(deletingItem)}
        onClose={() => !isSubmitting && setDeletingItem(null)}
        size="sm"
        title="Excluir comunicado?"
        footer={
          <>
            <Button variant="secondary" disabled={isSubmitting} onClick={() => setDeletingItem(null)}>
              Cancelar
            </Button>
            <Button variant="danger" icon={Trash2} loading={isSubmitting} onClick={handleDeleteConfirm}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-[var(--text-body)]">
          <strong className="text-[var(--text-heading)]">“{deletingItem?.title}”</strong> sai do mural e do Portal da Família de todos que receberam. Não dá para desfazer.
        </p>
      </Modal>

      {/* Apagar antigos */}
      <Modal
        open={confirmPurge}
        onClose={() => !purging && setConfirmPurge(false)}
        size="sm"
        title="Apagar comunicados antigos?"
        footer={
          <>
            <Button variant="secondary" disabled={purging} onClick={() => setConfirmPurge(false)}>
              Cancelar
            </Button>
            <Button variant="danger" icon={Trash2} loading={purging} onClick={handleRunPurge}>
              Apagar
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-[var(--text-body)]">
          Todos os comunicados com mais de 30 dias serão apagados agora. Isso já acontece sozinho; use só se precisar limpar antes.
        </p>
      </Modal>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Sem texto.';
}

function IconAction({ icon: Icon, label, onClick, danger }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cx(
        'flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors',
        danger ? 'hover:bg-[#FDECEC] hover:text-[#B42318]' : 'hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function CheckTile({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors',
        checked ? 'border-[var(--accent)] bg-[var(--bg-card)] font-semibold text-[var(--text-heading)]' : 'border-transparent bg-[var(--bg-card)] text-[var(--text-body)] hover:border-[var(--border)]',
      )}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
        style={checked ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-fg)' } : { borderColor: 'var(--border)' }}
      >
        {checked && <CheckCircle2 className="h-3 w-3" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{hint}</span>}
    </button>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span>
        <span className="block text-[14px] font-medium text-[var(--text-heading)]">{label}</span>
        <span className="block text-[12px] text-[var(--text-muted)]">{hint}</span>
      </span>
      <Toggle label={label} checked={checked} onChange={onChange} />
    </label>
  );
}