import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  DoorOpen,
  MessageSquare,
  Phone,
  Radar,
  RefreshCw,
  Scale,
  Search,
  Send,
  Shield,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { CentroDisciplinarClassium } from './CentroDisciplinarEducaPlus';
import { studentsService } from '../../services/students/students.service';
import { supabase } from '../../lib/supabase';
import { Alert, Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, PillNav, Skeleton, Toast, cx, inputCls } from '../ui/kit';
import { ConfirmModal, MetricStrip, ModuleHeader, RoundIconButton, Segmented } from '../ui/ModuleParts';

interface AdminRadarRotinaProps {
  initialSubTab?: 'radar' | 'disciplina';
}

export interface RadarStudent {
  id: string;
  name: string;
  matricula: string;
  cpf: string;
  grade: string;
  serie: string;
  classId: string;
  turno: string;
  sala: string;
  photoUrl: string;
  parentPrincipal: string;
  guardians: Array<{
    name: string;
    relation: string;
    phone: string;
    whatsapp: string;
  }>;
}

type Severity = 'low' | 'medium' | 'high' | 'grave' | 'gravissima';

const OCCURRENCE_TYPES = [
  'Chegou atrasado',
  'Saiu sem autorização',
  'Tentou sair da escola',
  'Uniforme incompleto',
  'Sem uniforme',
  'Sem material escolar',
  'Perturbando aula',
  'Uso inadequado de celular',
  'Uso de fones',
  'Desrespeito ao professor',
  'Desrespeito ao funcionário',
  'Discussão verbal',
  'Briga',
  'Agressão física',
  'Bullying',
  'Cyberbullying',
  'Vandalismo',
  'Dano ao patrimônio',
  'Objeto proibido',
  'Objeto perdido',
  'Fuga da sala',
  'Matando aula',
  'Dormindo em sala',
  'Recusa em realizar atividade',
  'Uso de linguagem imprópria',
  'Desobediência',
  'Risco de acidente',
  'Acidente leve',
  'Acidente moderado',
  'Acidente grave',
  'Passou mal',
  'Febre',
  'Dor',
  'Vômito',
  'Queda',
  'Corte',
  'Machucado',
  'Necessitou atendimento médico',
  'Encaminhado para enfermaria',
  'Encaminhado para UBS',
  'Encaminhado ao responsável',
  'Outro',
];

const MOVEMENT_TYPES = [
  'Chegou atrasado',
  'Saiu mais cedo',
  'Matando aula',
  'Saiu para atendimento',
  'Saiu para consulta',
  'Retornou',
  'Ausência justificada',
  'Ausência não justificada',
  'Outro',
];

const SEVERITIES: { id: Severity; label: string; bg: string; fg: string }[] = [
  { id: 'low', label: 'Leve', bg: '#E7F6EE', fg: '#127A4B' },
  { id: 'medium', label: 'Moderada', bg: '#FEF4E6', fg: '#A15C07' },
  { id: 'grave', label: 'Grave', bg: '#FDEEE4', fg: '#B93815' },
  { id: 'gravissima', label: 'Gravíssima', bg: '#FDECEC', fg: '#B42318' },
];

function gravityInfo(raw?: string): { label: string; tone: 'success' | 'warning' | 'danger' } {
  const g = (raw || 'low').toLowerCase();
  if (g === 'gravissima') return { label: 'Gravíssima', tone: 'danger' };
  if (g === 'high' || g === 'grave') return { label: 'Grave', tone: 'danger' };
  if (g === 'medium' || g === 'moderada') return { label: 'Moderada', tone: 'warning' };
  return { label: 'Leve', tone: 'success' };
}

const isResolvedOcc = (occ: any) => occ.status === 'resolvida' || occ.status === 'concluida' || occ.confirmed_by_family || occ.signed_by_parent || occ.signedByParent;
/** Data local (AAAA-MM-DD) — toISOString usaria UTC e viraria o dia à noite */
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const occDate = (occ: any): string => occ.date || (occ.created_at ? String(occ.created_at).split('T')[0] : '');
const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};
const toWhatsapp = (phone?: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  return digits.length <= 11 ? `55${digits}` : digits;
};

