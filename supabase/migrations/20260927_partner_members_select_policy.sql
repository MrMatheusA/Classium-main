-- ==============================================================================
-- MIGRATION: 20260927_partner_members_select_policy.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- ETAPA: Etapa 2.10-F
-- OBJETIVO: Implementar exclusivamente a política RLS de SELECT para public.partner_members
-- REGRAS:
--  - Administrador Global da Plataforma (platform_members.role = 'admin')
--  - Gestor da Organização (organization_members.role = 'gestor' no mesmo tenant)
--  - ZERO políticas para INSERT, UPDATE ou DELETE nesta etapa
--  - ZERO alteração em outras tabelas, RPCs, usuários ou papéis
-- ==============================================================================

ALTER TABLE public.partner_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_members_select_authorized ON public.partner_members;

CREATE POLICY partner_members_select_authorized
    ON public.partner_members
    FOR SELECT
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
        -- 2. Gestor Escolar da mesma organização
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'gestor'
              AND om.is_active = true
        )
    );

NOTIFY pgrst, 'reload schema';
