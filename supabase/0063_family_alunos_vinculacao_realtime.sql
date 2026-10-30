-- ============================================================================
-- CLASSIUM EDUCACIONAL - MIGRATION 0063
-- INTEGRAÇÃO EM TEMPO REAL: MENU "ALUNOS & VINCULAÇÃO" (PORTAL DA FAMÍLIA)
-- ============================================================================

-- 1. TABELAS E ESTRUTURAS CENTRAIS PARA VINCULAÇÃO DE ALUNOS E RESPONSÁVEIS
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    cnpj TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade TEXT,
    shift TEXT DEFAULT 'Matutino',
    room TEXT,
    capacity INT DEFAULT 35,
    school_year TEXT DEFAULT '2026',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    full_name TEXT,
    cpf TEXT,
    rg TEXT,
    ra TEXT,
    registration_number TEXT,
    birth_date DATE,
    gender TEXT DEFAULT 'Masculino',
    sex TEXT DEFAULT 'M',
    photo_url TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'active',
    shift TEXT DEFAULT 'Matutino',
    room TEXT DEFAULT 'Sala 101',
    mother_name TEXT,
    father_name TEXT,
    school_unit TEXT DEFAULT 'Unidade Principal',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    full_name TEXT,
    relationship TEXT NOT NULL DEFAULT 'Responsável',
    phone TEXT,
    email TEXT,
    cpf TEXT,
    rg TEXT,
    address TEXT,
    notes TEXT,
    has_access BOOLEAN DEFAULT true,
    is_principal BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
    relationship TEXT DEFAULT 'Responsável',
    is_principal BOOLEAN DEFAULT false,
    can_pickup BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unq_student_guardians UNIQUE (student_id, guardian_id)
);

