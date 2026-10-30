-- ==============================================================================
-- MIGRATION: 20260927_partners_delete_policy.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- FASE: Etapa 1 — Passo 1.3-O (Revisão Canônica)
-- OBJETIVO: Criar a política RLS de DELETE administrativo para public.partners
-- REGRAS:
--  - Multi-tenant derivado da autoridade canônica public.organization_members (role = 'gestor')
--  - Acesso global administrativo derivado de public.platform_members (role = 'admin')
--  - Role: authenticated
--  - Proteção Anti-IDOR e isolamento multi-tenant estrito
--  - Docente e Família sem permissão de DELETE
--  - Disparo automático da trigger trg_partners_audit_log
--  - NENHUM dado fake, mock ou seed
-- ==============================================================================

-- 1. Limpeza preventiva de política homônima (idempotência)
DROP POLICY IF EXISTS partners_delete_admin_same_organization ON public.partners;

-- 2. Criação da política de DELETE administrativo vinculada à autoridade canônica
CREATE POLICY partners_delete_admin_same_organization
ON public.partners
FOR DELETE
TO authenticated
USING (
    -- Administrador global da plataforma (acesso global irrestrito)
    EXISTS (
        SELECT 1
        FROM public.platform_members pm
        WHERE pm.user_id = auth.uid()
          AND pm.role = 'admin'
          AND pm.is_active = true
    )
    OR
    -- Gestor escolar ativo vinculado à mesma organização
    (
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'gestor'
              AND om.is_active = true
        )
    )
);

-- 3. Forçar recarregamento do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
