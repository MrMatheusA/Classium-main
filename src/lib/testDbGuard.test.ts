import { describe, it, expect } from 'vitest';
import { validateAndCreateTestConnection } from './testDbGuard';

describe('Test Database Connection Security Guard Suite (P2.326.00)', () => {
  it('1. should accept valid local test connection string', () => {
    const validUrl = 'postgres://test_user:pass@localhost:5433/classium_test_db';
    const config = validateAndCreateTestConnection(validUrl);
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5433);
    expect(config.database).toBe('classium_test_db');
  });

  it('2. should accept valid 127.0.0.1 test connection string', () => {
    const validUrl = 'postgresql://test_user:pass@127.0.0.1:5433/classium_test_db';
    const config = validateAndCreateTestConnection(validUrl);
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(5433);
  });

  it('3. should reject remote / production host (fail-closed)', () => {
    const remoteUrl = 'postgres://admin:pass@flfqjlrjnvkrstqsknxc.supabase.co:5432/postgres';
    expect(() => validateAndCreateTestConnection(remoteUrl)).toThrowError(/Host externo/);
  });

  it('4. should reject incorrect port (fail-closed)', () => {
    const wrongPortUrl = 'postgres://test_user:pass@localhost:5432/classium_test_db';
    expect(() => validateAndCreateTestConnection(wrongPortUrl)).toThrowError(/Porta não autorizada/);
  });

  it('5. should reject wrong database name (fail-closed)', () => {
    const wrongDbUrl = 'postgres://test_user:pass@localhost:5433/production_db';
    expect(() => validateAndCreateTestConnection(wrongDbUrl)).toThrowError(/Banco de dados não autorizado/);
  });

  it('6. should reject malformed URL or empty string (fail-closed)', () => {
    expect(() => validateAndCreateTestConnection('')).toThrowError(/ausente ou inválida/);
    expect(() => validateAndCreateTestConnection('not-a-url')).toThrowError(/malformada/);
  });

  it('7. should reject unauthorized protocols (fail-closed)', () => {
    const httpUrl = 'http://localhost:5433/classium_test_db';
    expect(() => validateAndCreateTestConnection(httpUrl)).toThrowError(/Protocolo não autorizado/);
  });
});
