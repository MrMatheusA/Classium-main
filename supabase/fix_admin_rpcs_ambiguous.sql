-- Fix ambiguous column reference "id" in RPCs by aliasing the table.

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
  SELECT p.organization_id INTO v_org_id FROM profiles p WHERE p.id = auth.uid();
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
  SELECT p.organization_id INTO v_org_id FROM profiles p WHERE p.id = auth.uid();
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
  SELECT p.organization_id INTO v_org_id FROM profiles p WHERE p.id = auth.uid();
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
  SELECT p.organization_id INTO v_org_id FROM profiles p WHERE p.id = auth.uid();
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
  SELECT p.organization_id INTO v_org_id FROM profiles p WHERE p.id = auth.uid();
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
  SELECT p.organization_id INTO v_org_id FROM profiles p WHERE p.id = auth.uid();
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
