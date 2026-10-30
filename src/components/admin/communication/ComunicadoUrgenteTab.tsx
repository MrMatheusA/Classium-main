import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  FileWarning,
  HeartPulse,
  Mail,
  Phone,
  Search,
  Send,
  ShieldAlert,
  Truck,
  User,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AudienceStudent, AudienceClass, publishOrganizationAnnouncement } from '../../../services/communicationRpcService';
import { Alert, Badge, Button, Card, CardHeader, Field, Modal, cx, inputCls, EASE } from '../../ui/kit';

/* ------------------------------------------------------------------ */
/* Modelos                                                             */
/* ------------------------------------------------------------------ */

type Severity = 'EMERGÊNCIA' | 'ALTA PRIORIDADE' | 'ATENÇÃO';

export interface UrgentModel {
  id: string;
  title: string;
  subject: string;
  defaultSeverity: Severity;
  icon: LucideIcon;
  description: string;
  defaultMessage: (studentName: string, className: string, schoolName: string) => string;
}

export const URGENT_MODELS: UrgentModel[] = [
  {
    id: 'estudante-passou-mal',
    title: 'Estudante passou mal',
    subject: 'Urgente: estudante em atendimento na escola',
    defaultSeverity: 'EMERGÊNCIA',
    icon: HeartPulse,
    description: 'Febre, indisposição ou outro sintoma em observação.',
    defaultMessage: (s, c) =>
      `Prezados responsáveis por ${s} (${c}),\n\nComunicamos que ${s} está sendo atendido(a) na escola por indisposição. A equipe já prestou os primeiros cuidados. Pedimos que um responsável compareça à recepção assim que possível para acompanhar e, se necessário, fazer a retirada.`,
  },
  {
    id: 'retirada-imediata',
    title: 'Retirada imediata',
    subject: 'Urgente: pedido de retirada do estudante',
    defaultSeverity: 'EMERGÊNCIA',
    icon: AlertTriangle,
    description: 'Pede que um responsável venha buscar o aluno agora.',
    defaultMessage: (s, c) =>
      `Prezados responsáveis por ${s} (${c}),\n\nA coordenação pede que um responsável, com documento, compareça à portaria principal para a retirada de ${s} o quanto antes.`,
  },
  {
    id: 'acidente-escola',
    title: 'Acidente na escola',
    subject: 'Urgente: ocorrência com primeiros socorros',
    defaultSeverity: 'EMERGÊNCIA',
    icon: ShieldAlert,
    description: 'Queda, machucado ou incidente com atendimento inicial.',
    defaultMessage: (s, c) =>
      `Prezados responsáveis por ${s} (${c}),\n\nDurante as atividades de hoje, ${s} teve um pequeno acidente. A equipe fez o atendimento de primeiros socorros e ${s} está calmo(a) e acompanhado(a). Pedimos que entrem em contato ou venham até a escola.`,
  },
  {
    id: 'alteracao-saida-emergencial',
    title: 'Mudança no horário de saída',
    subject: 'Aviso urgente: alteração no horário de saída',
    defaultSeverity: 'ALTA PRIORIDADE',
    icon: Clock,
    description: 'Saída antecipada ou atrasada por motivo externo.',
    defaultMessage: (_s, c) =>
      `Prezados responsáveis da turma ${c},\n\nPor um motivo excepcional, as aulas de hoje terminarão mais cedo. Pedimos que se organizem para a retirada dos estudantes ou fiquem atentos ao transporte escolar.`,
  },
  {
    id: 'escola-sem-funcionamento',
    title: 'Escola sem aula',
    subject: 'Urgente: suspensão das aulas',
    defaultSeverity: 'EMERGÊNCIA',
    icon: Building2,
    description: 'Falta de água, de energia ou manutenção imprevista.',
    defaultMessage: () =>
      `Prezada comunidade escolar,\n\nDevido à falta de água/energia sem previsão de retorno, as aulas presenciais estão suspensas temporariamente para garantir a segurança de todos. Avisaremos assim que tudo voltar ao normal.`,
  },
  {
    id: 'suspensao-atividade',
    title: 'Atividade cancelada',
    subject: 'Urgente: atividade cancelada hoje',
    defaultSeverity: 'ATENÇÃO',
    icon: AlertCircle,
    description: 'Contraturno, treino ou aula de campo cancelados.',
    defaultMessage: () =>
      `Prezados responsáveis,\n\nA atividade prevista para hoje foi cancelada. Os estudantes ficarão na escola, com supervisão, até o horário normal de saída.`,
  },
  {
    id: 'problema-transporte',
    title: 'Problema no transporte',
    subject: 'Alerta: atraso no transporte escolar',
    defaultSeverity: 'ALTA PRIORIDADE',
    icon: Truck,
    description: 'Quebra, trânsito ou troca de veículo.',
    defaultMessage: (_s, c) =>
      `Prezados responsáveis,\n\nO transporte escolar que atende a turma ${c} teve um imprevisto. Os estudantes estão em segurança e a equipe acompanha o trajeto. O atraso estimado é de 30 a 45 minutos.`,
  },
  {
    id: 'mudanca-local',
    title: 'Mudança de local',
    subject: 'Aviso urgente: mudança no local de entrada/saída',
    defaultSeverity: 'ALTA PRIORIDADE',
    icon: AlertTriangle,
    description: 'Outro portão ou ponto de encontro, por um tempo.',
    defaultMessage: (_s, c) =>
      `Prezados responsáveis,\n\nPor causa de obras, a entrada e a saída da turma ${c} serão feitas temporariamente pelo Portão B (rua lateral). Contamos com a atenção de todos.`,
  },
  {
    id: 'ocorrencia-contato',
    title: 'Pedir contato do responsável',
    subject: 'Urgente: a coordenação pede seu contato',
    defaultSeverity: 'ALTA PRIORIDADE',
    icon: Phone,
    description: 'A coordenação precisa falar com a família.',
    defaultMessage: (s) =>
      `Prezados responsáveis por ${s},\n\nA coordenação pede que um dos responsáveis entre em contato com a escola o quanto antes para conversarmos sobre uma situação ocorrida hoje.`,
  },
  {
    id: 'documento-urgente',
    title: 'Documento urgente',
    subject: 'Urgente: documento pendente do estudante',
    defaultSeverity: 'ATENÇÃO',
    icon: FileWarning,
    description: 'Laudo, declaração ou documento cadastral obrigatório.',
    defaultMessage: (s, c) =>
      `Prezados responsáveis por ${s} (${c}),\n\nFalta um documento obrigatório (laudo/declaração) no cadastro de ${s}. Pedimos o envio pelo Portal da Família ou a entrega na secretaria.`,
  },
  {
    id: 'aguardando-responsavel',
    title: 'Aluno esperando responsável',
    subject: 'Urgente: estudante aguardando na secretaria',
    defaultSeverity: 'EMERGÊNCIA',
    icon: UserCheck,
    description: 'Passou do horário de saída e ninguém veio buscar.',
    defaultMessage: (s) =>
      `Prezados responsáveis por ${s},\n\nO horário de saída já passou e ${s} está na secretaria, acompanhado(a), aguardando a família. Pedimos que venham buscá-lo(a) agora.`,
  },
  {
    id: 'situacao-excepcional',
    title: 'Situação excepcional',
    subject: 'Comunicado urgente da direção',
    defaultSeverity: 'EMERGÊNCIA',
    icon: AlertTriangle,
    description: 'Fato grave e imprevisto que a comunidade precisa saber.',
    defaultMessage: () =>
      `Prezados responsáveis e comunidade escolar,\n\nA direção envia este comunicado em caráter de urgência para orientar sobre um procedimento de segurança.`,
  },
  {
    id: 'outro-urgente',
    title: 'Outro assunto',
    subject: 'Comunicado urgente da escola',
    defaultSeverity: 'ALTA PRIORIDADE',
    icon: Bell,
    description: 'Escreva a mensagem do seu jeito.',
    defaultMessage: (s) => `Prezados responsáveis por ${s},\n\nInformamos com urgência que...`,
  },
];

