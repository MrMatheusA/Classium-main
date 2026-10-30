-- ====================================================================
-- EDUCA+ / CLASSIUM — MÓDULO DE TRANSPORTE ESCOLAR & VÍNCULO EM TEMPO REAL
-- SCRIPT SQL PRODUCTION-READY: TABELAS, VÍNCULO AUTOMÁTICO, RLS E REALTIME
-- ====================================================================

-- 1. TABELA DE ACORDOS/VÍNCULOS DE TRANSPORTE (transport_agreements)
CREATE TABLE IF NOT EXISTS public.transport_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  vehicle_id UUID,
  route_id UUID,
  status TEXT NOT NULL DEFAULT 'aguardando_vinculacao'
    CHECK (status IN ('aguardando_vinculacao','vinculado','sem_vaga','cancelado')),
  match_type TEXT CHECK (match_type IN ('automatico_endereco','manual')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  linked_at TIMESTAMPTZ,
  linked_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (student_id, school_id)
);

-- Garantir colunas essenciais caso a tabela já existisse
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_agreements' AND column_name = 'status') THEN
    ALTER TABLE public.transport_agreements ADD COLUMN status TEXT NOT NULL DEFAULT 'aguardando_vinculacao';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_agreements' AND column_name = 'match_type') THEN
    ALTER TABLE public.transport_agreements ADD COLUMN match_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_agreements' AND column_name = 'requested_at') THEN
    ALTER TABLE public.transport_agreements ADD COLUMN requested_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_agreements' AND column_name = 'linked_at') THEN
    ALTER TABLE public.transport_agreements ADD COLUMN linked_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_agreements' AND column_name = 'linked_by') THEN
    ALTER TABLE public.transport_agreements ADD COLUMN linked_by UUID;
  END IF;
END $$;

-- 2. ATUALIZAR ROTAS COM BAIRROS E CEPS ATENDIDOS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transport_routes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_routes' AND column_name = 'neighborhoods_served') THEN
      ALTER TABLE public.transport_routes ADD COLUMN neighborhoods_served TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_routes' AND column_name = 'zip_ranges') THEN
      ALTER TABLE public.transport_routes ADD COLUMN zip_ranges TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
  END IF;
END $$;

-- 3. GARANTIR COLUNAS EM STUDENTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'uses_school_transport') THEN
      ALTER TABLE public.students ADD COLUMN uses_school_transport BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'uses_transport') THEN
      ALTER TABLE public.students ADD COLUMN uses_transport BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'neighborhood') THEN
      ALTER TABLE public.students ADD COLUMN neighborhood TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'address_neighborhood') THEN
      ALTER TABLE public.students ADD COLUMN address_neighborhood TEXT;
    END IF;
  END IF;
END $$;

