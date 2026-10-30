/**
 * CLASSIUM — SUÍTE ISOLADA DO AUTHPROVIDER (COMANDO 28)
 * 
 * Configuração hermética de testes unitários para src/auth/AuthProvider.tsx.
 * 
 * Restrições e características arquiteturais:
 * 1. Barreira estrita de rede: globalThis.fetch, XMLHttpRequest e WebSocket
 *    são interceptados e bloqueados com erro opaco antes de qualquer teste.
 * 2. Isolamento de ambiente React 19: executa diretamente com react-dom/client
 *    e act() da biblioteca 'react', sem dependências de teste auxiliares.
 * 3. Mocks herméticos: Supabase client, UsersService e PermissionsService são
 *    totalmente isolados com controle granular de promessas e eventos.
 * 4. Registro completo de transições de estado via TestConsumer e snapshots.
 * 5. Cobertura dos grupos A (Resolução Inicial), B (Concorrência e Superseded),
 *    C (Login e SIGNED_IN), D (Logout) e E (Seleção de Organização).
 */

import React, { act } from 'react';
import ReactDOMClient from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { Session, User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// 1. BARREIRA DE REDE ESTRITA (HERMETIC NETWORK BARRIER)
// ---------------------------------------------------------------------------
const originalFetch = globalThis.fetch;
const originalXMLHttpRequest = (globalThis as any).XMLHttpRequest;
const originalWebSocket = (globalThis as any).WebSocket;

function installNetworkBarrier() {
  const barrierError = () => new Error('[Hermetic Barrier] Requisições de rede bloqueadas na suíte de testes.');

  globalThis.fetch = () => Promise.reject(barrierError());

  (globalThis as any).XMLHttpRequest = class MockBlockedXHR {
    open() {
      throw barrierError();
    }
    send() {
      throw barrierError();
    }
    setRequestHeader() {}
    abort() {}
  };

  (globalThis as any).WebSocket = class MockBlockedWebSocket {
    constructor() {
      throw barrierError();
    }
  };
}

function restoreNetworkBarrier() {
  globalThis.fetch = originalFetch;
  (globalThis as any).XMLHttpRequest = originalXMLHttpRequest;
  (globalThis as any).WebSocket = originalWebSocket;
}

// ---------------------------------------------------------------------------
// 2. MOCKS HOISTED DE DEPENDÊNCIAS EXTERNAS
// ---------------------------------------------------------------------------
const {
  mockSupabase,
  mockUsersService,
  mockPermissionsService,
  authStateCallbacks,
} = vi.hoisted(() => {
  const authStateCallbacks: Array<(event: string, session: any) => void> = [];

  const mockSupabase = {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn((cb: (event: string, session: any) => void) => {
        authStateCallbacks.push(cb);
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(() => {
                const index = authStateCallbacks.indexOf(cb);
                if (index !== -1) {
                  authStateCallbacks.splice(index, 1);
                }
              }),
            },
          },
        };
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  };

  const mockUsersService = {
    getProfile: vi.fn(),
    getUserMembership: vi.fn(),
    getSchool: vi.fn(),
  };

  const mockPermissionsService = {
    getUserPermissions: vi.fn(),
  };

  return {
    mockSupabase,
    mockUsersService,
    mockPermissionsService,
    authStateCallbacks,
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
  getSupabase: () => mockSupabase,
  supabaseManager: { getClient: () => mockSupabase },
}));

vi.mock('../services/users.service', () => ({
  UsersService: mockUsersService,
  normalizeRoleToAppRole: (roleCode?: string | null) => {
    if (!roleCode) return null;
    const normalized = roleCode.toLowerCase().trim();
    if (['admin', 'gestor', 'docente', 'familia'].includes(normalized)) {
      return normalized;
    }
    return null;
  },
}));

vi.mock('../services/permissions.service', () => ({
  PermissionsService: mockPermissionsService,
}));

// Importações dos módulos testados após a declaração dos mocks
import { AuthProvider, ExtendedAuthContextType } from './AuthProvider';
import { useAuth } from '../hooks/useAuth';

// ---------------------------------------------------------------------------
// 3. UTILITÁRIOS DE CONTROLE ASSÍNCRONO E SNAPSHOTS
// ---------------------------------------------------------------------------

