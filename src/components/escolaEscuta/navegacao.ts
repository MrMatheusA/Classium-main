import type { Modulo } from './EscolaEscuta';

/*
 * Ids das abas da Escola Escuta no mapa de navegação (src/navigation/portalNav.ts).
 * Gestão e Professor usam ids de texto; a Família usa os números do FamilyDashboard.
 */
export const EE_ABA: Record<Modulo, string> = {
  mural: 'ee-mural',
  agenda: 'ee-agenda',
  diario: 'ee-diario',
  participa: 'ee-participa',
};

export const ABA_FAMILIA: Record<Modulo, number> = { mural: 20, agenda: 21, diario: 22, participa: 23 };

/** Qual módulo da Escola Escuta esta aba representa (null = não é da Escola Escuta) */
export function moduloDaAba(id: unknown): Modulo | null {
  for (const m of Object.keys(EE_ABA) as Modulo[]) {
    if (id === EE_ABA[m] || id === ABA_FAMILIA[m]) return m;
  }
  return null;
}
