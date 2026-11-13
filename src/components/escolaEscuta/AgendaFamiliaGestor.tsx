import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  Check,
  ClipboardList,
  History,
  Loader2,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrgAtual } from './useEscola';
import { Field, inputCls, cx } from '../ui/kit';
import {
  fmtDataHora,
  fmtDiaSemana,
  fmtHora,
  hojeISO,
  listarDocentes,
  localParaISO,
  mensagemErro,
  rpc,
  useCarregar,
  useRealtime,
} from '../../services/escolaEscuta/api';
import {
  Busca,
  CampoArea,
  CampoSelect,
  CampoTexto,
  Carregando,
  Chip,
  ConfirmModal,
  Drawer,
  EmptyState,
  ErroBox,
  InfoBox,
  Interruptor,
  PageHeader,
  Painel,
  Pill,
  Tabs,
  btn,
  useToast,
  type Tom,
} from './ui';

/* ---------------------------------------------------------------- */
/* Tipos                                                             */
/* ---------------------------------------------------------------- */

export interface Setor {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string | null;
  assuntos: string[];
  ordem: number;
  ativo: boolean;
}

export interface Disponibilidade {
  id: string;
  organization_id: string;
  setor_id: string;
  responsavel_user_id: string | null;
  responsavel_nome: string;
  dias_semana: number[];
  hora_inicio: string;
  hora_fim: string;
  duracao_min: number;
  intervalo_min: number;
  modalidade: 'presencial' | 'online' | 'telefone';
  local: string | null;
  orientacoes: string | null;
  antecedencia_min_horas: number;
  prazo_cancelamento_horas: number;
  modo_confirmacao: 'automatico' | 'aprovacao';
  prazo_analise_horas: number;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  ativo: boolean;
}

export interface Agendamento {
  id: string;
  organization_id: string;
  disponibilidade_id: string;
  setor_id: string;
  responsavel_user_id: string | null;
  responsavel_nome: string | null;
  student_id: string;
  student_nome: string | null;
  guardian_id: string | null;
  solicitante_nome: string | null;
  solicitante_telefone: string | null;
  assunto: string;
  motivo: string | null;
  inicio: string;
  fim: string;
  status: StatusAg;
  expira_em: string | null;
  orientacao: string | null;
  remarcado_de: string | null;
  remarcado_para: string | null;
  pendente_tratamento: boolean;
  motivo_cancelamento: string | null;
  created_at: string;
  agenda_registros?: Registro | Registro[] | null;
}

export interface Registro {
  compareceu: boolean;
  resumo: string | null;
  encaminhamentos: string | null;
  proximos_passos: string | null;
  visivel_familia: boolean;
  registrado_nome: string | null;
  registrado_em: string;
}

export type StatusAg = 'aguardando' | 'confirmado' | 'proposta' | 'recusado' | 'cancelado' | 'realizado' | 'nao_compareceu' | 'remarcado' | 'expirado';

export const STATUS_AG: Record<StatusAg, { label: string; tone: Tom }> = {
  aguardando: { label: 'Aguardando confirmação', tone: 'warning' },
  confirmado: { label: 'Confirmado', tone: 'success' },
  proposta: { label: 'Novo horário proposto', tone: 'info' },
  recusado: { label: 'Recusado', tone: 'danger' },
  cancelado: { label: 'Cancelado', tone: 'neutral' },
  realizado: { label: 'Realizado', tone: 'success' },
  nao_compareceu: { label: 'Não compareceu', tone: 'danger' },
  remarcado: { label: 'Remarcado', tone: 'neutral' },
  expirado: { label: 'Sem resposta no prazo', tone: 'neutral' },
};

export const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MODALIDADE: Record<string, string> = { presencial: 'Presencial', online: 'Online', telefone: 'Por telefone' };

const registroDe = (a: Agendamento): Registro | null => (Array.isArray(a.agenda_registros) ? a.agenda_registros[0] || null : a.agenda_registros || null);

type Aba = 'agendamentos' | 'disponibilidade' | 'indisponibilidades' | 'historico';

/* ================================================================== */

export function AgendaFamiliaGestor({ organizationId }: { organizationId?: string }) {
  const org = useOrgAtual(organizationId);
  const toast = useToast();
  const [aba, setAba] = useState<Aba>('agendamentos');

  const setores = useCarregar<Setor[]>(
    async () => {
      const { data, error } = await supabase.from('agenda_setores').select('*').eq('organization_id', org).order('ordem');
      return error ? { error: mensagemErro(error) } : { data: (data as Setor[]) || [] };
    },
    [org],
    [],
  );
  const disps = useCarregar<Disponibilidade[]>(
    async () => {
      const { data, error } = await supabase.from('agenda_disponibilidades').select('*').eq('organization_id', org).order('responsavel_nome');
      return error ? { error: mensagemErro(error) } : { data: (data as Disponibilidade[]) || [] };
    },
    [org],
    [],
  );
  const ags = useCarregar<Agendamento[]>(
    async () => {
      const { data, error } = await supabase
        .from('agenda_agendamentos')
        .select('*, agenda_registros(*)')
        .eq('organization_id', org)
        .gte('inicio', new Date(Date.now() - 180 * 86400000).toISOString())
        .order('inicio', { ascending: true })
        .limit(1000);
      return error ? { error: mensagemErro(error) } : { data: (data as Agendamento[]) || [] };
    },
    [org],
    [],
  );
  useRealtime(['agenda_agendamentos'], () => ags.recarregar(true), !!org);

  const pendentes = ags.data.filter((a) => a.status === 'aguardando').length;
  const tratar = ags.data.filter((a) => a.pendente_tratamento && ['aguardando', 'confirmado', 'proposta'].includes(a.status)).length;

  if (!org) return <ErroBox error="Escola não identificada para este usuário." />;

  return (
    <div className="space-y-5 text-left">
      <PageHeader icon={CalendarCheck} title="Agenda Família" subtitle="Atendimentos com as famílias por setor: horários, solicitações, confirmações e registros." />

      <Tabs<Aba>
        value={aba}
        onChange={setAba}
        tabs={[
          { id: 'agendamentos', label: 'Agendamentos', icon: CalendarDays, count: pendentes + tratar },
          { id: 'disponibilidade', label: 'Disponibilidade', icon: Settings2 },
          { id: 'indisponibilidades', label: 'Indisponibilidades', icon: CalendarOff },
          { id: 'historico', label: 'Histórico', icon: History },
        ]}
      />

      {aba === 'agendamentos' && (
        <Agendamentos setores={setores.data} disps={disps.data} ags={ags} toast={toast} historico={false} />
      )}
      {aba === 'historico' && <Agendamentos setores={setores.data} disps={disps.data} ags={ags} toast={toast} historico />}
      {aba === 'disponibilidade' && <DisponibilidadeTab org={org} setores={setores} disps={disps} toast={toast} />}
      {aba === 'indisponibilidades' && (
        <Indisponibilidades
          org={org}
          setores={setores.data}
          disps={disps.data}
          toast={toast}
          onIrParaAgendamentos={() => {
            ags.recarregar(true);
            setAba('agendamentos');
          }}
        />
      )}
      {toast.node}
    </div>
  );
}

