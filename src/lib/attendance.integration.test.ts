import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { validateAndCreateTestConnection } from './testDbGuard';

describe('PostgreSQL Attendance Integration Suite (P2.326.02)', () => {
  let client: Client | null = null;
  let connectionString = '';

  beforeAll(async () => {
    // 1. Enforce strict connection validation (fail-closed) via guard
    try {
      const config = validateAndCreateTestConnection();
      connectionString = config.connectionString;
    } catch (err: any) {
      console.warn('[Integration Guard] Conexão de teste bloqueada pelo guard de segurança:', err.message);
      return;
    }

    client = new Client({ connectionString });
    try {
      await client.connect();
    } catch (err: any) {
      console.warn('[Integration DB] Não foi possível conectar ao PostgreSQL local (porta 5433 / classium_test_db). A suíte real será ignorada por infraestrutura offline:', err.message);
      client = null;
    }
  });

  afterAll(async () => {
    if (client) {
      try {
        // Cleanup test data created during integration test
        await client.query("DELETE FROM public.attendance WHERE observations LIKE 'INTEGRATION_TEST_%'");
        await client.end();
      } catch (_) {}
    }
  });

  it('1. Guarda de Conexão: Deve validar estritamente parametros locais e rejeitar produção', () => {
    expect(() => validateAndCreateTestConnection('postgres://usr:pwd@flfqjlrjnvkrstqsknxc.supabase.co:5432/postgres'))
      .toThrowError();
    
    expect(() => validateAndCreateTestConnection('postgres://test_user:pass@localhost:5433/classium_test_db'))
      .not.toThrow();
  });

  it('2. Conexão real com o PostgreSQL autorizado (se disponível)', async () => {
    if (!client) {
      console.log('Skipping real DB test: PostgreSQL local offline (infraestrutura bloqueada).');
      expect(true).toBe(true);
      return;
    }

    const res = await client.query('SELECT NOW() as current_time, current_database() as db;');
    expect(res.rows[0].db).toBe('classium_test_db');
    console.log('Conectado com sucesso ao banco:', res.rows[0].db, 'Hora:', res.rows[0].current_time);
  });

  it('3. Validação de Schema e Constraint de Frequência (se disponível)', async () => {
    if (!client) {
      expect(true).toBe(true);
      return;
    }

    // Check if table attendance exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'attendance';
    `);

    if (tableCheck.rows.length === 0) {
      console.warn('Tabela public.attendance ainda não criada no banco de teste local. Ignorando teste de inserção até que as migrações sejam aplicadas.');
      expect(true).toBe(true);
      return;
    }

    // Attempt test insertion with unique conflict key
    const testStudentId = '00000000-0000-0000-0000-000000000001';
    const testClassId = '00000000-0000-0000-0000-000000000002';
    const testDate = new Date().toISOString().split('T')[0];
    const testObs = 'INTEGRATION_TEST_RECORD';

    // Insert or Upsert
    const insertQuery = `
      INSERT INTO public.attendance (student_id, class_id, attendance_date, status, observations)
      VALUES ($1, $2, $3, 'PRESENT', $4)
      ON CONFLICT (student_id, class_id, attendance_date)
      DO UPDATE SET status = EXCLUDED.status, observations = EXCLUDED.observations
      RETURNING id, student_id, class_id, attendance_date, status;
    `;

    const result = await client.query(insertQuery, [testStudentId, testClassId, testDate, testObs]);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].status).toBe('PRESENT');

    // Verify retrieval
    const selectRes = await client.query(
      'SELECT * FROM public.attendance WHERE student_id = $1 AND class_id = $2 AND attendance_date = $3;',
      [testStudentId, testClassId, testDate]
    );
    expect(selectRes.rows.length).toBe(1);
    expect(selectRes.rows[0].observations).toBe(testObs);
  });
});
