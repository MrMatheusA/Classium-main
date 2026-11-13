import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CalendarCheck, CalendarPlus, Check, CheckCircle2, Clock, Hourglass, Loader2, MapPin, Phone, ShieldAlert, User, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cx, EASE } from '../ui/kit';
import { fmtDataHora, fmtDiaSemana, fmtHora, hojeISO, mensagemErro, rpc, useCarregar, useMeusEstudantes, useMinhasEscolas, useRealtime } from '../../services/escolaEscuta/api';
import { CampoArea, CampoTexto, Carregando, Chip, ConfirmModal, EmptyState, ErroBox, InfoBox, PageHeader, Painel, Pill, SeletorEscola, Tabs, btn, useToast } from './ui';
import { MODALIDADE, STATUS_AG, type Agendamento, type Registro, type Setor } from './AgendaFamiliaGestor';

/* =====================================================================
 * Agenda Família — Portal Família
 * A família só vê horários LIVRES (nunca reservas de outras famílias).
 * ===================================================================== */

interface Slot {
  disponibilidade_id: string;
  inicio: string;
  fim: string;
  responsavel_nome: string;
  modalidade: string;
  local: string | null;
  orientacoes: string | null;
  modo_confirmacao: 'automatico' | 'aprovacao';
}

type Aba = 'agendar' | 'meus';

