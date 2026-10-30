-- ==============================================================================
-- MIGRATION 0062: FAMILY PORTAL DADOS CADASTRAIS REALTIME SUPABASE INTEGRATION
-- Integrates: Ficha de Identificação (Aluno), Ficha Clínica & Saúde, 
--             Residência Familiar & Endereço, Responsáveis Legais & Contatos
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENSURE ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Colégio Classium Internacional',
    code TEXT DEFAULT 'CLASSIUM-SP',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ENSURE CLASSES
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    grade TEXT DEFAULT '9º Ano A - Fundamental II',
    shift TEXT DEFAULT 'Integral',
    room TEXT DEFAULT 'Sala 08',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ENSURE STUDENTS TABLE WITH FULL CADASTRAL ATTRIBUTES
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    full_name TEXT,
    registration_number TEXT,
    ra TEXT,
    birth_date DATE DEFAULT '2012-04-15',
    gender TEXT DEFAULT 'Masculino',
    cpf TEXT DEFAULT '123.456.789-00',
    rg TEXT DEFAULT 'MG-19.345.678',
    school_unit TEXT DEFAULT 'Unidade Sede Centro',
    grade TEXT DEFAULT '9º Ano A - Fundamental II',
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    class_name TEXT DEFAULT '9º Ano A',
    shift TEXT DEFAULT 'Integral',
    status TEXT DEFAULT 'active',
    photo_url TEXT,
    avatar_url TEXT,
    mother_name TEXT DEFAULT 'Maria das Graças Silva',
    father_name TEXT DEFAULT 'José Pedro Silva',
    ibe_score NUMERIC(5, 2) DEFAULT 95.0,
    conduct_points NUMERIC(5, 2) DEFAULT 20.0,
    attendance_rate NUMERIC(5, 2) DEFAULT 98.0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add any missing columns to students safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'birth_date') THEN
        ALTER TABLE public.students ADD COLUMN birth_date DATE DEFAULT '2012-04-15';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'gender') THEN
        ALTER TABLE public.students ADD COLUMN gender TEXT DEFAULT 'Masculino';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'cpf') THEN
        ALTER TABLE public.students ADD COLUMN cpf TEXT DEFAULT '123.456.789-00';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'rg') THEN
        ALTER TABLE public.students ADD COLUMN rg TEXT DEFAULT 'MG-19.345.678';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'school_unit') THEN
        ALTER TABLE public.students ADD COLUMN school_unit TEXT DEFAULT 'Unidade Sede Centro';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'mother_name') THEN
        ALTER TABLE public.students ADD COLUMN mother_name TEXT DEFAULT 'Maria das Graças Silva';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'father_name') THEN
        ALTER TABLE public.students ADD COLUMN father_name TEXT DEFAULT 'José Pedro Silva';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'class_name') THEN
        ALTER TABLE public.students ADD COLUMN class_name TEXT DEFAULT '9º Ano A';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'shift') THEN
        ALTER TABLE public.students ADD COLUMN shift TEXT DEFAULT 'Integral';
    END IF;
END $$;

-- 5. STUDENT HEALTH INFO (FICHA CLÍNICA E ALERTA DE SAÚDE)
CREATE TABLE IF NOT EXISTS public.student_health_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    blood_type TEXT DEFAULT 'O+',
    sus_card TEXT DEFAULT '123.4567.8901.2345',
    health_plan TEXT DEFAULT 'Unimed Premium',
    allergies TEXT DEFAULT 'Lactose, Penicilina',
    medications TEXT DEFAULT 'Paracetamol sob demanda',
    dietary_restrictions TEXT DEFAULT 'Evitar derivados de leite.',
    special_needs TEXT DEFAULT 'Nenhuma',
    disability TEXT DEFAULT 'Nenhuma',
    emergency_contact TEXT DEFAULT 'Maria das Graças Silva - (11) 99999-7777',
    emergency_phone TEXT DEFAULT '(11) 99999-7777',
    medical_notes TEXT DEFAULT 'Não informado',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unq_student_health UNIQUE (student_id)
);

