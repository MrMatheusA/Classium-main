-- ============================================================================
-- CLASSIUM PORTAL DA FAMÍLIA: OPTIMIZATIONS, RESPONSIBLE LINKING & THEMES
-- SQL Migration Script
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA DE PREFERÊNCIAS DO USUÁRIO / FAMÍLIA (user_preferences)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_name TEXT NOT NULL DEFAULT 'padrao',
  font_scale TEXT DEFAULT 'normal',
  high_contrast BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_preferences_user_id_key UNIQUE (user_id)
);

-- Index for instant lookup by user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
DROP POLICY IF EXISTS "user_preferences_select_own" ON public.user_preferences;
CREATE POLICY "user_preferences_select_own"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_preferences_insert_own" ON public.user_preferences;
CREATE POLICY "user_preferences_insert_own"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_preferences_update_own" ON public.user_preferences;
CREATE POLICY "user_preferences_update_own"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. SUPABASE REALTIME CONFIGURATION
-- ----------------------------------------------------------------------------
-- Ensure Realtime is enabled for student_responsible_links and user_preferences
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.student_responsible_links;
    EXCEPTION WHEN OTHERS THEN
      -- Table might already be in publication
      NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;
    EXCEPTION WHEN OTHERS THEN
      -- Table might already be in publication
      NULL;
    END;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. FUNÇÃO RPC: VINCULAÇÃO FLEXÍVEL DE RESPONSÁVEL (CPF / NOME / AMBOS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_family_by_criteria(
  p_cpf TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_mode TEXT DEFAULT 'cpf' -- Options: 'cpf', 'name', 'both'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_clean_cpf TEXT;
  v_clean_name TEXT;
  v_guardian_id UUID;
  v_guardian_name TEXT;
  v_matches_count INT := 0;
  v_children JSONB := '[]'::jsonb;
  v_children_count INT := 0;
  v_rec RECORD;
BEGIN
  -- 1. Check current authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'UNAUTHORIZED',
      'message', 'Sessão expirada ou usuário não autenticado. Faça login novamente.'
    );
  END IF;

  -- 2. Clean input strings
  IF p_cpf IS NOT NULL THEN
    v_clean_cpf := regexp_replace(p_cpf, '\D', '', 'g');
  END IF;
  IF p_name IS NOT NULL THEN
    v_clean_name := trim(p_name);
  END IF;

  -- 3. Execute search according to p_mode
  IF p_mode = 'cpf' THEN
    IF v_clean_cpf IS NULL OR length(v_clean_cpf) < 11 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'INVALID_CPF',
        'message', 'Informe um CPF válido com 11 dígitos para vinculação.'
      );
    END IF;

    -- Search in responsibles table first
    SELECT id, full_name INTO v_guardian_id, v_guardian_name
    FROM public.responsibles
    WHERE regexp_replace(cpf, '\D', '', 'g') = v_clean_cpf
    LIMIT 1;

    -- Fallback to guardians table if not in responsibles
    IF v_guardian_id IS NULL THEN
      SELECT id, name INTO v_guardian_id, v_guardian_name
      FROM public.guardians
      WHERE regexp_replace(cpf, '\D', '', 'g') = v_clean_cpf
      LIMIT 1;
    END IF;

  ELSIF p_mode = 'name' THEN
    IF v_clean_name IS NULL OR length(v_clean_name) < 3 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'INVALID_NAME',
        'message', 'Informe o nome completo do responsável (mínimo de 3 letras).'
      );
    END IF;

    -- Count matches in responsibles to prevent ambiguous duplicate names
    SELECT count(*), max(id), max(full_name) 
    INTO v_matches_count, v_guardian_id, v_guardian_name
    FROM public.responsibles
    WHERE full_name ILIKE '%' || v_clean_name || '%';

    IF v_matches_count > 1 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'AMBIGUOUS_NAME',
        'message', 'Localizados múltiplos responsáveis com este nome. Por segurança, selecione a opção "Por CPF e Nome (Ambos)".'
      );
    ELSIF v_matches_count = 0 THEN
      -- Search in guardians table
      SELECT count(*), max(id), max(name) 
      INTO v_matches_count, v_guardian_id, v_guardian_name
      FROM public.guardians
      WHERE name ILIKE '%' || v_clean_name || '%';

      IF v_matches_count > 1 THEN
        RETURN jsonb_build_object(
          'ok', false,
          'code', 'AMBIGUOUS_NAME',
          'message', 'Localizados múltiplos responsáveis com este nome. Por segurança, selecione a opção "Por CPF e Nome (Ambos)".'
        );
      END IF;
    END IF;

  ELSIF p_mode = 'both' THEN
    IF v_clean_cpf IS NULL OR length(v_clean_cpf) < 11 OR v_clean_name IS NULL OR length(v_clean_name) < 3 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'INVALID_INPUTS',
        'message', 'Preencha tanto o CPF completo quanto o Nome Completo do responsável.'
      );
    END IF;

    -- Strict check requiring BOTH CPF AND Full Name
    SELECT id, full_name INTO v_guardian_id, v_guardian_name
    FROM public.responsibles
    WHERE regexp_replace(cpf, '\D', '', 'g') = v_clean_cpf
      AND full_name ILIKE '%' || v_clean_name || '%'
    LIMIT 1;

    IF v_guardian_id IS NULL THEN
      SELECT id, name INTO v_guardian_id, v_guardian_name
      FROM public.guardians
      WHERE regexp_replace(cpf, '\D', '', 'g') = v_clean_cpf
        AND name ILIKE '%' || v_clean_name || '%'
      LIMIT 1;
    END IF;

  ELSE
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'INVALID_MODE',
      'message', 'Modo de busca inválido. Utilize "cpf", "name" ou "both".'
    );
  END IF;

  -- 4. Validate guardian discovery
  IF v_guardian_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'GUARDIAN_NOT_FOUND',
      'message', 'Nenhum responsável encontrado com as informações fornecidas. Verifique os dados ou entre em contato com a secretaria escolar.'
    );
  END IF;

  -- 5. Associate guardian_id to profile
  UPDATE public.profiles
  SET guardian_id = v_guardian_id,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- 6. Retrieve linked students for this guardian
  SELECT jsonb_agg(
    jsonb_build_object(
      'student_id', s.id,
      'full_name', s.full_name,
      'class_name', COALESCE(c.name, 'Turma Regular'),
      'shift', COALESCE(s.shift, 'matutino'),
      'room', COALESCE(s.room, 'Sala 101'),
      'relationship', COALESCE(l.relationship_type, 'Responsável Legal'),
      'status', COALESCE(s.status, 'Ativo'),
      'guardian_id', v_guardian_id,
      'guardian_name', v_guardian_name
    )
  ) INTO v_children
  FROM public.student_responsible_links l
  JOIN public.students s ON s.id = l.student_id
  LEFT JOIN public.classes c ON c.id = s.class_id
  WHERE l.responsible_id = v_guardian_id OR l.guardian_id = v_guardian_id;

  v_children_count := COALESCE(jsonb_array_length(v_children), 0);

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Responsável e alunos vinculados com sucesso!',
    'guardian_id', v_guardian_id,
    'guardian_name', v_guardian_name,
    'children_count', v_children_count,
    'children', COALESCE(v_children, '[]'::jsonb)
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.link_family_by_criteria(TEXT, TEXT, TEXT) TO authenticated, anon;
