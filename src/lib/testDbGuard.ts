/**
 * Strict Connection Validator for Local PostgreSQL Integration Harness.
 * Ensures connection parameters strictly match local testing requirements
 * and fail-closed prior to any client initialization or SQL execution.
 */

export interface ValidatedTestConfig {
  connectionString: string;
  host: string;
  port: number;
  database: string;
  user: string;
}

export function validateAndCreateTestConnection(connectionStringOrEnv?: string): ValidatedTestConfig {
  const rawUrl = connectionStringOrEnv || process.env.TEST_DATABASE_URL || '';

  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('[Security Error] String de conexão de teste ausente ou inválida. Operação abortada.');
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    throw new Error('[Security Error] URL de conexão malformada. Operação abortada.');
  }

  // 1. Protocol validation
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error(`[Security Error] Protocolo não autorizado: "${parsed.protocol}". Apenas postgres/postgresql são permitidos.`);
  }

  // 2. Host validation (Strictly localhost or 127.0.0.1)
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    throw new Error(`[Security Error] Host externo/remoto não autorizado: "${hostname}". O harness é estritamente local.`);
  }

  // 3. Port validation (Strictly 5433)
  const port = parseInt(parsed.port, 10);
  if (port !== 5433) {
    throw new Error(`[Security Error] Porta não autorizada: "${parsed.port}". Apenas a porta local de teste 5433 é permitida.`);
  }

  // 4. Database validation (Strictly classium_test_db)
  const database = parsed.pathname.replace(/^\//, '');
  if (database !== 'classium_test_db') {
    throw new Error(`[Security Error] Banco de dados não autorizado: "${database}". Apenas "classium_test_db" é permitido.`);
  }

  // 5. User validation (Must be present and not production root if specified)
  const user = parsed.username;
  if (!user) {
    throw new Error('[Security Error] Usuário de banco de dados obrigatório.');
  }

  return {
    connectionString: rawUrl,
    host: hostname,
    port,
    database,
    user
  };
}