-- 6. ADDRESSES TABLE (RESIDÊNCIA FAMILIAR E ENDEREÇO)
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    guardian_id UUID,
    zip_code TEXT NOT NULL DEFAULT '01310-100',
    street TEXT NOT NULL DEFAULT 'Avenida Paulista',
    number TEXT DEFAULT '1000',
    complement TEXT DEFAULT 'Apt 12',
    neighborhood TEXT DEFAULT 'Bela Vista',
    city TEXT NOT NULL DEFAULT 'São Paulo',
    state TEXT NOT NULL DEFAULT 'SP',
    country TEXT NOT NULL DEFAULT 'Brasil',
    reference_point TEXT DEFAULT 'Próximo ao Metrô Trianon-Masp',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. GUARDIANS & STUDENT_GUARDIANS (RESPONSÁVEIS LEGAIS E CONTATOS)
CREATE TABLE IF NOT EXISTS public.guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    full_name TEXT,
    relationship TEXT NOT NULL DEFAULT 'Mãe',
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
    relationship TEXT DEFAULT 'Mãe',
    is_principal BOOLEAN DEFAULT false,
    can_pickup BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unq_student_guardian UNIQUE (student_id, guardian_id)
);

-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_student_health_student ON public.student_health_info(student_id);
CREATE INDEX IF NOT EXISTS idx_addresses_student ON public.addresses(student_id);
CREATE INDEX IF NOT EXISTS idx_guardians_cpf ON public.guardians(cpf);
CREATE INDEX IF NOT EXISTS idx_guardians_email ON public.guardians(email);
CREATE INDEX IF NOT EXISTS idx_student_guardians_lookup ON public.student_guardians(student_id, guardian_id);

-- 9. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_health_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_organizations_all ON public.organizations;
CREATE POLICY p_organizations_all ON public.organizations FOR ALL USING (true);

DROP POLICY IF EXISTS p_classes_all ON public.classes;
CREATE POLICY p_classes_all ON public.classes FOR ALL USING (true);

DROP POLICY IF EXISTS p_students_all ON public.students;
CREATE POLICY p_students_all ON public.students FOR ALL USING (true);

DROP POLICY IF EXISTS p_student_health_all ON public.student_health_info;
CREATE POLICY p_student_health_all ON public.student_health_info FOR ALL USING (true);

DROP POLICY IF EXISTS p_addresses_all ON public.addresses;
CREATE POLICY p_addresses_all ON public.addresses FOR ALL USING (true);

DROP POLICY IF EXISTS p_guardians_all ON public.guardians;
CREATE POLICY p_guardians_all ON public.guardians FOR ALL USING (true);

DROP POLICY IF EXISTS p_student_guardians_all ON public.student_guardians;
CREATE POLICY p_student_guardians_all ON public.student_guardians FOR ALL USING (true);

