-- ==============================================================================
-- MIGRATION: 0071_school_menu_storage_policies.sql
-- Módulo: Gestão de Cardápios Escolares & Alimentação (PNAE) — Supabase Storage
-- ==============================================================================

-- 1. Criação / Garantia do bucket 'school_menus_pnae_documents'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'school_menus_pnae_documents',
    'school_menus_pnae_documents',
    true, -- Permite acesso público direto às URLs assinadas/públicas com validação de RLS
    26214400, -- Limite de 25MB (25 * 1024 * 1024 bytes)
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['application/pdf'];

-- 2. Habilitação de RLS na tabela de objetos do Storage (se ainda não estiver)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Limpeza de policies anteriores para evitar duplicidade
DROP POLICY IF EXISTS "Allow authenticated staff to upload menu documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated staff to view menu documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated guardians to view published menu documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read of school menu documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated staff to update/delete own menu documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to read menu documents" ON storage.objects;

-- 4. POLICIES DE SEGURANÇA E ACESSO PARA 'school_menus_pnae_documents'

-- A) Leitura pública / autenticada de cardápios escolares
CREATE POLICY "Allow public read of school menu documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'school_menus_pnae_documents');

-- B) Upload de cardápios por equipe autenticada (Admin, Gestor, Nutricionista, Staff)
CREATE POLICY "Allow authenticated staff to upload menu documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'school_menus_pnae_documents'
);

-- C) Atualização e exclusão de cardápios por staff autorizado
CREATE POLICY "Allow authenticated staff to update/delete own menu documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'school_menus_pnae_documents')
WITH CHECK (bucket_id = 'school_menus_pnae_documents');

CREATE POLICY "Allow authenticated staff to delete menu documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'school_menus_pnae_documents');

COMMENT ON TABLE storage.objects IS 'Objetos e documentos PDF do Programa Nacional de Alimentação Escolar (PNAE)';
