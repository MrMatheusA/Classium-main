import { useMemo } from 'react';
import { BarChart3, ClipboardList, Lightbulb, ListChecks, MessagesSquare, PartyPopper, Vote, type LucideIcon } from 'lucide-react';
import { cx } from '../ui/kit';
import type { Publico } from '../../services/escolaEscuta/api';
import { Chip, InfoBox, Pill } from './ui';

/* Tipos e peças compartilhadas do Participa (Gestor e Portais) */

export type TipoIniciativa = 'pesquisa' | 'enquete' | 'consulta' | 'avaliacao_evento' | 'necessidades';
export type TipoPergunta = 'unica' | 'multipla' | 'escala' | 'texto' | 'prioridades';

export interface Iniciativa {
  id: string;
  organization_id: string;
  tipo: TipoIniciativa;
  titulo: string;
  descricao: string | null;
  contexto: string | null;
  criterios_analise: string | null;
  carater: 'orientativa' | 'formal';
  publico: Publico;
  abre_em: string | null;
  fecha_em: string | null;
  unidade_resposta: 'responsavel' | 'familia' | 'estudante';
  privacidade: 'identificada' | 'confidencial' | 'anonima';
  responsavel_nome: string | null;
  politica_resultado: 'imediato' | 'apos_encerrar' | 'somente_gestao';
  texto_confirmacao: string | null;
  permite_editar: boolean;
  tempo_estimado_min: number | null;
  minimo_privacidade: number;
  encontro_id: string | null;
  status: 'rascunho' | 'publicada' | 'encerrada' | 'arquivada';
  total_elegivel: number | null;
  publicada_em: string | null;
  created_at: string;
}

export interface Pergunta {
  id?: string;
  iniciativa_id?: string;
  ordem: number;
  tipo: TipoPergunta;
  enunciado: string;
  opcoes: string[];
  obrigatoria: boolean;
  max_escolhas: number | null;
}

export interface Encontro {
  id: string;
  organization_id: string;
  tipo: 'reuniao' | 'palestra' | 'oficina' | 'encontro' | 'projeto' | 'assembleia' | 'conselho';
  titulo: string;
  descricao: string | null;
  formas_participacao: string | null;
  requisitos: string | null;
  inicio: string | null;
  fim: string | null;
  local: string | null;
  publico: Publico;
  vagas: number | null;
  inscricao_ate: string | null;
  lista_espera: boolean;
  requer_confirmacao: boolean;
  pauta: string | null;
  materiais: string | null;
  ata: string | null;
  ata_aprovada: boolean;
  encaminhamentos: { acao: string; responsavel?: string; prazo?: string; status?: string }[];
  status: 'rascunho' | 'publicado' | 'encerrado' | 'cancelado';
  created_at: string;
}

export interface Devolutiva {
  id: string;
  organization_id: string;
  iniciativa_id: string | null;
  encontro_id: string | null;
  titulo: string;
  o_que_ouvimos: string | null;
  decisoes: string | null;
  acoes: { acao: string; prazo?: string; status?: string }[];
  limitacoes: string | null;
  publico: Publico;
  status: 'rascunho' | 'publicada';
  publicada_em: string | null;
}

export const TIPOS_INICIATIVA: Record<TipoIniciativa, { label: string; descricao: string; icon: LucideIcon; cor: string }> = {
  pesquisa: { label: 'Pesquisa de satisfação', descricao: 'Avaliar serviços e práticas da escola', icon: ClipboardList, cor: '#1D4ED8' },
  enquete: { label: 'Enquete', descricao: 'Preferência sobre uma questão objetiva', icon: Vote, cor: '#7A2E8E' },
  consulta: { label: 'Consulta à comunidade', descricao: 'Ouvir antes de mudanças ou projetos', icon: MessagesSquare, cor: '#0E7490' },
  avaliacao_evento: { label: 'Avaliação de evento', descricao: 'Opinião depois de um evento', icon: PartyPopper, cor: '#B54708' },
  necessidades: { label: 'Necessidades da escola', descricao: 'Prioridades percebidas pela comunidade', icon: ListChecks, cor: '#067647' },
};

export const TIPOS_ENCONTRO: Record<Encontro['tipo'], string> = {
  reuniao: 'Reunião de famílias',
  palestra: 'Palestra',
  oficina: 'Oficina',
  encontro: 'Encontro temático',
  projeto: 'Projeto',
  assembleia: 'Assembleia',
  conselho: 'Conselho escolar',
};

export const UNIDADE: Record<Iniciativa['unidade_resposta'], string> = {
  responsavel: 'Cada responsável responde por si.',
  familia: 'Uma resposta por família: vale para todos os filhos. Se outro responsável já respondeu, a família já participou.',
  estudante: 'Uma resposta por estudante: quem tem mais de um filho responde para cada um.',
};