-- 10. RPC TO FETCH FULL CADASTRAL DATA OF A STUDENT
CREATE OR REPLACE FUNCTION public.get_student_cadastral_profile(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student RECORD;
    v_health RECORD;
    v_address RECORD;
    v_guardians JSONB;
    v_result JSONB;
BEGIN
    -- 1. Fetch Student Data
    SELECT * INTO v_student FROM public.students WHERE id = p_student_id LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Estudante não encontrado');
    END IF;

    -- 2. Fetch Health Info
    SELECT * INTO v_health FROM public.student_health_info WHERE student_id = p_student_id LIMIT 1;

    -- 3. Fetch Address
    SELECT * INTO v_address FROM public.addresses WHERE student_id = p_student_id LIMIT 1;

    -- 4. Fetch Guardians
    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'relationship', coalesce(sg.relationship, g.relationship),
        'phone', g.phone,
        'email', g.email,
        'cpf', g.cpf,
        'rg', g.rg,
        'address', g.address,
        'notes', g.notes,
        'hasAccess', coalesce(sg.can_pickup, g.has_access, true),
        'isPrincipal', coalesce(sg.is_principal, g.is_principal, false)
    ) ORDER BY coalesce(sg.is_principal, g.is_principal, false) DESC, g.name ASC), '[]'::jsonb)
    INTO v_guardians
    FROM public.guardians g
    JOIN public.student_guardians sg ON sg.guardian_id = g.id
    WHERE sg.student_id = p_student_id;

    -- 5. Construct full output
    v_result := jsonb_build_object(
        'ok', true,
        'student', jsonb_build_object(
            'id', v_student.id,
            'name', v_student.name,
            'fullName', coalesce(v_student.full_name, v_student.name),
            'registrationNumber', v_student.registration_number,
            'ra', coalesce(v_student.ra, v_student.registration_number, '987654321'),
            'birthDate', v_student.birth_date,
            'gender', v_student.gender,
            'cpf', v_student.cpf,
            'rg', v_student.rg,
            'schoolUnit', v_student.school_unit,
            'grade', v_student.grade,
            'classId', v_student.class_id,
            'className', v_student.class_name,
            'shift', v_student.shift,
            'status', v_student.status,
            'photoUrl', v_student.photo_url,
            'motherName', v_student.mother_name,
            'fatherName', v_student.father_name
        ),
        'health', CASE WHEN v_health.id IS NOT NULL THEN jsonb_build_object(
            'id', v_health.id,
            'bloodType', v_health.blood_type,
            'susCard', v_health.sus_card,
            'healthPlan', v_health.health_plan,
            'allergies', v_health.allergies,
            'medications', v_health.medications,
            'restrictions', v_health.dietary_restrictions,
            'specialNeeds', v_health.special_needs,
            'disability', v_health.disability,
            'emergencyContact', v_health.emergency_contact,
            'emergencyPhone', v_health.emergency_phone,
            'medicalNotes', v_health.medical_notes
        ) ELSE NULL END,
        'address', CASE WHEN v_address.id IS NOT NULL THEN jsonb_build_object(
            'id', v_address.id,
            'addressCep', v_address.zip_code,
            'addressStreet', v_address.street,
            'addressNumber', v_address.number,
            'addressComplement', v_address.complement,
            'addressNeighborhood', v_address.neighborhood,
            'addressCity', v_address.city,
            'addressState', v_address.state,
            'addressCountry', v_address.country,
            'addressReference', v_address.reference_point
        ) ELSE NULL END,
        'guardians', v_guardians
    );

    RETURN v_result;
END;
$$;

