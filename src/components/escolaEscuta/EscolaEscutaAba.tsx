import { usePortalNav } from '../../navigation/portalNav';
import { EscolaEscuta, type Modulo, type Portal } from './EscolaEscuta';
import { EE_ABA, moduloDaAba } from './navegacao';

/**
 * Tela da Escola Escuta ligada ao menu: abre no módulo da aba atual,
 * e trocar de módulo aqui dentro atualiza o menu, o título e a URL.
 */
export function EscolaEscutaAba({
  portal,
  organizationId,
  embutido,
  recadoInicialId,
}: {
  portal: Exclude<Portal, 'familia'>;
  organizationId?: string;
  embutido?: boolean;
  recadoInicialId?: string | null;
}) {
  const nav = usePortalNav();
  const modulo = moduloDaAba(nav.activeId);
  if (!modulo) return null;
  return (
    <EscolaEscuta
      portal={portal}
      moduloInicial={modulo}
      recadoInicialId={recadoInicialId}
      organizationId={organizationId}
      embutido={embutido}
      onModulo={(m: Modulo) => nav.go(EE_ABA[m])}
      onVoltar={() => nav.go('dashboard')}
    />
  );
}
