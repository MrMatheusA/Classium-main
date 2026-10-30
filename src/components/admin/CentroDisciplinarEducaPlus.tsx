import { useCallback, useDeferredValue, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  FileText,
  MessageSquare,
  Phone,
  Printer,
  Scale,
  Search,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { studentsService } from '../../services/students/students.service';
import { supabase } from '../../lib/supabase';
import { Alert, Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Modal, Skeleton, Toast, cx, inputCls } from '../ui/kit';
import { MetricStrip, ModuleHeader, Segmented } from '../ui/ModuleParts';

/**
 * Centro disciplinar
 * Tudo aqui é calculado a partir das ocorrências reais (tabela occurrences / API do radar)
 * e dos estudantes cadastrados. As medidas tomadas (advertência, convocação, reunião,
 * encaminhamento ao Conselho Tutelar) também são gravadas como registros no histórico.
 */

type Period = 'all' | '1o' | '2o' | '3o';
type Day = 'Seg' | 'Ter' | 'Qua' | 'Qui' | 'Sex';
const DAYS: Day[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

type MeasureKind = 'verbal' | 'escrita' | 'convocacao' | 'reuniao' | 'conselho';
const MEASURE_TITLES: Record<MeasureKind, string> = {
  verbal: 'Advertência verbal',
  escrita: 'Advertência escrita',
  convocacao: 'Convocação da família',
  reuniao: 'Reunião com a família',
  conselho: 'Encaminhamento ao Conselho Tutelar',
};

interface Occ {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  title: string;
  description: string;
  reporter: string;
  date: string; // AAAA-MM-DD
  time: string;
  gravity: string;
  measure: MeasureKind | null;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  shift: string;
  photoUrl: string;
  guardian: string;
  phone: string;
}

interface Stats {
  occurrences: number;
  graves: number;
  verbal: number;
  escrita: number;
  meetings: number;
  conselho: number;
}

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, '0');
const localISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Aceita AAAA-MM-DD, ISO completo ou DD/MM/AAAA e devolve AAAA-MM-DD */
function normDate(raw?: string): string {
  if (!raw) return '';
  const s = String(raw);
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : localISO(d);
}

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : '—';
};

function periodOf(iso: string): Exclude<Period, 'all'> | null {
  const m = parseInt(iso.slice(5, 7), 10);
  if (!m) return null;
  return m <= 4 ? '1o' : m <= 8 ? '2o' : '3o';
}