export function AgendaFamiliaPortal({ organizationId }: { organizationId?: string }) {
  const escolas = useMinhasEscolas();
  const estudantes = useMeusEstudantes();
  const familiaEscolas = escolas.data.filter((e) => e.papel === 'familia');
  const [org, setOrg] = useState<string | null>(organizationId || null);
  const [aba, setAba] = useState<Aba>('agendar');
  const toast = useToast();

  useEffect(() => {
    if (!org && familiaEscolas[0]) setOrg(familiaEscolas[0].organization_id);
  }, [familiaEscolas, org]);

  const cfg = useCarregar<any>(
    async () => {
      if (!org) return { data: null };
      const { data } = await supabase.from('agenda_config').select('*').eq('organization_id', org).maybeSingle();
      return { data };
    },
    [org],
    null,
  );

  const meus = useCarregar<Agendamento[]>(
    async () => {
      if (!org) return { data: [] };
      const { data, error } = await supabase
        .from('agenda_agendamentos')
        .select('*, agenda_registros(*)')
        .eq('organization_id', org)
        .order('inicio', { ascending: false })
        .limit(200);
      return error ? { error: mensagemErro(error) } : { data: (data as Agendamento[]) || [] };
    },
    [org],
    [],
  );
  useRealtime(['agenda_agendamentos'], () => meus.recarregar(true), !!org);

  const alunosDaEscola = estudantes.data.filter((e) => e.organization_id === org);
  const propostas = meus.data.filter((a) => a.status === 'proposta').length;

  if (!escolas.loading && familiaEscolas.length === 0)
    return <EmptyState icon={CalendarCheck} title="Nenhum estudante vinculado" text="Quando a escola vincular seu cadastro a um estudante, você poderá agendar atendimentos aqui." />;

  return (
    <div className="space-y-5 text-left">
      <SeletorEscola escolas={familiaEscolas} value={org} onChange={setOrg} />
      <PageHeader icon={CalendarCheck} title="Agendar atendimento" subtitle="Marque uma conversa com a secretaria, a equipe pedagógica ou a direção." />

      <div className="rounded-[20px] border border-[#FEDF89] bg-[#FFFAEB] p-4">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-[#B54708]">
          <ShieldAlert className="h-4 w-4" />
          {cfg.data?.aviso_emergencia || 'Este agendamento não é um canal de emergência.'}
        </p>
        {cfg.data?.contatos_urgencia && <p className="mt-1 whitespace-pre-line text-[13px] text-[#B54708]">{cfg.data.contatos_urgencia}</p>}
      </div>

      <Tabs<Aba>
        value={aba}
        onChange={setAba}
        tabs={[
          { id: 'agendar', label: 'Novo agendamento', icon: CalendarPlus },
          { id: 'meus', label: 'Meus atendimentos', icon: Clock, count: propostas },
        ]}
      />

      {aba === 'agendar' && org && (
        <NovoAgendamento
          org={org}
          alunos={alunosDaEscola}
          onFeito={() => {
            meus.recarregar(true);
            setAba('meus');
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
      {aba === 'meus' && <MeusAtendimentos dados={meus} toast={toast} />}
      {toast.node}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NovoAgendamento({
  org,
  alunos,
  onFeito,
  onErro,
}: {
  org: string;
  alunos: { student_id: string; student_nome: string }[];
  onFeito: () => void;
  onErro: (m: string) => void;
}) {
  const [passo, setPasso] = useState(1);
  const [aluno, setAluno] = useState<string | null>(alunos.length === 1 ? alunos[0].student_id : null);
  const [setor, setSetor] = useState<Setor | null>(null);
  const [assunto, setAssunto] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [motivo, setMotivo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ status: string; expira_em?: string } | null>(null);

  const setores = useCarregar<Setor[]>(
    async () => {
      const { data, error } = await supabase.from('agenda_setores').select('*').eq('organization_id', org).eq('ativo', true).order('ordem');
      return error ? { error: mensagemErro(error) } : { data: (data as Setor[]) || [] };
    },
    [org],
    [],
  );

  const slots = useCarregar<Slot[]>(
    async () => (setor ? rpc<Slot[]>('agenda_horarios_livres', { p_setor: setor.id, p_de: hojeISO(0), p_ate: hojeISO(28) }) : { data: [] }),
    [setor?.id],
    [],
  );
  useRealtime(['agenda_agendamentos'], () => setor && slots.recarregar(true), !!setor && passo === 3);

  const dias = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots.data) {
      const k = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(s.inicio));
      m.set(k, [...(m.get(k) || []), s]);
    }
    return Array.from(m.entries());
  }, [slots.data]);
  const [dia, setDia] = useState<string | null>(null);
  useEffect(() => {
    if (dias.length && (!dia || !dias.some(([d]) => d === dia))) setDia(dias[0][0]);
  }, [dias, dia]);

  const nomeAluno = alunos.find((a) => a.student_id === aluno)?.student_nome;

  const enviar = async () => {
    if (!aluno || !setor || !assunto || !slot) return;
    setEnviando(true);
    const r = await rpc<any>('agenda_solicitar', {
      p_disponibilidade: slot.disponibilidade_id,
      p_inicio: slot.inicio,
      p_student: aluno,
      p_assunto: assunto,
      p_motivo: motivo || null,
      p_telefone: telefone || null,
    });
    setEnviando(false);
    if (r.error) {
      onErro(r.error);
      if (/indispon|reservado/i.test(r.error)) {
        setSlot(null);
        setPasso(3);
        slots.recarregar(true);
      }
      return;
    }
    setResultado(r.data);
  };

  if (resultado) {
    const confirmado = resultado.status === 'confirmado';
    return (
      <Painel className="mx-auto max-w-xl py-8 text-center">
        <span className={cx('mx-auto flex h-16 w-16 items-center justify-center rounded-full', confirmado ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#FFFAEB] text-[#B54708]')}>
          {confirmado ? <CheckCircle2 className="h-9 w-9" /> : <Hourglass className="h-8 w-8" />}
        </span>
        <h3 className="mt-4 font-serif text-[22px] font-semibold text-[var(--text-heading)]">{confirmado ? 'Atendimento confirmado' : 'Solicitação recebida'}</h3>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[var(--text-body)]">
          {confirmado ? (
            <>
              {fmtDataHora(slot?.inicio)} com {slot?.responsavel_nome}. Você recebe um lembrete na véspera.
            </>
          ) : (
            <>
              <strong>Ainda não é um atendimento confirmado.</strong> A escola vai analisar e responder
              {resultado.expira_em ? ` até ${fmtDataHora(resultado.expira_em)}` : ''}. O horário fica reservado para você enquanto isso.
            </>
          )}
        </p>
        <button type="button" className={`${btn.primary} mt-6`} onClick={onFeito}>
          Ver meus atendimentos
        </button>
      </Painel>
    );
  }

  const Passos = (
    <ol className="flex flex-wrap items-center gap-2 text-[13px]">
      {['Estudante', 'Setor e assunto', 'Horário', 'Confirmar'].map((p, i) => (
        <li key={p} className="flex items-center gap-2">
          <span
            className={cx(
              'flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold',
              passo > i + 1 ? 'bg-[#067647] text-white' : passo === i + 1 ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'bg-[var(--bg-card-alt)] text-[var(--text-muted)]',
            )}
          >
            {passo > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={passo === i + 1 ? 'font-semibold text-[var(--text-heading)]' : 'text-[var(--text-muted)]'}>{p}</span>
          {i < 3 && <span className="mx-1 h-px w-5 bg-[var(--border)]" />}
        </li>
      ))}
    </ol>
  );

  return (
    <Painel className="space-y-5">
      {Passos}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={passo} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.16, ease: EASE }}>
          {passo === 1 && (
            <div className="space-y-3">
              <p className="text-[15px] font-semibold text-[var(--text-heading)]">Sobre qual estudante?</p>
              {alunos.length === 0 ? (
                <InfoBox tone="warning">Nenhum estudante desta escola está vinculado a você.</InfoBox>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {alunos.map((a) => (
                    <button
                      key={a.student_id}
                      type="button"
                      onClick={() => {
                        setAluno(a.student_id);
                        setPasso(2);
                      }}
                      className={cx(
                        'flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors',
                        aluno === a.student_id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--bg-card-alt)]',
                      )}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-card-alt)] text-[var(--text-muted)]">
                        <User className="h-5 w-5" />
                      </span>
                      <span className="text-[15px] font-semibold text-[var(--text-heading)]">{a.student_nome}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {passo === 2 && (
            <div className="space-y-4">
              <p className="text-[15px] font-semibold text-[var(--text-heading)]">Sobre o que você quer conversar?</p>
              {setores.loading ? (
                <Carregando linhas={2} />
              ) : setores.data.length === 0 ? (
                <InfoBox tone="warning">A escola ainda não abriu horários de atendimento.</InfoBox>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {setores.data.map((s) => (
                    <div key={s.id} className={cx('rounded-2xl border p-4', setor?.id === s.id ? 'border-[var(--accent)]' : 'border-[var(--border)]')}>
                      <p className="text-[15px] font-semibold text-[var(--text-heading)]">{s.nome}</p>
                      {s.descricao && <p className="text-[13px] text-[var(--text-muted)]">{s.descricao}</p>}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {s.assuntos.map((a) => (
                          <Chip
                            key={a}
                            small
                            active={setor?.id === s.id && assunto === a}
                            onClick={() => {
                              setSetor(s);
                              setAssunto(a);
                              setSlot(null);
                              setPasso(3);
                            }}
                          >
                            {a}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {passo === 3 && setor && (
            <div className="space-y-4">
              <p className="text-[15px] font-semibold text-[var(--text-heading)]">
                Escolha um horário · <span className="font-normal text-[var(--text-muted)]">{setor.nome}</span>
              </p>
              {slots.error && <ErroBox error={slots.error} onRetry={() => slots.recarregar()} />}
              {slots.loading ? (
                <Carregando linhas={2} />
              ) : dias.length === 0 ? (
                <InfoBox tone="warning">Não há horários livres nas próximas 4 semanas para este setor. Tente outro setor ou fale com a secretaria.</InfoBox>
              ) : (
                <>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {dias.map(([d, ss]) => {
                      const dt = new Date(`${d}T12:00:00-03:00`);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDia(d)}
                          className={cx(
                            'flex min-w-[72px] flex-col items-center rounded-2xl border px-3 py-2 transition-colors',
                            dia === d ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--bg-card-alt)]',
                          )}
                        >
                          <span className="text-[11px] uppercase">{dt.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')}</span>
                          <span className="text-[18px] font-semibold tabular-nums">{dt.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' })}</span>
                          <span className="text-[11px] text-[var(--text-muted)]">{ss.length} horário(s)</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(dias.find(([d]) => d === dia)?.[1] || []).map((s) => (
                      <button
                        key={`${s.disponibilidade_id}-${s.inicio}`}
                        type="button"
                        onClick={() => {
                          setSlot(s);
                          setPasso(4);
                        }}
                        className={cx(
                          'rounded-2xl border p-3 text-left transition-colors',
                          slot?.inicio === s.inicio && slot.disponibilidade_id === s.disponibilidade_id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--bg-card-alt)]',
                        )}
                      >
                        <span className="block text-[17px] font-semibold tabular-nums text-[var(--text-heading)]">
                          {fmtHora(s.inicio)} – {fmtHora(s.fim)}
                        </span>
                        <span className="block text-[13px] text-[var(--text-muted)]">
                          {s.responsavel_nome} · {MODALIDADE[s.modalidade] || s.modalidade}
                        </span>
                        {s.modo_confirmacao === 'aprovacao' && <span className="mt-1 block text-[12px] text-[#B54708]">Precisa de confirmação da escola</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {passo === 4 && slot && setor && (
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <CampoArea label="Conte brevemente o motivo (opcional)" value={motivo} onChange={setMotivo} rows={4} max={600} placeholder="Ex.: Gostaria de entender como está a adaptação do meu filho na turma." />
                <CampoTexto label="Telefone para contato (opcional)" value={telefone} onChange={setTelefone} type="tel" placeholder="Se for diferente do cadastro" />
              </div>
              <div className="space-y-3 rounded-2xl bg-[var(--bg-card-alt)] p-4 text-[14px]">
                <p className="font-semibold text-[var(--text-heading)]">Resumo</p>
                <p className="flex items-center gap-2 text-[var(--text-body)]">
                  <User className="h-4 w-4 text-[var(--text-muted)]" /> {nomeAluno}
                </p>
                <p className="flex items-center gap-2 text-[var(--text-body)]">
                  <CalendarCheck className="h-4 w-4 text-[var(--text-muted)]" /> {setor.nome} · {assunto}
                </p>
                <p className="flex items-center gap-2 capitalize text-[var(--text-body)]">
                  <Clock className="h-4 w-4 text-[var(--text-muted)]" /> {fmtDiaSemana(slot.inicio)}, {fmtHora(slot.inicio)}
                </p>
                <p className="flex items-center gap-2 text-[var(--text-body)]">
                  <MapPin className="h-4 w-4 text-[var(--text-muted)]" /> {MODALIDADE[slot.modalidade]}
                  {slot.local ? ` · ${slot.local}` : ''}
                </p>
                {slot.orientacoes && <p className="text-[13px] text-[var(--text-muted)]">{slot.orientacoes}</p>}
                {slot.modo_confirmacao === 'aprovacao' && (
                  <InfoBox tone="warning">Este horário precisa ser confirmado pela escola. Até lá, é uma solicitação — não um atendimento confirmado.</InfoBox>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        {passo > 1 ? (
          <button type="button" className={btn.secondary} onClick={() => setPasso((p) => p - 1)}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        ) : (
          <span />
        )}
        {passo === 1 && aluno && (
          <button type="button" className={btn.primary} onClick={() => setPasso(2)}>
            Continuar <ArrowRight className="h-4 w-4" />
          </button>
        )}
        {passo === 4 && (
          <button type="button" className={btn.primary} onClick={enviar} disabled={enviando}>
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            {slot?.modo_confirmacao === 'automatico' ? 'Agendar' : 'Solicitar agendamento'}
          </button>
        )}
      </div>
    </Painel>
  );
}

/* ------------------------------------------------------------------ */

function MeusAtendimentos({ dados, toast }: { dados: ReturnType<typeof useCarregar<Agendamento[]>>; toast: ReturnType<typeof useToast> }) {
  const [cancelar, setCancelar] = useState<Agendamento | null>(null);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);

  const abertos = dados.data.filter((a) => ['aguardando', 'confirmado', 'proposta'].includes(a.status)).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const historico = dados.data.filter((a) => !['aguardando', 'confirmado', 'proposta'].includes(a.status));

  const proposta = async (a: Agendamento, aceitar: boolean) => {
    setOcupado(a.id);
    const r = await rpc('agenda_responder_proposta', { p_id: a.id, p_aceitar: aceitar });
    setOcupado(null);
    if (r.error) return toast.show(r.error, 'danger');
    toast.show(aceitar ? 'Novo horário confirmado.' : 'Proposta recusada.');
    dados.recarregar(true);
  };

  if (dados.loading) return <Carregando linhas={3} />;
  if (dados.error) return <ErroBox error={dados.error} onRetry={() => dados.recarregar()} />;
  if (!dados.data.length) return <EmptyState icon={CalendarCheck} title="Você ainda não tem atendimentos" text="Use “Novo agendamento” para marcar uma conversa com a escola." />;

  const card = (a: Agendamento) => {
    const st = STATUS_AG[a.status];
    const reg: Registro | null = Array.isArray(a.agenda_registros) ? a.agenda_registros[0] || null : (a.agenda_registros as Registro) || null;
    const anterior = a.remarcado_de ? dados.data.find((x) => x.id === a.remarcado_de) : null;
    return (
      <Painel key={a.id} className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone={st.tone}>{st.label}</Pill>
          <span className="text-[13px] text-[var(--text-muted)]">{a.student_nome}</span>
        </div>
        <p className="text-[16px] font-semibold capitalize text-[var(--text-heading)]">
          {fmtDiaSemana(a.inicio)}, {fmtHora(a.inicio)}
        </p>
        <p className="text-[14px] text-[var(--text-body)]">
          {a.assunto} · com {a.responsavel_nome || 'a escola'}
        </p>
        {a.status === 'aguardando' && (
          <InfoBox tone="warning">
            Solicitação recebida — <strong>ainda não confirmada</strong>.{a.expira_em ? ` A escola responde até ${fmtDataHora(a.expira_em)}.` : ''}
          </InfoBox>
        )}
        {a.status === 'proposta' && (
          <InfoBox tone="info">
            A escola propôs este novo horário{anterior ? ` no lugar de ${fmtDataHora(anterior.inicio)}` : ''}.{a.orientacao ? ` “${a.orientacao}”` : ''}
          </InfoBox>
        )}
        {a.status === 'recusado' && a.orientacao && <InfoBox>Orientação da escola: {a.orientacao}</InfoBox>}
        {a.status === 'remarcado' && <p className="text-[13px] text-[var(--text-muted)]">Substituído por um novo horário.</p>}
        {reg?.visivel_familia && (reg.encaminhamentos || reg.proximos_passos) && (
          <div className="rounded-xl bg-[var(--bg-card-alt)] p-3 text-[13px]">
            {reg.encaminhamentos && <p>Encaminhamentos: {reg.encaminhamentos}</p>}
            {reg.proximos_passos && <p>Próximos passos: {reg.proximos_passos}</p>}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {a.status === 'proposta' && (
            <>
              <button type="button" className={btn.success} disabled={ocupado === a.id} onClick={() => proposta(a, true)}>
                <Check className="h-4 w-4" /> Aceitar novo horário
              </button>
              <button type="button" className={btn.secondary} disabled={ocupado === a.id} onClick={() => proposta(a, false)}>
                <X className="h-4 w-4" /> Recusar
              </button>
            </>
          )}
          {['aguardando', 'confirmado'].includes(a.status) && new Date(a.inicio) > new Date() && (
            <button type="button" className={btn.ghost} onClick={() => setCancelar(a)}>
              Cancelar
            </button>
          )}
        </div>
      </Painel>
    );
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold text-[var(--text-heading)]">Próximos</h3>
        {abertos.length ? abertos.map(card) : <p className="text-[13px] text-[var(--text-muted)]">Nenhum atendimento marcado.</p>}
      </section>
      {historico.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[15px] font-semibold text-[var(--text-heading)]">Histórico</h3>
          {historico.map(card)}
        </section>
      )}

      <ConfirmModal
        open={!!cancelar}
        title="Cancelar atendimento?"
        tone="danger"
        confirmLabel="Cancelar atendimento"
        loading={ocupado === cancelar?.id}
        onClose={() => setCancelar(null)}
        onConfirm={async () => {
          if (!cancelar) return;
          setOcupado(cancelar.id);
          const r = await rpc('agenda_cancelar', { p_id: cancelar.id, p_motivo: motivo || null });
          setOcupado(null);
          if (r.error) return toast.show(r.error, 'danger');
          toast.show('Atendimento cancelado.');
          setCancelar(null);
          setMotivo('');
          dados.recarregar(true);
        }}
      >
        <div className="mt-2">
          <CampoArea label="Motivo (opcional)" value={motivo} onChange={setMotivo} rows={2} max={300} />
          <p className="mt-2 flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
            <Phone className="h-3 w-3" /> Perto do horário, o cancelamento só pode ser feito falando com a escola.
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
}