const SEVERITY: Record<Severity, { label: string; tone: 'danger' | 'warning' | 'accent'; bg: string; fg: string }> = {
  EMERGÊNCIA: { label: 'Emergência', tone: 'danger', bg: '#FDECEC', fg: '#B42318' },
  'ALTA PRIORIDADE': { label: 'Alta prioridade', tone: 'warning', bg: '#FEF4E6', fg: '#A15C07' },
  ATENÇÃO: { label: 'Atenção', tone: 'accent', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
};

/** se o envio não responder em 25 s, libera a tela em vez de travar */
const SEND_TIMEOUT_MS = 25000;

const STUDENT_PLACEHOLDER = '[nome do estudante]';
const CLASS_PLACEHOLDER = '[turma]';

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

interface ComunicadoUrgenteTabProps {
  realStudents: AudienceStudent[];
  realClasses: AudienceClass[];
  schoolName: string;
  senderName: string;
  senderRole: string;
  organizationId?: string;
  onSuccessPublished?: () => void;
}

export function ComunicadoUrgenteTab({
  realStudents,
  schoolName,
  senderName,
  senderRole,
  organizationId,
  onSuccessPublished,
}: ComunicadoUrgenteTabProps) {
  const students = useMemo(() => (Array.isArray(realStudents) ? realStudents.filter(Boolean) : []), [realStudents]);

  // Fluxo
  const [selectedModel, setSelectedModel] = useState<UrgentModel>(URGENT_MODELS[0]);
  const [studentSearch, setStudentSearch] = useState<string>('');
  // ninguém começa selecionado: um comunicado urgente nunca deve ir para o aluno errado
  const [selectedStudent, setSelectedStudent] = useState<AudienceStudent | null>(null);

  // Formulário
  const [subject, setSubject] = useState<string>(URGENT_MODELS[0].subject);
  const [severity, setSeverity] = useState<Severity>(URGENT_MODELS[0].defaultSeverity);
  const [message, setMessage] = useState<string>(() => URGENT_MODELS[0].defaultMessage(STUDENT_PLACEHOLDER, CLASS_PLACEHOLDER, schoolName));
  const [messageEdited, setMessageEdited] = useState(false);

  // Envio
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  // A busca roda "atrás" da digitação: a tela não engasga com listas grandes
  const deferredSearch = useDeferredValue(studentSearch);

  const filteredStudents = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return students.slice(0, 8);
    const out: AudienceStudent[] = [];
    for (const s of students) {
      const name = (s.name || '').toLowerCase();
      const code = (s.registration_code || '').toLowerCase();
      const cls = (s.class_name || '').toLowerCase();
      if (name.includes(q) || code.includes(q) || cls.includes(q)) {
        out.push(s);
        if (out.length >= 12) break; // para cedo: não percorre a lista inteira à toa
      }
    }
    return out;
  }, [deferredSearch, students]);

  const studentName = selectedStudent?.name || STUDENT_PLACEHOLDER;
  const className = selectedStudent?.class_name || CLASS_PLACEHOLDER;

  const applyModel = (model: UrgentModel, sName: string, cName: string) => {
    setMessage(model.defaultMessage(sName, cName, schoolName));
    setMessageEdited(false);
  };

  const handleSelectModel = (model: UrgentModel) => {
    setSelectedModel(model);
    setSubject(model.subject);
    setSeverity(model.defaultSeverity);
    applyModel(model, studentName, className);
  };

  const handleSelectStudent = (student: AudienceStudent) => {
    setSelectedStudent(student);
    setStudentSearch('');
    setFormError(null);
    // só reescreve o texto se a pessoa ainda não editou à mão
    if (!messageEdited) applyModel(selectedModel, student.name || 'Estudante', student.class_name || 'Turma');
  };

  const openConfirm = () => {
    if (!selectedStudent) return setFormError('Escolha o estudante antes de enviar.');
    if (!subject.trim() || !message.trim()) return setFormError('Preencha o assunto e a mensagem.');
    if (message.includes(STUDENT_PLACEHOLDER) || message.includes(CLASS_PLACEHOLDER)) {
      return setFormError('A mensagem ainda tem campos entre colchetes. Escolha o estudante ou edite o texto.');
    }
    setFormError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (!selectedStudent || isSubmitting) return;
    setIsSubmitting(true);
    setStatus({ tone: 'info', text: 'Enviando o comunicado…' });

    try {
      const request = publishOrganizationAnnouncement({
        p_title: subject.trim(),
        p_body: message.trim(),
        p_type_code: 'urgent',
        p_severity: severity,
        p_priority: 'urgent',
        p_category: 'Urgente / Saúde',
        p_mode: 'students',
        p_student_ids: [selectedStudent.id],
        p_guardian_ids: selectedStudent.guardian_id ? [selectedStudent.guardian_id] : undefined,
        p_target_student_id: selectedStudent.id,
        p_target_student_name: selectedStudent.name || null,
        p_target_student_label: selectedStudent.name ? `Para: ${selectedStudent.name.split(' ')[0]}` : null,
        p_requires_acknowledgment: true,
        p_publish_now: true,
        p_sender_name: senderName,
        p_sender_role: senderRole,
        organization_id: organizationId,
      });

      const timeout = new Promise<{ error: string }>((resolve) =>
        window.setTimeout(() => resolve({ error: 'O servidor demorou para responder. Confira na lista de envios antes de tentar de novo.' }), SEND_TIMEOUT_MS),
      );

      const res: any = await Promise.race([request, timeout]);
      if (!mounted.current) return;

      if (res?.error) {
        setStatus({ tone: 'danger', text: String(res.error) });
      } else {
        setShowConfirmModal(false);
        setStatus({ tone: 'success', text: `Enviado para a família de ${selectedStudent.name}. O aviso aparece em Urgentes no Portal da Família.` });
        onSuccessPublished?.();
      }
    } catch (err: any) {
      if (!mounted.current) return;
      setStatus({ tone: 'danger', text: err?.message || 'Não foi possível enviar. Tente de novo.' });
    } finally {
      if (mounted.current) setIsSubmitting(false);
    }
  };

  const sev = SEVERITY[severity];
  const now = new Date();

  return (
    <div className="space-y-6 text-left">
      {/* Topo */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#F5C2C0] bg-[var(--bg-card)] p-5 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#FDECEC] blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#D92D20] text-white shadow-[0_12px_24px_-12px_rgba(217,45,32,0.7)]">
              <AlertTriangle className="h-6 w-6" />
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F97066] opacity-70" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-[#F04438]" />
              </span>
            </span>
            <div>
              <h2 className="font-serif text-[24px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)]">Comunicado urgente</h2>
              <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-[var(--text-muted)]">
                Chega na hora para a família, em destaque na aba Urgentes do Portal da Família, e pede confirmação de leitura.
              </p>
            </div>
          </div>

          <div className="w-full md:w-60">
            <Field label="Gravidade">
              {(id) => (
                <select id={id} value={severity} onChange={(e) => setSeverity(e.target.value as Severity)} className={inputCls}>
                  <option value="EMERGÊNCIA">Emergência</option>
                  <option value="ALTA PRIORIDADE">Alta prioridade</option>
                  <option value="ATENÇÃO">Atenção</option>
                </select>
              )}
            </Field>
          </div>
        </div>
      </section>

      {/* Situação do envio */}
      <AnimatePresence>
        {status && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <Alert
              tone={status.tone === 'info' ? 'info' : status.tone}
              action={
                !isSubmitting ? (
                  <button type="button" onClick={() => setStatus(null)} aria-label="Fechar aviso" className="rounded-full p-1.5 opacity-70 hover:opacity-100">
                    <X className="h-4 w-4" />
                  </button>
                ) : undefined
              }
            >
              {status.text}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Modelo */}
      <Card>
        <CardHeader icon={Bell} title="1. O que aconteceu?" subtitle="Escolha um modelo. Você pode ajustar o texto depois." />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {URGENT_MODELS.map((model) => {
            const Icon = model.icon;
            const isSelected = selectedModel.id === model.id;
            const s = SEVERITY[model.defaultSeverity];
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => handleSelectModel(model)}
                aria-pressed={isSelected}
                title={model.description}
                className={cx(
                  'group flex min-h-[104px] flex-col justify-between rounded-2xl border p-3 text-left transition-all duration-200',
                  isSelected
                    ? 'border-[#D92D20] bg-[#FEF3F2] shadow-[0_14px_28px_-20px_rgba(217,45,32,0.7)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] hover:-translate-y-0.5 hover:border-[#F5C2C0]',
                )}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
                  style={isSelected ? { background: '#D92D20', color: '#fff' } : { background: s.bg, color: s.fg }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold leading-snug text-[var(--text-heading)]">{model.title}</span>
                  <span className="mt-0.5 block text-[11px] font-medium" style={{ color: s.fg }}>
                    {s.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 2. Estudante */}
        <Card className="lg:col-span-5">
          <CardHeader icon={User} title="2. Para quem?" subtitle="O aviso vai para os responsáveis do estudante" />

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              aria-label="Buscar estudante"
              placeholder="Nome, matrícula ou turma"
              className={cx(inputCls, 'pl-10')}
            />
          </div>

          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1" aria-label="Estudantes">
            {students.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-[13px] text-[var(--text-muted)]">
                Nenhum estudante carregado.
              </li>
            ) : filteredStudents.length === 0 ? (
              <li className="px-4 py-6 text-center text-[13px] text-[var(--text-muted)]">Ninguém encontrado com “{studentSearch}”.</li>
            ) : (
              filteredStudents.map((s) => {
                const isSelected = selectedStudent?.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectStudent(s)}
                      aria-pressed={isSelected}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
                        isSelected ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-card-alt)]',
                      )}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-semibold"
                        style={isSelected ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : { background: 'var(--bg-card-alt)', color: 'var(--text-body)' }}
                      >
                        {(s.name || '?').substring(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-[var(--text-heading)]">{s.name || 'Sem nome'}</span>
                        <span className="block truncate text-[12px] text-[var(--text-muted)]">
                          {s.class_name || 'Sem turma'}
                          {s.registration_code ? ` · ${s.registration_code}` : ''}
                        </span>
                      </span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <AnimatePresence mode="wait">
            {selectedStudent ? (
              <motion.div
                key={selectedStudent.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] text-[var(--text-muted)]">Estudante</p>
                    <p className="truncate text-[15px] font-semibold text-[var(--text-heading)]">{selectedStudent.name}</p>
                  </div>
                  {selectedStudent.class_name && <Badge>{selectedStudent.class_name}</Badge>}
                </div>
                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  <p className="text-[12px] text-[var(--text-muted)]">Responsável</p>
                  {selectedStudent.guardian_name ? (
                    <>
                      <p className="text-[14px] font-semibold text-[var(--text-heading)]">{selectedStudent.guardian_name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[var(--text-body)]">
                        {selectedStudent.guardian_phone && (
                          <a href={`tel:${selectedStudent.guardian_phone}`} className="flex items-center gap-1.5 hover:text-[var(--accent)]">
                            <Phone className="h-3.5 w-3.5" />
                            {selectedStudent.guardian_phone}
                          </a>
                        )}
                        {selectedStudent.guardian_email && (
                          <a href={`mailto:${selectedStudent.guardian_email}`} className="flex min-w-0 items-center gap-1.5 hover:text-[var(--accent)]">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{selectedStudent.guardian_email}</span>
                          </a>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] text-[#A15C07]">Nenhum responsável vinculado. O aviso fica registrado no cadastro do estudante.</p>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-2xl border border-dashed border-[var(--border)] px-4 py-5 text-center text-[13px] text-[var(--text-muted)]">
                Escolha um estudante na lista.
              </motion.p>
            )}
          </AnimatePresence>
        </Card>

        {/* 3. Mensagem */}
        <Card className="lg:col-span-7">
          <CardHeader icon={Send} title="3. Mensagem" subtitle="Revise antes de enviar" action={<Badge tone={sev.tone}>{sev.label}</Badge>} />

          <div className="space-y-4">
            <Field label="Assunto">
              {(id) => <input id={id} type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={cx(inputCls, 'font-semibold')} />}
            </Field>

            <Field label="Texto">
              {(id) => (
                <textarea
                  id={id}
                  rows={8}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setMessageEdited(true);
                  }}
                  className={cx(inputCls, 'resize-y leading-relaxed')}
                />
              )}
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--bg-card-alt)] px-4 py-3 text-[13px]">
              <span className="text-[var(--text-body)]">
                <strong className="text-[var(--text-heading)]">{senderName || 'Coordenação'}</strong> · {senderRole || 'Direção'}
                {schoolName ? ` · ${schoolName}` : ''}
              </span>
              <span className="text-[var(--text-muted)]">
                {now.toLocaleDateString('pt-BR')} às {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {formError && <Alert tone="warning">{formError}</Alert>}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-[var(--text-muted)]">
                {selectedStudent ? (
                  <>
                    Vai para os responsáveis de <strong className="text-[var(--text-heading)]">{selectedStudent.name}</strong>.
                  </>
                ) : (
                  'Escolha o estudante para liberar o envio.'
                )}
              </p>
              <button
                type="button"
                onClick={openConfirm}
                disabled={isSubmitting}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#D92D20] px-6 text-[14px] font-semibold text-white shadow-[0_12px_24px_-14px_rgba(217,45,32,0.8)] transition-all hover:bg-[#B42318] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Revisar e enviar
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Confirmação */}
      <Modal
        open={showConfirmModal}
        onClose={() => !isSubmitting && setShowConfirmModal(false)}
        size="md"
        title="Enviar comunicado urgente?"
        subtitle="Confira antes: a família recebe na hora."
        icon={
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FDECEC] text-[#B42318]">
            <AlertTriangle className="h-5 w-5" />
          </span>
        }
        footer={
          <>
            <Button variant="secondary" disabled={isSubmitting} onClick={() => setShowConfirmModal(false)}>
              Voltar e editar
            </Button>
            <button
              type="button"
              onClick={handleConfirmSend}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#D92D20] px-5 text-[14px] font-semibold text-white transition-all hover:bg-[#B42318] disabled:opacity-60"
            >
              {isSubmitting ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSubmitting ? 'Enviando…' : 'Enviar agora'}
            </button>
          </>
        }
      >
        <dl className="space-y-3 text-[14px]">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--text-muted)]">Estudante</dt>
            <dd className="text-right font-semibold text-[var(--text-heading)]">{selectedStudent?.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--text-muted)]">Turma</dt>
            <dd className="text-right text-[var(--text-heading)]">{selectedStudent?.class_name || 'Sem turma'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--text-muted)]">Responsável</dt>
            <dd className="text-right text-[var(--text-heading)]">{selectedStudent?.guardian_name || 'Não vinculado'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--text-muted)]">Gravidade</dt>
            <dd>
              <Badge tone={sev.tone}>{sev.label}</Badge>
            </dd>
          </div>
          <div className="border-t border-[var(--border)] pt-3">
            <dt className="text-[var(--text-muted)]">Assunto</dt>
            <dd className="mt-0.5 font-semibold text-[var(--text-heading)]">{subject}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Mensagem</dt>
            <dd className="mt-1 max-h-40 overflow-y-auto whitespace-pre-line rounded-2xl bg-[var(--bg-card-alt)] p-3 text-[13px] leading-relaxed text-[var(--text-body)]">{message}</dd>
          </div>
        </dl>
      </Modal>
    </div>
  );
}