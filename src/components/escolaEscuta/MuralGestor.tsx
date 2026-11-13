import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Eye,
  History,
  ImageIcon,
  Loader2,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Send,
  Settings2,
  StopCircle,
  Trash2,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrgAtual } from './useEscola';
import { Field, inputCls } from '../ui/kit';
import {
  type Publico,
  type PreviaPublico,
  fmtData,
  fmtDataHora,
  isoParaLocal,
  localParaISO,
  mensagemErro,
  rpc,
  rpcOrThrow,
  useCarregar,
  useRealtime,
} from '../../services/escolaEscuta/api';
import {
  AnexoImagem,
  AnexosLista,
  Busca,
  CampoTexto,
  Carregando,
  ConfirmModal,
  Drawer,
  EditorTexto,
  EmptyState,
  ErroBox,
  InfoBox,
  Interruptor,
  PageHeader,
  Painel,
  Pill,
  PublicoPicker,
  Tabs,
  TextoFormatado,
  UploadAnexos,
  btn,
  useToast,
  type AnexoInfo,
  type Tom,
} from './ui';

export const TIPOS_MURAL: { id: string; label: string; cor: string }[] = [
  { id: 'aviso', label: 'Aviso', cor: '#1D4ED8' },
  { id: 'evento', label: 'Evento', cor: '#7A2E8E' },
  { id: 'orientacao', label: 'Orientação', cor: '#0E7490' },
  { id: 'campanha', label: 'Campanha', cor: '#B54708' },
  { id: 'projeto', label: 'Projeto', cor: '#067647' },
  { id: 'conquista', label: 'Conquista', cor: '#A15C07' },
];
export const tipoMural = (id: string) => TIPOS_MURAL.find((t) => t.id === id) || TIPOS_MURAL[0];

export interface Recado {
  id: string;
  organization_id: string;
  titulo: string;
  resumo: string | null;
  conteudo: string | null;
  tipo: string;
  imagem_path: string | null;
  publico: Publico;
  inicio_em: string | null;
  fim_em: string | null;
  fixado: boolean;
  exige_ciencia: boolean;
  status: 'rascunho' | 'programado' | 'publicado' | 'encerrado' | 'arquivado' | 'cancelado';
  versao: number;
  total_destinatarios: number;
  sem_acesso: number;
  publicado_em: string | null;
  updated_at: string;
  created_at: string;
}

