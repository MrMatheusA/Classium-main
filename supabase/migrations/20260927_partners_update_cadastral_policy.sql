-- ==============================================================================
-- MIGRATION: 20260927_partners_update_cadastral_policy.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- FASE: Etapa 1 — Passo 1.3-M (Revisão Canônica)
-- OBJETIVO: Criação controlada da policy de UPDATE cadastral para public.partners
-- REGRAS:
--  - Multi-tenant derivado da autoridade canônica public.organization_members (role = 'gestor')
--  - Acesso global administrativo derivado de public.platform_members (role = 'admin')
--  - Role: authenticated
--  - Combinação com os Column Privileges da Etapa 1.3-L
--  - Imutabilidade de tenant garantida por WITH CHECK
--  - Docente e Família sem permissão de UPDATE
--  - NENHUM dado fake, mock ou seed
-- ==============================================================================

-- 1. Limpeza preventiva de política homônima (idempotência)
DROP POLICY IF EXISTS partners_update_cadastral_same_organization ON public.partners;

-- 2. Criação da política de UPDATE cadastral vinculada à autoridade canônica
CREATE POLICY partners_update_cadastral_same_organization
    ON public.partners
    FOR UPDATE
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
    )
    WITH CHECK (
        -- Administrador global da plataforma (acesso global irrestrito)
        EXISTS (
            SELECT 1
            FROM public.platform_members pm
            WHERE pm.user_id = auth.uid()
              AND pm.role = 'admin'
              AND pm.is_active = true
        )
        OR
        -- Gestor escolar ativo mantendo o parceiro vinculado exclusivamente à sua organização
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
