import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarCheck, HandHeart, Megaphone, NotebookPen, School, type LucideIcon } from 'lucide-react';
import { Carregando, ErroBox, InfoBox } from './ui';
import { useEscolasDoGestor } from './useEscola';
import { cx } from '../ui/kit';
import { MuralGestor } from './MuralGestor';
import { MuralDestaque, MuralPortal, useMuralNaoLidos } from './MuralPortal';
import { AgendaFamiliaGestor } from './AgendaFamiliaGestor';
import { AgendaFamiliaPortal } from './AgendaFamiliaPortal';
import { AgendaDiariaDocente } from './AgendaDiariaDocente';
import { AgendaDiariaFamilia } from './AgendaDiariaFamilia';
import { ParticipaGestor } from './ParticipaGestor';
import { ParticipaPortal } from './ParticipaPortal';
import { AvisosSino } from './AvisosSino';

/* =====================================================================
 * Escola Escuta — um componente por portal, com os 4 módulos em abas.
 *
 *   <EscolaEscuta portal="gestor" />     no painel da gestão
 *   <EscolaEscuta portal="docente" />    no ProfessorDashboard
 *   <EscolaEscuta portal="familia" />    no FamilyDashboard
 *
 * <EscolaEscutaAtalhos portal="..." onAbrir={...} /> mostra os cartões
 * dos módulos para a página inicial de cada portal.
 * ===================================================================== */

export type Portal = 'gestor' | 'docente' | 'familia';
export type Modulo = 'mural' | 'agenda' | 'diario' | 'participa';

const MODULOS: Record<Modulo, { label: string; icon: LucideIcon; descricao: Record<Portal, string> }> = {
  mural: {
    label: 'Mural de Recados',
    icon: Megaphone,
    descricao: {
      gestor: 'Publique avisos, eventos e conquistas para famílias e docentes.',
      docente: 'Avisos da gestão para a equipe e a comunidade.',
      familia: 'Avisos, eventos e novidades da escola.',
    },
  },
  agenda: {
    label: 'Agenda Família',
    icon: CalendarCheck,
    descricao: {
      gestor: 'Horários de atendimento, solicitações e registros com as famílias.',
      docente: '',
      familia: 'Agende uma conversa com a secretaria, a coordenação ou a direção.',
    },
  },
  diario: {
    label: 'Agenda Diária',
    icon: NotebookPen,
    descricao: {
      gestor: 'Revise e aprove registros dos docentes antes de irem às famílias.',
      docente: 'Recados, atividades e orientações da rotina para as famílias.',
      familia: 'Recados e atividades dos professores, com ciência e resposta.',
    },
  },
  participa: {
    label: 'Participa',
    icon: HandHeart,
    descricao: {
      gestor: 'Pesquisas, sugestões, inscrições, assembleias e devolutivas.',
      docente: 'Responda pesquisas, envie sugestões e participe de encontros.',
      familia: 'Responda pesquisas, envie sugestões e participe de encontros.',
    },
  },
};

const DO_PORTAL: Record<Portal, Modulo[]> = {
  gestor: ['mural', 'agenda', 'diario', 'participa'],
  docente: ['mural', 'diario', 'participa'],
  familia: ['mural', 'agenda', 'diario', 'participa'],
};