const STATUS: Record<Recado['status'], { label: string; tone: Tom }> = {
  rascunho: { label: 'Rascunho', tone: 'neutral' },
  programado: { label: 'Programado', tone: 'info' },
  publicado: { label: 'Publicado', tone: 'success' },
  encerrado: { label: 'Encerrado', tone: 'neutral' },
  arquivado: { label: 'Arquivado', tone: 'neutral' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
};

type Aba = 'ativos' | 'rascunhos' | 'arquivo';

const vazio = (org: string): Partial<Recado> => ({
  organization_id: org,
  titulo: '',
  resumo: '',
  conteudo: '',
  tipo: 'aviso',
  publico: { familias: 'todas' },
  fixado: false,
  exige_ciencia: false,
  inicio_em: null,
  fim_em: null,
  imagem_path: null,
});

export function MuralGestor({ organizationId }: { organizationId?: string }) {
  const org = useOrgAtual(organizationId);
  const toast = useToast();

  const [aba, setAba] = useState<Aba>('ativos');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Partial<Recado> | null>(null);
  const [acompanhando, setAcompanhando] = useState<Recado | null>(null);
  const [configAberta, setConfigAberta] = useState(false);
  const [confirmar, setConfirmar] = useState<{ recado: Recado; acao: string; titulo: string; texto: string; danger?: boolean } | null>(null);
  const [processando, setProcessando] = useState(false);

  const lista = useCarregar<Recado[]>(
    async () => {
      const { data, error } = await supabase
        .from('mural_recados')
        .select('*')
        .eq('organization_id', org)
        .order('fixado', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(300);
      return error ? { error: mensagemErro(error) } : { data: (data as Recado[]) || [] };
    },
    [org],
    [],
  );
  useRealtime(['mural_recados', 'mural_leituras'], () => lista.recarregar(true), !!org);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.data.filter((r) => {
      const naAba =
        aba === 'ativos' ? ['publicado', 'programado'].includes(r.status) : aba === 'rascunhos' ? r.status === 'rascunho' : ['encerrado', 'arquivado', 'cancelado'].includes(r.status);
      return naAba && (!q || `${r.titulo} ${r.resumo || ''}`.toLowerCase().includes(q));
    });
  }, [lista.data, aba, busca]);

  const contagem = (a: Aba) =>
    lista.data.filter((r) =>
      a === 'ativos' ? ['publicado', 'programado'].includes(r.status) : a === 'rascunhos' ? r.status === 'rascunho' : ['encerrado', 'arquivado', 'cancelado'].includes(r.status),
    ).length;

  const executar = async () => {
    if (!confirmar) return;
    setProcessando(true);
    try {
      if (confirmar.acao === 'excluir') {
        const { error } = await supabase.from('mural_recados').delete().eq('id', confirmar.recado.id);
        if (error) throw new Error(mensagemErro(error));
      } else {
        await rpcOrThrow('mural_alterar', { p_recado: confirmar.recado.id, p_acao: confirmar.acao });
      }
      toast.show('Pronto.');
      setConfirmar(null);
      lista.recarregar(true);
    } catch (e: any) {
      toast.show(e.message, 'danger');
    } finally {
      setProcessando(false);
    }
  };

  const fixar = async (r: Recado) => {
    const res = await rpc('mural_alterar', { p_recado: r.id, p_acao: r.fixado ? 'desafixar' : 'fixar' });
    if (res.error) toast.show(res.error, 'danger');
    else lista.recarregar(true);
  };

  if (!org) return <ErroBox error="Escola não identificada para este usuário." />;

  return (
    <div className="space-y-5 text-left">
      <PageHeader
        icon={Megaphone}
        title="Mural de Recados"
        subtitle="Avisos importantes da escola para famílias e docentes. Só a gestão publica."
        actions={
          <>
            <button type="button" className={btn.secondary} onClick={() => setConfigAberta(true)}>
              <Settings2 className="h-4 w-4" /> Cabeçalho do mural
            </button>
            <button type="button" className={btn.primary} onClick={() => setEditando(vazio(org))}>
              <Plus className="h-4 w-4" /> Novo recado
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs<Aba>
          value={aba}
          onChange={setAba}
          tabs={[
            { id: 'ativos', label: 'No ar', count: contagem('ativos') },
            { id: 'rascunhos', label: 'Rascunhos', count: contagem('rascunhos') },
            { id: 'arquivo', label: 'Encerrados e arquivo' },
          ]}
        />
        <div className="lg:w-80">
          <Busca value={busca} onChange={setBusca} placeholder="Buscar recado" />
        </div>
      </div>

      {lista.error && <ErroBox error={lista.error} onRetry={() => lista.recarregar()} />}

      {lista.loading ? (
        <Carregando linhas={4} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={aba === 'rascunhos' ? 'Nenhum rascunho' : aba === 'ativos' ? 'Nenhum recado no ar' : 'Nada no arquivo'}
          text={aba === 'ativos' ? 'Crie um recado e publique para as famílias e docentes da escola.' : undefined}
          action={
            aba !== 'arquivo' && (
              <button type="button" className={btn.primary} onClick={() => setEditando(vazio(org))}>
                <Plus className="h-4 w-4" /> Novo recado
              </button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtrados.map((r) => {
            const tipo = tipoMural(r.tipo);
            const st = STATUS[r.status];
            return (
              <li key={r.id}>
                <Painel className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {r.imagem_path ? (
                    <AnexoImagem path={r.imagem_path} alt="" className="h-24 w-full shrink-0 rounded-2xl sm:w-36" />
                  ) : (
                    <span className="hidden h-24 w-36 shrink-0 items-center justify-center rounded-2xl sm:flex" style={{ background: `${tipo.cor}14`, color: tipo.cor }}>
                      <Megaphone className="h-7 w-7" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] font-semibold" style={{ color: tipo.cor }}>
                        {tipo.label}
                      </span>
                      <Pill tone={st.tone}>{st.label}</Pill>
                      {r.fixado && (
                        <Pill tone="accent">
                          <Pin className="h-3 w-3" /> Fixado
                        </Pill>
                      )}
                      {r.exige_ciencia && <Pill tone="info">Pede ciência</Pill>}
                      {r.versao > 1 && <Pill>v{r.versao}</Pill>}
                    </div>
                    <h3 className="mt-1 text-[16px] font-semibold text-[var(--text-heading)]">{r.titulo || 'Sem título'}</h3>
                    {r.resumo && <p className="mt-0.5 line-clamp-2 text-[14px] text-[var(--text-muted)]">{r.resumo}</p>}
                    <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                      {r.status === 'programado' && <>Publica em {fmtDataHora(r.inicio_em)} · </>}
                      {r.status === 'publicado' && <>Publicado em {fmtData(r.publicado_em)} · </>}
                      {r.status === 'rascunho' && <>Editado em {fmtDataHora(r.updated_at)} · </>}
                      {r.fim_em && <>Sai do ar em {fmtData(r.fim_em)} · </>}
                      {r.total_destinatarios > 0 ? `${r.total_destinatarios} destinatário(s)` : 'Público não publicado'}
                      {r.sem_acesso > 0 && ` · ${r.sem_acesso} sem acesso ao portal`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:flex-col sm:items-end">
                    {['rascunho', 'programado', 'publicado'].includes(r.status) && (
                      <button type="button" className={btn.ghost} onClick={() => setEditando(r)}>
                        <Pencil className="h-4 w-4" /> Editar
                      </button>
                    )}
                    {r.status !== 'rascunho' && (
                      <button type="button" className={btn.ghost} onClick={() => setAcompanhando(r)}>
                        <BarChart3 className="h-4 w-4" /> Acompanhar
                      </button>
                    )}
                    {r.status === 'publicado' && (
                      <button type="button" className={btn.ghost} onClick={() => fixar(r)}>
                        {r.fixado ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />} {r.fixado ? 'Desafixar' : 'Fixar no topo'}
                      </button>
                    )}
                    {['publicado', 'programado'].includes(r.status) && (
                      <button
                        type="button"
                        className={btn.ghost}
                        onClick={() =>
                          setConfirmar({ recado: r, acao: 'encerrar', titulo: 'Encerrar exibição?', texto: 'O recado sai da área de destaque e fica no histórico dos destinatários.' })
                        }
                      >
                        <StopCircle className="h-4 w-4" /> Encerrar
                      </button>
                    )}
                    {['publicado', 'programado'].includes(r.status) && (
                      <button
                        type="button"
                        className={btn.ghost}
                        onClick={() =>
                          setConfirmar({ recado: r, acao: 'cancelar', titulo: 'Cancelar publicação?', texto: 'O recado deixa de aparecer para todos os destinatários. O histórico é mantido.', danger: true })
                        }
                      >
                        <XCircle className="h-4 w-4" /> Cancelar
                      </button>
                    )}
                    {r.status === 'encerrado' && (
                      <button type="button" className={btn.ghost} onClick={() => setConfirmar({ recado: r, acao: 'arquivar', titulo: 'Arquivar recado?', texto: 'Some do histórico dos destinatários.' })}>
                        <Archive className="h-4 w-4" /> Arquivar
                      </button>
                    )}
                    {r.status === 'rascunho' && (
                      <button
                        type="button"
                        className={btn.ghost}
                        onClick={() => setConfirmar({ recado: r, acao: 'excluir', titulo: 'Excluir rascunho?', texto: 'Esta ação não pode ser desfeita.', danger: true })}
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
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
        <EditorRecado
          org={org}
          inicial={editando}
          onClose={() => setEditando(null)}
          onSalvo={(msg) => {
            toast.show(msg);
            lista.recarregar(true);
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
      {acompanhando && <Acompanhamento recado={acompanhando} onClose={() => setAcompanhando(null)} />}
      {configAberta && <ConfigMural org={org} onClose={() => setConfigAberta(false)} onSalvo={() => toast.show('Cabeçalho atualizado.')} />}

      <ConfirmModal
        open={!!confirmar}
        title={confirmar?.titulo || ''}
        text={confirmar?.texto}
        tone={confirmar?.danger ? 'danger' : 'primary'}
        confirmLabel="Confirmar"
        loading={processando}
        onConfirm={executar}
        onClose={() => setConfirmar(null)}
      />
      {toast.node}
    </div>
  );
}

/* ================================================================== */
/* Editor                                                              */
/* ================================================================== */

function EditorRecado({
  org,
  inicial,
  onClose,
  onSalvo,
  onErro,
}: {
  org: string;
  inicial: Partial<Recado>;
  onClose: () => void;
  onSalvo: (msg: string) => void;
  onErro: (msg: string) => void;
}) {
  const [r, setR] = useState<Partial<Recado>>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [anexos, setAnexos] = useState<AnexoInfo[]>([]);
  const [anexosCarregados, setAnexosCarregados] = useState(false);
  const [previa, setPrevia] = useState<PreviaPublico | null>(null);
  const [verPrevia, setVerPrevia] = useState(false);
  const [confirmPub, setConfirmPub] = useState<null | { grande?: boolean; total?: number }>(null);
  const [publicando, setPublicando] = useState(false);
  const jaPublicado = r.status === 'publicado' || r.status === 'programado';
  const set = (patch: Partial<Recado>) => setR((p) => ({ ...p, ...patch }));

  useEffect(() => {
    if (!r.id || anexosCarregados) return;
    setAnexosCarregados(true);
    supabase
      .from('mural_anexos')
      .select('*')
      .eq('recado_id', r.id)
      .order('created_at')
      .then(({ data }) => setAnexos((data as AnexoInfo[]) || []));
  }, [r.id, anexosCarregados]);

  const validar = () => {
    if (!r.titulo?.trim()) return 'Preencha o assunto.';
    if (!r.conteudo?.trim() && !r.resumo?.trim()) return 'Escreva o conteúdo do recado.';
    if (r.fim_em && r.inicio_em && new Date(r.fim_em) <= new Date(r.inicio_em)) return 'O fim da exibição precisa ser depois do início.';
    return null;
  };

  const salvar = async (silencioso = false): Promise<string | null> => {
    const erro = validar();
    if (erro && !silencioso) {
      onErro(erro);
      return null;
    }
    setSalvando(true);
    const payload: any = {
      organization_id: org,
      titulo: r.titulo?.trim() || '',
      resumo: r.resumo?.trim() || null,
      conteudo: r.conteudo || null,
      tipo: r.tipo,
      imagem_path: r.imagem_path || null,
      inicio_em: r.inicio_em || null,
      fim_em: r.fim_em || null,
      fixado: !!r.fixado,
      exige_ciencia: !!r.exige_ciencia,
    };
    if (!jaPublicado) payload.publico = r.publico || {};
    const q = r.id ? supabase.from('mural_recados').update(payload).eq('id', r.id).select('*').single() : supabase.from('mural_recados').insert(payload).select('*').single();
    const { data, error } = await q;
    setSalvando(false);
    if (error) {
      onErro(mensagemErro(error));
      return null;
    }
    setR(data as Recado);
    if (!silencioso) onSalvo(jaPublicado ? 'Alteração publicada. Os destinatários veem a nova versão.' : 'Rascunho salvo.');
    return (data as Recado).id;
  };

  const pedirPublicacao = async () => {
    const erro = validar();
    if (erro) return onErro(erro);
    if (!previa || previa.total === 0) return onErro('Escolha um público com pelo menos um destinatário.');
    const id = await salvar(true);
    if (id) setConfirmPub({});
  };

  const publicar = async (confirmadoGrande: boolean) => {
    if (!r.id) return;
    setPublicando(true);
    const res = await rpc<any>('mural_publicar', { p_recado: r.id, p_confirmado: confirmadoGrande });
    setPublicando(false);
    if (res.error) return onErro(res.error);
    if (res.data?.precisa_confirmar) {
      setConfirmPub({ grande: true, total: res.data.total });
      return;
    }
    setConfirmPub(null);
    onSalvo(res.data?.status === 'programado' ? `Programado para ${fmtDataHora(r.inicio_em)}.` : `Publicado para ${res.data?.total} destinatário(s).`);
    onClose();
  };

  const addAnexo = async (a: AnexoInfo) => {
    const { data, error } = await supabase.from('mural_anexos').insert({ recado_id: r.id, path: a.path, nome: a.nome, mime: a.mime, tamanho: a.tamanho }).select('*').single();
    if (error) throw new Error(mensagemErro(error));
    setAnexos((l) => [...l, data as AnexoInfo]);
  };
  const removerAnexo = async (a: AnexoInfo) => {
    await supabase.from('mural_anexos').delete().eq('id', a.id!);
    setAnexos((l) => l.filter((x) => x.path !== a.path));
  };

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        bloqueado={salvando || publicando}
        width="max-w-3xl"
        title={r.id ? (jaPublicado ? 'Editar recado publicado' : 'Editar rascunho') : 'Novo recado'}
        subtitle={jaPublicado ? `Versão ${r.versao}. Ao salvar, os destinatários veem a versão nova.` : 'Salve como rascunho e publique quando estiver pronto.'}
        footer={
          <>
            <button type="button" className={btn.ghost} onClick={() => setVerPrevia(true)}>
              <Eye className="h-4 w-4" /> Ver como o destinatário
            </button>
            <span className="flex-1" />
            <button type="button" className={btn.secondary} onClick={() => salvar()} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              {jaPublicado ? 'Salvar alteração' : 'Salvar rascunho'}
            </button>
            {!jaPublicado && (
              <button type="button" className={btn.primary} onClick={pedirPublicacao} disabled={salvando}>
                {r.inicio_em && new Date(r.inicio_em) > new Date() ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {r.inicio_em && new Date(r.inicio_em) > new Date() ? 'Programar' : 'Publicar'}
              </button>
            )}
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <CampoTexto label="Assunto" required value={r.titulo || ''} onChange={(v) => set({ titulo: v })} max={140} placeholder="Ex.: Festa da Família no sábado" />
            <Field label="Tipo de conteúdo">
              {(id) => (
                <select id={id} value={r.tipo} onChange={(e) => set({ tipo: e.target.value })} className={inputCls}>
                  {TIPOS_MURAL.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <CampoTexto
            label="Resumo"
            value={r.resumo || ''}
            onChange={(v) => set({ resumo: v })}
            max={200}
            placeholder="Uma frase curta — aparece no destaque da página inicial"
            hint={`${(r.resumo || '').length}/200`}
          />

          <Field label="Conteúdo completo">{(id) => <EditorTexto id={id} value={r.conteudo || ''} onChange={(v) => set({ conteudo: v })} rows={9} />}</Field>

          <div className="rounded-[20px] border border-[var(--border)] p-4">
            <p className="text-[14px] font-semibold text-[var(--text-heading)]">Imagem e anexos</p>
            {!r.id ? (
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">Salve o rascunho para adicionar imagem e documentos.</p>
            ) : (
              <div className="mt-3 space-y-4">
                <div className="flex flex-wrap items-start gap-4">
                  {r.imagem_path ? (
                    <div className="relative">
                      <AnexoImagem path={r.imagem_path} alt="Imagem de destaque" className="h-28 w-48 rounded-2xl" />
                      <button type="button" onClick={() => set({ imagem_path: null })} className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-[#B42318] shadow" aria-label="Remover imagem">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="flex h-28 w-48 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-[var(--text-muted)]">
                      <ImageIcon className="h-6 w-6" />
                    </span>
                  )}
                  <UploadAnexos orgId={org} modulo="mural" donoId={r.id} somenteImagem rotulo="Imagem de destaque" onEnviado={(a) => set({ imagem_path: a.path })} />
                </div>
                <AnexosLista anexos={anexos} onRemover={removerAnexo} />
                <UploadAnexos orgId={org} modulo="mural" donoId={r.id} onEnviado={addAnexo} />
                <InfoBox tone="warning">Não anexe documentos pessoais (boletins, laudos, dados de um estudante) em recados coletivos.</InfoBox>
              </div>
            )}
          </div>

          <div className="rounded-[20px] border border-[var(--border)] p-4">
            <p className="mb-3 text-[14px] font-semibold text-[var(--text-heading)]">Público destinatário</p>
            {jaPublicado ? (
              <InfoBox>
                Publicado para {r.total_destinatarios} destinatário(s). Para mudar o público, cancele este recado e publique um novo.
              </InfoBox>
            ) : (
              <PublicoPicker orgId={org} value={r.publico || {}} onChange={(p) => set({ publico: p })} onPrevia={setPrevia} />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Publicar em (opcional)">
              {(id) => (
                <input
                  id={id}
                  type="datetime-local"
                  disabled={r.status === 'publicado'}
                  value={isoParaLocal(r.inicio_em)}
                  onChange={(e) => set({ inicio_em: localParaISO(e.target.value) })}
                  className={inputCls}
                />
              )}
            </Field>
            <Field label="Sai do ar em (opcional)">
              {(id) => <input id={id} type="datetime-local" value={isoParaLocal(r.fim_em)} onChange={(e) => set({ fim_em: localParaISO(e.target.value) })} className={inputCls} />}
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Interruptor label="Fixar no topo do mural" checked={!!r.fixado} onChange={(v) => set({ fixado: v })} />
            <Interruptor label="Pedir ciência" hint="O destinatário confirma que leu" checked={!!r.exige_ciencia} onChange={(v) => set({ exige_ciencia: v })} />
          </div>
        </div>
      </Drawer>

      {verPrevia && (
        <Drawer open onClose={() => setVerPrevia(false)} title="Prévia" subtitle="Assim o destinatário verá o recado." width="max-w-2xl">
          <RecadoCompleto recado={r as Recado} anexos={anexos} escola="Sua escola" />
        </Drawer>
      )}

      <ConfirmModal
        open={!!confirmPub}
        title={confirmPub?.grande ? 'Publicação de grande alcance' : r.inicio_em && new Date(r.inicio_em) > new Date() ? 'Programar recado?' : 'Publicar recado?'}
        confirmLabel={confirmPub?.grande ? `Sim, publicar para ${confirmPub.total}` : 'Publicar'}
        loading={publicando}
        onClose={() => setConfirmPub(null)}
        onConfirm={() => publicar(!!confirmPub?.grande)}
        text={
          confirmPub?.grande ? (
            <>Este recado vai para <strong>{confirmPub.total}</strong> pessoas. Confira o texto mais uma vez: depois de publicado, todos recebem o aviso.</>
          ) : (
            <>
              <strong>{r.titulo}</strong> vai para {previa?.total ?? '…'} destinatário(s)
              {previa?.familias ? ` (${previa.familias} responsáveis` : ''}
              {previa?.docentes ? `${previa?.familias ? ', ' : ' ('}${previa.docentes} docentes` : ''}
              {previa?.familias || previa?.docentes ? ')' : ''}.
            </>
          )
        }
      >
        {!confirmPub?.grande && !!previa?.sem_acesso && (
          <div className="mt-3">
            <InfoBox tone="warning">{previa.sem_acesso} responsável(is) ainda não têm acesso ao portal e só verão o recado quando entrarem.</InfoBox>
          </div>
        )}
      </ConfirmModal>
    </>
  );
}

/* ================================================================== */
/* Leitura completa (usada na prévia e no portal)                      */
/* ================================================================== */

export function RecadoCompleto({ recado, anexos, escola }: { recado: Recado; anexos: AnexoInfo[]; escola: string }) {
  const tipo = tipoMural(recado.tipo);
  return (
    <article className="space-y-4">
      {recado.imagem_path && <AnexoImagem path={recado.imagem_path} alt="" className="h-56 w-full rounded-[22px] sm:h-72" />}
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-semibold" style={{ color: tipo.cor }}>
            {tipo.label}
          </span>
          {recado.fixado && (
            <Pill tone="accent">
              <Pin className="h-3 w-3" /> Fixado
            </Pill>
          )}
          {recado.versao > 1 && <Pill>Atualizado</Pill>}
        </div>
        <h2 className="mt-1 font-serif text-[26px] font-semibold leading-tight text-[var(--text-heading)]">{recado.titulo || 'Sem título'}</h2>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          {escola} · Gestão escolar · {fmtData(recado.publicado_em || recado.inicio_em || recado.updated_at)}
        </p>
      </div>
      {recado.resumo && <p className="text-[16px] font-medium leading-relaxed text-[var(--text-heading)]">{recado.resumo}</p>}
      <TextoFormatado texto={recado.conteudo} />
      {anexos.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-[var(--text-heading)]">Anexos</p>
          <AnexosLista anexos={anexos} />
        </div>
      )}
    </article>
  );
}

/* ================================================================== */
/* Acompanhamento                                                      */
/* ================================================================== */

function Acompanhamento({ recado, onClose }: { recado: Recado; onClose: () => void }) {
  const dados = useCarregar<any>(() => rpc('mural_acompanhamento', { p_recado: recado.id }), [recado.id], null);
  const versoes = useCarregar<any[]>(
    async () => {
      const { data, error } = await supabase.from('mural_versoes').select('versao, titulo, editado_em').eq('recado_id', recado.id).order('versao', { ascending: false });
      return error ? { error: mensagemErro(error) } : { data: data || [] };
    },
    [recado.id],
    [],
  );
  useRealtime(['mural_leituras'], () => dados.recarregar(true));
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'ciencia'>('todos');
  const d = dados.data;
  const lista: any[] = (d?.lista || []).filter((x: any) =>
    filtro === 'todos' ? true : filtro === 'ciencia' ? !!x.ciencia_em : recado.exige_ciencia ? !x.ciencia_em : !x.visualizado_em,
  );

  return (
    <Drawer open onClose={onClose} title="Acompanhamento" subtitle={recado.titulo} width="max-w-2xl">
      {dados.error && <ErroBox error={dados.error} onRetry={() => dados.recarregar()} />}
      {dados.loading ? (
        <Carregando />
      ) : (
        d && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Destinatários" valor={d.total} />
              <Stat label="Abriram o recado" valor={d.visualizaram} pct={d.total ? Math.round((100 * d.visualizaram) / d.total) : 0} />
              {recado.exige_ciencia && <Stat label="Registraram ciência" valor={d.ciencias} pct={d.total ? Math.round((100 * d.ciencias) / d.total) : 0} />}
              <Stat label="Sem acesso ao portal" valor={d.sem_acesso} />
            </div>
            <InfoBox>Ver o destaque na página inicial não conta como leitura. Só conta quem abriu o recado.</InfoBox>

            <div className="flex flex-wrap gap-1.5">
              {(['todos', 'pendentes', 'ciencia'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFiltro(f)}
                  className={`rounded-full border px-3 py-1.5 text-[13px] font-medium ${filtro === f ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)]'}`}
                >
                  {f === 'todos' ? 'Todos' : f === 'pendentes' ? (recado.exige_ciencia ? 'Sem ciência' : 'Não abriram') : 'Com ciência'}
                </button>
              ))}
            </div>
            <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
              {lista.length === 0 && <li className="p-4 text-center text-[13px] text-[var(--text-muted)]">Ninguém nesta lista.</li>}
              {lista.map((x: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-[var(--text-heading)]">{x.nome}</span>
                    <span className="text-[12px] text-[var(--text-muted)]">{x.tipo === 'docente' ? 'Docente' : 'Responsável'}</span>
                  </span>
                  {x.ciencia_em ? (
                    <Pill tone="success">
                      <CheckCircle2 className="h-3 w-3" /> Ciência {fmtData(x.ciencia_em)}
                      {x.ciencia_versao && x.ciencia_versao < d.versao_atual ? ` (v${x.ciencia_versao})` : ''}
                    </Pill>
                  ) : x.visualizado_em ? (
                    <Pill tone="info">Abriu {fmtData(x.visualizado_em)}</Pill>
                  ) : x.sem_acesso ? (
                    <Pill tone="warning">Sem acesso</Pill>
                  ) : (
                    <Pill>Não abriu</Pill>
                  )}
                </li>
              ))}
            </ul>

            {versoes.data.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-heading)]">
                  <History className="h-4 w-4" /> Versões
                </p>
                <ul className="space-y-1 text-[13px] text-[var(--text-muted)]">
                  {versoes.data.map((v) => (
                    <li key={v.versao}>
                      v{v.versao} · {fmtDataHora(v.editado_em)} · {v.titulo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      )}
    </Drawer>
  );
}

function Stat({ label, valor, pct }: { label: string; valor: number; pct?: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] p-3">
      <p className="text-[12px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-[var(--text-heading)]">
        {valor}
        {pct !== undefined && <span className="ml-1 text-[13px] font-medium text-[var(--text-muted)]">{pct}%</span>}
      </p>
    </div>
  );
}

/* ================================================================== */
/* Cabeçalho do mural                                                  */
/* ================================================================== */

function ConfigMural({ org, onClose, onSalvo }: { org: string; onClose: () => void; onSalvo: () => void }) {
  const cfg = useCarregar<any>(
    async () => {
      const { data, error } = await supabase.from('mural_config').select('*').eq('organization_id', org).maybeSingle();
      return error ? { error: mensagemErro(error) } : { data: data || { organization_id: org, titulo: 'Mural de Recados', apresentacao: '' } };
    },
    [org],
    null,
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const c = cfg.data;

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    const { error } = await supabase
      .from('mural_config')
      .upsert({ organization_id: org, titulo: c.titulo || 'Mural de Recados', apresentacao: c.apresentacao || null, banner_path: c.banner_path || null, updated_at: new Date().toISOString() });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    onSalvo();
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Cabeçalho do mural"
      subtitle="Aparece no topo do mural para famílias e docentes."
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={btn.primary} onClick={salvar} disabled={salvando || !c}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </>
      }
    >
      {cfg.loading || !c ? (
        <Carregando linhas={2} />
      ) : (
        <div className="space-y-4">
          {erro && <ErroBox error={erro} />}
          <CampoTexto label="Título do mural" value={c.titulo || ''} onChange={(v) => cfg.setData({ ...c, titulo: v })} max={80} />
          <Field label="Texto de apresentação">
            {(id) => (
              <textarea
                id={id}
                rows={3}
                value={c.apresentacao || ''}
                maxLength={400}
                onChange={(e) => cfg.setData({ ...c, apresentacao: e.target.value })}
                className={`${inputCls} h-auto py-2.5`}
              />
            )}
          </Field>
          <div>
            <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Faixa / imagem da escola</p>
            {c.banner_path && <AnexoImagem path={c.banner_path} alt="Faixa" className="mb-3 h-28 w-full rounded-2xl" />}
            <UploadAnexos orgId={org} modulo="mural" donoId="config" somenteImagem rotulo={c.banner_path ? 'Trocar imagem' : 'Enviar imagem'} onEnviado={(a) => cfg.setData({ ...c, banner_path: a.path })} />
          </div>
        </div>
      )}
    </Drawer>
  );
}
