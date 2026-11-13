import type React from 'react';
import { CalendarCheck, CalendarClock, ChevronRight, HandHeart, NotebookPen, Users } from 'lucide-react';
import { cx } from '../ui/kit';
import { fmtData, fmtDataHora, rpc, useCarregar, useRealtime } from '../../services/escolaEscuta/api';
import { CATEGORIAS, type Categoria } from './AgendaDiariaDocente';
import { ABA_FAMILIA } from './navegacao';

/*
 * Painel da Família: o que a família precisa lembrar, num só lugar.
 * Tudo vem dos MESMOS registros dos módulos (nada duplicado).
 */

interface Painel {
  atendimentos: { id: string; assunto: string; inicio: string; status: string; estudante: string | null; setor: string | null; expira_em: string | null }[];
  participa: { id: string; titulo: string; tipo: string; fecha_em: string | null; tempo_estimado_min: number | null }[];
  encontros: { id: string; titulo: string; tipo: string; inicio: string | null; local: string | null; inscricao_ate: string | null; minha_inscricao: string | null }[];
  diario: {
    id: string;
    titulo: string;
    categoria: Categoria;
    prioridade: string;
    estudante: string | null;
    autor: string | null;
    publicado_em: string;
    prazo: string | null;
    pendente: boolean;
  }[];
}

const VAZIO: Painel = { atendimentos: [], participa: [], encontros: [], diario: [] };

function usePainelFamilia() {
  const dados = useCarregar<Painel>(async () => {
    const r = await rpc<Painel>('ee_painel_familia');
    return { data: { ...VAZIO, ...(r.data || {}) }, error: r.error };
  }, [], VAZIO);
  useRealtime(['agenda_agendamentos', 'participa_iniciativas', 'participa_encontros', 'participa_inscricoes', 'diario_registros', 'diario_respostas'], () =>
    dados.recarregar(true),
  );
  return dados;
}

const STATUS_ATEND: Record<string, { label: string; cor: string }> = {
  aguardando: { label: 'Aguardando confirmação', cor: '#B54708' },
  confirmado: { label: 'Confirmado', cor: '#067647' },
  proposta: { label: 'Nova data proposta', cor: '#175CD3' },
};

const INSCRICAO: Record<string, string> = {
  confirmada: 'Inscrito',
  pendente: 'Inscrição em análise',
  espera: 'Lista de espera',
  cancelada: 'Inscrição cancelada',
  recusada: 'Inscrição não aceita',
};

const diasAte = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

function Bloco({ icon: Icon, titulo, acao, onAcao, children }: { icon: typeof Users; titulo: string; acao: string; onAcao: () => void; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-heading)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
            <Icon className="h-4 w-4" />
          </span>
          {titulo}
        </h3>
        <button type="button" onClick={onAcao} className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[var(--accent)] hover:underline">
          {acao} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="flex-1 space-y-2">{children}</div>
    </section>
  );
}

function Linha({ onClick, titulo, detalhe, selo, seloCor }: { onClick: () => void; titulo: string; detalhe?: string | null; selo?: string; seloCor?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-card-alt)]"
    >
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-medium text-[var(--text-heading)]">{titulo}</span>
        {detalhe && <span className="block truncate text-[12px] text-[var(--text-muted)]">{detalhe}</span>}
      </span>
      {selo && (
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: seloCor || 'var(--text-body)', background: 'var(--bg-card-alt)' }}>
          {selo}
        </span>
      )}
    </button>
  );
}

const Vazio = ({ texto }: { texto: string }) => <p className="px-3 py-2 text-[13px] text-[var(--text-muted)]">{texto}</p>;