function weekdayOf(iso: string): Day | null {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const idx = new Date(y, m - 1, d).getDay();
  return ({ 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex' } as Record<number, Day>)[idx] || null;
}

function measureOf(title: string, type?: string): MeasureKind | null {
  const t = title.toLowerCase();
  if (t.includes('conselho tutelar')) return 'conselho';
  if (t.includes('advertência escrita') || t.includes('advertencia escrita')) return 'escrita';
  if (t.includes('advertência verbal') || t.includes('advertencia verbal')) return 'verbal';
  if (t.includes('reunião') || t.includes('reuniao')) return 'reuniao';
  if (t.includes('convocação') || t.includes('convocacao')) return 'convocacao';
  if (type === 'medida') return 'convocacao';
  return null;
}

const isGrave = (g: string) => ['high', 'grave', 'gravissima'].includes(g.toLowerCase());

function normalize(raw: any, i: number): Occ | null {
  if (raw?.type === 'positive') return null;
  const title = raw.title || raw.reason || 'Ocorrência';
  return {
    id: String(raw.id ?? `occ-${i}`),
    studentId: String(raw.student_id || raw.studentId || ''),
    studentName: raw.student_name || raw.studentName || 'Estudante',
    grade: raw.grade || raw.class_name || raw.classId || '',
    title,
    description: raw.description || '',
    reporter: raw.reporter_name || raw.reporter || '',
    date: normDate(raw.date || raw.created_at),
    time: raw.time || '',
    gravity: String(raw.gravity || raw.severity || 'low'),
    measure: measureOf(title, raw.occurrence_type),
  };
}

function emptyStats(): Stats {
  return { occurrences: 0, graves: 0, verbal: 0, escrita: 0, meetings: 0, conselho: 0 };
}

function addToStats(s: Stats, o: Occ) {
  if (o.measure === 'verbal') s.verbal++;
  else if (o.measure === 'escrita') s.escrita++;
  else if (o.measure === 'reuniao' || o.measure === 'convocacao') s.meetings++;
  else if (o.measure === 'conselho') s.conselho++;
  else {
    s.occurrences++;
    if (isGrave(o.gravity)) s.graves++;
  }
}

/** Mesmas faixas do painel antigo, agora contando ocorrências reais */
function levelOf(total: number) {
  if (total >= 25) return { label: 'Avaliar Conselho Tutelar', tone: 'danger' as const, next: 'conselho' as const };
  if (total >= 15) return { label: 'Caso crítico', tone: 'danger' as const, next: 'reuniao' as const };
  if (total >= 10) return { label: 'Convocar a família', tone: 'warning' as const, next: 'convocacao' as const };
  if (total >= 5) return { label: 'Advertência verbal', tone: 'warning' as const, next: 'verbal' as const };
  return { label: 'Situação normal', tone: 'success' as const, next: null };
}

function heat(count: number): CSSProperties {
  if (count === 0) return { background: 'var(--bg-card-alt)', color: 'var(--text-muted)' };
  if (count <= 2) return { background: '#FEF4E6', color: '#A15C07' };
  if (count <= 5) return { background: '#FDDCAB', color: '#93370D' };
  if (count <= 9) return { background: '#F79009', color: '#fff' };
  return { background: '#B42318', color: '#fff' };
}

const toWhatsapp = (phone?: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  return digits.length <= 11 ? `55${digits}` : digits;
};

const PERIODS: { id: Period; label: string }[] = [
  { id: 'all', label: 'Ano todo' },
  { id: '1o', label: 'Jan–Abr' },
  { id: '2o', label: 'Mai–Ago' },
  { id: '3o', label: 'Set–Dez' },
];

/* ------------------------------------------------------------------ */

export function CentroDisciplinarClassium() {
  const { schoolOccurrences, addOccurrence, requestSchedule, user, schoolInfo } = usePlatform();

  const [period, setPeriod] = useState<Period>('all');
  const [shift, setShift] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [showAllClasses, setShowAllClasses] = useState(false);

  const [dbOccurrences, setDbOccurrences] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'success') => setToast({ text, type });
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Janelas
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [convokeId, setConvokeId] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [convokeType, setConvokeType] = useState<'comunicado' | 'convite' | 'registro'>('comunicado');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingAgenda, setMeetingAgenda] = useState('');

  const actor = user?.name || 'Coordenação';

  /* ---------------- Dados ---------------- */

  const loadOccurrences = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('occurrences').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setDbOccurrences(data);
        return;
      }
      const res = await fetch('/api/radar/occurrences');
      if (res.ok) {
        const json = await res.json();
        if (json.items) setDbOccurrences(json.items);
      }
    } catch (err) {
      console.warn('[CentroDisciplinar] Erro ao carregar ocorrências:', err);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const res = await studentsService.getStudents();
      const items: any[] = res?.items || [];
      setStudents(
        items.map((s: any, i: number) => {
          const g = Array.isArray(s.guardians) ? s.guardians.find(Boolean) : null;
          return {
            id: String(s.id || `st-${i}`),
            name: s.name || s.full_name || 'Estudante',
            grade: s.grade || s.class_name || '',
            shift: s.shift || '',
            photoUrl: s.photo_url || s.avatar_url || '',
            guardian: g?.name || s.responsible_name || '',
            phone: g?.phone || s.emergency_contact || '',
          };
        }),
      );
    } catch (err) {
      console.warn('[CentroDisciplinar] Erro ao carregar estudantes:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadOccurrences(), loadStudents()]).finally(() => setLoading(false));
    const channel = supabase
      .channel('centro_disciplinar_occurrences')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'occurrences' }, () => loadOccurrences())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOccurrences, loadStudents]);

  const allOcc: Occ[] = useMemo(() => {
    const raw = dbOccurrences.length > 0 ? dbOccurrences : schoolOccurrences || [];
    return raw.map(normalize).filter((o: Occ | null): o is Occ => Boolean(o && o.date));
  }, [dbOccurrences, schoolOccurrences]);

  const occInPeriod = useMemo(() => (period === 'all' ? allOcc : allOcc.filter((o) => periodOf(o.date) === period)), [allOcc, period]);

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  // Turno de cada turma (pelo cadastro dos estudantes)
  const shiftOfGrade = useMemo(() => {
    const m = new Map<string, string>();
    students.forEach((s) => s.grade && s.shift && !m.has(s.grade) && m.set(s.grade, s.shift));
    return m;
  }, [students]);

  const shifts = useMemo(() => Array.from(new Set(students.map((s) => s.shift).filter(Boolean))).sort(), [students]);

  /* ---------------- Turmas ---------------- */

  const classes = useMemo(() => {
    const map = new Map<string, { name: string; shift: string; students: number; days: Record<Day, number>; total: number; types: Map<string, number> }>();
    const ensure = (name: string) => {
      if (!map.has(name)) map.set(name, { name, shift: shiftOfGrade.get(name) || '', students: 0, days: { Seg: 0, Ter: 0, Qua: 0, Qui: 0, Sex: 0 }, total: 0, types: new Map() });
      return map.get(name)!;
    };
    students.forEach((s) => s.grade && ensure(s.grade).students++);
    occInPeriod.forEach((o) => {
      if (o.measure) return;
      const grade = o.grade || studentById.get(o.studentId)?.grade;
      if (!grade) return;
      const c = ensure(grade);
      c.total++;
      c.types.set(o.title, (c.types.get(o.title) || 0) + 1);
      const d = weekdayOf(o.date);
      if (d) c.days[d]++;
    });
    return [...map.values()]
      .filter((c) => shift === 'all' || c.shift === shift)
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'));
  }, [students, occInPeriod, studentById, shiftOfGrade, shift]);

  /* ---------------- Estudantes ---------------- */

  const statsByStudent = useMemo(() => {
    const m = new Map<string, { stats: Stats; name: string; grade: string; reporters: Map<string, number> }>();
    occInPeriod.forEach((o) => {
      if (!o.studentId) return;
      if (!m.has(o.studentId)) m.set(o.studentId, { stats: emptyStats(), name: o.studentName, grade: o.grade, reporters: new Map() });
      const e = m.get(o.studentId)!;
      addToStats(e.stats, o);
      if (!o.measure && o.reporter) e.reporters.set(o.reporter, (e.reporters.get(o.reporter) || 0) + 1);
    });
    return m;
  }, [occInPeriod]);

  const monitorRows = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return [...statsByStudent.entries()]
      .map(([id, e]) => {
        const st = studentById.get(id);
        const topReporter = [...e.reporters.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        return { id, name: st?.name || e.name, grade: st?.grade || e.grade, shift: st?.shift || '', photoUrl: st?.photoUrl || '', stats: e.stats, topReporter };
      })
      .filter((r) => (shift === 'all' || r.shift === shift || !r.shift) && (!q || r.name.toLowerCase().includes(q) || r.grade.toLowerCase().includes(q)))
      .sort((a, b) => b.stats.occurrences - a.stats.occurrences);
  }, [statsByStudent, studentById, deferredSearch, shift]);

  const totals = useMemo(() => {
    let occ = 0;
    let ct = 0;
    statsByStudent.forEach((e) => {
      occ += e.stats.occurrences;
      ct += e.stats.conselho;
    });
    const alert = [...statsByStudent.values()].filter((e) => e.stats.occurrences >= 15).length;
    const hotClasses = classes.filter((c) => c.total >= 20).length;
    return { occ, ct, alert, hotClasses };
  }, [statsByStudent, classes]);

  /* ---------------- Medidas (gravadas como registros reais) ---------------- */

  const infoOf = (id: string | null) => {
    if (!id) return null;
    const st = studentById.get(id);
    const e = statsByStudent.get(id);
    const anyOcc = allOcc.find((o) => o.studentId === id);
    return {
      id,
      name: st?.name || e?.name || anyOcc?.studentName || 'Estudante',
      grade: st?.grade || e?.grade || anyOcc?.grade || '',
      shift: st?.shift || '',
      photoUrl: st?.photoUrl || '',
      guardian: st?.guardian || '',
      phone: st?.phone || '',
    };
  };

  const recordMeasure = async (studentId: string, kind: MeasureKind, description: string, date = localISO(), time = '') => {
    const info = infoOf(studentId);
    if (!info) return false;
    const now = new Date();
    const t = time || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const res = await fetch('/api/radar/occurrences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: info.id,
        student_name: info.name,
        grade: info.grade,
        title: MEASURE_TITLES[kind],
        reason: MEASURE_TITLES[kind],
        occurrence_type: 'medida',
        gravity: kind === 'conselho' ? 'grave' : 'low',
        description,
        reporter_name: actor,
        date,
        time: t,
        status: 'resolvida',
      }),
    });
    if (!res.ok) throw new Error('Não foi possível gravar no histórico.');
    addOccurrence?.({
      type: 'negative',
      title: MEASURE_TITLES[kind],
      description,
      date,
      time: t,
      reporter: actor,
      severity: kind === 'conselho' ? 'high' : 'low',
      studentId: info.id,
      studentName: info.name,
      grade: info.grade,
      status: 'resolvido',
    });
    await loadOccurrences();
    return true;
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setModalError(null);
    try {
      await fn();
    } catch (err: any) {
      setModalError(err?.message || 'Não foi possível concluir. Tente de novo.');
      showToast(err?.message || 'Não foi possível concluir.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const applyVerbal = (id: string) =>
    run(async () => {
      await recordMeasure(id, 'verbal', 'Advertência verbal aplicada pela coordenação.');
      showToast(`Advertência verbal registrada para ${infoOf(id)?.name}.`);
    });

  const convokeText = (info: NonNullable<ReturnType<typeof infoOf>>) =>
    convokeType === 'comunicado'
      ? `Prezados responsáveis por ${info.name}, pedimos que compareçam à escola para conversarmos sobre o comportamento do estudante.`
      : convokeType === 'convite'
        ? `${info.guardian ? `Prezado(a) ${info.guardian}` : 'Prezados responsáveis'}, convidamos para uma reunião com a coordenação sobre o acompanhamento de ${info.name}.`
        : `Registro de acompanhamento disciplinar de ${info.name} no prontuário do estudante.`;

  const saveConvocation = () =>
    run(async () => {
      const info = infoOf(convokeId)!;
      await recordMeasure(info.id, 'convocacao', convokeText(info));
      showToast(convokeType === 'registro' ? 'Registro salvo no histórico.' : 'Convocação registrada no histórico.');
      setConvokeId(null);
    });

  const saveMeeting = () =>
    run(async () => {
      const info = infoOf(meetingId)!;
      if (!meetingDate || !meetingTime) throw new Error('Escolha a data e o horário.');
      const agenda = meetingAgenda.trim() || 'Acompanhamento disciplinar.';
      await recordMeasure(info.id, 'reuniao', `Reunião marcada para ${fmtDate(meetingDate)} às ${meetingTime}. Pauta: ${agenda}`);
      requestSchedule?.(actor, 'Coordenação', meetingDate, meetingTime, `Reunião com os responsáveis de ${info.name}. Pauta: ${agenda}`);
      showToast(`Reunião marcada para ${fmtDate(meetingDate)} às ${meetingTime} e incluída na agenda.`);
      setMeetingId(null);
      setMeetingDate('');
      setMeetingTime('');
      setMeetingAgenda('');
    });

  const saveReferral = () =>
    run(async () => {
      const info = infoOf(reportId)!;
      await recordMeasure(info.id, 'conselho', 'Relatório de encaminhamento ao Conselho Tutelar emitido pela escola.');
      showToast('Encaminhamento registrado no histórico do estudante.');
      setReportId(null);
    });

  const openAction = (id: string, kind: MeasureKind) => {
    setModalError(null);
    if (kind === 'verbal') applyVerbal(id);
    else if (kind === 'convocacao') {
      setConvokeType('comunicado');
      setConvokeId(id);
    } else if (kind === 'reuniao') setMeetingId(id);
    else if (kind === 'conselho') setReportId(id);
  };

  const printReport = () => {
    const html = document.getElementById('relatorio-conselho-tutelar')?.innerHTML;
    if (!html) return;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) return window.print();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório ao Conselho Tutelar</title>
      <style>body{font:13px/1.55 Georgia,serif;color:#101828;margin:48px}h2{font-size:18px;margin:0}h3{font-size:14px;margin:24px 0 8px;padding:4px 6px;background:#F2F4F7}
      table{width:100%;border-collapse:collapse}td,th{border:1px solid #D0D5DD;padding:6px 8px;text-align:left;font-size:12px}
      .center{text-align:center}.sig{display:flex;justify-content:space-around;margin-top:72px}.sig div{border-top:1px solid #101828;width:220px;padding-top:6px;text-align:center;font-size:12px}
      .muted{color:#667085}</style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  /* ---------------- Tela ---------------- */

  const visibleClasses = showAllClasses ? classes : classes.slice(0, 9);
  const ficha = infoOf(fichaId);
  const fichaOcc = fichaId ? allOcc.filter((o) => o.studentId === fichaId).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)) : [];
  const convoke = infoOf(convokeId);
  const meeting = infoOf(meetingId);
  const report = infoOf(reportId);
  const reportStats = useMemo(() => {
    const s = emptyStats();
    if (reportId) allOcc.filter((o) => o.studentId === reportId).forEach((o) => addToStats(s, o));
    return s;
  }, [reportId, allOcc]);
  const reportOcc = reportId ? allOcc.filter((o) => o.studentId === reportId && !o.measure).sort((a, b) => a.date.localeCompare(b.date)) : [];
  const reportMeasures = reportId ? allOcc.filter((o) => o.studentId === reportId && o.measure).sort((a, b) => a.date.localeCompare(b.date)) : [];

  return (
    <div className="space-y-6 text-left">
      <ModuleHeader
        icon={Scale}
        title="Centro disciplinar"
        text="Ocorrências por turma e por estudante, com as medidas recomendadas em cada faixa: advertência, convocação da família, reunião e, por último, o Conselho Tutelar."
        actions={<Segmented label="Período" value={period} onChange={setPeriod} items={PERIODS} />}
      />

      <MetricStrip
        items={[
          { label: 'Ocorrências no período', value: totals.occ, icon: Shield },
          { label: 'Turmas em atenção', value: totals.hotClasses, icon: Users, tone: totals.hotClasses > 0 ? 'warning' : 'neutral', hint: '20 ou mais ocorrências' },
          { label: 'Estudantes em alerta', value: totals.alert, icon: UserCheck, tone: totals.alert > 0 ? 'danger' : 'neutral', hint: '15 ou mais ocorrências' },
          { label: 'Encaminhados ao CT', value: totals.ct, icon: Scale, hint: 'Conselho Tutelar' },
        ]}
      />

      {/* Turmas */}
      <Card>
        <CardHeader
          icon={Calendar}
          title="Mapa por turma"
          subtitle="Ocorrências por dia da semana no período escolhido"
          action={
            shifts.length > 1 ? (
              <select aria-label="Turno" value={shift} onChange={(e) => setShift(e.target.value)} className={cx(inputCls, 'h-10 !w-auto shrink-0 py-0 text-[13px]')}>
                <option value="all">Todos os turnos</option>
                {shifts.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : undefined
          }
        />

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <EmptyState icon={Users} title="Nenhuma turma para mostrar" text="As turmas aparecem quando há estudantes cadastrados com turma ou ocorrências registradas." compact />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleClasses.map((c) => {
                const risk = c.total >= 25 ? { l: 'Crítico', t: 'danger' as const } : c.total >= 15 ? { l: 'Alto', t: 'danger' as const } : c.total >= 8 ? { l: 'Médio', t: 'warning' as const } : { l: 'Baixo', t: 'success' as const };
                const topTypes = [...c.types.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t);
                return (
                  <div key={c.name} className="flex flex-col rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-serif text-[17px] font-semibold text-[var(--text-heading)]">{c.name}</p>
                        <p className="text-[12px] text-[var(--text-muted)]">
                          {[c.shift, c.students ? `${c.students} ${c.students === 1 ? 'estudante' : 'estudantes'}` : ''].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      <Badge tone={risk.t}>Risco {risk.l.toLowerCase()}</Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-5 gap-1.5 text-center">
                      {DAYS.map((d) => (
                        <div key={d}>
                          <div className="rounded-lg py-2 text-[13px] font-semibold tabular-nums" style={heat(c.days[d])} title={`${d}: ${c.days[d]} ocorrência(s)`}>
                            {c.days[d]}
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--text-muted)]">{d}</p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 line-clamp-1 text-[12px] text-[var(--text-muted)]">
                      {c.total === 0 ? 'Sem ocorrências no período.' : `${c.total} no total${topTypes.length ? ` · mais comum: ${topTypes.join(', ')}` : ''}`}
                    </p>

                    <div className="min-h-[12px] flex-1" aria-hidden />
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={UserCheck}
                      className="mt-1 w-full"
                      disabled={c.total === 0}
                      onClick={() => {
                        setSearchTerm(c.name);
                        document.getElementById('monitor-advertencias')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Ver estudantes
                    </Button>
                  </div>
                );
              })}
            </div>
            {classes.length > 9 && (
              <div className="mt-4 text-center">
                <Button variant="ghost" size="sm" icon={ChevronDown} onClick={() => setShowAllClasses((v) => !v)}>
                  {showAllClasses ? 'Mostrar menos' : `Ver todas as ${classes.length} turmas`}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Monitor de advertências */}
      <Card padded={false} className="overflow-hidden">
        <div id="monitor-advertencias" className="flex flex-col gap-3 border-b border-[var(--border)] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Shield className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-[var(--text-heading)]">Acompanhamento por estudante</h2>
              <p className="text-[13px] text-[var(--text-muted)]">5+ advertência verbal · 10+ convocar família · 15+ reunião · 25+ Conselho Tutelar</p>
            </div>
          </div>
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              aria-label="Buscar estudante ou turma"
              placeholder="Estudante ou turma"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cx(inputCls, 'pl-10')}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : monitorRows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={CheckCircle2}
              title={searchTerm ? 'Ninguém encontrado com essa busca' : 'Nenhuma ocorrência no período'}
              text={searchTerm ? undefined : 'Quando houver ocorrências registradas no Radar de rotina, os estudantes aparecem aqui.'}
              compact
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {monitorRows.map((r) => {
              const lvl = levelOf(r.stats.occurrences);
              return (
                <li key={r.id} className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[var(--bg-card-alt)] sm:px-6 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 items-center gap-3 xl:w-[26%]">
                    {r.photoUrl ? <img src={r.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" /> : <Avatar name={r.name} size={40} />}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--text-heading)]">{r.name}</p>
                      <p className="truncate text-[12px] text-[var(--text-muted)]">{[r.grade, r.shift].filter(Boolean).join(' · ') || '—'}</p>
                    </div>
                  </div>

                  <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
                    <div>
                      <p className="text-[12px] text-[var(--text-muted)]">Ocorrências</p>
                      <p className="flex items-center gap-2">
                        <span className="font-serif text-[20px] font-semibold tabular-nums text-[var(--text-heading)]">{r.stats.occurrences}</span>
                        <Badge tone={lvl.tone}>{lvl.label}</Badge>
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[var(--text-muted)]">Advertências</p>
                      <p className="font-medium text-[var(--text-heading)]">
                        {r.stats.verbal} verbal · {r.stats.escrita} escrita
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[var(--text-muted)]">Família</p>
                      <p className="font-medium text-[var(--text-heading)]">{r.stats.meetings ? `${r.stats.meetings} contato(s)` : 'Nenhum contato'}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[var(--text-muted)]">Quem mais registrou</p>
                      <p className="truncate font-medium text-[var(--text-heading)]" title={r.topReporter}>
                        {r.topReporter || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {lvl.next && (
                      <Button
                        size="sm"
                        variant={lvl.tone === 'danger' ? 'danger' : 'primary'}
                        icon={lvl.next === 'verbal' ? UserCheck : lvl.next === 'convocacao' ? MessageSquare : lvl.next === 'reuniao' ? Calendar : Scale}
                        disabled={busy}
                        onClick={() => openAction(r.id, lvl.next!)}
                      >
                        {lvl.next === 'verbal' ? 'Aplicar advertência' : lvl.next === 'convocacao' ? 'Convocar família' : lvl.next === 'reuniao' ? 'Marcar reunião' : 'Relatório ao CT'}
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" icon={FileText} onClick={() => setFichaId(r.id)}>
                      Ficha
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Ficha do estudante */}
      <Modal
        open={Boolean(ficha)}
        onClose={() => setFichaId(null)}
        size="lg"
        title={ficha?.name || ''}
        subtitle={ficha ? [ficha.grade, ficha.shift].filter(Boolean).join(' · ') || 'Ficha disciplinar' : ''}
        footer={<Button onClick={() => setFichaId(null)}>Fechar</Button>}
      >
        {ficha && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--bg-card-alt)] p-4">
              <div className="text-[13px]">
                <p className="text-[var(--text-muted)]">Responsável</p>
                <p className="font-semibold text-[var(--text-heading)]">{ficha.guardian || 'Não cadastrado'}</p>
                {ficha.phone && <p className="text-[var(--text-body)]">{ficha.phone}</p>}
              </div>
              {toWhatsapp(ficha.phone) && (
                <a
                  href={`https://wa.me/${toWhatsapp(ficha.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold"
                  style={{ background: '#E7F6EE', color: '#127A4B' }}
                >
                  <Phone className="h-4 w-4" /> WhatsApp
                </a>
              )}
            </div>

            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-5">
              {(['1o', '2o', '3o'] as const).map((p, i) => {
                const s = emptyStats();
                fichaOcc.filter((o) => periodOf(o.date) === p).forEach((o) => addToStats(s, o));
                return (
                  <div key={p} className="bg-[var(--bg-card)] px-4 py-3">
                    <p className="text-[12px] text-[var(--text-muted)]">{PERIODS[i + 1].label}</p>
                    <p className="font-serif text-[22px] font-semibold tabular-nums text-[var(--text-heading)]">{s.occurrences}</p>
                  </div>
                );
              })}
              {(() => {
                const s = emptyStats();
                fichaOcc.forEach((o) => addToStats(s, o));
                return (
                  <>
                    <div className="bg-[var(--bg-card)] px-4 py-3">
                      <p className="text-[12px] text-[var(--text-muted)]">Advertências</p>
                      <p className="font-serif text-[22px] font-semibold tabular-nums text-[var(--text-heading)]">{s.verbal + s.escrita}</p>
                    </div>
                    <div className="bg-[var(--bg-card)] px-4 py-3">
                      <p className="text-[12px] text-[var(--text-muted)]">Contatos com a família</p>
                      <p className="font-serif text-[22px] font-semibold tabular-nums text-[var(--text-heading)]">{s.meetings}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={UserCheck} disabled={busy} onClick={() => applyVerbal(ficha.id)}>
                Advertência verbal
              </Button>
              <Button size="sm" variant="secondary" icon={MessageSquare} onClick={() => openAction(ficha.id, 'convocacao')}>
                Convocar família
              </Button>
              <Button size="sm" variant="secondary" icon={Calendar} onClick={() => openAction(ficha.id, 'reuniao')}>
                Marcar reunião
              </Button>
              <Button size="sm" variant="ghost" icon={Scale} onClick={() => openAction(ficha.id, 'conselho')}>
                Relatório ao CT
              </Button>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-[var(--text-heading)]">Linha do tempo</p>
              {fichaOcc.length === 0 ? (
                <p className="text-[13px] text-[var(--text-muted)]">Nenhum registro.</p>
              ) : (
                <ol className="space-y-2">
                  {fichaOcc.map((o) => (
                    <li key={o.id} className="flex gap-3 rounded-2xl border border-[var(--border)] p-3">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: o.measure ? 'var(--accent)' : isGrave(o.gravity) ? '#B42318' : '#A15C07' }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-semibold text-[var(--text-heading)]">{o.title}</p>
                          <span className="text-[12px] tabular-nums text-[var(--text-muted)]">
                            {fmtDate(o.date)}
                            {o.time ? ` · ${o.time}` : ''}
                          </span>
                        </div>
                        {o.description && <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--text-body)]">{o.description}</p>}
                        {o.reporter && <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{o.measure ? 'Medida' : 'Registrado'} por {o.reporter}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Convocação */}
      <Modal
        open={Boolean(convoke)}
        onClose={() => !busy && setConvokeId(null)}
        size="md"
        icon={<MessageSquare className="h-5 w-5" />}
        title="Convocar a família"
        subtitle={convoke?.name}
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setConvokeId(null)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={saveConvocation}>
              Registrar
            </Button>
          </>
        }
      >
        {convoke && (
          <div className="space-y-4">
            {modalError && <Alert tone="danger">{modalError}</Alert>}
            <Segmented
              label="Tipo"
              value={convokeType}
              onChange={setConvokeType}
              items={[
                { id: 'comunicado', label: 'Comunicado' },
                { id: 'convite', label: 'Convite para reunião' },
                { id: 'registro', label: 'Só registrar' },
              ]}
            />
            <div className="rounded-2xl bg-[var(--bg-card-alt)] p-4 text-[14px] leading-relaxed text-[var(--text-body)]">{convokeText(convoke)}</div>
            <p className="text-[12px] text-[var(--text-muted)]">
              Fica registrado no histórico do estudante. Para a família receber pelo app, envie também em Comunicação → Convocações
              {toWhatsapp(convoke.phone) ? ' ou pelo WhatsApp abaixo' : ''}.
            </p>
            {toWhatsapp(convoke.phone) && convokeType !== 'registro' && (
              <a
                href={`https://wa.me/${toWhatsapp(convoke.phone)}?text=${encodeURIComponent(convokeText(convoke))}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold"
                style={{ background: '#E7F6EE', color: '#127A4B' }}
              >
                <Phone className="h-4 w-4" /> Abrir no WhatsApp
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* Reunião */}
      <Modal
        open={Boolean(meeting)}
        onClose={() => !busy && setMeetingId(null)}
        size="md"
        icon={<Calendar className="h-5 w-5" />}
        title="Marcar reunião com a família"
        subtitle={meeting?.name}
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setMeetingId(null)}>
              Cancelar
            </Button>
            <Button loading={busy} disabled={!meetingDate || !meetingTime} onClick={saveMeeting}>
              Marcar reunião
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {modalError && <Alert tone="danger">{modalError}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data" required>
              {(id) => <input id={id} type="date" min={localISO()} value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className={inputCls} />}
            </Field>
            <Field label="Horário" required>
              {(id) => <input id={id} type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className={inputCls} />}
            </Field>
          </div>
          <Field label="Pauta" hint="Entra na agenda da escola e no histórico do estudante.">
            {(id) => (
              <textarea
                id={id}
                rows={3}
                placeholder="O que será conversado com os responsáveis"
                value={meetingAgenda}
                onChange={(e) => setMeetingAgenda(e.target.value)}
                className={cx(inputCls, 'resize-y')}
              />
            )}
          </Field>
        </div>
      </Modal>

      {/* Relatório ao Conselho Tutelar */}
      <Modal
        open={Boolean(report)}
        onClose={() => !busy && setReportId(null)}
        size="lg"
        icon={<Scale className="h-5 w-5" />}
        title="Relatório ao Conselho Tutelar"
        subtitle="Gerado com os registros do sistema. Revise, imprima e assine."
        footer={
          <>
            <Button variant="secondary" icon={Printer} onClick={printReport}>
              Imprimir
            </Button>
            <Button loading={busy} onClick={saveReferral}>
              Registrar encaminhamento
            </Button>
          </>
        }
      >
        {report && (
          <div className="space-y-3">
            {modalError && <Alert tone="danger">{modalError}</Alert>}
            <div id="relatorio-conselho-tutelar" className="max-h-[55vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-white p-6 font-serif text-[13px] leading-relaxed text-[#101828]">
              <div className="center border-b border-[#101828] pb-3 text-center">
                <h2 className="text-[17px] font-semibold">{schoolInfo?.name || 'Unidade escolar'}</h2>
                <p className="mt-1 text-[13px] font-semibold">Relatório de acompanhamento disciplinar — encaminhamento ao Conselho Tutelar</p>
                <p className="muted text-[12px] text-[#667085]">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
              </div>

              <h3 className="mt-5 bg-[#F2F4F7] px-2 py-1 font-sans text-[13px] font-semibold">1. Identificação</h3>
              <table className="mt-2 w-full border-collapse font-sans text-[12px]">
                <tbody>
                  {[
                    ['Estudante', report.name],
                    ['Turma', report.grade || '—'],
                    ['Turno', report.shift || '—'],
                    ['Responsável', report.guardian || '—'],
                    ['Telefone', report.phone || '—'],
                  ].map(([l, v]) => (
                    <tr key={l}>
                      <th className="w-40 border border-[#D0D5DD] bg-[#F9FAFB] px-2 py-1.5 text-left font-semibold">{l}</th>
                      <td className="border border-[#D0D5DD] px-2 py-1.5">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="mt-5 bg-[#F2F4F7] px-2 py-1 font-sans text-[13px] font-semibold">2. Resumo do ano letivo</h3>
              <table className="mt-2 w-full border-collapse text-center font-sans text-[12px]">
                <thead>
                  <tr>
                    {['Ocorrências', 'Graves', 'Adv. verbais', 'Adv. escritas', 'Contatos com a família'].map((h) => (
                      <th key={h} className="border border-[#D0D5DD] bg-[#F9FAFB] px-2 py-1.5 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {[reportStats.occurrences, reportStats.graves, reportStats.verbal, reportStats.escrita, reportStats.meetings].map((v, i) => (
                      <td key={i} className="border border-[#D0D5DD] px-2 py-1.5 text-[14px] font-semibold">
                        {v}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              <h3 className="mt-5 bg-[#F2F4F7] px-2 py-1 font-sans text-[13px] font-semibold">3. Ocorrências registradas</h3>
              {reportOcc.length === 0 ? (
                <p className="mt-2 font-sans text-[12px] text-[#667085]">Nenhuma ocorrência registrada.</p>
              ) : (
                <table className="mt-2 w-full border-collapse font-sans text-[12px]">
                  <thead>
                    <tr>
                      {['Data', 'Ocorrência', 'Registrado por'].map((h) => (
                        <th key={h} className="border border-[#D0D5DD] bg-[#F9FAFB] px-2 py-1.5 text-left font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportOcc.map((o) => (
                      <tr key={o.id}>
                        <td className="whitespace-nowrap border border-[#D0D5DD] px-2 py-1.5 align-top">{fmtDate(o.date)}</td>
                        <td className="border border-[#D0D5DD] px-2 py-1.5 align-top">
                          <strong>{o.title}</strong>
                          {o.description ? ` — ${o.description}` : ''}
                        </td>
                        <td className="border border-[#D0D5DD] px-2 py-1.5 align-top">{o.reporter || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <h3 className="mt-5 bg-[#F2F4F7] px-2 py-1 font-sans text-[13px] font-semibold">4. Medidas tomadas pela escola</h3>
              {reportMeasures.length === 0 ? (
                <p className="mt-2 font-sans text-[12px] text-[#667085]">Nenhuma medida registrada no sistema.</p>
              ) : (
                <ul className="mt-2 list-inside list-disc font-sans text-[12px]">
                  {reportMeasures.map((m) => (
                    <li key={m.id}>
                      {fmtDate(m.date)} — {m.title}
                      {m.description ? `: ${m.description}` : ''}
                    </li>
                  ))}
                </ul>
              )}

              <div className="sig mt-16 flex justify-around font-sans text-[12px]">
                <div className="w-52 border-t border-[#101828] pt-1.5 text-center">Direção</div>
                <div className="w-52 border-t border-[#101828] pt-1.5 text-center">Coordenação pedagógica</div>
              </div>
            </div>
            <p className="text-[12px] text-[var(--text-muted)]">“Registrar encaminhamento” grava no histórico que o relatório foi emitido. O envio ao Conselho Tutelar continua sendo feito pela escola.</p>
          </div>
        )}
      </Modal>

      <Toast message={toast?.text ?? null} tone={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}

export default CentroDisciplinarClassium;