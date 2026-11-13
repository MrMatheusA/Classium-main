import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BellRing, CheckCircle2, Megaphone, Paperclip, Pin, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePlatform } from '../../context/PlatformContext';
import { useOrgAtual } from './useEscola';
import { cx, EASE } from '../ui/kit';
import { fmtData, fmtRelativo, mensagemErro, rpc, useCarregar, useMinhasEscolas, useRealtime, type Escola } from '../../services/escolaEscuta/api';
import { AnexoImagem, Busca, Carregando, Chip, Drawer, EmptyState, ErroBox, InfoBox, Pill, SeletorEscola, btn, useToast, type AnexoInfo } from './ui';
import { RecadoCompleto, TIPOS_MURAL, tipoMural, type Recado } from './MuralGestor';

/* =====================================================================
 * Mural de Recados — Portal Família e Portal Docente (só leitura)
 * ===================================================================== */

interface Leitura {
  recado_id: string;
  versao: number | null;
  destaque_em: string | null;
  visualizado_em: string | null;
  ciencia_em: string | null;
  ciencia_versao: number | null;
}

type RecadoLido = Recado & { leitura?: Leitura; anexos_count: number };

function useMural(org: string | null) {
  const dados = useCarregar<RecadoLido[]>(
    async () => {
      if (!org) return { data: [] };
      const [rec, lei] = await Promise.all([
        supabase
          .from('mural_recados')
          .select('*, mural_anexos(count)')
          .eq('organization_id', org)
          .in('status', ['publicado', 'programado', 'encerrado'])
          .order('fixado', { ascending: false })
          .order('publicado_em', { ascending: false })
          .limit(200),
        supabase.from('mural_leituras').select('*'),
      ]);
      if (rec.error) return { error: mensagemErro(rec.error) };
      const leituras = new Map<string, Leitura>(((lei.data as Leitura[]) || []).map((l) => [l.recado_id, l]));
      return {
        data: ((rec.data as any[]) || []).map((r) => ({ ...r, leitura: leituras.get(r.id), anexos_count: r.mural_anexos?.[0]?.count || 0 })),
      };
    },
    [org],
    [],
  );
  useRealtime(['mural_recados', 'mural_leituras'], () => dados.recarregar(true), !!org);
  return dados;
}

const ativo = (r: Recado) => r.status !== 'encerrado' && (!r.fim_em || new Date(r.fim_em) > new Date());
const naoLido = (r: RecadoLido) => !r.leitura?.visualizado_em || (r.leitura.versao ?? 0) < r.versao;
const pedeCiencia = (r: RecadoLido) => r.exige_ciencia && !r.leitura?.ciencia_em;

function useOrgDoPortal(portal: 'familia' | 'docente', organizationId?: string) {
  const { schoolInfo } = usePlatform() as any;
  const daPlataforma = useOrgAtual();
  const escolas = useMinhasEscolas();
  const [org, setOrg] = useState<string | null>(organizationId || null);
  useEffect(() => {
    if (organizationId) return setOrg(organizationId);
    if (org) return;
    // administrador visualizando o portal: cai para as escolas que ele gerencia
    const doPapel = escolas.data.find((e) => (portal === 'familia' ? e.papel === 'familia' : e.papel !== 'familia')) || escolas.data[0];
    const escolhido = portal === 'docente' ? daPlataforma || doPapel?.organization_id : doPapel?.organization_id || daPlataforma;
    if (escolhido) setOrg(escolhido);
  }, [organizationId, escolas.data, portal, daPlataforma, org]);
  const filtradas: Escola[] = escolas.data.filter((e) => (portal === 'familia' ? e.papel === 'familia' : e.papel !== 'familia'));
  const escolasDoPortal: Escola[] = filtradas.length > 0 ? filtradas : escolas.data;
  return { org, setOrg, escolas: escolasDoPortal, nomeEscola: escolas.data.find((e) => e.organization_id === org)?.nome || schoolInfo?.name || 'Escola' };
}

/* ------------------------------------------------------------------ */