export const PRIVACIDADE: Record<Iniciativa['privacidade'], { label: string; texto: string }> = {
  identificada: { label: 'Identificada', texto: 'A gestão pode ver quem respondeu.' },
  confidencial: { label: 'Confidencial', texto: 'A gestão vê só resultados agrupados, sem saber quem respondeu o quê.' },
  anonima: { label: 'Anônima', texto: 'Nenhuma identificação é guardada junto com a resposta.' },
};

export const POLITICA: Record<Iniciativa['politica_resultado'], string> = {
  imediato: 'Resultado visível para quem participou a qualquer momento',
  apos_encerrar: 'Resultado divulgado depois do encerramento',
  somente_gestao: 'Resultado só para a gestão (divulgado por devolutiva)',
};

export const STATUS_SUGESTAO: Record<string, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'accent' }> = {
  recebida: { label: 'Recebida', tone: 'neutral' },
  em_analise: { label: 'Em análise', tone: 'info' },
  aguardando_esclarecimento: { label: 'Aguardando esclarecimento', tone: 'warning' },
  planejada: { label: 'Planejada', tone: 'accent' },
  implementada: { label: 'Implementada', tone: 'success' },
  encerrada: { label: 'Encerrada', tone: 'neutral' },
};

export const aberta = (i: Iniciativa) =>
  i.status === 'publicada' && (!i.abre_em || new Date(i.abre_em) <= new Date()) && (!i.fecha_em || new Date(i.fecha_em) > new Date());

/* ---------------------------------------------------------------- */
/* Formulário de resposta (portal e prévia do gestor)                */
/* ---------------------------------------------------------------- */

