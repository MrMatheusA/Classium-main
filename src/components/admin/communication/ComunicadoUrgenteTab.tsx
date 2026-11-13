import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldAlert,
  Smartphone,
  Truck,
  User,
  UserCheck,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { AudienceStudent, AudienceClass, publishOrganizationAnnouncement } from '../../../services/communicationRpcService';
import {
  destinatariosDosEstudantes,
  enviarWhatsApp,
  formatarTelefoneBR,
  textoParaWhatsApp,
  type WhatsAppDestinatario,
} from '../../../services/whatsapp/clarixzapService';
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

/** Se o portal não responder em 20 s, libera a tela (o WhatsApp segue independente). */
const PORTAL_TIMEOUT_MS = 20000;

const STUDENT_PLACEHOLDER = '[nome do estudante]';
const CLASS_PLACEHOLDER = '[turma]';

type ChannelResult = { ok: boolean; text: string } | null;

/* ------------------------------------------------------------------ */
/* Peças memoizadas: digitar a mensagem não redesenha a lista de alunos */
/* ------------------------------------------------------------------ */

const ModelGrid = memo(function ModelGrid({ selectedId, onSelect }: { selectedId: string; onSelect: (m: UrgentModel) => void }) {
  return (
    <Card>
      <CardHeader icon={Bell} title="1. O que aconteceu?" subtitle="Escolha um modelo. Você pode ajustar o texto depois." />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {URGENT_MODELS.map((model) => {
          const Icon = model.icon;
          const isSelected = selectedId === model.id;
          const s = SEVERITY[model.defaultSeverity];
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onSelect(model)}
              aria-pressed={isSelected}
              title={model.description}
              className={cx(
                'group flex min-h-[104px] flex-col justify-between rounded-2xl border p-3 text-left transition-[border-color,background-color,transform] duration-200',
                isSelected
                  ? 'border-[#D92D20] bg-[#FEF3F2]'
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
  );
});

const StudentRow = memo(function StudentRow({
  student,
  selected,
  onSelect,
}: {
  student: AudienceStudent;
  selected: boolean;
  onSelect: (s: AudienceStudent) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(student)}
        aria-pressed={selected}
        className={cx(
          'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
          selected ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-card-alt)]',
        )}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-semibold"
          style={selected ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : { background: 'var(--bg-card-alt)', color: 'var(--text-body)' }}
        >
          {(student.name || '?').substring(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-[var(--text-heading)]">{student.name || 'Sem nome'}</span>
          <span className="block truncate text-[12px] text-[var(--text-muted)]">
            {student.class_name || 'Sem turma'}
            {student.registration_code ? ` · ${student.registration_code}` : ''}
          </span>
        </span>
        {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
      </button>
    </li>
  );
});

const StudentPicker = memo(function StudentPicker({
  students,
  selected,
  phones,
  onSelect,
}: {
  students: AudienceStudent[];
  selected: AudienceStudent | null;
  phones: WhatsAppDestinatario[];
  onSelect: (s: AudienceStudent) => void;
}) {
  // A busca mora aqui: digitar não redesenha o resto da tela
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search);

  // Índice pronto (minúsculas) — calculado uma vez por lista, não a cada tecla
  const index = useMemo(
    () =>
      students.map((s) => ({
        s,
        key: `${s.name || ''} ${s.registration_code || ''} ${s.class_name || ''}`.toLowerCase(),
      })),
    [students],
  );

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    if (!q) return students.slice(0, 8);
    const out: AudienceStudent[] = [];
    for (const it of index) {
      if (it.key.includes(q)) {
        out.push(it.s);
        if (out.length >= 12) break;
      }
    }
    return out;
  }, [deferred, index, students]);

  const handleSelect = useCallback(
    (s: AudienceStudent) => {
      setSearch('');
      onSelect(s);
    },
    [onSelect],
  );

  const sAny = selected as any;

  return (
    <Card className="lg:col-span-5">
      <CardHeader icon={User} title="2. Para quem?" subtitle="O aviso vai para os responsáveis do estudante" />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
        ) : filtered.length === 0 ? (
          <li className="px-4 py-6 text-center text-[13px] text-[var(--text-muted)]">Ninguém encontrado com “{search}”.</li>
        ) : (
          filtered.map((s) => <StudentRow key={s.id} student={s} selected={selected?.id === s.id} onSelect={handleSelect} />)
        )}
      </ul>

      <AnimatePresence mode="wait" initial={false}>
        {selected ? (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] text-[var(--text-muted)]">Estudante</p>
                <p className="truncate text-[15px] font-semibold text-[var(--text-heading)]">{selected.name}</p>
              </div>
              {selected.class_name && <Badge>{selected.class_name}</Badge>}
            </div>
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <p className="text-[12px] text-[var(--text-muted)]">Responsável</p>
              {sAny.guardian_name ? (
                <>
                  <p className="text-[14px] font-semibold text-[var(--text-heading)]">{sAny.guardian_name}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[var(--text-body)]">
                    {sAny.guardian_phone && (
                      <a href={`tel:${sAny.guardian_phone}`} className="flex items-center gap-1.5 hover:text-[var(--accent)]">
                        <Phone className="h-3.5 w-3.5" />
                        {sAny.guardian_phone}
                      </a>
                    )}
                    {sAny.guardian_email && (
                      <a href={`mailto:${sAny.guardian_email}`} className="flex min-w-0 items-center gap-1.5 hover:text-[var(--accent)]">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{sAny.guardian_email}</span>
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-[#A15C07]">Nenhum responsável vinculado. O aviso fica registrado no cadastro do estudante.</p>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                <MessageCircle className="h-3.5 w-3.5 text-[#128C4A]" />
                {phones.length > 0
                  ? `${phones.length} ${phones.length === 1 ? 'número' : 'números'} de WhatsApp: ${phones.map((p) => formatarTelefoneBR(p.telefone)).join(', ')}`
                  : 'Sem celular cadastrado para WhatsApp.'}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.p
            key="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 rounded-2xl border border-dashed border-[var(--border)] px-4 py-5 text-center text-[13px] text-[var(--text-muted)]"
          >
            Escolha um estudante na lista.
          </motion.p>
        )}
      </AnimatePresence>
    </Card>
  );
});

function ChannelToggle({
  icon: Icon,
  label,
  hint,
  checked,
  disabled,
  onChange,
  color,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <label
      className={cx(
        'flex flex-1 cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors',
        checked ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--bg-card)]',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1A`, color }}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-[var(--text-heading)]">{label}</span>
        <span className="block text-[12px] text-[var(--text-muted)]">{hint}</span>
      </span>
      <span
        aria-hidden
        className={cx(
          'mt-1 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]',
        )}
      >
        <span className={cx('h-4 w-4 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </span>
    </label>
  );
}

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

function ComunicadoUrgenteTabImpl({
  realStudents,
  schoolName,
  senderName,
  senderRole,
  organizationId,
  onSuccessPublished,
}: ComunicadoUrgenteTabProps) {
  const students = useMemo(() => (Array.isArray(realStudents) ? realStudents.filter(Boolean) : []), [realStudents]);

  const [selectedModel, setSelectedModel] = useState<UrgentModel>(URGENT_MODELS[0]);
  // ninguém começa selecionado: um comunicado urgente nunca deve ir para o aluno errado
  const [selectedStudent, setSelectedStudent] = useState<AudienceStudent | null>(null);

  const [subject, setSubject] = useState<string>(URGENT_MODELS[0].subject);
  const [severity, setSeverity] = useState<Severity>(URGENT_MODELS[0].defaultSeverity);
  const [message, setMessage] = useState<string>(() => URGENT_MODELS[0].defaultMessage(STUDENT_PLACEHOLDER, CLASS_PLACEHOLDER, schoolName));
  const messageEditedRef = useRef(false);

  const [viaPortal, setViaPortal] = useState(true);
  const [viaWhatsApp, setViaWhatsApp] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [portalResult, setPortalResult] = useState<ChannelResult>(null);
  const [whatsResult, setWhatsResult] = useState<ChannelResult>(null);

  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  // refs para manter os callbacks estáveis (os filhos memoizados não redesenham)
  const modelRef = useRef(selectedModel);
  modelRef.current = selectedModel;
  const studentRef = useRef(selectedStudent);
  studentRef.current = selectedStudent;

  const phones = useMemo(() => (selectedStudent ? destinatariosDosEstudantes([selectedStudent as any]) : []), [selectedStudent]);

  const handleSelectModel = useCallback(
    (model: UrgentModel) => {
      setSelectedModel(model);
      setSubject(model.subject);
      setSeverity(model.defaultSeverity);
      const s = studentRef.current;
      setMessage(model.defaultMessage(s?.name || STUDENT_PLACEHOLDER, s?.class_name || CLASS_PLACEHOLDER, schoolName));
      messageEditedRef.current = false;
    },
    [schoolName],
  );

  const handleSelectStudent = useCallback(
    (student: AudienceStudent) => {
      setSelectedStudent(student);
      setFormError(null);
      setPortalResult(null);
      setWhatsResult(null);
      // só reescreve o texto se a pessoa ainda não editou à mão
      if (!messageEditedRef.current) {
        setMessage(modelRef.current.defaultMessage(student.name || 'Estudante', student.class_name || 'Turma', schoolName));
      }
    },
    [schoolName],
  );

  const openConfirm = () => {
    if (!selectedStudent) return setFormError('Escolha o estudante antes de enviar.');
    if (!subject.trim() || !message.trim()) return setFormError('Preencha o assunto e a mensagem.');
    if (message.includes(STUDENT_PLACEHOLDER) || message.includes(CLASS_PLACEHOLDER)) {
      return setFormError('A mensagem ainda tem campos entre colchetes. Escolha o estudante ou edite o texto.');
    }
    if (!viaPortal && !viaWhatsApp) return setFormError('Escolha pelo menos um canal de envio.');
    if (!viaPortal && viaWhatsApp && phones.length === 0) {
      return setFormError('Este estudante não tem celular de responsável cadastrado. Ative o Portal da Família ou cadastre o telefone.');
    }
    setFormError(null);
    setShowConfirmModal(true);
  };

  const sendPortal = async (student: AudienceStudent): Promise<{ ok: boolean; text: string; announcementId?: string }> => {
    const request = publishOrganizationAnnouncement({
      p_title: subject.trim(),
      p_body: message.trim(),
      p_type_code: 'urgent',
      p_severity: severity,
      p_priority: 'urgent',
      p_category: 'Urgente / Saúde',
      p_mode: 'students',
      p_student_ids: [student.id],
      p_guardian_ids: student.guardian_id ? [student.guardian_id] : undefined,
      p_target_student_id: student.id,
      p_target_student_name: student.name || null,
      p_target_student_label: student.name ? `Para: ${student.name.split(' ')[0]}` : null,
      p_requires_acknowledgment: true,
      p_publish_now: true,
      p_sender_name: senderName,
      p_sender_role: senderRole,
      organization_id: organizationId,
    } as any);

    const timeout = new Promise<{ error: string }>((resolve) =>
      window.setTimeout(() => resolve({ error: 'O portal demorou para responder. Confira em Envios antes de tentar de novo.' }), PORTAL_TIMEOUT_MS),
    );
    const res: any = await Promise.race([request, timeout]);
    if (res?.error) return { ok: false, text: String(res.error) };
    return { ok: true, text: 'Publicado na aba Urgentes do Portal da Família.', announcementId: res?.data?.announcement_id };
  };

  const sendWhats = async (announcementId?: string): Promise<{ ok: boolean; text: string }> => {
    const texto = textoParaWhatsApp({
      titulo: `🚨 ${subject.trim()}`,
      corpo: message.trim(),
      assinatura: [senderName, senderRole].filter(Boolean).join(' · '),
      escola: schoolName,
    });
    const res = await enviarWhatsApp({ texto, destinatarios: phones, origem: 'urgente', organizationId, announcementId });
    if (res.error) return { ok: false, text: res.error };
    const d = res.data!;
    if (d.enviados > 0 && d.falhas === 0) return { ok: true, text: `WhatsApp enviado para ${d.enviados} ${d.enviados === 1 ? 'número' : 'números'}.` };
    if (d.enviados > 0) return { ok: true, text: `WhatsApp: ${d.enviados} enviado(s), ${d.falhas} com falha.` };
    if (d.na_fila > 0) return { ok: true, text: `WhatsApp na fila (${d.na_fila}). Sai em instantes.` };
    return { ok: false, text: 'O WhatsApp não aceitou o envio. Confira o número do responsável.' };
  };

  const handleConfirmSend = async () => {
    const student = selectedStudent;
    if (!student || isSubmitting) return;
    setIsSubmitting(true);
    setPortalResult(null);
    setWhatsResult(null);

    // Os dois canais saem em paralelo: se um travar, o outro não espera.
    const portalP = viaPortal ? sendPortal(student) : Promise.resolve(null);
    const whatsP = viaWhatsApp && phones.length > 0 ? sendWhats() : Promise.resolve(null);
    const [p, w] = await Promise.allSettled([portalP, whatsP]);
    if (!mounted.current) return;

    const pr = p.status === 'fulfilled' ? p.value : { ok: false, text: (p.reason as any)?.message || 'Falha ao publicar no portal.' };
    const wr = w.status === 'fulfilled' ? w.value : { ok: false, text: (w.reason as any)?.message || 'Falha ao enviar WhatsApp.' };
    setPortalResult(pr);
    setWhatsResult(wr);
    setIsSubmitting(false);

    const algumOk = (pr && pr.ok) || (wr && wr.ok);
    if (algumOk) {
      setShowConfirmModal(false);
      onSuccessPublished?.();
    }
  };

  const sev = SEVERITY[severity];
  const now = new Date();
  const channelsSummary = [viaPortal && 'Portal da Família', viaWhatsApp && 'WhatsApp'].filter(Boolean).join(' + ');

  return (
    <div className="space-y-6 text-left">
      {/* Topo */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#F5C2C0] bg-[var(--bg-card)] p-5 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#FDECEC] opacity-80 blur-2xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#D92D20] text-white shadow-[0_12px_24px_-12px_rgba(217,45,32,0.7)]">
              <AlertTriangle className="h-6 w-6" />
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F97066] opacity-70 motion-reduce:animate-none" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-[#F04438]" />
              </span>
            </span>
            <div>
              <h2 className="font-serif text-[24px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)]">Comunicado urgente</h2>
              <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-[var(--text-muted)]">
                Chega na hora para a família: no Portal da Família (aba Urgentes, com confirmação de leitura) e no WhatsApp do responsável.
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

      {/* Resultado do envio, por canal */}
      <AnimatePresence initial={false}>
        {(portalResult || whatsResult) && !isSubmitting && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-2">
            {portalResult && (
              <Alert
                tone={portalResult.ok ? 'success' : 'danger'}
                action={
                  <button type="button" onClick={() => setPortalResult(null)} aria-label="Fechar aviso" className="rounded-full p-1.5 opacity-70 hover:opacity-100">
                    <X className="h-4 w-4" />
                  </button>
                }
              >
                <strong>Portal:</strong> {portalResult.text}
              </Alert>
            )}
            {whatsResult && (
              <Alert
                tone={whatsResult.ok ? 'success' : 'danger'}
                action={
                  <button type="button" onClick={() => setWhatsResult(null)} aria-label="Fechar aviso" className="rounded-full p-1.5 opacity-70 hover:opacity-100">
                    <X className="h-4 w-4" />
                  </button>
                }
              >
                <strong>WhatsApp:</strong> {whatsResult.text}
              </Alert>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ModelGrid selectedId={selectedModel.id} onSelect={handleSelectModel} />

      <div className="grid gap-6 lg:grid-cols-12">
        <StudentPicker students={students} selected={selectedStudent} phones={phones} onSelect={handleSelectStudent} />

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
                    messageEditedRef.current = true;
                  }}
                  className={cx(inputCls, 'resize-y leading-relaxed')}
                />
              )}
            </Field>

            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Enviar por</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <ChannelToggle
                  icon={Smartphone}
                  label="Portal da Família"
                  hint="Aba Urgentes, pede confirmação de leitura"
                  checked={viaPortal}
                  onChange={setViaPortal}
                  color="#1D4ED8"
                />
                <ChannelToggle
                  icon={MessageCircle}
                  label="WhatsApp"
                  hint={
                    !selectedStudent
                      ? 'Pelo número da escola (ClarixZap)'
                      : phones.length > 0
                        ? `${phones.length} ${phones.length === 1 ? 'número' : 'números'} do responsável`
                        : 'Sem celular cadastrado'
                  }
                  checked={viaWhatsApp}
                  onChange={setViaWhatsApp}
                  color="#128C4A"
                />
              </div>
            </div>

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
                    Vai para os responsáveis de <strong className="text-[var(--text-heading)]">{selectedStudent.name}</strong>
                    {channelsSummary ? ` por ${channelsSummary}` : ''}.
                  </>
                ) : (
                  'Escolha o estudante para liberar o envio.'
                )}
              </p>
              <button
                type="button"
                onClick={openConfirm}
                disabled={isSubmitting}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#D92D20] px-6 text-[14px] font-semibold text-white shadow-[0_12px_24px_-14px_rgba(217,45,32,0.8)] transition-[background-color,transform] hover:bg-[#B42318] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#D92D20] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#B42318] disabled:opacity-60"
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
            <dd className="text-right text-[var(--text-heading)]">{(selectedStudent as any)?.guardian_name || 'Não vinculado'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--text-muted)]">Canais</dt>
            <dd className="text-right text-[var(--text-heading)]">
              {channelsSummary}
              {viaWhatsApp && phones.length > 0 && (
                <span className="block text-[12px] text-[var(--text-muted)]">{phones.map((p) => formatarTelefoneBR(p.telefone)).join(', ')}</span>
              )}
              {viaWhatsApp && phones.length === 0 && <span className="block text-[12px] text-[#A15C07]">Sem celular: WhatsApp não será enviado</span>}
            </dd>
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
          {(portalResult && !portalResult.ok) || (whatsResult && !whatsResult.ok) ? (
            <div className="space-y-1 rounded-2xl border border-[#F5C2C0] bg-[#FEF3F2] p-3 text-[13px] text-[#B42318]">
              {portalResult && !portalResult.ok && (
                <p className="flex items-start gap-1.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> Portal: {portalResult.text}
                </p>
              )}
              {whatsResult && !whatsResult.ok && (
                <p className="flex items-start gap-1.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> WhatsApp: {whatsResult.text}
                </p>
              )}
            </div>
          ) : null}
        </dl>
      </Modal>
    </div>
  );
}

/** memo: o editor de Comunicação redesenha muito; esta aba só redesenha quando as props mudam */
export const ComunicadoUrgenteTab = memo(ComunicadoUrgenteTabImpl);
