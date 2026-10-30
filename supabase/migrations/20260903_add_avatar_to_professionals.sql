-- ==============================================================================
-- MIGRATION: Adicionar coluna avatar na tabela professionals e recarregar PostgREST
-- ==============================================================================

-- Corrigir coluna ausente e forçar reload do schema cache do PostgREST
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS avatar TEXT;

NOTIFY pgrst, 'reload schema';
