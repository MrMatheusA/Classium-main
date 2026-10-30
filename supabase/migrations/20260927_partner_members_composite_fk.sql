-- ==============================================================================
-- MIGRATION: 20260927_partner_members_composite_fk.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- ETAPA: Etapa 2.10-C
-- OBJETIVO: Implementar integridade Multi-Tenant declarativa no PostgreSQL
-- REGRAS:
--  - Adicionar CONSTRAINT uk_partners_id_organization UNIQUE (id, organization_id) em public.partners
--  - Remover FK simples partner_id -> partners(id) de public.partner_members
--  - Adicionar FK composta fk_partner_members_partner_organization em public.partner_members(partner_id, organization_id) REFERENCES public.partners(id, organization_id) ON DELETE CASCADE
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uk_partners_id_organization' 
          AND conrelid = 'public.partners'::regclass
    ) THEN
        ALTER TABLE public.partners 
        ADD CONSTRAINT uk_partners_id_organization UNIQUE (id, organization_id);
    END IF;
END $$;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = 'partner_members'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'partner_id'
          AND tc.constraint_name != 'fk_partner_members_partner_organization'
    ) LOOP
        EXECUTE 'ALTER TABLE public.partner_members DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_partner_members_partner_organization' 
          AND conrelid = 'public.partner_members'::regclass
    ) THEN
        ALTER TABLE public.partner_members
        ADD CONSTRAINT fk_partner_members_partner_organization
        FOREIGN KEY (partner_id, organization_id)
        REFERENCES public.partners (id, organization_id)
        ON DELETE CASCADE;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
