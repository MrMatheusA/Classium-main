-- ==============================================================================
-- MIGRATION: 20260927_partner_members_revoke_direct_update.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- ETAPA: Etapa 2.10-J-B
-- OBJETIVO: Revogar o privilégio de UPDATE direto na tabela public.partner_members
--           para o papel authenticated, forçando o uso do fluxo controlado via RPC
--           public.admin_revoke_partner_member(UUID).
-- REGRAS:
--  - Revogar exclusivamente UPDATE ON public.partner_members FROM authenticated
--  - Manter SELECT e INSERT para authenticated intactos
--  - Manter service_role inalterado
--  - Manter RLS policies, triggers e RPC inalterados
--  - ZERO alteração em server.ts, frontend ou dados fictícios
-- ==============================================================================

-- 1. Revogar privilégio de UPDATE direto da role authenticated
REVOKE UPDATE ON public.partner_members FROM authenticated;

-- 2. Garantir permissões de leitura e inserção explícitas para a role authenticated
GRANT SELECT, INSERT ON public.partner_members TO authenticated;

-- 3. Notificar reload de schema no PostgREST
NOTIFY pgrst, 'reload schema';
