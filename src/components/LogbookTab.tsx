import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Award, Check, History, NotebookPen, Search, Send, Shield, ShieldAlert, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { conductRoutineRadarService } from '../services/conductRoutineRadarService';
import { Alert, Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Toast, Toggle, cx, inputCls } from './ui/kit';
import { ModuleHeader, Segmented } from './ui/ModuleParts';

export interface StudentConductItem {
  id: string;
  name: string;
  points: number;
  ra?: string;
  photoUrl?: string;
}

export interface OccurrenceItem {
  id: string;
  studentId: string;
  studentName?: string;
  classId: string;
  teacherId?: string;
  occurrenceDate: string;
  type: string;
  severity: string;
  description: string;
  actionsTaken?: string;
  status: string;
  pointsDeducted: number;
  isPositive?: boolean;
  createdAt: string;
}

export interface LogbookTabProps {
  classId?: string;
  teacherId?: string;
  teacherName?: string;
  teacherSubject?: string;
  students?: Array<{ id: string; name: string; points?: number; ra?: string; photoUrl?: string }>;
  disciplineName?: string;
  onStudentPointsUpdate?: (studentId: string, newPoints: number) => void;
  classesList?: Array<{
    id: string;
    name: string;
    room: string;
    shift: string;
    subject: string;
    studentsCount?: number;
    inProgress?: boolean;
    isReference?: boolean;
  }>;
  onSelectClass?: (classId: string) => void;
  selectedClassName?: string;
  substitutionInfo?: { className: string; shift: string; room: string } | null;
  onOpenShiftModal?: () => void;
}

/** Cada estudante começa o período com 20 pontos de comportamento */
const MAX_POINTS = 20;
const DEDUCTION = { leve: 0.5, media: 1.0, gravissima: 2.0 } as const;

const NEGATIVE_ITEMS = {
  leve: [
    'Atraso injustificado (até 15 min)',
    'Falta de material didático',
    'Conversas paralelas excessivas',
    'Uso de boné/capuz em sala',
    'Comer/beber sem autorização',
    'Desatenção repetitiva',
    'Brincadeiras inadequadas leves',
    'Ausência de tarefa de casa',
    'Desorganização de espaço',
    'Gritos no corredor',
    'Uso indevido de fones de ouvido',
    'Interrupção constante da aula',
    'Demora no retorno do intervalo',
  ],
  media: [
    'Uso não autorizado de celular',
    'Linguagem imprópria/palavrões',
    'Desrespeito leve a colegas',
    'Recusa em realizar atividade',
    'Atraso superior a 15 minutos',
    'Ausência não autorizada da sala',
    'Danos leves ao patrimônio',
    'Cópia em atividades/tarefas',
    'Uso incorreto do uniforme',
    'Atitude desafiadora leve',
    'Comportamento inadequado na quadra',
    'Desrespeito às regras do refeitório',
    'Uso indevido de equipamentos (PCs/Labs)',
  ],
  gravissima: [
    'Agressão física a colegas/equipe',
    'Agressão verbal/ofensa grave',
    'Bullying/Cyberbullying comprovado',
    'Danos graves/vandalismo',
    'Fraude em avaliação formal',
    'Saída da escola sem autorização',
    'Posse de objetos perigosos',
  ],
};

const POSITIVE_ITEMS = [
  'Participação excepcional',
  'Liderança positiva em grupo',
  'Auxílio a colegas com dificuldade',
  'Melhora significativa de nota',
  'Iniciativa voluntária de apoio',
  'Entrega antecipada de projeto',
  'Postura proativa',
  'Criatividade na resolução',
  'Organização impecável',
  'Empatia e solidariedade',
  'Responsabilidade cívica',
  'Destaque em apresentação',
  'Superação de limite pessoal',
];

