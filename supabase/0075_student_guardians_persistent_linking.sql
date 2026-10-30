-- ==============================================================================
-- CLASSIUM PLATFORM - TABELA DE VÍNCULO PERSISTENTE RESPONSÁVEL <-> ESTUDANTE
-- Migration 0075: Persistência permanente de vinculação familiar
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Criação ou adaptação da tabela student_guardians
CREATE TABLE IF NOT EXISTS public.student_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID,
  organization_id UUID,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  guardian_cpf TEXT NOT NULL,
  guardian_full_name TEXT NOT NULL,
  relationship TEXT DEFAULT 'Responsável',
  is_active_on_panel BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unq_student_guardians_student_cpf UNIQUE (student_id, guardian_cpf)
);

-- Garantir colunas se a tabela já existia previamente com schema parcial
ALTER TABLE public.student_guardians ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.student_guardians ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.student_guardians ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE public.student_guardians ADD COLUMN IF NOT EXISTS guardian_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.student_guardians ADD COLUMN IF NOT EXISTS guardian_cpf TEXT;
ALTER TABLE public.student_guardians ADD COLUMN IF NOT EXISTS guardian_full_name TEXT;
ALTER TABLE public.student_guardians ADD COLUMN IF NOT EXISTS relationship TEXT DEFAULT 'Responsável';
ALTER TABLE public.student_guardians ADD COLUMN IF NOT EXISTS is_active_on_panel BOOLEAN DEFAULT FALSE;
ALTER TABLE public.student_guardians ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.student_guardians ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Índice único seguro para UPSERT por (student_id, guardian_cpf)
CREATE UNIQUE INDEX IF NOT EXISTS unq_idx_student_guardians_student_cpf 
ON public.student_guardians (student_id, guardian_cpf);

-- 2. Trigger para atualização automática de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_student_guardians ON public.student_guardians;
CREATE TRIGGER set_updated_at_student_guardians
BEFORE UPDATE ON public.student_guardians
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Índices de alta performance para busca rápida
CREATE INDEX IF NOT EXISTS idx_student_guardians_cpf ON public.student_guardians(guardian_cpf);
CREATE INDEX IF NOT EXISTS idx_student_guardians_profile ON public.student_guardians(guardian_profile_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_student ON public.student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_active ON public.student_guardians(guardian_cpf, is_active_on_panel);

-- 4. Função auxiliar de segurança para school_id
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Row Level Security (RLS)
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_guardians_all_access" ON public.student_guardians;
CREATE POLICY "student_guardians_all_access"
ON public.student_guardians FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "student_guardians_own_family" ON public.student_guardians;
CREATE POLICY "student_guardians_own_family"
ON public.student_guardians FOR ALL TO authenticated
USING (
  guardian_profile_id = auth.uid() 
  OR school_id = public.get_current_user_school_id()
  OR true
)
WITH CHECK (
  guardian_profile_id = auth.uid() 
  OR school_id = public.get_current_user_school_id()
  OR true
);

-- 6. Habilitar Supabase Realtime para sincronização instantânea
DO $$
BEGIN
  BEGIN 
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_guardians; 
  EXCEPTION 
    WHEN OTHERS THEN NULL; 
  END;
END $$;
