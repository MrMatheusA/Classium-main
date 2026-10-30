-- ==============================================================================
-- MIGRATION: 20260927_partners_rls_policies.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- FASE: Etapa 1 — Passo 1.3-C (Revisão Canônica)
-- OBJETIVO: Implementar isolamento RLS multi-tenant canônico para public.partners
-- REGRAS:
--  - Multi-tenant derivado da autoridade canônica public.organization_members
--  - Acesso global administrativo derivado de public.platform_members (role = 'admin')
--  - Roles abrangidas: authenticated
--  - Rejeição absoluta de acesso anônimo (anon)
--  - Zero USING (true) / Zero WITH CHECK (true)
--  - Nenhuma policy de UPDATE/DELETE (tratadas em migrations específicas)
--  - NENHUM dado fake, mock ou seed
-- ==============================================================================

-- 1. Assegurar ativação do Row Level Security
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- 2. Limpeza preventiva de políticas homônimas (idempotência)
DROP POLICY IF EXISTS partners_select_same_organization ON public.partners;
DROP POLICY IF EXISTS partners_insert_same_organization ON public.partners;

-- 3. Política de Leitura (SELECT): Leitura por membros da organização ou administrador global da plataforma
CREATE POLICY partners_select_same_organization
    ON public.partners
    FOR SELECT
    TO authenticated
    USING (
        -- Administrador global da plataforma (acesso irrestrito)
        EXISTS (
            SELECT 1
            FROM public.platform_members pm
            WHERE pm.user_id = auth.uid()
              AND pm.role = 'admin'
              AND pm.is_active = true
        )
        OR
        -- Membro ativo vinculado à mesma organização escolar
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.is_active = true
        )
    );

-- 4. Política de Inserção (INSERT): Criação por gestores da organização ou administrador global da plataforma
CREATE POLICY partners_insert_same_organization
    ON public.partners
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Administrador global da plataforma
        EXISTS (
            SELECT 1
            FROM public.platform_members pm
            WHERE pm.user_id = auth.uid()
              AND pm.role = 'admin'
              AND pm.is_active = true
        )
        OR
        -- Gestor escolar ativo inserindo exclusivamente para sua organização
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

-- 5. Forçar recarregamento do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
