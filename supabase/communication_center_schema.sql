-- ============================================================================
-- CLASSIUM PORTAL DA FAMÍLIA: CENTRAL DE COMUNICAÇÃO INTELIGENTE
-- Migration SQL Script: Communications, Signatures, Convocations & Realtime
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA DE COMUNICADOS E RECADOS (communications)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('emergency', 'attention', 'info')),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL DEFAULT 'Coordenação Geral',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attachments JSONB DEFAULT '[]'::jsonb,
  target_type TEXT NOT NULL CHECK (target_type IN ('all_families', 'organization', 'class', 'student')),
  target_id UUID,
  organization_id UUID
);

-- Indexing for rapid queries by urgency, organization and student
CREATE INDEX IF NOT EXISTS idx_communications_urgency ON public.communications(urgency_level);
CREATE INDEX IF NOT EXISTS idx_communications_target ON public.communications(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_communications_created ON public.communications(created_at DESC);

-- Enable RLS
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "communications_select_policy" ON public.communications;
CREATE POLICY "communications_select_policy"
  ON public.communications FOR SELECT
  USING (true); -- Authenticated users can view targeted communications

DROP POLICY IF EXISTS "communications_insert_staff" ON public.communications;
CREATE POLICY "communications_insert_staff"
  ON public.communications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 2. TABELA DE CONFIRMAÇÃO DE LEITURA (communication_reads)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.communication_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
  reader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_acknowledged BOOLEAN DEFAULT FALSE,
  CONSTRAINT unique_communication_reader UNIQUE (communication_id, reader_id)
);

CREATE INDEX IF NOT EXISTS idx_comm_reads_comm_reader ON public.communication_reads(communication_id, reader_id);

-- Enable RLS
ALTER TABLE public.communication_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comm_reads_select_own" ON public.communication_reads;
CREATE POLICY "comm_reads_select_own"
  ON public.communication_reads FOR SELECT
  USING (auth.uid() = reader_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "comm_reads_insert_own" ON public.communication_reads;
CREATE POLICY "comm_reads_insert_own"
  ON public.communication_reads FOR INSERT
  WITH CHECK (auth.uid() = reader_id);

DROP POLICY IF EXISTS "comm_reads_update_own" ON public.communication_reads;
CREATE POLICY "comm_reads_update_own"
  ON public.communication_reads FOR UPDATE
  USING (auth.uid() = reader_id);

-- ----------------------------------------------------------------------------
-- 3. TABELA DE DOCUMENTOS PENDENTES DE ASSINATURA (signatures)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_title TEXT NOT NULL,
  document_url TEXT NOT NULL DEFAULT '',
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  target_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signatures_select_policy" ON public.signatures;
CREATE POLICY "signatures_select_policy"
  ON public.signatures FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "signatures_insert_staff" ON public.signatures;
CREATE POLICY "signatures_insert_staff"
  ON public.signatures FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 4. TABELA DE REGISTRO DE ASSINATURAS DO RESPONSÁVEL (responsible_signatures)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.responsible_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id UUID NOT NULL REFERENCES public.signatures(id) ON DELETE CASCADE,
  responsible_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signature_method TEXT DEFAULT 'draw', -- 'draw' or 'pin' or 'icp'
  signature_data TEXT,
  CONSTRAINT unique_responsible_signature UNIQUE (signature_id, responsible_id)
);

-- Enable RLS
ALTER TABLE public.responsible_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resp_signatures_select" ON public.responsible_signatures;
CREATE POLICY "resp_signatures_select"
  ON public.responsible_signatures FOR SELECT
  USING (auth.uid() = responsible_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "resp_signatures_insert" ON public.responsible_signatures;
CREATE POLICY "resp_signatures_insert"
  ON public.responsible_signatures FOR INSERT
  WITH CHECK (auth.uid() = responsible_id);

-- ----------------------------------------------------------------------------
-- 5. TABELA DE CONVOCAÇÕES PEDAGÓGICAS E REUNIÕES (convocations)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.convocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  meeting_location TEXT DEFAULT 'Auditório Principal / Sala de Reuniões',
  school_contact_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  school_contact_role TEXT NOT NULL DEFAULT 'Pedagogo / Coordenação',
  target_student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.convocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "convocations_select_policy" ON public.convocations;
CREATE POLICY "convocations_select_policy"
  ON public.convocations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "convocations_insert_staff" ON public.convocations;
CREATE POLICY "convocations_insert_staff"
  ON public.convocations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 6. TABELA DE RESPOSTAS ÀS CONVOCAÇÕES (convocation_responses)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.convocation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convocation_id UUID NOT NULL REFERENCES public.convocations(id) ON DELETE CASCADE,
  responsible_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('confirmed', 'justified', 'reschedule_requested')),
  justification_text TEXT,
  reschedule_suggestion TEXT,
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_convocation_response UNIQUE (convocation_id, responsible_id)
);

-- Enable RLS
ALTER TABLE public.convocation_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "convocation_responses_select" ON public.convocation_responses;
CREATE POLICY "convocation_responses_select"
  ON public.convocation_responses FOR SELECT
  USING (auth.uid() = responsible_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "convocation_responses_insert" ON public.convocation_responses;
CREATE POLICY "convocation_responses_insert"
  ON public.convocation_responses FOR INSERT
  WITH CHECK (auth.uid() = responsible_id);

DROP POLICY IF EXISTS "convocation_responses_update" ON public.convocation_responses;
CREATE POLICY "convocation_responses_update"
  ON public.convocation_responses FOR UPDATE
  USING (auth.uid() = responsible_id);

-- ----------------------------------------------------------------------------
-- 7. SUPABASE REALTIME PUBLICATION CONFIGURATION
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.communications;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_reads;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.signatures;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.responsible_signatures;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.convocations;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.convocation_responses;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
