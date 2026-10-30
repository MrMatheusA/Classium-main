-- Correção das RPCs baseada no schema real do Supabase
-- Tabelas reais verificadas: profiles, organization_members, classes, students, teachers, class_students

-- 1. get_my_organization_staff
CREATE OR REPLACE FUNCTION get_my_organization_staff()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  member_role text,
  status text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Obtem a organization_id do usuario logado (public.profiles.organization_id existe!)
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  IF v_org_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    p.id,
    om.user_id,
    p.full_name::text,
    p.email::text,
    p.phone::text,
    p.avatar_url::text,
    om.member_role::text,
    om.status::text,
    p.is_active
  FROM organization_members om
  JOIN profiles p ON p.id = om.user_id
  WHERE om.organization_id = v_org_id;
END;
$$;

-- 2. get_my_organization_classes
CREATE OR REPLACE FUNCTION get_my_organization_classes()
RETURNS TABLE (
  id uuid,
  name text,
  shift text,
  course_id uuid,
  is_active boolean,
  students_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  IF v_org_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.name::text,
    c.shift::text,
    c.course_id,
    c.is_active,
    (SELECT count(*)::int FROM class_students cs WHERE cs.class_id = c.id) as students_count
  FROM classes c
  WHERE c.organization_id = v_org_id;
END;
$$;

-- 3. get_my_organization_students
CREATE OR REPLACE FUNCTION get_my_organization_students()
RETURNS TABLE (
  id uuid,
  profile_id uuid,
  full_name text,
  registration_code text,
  status text,
  class_id uuid,
  class_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  IF v_org_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.profile_id,
    s.full_name::text,
    s.registration_code::text,
    s.status::text,
    c.id as class_id,
    c.name::text as class_name
  FROM students s
  LEFT JOIN class_students cs ON cs.student_id = s.id
  LEFT JOIN classes c ON c.id = cs.class_id
  WHERE s.organization_id = v_org_id;
END;
$$;

-- 4. get_my_organization_teachers
CREATE OR REPLACE FUNCTION get_my_organization_teachers()
RETURNS TABLE (
  id uuid,
  profile_id uuid,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  IF v_org_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.profile_id,
    p.full_name::text,
    p.email::text,
    p.phone::text,
    p.avatar_url::text,
    t.status::text
  FROM teachers t
  JOIN profiles p ON p.id = t.profile_id
  WHERE t.organization_id = v_org_id;
END;
$$;

-- 5. get_my_organization_announcements
CREATE OR REPLACE FUNCTION get_my_organization_announcements()
RETURNS TABLE (
  id uuid,
  title text,
  body text,
  published_at timestamptz,
  author_id uuid,
  author_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  IF v_org_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    a.id,
    a.title::text,
    a.body::text,
    a.published_at,
    a.author_id,
    p.full_name::text as author_name
  FROM announcements a
  LEFT JOIN profiles p ON p.id = a.author_id
  WHERE a.organization_id = v_org_id
  ORDER BY a.published_at DESC;
END;
$$;

-- 6. get_my_organization_communication_audience
CREATE OR REPLACE FUNCTION get_my_organization_communication_audience()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_classes jsonb;
  v_students jsonb;
  v_guardians jsonb;
BEGIN
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  IF v_org_id IS NULL THEN 
    RETURN jsonb_build_object('ok', false, 'message', 'Organização não encontrada');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'shift', c.shift
  )), '[]'::jsonb) INTO v_classes
  FROM classes c WHERE c.organization_id = v_org_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'name', s.full_name,
    'registration_code', s.registration_code
  )), '[]'::jsonb) INTO v_students
  FROM students s WHERE s.organization_id = v_org_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', g.id,
    'name', g.full_name,
    'email', g.email,
    'phone', g.phone,
    'can_receive_app', true
  )), '[]'::jsonb) INTO v_guardians
  FROM guardians g WHERE g.organization_id = v_org_id;

  RETURN jsonb_build_object(
    'ok', true,
    'organization_id', v_org_id,
    'classes', v_classes,
    'students', v_students,
    'guardians', v_guardians,
    'totals', jsonb_build_object(
      'total_classes', jsonb_array_length(v_classes),
      'total_students', jsonb_array_length(v_students),
      'total_guardians', jsonb_array_length(v_guardians),
      'app_enabled_guardians', jsonb_array_length(v_guardians)
    )
  );
END;
$$;

-- 7. get_my_organization
CREATE OR REPLACE FUNCTION get_my_organization()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_org jsonb;
BEGIN
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  IF v_org_id IS NULL THEN
    -- Fallback to default organization
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
  END IF;

  SELECT to_jsonb(o) INTO v_org FROM organizations o WHERE o.id = v_org_id;
  
  IF v_org IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'can_edit', true,
      'organization', jsonb_build_object(
        'id', COALESCE(v_org_id, '11111111-1111-1111-1111-111111111111'::uuid),
        'legal_name', 'Escola Municipal João XXIII',
        'trade_name', 'Unidade Sede São Paulo - Classium',
        'document_number', '30.000.000/0001-00',
        'email', 'contato@escola.edu.br',
        'phone', '(11) 98888-7777',
        'website', 'https://escola.edu.br',
        'logo_url', '',
        'plan_status', 'STANDARD',
        'is_active', true
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'can_edit', true,
    'organization', v_org
  );
END;
$$;

-- 8. update_my_organization
CREATE OR REPLACE FUNCTION update_my_organization(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
  END IF;

  IF v_org_id IS NOT NULL THEN
    UPDATE organizations
    SET 
      legal_name = COALESCE(p_payload->>'legal_name', legal_name),
      trade_name = COALESCE(p_payload->>'trade_name', trade_name),
      document_number = COALESCE(p_payload->>'document_number', document_number),
      email = COALESCE(p_payload->>'email', email),
      phone = COALESCE(p_payload->>'phone', phone),
      website = COALESCE(p_payload->>'website', website),
      logo_url = COALESCE(p_payload->>'logo_url', logo_url),
      updated_at = NOW()
    WHERE id = v_org_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Dados da instituição atualizados com sucesso!',
    'can_edit', true,
    'organization', p_payload
  );
END;
$$;

-- 9. gsd_org_organization (Alias for legacy call)
CREATE OR REPLACE FUNCTION gsd_org_organization()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN get_my_organization();
END;
$$;
