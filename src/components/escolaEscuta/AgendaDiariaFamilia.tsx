import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, HeartPulse, HelpCircle, Loader2, MessageSquare, NotebookPen, ThumbsUp, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cx } from '../ui/kit';
import { fmtData, fmtRelativo, mensagemErro, rpc, useCarregar, useMeusEstudantes, useMinhasEscolas, useRealtime } from '../../services/escolaEscuta/api';
import { AnexosLista, CampoArea, Carregando, Chip, EmptyState, ErroBox, InfoBox, PageHeader, Painel, Pill, SeletorEscola, TextoFormatado, btn, useToast, type AnexoInfo } from './ui';
import { CATEGORIAS, type Categoria, type RegistroDiario } from './AgendaDiariaDocente';

/* =====================================================================
 * Agenda Diária — Portal Família
 * Ciência e resposta são ações diferentes. Ciência não prova que a
 * tarefa foi feita ou que o material foi entregue.
 * ===================================================================== */

interface MinhaResposta {
  registro_id: string;
  student_id: string;
  ciencia_em: string | null;
  ciencia_versao: number | null;
  resposta_tipo: string | null;
  resposta_texto: string | null;
}

export function AgendaDiariaFamilia({ organizationId }: { organizationId?: string }) {
  const escolas = useMinhasEscolas();
  const estudantes = useMeusEstudantes();
  const familiaEscolas = escolas.data.filter((e) => e.papel === 'familia');
  const [org, setOrg] = useState<string | null>(organizationId || null);
  const [aluno, setAluno] = useState<string | null>(null);
  const [cat, setCat] = useState<Categoria | null>(null);
  const [soPendentes, setSoPendentes] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!org && familiaEscolas[0]) setOrg(familiaEscolas[0].organization_id);
  }, [familiaEscolas, org]);

  const alunos = estudantes.data.filter((e) => e.organization_id === org);

  const dados = useCarregar<{ registros: RegistroDiario[]; respostas: MinhaResposta[]; anexos: Record<string, AnexoInfo[]> }>(
    async () => {
      if (!org) return { data: { registros: [], respostas: [], anexos: {} } };
      const [reg, resp] = await Promise.all([
        supabase.from('diario_registros').select('*').eq('organization_id', org).eq('status', 'publicado').order('publicado_em', { ascending: false }).limit(200),
        supabase.from('diario_respostas').select('registro_id, student_id, ciencia_em, ciencia_versao, resposta_tipo, resposta_texto'),
      ]);
      if (reg.error) return { error: mensagemErro(reg.error) };
      const registros = (reg.data as RegistroDiario[]) || [];
      const ids = registros.map((r) => r.id);
      const anexos: Record<string, AnexoInfo[]> = {};
      if (ids.length) {
        const { data } = await supabase.from('diario_anexos').select('*').in('registro_id', ids);
        for (const a of (data as any[]) || []) (anexos[a.registro_id] ||= []).push(a);
      }
      return { data: { registros, respostas: (resp.data as MinhaResposta[]) || [], anexos } };
    },
    [org],
    { registros: [], respostas: [], anexos: {} },
  );
  useRealtime(['diario_registros'], () => dados.recarregar(true), !!org);

  // cada registro vira um item por estudante meu que ele alcança
  const itens = useMemo(() => {
    const out: { r: RegistroDiario; aluno: { student_id: string; student_nome: string }; resp?: MinhaResposta }[] = [];
    for (const r of dados.data.registros) {
      for (const a of alunos) {
        const alcanca = r.student_id ? r.student_id === a.student_id : r.class_id === a.class_id;
        if (!alcanca) continue;
        out.push({ r, aluno: a, resp: dados.data.respostas.find((x) => x.registro_id === r.id && x.student_id === a.student_id) });
      }
    }
    return out;
  }, [dados.data, alunos]);

  const pendente = (i: (typeof itens)[number]) =>
    i.r.tipo_resposta !== 'nenhuma' && !(i.resp?.resposta_tipo || (i.resp?.ciencia_em && (i.resp.ciencia_versao ?? 0) >= i.r.versao));

  const filtrados = itens.filter((i) => (!aluno || i.aluno.student_id === aluno) && (!cat || i.r.categoria === cat) && (!soPendentes || pendente(i)));
  const nPend = itens.filter(pendente).length;

  if (!escolas.loading && familiaEscolas.length === 0) return <EmptyState icon={NotebookPen} title="Nenhum estudante vinculado" />;

  return (
    <div className="space-y-5 text-left">
      <SeletorEscola escolas={familiaEscolas} value={org} onChange={setOrg} />
      <PageHeader icon={NotebookPen} title="Agenda Diária" subtitle="Recados, atividades e orientações dos professores." actions={nPend > 0 && <Pill tone="danger">{nPend} aguardando você</Pill>} />

      <div className="flex flex-wrap gap-1.5">
        {alunos.length > 1 && (
          <>
            <Chip active={!aluno} onClick={() => setAluno(null)}>
              Todos os filhos
            </Chip>
            {alunos.map((a) => (
              <Chip key={a.student_id} active={aluno === a.student_id} onClick={() => setAluno(a.student_id)}>
                {a.student_nome.split(' ')[0]}
              </Chip>
            ))}
            <span className="mx-1 w-px bg-[var(--border)]" />
          </>
        )}
        <Chip active={soPendentes} onClick={() => setSoPendentes((v) => !v)}>
          Pendentes
        </Chip>
        {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
          <Chip key={c} small active={cat === c} onClick={() => setCat(cat === c ? null : c)}>
            {CATEGORIAS[c].label}
          </Chip>
        ))}
      </div>

      {dados.error && <ErroBox error={dados.error} onRetry={() => dados.recarregar()} />}
      {dados.loading ? (
        <Carregando linhas={3} altura="h-40" />
      ) : filtrados.length === 0 ? (
        <EmptyState icon={NotebookPen} title="Nada por aqui" text="Os recados dos professores aparecem aqui assim que forem publicados." />
      ) : (
        <ul className="space-y-3">
          {filtrados.map((i) => (
            <li key={`${i.r.id}-${i.aluno.student_id}`}>
              <ItemDiario
                r={i.r}
                aluno={i.aluno}
                resp={i.resp}
                anexos={dados.data.anexos[i.r.id] || []}
                onRespondido={(m) => {
                  toast.show(m);
                  dados.recarregar(true);
                }}
                onErro={(m) => toast.show(m, 'danger')}
              />
            </li>
          ))}
        </ul>
      )}
      {toast.node}
    </div>
  );
}