export function AdminRadarRotina({ initialSubTab = 'radar' }: AdminRadarRotinaProps) {
  const { schoolOccurrences, addOccurrence, addGateMovementLog, user } = usePlatform();
  const [activeSubTab, setActiveSubTab] = useState<'radar' | 'disciplina'>(initialSubTab);

  const [realStudents, setRealStudents] = useState<RadarStudent[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  const [metrics, setMetrics] = useState<{ totalOccurrences?: number; occurrencesToday?: number; resolvedOccurrences?: number; convivenceIndex?: string } | null>(null);

  const [dbOccurrences, setDbOccurrences] = useState<any[]>([]);
  const [isLoadingOccurrences, setIsLoadingOccurrences] = useState(true);

  const [occStatusFilter, setOccStatusFilter] = useState<'todos' | 'pendente' | 'resolvida'>('todos');
  const [occGravityFilter, setOccGravityFilter] = useState<'todas' | 'leve' | 'medium' | 'grave'>('todas');
  const [occSearchTerm, setOccSearchTerm] = useState<string>('');

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'success') => setToast({ text, type });

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/radar/metrics');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.metrics) setMetrics(json.metrics);
      }
    } catch (err) {
      console.warn('[RadarRotina] Erro ao carregar métricas:', err);
    }
  }, []);

  const fetchOccurrences = useCallback(async () => {
    try {
      setIsLoadingOccurrences(true);
      const { data, error } = await supabase.from('occurrences').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setDbOccurrences(data);
      } else {
        const res = await fetch('/api/radar/occurrences');
        if (res.ok) {
          const json = await res.json();
          if (json.items) setDbOccurrences(json.items);
        }
      }
    } catch (err) {
      console.warn('[RadarRotina] Erro ao carregar ocorrências:', err);
    } finally {
      setIsLoadingOccurrences(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setIsLoadingStudents(true);
      const res = await studentsService.getStudents();
      if (res && res.items) {
        const mapped: RadarStudent[] = res.items.map((s: any, idx: number) => {
          const guardians = Array.isArray(s.guardians)
            ? s.guardians.filter(Boolean).map((g: any) => ({
                name: g?.name || 'Responsável',
                relation: g?.relationship || 'Responsável',
                phone: g?.phone || '',
                whatsapp: toWhatsapp(g?.phone),
              }))
            : s.responsible_name
              ? [{ name: s.responsible_name, relation: 'Responsável', phone: s.emergency_contact || '', whatsapp: toWhatsapp(s.emergency_contact) }]
              : [];
          const main = guardians[0];
          return {
            id: s.id || `st-${idx + 1}`,
            name: s.name || s.full_name || 'Estudante sem nome',
            matricula: s.registration_code || s.code || '',
            cpf: s.cpf || s.document_number || '',
            grade: s.grade || s.class_name || '',
            serie: s.grade ? String(s.grade).split(' ')[0] : '',
            classId: s.class_id || '',
            turno: s.shift || '',
            sala: s.room || '',
            photoUrl: s.photo_url || s.avatar_url || '',
            parentPrincipal: main ? `${main.name} (${main.relation})` : '',
            guardians,
          };
        });
        setRealStudents(mapped);
      }
    } catch (err) {
      console.warn('[RadarRotina] Erro ao carregar estudantes:', err);
    } finally {
      setIsLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchMetrics();
    fetchOccurrences();

    const channel = supabase
      .channel('radar_rotina_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchStudents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'occurrences' }, () => {
        fetchOccurrences();
        fetchMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStudents, fetchMetrics, fetchOccurrences]);

  const allOccurrences: any[] = dbOccurrences.length > 0 ? dbOccurrences : schoolOccurrences || [];

  /* ---------------- Registrar ocorrência ---------------- */

  const [selectedStudent, setSelectedStudent] = useState<RadarStudent | null>(null);
  const [infraction, setInfraction] = useState('Uso inadequado de celular');
  const [relato, setRelato] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [reporter, setReporter] = useState<string>(user?.name || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [occError, setOccError] = useState<string | null>(null);

  const handleRegisterOccurrence = async () => {
    if (!selectedStudent) return setOccError('Escolha o estudante.');
    if (!reporter.trim()) return setOccError('Informe quem está registrando.');
    setOccError(null);
    setIsProcessing(true);

    const now = new Date();
    const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const description = relato.trim() || `Registrado por ${reporter}.`;
    const mappedSev = severity === 'gravissima' || severity === 'grave' ? 'high' : severity === 'medium' ? 'medium' : 'low';

    try {
      const res = await fetch('/api/radar/occurrences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          student_name: selectedStudent.name,
          grade: selectedStudent.grade,
          title: infraction,
          reason: infraction,
          occurrence_type: 'disciplinar',
          gravity: severity,
          description,
          reporter_name: reporter,
          date: todayISO(),
          time: formattedTime,
          status: 'pendente',
        }),
      });
      if (!res.ok) throw new Error('Não foi possível gravar a ocorrência.');

      addOccurrence({
        type: 'negative',
        title: infraction,
        description,
        date: todayISO(),
        time: formattedTime,
        reporter,
        applicationResponsable: reporter,
        severity: mappedSev,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        grade: selectedStudent.grade,
        status: 'nova',
        confirmedByFamily: false,
      });

      showToast(`Ocorrência registrada para ${selectedStudent.name}.`);
      setRelato('');
      fetchOccurrences();
      fetchMetrics();
    } catch (err: any) {
      setOccError(err?.message || 'Não foi possível gravar a ocorrência. Tente de novo.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ---------------- Entrada e saída ---------------- */

  const [entryExitStudent, setEntryExitStudent] = useState<RadarStudent | null>(null);
  const [entryExitType, setEntryExitType] = useState('Chegou atrasado');
  const [entryExitMotivo, setEntryExitMotivo] = useState('');
  const [isSendingEntryExit, setIsSendingEntryExit] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const handleDispatchEntryExit = () => {
    if (!entryExitStudent) return setMoveError('Escolha o estudante.');
    if (!entryExitMotivo.trim()) return setMoveError('Escreva o motivo.');
    setMoveError(null);
    setIsSendingEntryExit(true);

    const now = new Date();
    try {
      addGateMovementLog({
        studentId: entryExitStudent.id,
        studentName: entryExitStudent.name,
        studentGrade: entryExitStudent.grade,
        responsibleName: entryExitStudent.parentPrincipal,
        pickerName: entryExitStudent.parentPrincipal,
        pickerCpf: entryExitStudent.cpf,
        pickerRelation: 'Responsável',
        timestamp: `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        date: todayISO(),
        status: 'sucesso',
        staffName: reporter || user?.name || 'Portaria',
        gateLocation: 'Portaria Principal',
        notes: `Motivo: ${entryExitMotivo}`,
        movementType: entryExitType,
        reason: entryExitMotivo,
        shift: entryExitStudent.turno,
        room: entryExitStudent.sala,
      });
      showToast(`“${entryExitType}” registrado para ${entryExitStudent.name}.`);
      setEntryExitMotivo('');
    } catch (err: any) {
      setMoveError(err?.message || 'Não foi possível registrar.');
    } finally {
      setIsSendingEntryExit(false);
    }
  };

  /* ---------------- Resumo do estudante (calculado das ocorrências reais) ---------------- */

  const [summaryStudentId, setSummaryStudentId] = useState('');
  const summary = useMemo(() => {
    if (!summaryStudentId) return null;
    const st = realStudents.find((s) => s.id === summaryStudentId);
    const list = allOccurrences.filter((o) => (o.student_id || o.studentId) === summaryStudentId);
    const byType = new Map<string, number>();
    const byHour = new Map<number, number>();
    let grave = 0;
    list.forEach((o) => {
      const t = o.title || o.reason || 'Outro';
      byType.set(t, (byType.get(t) || 0) + 1);
      const hh = parseInt(String(o.time || '').slice(0, 2), 10);
      if (!Number.isNaN(hh)) byHour.set(hh, (byHour.get(hh) || 0) + 1);
      if (gravityInfo(o.gravity || o.severity).tone === 'danger') grave++;
    });
    const topTypes = [...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topHour = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0];
    const pending = list.filter((o) => !isResolvedOcc(o)).length;
    const last = list.map(occDate).filter(Boolean).sort().pop() || '';
    return { student: st, total: list.length, grave, pending, topTypes, topHour, last };
  }, [summaryStudentId, realStudents, allOccurrences]);

  /* ---------------- Lista ---------------- */

  const [occToDelete, setOccToDelete] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredOccurrences = useMemo(() => {
    const term = occSearchTerm.toLowerCase().trim();
    return allOccurrences.filter((occ: any) => {
      if (occStatusFilter !== 'todos') {
        const resolved = isResolvedOcc(occ);
        if (occStatusFilter === 'resolvida' && !resolved) return false;
        if (occStatusFilter === 'pendente' && resolved) return false;
      }
      if (occGravityFilter !== 'todas') {
        const g = (occ.gravity || occ.severity || '').toLowerCase();
        if (occGravityFilter === 'leve' && g !== 'leve' && g !== 'low') return false;
        if (occGravityFilter === 'medium' && g !== 'medium' && g !== 'moderada') return false;
        if (occGravityFilter === 'grave' && g !== 'grave' && g !== 'gravissima' && g !== 'high') return false;
      }
      if (term) {
        const student = (occ.student_name || occ.studentName || '').toLowerCase();
        const title = (occ.title || '').toLowerCase();
        const desc = (occ.description || '').toLowerCase();
        const rep = (occ.reporter_name || occ.reporter || '').toLowerCase();
        return student.includes(term) || title.includes(term) || desc.includes(term) || rep.includes(term);
      }
      return true;
    });
  }, [allOccurrences, occStatusFilter, occGravityFilter, occSearchTerm]);

  const markResolved = async (occ: any) => {
    setBusyId(occ.id);
    try {
      const res = await fetch(`/api/radar/occurrences/${occ.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolvida', confirmed_by_family: true }),
      });
      if (!res.ok) throw new Error();
      showToast('Ocorrência marcada como resolvida.');
      fetchOccurrences();
      fetchMetrics();
    } catch {
      showToast('Não foi possível atualizar a ocorrência.', 'danger');
    } finally {
      setBusyId(null);
    }
  };

  const notifyFamily = async (occ: any) => {
    setBusyId(occ.id);
    const name = occ.student_name || occ.studentName || 'o estudante';
    try {
      const res = await fetch(`/api/radar/occurrences/${occ.id}/communicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communication_type: 'WhatsApp', details: 'Notificação enviada com sucesso.' }),
      });
      if (!res.ok) throw new Error();
      showToast(`Aviso enviado de novo para a família de ${name}.`);
      fetchOccurrences();
      fetchMetrics();
    } catch {
      showToast('Não foi possível avisar a família.', 'danger');
    } finally {
      setBusyId(null);
    }
  };

  const deleteOcc = async () => {
    if (!occToDelete) return;
    setBusyId(occToDelete.id);
    try {
      const res = await fetch(`/api/radar/occurrences/${occToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Ocorrência excluída.', 'info');
      setOccToDelete(null);
      fetchOccurrences();
      fetchMetrics();
    } catch {
      showToast('Não foi possível excluir.', 'danger');
    } finally {
      setBusyId(null);
    }
  };

  // Números: usa o servidor quando disponível, senão calcula da lista
  const today = todayISO();
  const totalCount = metrics?.totalOccurrences ?? allOccurrences.length;
  const todayCount = metrics?.occurrencesToday ?? allOccurrences.filter((o) => occDate(o) === today).length;
  const resolvedCount = metrics?.resolvedOccurrences ?? allOccurrences.filter(isResolvedOcc).length;
  const pendingCount = allOccurrences.filter((o) => !isResolvedOcc(o)).length;

  return (
    <div className="space-y-6 pb-12 text-left">
      <PillNav
        label="Radar e disciplina"
        value={activeSubTab}
        onChange={setActiveSubTab}
        items={[
          { id: 'radar', label: 'Radar de rotina', icon: Radar },
          { id: 'disciplina', label: 'Centro disciplinar', icon: Scale },
        ]}
      />

      {activeSubTab === 'disciplina' ? (
        <CentroDisciplinarClassium />
      ) : (
        <>
          <ModuleHeader
            icon={Radar}
            title="Radar de rotina"
            text="Ocorrências, atrasos, saídas e o histórico de cada estudante, num só lugar. O que é registrado aqui vai para o livro de conduta e para a família."
            actions={
              <RoundIconButton
                icon={RefreshCw}
                label="Atualizar"
                spinning={isLoadingOccurrences}
                onClick={() => {
                  fetchOccurrences();
                  fetchMetrics();
                  fetchStudents();
                }}
              />
            }
          />

          <MetricStrip
            items={[
              { label: 'Ocorrências', value: totalCount, icon: Shield },
              { label: 'Hoje', value: todayCount, icon: Clock, tone: todayCount > 0 ? 'warning' : 'neutral' },
              { label: 'Pendentes', value: pendingCount, icon: AlertTriangle, tone: pendingCount > 0 ? 'warning' : 'neutral', hint: 'Sem resolução ou ciência' },
              metrics?.convivenceIndex
                ? { label: 'Índice de convivência', value: metrics.convivenceIndex, icon: BarChart3 }
                : { label: 'Resolvidas', value: resolvedCount, icon: CheckCircle2, tone: 'success' as const },
            ]}
          />

          <div className="grid items-start gap-6 xl:grid-cols-2">
            {/* Registrar ocorrência */}
            <Card>
              <CardHeader icon={Shield} title="Registrar ocorrência" subtitle="Escolha o estudante, o que aconteceu e a gravidade" />
              <div className="space-y-4">
                {occError && <Alert tone="danger">{occError}</Alert>}
                <StudentPicker
                  id="occ-student"
                  label="Estudante"
                  students={realStudents}
                  loading={isLoadingStudents}
                  selected={selectedStudent}
                  onSelect={(s) => {
                    setSelectedStudent(s);
                    setOccError(null);
                  }}
                  showContacts
                />
                <Field label="O que aconteceu" required>
                  {(id) => (
                    <select id={id} value={infraction} onChange={(e) => setInfraction(e.target.value)} className={inputCls}>
                      {OCCURRENCE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Relato" hint={`${relato.length} de 1000`}>
                  {(id) => (
                    <textarea
                      id={id}
                      rows={3}
                      maxLength={1000}
                      placeholder="Descreva os fatos em poucas linhas"
                      value={relato}
                      onChange={(e) => setRelato(e.target.value)}
                      className={cx(inputCls, 'resize-y')}
                    />
                  )}
                </Field>
                <fieldset>
                  <legend className="mb-1.5 text-[13px] font-semibold text-[var(--text-heading)]">Gravidade</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {SEVERITIES.map((s) => {
                      const active = severity === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSeverity(s.id)}
                          className={cx('h-10 rounded-full border text-[13px] font-semibold transition-colors', active ? 'border-transparent' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]')}
                          style={active ? { background: s.bg, color: s.fg, boxShadow: `inset 0 0 0 1.5px ${s.fg}` } : undefined}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <Field label="Quem registra" required>
                  {(id) => <input id={id} placeholder="Nome e função" value={reporter} onChange={(e) => setReporter(e.target.value)} className={inputCls} />}
                </Field>
                <Button icon={Send} loading={isProcessing} onClick={handleRegisterOccurrence} className="w-full">
                  Registrar ocorrência
                </Button>
              </div>
            </Card>

            <div className="space-y-6">
              {/* Entrada e saída */}
              <Card>
                <CardHeader icon={DoorOpen} title="Entrada e saída" subtitle="Atrasos, saídas antecipadas e retornos" />
                <div className="space-y-4">
                  {moveError && <Alert tone="danger">{moveError}</Alert>}
                  <StudentPicker
                    id="move-student"
                    label="Estudante"
                    students={realStudents}
                    loading={isLoadingStudents}
                    selected={entryExitStudent}
                    onSelect={(s) => {
                      setEntryExitStudent(s);
                      setMoveError(null);
                    }}
                  />
                  <fieldset>
                    <legend className="mb-1.5 text-[13px] font-semibold text-[var(--text-heading)]">Tipo</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {MOVEMENT_TYPES.map((t) => {
                        const active = entryExitType === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setEntryExitType(t)}
                            className={cx(
                              'h-8 rounded-full border px-3 text-[12px] font-semibold transition-colors',
                              active ? 'border-transparent' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]',
                            )}
                            style={active ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : undefined}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <Field label="Motivo" required hint={`${entryExitMotivo.length} de 500`}>
                    {(id) => (
                      <textarea
                        id={id}
                        rows={2}
                        maxLength={500}
                        placeholder="O que o responsável informou"
                        value={entryExitMotivo}
                        onChange={(e) => setEntryExitMotivo(e.target.value)}
                        className={cx(inputCls, 'resize-y')}
                      />
                    )}
                  </Field>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[12px] text-[var(--text-muted)]">
                      Fica com data e hora de agora: {new Date().toLocaleDateString('pt-BR')}, {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <Button variant="secondary" icon={DoorOpen} loading={isSendingEntryExit} onClick={handleDispatchEntryExit}>
                      Registrar
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Resumo */}
              <Card>
                <CardHeader icon={BarChart3} title="Resumo do estudante" subtitle="Calculado a partir das ocorrências registradas" />
                <select aria-label="Estudante para o resumo" value={summaryStudentId} onChange={(e) => setSummaryStudentId(e.target.value)} className={inputCls}>
                  <option value="">Escolha um estudante</option>
                  {realStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.grade ? ` — ${s.grade}` : ''}
                    </option>
                  ))}
                </select>

                {summary &&
                  (summary.total === 0 ? (
                    <p className="mt-4 rounded-2xl bg-[var(--bg-card-alt)] p-4 text-[14px] text-[var(--text-body)]">
                      Nenhuma ocorrência registrada para {summary.student?.name || 'este estudante'}.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)]">
                        {[
                          ['Ocorrências', summary.total],
                          ['Graves', summary.grave],
                          ['Pendentes', summary.pending],
                        ].map(([l, v]) => (
                          <div key={l as string} className="bg-[var(--bg-card)] px-4 py-3">
                            <p className="text-[12px] text-[var(--text-muted)]">{l}</p>
                            <p className="font-serif text-[24px] font-semibold tabular-nums text-[var(--text-heading)]">{v}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="mb-2 text-[13px] font-semibold text-[var(--text-heading)]">Mais frequentes</p>
                        <ul className="space-y-1.5">
                          {summary.topTypes.map(([t, n]) => (
                            <li key={t} className="flex items-center gap-3 text-[13px]">
                              <span className="min-w-0 flex-1 truncate text-[var(--text-body)]">{t}</span>
                              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--bg-card-alt)]">
                                <span className="block h-full rounded-full" style={{ width: `${(n / summary.total) * 100}%`, background: 'var(--accent)' }} />
                              </span>
                              <span className="w-6 text-right tabular-nums text-[var(--text-muted)]">{n}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-[13px] text-[var(--text-muted)]">
                        {summary.topHour ? `Horário com mais registros: ${String(summary.topHour[0]).padStart(2, '0')}h. ` : ''}
                        Último registro em {fmtDate(summary.last)}.
                      </p>
                    </div>
                  ))}
              </Card>
            </div>
          </div>

          {/* Lista */}
          <Card padded={false} className="overflow-hidden">
            <div className="p-5 pb-0 sm:p-6 sm:pb-0">
              <CardHeader icon={MessageSquare} title="Ocorrências" subtitle={`${allOccurrences.length} registradas`} />
            </div>
            <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 pb-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <Segmented
                  label="Situação"
                  value={occStatusFilter}
                  onChange={setOccStatusFilter}
                  items={[
                    { id: 'todos', label: 'Todas' },
                    { id: 'pendente', label: 'Pendentes' },
                    { id: 'resolvida', label: 'Resolvidas' },
                  ]}
                />
                <Segmented
                  label="Gravidade"
                  value={occGravityFilter}
                  onChange={setOccGravityFilter}
                  items={[
                    { id: 'todas', label: 'Qualquer gravidade' },
                    { id: 'leve', label: 'Leve' },
                    { id: 'medium', label: 'Moderada' },
                    { id: 'grave', label: 'Grave' },
                  ]}
                />
              </div>
              <div className="relative lg:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="search"
                  aria-label="Buscar ocorrência"
                  placeholder="Estudante, tipo ou quem registrou"
                  value={occSearchTerm}
                  onChange={(e) => setOccSearchTerm(e.target.value)}
                  className={cx(inputCls, 'pl-10')}
                />
              </div>
            </div>

            {isLoadingOccurrences && allOccurrences.length === 0 ? (
              <div className="space-y-2 p-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredOccurrences.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={Shield} title={allOccurrences.length === 0 ? 'Nenhuma ocorrência registrada' : 'Nada encontrado com esses filtros'} compact />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {filteredOccurrences.map((occ: any) => {
                  const resolved = isResolvedOcc(occ);
                  const grav = gravityInfo(occ.gravity || occ.severity);
                  const busy = busyId === occ.id;
                  return (
                    <li key={occ.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[var(--bg-card-alt)] sm:px-6 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <Avatar name={occ.student_name || occ.studentName} size={40} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[var(--text-heading)]">{occ.student_name || occ.studentName || 'Estudante'}</span>
                            {occ.grade && <span className="text-[12px] text-[var(--text-muted)]">{occ.grade}</span>}
                            <Badge tone={grav.tone}>{grav.label}</Badge>
                            {resolved ? (
                              <Badge tone="success">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Resolvida
                              </Badge>
                            ) : (
                              <Badge>Pendente</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-[14px] font-medium text-[var(--text-heading)]">{occ.title || occ.reason || 'Ocorrência'}</p>
                          {occ.description && <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-[var(--text-muted)]">{occ.description}</p>}
                          {occ.communication_log && <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">Contato com a família: {occ.communication_log}</p>}
                          <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">
                            {occ.reporter_name || occ.reporter || 'Equipe'} · {fmtDate(occDate(occ))}
                            {occ.time ? ` às ${occ.time}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 md:pt-1">
                        {!resolved && (
                          <Button size="sm" variant="secondary" icon={CheckCircle2} disabled={busy} onClick={() => markResolved(occ)}>
                            Resolver
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" icon={Send} disabled={busy} onClick={() => notifyFamily(occ)}>
                          Avisar família
                        </Button>
                        <button
                          type="button"
                          aria-label="Excluir"
                          title="Excluir"
                          disabled={busy}
                          onClick={() => setOccToDelete(occ)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[#FDECEC] hover:text-[#B42318] disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <ConfirmModal
            open={Boolean(occToDelete)}
            onClose={() => setOccToDelete(null)}
            onConfirm={deleteOcc}
            loading={Boolean(occToDelete) && busyId === occToDelete?.id}
            title="Excluir ocorrência?"
            confirmLabel="Excluir"
            icon={Trash2}
          >
            A ocorrência de <strong className="text-[var(--text-heading)]">{occToDelete?.student_name || occToDelete?.studentName || 'estudante'}</strong> ({occToDelete?.title || 'sem título'}) sai do
            histórico. Não dá para desfazer.
          </ConfirmModal>
        </>
      )}

      <Toast message={toast?.text ?? null} tone={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Busca de estudante                                                  */
/* ------------------------------------------------------------------ */

function StudentPicker({
  id,
  label,
  students,
  loading,
  selected,
  onSelect,
  showContacts,
}: {
  id: string;
  label: string;
  students: RadarStudent[];
  loading: boolean;
  selected: RadarStudent | null;
  onSelect: (s: RadarStudent | null) => void;
  showContacts?: boolean;
}) {
  const [term, setTerm] = useState('');
  const deferred = useDeferredValue(term);

  const results = useMemo(() => {
    const q = deferred.toLowerCase().trim();
    if (!q) return [];
    const out: RadarStudent[] = [];
    for (const s of students) {
      if (
        s.name.toLowerCase().includes(q) ||
        (s.matricula && s.matricula.toLowerCase().includes(q)) ||
        (s.cpf && s.cpf.includes(q)) ||
        (s.grade && s.grade.toLowerCase().includes(q))
      ) {
        out.push(s);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [deferred, students]);

  if (selected) {
    return (
      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-[var(--text-heading)]">{label}</p>
        <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
          <div className="flex items-center gap-3">
            {selected.photoUrl ? (
              <img src={selected.photoUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Avatar name={selected.name} size={44} />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[var(--text-heading)]">{selected.name}</p>
              <p className="truncate text-[12px] text-[var(--text-muted)]">
                {[selected.grade, selected.turno, selected.matricula && `Matrícula ${selected.matricula}`].filter(Boolean).join(' · ') || 'Sem turma cadastrada'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelect(null)}
              aria-label="Trocar estudante"
              title="Trocar estudante"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-heading)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {showContacts && (
            <div className="mt-3 space-y-1.5 border-t border-[var(--border)] pt-3">
              {selected.guardians.length === 0 ? (
                <p className="text-[12px] text-[var(--text-muted)]">Nenhum responsável cadastrado.</p>
              ) : (
                selected.guardians.map((g, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="flex min-w-0 items-center gap-1.5 text-[var(--text-body)]">
                      <User className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                      <span className="truncate">
                        {g.name} ({g.relation}){g.phone ? ` · ${g.phone}` : ''}
                      </span>
                    </span>
                    {g.whatsapp && (
                      <a
                        href={`https://wa.me/${g.whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                        style={{ background: '#E7F6EE', color: '#127A4B' }}
                      >
                        <Phone className="h-3 w-3" /> WhatsApp
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-[var(--text-heading)]">
        {label}
        <span className="ml-0.5 text-[#B42318]">*</span>
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          id={id}
          type="search"
          autoComplete="off"
          placeholder={loading ? 'Carregando estudantes…' : 'Nome, matrícula, CPF ou turma'}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className={cx(inputCls, 'pl-10')}
        />
      </div>
      {term.trim() && (
        <div className="mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-1 shadow-[0_16px_40px_-24px_rgba(16,24,40,0.4)]">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-[13px] text-[var(--text-muted)]">{loading ? 'Carregando…' : 'Nenhum estudante encontrado.'}</p>
          ) : (
            results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelect(s);
                  setTerm('');
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-[var(--bg-card-alt)]"
              >
                <span className="min-w-0 truncate font-medium text-[var(--text-heading)]">{s.name}</span>
                <span className="shrink-0 text-[12px] text-[var(--text-muted)]">{s.grade || s.matricula}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}