export interface StateSnapshot {
  user: User | null;
  session: Session | null;
  profile: any;
  role: any;
  organizationId: string | null;
  permissions: string[];
  loading: boolean;
  resolutionState: string;
  membershipStatus: any;
  profileStatus: any;
  errorMessage: string | null;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// ---------------------------------------------------------------------------
// 4. FIXTURES DE DADOS CANÔNICOS
// ---------------------------------------------------------------------------
const fixtureUser: User = {
  id: 'usr-test-guid-1',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
  email: 'gestor.teste@classium.edu.br',
};

const fixtureSession: Session = {
  access_token: 'valid-mock-access-token',
  refresh_token: 'valid-mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: fixtureUser,
};

// ---------------------------------------------------------------------------
// 5. CONSUMIDOR DE TESTE E GERENCIAMENTO DO DOM
// ---------------------------------------------------------------------------
const recordedSnapshots: StateSnapshot[] = [];
let capturedContext: ExtendedAuthContextType | null = null;

const TestConsumer: React.FC = () => {
  const auth = useAuth();
  capturedContext = auth;

  recordedSnapshots.push({
    user: auth.user,
    session: auth.session,
    profile: auth.profile,
    role: auth.role,
    organizationId: auth.organizationId,
    permissions: [...auth.permissions],
    loading: auth.loading,
    resolutionState: auth.resolutionState,
    membershipStatus: auth.membershipStatus,
    profileStatus: auth.profileStatus,
    errorMessage: auth.errorMessage,
  });

  return (
    <div data-testid="test-consumer">
      <span data-testid="resolution-state">{auth.resolutionState}</span>
      <span data-testid="loading-flag">{auth.loading ? 'loading' : 'idle'}</span>
    </div>
  );
};

let testContainer: HTMLDivElement | null = null;
let testRoot: ReactDOMClient.Root | null = null;

async function renderAuthProvider() {
  testContainer = document.createElement('div');
  document.body.appendChild(testContainer);
  testRoot = ReactDOMClient.createRoot(testContainer);

  await act(async () => {
    testRoot!.render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
  });
}

/**
 * Avança o relógio e libera macrotarefas (ex: scheduleAuthTask / setTimeout 0).
 */
async function flushAsyncTasks(durationMs: number = 20) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  });
}

