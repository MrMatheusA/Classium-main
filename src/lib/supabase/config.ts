// CLASSIUM SUPABASE CONFIGURATION & ENV VALIDATOR (ENVIRONMENT-AWARE)
// Ensures safe environment variable reading, strict official host validation, staging separation, and zero legacy fallback.

export interface SupabaseEnvConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  missingVars: string[];
  environment: 'development' | 'staging' | 'production';
}

export const OFFICIAL_SUPABASE_HOST = 'flfqjlrjnvkrstqsknxc.supabase.co';
export const OFFICIAL_SUPABASE_URL = 'https://flfqjlrjnvkrstqsknxc.supabase.co';

export function normalizeSupabaseUrl(rawUrl: string): string {
  let cleanUrl = (rawUrl || '').trim();
  if (cleanUrl.endsWith('/rest/v1/')) {
    cleanUrl = cleanUrl.slice(0, -'/rest/v1/'.length);
  } else if (cleanUrl.endsWith('/rest/v1')) {
    cleanUrl = cleanUrl.slice(0, -'/rest/v1'.length);
  }
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  return cleanUrl;
}

export interface SupabaseEnvOverrides {
  url?: string;
  anonKey?: string;
  appEnv?: string;
  stagingHost?: string;
  devHost?: string;
  isProdBuild?: boolean;
  vercelEnv?: string;
}

/**
 * Decodifica com segurança uma sequência Base64URL sem lançar exceções.
 * Suporta ambientes de navegador (atob) e Node.js/Vitest (Buffer).
 */