export function EscolaEscuta({
  portal,
  moduloInicial,
  onVoltar,
  organizationId,
  embutido,
  recadoInicialId,
  onModulo,
}: {
  portal: Portal;
  moduloInicial?: Modulo;
  /** abre direto este recado do Mural */
  recadoInicialId?: string | null;
  /** mostra o botão "Voltar ao início" */
  onVoltar?: () => void;
  organizationId?: string;
  /** dentro de uma página que já tem margem (ex.: ProfessorDashboard) */
  embutido?: boolean;
  /** avisa quando a pessoa troca de módulo (o menu/URL acompanham) */
  onModulo?: (m: Modulo) => void;
}) {
  const modulos = DO_PORTAL[portal];
  const [modulo, setModulo] = useState<Modulo>(moduloInicial && modulos.includes(moduloInicial) ? moduloInicial : modulos[0]);
  const [recadoId, setRecadoId] = useState<string | null>(recadoInicialId || null);
  const leitor = portal === 'gestor' ? null : portal;
  const novidades = useMuralNaoLidos(leitor || 'familia', organizationId);

  const abrir = (m: Modulo, ref?: string | null) => {
    if (!modulos.includes(m)) return;
    setRecadoId(m === 'mural' ? ref || null : null);
    setModulo(m);
    onModulo?.(m);
  };

  // o menu lateral trocou de módulo
  useEffect(() => {
    if (moduloInicial && modulos.includes(moduloInicial)) setModulo(moduloInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduloInicial]);
  useEffect(() => {
    if (recadoInicialId) setRecadoId(recadoInicialId);
  }, [recadoInicialId]);

  return (
    <div className={embutido ? 'space-y-5' : 'mx-auto w-full max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8'}>
      {/* barra dos módulos */}
      <div className="flex flex-wrap items-center gap-3">
        {onVoltar && (
          <button
            type="button"
            onClick={onVoltar}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3.5 text-[13px] font-semibold text-[var(--text-body)] hover:bg-[var(--bg-card-alt)]"
          >
            <ArrowLeft className="h-4 w-4" /> Início
          </button>
        )}
        <nav aria-label="Escola Escuta" className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-[22px] bg-[var(--bg-card-alt)] p-1">
          {modulos.map((m) => {
            const Icon = MODULOS[m].icon;
            const ativo = m === modulo;
            const badge = m === 'mural' && leitor ? novidades : 0;
            return (
              <button
                key={m}
                type="button"
                onClick={() => abrir(m)}
                aria-current={ativo ? 'page' : undefined}
                className={cx(
                  'flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors',
                  ativo ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm' : 'text-[var(--text-body)] hover:bg-[var(--bg-card)]',
                )}
              >
                <Icon className="h-4 w-4" />
                {MODULOS[m].label}
                {badge > 0 && <span className="min-w-[20px] rounded-full bg-[#D92D20] px-1.5 text-center text-[11px] leading-5 text-white">{badge}</span>}
              </button>
            );
          })}
        </nav>
        <AvisosSino onAbrir={(m, ref) => abrir(m as Modulo, ref)} />
      </div>

      {/* destaque de 5 s de recados novos (fora do próprio mural) */}
      {leitor && modulo !== 'mural' && <MuralDestaque portal={leitor} organizationId={organizationId} onAbrir={(id) => abrir('mural', id)} />}

      {portal === 'gestor' && <AreaGestor modulo={modulo} organizationId={organizationId} />}

      {portal === 'docente' && modulo === 'mural' && <MuralPortal portal="docente" organizationId={organizationId} recadoInicialId={recadoId} />}
      {portal === 'docente' && modulo === 'diario' && <AgendaDiariaDocente organizationId={organizationId} />}
      {portal === 'docente' && modulo === 'participa' && <ParticipaPortal portal="docente" organizationId={organizationId} />}

      {portal === 'familia' && modulo === 'mural' && <MuralPortal portal="familia" organizationId={organizationId} recadoInicialId={recadoId} />}
      {portal === 'familia' && modulo === 'agenda' && <AgendaFamiliaPortal organizationId={organizationId} />}
      {portal === 'familia' && modulo === 'diario' && <AgendaDiariaFamilia organizationId={organizationId} />}
      {portal === 'familia' && modulo === 'participa' && <ParticipaPortal portal="familia" organizationId={organizationId} />}
    </div>
  );
}

/**
 * Gestão: escolhe a escola (o administrador não tem escola própria e pode
 * abrir qualquer uma) e mostra o módulo dela.
 */
function AreaGestor({ modulo, organizationId }: { modulo: Modulo; organizationId?: string }) {
  const { lista, atual, escolher, carregando, erro } = useEscolasDoGestor(organizationId);

  if (!atual) {
    if (carregando) return <Carregando linhas={2} />;
    if (erro) return <ErroBox error={erro} />;
    return (
      <InfoBox tone="warning" icon={School}>
        Nenhuma escola disponível para este usuário. Cadastre uma escola ou vincule o usuário a uma escola para usar a Escola Escuta.
      </InfoBox>
    );
  }

  return (
    <div className="space-y-5">
      {!organizationId && lista.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
            <School className="h-4 w-4" />
          </span>
          <label htmlFor="ee-escola" className="text-[13px] font-semibold text-[var(--text-heading)]">
            Escola
          </label>
          <select
            id="ee-escola"
            value={atual}
            onChange={(e) => escolher(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 text-[14px] text-[var(--text-body)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] sm:max-w-sm"
          >
            {lista.map((e) => (
              <option key={e.organization_id} value={e.organization_id}>
                {e.nome}
              </option>
            ))}
          </select>
          <span className="text-[12px] text-[var(--text-muted)]">{lista.length} escolas</span>
        </div>
      )}

      {/* key: troca de escola recarrega o módulo do zero */}
      <div key={atual}>
        {modulo === 'mural' && <MuralGestor organizationId={atual} />}
        {modulo === 'agenda' && <AgendaFamiliaGestor organizationId={atual} />}
        {modulo === 'diario' && <AgendaDiariaDocente modo="gestor" organizationId={atual} />}
        {modulo === 'participa' && <ParticipaGestor organizationId={atual} />}
      </div>
    </div>
  );
}

/** Cartões dos módulos para a página inicial de cada portal. */
export function EscolaEscutaAtalhos({ portal, onAbrir }: { portal: Portal; onAbrir: (m: Modulo) => void }) {
  const leitor = portal === 'gestor' ? null : portal;
  const novidades = useMuralNaoLidos(leitor || 'familia');
  return (
    <section aria-labelledby="ee-titulo">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="ee-titulo" className="font-serif text-[20px] font-semibold text-[var(--text-heading)]">
            Escola Escuta
          </h2>
          <p className="text-[13px] text-[var(--text-muted)]">Comunicação, atendimento e participação da comunidade.</p>
        </div>
      </div>
      <div className={cx('grid gap-3 sm:grid-cols-2', DO_PORTAL[portal].length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3')}>
        {DO_PORTAL[portal].map((m) => {
          const Icon = MODULOS[m].icon;
          const badge = m === 'mural' && leitor ? novidades : 0;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onAbrir(m)}
              className="group flex h-full flex-col rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[var(--accent)]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon className="h-5 w-5" />
                </span>
                {badge > 0 && <span className="rounded-full bg-[#D92D20] px-2 py-0.5 text-[11px] font-semibold text-white">{badge} novo(s)</span>}
              </div>
              <p className="mt-3 text-[15px] font-semibold text-[var(--text-heading)]">{MODULOS[m].label}</p>
              <p className="mt-0.5 flex-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{MODULOS[m].descricao[portal]}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--accent)]">
                Abrir <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