-- 4. FUNÇÃO DE VÍNCULO AUTOMÁTICO POR ENDEREÇO/BAIRRO
CREATE OR REPLACE FUNCTION public.try_auto_link_transport(p_student_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_school_id UUID;
  v_bairro TEXT;
  v_route_id UUID;
  v_vehicle_id UUID;
  v_vagas_livres INTEGER;
BEGIN
  SELECT 
    COALESCE(s.school_id, s.organization_id),
    COALESCE(s.neighborhood, s.address_neighborhood, '')
  INTO v_school_id, v_bairro
  FROM public.students s
  WHERE s.id = p_student_id;

  IF v_school_id IS NULL THEN
    RETURN;
  END IF;

  -- Se tiver bairro cadastrado, procura rota que atenda a este bairro
  IF v_bairro IS NOT NULL AND TRIM(v_bairro) <> '' THEN
    SELECT 
      tr.id, 
      COALESCE(tr.vehicle_id, tv.id),
      (COALESCE(tv.capacity, 40) - COALESCE((
        SELECT count(*) 
        FROM public.transport_agreements ta
        WHERE ta.vehicle_id = COALESCE(tr.vehicle_id, tv.id) AND ta.status = 'vinculado'
      ), 0))
    INTO v_route_id, v_vehicle_id, v_vagas_livres
    FROM public.transport_routes tr
    LEFT JOIN public.transport_vehicles tv ON (tv.route_id = tr.id OR tv.id = tr.vehicle_id OR tr.name ILIKE '%' || tv.route_name || '%')
    WHERE (tr.school_id = v_school_id OR tr.organization_id = v_school_id)
      AND (
        v_bairro = ANY(tr.neighborhoods_served)
        OR EXISTS (
          SELECT 1 FROM unnest(tr.neighborhoods_served) nb 
          WHERE nb ILIKE '%' || v_bairro || '%' OR v_bairro ILIKE '%' || nb || '%'
        )
      )
    ORDER BY v_vagas_livres DESC
    LIMIT 1;
  END IF;

  -- Se encontrou rota com veículo e vagas disponíveis, vincula automaticamente
  IF v_route_id IS NOT NULL AND v_vehicle_id IS NOT NULL AND v_vagas_livres > 0 THEN
    UPDATE public.transport_agreements
    SET route_id = v_route_id,
        vehicle_id = v_vehicle_id,
        status = 'vinculado',
        match_type = 'automatico_endereco',
        linked_at = NOW(),
        updated_at = NOW()
    WHERE student_id = p_student_id AND school_id = v_school_id;

    -- Sincronizar transport_students para compatibilidade total
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transport_students') THEN
      INSERT INTO public.transport_students (school_id, organization_id, student_id, vehicle_id, route_id, status, is_active)
      VALUES (v_school_id, v_school_id, p_student_id, v_vehicle_id, v_route_id, 'Vinculado', true)
      ON CONFLICT (student_id) DO UPDATE 
      SET vehicle_id = EXCLUDED.vehicle_id,
          route_id = EXCLUDED.route_id,
          status = 'Vinculado',
          is_active = true,
          updated_at = NOW();
    END IF;
  ELSE
    -- Mantém status aguardando_vinculacao
    UPDATE public.transport_agreements
    SET status = 'aguardando_vinculacao',
        updated_at = NOW()
    WHERE student_id = p_student_id AND school_id = v_school_id AND status <> 'vinculado';
  END IF;
END;
$$;

-- 5. TRIGGER DE SOLICITAÇÃO DE VÍNCULO AO MARCAR TRANSPORTE EM STUDENTS
CREATE OR REPLACE FUNCTION public.request_transport_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_school_id UUID;
  v_uses_next BOOLEAN;
  v_uses_old BOOLEAN;
BEGIN
  v_school_id := COALESCE(NEW.school_id, NEW.organization_id);
  v_uses_next := (COALESCE(NEW.uses_school_transport, false) OR COALESCE(NEW.uses_transport, false));
  v_uses_old := (COALESCE(OLD.uses_school_transport, false) OR COALESCE(OLD.uses_transport, false));

  IF v_uses_next = true AND v_uses_old IS DISTINCT FROM true THEN
    IF v_school_id IS NOT NULL THEN
      INSERT INTO public.transport_agreements (school_id, student_id, status, requested_at)
      VALUES (v_school_id, NEW.id, 'aguardando_vinculacao', NOW())
      ON CONFLICT (student_id, school_id) DO UPDATE
      SET status = CASE WHEN transport_agreements.status = 'cancelado' THEN 'aguardando_vinculacao' ELSE transport_agreements.status END,
          updated_at = NOW();

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transport_students') THEN
        INSERT INTO public.transport_students (school_id, organization_id, student_id, status, is_active)
        VALUES (v_school_id, v_school_id, NEW.id, 'Aguardando Vinculação', true)
        ON CONFLICT (student_id) DO UPDATE
        SET status = CASE WHEN transport_students.status = 'Inativo' THEN 'Aguardando Vinculação' ELSE transport_students.status END,
            is_active = true,
            updated_at = NOW();
      END IF;

      PERFORM public.try_auto_link_transport(NEW.id);
    END IF;
  ELSIF v_uses_next = false AND v_uses_old = true THEN
    UPDATE public.transport_agreements
    SET status = 'cancelado',
        vehicle_id = NULL,
        route_id = NULL,
        updated_at = NOW()
    WHERE student_id = NEW.id;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transport_students') THEN
      DELETE FROM public.transport_students WHERE student_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_transport_link ON public.students;
CREATE TRIGGER trg_request_transport_link
AFTER INSERT OR UPDATE OF uses_school_transport, uses_transport ON public.students
FOR EACH ROW EXECUTE FUNCTION public.request_transport_link();

-- 6. RLS E ISOLAMENTO MULTI-ESCOLA
ALTER TABLE public.transport_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gestor_ve_apenas_transporte_sua_escola" ON public.transport_agreements;
CREATE POLICY "gestor_ve_apenas_transporte_sua_escola"
ON public.transport_agreements FOR ALL
USING (
  school_id = public.get_current_user_school_id() 
  OR public.get_current_user_school_id() IS NULL
)
WITH CHECK (
  school_id = public.get_current_user_school_id() 
  OR public.get_current_user_school_id() IS NULL
);

DROP POLICY IF EXISTS "gestor_ve_apenas_veiculos_sua_escola" ON public.transport_vehicles;
CREATE POLICY "gestor_ve_apenas_veiculos_sua_escola"
ON public.transport_vehicles FOR ALL
USING (
  school_id = public.get_current_user_school_id() 
  OR organization_id = public.get_current_user_school_id() 
  OR public.get_current_user_school_id() IS NULL
)
WITH CHECK (
  school_id = public.get_current_user_school_id() 
  OR organization_id = public.get_current_user_school_id() 
  OR public.get_current_user_school_id() IS NULL
);

-- 7. HABILITAR SUPABASE REALTIME NAS TABELAS DE TRANSPORTE
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_agreements;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_vehicles;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_students;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
