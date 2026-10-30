import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getSupabaseEnvConfig,
  OFFICIAL_SUPABASE_URL,
  OFFICIAL_SUPABASE_HOST,
  normalizeSupabaseUrl,
  validateSupabaseEnvOrThrow,
  isValidSupabaseAnonKeyFormat,
  extractJwtRole,
  safeDecodeBase64Url
} from './config';
import { supabaseManager } from './client';

// Gerador de JWT sintético puramente para testes locais isolados (sem credenciais reais)
function createSyntheticJwt(payloadObj: Record<string, unknown>): string {
  const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'; // {"alg":"HS256","typ":"JWT"}
  const payloadBase64 = Buffer.from(JSON.stringify(payloadObj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const signature = 'synthetic_test_signature_hash_0123456789abcdef';
  return `${header}.${payloadBase64}.${signature}`;
}

// Credenciais sintéticas de teste (100% fictícias e estruturais, sem segredos reais)
const SYNTHETIC_JWT_ANON_KEY = createSyntheticJwt({
  iss: 'supabase',
  ref: 'flfqjlrjnvkrstqsknxc',
  role: 'anon',
  iat: 1700000000,
  exp: 2000000000
});

const SYNTHETIC_JWT_SERVICE_ROLE_KEY = createSyntheticJwt({
  iss: 'supabase',
  ref: 'flfqjlrjnvkrstqsknxc',
  role: 'service_role',
  iat: 1700000000,
  exp: 2000000000
});

const SYNTHETIC_JWT_NO_ROLE_KEY = createSyntheticJwt({
  iss: 'supabase',
  ref: 'flfqjlrjnvkrstqsknxc',
  iat: 1700000000,
  exp: 2000000000
});

const SYNTHETIC_JWT_CORRUPTED_PAYLOAD =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.corrupted_payload_not_valid_base64_json!@#$.synthetic_test_signature_hash';

const SYNTHETIC_PUBLISHABLE_KEY =
  'sb_publishable_synthetic_test_token_1234567890abcdef';

const SYNTHETIC_SECRET_KEY =
  'sb_secret_synthetic_test_secret_token_1234567890abcdef';

const SYNTHETIC_SBP_PAT_KEY =
  'sbp_synthetic_management_cli_token_0123456789abcdef';

describe('Supabase Environment Configuration & Hardened Security Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    (supabaseManager as unknown as { client: unknown }).client = null;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    (supabaseManager as unknown as { client: unknown }).client = null;
    process.env = originalEnv;
  });

  it('1. should accept official host with canonical JWT anon key (role: anon) in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'production');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    const config = getSupabaseEnvConfig();
    expect(config.environment).toBe('production');
    expect(config.isConfigured).toBe(true);
    expect(config.url).toBe(OFFICIAL_SUPABASE_URL);
    expect(config.anonKey).toBe(SYNTHETIC_JWT_ANON_KEY);
    expect(config.missingVars).toEqual([]);
  });

  it('1b. should not allow VITE_APP_ENV=development to downgrade an active production build (fail-secure)', () => {
    // Cenário: Build compilado de produção com VITE_APP_ENV incorretamente definido como 'development'
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'development');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    const config = getSupabaseEnvConfig();
    // A política anti-downgrade deve forçar 'production', rejeitando o rebaixamento para 'development'
    expect(config.environment).toBe('production');
    expect(config.isConfigured).toBe(true);

    // Se uma URL local for tentada com VITE_APP_ENV=development em build de produção, deve ser estritamente bloqueada
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    const devUrlInProdBuild = getSupabaseEnvConfig();
    expect(devUrlInProdBuild.environment).toBe('production');
    expect(devUrlInProdBuild.isConfigured).toBe(false);
    expect(devUrlInProdBuild.missingVars).toContain('VITE_SUPABASE_URL (deve utilizar HTTPS)');
  });

  it('1c. should treat preview as staging in production builds, requiring approved staging host and rejecting development', () => {
    // Cenário: Vercel Preview (build de produção) com VITE_APP_ENV='preview'
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'preview');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://staging-project.supabase.co');
    vi.stubEnv('VITE_STAGING_SUPABASE_HOST', 'staging-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    const previewConfig = getSupabaseEnvConfig();
    expect(previewConfig.environment).toBe('staging');
    expect(previewConfig.isConfigured).toBe(true);
    expect(previewConfig.environment).not.toBe('development');

    // Se preview tentar usar host de produção oficial, deve ser bloqueado
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    const prodHostInPreview = getSupabaseEnvConfig();
    expect(prodHostInPreview.environment).toBe('staging');
    expect(prodHostInPreview.isConfigured).toBe(false);
    expect(prodHostInPreview.missingVars).toContain('VITE_SUPABASE_URL (produção proibida em staging)');
  });

  it('1d. conflict: PROD=true / MODE=production but VERCEL_ENV=preview must resolve strictly to staging (never development)', () => {
    // Cenário crítico: Vercel Preview deploy rodando vite build (PROD=true, MODE=production, mas VERCEL_ENV='preview')
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VITE_APP_ENV', ''); // Sem VITE_APP_ENV explícito, VERCEL_ENV deve comandar
    vi.stubEnv('VITE_SUPABASE_URL', 'https://staging-branch.supabase.co');
    vi.stubEnv('VITE_APPROVED_STAGING_HOST', 'staging-branch.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    const config = getSupabaseEnvConfig({ isProdBuild: true });
    expect(config.environment).toBe('staging');
    expect(config.isConfigured).toBe(true);
    expect(config.environment).not.toBe('production');
    expect(config.environment).not.toBe('development');

    // Previews da Vercel devem rejeitar conexão acidental ao banco oficial de produção
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    const prodUrlInVercelPreview = getSupabaseEnvConfig({ isProdBuild: true });
    expect(prodUrlInVercelPreview.environment).toBe('staging');
    expect(prodUrlInVercelPreview.isConfigured).toBe(false);
    expect(prodUrlInVercelPreview.missingVars).toContain('VITE_SUPABASE_URL (produção proibida em staging)');

    // Previews da Vercel devem rejeitar http inseguro ou emuladores locais
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    const localInVercelPreview = getSupabaseEnvConfig({ isProdBuild: true });
    expect(localInVercelPreview.environment).toBe('staging');
    expect(localInVercelPreview.isConfigured).toBe(false);
    expect(localInVercelPreview.missingVars).toContain('VITE_SUPABASE_URL (deve utilizar HTTPS em staging)');
  });

  it('1e. conflict: VERCEL_ENV=production but VITE_APP_ENV=development must enforce production (fail-secure anti-downgrade)', () => {
    // Cenário crítico: Deploy de produção na Vercel com tentativa de override VITE_APP_ENV='development'
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'development');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    const config = getSupabaseEnvConfig();
    expect(config.environment).toBe('production');
    expect(config.isConfigured).toBe(true);

    // Tentativa de usar URL local em VERCEL_ENV=production com VITE_APP_ENV=development deve ser rejeitada
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    const devUrlConfig = getSupabaseEnvConfig();
    expect(devUrlConfig.environment).toBe('production');
    expect(devUrlConfig.isConfigured).toBe(false);
    expect(devUrlConfig.missingVars).toContain('VITE_SUPABASE_URL (deve utilizar HTTPS)');
  });

  it('1f. conflict: DEV=true / NODE_ENV=development but VITE_APP_ENV=production must enforce strict production rules', () => {
    // Cenário crítico: Desenvolvedor rodando servidor local mas configurou VITE_APP_ENV='production'
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VITE_APP_ENV', 'production');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    // Host oficial com HTTPS deve ser aceito
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    const validProdConfig = getSupabaseEnvConfig({ isProdBuild: false });
    expect(validProdConfig.environment).toBe('production');
    expect(validProdConfig.isConfigured).toBe(true);

    // Localhost ou HTTP NÃO deve ser tolerado mesmo estando em ambiente dev, pois a intenção declarada é produção
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    const invalidLocalConfig = getSupabaseEnvConfig({ isProdBuild: false });
    expect(invalidLocalConfig.environment).toBe('production');
    expect(invalidLocalConfig.isConfigured).toBe(false);
    expect(invalidLocalConfig.missingVars).toContain('VITE_SUPABASE_URL (deve utilizar HTTPS)');

    // Porta arbitrária :8443 no host oficial de produção deve ser estritamente rejeitada
    vi.stubEnv('VITE_SUPABASE_URL', 'https://flfqjlrjnvkrstqsknxc.supabase.co:8443');
    const invalidPortConfig = getSupabaseEnvConfig({ isProdBuild: false });
    expect(invalidPortConfig.environment).toBe('production');
    expect(invalidPortConfig.isConfigured).toBe(false);
    expect(invalidPortConfig.missingVars).toContain('VITE_SUPABASE_URL (porta não autorizada para produção)');
  });

  it('1g. conflict: VERCEL_ENV=preview but VITE_APP_ENV=development must not downgrade to development', () => {
    // Cenário: Preview na Vercel com VITE_APP_ENV='development' incorreto
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VITE_APP_ENV', 'development');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://approved-preview.supabase.co');
    vi.stubEnv('VITE_APPROVED_STAGING_HOST', 'approved-preview.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    const config = getSupabaseEnvConfig();
    expect(config.environment).toBe('staging');
    expect(config.isConfigured).toBe(true);
    expect(config.environment).not.toBe('development');
  });

  it('1h. should support VITE_APPROVED_STAGING_HOST and VITE_APPROVED_DEV_HOST aliases', () => {
    // Teste de equivalência dos nomes de homologação de hosts
    vi.stubEnv('VITE_APP_ENV', 'staging');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://preview-cluster.supabase.co');
    vi.stubEnv('VITE_APPROVED_STAGING_HOST', 'preview-cluster.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    const stagingConfig = getSupabaseEnvConfig();
    expect(stagingConfig.environment).toBe('staging');
    expect(stagingConfig.isConfigured).toBe(true);

    vi.stubEnv('VITE_APP_ENV', 'development');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://dev-sandbox.supabase.co');
    vi.stubEnv('VITE_APPROVED_DEV_HOST', 'dev-sandbox.supabase.co');

    const devConfig = getSupabaseEnvConfig();
    expect(devConfig.environment).toBe('development');
    expect(devConfig.isConfigured).toBe(true);
  });

  it('1i. fail-secure: production build without environment signal in bundle must fail-secure (cannot guess between prod and preview)', () => {
    // Cenário crítico auditado em P2.274.470-T:
    // O bundle foi compilado com vite build (isProdBuild=true), mas nem VITE_VERCEL_ENV nem VITE_APP_ENV foram injetados.
    // O código não pode supor silenciosamente 'production' (o que conectaria um Preview ao banco oficial de produção)
    // nem 'staging' (o que quebraria a produção). O validador DEVE rejeitar a configuração ambígua.
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('VITE_VERCEL_ENV', '');
    vi.stubEnv('VITE_APP_ENV', '');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    const config = getSupabaseEnvConfig({ isProdBuild: true, vercelEnv: '', appEnv: '' });
    expect(config.isConfigured).toBe(false);
    expect(config.missingVars.some(v => v.includes('sinal de ambiente ausente no bundle'))).toBe(true);
  });

  it('1j. conflict: VERCEL_ENV=production but VITE_APP_ENV=preview or staging must reject ambiguous deployment', () => {
    // Conflito perigoso: plataforma é produção, mas aplicação indica preview/staging
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'preview');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    const config = getSupabaseEnvConfig();
    expect(config.isConfigured).toBe(false);
    expect(config.missingVars.some(v => v.includes('conflito de ambiente'))).toBe(true);

    // Mesma rejeição segura se for configurado como staging
    vi.stubEnv('VITE_APP_ENV', 'staging');
    const stagingConflictConfig = getSupabaseEnvConfig();
    expect(stagingConflictConfig.isConfigured).toBe(false);
    expect(stagingConflictConfig.missingVars.some(v => v.includes('conflito de ambiente'))).toBe(true);
  });

  it('1k. conflict: VERCEL_ENV=preview but VITE_APP_ENV=production must fail-secure and block production access', () => {
    // Conflito perigoso: deploy de preview com variável de aplicação apontando para produção
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VITE_APP_ENV', 'production');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    const config = getSupabaseEnvConfig({ isProdBuild: true });
    expect(config.isConfigured).toBe(false);
    expect(config.environment).toBe('staging'); // isolado em staging
    expect(config.missingVars.some(v => v.includes('conflito de ambiente'))).toBe(true);
  });

  it('1l. invalid environment variable values must not bypass security rules', () => {
    // Valor inválido/desconhecido em VITE_APP_ENV
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'unknown_custom_env_value');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    const config = getSupabaseEnvConfig({ isProdBuild: true });
    // Deve falhar de forma segura por valor desconhecido/não homologado
    expect(config.isConfigured).toBe(false);
    expect(config.missingVars.some(v => v.includes('sinal de ambiente ausente no bundle'))).toBe(true);
  });

  it('2. should strictly reject privileged JWT service_role key in public anon key variable', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'production');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_SERVICE_ROLE_KEY);

    const config = getSupabaseEnvConfig();
    expect(config.isConfigured).toBe(false);
    expect(config.anonKey).toBe('');
    expect(config.missingVars.some(v => v.includes('service_role'))).toBe(true);
  });

  it('3. should reject JWT without role claim', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'production');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_NO_ROLE_KEY);

    const config = getSupabaseEnvConfig();
    expect(config.isConfigured).toBe(false);
    expect(config.missingVars.some(v => v.includes('papel não autorizado') || v.includes('inválido'))).toBe(true);
  });

  it('4. should reject corrupted JWT payload safely without unhandled exception', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'production');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_CORRUPTED_PAYLOAD);

    expect(() => {
      const config = getSupabaseEnvConfig();
      expect(config.isConfigured).toBe(false);
    }).not.toThrow();
  });

  it('5. should reject modern secret key prefix (sb_secret_)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'production');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_SECRET_KEY);

    const config = getSupabaseEnvConfig();
    expect(config.isConfigured).toBe(false);
    expect(config.missingVars.some(v => v.includes('sb_secret_'))).toBe(true);
  });

  it('6. should reject management PAT prefix (sbp_) as public client key', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'production');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_SBP_PAT_KEY);

    const config = getSupabaseEnvConfig();
    expect(config.isConfigured).toBe(false);
    expect(config.missingVars.some(v => v.includes('sbp_'))).toBe(true);
  });

  it('7. should accept modern publishable key (sb_publishable_) in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'production');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_PUBLISHABLE_KEY);

    const config = getSupabaseEnvConfig();
    expect(config.environment).toBe('production');
    expect(config.isConfigured).toBe(true);
    expect(config.anonKey).toBe(SYNTHETIC_PUBLISHABLE_KEY);
    expect(config.missingVars).toEqual([]);
  });

  it('8. should reject empty key and common placeholders', () => {
    const placeholders = [
      '',
      '   ',
      'your-anon-key-here',
      'placeholder_token',
      'SUBSTITUIR_COM_CHAVE_REAL',
      'example_key'
    ];

    for (const ph of placeholders) {
      vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', ph);
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', ph);
      vi.stubEnv('SUPABASE_ANON_KEY', ph);

      delete process.env.VITE_SUPABASE_ANON_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_ANON_KEY;

      const config = getSupabaseEnvConfig({ anonKey: ph });
      expect(config.isConfigured).toBe(false);
      expect(isValidSupabaseAnonKeyFormat(ph)).toBe(false);
    }
  });

  it('9. should reject unauthorized hosts, malformed schemes, embedded credentials, ports, queries, fragments and paths in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_APP_ENV', 'production');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    // Official host without port accepted
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    expect(getSupabaseEnvConfig().isConfigured).toBe(true);

    // Official host with explicit standard port 443 accepted
    vi.stubEnv('VITE_SUPABASE_URL', 'https://flfqjlrjnvkrstqsknxc.supabase.co:443');
    expect(getSupabaseEnvConfig().isConfigured).toBe(true);

    // Non-HTTPS
    vi.stubEnv('VITE_SUPABASE_URL', 'http://flfqjlrjnvkrstqsknxc.supabase.co');
    expect(getSupabaseEnvConfig().isConfigured).toBe(false);
    expect(getSupabaseEnvConfig().missingVars).toContain('VITE_SUPABASE_URL (deve utilizar HTTPS)');

    // Embedded credentials in URL
    vi.stubEnv('VITE_SUPABASE_URL', 'https://usuario:senha@flfqjlrjnvkrstqsknxc.supabase.co');
    expect(getSupabaseEnvConfig().isConfigured).toBe(false);
    expect(getSupabaseEnvConfig().missingVars).toContain('VITE_SUPABASE_URL (credenciais embutidas na URL não são permitidas)');

    // Explicit test: Unauthorized port :8443 in production rejected
    vi.stubEnv('VITE_SUPABASE_URL', 'https://flfqjlrjnvkrstqsknxc.supabase.co:8443');
    expect(getSupabaseEnvConfig().isConfigured).toBe(false);
    expect(getSupabaseEnvConfig().missingVars).toContain('VITE_SUPABASE_URL (porta não autorizada para produção)');

    // Query strings in URL
    vi.stubEnv('VITE_SUPABASE_URL', 'https://flfqjlrjnvkrstqsknxc.supabase.co?malicious=true');
    expect(getSupabaseEnvConfig().isConfigured).toBe(false);
    expect(getSupabaseEnvConfig().missingVars).toContain('VITE_SUPABASE_URL (parâmetros de consulta não permitidos)');

    // Fragments in URL
    vi.stubEnv('VITE_SUPABASE_URL', 'https://flfqjlrjnvkrstqsknxc.supabase.co#fragment');
    expect(getSupabaseEnvConfig().isConfigured).toBe(false);
    expect(getSupabaseEnvConfig().missingVars).toContain('VITE_SUPABASE_URL (fragmentos na URL não permitidos)');

    // Unexpected paths in URL (outside of /rest/v1 handled by normalizer)
    vi.stubEnv('VITE_SUPABASE_URL', 'https://flfqjlrjnvkrstqsknxc.supabase.co/unexpected/path');
    expect(getSupabaseEnvConfig().isConfigured).toBe(false);
    expect(getSupabaseEnvConfig().missingVars).toContain('VITE_SUPABASE_URL (caminho inesperado na URL)');

    // Suffix spoofing / domain hijacking
    vi.stubEnv('VITE_SUPABASE_URL', 'https://flfqjlrjnvkrstqsknxc.supabase.co.attacker.com');
    expect(getSupabaseEnvConfig().isConfigured).toBe(false);
    expect(getSupabaseEnvConfig().missingVars).toContain('VITE_SUPABASE_URL (host não autorizado para produção)');

    // Prefix spoofing
    vi.stubEnv('VITE_SUPABASE_URL', 'https://fake-flfqjlrjnvkrstqsknxc.supabase.co');
    expect(getSupabaseEnvConfig().isConfigured).toBe(false);
    expect(getSupabaseEnvConfig().missingVars).toContain('VITE_SUPABASE_URL (host não autorizado para produção)');

    // Legitimate URL with /rest/v1/ suffix normalized cleanly
    vi.stubEnv('VITE_SUPABASE_URL', 'https://flfqjlrjnvkrstqsknxc.supabase.co/rest/v1/');
    expect(getSupabaseEnvConfig().isConfigured).toBe(true);
  });

  it('10. should correctly preserve staging environment isolation with VITE_STAGING_SUPABASE_HOST', () => {
    // Staging rejecting production host
    vi.stubEnv('SUPABASE_ENV', 'staging');
    vi.stubEnv('VITE_APP_ENV', 'staging');
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    const prodInStaging = getSupabaseEnvConfig();
    expect(prodInStaging.environment).toBe('staging');
    expect(prodInStaging.isConfigured).toBe(false);
    expect(prodInStaging.missingVars).toContain('VITE_SUPABASE_URL (produção proibida em staging)');

    // Staging accepting approved staging host via VITE_STAGING_SUPABASE_HOST
    vi.stubEnv('VITE_SUPABASE_URL', 'https://staging-project.supabase.co');
    vi.stubEnv('VITE_STAGING_SUPABASE_HOST', 'staging-project.supabase.co');

    const approvedStaging = getSupabaseEnvConfig();
    expect(approvedStaging.environment).toBe('staging');
    expect(approvedStaging.isConfigured).toBe(true);
    expect(approvedStaging.url).toBe('https://staging-project.supabase.co');

    // Staging rejecting non-standard port :8443
    vi.stubEnv('VITE_SUPABASE_URL', 'https://staging-project.supabase.co:8443');
    const stagingNonStandardPort = getSupabaseEnvConfig();
    expect(stagingNonStandardPort.isConfigured).toBe(false);
    expect(stagingNonStandardPort.missingVars).toContain('VITE_SUPABASE_URL (porta não autorizada para staging)');

    // Staging rejecting unapproved host
    vi.stubEnv('VITE_SUPABASE_URL', 'https://unapproved-staging.supabase.co');
    const unapprovedStaging = getSupabaseEnvConfig();
    expect(unapprovedStaging.isConfigured).toBe(false);
    expect(unapprovedStaging.missingVars).toContain('VITE_SUPABASE_URL (staging não aprovado ou host não autorizado)');

    // Staging without VITE_STAGING_SUPABASE_HOST configured
    vi.stubEnv('VITE_STAGING_SUPABASE_HOST', '');
    const missingStagingHost = getSupabaseEnvConfig({ stagingHost: '' });
    expect(missingStagingHost.isConfigured).toBe(false);
    expect(missingStagingHost.missingVars.some(v => v.includes('não configurado em staging'))).toBe(true);
  });

  it('11. should validate development host policy (rejecting arbitrary *.supabase.co and supporting local/approved host)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VITE_APP_ENV', 'development');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SYNTHETIC_JWT_ANON_KEY);

    // Official host accepted in development
    vi.stubEnv('VITE_SUPABASE_URL', OFFICIAL_SUPABASE_URL);
    expect(getSupabaseEnvConfig().isConfigured).toBe(true);

    // Official host with non-standard port in development rejected
    vi.stubEnv('VITE_SUPABASE_URL', 'https://flfqjlrjnvkrstqsknxc.supabase.co:8443');
    const devOfficialInvalidPort = getSupabaseEnvConfig();
    expect(devOfficialInvalidPort.isConfigured).toBe(false);
    expect(devOfficialInvalidPort.missingVars).toContain('VITE_SUPABASE_URL (porta não autorizada para o host oficial)');

    // Local emulator with custom port accepted in development
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    expect(getSupabaseEnvConfig().isConfigured).toBe(true);

    // Arbitrary *.supabase.co rejected without explicit VITE_DEV_SUPABASE_HOST
    vi.stubEnv('VITE_SUPABASE_URL', 'https://arbitrary-project.supabase.co');
    vi.stubEnv('VITE_DEV_SUPABASE_HOST', '');
    const arbitraryDev = getSupabaseEnvConfig({ devHost: '' });
    expect(arbitraryDev.isConfigured).toBe(false);
    expect(arbitraryDev.missingVars).toContain('VITE_SUPABASE_URL (host de desenvolvimento não autorizado)');

    // Explicit approved dev host accepted via VITE_DEV_SUPABASE_HOST
    vi.stubEnv('VITE_SUPABASE_URL', 'https://custom-dev-project.supabase.co');
    vi.stubEnv('VITE_DEV_SUPABASE_HOST', 'custom-dev-project.supabase.co');
    const approvedDev = getSupabaseEnvConfig();
    expect(approvedDev.isConfigured).toBe(true);
  });

  it('12. should validate unit helper isValidSupabaseAnonKeyFormat', () => {
    expect(isValidSupabaseAnonKeyFormat(SYNTHETIC_JWT_ANON_KEY)).toBe(true);
    expect(isValidSupabaseAnonKeyFormat(SYNTHETIC_PUBLISHABLE_KEY)).toBe(true);
    expect(isValidSupabaseAnonKeyFormat(SYNTHETIC_JWT_SERVICE_ROLE_KEY)).toBe(false);
    expect(isValidSupabaseAnonKeyFormat(SYNTHETIC_SECRET_KEY)).toBe(false);
    expect(isValidSupabaseAnonKeyFormat(SYNTHETIC_SBP_PAT_KEY)).toBe(false);
    expect(isValidSupabaseAnonKeyFormat(SYNTHETIC_JWT_NO_ROLE_KEY)).toBe(false);
    expect(isValidSupabaseAnonKeyFormat(SYNTHETIC_JWT_CORRUPTED_PAYLOAD)).toBe(false);
    expect(isValidSupabaseAnonKeyFormat('sb_publishable_short')).toBe(false);
    expect(isValidSupabaseAnonKeyFormat('sb_publishable_valid_length_key_12345')).toBe(true);
    expect(isValidSupabaseAnonKeyFormat('not_a_valid_key')).toBe(false);
    expect(isValidSupabaseAnonKeyFormat('')).toBe(false);
    expect(isValidSupabaseAnonKeyFormat('   ')).toBe(false);
  });

  it('13. should validate safeDecodeBase64Url and extractJwtRole helpers', () => {
    expect(safeDecodeBase64Url('invalid===base64%%%')).toBeNull();
    expect(safeDecodeBase64Url('')).toBeNull();
    expect(extractJwtRole('not.a.valid.jwt.with.too.many.parts')).toBeNull();
    expect(extractJwtRole(SYNTHETIC_JWT_ANON_KEY)).toBe('anon');
    expect(extractJwtRole(SYNTHETIC_JWT_SERVICE_ROLE_KEY)).toBe('service_role');
    expect(extractJwtRole(SYNTHETIC_JWT_NO_ROLE_KEY)).toBeNull();
    expect(extractJwtRole('')).toBeNull();
  });

  it('14. should guarantee safe fallback without silent production connection', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const config = getSupabaseEnvConfig({ url: '', anonKey: '' });
    expect(config.isConfigured).toBe(false);
    expect(config.anonKey).toBe('');
  });

  it('15. should initialize offline client without remote fetch traffic when unconfigured', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    // Isola o singleton limpando cliente anterior em cache
    (supabaseManager as unknown as { client: unknown }).client = null;

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    try {
      const client = supabaseManager.getClient();
      expect(client).toBeDefined();
      // Comprova que nenhuma requisição HTTP via globalThis.fetch foi acionada durante inicialização offline
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      (supabaseManager as unknown as { client: unknown }).client = null;
    }
  });

  it('16. should throw error on validateSupabaseEnvOrThrow when unconfigured', () => {
    expect(() => validateSupabaseEnvOrThrow({ url: '', anonKey: '' })).toThrow();
  });

  it('17. should normalize Supabase URLs correctly', () => {
    expect(normalizeSupabaseUrl('https://example.supabase.co/rest/v1/')).toBe('https://example.supabase.co');
    expect(normalizeSupabaseUrl('https://example.supabase.co/rest/v1')).toBe('https://example.supabase.co');
    expect(normalizeSupabaseUrl('https://example.supabase.co/')).toBe('https://example.supabase.co');
  });

  it('18. should guarantee test isolation and full state restoration', () => {
    // Verifica que o estado de process.env e mocks foi restaurado pelos hooks
    expect(process.env.VITE_SUPABASE_URL).toBe(originalEnv.VITE_SUPABASE_URL);
    expect(process.env.VITE_SUPABASE_ANON_KEY).toBe(originalEnv.VITE_SUPABASE_ANON_KEY);
  });
});
