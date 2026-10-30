-- ==============================================================================
-- MIGRATION: 20260927_partner_members_update_policy.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- ETAPA: Etapa 2.10-H
-- OBJETIVO: Implementação de RLS para alteração (UPDATE) em public.partner_members
-- REGRAS:
--  - Apenas para a role authenticated
--  - Administrador Global da Plataforma (platform_members.role = 'admin')
--  - Gestor da Organização (organization_members.role = 'gestor' no mesmo tenant)
--  - Validação de tenant de origem (USING) e destino (WITH CHECK)
--  - Idempotência rigorosa (DROP POLICY IF EXISTS + CREATE POLICY)
--  - ZERO alteração em outras tabelas, roles, RPCs ou backend
-- ==============================================================================

ALTER TABLE public.partner_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_members_update_authorized ON public.partner_members;

CREATE POLICY partner_members_update_authorized
    ON public.partner_members
    FOR UPDATE
    TO authenticated
    USING (
        -- 1. Administrador Global da Plataforma
        EXISTS (
            SELECT 1
            FROM public.platform_members pm
            WHERE pm.user_id = auth.uid()
              AND pm.role = 'admin'
              AND pm.is_active = true
        )
        OR
        -- 2. Gestor Escolar da mesma organização (linha de origem)
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'gestor'
              AND om.is_active = true
        )
    )
    WITH CHECK (
        -- 1. Administrador Global da Plataforma
        EXISTS (
            SELECT 1
            FROM public.platform_members pm
            WHERE pm.user_id = auth.uid()
              AND pm.role = 'admin'
              AND pm.is_active = true
        )
        OR
        -- 2. Gestor Escolar da mesma organização (novo estado)
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'gestor'
              AND om.is_active = true
        )
    );

NOTIFY pgrst, 'reload schema';
