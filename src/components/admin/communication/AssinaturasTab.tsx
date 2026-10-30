import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Bus,
  Calendar,
  Camera,
  Clock,
  DollarSign,
  FileCheck,
  FileSignature,
  PartyPopper,
  Scale,
  Send,
  Sparkles,
  Trophy,
  Waves,
} from 'lucide-react';
import { AudienceStudent, AudienceClass, publishOrganizationAnnouncement } from '../../../services/communicationRpcService';
import { Alert, Badge, Button, Card, CardHeader, Field, Modal, cx, inputCls } from '../../ui/kit';
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

export interface SignatureModel {
  id: string;
  title: string;
  termTitle: string;
  icon: any;
  defaultCost: string;
  description: string;
  defaultText: (targetDescription: string, schoolName: string) => string;
}

export const SIGNATURE_MODELS: SignatureModel[] = [
  {
    id: 'autorizacao-excursao',
    title: '1. Autorização para excursão',
    termTitle: 'TERMO OFICIAL DE AUTORIZAÇÃO — EXCURSÃO PEDAGÓGICA',
    icon: Bus,
    defaultCost: 'R$ 45,00',
    description: 'Viagem pedagógica intermunicipal ou visita técnica.',
    defaultText: (target, esc) => `Pelo presente instrumento, eu, responsável legal por ${target}, AUTORIZO a sua participação na Excursão Pedagógica promovida pelo ${esc}. Declaro estar ciente dos horários de saída e retorno, bem como das normas de segurança e acompanhamento docente estabelecidas pela direção.`
  },
  {
    id: 'autorizacao-passeio',
    title: '2. Autorização para passeio',
    termTitle: 'AUTORIZAÇÃO PARA PASSEIO E ATIVIDADE DE CAMPO',
    icon: Bus,
    defaultCost: 'Gratuito',
    description: 'Passeio local a museus, parques ou teatros.',
    defaultText: (target, esc) => `Eu, responsável legal por ${target}, AUTORIZO o(a) estudante a participar do passeio cultural/educativo promovido pelo ${esc}. Estou ciente do roteiro e dos monitores responsáveis pela condução do grupo.`
  },
  {
    id: 'advertencia-escrito',
    title: '3. Advertência por escrito',
    termTitle: 'TERMO DE ADVERTÊNCIA DISCIPLINAR PEDAGÓGICA',
    icon: AlertCircle,
    defaultCost: 'Gratuito',
    description: 'Registro formal de ocorrência disciplinar e ciência dos pais.',
    defaultText: (target, esc) => `A Direção e Coordenação do ${esc} comunicam a formalização de Advertência Disciplinar referente ao(à) discente ${target}, com base no Regimento Escolar vigente, solicitando a ciência e assinatura formal dos responsáveis para acompanhamento conjunto das diretrizes de convivência.`
  },
  {
    id: 'uso-imagem',
    title: '4. Autorização de uso de imagem',
    termTitle: 'TERMO DE CONSENTIMENTO PARA USO DE IMAGEM E VOZ',
    icon: Camera,
    defaultCost: 'Gratuito',
    description: 'Divulgação em mídias institucionais e anuários.',
    defaultText: (target, esc) => `Autorizo a título gratuito o ${esc} a utilizar a imagem e voz do(a) estudante ${target} em materiais pedagógicos, redes sociais institucionais, murais escolares e campanhas educacionais, em conformidade com a LGPD (Lei nº 13.709/2018).`
  },
  {
    id: 'participacao-dancas',
    title: '5. Participação em danças',
    termTitle: 'TERMO DE AUTORIZAÇÃO — APRESENTAÇÕES DE DANÇA',
    icon: Sparkles,
    defaultCost: 'Gratuito',
    description: 'Festivais culturais e apresentações coreográficas.',
    defaultText: (target, esc) => `Autorizo a participação de ${target} nos ensaios e apresentação oficial do Grupo de Dança Escolar do ${esc}, comprometendo-me com a pontualidade e o uso do figurino estabelecido.`
  },
  {
    id: 'festas-escolares',
    title: '6. Participação em festas escolares',
    termTitle: 'TERMO DE AUTORIZAÇÃO — FESTIVIDADES ESCOLARES',
    icon: PartyPopper,
    defaultCost: 'Gratuito',
    description: 'Festa Junina, Feira Cultural ou comemorações especiais.',
    defaultText: (target, esc) => `Autorizo a participação de ${target} nas festividades institucionais organizadas pelo ${esc}, autorizando a permanência no evento conforme cronograma geral divulgado pela escola.`
  },
  {
    id: 'banho-mangueira',
    title: '7. Autorização para banho de mangueira',
    termTitle: 'AUTORIZAÇÃO PARA ATIVIDADE RECREATIVA — BANHO DE MANGUEIRA',
    icon: Waves,
    defaultCost: 'Gratuito',
    description: 'Recreação aquática monitorada em dias de calor.',
    defaultText: (target, esc) => `Autorizo o(a) estudante ${target} a participar da atividade recreativa de banho de mangueira/brincadeiras com água promovida pelo ${esc}. Confirmo o envio de roupa extra, toalha e protetor solar na mochila.`
  },
  {
    id: 'jogos-escolares',
    title: '8. Participação em jogos escolares',
    termTitle: 'TERMO DE PARTICIPAÇÃO — JOGOS INTERCLASSES ESCOLARES',
    icon: Trophy,
    defaultCost: 'Gratuito',
    description: 'Torneios internos e gincanas esportivas.',
    defaultText: (target, esc) => `Autorizo ${target} a integrar a equipe de sua turma nos Jogos Escolares do ${esc}, declarando que o discente possui aptidão física para a prática das modalidades esportivas inscritas.`
  },
  {
    id: 'competicoes',
    title: '9. Participação em competições',
    termTitle: 'TERMO DE AUTORIZAÇÃO PARA COMPETIÇÕES EXTERNAS',
    icon: Trophy,
    defaultCost: 'Gratuito',
    description: 'Olimpíadas de conhecimento ou campeonatos externos.',
    defaultText: (target, esc) => `Autorizo ${target} a representar o ${esc} na competição/olimpíada esportiva ou acadêmica externa, estando ciente do cronograma e deslocamento acompanhado pela comissão técnica da escola.`
  },
  {
    id: 'atividades-externas',
    title: '10. Atividades externas',
    termTitle: 'AUTORIZAÇÃO PARA ATIVIDADES EXTRAESCOLARES',
    icon: Bus,
    defaultCost: 'Gratuito',
    description: 'Aulas práticas fora do perímetro escolar.',
    defaultText: (target, esc) => `Autorizo a realização de atividade pedagógica externa para o(a) discente ${target}, sob supervisão direta do corpo docente do ${esc}.`
  },
  {
    id: 'atividades-culturais',
    title: '11. Atividades culturais',
    termTitle: 'AUTORIZAÇÃO PARA EVENTO CULTURAL',
    icon: Sparkles,
    defaultCost: 'Gratuito',
    description: 'Cinemas, centros culturais, bienais e exposições.',
    defaultText: (target, esc) => `Autorizo a participação de ${target} na vivência cultural e visita monitorada com os educadores do ${esc}.`
  },
  {
    id: 'eventos',
    title: '12. Autorização para eventos',
    termTitle: 'AUTORIZAÇÃO PARA EVENTOS E SOLENIDADES',
    icon: PartyPopper,
    defaultCost: 'Gratuito',
    description: 'Formaturas, feiras de ciências e mostras de arte.',
    defaultText: (target, esc) => `Declaro ciência e autorizo a participação de ${target} no evento institucional do ${esc}.`
  },
  {
    id: 'visitas-pedagogicas',
    title: '13. Visitas pedagógicas',
    termTitle: 'TERMO DE VISITA PEDAGÓGICA SUPERVISIONADA',
    icon: Building2,
    defaultCost: 'Gratuito',
    description: 'Visitas a universidades, fábricas ou órgãos públicos.',
    defaultText: (target, esc) => `Autorizo a visita de estudos de ${target} ao local designado no plano de aula externa do ${esc}.`
  },
  {
    id: 'termo-ciencia',
    title: '14. Termo de ciência',
    termTitle: 'TERMO OFICIAL DE CIÊNCIA E ACOMPANHAMENTO',
    icon: FileCheck,
    defaultCost: 'Gratuito',
    description: 'Ciência formal de regimento, notas ou orientações.',
    defaultText: (target, esc) => `Eu, responsável por ${target}, declaro ter recebido e tomado conhecimento integral das orientações emitidas pelo ${esc}, comprometendo-me a cooperar no cumprimento das orientações pedagógicas.`
  },
  {
    id: 'termo-responsabilidade',
    title: '15. Termo de responsabilidade',
    termTitle: 'TERMO DE COMPROMISSO E RESPONSABILIDADE',
    icon: Scale,
    defaultCost: 'Gratuito',
    description: 'Uso de armários, equipamentos escolares ou empréstimo de livros.',
    defaultText: (target, esc) => `Assumo plena responsabilidade pelo zelo, conservação e correta utilização dos recursos materiais disponibilizados pelo ${esc} ao(à) estudante ${target}.`
  },
  {
    id: 'outros-documentos',
    title: '16. Outros documentos institucionais',
    termTitle: 'DOCUMENTO INSTITUCIONAL COM ASSINATURA ELETRÔNICA',
    icon: FileSignature,
    defaultCost: 'Gratuito',
    description: 'Crie um termo customizado para assinatura dos pais.',
    defaultText: (target, esc) => `Pelo presente instrumento particular, autorizo e manifesto expressa concordância com as condições estabelecidas pelo ${esc} para o(a) estudante ${target}.`
  }
];