// ---------------------------------------------------------------------------
// 6. SUÍTE DE TESTES HERMÉTICA DO AUTHPROVIDER
// ---------------------------------------------------------------------------
describe('AuthProvider (Suíte Isolada - Comando 28)', () => {
  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    installNetworkBarrier();
  });

  afterAll(() => {
    restoreNetworkBarrier();
  });

  beforeEach(() => {
    recordedSnapshots.length = 0;
    capturedContext = null;
    authStateCallbacks.length = 0;

    vi.clearAllMocks();

    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}

    // Configuração padrão: sem sessão Supabase
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });
    mockUsersService.getProfile.mockResolvedValue({
      status: 'not_found',
      data: null,
    });
    mockUsersService.getUserMembership.mockResolvedValue({
      status: 'not_found',
      data: null,
    });
    mockPermissionsService.getUserPermissions.mockResolvedValue([]);
  });

  afterEach(async () => {
    if (testRoot) {
      await act(async () => {
        testRoot!.unmount();
      });
      testRoot = null;
    }
    if (testContainer && testContainer.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
      testContainer = null;
    }

    recordedSnapshots.length = 0;
    capturedContext = null;
    authStateCallbacks.length = 0;

    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}

    vi.clearAllMocks();
  });

  // =========================================================================
  // GRUPO A: RESOLUÇÃO INICIAL
  // =========================================================================
  describe('Grupo A: Resolução Inicial', () => {
    it('A1: Ausência de sessão realiza transição loading -> unauthenticated com limpeza total de identidade', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await renderAuthProvider();
      await flushAsyncTasks();

      expect(recordedSnapshots.length).toBeGreaterThanOrEqual(1);
      const initialSnapshot = recordedSnapshots[0];
      expect(initialSnapshot.loading).toBe(true);
      expect(initialSnapshot.resolutionState).toBe('loading');

      const finalSnapshot = recordedSnapshots[recordedSnapshots.length - 1];
      expect(finalSnapshot.loading).toBe(false);
      expect(finalSnapshot.resolutionState).toBe('unauthenticated');
      expect(finalSnapshot.user).toBeNull();
      expect(finalSnapshot.session).toBeNull();
      expect(finalSnapshot.profile).toBeNull();
      expect(finalSnapshot.organizationId).toBeNull();
      expect(finalSnapshot.role).toBeNull();
      expect(finalSnapshot.permissions).toEqual([]);
    });

    it('A2: Sessão válida com perfil ativo, vínculo institucional e permissões transita para authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: fixtureSession },
        error: null,
      });

      mockUsersService.getProfile.mockResolvedValueOnce({
        status: 'active',
        data: {
          id: fixtureUser.id,
          name: 'Gestora Oficial',
          email: fixtureUser.email!,
          organization_id: 'org-alfa',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      });

      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: {
          type: 'organization',
          role: 'gestor',
          organization_id: 'org-alfa',
        },
      });

      mockPermissionsService.getUserPermissions.mockResolvedValueOnce([
        'manage_users',
        'view_reports',
      ]);

      await renderAuthProvider();
      await flushAsyncTasks();

      const finalSnapshot = recordedSnapshots[recordedSnapshots.length - 1];
      expect(finalSnapshot.loading).toBe(false);
      expect(finalSnapshot.resolutionState).toBe('authenticated');
      expect(finalSnapshot.user?.id).toBe(fixtureUser.id);
      expect(finalSnapshot.session?.access_token).toBe(fixtureSession.access_token);
      expect(finalSnapshot.role).toBe('gestor');
      expect(finalSnapshot.organizationId).toBe('org-alfa');
      expect(finalSnapshot.permissions).toEqual(['manage_users', 'view_reports']);
      expect(finalSnapshot.profile?.name).toBe('Gestora Oficial');
      expect(finalSnapshot.errorMessage).toBeNull();
    });

    it('A3: Falha na aquisição de sessão pelo Supabase Auth transita para recoverable_error', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Timeout ao consultar sessão remota no Supabase Auth' },
      });

      await renderAuthProvider();
      await flushAsyncTasks();

      const finalSnapshot = recordedSnapshots[recordedSnapshots.length - 1];
      expect(finalSnapshot.loading).toBe(false);
      expect(finalSnapshot.resolutionState).toBe('recoverable_error');
      expect(finalSnapshot.errorMessage).toBe('Timeout ao consultar sessão remota no Supabase Auth');
      expect(finalSnapshot.user).toBeNull();
      expect(finalSnapshot.session).toBeNull();
    });

    it('A4: Usuário sem perfil cadastrado em public.profiles transita para no_membership', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: fixtureSession },
        error: null,
      });

      mockUsersService.getProfile.mockResolvedValueOnce({
        status: 'not_found',
        data: null,
        errorMessage: 'Perfil não localizado na tabela public.profiles.',
      });

      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'not_found',
        data: null,
      });

      await renderAuthProvider();
      await flushAsyncTasks();

      const finalSnapshot = recordedSnapshots[recordedSnapshots.length - 1];
      expect(finalSnapshot.loading).toBe(false);
      expect(finalSnapshot.resolutionState).toBe('no_membership');
      expect(finalSnapshot.profile).toBeNull();
      expect(finalSnapshot.role).toBeNull();
    });

    it('A5: Vínculo institucional inativo transita para inactive_membership', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: fixtureSession },
        error: null,
      });

      mockUsersService.getProfile.mockResolvedValueOnce({
        status: 'active',
        data: {
          id: fixtureUser.id,
          name: 'Docente Desativado',
          email: fixtureUser.email!,
        },
      });

      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'inactive',
        data: null,
        errorMessage: 'Vínculo institucional inativo para a organização.',
      });

      await renderAuthProvider();
      await flushAsyncTasks();

      const finalSnapshot = recordedSnapshots[recordedSnapshots.length - 1];
      expect(finalSnapshot.loading).toBe(false);
      expect(finalSnapshot.resolutionState).toBe('inactive_membership');
      expect(finalSnapshot.membershipStatus).toBe('inactive');
      expect(finalSnapshot.role).toBeNull();
    });

    it('A6: Contexto ambíguo de múltiplos vínculos sem seleção transita para ambiguous_context', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: fixtureSession },
        error: null,
      });

      mockUsersService.getProfile.mockResolvedValueOnce({
        status: 'active',
        data: {
          id: fixtureUser.id,
          name: 'Gestor Multiescolas',
          email: fixtureUser.email!,
        },
      });

      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'ambiguous',
        data: null,
        errorMessage: 'Múltiplos vínculos institucionais ativos localizados.',
      });

      await renderAuthProvider();
      await flushAsyncTasks();

      const finalSnapshot = recordedSnapshots[recordedSnapshots.length - 1];
      expect(finalSnapshot.loading).toBe(false);
      expect(finalSnapshot.resolutionState).toBe('ambiguous_context');
      expect(finalSnapshot.membershipStatus).toBe('ambiguous');
    });

    it('A7: Bloqueio RLS / permissão negada transita para permission_denied', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: fixtureSession },
        error: null,
      });

      mockUsersService.getProfile.mockResolvedValueOnce({
        status: 'permission_denied',
        data: null,
      });

      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'docente', organization_id: 'org-alfa' },
      });

      await renderAuthProvider();
      await flushAsyncTasks();

      const finalSnapshot = recordedSnapshots[recordedSnapshots.length - 1];
      expect(finalSnapshot.loading).toBe(false);
      expect(finalSnapshot.resolutionState).toBe('permission_denied');
      expect(finalSnapshot.errorMessage).toContain('RLS/Permissão');
    });
  });

  // =========================================================================
  // GRUPO B: CONCORRÊNCIA E OPERAÇÕES SUBSTITUÍDAS (SUPERSEDED)
  // =========================================================================
  describe('Grupo B: Concorrência e Operações Substituídas (Superseded)', () => {
    it('B1: Operação lenta que resolve após nova operação não sobrescreve estado mais recente e retorna superseded', async () => {
      // Inicia deslogado
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await renderAuthProvider();
      await flushAsyncTasks();
      expect(capturedContext!.resolutionState).toBe('unauthenticated');

      // Cria operação lenta 1 (deferred)
      const deferredProfile1 = createDeferred<any>();
      const deferredMembership1 = createDeferred<any>();

      mockUsersService.getProfile.mockReturnValueOnce(deferredProfile1.promise);
      mockUsersService.getUserMembership.mockReturnValueOnce(deferredMembership1.promise);

      let resultOp1Promise: Promise<any>;
      act(() => {
        // Dispara Op 1
        resultOp1Promise = capturedContext!.refreshProfile(fixtureSession);
      });

      // Enquanto Op 1 está pendente, dispara Op 2 com resolução imediata
      mockUsersService.getProfile.mockResolvedValueOnce({
        status: 'active',
        data: {
          id: fixtureUser.id,
          name: 'Gestor Operação 2',
          email: fixtureUser.email!,
        },
      });
      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'gestor', organization_id: 'org-op2' },
      });
      mockPermissionsService.getUserPermissions.mockResolvedValueOnce(['admin_full']);

      let resultOp2: any;
      await act(async () => {
        resultOp2 = await capturedContext!.refreshProfile(fixtureSession);
      });

      expect(resultOp2.status).toBe('resolved');
      expect(capturedContext!.resolutionState).toBe('authenticated');
      expect(capturedContext!.organizationId).toBe('org-op2');
      expect(capturedContext!.profile?.name).toBe('Gestor Operação 2');

      // Agora resolve tardiamente a Op 1 com dados conflitantes
      await act(async () => {
        deferredProfile1.resolve({
          status: 'active',
          data: {
            id: fixtureUser.id,
            name: 'Gestor Desatualizado Op 1',
            email: fixtureUser.email!,
          },
        });
        deferredMembership1.resolve({
          status: 'active',
          data: { type: 'organization', role: 'docente', organization_id: 'org-op1-antiga' },
        });
      });

      const resultOp1 = await resultOp1Promise!;
      expect(resultOp1.status).toBe('superseded');

      // O estado do Provider DEVE permanecer intocado pela Op 1
      expect(capturedContext!.resolutionState).toBe('authenticated');
      expect(capturedContext!.organizationId).toBe('org-op2');
      expect(capturedContext!.profile?.name).toBe('Gestor Operação 2');
      expect(capturedContext!.role).toBe('gestor');
    });

    it('B2: Tarefas assíncronas agendadas são canceladas e descartadas na desmontagem do componente', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await renderAuthProvider();
      await flushAsyncTasks();

      // Emite evento via listener para disparar scheduleAuthTask
      act(() => {
        authStateCallbacks.forEach((cb) => cb('TOKEN_REFRESHED', fixtureSession));
      });

      // Desmonta imediatamente antes do flush dos timers
      await act(async () => {
        testRoot!.unmount();
        testRoot = null;
      });

      // Avança o timer
      await flushAsyncTasks(50);

      // Nenhuma chamada a UsersService deve ter ocorrido após desmontagem
      expect(mockUsersService.getProfile).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // GRUPO C: LOGIN E COORDENAÇÃO COM SIGNED_IN
  // =========================================================================
  describe('Grupo C: Login e Coordenação com SIGNED_IN', () => {
    it('C1: Login bem-sucedido com resolução completa retorna { error: null } e authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await renderAuthProvider();
      await flushAsyncTasks();

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: fixtureSession, user: fixtureUser },
        error: null,
      });

      mockUsersService.getProfile.mockResolvedValueOnce({
        status: 'active',
        data: { id: fixtureUser.id, name: 'Gestor Login', email: fixtureUser.email! },
      });
      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'gestor', organization_id: 'org-login' },
      });
      mockPermissionsService.getUserPermissions.mockResolvedValueOnce(['perm_dashboard']);

      let loginResult: any;
      await act(async () => {
        loginResult = await capturedContext!.login('gestor@classium.edu.br', 'senha_forte_123');
      });

      expect(loginResult).toEqual({ error: null });
      expect(capturedContext!.resolutionState).toBe('authenticated');
      expect(capturedContext!.user?.id).toBe(fixtureUser.id);
      expect(capturedContext!.organizationId).toBe('org-login');
      expect(capturedContext!.loading).toBe(false);
    });

    it('C2: Coordenação de SIGNED_IN durante login ativo reconcilia observedSession sem corrida duplicada', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await renderAuthProvider();
      await flushAsyncTasks();

      // Durante o signInWithPassword, o listener emite SIGNED_IN
      mockSupabase.auth.signInWithPassword.mockImplementationOnce(async () => {
        authStateCallbacks.forEach((cb) => cb('SIGNED_IN', fixtureSession));
        return {
          data: { session: fixtureSession, user: fixtureUser },
          error: null,
        };
      });

      mockUsersService.getProfile.mockResolvedValueOnce({
        status: 'active',
        data: { id: fixtureUser.id, name: 'Gestor Conciliação', email: fixtureUser.email! },
      });
      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'gestor', organization_id: 'org-concilia' },
      });
      mockPermissionsService.getUserPermissions.mockResolvedValueOnce(['*']);

      let loginResult: any;
      await act(async () => {
        loginResult = await capturedContext!.login('gestor@classium.edu.br', 'senha123');
      });

      expect(loginResult).toEqual({ error: null });
      expect(capturedContext!.resolutionState).toBe('authenticated');
      // Garante que o profile foi consultado uma única vez
      expect(mockUsersService.getProfile).toHaveBeenCalledTimes(1);
    });

    it('C3: Falha no signInWithPassword com retorno de erro tipado do SDK', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await renderAuthProvider();
      await flushAsyncTasks();

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      });

      let loginResult: any;
      await act(async () => {
        loginResult = await capturedContext!.login('incorreto@classium.edu.br', 'senha_errada');
      });

      expect(loginResult.error).toBeInstanceOf(Error);
      expect(loginResult.error.message).toContain('E-mail ou senha incorretos');
      expect(capturedContext!.resolutionState).toBe('unauthenticated');
      expect(capturedContext!.loading).toBe(false);
    });

    it('C4: Rejeição de promise no signInWithPassword transita para recoverable_error e retorna erro', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await renderAuthProvider();
      await flushAsyncTasks();

      mockSupabase.auth.signInWithPassword.mockRejectedValueOnce(
        new Error('Exceção inesperada de transporte')
      );

      let loginResult: any;
      await act(async () => {
        loginResult = await capturedContext!.login('teste@classium.edu.br', 'senha');
      });

      expect(loginResult.error).toBeInstanceOf(Error);
      expect(loginResult.error.message).toBe('Exceção inesperada de transporte');
      expect(capturedContext!.resolutionState).toBe('recoverable_error');
      expect(capturedContext!.errorMessage).toBe('Exceção inesperada de transporte');
      expect(capturedContext!.loading).toBe(false);
    });
  });

  // =========================================================================
  // GRUPO D: LOGOUT
  // =========================================================================
  describe('Grupo D: Logout', () => {
    it('D1: Logout realiza limpeza local imediata de identidade com loading false de forma síncrona', async () => {
      // Começa autenticado
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: fixtureSession },
        error: null,
      });
      mockUsersService.getProfile.mockResolvedValueOnce({
        status: 'active',
        data: { id: fixtureUser.id, name: 'Gestor Logout', email: fixtureUser.email! },
      });
      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'gestor', organization_id: 'org-logout' },
      });
      mockPermissionsService.getUserPermissions.mockResolvedValueOnce(['*']);

      await renderAuthProvider();
      await flushAsyncTasks();
      expect(capturedContext!.resolutionState).toBe('authenticated');

      // Configura signOut remoto com atraso para testar limpeza local imediata
      const deferredSignOut = createDeferred<{ error: any }>();
      mockSupabase.auth.signOut.mockReturnValueOnce(deferredSignOut.promise);

      let logoutPromise: Promise<void>;
      act(() => {
        logoutPromise = capturedContext!.logout();
      });

      // Imediatamente após chamar logout (antes do signOut remoto concluir):
      // A identidade local DEVE estar limpa e loading DEVE ser false
      expect(capturedContext!.user).toBeNull();
      expect(capturedContext!.session).toBeNull();
      expect(capturedContext!.profile).toBeNull();
      expect(capturedContext!.role).toBeNull();
      expect(capturedContext!.organizationId).toBeNull();
      expect(capturedContext!.resolutionState).toBe('unauthenticated');
      expect(capturedContext!.loading).toBe(false);

      // Agora resolve o signOut remoto
      await act(async () => {
        deferredSignOut.resolve({ error: null });
        await logoutPromise;
      });

      expect(capturedContext!.resolutionState).toBe('unauthenticated');
    });

    it('D2: Logout com falha no signOut remoto registra mensagem de erro sem reviver sessão local', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: fixtureSession },
        error: null,
      });
      mockUsersService.getProfile.mockResolvedValueOnce({
        status: 'active',
        data: { id: fixtureUser.id, name: 'Gestor Logout Falha', email: fixtureUser.email! },
      });
      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'gestor', organization_id: 'org-falha' },
      });
      mockPermissionsService.getUserPermissions.mockResolvedValueOnce([]);

      await renderAuthProvider();
      await flushAsyncTasks();

      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: { message: 'Erro de conectividade na revogação remota' },
      });

      await act(async () => {
        await capturedContext!.logout();
      });

      // Sessão local permanece deslogada
      expect(capturedContext!.user).toBeNull();
      expect(capturedContext!.session).toBeNull();
      expect(capturedContext!.resolutionState).toBe('unauthenticated');
      expect(capturedContext!.errorMessage).toContain('houve falha ao revogar sessão remota');
    });

    it('D3: Evento redundante SIGNED_OUT emitido pelo listener durante logout ativo é ignorado', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: fixtureSession },
        error: null,
      });
      mockUsersService.getProfile.mockResolvedValueOnce({
        status: 'active',
        data: { id: fixtureUser.id, name: 'Gestor Redundante', email: fixtureUser.email! },
      });
      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'gestor', organization_id: 'org-red' },
      });

      await renderAuthProvider();
      await flushAsyncTasks();

      // Mock signOut que dispara o evento SIGNED_OUT pelo listener enquanto está em andamento
      mockSupabase.auth.signOut.mockImplementationOnce(async () => {
        authStateCallbacks.forEach((cb) => cb('SIGNED_OUT', null));
        return { error: null };
      });

      await act(async () => {
        await capturedContext!.logout();
      });

      expect(capturedContext!.resolutionState).toBe('unauthenticated');
      expect(capturedContext!.user).toBeNull();
    });
  });

  // =========================================================================
  // GRUPO E: SELEÇÃO DE ORGANIZAÇÃO INSTITUCIONAL (setTargetOrganizationId)
  // =========================================================================
  describe('Grupo E: Seleção de Organização Institucional (setTargetOrganizationId)', () => {
    it('E1: Seleção de nova organização atualiza tenant, valida papel e permissões', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: fixtureSession },
        error: null,
      });
      mockUsersService.getProfile.mockResolvedValue({
        status: 'active',
        data: { id: fixtureUser.id, name: 'Gestor Multi', email: fixtureUser.email! },
      });
      // Vínculo inicial em org-1
      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'gestor', organization_id: 'org-1' },
      });
      mockPermissionsService.getUserPermissions.mockResolvedValueOnce(['admin_org_1']);

      await renderAuthProvider();
      await flushAsyncTasks();
      expect(capturedContext!.organizationId).toBe('org-1');

      // Prepara troca para org-2
      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'docente', organization_id: 'org-2' },
      });
      mockPermissionsService.getUserPermissions.mockResolvedValueOnce(['view_classes']);

      let resultTarget: any;
      await act(async () => {
        resultTarget = await capturedContext!.setTargetOrganizationId('org-2');
      });

      expect(resultTarget.status).toBe('resolved');
      expect(resultTarget.organizationId).toBe('org-2');
      expect(resultTarget.role).toBe('docente');
      expect(capturedContext!.organizationId).toBe('org-2');
      expect(capturedContext!.role).toBe('docente');
      expect(capturedContext!.permissions).toEqual(['view_classes']);
    });

    it('E2: Divergência de organização autorizada vs solicitada resulta em permission_denied com código TENANT_MISMATCH', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: fixtureSession },
        error: null,
      });
      mockUsersService.getProfile.mockResolvedValue({
        status: 'active',
        data: { id: fixtureUser.id, name: 'Usuário Mismatch', email: fixtureUser.email! },
      });
      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'docente', organization_id: 'org-original' },
      });
      mockPermissionsService.getUserPermissions.mockResolvedValueOnce([]);

      await renderAuthProvider();
      await flushAsyncTasks();

      // O usuário solicita org-alvo, mas o banco retorna vínculo vinculado a outra organização
      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'docente', organization_id: 'org-divergente' },
      });

      let resultMismatch: any;
      await act(async () => {
        resultMismatch = await capturedContext!.setTargetOrganizationId('org-solicitada');
      });

      expect(resultMismatch.status).toBe('failed');
      expect(resultMismatch.code).toBe('TENANT_MISMATCH');
      expect(capturedContext!.resolutionState).toBe('permission_denied');
      expect(capturedContext!.errorMessage).toContain('diverge da organização solicitada');
    });

    it('E3: Seleções concorrentes marcam a operação anterior como superseded', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: fixtureSession },
        error: null,
      });
      mockUsersService.getProfile.mockResolvedValue({
        status: 'active',
        data: { id: fixtureUser.id, name: 'Usuário Concorrente', email: fixtureUser.email! },
      });
      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'gestor', organization_id: 'org-base' },
      });
      mockPermissionsService.getUserPermissions.mockResolvedValue(['*']);

      await renderAuthProvider();
      await flushAsyncTasks();

      // Configura seleção 1 lenta (deferred)
      const deferredMembership1 = createDeferred<any>();
      mockUsersService.getUserMembership.mockReturnValueOnce(deferredMembership1.promise);

      let sel1Promise: Promise<any>;
      act(() => {
        sel1Promise = capturedContext!.setTargetOrganizationId('org-lenta');
      });

      // Enquanto seleção 1 está suspensa, dispara seleção 2 com resolução imediata
      mockUsersService.getUserMembership.mockResolvedValueOnce({
        status: 'active',
        data: { type: 'organization', role: 'docente', organization_id: 'org-rapida' },
      });

      let resultSel2: any;
      await act(async () => {
        resultSel2 = await capturedContext!.setTargetOrganizationId('org-rapida');
      });

      expect(resultSel2.status).toBe('resolved');
      expect(capturedContext!.organizationId).toBe('org-rapida');
      expect(capturedContext!.role).toBe('docente');

      // Agora resolve tardiamente a seleção 1
      await act(async () => {
        deferredMembership1.resolve({
          status: 'active',
          data: { type: 'organization', role: 'gestor', organization_id: 'org-lenta' },
        });
      });

      const resultSel1 = await sel1Promise!;
      expect(resultSel1.status).toBe('superseded');
      // Garante que a seleção 1 não sobrescreveu o tenant da seleção 2
      expect(capturedContext!.organizationId).toBe('org-rapida');
      expect(capturedContext!.role).toBe('docente');
    });
  });
});
