import { supabase } from '../lib/supabase';

// ==============================================================================
// CANONICAL PARTNER INTERFACES (Mapped to PostgreSQL public.partners)
// ==============================================================================

export type PartnerStatus = 
  | 'draft' 
  | 'pending' 
  | 'active' 
  | 'suspended' 
  | 'cancelled' 
  | 'inactive';

export type PartnerApprovalStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'in_review';

export type PartnerDocumentType = 'CPF' | 'CNPJ';

export interface CanonicalPartner {
  id: string;
  organization_id: string | null;
  partner_name: string;
  legal_name: string | null;
  document_type: PartnerDocumentType | null;
  document_number: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  category: string | null;
  plan_id: string | null;
  status: PartnerStatus;
  approval_status: PartnerApprovalStatus;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Payload for POST /api/partners/onboarding
export interface CreatePartnerPayload {
  partner_name: string;
  legal_name?: string | null;
  document_type?: PartnerDocumentType | null;
  document_number?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  category?: string | null;
  plan_id?: string | null;
  metadata?: Record<string, any>;
}

// Payload for PUT /api/partners/:id (Cadastral fields only)
export interface UpdatePartnerPayload {
  partner_name?: string;
  legal_name?: string | null;
  document_type?: PartnerDocumentType | null;
  document_number?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  category?: string | null;
  plan_id?: string | null;
  metadata?: Record<string, any>;
}

// Payload for PATCH /api/partners/:id/approval (Administrative fields)
export interface UpdatePartnerApprovalPayload {
  approval_status?: PartnerApprovalStatus;
  status?: PartnerStatus;
  is_active?: boolean;
}

export interface DeletePartnerResponse {
  id: string;
  partner_name: string;
  deleted_at: string;
}

// ==============================================================================
// STRUCTURED SERVICE ERROR
// ==============================================================================

export class PartnerServiceError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(message: string, status: number, code: string, details?: any) {
    super(message);
    this.name = 'PartnerServiceError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ==============================================================================
// INTERNAL HELPERS
// ==============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id);
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else if (typeof window !== 'undefined') {
      const rawStored = localStorage.getItem('educa_plus_supabase_auth_token') || localStorage.getItem('sb-access-token');
      if (rawStored) {
        try {
          const parsed = JSON.parse(rawStored);
          const token = parsed?.access_token || parsed?.currentSession?.access_token;
          if (typeof token === 'string' && token.length > 10) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        } catch (_) {
          if (typeof rawStored === 'string' && rawStored.length > 10) {
            headers['Authorization'] = `Bearer ${rawStored}`;
          }
        }
      }
    }
  } catch (err) {
    // If session acquisition fails, request proceeds
  }

  return headers;
}

async function handleApiResponse<T>(res: Response): Promise<T> {
  let responseBody: any = null;
  try {
    responseBody = await res.json();
  } catch (e) {
    responseBody = null;
  }

  if (!res.ok) {
    const status = res.status;
    const errorCode = responseBody?.error?.code || mapStatusToDefaultCode(status);
    const errorMessage = responseBody?.error?.message || responseBody?.message || getDefaultErrorMessage(status);
    throw new PartnerServiceError(errorMessage, status, errorCode, responseBody?.error);
  }

  // Expect { success: true, data: ... }
  if (responseBody && typeof responseBody === 'object' && 'data' in responseBody) {
    return responseBody.data as T;
  }

  return responseBody as T;
}

function mapStatusToDefaultCode(status: number): string {
  switch (status) {
    case 400: return 'VALIDATION_ERROR';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    default: return 'SERVER_ERROR';
  }
}

function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400: return 'Parâmetros da requisição inválidos.';
    case 401: return 'Sessão expirada ou não autenticada. Faça login novamente.';
    case 403: return 'Acesso negado. Você não possui permissão para esta operação.';
    case 404: return 'Parceiro não encontrado.';
    case 409: return 'Conflito de dados: registro já existente.';
    case 500: return 'Erro interno no servidor ao processar a operação.';
    default: return `Erro na comunicação com o servidor (HTTP ${status}).`;
  }
}