const TONE = TONES.amber;
const TARGET_PLACEHOLDER = '[estudante]';

interface AssinaturasTabProps {
  realStudents: AudienceStudent[];
  realClasses: AudienceClass[];
  schoolName: string;
  senderName: string;
  senderRole: string;
  organizationId?: string;
  onSuccessPublished?: () => void;
}

export function AssinaturasTab({
  realStudents,
  realClasses,
  schoolName,
  senderName,
  senderRole,
  organizationId,
  onSuccessPublished,
}: AssinaturasTabProps) {
  const students = Array.isArray(realStudents) ? realStudents : [];
  const classes = Array.isArray(realClasses) ? realClasses : [];

  const [selectedModel, setSelectedModel] = useState<SignatureModel>(SIGNATURE_MODELS[0]);
  const [audience, setAudience] = useState<AudienceState>({
    targetType: 'student',
    selectedStudent: null, // ninguém pré-selecionado
    selectedClassId: '',
    selectedClassIds: [],
  });

  const [termTitle, setTermTitle] = useState<string>(SIGNATURE_MODELS[0].termTitle);
  const [cost, setCost] = useState<string>(SIGNATURE_MODELS[0].defaultCost);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [documentBody, setDocumentBody] = useState<string>(() => SIGNATURE_MODELS[0].defaultText(TARGET_PLACEHOLDER, schoolName));
  const [bodyEdited, setBodyEdited] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SendStatus>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const reach = useReach(students, audience);
  const reachText = reachLabel(reach.count, audience);

  const targetLabelFor = (a: AudienceState) => {
    if (a.targetType === 'student') return a.selectedStudent?.name || TARGET_PLACEHOLDER;
    if (a.targetType === 'class') {
      const cl = classes.find((c) => c.id === a.selectedClassId);
      return cl ? `estudante da turma ${cl.name}` : 'estudante da turma';
    }
    return 'o(a) estudante';
  };

  const refreshText = (model: SignatureModel, a: AudienceState, force = false) => {
    if (bodyEdited && !force) return;
    setDocumentBody(model.defaultText(targetLabelFor(a), schoolName));
    setBodyEdited(false);
  };

  const updateAudience = (patch: Partial<AudienceState>) => {
    const next = { ...audience, ...patch };
    setAudience(next);
    setFormError(null);
    refreshText(selectedModel, next);
  };

  const handleSelectModel = (model: SignatureModel) => {
    setSelectedModel(model);
    setTermTitle(model.termTitle);
    setCost(model.defaultCost);
    refreshText(model, audience, true);
  };

  const openConfirm = () => {
    if (!reach.canSend) return setFormError(audience.targetType === 'student' ? 'Escolha o estudante.' : 'Escolha pelo menos uma turma.');
    if (!termTitle.trim() || !documentBody.trim()) return setFormError('Preencha o título e o texto do termo.');
    if (documentBody.includes(TARGET_PLACEHOLDER)) return setFormError('O texto ainda tem [estudante]. Escolha o estudante ou edite o texto.');
    setFormError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStatus({ tone: 'info', text: 'Enviando o termo…' });

    try {
      const { targetType, selectedStudent, selectedClassId, selectedClassIds } = audience;
      const mode = targetType === 'student' ? 'students' : targetType === 'all' ? 'all' : 'classes';
      const classIds = targetType === 'class' ? [selectedClassId] : targetType === 'multi' ? selectedClassIds : undefined;
      const studentIds = targetType === 'student' && selectedStudent ? [selectedStudent.id] : undefined;
      const single = targetType === 'student' ? selectedStudent : null;

      const res: any = await withTimeout(
        publishOrganizationAnnouncement({
          p_title: termTitle.trim(),
          p_body: documentBody.trim(),
          p_type_code: 'signature',
          p_requires_signature: true,
          p_priority: 'normal',
          p_category: 'Documentos / Assinaturas',
          p_due_date: dueDate || null,
          p_cost: cost || 'Gratuito',
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
        setStatus({ tone: 'success', text: `Termo enviado para ${reachText}. Os responsáveis assinam pelo Portal da Família até ${formatISODate(dueDate)}.` });
        onSuccessPublished?.();
      }
    } catch (err: any) {
      if (mounted.current) setStatus({ tone: 'danger', text: err?.message || 'Não foi possível enviar. Tente de novo.' });
    } finally {
      if (mounted.current) setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <ComposerHeader
        icon={FileSignature}
        title="Assinaturas e autorizações"
        text="Autorizações, termos e ciência dos responsáveis. A família assina pelo Portal da Família e você acompanha quem já assinou."
        tone={TONE}
      />

      <StatusBanner status={status} busy={isSubmitting} onClose={() => setStatus(null)} />

      <ModelGrid
        models={SIGNATURE_MODELS}
        selectedId={selectedModel.id}
        onSelect={handleSelectModel}
        meta={(m) => m.defaultCost}
        tone={TONE}
        fallbackIcon={FileSignature}
        headerIcon={FileSignature}
        title="1. Qual documento?"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
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
          />

          <Card>
            <CardHeader icon={Calendar} title="Prazo e valor" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Assinar até">
                {(id) => <input id={id} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />}
              </Field>
              <Field label="Valor por estudante">
                {(id) => (
                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input id={id} type="text" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Gratuito" className={cx(inputCls, 'pl-9')} />
                  </div>
                )}
              </Field>
            </div>
          </Card>
        </div>

        <Card className="lg:col-span-7">
          <CardHeader icon={FileCheck} title="3. Texto do documento" subtitle="É isso que o responsável lê antes de assinar" />
          <div className="space-y-4">
            <Field label="Título">
              {(id) => <input id={id} type="text" value={termTitle} onChange={(e) => setTermTitle(e.target.value)} className={cx(inputCls, 'font-semibold')} />}
            </Field>
            <Field label="Texto">
              {(id) => (
                <textarea
                  id={id}
                  rows={9}
                  value={documentBody}
                  onChange={(e) => {
                    setDocumentBody(e.target.value);
                    setBodyEdited(true);
                  }}
                  className={cx(inputCls, 'resize-y leading-relaxed')}
                />
              )}
            </Field>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-[13px]" style={{ background: TONE.soft, color: TONE.fg }}>
              <FileSignature className="h-4 w-4 shrink-0" />
              O responsável assina pelo Portal da Família. A data e a hora da assinatura ficam registradas.
            </div>

            {formError && <Alert tone="warning">{formError}</Alert>}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-[var(--text-muted)]">
                Vai para <strong className="text-[var(--text-heading)]">{reachText}</strong> · prazo {formatISODate(dueDate)}
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
        title="Enviar para assinatura?"
        subtitle="Confira antes de enviar"
        icon={
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: TONE.soft, color: TONE.fg }}>
            <FileSignature className="h-5 w-5" />
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
          <Row label="Documento">{cleanTitle(selectedModel.title)}</Row>
          <Row label="Para">{reachText}</Row>
          <Row label="Assinar até">{formatISODate(dueDate)}</Row>
          <Row label="Valor">
            <Badge tone="warning">{cost || 'Gratuito'}</Badge>
          </Row>
          <div className="border-t border-[var(--border)] pt-3">
            <dt className="text-[var(--text-muted)]">Título</dt>
            <dd className="mt-0.5 font-semibold text-[var(--text-heading)]">{termTitle}</dd>
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