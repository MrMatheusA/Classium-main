import { useEffect, useSyncExternalStore } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { useAuth } from '../../hooks/useAuth';
import { useMinhasEscolas } from '../../services/escolaEscuta/api';

/*
 * Escola escolhida no seletor da Escola Escuta (usado pelo administrador,
 * que não tem escola própria, ou por quem atende mais de uma escola).
 * Fica guardada por usuário neste navegador.
 */
const ouvintes = new Set<() => void>();
let escolhida: Record<string, string> = {};
const chave = (uid: string) => `classium:ee-escola:${uid || 'anon'}`;

function lerEscolhida(uid: string): string {
  if (escolhida[uid] !== undefined) return escolhida[uid];
  try {
    escolhida[uid] = localStorage.getItem(chave(uid)) || '';
  } catch {
    escolhida[uid] = '';
  }
  return escolhida[uid];
}

export function escolherEscola(uid: string, org: string) {
  escolhida = { ...escolhida, [uid]: org };
  try {
    localStorage.setItem(chave(uid), org);
  } catch {
    /* navegação privada */
  }
  ouvintes.forEach((f) => f());
}

function useUid(): string {
  const { currentUser } = usePlatform() as any;
  const auth = useAuth() as any;
  return String(auth?.user?.id || currentUser?.id || '');
}

/** Escola definida pela plataforma (perfil do usuário) */
function useOrgDaPlataforma(): string {
  const { schoolInfo, currentUser } = usePlatform() as any;
  const auth = useAuth() as any;
  return auth?.organizationId || currentUser?.organizationId || currentUser?.organization_id || schoolInfo?.id || '';
}

export function useEscolaEscolhida(): [string, (org: string) => void] {
  const uid = useUid();
  const valor = useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => lerEscolhida(uid),
    () => '',
  );
  return [valor, (org: string) => escolherEscola(uid, org)];
}

/** Escola do usuário logado: a passada pelo portal, a escolhida no seletor, ou a do perfil. */
export function useOrgAtual(override?: string): string {
  const [escolhidaAgora] = useEscolaEscolhida();
  const daPlataforma = useOrgDaPlataforma();
  return override || escolhidaAgora || daPlataforma;
}

/**
 * Escolas que o gestor/administrador pode abrir e a atual.
 * Sem escola definida, escolhe sozinha a primeira da lista.
 */
export function useEscolasDoGestor(override?: string) {
  const escolas = useMinhasEscolas();
  const [escolhidaAgora, escolher] = useEscolaEscolhida();
  const daPlataforma = useOrgDaPlataforma();
  const lista = escolas.data.filter((e) => e.papel === 'gestor');
  const valida = (id: string) => !!id && lista.some((e) => e.organization_id === id);
  const atual = override || (valida(escolhidaAgora) ? escolhidaAgora : '') || daPlataforma || escolhidaAgora;

  useEffect(() => {
    if (override || escolas.loading) return;
    // escolhida antiga que não vale mais para este usuário: limpa
    if (escolhidaAgora && lista.length > 0 && !valida(escolhidaAgora)) escolher('');
    // ninguém definiu a escola (ex.: administrador): pega a primeira
    else if (!escolhidaAgora && !daPlataforma && lista.length > 0) escolher(lista[0].organization_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override, escolas.loading, escolas.data, escolhidaAgora, daPlataforma]);

  return { lista, atual, escolher, carregando: escolas.loading, erro: escolas.error };
}
