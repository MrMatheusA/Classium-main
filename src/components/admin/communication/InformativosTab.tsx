import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  Bus,
  Calendar,
  Clock,
  Droplet,
  Info,
  Megaphone,
  Send,
  Shirt,
  Sparkles,
  Users,
  Utensils,
  Zap,
} from 'lucide-react';
import { AudienceStudent, AudienceClass, publishOrganizationAnnouncement } from '../../../services/communicationRpcService';
import { Alert, Badge, Button, Card, CardHeader, Field, Modal, Toggle, cx, inputCls } from '../../ui/kit';
import {
  AudiencePicker,
  ComposerHeader,
  ModelGrid,
  StatusBanner,
  TONES,
  ToneButton,
  cleanTitle,
  reachLabel,
  useReach,
  withTimeout,
  type AudienceState,
  type SendStatus,
  type TargetType,
} from './ComposerParts';

export interface InfoModel {
  id: string;
  title: string;
  defaultTitle: string;
  icon: any;
  category: string;
  description: string;
  defaultBody: (schoolName: string) => string;
}

export const INFO_MODELS: InfoModel[] = [
  {
    id: 'nao-havera-aula',
    title: '1. Não haverá aula',
    defaultTitle: 'COMUNICADO: Suspensão Programada das Aulas',
    icon: Bell,
    category: 'Calendário',
    description: 'Aviso sobre dia letivo suspenso ou planejamento pedagógico.',
    defaultBody: (esc) => `Prezados Pais e Responsáveis,\n\nInformamos que na data prevista no calendário acadêmico não haverá atividades letivas presenciais no ${esc}, em virtude de jornada de formação pedagógica e planejamento docente. As aulas retornarão regularmente no dia útil seguinte.`
  },
  {
    id: 'alteracao-horario',
    title: '2. Alteração de horário',
    defaultTitle: 'INFORMATIVO: Ajuste nos Horários das Aulas',
    icon: Clock,
    category: 'Horários',
    description: 'Ajuste de entrada ou saída para as turmas.',
    defaultBody: (esc) => `Prezada Comunidade Escolar,\n\nComunicamos uma alteração pontual no cronograma de aulas do ${esc}. Pedimos que os responsáveis fiquem atentos aos novos horários de entrada e saída.`
  },
  {
    id: 'falta-agua',
    title: '3. Falta de água',
    defaultTitle: 'AVISO: Manutenção na Rede de Abastecimento de Água',
    icon: Droplet,
    category: 'Infraestrutura',
    description: 'Interrupção no fornecimento pela concessionária.',
    defaultBody: (esc) => `Informamos que a concessionária pública de abastecimento comunicou manutenção na rede local. O ${esc} conta com reservatórios próprios e continuará monitorando as condições de higiene para o bem-estar de todos.`
  },
  {
    id: 'falta-energia',
    title: '4. Falta de energia',
    defaultTitle: 'INFORMATIVO: Oscilação / Manutenção de Energia Elétrica',
    icon: Zap,
    category: 'Infraestrutura',
    description: 'Aviso sobre serviços na rede elétrica.',
    defaultBody: (esc) => `Informamos que a concessionária de energia elétrica realizará manutenção preventiva nas imediações do ${esc}. Todas as medidas de contingência foram tomadas pela direção escolar.`
  },
  {
    id: 'solicitacao-agasalho',
    title: '5. Solicitação de agasalho',
    defaultTitle: 'LEMBRETE: Previsão de Queda de Temperatura e Agasalhos',
    icon: Shirt,
    category: 'Cuidado & Saúde',
    description: 'Lembrete aos pais para agasalhar os discentes.',
    defaultBody: (esc) => `Prezadas Famílias,\n\nCom a previsão de queda acentuada nas temperaturas nos próximos dias, solicitamos que enviem os estudantes devidamente agasalhados com o uniforme de inverno do ${esc} devidamente identificado com nome e turma.`
  },
  {
    id: 'garrafa-agua',
    title: '6. Garrafa de água',
    defaultTitle: 'ORIENTAÇÃO: Hidratação e Garrafinha de Água Individual',
    icon: Droplet,
    category: 'Cuidado & Saúde',
    description: 'Estímulo ao uso de garrafa individual de hidratação.',
    defaultBody: (esc) => `Lembramos aos pais a importância de enviar diariamente uma garrafa plástica individual de água (squeeze) identificada com o nome do discente. Nossos bebedouros contam com filtros higienizados para reabastecimento constante.`
  },
  {
    id: 'saida-antecipada',
    title: '7. Saída antecipada',
    defaultTitle: 'AVISO: Saída Antecipada Programada',
    icon: Clock,
    category: 'Horários',
    description: 'Término das aulas antes do horário regular.',
    defaultBody: (esc) => `Comunicamos que no dia indicado as atividades discentes serão encerradas mais cedo para realização de conselho de classe. Pedimos que organizem a retirada dos estudantes no horário informado.`
  },
  {
    id: 'mudanca-horario',
    title: '8. Mudança de horário',
    defaultTitle: 'INFORMATIVO: Atualização na Grade de Horários',
    icon: Clock,
    category: 'Pedagógico',
    description: 'Nova distribuição de aulas semanais.',
    defaultBody: (esc) => `Informamos que a partir da próxima semana passará a vigorar uma atualização na grade horária das disciplinas no ${esc}. O novo horário já está disponível no Portal Família.`
  },
  {
    id: 'retorno-excursao',
    title: '9. Retorno de excursão',
    defaultTitle: 'ATUALIZAÇÃO: Retorno da Viagem / Excursão Pedagógica',
    icon: Bus,
    category: 'Eventos',
    description: 'Aviso sobre horário de chegada dos ônibus escolares.',
    defaultBody: (esc) => `Avisamos aos pais dos estudantes em excursão que o grupo já iniciou a viagem de retorno ao ${esc}. O horário estimado de chegada em nosso portão é às [horário]. Todos estão muito bem e animados!`
  },
  {
    id: 'buscar-na-escola',
    title: '10. Buscar estudante na escola',
    defaultTitle: 'LEMBRETE: Retirada de Alunos na Portaria Escolar',
    icon: Users,
    category: 'Segurança',
    description: 'Orientação de trânsito e pontualidade na saída.',
    defaultBody: (esc) => `Solicitamos a gentileza de respeitar os limites de velocidade e as faixas de pedestres ao redor do ${esc} durante os horários de embarque e desembarque escolar, garantindo a segurança de nossas crianças.`
  },
  {
    id: 'recesso',
    title: '11. Recesso escolar',
    defaultTitle: 'CALENDÁRIO: Período de Recesso Escolar',
    icon: Calendar,
    category: 'Calendário',
    description: 'Férias de julho ou pausa acadêmica.',
    defaultBody: (esc) => `Informamos o início do período de recesso escolar do ${esc}. Desejamos a todos os estudantes e familiares um período de descanso revigorante. Retornaremos com entusiasmo no início do próximo ciclo.`
  },
  {
    id: 'feriado',
    title: '12. Feriado',
    defaultTitle: 'COMUNICADO: Feriado e Ponto Facultativo',
    icon: Calendar,
    category: 'Calendário',
    description: 'Informação sobre emendas e feriados nacionais/locais.',
    defaultBody: (esc) => `Em comemoração ao feriado, não haverá expediente administrativo nem aulas no ${esc}. As atividades serão retomadas normalmente no primeiro dia útil subsequente.`
  },
  {
    id: 'reuniao-geral',
    title: '13. Reunião geral',
    defaultTitle: 'CONVITE: Reunião Geral da Comunidade Escolar',
    icon: Users,
    category: 'Institucional',
    description: 'Apresentação de diretrizes para o ano letivo.',
    defaultBody: (esc) => `Convidamos todos os pais e responsáveis para a Reunião Geral de Acolhimento do ${esc}. Juntos construímos uma educação transformadora e participativa.`
  },
  {
    id: 'avisos-administrativos',
    title: '14. Avisos administrativos',
    defaultTitle: 'CIRCULAR ADMINISTRATIVA: Secretaria e Documentos',
    icon: Building2,
    category: 'Secretaria',
    description: 'Horários de atendimento da tesouraria e secretaria.',
    defaultBody: (esc) => `A Secretaria Escolar do ${esc} informa o cronograma de atendimento para renovação de matrículas e emissão de declarações escolares.`
  },
  {
    id: 'avisos-pedagogicos',
    title: '15. Avisos pedagógicos',
    defaultTitle: 'CIRCULAR PEDAGÓGICA: Rotina de Estudos e Tarefas',
    icon: Sparkles,
    category: 'Pedagógico',
    description: 'Metodologias ativas e acompanhamento de tarefas.',
    defaultBody: (esc) => `A Coordenação Pedagógica do ${esc} reforça a importância do acompanhamento diário das tarefas escolares pelos familiares através da agenda digital.`
  },
  {
    id: 'eventos-escolares-info',
    title: '16. Eventos escolares',
    defaultTitle: 'CALENDÁRIO FESTIVO: Próximos Eventos Escolares',
    icon: Megaphone,
    category: 'Eventos',
    description: 'Cronograma de comemorações e mostras pedagógicas.',
    defaultBody: (esc) => `Compartilhamos com entusiasmo a programação dos próximos eventos e comemorações educacionais do ${esc}. Venha participar com toda a família!`
  },
  {
    id: 'campanhas',
    title: '17. Campanhas de solidariedade',
    defaultTitle: 'CAMPANHA SOLIDÁRIA: Ação Comunitária do Colégio',
    icon: Sparkles,
    category: 'Solidariedade',
    description: 'Arrecadação de agasalhos, livros e alimentos.',
    defaultBody: (esc) => `O ${esc} lança sua Campanha Solidária anual. Estaremos recebendo doações de alimentos não perecíveis e agasalhos em bom estado na portaria principal.`
  },
  {
    id: 'calendario-escolar',
    title: '18. Alterações no calendário',
    defaultTitle: 'ATUALIZAÇÃO: Calendário Letivo Oficial',
    icon: Calendar,
    category: 'Calendário',
    description: 'Novas datas de provas e simulados.',
    defaultBody: (esc) => `Informamos que o Calendário Letivo do ${esc} foi atualizado com as novas datas de avaliações, simulados e reposições de aulas.`
  },
  {
    id: 'transporte-escolar',
    title: '19. Transporte escolar',
    defaultTitle: 'INFORMATIVO: Diretrizes de Transporte Escolar',
    icon: Bus,
    category: 'Logística',
    description: 'Recomendações aos condutores e responsáveis.',
    defaultBody: (esc) => `Lembramos aos pais que utilizam transporte terceirizado a necessidade de manter atualizado o cadastro dos condutores autorizados junto à nossa portaria.`
  },
  {
    id: 'alimentacao-cantina',
    title: '20. Alimentação e cantina',
    defaultTitle: 'NUTRIÇÃO: Cardápio Saudável e Lanches Escolares',
    icon: Utensils,
    category: 'Nutrição',
    description: 'Cardápio semanal e orientações de merenda saudável.',
    defaultBody: (esc) => `Apresentamos as opções do cardápio balanceado da cantina escolar do ${esc}, incentivando o consumo consciente de frutas, sucos naturais e alimentos integrais.`
  },
  {
    id: 'comunicados-institucionais',
    title: '21. Comunicados institucionais',
    defaultTitle: 'COMUNICADO OFICIAL DA DIREÇÃO',
    icon: Building2,
    category: 'Institucional',
    description: 'Mensagens solenes da diretoria do colégio.',
    defaultBody: (esc) => `A Direção Geral do ${esc} compartilha com a comunidade as novidades e investimentos contínuos realizados em nossa infraestrutura escolar.`
  },
  {
    id: 'outros-informativos',
    title: '22. Outros informativos',
    defaultTitle: 'INFORMATIVO ESCOLAR GERAL',
    icon: Info,
    category: 'Geral',
    description: 'Informativo de texto livre para a comunidade escolar.',
    defaultBody: (esc) => `Prezadas famílias e comunidade do ${esc},\n\nCompartilhamos as seguintes informações de interesse da nossa rotina escolar...`
  }
];