// ==============================================================================
// CANONICAL PARTNER SERVICE
// ==============================================================================

export const PartnerService = {
  /**
   * POST /api/partners/onboarding
   * Creates a new partner record with initial pending/draft state.
   * Organization is derived strictly from the authenticated profile on the server.
   */
  async createPartner(payload: CreatePartnerPayload): Promise<CanonicalPartner> {
    if (!payload || !payload.partner_name || !payload.partner_name.trim()) {
      throw new PartnerServiceError('O nome do parceiro é obrigatório.', 400, 'VALIDATION_ERROR');
    }

    const headers = await getAuthHeaders();
    const res = await fetch('/api/partners/onboarding', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    return handleApiResponse<CanonicalPartner>(res);
  },

  /**
   * GET /api/partners
   * Lists all partners belonging to the authenticated user's organization.
   * Returns empty array if no partners exist.
   */
  async listPartners(): Promise<CanonicalPartner[]> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/partners', {
      method: 'GET',
      headers
    });

    const data = await handleApiResponse<CanonicalPartner[]>(res);
    return Array.isArray(data) ? data : [];
  },

  /**
   * GET /api/partners/:id
   * Retrieves a single partner by UUID strictly scoped to the user's organization.
   */
  async getPartnerById(id: string): Promise<CanonicalPartner> {
    if (!isValidUUID(id)) {
      throw new PartnerServiceError('ID do parceiro deve ser um UUID válido.', 400, 'INVALID_PARTNER_ID');
    }

    const headers = await getAuthHeaders();
    const res = await fetch(`/api/partners/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers
    });

    return handleApiResponse<CanonicalPartner>(res);
  },

  /**
   * PUT /api/partners/:id
   * Updates only cadastral fields of an existing partner in the user's organization.
   */
  async updatePartner(id: string, payload: UpdatePartnerPayload): Promise<CanonicalPartner> {
    if (!isValidUUID(id)) {
      throw new PartnerServiceError('ID do parceiro deve ser um UUID válido.', 400, 'INVALID_PARTNER_ID');
    }

    if (!payload || Object.keys(payload).length === 0) {
      throw new PartnerServiceError('Payload de atualização não pode ser vazio.', 400, 'EMPTY_UPDATE_PAYLOAD');
    }

    const headers = await getAuthHeaders();
    const res = await fetch(`/api/partners/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });

    return handleApiResponse<CanonicalPartner>(res);
  },

  /**
   * PATCH /api/partners/:id/approval
   * Administrative route to moderate approval status, activation and lifecycle state.
   */
  async updatePartnerApproval(id: string, payload: UpdatePartnerApprovalPayload): Promise<CanonicalPartner> {
    if (!isValidUUID(id)) {
      throw new PartnerServiceError('ID do parceiro deve ser um UUID válido.', 400, 'INVALID_PARTNER_ID');
    }

    if (!payload || Object.keys(payload).length === 0) {
      throw new PartnerServiceError('Payload de aprovação não pode ser vazio.', 400, 'EMPTY_APPROVAL_PAYLOAD');
    }

    const headers = await getAuthHeaders();
    const res = await fetch(`/api/partners/${encodeURIComponent(id)}/approval`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload)
    });

    return handleApiResponse<CanonicalPartner>(res);
  },

  /**
   * DELETE /api/partners/:id
   * Deletes a partner record with strict administrative authorization and audit log capture.
   */
  async deletePartner(id: string): Promise<DeletePartnerResponse> {
    if (!isValidUUID(id)) {
      throw new PartnerServiceError('ID do parceiro deve ser um UUID válido.', 400, 'INVALID_PARTNER_ID');
    }

    const headers = await getAuthHeaders();
    const res = await fetch(`/api/partners/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers
    });

    return handleApiResponse<DeletePartnerResponse>(res);
  }
};