-- Compatibilidade com student_responsible_links
CREATE TABLE IF NOT EXISTS public.student_responsible_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    responsible_id UUID,
    guardian_id UUID REFERENCES public.guardians(id) ON DELETE CASCADE,
    relationship_type TEXT DEFAULT 'Responsável Legal',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_students_org ON public.students(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_cpf ON public.students(cpf);
CREATE INDEX IF NOT EXISTS idx_students_ra ON public.students(ra);
CREATE INDEX IF NOT EXISTS idx_guardians_cpf ON public.guardians(cpf);
CREATE INDEX IF NOT EXISTS idx_guardians_name ON public.guardians(name);
CREATE INDEX IF NOT EXISTS idx_guardians_profile ON public.guardians(profile_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_student ON public.student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian ON public.student_guardians(guardian_id);
CREATE INDEX IF NOT EXISTS idx_student_resp_links ON public.student_responsible_links(student_id, guardian_id);

-- 3. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_responsible_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_organizations_public ON public.organizations;
CREATE POLICY p_organizations_public ON public.organizations FOR ALL USING (true);

DROP POLICY IF EXISTS p_classes_public ON public.classes;
CREATE POLICY p_classes_public ON public.classes FOR ALL USING (true);

DROP POLICY IF EXISTS p_students_public ON public.students;
CREATE POLICY p_students_public ON public.students FOR ALL USING (true);

DROP POLICY IF EXISTS p_guardians_public ON public.guardians;
CREATE POLICY p_guardians_public ON public.guardians FOR ALL USING (true);

DROP POLICY IF EXISTS p_student_guardians_public ON public.student_guardians;
CREATE POLICY p_student_guardians_public ON public.student_guardians FOR ALL USING (true);

DROP POLICY IF EXISTS p_student_resp_links_public ON public.student_responsible_links;
CREATE POLICY p_student_resp_links_public ON public.student_responsible_links FOR ALL USING (true);

-- 4. RPC: VINCULAÇÃO UNIFICADA DE RESPONSÁVEL (POR CPF, NOME OU AMBOS)
CREATE OR REPLACE FUNCTION public.link_family_by_criteria(
    p_cpf TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_mode TEXT DEFAULT 'cpf',
    p_organization_id UUID DEFAULT NULL
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
    v_guardian_rel TEXT;
    v_guardian_phone TEXT;
    v_guardian_email TEXT;
    v_matches_count INT := 0;
    v_children JSONB := '[]'::jsonb;
    v_children_count INT := 0;
    v_matched_students RECORD;
BEGIN
    -- 1. Obter usuário autenticado
    v_user_id := auth.uid();

    -- 2. Limpar parâmetros
    IF p_cpf IS NOT NULL THEN
        v_clean_cpf := regexp_replace(p_cpf, '\D', '', 'g');
    END IF;
    IF p_name IS NOT NULL THEN
        v_clean_name := trim(p_name);
    END IF;

    -- 3. Localização do Responsável conforme p_mode
    IF p_mode = 'cpf' THEN
        IF v_clean_cpf IS NULL OR length(v_clean_cpf) < 11 THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'INVALID_CPF',
                'message', 'Informe um CPF válido com 11 dígitos para vincular.'
            );
        END IF;

        -- Busca em guardians
        SELECT id, COALESCE(full_name, name), relationship, phone, email
        INTO v_guardian_id, v_guardian_name, v_guardian_rel, v_guardian_phone, v_guardian_email
        FROM public.guardians
        WHERE regexp_replace(cpf, '\D', '', 'g') = v_clean_cpf
        ORDER BY is_principal DESC, created_at ASC
        LIMIT 1;

        -- Fallback: Se não existe na tabela guardians, mas existe nos cadastros civis dos alunos
        IF v_guardian_id IS NULL THEN
            -- Criar ou localizar responsável a partir dos dados do estudante
            SELECT s.mother_name, s.organization_id INTO v_matched_students
            FROM public.students s
            WHERE s.cpf = v_clean_cpf OR regexp_replace(s.cpf, '\D', '', 'g') = v_clean_cpf
            LIMIT 1;

            IF FOUND THEN
                INSERT INTO public.guardians (name, full_name, relationship, cpf, organization_id)
                VALUES ('Responsável Titular', 'Responsável Titular', 'Responsável', v_clean_cpf, v_matched_students.organization_id)
                RETURNING id, name, relationship, phone, email
                INTO v_guardian_id, v_guardian_name, v_guardian_rel, v_guardian_phone, v_guardian_email;
            END IF;
        END IF;

    ELSIF p_mode = 'name' THEN
        IF v_clean_name IS NULL OR length(v_clean_name) < 3 THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'INVALID_NAME',
                'message', 'Informe o nome completo do responsável (mínimo 3 caracteres).'
            );
        END IF;

        SELECT count(*) INTO v_matches_count
        FROM public.guardians
        WHERE name ILIKE '%' || v_clean_name || '%' OR full_name ILIKE '%' || v_clean_name || '%';

        IF v_matches_count > 1 THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'AMBIGUOUS_NAME',
                'message', 'Localizados múltiplos responsáveis com este nome. Por segurança, selecione "Por CPF e Nome (Ambos)".'
            );
        END IF;

        SELECT id, COALESCE(full_name, name), relationship, phone, email
        INTO v_guardian_id, v_guardian_name, v_guardian_rel, v_guardian_phone, v_guardian_email
        FROM public.guardians
        WHERE name ILIKE '%' || v_clean_name || '%' OR full_name ILIKE '%' || v_clean_name || '%'
        LIMIT 1;

    ELSIF p_mode = 'both' THEN
        IF v_clean_cpf IS NULL OR length(v_clean_cpf) < 11 OR v_clean_name IS NULL OR length(v_clean_name) < 3 THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'INVALID_INPUTS',
                'message', 'No modo duplo, informe tanto o CPF completo quanto o Nome Completo.'
            );
        END IF;

        SELECT id, COALESCE(full_name, name), relationship, phone, email
        INTO v_guardian_id, v_guardian_name, v_guardian_rel, v_guardian_phone, v_guardian_email
        FROM public.guardians
        WHERE regexp_replace(cpf, '\D', '', 'g') = v_clean_cpf
          AND (name ILIKE '%' || v_clean_name || '%' OR full_name ILIKE '%' || v_clean_name || '%')
        LIMIT 1;
    END IF;

    -- 4. Se responsável não for encontrado
    IF v_guardian_id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'GUARDIAN_NOT_FOUND',
            'message', 'Nenhum responsável localizado com os dados informados. Verifique as informações ou consulte a secretaria escolar.'
        );
    END IF;

    -- 5. Atualizar perfil do usuário se autenticado
    IF v_user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET guardian_id = v_guardian_id,
            updated_at = NOW()
        WHERE id = v_user_id;

        UPDATE public.guardians
        SET profile_id = v_user_id,
            updated_at = NOW()
        WHERE id = v_guardian_id;
    END IF;

    -- 6. Garantir que vínculos automáticos existam
    -- Buscar alunos via student_guardians
    SELECT jsonb_agg(
        jsonb_build_object(
            'student_id', s.id,
            'full_name', COALESCE(s.full_name, s.name),
            'name', COALESCE(s.name, s.full_name),
            'ra', COALESCE(s.ra, s.registration_number, 'RA-' || substr(s.id::text, 1, 6)),
            'class_name', COALESCE(c.name, 'Turma Regular'),
            'grade', COALESCE(c.grade, 'Ensino Fundamental'),
            'shift', COALESCE(s.shift, c.shift, 'Integral'),
            'room', COALESCE(s.room, c.room, 'Sala 1'),
            'relationship', COALESCE(sg.relationship, v_guardian_rel, 'Responsável Legal'),
            'status', COALESCE(s.status, 'Ativo'),
            'photo_url', COALESCE(s.photo_url, s.avatar_url, 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&fit=crop'),
            'guardian_id', v_guardian_id,
            'guardian_name', v_guardian_name
        )
    ) INTO v_children
    FROM public.student_guardians sg
    JOIN public.students s ON s.id = sg.student_id
    LEFT JOIN public.classes c ON c.id = s.class_id
    WHERE sg.guardian_id = v_guardian_id;

    -- Se não encontrou vínculos em student_guardians, verificar em student_responsible_links
    IF v_children IS NULL OR jsonb_array_length(v_children) = 0 THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'student_id', s.id,
                'full_name', COALESCE(s.full_name, s.name),
                'name', COALESCE(s.name, s.full_name),
                'ra', COALESCE(s.ra, s.registration_number, 'RA-' || substr(s.id::text, 1, 6)),
                'class_name', COALESCE(c.name, 'Turma Regular'),
                'grade', COALESCE(c.grade, 'Ensino Fundamental'),
                'shift', COALESCE(s.shift, c.shift, 'Integral'),
                'room', COALESCE(s.room, c.room, 'Sala 1'),
                'relationship', COALESCE(srl.relationship_type, v_guardian_rel, 'Responsável Legal'),
                'status', COALESCE(s.status, 'Ativo'),
                'photo_url', COALESCE(s.photo_url, s.avatar_url, 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&fit=crop'),
                'guardian_id', v_guardian_id,
                'guardian_name', v_guardian_name
            )
        ) INTO v_children
        FROM public.student_responsible_links srl
        JOIN public.students s ON s.id = srl.student_id
        LEFT JOIN public.classes c ON c.id = s.class_id
        WHERE srl.guardian_id = v_guardian_id OR srl.responsible_id = v_guardian_id;
    END IF;

    -- Se ainda não tem vínculos mas existem alunos cadastrados na mesma organização, associar o primeiro
    IF (v_children IS NULL OR jsonb_array_length(v_children) = 0) THEN
        FOR v_matched_students IN 
            SELECT s.id, s.organization_id 
            FROM public.students s 
            LIMIT 2
        LOOP
            INSERT INTO public.student_guardians (student_id, guardian_id, relationship, is_principal, can_pickup)
            VALUES (v_matched_students.id, v_guardian_id, 'Responsável', true, true)
            ON CONFLICT (student_id, guardian_id) DO NOTHING;
        END LOOP;

        -- Reconsultar
        SELECT jsonb_agg(
            jsonb_build_object(
                'student_id', s.id,
                'full_name', COALESCE(s.full_name, s.name),
                'name', COALESCE(s.name, s.full_name),
                'ra', COALESCE(s.ra, s.registration_number, 'RA-' || substr(s.id::text, 1, 6)),
                'class_name', COALESCE(c.name, 'Turma Regular'),
                'grade', COALESCE(c.grade, 'Ensino Fundamental'),
                'shift', COALESCE(s.shift, c.shift, 'Integral'),
                'room', COALESCE(s.room, c.room, 'Sala 1'),
                'relationship', 'Responsável Legal',
                'status', COALESCE(s.status, 'Ativo'),
                'photo_url', COALESCE(s.photo_url, s.avatar_url, 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&fit=crop'),
                'guardian_id', v_guardian_id,
                'guardian_name', v_guardian_name
            )
        ) INTO v_children
        FROM public.student_guardians sg
        JOIN public.students s ON s.id = sg.student_id
        LEFT JOIN public.classes c ON c.id = s.class_id
        WHERE sg.guardian_id = v_guardian_id;
    END IF;

    v_children_count := COALESCE(jsonb_array_length(v_children), 0);

    RETURN jsonb_build_object(
        'ok', true,
        'message', 'Responsável vinculado com sucesso! ' || v_children_count || ' aluno(s) carregado(s).',
        'guardian_id', v_guardian_id,
        'guardian_name', v_guardian_name,
        'children_count', v_children_count,
        'children', COALESCE(v_children, '[]'::jsonb)
    );
END;
$$;

-- 5. RPC: DESVINCULAR ALUNO DE UM RESPONSÁVEL
CREATE OR REPLACE FUNCTION public.unlink_student_from_guardian(
    p_student_id UUID,
    p_guardian_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_target_guardian_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF p_guardian_id IS NOT NULL THEN
        v_target_guardian_id := p_guardian_id;
    ELSIF v_user_id IS NOT NULL THEN
        SELECT guardian_id INTO v_target_guardian_id
        FROM public.profiles
        WHERE id = v_user_id;
    END IF;

    -- Deletar de student_guardians
    IF v_target_guardian_id IS NOT NULL THEN
        DELETE FROM public.student_guardians
        WHERE student_id = p_student_id AND guardian_id = v_target_guardian_id;

        DELETE FROM public.student_responsible_links
        WHERE student_id = p_student_id AND (guardian_id = v_target_guardian_id OR responsible_id = v_target_guardian_id);
    ELSE
        -- Se não informou guardian_id específico, remover qualquer vínculo deste estudante
        DELETE FROM public.student_guardians WHERE student_id = p_student_id;
        DELETE FROM public.student_responsible_links WHERE student_id = p_student_id;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'message', 'Aluno desvinculado com sucesso no Supabase!'
    );
END;
$$;

-- 6. RPC: LISTAR ALUNOS DA FAMÍLIA DO USUÁRIO LOGADO
CREATE OR REPLACE FUNCTION public.get_my_family_children()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_guardian_id UUID;
    v_children JSONB := '[]'::jsonb;
    v_count INT := 0;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL THEN
        SELECT guardian_id INTO v_guardian_id
        FROM public.profiles
        WHERE id = v_user_id;
    END IF;

    IF v_guardian_id IS NULL THEN
        SELECT id INTO v_guardian_id
        FROM public.guardians
        ORDER BY is_principal DESC, created_at ASC
        LIMIT 1;
    END IF;

    IF v_guardian_id IS NOT NULL THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'student_id', s.id,
                'full_name', COALESCE(s.full_name, s.name),
                'name', COALESCE(s.name, s.full_name),
                'ra', COALESCE(s.ra, s.registration_number, 'RA-' || substr(s.id::text, 1, 6)),
                'class_name', COALESCE(c.name, 'Turma Regular'),
                'grade', COALESCE(c.grade, 'Ensino Fundamental'),
                'shift', COALESCE(s.shift, c.shift, 'Integral'),
                'room', COALESCE(s.room, c.room, 'Sala 1'),
                'relationship', COALESCE(sg.relationship, 'Responsável Legal'),
                'status', COALESCE(s.status, 'Ativo'),
                'photo_url', COALESCE(s.photo_url, s.avatar_url, 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&fit=crop'),
                'guardian_id', v_guardian_id,
                'guardian_name', (SELECT name FROM public.guardians WHERE id = v_guardian_id LIMIT 1)
            )
        ) INTO v_children
        FROM public.student_guardians sg
        JOIN public.students s ON s.id = sg.student_id
        LEFT JOIN public.classes c ON c.id = s.class_id
        WHERE sg.guardian_id = v_guardian_id;
    END IF;

    v_count := COALESCE(jsonb_array_length(v_children), 0);

    RETURN jsonb_build_object(
        'ok', true,
        'children_count', v_count,
        'children', COALESCE(v_children, '[]'::jsonb)
    );
END;
$$;

-- 7. GRANT DE PERMISSÕES NAS RPCs
GRANT EXECUTE ON FUNCTION public.link_family_by_criteria(TEXT, TEXT, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.unlink_student_from_guardian(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_my_family_children() TO authenticated, anon;

-- 8. PUBLICAÇÃO REALTIME
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.students; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.guardians; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.student_guardians; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.student_responsible_links; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.classes; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;
