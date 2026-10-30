import React, { useEffect, useRef, useState } from 'react';
import { Calendar, CheckCircle2, Clock, HelpCircle, MapPin, Send } from 'lucide-react';
import { AudienceStudent, AudienceClass, publishOrganizationAnnouncement } from '../../../services/communicationRpcService';
import { Alert, Button, Card, CardHeader, Field, Modal, cx, inputCls } from '../../ui/kit';
import {
  AudiencePicker,
  ComposerHeader,
  ModelGrid,
  StatusBanner,
  TONES,
  ToneButton,
  cleanTitle,
  formatISODate,
  reachLabel,
  useReach,
  withTimeout,
  type AudienceState,
  type SendStatus,
  type TargetType,
} from './ComposerParts';

export interface ConvocationModel {
  id: string;
  title: string;
  defaultSubject: string;
  defaultLocation: string;
  defaultTime: string;
  description: string;
  defaultAgenda: (targetDesc: string, schoolName: string) => string;
}

export const CONVOCATION_MODELS: ConvocationModel[] = [
  {
    id: 'reuniao-individual',
    title: '1. Reunião individual',
    defaultSubject: 'CONVOCAÇÃO OFICIAL: Atendimento Pedagógico Individual',
    defaultLocation: 'Sala da Orientação Educacional — Bloco A',
    defaultTime: '14:30',
    description: 'Alinhamento individualizado de desenvolvimento discente.',
    defaultAgenda: (target, esc) => `A Equipe Pedagógica do ${esc} convoca os responsáveis pelo(a) estudante ${target} para reunião individualizada com a Orientação Educacional. Pauta: Acompanhamento da rotina de estudos, desempenho discente e alinhamento conjunto de metas pedagógicas.`
  },
  {
    id: 'reuniao-pedagogica',
    title: '2. Reunião pedagógica',
    defaultSubject: 'CONVOCAÇÃO: Reunião Pedagógica de Acompanhamento',
    defaultLocation: 'Auditório Principal',
    defaultTime: '19:00',
    description: 'Encontro periódico com corpo docente da turma.',
    defaultAgenda: (target, esc) => `Convidamos os pais e responsáveis da turma ${target} para a Reunião Pedagógica Trimestral. Abordaremos as diretrizes curriculares, projetos integradores e evolução do grupo discente.`
  },
  {
    id: 'entrega-resultados',
    title: '3. Entrega de resultados',
    defaultSubject: 'PLANTÃO PEDAGÓGICO: Entrega de Resultados e Boletins',
    defaultLocation: 'Salas de Aula / Ginásio Poliesportivo',
    defaultTime: '08:00 às 12:00',
    description: 'Plantão de atendimento presencial aos pais com boletim.',
    defaultAgenda: (target, esc) => `Convocamos os responsáveis por ${target} para o Plantão Pedagógico de Entrega de Resultados. Os professores estarão à disposição para atendimento individualizado e esclarecimento sobre as avaliações do período.`
  },
  {
    id: 'reuniao-responsaveis',
    title: '4. Reunião com responsáveis',
    defaultSubject: 'CONVOCAÇÃO GERAL: Reunião com Pais e Responsáveis',
    defaultLocation: 'Auditório Principal',
    defaultTime: '18:30',
    description: 'Comitê de pais, comunicados gerais e alinhamento anual.',
    defaultAgenda: (target, esc) => `A Direção do ${esc} convoca os responsáveis por ${target} para assembleia de alinhamento com a equipe diretiva.`
  },
  {
    id: 'palestras',
    title: '5. Palestras educativas',
    defaultSubject: 'CONVITE & CONVOCAÇÃO: Palestra com Especialistas',
    defaultLocation: 'Teatro Escolar / Transmissão Online',
    defaultTime: '19:30',
    description: 'Temas de parentalidade, inteligência emocional e convivência.',
    defaultAgenda: (target, esc) => `Convidamos as famílias para prestigiarem a palestra 'Educação Socioemocional e Segurança Digital na Infância e Juventude' no ${esc}.`
  },
  {
    id: 'eventos-escolares',
    title: '6. Eventos escolares',
    defaultSubject: 'CONVOCAÇÃO DE FAMÍLIAS: Mostra Cultural e Científica',
    defaultLocation: 'Pátio Central e Laboratórios',
    defaultTime: '09:00',
    description: 'Apresentação de trabalhos e mostras escolares.',
    defaultAgenda: (target, esc) => `Os estudantes da turma ${target} têm a honra de convidar seus familiares para a Mostra de Conhecimento do ${esc}.`
  },
  {
    id: 'orientacao-pedagogica',
    title: '7. Orientação pedagógica',
    defaultSubject: 'CONVOCAÇÃO PEDAGÓGICA: Atendimento com Professores Regentes',
    defaultLocation: 'Sala da Coordenação de Área',
    defaultTime: '15:00',
    description: 'Aconselhamento sobre recuperação e reforço escolar.',
    defaultAgenda: (target, esc) => `Solicitamos a presença dos responsáveis pelo(a) discente ${target} para alinhamento pedagógico e apresentação do plano de reforço escolar supervisionado.`
  },
  {
    id: 'atendimento-individual',
    title: '8. Atendimento individual',
    defaultSubject: 'CONVOCAÇÃO ESCOLAR: Atendimento Especializado',
    defaultLocation: 'Sala de Atendimento Educacional Especializado (AEE)',
    defaultTime: '16:00',
    description: 'Atendimento psicopedagógico e plano de desenvolvimento individual.',
    defaultAgenda: (target, esc) => `Convocamos para alinhamento dos planos de adaptação e suporte pedagógico individualizado do(a) discente ${target}.`
  },
  {
    id: 'reunioes-extraordinarias',
    title: '9. Reuniões extraordinárias',
    defaultSubject: 'CONVOCAÇÃO EXTRAORDINÁRIA DE RESPONSÁVEIS',
    defaultLocation: 'Sala de Conferências da Direção',
    defaultTime: '11:00',
    description: 'Pauta urgente e imprevista de interesse do colegiado.',
    defaultAgenda: (target, esc) => `A Direção Escolar do ${esc} convoca os responsáveis com urgência para deliberação de pauta extraordinária.`
  },
  {
    id: 'encontros-institucionais',
    title: '10. Encontros institucionais',
    defaultSubject: 'ENCONTRO INSTITUCIONAL: Família & Escola em Parceria',
    defaultLocation: 'Espaço de Convivência Escolar',
    defaultTime: '09:30',
    description: 'Café com a direção e conselho escolar.',
    defaultAgenda: (target, esc) => `A Direção convida os responsáveis por ${target} para nosso encontro matutino de integração e prestação de contas do ${esc}.`
  },
  {
    id: 'outros-eventos',
    title: '11. Outros eventos',
    defaultSubject: 'CONVOCAÇÃO ESCOLAR INSTITUCIONAL',
    defaultLocation: 'Unidade Central',
    defaultTime: '14:00',
    description: 'Convocação personalizada com pauta e local livres.',
    defaultAgenda: (target, esc) => `A Direção e Coordenação convocam os senhores responsáveis para reunião institucional.`
  }
];

