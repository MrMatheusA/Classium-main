/* Escola Escuta — tudo que você precisa importar nos portais */

// Mural de Recados
export { MuralGestor } from './MuralGestor';
export { MuralPortal, MuralDestaque, useMuralNaoLidos } from './MuralPortal';

// Agenda Família (atendimento às famílias)
export { AgendaFamiliaGestor } from './AgendaFamiliaGestor';
export { AgendaFamiliaPortal } from './AgendaFamiliaPortal';

// Agenda Diária (docente ↔ família)
export { AgendaDiariaDocente } from './AgendaDiariaDocente';
export { AgendaDiariaFamilia } from './AgendaDiariaFamilia';

// Participa
export { ParticipaGestor } from './ParticipaGestor';
export { ParticipaPortal } from './ParticipaPortal';

// Sino de avisos (os três portais)
export { AvisosSino } from './AvisosSino';

// Componente único por portal (abas dos 4 módulos + sino) e cartões da página inicial
export { EscolaEscuta, EscolaEscutaAtalhos } from './EscolaEscuta';
export type { Portal, Modulo } from './EscolaEscuta';

// Ligação com o menu (src/navigation/portalNav.ts)
export { EscolaEscutaAba } from './EscolaEscutaAba';
export { EE_ABA, ABA_FAMILIA, moduloDaAba } from './navegacao';

// Painel da Família (Início) e Agenda Diária dentro de Recados
export { PainelFamilia, DiarioNosRecados } from './PainelFamilia';