export function safeDecodeBase64Url(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }
  const cleanInput = input.trim();
  // Validação estrita de caracteres Base64URL antes de qualquer decodificação
  if (!/^[A-Za-z0-9_-]+$/.test(cleanInput)) {
    return null;
  }
  try {
    let base64 = cleanInput.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    if (typeof atob === 'function') {
      return atob(base64);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('utf8');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extrai e valida a claim 'role' do payload de um JWT de forma puramente sintática.
 * AVISO ARQUITETURAL: Esta extração NÃO valida a assinatura criptográfica do token.
 * A autenticidade e autorização são verificadas exclusivamente pelos servidores do Supabase.
 */
export function extractJwtRole(jwt: string): string | null {
  if (!jwt || typeof jwt !== 'string') {
    return null;
  }
  try {
    const parts = jwt.trim().split('.');
    if (parts.length !== 3) {
      return null;
    }
    const decodedStr = safeDecodeBase64Url(parts[1]);
    if (!decodedStr) {
      return null;
    }
    const payload = JSON.parse(decodedStr);
    if (payload && typeof payload === 'object' && typeof payload.role === 'string') {
      return payload.role.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validação estrutural de formato e presença para chaves públicas do Supabase (anon / publishable).
 * AVISO ARQUITETURAL: Esta validação no frontend executa apenas saneamento sintático pré-boot (fail-fast)
 * e proteção contra credenciais ausentes, placeholders ou chaves privilegiadas expostas indevidamente.
 * A autenticidade criptográfica é verificada exclusivamente pelo API Gateway e PostgREST do Supabase.
 */
export function isValidSupabaseAnonKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  const cleanKey = key.trim();
  if (cleanKey.length === 0) {
    return false;
  }

  const lowerKey = cleanKey.toLowerCase();

  // 1. Rejeição rigorosa de placeholders
  if (
    lowerKey.includes('placeholder') ||
    lowerKey.includes('substituir') ||
    lowerKey.includes('your-anon-key') ||
    lowerKey.includes('sua-chave') ||
    lowerKey.includes('example')
  ) {
    return false;
  }

  // 2. Rejeição explícita de chaves privadas modernas (sb_secret_) e tokens de gerenciamento PAT (sbp_)
  if (cleanKey.startsWith('sb_secret_') || cleanKey.startsWith('sbp_')) {
    return false;
  }

  // 3. Formato JWT canônico legado: deve ter role 'anon' exclusivamente
  if (cleanKey.startsWith('eyJ')) {
    const parts = cleanKey.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const isWellFormedJwt =
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cleanKey) &&
      cleanKey.length >= 40;

    if (!isWellFormedJwt) {
      return false;
    }

    const role = extractJwtRole(cleanKey);
    // Rejeição estrita se for service_role, ausente ou diferente de 'anon'
    return role === 'anon';
  }

  // 4. Formato Publishable Key moderno oficialmente suportado ('sb_publishable_')
  if (cleanKey.startsWith('sb_publishable_')) {
    return (
      cleanKey.length >= 25 &&
      cleanKey.length <= 256 &&
      /^sb_publishable_[A-Za-z0-9_-]+$/.test(cleanKey)
    );
  }

  return false;
}

export function getSupabaseEnvConfig(overrides?: SupabaseEnvOverrides): SupabaseEnvConfig {
  const missingVars: string[] = [];
  let rawUrl = '';
  let rawAnonKey = '';
  let rawAppEnv = '';
  let rawStagingHost = '';
  let rawDevHost = '';
  let rawVercelEnv = '';
  let isProdBuild = false;

  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const metaEnv = import.meta.env as Record<string, string | boolean | undefined>;
      rawUrl = (metaEnv.VITE_SUPABASE_URL as string) || (metaEnv.NEXT_PUBLIC_SUPABASE_URL as string) || (metaEnv.SUPABASE_URL as string) || '';
      rawAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY as string) || (metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || (metaEnv.SUPABASE_ANON_KEY as string) || '';
      rawAppEnv = (metaEnv.VITE_APP_ENV as string) || '';
      rawStagingHost = (metaEnv.VITE_APPROVED_STAGING_HOST as string) || (metaEnv.VITE_STAGING_SUPABASE_HOST as string) || '';
      rawDevHost = (metaEnv.VITE_APPROVED_DEV_HOST as string) || (metaEnv.VITE_DEV_SUPABASE_HOST as string) || '';
      rawVercelEnv = (metaEnv.VITE_VERCEL_ENV as string) || (metaEnv.VERCEL_ENV as string) || '';

      // No Vite, import.meta.env.PROD é true em vite build (tanto Production quanto Preview)
      if (metaEnv.PROD || metaEnv.MODE === 'production') {
        isProdBuild = true;
      }
    }
  } catch {
    // Fallback if import.meta is unavailable
  }

  if (typeof process !== 'undefined' && process.env) {
    if (!rawUrl) rawUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    if (!rawAnonKey) rawAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    if (!rawVercelEnv) rawVercelEnv = process.env.VERCEL_ENV || process.env.VITE_VERCEL_ENV || '';
    if (!rawAppEnv) {
      // Suporte explícito a VITE_APP_ENV, SUPABASE_ENV e APP_ENV
      rawAppEnv = process.env.VITE_APP_ENV || process.env.SUPABASE_ENV || process.env.APP_ENV || '';
    }
    if (!rawStagingHost) {
      rawStagingHost =
        process.env.VITE_APPROVED_STAGING_HOST ||
        process.env.VITE_STAGING_SUPABASE_HOST ||
        process.env.APPROVED_STAGING_HOST ||
        process.env.STAGING_SUPABASE_HOST ||
        '';
    }
    if (!rawDevHost) {
      rawDevHost =
        process.env.VITE_APPROVED_DEV_HOST ||
        process.env.VITE_DEV_SUPABASE_HOST ||
        process.env.APPROVED_DEV_HOST ||
        process.env.DEV_SUPABASE_HOST ||
        '';
    }
    if (process.env.NODE_ENV === 'production') {
      isProdBuild = true;
    }
  }

  // Sobrescrita controlada (usada em testes unitários ou injeção controlada de contexto)
  if (overrides) {
    if (overrides.url !== undefined) rawUrl = overrides.url;
    if (overrides.anonKey !== undefined) rawAnonKey = overrides.anonKey;
    if (overrides.appEnv !== undefined) rawAppEnv = overrides.appEnv;
    if (overrides.stagingHost !== undefined) rawStagingHost = overrides.stagingHost;
    if (overrides.devHost !== undefined) rawDevHost = overrides.devHost;
    if (overrides.isProdBuild !== undefined) isProdBuild = overrides.isProdBuild;
    if (overrides.vercelEnv !== undefined) rawVercelEnv = overrides.vercelEnv;
  }

  const normalizedUrl = normalizeSupabaseUrl(rawUrl);
  const anonKey = (rawAnonKey || '').trim();

  // Determinação determinística e fail-secure do ambiente:
  let environment: 'development' | 'staging' | 'production' = 'development';
  let isEnvironmentConflict = false;
  let isEnvironmentAmbiguous = false;
  const vercelEnv = (rawVercelEnv || '').trim().toLowerCase();
  const appEnv = (rawAppEnv || '').trim().toLowerCase();

  // 1. Detecção de conflitos diretos e contraditórios entre sinais de ambiente:
  if (vercelEnv === 'production' && (appEnv === 'preview' || appEnv === 'staging' || appEnv === 'stage')) {
    isEnvironmentConflict = true;
    environment = 'production';
    missingVars.push(`VITE_APP_ENV (conflito de ambiente: VERCEL_ENV indica production, mas variável de aplicação indica ${appEnv})`);
  } else if (vercelEnv === 'preview' && (appEnv === 'production' || appEnv === 'prod')) {
    isEnvironmentConflict = true;
    environment = 'staging';
    missingVars.push(`VITE_APP_ENV (conflito de ambiente: VERCEL_ENV indica preview, mas variável de aplicação indica ${appEnv})`);
  } else if (vercelEnv === 'production') {
    // VERCEL_ENV='production' é autoritativo (anti-downgrade fail-secure)
    environment = 'production';
  } else if (vercelEnv === 'preview') {
    // VERCEL_ENV='preview' isola previews em staging (nunca rebaixa para development)
    environment = 'staging';
  } else if (vercelEnv === 'development') {
    if (appEnv === 'production' || appEnv === 'prod') {
      environment = 'production';
    } else if (appEnv === 'staging' || appEnv === 'stage' || appEnv === 'preview') {
      environment = 'staging';
    } else {
      environment = 'development';
    }
  } else {
    // 2. Ambientes fora da Vercel ou quando VERCEL_ENV não está exposto no bundle:
    if (appEnv === 'production' || appEnv === 'prod') {
      // Intenção explícita de produção: regras estritas de produção são mandatórias
      // mesmo se isProdBuild for false (isProdBuild: false não pode enfraquecer produção)
      environment = 'production';
    } else if (appEnv === 'staging' || appEnv === 'stage' || appEnv === 'preview') {
      // Staging ou Preview explícito em VITE_APP_ENV / SUPABASE_ENV
      environment = 'staging';
    } else if (isProdBuild) {
      // Build de produção empacotado (vite build / NODE_ENV=production):
      if (appEnv === 'development' || appEnv === 'dev') {
        // Anti-downgrade: 'development' não pode rebaixar um build de produção
        environment = 'production';
      } else {
        // Se nem VERCEL_ENV nem VITE_APP_ENV foram fornecidos em build de produção,
        // o bundle não consegue distinguir com segurança se está em Production ou Preview!
        // Política fail-secure: rejeita a ambiguidade para impedir conexão acidental a banco errado
        environment = 'production';
        isEnvironmentAmbiguous = true;
        missingVars.push('VITE_APP_ENV (sinal de ambiente ausente no bundle: configure explicitamente VITE_VERCEL_ENV ou VITE_APP_ENV para distinguir Production e Preview)');
      }
    } else {
      // Ambiente de desenvolvimento local padrão / runner de testes
      environment = 'development';
    }
  }

  let isUrlValid = false;

  if (!normalizedUrl || normalizedUrl.includes('placeholder')) {
    missingVars.push('VITE_SUPABASE_URL');
  } else {
    try {
      const parsedUrl = new URL(normalizedUrl);
      const hostname = parsedUrl.hostname.toLowerCase();

      // 1. Rejeição de credenciais embutidas na URL (ex: https://user:pass@host)
      if (parsedUrl.username || parsedUrl.password) {
        missingVars.push('VITE_SUPABASE_URL (credenciais embutidas na URL não são permitidas)');
      }
      // 2. Rejeição de parâmetros de consulta e fragmentos
      else if (parsedUrl.search) {
        missingVars.push('VITE_SUPABASE_URL (parâmetros de consulta não permitidos)');
      } else if (parsedUrl.hash) {
        missingVars.push('VITE_SUPABASE_URL (fragmentos na URL não permitidos)');
      }
      // 3. Rejeição de caminhos inesperados (a normalização remove apenas /rest/v1 e barra final)
      else if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
        missingVars.push('VITE_SUPABASE_URL (caminho inesperado na URL)');
      }
      // 4. Verificação por ambiente
      else if (environment === 'production') {
        // Production: estritamente HTTPS, host oficial idêntico e sem portas não autorizadas
        if (parsedUrl.protocol !== 'https:') {
          missingVars.push('VITE_SUPABASE_URL (deve utilizar HTTPS)');
        } else if (parsedUrl.port && parsedUrl.port !== '443') {
          missingVars.push('VITE_SUPABASE_URL (porta não autorizada para produção)');
        } else if (hostname === OFFICIAL_SUPABASE_HOST) {
          isUrlValid = true;
        } else {
          missingVars.push('VITE_SUPABASE_URL (host não autorizado para produção)');
        }
      } else if (environment === 'staging') {
        // Staging/Preview: deve rejeitar host de produção e exigir host aprovado configurado via VITE_APPROVED_STAGING_HOST / VITE_STAGING_SUPABASE_HOST
        if (hostname === OFFICIAL_SUPABASE_HOST) {
          missingVars.push('VITE_SUPABASE_URL (produção proibida em staging)');
        } else if (parsedUrl.protocol !== 'https:') {
          missingVars.push('VITE_SUPABASE_URL (deve utilizar HTTPS em staging)');
        } else if (parsedUrl.port && parsedUrl.port !== '443') {
          missingVars.push('VITE_SUPABASE_URL (porta não autorizada para staging)');
        } else {
          const approvedStagingHost = rawStagingHost.trim().toLowerCase();
          if (!approvedStagingHost) {
            missingVars.push('VITE_SUPABASE_URL (VITE_APPROVED_STAGING_HOST / VITE_STAGING_SUPABASE_HOST não configurado em staging)');
          } else if (hostname === approvedStagingHost) {
            isUrlValid = true;
          } else {
            missingVars.push('VITE_SUPABASE_URL (staging não aprovado ou host não autorizado)');
          }
        }
      } else {
        // Development / Test: autoriza exclusivamente o host oficial, emuladores locais (localhost/127.0.0.1)
        // ou host de desenvolvimento explicitamente aprovado via VITE_APPROVED_DEV_HOST / VITE_DEV_SUPABASE_HOST (sem wildcard *.supabase.co arbitrário).
        const approvedDevHost = rawDevHost.trim().toLowerCase();
        const isLocalEmulator = hostname === 'localhost' || hostname === '127.0.0.1';

        if (!isLocalEmulator && parsedUrl.protocol !== 'https:') {
          missingVars.push('VITE_SUPABASE_URL (deve utilizar HTTPS)');
        } else if (!isLocalEmulator && hostname === OFFICIAL_SUPABASE_HOST && parsedUrl.port && parsedUrl.port !== '443') {
          missingVars.push('VITE_SUPABASE_URL (porta não autorizada para o host oficial)');
        } else if (
          hostname === OFFICIAL_SUPABASE_HOST ||
          isLocalEmulator ||
          (approvedDevHost && hostname === approvedDevHost)
        ) {
          isUrlValid = true;
        } else {
          missingVars.push('VITE_SUPABASE_URL (host de desenvolvimento não autorizado)');
        }
      }
    } catch {
      missingVars.push('VITE_SUPABASE_URL (formato inválido)');
    }
  }

  // Strict Key Validation (formato, presença e checagem de privilégios)
  let isKeyValid = false;
  const lowerKey = anonKey.toLowerCase();
  if (!anonKey || lowerKey.includes('placeholder') || lowerKey.includes('substituir')) {
    missingVars.push('VITE_SUPABASE_ANON_KEY');
  } else if (anonKey.startsWith('sb_secret_')) {
    missingVars.push('VITE_SUPABASE_ANON_KEY (chave privada sb_secret_ proibida no cliente)');
  } else if (anonKey.startsWith('sbp_')) {
    missingVars.push('VITE_SUPABASE_ANON_KEY (token de gerenciamento sbp_ não é chave pública de cliente)');
  } else if (anonKey.startsWith('eyJ') && extractJwtRole(anonKey) === 'service_role') {
    missingVars.push('VITE_SUPABASE_ANON_KEY (chave privilegiada service_role proibida no cliente)');
  } else if (isValidSupabaseAnonKeyFormat(anonKey)) {
    isKeyValid = true;
  } else {
    missingVars.push('VITE_SUPABASE_ANON_KEY (formato de chave inválido ou papel não autorizado)');
  }

  const isConfigured = isUrlValid && isKeyValid && !isEnvironmentConflict && !isEnvironmentAmbiguous;
  const effectiveUrl = normalizedUrl || OFFICIAL_SUPABASE_URL;

  return {
    url: effectiveUrl,
    anonKey: isConfigured ? anonKey : '',
    isConfigured,
    missingVars,
    environment
  };
}

export function validateSupabaseEnvOrThrow(overrides?: SupabaseEnvOverrides): SupabaseEnvConfig {
  const config = getSupabaseEnvConfig(overrides);
  if (!config.isConfigured) {
    throw new Error(`[Supabase Config] Configuração inválida ou ausente para o ambiente ${config.environment}: ${config.missingVars.join(', ')}`);
  }
  return config;
}