const TONE = TONES.accent;
const TARGET_PLACEHOLDER = '[estudante]';

interface ConvocacoesTabProps {
  realStudents: AudienceStudent[];
  realClasses: AudienceClass[];
  schoolName: string;
  senderName: string;
  senderRole: string;
  organizationId?: string;
  onSuccessPublished?: () => void;
}

export function ConvocacoesTab({
  realStudents,
  realClasses,
  schoolName,
  senderName,
  senderRole,
  organizationId,
  onSuccessPublished,
}: ConvocacoesTabProps) {
  const students = Array.isArray(realStudents) ? realStudents : [];
  const classes = Array.isArray(realClasses) ? realClasses : [];

  const [selectedModel, setSelectedModel] = useState<ConvocationModel>(CONVOCATION_MODELS[0]);
  const [audience, setAudience] = useState<AudienceState>({
    targetType: 'student',
    selectedStudent: null,
    selectedClassId: '',
    selectedClassIds: [],
  });

  const [subject, setSubject] = useState<string>(CONVOCATION_MODELS[0].defaultSubject);
  const [eventDate, setEventDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [eventTime, setEventTime] = useState<string>(CONVOCATION_MODELS[0].defaultTime);
  const [eventLocation, setEventLocation] = useState<string>(CONVOCATION_MODELS[0].defaultLocation);
  const [agenda, setAgenda] = useState<string>(() => CONVOCATION_MODELS[0].defaultAgenda(TARGET_PLACEHOLDER, schoolName));
  const [agendaEdited, setAgendaEdited] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SendStatus>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const reach = useReach(students, audience);
  const reachText = reachLabel(reach.count, audience, ['família', 'famílias']);

  const targetLabelFor = (a: AudienceState) => {
    if (a.targetType === 'student') return a.selectedStudent?.name || TARGET_PLACEHOLDER;
    if (a.targetType === 'class') {
      const cl = classes.find((c) => c.id === a.selectedClassId);
      return cl ? `da turma ${cl.name}` : 'da turma';
    }
    return 'da comunidade escolar';
  };

  const refreshText = (model: ConvocationModel, a: AudienceState, force = false) => {
    if (agendaEdited && !force) return;
    setAgenda(model.defaultAgenda(targetLabelFor(a), schoolName));
    setAgendaEdited(false);
  };

  const updateAudience = (patch: Partial<AudienceState>) => {
    const next = { ...audience, ...patch };
    setAudience(next);
    setFormError(null);
    refreshText(selectedModel, next);
  };

  const handleSelectModel = (model: ConvocationModel) => {
    setSelectedModel(model);
    setSubject(model.defaultSubject);
    setEventLocation(model.defaultLocation);
    setEventTime(model.defaultTime);
    refreshText(model, audience, true);
  };

  const openConfirm = () => {
    if (!reach.canSend) return setFormError(audience.targetType === 'student' ? 'Escolha o estudante.' : 'Escolha pelo menos uma turma.');
    if (!subject.trim() || !agenda.trim() || !eventDate) return setFormError('Preencha o assunto, a data e a pauta.');
    if (agenda.includes(TARGET_PLACEHOLDER)) return setFormError('A pauta ainda tem [estudante]. Escolha o estudante ou edite o texto.');
    setFormError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStatus({ tone: 'info', text: 'Enviando a convocação…' });

    try {
      const { targetType, selectedStudent, selectedClassId, selectedClassIds } = audience;
      const mode = targetType === 'student' ? 'students' : targetType === 'all' ? 'all' : 'classes';
      const classIds = targetType === 'class' ? [selectedClassId] : targetType === 'multi' ? selectedClassIds : undefined;
      const studentIds = targetType === 'student' && selectedStudent ? [selectedStudent.id] : undefined;
      const single = targetType === 'student' ? selectedStudent : null;

      const res: any = await withTimeout(
        publishOrganizationAnnouncement({
          p_title: subject.trim(),
          p_body: agenda.trim(),
          p_type_code: 'convocation',
          p_priority: 'normal',
          p_category: 'Convocações & Reuniões',
          p_scheduled_date: eventDate,
          p_scheduled_time: eventTime,
          p_location: eventLocation,
          p_mode: mode,
          p_class_ids: classIds,
          p_student_ids: studentIds,
          p_target_student_id: single?.id || null,
          p_target_student_name: single?.name || null,
          p_target_student_label: single?.name ? `Para: ${single.name.split(' ')[0]}` : null,
          p_publish_now: true,
          p_sender_name: senderName,
          p_sender_role: senderRole,
          organization_id: organizationId,
        }),
      );
      if (!mounted.current) return;

      if (res?.error) {
        setStatus({ tone: 'danger', text: String(res.error) });
      } else {
        setShowConfirmModal(false);
        setStatus({ tone: 'success', text: `Convocação enviada para ${reachText}. As famílias confirmam presença pelo Portal da Família.` });
        onSuccessPublished?.();
      }
    } catch (err: any) {
      if (mounted.current) setStatus({ tone: 'danger', text: err?.message || 'Não foi possível enviar. Tente de novo.' });
    } finally {
      if (mounted.current) setIsSubmitting(false);
    }
  };

  const when = `${formatISODate(eventDate)}${eventTime ? ` às ${eventTime}` : ''}`;

  return (
    <div className="space-y-6 text-left">
      <ComposerHeader
        icon={Calendar}
        title="Convocações e reuniões"
        text="Chame as famílias com data, horário e local. Elas confirmam presença ou justificam a ausência pelo Portal da Família."
        tone={TONE}
      />

      <StatusBanner status={status} busy={isSubmitting} onClose={() => setStatus(null)} />

      <ModelGrid
        models={CONVOCATION_MODELS}
        selectedId={selectedModel.id}
        onSelect={handleSelectModel}
        meta={(m) => m.defaultTime}
        tone={TONE}
        fallbackIcon={Calendar}
        headerIcon={Calendar}
        title="1. Que tipo de encontro?"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <AudiencePicker
            students={students}
            classes={classes}
            state={audience}
            onTargetType={(t: TargetType) => updateAudience({ targetType: t })}
            onStudent={(s) => updateAudience({ selectedStudent: s })}
            onClass={(id) => updateAudience({ selectedClassId: id })}
            onClasses={(ids) => updateAudience({ selectedClassIds: ids })}
            reach={reachText}
            tone={TONE}
            title="2. Quem é convocado?"
            allText="Vai para todas as famílias da escola."
          />
        </div>

        <Card className="lg:col-span-7">
          <CardHeader icon={MapPin} title="3. Quando, onde e por quê" />
          <div className="space-y-4">
            <Field label="Assunto">
              {(id) => <input id={id} type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={cx(inputCls, 'font-semibold')} />}
            </Field>

            <div className="grid gap-3 sm:grid-cols-[1fr_0.8fr_1.4fr]">
              <Field label="Data">
                {(id) => <input id={id} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} />}
              </Field>
              <Field label="Horário">
                {(id) => (
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input id={id} type="text" value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="14:30" className={cx(inputCls, 'pl-9')} />
                  </div>
                )}
              </Field>
              <Field label="Local">
                {(id) => (
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input id={id} type="text" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Sala de reuniões" className={cx(inputCls, 'pl-9')} />
                  </div>
                )}
              </Field>
            </div>

            <Field label="Pauta">
              {(id) => (
                <textarea
                  id={id}
                  rows={6}
                  value={agenda}
                  onChange={(e) => {
                    setAgenda(e.target.value);
                    setAgendaEdited(true);
                  }}
                  className={cx(inputCls, 'resize-y leading-relaxed')}
                />
              )}
            </Field>

            {/* Como a família vê */}
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-4">
              <p className="text-[12px] font-semibold text-[var(--text-muted)]">Como a família vê</p>
              <p className="mt-1 text-[14px] font-semibold text-[var(--text-heading)]">{subject || 'Assunto'}</p>
              <p className="text-[13px] text-[var(--text-body)]">
                {when}
                {eventLocation ? ` · ${eventLocation}` : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7F6EE] px-3 py-1.5 text-[12px] font-semibold text-[#127A4B]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirmar presença
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-card-alt)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-body)]">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Não posso ir
                </span>
              </div>
            </div>

            {formError && <Alert tone="warning">{formError}</Alert>}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-[var(--text-muted)]">
                Para <strong className="text-[var(--text-heading)]">{reachText}</strong> · {when}
              </p>
              <ToneButton tone={TONE} icon={Send} onClick={openConfirm} disabled={isSubmitting}>
                Revisar e enviar
              </ToneButton>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={showConfirmModal}
        onClose={() => !isSubmitting && setShowConfirmModal(false)}
        title="Enviar convocação?"
        subtitle="Confira os dados do encontro"
        icon={
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: TONE.soft, color: TONE.fg }}>
            <Calendar className="h-5 w-5" />
          </span>
        }
        footer={
          <>
            <Button variant="secondary" disabled={isSubmitting} onClick={() => setShowConfirmModal(false)}>
              Voltar e editar
            </Button>
            <ToneButton tone={TONE} icon={isSubmitting ? Clock : Send} loading={isSubmitting} onClick={handleConfirmSend}>
              {isSubmitting ? 'Enviando…' : 'Enviar agora'}
            </ToneButton>
          </>
        }
      >
        <dl className="space-y-3 text-[14px]">
          <Row label="Tipo">{cleanTitle(selectedModel.title)}</Row>
          <Row label="Para">{reachText}</Row>
          <Row label="Quando">{when}</Row>
          <Row label="Onde">{eventLocation || '—'}</Row>
          <div className="border-t border-[var(--border)] pt-3">
            <dt className="text-[var(--text-muted)]">Assunto</dt>
            <dd className="mt-0.5 font-semibold text-[var(--text-heading)]">{subject}</dd>
          </div>
        </dl>
      </Modal>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="text-right font-semibold text-[var(--text-heading)]">{children}</dd>
    </div>
  );
}