export function MuralPortal({
  portal,
  organizationId,
  recadoInicialId,
}: {
  portal: 'familia' | 'docente';
  organizationId?: string;
  /** abre direto este recado (vindo do destaque da página inicial) */
  recadoInicialId?: string | null;
}) {
  const { org, setOrg, escolas, nomeEscola } = useOrgDoPortal(portal, organizationId);
  const mural = useMural(org);
  const toast = useToast();
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState<string | null>(null);
  const [soPendentes, setSoPendentes] = useState(false);
  const [aberto, setAberto] = useState<string | null>(recadoInicialId || null);

  const cfg = useCarregar<any>(
    async () => {
      if (!org) return { data: null };
      const { data } = await supabase.from('mural_config').select('*').eq('organization_id', org).maybeSingle();
      return { data };
    },
    [org],
    null,
  );

  useEffect(() => {
    if (recadoInicialId) setAberto(recadoInicialId);
  }, [recadoInicialId]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return mural.data.filter(
      (r) => (!tipo || r.tipo === tipo) && (!soPendentes || naoLido(r) || pedeCiencia(r)) && (!q || `${r.titulo} ${r.resumo || ''} ${r.conteudo || ''}`.toLowerCase().includes(q)),
    );
  }, [mural.data, busca, tipo, soPendentes]);

  const fixados = filtrados.filter((r) => r.fixado && ativo(r));
  const recentes = filtrados.filter((r) => !r.fixado && ativo(r));
  const anteriores = filtrados.filter((r) => !ativo(r));
  const pendentes = mural.data.filter((r) => ativo(r) && (naoLido(r) || pedeCiencia(r))).length;
  const recadoAberto = mural.data.find((r) => r.id === aberto) || null;

  return (
    <div className="space-y-5 text-left">
      <SeletorEscola escolas={escolas} value={org} onChange={(id) => setOrg(id)} />

      {/* Cabeçalho institucional */}
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)]">
        {cfg.data?.banner_path && <AnexoImagem path={cfg.data.banner_path} alt="" className="h-32 w-full sm:h-44" />}
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
              <Megaphone className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[13px] font-medium text-[var(--text-muted)]">{nomeEscola}</p>
              <h1 className="font-serif text-[26px] font-semibold leading-tight text-[var(--text-heading)] sm:text-[28px]">{cfg.data?.titulo || 'Mural de Recados'}</h1>
              {cfg.data?.apresentacao && <p className="mt-1 max-w-2xl text-[14px] text-[var(--text-muted)]">{cfg.data.apresentacao}</p>}
            </div>
          </div>
          {pendentes > 0 && (
            <Pill tone="danger" className="self-start sm:self-auto">
              <BellRing className="h-3.5 w-3.5" /> {pendentes} {pendentes === 1 ? 'novidade' : 'novidades'}
            </Pill>
          )}
        </div>
      </section>

      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Busca value={busca} onChange={setBusca} placeholder="Buscar no mural" />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!tipo} onClick={() => setTipo(null)}>
            Todos
          </Chip>
          {TIPOS_MURAL.map((t) => (
            <Chip key={t.id} active={tipo === t.id} onClick={() => setTipo(tipo === t.id ? null : t.id)}>
              {t.label}
            </Chip>
          ))}
          <Chip active={soPendentes} onClick={() => setSoPendentes((v) => !v)}>
            Não lidos
          </Chip>
        </div>
      </div>

      {mural.error && <ErroBox error={mural.error} onRetry={() => mural.recarregar()} />}

      {mural.loading || !org ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Carregando linhas={1} altura="h-72" />
          <Carregando linhas={1} altura="h-72" />
          <Carregando linhas={1} altura="h-72" />
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState icon={Megaphone} title={mural.data.length ? 'Nada encontrado com esses filtros' : 'Nenhum recado por enquanto'} text="Quando a escola publicar um recado para você, ele aparece aqui." />
      ) : (
        <>
          {fixados.length > 0 && (
            <Secao titulo="Fixados pela escola" icone={<Pin className="h-4 w-4" />}>
              <div className="grid gap-4 lg:grid-cols-2">
                {fixados.map((r) => (
                  <CartaoRecado key={r.id} r={r} escola={nomeEscola} destaque onAbrir={() => setAberto(r.id)} />
                ))}
              </div>
            </Secao>
          )}
          {recentes.length > 0 && (
            <Secao titulo="Publicações recentes">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {recentes.map((r) => (
                  <CartaoRecado key={r.id} r={r} escola={nomeEscola} onAbrir={() => setAberto(r.id)} />
                ))}
              </div>
            </Secao>
          )}
          {anteriores.length > 0 && (
            <Secao titulo="Anteriores">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {anteriores.map((r) => (
                  <CartaoRecado key={r.id} r={r} escola={nomeEscola} onAbrir={() => setAberto(r.id)} />
                ))}
              </div>
            </Secao>
          )}
        </>
      )}

      {recadoAberto && (
        <LeituraRecado
          recado={recadoAberto}
          escola={nomeEscola}
          onClose={() => setAberto(null)}
          onCiencia={() => {
            toast.show('Ciência registrada.');
            mural.recarregar(true);
          }}
          onErro={(m) => toast.show(m, 'danger')}
          onLido={() => mural.recarregar(true)}
        />
      )}
      {toast.node}
    </div>
  );
}

