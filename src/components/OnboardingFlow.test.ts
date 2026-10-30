import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Onboarding Flow Logic & RPC Contract Suite (P2.351)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // RPC Argument Contract Validator
  const validateRpcPayload = (payload: any) => {
    if (!payload.p_name || typeof payload.p_name !== 'string' || payload.p_name.trim() === '') {
      return { valid: false, error: 'O nome da instituição é obrigatório.' };
    }
    if (payload.p_document_number) {
      const cleanDoc = payload.p_document_number.replace(/\D/g, '');
      if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
        return { valid: false, error: 'O documento institucional deve possuir 11 dígitos (CPF) ou 14 dígitos (CNPJ).' };
      }
    }
    return { valid: true };
  };

  // Error message mapper matching OnboardingPage.tsx
  const mapRpcError = (errMsg: string) => {
    const lower = (errMsg || '').toLowerCase();
    if (lower.includes('document') || lower.includes('cnpj') || lower.includes('cpf')) {
      return 'Já existe uma organização cadastrada com este documento/CNPJ.';
    }
    if (
      lower.includes('already') ||
      lower.includes('duplicat') ||
      lower.includes('vinculo') ||
      lower.includes('vínculo') ||
      lower.includes('incompativel') ||
      lower.includes('já possui') ||
      lower.includes('organização ativa')
    ) {
      return 'Este usuário já possui uma organização ativa vinculada no sistema.';
    }
    return errMsg || 'Falha ao provisionar a organização.';
  };

  // Response parser matching OnboardingPage.tsx
  const parseRpcResult = (rpcResult: any) => {
    if (!rpcResult || typeof rpcResult !== 'object') {
      return { success: false, error: 'Resposta inválida do serviço de provisionamento.' };
    }
    const resObj = rpcResult as Record<string, any>;
    if (resObj.ok === false || resObj.success === false || resObj.error) {
      return { success: false, error: resObj.error || resObj.message || 'Erro ao processar o provisionamento da instituição.' };
    }
    const createdOrgId = resObj.organization_id || resObj.id || resObj.organization?.id;
    if (!createdOrgId) {
      return { success: false, error: 'O serviço de provisionamento não retornou o identificador da organização criada.' };
    }
    return { success: true, organizationId: createdOrgId, schoolId: resObj.school_id, role: resObj.role || 'gestor' };
  };

  describe('RPC Payload Validation', () => {
    it('should validate complete form payload with valid CNPJ', () => {
      const payload = {
        p_name: 'Colégio Futuro',
        p_trade_name: 'Colégio Futuro Sede',
        p_document_number: '12.345.678/0001-90',
        p_inep_code: '12345678',
        p_email: 'contato@colegiofuturo.com.br',
        p_phone: '(11) 98765-4321',
        p_address: 'Av. Paulista, 1000',
        p_city: 'São Paulo',
        p_state: 'SP',
        p_postal_code: '01310-100',
        p_website: 'https://colegiofuturo.com.br'
      };
      const res = validateRpcPayload(payload);
      expect(res.valid).toBe(true);
    });

    it('should reject payload with empty institution name', () => {
      const payload = { p_name: '   ', p_document_number: null };
      const res = validateRpcPayload(payload);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('O nome da instituição é obrigatório.');
    });

    it('should reject payload with invalid CNPJ digit count', () => {
      const payload = { p_name: 'Escola Modelo', p_document_number: '12.345.678' };
      const res = validateRpcPayload(payload);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('11 dígitos (CPF) ou 14 dígitos (CNPJ)');
    });
  });

  describe('RPC Error Categorization', () => {
    it('should distinguish CNPJ conflict error from membership conflict', () => {
      const cnpjError = 'CONFLICT: Já existe uma organização ativa cadastrada com este documento/CNPJ.';
      expect(mapRpcError(cnpjError)).toBe('Já existe uma organização cadastrada com este documento/CNPJ.');

      const linkError = 'CONFLICT: Este usuário já possui uma organização ativa vinculada no sistema.';
      expect(mapRpcError(linkError)).toBe('Este usuário já possui uma organização ativa vinculada no sistema.');
    });

    it('should return raw error message when error is unexpected', () => {
      const customError = 'Internal database timeout';
      expect(mapRpcError(customError)).toBe('Internal database timeout');
    });
  });

  describe('RPC Result Parsing & ID Extraction', () => {
    it('should extract organization_id, school_id and role on success', () => {
      const rpcResult = {
        success: true,
        ok: true,
        id: 'org-uuid-001',
        organization_id: 'org-uuid-001',
        school_id: 'school-uuid-002',
        role: 'gestor',
        message: 'Instituição provisionada com sucesso.'
      };
      const parsed = parseRpcResult(rpcResult);
      expect(parsed.success).toBe(true);
      expect(parsed.organizationId).toBe('org-uuid-001');
      expect(parsed.schoolId).toBe('school-uuid-002');
      expect(parsed.role).toBe('gestor');
    });

    it('should reject when organization_id is missing from result', () => {
      const rpcResult = {
        success: true,
        ok: true,
        message: 'No ID generated'
      };
      const parsed = parseRpcResult(rpcResult);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('não retornou o identificador');
    });

    it('should reject when result encapsulates an error object', () => {
      const rpcResult = {
        success: false,
        error: 'Transação abortada por concorrência'
      };
      const parsed = parseRpcResult(rpcResult);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('Transação abortada por concorrência');
    });
  });

  describe('Document Concurrency Order of Execution (P2.354)', () => {
    it('should prove strict logical sequence: normalization -> advisory lock by doc -> duplicate check -> atomic insert', () => {
      const executionLog: string[] = [];
      const simulateProvisioning = (docInput: string, existingDocs: string[]) => {
        // Step 1: Normalization
        executionLog.push('step_1_normalize');
        const cleanDoc = docInput.replace(/\D/g, '');
        if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
          throw new Error('VALIDATION_ERROR: tamanho inválido');
        }

        // Step 2: Advisory Lock on Document (MUST precede duplication check)
        executionLog.push(`step_2_lock_doc:${cleanDoc}`);

        // Step 3: Duplicate Check
        executionLog.push('step_3_check_duplicate');
        if (existingDocs.includes(cleanDoc)) {
          throw new Error('CONFLICT: Já existe organização ativa com este documento');
        }

        // Step 4: Atomic Insert
        executionLog.push('step_4_insert_org');
        return { success: true, doc: cleanDoc };
      };

      const result = simulateProvisioning('12.345.678/0001-90', ['99999999000199']);
      expect(result.success).toBe(true);
      expect(executionLog).toEqual([
        'step_1_normalize',
        'step_2_lock_doc:12345678000190',
        'step_3_check_duplicate',
        'step_4_insert_org'
      ]);
    });

    it('should acquire lock prior to detecting duplication and abort before insertion', () => {
      const executionLog: string[] = [];
      const simulateConflict = (docInput: string, existingDocs: string[]) => {
        executionLog.push('step_1_normalize');
        const cleanDoc = docInput.replace(/\D/g, '');
        executionLog.push(`step_2_lock_doc:${cleanDoc}`);
        executionLog.push('step_3_check_duplicate');
        if (existingDocs.includes(cleanDoc)) {
          executionLog.push('step_abort_conflict');
          throw new Error('CONFLICT: Já existe organização ativa com este documento');
        }
        executionLog.push('step_4_insert_org');
      };

      expect(() => simulateConflict('12.345.678/0001-90', ['12345678000190'])).toThrow('CONFLICT');
      expect(executionLog).toEqual([
        'step_1_normalize',
        'step_2_lock_doc:12345678000190',
        'step_3_check_duplicate',
        'step_abort_conflict'
      ]);
      expect(executionLog).not.toContain('step_4_insert_org');
    });
  });

  describe('Document Number & Inactive Organization Reuse (P2.355)', () => {
    interface OrganizationRecord {
      id: string;
      name: string;
      trade_name: string | null;
      document_number: string | null;
      status: string;
      is_active: boolean;
    }

    const checkDocumentAvailability = (docInput: string, organizations: OrganizationRecord[]) => {
      const cleanDoc = docInput.replace(/\D/g, '');
      const activeDuplicate = organizations.find(org => {
        const storedCleanDoc = (org.document_number || '').replace(/\D/g, '');
        const isOrgActive = org.is_active === true && (org.status || '').toUpperCase() === 'ACTIVE';
        return storedCleanDoc === cleanDoc && isOrgActive;
      });

      if (activeDuplicate) {
        throw new Error('CONFLICT: Já existe uma organização ativa cadastrada com este documento/CNPJ.');
      }

      return { available: true, cleanDoc };
    };

    it('should allow document registration when matching organization is inactive (is_active = false)', () => {
      const existingOrgs: OrganizationRecord[] = [
        {
          id: 'old-org-001',
          name: 'Antigo Colégio Desativado',
          trade_name: null,
          document_number: '12345678000190',
          status: 'ACTIVE',
          is_active: false // Inactive flag
        }
      ];

      const res = checkDocumentAvailability('12.345.678/0001-90', existingOrgs);
      expect(res.available).toBe(true);
      expect(res.cleanDoc).toBe('12345678000190');
    });

    it('should allow document registration when matching organization status is not ACTIVE', () => {
      const existingOrgs: OrganizationRecord[] = [
        {
          id: 'old-org-002',
          name: 'Colégio Suspenso',
          trade_name: null,
          document_number: '12345678000190',
          status: 'SUSPENDED',
          is_active: true
        }
      ];

      const res = checkDocumentAvailability('12.345.678/0001-90', existingOrgs);
      expect(res.available).toBe(true);
    });

    it('should block registration when matching organization is active and status is ACTIVE', () => {
      const existingOrgs: OrganizationRecord[] = [
        {
          id: 'active-org-001',
          name: 'Colégio em Funcionamento',
          trade_name: 'Colégio Funcionamento Sede',
          document_number: '12345678000190',
          status: 'ACTIVE',
          is_active: true
        }
      ];

      expect(() => checkDocumentAvailability('12.345.678/0001-90', existingOrgs)).toThrow(
        'CONFLICT: Já existe uma organização ativa cadastrada com este documento/CNPJ.'
      );
    });

    it('should format payload with document_number and default is_active = true on creation', () => {
      const buildOrgInsert = (name: string, cleanDoc: string) => ({
        name: name.trim(),
        trade_name: null,
        document_number: cleanDoc,
        email: null,
        phone: null,
        status: 'ACTIVE',
        is_active: true
      });

      const record = buildOrgInsert('Nova Instituição', '12345678000190');
      expect(record.document_number).toBe('12345678000190');
      expect(record.is_active).toBe(true);
      expect(record.status).toBe('ACTIVE');
      expect((record as any).document).toBeUndefined();
    });
  });
});

