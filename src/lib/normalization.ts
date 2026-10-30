/**
 * Classium Normalization Utilities
 * Standardized CPF, Name, and Text Normalization for Admin and Family Portals
 */

export function cleanCPF(cpf?: string | null): string {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '').trim();
}

export function formatCPF(cpf?: string | null): string {
  const clean = cleanCPF(cpf);
  if (clean.length !== 11) return clean;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

export function maskCPF(cpf?: string | null): string {
  const clean = cleanCPF(cpf);
  if (clean.length < 11) return cpf || '***.***.***-**';
  return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
}

export function getCpfVariants(cpf?: string | null): string[] {
  const clean = cleanCPF(cpf);
  if (!clean) return [];
  const variants = [clean];
  if (clean.length === 11) {
    const formatted = `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
    variants.push(formatted);
  }
  return variants;
}

export function validateCPF(cpf?: string | null): boolean {
  const clean = cleanCPF(cpf);
  if (!clean || clean.length !== 11) return false;
  
  // Check if all digits are equal (e.g. 11111111111)
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

export function normalizeName(name?: string | null): string {
  if (!name) return '';
  return String(name)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\s+/g, ' '); // remove multiple spaces
}

export function compareNames(a?: string | null, b?: string | null): boolean {
  const normA = normalizeName(a);
  const normB = normalizeName(b);
  if (!normA || !normB) return false;
  return normA.includes(normB) || normB.includes(normA);
}
