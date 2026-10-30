import React, { createContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { AuthContextType, UserProfile, School, UserRole, AuthResolutionResult } from '../types/auth';
import { UsersService, MembershipStatus, ProfileStatus } from '../services/users.service';
import { PermissionsService } from '../services/permissions.service';

export type ResolutionState =
  | 'loading'
  | 'unauthenticated'
  | 'authenticated'
  | 'no_membership'
  | 'inactive_membership'
  | 'ambiguous_context'
  | 'permission_denied'
  | 'recoverable_error';

export type { AuthResolutionResult };

/**
 * Extensão do contrato de autenticação para expor o tenant canônico (organizationId),
 * o estado de resolução explícito (resolutionState), status detalhados e métodos
 * aguardáveis com contrato explícito tipado de resolução.
 * Mantém total compatibilidade com AuthContextType de src/types/auth.ts.
 */
export interface ExtendedAuthContextType extends AuthContextType {
  organizationId: string | null;
  resolutionState: ResolutionState;
  membershipStatus: MembershipStatus | null;
  profileStatus: ProfileStatus | null;
  errorMessage: string | null;
  refreshProfile: (
    currentSession?: Session | null,
    explicitTargetOrgId?: string | null
  ) => Promise<AuthResolutionResult>;
  setTargetOrganizationId: (orgId: string | null) => Promise<AuthResolutionResult>;
}

export const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

interface InFlightLoginState {
  opId: number;
  opGen: number;
  email: string;
  observedSession: Session | null;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados canônicos C1
  const [resolutionState, setResolutionState] = useState<ResolutionState>('loading');
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [targetOrgId, setTargetOrgId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('classium_target_org_id') || null;
    } catch {
      return null;
    }
  });

  // 1. Rastreamento de montagem / desmontagem do componente
  const isMountedRef = useRef<boolean>(true);

  // 2. Geração do ciclo de vida do efeito (React StrictMode setup/cleanup tracking)
  const effectGenRef = useRef<number>(0);

  // 3. Mecanismo de propriedade única da operação corrente (monotônico)
  const operationCounterRef = useRef<number>(0);
  const activeOpIdRef = useRef<number>(0);

  // 4. Rastreamento e reconciliação de login ativo com eventos do listener
  const inFlightLoginRef = useRef<InFlightLoginState | null>(null);
  const inFlightLogoutOpIdRef = useRef<number | null>(null);

  // 5. Tarefa agendada do listener (para cancelamento pontual e rastreamento centralizado)
  const scheduledAuthTaskRef = useRef<any>(null);

  // 6. Ref do targetOrgId para manter callbacks estáveis
  const targetOrgIdRef = useRef<string | null>(targetOrgId);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    targetOrgIdRef.current = targetOrgId;
  }, [targetOrgId]);

  /**
   * Registra e inicia uma nova operação como proprietária corrente.
   */
  const startOperation = useCallback((_type: string): number => {
    const nextId = ++operationCounterRef.current;
    activeOpIdRef.current = nextId;
    return nextId;
  }, []);

  /**
   * Avalia se uma operação específica permanece como proprietária ativa corrente.
   */
  const isOpCurrent = useCallback((opId: number, opGen: number): boolean => {
    return (
      isMountedRef.current &&
      effectGenRef.current === opGen &&
      activeOpIdRef.current === opId
    );
  }, []);

  /**
   * Centralização da limpeza de estado de autorização.
   * Evita exposição de perfil, papéis, tenant ou permissões residuais durante transições.
   */
  const clearAuthorizationState = useCallback(() => {
    setProfile(null);
    setSchool(null);
    setRole(null);
    setOrganizationId(null);
    setPermissions([]);
    setProfileStatus(null);
    setMembershipStatus(null);
    setErrorMessage(null);
  }, []);

  /**
   * Centralização da limpeza completa de identidade e autorização.
   */
  const clearIdentityAndAuthorization = useCallback(() => {
    setUser(null);
    setSession(null);
    clearAuthorizationState();
  }, [clearAuthorizationState]);

  /**
   * Centralização do cancelamento da tarefa agendada assíncrona.
   */
  const cancelScheduledAuthTask = useCallback(() => {
    if (scheduledAuthTaskRef.current !== null) {
      clearTimeout(scheduledAuthTaskRef.current);
      scheduledAuthTaskRef.current = null;
    }
  }, []);

  /**
   * Centralização do agendamento de tarefas assíncronas com rastreamento e captura de erros.
   */
  const scheduleAuthTask = useCallback(
    (opId: number, opGen: number, taskFn: () => Promise<void>) => {
      cancelScheduledAuthTask();
      scheduledAuthTaskRef.current = setTimeout(() => {
        scheduledAuthTaskRef.current = null;
        if (!isOpCurrent(opId, opGen)) {
          return;
        }
        taskFn().catch((taskErr) => {
          console.error('[AuthProvider] Erro em tarefa agendada de autenticação:', taskErr);
        });
      }, 0);
    },
    [cancelScheduledAuthTask, isOpCurrent]
  );

  /**
   * Limpeza estritamente condicional do rastreamento de login.
   * Garante que uma operação antiga nunca limpe o rastreamento de uma operação posterior.
   */
  const getAndClearInFlightLogin = useCallback((opId: number, opGen: number): Session | null => {
    const current = inFlightLoginRef.current;
    if (current && current.opId === opId && current.opGen === opGen) {
      inFlightLoginRef.current = null;
      return current.observedSession;
    }
    return null;
  }, []);

  /**
   * Função interna de resolução de sessão, autorização e tenant institucional.
   * Recebe explicitamente a propriedade do chamador (opId e opGen capturados).
   * Não expõe parentOpId para os consumidores públicos.
   */
  const resolveSessionAndMembership = useCallback(
    async (
      opId: number,
      opGen: number,
      sessionOverride?: Session | null,
      explicitTargetOrgId?: string | null
    ): Promise<AuthResolutionResult> => {
      if (!isOpCurrent(opId, opGen)) {
        return { status: 'superseded', reason: 'Operação cancelada antes de iniciar resolução' };
      }

      // Transição imediata: ativa loading e limpa dados de autorização prévios
      setLoading(true);
      setResolutionState('loading');
      clearAuthorizationState();

      try {
        let targetSession: Session | null = null;

        // 1. Limpeza explícita intencional de sessão
        if (sessionOverride === null) {
          if (!isOpCurrent(opId, opGen)) {
            return { status: 'superseded', reason: 'Limpeza de sessão substituída' };
          }
          clearIdentityAndAuthorization();
          setResolutionState('unauthenticated');
          setLoading(false);
          return { status: 'unauthenticated', userId: null, role: null, organizationId: null };
        }

        // 2. Consulta de sessão se omitida
        if (sessionOverride === undefined) {
          if (!isOpCurrent(opId, opGen)) {
            return { status: 'superseded', reason: 'Obtenção de sessão substituída antes de I/O' };
          }

          try {
            const { data: { session: fetchedSession }, error: sessionError } = await supabase.auth.getSession();

            if (!isOpCurrent(opId, opGen)) {
              return { status: 'superseded', reason: 'Obtenção de sessão substituída após getSession' };
            }

            if (sessionError) {
              console.warn('[AuthProvider] Erro ao obter sessão corrente no Supabase:', sessionError.message);
              clearIdentityAndAuthorization();
              setResolutionState('recoverable_error');
              setErrorMessage(sessionError.message);
              setLoading(false);
              return {
                status: 'failed',
                error: sessionError.message,
                code: 'SESSION_ACQUISITION_ERROR',
              };
            }

            targetSession = fetchedSession;
          } catch (sessionErr: any) {
            if (!isOpCurrent(opId, opGen)) {
              return { status: 'superseded', reason: 'Obtenção de sessão substituída no catch' };
            }
            const errMsg = sessionErr?.message || 'Falha de comunicação ao obter sessão do Supabase.';
            clearIdentityAndAuthorization();
            setResolutionState('recoverable_error');
            setErrorMessage(errMsg);
            setLoading(false);
            return {
              status: 'failed',
              error: errMsg,
              code: 'SESSION_ACQUISITION_ERROR',
            };
          }
        } else {
          targetSession = sessionOverride;
        }

        // 3. Sessão ausente / Não autenticado
        if (!targetSession?.user?.id) {
          if (!isOpCurrent(opId, opGen)) {
            return { status: 'superseded', reason: 'Operação não autenticada substituída' };
          }
          clearIdentityAndAuthorization();
          setResolutionState('unauthenticated');
          setLoading(false);
          return { status: 'unauthenticated', userId: null, role: null, organizationId: null };
        }

        const authUser = targetSession.user;
        const userId = authUser.id;
        const effectiveTargetOrg = explicitTargetOrgId !== undefined ? explicitTargetOrgId : targetOrgIdRef.current;

        // Atualiza a identidade da sessão se coerente
        setUser(authUser);
        setSession(targetSession);

        if (!isOpCurrent(opId, opGen)) {
          return { status: 'superseded', reason: 'Operação substituída antes das consultas de perfil' };
        }

        // 4. Consulta de perfil e vínculo no banco canônico
        const [profileRes, membershipRes] = await Promise.all([
          UsersService.getProfile(userId),
          UsersService.getUserMembership(userId, effectiveTargetOrg),
        ]);

        if (!isOpCurrent(opId, opGen)) {
          return { status: 'superseded', reason: 'Operação substituída durante consultas de perfil/vínculo' };
        }

        // Token emitido no futuro (desalinhamento de relógio)
        if (profileRes.errorCode === 'JWT_FUTURE' || membershipRes.errorCode === 'JWT_FUTURE') {
          if (!isOpCurrent(opId, opGen)) {
            return { status: 'superseded', reason: 'Operação substituída na validação de token' };
          }
          clearIdentityAndAuthorization();
          setResolutionState('unauthenticated');
          setLoading(false);
          return { status: 'failed', error: 'Token JWT inválido (emitido no futuro)', code: 'JWT_FUTURE' };
        }

        // 5. Falha transitória de infraestrutura / rede / timeout
        const isTransient =
          profileRes.status === 'network_error' ||
          profileRes.status === 'unexpected_error' ||
          membershipRes.status === 'network_error' ||
          membershipRes.status === 'unexpected_error';

        if (isTransient) {
          const errMsg =
            profileRes.errorMessage ||
            membershipRes.errorMessage ||
            'Instabilidade temporária na resolução de autorização. Tente novamente em instantes.';
          console.warn(
            `[AuthProvider] Falha transitória ao validar autorização (profile: ${profileRes.status}, membership: ${membershipRes.status}):`,
            errMsg
          );
          if (!isOpCurrent(opId, opGen)) {
            return { status: 'superseded', reason: 'Operação substituída no tratamento de falha transitória' };
          }
          setUser(authUser);
          setSession(targetSession);
          setProfileStatus(profileRes.status);
          setMembershipStatus(membershipRes.status);
          setResolutionState('recoverable_error');
          setErrorMessage(errMsg);
          setLoading(false);
          return { status: 'failed', error: errMsg, code: 'TRANSIENT_ERROR' };
        }

        // 6. Bloqueio por RLS / Permissões
        if (profileRes.status === 'permission_denied' || membershipRes.status === 'permission_denied') {
          if (!isOpCurrent(opId, opGen)) {
            return { status: 'superseded', reason: 'Operação substituída no bloqueio de permissão' };
          }
          setUser(authUser);
          setSession(targetSession);
          setProfileStatus(profileRes.status);
          setMembershipStatus(membershipRes.status);
          setResolutionState('permission_denied');
          setErrorMessage('Acesso bloqueado por diretivas de segurança (RLS/Permissão).');
          setLoading(false);
          return { status: 'failed', error: 'Acesso bloqueado por diretivas de segurança (RLS/Permissão).', code: 'PERMISSION_DENIED' };
        }

        // 7. Contexto ambíguo (múltiplos vínculos sem organização selecionada)
        if (membershipRes.status === 'ambiguous') {
          const ambigMsg =
            membershipRes.errorMessage ||
            'Múltiplos vínculos institucionais ativos localizados. Selecione a organização desejada.';
          if (!isOpCurrent(opId, opGen)) {
            return { status: 'superseded', reason: 'Operação substituída no contexto ambíguo' };
          }
          setUser(authUser);
          setSession(targetSession);
          setProfileStatus(profileRes.status);
          setMembershipStatus(membershipRes.status);
          setResolutionState('ambiguous_context');
          setErrorMessage(ambigMsg);
          setLoading(false);
          return { status: 'failed', error: ambigMsg, code: 'AMBIGUOUS_CONTEXT' };
        }

        // 8. Perfil ou vínculo inativo
        if (profileRes.status === 'inactive' || membershipRes.status === 'inactive') {
          console.warn(
            `[AuthProvider] Perfil ou vínculo inativo para ${userId} (${authUser.email}). Profile: ${profileRes.status}, Membership: ${membershipRes.status}`
          );
          const inactMsg =
            profileRes.status === 'inactive'
              ? 'Seu perfil de usuário está inativo no sistema.'
              : 'Seu acesso institucional está inativo para a organização.';
          if (!isOpCurrent(opId, opGen)) {
            return { status: 'superseded', reason: 'Operação substituída no vínculo inativo' };
          }
          setUser(authUser);
          setSession(targetSession);
          setProfileStatus(profileRes.status);
          setMembershipStatus(membershipRes.status);
          setResolutionState('inactive_membership');
          setErrorMessage(inactMsg);
          setLoading(false);
          return { status: 'failed', error: inactMsg, code: 'INACTIVE_MEMBERSHIP' };
        }

        // 9. Ausência comprovada de perfil ou vínculo
        if (
          profileRes.status === 'not_found' ||
          !profileRes.data ||
          membershipRes.status === 'not_found' ||
          !membershipRes.data
        ) {
          if (!isOpCurrent(opId, opGen)) {
            return { status: 'superseded', reason: 'Operação substituída na ausência de vínculo' };
          }
          setUser(authUser);
          setSession(targetSession);
          setProfileStatus(profileRes.status);
          setMembershipStatus(membershipRes.status);
          setResolutionState('no_membership');
          setErrorMessage('Nenhum vínculo institucional ativo localizado para este usuário.');
          setLoading(false);
          return { status: 'failed', error: 'Nenhum vínculo institucional ativo localizado para este usuário.', code: 'NO_MEMBERSHIP' };
        }

        // 10. Validação do tenant solicitado (preservando administrador de plataforma sem alvo)
        const authorizedOrgId = membershipRes.data.organization_id;
        const authorizedRole = membershipRes.data.role;

        if (effectiveTargetOrg !== null && effectiveTargetOrg !== undefined) {
          if (authorizedOrgId !== effectiveTargetOrg) {
            const mismatchError = `Acesso negado: a organização autorizada (${authorizedOrgId || 'nenhuma'}) diverge da organização solicitada (${effectiveTargetOrg}).`;
            console.warn('[AuthProvider]', mismatchError);
            if (!isOpCurrent(opId, opGen)) {
              return { status: 'superseded', reason: 'Operação substituída na divergência de tenant' };
            }
            setUser(authUser);
            setSession(targetSession);
            setProfileStatus(profileRes.status);
            setMembershipStatus(membershipRes.status);
            setResolutionState('permission_denied');
            setErrorMessage(mismatchError);
            setLoading(false);
            return {
              status: 'failed',
              error: mismatchError,
              code: 'TENANT_MISMATCH',
            };
          }
        }

        if (!isOpCurrent(opId, opGen)) {
          return { status: 'superseded', reason: 'Operação substituída antes da consulta de permissões' };
        }

        // 11. Consulta de permissões granulares com tratamento explícito de falhas
        let userPermissions: string[] = [];
        try {
          userPermissions = (await PermissionsService.getUserPermissions(userId)) || [];
        } catch (permErr: any) {
          if (!isOpCurrent(opId, opGen)) {
            return { status: 'superseded', reason: 'Operação substituída na falha de permissões' };
          }
          console.error('[AuthProvider] Falha inesperada ao obter permissões do usuário:', permErr);
          setUser(authUser);
          setSession(targetSession);
          setProfileStatus(profileRes.status);
          setMembershipStatus(membershipRes.status);
          setResolutionState('recoverable_error');
          const permErrMsg = permErr?.message || 'Falha ao validar permissões do usuário.';
          setErrorMessage(permErrMsg);
          setLoading(false);
          return {
            status: 'failed',
            error: permErrMsg,
            code: 'PERMISSIONS_RESOLUTION_FAILED',
          };
        }

        if (!isOpCurrent(opId, opGen)) {
          return { status: 'superseded', reason: 'Operação substituída antes da publicação final' };
        }

        // 12. Publicação Atômica do Contexto Autenticado e Conclusão de Loading
        setUser(authUser);
        setSession(targetSession);
        setProfile({
          ...profileRes.data,
          email: authUser.email || profileRes.data.email || '',
        });
        setRole(authorizedRole);
        setOrganizationId(authorizedOrgId);
        setSchool(null);
        setPermissions(userPermissions);
        setProfileStatus(profileRes.status);
        setMembershipStatus(membershipRes.status);
        setResolutionState('authenticated');
        setErrorMessage(null);
        setLoading(false);

        return {
          status: 'resolved',
          userId,
          role: authorizedRole,
          organizationId: authorizedOrgId,
          schoolId: null,
        };
      } catch (error: any) {
        if (!isOpCurrent(opId, opGen)) {
          return { status: 'superseded', reason: 'Operação substituída no bloco de exceção' };
        }
        console.error('[AuthProvider] Erro ao carregar perfil/vínculo do usuário:', error);
        clearIdentityAndAuthorization();
        setResolutionState('recoverable_error');
        const errDesc = error?.message || 'Falha inesperada ao sincronizar credenciais.';
        setErrorMessage(errDesc);
        setLoading(false);
        return { status: 'failed', error: errDesc, code: 'UNEXPECTED_ERROR' };
      }
    },
    [clearAuthorizationState, clearIdentityAndAuthorization, isOpCurrent]
  );

  /**
   * Resolução canônica pública de autorização, perfil e tenant institucional.
   * Sempre adquire uma operação nova.
   */
  const refreshProfile = useCallback(
    async (
      sessionOverride?: Session | null,
      explicitTargetOrgId?: string | null
    ): Promise<AuthResolutionResult> => {
      const opGen = effectGenRef.current;
      const opId = startOperation('refreshProfile');
      return resolveSessionAndMembership(opId, opGen, sessionOverride, explicitTargetOrgId);
    },
    [resolveSessionAndMembership, startOperation]
  );

  /**
   * Altera a organização-alvo reutilizando a propriedade da operação corrente.
   */
  const setTargetOrganizationId = useCallback(
    async (orgId: string | null): Promise<AuthResolutionResult> => {
      const opGen = effectGenRef.current;
      const opId = startOperation('target_org');

      try {
        if (orgId) {
          sessionStorage.setItem('classium_target_org_id', orgId);
        } else {
          sessionStorage.removeItem('classium_target_org_id');
        }
      } catch {}

      targetOrgIdRef.current = orgId;
      setTargetOrgId(orgId);

      // Reutiliza a propriedade interna da operação corrente ao invocar resolveSessionAndMembership
      const result = await resolveSessionAndMembership(opId, opGen, undefined, orgId);

      if (!isOpCurrent(opId, opGen)) {
        return { status: 'superseded', reason: 'Seleção de organização substituída por ação posterior' };
      }

      return result;
    },
    [isOpCurrent, resolveSessionAndMembership, startOperation]
  );

  useEffect(() => {
    const thisEffectGen = ++effectGenRef.current;
    const initOpId = startOperation('init');

    // Transição síncrona na montagem/inicialização
    setLoading(true);
    setResolutionState('loading');
    clearAuthorizationState();

    // 1. Obtenção inicial de sessão do Supabase Auth
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!isOpCurrent(initOpId, thisEffectGen)) {
        return;
      }

      if (error) {
        console.warn('[AuthProvider] Erro ao obter sessão inicial do Supabase:', error.message);
        clearIdentityAndAuthorization();
        setResolutionState('recoverable_error');
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (initialSession?.user?.id) {
        // Reutiliza initOpId como proprietário da resolução interna
        resolveSessionAndMembership(initOpId, thisEffectGen, initialSession, targetOrgIdRef.current);
      } else {
        clearIdentityAndAuthorization();
        setResolutionState('unauthenticated');
        setLoading(false);
      }
    }).catch((err) => {
      if (!isOpCurrent(initOpId, thisEffectGen)) {
        return;
      }
      console.warn('[AuthProvider] Exceção ao obter sessão inicial:', err);
      clearIdentityAndAuthorization();
      setResolutionState('recoverable_error');
      setErrorMessage(err?.message || 'Falha ao inicializar sessão.');
      setLoading(false);
    });

    // 2. Listener de eventos do Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMountedRef.current || effectGenRef.current !== thisEffectGen) return;

        // Coordenação do SIGNED_IN com tentativa de login em andamento
        if (event === 'SIGNED_IN') {
          const activeLogin = inFlightLoginRef.current;
          if (activeLogin && isOpCurrent(activeLogin.opId, activeLogin.opGen)) {
            // Registra a sessão observada no login ativo para reconciliação no retorno de signInWithPassword
            activeLogin.observedSession = newSession;
            return;
          }
        }

        // Se o evento decorre do logout ativo em andamento, o próprio método já gerencia a limpeza local
        if (event === 'SIGNED_OUT') {
          if (inFlightLogoutOpIdRef.current !== null && isOpCurrent(inFlightLogoutOpIdRef.current, thisEffectGen)) {
            return;
          }
        }

        // Momento síncrono da aquisição da operação pelo evento:
        // Inicia nova operação proprietária, ativa loading e limpa autorização imediatamente antes do agendamento
        const eventOpId = startOperation(`event_${event}`);
        setLoading(true);
        setResolutionState('loading');
        clearAuthorizationState();

        if (!newSession?.user?.id) {
          // Sessão nula: retira a identidade imediatamente
          setUser(null);
          setSession(null);
        }

        // Desacoplamento assíncrono fora do callback do SDK
        scheduleAuthTask(eventOpId, thisEffectGen, async () => {
          if (newSession?.user?.id) {
            await resolveSessionAndMembership(eventOpId, thisEffectGen, newSession, targetOrgIdRef.current);
          } else {
            // Sessão nula confirmada na execução da tarefa
            if (isOpCurrent(eventOpId, thisEffectGen)) {
              clearIdentityAndAuthorization();
              setResolutionState('unauthenticated');
              setLoading(false);
            }
          }
        });
      }
    );

    return () => {
      effectGenRef.current = ++effectGenRef.current;
      subscription.unsubscribe();
      cancelScheduledAuthTask();
    };
  }, [
    cancelScheduledAuthTask,
    clearAuthorizationState,
    clearIdentityAndAuthorization,
    isOpCurrent,
    resolveSessionAndMembership,
    scheduleAuthTask,
    startOperation,
  ]);

  /**
   * Autenticação com credenciais de login.
   * Não retorna sucesso baseado em descarte/substituição.
   * Retorna { error: null } somente quando a resolução de autorização for confirmada.
   */
  const login = async (email: string, password: string, _selectedTab?: string) => {
    const opGen = effectGenRef.current;
    const loginOpId = startOperation('login');
    const cleanEmail = email.trim().toLowerCase();

    // Transição síncrona imediata no início do login
    setLoading(true);
    setResolutionState('loading');
    clearAuthorizationState();

    inFlightLoginRef.current = { opId: loginOpId, opGen, email: cleanEmail, observedSession: null };

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!isOpCurrent(loginOpId, opGen)) {
        getAndClearInFlightLogin(loginOpId, opGen);
        return { error: new Error('Tentativa de autenticação substituída por ação mais recente.') };
      }

      // 1. Caminho de erro retornado por signInWithPassword
      if (error) {
        const observedSession = getAndClearInFlightLogin(loginOpId, opGen);

        let errorMsg = error.message;
        if (
          errorMsg.includes('Failed to fetch') ||
          errorMsg.toLowerCase().includes('fetch') ||
          errorMsg.includes('network') ||
          errorMsg.toLowerCase().includes('load failed')
        ) {
          errorMsg = 'Erro de rede ao conectar ao Supabase. Verifique sua conexão e tente novamente.';
        } else if (errorMsg.includes('Invalid login credentials')) {
          errorMsg = 'E-mail ou senha incorretos. Verifique suas credenciais.';
        }

        // Se uma sessão válida foi observada via evento mesmo com falha no retorno do método,
        // realiza transferência de propriedade para operação sucessora sem publicar loading: false
        if (observedSession?.user?.id) {
          const fallbackOpId = startOperation('login_fallback_event');
          setLoading(true);
          setResolutionState('loading');
          clearAuthorizationState();

          scheduleAuthTask(fallbackOpId, opGen, async () => {
            await resolveSessionAndMembership(fallbackOpId, opGen, observedSession, targetOrgIdRef.current);
          });

          // O login mantém seu erro explícito para o chamador da ação
          return { error: new Error(errorMsg) };
        }

        // Falha sem evento observável: estado terminal coerente e fim do carregamento
        clearIdentityAndAuthorization();
        setResolutionState('unauthenticated');
        setErrorMessage(errorMsg);
        setLoading(false);
        return { error: new Error(errorMsg) };
      }

      // 2. Caminho de resposta sem sessão ou usuário
      if (!data?.session || !data?.user) {
        const observedSession = getAndClearInFlightLogin(loginOpId, opGen);

        if (observedSession?.user?.id) {
          const fallbackOpId = startOperation('login_fallback_event');
          setLoading(true);
          setResolutionState('loading');
          clearAuthorizationState();

          scheduleAuthTask(fallbackOpId, opGen, async () => {
            await resolveSessionAndMembership(fallbackOpId, opGen, observedSession, targetOrgIdRef.current);
          });

          return { error: new Error('Sessão não retornada diretamente pelo serviço de autenticação.') };
        }

        clearIdentityAndAuthorization();
        setResolutionState('unauthenticated');
        setErrorMessage('Sessão não retornada pelo serviço de autenticação.');
        setLoading(false);
        return { error: new Error('Sessão não retornada pelo serviço de autenticação.') };
      }

      // 3. Caminho de sucesso do método signInWithPassword
      const observedSession = getAndClearInFlightLogin(loginOpId, opGen);

      // Regra explícita: divergência de usuário vs diferença de sessão do mesmo usuário
      // Nota técnica: Não tratamos tokens diferentes ou eventos emitidos como prova exclusiva da mesma ação;
      // não expomos tokens em logs nem persistimos credenciais sensíveis.
      if (observedSession?.user?.id && observedSession.user.id !== data.session.user.id) {
        // Divergência de usuário: sessão de outro usuário substitui a tentativa deste login
        const conflictOpId = startOperation('login_conflict_event');
        setLoading(true);
        setResolutionState('loading');
        clearAuthorizationState();

        scheduleAuthTask(conflictOpId, opGen, async () => {
          await resolveSessionAndMembership(conflictOpId, opGen, observedSession, targetOrgIdRef.current);
        });

        return { error: new Error('Autenticação substituída por sessão concorrente de outro usuário.') };
      }

      // Mesma identidade de usuário: se houver sessão observada com token distinto, resolve-se
      // o estado do stream de eventos atualizado; caso contrário, a sessão retornada diretamente
      const sessionToResolve = observedSession?.user?.id === data.session.user.id && observedSession?.access_token
        ? observedSession
        : data.session;

      // Executa a resolução interna reutilizando loginOpId como proprietário
      const resolution = await resolveSessionAndMembership(loginOpId, opGen, sessionToResolve, targetOrgIdRef.current);

      if (!isOpCurrent(loginOpId, opGen)) {
        return { error: new Error('Autenticação substituída por operação mais recente.') };
      }

      if (resolution.status === 'resolved') {
        return { error: null };
      }

      if (resolution.status === 'failed') {
        return { error: new Error(resolution.error || 'Falha na validação do perfil institucional.') };
      }

      if (resolution.status === 'superseded') {
        return { error: new Error('Resolução substituída antes da conclusão da autenticação.') };
      }

      return { error: new Error('Estado de autenticação não resolvido.') };
    } catch (err: any) {
      const observedSession = getAndClearInFlightLogin(loginOpId, opGen);

      if (!isOpCurrent(loginOpId, opGen)) {
        return { error: new Error('Tentativa de autenticação cancelada ou substituída.') };
      }

      const errorMsg = err?.message || 'Falha na autenticação';

      if (observedSession?.user?.id) {
        const fallbackOpId = startOperation('login_fallback_event');
        setLoading(true);
        setResolutionState('loading');
        clearAuthorizationState();

        scheduleAuthTask(fallbackOpId, opGen, async () => {
          await resolveSessionAndMembership(fallbackOpId, opGen, observedSession, targetOrgIdRef.current);
        });

        return { error: new Error(errorMsg) };
      }

      clearIdentityAndAuthorization();
      setResolutionState('recoverable_error');
      setErrorMessage(errorMsg);
      setLoading(false);
      return { error: new Error(errorMsg) };
    }
  };

  /**
   * Encerramento da sessão.
   * Realiza limpeza local imediata, encerra loading próprio e captura erro do signOut remoto.
   */
  const logout = async () => {
    const opGen = effectGenRef.current;
    const logoutOpId = startOperation('logout');
    inFlightLogoutOpIdRef.current = logoutOpId;

    // 1. Limpeza local imediata do contexto institucional e de autenticação
    try {
      sessionStorage.removeItem('classium_target_org_id');
    } catch {}
    targetOrgIdRef.current = null;
    setTargetOrgId(null);

    clearIdentityAndAuthorization();
    setResolutionState('unauthenticated');
    setLoading(false);

    // 2. Encerramento remoto no Supabase
    let remoteError: Error | null = null;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        remoteError = error;
        console.warn('[AuthProvider] Supabase signOut retornou erro na sessão remota:', error.message);
      }
    } catch (err: any) {
      remoteError = err;
      console.warn('[AuthProvider] Exceção ao executar signOut remoto no Supabase:', err);
    } finally {
      if (inFlightLogoutOpIdRef.current === logoutOpId) {
        inFlightLogoutOpIdRef.current = null;
      }
    }

    // 3. Proteger avisos tardios por geração e operação proprietária
    // Nota técnica: A proteção local contra publicação de avisos tardios impede mutação de estado obsoleto no cliente React,
    // mas não garante o cancelamento da requisição HTTP remota do signOut no servidor Supabase.
    if (!isOpCurrent(logoutOpId, opGen)) {
      return;
    }

    // 4. Distinção de limpeza local vs encerramento remoto
    if (remoteError) {
      setErrorMessage(`Sessão local encerrada, mas houve falha ao revogar sessão remota: ${remoteError.message}`);
    }
  };

  const value: ExtendedAuthContextType = {
    user,
    session,
    profile,
    school,
    role,
    organizationId,
    resolutionState,
    membershipStatus,
    profileStatus,
    errorMessage,
    setTargetOrganizationId,
    permissions,
    loading,
    login,
    logout,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
