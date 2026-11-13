import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, Gavel, HandHeart, Lightbulb, ListChecks, Loader2, Lock, MapPin, MessageSquareReply, Plus, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrgAtual } from './useEscola';
import { fmtData, fmtDataHora, mensagemErro, rpc, useCarregar, useMeusEstudantes, useMinhasEscolas, useRealtime } from '../../services/escolaEscuta/api';
import { CampoArea, CampoSelect, CampoTexto, Carregando, Chip, Drawer, EmptyState, ErroBox, InfoBox, Interruptor, PageHeader, Painel, Pill, SeletorEscola, Tabs, TextoFormatado, btn, useToast } from './ui';
import {
  FormularioPerguntas,
  PRIVACIDADE,
  Resultados,
  STATUS_SUGESTAO,
  TIPOS_ENCONTRO,
  TIPOS_INICIATIVA,
  UNIDADE,
  aberta,
  type Devolutiva,
  type Encontro,
  type Iniciativa,
  type Pergunta,
} from './participaShared';

/* =====================================================================
 * Participa — Portal Família e Portal Docente
 * ===================================================================== */

type Aba = 'disponiveis' | 'inscricoes' | 'sugestoes' | 'concluidas' | 'devolutivas';

export function ParticipaPortal({ portal, organizationId }: { portal: 'familia' | 'docente'; organizationId?: string }) {
  const daPlataforma = useOrgAtual();
  const escolas = useMinhasEscolas();
  const estudantes = useMeusEstudantes();
  const doPapel = escolas.data.filter((e) => (portal === 'familia' ? e.papel === 'familia' : e.papel !== 'familia'));
  // administrador visualizando o portal: usa as escolas que ele gerencia
  const minhas = doPapel.length > 0 ? doPapel : escolas.data;
  const [org, setOrg] = useState<string | null>(organizationId || null);
  const [aba, setAba] = useState<Aba>('disponiveis');
  const toast = useToast();

  useEffect(() => {
    if (org) return;
    const escolhido = portal === 'docente' ? daPlataforma || minhas[0]?.organization_id : minhas[0]?.organization_id;
    if (escolhido) setOrg(escolhido);
  }, [minhas, org, portal, daPlataforma]);

  const dados = useCarregar<{ iniciativas: Iniciativa[]; encontros: Encontro[]; participei: Set<string>; inscricoes: any[]; devolutivas: Devolutiva[] }>(
    async () => {
      if (!org) return { data: { iniciativas: [], encontros: [], participei: new Set(), inscricoes: [], devolutivas: [] } };
      const [ini, enc, part, insc, dev] = await Promise.all([
        supabase.from('participa_iniciativas').select('*').eq('organization_id', org).in('status', ['publicada', 'encerrada']).order('publicada_em', { ascending: false }),
        supabase.from('participa_encontros').select('*').eq('organization_id', org).in('status', ['publicado', 'encerrado']).order('inicio', { ascending: true }),
        supabase.from('participa_participacoes').select('iniciativa_id'),
        supabase.from('participa_inscricoes').select('*'),
        supabase.from('participa_devolutivas').select('*').eq('organization_id', org).eq('status', 'publicada').order('publicada_em', { ascending: false }),
      ]);
      if (ini.error) return { error: mensagemErro(ini.error) };
      return {
        data: {
          iniciativas: (ini.data as Iniciativa[]) || [],
          encontros: (enc.data as Encontro[]) || [],
          participei: new Set(((part.data as any[]) || []).map((p) => p.iniciativa_id)),
          inscricoes: (insc.data as any[]) || [],
          devolutivas: (dev.data as Devolutiva[]) || [],
        },
      };
    },
    [org],
    { iniciativas: [], encontros: [], participei: new Set(), inscricoes: [], devolutivas: [] },
  );
  useRealtime(['participa_iniciativas', 'participa_encontros', 'participa_inscricoes', 'participa_devolutivas'], () => dados.recarregar(true), !!org);

  const [respondendo, setRespondendo] = useState<Iniciativa | null>(null);
  const [inscrevendo, setInscrevendo] = useState<Encontro | null>(null);
  const [vendoResultado, setVendoResultado] = useState<Iniciativa | null>(null);

  const d = dados.data;
  const minhaInsc = (id: string) => d.inscricoes.find((x) => x.encontro_id === id && x.status !== 'cancelada');
  const disponiveis = d.iniciativas.filter((i) => aberta(i) && (!d.participei.has(i.id) || i.permite_editar));
  const encontrosAbertos = d.encontros.filter((e) => e.status === 'publicado' && (!e.inscricao_ate || new Date(e.inscricao_ate) > new Date()) && !minhaInsc(e.id));
  const concluidas = d.iniciativas.filter((i) => d.participei.has(i.id));
  const minhasInscricoes = d.encontros.filter((e) => minhaInsc(e.id));
  const alunos = estudantes.data.filter((e) => e.organization_id === org);
  const nomeEscola = escolas.data.find((e) => e.organization_id === org)?.nome || 'Escola';

  return (
    <div className="space-y-5 text-left">
      <SeletorEscola escolas={minhas} value={org} onChange={setOrg} />
      <PageHeader icon={HandHeart} title="Participa" subtitle="Sua opinião ajuda a escola a decidir. Responda pesquisas, envie sugestões e participe de encontros." />
      <div className="overflow-x-auto">
        <Tabs<Aba>
          value={aba}
          onChange={setAba}
          tabs={[
            { id: 'disponiveis', label: 'Para participar', icon: ListChecks, count: disponiveis.filter((i) => !d.participei.has(i.id)).length + encontrosAbertos.length },
            { id: 'inscricoes', label: 'Minhas inscrições', icon: CalendarDays },
            { id: 'sugestoes', label: 'Minhas sugestões', icon: Lightbulb },
            { id: 'concluidas', label: 'Participações concluídas', icon: CheckCircle2 },
            { id: 'devolutivas', label: 'Resultados e devolutivas', icon: MessageSquareReply },
          ]}
        />
      </div>

      {dados.error && <ErroBox error={dados.error} onRetry={() => dados.recarregar()} />}
      {dados.loading || !org ? (
        <Carregando linhas={3} altura="h-32" />
      ) : (
        <>
          {aba === 'disponiveis' &&
            (disponiveis.length + encontrosAbertos.length === 0 ? (
              <EmptyState icon={ListChecks} title="Nada aberto para você agora" text="Quando a escola abrir uma pesquisa, enquete ou inscrição para você, ela aparece aqui." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {disponiveis.map((i) => (
                  <CartaoIniciativa key={i.id} i={i} escola={nomeEscola} jaParticipei={d.participei.has(i.id)} onAbrir={() => setRespondendo(i)} />
                ))}
                {encontrosAbertos.map((e) => (
                  <CartaoEncontro key={e.id} e={e} escola={nomeEscola} onAbrir={() => setInscrevendo(e)} />
                ))}
              </div>
            ))}

          {aba === 'inscricoes' &&
            (minhasInscricoes.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Você não tem inscrições" />
            ) : (
              <div className="space-y-3">
                {minhasInscricoes.map((e) => (
                  <MinhaInscricao
                    key={e.id}
                    e={e}
                    insc={minhaInsc(e.id)}
                    onCancelado={() => {
                      toast.show('Inscrição cancelada.');
                      dados.recarregar(true);
                    }}
                    onErro={(m) => toast.show(m, 'danger')}
                  />
                ))}
              </div>
            ))}

          {aba === 'sugestoes' && <MinhasSugestoes org={org} toast={toast} />}

          {aba === 'concluidas' &&
            (concluidas.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nenhuma participação ainda" />
            ) : (
              <div className="space-y-3">
                {concluidas.map((i) => (
                  <Painel key={i.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Pill tone="success">
                        <CheckCircle2 className="h-3 w-3" /> Participação registrada
                      </Pill>
                      <p className="mt-1 text-[15px] font-semibold text-[var(--text-heading)]">{i.titulo}</p>
                      <p className="text-[12px] text-[var(--text-muted)]">
                        {TIPOS_INICIATIVA[i.tipo].label} · {aberta(i) ? `aberta até ${fmtDataHora(i.fecha_em)}` : 'encerrada'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {aberta(i) && i.permite_editar && (
                        <button type="button" className={btn.ghost} onClick={() => setRespondendo(i)}>
                          Alterar resposta
                        </button>
                      )}
                      {podeVerResultado(i) && (
                        <button type="button" className={btn.ghost} onClick={() => setVendoResultado(i)}>
                          Ver resultado
                        </button>
                      )}
                    </div>
                  </Painel>
                ))}
              </div>
            ))}

          {aba === 'devolutivas' && (
            <div className="space-y-4">
              {d.devolutivas.length === 0 && d.iniciativas.filter(podeVerResultado).length === 0 ? (
                <EmptyState icon={MessageSquareReply} title="Nenhuma devolutiva ainda" text="Quando a escola publicar o que fez com a participação da comunidade, aparece aqui." />
              ) : (
                <>
                  {d.devolutivas.map((dv) => (
                    <CartaoDevolutiva key={dv.id} d={dv} iniciativa={d.iniciativas.find((i) => i.id === dv.iniciativa_id)} />
                  ))}
                  {d.iniciativas.filter(podeVerResultado).map((i) => (
                    <Painel key={i.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-semibold text-[var(--text-heading)]">Resultado: {i.titulo}</p>
                        <p className="text-[12px] text-[var(--text-muted)]">{TIPOS_INICIATIVA[i.tipo].label}</p>
                      </div>
                      <button type="button" className={btn.secondary} onClick={() => setVendoResultado(i)}>
                        Ver resultado
                      </button>
                    </Painel>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {respondendo && (
        <ResponderDrawer
          i={respondendo}
          alunos={alunos}
          editando={d.participei.has(respondendo.id)}
          onClose={() => setRespondendo(null)}
          onFeito={(m) => {
            toast.show(m);
            setRespondendo(null);
            dados.recarregar(true);
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
      {inscrevendo && (
        <InscreverDrawer
          e={inscrevendo}
          alunos={portal === 'familia' ? alunos : []}
          onClose={() => setInscrevendo(null)}
          onFeito={(m) => {
            toast.show(m);
            setInscrevendo(null);
            dados.recarregar(true);
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
      {vendoResultado && <ResultadoPortal i={vendoResultado} onClose={() => setVendoResultado(null)} />}
      {toast.node}
    </div>
  );
}

const podeVerResultado = (i: Iniciativa) =>
  i.politica_resultado === 'imediato' || (i.politica_resultado === 'apos_encerrar' && (i.status === 'encerrada' || (!!i.fecha_em && new Date(i.fecha_em) <= new Date())));

function CartaoIniciativa({ i, escola, jaParticipei, onAbrir }: { i: Iniciativa; escola: string; jaParticipei: boolean; onAbrir: () => void }) {
  const t = TIPOS_INICIATIVA[i.tipo];
  const Icon = t.icon;
  return (
    <Painel className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${t.cor}14`, color: t.cor }}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold" style={{ color: t.cor }}>
            {t.label}
          </p>
          <h3 className="text-[16px] font-semibold text-[var(--text-heading)]">{i.titulo}</h3>
          <p className="text-[12px] text-[var(--text-muted)]">{escola}</p>
        </div>
      </div>
      {i.descricao && <p className="mt-3 line-clamp-3 text-[14px] text-[var(--text-body)]">{i.descricao}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {i.fecha_em && (
          <Pill tone="warning">
            <Clock className="h-3 w-3" /> Até {fmtDataHora(i.fecha_em)}
          </Pill>
        )}
        <Pill>~{i.tempo_estimado_min || 3} min</Pill>
        <Pill>
          <Lock className="h-3 w-3" /> {PRIVACIDADE[i.privacidade].label}
        </Pill>
        {i.tipo === 'enquete' && <Pill tone="info">{i.carater === 'formal' ? 'Segue regra formal' : 'Consulta orientativa'}</Pill>}
      </div>
      <div className="mt-auto pt-4">
        <button type="button" className={btn.primary} onClick={onAbrir}>
          {jaParticipei ? 'Alterar minha resposta' : 'Participar'}
        </button>
      </div>
    </Painel>
  );
}

function CartaoEncontro({ e, escola, onAbrir }: { e: Encontro; escola: string; onAbrir: () => void }) {
  const cont = useCarregar<any>(() => rpc('participa_contagem_inscricoes', { p_encontro: e.id }), [e.id], null);
  const restantes = e.vagas ? Math.max(0, e.vagas - (cont.data?.confirmadas || 0) - (cont.data?.pendentes || 0)) : null;
  const Icone = e.tipo === 'assembleia' || e.tipo === 'conselho' ? Gavel : Users;
  return (
    <Painel className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <Icone className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[var(--accent)]">{TIPOS_ENCONTRO[e.tipo]}</p>
          <h3 className="text-[16px] font-semibold text-[var(--text-heading)]">{e.titulo}</h3>
          <p className="text-[12px] text-[var(--text-muted)]">{escola}</p>
        </div>
      </div>
      {e.descricao && <p className="mt-3 line-clamp-3 text-[14px] text-[var(--text-body)]">{e.descricao}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {e.inicio && (
          <Pill>
            <CalendarDays className="h-3 w-3" /> {fmtDataHora(e.inicio)}
          </Pill>
        )}
        {e.local && (
          <Pill>
            <MapPin className="h-3 w-3" /> {e.local}
          </Pill>
        )}
        {restantes !== null && <Pill tone={restantes === 0 ? 'danger' : 'success'}>{restantes === 0 ? (e.lista_espera ? 'Lotado · lista de espera' : 'Lotado') : `${restantes} vaga(s)`}</Pill>}
        {e.inscricao_ate && <Pill tone="warning">Inscrições até {fmtData(e.inscricao_ate)}</Pill>}
      </div>
      <div className="mt-auto pt-4">
        <button type="button" className={btn.primary} onClick={onAbrir} disabled={restantes === 0 && !e.lista_espera}>
          {restantes === 0 && e.lista_espera ? 'Entrar na lista de espera' : 'Inscrever-se'}
        </button>
      </div>
    </Painel>
  );
}

function ResponderDrawer({
  i,
  alunos,
  editando,
  onClose,
  onFeito,
  onErro,
}: {
  i: Iniciativa;
  alunos: { student_id: string; student_nome: string }[];
  editando: boolean;
  onClose: () => void;
  onFeito: (m: string) => void;
  onErro: (m: string) => void;
}) {
  const perguntas = useCarregar<Pergunta[]>(
    async () => {
      const { data, error } = await supabase.from('participa_perguntas').select('*').eq('iniciativa_id', i.id).order('ordem');
      return error ? { error: mensagemErro(error) } : { data: ((data as any[]) || []).map((q) => ({ ...q, opcoes: q.opcoes || [] })) };
    },
    [i.id],
    [],
  );
  const [valores, setValores] = useState<Record<string, any>>({});
  const [aluno, setAluno] = useState<string | null>(alunos.length === 1 ? alunos[0].student_id : null);
  const [enviando, setEnviando] = useState(false);
  const precisaAluno = i.unidade_resposta === 'estudante' && alunos.length > 0;

  const faltando = useMemo(
    () =>
      perguntas.data.filter((q) => {
        const v = valores[q.id!];
        return q.obrigatoria && (v === undefined || v === '' || (Array.isArray(v) && v.length === 0));
      }),
    [perguntas.data, valores],
  );

  const enviar = async () => {
    if (precisaAluno && !aluno) return onErro('Escolha o estudante.');
    if (faltando.length) return onErro(`Responda: ${faltando[0].enunciado}`);
    setEnviando(true);
    const r = await rpc<any>('participa_responder', { p_ini: i.id, p_respostas: valores, p_student: aluno });
    setEnviando(false);
    if (r.error) return onErro(r.error);
    onFeito(r.data?.mensagem || 'Participação registrada.');
  };

  return (
    <Drawer
      open
      onClose={onClose}
      bloqueado={enviando}
      width="max-w-2xl"
      title={i.titulo}
      subtitle={TIPOS_INICIATIVA[i.tipo].label}
      footer={
        <button type="button" className={btn.primary} onClick={enviar} disabled={enviando || perguntas.loading}>
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />} {editando ? 'Enviar nova resposta' : 'Enviar participação'}
        </button>
      }
    >
      <div className="space-y-5">
        {i.descricao && <p className="text-[15px] text-[var(--text-body)]">{i.descricao}</p>}
        {i.contexto && (
          <div className="rounded-2xl bg-[var(--bg-card-alt)] p-4">
            <p className="mb-1 text-[13px] font-semibold text-[var(--text-heading)]">Contexto</p>
            <TextoFormatado texto={i.contexto} className="text-[14px]" />
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <InfoBox icon={Users}>{UNIDADE[i.unidade_resposta]}</InfoBox>
          <InfoBox icon={Lock}>{PRIVACIDADE[i.privacidade].texto}</InfoBox>
        </div>
        {i.tipo === 'enquete' && (
          <InfoBox tone="warning">{i.carater === 'formal' ? 'Esta consulta segue uma regra formal de decisão descrita pela escola.' : 'Esta enquete é orientativa: ajuda a escola a decidir, mas não é uma votação.'}</InfoBox>
        )}
        {editando && <InfoBox tone="info">Você já participou. A nova resposta substitui a anterior.</InfoBox>}
        {precisaAluno && (
          <div>
            <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Respondendo sobre</p>
            <div className="flex flex-wrap gap-1.5">
              {alunos.map((a) => (
                <Chip key={a.student_id} active={aluno === a.student_id} onClick={() => setAluno(a.student_id)}>
                  {a.student_nome}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {perguntas.loading ? <Carregando linhas={3} /> : <FormularioPerguntas perguntas={perguntas.data} valores={valores} onChange={(id, v) => setValores((x) => ({ ...x, [id]: v }))} />}
      </div>
    </Drawer>
  );
}

function InscreverDrawer({
  e,
  alunos,
  onClose,
  onFeito,
  onErro,
}: {
  e: Encontro;
  alunos: { student_id: string; student_nome: string }[];
  onClose: () => void;
  onFeito: (m: string) => void;
  onErro: (m: string) => void;
}) {
  const [aluno, setAluno] = useState<string>('');
  const [disp, setDisp] = useState('');
  const [obs, setObs] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviar = async () => {
    setEnviando(true);
    const r = await rpc<any>('participa_inscrever', { p_encontro: e.id, p_student: aluno || null, p_disponibilidade: disp || null, p_obs: obs || null });
    setEnviando(false);
    if (r.error) return onErro(r.error);
    const st = r.data?.status;
    onFeito(st === 'espera' ? 'Você entrou na lista de espera. Avisamos se abrir vaga.' : st === 'pendente' ? 'Inscrição recebida. A escola vai confirmar.' : 'Inscrição confirmada!');
  };
  return (
    <Drawer
      open
      onClose={onClose}
      bloqueado={enviando}
      title={e.titulo}
      subtitle={TIPOS_ENCONTRO[e.tipo]}
      footer={
        <button type="button" className={btn.primary} onClick={enviar} disabled={enviando}>
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar inscrição
        </button>
      }
    >
      <div className="space-y-4">
        {e.descricao && <TextoFormatado texto={e.descricao} />}
        <div className="flex flex-wrap gap-1.5">
          {e.inicio && <Pill>{fmtDataHora(e.inicio)}</Pill>}
          {e.local && <Pill>{e.local}</Pill>}
        </div>
        {e.pauta && (
          <div className="rounded-2xl bg-[var(--bg-card-alt)] p-4">
            <p className="mb-1 text-[13px] font-semibold">Pauta</p>
            <TextoFormatado texto={e.pauta} className="text-[14px]" />
          </div>
        )}
        {e.formas_participacao && <InfoBox>Como participar: {e.formas_participacao}</InfoBox>}
        {e.requisitos && <InfoBox tone="warning">Requisitos: {e.requisitos}</InfoBox>}
        {alunos.length > 0 && (
          <CampoSelect label="Estudante relacionado (opcional)" value={aluno} onChange={setAluno} options={[{ value: '', label: 'Nenhum' }, ...alunos.map((a) => ({ value: a.student_id, label: a.student_nome }))]} />
        )}
        {e.tipo === 'projeto' && <CampoTexto label="Sua disponibilidade" value={disp} onChange={setDisp} placeholder="Ex.: sábados de manhã" />}
        <CampoArea label="Observação (opcional)" value={obs} onChange={setObs} rows={2} max={400} />
        <p className="text-[12px] text-[var(--text-muted)]">Receber o convite não é o mesmo que participar: sua inscrição só vale depois de confirmada aqui.</p>
      </div>
    </Drawer>
  );
}

function MinhaInscricao({ e, insc, onCancelado, onErro }: { e: Encontro; insc: any; onCancelado: () => void; onErro: (m: string) => void }) {
  const [cancelando, setCancelando] = useState(false);
  const tone: Record<string, 'success' | 'warning' | 'info' | 'danger'> = { confirmada: 'success', pendente: 'warning', espera: 'info', recusada: 'danger' };
  const label: Record<string, string> = { confirmada: 'Inscrição confirmada', pendente: 'Aguardando confirmação', espera: 'Lista de espera', recusada: 'Não confirmada' };
  const passou = e.inicio && new Date(e.inicio) < new Date();
  return (
    <Painel className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone={tone[insc.status]}>{label[insc.status]}</Pill>
        <Pill>{TIPOS_ENCONTRO[e.tipo]}</Pill>
        {insc.presente === true && <Pill tone="success">Presença registrada</Pill>}
      </div>
      <p className="text-[16px] font-semibold text-[var(--text-heading)]">{e.titulo}</p>
      <p className="text-[13px] text-[var(--text-muted)]">
        {e.inicio ? fmtDataHora(e.inicio) : 'Data a definir'}
        {e.local ? ` · ${e.local}` : ''}
      </p>
      {e.materiais && <InfoBox>{e.materiais}</InfoBox>}
      {passou && e.ata && (e.tipo !== 'assembleia' && e.tipo !== 'conselho' ? true : e.ata_aprovada) && (
        <details className="rounded-2xl bg-[var(--bg-card-alt)] p-3">
          <summary className="cursor-pointer text-[13px] font-semibold text-[var(--accent)]">{e.tipo === 'assembleia' || e.tipo === 'conselho' ? 'Ata aprovada' : 'Registro do encontro'}</summary>
          <TextoFormatado texto={e.ata} className="mt-2 text-[14px]" />
          {e.encaminhamentos?.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-[13px]">
              {e.encaminhamentos.map((x, k) => (
                <li key={k}>
                  {x.acao}
                  {x.responsavel ? ` — ${x.responsavel}` : ''}
                  {x.prazo ? ` (até ${fmtData(`${x.prazo}T12:00:00-03:00`)})` : ''}
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
      {!passou && insc.status !== 'recusada' && (
        <button
          type="button"
          className={btn.ghost}
          disabled={cancelando}
          onClick={async () => {
            setCancelando(true);
            const r = await rpc('participa_cancelar_inscricao', { p_encontro: e.id });
            setCancelando(false);
            if (r.error) return onErro(r.error);
            onCancelado();
          }}
        >
          {cancelando && <Loader2 className="h-4 w-4 animate-spin" />} Cancelar inscrição
        </button>
      )}
    </Painel>
  );
}

function MinhasSugestoes({ org, toast }: { org: string; toast: ReturnType<typeof useToast> }) {
  const lista = useCarregar<any[]>(
    async () => {
      const { data, error } = await supabase.from('participa_sugestoes').select('*, participa_sugestao_eventos(*)').eq('organization_id', org).order('created_at', { ascending: false });
      return error ? { error: mensagemErro(error) } : { data: data || [] };
    },
    [org],
    [],
  );
  useRealtime(['participa_sugestoes'], () => lista.recarregar(true));
  const [nova, setNova] = useState(false);
  const [f, setF] = useState({ categoria: 'Comunicação', titulo: '', descricao: '', proposta: '', identificada: true });
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!f.titulo.trim() || !f.descricao.trim()) return toast.show('Preencha título e descrição.', 'danger');
    setEnviando(true);
    const r = await rpc('participa_sugerir', {
      p_org: org,
      p_categoria: f.categoria,
      p_titulo: f.titulo,
      p_descricao: f.descricao,
      p_proposta: f.proposta,
      p_identificada: f.identificada,
    });
    setEnviando(false);
    if (r.error) return toast.show(r.error, 'danger');
    toast.show('Sugestão enviada. Você acompanha a resposta por aqui.');
    setNova(false);
    setF({ categoria: 'Comunicação', titulo: '', descricao: '', proposta: '', identificada: true });
    lista.recarregar(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" className={btn.primary} onClick={() => setNova(true)}>
          <Plus className="h-4 w-4" /> Nova sugestão
        </button>
      </div>
      {lista.loading ? (
        <Carregando />
      ) : lista.data.length === 0 ? (
        <EmptyState icon={Lightbulb} title="Você ainda não enviou sugestões" text="Tem uma ideia para melhorar a escola? Conte para a gestão." />
      ) : (
        lista.data.map((s) => {
          const st = STATUS_SUGESTAO[s.status];
          const eventos = [...(s.participa_sugestao_eventos || [])].sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
          return (
            <Painel key={s.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill tone={st?.tone}>{st?.label}</Pill>
                <Pill>{s.categoria}</Pill>
                {!s.identificada && (
                  <Pill>
                    <Lock className="h-3 w-3" /> Confidencial
                  </Pill>
                )}
              </div>
              <p className="text-[15px] font-semibold text-[var(--text-heading)]">{s.titulo}</p>
              <p className="text-[14px] text-[var(--text-body)]">{s.descricao}</p>
              {s.resposta_gestao && <InfoBox tone="success">Resposta da escola: {s.resposta_gestao}</InfoBox>}
              {s.justificativa && <InfoBox>Justificativa: {s.justificativa}</InfoBox>}
              <ol className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--text-muted)]">
                {eventos.map((ev: any) => (
                  <li key={ev.id}>
                    {STATUS_SUGESTAO[ev.status]?.label || ev.status} · {fmtData(ev.created_at)}
                  </li>
                ))}
              </ol>
            </Painel>
          );
        })
      )}

      {nova && (
        <Drawer
          open
          onClose={() => setNova(false)}
          bloqueado={enviando}
          title="Nova sugestão"
          footer={
            <button type="button" className={btn.primary} onClick={enviar} disabled={enviando}>
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />} Enviar sugestão
            </button>
          }
        >
          <div className="space-y-4">
            <CampoSelect
              label="Categoria"
              value={f.categoria}
              onChange={(v) => setF({ ...f, categoria: v })}
              options={['Comunicação', 'Acolhimento e atendimento', 'Eventos', 'Alimentação', 'Espaços da escola', 'Acessibilidade', 'Pedagógico', 'Outro'].map((c) => ({ value: c, label: c }))}
            />
            <CampoTexto label="Título" required value={f.titulo} onChange={(v) => setF({ ...f, titulo: v })} max={120} />
            <CampoArea label="Descrição *" value={f.descricao} onChange={(v) => setF({ ...f, descricao: v })} rows={4} max={2000} />
            <CampoArea label="Proposta de melhoria" value={f.proposta} onChange={(v) => setF({ ...f, proposta: v })} rows={3} max={1500} />
            <Interruptor
              label="Me identificar para a gestão"
              hint={f.identificada ? 'A gestão verá seu nome.' : 'Confidencial: a gestão não verá quem enviou. Você continua acompanhando por aqui.'}
              checked={f.identificada}
              onChange={(v) => setF({ ...f, identificada: v })}
            />
            <p className="text-[12px] text-[var(--text-muted)]">Não inclua dados pessoais de outras pessoas. Para emergências, fale direto com a escola.</p>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function CartaoDevolutiva({ d, iniciativa }: { d: Devolutiva; iniciativa?: Iniciativa }) {
  const status: Record<string, string> = { planejada: 'Planejada', em_andamento: 'Em andamento', concluida: 'Concluída' };
  return (
    <Painel className="space-y-3">
      <div>
        <Pill tone="accent">Devolutiva da escola</Pill>
        <h3 className="mt-1 text-[17px] font-semibold text-[var(--text-heading)]">{d.titulo}</h3>
        <p className="text-[12px] text-[var(--text-muted)]">
          {fmtData(d.publicada_em)}
          {iniciativa ? ` · sobre “${iniciativa.titulo}”` : ''}
        </p>
      </div>
      {d.o_que_ouvimos && (
        <div>
          <p className="text-[13px] font-semibold text-[var(--text-heading)]">O que ouvimos</p>
          <TextoFormatado texto={d.o_que_ouvimos} className="text-[14px]" />
        </div>
      )}
      {d.decisoes && (
        <div>
          <p className="text-[13px] font-semibold text-[var(--text-heading)]">O que decidimos</p>
          <TextoFormatado texto={d.decisoes} className="text-[14px]" />
        </div>
      )}
      {d.acoes?.length > 0 && (
        <div>
          <p className="mb-1 text-[13px] font-semibold text-[var(--text-heading)]">Próximas ações</p>
          <ul className="space-y-1">
            {d.acoes.map((a, k) => (
              <li key={k} className="flex flex-wrap items-center gap-2 text-[14px]">
                <span>{a.acao}</span>
                {a.prazo && <span className="text-[12px] text-[var(--text-muted)]">até {fmtData(`${a.prazo}T12:00:00-03:00`)}</span>}
                <Pill tone={a.status === 'concluida' ? 'success' : a.status === 'em_andamento' ? 'info' : 'neutral'}>{status[a.status || 'planejada']}</Pill>
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.limitacoes && <InfoBox>Limitações: {d.limitacoes}</InfoBox>}
    </Painel>
  );
}

function ResultadoPortal({ i, onClose }: { i: Iniciativa; onClose: () => void }) {
  const dados = useCarregar<any>(() => rpc('participa_resultados', { p_ini: i.id, p_recorte: 'unidade' }), [i.id], null);
  return (
    <Drawer open onClose={onClose} title="Resultado" subtitle={i.titulo} width="max-w-2xl">
      {dados.error ? <ErroBox error={dados.error} /> : dados.loading ? <Carregando /> : <Resultados dados={dados.data} />}
    </Drawer>
  );
}
