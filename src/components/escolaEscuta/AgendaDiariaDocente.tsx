import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarCheck2,
  Check,
  ClipboardCheck,
  HeartPulse,
  Loader2,
  NotebookPen,
  Package,
  Pencil,
  Plus,
  Send,
  Shield,
  Smile,
  Sparkles,
  Undo2,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrgAtual } from './useEscola';
import { CATEGORIAS_AVALIACAO, useEventosCalendario, type EventoCalendario } from './calendario';
import { Field, cx, inputCls } from '../ui/kit';
import { fmtData, fmtDataHora, mensagemErro, rpc, useCarregar, useRealtime } from '../../services/escolaEscuta/api';
import {
  AnexosLista,
  Busca,
  CampoArea,
  CampoSelect,
  CampoTexto,
  Carregando,
  Chip,
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
  Tabs,
  TextoFormatado,
  UploadAnexos,
  btn,
  useToast,
  type AnexoInfo,
  type Tom,
} from './ui';

/* =====================================================================
 * Agenda Diária — Portal Docente (e aba de aprovação no Portal Gestor)
 * ===================================================================== */

export type Categoria = 'atividades' | 'materiais' | 'projetos' | 'rotina' | 'devolutivas' | 'cuidados' | 'avaliacoes';

export const CATEGORIAS: Record<Categoria, { label: string; exemplos: string; icon: LucideIcon; cor: string; direta: boolean }> = {
  atividades: { label: 'Atividades e para casa', exemplos: 'Tarefa, atividade complementar, orientação', icon: NotebookPen, cor: '#1D4ED8', direta: true },
  materiais: { label: 'Materiais necessários', exemplos: 'Roupa extra, material de projeto', icon: Package, cor: '#B54708', direta: true },
  projetos: { label: 'Projetos e leitura', exemplos: 'Orientações, experiências, leitura', icon: BookOpen, cor: '#0E7490', direta: true },
  rotina: { label: 'Rotina e experiências', exemplos: 'Atividades realizadas, participação', icon: Sparkles, cor: '#7A2E8E', direta: true },
  devolutivas: { label: 'Devolutivas positivas', exemplos: 'Conquista, evolução, colaboração', icon: Smile, cor: '#067647', direta: true },
  cuidados: { label: 'Cuidados e ocorrências', exemplos: 'Febre, mal-estar, acidente', icon: HeartPulse, cor: '#B42318', direta: false },
  avaliacoes: { label: 'Avaliações', exemplos: 'Orientação sobre avaliação programada', icon: ClipboardCheck, cor: '#A15C07', direta: false },
};

