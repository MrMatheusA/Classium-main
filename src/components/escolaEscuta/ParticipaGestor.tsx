import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Copy,
  Eye,
  Gavel,
  HandHeart,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Loader2,
  MessageSquareReply,
  Pencil,
  Plus,
  Send,
  StopCircle,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrgAtual } from './useEscola';
import { publicarEncontroNoCalendario } from './calendario';
import { Field, cx, inputCls } from '../ui/kit';
import { fmtData, fmtDataHora, isoParaLocal, localParaISO, mensagemErro, rpc, useCarregar, useRealtime } from '../../services/escolaEscuta/api';
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
  Indicador,
  InfoBox,
  Interruptor,
  PageHeader,
  Painel,
  Pill,
  PublicoPicker,
  Tabs,
  btn,
  useToast,
} from './ui';
import {
  FormularioPerguntas,
  POLITICA,
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
  type TipoIniciativa,
  type TipoPergunta,
} from './participaShared';

type Aba = 'visao' | 'iniciativas' | 'sugestoes' | 'inscricoes' | 'conselhos' | 'resultados';
type Toast = ReturnType<typeof useToast>;

/** Divulga no Mural de Recados (mesmo público). Nunca derruba a publicação principal. */
async function divulgarNoMural(tipo: 'iniciativa' | 'encontro' | 'devolutiva', id: string): Promise<string> {
  const r = await rpc<any>('participa_divulgar_mural', { p_tipo: tipo, p_id: id });
  if (r.error) return ` Não foi possível divulgar no Mural: ${r.error}`;
  return r.data?.ja_divulgado ? ' Já estava no Mural de Recados.' : ' Também divulgado no Mural de Recados.';
}

