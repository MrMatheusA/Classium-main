import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

/* =====================================================================
 * Escola Escuta — acesso ao Supabase (Mural, Agenda Família,
 * Agenda Diária e Participa). Toda regra de permissão está no banco:
 * aqui só chamamos tabelas (RLS) e funções (rpc).
 * ===================================================================== */

export const BUCKET = 'escola-escuta';

export type Publico = {
  familias?: 'todas' | 'turnos' | 'turmas' | null;
  turnos?: string[];
  turmas?: string[];
  docentes?: 'todos' | 'selecionados' | null;
  docente_ids?: string[];
};

export interface PreviaPublico {
  total: number;
  familias: number;
  docentes: number;
  sem_acesso: number;
  sem_telefone?: number;
}

export interface Turma {
  id: string;
  nome: string;
  turno: string | null;
  alunos: number;
}

export interface Escola {
  organization_id: string;
  nome: string;
  papel: 'gestor' | 'docente' | 'familia';
}

export interface Aviso {
  id: string;
  organization_id: string;
  modulo: 'mural' | 'agenda' | 'diario' | 'participa';
  titulo: string;
  corpo: string | null;
  ref_id: string | null;
  created_at: string;
  lido_em: string | null;
}

/* ----------------------------- erros ----------------------------- */

export function mensagemErro(err: any, padrao = 'Não foi possível concluir. Tente de novo.'): string {
  const msg: string = err?.message || err?.error_description || '';
  if (!msg) return padrao;
  if (/schema cache|does not exist|Could not find the (function|table)/i.test(msg)) {
    return 'Este recurso ainda não foi instalado no banco. Rode os arquivos SQL do Escola Escuta no SQL Editor.';
  }
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Sem conexão. Verifique a internet e tente de novo.';
  if (/JWT|not authenticated|401/i.test(msg)) return 'Sua sessão expirou. Entre de novo.';
  return msg.replace(/^.*?ERROR:\s*/, '');
}

/** Chama uma função do banco e devolve { data } ou { error } (nunca lança). */
export async function rpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return { error: mensagemErro(error) };
    return { data: data as T };
  } catch (e) {
    return { error: mensagemErro(e) };
  }
}

/** Lança em caso de erro (para usar com try/catch nas ações). */
export async function rpcOrThrow<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await rpc<T>(fn, args);
  if (r.error) throw new Error(r.error);
  return r.data as T;
}

/* ----------------------------- anexos ----------------------------- */

