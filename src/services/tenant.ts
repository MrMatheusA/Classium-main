import { supabase } from '../lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(id: string | null | undefined): id is string {
  return !!id && UUID_REGEX.test(id);
}

let cachedOrg: { userId: string; orgId: string | null } | null = null;

/**
 * Devolve a escola (organization_id) ativa.
 * Usa o id informado pela tela; se não vier, busca a escola do usuário logado.
 * Nunca inventa um id: sem escola, devolve null e quem chamou mostra o erro.
 */
export async function resolveOrgId(provided?: string | null): Promise<string | null> {
  if (isUuid(provided)) return provided;

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  if (cachedOrg && cachedOrg.userId === userId) return cachedOrg.orgId;

  let orgId: string | null = null;
  const { data: rpcOrg, error: rpcErr } = await supabase.rpc('classium_current_org');
  if (!rpcErr && isUuid(rpcOrg as string)) {
    orgId = rpcOrg as string;
  } else {
    const { data: mem } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (isUuid(mem?.organization_id)) orgId = mem!.organization_id;
  }

  cachedOrg = { userId, orgId };
  return orgId;
}

export function clearOrgCache() {
  cachedOrg = null;
}

export const NO_SCHOOL_ERROR = 'Não foi possível identificar a escola. Saia e entre de novo no sistema.';

/** Data de hoje no fuso de Brasília, no formato AAAA-MM-DD */
export function todayLocalISO(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Nome de arquivo seguro para o storage */
export function safeFileName(name: string): string {
  const base = name.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(-120);
}

/** Converte mensagens técnicas do banco em frases para o usuário */
export function friendlyDbError(message?: string | null, fallback = 'Não foi possível salvar. Tente de novo.'): string {
  if (!message) return fallback;
  const m = message.toLowerCase();
  if (m.includes('row-level security') || m.includes('permission denied')) {
    return 'Seu usuário não tem permissão para fazer isso nesta escola.';
  }
  if (m.includes('duplicate key')) return 'Já existe um registro igual a este.';
  if (m.includes('foreign key')) return 'Um dos itens ligados a este registro não existe mais. Atualize a tela.';
  if (m.includes('jwt') || m.includes('session')) return 'Sua sessão expirou. Entre de novo.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com o servidor. Verifique a internet.';
  if (m.includes('mime') || m.includes('invalid_mime_type')) return 'Formato de arquivo não aceito.';
  if (m.includes('payload too large') || m.includes('exceeded the maximum')) return 'O arquivo é maior que o limite permitido.';
  return fallback;
}