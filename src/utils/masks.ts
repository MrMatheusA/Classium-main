export const maskCPF = (value: string) => {
  let v = value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 9) return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2}).*/, '$1.$2.$3-$4');
  if (v.length > 6) return v.replace(/^(\d{3})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
  if (v.length > 3) return v.replace(/^(\d{3})(\d{1,3}).*/, '$1.$2');
  return v;
};

export const maskDate = (value: string) => {
  let v = value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 4) return v.replace(/^(\d{2})(\d{2})(\d{1,4}).*/, '$1/$2/$3');
  if (v.length > 2) return v.replace(/^(\d{2})(\d{1,2}).*/, '$1/$2');
  return v;
};

export const maskCellPhone = (value: string) => {
  let v = value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  if (v.length > 6) return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  if (v.length > 0) return v.replace(/^(\d*)/, '($1');
  return v;
};

export const maskRG = (value: string) => {
  return value.replace(/[^0-9X-]/gi, '').toUpperCase().slice(0, 14); // Simple RG mask, states vary
};

export const maskCEP = (value: string) => {
  let v = value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) return v.replace(/^(\d{5})(\d{1,3}).*/, '$1-$2');
  return v;
};

export const maskCNPJ = (value: string) => {
  let v = value.replace(/\D/g, '').slice(0, 14);
  if (v.length > 12) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2}).*/, '$1.$2.$3/$4-$5');
  if (v.length > 8) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, '$1.$2.$3/$4');
  if (v.length > 5) return v.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
  if (v.length > 2) return v.replace(/^(\d{2})(\d{1,3}).*/, '$1.$2');
  return v;
};

export const maskPlaca = (value: string) => {
  let v = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (v.length > 3) {
    v = v.slice(0, 3) + '-' + v.slice(3);
  }
  return v;
};

export const maskCPFOrCNPJ = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length > 11) {
    return maskCNPJ(v);
  }
  return maskCPF(v);
};

export const maskCPFSecret = (value: string) => {
  const clean = value.replace(/\D/g, '');
  if (clean.length !== 11) return '***.***.***-**';
  return `${clean.slice(0, 3)}.***.***-${clean.slice(9, 11)}`;
};

export const isValidCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  // Eliminate known invalid equal digits
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  let remainder = 0;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11), 10)) return false;

  return true;
};

export const isValidCNPJ = (cnpj: string): boolean => {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;

  return true;
};

export const isValidCPFOrCNPJ = (doc: string): boolean => {
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 11) return isValidCPF(clean);
  if (clean.length === 14) return isValidCNPJ(clean);
  return false;
};