export interface RegistroDiario {
  id: string;
  organization_id: string;
  class_id: string | null;
  class_nome: string | null;
  student_id: string | null;
  student_nome: string | null;
  categoria: Categoria;
  titulo: string;
  texto: string;
  data_atividade: string | null;
  prazo: string | null;
  tipo_resposta: 'nenhuma' | 'ciencia' | 'material' | 'livre';
  prioridade: 'normal' | 'alta';
  status: 'rascunho' | 'aguardando_aprovacao' | 'devolvido' | 'publicado' | 'cancelado';
  versao: number;
  autor_user_id: string;
  autor_nome: string | null;
  setor_expedidor: string | null;
  evento_calendario_id: string | null;
  evento_calendario_titulo?: string | null;
  evento_calendario_data?: string | null;
  ano_letivo?: string | null;
  solicitar_calendario: boolean;
  motivo_devolucao: string | null;
  publicado_em: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_DIARIO: Record<RegistroDiario['status'], { label: string; tone: Tom }> = {
  rascunho: { label: 'Rascunho', tone: 'neutral' },
  aguardando_aprovacao: { label: 'Aguardando aprovação', tone: 'warning' },
  devolvido: { label: 'Devolvido para ajuste', tone: 'danger' },
  publicado: { label: 'Publicado', tone: 'success' },
  cancelado: { label: 'Cancelado', tone: 'neutral' },
};

const RESPOSTA: Record<RegistroDiario['tipo_resposta'], string> = {
  nenhuma: 'Só informativo',
  ciencia: 'Pedir ciência',
  material: 'Confirmar envio de material',
  livre: 'Pedir resposta da família',
};

interface Turma {
  class_id: string;
  class_nome: string;
  turno: string | null;
  estudantes: { id: string; nome: string }[];
}

type Aba = 'meus' | 'aprovacoes' | 'regras';

export function AgendaDiariaDocente({ organizationId, modo = 'docente' }: { organizationId?: string; modo?: 'docente' | 'gestor' }) {
  const org = useOrgAtual(organizationId);
  const toast = useToast();
  const [aba, setAba] = useState<Aba>(modo === 'gestor' ? 'aprovacoes' : 'meus');
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id || null));
  }, []);

  const turmas = useCarregar<Turma[]>(() => rpc<Turma[]>('diario_minhas_turmas', { p_org: org }), [org], []);
  const regras = useCarregar<Record<string, boolean>>(
    async () => {
      const { data } = await supabase.from('diario_categorias').select('categoria, publicacao_direta').eq('organization_id', org);
      const m: Record<string, boolean> = {};
      (data || []).forEach((x: any) => (m[x.categoria] = x.publicacao_direta));
      return { data: m };
    },
    [org],
    {},
  );
  const registros = useCarregar<RegistroDiario[]>(
    async () => {
      let q = supabase.from('diario_registros').select('*').eq('organization_id', org).order('updated_at', { ascending: false }).limit(400);
      if (modo === 'docente' && uid) q = q.eq('autor_user_id', uid);
      const { data, error } = await q;
      return error ? { error: mensagemErro(error) } : { data: (data as RegistroDiario[]) || [] };
    },
    [org, uid, modo],
    [],
  );
  useRealtime(['diario_registros', 'diario_respostas'], () => registros.recarregar(true), !!org);

  const direta = (c: Categoria) => regras.data[c] ?? CATEGORIAS[c].direta;
  const [editando, setEditando] = useState<Partial<RegistroDiario> | null>(null);
  const aguardando = registros.data.filter((r) => r.status === 'aguardando_aprovacao');

  if (!org) return <ErroBox error="Escola não identificada para este usuário." />;

  const novo = () =>
    setEditando({
      organization_id: org,
      categoria: 'atividades',
      tipo_resposta: 'ciencia',
      prioridade: 'normal',
      class_id: turmas.data[0]?.class_id || null,
      titulo: '',
      texto: '',
    });

  return (
    <div className="space-y-5 text-left">
      <PageHeader
        icon={NotebookPen}
        title="Agenda Diária"
        subtitle={modo === 'gestor' ? 'Revise e aprove os registros que exigem aprovação.' : 'Recados, atividades e orientações da rotina para as famílias.'}
        actions={
          modo === 'docente' && (
            <button type="button" className={btn.primary} onClick={novo} disabled={!turmas.data.length}>
              <Plus className="h-4 w-4" /> Novo registro
            </button>
          )
        }
      />

      {modo === 'gestor' && (
        <Tabs<Aba>
          value={aba}
          onChange={setAba}
          tabs={[
            { id: 'aprovacoes', label: 'Aprovações', icon: Check, count: aguardando.length },
            { id: 'meus', label: 'Todos os registros', icon: NotebookPen },
            { id: 'regras', label: 'Regras de publicação', icon: Shield },
          ]}
        />
      )}

      {!turmas.loading && !turmas.data.length && modo === 'docente' && (
        <InfoBox tone="warning">Nenhuma turma vinculada a você nesta escola. Peça à gestão para liberar suas turmas.</InfoBox>
      )}

      {aba === 'regras' ? (
        <RegrasCategorias org={org} regras={regras} toast={toast} />
      ) : (
        <ListaRegistros
          modo={modo}
          aprovacoes={aba === 'aprovacoes'}
          registros={aba === 'aprovacoes' ? aguardando : registros.data}
          loading={registros.loading}
          error={registros.error}
          onRetry={() => registros.recarregar()}
          turmas={turmas.data}
          onEditar={(r) => setEditando(r)}
          onMudou={() => registros.recarregar(true)}
          toast={toast}
        />
      )}

      {editando && (
        <EditorRegistro
          org={org}
          turmas={turmas.data}
          inicial={editando}
          direta={direta}
          gestor={modo === 'gestor'}
          onClose={() => setEditando(null)}
          onSalvo={(msg) => {
            toast.show(msg);
            setEditando(null);
            registros.recarregar(true);
          }}
          onErro={(m) => toast.show(m, 'danger')}
        />
      )}
      {toast.node}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ListaRegistros({
  modo,
  aprovacoes,
  registros,
  loading,
  error,
  onRetry,
  turmas,
  onEditar,
  onMudou,
  toast,
}: {
  modo: 'docente' | 'gestor';
  aprovacoes: boolean;
  registros: RegistroDiario[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  turmas: Turma[];
  onEditar: (r: RegistroDiario) => void;
  onMudou: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [busca, setBusca] = useState('');
  const [turma, setTurma] = useState('');
  const [status, setStatus] = useState('');
  const [cat, setCat] = useState<Categoria | ''>('');
  const [acompanhar, setAcompanhar] = useState<RegistroDiario | null>(null);
  const [ver, setVer] = useState<RegistroDiario | null>(null);
  const [moderar, setModerar] = useState<{ r: RegistroDiario; acao: 'devolver' | 'cancelar' } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return registros.filter(
      (r) =>
        (!turma || r.class_id === turma) &&
        (!status || r.status === status) &&
        (!cat || r.categoria === cat) &&
        (!q || `${r.titulo} ${r.texto} ${r.student_nome || ''} ${r.autor_nome || ''}`.toLowerCase().includes(q)),
    );
  }, [registros, busca, turma, status, cat]);

  const aprovar = async (r: RegistroDiario) => {
    setOcupado(r.id);
    const res = await rpc('diario_moderar', { p_id: r.id, p_acao: 'aprovar' });
    setOcupado(null);
    if (res.error) return toast.show(res.error, 'danger');
    toast.show('Aprovado e publicado para as famílias.');
    onMudou();
  };

  return (
    <div className="space-y-4">
      {!aprovacoes && (
        <Painel className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <CampoSelect label="Turma" value={turma} onChange={setTurma} options={[{ value: '', label: 'Todas' }, ...turmas.map((t) => ({ value: t.class_id, label: t.class_nome }))]} />
            <CampoSelect
              label="Situação"
              value={status}
              onChange={setStatus}
              options={[{ value: '', label: 'Todas' }, ...Object.entries(STATUS_DIARIO).map(([k, v]) => ({ value: k, label: v.label }))]}
            />
            <CampoSelect
              label="Categoria"
              value={cat}
              onChange={(v) => setCat(v as Categoria | '')}
              options={[{ value: '', label: 'Todas' }, ...Object.entries(CATEGORIAS).map(([k, v]) => ({ value: k, label: v.label }))]}
            />
          </div>
          <Busca value={busca} onChange={setBusca} placeholder="Buscar por título, texto ou estudante" />
        </Painel>
      )}

      {error && <ErroBox error={error} onRetry={onRetry} />}
      {loading ? (
        <Carregando linhas={4} />
      ) : lista.length === 0 ? (
        <EmptyState icon={NotebookPen} title={aprovacoes ? 'Nada aguardando aprovação' : 'Nenhum registro'} />
      ) : (
        <ul className="space-y-3">
          {lista.map((r) => {
            const c = CATEGORIAS[r.categoria];
            const Icon = c.icon;
            const st = STATUS_DIARIO[r.status];
            return (
              <li key={r.id}>
                <Painel className={cx('flex flex-col gap-3 sm:flex-row sm:items-start', r.categoria === 'cuidados' && r.status === 'aguardando_aprovacao' && 'border-[#F5C2C0]')}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${c.cor}14`, color: c.cor }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] font-semibold" style={{ color: c.cor }}>
                        {c.label}
                      </span>
                      <Pill tone={st.tone}>{st.label}</Pill>
                      {r.prioridade === 'alta' && <Pill tone="danger">Prioridade alta</Pill>}
                      {r.solicitar_calendario && <Pill tone="info">Pediu inclusão no calendário</Pill>}
                    </div>
                    <h3 className="mt-1 text-[15px] font-semibold text-[var(--text-heading)]">{r.titulo}</h3>
                    <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
                      {r.student_nome ? `${r.student_nome} · ` : <Users className="mr-1 inline h-3.5 w-3.5" />}
                      {r.class_nome || 'Turma'} · {modo === 'gestor' ? `${r.autor_nome || 'Docente'} · ` : ''}
                      {r.publicado_em ? `publicado ${fmtDataHora(r.publicado_em)}` : `editado ${fmtDataHora(r.updated_at)}`}
                      {r.prazo ? ` · prazo ${fmtData(r.prazo + 'T12:00:00-03:00')}` : ''}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-[14px] text-[var(--text-body)]">{r.texto}</p>
                    {r.status === 'devolvido' && r.motivo_devolucao && <InfoBox tone="danger">Ajuste pedido pela gestão: {r.motivo_devolucao}</InfoBox>}
                  </div>
                  <div className="flex flex-wrap gap-1 sm:flex-col sm:items-end">
                    {aprovacoes ? (
                      <>
                        <button type="button" className={btn.success} disabled={ocupado === r.id} onClick={() => aprovar(r)}>
                          {ocupado === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprovar e publicar
                        </button>
                        <button type="button" className={btn.ghost} onClick={() => setVer(r)}>
                          Ler completo
                        </button>
                        <button type="button" className={btn.ghost} onClick={() => setModerar({ r, acao: 'devolver' })}>
                          <Undo2 className="h-4 w-4" /> Devolver
                        </button>
                      </>
                    ) : (
                      <>
                        {r.status !== 'cancelado' && (
                          <button type="button" className={btn.ghost} onClick={() => onEditar(r)}>
                            <Pencil className="h-4 w-4" /> Editar
                          </button>
                        )}
                        {r.status === 'publicado' && r.tipo_resposta !== 'nenhuma' && (
                          <button type="button" className={btn.ghost} onClick={() => setAcompanhar(r)}>
                            <BarChart3 className="h-4 w-4" /> Acompanhar
                          </button>
                        )}
                        {modo === 'gestor' && r.status !== 'cancelado' && (
                          <button type="button" className={btn.ghost} onClick={() => setModerar({ r, acao: 'cancelar' })}>
                            <XCircle className="h-4 w-4" /> Cancelar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </Painel>
              </li>
            );
          })}
        </ul>
      )}

      {acompanhar && <AcompanhamentoDiario r={acompanhar} onClose={() => setAcompanhar(null)} />}
      {ver && (
        <Drawer open onClose={() => setVer(null)} title={ver.titulo} subtitle={`${CATEGORIAS[ver.categoria].label} · ${ver.student_nome || ver.class_nome}`}>
          <TextoFormatado texto={ver.texto} />
        </Drawer>
      )}
      <ConfirmModal
        open={!!moderar}
        title={moderar?.acao === 'devolver' ? 'Devolver ao docente' : 'Cancelar registro'}
        tone="danger"
        confirmLabel={moderar?.acao === 'devolver' ? 'Devolver' : 'Cancelar registro'}
        loading={!!ocupado}
        onClose={() => setModerar(null)}
        onConfirm={async () => {
          if (!moderar) return;
          setOcupado(moderar.r.id);
          const res = await rpc('diario_moderar', { p_id: moderar.r.id, p_acao: moderar.acao, p_motivo: motivo || null });
          setOcupado(null);
          if (res.error) return toast.show(res.error, 'danger');
          setModerar(null);
          setMotivo('');
          onMudou();
        }}
      >
        <div className="mt-2">
          <CampoArea label={moderar?.acao === 'devolver' ? 'O que ajustar? *' : 'Motivo'} value={motivo} onChange={setMotivo} rows={3} max={500} />
        </div>
      </ConfirmModal>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EditorRegistro({
  org,
  turmas,
  inicial,
  direta,
  gestor,
  onClose,
  onSalvo,
  onErro,
}: {
  org: string;
  turmas: Turma[];
  inicial: Partial<RegistroDiario>;
  direta: (c: Categoria) => boolean;
  gestor: boolean;
  onClose: () => void;
  onSalvo: (msg: string) => void;
  onErro: (m: string) => void;
}) {
  const [r, setR] = useState<Partial<RegistroDiario>>(inicial);
  const [alvo, setAlvo] = useState<'turma' | 'estudante'>(inicial.student_id ? 'estudante' : 'turma');
  const [salvando, setSalvando] = useState(false);
  const [anexos, setAnexos] = useState<AnexoInfo[]>([]);
  const set = (p: Partial<RegistroDiario>) => setR((x) => ({ ...x, ...p }));
  const turma = turmas.find((t) => t.class_id === r.class_id);
  const cat = (r.categoria || 'atividades') as Categoria;
  const publicaDireto = gestor || direta(cat);
  const jaPublicado = inicial.status === 'publicado';

  useEffect(() => {
    if (cat === 'cuidados') {
      setAlvo('estudante');
      set({ prioridade: 'alta', tipo_resposta: r.tipo_resposta === 'nenhuma' ? 'ciencia' : r.tipo_resposta });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  useEffect(() => {
    if (!r.id) return;
    supabase
      .from('diario_anexos')
      .select('*')
      .eq('registro_id', r.id)
      .then(({ data }) => setAnexos((data as AnexoInfo[]) || []));
  }, [r.id]);

  const salvar = async (publicar: boolean) => {
    if (!r.class_id) return onErro('Escolha a turma.');
    if (alvo === 'estudante' && !r.student_id) return onErro('Escolha o estudante.');
    if (!r.titulo?.trim() || !r.texto?.trim()) return onErro('Preencha título e texto.');
    setSalvando(true);
    const payload: any = {
      organization_id: org,
      class_id: r.class_id,
      student_id: alvo === 'estudante' ? r.student_id : null,
      categoria: cat,
      titulo: r.titulo.trim(),
      texto: r.texto.trim(),
      data_atividade: r.data_atividade || null,
      prazo: r.prazo || null,
      tipo_resposta: r.tipo_resposta || 'nenhuma',
      prioridade: r.prioridade || 'normal',
      evento_calendario_id: r.evento_calendario_id || null,
      evento_calendario_titulo: r.evento_calendario_id ? r.evento_calendario_titulo || null : null,
      evento_calendario_data: r.evento_calendario_id ? r.evento_calendario_data || null : null,
      ano_letivo: r.ano_letivo || String(new Date().getFullYear()),
      solicitar_calendario: !!r.solicitar_calendario,
      status: publicar ? 'publicado' : jaPublicado ? 'publicado' : 'rascunho',
    };
    const q = r.id ? supabase.from('diario_registros').update(payload).eq('id', r.id).select('*').single() : supabase.from('diario_registros').insert(payload).select('*').single();
    const { data, error } = await q;
    setSalvando(false);
    if (error) return onErro(mensagemErro(error));
    const st = (data as RegistroDiario).status;
    if (!publicar && !jaPublicado) {
      setR(data as RegistroDiario);
      return onSalvo('Rascunho salvo.');
    }
    onSalvo(
      st === 'publicado'
        ? jaPublicado
          ? 'Alteração publicada. As famílias veem a nova versão.'
          : 'Publicado. As famílias foram avisadas.'
        : 'Enviado para aprovação da gestão.',
    );
  };

  const addAnexo = async (a: AnexoInfo) => {
    const { data, error } = await supabase.from('diario_anexos').insert({ registro_id: r.id, path: a.path, nome: a.nome, mime: a.mime, tamanho: a.tamanho }).select('*').single();
    if (error) throw new Error(mensagemErro(error));
    setAnexos((l) => [...l, data as AnexoInfo]);
  };

  return (
    <Drawer
      open
      onClose={onClose}
      bloqueado={salvando}
      width="max-w-3xl"
      title={r.id ? 'Editar registro' : 'Novo registro'}
      subtitle={jaPublicado ? `Publicado · versão ${r.versao}. Salvar cria uma nova versão.` : undefined}
      footer={
        <>
          {!jaPublicado && (
            <button type="button" className={btn.secondary} onClick={() => salvar(false)} disabled={salvando}>
              Salvar rascunho
            </button>
          )}
          <button type="button" className={btn.primary} onClick={() => salvar(true)} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {jaPublicado ? 'Salvar alteração' : publicaDireto ? 'Publicar' : 'Enviar para aprovação'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Categoria</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(CATEGORIAS) as Categoria[]).map((k) => {
              const c = CATEGORIAS[k];
              const Icon = c.icon;
              const ativo = cat === k;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={jaPublicado}
                  onClick={() => set({ categoria: k })}
                  className={cx('flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors disabled:opacity-60', ativo ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--bg-card-alt)]')}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${c.cor}14`, color: c.cor }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--text-heading)]">{c.label}</span>
                    <span className="block text-[12px] text-[var(--text-muted)]">{c.exemplos}</span>
                    {!gestor && !direta(k) && <span className="mt-0.5 block text-[11px] font-medium text-[#B54708]">Passa pela gestão</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {cat === 'cuidados' && (
          <InfoBox tone="danger" icon={HeartPulse}>
            <strong>Febre ou acidente não podem depender só deste registro.</strong> Siga o protocolo da escola e ligue para a família agora. Este registro é individual, tem prioridade alta e vai
            para a gestão revisar.
          </InfoBox>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            label="Ano letivo"
            value={r.ano_letivo || String(new Date().getFullYear())}
            onChange={(v) => set({ ano_letivo: v })}
            options={[-1, 0, 1].map((d) => {
              const a = String(new Date().getFullYear() + d);
              return { value: a, label: a };
            })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            label="Turma"
            value={r.class_id || ''}
            onChange={(v) => set({ class_id: v, student_id: null })}
            options={[{ value: '', label: 'Escolha' }, ...turmas.map((t) => ({ value: t.class_id, label: `${t.class_nome}${t.turno ? ` · ${t.turno}` : ''}` }))]}
          />
          <div>
            <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Para</p>
            <div className="flex gap-1.5">
              <Chip active={alvo === 'turma'} onClick={() => cat !== 'cuidados' && setAlvo('turma')}>
                Turma inteira
              </Chip>
              <Chip active={alvo === 'estudante'} onClick={() => setAlvo('estudante')}>
                Um estudante
              </Chip>
            </div>
          </div>
        </div>
        {alvo === 'estudante' && (
          <CampoSelect
            label="Estudante"
            value={r.student_id || ''}
            onChange={(v) => set({ student_id: v || null })}
            options={[{ value: '', label: 'Escolha' }, ...(turma?.estudantes || []).map((e) => ({ value: e.id, label: e.nome }))]}
          />
        )}

        <CampoTexto label="Título" required value={r.titulo || ''} onChange={(v) => set({ titulo: v })} max={120} />
        <Field label="Texto">{(id) => <EditorTexto id={id} value={r.texto || ''} onChange={(v) => set({ texto: v })} rows={6} max={4000} />}</Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Data da atividade">{(id) => <input id={id} type="date" value={r.data_atividade || ''} onChange={(e) => set({ data_atividade: e.target.value || null })} className={inputCls} />}</Field>
          <Field label="Prazo (se houver)">{(id) => <input id={id} type="date" value={r.prazo || ''} onChange={(e) => set({ prazo: e.target.value || null })} className={inputCls} />}</Field>
          <CampoSelect
            label="Prioridade"
            value={r.prioridade || 'normal'}
            onChange={(v) => set({ prioridade: v as 'normal' | 'alta' })}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'alta', label: 'Alta (também vai por WhatsApp)' },
            ]}
          />
        </div>

        <CampoSelect
          label="O que a família faz"
          value={r.tipo_resposta || 'nenhuma'}
          onChange={(v) => set({ tipo_resposta: v as RegistroDiario['tipo_resposta'] })}
          options={(Object.keys(RESPOSTA) as RegistroDiario['tipo_resposta'][]).filter((k) => cat !== 'cuidados' || k !== 'nenhuma').map((k) => ({ value: k, label: RESPOSTA[k] }))}
        />

        {cat === 'avaliacoes' && (
          <div className="space-y-3 rounded-[20px] border border-[var(--border)] p-4">
            <InfoBox icon={CalendarCheck2}>Datas oficiais de avaliação são publicadas pela gestão no Calendário Escolar. Aqui você vincula um evento já publicado ou pede a inclusão.</InfoBox>
            <EventoDoCalendario
              org={org}
              valor={r.evento_calendario_id || ''}
              onEscolher={(ev) =>
                set({ evento_calendario_id: ev?.id || null, evento_calendario_titulo: ev?.titulo || null, evento_calendario_data: ev?.data || null })
              }
            />
            <Interruptor label="Pedir inclusão no Calendário Escolar" hint="A gestão recebe o pedido e decide" checked={!!r.solicitar_calendario} onChange={(v) => set({ solicitar_calendario: v })} />
          </div>
        )}

        <div className="rounded-[20px] border border-[var(--border)] p-4">
          <p className="text-[14px] font-semibold text-[var(--text-heading)]">Anexos</p>
          {!r.id ? (
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">Salve o rascunho para anexar arquivos.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <AnexosLista anexos={anexos} />
              <UploadAnexos orgId={org} modulo="diario" donoId={r.id} onEnviado={addAnexo} />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */

const RESP_LABEL: Record<string, { label: string; tone: Tom }> = {
  confirmo: { label: 'Confirmou', tone: 'success' },
  nao_possivel: { label: 'Não será possível', tone: 'danger' },
  esclarecimento: { label: 'Pediu esclarecimento', tone: 'warning' },
  texto: { label: 'Respondeu', tone: 'info' },
};

function AcompanhamentoDiario({ r, onClose }: { r: RegistroDiario; onClose: () => void }) {
  const d = useCarregar<any>(() => rpc('diario_acompanhamento', { p_registro: r.id }), [r.id], null);
  useRealtime(['diario_respostas'], () => d.recarregar(true));
  return (
    <Drawer open onClose={onClose} title="Acompanhamento" subtitle={r.titulo}>
      {d.loading ? (
        <Carregando />
      ) : d.error ? (
        <ErroBox error={d.error} />
      ) : (
        d.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-[var(--bg-card-alt)] p-3">
                <p className="text-[12px] text-[var(--text-muted)]">Estudantes</p>
                <p className="text-[22px] font-semibold tabular-nums">{d.data.total}</p>
              </div>
              <div className="rounded-2xl bg-[var(--bg-card-alt)] p-3">
                <p className="text-[12px] text-[var(--text-muted)]">Ciência</p>
                <p className="text-[22px] font-semibold tabular-nums">{d.data.ciencias}</p>
              </div>
              <div className="rounded-2xl bg-[var(--bg-card-alt)] p-3">
                <p className="text-[12px] text-[var(--text-muted)]">Respostas</p>
                <p className="text-[22px] font-semibold tabular-nums">{d.data.respostas}</p>
              </div>
            </div>
            <InfoBox>Registrar ciência não prova que a tarefa foi feita ou que o material foi entregue.</InfoBox>
            <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
              {(d.data.lista || []).map((x: any) => (
                <li key={x.student_id} className="px-4 py-2.5 text-[14px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--text-heading)]">{x.student_nome}</span>
                    {x.resposta_tipo ? (
                      <Pill tone={RESP_LABEL[x.resposta_tipo]?.tone}>{RESP_LABEL[x.resposta_tipo]?.label}</Pill>
                    ) : x.ciencia_em ? (
                      <Pill tone="success">Ciência {fmtData(x.ciencia_em)}</Pill>
                    ) : (
                      <Pill>Pendente</Pill>
                    )}
                  </div>
                  {x.resposta_texto && (
                    <p className="mt-1 text-[13px] text-[var(--text-body)]">
                      “{x.resposta_texto}” — {x.quem}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </Drawer>
  );
}

function RegrasCategorias({ org, regras, toast }: { org: string; regras: ReturnType<typeof useCarregar<Record<string, boolean>>>; toast: ReturnType<typeof useToast> }) {
  const mudar = async (c: Categoria, v: boolean) => {
    regras.setData({ ...regras.data, [c]: v });
    const { error } = await supabase.from('diario_categorias').upsert({ organization_id: org, categoria: c, publicacao_direta: v });
    if (error) {
      toast.show(mensagemErro(error), 'danger');
      regras.recarregar(true);
    }
  };
  return (
    <Painel className="space-y-3">
      <p className="text-[14px] text-[var(--text-muted)]">Escolha o que o docente publica direto e o que passa pela gestão antes de chegar às famílias.</p>
      {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
        <Interruptor
          key={c}
          label={CATEGORIAS[c].label}
          hint={c === 'cuidados' ? 'Recomendado: com revisão, sem atrasar o contato imediato com a família' : CATEGORIAS[c].exemplos}
          checked={regras.data[c] ?? CATEGORIAS[c].direta}
          onChange={(v) => mudar(c, v)}
        />
      ))}
      <p className="text-[12px] text-[var(--text-muted)]">Ligado = docente publica direto. Desligado = vai para Aprovações.</p>
    </Painel>
  );
}


/** Escolhe um evento já publicado pela gestão no Calendário Escolar (o docente não edita o calendário). */
function EventoDoCalendario({ org, valor, onEscolher }: { org: string; valor: string; onEscolher: (ev: EventoCalendario | null) => void }) {
  const [todos, setTodos] = useState(false);
  const { eventos, carregando, erro } = useEventosCalendario(org, todos ? undefined : CATEGORIAS_AVALIACAO);
  const atual = eventos.find((e) => e.id === valor);
  return (
    <div className="space-y-2">
      <Field label="Evento publicado no Calendário Escolar">
        {(id) => (
          <select
            id={id}
            value={valor}
            onChange={(e) => onEscolher(eventos.find((x) => x.id === e.target.value) || null)}
            className={inputCls}
            disabled={carregando}
          >
            <option value="">{carregando ? 'Carregando o calendário…' : eventos.length ? 'Nenhum (não vincular)' : 'Nenhum evento encontrado'}</option>
            {valor && !atual && <option value={valor}>Evento vinculado anteriormente</option>}
            {eventos.map((e) => (
              <option key={e.id} value={e.id}>
                {fmtData(`${e.data}T12:00:00`)} · {e.titulo}
              </option>
            ))}
          </select>
        )}
      </Field>
      <label className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
        <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} /> Mostrar todos os eventos, não só avaliações
      </label>
      {erro && <p className="text-[12px] text-[#B42318]">Não foi possível ler o calendário: {erro}</p>}
    </div>
  );
}