export async function enviarAnexo(organizationId: string, modulo: string, donoId: string, file: File) {
  if (file.size > 20 * 1024 * 1024) throw new Error('Arquivo maior que 20 MB.');
  const limpo = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_');
  const path = `${organizationId}/${modulo}/${donoId}/${Date.now()}_${limpo}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw new Error(mensagemErro(error, 'Falha ao enviar o arquivo.'));
  return { path, nome: file.name, mime: file.type, tamanho: file.size };
}

const urlCache = new Map<string, { url: string; exp: number }>();
/** Link temporário (10 min) para ver/baixar um anexo protegido. */
export async function linkAnexo(path: string, download?: string): Promise<string | null> {
  const key = `${path}|${download || ''}`;
  const hit = urlCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600, download ? { download } : undefined);
  if (error || !data?.signedUrl) return null;
  urlCache.set(key, { url: data.signedUrl, exp: Date.now() + 540_000 });
  return data.signedUrl;
}

export async function removerAnexo(path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
}

/* ----------------------------- público ----------------------------- */

export const previaPublico = (orgId: string, publico: Publico) => rpc<PreviaPublico>('ee_previa_publico', { p_org: orgId, p_publico: publico });
export const listarTurmas = (orgId: string) => rpc<Turma[]>('ee_turmas', { p_org: orgId });
export const listarDocentes = (orgId: string) => rpc<{ user_id: string; nome: string }[]>('ee_docentes_da_escola', { p_org: orgId });

export function descreverPublico(p: Publico, turmas: Turma[] = []): string {
  const partes: string[] = [];
  if (p.familias === 'todas') partes.push('todas as famílias');
  if (p.familias === 'turnos') partes.push(`famílias do turno ${(p.turnos || []).join(', ') || '—'}`);
  if (p.familias === 'turmas') {
    const nomes = (p.turmas || []).map((id) => turmas.find((t) => t.id === id)?.nome || 'turma');
    partes.push(`famílias de ${nomes.join(', ') || '—'}`);
  }
  if (p.docentes === 'todos') partes.push('todos os docentes');
  if (p.docentes === 'selecionados') partes.push(`${(p.docente_ids || []).length} docente(s) selecionado(s)`);
  return partes.join(' e ') || 'ninguém selecionado';
}

/* ----------------------------- hooks ----------------------------- */

/** Recarrega quando qualquer uma das tabelas mudar (Supabase Realtime) e ao voltar a conexão/aba. */
export function useRealtime(tabelas: string[], onChange: () => void, ativo = true) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const chave = tabelas.join(',');

  useEffect(() => {
    if (!ativo) return;
    let t: number | undefined;
    const disparar = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => cb.current(), 400); // agrupa rajadas de eventos
    };
    const canal = supabase.channel(`ee-${chave}-${Math.random().toString(36).slice(2, 8)}`);
    for (const tabela of tabelas) {
      canal.on('postgres_changes' as any, { event: '*', schema: 'public', table: tabela }, disparar);
    }
    canal.subscribe();
    const onVolta = () => document.visibilityState === 'visible' && disparar();
    window.addEventListener('online', disparar);
    document.addEventListener('visibilitychange', onVolta);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('online', disparar);
      document.removeEventListener('visibilitychange', onVolta);
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, ativo]);
}

/** Carregamento padrão com estados de loading/erro e recarga. */
export function useCarregar<T>(fn: () => Promise<{ data?: T; error?: string }>, deps: unknown[], inicial: T) {
  const [data, setData] = useState<T>(inicial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const recarregar = useCallback(async (silencioso = false) => {
    const meu = ++seq.current;
    if (!silencioso) setLoading(true);
    const r = await fnRef.current();
    if (meu !== seq.current) return; // resposta antiga: ignora
    if (r.error) setError(r.error);
    else {
      setError(null);
      setData((r.data ?? inicial) as T);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading, error, recarregar };
}

/** Escolas do usuário logado (família pode ter filhos em escolas diferentes). */
export function useMinhasEscolas() {
  return useCarregar<Escola[]>(() => rpc<Escola[]>('ee_minhas_escolas'), [], []);
}

export interface MeuEstudante {
  student_id: string;
  organization_id: string;
  class_id: string | null;
  guardian_id: string;
  student_nome: string;
}
export function useMeusEstudantes() {
  return useCarregar<MeuEstudante[]>(async () => {
    const r = await rpc<MeuEstudante[]>('ee_meus_estudantes');
    if (r.data) {
      // um estudante pode vir por dois vínculos: deixa um só
      const visto = new Set<string>();
      r.data = r.data.filter((e) => (visto.has(e.student_id) ? false : (visto.add(e.student_id), true)));
    }
    return r;
  }, [], []);
}

/* ----------------------------- datas ----------------------------- */

const TZ = 'America/Sao_Paulo';
export const fmtData = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
export const fmtDataCurta = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: 'short' }) : '—';
export const fmtHora = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '');
export const fmtDataHora = (iso?: string | null) => (iso ? `${fmtData(iso)} às ${fmtHora(iso)}` : '—');
export const fmtDiaSemana = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: '2-digit', month: 'long' });
export function fmtRelativo(iso?: string | null) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `há ${Math.floor(diff / 86400)} dia(s)`;
  return fmtData(iso);
}
/** yyyy-mm-dd no fuso de Brasília */
export const hojeISO = (somaDias = 0) => {
  const d = new Date(Date.now() + somaDias * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
};
/** datetime-local (Brasília) → ISO com fuso */
export const localParaISO = (v: string) => (v ? new Date(`${v}:00-03:00`).toISOString() : null);
/** ISO → valor de <input type="datetime-local"> em Brasília */
export const isoParaLocal = (iso?: string | null) => {
  if (!iso) return '';
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  return p.replace(' ', 'T');
};