function OpcaoIntegracao({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[var(--text-body)]">
      <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export function ParticipaGestor({ organizationId }: { organizationId?: string }) {
  const org = useOrgAtual(organizationId);
  const toast = useToast();
  const [aba, setAba] = useState<Aba>('visao');

  const iniciativas = useCarregar<Iniciativa[]>(
    async () => {
      const { data, error } = await supabase.from('participa_iniciativas').select('*').eq('organization_id', org).order('created_at', { ascending: false });
      return error ? { error: mensagemErro(error) } : { data: (data as Iniciativa[]) || [] };
    },
    [org],
    [],
  );
  const encontros = useCarregar<Encontro[]>(
    async () => {
      const { data, error } = await supabase.from('participa_encontros').select('*').eq('organization_id', org).order('inicio', { ascending: false, nullsFirst: true });
      return error ? { error: mensagemErro(error) } : { data: (data as Encontro[]) || [] };
    },
    [org],
    [],
  );
  useRealtime(['participa_iniciativas', 'participa_encontros', 'participa_inscricoes', 'participa_sugestoes'], () => {
    iniciativas.recarregar(true);
    encontros.recarregar(true);
  }, !!org);

  const visao = useCarregar<any>(() => rpc('participa_visao_geral', { p_org: org }), [org, iniciativas.data.length], null);

  if (!org) return <ErroBox error="Escola não identificada para este usuário." />;

  return (
    <div className="space-y-5 text-left">
      <PageHeader icon={HandHeart} title="Participa" subtitle="Ouvir → analisar → decidir → informar → acompanhar. A comunidade participa e a escola dá a devolutiva." />
      <div className="overflow-x-auto">
        <Tabs<Aba>
          value={aba}
          onChange={setAba}
          tabs={[
            { id: 'visao', label: 'Visão geral', icon: LayoutDashboard },
            { id: 'iniciativas', label: 'Iniciativas', icon: ListChecks },
            { id: 'sugestoes', label: 'Sugestões', icon: Lightbulb, count: visao.data?.sugestoes_novas },
            { id: 'inscricoes', label: 'Inscrições e projetos', icon: UserCheck },
            { id: 'conselhos', label: 'Conselhos e assembleias', icon: Gavel },
            { id: 'resultados', label: 'Resultados e devolutivas', icon: BarChart3, count: visao.data?.devolutivas_pendentes },
          ]}
        />
      </div>

      {aba === 'visao' && <VisaoGeral visao={visao} irPara={setAba} />}
      {aba === 'iniciativas' && <IniciativasTab org={org} dados={iniciativas} encontros={encontros.data} toast={toast} />}
      {aba === 'sugestoes' && <SugestoesTab org={org} toast={toast} />}
      {aba === 'inscricoes' && <EncontrosTab org={org} dados={encontros} grupo="inscricoes" toast={toast} />}
      {aba === 'conselhos' && <EncontrosTab org={org} dados={encontros} grupo="conselhos" toast={toast} />}
      {aba === 'resultados' && <ResultadosTab org={org} iniciativas={iniciativas.data} encontros={encontros.data} toast={toast} />}
      {toast.node}
    </div>
  );
}

/* ================================================================== */
/* Visão geral                                                         */
/* ================================================================== */

function VisaoGeral({ visao, irPara }: { visao: ReturnType<typeof useCarregar<any>>; irPara: (a: Aba) => void }) {
  if (visao.loading) return <Carregando linhas={2} />;
  if (visao.error) return <ErroBox error={visao.error} onRetry={() => visao.recarregar()} />;
  const v = visao.data || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Indicador label="Iniciativas abertas" valor={v.abertas ?? 0} icon={ListChecks} />
        <Indicador label="Respostas (30 dias)" valor={v.respostas_30d ?? 0} icon={BarChart3} />
        <Indicador label="Sugestões novas" valor={v.sugestoes_novas ?? 0} icon={Lightbulb} cor="#B54708" />
        <Indicador label="Encontros a seguir" valor={v.encontros_proximos ?? 0} icon={Users} />
        <Indicador label="Devolutivas pendentes" valor={v.devolutivas_pendentes ?? 0} icon={MessageSquareReply} cor={v.devolutivas_pendentes ? '#B42318' : undefined} />
      </div>
      {v.devolutivas_pendentes > 0 && (
        <InfoBox tone="warning">
          {v.devolutivas_pendentes} iniciativa(s) já encerraram e ainda não têm devolutiva. A comunidade precisa saber o que foi feito com a participação.{' '}
          <button type="button" className="font-semibold underline" onClick={() => irPara('resultados')}>
            Publicar devolutiva
          </button>
        </InfoBox>
      )}
      <Painel>
        <p className="mb-3 text-[15px] font-semibold text-[var(--text-heading)]">Participação nas iniciativas abertas</p>
        {(v.participacao || []).length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">Nenhuma iniciativa aberta.</p>
        ) : (
          <ul className="space-y-3">
            {v.participacao.map((p: any) => {
              const pct = p.elegiveis ? Math.min(100, Math.round((100 * p.respostas) / p.elegiveis)) : 0;
              return (
                <li key={p.id}>
                  <div className="mb-1 flex justify-between gap-2 text-[14px]">
                    <span className="truncate font-medium text-[var(--text-heading)]">{p.titulo}</span>
                    <span className="shrink-0 tabular-nums text-[var(--text-muted)]">
                      {p.respostas}/{p.elegiveis ?? '—'} · {pct}%{p.fecha_em ? ` · até ${fmtData(p.fecha_em)}` : ''}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-card-alt)]">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[12px] text-[var(--text-muted)]">Taxa de participação não indica representatividade.</p>
      </Painel>
    </div>
  );
}

/* ================================================================== */
/* Iniciativas                                                         */
/* ================================================================== */

const STATUS_INI: Record<Iniciativa['status'], { label: string; tone: 'neutral' | 'success' | 'info' }> = {
  rascunho: { label: 'Rascunho', tone: 'neutral' },
  publicada: { label: 'Aberta', tone: 'success' },
  encerrada: { label: 'Encerrada', tone: 'info' },
  arquivada: { label: 'Arquivada', tone: 'neutral' },
};

function IniciativasTab({ org, dados, encontros, toast }: { org: string; dados: ReturnType<typeof useCarregar<Iniciativa[]>>; encontros: Encontro[]; toast: Toast }) {
  const [editando, setEditando] = useState<Partial<Iniciativa> | null>(null);
  const [resultado, setResultado] = useState<Iniciativa | null>(null);
  const [busca, setBusca] = useState('');
  const [encerrar, setEncerrar] = useState<Iniciativa | null>(null);

  const lista = dados.data.filter((i) => !busca || i.titulo.toLowerCase().includes(busca.toLowerCase()));

  const duplicar = async (i: Iniciativa) => {
    const r = await rpc<string>('participa_duplicar', { p_id: i.id });
    if (r.error) return toast.show(r.error, 'danger');
    toast.show('Nova edição criada como rascunho. Depois de publicada, os resultados podem ser comparados com a anterior.');
    dados.recarregar(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Busca value={busca} onChange={setBusca} placeholder="Buscar iniciativa" />
        <button
          type="button"
          className={btn.primary}
          onClick={() =>
            setEditando({
              organization_id: org,
              tipo: 'pesquisa',
              titulo: '',
              publico: { familias: 'todas' },
              unidade_resposta: 'responsavel',
              privacidade: 'confidencial',
              politica_resultado: 'apos_encerrar',
              carater: 'orientativa',
              minimo_privacidade: 5,
              tempo_estimado_min: 3,
              permite_editar: false,
              texto_confirmacao: 'Obrigado! Sua participação foi registrada.',
            })
          }
        >
          <Plus className="h-4 w-4" /> Nova iniciativa
        </button>
      </div>

      {dados.error && <ErroBox error={dados.error} onRetry={() => dados.recarregar()} />}
      {dados.loading ? (
        <Carregando linhas={3} />
      ) : lista.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nenhuma iniciativa" text="Crie uma pesquisa, enquete, consulta, avaliação de evento ou levantamento de necessidades." />
      ) : (
        <ul className="space-y-3">
          {lista.map((i) => {
            const t = TIPOS_INICIATIVA[i.tipo];
            const Icon = t.icon;
            const encerrada = i.status === 'encerrada' || (i.status === 'publicada' && i.fecha_em && new Date(i.fecha_em) <= new Date());
            return (
              <li key={i.id}>
                <Painel className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${t.cor}14`, color: t.cor }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] font-semibold" style={{ color: t.cor }}>
                        {t.label}
                      </span>
                      <Pill tone={encerrada ? 'info' : STATUS_INI[i.status].tone}>{encerrada ? 'Encerrada' : STATUS_INI[i.status].label}</Pill>
                      <Pill>{PRIVACIDADE[i.privacidade].label}</Pill>
                    </div>
                    <h3 className="mt-1 text-[15px] font-semibold text-[var(--text-heading)]">{i.titulo || 'Sem título'}</h3>
                    <p className="text-[13px] text-[var(--text-muted)]">
                      {i.abre_em ? `De ${fmtData(i.abre_em)}` : 'Abre ao publicar'} {i.fecha_em ? `até ${fmtDataHora(i.fecha_em)}` : '· sem data de encerramento'}
                      {i.total_elegivel ? ` · ${i.total_elegivel} elegíveis` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:flex-col sm:items-end">
                    <button type="button" className={btn.ghost} onClick={() => setEditando(i)}>
                      {i.status === 'rascunho' ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {i.status === 'rascunho' ? 'Editar' : 'Ver'}
                    </button>
                    {i.status !== 'rascunho' && (
                      <button type="button" className={btn.ghost} onClick={() => setResultado(i)}>
                        <BarChart3 className="h-4 w-4" /> Resultados
                      </button>
                    )}
                    {aberta(i) && (
                      <button type="button" className={btn.ghost} onClick={() => setEncerrar(i)}>
                        <StopCircle className="h-4 w-4" /> Encerrar
                      </button>
                    )}
                    {i.status !== 'rascunho' && (
                      <button type="button" className={btn.ghost} onClick={() => duplicar(i)}>
                        <Copy className="h-4 w-4" /> Nova edição
                      </button>
                    )}
                  </div>
                </Painel>
              </li>
            );
          })}
        </ul>
      )}

      {editando && (
        <EditorIniciativa
          org={org}
          inicial={editando}
          encontros={encontros}
          onClose={() => setEditando(null)}
          onSalvo={(m) => {
            toast.show(m);
            dados.recarregar(true);
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
      {resultado && <ResultadoDrawer iniciativa={resultado} onClose={() => setResultado(null)} />}
      <ConfirmModal
        open={!!encerrar}
        title="Encerrar agora?"
        text="Novas respostas deixam de ser aceitas."
        confirmLabel="Encerrar"
        onClose={() => setEncerrar(null)}
        onConfirm={async () => {
          const { error } = await supabase.from('participa_iniciativas').update({ status: 'encerrada', fecha_em: new Date().toISOString() }).eq('id', encerrar!.id);
          if (error) toast.show(mensagemErro(error), 'danger');
          setEncerrar(null);
          dados.recarregar(true);
        }}
      />
    </div>
  );
}

const ESCALA_PADRAO = ['Muito insatisfeito', 'Insatisfeito', 'Neutro', 'Satisfeito', 'Muito satisfeito'];

function EditorIniciativa({
  org,
  inicial,
  encontros,
  onClose,
  onSalvo,
  onErro,
}: {
  org: string;
  inicial: Partial<Iniciativa>;
  encontros: Encontro[];
  onClose: () => void;
  onSalvo: (m: string) => void;
  onErro: (m: string) => void;
}) {
  const [i, setI] = useState<Partial<Iniciativa>>(inicial);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [publicar, setPublicar] = useState(false);
  const [divulgar, setDivulgar] = useState(true);
  const [previa, setPrevia] = useState(false);
  const [valoresPrevia, setValoresPrevia] = useState<Record<string, any>>({});
  const editavel = !i.status || i.status === 'rascunho';
  const set = (p: Partial<Iniciativa>) => setI((x) => ({ ...x, ...p }));

  useEffect(() => {
    if (!inicial.id) return;
    supabase
      .from('participa_perguntas')
      .select('*')
      .eq('iniciativa_id', inicial.id)
      .order('ordem')
      .then(({ data }) => setPerguntas(((data as any[]) || []).map((q) => ({ ...q, opcoes: q.opcoes || [] }))));
  }, [inicial.id]);

  const addPergunta = (tipo: TipoPergunta) =>
    setPerguntas((l) => [
      ...l,
      { ordem: l.length, tipo, enunciado: '', opcoes: tipo === 'escala' ? [...ESCALA_PADRAO] : tipo === 'texto' ? [] : ['Opção 1', 'Opção 2'], obrigatoria: tipo !== 'texto', max_escolhas: null },
    ]);
  const setPerg = (idx: number, p: Partial<Pergunta>) => setPerguntas((l) => l.map((q, k) => (k === idx ? { ...q, ...p } : q)));
  const mover = (idx: number, d: number) =>
    setPerguntas((l) => {
      const n = [...l];
      const j = idx + d;
      if (j < 0 || j >= n.length) return l;
      [n[idx], n[j]] = [n[j], n[idx]];
      return n;
    });

  const salvar = async (silencioso = false): Promise<string | null> => {
    if (!i.titulo?.trim()) {
      onErro('Preencha o título.');
      return null;
    }
    if (perguntas.some((q) => !q.enunciado.trim())) {
      onErro('Toda pergunta precisa de enunciado.');
      return null;
    }
    if (perguntas.some((q) => ['unica', 'multipla', 'prioridades', 'escala'].includes(q.tipo) && q.opcoes.filter((o) => o.trim()).length < 2)) {
      onErro('Perguntas de escolha precisam de pelo menos 2 opções.');
      return null;
    }
    setSalvando(true);
    const { id, status, total_elegivel, publicada_em, created_at, ...resto } = i as Iniciativa;
    void status;
    void total_elegivel;
    void publicada_em;
    void created_at;
    const payload = { ...resto, organization_id: org, titulo: i.titulo.trim(), encontro_id: i.encontro_id || null };
    const res = id ? await supabase.from('participa_iniciativas').update(payload).eq('id', id).select('*').single() : await supabase.from('participa_iniciativas').insert(payload).select('*').single();
    if (res.error) {
      setSalvando(false);
      onErro(mensagemErro(res.error));
      return null;
    }
    const novoId = (res.data as Iniciativa).id;
    await supabase.from('participa_perguntas').delete().eq('iniciativa_id', novoId);
    if (perguntas.length) {
      const { error } = await supabase.from('participa_perguntas').insert(
        perguntas.map((q, k) => ({
          iniciativa_id: novoId,
          ordem: k,
          tipo: q.tipo,
          enunciado: q.enunciado.trim(),
          opcoes: q.opcoes.map((o) => o.trim()).filter(Boolean),
          obrigatoria: q.obrigatoria,
          max_escolhas: q.max_escolhas || null,
        })),
      );
      if (error) {
        setSalvando(false);
        onErro(mensagemErro(error));
        return null;
      }
    }
    setSalvando(false);
    setI(res.data as Iniciativa);
    const { data: pq } = await supabase.from('participa_perguntas').select('*').eq('iniciativa_id', novoId).order('ordem');
    setPerguntas(((pq as any[]) || []).map((q) => ({ ...q, opcoes: q.opcoes || [] })));
    if (!silencioso) onSalvo('Rascunho salvo.');
    return novoId;
  };

  const confirmarPublicacao = async () => {
    const id = await salvar(true);
    if (!id) return;
    setSalvando(true);
    const r = await rpc<any>('participa_publicar', { p_tipo: 'iniciativa', p_id: id });
    if (r.error) {
      setSalvando(false);
      return onErro(r.error);
    }
    const extra = divulgar ? await divulgarNoMural('iniciativa', id) : '';
    setSalvando(false);
    setPublicar(false);
    onSalvo(`Publicada para ${r.data.elegiveis} participante(s) elegível(is).${extra}`);
    onClose();
  };

  const t = TIPOS_INICIATIVA[(i.tipo || 'pesquisa') as TipoIniciativa];

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        bloqueado={salvando}
        width="max-w-4xl"
        title={i.id ? (editavel ? 'Editar iniciativa' : 'Iniciativa publicada') : 'Nova iniciativa'}
        subtitle={editavel ? 'Perguntas e regras ficam travadas depois de publicar.' : 'Publicada: perguntas e regras não mudam. Use “Nova edição” para alterar ou repetir e comparar.'}
        footer={
          <>
            <button type="button" className={btn.ghost} onClick={() => setPrevia(true)}>
              <Eye className="h-4 w-4" /> Prévia
            </button>
            <span className="flex-1" />
            {editavel && (
              <>
                <button type="button" className={btn.secondary} onClick={() => salvar()} disabled={salvando}>
                  {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar rascunho
                </button>
                <button type="button" className={btn.primary} onClick={() => setPublicar(true)} disabled={salvando || !perguntas.length}>
                  <Send className="h-4 w-4" /> Publicar
                </button>
              </>
            )}
          </>
        }
      >
        <fieldset disabled={!editavel} className="space-y-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Tipo</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(TIPOS_INICIATIVA) as TipoIniciativa[]).map((k) => {
                const tt = TIPOS_INICIATIVA[k];
                const Icon = tt.icon;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set({ tipo: k })}
                    className={cx('flex items-start gap-2.5 rounded-2xl border p-3 text-left', i.tipo === k ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)]')}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: tt.cor }} />
                    <span>
                      <span className="block text-[13px] font-semibold text-[var(--text-heading)]">{tt.label}</span>
                      <span className="block text-[12px] text-[var(--text-muted)]">{tt.descricao}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <CampoTexto label="Título" required value={i.titulo || ''} onChange={(v) => set({ titulo: v })} max={140} />
          <CampoArea label="Objetivo / descrição" value={i.descricao || ''} onChange={(v) => set({ descricao: v })} rows={3} />
          {(i.tipo === 'consulta' || i.tipo === 'necessidades') && (
            <>
              <CampoArea label="Contexto (o que está sendo decidido e por quê)" value={i.contexto || ''} onChange={(v) => set({ contexto: v })} rows={4} />
              <CampoArea label="Critérios de análise" value={i.criterios_analise || ''} onChange={(v) => set({ criterios_analise: v })} rows={2} />
            </>
          )}
          {i.tipo === 'avaliacao_evento' && (
            <CampoSelect
              label="Evento avaliado"
              value={i.encontro_id || ''}
              onChange={(v) => {
                const e = encontros.find((x) => x.id === v);
                set({ encontro_id: v || null, titulo: i.titulo || (e ? `Avaliação: ${e.titulo}` : '') });
              }}
              options={[{ value: '', label: 'Escolha o evento' }, ...encontros.filter((e) => e.status !== 'rascunho').map((e) => ({ value: e.id, label: `${e.titulo}${e.inicio ? ` · ${fmtData(e.inicio)}` : ''}` }))]}
            />
          )}
          {i.tipo === 'enquete' && (
            <CampoSelect
              label="Caráter da consulta"
              value={i.carater || 'orientativa'}
              onChange={(v) => set({ carater: v as Iniciativa['carater'] })}
              options={[
                { value: 'orientativa', label: 'Orientativa — ajuda a gestão a decidir' },
                { value: 'formal', label: 'Segue regra formal de decisão (descreva no objetivo)' },
              ]}
            />
          )}

          <div className="rounded-[20px] border border-[var(--border)] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-[var(--text-heading)]">Perguntas</p>
              {editavel && (
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['unica', 'Escolha única'],
                      ['multipla', 'Múltipla escolha'],
                      ['escala', 'Escala'],
                      ['prioridades', 'Prioridades'],
                      ['texto', 'Comentário'],
                    ] as [TipoPergunta, string][]
                  ).map(([k, l]) => (
                    <button key={k} type="button" className={btn.ghost} onClick={() => addPergunta(k)}>
                      <Plus className="h-3.5 w-3.5" /> {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {perguntas.length === 0 && <p className="text-[13px] text-[var(--text-muted)]">Adicione a primeira pergunta.</p>}
            <ol className="space-y-3">
              {perguntas.map((q, k) => (
                <li key={k} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2.5 text-[13px] font-semibold tabular-nums text-[var(--text-muted)]">{k + 1}.</span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        value={q.enunciado}
                        onChange={(e) => setPerg(k, { enunciado: e.target.value })}
                        placeholder="Enunciado da pergunta"
                        aria-label={`Enunciado da pergunta ${k + 1}`}
                        className={inputCls}
                      />
                      {q.tipo !== 'texto' && (
                        <div className="space-y-1.5">
                          {q.opcoes.map((o, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <span className="w-5 text-center text-[12px] text-[var(--text-muted)]">{q.tipo === 'escala' ? j + 1 : '•'}</span>
                              <input
                                value={o}
                                onChange={(e) => setPerg(k, { opcoes: q.opcoes.map((x, y) => (y === j ? e.target.value : x)) })}
                                aria-label={`Opção ${j + 1}`}
                                className={cx(inputCls, 'h-9')}
                              />
                              {editavel && q.opcoes.length > 2 && (
                                <button type="button" aria-label="Remover opção" className={btn.icon} onClick={() => setPerg(k, { opcoes: q.opcoes.filter((_, y) => y !== j) })}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          {editavel && (
                            <button type="button" className={btn.ghost} onClick={() => setPerg(k, { opcoes: [...q.opcoes, q.tipo === 'escala' ? `Nível ${q.opcoes.length + 1}` : `Opção ${q.opcoes.length + 1}`] })}>
                              <Plus className="h-3.5 w-3.5" /> Opção
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-[12px] text-[var(--text-muted)]">
                        <span className="font-medium">
                          {{ unica: 'Escolha única', multipla: 'Múltipla escolha', escala: 'Escala com descrição', prioridades: 'Ordenar prioridades', texto: 'Comentário livre' }[q.tipo]}
                        </span>
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={q.obrigatoria} onChange={(e) => setPerg(k, { obrigatoria: e.target.checked })} /> Obrigatória
                        </label>
                        {(q.tipo === 'multipla' || q.tipo === 'prioridades') && (
                          <label className="flex items-center gap-1.5">
                            Máx.
                            <input
                              type="number"
                              min={1}
                              value={q.max_escolhas ?? ''}
                              onChange={(e) => setPerg(k, { max_escolhas: e.target.value ? Number(e.target.value) : null })}
                              className="h-7 w-14 rounded-lg border border-[var(--border)] px-2"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    {editavel && (
                      <div className="flex flex-col">
                        <button type="button" aria-label="Subir" className={btn.icon} onClick={() => mover(k, -1)}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label="Descer" className={btn.icon} onClick={() => mover(k, 1)}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label="Remover pergunta" className={btn.icon} onClick={() => setPerguntas((l) => l.filter((_, y) => y !== k))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {i.tipo === 'pesquisa' && <p className="mt-3 text-[12px] text-[var(--text-muted)]">Avalie processos e experiências. Evite perguntas que exponham ou ranqueiem profissionais e estudantes.</p>}
          </div>

          <div className="rounded-[20px] border border-[var(--border)] p-4">
            <p className="mb-3 text-[14px] font-semibold text-[var(--text-heading)]">Quem participa</p>
            {editavel ? <PublicoPicker orgId={org} value={i.publico || {}} onChange={(p) => set({ publico: p })} /> : <InfoBox>{i.total_elegivel} participante(s) elegível(is) na publicação.</InfoBox>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Abre em (opcional)">{(id) => <input id={id} type="datetime-local" value={isoParaLocal(i.abre_em)} onChange={(e) => set({ abre_em: localParaISO(e.target.value) })} className={inputCls} />}</Field>
            <Field label="Encerra em">{(id) => <input id={id} type="datetime-local" value={isoParaLocal(i.fecha_em)} onChange={(e) => set({ fecha_em: localParaISO(e.target.value) })} className={inputCls} />}</Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <CampoSelect
                label="Unidade de resposta"
                value={i.unidade_resposta || 'responsavel'}
                onChange={(v) => set({ unidade_resposta: v as Iniciativa['unidade_resposta'] })}
                options={[
                  { value: 'responsavel', label: 'Por responsável' },
                  { value: 'familia', label: 'Por família' },
                  { value: 'estudante', label: 'Por estudante' },
                ]}
              />
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">{UNIDADE[i.unidade_resposta || 'responsavel']}</p>
            </div>
            <div>
              <CampoSelect
                label="Privacidade"
                value={i.privacidade || 'confidencial'}
                onChange={(v) => set({ privacidade: v as Iniciativa['privacidade'] })}
                options={(Object.keys(PRIVACIDADE) as Iniciativa['privacidade'][]).map((k) => ({ value: k, label: PRIVACIDADE[k].label }))}
              />
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">{PRIVACIDADE[i.privacidade || 'confidencial'].texto}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <CampoSelect
              label="Divulgação do resultado"
              value={i.politica_resultado || 'apos_encerrar'}
              onChange={(v) => set({ politica_resultado: v as Iniciativa['politica_resultado'] })}
              options={(Object.keys(POLITICA) as Iniciativa['politica_resultado'][]).map((k) => ({ value: k, label: POLITICA[k] }))}
            />
            <Field label="Mínimo de respostas por grupo">
              {(id) => <input id={id} type="number" min={3} max={50} value={i.minimo_privacidade ?? 5} onChange={(e) => set({ minimo_privacidade: Number(e.target.value) })} className={inputCls} />}
            </Field>
            <Field label="Tempo estimado (min)">
              {(id) => <input id={id} type="number" min={1} value={i.tempo_estimado_min ?? 3} onChange={(e) => set({ tempo_estimado_min: Number(e.target.value) })} className={inputCls} />}
            </Field>
          </div>
          <CampoTexto label="Responsável institucional" value={i.responsavel_nome || ''} onChange={(v) => set({ responsavel_nome: v })} placeholder="Ex.: Direção" />
          <CampoTexto label="Mensagem após participar" value={i.texto_confirmacao || ''} onChange={(v) => set({ texto_confirmacao: v })} max={200} />
          <Interruptor label="Permitir alterar a resposta até o encerramento" checked={!!i.permite_editar} onChange={(v) => set({ permite_editar: v })} />
        </fieldset>
      </Drawer>

      {previa && (
        <Drawer open onClose={() => setPrevia(false)} title={i.titulo || 'Prévia'} subtitle={t.label} width="max-w-2xl">
          <div className="space-y-4">
            {i.descricao && <p className="text-[15px] text-[var(--text-body)]">{i.descricao}</p>}
            {i.contexto && <InfoBox>{i.contexto}</InfoBox>}
            <div className="flex flex-wrap gap-1.5">
              <Pill>{PRIVACIDADE[i.privacidade || 'confidencial'].label}</Pill>
              <Pill>~{i.tempo_estimado_min || 3} min</Pill>
              {i.fecha_em && <Pill>Até {fmtDataHora(i.fecha_em)}</Pill>}
            </div>
            <FormularioPerguntas perguntas={perguntas} valores={valoresPrevia} onChange={(id, v) => setValoresPrevia((x) => ({ ...x, [id]: v }))} />
          </div>
        </Drawer>
      )}

      <ConfirmModal
        open={publicar}
        title="Publicar iniciativa?"
        confirmLabel="Publicar"
        loading={salvando}
        onClose={() => setPublicar(false)}
        onConfirm={confirmarPublicacao}
        text={
          <>
            <strong>{i.titulo}</strong> · {perguntas.length} pergunta(s) · {PRIVACIDADE[i.privacidade || 'confidencial'].label}. Depois de publicar, perguntas e regras não podem mudar.
            <span className="mt-3 block">
              <OpcaoIntegracao checked={divulgar} onChange={setDivulgar}>
                Divulgar a abertura no Mural de Recados (mesmo público)
              </OpcaoIntegracao>
            </span>
          </>
        }
      />
    </>
  );
}

function ResultadoDrawer({ iniciativa, onClose }: { iniciativa: Iniciativa; onClose: () => void }) {
  const [recorte, setRecorte] = useState('unidade');
  const dados = useCarregar<any>(() => rpc('participa_resultados', { p_ini: iniciativa.id, p_recorte: recorte }), [iniciativa.id, recorte], null);
  useRealtime(['participa_iniciativas'], () => dados.recarregar(true));
  return (
    <Drawer open onClose={onClose} title="Resultados" subtitle={iniciativa.titulo} width="max-w-3xl">
      {dados.error && <ErroBox error={dados.error} onRetry={() => dados.recarregar()} />}
      {dados.loading ? <Carregando /> : <Resultados dados={dados.data} recorte={recorte} onRecorte={setRecorte} gestor />}
      <EvolucaoEdicoes iniciativaId={iniciativa.id} />
    </Drawer>
  );
}

/* ================================================================== */
/* Sugestões                                                           */
/* ================================================================== */

function SugestoesTab({ org, toast }: { org: string; toast: Toast }) {
  const dados = useCarregar<any[]>(() => rpc<any[]>('participa_sugestoes_gestao', { p_org: org }), [org], []);
  useRealtime(['participa_sugestoes'], () => dados.recarregar(true));
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<any | null>(null);
  const lista = dados.data.filter((s) => (!status || s.status === status) && (!busca || `${s.titulo} ${s.descricao} ${s.categoria}`.toLowerCase().includes(busca.toLowerCase())));
  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();
    dados.data.forEach((s) => m.set(s.categoria, (m.get(s.categoria) || 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [dados.data]);

  return (
    <div className="space-y-4">
      {porCategoria.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {porCategoria.map(([c, n]) => (
            <Pill key={c}>
              {c} · {n}
            </Pill>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Busca value={busca} onChange={setBusca} placeholder="Buscar sugestão" />
        <div className="sm:w-64">
          <CampoSelect label="Situação" value={status} onChange={setStatus} options={[{ value: '', label: 'Todas' }, ...Object.entries(STATUS_SUGESTAO).map(([k, v]) => ({ value: k, label: v.label }))]} />
        </div>
      </div>
      {dados.error && <ErroBox error={dados.error} onRetry={() => dados.recarregar()} />}
      {dados.loading ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <EmptyState icon={Lightbulb} title="Nenhuma sugestão" text="As sugestões de famílias e docentes aparecem aqui." />
      ) : (
        <ul className="space-y-3">
          {lista.map((s) => (
            <li key={s.id}>
              <Painel className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone={STATUS_SUGESTAO[s.status]?.tone}>{STATUS_SUGESTAO[s.status]?.label}</Pill>
                    <Pill>{s.categoria}</Pill>
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {s.autor_nome} · {s.autor_tipo === 'docente' ? 'Docente' : 'Família'} · {fmtData(s.created_at)}
                    </span>
                  </div>
                  <h3 className="mt-1 text-[15px] font-semibold text-[var(--text-heading)]">{s.titulo}</h3>
                  <p className="line-clamp-2 text-[14px] text-[var(--text-body)]">{s.descricao}</p>
                </div>
                <button type="button" className={btn.secondary} onClick={() => setAberta(s)}>
                  Analisar
                </button>
              </Painel>
            </li>
          ))}
        </ul>
      )}
      {aberta && (
        <SugestaoDrawer
          s={aberta}
          onClose={() => setAberta(null)}
          onSalvo={() => {
            toast.show('Sugestão atualizada. Quem sugeriu foi avisado.');
            setAberta(null);
            dados.recarregar(true);
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
    </div>
  );
}

function SugestaoDrawer({ s, onClose, onSalvo, onErro }: { s: any; onClose: () => void; onSalvo: () => void; onErro: (m: string) => void }) {
  const [status, setStatus] = useState<string>(s.status);
  const [resposta, setResposta] = useState(s.resposta_gestao || '');
  const [just, setJust] = useState(s.justificativa || '');
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true);
    const r = await rpc('participa_sugestao_atualizar', { p_id: s.id, p_status: status, p_resposta: resposta || null, p_justificativa: just || null });
    setSalvando(false);
    if (r.error) return onErro(r.error);
    onSalvo();
  };
  return (
    <Drawer
      open
      onClose={onClose}
      title={s.titulo}
      subtitle={`${s.categoria} · ${s.autor_nome}`}
      footer={
        <button type="button" className={btn.primary} onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar e avisar
        </button>
      }
    >
      <div className="space-y-4">
        <p className="whitespace-pre-line text-[15px] text-[var(--text-body)]">{s.descricao}</p>
        {s.proposta && <InfoBox>Proposta de melhoria: {s.proposta}</InfoBox>}
        {!s.identificada && <InfoBox tone="info">Sugestão confidencial: a autoria não é mostrada à gestão.</InfoBox>}
        <div>
          <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Situação</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(STATUS_SUGESTAO).map(([k, v]) => (
              <Chip key={k} small active={status === k} onClick={() => setStatus(k)}>
                {v.label}
              </Chip>
            ))}
          </div>
        </div>
        <CampoArea label="Resposta para quem sugeriu" value={resposta} onChange={setResposta} rows={3} />
        {status === 'encerrada' && <CampoArea label="Justificativa do encerramento *" value={just} onChange={setJust} rows={2} />}
      </div>
    </Drawer>
  );
}

/* ================================================================== */
/* Encontros: inscrições/projetos e conselhos/assembleias              */
/* ================================================================== */

const GRUPO_TIPOS: Record<'inscricoes' | 'conselhos', Encontro['tipo'][]> = {
  inscricoes: ['reuniao', 'palestra', 'oficina', 'encontro', 'projeto'],
  conselhos: ['assembleia', 'conselho'],
};

function EncontrosTab({ org, dados, grupo, toast }: { org: string; dados: ReturnType<typeof useCarregar<Encontro[]>>; grupo: 'inscricoes' | 'conselhos'; toast: Toast }) {
  const [editando, setEditando] = useState<Partial<Encontro> | null>(null);
  const [inscritos, setInscritos] = useState<Encontro | null>(null);
  const lista = dados.data.filter((e) => GRUPO_TIPOS[grupo].includes(e.tipo));

  return (
    <div className="space-y-4">
      {grupo === 'conselhos' && (
        <InfoBox>Votações formais, eleições e decisões de conselho são uma etapa separada, com regras próprias de elegibilidade, quórum, sigilo e auditoria. Aqui ficam convocação, pauta, presença, ata e encaminhamentos.</InfoBox>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          className={btn.primary}
          onClick={() =>
            setEditando({ organization_id: org, tipo: GRUPO_TIPOS[grupo][0], titulo: '', publico: { familias: 'todas' }, lista_espera: true, requer_confirmacao: false, encaminhamentos: [] })
          }
        >
          <Plus className="h-4 w-4" /> {grupo === 'conselhos' ? 'Nova convocação' : 'Novo encontro ou projeto'}
        </button>
      </div>
      {dados.loading ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <EmptyState icon={grupo === 'conselhos' ? Gavel : UserCheck} title="Nada cadastrado" />
      ) : (
        <ul className="space-y-3">
          {lista.map((e) => (
            <li key={e.id}>
              <EncontroCard e={e} onEditar={() => setEditando(e)} onInscritos={() => setInscritos(e)} />
            </li>
          ))}
        </ul>
      )}
      {editando && (
        <EditorEncontro
          org={org}
          inicial={editando}
          tipos={GRUPO_TIPOS[grupo]}
          onClose={() => setEditando(null)}
          onSalvo={(m) => {
            toast.show(m);
            dados.recarregar(true);
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
      {inscritos && <InscritosDrawer e={inscritos} onClose={() => setInscritos(null)} toast={toast} />}
    </div>
  );
}

function EncontroCard({ e, onEditar, onInscritos }: { e: Encontro; onEditar: () => void; onInscritos: () => void }) {
  const cont = useCarregar<any>(() => rpc('participa_contagem_inscricoes', { p_encontro: e.id }), [e.id], null);
  useRealtime(['participa_inscricoes'], () => cont.recarregar(true));
  const c = cont.data || {};
  return (
    <Painel className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone="accent">{TIPOS_ENCONTRO[e.tipo]}</Pill>
          <Pill tone={e.status === 'publicado' ? 'success' : 'neutral'}>{{ rascunho: 'Rascunho', publicado: 'Publicado', encerrado: 'Encerrado', cancelado: 'Cancelado' }[e.status]}</Pill>
          {e.ata_aprovada && <Pill tone="info">Ata aprovada</Pill>}
        </div>
        <h3 className="mt-1 text-[15px] font-semibold text-[var(--text-heading)]">{e.titulo || 'Sem título'}</h3>
        <p className="text-[13px] text-[var(--text-muted)]">
          {e.inicio ? fmtDataHora(e.inicio) : 'Data a definir'}
          {e.local ? ` · ${e.local}` : ''} · {c.confirmadas ?? 0} confirmada(s){e.vagas ? ` de ${e.vagas} vagas` : ''}
          {c.pendentes ? ` · ${c.pendentes} pendente(s)` : ''}
          {c.espera ? ` · ${c.espera} na espera` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-1 sm:flex-col sm:items-end">
        <button type="button" className={btn.ghost} onClick={onEditar}>
          <Pencil className="h-4 w-4" /> Editar
        </button>
        {e.status !== 'rascunho' && (
          <button type="button" className={btn.ghost} onClick={onInscritos}>
            <Users className="h-4 w-4" /> Inscritos e presença
          </button>
        )}
      </div>
    </Painel>
  );
}

function EditorEncontro({
  org,
  inicial,
  tipos,
  onClose,
  onSalvo,
  onErro,
}: {
  org: string;
  inicial: Partial<Encontro>;
  tipos: Encontro['tipo'][];
  onClose: () => void;
  onSalvo: (m: string) => void;
  onErro: (m: string) => void;
}) {
  const [e, setE] = useState<Partial<Encontro>>(inicial);
  const [salvando, setSalvando] = useState(false);
  const set = (p: Partial<Encontro>) => setE((x) => ({ ...x, ...p }));
  const conselho = e.tipo === 'assembleia' || e.tipo === 'conselho';
  const projeto = e.tipo === 'projeto';
  const [divulgar, setDivulgar] = useState(true);
  const [noCalendario, setNoCalendario] = useState(true);
  const eventoCal: string | null = (e as any).evento_calendario_id || null;

  /** publica/atualiza no Calendário Escolar e guarda o id do evento no encontro */
  const levarAoCalendario = async (enc: Encontro): Promise<string> => {
    const cal = await publicarEncontroNoCalendario(org, { ...(enc as any), evento_calendario_id: (enc as any).evento_calendario_id });
    if (cal.error) return ` Calendário: ${cal.error}`;
    if (cal.id && cal.id !== (enc as any).evento_calendario_id) {
      await supabase.from('participa_encontros').update({ evento_calendario_id: cal.id } as any).eq('id', enc.id);
      set({ evento_calendario_id: cal.id } as any);
    }
    return ' Publicado no Calendário Escolar.';
  };

  const salvar = async (publicar: boolean) => {
    if (!e.titulo?.trim()) return onErro('Preencha o título.');
    setSalvando(true);
    const { id, created_at, ...resto } = e as Encontro;
    void created_at;
    const payload = { ...resto, organization_id: org, titulo: e.titulo.trim(), updated_at: new Date().toISOString() } as any;
    const res = id ? await supabase.from('participa_encontros').update(payload).eq('id', id).select('*').single() : await supabase.from('participa_encontros').insert(payload).select('*').single();
    if (res.error) {
      setSalvando(false);
      return onErro(mensagemErro(res.error));
    }
    if (publicar && (res.data as Encontro).status === 'rascunho') {
      const salvo = res.data as Encontro;
      const r = await rpc<any>('participa_publicar', { p_tipo: 'encontro', p_id: salvo.id });
      if (r.error) {
        setSalvando(false);
        return onErro(r.error);
      }
      let extra = '';
      if (noCalendario && salvo.inicio) extra += await levarAoCalendario(salvo);
      if (divulgar) extra += await divulgarNoMural('encontro', salvo.id);
      setSalvando(false);
      onSalvo(`Publicado. ${r.data.elegiveis} pessoa(s) foram avisadas.${extra}`);
      return onClose();
    }
    // já publicado e ligado ao calendário: mantém o evento do calendário em dia
    if ((res.data as Encontro).status === 'publicado' && (res.data as any).evento_calendario_id) {
      const extra = await levarAoCalendario(res.data as Encontro);
      setSalvando(false);
      onSalvo(`Salvo.${extra.replace('Publicado no', 'Atualizado no')}`);
      return onClose();
    }
    setSalvando(false);
    onSalvo('Salvo.');
    onClose();
  };

  const enc = e.encaminhamentos || [];

  return (
    <Drawer
      open
      onClose={onClose}
      bloqueado={salvando}
      width="max-w-3xl"
      title={e.id ? 'Editar' : conselho ? 'Nova convocação' : 'Novo encontro ou projeto'}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={() => salvar(false)} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
          {(!e.status || e.status === 'rascunho') && (
            <>
              <span className="mr-auto flex flex-wrap gap-x-4 gap-y-1">
                <OpcaoIntegracao checked={noCalendario} onChange={setNoCalendario}>
                  Publicar no Calendário Escolar
                </OpcaoIntegracao>
                <OpcaoIntegracao checked={divulgar} onChange={setDivulgar}>
                  Divulgar no Mural
                </OpcaoIntegracao>
              </span>
              <button type="button" className={btn.primary} onClick={() => salvar(true)} disabled={salvando}>
                <Send className="h-4 w-4" /> Publicar e abrir inscrições
              </button>
            </>
          )}
          {e.status === 'publicado' && e.id && (
            <>
              {!eventoCal && (
                <button
                  type="button"
                  className={btn.secondary}
                  disabled={salvando || !e.inicio}
                  title={!e.inicio ? 'Defina data e horário' : undefined}
                  onClick={async () => {
                    setSalvando(true);
                    const m = await levarAoCalendario(e as Encontro);
                    setSalvando(false);
                    m.startsWith(' Calendário:') ? onErro(m.trim()) : onSalvo(m.trim());
                  }}
                >
                  Publicar no Calendário
                </button>
              )}
              <button
                type="button"
                className={btn.secondary}
                disabled={salvando}
                onClick={async () => {
                  setSalvando(true);
                  const m = await divulgarNoMural('encontro', e.id as string);
                  setSalvando(false);
                  m.includes('Não foi possível') ? onErro(m.trim()) : onSalvo(m.trim());
                }}
              >
                Divulgar no Mural
              </button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {tipos.map((t) => (
            <Chip key={t} active={e.tipo === t} onClick={() => set({ tipo: t })}>
              {TIPOS_ENCONTRO[t]}
            </Chip>
          ))}
        </div>
        <CampoTexto label="Título" required value={e.titulo || ''} onChange={(v) => set({ titulo: v })} max={140} />
        <CampoArea label={projeto ? 'Apresentação do projeto' : 'Descrição'} value={e.descricao || ''} onChange={(v) => set({ descricao: v })} rows={3} />
        {projeto && (
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoArea label="Formas de participação" value={e.formas_participacao || ''} onChange={(v) => set({ formas_participacao: v })} rows={2} />
            <CampoArea label="Requisitos" value={e.requisitos || ''} onChange={(v) => set({ requisitos: v })} rows={2} />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Início">{(id) => <input id={id} type="datetime-local" value={isoParaLocal(e.inicio)} onChange={(x) => set({ inicio: localParaISO(x.target.value) })} className={inputCls} />}</Field>
          <Field label="Fim">{(id) => <input id={id} type="datetime-local" value={isoParaLocal(e.fim)} onChange={(x) => set({ fim: localParaISO(x.target.value) })} className={inputCls} />}</Field>
          <CampoTexto label="Local" value={e.local || ''} onChange={(v) => set({ local: v })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vagas (vazio = sem limite)">
            {(id) => <input id={id} type="number" min={1} value={e.vagas ?? ''} onChange={(x) => set({ vagas: x.target.value ? Number(x.target.value) : null })} className={inputCls} />}
          </Field>
          <Field label="Inscrições até">
            {(id) => <input id={id} type="datetime-local" value={isoParaLocal(e.inscricao_ate)} onChange={(x) => set({ inscricao_ate: localParaISO(x.target.value) })} className={inputCls} />}
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Interruptor label="Lista de espera" hint="Quando lotar, novas inscrições entram na fila" checked={!!e.lista_espera} onChange={(v) => set({ lista_espera: v })} />
          <Interruptor label="Inscrição precisa de confirmação" hint="A equipe confirma cada inscrito" checked={!!e.requer_confirmacao} onChange={(v) => set({ requer_confirmacao: v })} />
        </div>

        {(!e.status || e.status === 'rascunho') && (
          <div className="rounded-[20px] border border-[var(--border)] p-4">
            <p className="mb-3 text-[14px] font-semibold text-[var(--text-heading)]">Convidados</p>
            <PublicoPicker orgId={org} value={e.publico || {}} onChange={(p) => set({ publico: p })} />
          </div>
        )}

        {conselho && <CampoArea label="Pauta" value={e.pauta || ''} onChange={(v) => set({ pauta: v })} rows={4} />}
        <CampoArea label="Materiais e orientações aos participantes" value={e.materiais || ''} onChange={(v) => set({ materiais: v })} rows={2} />

        {(conselho || e.status === 'encerrado' || (e.inicio && new Date(e.inicio) < new Date())) && (
          <div className="space-y-3 rounded-[20px] border border-[var(--border)] p-4">
            <p className="text-[14px] font-semibold text-[var(--text-heading)]">Depois do encontro</p>
            <CampoArea label={conselho ? 'Ata' : 'Registro / devolutiva do encontro'} value={e.ata || ''} onChange={(v) => set({ ata: v })} rows={5} />
            {conselho && <Interruptor label="Ata aprovada" hint="Só a ata aprovada fica visível aos participantes" checked={!!e.ata_aprovada} onChange={(v) => set({ ata_aprovada: v })} />}
            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Encaminhamentos</p>
              {enc.map((x, k) => (
                <div key={k} className="mb-2 grid gap-2 sm:grid-cols-[1fr_160px_140px_36px]">
                  <input value={x.acao} onChange={(ev) => set({ encaminhamentos: enc.map((y, j) => (j === k ? { ...y, acao: ev.target.value } : y)) })} placeholder="Ação" aria-label="Ação" className={inputCls} />
                  <input
                    value={x.responsavel || ''}
                    onChange={(ev) => set({ encaminhamentos: enc.map((y, j) => (j === k ? { ...y, responsavel: ev.target.value } : y)) })}
                    placeholder="Responsável"
                    aria-label="Responsável"
                    className={inputCls}
                  />
                  <input
                    type="date"
                    value={x.prazo || ''}
                    onChange={(ev) => set({ encaminhamentos: enc.map((y, j) => (j === k ? { ...y, prazo: ev.target.value } : y)) })}
                    aria-label="Prazo"
                    className={inputCls}
                  />
                  <button type="button" className={btn.icon} aria-label="Remover" onClick={() => set({ encaminhamentos: enc.filter((_, j) => j !== k) })}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" className={btn.ghost} onClick={() => set({ encaminhamentos: [...enc, { acao: '' }] })}>
                <Plus className="h-3.5 w-3.5" /> Encaminhamento
              </button>
            </div>
          </div>
        )}
        {e.id && e.status === 'publicado' && (
          <div className="flex gap-2">
            <button type="button" className={btn.secondary} onClick={() => set({ status: 'encerrado' })}>
              Marcar como encerrado
            </button>
            <button type="button" className={btn.ghost} onClick={() => set({ status: 'cancelado' })}>
              Cancelar encontro
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function InscritosDrawer({ e, onClose, toast }: { e: Encontro; onClose: () => void; toast: Toast }) {
  const dados = useCarregar<any[]>(
    async () => {
      const { data, error } = await supabase.from('participa_inscricoes').select('*').eq('encontro_id', e.id).order('created_at');
      return error ? { error: mensagemErro(error) } : { data: data || [] };
    },
    [e.id],
    [],
  );
  useRealtime(['participa_inscricoes'], () => dados.recarregar(true));
  const gerir = async (id: string, acao: string) => {
    const r = await rpc('participa_gerir_inscricao', { p_id: id, p_acao: acao });
    if (r.error) return toast.show(r.error, 'danger');
    dados.recarregar(true);
  };
  const tone: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'danger'> = { confirmada: 'success', pendente: 'warning', espera: 'info', cancelada: 'neutral', recusada: 'danger' };
  return (
    <Drawer open onClose={onClose} title="Inscritos" subtitle={e.titulo} width="max-w-2xl">
      {dados.loading ? (
        <Carregando />
      ) : dados.data.length === 0 ? (
        <EmptyState icon={Users} title="Ninguém inscrito ainda" />
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
          {dados.data.map((x) => (
            <li key={x.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[var(--text-heading)]">{x.nome || 'Participante'}</p>
                <p className="text-[12px] text-[var(--text-muted)]">
                  {x.tipo_participante === 'docente' ? 'Docente' : 'Família'} · {fmtDataHora(x.created_at)}
                  {x.disponibilidade ? ` · ${x.disponibilidade}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Pill tone={tone[x.status]}>{x.status}</Pill>
                {x.presente === true && <Pill tone="success">Presente</Pill>}
                {x.presente === false && <Pill tone="danger">Ausente</Pill>}
                {x.status === 'pendente' && (
                  <button type="button" className={btn.ghost} onClick={() => gerir(x.id, 'confirmar')}>
                    Confirmar
                  </button>
                )}
                {['pendente', 'confirmada'].includes(x.status) && (
                  <>
                    <button type="button" className={btn.ghost} onClick={() => gerir(x.id, 'presente')}>
                      Presente
                    </button>
                    <button type="button" className={btn.ghost} onClick={() => gerir(x.id, 'ausente')}>
                      Ausente
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

/* ================================================================== */
/* Resultados e devolutivas                                            */
/* ================================================================== */

function ResultadosTab({ org, iniciativas, encontros, toast }: { org: string; iniciativas: Iniciativa[]; encontros: Encontro[]; toast: Toast }) {
  const devolutivas = useCarregar<Devolutiva[]>(
    async () => {
      const { data, error } = await supabase.from('participa_devolutivas').select('*').eq('organization_id', org).order('created_at', { ascending: false });
      return error ? { error: mensagemErro(error) } : { data: (data as Devolutiva[]) || [] };
    },
    [org],
    [],
  );
  const [resultado, setResultado] = useState<Iniciativa | null>(null);
  const [editando, setEditando] = useState<Partial<Devolutiva> | null>(null);
  const comResultado = iniciativas.filter((i) => i.status !== 'rascunho');
  const temDevolutiva = (id: string) => devolutivas.data.some((d) => d.iniciativa_id === id && d.status === 'publicada');

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold text-[var(--text-heading)]">Resultados</h3>
        {comResultado.length === 0 && <p className="text-[13px] text-[var(--text-muted)]">Nenhuma iniciativa publicada.</p>}
        {comResultado.map((i) => (
          <Painel key={i.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[var(--text-heading)]">{i.titulo}</p>
              <p className="text-[12px] text-[var(--text-muted)]">
                {TIPOS_INICIATIVA[i.tipo].label} · {aberta(i) ? 'aberta' : 'encerrada'} {temDevolutiva(i.id) ? '· devolutiva publicada' : ''}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" className={btn.ghost} onClick={() => setResultado(i)}>
                <BarChart3 className="h-4 w-4" /> Ver
              </button>
              {!temDevolutiva(i.id) && !aberta(i) && (
                <button
                  type="button"
                  className={btn.secondary}
                  onClick={() => setEditando({ organization_id: org, iniciativa_id: i.id, titulo: `O que fizemos com: ${i.titulo}`, acoes: [], publico: i.publico })}
                >
                  Devolutiva
                </button>
              )}
            </div>
          </Painel>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[var(--text-heading)]">Devolutivas</h3>
          <button
            type="button"
            className={btn.ghost}
            onClick={() => setEditando({ organization_id: org, titulo: '', acoes: [], publico: { familias: 'todas', docentes: 'todos' } })}
          >
            <Plus className="h-4 w-4" /> Nova
          </button>
        </div>
        {devolutivas.data.length === 0 && <p className="text-[13px] text-[var(--text-muted)]">Nenhuma devolutiva ainda.</p>}
        {devolutivas.data.map((d) => (
          <Painel key={d.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[var(--text-heading)]">{d.titulo}</p>
              <p className="text-[12px] text-[var(--text-muted)]">{d.status === 'publicada' ? `Publicada ${fmtData(d.publicada_em)}` : 'Rascunho'}</p>
            </div>
            <button type="button" className={btn.ghost} onClick={() => setEditando(d)}>
              <Pencil className="h-4 w-4" /> {d.status === 'publicada' ? 'Ver' : 'Editar'}
            </button>
          </Painel>
        ))}
      </section>

      {resultado && <ResultadoDrawer iniciativa={resultado} onClose={() => setResultado(null)} />}
      {editando && (
        <EditorDevolutiva
          org={org}
          inicial={editando}
          iniciativas={iniciativas}
          encontros={encontros}
          onClose={() => setEditando(null)}
          onSalvo={(m) => {
            toast.show(m);
            setEditando(null);
            devolutivas.recarregar(true);
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
    </div>
  );
}

function EditorDevolutiva({
  org,
  inicial,
  iniciativas,
  encontros,
  onClose,
  onSalvo,
  onErro,
}: {
  org: string;
  inicial: Partial<Devolutiva>;
  iniciativas: Iniciativa[];
  encontros: Encontro[];
  onClose: () => void;
  onSalvo: (m: string) => void;
  onErro: (m: string) => void;
}) {
  const [d, setD] = useState<Partial<Devolutiva>>(inicial);
  const [salvando, setSalvando] = useState(false);
  const set = (p: Partial<Devolutiva>) => setD((x) => ({ ...x, ...p }));
  const publicada = d.status === 'publicada';
  const acoes = d.acoes || [];
  const [divulgarDev, setDivulgarDev] = useState(true);

  const salvar = async (publicar: boolean) => {
    if (!d.titulo?.trim()) return onErro('Preencha o título.');
    setSalvando(true);
    const { id, publicada_em, ...resto } = d as Devolutiva;
    void publicada_em;
    const payload = { ...resto, organization_id: org, titulo: d.titulo.trim(), iniciativa_id: d.iniciativa_id || null, encontro_id: d.encontro_id || null } as any;
    const res = id ? await supabase.from('participa_devolutivas').update(payload).eq('id', id).select('*').single() : await supabase.from('participa_devolutivas').insert(payload).select('*').single();
    if (res.error) {
      setSalvando(false);
      return onErro(mensagemErro(res.error));
    }
    if (publicar) {
      const r = await rpc<any>('participa_publicar', { p_tipo: 'devolutiva', p_id: (res.data as Devolutiva).id });
      if (r.error) {
        setSalvando(false);
        return onErro(r.error);
      }
      const extra = divulgarDev ? await divulgarNoMural('devolutiva', (res.data as Devolutiva).id) : '';
      setSalvando(false);
      return onSalvo(`Devolutiva publicada para ${r.data.elegiveis} pessoa(s).${extra}`);
    }
    setSalvando(false);
    onSalvo('Devolutiva salva.');
  };

  return (
    <Drawer
      open
      onClose={onClose}
      bloqueado={salvando}
      width="max-w-3xl"
      title={publicada ? 'Devolutiva publicada' : 'Devolutiva à comunidade'}
      subtitle="O que ouvimos, o que decidimos e o que vamos fazer."
      footer={
        !publicada && (
          <>
            <span className="mr-auto">
              <OpcaoIntegracao checked={divulgarDev} onChange={setDivulgarDev}>
                Divulgar no Mural
              </OpcaoIntegracao>
            </span>
            <button type="button" className={btn.secondary} onClick={() => salvar(false)} disabled={salvando}>
              Salvar rascunho
            </button>
            <button type="button" className={btn.primary} onClick={() => salvar(true)} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />} <Send className="h-4 w-4" /> Publicar
            </button>
          </>
        )
      }
    >
      <fieldset disabled={publicada} className="space-y-4">
        <CampoTexto label="Título" required value={d.titulo || ''} onChange={(v) => set({ titulo: v })} max={160} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            label="Sobre a iniciativa"
            value={d.iniciativa_id || ''}
            onChange={(v) => set({ iniciativa_id: v || null })}
            options={[{ value: '', label: 'Nenhuma' }, ...iniciativas.filter((i) => i.status !== 'rascunho').map((i) => ({ value: i.id, label: i.titulo }))]}
          />
          <CampoSelect
            label="Sobre o encontro"
            value={d.encontro_id || ''}
            onChange={(v) => set({ encontro_id: v || null })}
            options={[{ value: '', label: 'Nenhum' }, ...encontros.filter((e) => e.status !== 'rascunho').map((e) => ({ value: e.id, label: e.titulo }))]}
          />
        </div>
        <CampoArea label="O que ouvimos" value={d.o_que_ouvimos || ''} onChange={(v) => set({ o_que_ouvimos: v })} rows={4} />
        <CampoArea label="O que decidimos" value={d.decisoes || ''} onChange={(v) => set({ decisoes: v })} rows={3} />
        <div>
          <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Ações e prazos</p>
          {acoes.map((a, k) => (
            <div key={k} className="mb-2 grid gap-2 sm:grid-cols-[1fr_150px_150px_36px]">
              <input value={a.acao} onChange={(e) => set({ acoes: acoes.map((x, j) => (j === k ? { ...x, acao: e.target.value } : x)) })} placeholder="Ação" aria-label="Ação" className={inputCls} />
              <input type="date" value={a.prazo || ''} onChange={(e) => set({ acoes: acoes.map((x, j) => (j === k ? { ...x, prazo: e.target.value } : x)) })} aria-label="Prazo" className={inputCls} />
              <select value={a.status || 'planejada'} onChange={(e) => set({ acoes: acoes.map((x, j) => (j === k ? { ...x, status: e.target.value } : x)) })} aria-label="Situação" className={inputCls}>
                <option value="planejada">Planejada</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
              </select>
              <button type="button" className={btn.icon} aria-label="Remover" onClick={() => set({ acoes: acoes.filter((_, j) => j !== k) })}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {!publicada && (
            <button type="button" className={btn.ghost} onClick={() => set({ acoes: [...acoes, { acao: '', status: 'planejada' }] })}>
              <Plus className="h-3.5 w-3.5" /> Ação
            </button>
          )}
        </div>
        <CampoArea label="Limitações (o que não será possível e por quê)" value={d.limitacoes || ''} onChange={(v) => set({ limitacoes: v })} rows={2} />
        {!publicada && (
          <div className="rounded-[20px] border border-[var(--border)] p-4">
            <p className="mb-3 text-[14px] font-semibold text-[var(--text-heading)]">Quem recebe</p>
            <PublicoPicker orgId={org} value={d.publico || {}} onChange={(p) => set({ publico: p })} />
          </div>
        )}
      </fieldset>
    </Drawer>
  );
}


/* ------------------------------------------------------------------ */
/* Evolução entre edições comparáveis                                   */
/* ------------------------------------------------------------------ */

function EvolucaoEdicoes({ iniciativaId }: { iniciativaId: string }) {
  const dados = useCarregar<any>(() => rpc('participa_evolucao', { p_ini: iniciativaId }), [iniciativaId], null);
  if (dados.loading) return null;
  if (dados.error) return <div className="mt-6"><ErroBox error={dados.error} onRetry={() => dados.recarregar()} /></div>;
  const d = dados.data || {};
  const edicoes: any[] = d.edicoes || [];
  const perguntas: any[] = d.perguntas || [];
  const nomeEdicao = (id: string) => {
    const i = edicoes.findIndex((e) => e.id === id);
    const e = edicoes[i];
    return `${i + 1}ª edição${e?.publicada_em ? ` · ${fmtData(e.publicada_em)}` : ''}`;
  };

  return (
    <section className="mt-8 space-y-4 border-t border-[var(--border)] pt-6" aria-labelledby="evolucao-titulo">
      <div>
        <h3 id="evolucao-titulo" className="font-serif text-[18px] font-semibold text-[var(--text-heading)]">
          Evolução entre edições
        </h3>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">{d.aviso}</p>
      </div>
      {edicoes.length >= 2 &&
        perguntas.map((p, idx) => (
          <div key={idx} className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-[14px] font-semibold text-[var(--text-heading)]">{p.enunciado}</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[13px]">
                <thead>
                  <tr className="text-[12px] text-[var(--text-muted)]">
                    <th className="py-1.5 pr-3 font-medium">Edição</th>
                    <th className="py-1.5 pr-3 font-medium">Respostas</th>
                    {p.tipo === 'escala' && <th className="py-1.5 pr-3 font-medium">Média</th>}
                    <th className="py-1.5 font-medium">Distribuição</th>
                  </tr>
                </thead>
                <tbody>
                  {(p.serie as any[]).map((pt) => (
                    <tr key={pt.edicao_id} className="border-t border-[var(--border)] align-top">
                      <td className="py-2 pr-3 whitespace-nowrap text-[var(--text-body)]">{nomeEdicao(pt.edicao_id)}</td>
                      {pt.sem_pergunta ? (
                        <td colSpan={p.tipo === 'escala' ? 3 : 2} className="py-2 text-[var(--text-muted)]">Pergunta não existia nesta edição</td>
                      ) : pt.protegido ? (
                        <td colSpan={p.tipo === 'escala' ? 3 : 2} className="py-2 text-[var(--text-muted)]">
                          Protegido: {pt.respostas} resposta(s), abaixo do mínimo de privacidade
                        </td>
                      ) : (
                        <>
                          <td className="py-2 pr-3 tabular-nums">{pt.respostas}</td>
                          {p.tipo === 'escala' && <td className="py-2 pr-3 tabular-nums font-semibold">{pt.media ?? '—'}</td>}
                          <td className="py-2">
                            <span className="flex flex-wrap gap-1.5">
                              {(pt.distribuicao as any[]).map((x) => (
                                <span key={x.opcao} className="rounded-full bg-[var(--bg-card-alt)] px-2 py-0.5 text-[12px] text-[var(--text-body)]">
                                  {x.opcao}: <strong className="tabular-nums">{x.pct}%</strong>
                                </span>
                              ))}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </section>
  );
}