export function FormularioPerguntas({
  perguntas,
  valores,
  onChange,
  somenteLeitura,
}: {
  perguntas: Pergunta[];
  valores: Record<string, any>;
  onChange: (id: string, v: any) => void;
  somenteLeitura?: boolean;
}) {
  return (
    <div className="space-y-6">
      {perguntas.map((q, idx) => {
        const id = q.id || String(idx);
        const v = valores[id];
        const lista: string[] = Array.isArray(v) ? v : [];
        return (
          <fieldset key={id} disabled={somenteLeitura} className="space-y-2.5">
            <legend className="text-[15px] font-semibold text-[var(--text-heading)]">
              {idx + 1}. {q.enunciado}
              {q.obrigatoria && <span className="ml-1 text-[#B42318]">*</span>}
            </legend>
            {q.tipo === 'unica' && (
              <div className="flex flex-col gap-1.5">
                {q.opcoes.map((o) => (
                  <label key={o} className={cx('flex cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-[14px]', v === o ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)]')}>
                    <input type="radio" name={id} checked={v === o} onChange={() => onChange(id, o)} className="accent-[var(--accent)]" />
                    {o}
                  </label>
                ))}
              </div>
            )}
            {q.tipo === 'multipla' && (
              <div className="flex flex-col gap-1.5">
                {q.max_escolhas && <p className="text-[12px] text-[var(--text-muted)]">Escolha até {q.max_escolhas}.</p>}
                {q.opcoes.map((o) => {
                  const marcado = lista.includes(o);
                  return (
                    <label key={o} className={cx('flex cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-[14px]', marcado ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)]')}>
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => {
                          if (marcado) onChange(id, lista.filter((x) => x !== o));
                          else if (!q.max_escolhas || lista.length < q.max_escolhas) onChange(id, [...lista, o]);
                        }}
                        className="accent-[var(--accent)]"
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            )}
            {q.tipo === 'escala' && (
              <div>
                <div className="flex flex-wrap gap-2">
                  {q.opcoes.map((rotulo, i) => {
                    const valor = String(i + 1);
                    return (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => onChange(id, valor)}
                        aria-pressed={v === valor}
                        className={cx(
                          'flex min-w-[90px] flex-1 flex-col items-center rounded-2xl border px-2 py-2.5 text-center transition-colors',
                          v === valor ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--bg-card-alt)]',
                        )}
                      >
                        <span className="text-[18px] font-semibold tabular-nums">{valor}</span>
                        <span className="text-[12px] leading-tight">{rotulo}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {q.tipo === 'prioridades' && (
              <div className="space-y-2">
                <p className="text-[12px] text-[var(--text-muted)]">Toque na ordem de prioridade{q.max_escolhas ? ` (até ${q.max_escolhas})` : ''}. Toque de novo para tirar.</p>
                <div className="flex flex-wrap gap-1.5">
                  {q.opcoes.map((o) => {
                    const pos = lista.indexOf(o);
                    return (
                      <Chip
                        key={o}
                        active={pos >= 0}
                        onClick={() => {
                          if (pos >= 0) onChange(id, lista.filter((x) => x !== o));
                          else if (!q.max_escolhas || lista.length < q.max_escolhas) onChange(id, [...lista, o]);
                        }}
                      >
                        {pos >= 0 ? `${pos + 1}º · ` : ''}
                        {o}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            )}
            {q.tipo === 'texto' && (
              <textarea
                rows={3}
                maxLength={2000}
                value={typeof v === 'string' ? v : ''}
                onChange={(e) => onChange(id, e.target.value)}
                aria-label={q.enunciado}
                className="block w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-[14px] outline-none focus:border-[var(--accent)]"
              />
            )}
          </fieldset>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Resultados                                                        */
/* ---------------------------------------------------------------- */

export function Resultados({ dados, recorte, onRecorte, gestor }: { dados: any; recorte?: string; onRecorte?: (r: string) => void; gestor?: boolean }) {
  if (!dados) return null;
  if (dados.protegido)
    return (
      <InfoBox tone="warning">
        {dados.aviso} Hoje: {dados.total_respostas} resposta(s).
      </InfoBox>
    );
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-[var(--bg-card-alt)] p-3">
          <p className="text-[12px] text-[var(--text-muted)]">Respostas</p>
          <p className="text-[22px] font-semibold tabular-nums text-[var(--text-heading)]">{dados.total_respostas}</p>
        </div>
        {dados.total_elegivel != null && (
          <div className="rounded-2xl bg-[var(--bg-card-alt)] p-3">
            <p className="text-[12px] text-[var(--text-muted)]">Público elegível</p>
            <p className="text-[22px] font-semibold tabular-nums text-[var(--text-heading)]">{dados.total_elegivel}</p>
          </div>
        )}
        {dados.taxa != null && (
          <div className="rounded-2xl bg-[var(--bg-card-alt)] p-3">
            <p className="text-[12px] text-[var(--text-muted)]">Participação</p>
            <p className="text-[22px] font-semibold tabular-nums text-[var(--text-heading)]">{dados.taxa}%</p>
          </div>
        )}
      </div>
      <InfoBox>{dados.aviso}</InfoBox>
      {gestor && onRecorte && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] text-[var(--text-muted)]">Ver por:</span>
          {[
            ['unidade', 'Unidade'],
            ['turno', 'Turno'],
            ['turma', 'Turma'],
          ].map(([k, l]) => (
            <Chip key={k} small active={recorte === k} onClick={() => onRecorte(k)}>
              {l}
            </Chip>
          ))}
          {dados.recorte !== recorte && <Pill tone="warning">Recorte indisponível nesta privacidade</Pill>}
        </div>
      )}
      {(dados.perguntas || []).map((p: any, i: number) => (
        <ResultadoPergunta key={p.id} p={p} n={i + 1} />
      ))}
      <p className="text-[12px] text-[var(--text-muted)]">Grupos com menos de {dados.minimo} respostas são agrupados em “Outros” para ninguém ser identificado.</p>
    </div>
  );
}

function ResultadoPergunta({ p, n }: { p: any; n: number }) {
  const grupos = useMemo(() => {
    const m = new Map<string, { opcao: string; n: number; pontos?: number }[]>();
    for (const d of p.distribuicao || []) m.set(d.grupo, [...(m.get(d.grupo) || []), d]);
    return Array.from(m.entries());
  }, [p]);
  const rotulo = (opcao: string) => (p.tipo === 'escala' && /^\d+$/.test(opcao) ? `${opcao} · ${p.opcoes?.[Number(opcao) - 1] || ''}` : opcao);

  return (
    <div className="rounded-[20px] border border-[var(--border)] p-4">
      <p className="text-[14px] font-semibold text-[var(--text-heading)]">
        {n}. {p.enunciado}
      </p>
      {p.media != null && <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">Média {p.media}</p>}
      <div className="mt-3 space-y-4">
        {grupos.map(([g, itens]) => {
          const total = itens.reduce((s, x) => s + (p.tipo === 'prioridades' ? x.pontos || 0 : x.n), 0) || 1;
          const ordenados = [...itens].sort((a, b) => (p.tipo === 'escala' ? Number(a.opcao) - Number(b.opcao) : (b.pontos ?? b.n) - (a.pontos ?? a.n)));
          return (
            <div key={g}>
              {grupos.length > 1 && <p className="mb-1.5 text-[12px] font-semibold text-[var(--text-muted)]">{g}</p>}
              <ul className="space-y-1.5">
                {ordenados.map((x) => {
                  const valor = p.tipo === 'prioridades' ? x.pontos || 0 : x.n;
                  const pct = Math.round((100 * valor) / total);
                  return (
                    <li key={x.opcao} className="text-[13px]">
                      <div className="mb-0.5 flex justify-between gap-2">
                        <span className="text-[var(--text-body)]">{rotulo(x.opcao)}</span>
                        <span className="tabular-nums text-[var(--text-muted)]">
                          {p.tipo === 'prioridades' ? `${valor} pts` : `${x.n} (${pct}%)`}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-card-alt)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      {p.comentarios?.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[13px] font-semibold text-[var(--accent)]">
            Ver {p.comentarios.length} comentário(s) (sem identificação)
          </summary>
          <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
            {p.comentarios.map((c: string, i: number) => (
              <li key={i} className="rounded-xl bg-[var(--bg-card-alt)] px-3 py-2 text-[13px] text-[var(--text-body)]">
                {c}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export const IconeResultados = BarChart3;
export const IconeSugestao = Lightbulb;
