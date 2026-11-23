import { useEffect, useState } from 'react';
import { isUuid, resolveOrgId } from '../services/tenant';

/**
 * Escola ativa da tela.
 * Usa o primeiro id válido que a tela já tem (contexto, perfil...).
 * Se nenhum vier — por exemplo, administrador da plataforma —, pergunta ao banco,
 * que devolve a escola do vínculo ou a escola de testes.
 */
export function useActiveOrgId(...candidates: Array<string | null | undefined>): { orgId: string; resolving: boolean } {
  const direct = candidates.find(c => isUuid(c)) || '';
  const [orgId, setOrgId] = useState<string>(direct);
  const [resolving, setResolving] = useState<boolean>(!direct);

  useEffect(() => {
    if (direct) {
      setOrgId(direct);
      setResolving(false);
      return;
    }
    let alive = true;
    setResolving(true);
    resolveOrgId()
      .then(id => {
        if (alive) setOrgId(id || '');
      })
      .catch(() => {
        if (alive) setOrgId('');
      })
      .finally(() => {
        if (alive) setResolving(false);
      });
    return () => {
      alive = false;
    };
  }, [direct]);

  return { orgId, resolving };
}