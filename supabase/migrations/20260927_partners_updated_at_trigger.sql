-- ==============================================================================
-- MIGRATION: 20260927_partners_updated_at_trigger.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- FASE: Etapa 1 — Passo 1.1-C1
-- OBJETIVO: Trigger automática de updated_at para public.partners
-- REGRAS:
--  - Atualizar exclusivamente NEW.updated_at = now()
--  - NÃO alterar created_at ou qualquer outra coluna
--  - Executar BEFORE UPDATE em public.partners
--  - Idempotência rigorosa (DROP TRIGGER IF EXISTS + CREATE TRIGGER)
--  - ZERO alterações em outras tabelas (partner_ads, professionals, etc.)
--  - ZERO criação de dados, seeds, mocks ou policies RLS
--  - RLS mantido inalterado
-- ==============================================================================

-- 1. Função canônica segura e reutilizável para atualização de timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger BEFORE UPDATE exclusiva para a tabela public.partners
DROP TRIGGER IF EXISTS trg_partners_updated_at ON public.partners;

CREATE TRIGGER trg_partners_updated_at
    BEFORE UPDATE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 3. Recarregar catálogo PostgREST
NOTIFY pgrst, 'reload schema';
