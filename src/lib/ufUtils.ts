/**
 * Lista canônica dos 26 estados brasileiros e do Distrito Federal.
 */
export interface BrazilianUF {
  sigla: string;
  nome: string;
}

export const BRAZILIAN_UFS: BrazilianUF[] = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

/**
 * Remove acentuação e converte para minúsculas para comparação semântica.
 */
function sanitizeName(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Normaliza e valida qualquer entrada de estado brasileiro para a sigla oficial de 2 letras.
 * Suporta:
 * - Sigla oficial em maiúsculas ou minúsculas ("SP", "sp", "sc" -> "SP", "SC")
 * - Nomes completos com ou sem acentos ("São Paulo", "sao paulo" -> "SP", "Ceará" -> "CE")
 * - Retorna null para vazio ou valor não reconhecido.
 */
export function normalizeBrazilianUF(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // 1. Verificação direta por sigla de 2 letras
  const upper = raw.toUpperCase();
  const bySigla = BRAZILIAN_UFS.find(u => u.sigla === upper);
  if (bySigla) return bySigla.sigla;

  // 2. Verificação por nome completo
  const normalized = sanitizeName(raw);
  const byName = BRAZILIAN_UFS.find(u => sanitizeName(u.nome) === normalized);
  if (byName) return byName.sigla;

  return null;
}