const LEVELS = [
  { id: 'leve' as const, label: 'Leves', hint: `-${DEDUCTION.leve.toFixed(1).replace('.', ',')} ponto`, bg: '#E7F6EE', fg: '#127A4B' },
  { id: 'media' as const, label: 'Médias', hint: `-${DEDUCTION.media.toFixed(1).replace('.', ',')} ponto`, bg: '#FEF4E6', fg: '#A15C07' },
  { id: 'gravissima' as const, label: 'Gravíssimas', hint: `-${DEDUCTION.gravissima.toFixed(1).replace('.', ',')} pontos e aviso à coordenação`, bg: '#FDECEC', fg: '#B42318' },
];

/** Período letivo atual (três por ano: jan–abr, mai–ago, set–dez) */
function currentPeriod() {
  const now = new Date();
  const m = now.getMonth() + 1;
  return { quarter: m <= 4 ? 1 : m <= 8 ? 2 : 3, year: now.getFullYear() };
}

const localISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtPts = (n: number) => n.toFixed(1).replace('.', ',');

export function LogbookTab({
  classId = '',
  teacherId = '',
  teacherName = '',
  teacherSubject = '',
  students = [],
  onStudentPointsUpdate,
  classesList = [],
  onSelectClass,
  selectedClassName,
  substitutionInfo,
}: LogbookTabProps) {
  const { quarter, year } = currentPeriod();

  const [studentsList, setStudentsList] = useState<StudentConductItem[]>(() =>
    students.map((s) => ({ id: s.id, name: s.name, points: typeof s.points === 'number' ? s.points : MAX_POINTS, ra: s.ra || '', photoUrl: s.photoUrl || '' })),
  );

  const fetchStudentScores = useCallback(async () => {
    if (!students || students.length === 0) return;
    try {
      const studentIds = students.map((s) => s.id);
      const { data: scoresData, error: scoresErr } = await supabase
        .from('student_conduct_quarterly_scores')
        .select('student_id, current_balance, points_lost, quarter, year')
        .in('student_id', studentIds)
        .eq('quarter', quarter)
        .eq('year', year);

      const scoreMap: Record<string, number> = {};
      if (!scoresErr && scoresData) {
        scoresData.forEach((row: any) => {
          if (row.student_id && typeof row.current_balance === 'number') scoreMap[row.student_id] = Number(row.current_balance);
        });
      }

      const { data: occData } = await supabase
        .from('occurrences')
        .select('student_id, points_deducted, is_positive, quarter, year')
        .in('student_id', studentIds)
        .eq('quarter', quarter)
        .eq('year', year);

      const fallbackDeductions: Record<string, number> = {};
      (occData || []).forEach((o: any) => {
        if (!o.is_positive && typeof o.points_deducted === 'number') {
          fallbackDeductions[o.student_id] = (fallbackDeductions[o.student_id] || 0) + o.points_deducted;
        }
      });

      setStudentsList((prev) =>
        prev.map((s) => {
          let pts = MAX_POINTS;
          if (scoreMap[s.id] !== undefined) pts = scoreMap[s.id];
          else if (fallbackDeductions[s.id] !== undefined) pts = Math.max(0, MAX_POINTS - fallbackDeductions[s.id]);
          else if (typeof s.points === 'number' && s.points <= MAX_POINTS) pts = s.points;
          return { ...s, points: pts };
        }),
      );
    } catch (err) {
      console.warn('Error fetching student conduct scores:', err);
    }
  }, [students, quarter, year]);

  useEffect(() => {
    setStudentsList(students.map((s) => ({ id: s.id, name: s.name, points: typeof s.points === 'number' ? s.points : MAX_POINTS, ra: s.ra || '', photoUrl: s.photoUrl || '' })));
    if (students.length > 0) fetchStudentScores();
  }, [students, fetchStudentScores]);

  useEffect(() => {
    if (!classId) return;
    const scoresChannel = supabase
      .channel(`docente_logbook_scores_${classId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_conduct_quarterly_scores' }, () => fetchStudentScores())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_conduct_movements' }, () => fetchStudentScores())
      .subscribe();
    return () => {
      supabase.removeChannel(scoresChannel);
    };
  }, [classId, fetchStudentScores]);

  /* ---------------- Registro ---------------- */

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentQuery, setStudentQuery] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [isSavingOcc, setIsSavingOcc] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
  const [occurrencesHistory, setOccurrencesHistory] = useState<OccurrenceItem[]>([]);
  const [occurrenceFilter, setOccurrenceFilter] = useState<'all' | 'leve' | 'media' | 'gravissima' | 'positiva'>('all');

  const [selectedNegatives, setSelectedNegatives] = useState<Record<string, boolean>>({});
  const [selectedPositives, setSelectedPositives] = useState<Record<string, boolean>>({});
  const [notifyFamily, setNotifyFamily] = useState<boolean>(true);
  const [alertPedagogical, setAlertPedagogical] = useState<boolean>(true);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Se o estudante escolhido não está mais na turma, limpa a escolha
  useEffect(() => {
    if (selectedStudentId && !studentsList.some((s) => s.id === selectedStudentId)) setSelectedStudentId('');
  }, [studentsList, selectedStudentId]);

  const fetchOccurrences = useCallback(async () => {
    if (!classId) return;
    try {
      const res = await fetch(`/api/teacher/daily-log/history/occurrences/${classId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.history)) {
          setOccurrencesHistory(json.history);
          return;
        }
      }
      const { data, error } = await supabase.from('occurrences').select('*').eq('class_id', classId).order('created_at', { ascending: false }).limit(30);
      if (!error && data) {
        setOccurrencesHistory(
          data.map((o: any) => ({
            id: o.id,
            studentId: o.student_id,
            studentName: o.student_name || 'Estudante',
            classId: o.class_id,
            teacherId: o.teacher_id,
            occurrenceDate: o.occurrence_date ? String(o.occurrence_date).split('T')[0] : localISO(),
            type: o.type || 'Disciplinar',
            severity: o.severity || 'Leve',
            description: o.description,
            actionsTaken: o.actions_taken,
            status: o.status || 'Registrada',
            pointsDeducted: o.points_deducted || 0,
            isPositive: o.type === 'Positiva' || o.severity === 'Elogio',
            createdAt: o.created_at,
          })),
        );
      }
    } catch (e) {
      console.warn('Error fetching occurrences', e);
    }
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    fetchOccurrences();
    const channel = supabase
      .channel(`occurrences_realtime_${classId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'occurrences', filter: `class_id=eq.${classId}` }, () => fetchOccurrences())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, fetchOccurrences]);

  const toggleNegative = (item: string) => setSelectedNegatives((prev) => ({ ...prev, [item]: !prev[item] }));
  const togglePositive = (item: string) => setSelectedPositives((prev) => ({ ...prev, [item]: !prev[item] }));

  const chosenNegatives = Object.keys(selectedNegatives).filter((k) => selectedNegatives[k]);
  const chosenPositives = Object.keys(selectedPositives).filter((k) => selectedPositives[k]);
  const hasGravissima = chosenNegatives.some((k) => NEGATIVE_ITEMS.gravissima.includes(k));

  const preview = useMemo((): { deduction: number; severity: 'Leve' | 'Média' | 'Gravíssima' | 'Elogio'; isPositive: boolean } => {
    let deduction = 0;
    let severity = 'Leve' as 'Leve' | 'Média' | 'Gravíssima' | 'Elogio';
    chosenNegatives.forEach((k) => {
      if (NEGATIVE_ITEMS.leve.includes(k)) deduction += DEDUCTION.leve;
      else if (NEGATIVE_ITEMS.media.includes(k)) {
        deduction += DEDUCTION.media;
        if (severity !== 'Gravíssima') severity = 'Média';
      } else if (NEGATIVE_ITEMS.gravissima.includes(k)) {
        deduction += DEDUCTION.gravissima;
        severity = 'Gravíssima';
      }
    });
    const isPositive = chosenNegatives.length === 0 && chosenPositives.length > 0;
    if (isPositive) severity = 'Elogio';
    return { deduction, severity, isPositive };
  }, [chosenNegatives, chosenPositives]);

  const selectedStudent = studentsList.find((s) => s.id === selectedStudentId) || null;

  const handleSaveOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return setFormError('Escolha o estudante.');
    if (chosenNegatives.length === 0 && chosenPositives.length === 0 && !detailedDescription.trim()) {
      return setFormError('Marque pelo menos um item ou escreva o que aconteceu.');
    }
    if (!classId) return setFormError('Escolha a turma antes de registrar.');
    setFormError(null);

    const { deduction, severity, isPositive } = preview;
    const descriptions = [...chosenNegatives, ...chosenPositives];
    const fullDescription = descriptions.join('; ') + (detailedDescription.trim() ? `${descriptions.length ? ' | ' : ''}Obs: ${detailedDescription.trim()}` : '');
    const newPoints = Math.max(0, selectedStudent.points - deduction);
    const idempotencyKey = `occ_${selectedStudent.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const normOccType = isPositive ? 'elogio' : hasGravissima ? 'gravissima' : severity === 'Média' ? 'media' : 'leve';
    const actions = isPositive ? 'Elogio registrado' : hasGravissima ? 'Aviso à coordenação e aos responsáveis' : 'Registro de conduta';

    setIsSavingOcc(true);
    try {
      // 1. Diário do professor (servidor)
      try {
        await fetch('/api/teacher/daily-log/occurrences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: selectedStudent.id,
            studentName: selectedStudent.name,
            classId,
            teacherId,
            occurrenceDate: localISO(),
            type: isPositive ? 'Positiva' : 'Disciplinar',
            severity,
            description: fullDescription,
            actionsTaken: actions,
            status: 'Registrada',
            pointsDeducted: deduction,
            isPositive,
            notifyFamily,
            alertPedagogical,
            idempotencyKey,
          }),
        });
      } catch (apiErr) {
        console.warn('Teacher log occurrence API note:', apiErr);
      }

      // 2. Registro oficial de conduta (atualiza a pontuação)
      await conductRoutineRadarService.recordOccurrence({
        studentId: selectedStudent.id,
        classId,
        teacherId,
        recordType: normOccType as any,
        title: isPositive ? 'Elogio' : `Advertência ${severity.toLowerCase()}`,
        description: fullDescription,
        actionsTaken: actions,
        occurrenceDate: localISO(),
        quarter,
        year,
        recordedByName: teacherName || 'Professor',
        idempotencyKey,
      });

      setStudentsList((prev) => prev.map((s) => (s.id === selectedStudent.id ? { ...s, points: newPoints } : s)));
      onStudentPointsUpdate?.(selectedStudent.id, newPoints);

      setToast({
        text: isPositive ? `Elogio registrado para ${selectedStudent.name}.` : `Registrado para ${selectedStudent.name}: -${fmtPts(deduction)} ponto(s). Agora com ${fmtPts(newPoints)}.`,
        type: 'success',
      });
      setSelectedNegatives({});
      setSelectedPositives({});
      setDetailedDescription('');
      fetchOccurrences();
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'Não foi possível registrar. Nada foi descontado; tente de novo.');
    } finally {
      setIsSavingOcc(false);
    }
  };

  /* ---------------- Tela ---------------- */

  const currentClassInfo = classesList.find((c) => c.id === classId);
  const activeClassDisplayName = selectedClassName || currentClassInfo?.name || substitutionInfo?.className || '';
  const activeClassRoom = currentClassInfo?.room || substitutionInfo?.room || '';

  const filteredOccurrences = occurrencesHistory.filter((item) => {
    if (occurrenceFilter === 'all') return true;
    if (occurrenceFilter === 'positiva') return item.isPositive || item.severity === 'Elogio';
    if (occurrenceFilter === 'leve') return item.severity === 'Leve';
    if (occurrenceFilter === 'media') return item.severity === 'Média';
    if (occurrenceFilter === 'gravissima') return item.severity === 'Gravíssima';
    return true;
  });

  const visibleStudents = useMemo(() => {
    const q = studentQuery.toLowerCase().trim();
    return q ? studentsList.filter((s) => s.name.toLowerCase().includes(q)) : studentsList;
  }, [studentsList, studentQuery]);

  const shiftLabel = (shift?: string) => {
    const s = (shift || '').toLowerCase();
    if (s.includes('mat')) return 'Manhã';
    if (s.includes('vesp')) return 'Tarde';
    if (s.includes('not')) return 'Noite';
    return shift || '';
  };

  const pointsTone = (p: number) => (p >= 16 ? '#127A4B' : p >= 10 ? '#A15C07' : '#B42318');

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12 text-left">
      <ModuleHeader
        icon={NotebookPen}
        title="Diário de bordo"
        text={`Registre a conduta da turma. Cada estudante começa o período com ${MAX_POINTS} pontos; as advertências descontam e os elogios ficam no histórico.`}
      >
        <div className="flex flex-col gap-4 border-t border-[var(--border)] pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-heading)]">
              <Users className="h-4 w-4 text-[var(--accent)]" /> Minhas turmas
            </p>
            <p className="text-[12px] text-[var(--text-muted)]">{[teacherName, teacherSubject].filter(Boolean).join(' · ')}</p>
          </div>
          {substitutionInfo && (
            <Alert tone="info">
              Você está substituindo em <strong>{substitutionInfo.className}</strong>
              {substitutionInfo.room ? ` · ${substitutionInfo.room}` : ''}.
            </Alert>
          )}
          {classesList.length === 0 ? (
            <p className="rounded-2xl bg-[var(--bg-card-alt)] px-4 py-3 text-[13px] text-[var(--text-muted)]">Nenhuma turma vinculada a você ainda.</p>
          ) : (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {classesList.map((turma) => {
                const isSelected = classId === turma.id && !substitutionInfo;
                return (
                  <button
                    key={turma.id}
                    type="button"
                    onClick={() => onSelectClass?.(turma.id)}
                    aria-pressed={isSelected}
                    className={cx(
                      'min-w-[190px] shrink-0 rounded-2xl border px-4 py-3 text-left transition-all',
                      isSelected ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-4 ring-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)]',
                    )}
                  >
                    <p className="flex items-center gap-1.5 truncate font-semibold text-[var(--text-heading)]">
                      {turma.name}
                      {turma.isReference && <Badge tone="accent">Referência</Badge>}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">
                      {[shiftLabel(turma.shift), turma.room, typeof turma.studentsCount === 'number' ? `${turma.studentsCount} estudantes` : ''].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ModuleHeader>

      {!classId ? (
        <EmptyState icon={Users} title="Escolha uma turma" text="Selecione uma das suas turmas acima para registrar a conduta dos estudantes." />
      ) : (
        <>
          <form onSubmit={handleSaveOccurrence} className="grid items-start gap-6 lg:grid-cols-12">
            {/* Estudantes */}
            <Card className="lg:sticky lg:top-4 lg:col-span-4" padded={false}>
              <div className="p-5 pb-3">
                <CardHeader icon={Users} title={activeClassDisplayName || 'Turma'} subtitle={[activeClassRoom, `${studentsList.length} estudantes`].filter(Boolean).join(' · ')} />
                <div className="relative -mt-2">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="search"
                    aria-label="Buscar estudante"
                    placeholder="Buscar estudante"
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    className={cx(inputCls, 'h-10 py-0 pl-10')}
                  />
                </div>
              </div>
              {studentsList.length === 0 ? (
                <p className="px-5 pb-5 text-[13px] text-[var(--text-muted)]">Nenhum estudante nesta turma.</p>
              ) : (
                <ul role="listbox" aria-label="Estudantes" className="max-h-[520px] overflow-y-auto px-2 pb-2">
                  {visibleStudents.map((s) => {
                    const active = s.id === selectedStudentId;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setSelectedStudentId(s.id);
                            setFormError(null);
                          }}
                          className={cx('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors', active ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-card-alt)]')}
                        >
                          {s.photoUrl ? <img src={s.photoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <Avatar name={s.name} size={36} />}
                          <span className="min-w-0 flex-1">
                            <span className={cx('block truncate text-[14px]', active ? 'font-semibold text-[var(--text-heading)]' : 'text-[var(--text-body)]')}>{s.name}</span>
                            {s.ra && <span className="block truncate text-[11px] text-[var(--text-muted)]">{s.ra}</span>}
                          </span>
                          <span className="shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: pointsTone(s.points) }}>
                            {fmtPts(s.points)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {visibleStudents.length === 0 && <li className="px-3 py-2 text-[13px] text-[var(--text-muted)]">Ninguém com esse nome.</li>}
                </ul>
              )}
            </Card>

            {/* Registro */}
            <div className="space-y-6 lg:col-span-8">
              <Card>
                {selectedStudent ? (
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <PointsGauge points={selectedStudent.points} after={chosenNegatives.length ? Math.max(0, selectedStudent.points - preview.deduction) : null} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-[var(--text-muted)]">Registrando para</p>
                      <h3 className="font-serif text-[22px] font-semibold leading-tight text-[var(--text-heading)]">{selectedStudent.name}</h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-muted)]">
                        Leve −{fmtPts(DEDUCTION.leve)} · Média −{fmtPts(DEDUCTION.media)} · Gravíssima −{fmtPts(DEDUCTION.gravissima)} e aviso à coordenação. Elogios não mudam a pontuação.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-[14px] text-[var(--text-muted)]">
                    <Shield className="h-5 w-5 text-[var(--accent)]" />
                    Escolha um estudante na lista para começar.
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader icon={AlertTriangle} title="Advertências" subtitle="Marque o que aconteceu" />
                <div className="space-y-5">
                  {LEVELS.map((lvl) => (
                    <fieldset key={lvl.id}>
                      <legend className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[var(--text-heading)]">
                        <span className="h-2 w-2 rounded-full" style={{ background: lvl.fg }} aria-hidden />
                        {lvl.label}
                        <span className="font-normal text-[var(--text-muted)]">{lvl.hint}</span>
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {NEGATIVE_ITEMS[lvl.id].map((item) => {
                          const on = Boolean(selectedNegatives[item]);
                          return (
                            <button
                              key={item}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleNegative(item)}
                              className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors', on ? 'border-transparent font-semibold' : 'border-[var(--border)] text-[var(--text-body)] hover:border-[var(--accent)]')}
                              style={on ? { background: lvl.bg, color: lvl.fg, boxShadow: `inset 0 0 0 1.5px ${lvl.fg}` } : undefined}
                            >
                              {on && <Check className="h-3.5 w-3.5" />}
                              {item}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
                {hasGravissima && (
                  <div className="mt-5">
                    <Alert tone="danger" title="Advertência gravíssima">
                      Ao registrar, a coordenação e os responsáveis serão avisados com prioridade.
                    </Alert>
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader icon={Award} title="Elogios" subtitle="Ficam no histórico do estudante" />
                <div className="flex flex-wrap gap-2">
                  {POSITIVE_ITEMS.map((item) => {
                    const on = Boolean(selectedPositives[item]);
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={on}
                        onClick={() => togglePositive(item)}
                        className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors', on ? 'border-transparent font-semibold' : 'border-[var(--border)] text-[var(--text-body)] hover:border-[var(--accent)]')}
                        style={on ? { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1.5px var(--accent)' } : undefined}
                      >
                        {on && <Check className="h-3.5 w-3.5" />}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <div className="space-y-4">
                  <Field label="Relato (opcional)">
                    {(id) => (
                      <textarea
                        id={id}
                        rows={3}
                        value={detailedDescription}
                        onChange={(e) => setDetailedDescription(e.target.value)}
                        placeholder="O que aconteceu, em poucas linhas"
                        className={cx(inputCls, 'resize-y')}
                      />
                    )}
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ToggleRow label="Avisar a família" hint="Aparece no Portal da Família" checked={notifyFamily} onChange={setNotifyFamily} />
                    <ToggleRow label="Enviar à coordenação" hint="Entra no radar pedagógico" checked={alertPedagogical} onChange={setAlertPedagogical} />
                  </div>
                  {formError && <Alert tone="danger">{formError}</Alert>}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                    <p className="text-[13px] text-[var(--text-muted)]">
                      {chosenNegatives.length + chosenPositives.length === 0
                        ? 'Nada marcado ainda.'
                        : preview.isPositive
                          ? `${chosenPositives.length} elogio(s)`
                          : `${chosenNegatives.length} advertência(s) · −${fmtPts(preview.deduction)} ponto(s)`}
                    </p>
                    <Button type="submit" icon={hasGravissima ? ShieldAlert : Send} loading={isSavingOcc} disabled={!selectedStudent} variant={hasGravissima ? 'danger' : 'primary'}>
                      Registrar
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </form>

          {/* Histórico */}
          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <History className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h2 className="text-[17px] font-semibold text-[var(--text-heading)]">Histórico da turma</h2>
                  <p className="text-[13px] text-[var(--text-muted)]">Últimos registros de {activeClassDisplayName || 'turma'}</p>
                </div>
              </div>
              <Segmented
                label="Filtro"
                value={occurrenceFilter}
                onChange={setOccurrenceFilter}
                items={[
                  { id: 'all', label: 'Todas', count: occurrencesHistory.length },
                  { id: 'leve', label: 'Leves' },
                  { id: 'media', label: 'Médias' },
                  { id: 'gravissima', label: 'Gravíssimas' },
                  { id: 'positiva', label: 'Elogios' },
                ]}
              />
            </div>
            {filteredOccurrences.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={History} title="Nenhum registro aqui" text="Os registros da turma aparecem nesta lista." compact />
              </div>
            ) : (
              <ul className="max-h-[440px] divide-y divide-[var(--border)] overflow-y-auto">
                {filteredOccurrences.map((occ) => {
                  const isPos = occ.isPositive || occ.severity === 'Elogio';
                  const tone = isPos ? 'accent' : occ.severity === 'Gravíssima' ? 'danger' : occ.severity === 'Média' ? 'warning' : 'success';
                  return (
                    <li key={occ.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                      <div className="flex min-w-0 gap-3">
                        <Avatar name={occ.studentName || 'Estudante'} size={36} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[var(--text-heading)]">{occ.studentName || 'Estudante'}</span>
                            <Badge tone={tone}>{isPos ? 'Elogio' : occ.severity}</Badge>
                            <span className="text-[12px] text-[var(--text-muted)]">{new Date(occ.occurrenceDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          </div>
                          <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-body)]">{occ.description}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums sm:pt-1" style={{ color: occ.pointsDeducted > 0 ? '#B42318' : 'var(--accent)' }}>
                        {occ.pointsDeducted > 0 ? `−${fmtPts(occ.pointsDeducted)}` : 'Elogio'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      <Toast message={toast?.text ?? null} tone={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}

function PointsGauge({ points, after }: { points: number; after: number | null }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const pct = (v: number) => Math.max(0, Math.min(MAX_POINTS, v)) / MAX_POINTS;
  const color = points >= 16 ? '#127A4B' : points >= 10 ? '#A15C07' : '#B42318';
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="56" cy="56" r={R} stroke="var(--bg-card-alt)" strokeWidth="10" fill="none" />
        {after !== null && <circle cx="56" cy="56" r={R} stroke="#F04438" strokeOpacity="0.35" strokeWidth="10" fill="none" strokeDasharray={C} strokeDashoffset={C - C * pct(points)} strokeLinecap="round" />}
        <circle
          cx="56"
          cy="56"
          r={R}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C - C * pct(after ?? points)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" role="img" aria-label={`${fmtPts(points)} de ${MAX_POINTS} pontos`}>
        <span className="font-serif text-[26px] font-semibold leading-none tabular-nums text-[var(--text-heading)]">{fmtPts(after ?? points)}</span>
        <span className="mt-1 text-[11px] text-[var(--text-muted)]">de {MAX_POINTS} pontos</span>
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 py-3">
      <span>
        <span className="block text-[14px] font-medium text-[var(--text-heading)]">{label}</span>
        <span className="block text-[12px] text-[var(--text-muted)]">{hint}</span>
      </span>
      <Toggle label={label} checked={checked} onChange={onChange} />
    </div>
  );
}