/** Início da família: atendimentos, participações abertas, prazos e pendências da Agenda Diária */
export function PainelFamilia({ onIr }: { onIr: (aba: number) => void }) {
  const dados = usePainelFamilia();
  const p = dados.data;
  if (dados.loading && !p.diario.length && !p.atendimentos.length) return null;
  if (dados.error) return null; // o painel é complementar: não atrapalha o início se falhar

  const pendentes = p.diario.filter((d) => d.pendente);
  const prazos = [
    ...p.participa.filter((i) => i.fecha_em && diasAte(i.fecha_em) <= 7).map((i) => ({ titulo: i.titulo, quando: i.fecha_em as string, aba: ABA_FAMILIA.participa })),
    ...p.encontros
      .filter((e) => e.inscricao_ate && diasAte(e.inscricao_ate) <= 7 && !e.minha_inscricao)
      .map((e) => ({ titulo: `Inscrição: ${e.titulo}`, quando: e.inscricao_ate as string, aba: ABA_FAMILIA.participa })),
  ].sort((a, b) => a.quando.localeCompare(b.quando));

  return (
    <div className="mb-6 space-y-3">
      {(pendentes.length > 0 || prazos.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-[#FEDF89] bg-[#FFFAEB] px-4 py-3 text-[13px] text-[#93370D]">
          <CalendarClock className="h-4 w-4 shrink-0" />
          {pendentes.length > 0 && (
            <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => onIr(ABA_FAMILIA.diario)}>
              {pendentes.length} {pendentes.length === 1 ? 'registro pede' : 'registros pedem'} sua ciência ou resposta
            </button>
          )}
          {pendentes.length > 0 && prazos.length > 0 && <span aria-hidden>·</span>}
          {prazos.slice(0, 2).map((x, i) => (
            <button key={i} type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => onIr(x.aba)}>
              {x.titulo} até {fmtData(x.quando)}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <Bloco icon={CalendarCheck} titulo="Meus atendimentos" acao="Agendar" onAcao={() => onIr(ABA_FAMILIA.agenda)}>
          {p.atendimentos.length === 0 ? (
            <Vazio texto="Nenhum atendimento marcado." />
          ) : (
            p.atendimentos.map((a) => (
              <Linha
                key={a.id}
                onClick={() => onIr(ABA_FAMILIA.agenda)}
                titulo={`${a.setor ? `${a.setor} · ` : ''}${a.assunto}`}
                detalhe={`${fmtDataHora(a.inicio)}${a.estudante ? ` · ${a.estudante}` : ''}`}
                selo={STATUS_ATEND[a.status]?.label}
                seloCor={STATUS_ATEND[a.status]?.cor}
              />
            ))
          )}
        </Bloco>

        <Bloco icon={HandHeart} titulo="Participe" acao="Ver tudo" onAcao={() => onIr(ABA_FAMILIA.participa)}>
          {p.participa.length === 0 && p.encontros.length === 0 ? (
            <Vazio texto="Nada aberto para participar agora." />
          ) : (
            <>
              {p.participa.map((i) => (
                <Linha
                  key={i.id}
                  onClick={() => onIr(ABA_FAMILIA.participa)}
                  titulo={i.titulo}
                  detalhe={`${i.tempo_estimado_min ? `~${i.tempo_estimado_min} min` : 'Rápido'}${i.fecha_em ? ` · até ${fmtData(i.fecha_em)}` : ''}`}
                  selo="Responder"
                  seloCor="#175CD3"
                />
              ))}
              {p.encontros.map((e) => (
                <Linha
                  key={e.id}
                  onClick={() => onIr(ABA_FAMILIA.participa)}
                  titulo={e.titulo}
                  detalhe={[e.inicio ? fmtDataHora(e.inicio) : null, e.local].filter(Boolean).join(' · ')}
                  selo={e.minha_inscricao ? INSCRICAO[e.minha_inscricao] : 'Inscrever-se'}
                  seloCor={e.minha_inscricao === 'confirmada' ? '#067647' : '#175CD3'}
                />
              ))}
            </>
          )}
        </Bloco>

        <Bloco icon={NotebookPen} titulo="Agenda Diária" acao="Abrir" onAcao={() => onIr(ABA_FAMILIA.diario)}>
          {p.diario.length === 0 ? (
            <Vazio texto="Nenhum registro recente dos professores." />
          ) : (
            p.diario.slice(0, 4).map((d) => (
              <Linha
                key={d.id}
                onClick={() => onIr(ABA_FAMILIA.diario)}
                titulo={d.titulo}
                detalhe={`${CATEGORIAS[d.categoria]?.label || d.categoria}${d.estudante ? ` · ${d.estudante}` : ''} · ${fmtData(d.publicado_em)}`}
                selo={d.pendente ? 'Responder' : undefined}
                seloCor="#B54708"
              />
            ))
          )}
        </Bloco>
      </div>
    </div>
  );
}

/**
 * Dentro de "Recados" (Comunicação da família): os registros da Agenda Diária
 * aparecem aqui também — é o MESMO registro, abrir leva para a Agenda Diária.
 */
export function DiarioNosRecados({ onIr }: { onIr: (aba: number) => void }) {
  const dados = usePainelFamilia();
  const lista = dados.data.diario;
  if (dados.error || lista.length === 0) return null;
  return (
    <section className="mb-6 rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] p-4" aria-labelledby="diario-recados">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 id="diario-recados" className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-heading)]">
          <NotebookPen className="h-4 w-4 text-[var(--accent)]" /> Da Agenda Diária (professores)
        </h3>
        <button type="button" onClick={() => onIr(ABA_FAMILIA.diario)} className="text-[12px] font-semibold text-[var(--accent)] hover:underline">
          Abrir a Agenda Diária
        </button>
      </header>
      <ul className="divide-y divide-[var(--border)]">
        {lista.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => onIr(ABA_FAMILIA.diario)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left">
              <span className="min-w-0">
                <span className={cx('block truncate text-[14px] text-[var(--text-heading)]', d.pendente && 'font-semibold')}>{d.titulo}</span>
                <span className="block truncate text-[12px] text-[var(--text-muted)]">
                  {CATEGORIAS[d.categoria]?.label || d.categoria}
                  {d.autor ? ` · ${d.autor}` : ''}
                  {d.estudante ? ` · ${d.estudante}` : ''} · {fmtData(d.publicado_em)}
                </span>
              </span>
              {d.pendente && <span className="shrink-0 rounded-full bg-[#FFFAEB] px-2 py-0.5 text-[11px] font-semibold text-[#B54708]">Responder</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