/* ================================================================== */
/* Agendamentos / Histórico                                            */
/* ================================================================== */

function Agendamentos({
  setores,
  disps,
  ags,
  toast,
  historico,
}: {
  setores: Setor[];
  disps: Disponibilidade[];
  ags: ReturnType<typeof useCarregar<Agendamento[]>>;
  toast: ReturnType<typeof useToast>;
  historico: boolean;
}) {
  const [de, setDe] = useState(historico ? hojeISO(-60) : hojeISO(0));
  const [ate, setAte] = useState(historico ? hojeISO(0) : hojeISO(30));
  const [setor, setSetor] = useState('');
  const [resp, setResp] = useState('');
  const [status, setStatus] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [acao, setAcao] = useState<{ tipo: 'recusar' | 'cancelar' | 'registrar' | 'remarcar' | 'historico'; ag: Agendamento } | null>(null);
  const [trabalhando, setTrabalhando] = useState<string | null>(null);

  const abertos: StatusAg[] = ['aguardando', 'confirmado', 'proposta'];
  const responsaveis = Array.from(new Map(disps.map((d) => [d.responsavel_nome, d.responsavel_nome])).values());

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const ini = new Date(`${de}T00:00:00-03:00`).getTime();
    const fim = new Date(`${ate}T23:59:59-03:00`).getTime();
    return ags.data
      .filter((a) => {
        const t = new Date(a.inicio).getTime();
        const ehHist = !abertos.includes(a.status) || t < Date.now() - 3600000;
        if (historico !== ehHist && !(historico === false && a.pendente_tratamento && abertos.includes(a.status))) return false;
        return (
          t >= ini &&
          t <= fim &&
          (!setor || a.setor_id === setor) &&
          (!resp || a.responsavel_nome === resp) &&
          (!status || a.status === status) &&
          (!q || `${a.student_nome} ${a.solicitante_nome} ${a.solicitante_telefone} ${a.assunto}`.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => (historico ? b.inicio.localeCompare(a.inicio) : Number(b.pendente_tratamento) - Number(a.pendente_tratamento) || a.inicio.localeCompare(b.inicio)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ags.data, de, ate, setor, resp, status, busca, historico]);

  const grupos = useMemo(() => {
    const m = new Map<string, Agendamento[]>();
    for (const a of lista) {
      const k = fmtDiaSemana(a.inicio);
      m.set(k, [...(m.get(k) || []), a]);
    }
    return Array.from(m.entries());
  }, [lista]);

  const responder = async (a: Agendamento, acaoRpc: string, obs?: string) => {
    setTrabalhando(a.id);
    const r = await rpc('agenda_responder', { p_id: a.id, p_acao: acaoRpc, p_obs: obs ?? null });
    setTrabalhando(null);
    if (r.error) return toast.show(r.error, 'danger');
    toast.show(acaoRpc === 'confirmar' ? 'Atendimento confirmado. A família foi avisada.' : 'Situação atualizada.');
    ags.recarregar(true);
  };

  const nomeSetor = (id: string) => setores.find((s) => s.id === id)?.nome || 'Setor';
  const tratar = lista.filter((a) => a.pendente_tratamento && abertos.includes(a.status)).length;

  return (
    <div className="space-y-4">
      <Painel className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="De">{(id) => <input id={id} type="date" value={de} onChange={(e) => setDe(e.target.value)} className={inputCls} />}</Field>
          <Field label="Até">{(id) => <input id={id} type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={inputCls} />}</Field>
          <CampoSelect label="Setor" value={setor} onChange={setSetor} options={[{ value: '', label: 'Todos' }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]} />
          <CampoSelect label="Responsável" value={resp} onChange={setResp} options={[{ value: '', label: 'Todos' }, ...responsaveis.map((n) => ({ value: n, label: n }))]} />
          <CampoSelect
            label="Situação"
            value={status}
            onChange={setStatus}
            options={[
              { value: '', label: 'Todas' },
              ...(Object.keys(STATUS_AG) as StatusAg[])
                .filter((s) => (historico ? !['aguardando', 'proposta'].includes(s) : abertos.includes(s)))
                .map((s) => ({ value: s, label: STATUS_AG[s].label })),
            ]}
          />
        </div>
        <Busca value={busca} onChange={setBusca} placeholder="Estudante, responsável, telefone ou assunto" />
      </Painel>

      {!historico && tratar > 0 && (
        <InfoBox tone="danger" icon={AlertTriangle}>
          <strong>{tratar} atendimento(s) caíram em uma indisponibilidade</strong> e precisam ser remarcados ou cancelados. Eles estão no topo da lista.
        </InfoBox>
      )}

      {ags.error && <ErroBox error={ags.error} onRetry={() => ags.recarregar()} />}

      {ags.loading ? (
        <Carregando linhas={4} />
      ) : lista.length === 0 ? (
        <EmptyState icon={CalendarDays} title={historico ? 'Nenhum atendimento no histórico deste período' : 'Nenhum agendamento neste período'} />
      ) : (
        <div className="space-y-5">
          {grupos.map(([dia, itens]) => (
            <section key={dia}>
              <h3 className="mb-2 text-[13px] font-semibold capitalize text-[var(--text-muted)]">{dia}</h3>
              <ul className="space-y-2.5">
                {itens.map((a) => {
                  const st = STATUS_AG[a.status];
                  const reg = registroDe(a);
                  const ocupado = trabalhando === a.id;
                  return (
                    <li key={a.id}>
                      <Painel className={cx('flex flex-col gap-3 lg:flex-row lg:items-start', a.pendente_tratamento && abertos.includes(a.status) && 'border-[#F5C2C0] bg-[#FFFBFA]')}>
                        <div className="flex w-20 shrink-0 flex-col">
                          <span className="text-[20px] font-semibold tabular-nums text-[var(--text-heading)]">{fmtHora(a.inicio)}</span>
                          <span className="text-[12px] text-[var(--text-muted)]">até {fmtHora(a.fim)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Pill tone={st.tone}>{st.label}</Pill>
                            <Pill>{nomeSetor(a.setor_id)}</Pill>
                            {a.pendente_tratamento && abertos.includes(a.status) && <Pill tone="danger">Precisa de tratamento</Pill>}
                            {a.remarcado_de && <Pill tone="info">Remarcação</Pill>}
                          </div>
                          <p className="mt-1.5 text-[15px] font-semibold text-[var(--text-heading)]">
                            {a.assunto} · {a.student_nome || 'Estudante'}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--text-muted)]">
                            <span>Solicitante: {a.solicitante_nome || '—'}</span>
                            {a.solicitante_telefone && (
                              <a href={`tel:${a.solicitante_telefone}`} className="inline-flex items-center gap-1 hover:text-[var(--accent)]">
                                <Phone className="h-3 w-3" />
                                {a.solicitante_telefone}
                              </a>
                            )}
                            <span>Com: {a.responsavel_nome || '—'}</span>
                          </p>
                          {a.motivo && <p className="mt-2 rounded-xl bg-[var(--bg-card-alt)] px-3 py-2 text-[13px] text-[var(--text-body)]">“{a.motivo}”</p>}
                          {a.status === 'aguardando' && a.expira_em && (
                            <p className="mt-1.5 text-[12px] text-[#B54708]">Responda até {fmtDataHora(a.expira_em)}, ou a vaga é liberada.</p>
                          )}
                          {a.orientacao && ['recusado', 'proposta'].includes(a.status) && <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">Orientação: {a.orientacao}</p>}
                          {a.motivo_cancelamento && a.status === 'cancelado' && <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">Motivo: {a.motivo_cancelamento}</p>}
                          {reg && (
                            <div className="mt-2 rounded-xl border border-[var(--border)] px-3 py-2 text-[13px]">
                              <p className="font-medium text-[var(--text-heading)]">
                                {reg.compareceu ? 'Compareceu' : 'Não compareceu'} · registrado por {reg.registrado_nome || '—'}
                                {reg.visivel_familia ? ' · visível para a família' : ''}
                              </p>
                              {reg.encaminhamentos && <p className="mt-1 text-[var(--text-body)]">Encaminhamentos: {reg.encaminhamentos}</p>}
                              {reg.proximos_passos && <p className="text-[var(--text-body)]">Próximos passos: {reg.proximos_passos}</p>}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 lg:max-w-[240px] lg:justify-end">
                          {ocupado && <Loader2 className="m-2 h-4 w-4 animate-spin text-[var(--text-muted)]" />}
                          {a.status === 'aguardando' && (
                            <button type="button" className={btn.success} disabled={ocupado} onClick={() => responder(a, 'confirmar')}>
                              <Check className="h-4 w-4" /> Confirmar
                            </button>
                          )}
                          {['aguardando', 'confirmado'].includes(a.status) && (
                            <button type="button" className={btn.ghost} onClick={() => setAcao({ tipo: 'recusar', ag: a })}>
                              <X className="h-4 w-4" /> Recusar
                            </button>
                          )}
                          {abertos.includes(a.status) && (
                            <button type="button" className={btn.ghost} onClick={() => setAcao({ tipo: 'remarcar', ag: a })}>
                              <RefreshCw className="h-4 w-4" /> Remarcar
                            </button>
                          )}
                          {abertos.includes(a.status) && (
                            <button type="button" className={btn.ghost} onClick={() => setAcao({ tipo: 'cancelar', ag: a })}>
                              <Ban className="h-4 w-4" /> Cancelar
                            </button>
                          )}
                          {['confirmado', 'realizado', 'nao_compareceu'].includes(a.status) && (
                            <button type="button" className={btn.ghost} onClick={() => setAcao({ tipo: 'registrar', ag: a })}>
                              <ClipboardList className="h-4 w-4" /> {reg ? 'Editar registro' : 'Registrar atendimento'}
                            </button>
                          )}
                          <button type="button" className={btn.ghost} onClick={() => setAcao({ tipo: 'historico', ag: a })}>
                            <History className="h-4 w-4" /> Histórico
                          </button>
                        </div>
                      </Painel>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {acao?.tipo === 'recusar' && (
        <MotivoModal
          titulo="Recusar solicitação"
          rotulo="Orientação para a família *"
          placeholder="Ex.: Este assunto é tratado pela Secretaria. Agende por lá, por favor."
          obrigatorio
          confirmar="Recusar"
          onClose={() => setAcao(null)}
          onConfirm={async (txt) => {
            await responder(acao.ag, 'recusar', txt);
            setAcao(null);
          }}
        />
      )}
      {acao?.tipo === 'cancelar' && (
        <MotivoModal
          titulo="Cancelar atendimento"
          rotulo="Motivo (a família verá)"
          confirmar="Cancelar atendimento"
          onClose={() => setAcao(null)}
          onConfirm={async (txt) => {
            const r = await rpc('agenda_cancelar', { p_id: acao.ag.id, p_motivo: txt || null });
            if (r.error) return toast.show(r.error, 'danger');
            toast.show('Atendimento cancelado. A família foi avisada.');
            setAcao(null);
            ags.recarregar(true);
          }}
        />
      )}
      {acao?.tipo === 'registrar' && (
        <RegistroDrawer
          ag={acao.ag}
          onClose={() => setAcao(null)}
          onSalvo={() => {
            toast.show('Registro salvo.');
            setAcao(null);
            ags.recarregar(true);
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
      {acao?.tipo === 'remarcar' && (
        <RemarcarDrawer
          ag={acao.ag}
          disps={disps.filter((d) => d.setor_id === acao.ag.setor_id && d.ativo)}
          onClose={() => setAcao(null)}
          onFeito={() => {
            toast.show('Novo horário proposto. A família vai confirmar no portal.');
            setAcao(null);
            ags.recarregar(true);
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
      {acao?.tipo === 'historico' && <HistoricoDrawer ag={acao.ag} onClose={() => setAcao(null)} />}
    </div>
  );
}

function MotivoModal({
  titulo,
  rotulo,
  placeholder,
  obrigatorio,
  confirmar,
  onClose,
  onConfirm,
}: {
  titulo: string;
  rotulo: string;
  placeholder?: string;
  obrigatorio?: boolean;
  confirmar: string;
  onClose: () => void;
  onConfirm: (txt: string) => Promise<void>;
}) {
  const [txt, setTxt] = useState('');
  const [enviando, setEnviando] = useState(false);
  return (
    <ConfirmModal
      open
      title={titulo}
      tone="danger"
      confirmLabel={confirmar}
      loading={enviando}
      onClose={onClose}
      onConfirm={async () => {
        if (obrigatorio && !txt.trim()) return;
        setEnviando(true);
        await onConfirm(txt.trim());
        setEnviando(false);
      }}
    >
      <div className="mt-2">
        <CampoArea label={rotulo} value={txt} onChange={setTxt} placeholder={placeholder} rows={3} max={500} />
        {obrigatorio && !txt.trim() && <p className="mt-1 text-[12px] text-[var(--text-muted)]">Obrigatório.</p>}
      </div>
    </ConfirmModal>
  );
}

function RegistroDrawer({ ag, onClose, onSalvo, onErro }: { ag: Agendamento; onClose: () => void; onSalvo: () => void; onErro: (m: string) => void }) {
  const atual = registroDe(ag);
  const [compareceu, setCompareceu] = useState<boolean>(atual?.compareceu ?? true);
  const [resumo, setResumo] = useState(atual?.resumo || '');
  const [enc, setEnc] = useState(atual?.encaminhamentos || '');
  const [prox, setProx] = useState(atual?.proximos_passos || '');
  const [visivel, setVisivel] = useState(atual?.visivel_familia ?? false);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    const r = await rpc('agenda_registrar_atendimento', {
      p_id: ag.id,
      p_compareceu: compareceu,
      p_resumo: resumo || null,
      p_encaminhamentos: enc || null,
      p_proximos: prox || null,
      p_visivel_familia: visivel,
    });
    setSalvando(false);
    if (r.error) return onErro(r.error);
    onSalvo();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      bloqueado={salvando}
      title="Registro do atendimento"
      subtitle={`${ag.student_nome} · ${fmtDataHora(ag.inicio)}`}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={btn.primary} onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar registro
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Comparecimento</p>
          <div className="flex gap-1.5">
            <Chip active={compareceu} onClick={() => setCompareceu(true)}>
              Compareceu
            </Chip>
            <Chip active={!compareceu} onClick={() => setCompareceu(false)}>
              Não compareceu
            </Chip>
          </div>
        </div>
        <CampoArea label="Resumo (uso interno)" value={resumo} onChange={setResumo} rows={4} />
        <CampoArea label="Encaminhamentos" value={enc} onChange={setEnc} rows={3} />
        <CampoArea label="Próximos passos" value={prox} onChange={setProx} rows={3} />
        <Interruptor
          label="Mostrar encaminhamentos e próximos passos para a família"
          hint="O resumo interno nunca é mostrado"
          checked={visivel}
          onChange={setVisivel}
        />
      </div>
    </Drawer>
  );
}

function RemarcarDrawer({
  ag,
  disps,
  onClose,
  onFeito,
  onErro,
}: {
  ag: Agendamento;
  disps: Disponibilidade[];
  onClose: () => void;
  onFeito: () => void;
  onErro: (m: string) => void;
}) {
  const [dia, setDia] = useState(hojeISO(1));
  const [slots, setSlots] = useState<{ disponibilidade_id: string; inicio: string; fim: string; responsavel_nome: string }[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [escolhido, setEscolhido] = useState<{ disp: string; inicio: string } | null>(null);
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setEscolhido(null);
    rpc<any[]>('agenda_horarios_livres', { p_setor: ag.setor_id, p_de: dia, p_ate: dia }).then((r) => {
      if (!vivo) return;
      setSlots(r.data || []);
      setCarregando(false);
    });
    return () => {
      vivo = false;
    };
  }, [ag.setor_id, dia]);

  const salvar = async () => {
    if (!escolhido) return;
    setSalvando(true);
    const r = await rpc('agenda_remarcar', { p_id: ag.id, p_disponibilidade: escolhido.disp, p_inicio: escolhido.inicio, p_obs: obs || null });
    setSalvando(false);
    if (r.error) return onErro(r.error);
    onFeito();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      bloqueado={salvando}
      title="Propor novo horário"
      subtitle={`${ag.student_nome} · hoje marcado para ${fmtDataHora(ag.inicio)}`}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Voltar
          </button>
          <button type="button" className={btn.primary} onClick={salvar} disabled={!escolhido || salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Propor horário
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <InfoBox>O horário atual fica no histórico, ligado ao novo. A família recebe a proposta e confirma ou recusa no portal.</InfoBox>
        {disps.length === 0 && <InfoBox tone="warning">Este setor não tem disponibilidade ativa.</InfoBox>}
        <Field label="Dia">{(id) => <input id={id} type="date" min={hojeISO(0)} value={dia} onChange={(e) => setDia(e.target.value)} className={inputCls} />}</Field>
        {carregando ? (
          <Carregando linhas={1} altura="h-16" />
        ) : slots.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">Nenhum horário livre neste dia.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <Chip
                key={`${s.disponibilidade_id}-${s.inicio}`}
                active={escolhido?.inicio === s.inicio && escolhido.disp === s.disponibilidade_id}
                onClick={() => setEscolhido({ disp: s.disponibilidade_id, inicio: s.inicio })}
              >
                {fmtHora(s.inicio)} · {s.responsavel_nome}
              </Chip>
            ))}
          </div>
        )}
        <CampoArea label="Mensagem para a família" value={obs} onChange={setObs} rows={2} max={400} placeholder="Ex.: Precisamos remarcar por causa de uma reunião interna." />
      </div>
    </Drawer>
  );
}

function HistoricoDrawer({ ag, onClose }: { ag: Agendamento; onClose: () => void }) {
  const ev = useCarregar<any[]>(
    async () => {
      const ids = [ag.id, ag.remarcado_de, ag.remarcado_para].filter(Boolean) as string[];
      const { data, error } = await supabase.from('agenda_eventos').select('*').in('agendamento_id', ids).order('created_at');
      return error ? { error: mensagemErro(error) } : { data: data || [] };
    },
    [ag.id],
    [],
  );
  return (
    <Drawer open onClose={onClose} title="Histórico do atendimento" subtitle={`${ag.student_nome} · ${ag.assunto}`}>
      {ev.loading ? (
        <Carregando linhas={3} altura="h-12" />
      ) : (
        <ol className="relative space-y-4 border-l border-[var(--border)] pl-5">
          {ev.data.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-[var(--bg-card)] bg-[var(--accent)]" />
              <p className="text-[14px] font-medium text-[var(--text-heading)]">
                {e.de_status ? `${STATUS_AG[e.de_status as StatusAg]?.label || e.de_status} → ` : 'Criado: '}
                {STATUS_AG[e.para_status as StatusAg]?.label || e.para_status}
              </p>
              <p className="text-[12px] text-[var(--text-muted)]">
                {fmtDataHora(e.created_at)} · {e.autor_nome || 'Sistema'}
              </p>
              {e.observacao && <p className="mt-0.5 text-[13px] text-[var(--text-body)]">{e.observacao}</p>}
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
}

/* ================================================================== */
/* Disponibilidade                                                     */
/* ================================================================== */

function DisponibilidadeTab({
  org,
  setores,
  disps,
  toast,
}: {
  org: string;
  setores: ReturnType<typeof useCarregar<Setor[]>>;
  disps: ReturnType<typeof useCarregar<Disponibilidade[]>>;
  toast: ReturnType<typeof useToast>;
}) {
  const [editSetor, setEditSetor] = useState<Partial<Setor> | null>(null);
  const [editDisp, setEditDisp] = useState<Partial<Disponibilidade> | null>(null);
  const [criando, setCriando] = useState(false);
  const [cfgAberta, setCfgAberta] = useState(false);

  const criarPadrao = async () => {
    setCriando(true);
    const r = await rpc('agenda_setores_padrao', { p_org: org });
    setCriando(false);
    if (r.error) return toast.show(r.error, 'danger');
    setores.recarregar();
  };

  if (setores.loading) return <Carregando linhas={3} />;
  if (setores.error) return <ErroBox error={setores.error} onRetry={() => setores.recarregar()} />;

  if (setores.data.length === 0)
    return (
      <EmptyState
        icon={Settings2}
        title="Comece pelos setores"
        text="Criamos os 4 setores sugeridos (Secretaria, Equipe Pedagógica, Disciplina/Convivência e Gestão/Direção). Depois você ajusta nomes e assuntos."
        action={
          <button type="button" className={btn.primary} onClick={criarPadrao} disabled={criando}>
            {criando && <Loader2 className="h-4 w-4 animate-spin" />} Criar setores sugeridos
          </button>
        }
      />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={btn.secondary} onClick={() => setCfgAberta(true)}>
          <AlertTriangle className="h-4 w-4" /> Contatos de urgência
        </button>
        <button type="button" className={btn.secondary} onClick={() => setEditSetor({ organization_id: org, nome: '', assuntos: [], ativo: true, ordem: setores.data.length + 1 })}>
          <Plus className="h-4 w-4" /> Novo setor
        </button>
      </div>

      {setores.data.map((s) => {
        const ds = disps.data.filter((d) => d.setor_id === s.id);
        return (
          <Painel key={s.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-semibold text-[var(--text-heading)]">{s.nome}</h3>
                  {!s.ativo && <Pill>Inativo</Pill>}
                </div>
                {s.descricao && <p className="text-[13px] text-[var(--text-muted)]">{s.descricao}</p>}
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.assuntos.map((a) => (
                    <Pill key={a}>{a}</Pill>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <button type="button" className={btn.ghost} onClick={() => setEditSetor(s)}>
                  <Pencil className="h-4 w-4" /> Editar setor
                </button>
                <button
                  type="button"
                  className={btn.secondary}
                  onClick={() =>
                    setEditDisp({
                      organization_id: org,
                      setor_id: s.id,
                      responsavel_nome: '',
                      dias_semana: [1, 2, 3, 4, 5],
                      hora_inicio: '08:00',
                      hora_fim: '12:00',
                      duracao_min: 30,
                      intervalo_min: 0,
                      modalidade: 'presencial',
                      antecedencia_min_horas: 24,
                      prazo_cancelamento_horas: 12,
                      modo_confirmacao: 'aprovacao',
                      prazo_analise_horas: 24,
                      ativo: true,
                    })
                  }
                >
                  <Plus className="h-4 w-4" /> Horários
                </button>
              </div>
            </div>
            {ds.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border)] px-3 py-3 text-[13px] text-[var(--text-muted)]">Sem horários. As famílias não conseguem agendar com este setor.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
                {ds.map((d) => (
                  <li key={d.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 text-[14px]">
                      <p className="font-semibold text-[var(--text-heading)]">
                        {d.responsavel_nome} {!d.ativo && <Pill>Pausado</Pill>}
                      </p>
                      <p className="text-[13px] text-[var(--text-muted)]">
                        {d.dias_semana
                          .slice()
                          .sort()
                          .map((x) => DIAS[x])
                          .join(', ')}{' '}
                        · {d.hora_inicio.slice(0, 5)}–{d.hora_fim.slice(0, 5)} · {d.duracao_min} min{d.intervalo_min ? ` + ${d.intervalo_min} min de intervalo` : ''} ·{' '}
                        {MODALIDADE[d.modalidade]} · {d.modo_confirmacao === 'automatico' ? 'Confirmação automática' : `Com aprovação (${d.prazo_analise_horas} h)`}
                      </p>
                    </div>
                    <button type="button" className={btn.ghost} onClick={() => setEditDisp(d)}>
                      <Pencil className="h-4 w-4" /> Editar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Painel>
        );
      })}

      {editSetor && (
        <SetorDrawer
          setor={editSetor}
          onClose={() => setEditSetor(null)}
          onSalvo={() => {
            setEditSetor(null);
            setores.recarregar(true);
            toast.show('Setor salvo.');
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
      {editDisp && (
        <DispDrawer
          org={org}
          disp={editDisp}
          setores={setores.data}
          onClose={() => setEditDisp(null)}
          onSalvo={() => {
            setEditDisp(null);
            disps.recarregar(true);
            toast.show('Horários salvos.');
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
      {cfgAberta && <ConfigUrgencia org={org} onClose={() => setCfgAberta(false)} onSalvo={() => toast.show('Contatos salvos.')} />}
    </div>
  );
}

function SetorDrawer({ setor, onClose, onSalvo, onErro }: { setor: Partial<Setor>; onClose: () => void; onSalvo: () => void; onErro: (m: string) => void }) {
  const [s, setS] = useState(setor);
  const [novoAssunto, setNovoAssunto] = useState('');
  const [salvando, setSalvando] = useState(false);

  const add = () => {
    const a = novoAssunto.trim();
    if (!a || (s.assuntos || []).includes(a)) return;
    setS({ ...s, assuntos: [...(s.assuntos || []), a] });
    setNovoAssunto('');
  };
  const salvar = async () => {
    if (!s.nome?.trim()) return onErro('Dê um nome ao setor.');
    if (!(s.assuntos || []).length) return onErro('Adicione pelo menos um assunto.');
    setSalvando(true);
    const payload = { organization_id: s.organization_id, nome: s.nome.trim(), descricao: s.descricao || null, assuntos: s.assuntos, ativo: s.ativo ?? true, ordem: s.ordem ?? 0 };
    const { error } = s.id ? await supabase.from('agenda_setores').update(payload).eq('id', s.id) : await supabase.from('agenda_setores').insert(payload);
    setSalvando(false);
    if (error) return onErro(mensagemErro(error));
    onSalvo();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={s.id ? 'Editar setor' : 'Novo setor'}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={btn.primary} onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <CampoTexto label="Nome do setor" required value={s.nome || ''} onChange={(v) => setS({ ...s, nome: v })} max={60} />
        <CampoTexto label="Descrição curta" value={s.descricao || ''} onChange={(v) => setS({ ...s, descricao: v })} max={140} />
        <div>
          <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Assuntos que a família pode escolher</p>
          <div className="flex flex-wrap gap-1.5">
            {(s.assuntos || []).map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-card-alt)] py-1 pl-3 pr-1 text-[13px]">
                {a}
                <button type="button" aria-label={`Remover ${a}`} onClick={() => setS({ ...s, assuntos: (s.assuntos || []).filter((x) => x !== a) })} className="rounded-full p-0.5 hover:bg-[var(--border)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={novoAssunto}
              onChange={(e) => setNovoAssunto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
              placeholder="Novo assunto"
              aria-label="Novo assunto"
              className={inputCls}
            />
            <button type="button" className={btn.secondary} onClick={add}>
              Adicionar
            </button>
          </div>
        </div>
        <Interruptor label="Setor ativo" hint="Desative para parar de receber agendamentos" checked={s.ativo ?? true} onChange={(v) => setS({ ...s, ativo: v })} />
      </div>
    </Drawer>
  );
}

function DispDrawer({
  org,
  disp,
  setores,
  onClose,
  onSalvo,
  onErro,
}: {
  org: string;
  disp: Partial<Disponibilidade>;
  setores: Setor[];
  onClose: () => void;
  onSalvo: () => void;
  onErro: (m: string) => void;
}) {
  const [d, setD] = useState(disp);
  const [salvando, setSalvando] = useState(false);
  const [pessoas, setPessoas] = useState<{ user_id: string; nome: string }[]>([]);
  const set = (p: Partial<Disponibilidade>) => setD((x) => ({ ...x, ...p }));

  useEffect(() => {
    (async () => {
      const [{ data: u }, docs] = await Promise.all([supabase.auth.getUser(), listarDocentes(org)]);
      const lista = [...(docs.data || [])];
      if (u?.user && !lista.some((x) => x.user_id === u.user!.id)) lista.unshift({ user_id: u.user.id, nome: 'Eu' });
      const visto = new Set<string>();
      setPessoas(lista.filter((x) => x.user_id && !visto.has(x.user_id) && visto.add(x.user_id)));
    })();
  }, [org]);

  const salvar = async () => {
    if (!d.responsavel_nome?.trim()) return onErro('Informe o profissional responsável.');
    if (!d.dias_semana?.length) return onErro('Escolha pelo menos um dia da semana.');
    if ((d.hora_fim || '') <= (d.hora_inicio || '')) return onErro('O horário final precisa ser depois do inicial.');
    setSalvando(true);
    const { id, ...resto } = d as Disponibilidade;
    const payload = { ...resto, responsavel_nome: d.responsavel_nome.trim(), vigencia_inicio: d.vigencia_inicio || null, vigencia_fim: d.vigencia_fim || null };
    const { error } = id ? await supabase.from('agenda_disponibilidades').update(payload).eq('id', id) : await supabase.from('agenda_disponibilidades').insert(payload);
    setSalvando(false);
    if (error) return onErro(mensagemErro(error));
    onSalvo();
  };

  const num = (label: string, campo: keyof Disponibilidade, hint?: string) => (
    <div>
      <Field label={label}>
        {(id) => <input id={id} type="number" min={0} value={(d[campo] as number) ?? 0} onChange={(e) => set({ [campo]: Number(e.target.value) } as any)} className={inputCls} />}
      </Field>
      {hint && <p className="mt-1 text-[12px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      bloqueado={salvando}
      width="max-w-3xl"
      title={d.id ? 'Editar horários' : 'Novos horários de atendimento'}
      subtitle={setores.find((s) => s.id === d.setor_id)?.nome}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={btn.primary} onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto label="Profissional responsável (nome exibido)" required value={d.responsavel_nome || ''} onChange={(v) => set({ responsavel_nome: v })} max={80} />
          <CampoSelect
            label="Recebe os avisos (usuário)"
            value={d.responsavel_user_id || ''}
            onChange={(v) => set({ responsavel_user_id: v || null })}
            options={[{ value: '', label: 'Toda a gestão' }, ...pessoas.map((p) => ({ value: p.user_id, label: p.nome }))]}
          />
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Dias da semana</p>
          <div className="flex flex-wrap gap-1.5">
            {DIAS.map((nome, i) => (
              <Chip
                key={nome}
                active={(d.dias_semana || []).includes(i)}
                onClick={() => {
                  const s = new Set(d.dias_semana || []);
                  s.has(i) ? s.delete(i) : s.add(i);
                  set({ dias_semana: Array.from(s).sort() });
                }}
              >
                {nome}
              </Chip>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Das">{(id) => <input id={id} type="time" value={(d.hora_inicio || '').slice(0, 5)} onChange={(e) => set({ hora_inicio: e.target.value })} className={inputCls} />}</Field>
          <Field label="Até">{(id) => <input id={id} type="time" value={(d.hora_fim || '').slice(0, 5)} onChange={(e) => set({ hora_fim: e.target.value })} className={inputCls} />}</Field>
          {num('Duração (min)', 'duracao_min')}
          {num('Intervalo (min)', 'intervalo_min')}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            label="Atendimento"
            value={d.modalidade || 'presencial'}
            onChange={(v) => set({ modalidade: v as Disponibilidade['modalidade'] })}
            options={[
              { value: 'presencial', label: 'Presencial' },
              { value: 'online', label: 'Online' },
              { value: 'telefone', label: 'Por telefone' },
            ]}
          />
          <CampoTexto label="Local ou link" value={d.local || ''} onChange={(v) => set({ local: v })} placeholder="Ex.: Sala da coordenação, bloco B" />
        </div>
        <CampoArea label="Orientações para a família" value={d.orientacoes || ''} onChange={(v) => set({ orientacoes: v })} rows={2} placeholder="Ex.: Traga o caderno de recados." />

        <div className="grid gap-4 sm:grid-cols-3">
          {num('Antecedência mínima (horas)', 'antecedencia_min_horas', 'Quanto tempo antes a família pode agendar')}
          {num('Prazo para cancelar (horas)', 'prazo_cancelamento_horas', 'Até quantas horas antes a família cancela pelo portal')}
          <div>
            <CampoSelect
              label="Confirmação"
              value={d.modo_confirmacao || 'aprovacao'}
              onChange={(v) => set({ modo_confirmacao: v as Disponibilidade['modo_confirmacao'] })}
              options={[
                { value: 'aprovacao', label: 'Com aprovação da equipe' },
                { value: 'automatico', label: 'Automática' },
              ]}
            />
          </div>
        </div>
        {d.modo_confirmacao !== 'automatico' && (
          <div className="grid gap-4 sm:grid-cols-3">
            {num('Prazo de análise (horas)', 'prazo_analise_horas', 'A vaga fica reservada para a família só durante esse prazo')}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Válido a partir de (opcional)">
            {(id) => <input id={id} type="date" value={d.vigencia_inicio || ''} onChange={(e) => set({ vigencia_inicio: e.target.value || null })} className={inputCls} />}
          </Field>
          <Field label="Válido até (opcional)">
            {(id) => <input id={id} type="date" value={d.vigencia_fim || ''} onChange={(e) => set({ vigencia_fim: e.target.value || null })} className={inputCls} />}
          </Field>
        </div>
        <Interruptor label="Horários ativos" hint="Pause para parar de receber novos agendamentos" checked={d.ativo ?? true} onChange={(v) => set({ ativo: v })} />
      </div>
    </Drawer>
  );
}

function ConfigUrgencia({ org, onClose, onSalvo }: { org: string; onClose: () => void; onSalvo: () => void }) {
  const cfg = useCarregar<any>(
    async () => {
      const { data } = await supabase.from('agenda_config').select('*').eq('organization_id', org).maybeSingle();
      return { data: data || { organization_id: org, contatos_urgencia: '', aviso_emergencia: 'Este agendamento não é um canal de emergência.' } };
    },
    [org],
    null,
  );
  const [salvando, setSalvando] = useState(false);
  const c = cfg.data;
  const salvar = async () => {
    setSalvando(true);
    await supabase.from('agenda_config').upsert({ organization_id: org, contatos_urgencia: c.contatos_urgencia, aviso_emergencia: c.aviso_emergencia, updated_at: new Date().toISOString() });
    setSalvando(false);
    onSalvo();
    onClose();
  };
  return (
    <Drawer
      open
      onClose={onClose}
      title="Contatos e procedimentos urgentes"
      subtitle="Aparece no topo da agenda da família."
      footer={
        <button type="button" className={btn.primary} onClick={salvar} disabled={salvando || !c}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
      }
    >
      {!c ? (
        <Carregando linhas={2} />
      ) : (
        <div className="space-y-4">
          <CampoTexto label="Aviso" value={c.aviso_emergencia || ''} onChange={(v) => cfg.setData({ ...c, aviso_emergencia: v })} max={160} />
          <CampoArea
            label="Contatos e procedimentos"
            value={c.contatos_urgencia || ''}
            onChange={(v) => cfg.setData({ ...c, contatos_urgencia: v })}
            rows={5}
            placeholder={'Secretaria: (82) 3333-0000\nCoordenação: (82) 99999-0000\nEm caso de emergência médica, ligue 192.'}
          />
        </div>
      )}
    </Drawer>
  );
}

/* ================================================================== */
/* Indisponibilidades                                                  */
/* ================================================================== */

function Indisponibilidades({
  org,
  setores,
  disps,
  toast,
  onIrParaAgendamentos,
}: {
  org: string;
  setores: Setor[];
  disps: Disponibilidade[];
  toast: ReturnType<typeof useToast>;
  onIrParaAgendamentos: () => void;
}) {
  const lista = useCarregar<any[]>(
    async () => {
      const { data, error } = await supabase.from('agenda_indisponibilidades').select('*').eq('organization_id', org).gte('fim', new Date(Date.now() - 30 * 86400000).toISOString()).order('inicio');
      return error ? { error: mensagemErro(error) } : { data: data || [] };
    },
    [org],
    [],
  );
  const [form, setForm] = useState({ setor: '', resp: '', inicio: '', fim: '', motivo: '' });
  const [salvando, setSalvando] = useState(false);
  const [conflitos, setConflitos] = useState<any[] | null>(null);
  const [excluir, setExcluir] = useState<any | null>(null);
  const pessoas = Array.from(new Map(disps.filter((d) => d.responsavel_user_id).map((d) => [d.responsavel_user_id!, d.responsavel_nome])).entries());

  const bloquear = async (forcar: boolean) => {
    if (!form.inicio || !form.fim || !form.motivo.trim()) return toast.show('Preencha início, fim e motivo.', 'danger');
    setSalvando(true);
    const r = await rpc<any>('agenda_bloquear', {
      p_org: org,
      p_setor: form.setor || null,
      p_responsavel: form.resp || null,
      p_inicio: localParaISO(form.inicio),
      p_fim: localParaISO(form.fim),
      p_motivo: form.motivo,
      p_forcar: forcar,
    });
    setSalvando(false);
    if (r.error) return toast.show(r.error, 'danger');
    if (!r.data.criado) {
      setConflitos(r.data.conflitos);
      return;
    }
    setConflitos(null);
    setForm({ setor: '', resp: '', inicio: '', fim: '', motivo: '' });
    lista.recarregar(true);
    if ((r.data.conflitos || []).length) {
      toast.show(`Período bloqueado. ${r.data.conflitos.length} atendimento(s) ficaram marcados para remarcar ou cancelar.`);
      onIrParaAgendamentos();
    } else toast.show('Período bloqueado.');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Painel className="space-y-4 self-start">
        <h3 className="text-[15px] font-semibold text-[var(--text-heading)]">Bloquear período</h3>
        <p className="-mt-2 text-[13px] text-[var(--text-muted)]">Férias, reuniões internas, feriados ou ausências.</p>
        <CampoSelect label="Setor" value={form.setor} onChange={(v) => setForm({ ...form, setor: v })} options={[{ value: '', label: 'Escola toda' }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]} />
        <CampoSelect label="Profissional" value={form.resp} onChange={(v) => setForm({ ...form, resp: v })} options={[{ value: '', label: 'Todos' }, ...pessoas.map(([id, nome]) => ({ value: id, label: nome }))]} />
        <Field label="Início">{(id) => <input id={id} type="datetime-local" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className={inputCls} />}</Field>
        <Field label="Fim">{(id) => <input id={id} type="datetime-local" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} className={inputCls} />}</Field>
        <CampoTexto label="Motivo" required value={form.motivo} onChange={(v) => setForm({ ...form, motivo: v })} max={120} placeholder="Ex.: Recesso escolar" />
        <button type="button" className={`${btn.primary} w-full`} onClick={() => bloquear(false)} disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />} <CalendarOff className="h-4 w-4" /> Bloquear
        </button>
      </Painel>

      <div className="space-y-3">
        {lista.loading ? (
          <Carregando linhas={3} altura="h-16" />
        ) : lista.data.length === 0 ? (
          <EmptyState icon={CalendarOff} title="Nenhum período bloqueado" />
        ) : (
          lista.data.map((i) => (
            <Painel key={i.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-[var(--text-heading)]">{i.motivo}</p>
                <p className="text-[13px] text-[var(--text-muted)]">
                  {fmtDataHora(i.inicio)} → {fmtDataHora(i.fim)} · {i.setor_id ? setores.find((s) => s.id === i.setor_id)?.nome : 'Escola toda'}
                  {i.responsavel_user_id ? ` · ${disps.find((d) => d.responsavel_user_id === i.responsavel_user_id)?.responsavel_nome || 'profissional'}` : ''}
                </p>
              </div>
              <button type="button" className={btn.icon} aria-label="Remover bloqueio" onClick={() => setExcluir(i)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </Painel>
          ))
        )}
      </div>

      <ConfirmModal
        open={!!conflitos}
        title="Há atendimentos nesse período"
        tone="danger"
        confirmLabel="Bloquear e tratar depois"
        loading={salvando}
        onClose={() => setConflitos(null)}
        onConfirm={() => bloquear(true)}
        text="Nenhum atendimento é apagado. Eles ficam marcados no topo da lista de Agendamentos para você remarcar ou cancelar, avisando cada família."
      >
        <ul className="mt-3 max-h-60 space-y-1.5 overflow-y-auto">
          {(conflitos || []).map((c) => (
            <li key={c.id} className="rounded-xl bg-[var(--bg-card-alt)] px-3 py-2 text-[13px]">
              <strong>{fmtDataHora(c.inicio)}</strong> · {c.student_nome} · {c.assunto} · <span className="text-[var(--text-muted)]">{STATUS_AG[c.status as StatusAg]?.label}</span>
            </li>
          ))}
        </ul>
      </ConfirmModal>
      <ConfirmModal
        open={!!excluir}
        title="Remover bloqueio?"
        text="Os horários voltam a ficar disponíveis para as famílias."
        confirmLabel="Remover"
        onClose={() => setExcluir(null)}
        onConfirm={async () => {
          const { error } = await supabase.from('agenda_indisponibilidades').delete().eq('id', excluir.id);
          if (error) toast.show(mensagemErro(error), 'danger');
          setExcluir(null);
          lista.recarregar(true);
        }}
      />
    </div>
  );
}
