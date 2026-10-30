import { describe, it, expect } from 'vitest';
import { normalizeBrazilianUF, BRAZILIAN_UFS } from './ufUtils';

describe('Brazilian UF Normalization & Validation Suite (P2.354)', () => {
  describe('Valid Siglas', () => {
    it('should accept all 27 canonical 2-letter uppercase siglas', () => {
      BRAZILIAN_UFS.forEach(({ sigla }) => {
        expect(normalizeBrazilianUF(sigla)).toBe(sigla);
      });
    });

    it('should normalize lowercase and mixed-case siglas to uppercase', () => {
      expect(normalizeBrazilianUF('sp')).toBe('SP');
      expect(normalizeBrazilianUF('rj')).toBe('RJ');
      expect(normalizeBrazilianUF('Sc')).toBe('SC');
      expect(normalizeBrazilianUF('mg')).toBe('MG');
      expect(normalizeBrazilianUF('df')).toBe('DF');
    });

    it('should trim surrounding whitespace from siglas', () => {
      expect(normalizeBrazilianUF('  SP  ')).toBe('SP');
      expect(normalizeBrazilianUF(' \nPR\t ')).toBe('PR');
    });
  });

  describe('Recognized Full State Names', () => {
    it('should normalize full state names with accents correctly', () => {
      expect(normalizeBrazilianUF('São Paulo')).toBe('SP');
      expect(normalizeBrazilianUF('Ceará')).toBe('CE');
      expect(normalizeBrazilianUF('Goiás')).toBe('GO');
      expect(normalizeBrazilianUF('Maranhão')).toBe('MA');
      expect(normalizeBrazilianUF('Pará')).toBe('PA');
      expect(normalizeBrazilianUF('Paraíba')).toBe('PB');
      expect(normalizeBrazilianUF('Paraná')).toBe('PR');
      expect(normalizeBrazilianUF('Piauí')).toBe('PI');
      expect(normalizeBrazilianUF('Rondônia')).toBe('RO');
      expect(normalizeBrazilianUF('Espírito Santo')).toBe('ES');
      expect(normalizeBrazilianUF('Amapá')).toBe('AP');
    });

    it('should normalize full state names without accents correctly', () => {
      expect(normalizeBrazilianUF('Sao Paulo')).toBe('SP');
      expect(normalizeBrazilianUF('Ceara')).toBe('CE');
      expect(normalizeBrazilianUF('Goias')).toBe('GO');
      expect(normalizeBrazilianUF('Maranhao')).toBe('MA');
      expect(normalizeBrazilianUF('Para')).toBe('PA');
      expect(normalizeBrazilianUF('Paraiba')).toBe('PB');
      expect(normalizeBrazilianUF('Parana')).toBe('PR');
      expect(normalizeBrazilianUF('Piaui')).toBe('PI');
      expect(normalizeBrazilianUF('Rondonia')).toBe('RO');
      expect(normalizeBrazilianUF('Espirito Santo')).toBe('ES');
      expect(normalizeBrazilianUF('Amapa')).toBe('AP');
      expect(normalizeBrazilianUF('Distrito Federal')).toBe('DF');
      expect(normalizeBrazilianUF('Santa Catarina')).toBe('SC');
      expect(normalizeBrazilianUF('Rio Grande do Sul')).toBe('RS');
      expect(normalizeBrazilianUF('Rio Grande do Norte')).toBe('RN');
      expect(normalizeBrazilianUF('Mato Grosso do Sul')).toBe('MS');
      expect(normalizeBrazilianUF('Mato Grosso')).toBe('MT');
      expect(normalizeBrazilianUF('Minas Gerais')).toBe('MG');
      expect(normalizeBrazilianUF('Rio de Janeiro')).toBe('RJ');
    });

    it('should handle full names in lowercase or uppercase', () => {
      expect(normalizeBrazilianUF('são paulo')).toBe('SP');
      expect(normalizeBrazilianUF('SANTA CATARINA')).toBe('SC');
      expect(normalizeBrazilianUF('distrito federal')).toBe('DF');
    });
  });

  describe('Empty and Null Values', () => {
    it('should return null for undefined, null, or empty string', () => {
      expect(normalizeBrazilianUF(undefined)).toBeNull();
      expect(normalizeBrazilianUF(null)).toBeNull();
      expect(normalizeBrazilianUF('')).toBeNull();
      expect(normalizeBrazilianUF('   ')).toBeNull();
    });
  });

  describe('Invalid Values', () => {
    it('should reject unrecognized acronyms or foreign states', () => {
      expect(normalizeBrazilianUF('XX')).toBeNull();
      expect(normalizeBrazilianUF('ZZ')).toBeNull();
      expect(normalizeBrazilianUF('Miami')).toBeNull();
      expect(normalizeBrazilianUF('California')).toBeNull();
      expect(normalizeBrazilianUF('12')).toBeNull();
      expect(normalizeBrazilianUF('SÃ')).toBeNull();
      expect(normalizeBrazilianUF('Inexistente')).toBeNull();
    });
  });
});