const TONE = TONES.emerald;

interface InformativosTabProps {
  realStudents: AudienceStudent[];
  realClasses: AudienceClass[];
  schoolName: string;
  senderName: string;
  senderRole: string;
  organizationId?: string;
  onSuccessPublished?: () => void;
}

export function InformativosTab({
  realStudents,
  realClasses,
  schoolName,
  senderName,
  senderRole,
  organizationId,
  onSuccessPublished,
}: InformativosTabProps) {
  const students = Array.isArray(realStudents) ? realStudents : [];
  const classes = Array.isArray(realClasses) ? realClasses : [];

  const [selectedModel, setSelectedModel] = useState<InfoModel>(INFO_MODELS[0]);
  const [audience, setAudience] = useState<AudienceState>({
    targetType: 'all',
    selectedStudent: null,
    selectedClassId: '',
    selectedClassIds: [],
  });

  const [title, setTitle] = useState<string>(INFO_MODELS[0].defaultTitle);
  const [body, setBody] = useState<string>(() => INFO_MODELS[0].defaultBody(schoolName));
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SendStatus>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const reach = useReach(students, audience);
  const reachText = reachLabel(reach.count, audience, ['família', 'famílias']);

  const updateAudience = (patch: Partial<AudienceState>) => {
    setAudience((a) => ({ ...a, ...patch }));
    setFormError(null);
  };

  const handleSelectModel = (model: InfoModel) => {
    setSelectedModel(model);
    setTitle(model.defaultTitle);
    setBody(model.defaultBody(schoolName));
  };

  const openConfirm = () => {
    if (!reach.canSend) return setFormError(audience.targetType === 'student' ? 'Escolha o estudante.' : 'Escolha pelo menos uma turma.');
    if (!title.trim() || !body.trim()) return setFormError('Preencha o título e o texto.');
    if (/\[[^\]]+\]/.test(body)) return setFormError('O texto ainda tem um campo entre colchetes, como [horário]. Complete antes de enviar.');
    setFormError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStatus({ tone: 'info', text: 'Publicando o informativo…' });

    try {
      const { targetType, selectedStudent, selectedClassId, selectedClassIds } = audience;
      const mode = targetType === 'student' ? 'students' : targetType === 'all' ? 'all' : 'classes';
      const classIds = targetType === 'class' ? [selectedClassId] : targetType === 'multi' ? selectedClassIds : undefined;
      const studentIds = targetType === 'student' && selectedStudent ? [selectedStudent.id] : undefined;
      const single = targetType === 'student' ? selectedStudent : null;

      const res: any = await withTimeout(
        publishOrganizationAnnouncement({
          p_title: title.trim(),
          p_body: body.trim(),
          p_type_code: 'info',
          p_priority: 'normal',
          p_category: selectedModel.category || 'Informativo Geral',
          p_requires_acknowledgment: requiresAcknowledgment,
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
        setStatus({ tone: 'success', text: `Informativo publicado para ${reachText}. Ele aparece em Informativos no Portal da Família.` });
        onSuccessPublished?.();
      }
    } catch (err: any) {
      if (mounted.current) setStatus({ tone: 'danger', text: err?.message || 'Não foi possível publicar. Tente de novo.' });
    } finally {
      if (mounted.current) setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <ComposerHeader
        icon={Info}
        title="Informativos"
        text="Avisos do dia a dia, circulares e orientações. Você escolhe se a família precisa confirmar que leu."
        tone={TONE}
        right={
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] font-medium text-[var(--text-heading)]">
            Pedir “li e estou ciente”
            <Toggle label="Pedir confirmação de leitura" checked={requiresAcknowledgment} onChange={setRequiresAcknowledgment} />
          </label>
        }
      />

      <StatusBanner status={status} busy={isSubmitting} onClose={() => setStatus(null)} />

      <ModelGrid
        models={INFO_MODELS}
        selectedId={selectedModel.id}
        onSelect={handleSelectModel}
        meta={(m) => m.category}
        tone={TONE}
        fallbackIcon={Info}
        headerIcon={Megaphone}
        title="1. Sobre o quê?"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <AudiencePicker
            students={students}
            classes={classes}
            state={audience}
            order={['all', 'class', 'multi', 'student']}
            onTargetType={(t: TargetType) => updateAudience({ targetType: t })}
            onStudent={(s) => updateAudience({ selectedStudent: s })}
            onClass={(id) => updateAudience({ selectedClassId: id })}
            onClasses={(ids) => updateAudience({ selectedClassIds: ids })}
            reach={reachText}
            tone={TONE}
            allText="Vai para todas as famílias da escola."
          />
        </div>

        <Card className="lg:col-span-7">
          <CardHeader icon={Megaphone} title="3. Texto" subtitle="Revise antes de publicar" action={<Badge tone="success">{selectedModel.category}</Badge>} />
          <div className="space-y-4">
            <Field label="Título">
              {(id) => <input id={id} type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={cx(inputCls, 'font-semibold')} />}
            </Field>
            <Field label="Mensagem">
              {(id) => <textarea id={id} rows={9} value={body} onChange={(e) => setBody(e.target.value)} className={cx(inputCls, 'resize-y leading-relaxed')} />}
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--bg-card-alt)] px-4 py-3 text-[13px]">
              <span className="text-[var(--text-body)]">
                <strong className="text-[var(--text-heading)]">{senderName || 'Gestão escolar'}</strong> · {senderRole || 'Direção'}
              </span>
              <span className="text-[var(--text-muted)]">{requiresAcknowledgment ? 'Pede confirmação de leitura' : 'Sem confirmação de leitura'}</span>
            </div>

            {formError && <Alert tone="warning">{formError}</Alert>}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-[var(--text-muted)]">
                Para <strong className="text-[var(--text-heading)]">{reachText}</strong>
              </p>
              <ToneButton tone={TONE} icon={Send} onClick={openConfirm} disabled={isSubmitting}>
                Revisar e publicar
              </ToneButton>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={showConfirmModal}
        onClose={() => !isSubmitting && setShowConfirmModal(false)}
        title="Publicar informativo?"
        subtitle="Confira antes de publicar"
        icon={
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: TONE.soft, color: TONE.fg }}>
            <Info className="h-5 w-5" />
          </span>
        }
        footer={
          <>
            <Button variant="secondary" disabled={isSubmitting} onClick={() => setShowConfirmModal(false)}>
              Voltar e editar
            </Button>
            <ToneButton tone={TONE} icon={isSubmitting ? Clock : Send} loading={isSubmitting} onClick={handleConfirmSend}>
              {isSubmitting ? 'Publicando…' : 'Publicar agora'}
            </ToneButton>
          </>
        }
      >
        <dl className="space-y-3 text-[14px]">
          <Row label="Assunto">{cleanTitle(selectedModel.title)}</Row>
          <Row label="Para">{reachText}</Row>
          <Row label="Confirmação de leitura">{requiresAcknowledgment ? 'Sim' : 'Não'}</Row>
          <div className="border-t border-[var(--border)] pt-3">
            <dt className="text-[var(--text-muted)]">Título</dt>
            <dd className="mt-0.5 font-semibold text-[var(--text-heading)]">{title}</dd>
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