-- 11. RPC TO UPSERT STUDENT HEALTH INFO
CREATE OR REPLACE FUNCTION public.save_student_health_info(
    p_student_id UUID,
    p_blood_type TEXT DEFAULT 'O+',
    p_sus_card TEXT DEFAULT '123.4567.8901.2345',
    p_health_plan TEXT DEFAULT 'Unimed Premium',
    p_allergies TEXT DEFAULT 'Lactose, Penicilina',
    p_medications TEXT DEFAULT 'Paracetamol sob demanda',
    p_dietary_restrictions TEXT DEFAULT 'Evitar derivados de leite.',
    p_special_needs TEXT DEFAULT 'Nenhuma',
    p_disability TEXT DEFAULT 'Nenhuma',
    p_emergency_contact TEXT DEFAULT 'Maria das Graças Silva - (11) 99999-7777',
    p_medical_notes TEXT DEFAULT 'Não informado'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.student_health_info (
        student_id,
        blood_type,
        sus_card,
        health_plan,
        allergies,
        medications,
        dietary_restrictions,
        special_needs,
        disability,
        emergency_contact,
        medical_notes,
        updated_at
    ) VALUES (
        p_student_id,
        p_blood_type,
        p_sus_card,
        p_health_plan,
        p_allergies,
        p_medications,
        p_dietary_restrictions,
        p_special_needs,
        p_disability,
        p_emergency_contact,
        p_medical_notes,
        now()
    )
    ON CONFLICT (student_id) DO UPDATE SET
        blood_type = EXCLUDED.blood_type,
        sus_card = EXCLUDED.sus_card,
        health_plan = EXCLUDED.health_plan,
        allergies = EXCLUDED.allergies,
        medications = EXCLUDED.medications,
        dietary_restrictions = EXCLUDED.dietary_restrictions,
        special_needs = EXCLUDED.special_needs,
        disability = EXCLUDED.disability,
        emergency_contact = EXCLUDED.emergency_contact,
        medical_notes = EXCLUDED.medical_notes,
        updated_at = now();

    RETURN jsonb_build_object('ok', true, 'message', 'Ficha clínica atualizada com sucesso!');
END;
$$;

-- 12. RPC TO UPSERT STUDENT ADDRESS
CREATE OR REPLACE FUNCTION public.save_student_address(
    p_student_id UUID,
    p_zip_code TEXT,
    p_street TEXT,
    p_number TEXT,
    p_complement TEXT,
    p_neighborhood TEXT,
    p_city TEXT,
    p_state TEXT,
    p_country TEXT DEFAULT 'Brasil',
    p_reference_point TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_address_id UUID;
BEGIN
    SELECT id INTO v_address_id FROM public.addresses WHERE student_id = p_student_id LIMIT 1;

    IF v_address_id IS NOT NULL THEN
        UPDATE public.addresses SET
            zip_code = p_zip_code,
            street = p_street,
            number = p_number,
            complement = p_complement,
            neighborhood = p_neighborhood,
            city = p_city,
            state = p_state,
            country = p_country,
            reference_point = p_reference_point,
            updated_at = now()
        WHERE id = v_address_id;
    ELSE
        INSERT INTO public.addresses (
            student_id,
            zip_code,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            country,
            reference_point,
            created_at,
            updated_at
        ) VALUES (
            p_student_id,
            p_zip_code,
            p_street,
            p_number,
            p_complement,
            p_neighborhood,
            p_city,
            p_state,
            p_country,
            p_reference_point,
            now(),
            now()
        );
    END IF;

    RETURN jsonb_build_object('ok', true, 'message', 'Endereço atualizado com sucesso!');
END;
$$;

-- 13. RPC TO UPSERT GUARDIAN
CREATE OR REPLACE FUNCTION public.save_student_guardian(
    p_student_id UUID,
    p_guardian_id UUID DEFAULT NULL,
    p_name TEXT DEFAULT '',
    p_relationship TEXT DEFAULT 'Mãe',
    p_phone TEXT DEFAULT '',
    p_email TEXT DEFAULT '',
    p_cpf TEXT DEFAULT '',
    p_rg TEXT DEFAULT '',
    p_address TEXT DEFAULT '',
    p_notes TEXT DEFAULT '',
    p_has_access BOOLEAN DEFAULT true,
    p_is_principal BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_guardian_id UUID := p_guardian_id;
BEGIN
    -- If setting to principal, unset others for this student
    IF p_is_principal THEN
        UPDATE public.student_guardians 
        SET is_principal = false 
        WHERE student_id = p_student_id;
        
        UPDATE public.guardians g
        SET is_principal = false
        FROM public.student_guardians sg
        WHERE sg.guardian_id = g.id AND sg.student_id = p_student_id;
    END IF;

    IF v_target_guardian_id IS NOT NULL THEN
        UPDATE public.guardians SET
            name = p_name,
            relationship = p_relationship,
            phone = p_phone,
            email = p_email,
            cpf = p_cpf,
            rg = p_rg,
            address = p_address,
            notes = p_notes,
            has_access = p_has_access,
            is_principal = p_is_principal,
            updated_at = now()
        WHERE id = v_target_guardian_id;

        UPDATE public.student_guardians SET
            relationship = p_relationship,
            is_principal = p_is_principal,
            can_pickup = p_has_access,
            updated_at = now()
        WHERE student_id = p_student_id AND guardian_id = v_target_guardian_id;
    ELSE
        INSERT INTO public.guardians (
            name,
            relationship,
            phone,
            email,
            cpf,
            rg,
            address,
            notes,
            has_access,
            is_principal,
            status,
            created_at,
            updated_at
        ) VALUES (
            p_name,
            p_relationship,
            p_phone,
            p_email,
            p_cpf,
            p_rg,
            p_address,
            p_notes,
            p_has_access,
            p_is_principal,
            'active',
            now(),
            now()
        ) RETURNING id INTO v_target_guardian_id;

        INSERT INTO public.student_guardians (
            student_id,
            guardian_id,
            relationship,
            is_principal,
            can_pickup,
            created_at,
            updated_at
        ) VALUES (
            p_student_id,
            v_target_guardian_id,
            p_relationship,
            p_is_principal,
            p_has_access,
            now(),
            now()
        )
        ON CONFLICT (student_id, guardian_id) DO UPDATE SET
            relationship = EXCLUDED.relationship,
            is_principal = EXCLUDED.is_principal,
            can_pickup = EXCLUDED.can_pickup,
            updated_at = now();
    END IF;

    RETURN jsonb_build_object('ok', true, 'guardian_id', v_target_guardian_id, 'message', 'Responsável salvo com sucesso!');
END;
$$;

-- 14. RPC TO DELETE GUARDIAN LINK
CREATE OR REPLACE FUNCTION public.delete_student_guardian(
    p_student_id UUID,
    p_guardian_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.student_guardians 
    WHERE student_id = p_student_id AND guardian_id = p_guardian_id;

    RETURN jsonb_build_object('ok', true, 'message', 'Responsável desvinculado com sucesso!');
END;
$$;

-- 15. SEED OFFICIAL CANONICAL DATA FOR JOÃO SILVA DE ALENCAR
DO $$
DECLARE
    v_org_id UUID := '00000000-0000-0000-0000-000000000001';
    v_class_id UUID := '00000000-0000-0000-0000-000000000002';
    v_student_id UUID := '00000000-0000-0000-0000-000000000003';
    v_g1_id UUID := '00000000-0000-0000-0000-000000000011';
    v_g2_id UUID := '00000000-0000-0000-0000-000000000012';
    v_g3_id UUID := '00000000-0000-0000-0000-000000000013';
BEGIN
    -- 1. Org
    INSERT INTO public.organizations (id, name, code)
    VALUES (v_org_id, 'Colégio Classium Internacional', 'CLASSIUM-SP')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Class
    INSERT INTO public.classes (id, organization_id, name, grade, shift, room, status)
    VALUES (v_class_id, v_org_id, '9º Ano A', '9º Ano A - Fundamental II', 'Integral', 'Sala 08', 'active')
    ON CONFLICT (id) DO UPDATE SET name = '9º Ano A', grade = '9º Ano A - Fundamental II';

    -- 3. Student
    INSERT INTO public.students (
        id,
        organization_id,
        name,
        full_name,
        registration_number,
        ra,
        birth_date,
        gender,
        cpf,
        rg,
        school_unit,
        grade,
        class_id,
        class_name,
        shift,
        status,
        photo_url,
        mother_name,
        father_name
    ) VALUES (
        v_student_id,
        v_org_id,
        'João Silva de Alencar',
        'João Silva de Alencar',
        '20260125',
        '987654321',
        '2012-04-15',
        'Masculino',
        '123.456.789-00',
        'MG-19.345.678',
        'Unidade Sede Centro',
        '9º Ano A - Fundamental II',
        v_class_id,
        '9º Ano A',
        'Integral',
        'active',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
        'Maria das Graças Silva',
        'José Pedro Silva'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = 'João Silva de Alencar',
        full_name = 'João Silva de Alencar',
        registration_number = '20260125',
        ra = '987654321',
        birth_date = '2012-04-15',
        gender = 'Masculino',
        cpf = '123.456.789-00',
        rg = 'MG-19.345.678',
        school_unit = 'Unidade Sede Centro',
        mother_name = 'Maria das Graças Silva',
        father_name = 'José Pedro Silva';

    -- 4. Health Info
    INSERT INTO public.student_health_info (
        student_id,
        organization_id,
        blood_type,
        sus_card,
        health_plan,
        allergies,
        medications,
        dietary_restrictions,
        special_needs,
        disability,
        emergency_contact,
        emergency_phone,
        medical_notes
    ) VALUES (
        v_student_id,
        v_org_id,
        'O+',
        '123.4567.8901.2345',
        'Unimed Premium',
        'Lactose, Penicilina',
        'Paracetamol sob demanda',
        'Evitar derivados de leite.',
        'Nenhuma',
        'Nenhuma',
        'Maria das Graças Silva - (11) 99999-7777',
        '(11) 99999-7777',
        'Não informado'
    )
    ON CONFLICT (student_id) DO UPDATE SET
        blood_type = 'O+',
        sus_card = '123.4567.8901.2345',
        health_plan = 'Unimed Premium',
        allergies = 'Lactose, Penicilina',
        medications = 'Paracetamol sob demanda',
        dietary_restrictions = 'Evitar derivados de leite.';

    -- 5. Address
    DELETE FROM public.addresses WHERE student_id = v_student_id;
    INSERT INTO public.addresses (
        student_id,
        organization_id,
        zip_code,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        country,
        reference_point
    ) VALUES (
        v_student_id,
        v_org_id,
        '01310-100',
        'Avenida Paulista',
        '1000',
        'Apt 12',
        'Bela Vista',
        'São Paulo',
        'SP',
        'Brasil',
        'Próximo ao Metrô Trianon-Masp'
    );

    -- 6. Guardians
    INSERT INTO public.guardians (
        id, organization_id, name, full_name, relationship, phone, email, cpf, rg, address, notes, has_access, is_principal, status
    ) VALUES 
    (
        v_g1_id, v_org_id, 'Maria das Graças Silva', 'Maria das Graças Silva', 'Mãe', '(11) 98888-7777', 'maria.graca@gmail.com', '111.222.333-44', 'MG-12.345.678', 'Avenida Paulista, 1000, Apt 12', 'Mãe biológica e responsável financeira', true, true, 'active'
    ),
    (
        v_g2_id, v_org_id, 'José Pedro Silva', 'José Pedro Silva', 'Pai', '(11) 97777-6666', 'jose.pedro@gmail.com', '222.333.444-55', 'MG-14.567.890', 'Avenida Paulista, 1000, Apt 12', 'Pai biológico', true, false, 'active'
    ),
    (
        v_g3_id, v_org_id, 'Ana Silva', 'Ana Silva', 'Avó', '(11) 96666-5555', 'ana.silva@gmail.com', '333.444.555-66', 'MG-11.223.344', 'Rua Augusta, 450', 'Avó materna', false, false, 'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        relationship = EXCLUDED.relationship,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        cpf = EXCLUDED.cpf,
        has_access = EXCLUDED.has_access,
        is_principal = EXCLUDED.is_principal;

    -- 7. Link student to guardians
    INSERT INTO public.student_guardians (
        student_id, guardian_id, relationship, is_principal, can_pickup
    ) VALUES
    (v_student_id, v_g1_id, 'Mãe', true, true),
    (v_student_id, v_g2_id, 'Pai', false, true),
    (v_student_id, v_g3_id, 'Avó', false, false)
    ON CONFLICT (student_id, guardian_id) DO UPDATE SET
        relationship = EXCLUDED.relationship,
        is_principal = EXCLUDED.is_principal,
        can_pickup = EXCLUDED.can_pickup;

END $$;

-- 16. REALTIME PUBLICATION REGISTRATION
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'students'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'student_health_info'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_health_info;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'addresses'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.addresses;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'guardians'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.guardians;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'student_guardians'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_guardians;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore if already registered
END $$;
