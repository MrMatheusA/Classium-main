import dotenv from 'dotenv';
import {
  resolveAcademicAuthContext,
  isValidUUID,
  type AcademicAuthContext,
  type AcademicAuthOptions
} from '../server/academicAuthContext.ts';

dotenv.config();

// ==============================================================================
// TEST SUITE: resolveAcademicAuthContext (P2.274.340)
// Validação Rigorosa da Implementação Real (Importada de server/academicAuthContext.ts)
// RBAC Fail-Closed, Isolamento Multi-Tenant e Garantia de Não Execução
// ==============================================================================

/**
 * Simulador de Handler de Rota Protegida:
 * Valida que nenhuma operação sensível é executada quando o contexto falha.
 */
async function simulateProtectedAction(
  auth: AcademicAuthContext,
  actionFn: () => Promise<any> | any
): Promise<{ executed: boolean; status: number; result?: any; error?: any }> {
  if (!auth.authenticated || auth.error) {
    return {
      executed: false,
      status: auth.error?.status || 401,
      error: auth.error
    };
  }
  const result = await actionFn();
  return {
    executed: true,
    status: 200,
    result
  };
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('TEST SUITE: resolveAcademicAuthContext (P2.274.340)');
  console.log('Exercitando a Implementação REAL importada de server/academicAuthContext.ts');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ ${testName} (OK)`);
      passed++;
    } else {
      console.error(`❌ ${testName} FALHOU! ${detail || ''}`);
    }
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 1: Header de autenticação ausente -> 401 UNAUTHORIZED
  // --------------------------------------------------------------------------
  {
    const auth = await resolveAcademicAuthContext({ headers: {} }, { requireAuth: true });
    let actionRun = false;
    const sim = await simulateProtectedAction(auth, () => { actionRun = true; });

    assert(
      !auth.authenticated &&
      auth.error?.code === 'UNAUTHORIZED' &&
      auth.error?.status === 401 &&
      !sim.executed &&
      !actionRun,
      'TEST 1: Header ausente -> 401 UNAUTHORIZED, operação NÃO executada'
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 2: Header malformado (sem "Bearer ") ou token vazio -> 401 UNAUTHORIZED
  // --------------------------------------------------------------------------
  {
    const authBasic = await resolveAcademicAuthContext({ headers: { authorization: 'Basic dXNlcjpwYXNz' } });
    const authEmpty = await resolveAcademicAuthContext({ headers: { authorization: 'Bearer   ' } });
    let actionRun = false;
    const sim = await simulateProtectedAction(authEmpty, () => { actionRun = true; });

    assert(
      !authBasic.authenticated && authBasic.error?.code === 'UNAUTHORIZED' &&
      !authEmpty.authenticated && authEmpty.error?.code === 'UNAUTHORIZED' &&
      !sim.executed && !actionRun,
      'TEST 2: Header malformado / token vazio -> 401 UNAUTHORIZED, operação NÃO executada'
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 3: Token inválido ou expirado -> 401 INVALID_TOKEN
  // --------------------------------------------------------------------------
  {
    const mockSb = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('JWT expired or invalid') })
      }
    };
    const auth = await resolveAcademicAuthContext(
      { headers: { authorization: 'Bearer token-invalido-123' } },
      { clientProvider: () => mockSb }
    );
    let actionRun = false;
    const sim = await simulateProtectedAction(auth, () => { actionRun = true; });

    assert(
      !auth.authenticated &&
      auth.error?.code === 'INVALID_TOKEN' &&
      auth.error?.status === 401 &&
      !sim.executed && !actionRun,
      'TEST 3: Token inválido/expirado -> 401 INVALID_TOKEN, operação NÃO executada'
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 4: Usuário sem vínculo ativo em organization_members -> 403 FORBIDDEN_NO_ORGANIZATION
  // --------------------------------------------------------------------------
  {
    const mockSb = {
      auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000001', email: 'user@teste.com' } }, error: null }) },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null }) }),
            maybeSingle: async () => ({ data: null }),
            then: (resolve: any) => resolve({ data: [], error: null })
          })
        })
      })
    };
    const auth = await resolveAcademicAuthContext(
      { headers: { authorization: 'Bearer token-valido' } },
      { clientProvider: () => mockSb }
    );
    let actionRun = false;
    const sim = await simulateProtectedAction(auth, () => { actionRun = true; });

    assert(
      !auth.authenticated &&
      auth.error?.code === 'FORBIDDEN_NO_ORGANIZATION' &&
      auth.error?.status === 403 &&
      !sim.executed && !actionRun,
      'TEST 4: Usuário sem vínculo ativo -> 403 FORBIDDEN_NO_ORGANIZATION, operação NÃO executada'
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 5: Papel 'gestor' canônico reconhecido e autorizado
  // --------------------------------------------------------------------------
  {
    const orgId = '11111111-1111-1111-1111-111111111111';
    const mockSb = {
      auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000002', email: 'gestor@escola.com' } }, error: null }) },
      from: (table: string) => ({
        select: () => ({
          eq: (col: string, val: string) => {
            if (table === 'platform_members') return { eq: () => ({ maybeSingle: async () => ({ data: null }) }) };
            if (table === 'profiles') return { maybeSingle: async () => ({ data: { id: val, full_name: 'Gestor Carlos' } }) };
            if (table === 'organization_members') {
              return {
                eq: () => ({
                  data: [{ id: 'm-1', organization_id: orgId, role: 'gestor', is_active: true }],
                  error: null
                })
              };
            }
            return { maybeSingle: async () => ({ data: null }) };
          }
        })
      })
    };
    const auth = await resolveAcademicAuthContext(
      { headers: { authorization: 'Bearer token-gestor' } },
      { requiredRoles: ['gestor'], clientProvider: () => mockSb }
    );
    let actionRun = false;
    const sim = await simulateProtectedAction(auth, () => { actionRun = true; return 'SAVED'; });

    assert(
      auth.authenticated &&
      auth.organizationId === orgId &&
      auth.role === 'gestor' &&
      auth.isGestor === true &&
      sim.executed && actionRun && sim.result === 'SAVED',
      'TEST 5: Papel gestor reconhecido e autorizado -> Operação executada com sucesso'
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 6: Sinônimos comprovados de gestor ('diretor', 'coordenador', 'administrador')
  // --------------------------------------------------------------------------
  {
    const orgId = '11111111-1111-1111-1111-111111111111';
    for (const roleSynonym of ['diretor', 'coordenador', 'administrador']) {
      const mockSb = {
        auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000003', email: 'dir@escola.com' } }, error: null }) },
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => {
                if (table === 'platform_members') return { maybeSingle: async () => ({ data: null }) };
                return {
                  data: [{ id: 'm-1', organization_id: orgId, role: roleSynonym, is_active: true }],
                  error: null
                };
              },
              maybeSingle: async () => ({ data: null })
            })
          })
        })
      };
      const auth = await resolveAcademicAuthContext(
        { headers: { authorization: 'Bearer token-dir' } },
        { requiredRoles: ['gestor'], clientProvider: () => mockSb }
      );
      assert(
        auth.authenticated && auth.role === 'gestor' && auth.isGestor === true,
        `TEST 6: Sinônimo "${roleSynonym}" normalizado com sucesso para "gestor"`
      );
    }
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 7: Papéis válidos de docente, família e aluno respeitando escopos
  // --------------------------------------------------------------------------
  {
    const orgId = '11111111-1111-1111-1111-111111111111';
    const testCases: Array<{ raw: string; expected: string; flag: string }> = [
      { raw: 'professor', expected: 'docente', flag: 'isDocente' },
      { raw: 'responsavel', expected: 'familia', flag: 'isFamilia' },
      { raw: 'estudante', expected: 'aluno', flag: 'aluno' }
    ];

    for (const tc of testCases) {
      const mockSb = {
        auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000004' } }, error: null }) },
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => {
                if (table === 'platform_members') return { maybeSingle: async () => ({ data: null }) };
                return {
                  data: [{ id: 'm-1', organization_id: orgId, role: tc.raw, is_active: true }],
                  error: null
                };
              },
              maybeSingle: async () => ({ data: null })
            })
          })
        })
      };
      const auth = await resolveAcademicAuthContext(
        { headers: { authorization: 'Bearer token-ok' } },
        { clientProvider: () => mockSb }
      );
      assert(
        auth.authenticated && auth.role === tc.expected && (auth as any)[tc.flag] !== false,
        `TEST 7: Papel "${tc.raw}" normalizado corretamente para "${tc.expected}"`
      );
    }
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 8 (CRÍTICO): Papel 'member' (default do banco) RECUSADO (FAIL-CLOSED)
  // --------------------------------------------------------------------------
  {
    const orgId = '11111111-1111-1111-1111-111111111111';
    const mockSb = {
      auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000005', email: 'member@escola.com' } }, error: null }) },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => {
              if (table === 'platform_members') return { maybeSingle: async () => ({ data: null }) };
              return {
                data: [{ id: 'm-1', organization_id: orgId, role: 'member', is_active: true }],
                error: null
              };
            },
            maybeSingle: async () => ({ data: null })
          })
        })
      })
    };
    const auth = await resolveAcademicAuthContext(
      { headers: { authorization: 'Bearer token-member' } },
      { clientProvider: () => mockSb }
    );
    let actionRun = false;
    const sim = await simulateProtectedAction(auth, () => { actionRun = true; });

    assert(
      !auth.authenticated &&
      auth.role === 'anon' &&
      auth.isGestor === false &&
      auth.error?.code === 'FORBIDDEN_ROLE' &&
      auth.error?.status === 403 &&
      !sim.executed && !actionRun,
      'TEST 8 (CRÍTICO): Papel "member" recusado via FAIL-CLOSED (ZERO elevação a gestor)'
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 9: Papéis desconhecidos/não catalogados recusados via FAIL-CLOSED
  // --------------------------------------------------------------------------
  {
    const orgId = '11111111-1111-1111-1111-111111111111';
    const unauthorizedRoles = ['secretaria', 'auxiliar', 'monitor', 'estagiario', 'visitante', ''];

    for (const badRole of unauthorizedRoles) {
      const mockSb = {
        auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000006' } }, error: null }) },
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => {
                if (table === 'platform_members') return { maybeSingle: async () => ({ data: null }) };
                return {
                  data: [{ id: 'm-1', organization_id: orgId, role: badRole, is_active: true }],
                  error: null
                };
              },
              maybeSingle: async () => ({ data: null })
            })
          })
        })
      };
      const auth = await resolveAcademicAuthContext(
        { headers: { authorization: 'Bearer token-bad' } },
        { clientProvider: () => mockSb }
      );
      let actionRun = false;
      const sim = await simulateProtectedAction(auth, () => { actionRun = true; });

      assert(
        !auth.authenticated &&
        auth.isGestor === false &&
        auth.error?.code === 'FORBIDDEN_ROLE' &&
        auth.error?.status === 403 &&
        !sim.executed && !actionRun,
        `TEST 9: Papel não catalogado "${badRole || 'vazio'}" recusado com HTTP 403`
      );
    }
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 10: Docente tentando acessar operação exclusiva de gestor -> 403 FORBIDDEN_ROLE
  // --------------------------------------------------------------------------
  {
    const orgId = '11111111-1111-1111-1111-111111111111';
    const mockSb = {
      auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000007', email: 'prof@escola.com' } }, error: null }) },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => {
              if (table === 'platform_members') return { maybeSingle: async () => ({ data: null }) };
              return {
                data: [{ id: 'm-1', organization_id: orgId, role: 'docente', is_active: true }],
                error: null
              };
            },
            maybeSingle: async () => ({ data: null })
          })
        })
      })
    };
    const auth = await resolveAcademicAuthContext(
      { headers: { authorization: 'Bearer token-prof' } },
      { requiredRoles: ['gestor'], clientProvider: () => mockSb }
    );
    let actionRun = false;
    const sim = await simulateProtectedAction(auth, () => { actionRun = true; });

    assert(
      !auth.authenticated &&
      auth.error?.code === 'FORBIDDEN_ROLE' &&
      auth.error?.status === 403 &&
      !sim.executed && !actionRun,
      'TEST 10: Docente tentando rota de gestor -> 403 FORBIDDEN_ROLE, operação NÃO executada'
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 11: Múltiplas organizações sem seleção -> 400 AMBIGUOUS_ORGANIZATION_CONTEXT
  // --------------------------------------------------------------------------
  {
    const mockSb = {
      auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000008' } }, error: null }) },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => {
              if (table === 'platform_members') return { maybeSingle: async () => ({ data: null }) };
              return {
                data: [
                  { id: 'm-1', organization_id: '11111111-1111-1111-1111-111111111111', role: 'docente', is_active: true },
                  { id: 'm-2', organization_id: '22222222-2222-2222-2222-222222222222', role: 'gestor', is_active: true }
                ],
                error: null
              };
            },
            maybeSingle: async () => ({ data: null })
          })
        })
      })
    };
    const auth = await resolveAcademicAuthContext(
      { headers: { authorization: 'Bearer token-multi' } },
      { clientProvider: () => mockSb }
    );
    let actionRun = false;
    const sim = await simulateProtectedAction(auth, () => { actionRun = true; });

    assert(
      !auth.authenticated &&
      auth.error?.code === 'AMBIGUOUS_ORGANIZATION_CONTEXT' &&
      auth.error?.status === 400 &&
      !sim.executed && !actionRun,
      'TEST 11: Múltiplas organizações sem header -> 400 AMBIGUOUS_ORGANIZATION_CONTEXT'
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 12: Múltiplas organizações com seleção explícita válida via header
  // --------------------------------------------------------------------------
  {
    const orgIdTarget = '22222222-2222-2222-2222-222222222222';
    const mockSb = {
      auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000008' } }, error: null }) },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => {
              if (table === 'platform_members') return { maybeSingle: async () => ({ data: null }) };
              return {
                data: [
                  { id: 'm-1', organization_id: '11111111-1111-1111-1111-111111111111', role: 'docente', is_active: true },
                  { id: 'm-2', organization_id: orgIdTarget, role: 'gestor', is_active: true }
                ],
                error: null
              };
            },
            maybeSingle: async () => ({ data: null })
          })
        })
      })
    };
    const auth = await resolveAcademicAuthContext(
      {
        headers: {
          authorization: 'Bearer token-multi',
          'x-organization-id': orgIdTarget
        }
      },
      { requiredRoles: ['gestor'], clientProvider: () => mockSb }
    );
    let actionRun = false;
    const sim = await simulateProtectedAction(auth, () => { actionRun = true; });

    assert(
      auth.authenticated &&
      auth.organizationId === orgIdTarget &&
      auth.role === 'gestor' &&
      auth.isGestor === true &&
      sim.executed && actionRun,
      'TEST 12: Múltiplas organizações com seleção explícita válida -> Autorizado no escopo alvo'
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 13: Tentativa de IDOR (organização não pertencente ao usuário) -> 403
  // --------------------------------------------------------------------------
  {
    const mockSb = {
      auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000009' } }, error: null }) },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => {
              if (table === 'platform_members') return { maybeSingle: async () => ({ data: null }) };
              return {
                data: [{ id: 'm-1', organization_id: '11111111-1111-1111-1111-111111111111', role: 'gestor', is_active: true }],
                error: null
              };
            },
            maybeSingle: async () => ({ data: null })
          })
        })
      })
    };
    const auth = await resolveAcademicAuthContext(
      {
        headers: {
          authorization: 'Bearer token-idor',
          'x-organization-id': '99999999-9999-9999-9999-999999999999' // Organização de outra escola
        }
      },
      { clientProvider: () => mockSb }
    );
    let actionRun = false;
    const sim = await simulateProtectedAction(auth, () => { actionRun = true; });

    assert(
      !auth.authenticated &&
      auth.error?.code === 'FORBIDDEN_ORGANIZATION_MISMATCH' &&
      auth.error?.status === 403 &&
      !sim.executed && !actionRun,
      'TEST 13: Tentativa de IDOR (org não pertencente) -> 403 FORBIDDEN_ORGANIZATION_MISMATCH'
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 14: Administrador de plataforma (platform_members) com allowAdminBypass
  // --------------------------------------------------------------------------
  {
    const mockSb = {
      auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000010', email: 'admin@classium.com' } }, error: null }) },
      from: (table: string) => ({
        select: () => {
          const builder = {
            eq: () => builder,
            maybeSingle: async () => {
              if (table === 'platform_members') {
                return { data: { id: 'pm-1', user_id: '00000000-0000-0000-0000-000000000010', role: 'admin', is_active: true } };
              }
              return { data: null };
            }
          };
          return builder;
        }
      })
    };
    const auth = await resolveAcademicAuthContext(
      {
        headers: {
          authorization: 'Bearer token-superadmin',
          'x-organization-id': '33333333-3333-3333-3333-333333333333'
        }
      },
      { allowAdminBypass: true, clientProvider: () => mockSb }
    );
    let actionRun = false;
    const sim = await simulateProtectedAction(auth, () => { actionRun = true; });

    assert(
      auth.authenticated &&
      auth.role === 'admin' &&
      auth.isAdmin === true &&
      auth.organizationId === '33333333-3333-3333-3333-333333333333' &&
      sim.executed && actionRun,
      'TEST 14: Platform admin com vínculo verificado em platform_members -> Tratado conforme contrato'
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 15: Falha interna de infraestrutura -> 500 AUTH_EXCEPTION
  // --------------------------------------------------------------------------
  {
    const mockSb = {
      auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000011' } }, error: null }) },
      from: () => ({
        select: () => ({
          eq: () => { throw new Error('Postgres connection pool exhausted'); }
        })
      })
    };
    const auth = await resolveAcademicAuthContext(
      { headers: { authorization: 'Bearer token-err' } },
      { clientProvider: () => mockSb }
    );
    let actionRun = false;
    const sim = await simulateProtectedAction(auth, () => { actionRun = true; });

    assert(
      !auth.authenticated &&
      auth.error?.code === 'AUTH_EXCEPTION' &&
      auth.error?.status === 500 &&
      !sim.executed && !actionRun,
      'TEST 15: Falha de infraestrutura -> 500 AUTH_EXCEPTION, operação NÃO executada'
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 16: Sanitização estrita de resposta (Zero vazamento de segredos)
  // --------------------------------------------------------------------------
  {
    const secretJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.segredo-critico.assinatura';
    const auth = await resolveAcademicAuthContext({ headers: { authorization: `Bearer ${secretJwt}` } });
    const errorStringified = JSON.stringify(auth.error || {});
    const leaksSecret = errorStringified.includes(secretJwt);
    const hasCleanError = Boolean(auth.error && auth.error.code && auth.error.message);

    assert(
      !leaksSecret && hasCleanError,
      'TEST 16: Sanitização de erros -> ZERO vazamento de JWT, credenciais ou detalhes sensíveis'
    );
  }

  console.log('\n======================================================================');
  console.log(`RESULTADO FINAL DA SUÍTE DE TESTES: ${passed}/${total} PASSARAM`);
  console.log('======================================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite();