function Secao({ titulo, icone, children }: { titulo: string; icone?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-semibold text-[var(--text-heading)]">
        {icone}
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function CartaoRecado({ r, escola, onAbrir, destaque }: { r: RecadoLido; escola: string; onAbrir: () => void; destaque?: boolean }) {
  const tipo = tipoMural(r.tipo);
  const novo = naoLido(r);
  return (
    <article
      className={cx(
        'group flex h-full flex-col overflow-hidden rounded-[24px] border bg-[var(--bg-card)] transition-[border-color,box-shadow] hover:shadow-[0_18px_40px_-28px_rgba(16,24,40,0.45)]',
        novo ? 'border-[var(--accent)]' : 'border-[var(--border)]',
      )}
    >
      {r.imagem_path ? (
        <AnexoImagem path={r.imagem_path} alt="" className={cx('w-full', destaque ? 'h-48' : 'h-40')} />
      ) : (
        <div className={cx('flex w-full items-center justify-center', destaque ? 'h-24' : 'h-20')} style={{ background: `${tipo.cor}12`, color: tipo.cor }}>
          <Megaphone className="h-7 w-7 opacity-80" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-semibold" style={{ color: tipo.cor }}>
            {tipo.label}
          </span>
          {novo && <Pill tone="accent">Novo</Pill>}
          {r.exige_ciencia &&
            (r.leitura?.ciencia_em ? (
              <Pill tone="success">
                <CheckCircle2 className="h-3 w-3" /> Ciência registrada
              </Pill>
            ) : (
              <Pill tone="warning">Pede ciência</Pill>
            ))}
        </div>
        <h3 className={cx('mt-1.5 font-semibold leading-snug text-[var(--text-heading)]', destaque ? 'text-[19px]' : 'text-[16px]')}>{r.titulo}</h3>
        {r.resumo && <p className="mt-1 line-clamp-3 text-[14px] leading-relaxed text-[var(--text-muted)]">{r.resumo}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="min-w-0 truncate text-[12px] text-[var(--text-muted)]">
            {escola} · {fmtData(r.publicado_em)}
            {r.anexos_count > 0 && (
              <span className="ml-1.5 inline-flex items-center gap-0.5">
                <Paperclip className="h-3 w-3" />
                {r.anexos_count}
              </span>
            )}
          </span>
          <button type="button" onClick={onAbrir} className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[var(--accent)] hover:underline">
            Ver recado completo <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function LeituraRecado({
  recado,
  escola,
  onClose,
  onCiencia,
  onErro,
  onLido,
}: {
  recado: RecadoLido;
  escola: string;
  onClose: () => void;
  onCiencia: () => void;
  onErro: (m: string) => void;
  onLido: () => void;
}) {
  const [anexos, setAnexos] = useState<AnexoInfo[]>([]);
  const [registrando, setRegistrando] = useState(false);
  const marcado = useRef(false);

  useEffect(() => {
    supabase
      .from('mural_anexos')
      .select('*')
      .eq('recado_id', recado.id)
      .order('created_at')
      .then(({ data }) => setAnexos((data as AnexoInfo[]) || []));
    if (!marcado.current) {
      marcado.current = true;
      rpc('mural_registrar', { p_recado: recado.id, p_acao: 'visualizou' }).then(onLido);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recado.id]);

  const ciencia = async () => {
    setRegistrando(true);
    const r = await rpc('mural_registrar', { p_recado: recado.id, p_acao: 'ciencia' });
    setRegistrando(false);
    if (r.error) onErro(r.error);
    else onCiencia();
  };

  const cienciaVelha = recado.leitura?.ciencia_em && (recado.leitura.ciencia_versao ?? 0) < recado.versao;

  return (
    <Drawer
      open
      onClose={onClose}
      title="Recado"
      subtitle={escola}
      width="max-w-3xl"
      footer={
        recado.exige_ciencia ? (
          recado.leitura?.ciencia_em && !cienciaVelha ? (
            <Pill tone="success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ciência registrada em {fmtData(recado.leitura.ciencia_em)}
            </Pill>
          ) : (
            <button type="button" className={btn.primary} onClick={ciencia} disabled={registrando}>
              <CheckCircle2 className="h-4 w-4" /> {cienciaVelha ? 'Registrar ciência da nova versão' : 'Registrar ciência'}
            </button>
          )
        ) : (
          <button type="button" className={btn.secondary} onClick={onClose}>
            Fechar
          </button>
        )
      }
    >
      <RecadoCompleto recado={recado} anexos={anexos} escola={escola} />
      {recado.exige_ciencia && (
        <div className="mt-5">
          <InfoBox>A escola pediu que você confirme a leitura. Registrar ciência confirma que você leu este recado.</InfoBox>
        </div>
      )}
    </Drawer>
  );
}

/* =====================================================================
 * Destaque de 5 segundos na página inicial (não bloqueia nada)
 *   <MuralDestaque portal="familia" onAbrir={(id) => navegar('/mural', id)} />
 * ===================================================================== */

export function MuralDestaque({
  portal,
  organizationId,
  onAbrir,
  duracaoMs = 5000,
}: {
  portal: 'familia' | 'docente';
  organizationId?: string;
  onAbrir: (recadoId: string | null) => void;
  duracaoMs?: number;
}) {
  const { org, nomeEscola } = useOrgDoPortal(portal, organizationId);
  const mural = useMural(org);
  const [visivel, setVisivel] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [restante, setRestante] = useState(duracaoMs);
  const mostrados = useRef<Set<string>>(new Set());

  // novidades: publicadas, no ar, e cujo destaque desta versão ainda não foi mostrado
  const novos = useMemo(
    () =>
      mural.data.filter(
        (r) =>
          ativo(r) &&
          r.status === 'publicado' &&
          (!r.leitura?.destaque_em || (r.leitura.versao ?? 0) < r.versao) &&
          !r.leitura?.visualizado_em &&
          !mostrados.current.has(`${r.id}:${r.versao}`),
      ),
    [mural.data],
  );

  useEffect(() => {
    if (!novos.length || visivel) return;
    novos.forEach((r) => {
      mostrados.current.add(`${r.id}:${r.versao}`);
      rpc('mural_registrar', { p_recado: r.id, p_acao: 'destaque' }); // uma vez por destinatário e versão
    });
    setRestante(duracaoMs);
    setVisivel(true);
  }, [novos, visivel, duracaoMs]);

  // contagem de 5 s que pausa enquanto a pessoa interage
  useEffect(() => {
    if (!visivel || pausado) return;
    const inicio = Date.now();
    const base = restante;
    const t = window.setInterval(() => {
      const r = base - (Date.now() - inicio);
      if (r <= 0) {
        window.clearInterval(t);
        setVisivel(false);
      } else setRestante(r);
    }, 100);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visivel, pausado]);

  const [lote, setLote] = useState<RecadoLido[]>([]);
  useEffect(() => {
    if (visivel && novos.length) setLote(novos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visivel]);

  const fechar = useCallback(() => setVisivel(false), []);
  const unico = lote.length === 1 ? lote[0] : null;

  return (
    <AnimatePresence>
      {visivel && lote.length > 0 && (
        <motion.aside
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: EASE }}
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          onFocus={() => setPausado(true)}
          onBlur={() => setPausado(false)}
          className="relative overflow-hidden rounded-[22px] border border-[var(--accent)] bg-[var(--bg-card)] shadow-[0_18px_40px_-28px_rgba(16,24,40,0.5)]"
        >
          <div className="flex items-start gap-3 p-4 pr-12">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Megaphone className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[var(--text-muted)]">
                {nomeEscola} · Mural de Recados {unico ? `· ${fmtRelativo(unico.publicado_em)}` : ''}
              </p>
              <p className="mt-0.5 truncate text-[15px] font-semibold text-[var(--text-heading)]">{unico ? unico.titulo : `${lote.length} recados novos no mural`}</p>
              <p className="mt-0.5 line-clamp-2 text-[13px] text-[var(--text-muted)]">
                {unico ? unico.resumo || 'Toque para ler o recado completo.' : lote.map((r) => r.titulo).slice(0, 3).join(' · ')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setVisivel(false);
                  onAbrir(unico ? unico.id : null);
                }}
                className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--accent)] hover:underline"
              >
                Abrir Mural de Recados <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <button type="button" onClick={fechar} aria-label="Fechar destaque" className="absolute right-2 top-2 rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)]">
            <X className="h-4 w-4" />
          </button>
          <div className="h-1 bg-[var(--bg-card-alt)]">
            <div className="h-full bg-[var(--accent)] transition-[width] duration-100 ease-linear" style={{ width: `${(restante / duracaoMs) * 100}%` }} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/** Contador para o menu: recados não lidos ou com ciência pendente. */
export function useMuralNaoLidos(portal: 'familia' | 'docente', organizationId?: string) {
  const { org } = useOrgDoPortal(portal, organizationId);
  const mural = useMural(org);
  return mural.data.filter((r) => ativo(r) && (naoLido(r) || pedeCiencia(r))).length;
}
