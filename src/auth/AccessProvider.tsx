import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Quem é a pessoa logada? Quem responde é o banco (função resolve_my_access),
 * não um botão na tela de login.
 *
 *   admin    → tem papel na plataforma (platform_roles)
 *   gestor   → gestor/diretor de uma escola, ou conta institucional ainda sem escola
 *   docente  → professor de uma escola
 *   equipe   → secretaria, coordenação, pedagógico, portaria, funcionário
 *   familia  → responsável (os filhos são ligados automaticamente)
 *   parceiro → conta do Portal do Parceiro (entra pela área do parceiro)
 *   none     → sem acesso a painel
 */

export type AccessRole = 'admin' | 'gestor' | 'docente' | 'equipe' | 'familia' | 'parceiro' | 'none';

export interface Access {
  /** false quando ainda não houve resposta válida do banco (sem sessão ou erro na consulta) */
  resolved: boolean;
  role: AccessRole;
  kind: string | null;
  fullName: string;
  platformRole: string | null;
  schoolRole: string | null;
  schoolId: string | null;
  schoolName: string | null;
  needsOnboarding: boolean;
  schoolPending: boolean;
  mustChangePassword: boolean;
  linkedChildren: number;
}

const EMPTY: Access = {
  resolved: false,
  role: 'none',
  kind: null,
  fullName: '',
  platformRole: null,
  schoolRole: null,
  schoolId: null,
  schoolName: null,
  needsOnboarding: false,
  schoolPending: false,
  mustChangePassword: false,
  linkedChildren: 0,
};

type RawAccess = Partial<{
  role: AccessRole;
  kind: string;
  full_name: string;
  platform_role: string;
  school_role: string;
  school_id: string;
  school_name: string;
  needs_onboarding: boolean;
  school_pending: boolean;
  must_change_password: boolean;
  linked_children: number;
}>;

function mapAccess(raw: RawAccess | null): Access {
  if (!raw) return EMPTY;
  return {
    resolved: true,
    role: raw.role ?? 'none',
    kind: raw.kind ?? null,
    fullName: raw.full_name ?? '',
    platformRole: raw.platform_role ?? null,
    schoolRole: raw.school_role ?? null,
    schoolId: raw.school_id ?? null,
    schoolName: raw.school_name ?? null,
    needsOnboarding: !!raw.needs_onboarding,
    schoolPending: !!raw.school_pending,
    mustChangePassword: !!raw.must_change_password,
    linkedChildren: raw.linked_children ?? 0,
  };
}

/** O link do e-mail de "esqueci minha senha" volta para /entrar?redefinir=1 */
function urlAsksPasswordReset() {
  try {
    return (
      new URLSearchParams(window.location.search).get('redefinir') === '1' ||
      window.location.hash.includes('type=recovery')
    );
  } catch {
    return false;
  }
}

function sameAccess(a: Access, b: Access) {
  return (Object.keys(a) as (keyof Access)[]).every((k) => a[k] === b[k]);
}

interface AccessState {
  access: Access;
  /** true enquanto descobre o perfil (logo após entrar) */
  loading: boolean;
  error: string | null;
  /** a pessoa chegou pelo link de redefinir senha */
  passwordRecovery: boolean;
  finishPasswordRecovery: () => void;
  /** pergunta de novo ao banco (ex.: depois de vincular filhos ou trocar a senha) */
  refresh: () => Promise<Access>;
}

const AccessContext = createContext<AccessState | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<Access>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(urlAsksPasswordReset);
  const requestId = useRef(0);
  // de quem é o perfil carregado agora (para não recarregar a tela à toa)
  const loadedUserId = useRef<string | null>(null);

  /**
   * Pergunta ao banco quem é a pessoa.
   * A tela de carregamento só aparece na PRIMEIRA vez de cada usuário;
   * depois disso a consulta acontece em silêncio e o painel continua aberto.
   */
  const refresh = useCallback(async (): Promise<Access> => {
    const id = ++requestId.current;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      if (id === requestId.current) {
        loadedUserId.current = null;
        setAccess(EMPTY);
        setError(null);
        setLoading(false);
      }
      return EMPTY;
    }

    const firstLoadForUser = loadedUserId.current !== session.user.id;
    if (firstLoadForUser) setLoading(true);

    const { data, error: rpcError } = await supabase.rpc('resolve_my_access');
    const next = rpcError ? EMPTY : mapAccess(data as RawAccess);

    // ignora respostas antigas se outra consulta começou depois
    if (id === requestId.current) {
      if (rpcError && !firstLoadForUser) {
        // falha numa consulta em segundo plano: mantém o que já estava valendo
        setLoading(false);
        return next;
      }
      loadedUserId.current = session.user.id;
      setAccess((prev) => (sameAccess(prev, next) ? prev : next));
      setError(rpcError ? rpcError.message : null);
      setLoading(false);
    }
    return next;
  }, []);

  useEffect(() => {
    refresh();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') {
        requestId.current++;
        loadedUserId.current = null;
        setAccess(EMPTY);
        setLoading(false);
        return;
      }
      // O Supabase manda SIGNED_IN de novo toda vez que a aba volta ao foco.
      // Se é a mesma pessoa, não há nada para recarregar.
      if (event === 'SIGNED_IN' && session?.user?.id && session.user.id === loadedUserId.current) return;

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // a documentação do Supabase recomenda não chamar o cliente dentro do callback
        setTimeout(() => {
          refresh();
        }, 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo<AccessState>(
    () => ({
      access,
      loading,
      error,
      passwordRecovery,
      finishPasswordRecovery: () => {
        setPasswordRecovery(false);
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('redefinir');
          url.hash = '';
          window.history.replaceState(null, '', url.pathname + url.search);
        } catch {
          /* sem histórico */
        }
      },
      refresh,
    }),
    [access, loading, error, passwordRecovery, refresh],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('useAccess precisa estar dentro de <AccessProvider>');
  return ctx;
}