function ItemDiario({
  r,
  aluno,
  resp,
  anexos,
  onRespondido,
  onErro,
}: {
  r: RegistroDiario;
  aluno: { student_id: string; student_nome: string };
  resp?: MinhaResposta;
  anexos: AnexoInfo[];
  onRespondido: (m: string) => void;
  onErro: (m: string) => void;
}) {
  const c = CATEGORIAS[r.categoria];
  const Icon = c.icon;
  const [enviando, setEnviando] = useState<string | null>(null);
  const [escrevendo, setEscrevendo] = useState<null | 'esclarecimento' | 'texto'>(null);
  const [texto, setTexto] = useState('');
  const cienciaAtual = resp?.ciencia_em && (resp.ciencia_versao ?? 0) >= r.versao;
  const prazoVencido = r.prazo && new Date(`${r.prazo}T23:59:59-03:00`) < new Date();

  const responder = async (tipo: string, txt?: string) => {
    setEnviando(tipo);
    const res = await rpc('diario_responder', { p_registro: r.id, p_student: aluno.student_id, p_tipo: tipo, p_texto: txt || null });
    setEnviando(null);
    if (res.error) return onErro(res.error);
    setEscrevendo(null);
    setTexto('');
    onRespondido(tipo === 'ciencia' ? 'Ciência registrada.' : 'Resposta enviada ao professor.');
  };

  return (
    <Painel className={cx('space-y-3', r.categoria === 'cuidados' && 'border-[#F5C2C0]')}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${c.cor}14`, color: c.cor }}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-semibold" style={{ color: c.cor }}>
              {c.label}
            </span>
            <Pill>{aluno.student_nome.split(' ')[0]}</Pill>
            {r.prioridade === 'alta' && <Pill tone="danger">Importante</Pill>}
            {r.versao > 1 && <Pill>Atualizado</Pill>}
          </div>
          <h3 className="mt-1 text-[16px] font-semibold text-[var(--text-heading)]">{r.titulo}</h3>
          <p className="text-[12px] text-[var(--text-muted)]">
            {r.autor_nome || 'Professor(a)'} · {r.student_id ? 'para seu filho(a)' : `turma ${r.class_nome || ''}`} · {fmtRelativo(r.publicado_em)}
          </p>
        </div>
      </div>

      {r.categoria === 'cuidados' && (
        <InfoBox tone="danger" icon={HeartPulse}>
          A escola segue o protocolo de atendimento e também entra em contato por telefone. Em dúvida, ligue para a escola.
        </InfoBox>
      )}

      <TextoFormatado texto={r.texto} />

      {(r.data_atividade || r.prazo) && (
        <p className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--text-muted)]">
          {r.data_atividade && <span>Atividade: {fmtData(`${r.data_atividade}T12:00:00-03:00`)}</span>}
          {r.prazo && (
            <span className={cx('inline-flex items-center gap-1', prazoVencido ? 'text-[#B42318]' : 'text-[#B54708]')}>
              <CalendarClock className="h-3.5 w-3.5" /> Prazo: {fmtData(`${r.prazo}T12:00:00-03:00`)}
            </span>
          )}
        </p>
      )}

      {r.evento_calendario_id && (r.evento_calendario_titulo || r.evento_calendario_data) && (
        <p className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-[var(--bg-card-alt)] px-3 py-2 text-[13px] text-[var(--text-body)]">
          <CalendarClock className="h-3.5 w-3.5 text-[var(--accent)]" /> No Calendário Escolar:
          <strong className="font-semibold">{r.evento_calendario_titulo || 'Evento'}</strong>
          {r.evento_calendario_data && <span>· {fmtData(`${r.evento_calendario_data}T12:00:00-03:00`)}</span>}
        </p>
      )}

      {anexos.length > 0 && <AnexosLista anexos={anexos} />}

      {r.tipo_resposta !== 'nenhuma' && (
        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          {resp?.resposta_tipo ? (
            <Pill tone="success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {resp.resposta_tipo === 'confirmo' && 'Você confirmou'}
              {resp.resposta_tipo === 'nao_possivel' && 'Você avisou que não será possível'}
              {resp.resposta_tipo === 'esclarecimento' && 'Você pediu esclarecimento'}
              {resp.resposta_tipo === 'texto' && 'Você respondeu'}
            </Pill>
          ) : cienciaAtual && r.tipo_resposta === 'ciencia' ? (
            <Pill tone="success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ciência registrada
            </Pill>
          ) : (
            <div className="flex flex-wrap gap-2">
              {r.tipo_resposta === 'ciencia' && (
                <button type="button" className={btn.primary} disabled={!!enviando} onClick={() => responder('ciencia')}>
                  {enviando === 'ciencia' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Registrar ciência
                </button>
              )}
              {r.tipo_resposta === 'material' && (
                <>
                  <button type="button" className={btn.success} disabled={!!enviando} onClick={() => responder('confirmo')}>
                    <ThumbsUp className="h-4 w-4" /> Confirmo que vou enviar
                  </button>
                  <button type="button" className={btn.secondary} disabled={!!enviando} onClick={() => responder('nao_possivel')}>
                    <XCircle className="h-4 w-4" /> Não será possível
                  </button>
                </>
              )}
              {r.tipo_resposta === 'livre' && (
                <button type="button" className={btn.primary} onClick={() => setEscrevendo('texto')}>
                  <MessageSquare className="h-4 w-4" /> Responder
                </button>
              )}
              <button type="button" className={btn.ghost} onClick={() => setEscrevendo('esclarecimento')}>
                <HelpCircle className="h-4 w-4" /> Pedir esclarecimento
              </button>
            </div>
          )}
          {escrevendo && (
            <div className="space-y-2">
              <CampoArea label={escrevendo === 'texto' ? 'Sua resposta' : 'O que você quer esclarecer?'} value={texto} onChange={setTexto} rows={3} max={1000} />
              <div className="flex gap-2">
                <button type="button" className={btn.primary} disabled={!texto.trim() || !!enviando} onClick={() => responder(escrevendo, texto)}>
                  {enviando && <Loader2 className="h-4 w-4 animate-spin" />} Enviar
                </button>
                <button type="button" className={btn.ghost} onClick={() => setEscrevendo(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {r.tipo_resposta === 'material' && <p className="text-[12px] text-[var(--text-muted)]">Confirmar aqui não registra a entrega: o professor confere quando o material chegar.</p>}
          {r.tipo_resposta === 'ciencia' && !cienciaAtual && <p className="text-[12px] text-[var(--text-muted)]">Registrar ciência confirma que você leu. Não indica que a tarefa foi feita.</p>}
        </div>
      )}
    </Painel>
  );
}
