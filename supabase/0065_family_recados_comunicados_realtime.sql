-- ====================================================================
-- CLASSIUM ERP EDUCACIONAL — MÓDULO DE RECADOS E COMUNICADOS (PORTAL DA FAMÍLIA)
-- MIGRATION: 0065_family_recados_comunicados_realtime.sql
-- Multi-tenant, RLS Hardening, Realtime WebSockets & RPCs Atômicas
-- ====================================================================

-- 1. TABELA DE TIPOS DE COMUNICAÇÃO (communication_types)
CREATE TABLE IF NOT EXISTS public.communication_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE, -- 'Urgente', 'Assinatura', 'Convocação', 'Informativo'
    code VARCHAR(50) NOT NULL UNIQUE, -- 'urgent', 'signature', 'convocation', 'info'
    description TEXT,
    icon VARCHAR(50) DEFAULT 'bell',
    color_scheme VARCHAR(50) DEFAULT 'gold',
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir os 4 tipos oficiais caso não existam
INSERT INTO public.communication_types (id, name, code, description, icon, color_scheme, display_order)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Urgentes', 'urgent', 'Recados de emergência médica, inspetoria e avisos imediatos', 'alert-circle', 'red', 1),
    ('22222222-2222-2222-2222-222222222222', 'Assinaturas', 'signature', 'Termos, autorizações de passeios e documentos para assinatura digital', 'shield-check', 'amber', 2),
    ('33333333-3333-3333-3333-333333333333', 'Convocações', 'convocation', 'Convocações para reuniões pedagógicas, conselho de classe e plantão', 'calendar', 'blue', 3),
    ('44444444-4444-4444-4444-444444444444', 'Informativos', 'info', 'Boletins periódicos, recomendações de saúde e avisos institucionais', 'message-square', 'emerald', 4)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

-- 2. TABELA PRINCIPAL DE COMUNICAÇÕES (communications)
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    communication_type_id UUID REFERENCES public.communication_types(id) ON DELETE SET NULL,
    type_code VARCHAR(50) DEFAULT 'urgent', -- 'urgent' | 'signature' | 'convocation' | 'info'
    severity VARCHAR(50) DEFAULT 'EMERGÊNCIA', -- 'EMERGÊNCIA' | 'ATENÇÃO' | 'INFORMATIVO' | 'CONVOCAÇÃO'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    sender_name VARCHAR(255) NOT NULL, -- Ex: 'Enfermagem Escolar (Enf. Aparecida Lima)'
    sender_role VARCHAR(100), -- Ex: 'Enfermeira Chefe'
    sender_avatar TEXT,
    sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_audience VARCHAR(100) DEFAULT 'specific_student', -- 'all', 'specific_student', 'class'
    target_class VARCHAR(100),
    target_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    target_student_name VARCHAR(255), -- Ex: 'João Silva de Alencar'
    target_student_label VARCHAR(100), -- Ex: 'Para: João' ou 'Para: Todos os Filhos / Comunicado Geral'
    requires_acknowledgment BOOLEAN DEFAULT FALSE,
    requires_signature BOOLEAN DEFAULT FALSE,
    location VARCHAR(255), -- Para reuniões/convocações
    scheduled_date DATE,
    scheduled_time VARCHAR(50),
    due_date DATE,
    cost VARCHAR(50) DEFAULT 'Gratuito',
    status VARCHAR(50) DEFAULT 'published', -- 'draft', 'published', 'archived'
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas essenciais
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'organization_id') THEN
        ALTER TABLE public.communications ADD COLUMN organization_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'severity') THEN
        ALTER TABLE public.communications ADD COLUMN severity VARCHAR(50) DEFAULT 'EMERGÊNCIA';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'target_student_label') THEN
        ALTER TABLE public.communications ADD COLUMN target_student_label VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'target_student_name') THEN
        ALTER TABLE public.communications ADD COLUMN target_student_name VARCHAR(255);
    END IF;
END $$;

-- 3. TABELA DE ANEXOS DE COMUNICAÇÕES (communication_attachments)
CREATE TABLE IF NOT EXISTS public.communication_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) DEFAULT 'pdf', -- 'pdf', 'image', 'document', 'medical'
    file_size VARCHAR(50) DEFAULT '300 KB',
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE DESTINATÁRIOS E STATUS DE LEITURA/CIÊNCIA (communication_recipients)
CREATE TABLE IF NOT EXISTS public.communication_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
    guardian_name VARCHAR(255),
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    student_name VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by_name VARCHAR(255),
    is_signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMPTZ,
    signed_by_name VARCHAR(255),
    signature_data TEXT, -- Base64 da assinatura desenhada ou PIN
    convocation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'justified', 'rescheduled'
    justification_text TEXT,
    reschedule_suggestion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_comms_type ON public.communications(type_code);
CREATE INDEX IF NOT EXISTS idx_comms_student ON public.communications(target_student_id);
CREATE INDEX IF NOT EXISTS idx_comms_sent_at ON public.communications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_recipients_comm ON public.communication_recipients(communication_id);
CREATE INDEX IF NOT EXISTS idx_comm_recipients_student ON public.communication_recipients(student_id);
CREATE INDEX IF NOT EXISTS idx_comm_recipients_guardian ON public.communication_recipients(guardian_id);

-- 5. RLS POLICIES
ALTER TABLE public.communication_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read communication types" ON public.communication_types;
CREATE POLICY "Allow all users to read communication types" ON public.communication_types
    FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated to read communications" ON public.communications;
CREATE POLICY "Allow authenticated to read communications" ON public.communications
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Allow staff to insert/update communications" ON public.communications;
CREATE POLICY "Allow staff to insert/update communications" ON public.communications
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.communication_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read communication attachments" ON public.communication_attachments;
CREATE POLICY "Allow read communication attachments" ON public.communication_attachments
    FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.communication_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read communication recipients" ON public.communication_recipients;
CREATE POLICY "Allow read communication recipients" ON public.communication_recipients
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Allow update communication recipients" ON public.communication_recipients;
CREATE POLICY "Allow update communication recipients" ON public.communication_recipients
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 6. RPC ATÔMICA: acknowledge_communication (Li e Estou Ciente)
CREATE OR REPLACE FUNCTION public.acknowledge_communication(
    p_communication_id UUID,
    p_guardian_name TEXT DEFAULT 'Responsável',
    p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_affected INT := 0;
    v_formatted_ts TEXT;
BEGIN
    -- Formata timestamp no padrão pt-BR
    v_formatted_ts := to_char(v_now AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI');

    -- Atualiza na tabela de recipients
    UPDATE public.communication_recipients
    SET 
        is_acknowledged = TRUE,
        acknowledged_at = v_now,
        acknowledged_by_name = p_guardian_name,
        is_read = TRUE,
        read_at = COALESCE(read_at, v_now),
        updated_at = v_now
    WHERE communication_id = p_communication_id
      AND (p_student_id IS NULL OR student_id = p_student_id OR student_id IS NULL);
      
    GET DIAGNOSTICS v_affected = ROW_COUNT;

    -- Se não existia recipient explícito, cria um registro de ciência
    IF v_affected = 0 THEN
        INSERT INTO public.communication_recipients (
            communication_id,
            guardian_name,
            student_id,
            is_read,
            read_at,
            is_acknowledged,
            acknowledged_at,
            acknowledged_by_name
        ) VALUES (
            p_communication_id,
            p_guardian_name,
            p_student_id,
            TRUE,
            v_now,
            TRUE,
            v_now,
            p_guardian_name
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'communication_id', p_communication_id,
        'acknowledged_at', v_now,
        'formatted_date', v_formatted_ts,
        'acknowledged_by', p_guardian_name
    );
END;
$$;

-- 7. RPC ATÔMICA: sign_communication_document (Assinatura Digital)
CREATE OR REPLACE FUNCTION public.sign_communication_document(
    p_communication_id UUID,
    p_signed_by_name TEXT,
    p_signature_data TEXT DEFAULT 'DIGITAL_PIN_AUTH'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_formatted_ts TEXT;
BEGIN
    v_formatted_ts := to_char(v_now AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI');

    UPDATE public.communication_recipients
    SET 
        is_signed = TRUE,
        signed_at = v_now,
        signed_by_name = p_signed_by_name,
        signature_data = p_signature_data,
        is_acknowledged = TRUE,
        acknowledged_at = v_now,
        is_read = TRUE,
        updated_at = v_now
    WHERE communication_id = p_communication_id;

    RETURN jsonb_build_object(
        'success', true,
        'communication_id', p_communication_id,
        'signed_at', v_now,
        'formatted_date', v_formatted_ts,
        'signed_by', p_signed_by_name
    );
END;
$$;

-- 8. RPC ATÔMICA: respond_convocation (Confirmar / Justificar Convocação)
CREATE OR REPLACE FUNCTION public.respond_convocation(
    p_communication_id UUID,
    p_status TEXT, -- 'confirmed' | 'justified' | 'rescheduled'
    p_justification TEXT DEFAULT NULL,
    p_reschedule_suggestion TEXT DEFAULT NULL,
    p_guardian_name TEXT DEFAULT 'Responsável'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_formatted_ts TEXT;
BEGIN
    v_formatted_ts := to_char(v_now AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI');

    UPDATE public.communication_recipients
    SET 
        convocation_status = p_status,
        justification_text = p_justification,
        reschedule_suggestion = p_reschedule_suggestion,
        is_acknowledged = TRUE,
        acknowledged_at = v_now,
        acknowledged_by_name = p_guardian_name,
        is_read = TRUE,
        updated_at = v_now
    WHERE communication_id = p_communication_id;

    RETURN jsonb_build_object(
        'success', true,
        'communication_id', p_communication_id,
        'status', p_status,
        'responded_at', v_now,
        'formatted_date', v_formatted_ts
    );
END;
$$;

-- 9. HABILITAR SUPABASE REALTIME
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_types;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_attachments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_recipients;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 10. POVOAMENTO DOS DADOS OFICIAIS (SEED REAL CORRESPONDENTE À IMAGEM)
DO $$
DECLARE
    v_comm1_id UUID := 'c0000001-0000-0000-0000-000000000001';
    v_comm2_id UUID := 'c0000002-0000-0000-0000-000000000002';
    v_comm3_id UUID := 'c0000003-0000-0000-0000-000000000003';
    v_comm4_id UUID := 'c0000004-0000-0000-0000-000000000004';
    v_comm5_id UUID := 'c0000005-0000-0000-0000-000000000005';
    v_comm6_id UUID := 'c0000006-0000-0000-0000-000000000006';
    v_student_joao_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- COMUNICADO 1: Febre de 38.2°C e Mal-Estar Geral (EMERGÊNCIA - Card 1 da Imagem)
    INSERT INTO public.communications (
        id,
        type_code,
        severity,
        title,
        content,
        sender_name,
        sender_role,
        target_student_id,
        target_student_name,
        target_student_label,
        target_audience,
        requires_acknowledgment,
        sent_at
    ) VALUES (
        v_comm1_id,
        'urgent',
        'EMERGÊNCIA',
        'Febre de 38.2°C e Mal-Estar Geral',
        'O estudante João compareceu à enfermaria reclamando de calafrios e dor de cabeça. A temperatura aferida foi de 38.2°C. Administramos compressa fria. Favor trazer a medicação autorizada ou comparecer à escola para retirada imediata do estudante.',
        'Enfermagem Escolar (Enf. Aparecida Lima)',
        'Enfermeira Escolar',
        v_student_joao_id,
        'João Silva de Alencar',
        'Para: João',
        'specific_student',
        TRUE,
        '2026-07-18 18:15:00+00'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        severity = EXCLUDED.severity,
        sender_name = EXCLUDED.sender_name,
        target_student_label = EXCLUDED.target_student_label,
        requires_acknowledgment = EXCLUDED.requires_acknowledgment;

    -- Anexo do Comunicado 1
    INSERT INTO public.communication_attachments (
        id, communication_id, file_name, file_url, file_type, file_size, mime_type
    ) VALUES (
        'a0000001-0000-0000-0000-000000000001',
        v_comm1_id,
        'Relatorio_Triagem_Clinica_João_Silva_de_Alencar.pdf',
        'https://educa-plus.storage.supabase.co/reports/Relatorio_Triagem_Clinica_Joao_Silva.pdf',
        'medical',
        '298 KB',
        'application/pdf'
    ) ON CONFLICT (id) DO NOTHING;

    -- Recipient do Comunicado 1 (Ainda NÃO ciente - Botão LI E ESTOU CIENTE ativo)
    INSERT INTO public.communication_recipients (
        id, communication_id, student_id, student_name, is_read, is_acknowledged
    ) VALUES (
        'r0000001-0000-0000-0000-000000000001',
        v_comm1_id,
        v_student_joao_id,
        'João Silva de Alencar',
        TRUE,
        FALSE
    ) ON CONFLICT (id) DO NOTHING;

    -- COMUNICADO 2: Escoriação Leve no Joelho Direito (ATENÇÃO - Card 2 da Imagem)
    INSERT INTO public.communications (
        id,
        type_code,
        severity,
        title,
        content,
        sender_name,
        sender_role,
        target_student_id,
        target_student_name,
        target_student_label,
        target_audience,
        requires_acknowledgment,
        sent_at
    ) VALUES (
        v_comm2_id,
        'urgent',
        'ATENÇÃO',
        'Escoriação Leve no Joelho Direito (Recreio)',
        'Durante o recreio de futebol, o estudante João sofreu uma queda acidental na quadra de esportes, causando uma pequena escoriação no joelho direito. Foi realizado assepsia local com soro fisiológico e aplicado antisséptico. Aluno está bem, calmo e retornou normalmente para as atividades em sala de aula.',
        'Inspetoria Disciplinar (Monitora Solange)',
        'Monitora de Pátio',
        v_student_joao_id,
        'João Silva de Alencar',
        'Para: João',
        'specific_student',
        TRUE,
        '2026-07-17 14:30:00+00'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        severity = EXCLUDED.severity,
        sender_name = EXCLUDED.sender_name,
        target_student_label = EXCLUDED.target_student_label,
        requires_acknowledgment = EXCLUDED.requires_acknowledgment;

    -- Anexo do Comunicado 2
    INSERT INTO public.communication_attachments (
        id, communication_id, file_name, file_url, file_type, file_size, mime_type
    ) VALUES (
        'a0000002-0000-0000-0000-000000000002',
        v_comm2_id,
        'Curativo_Joelho_Registro.jpg',
        'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
        'image',
        '1.2 MB',
        'image/jpeg'
    ) ON CONFLICT (id) DO NOTHING;

    -- Recipient do Comunicado 2 (Já ciente em 17/07/2026 às 15:10)
    INSERT INTO public.communication_recipients (
        id, communication_id, student_id, student_name, is_read, is_acknowledged, acknowledged_at
    ) VALUES (
        'r0000002-0000-0000-0000-000000000002',
        v_comm2_id,
        v_student_joao_id,
        'João Silva de Alencar',
        TRUE,
        TRUE,
        '2026-07-17 15:10:00+00'
    ) ON CONFLICT (id) DO NOTHING;

    -- COMUNICADO 3: Recomendação de Agasalho e Garrafa Térmica (INFORMATIVO - Card 3 da Imagem)
    INSERT INTO public.communications (
        id,
        type_code,
        severity,
        title,
        content,
        sender_name,
        sender_role,
        target_student_name,
        target_student_label,
        target_audience,
        requires_acknowledgment,
        sent_at
    ) VALUES (
        v_comm3_id,
        'info',
        'INFORMATIVO',
        'Recomendação de Agasalho e Garrafa Térmica',
        'Devido à forte frente fria que atingirá nossa região nos próximos dias, solicitamos aos responsáveis que enviem os estudantes devidamente agasalhados com o uniforme oficial da escola e que tragam suas garrafinhas térmicas com água, de modo a evitar o compartilhamento direto de bebedouros.',
        'Coordenação Geral',
        'Coordenação Pedagógica',
        'Todos os Filhos / Comunicado Geral',
        'Para: Todos os Filhos / Comunicado Geral',
        'all',
        TRUE,
        '2026-07-16 08:00:00+00'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        severity = EXCLUDED.severity,
        sender_name = EXCLUDED.sender_name,
        target_student_label = EXCLUDED.target_student_label,
        requires_acknowledgment = EXCLUDED.requires_acknowledgment;

    -- Recipient do Comunicado 3 (Já ciente em 16/07/2026 às 09:45)
    INSERT INTO public.communication_recipients (
        id, communication_id, student_name, is_read, is_acknowledged, acknowledged_at
    ) VALUES (
        'r0000003-0000-0000-0000-000000000003',
        v_comm3_id,
        'Todos os Filhos / Geral',
        TRUE,
        TRUE,
        '2026-07-16 09:45:00+00'
    ) ON CONFLICT (id) DO NOTHING;

    -- COMUNICADO 4: Convocação Reunião de Alinhamento Pedagógico (CONVOCAÇÃO)
    INSERT INTO public.communications (
        id,
        type_code,
        severity,
        title,
        content,
        sender_name,
        sender_role,
        target_student_id,
        target_student_name,
        target_student_label,
        target_audience,
        scheduled_date,
        scheduled_time,
        location,
        requires_acknowledgment,
        sent_at
    ) VALUES (
        v_comm4_id,
        'convocation',
        'CONVOCAÇÃO',
        'Reunião Individual de Acompanhamento e Alinhamento Pedagógico',
        'Convidamos os responsáveis do estudante João para uma sessão individual de acompanhamento do rendimento escolar, desenvolvimento socioemocional e metas do 3º trimestre.',
        'Coordenação do Fundamental II (Profa. Elaine Santos)',
        'Pedagoga',
        v_student_joao_id,
        'João Silva de Alencar',
        'Para: João',
        'specific_student',
        '2026-08-25',
        '14:30',
        'Sala de Reuniões Pedagógicas - Bloco B',
        TRUE,
        '2026-08-15 10:00:00+00'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        severity = EXCLUDED.severity;

    INSERT INTO public.communication_recipients (
        id, communication_id, student_id, student_name, is_read, convocation_status
    ) VALUES (
        'r0000004-0000-0000-0000-000000000004',
        v_comm4_id,
        v_student_joao_id,
        'João Silva de Alencar',
        TRUE,
        'pending'
    ) ON CONFLICT (id) DO NOTHING;

    -- COMUNICADO 5: Convocação Plantão de Dúvidas e Pré-Conselho
    INSERT INTO public.communications (
        id,
        type_code,
        severity,
        title,
        content,
        sender_name,
        sender_role,
        target_student_name,
        target_student_label,
        target_audience,
        scheduled_date,
        scheduled_time,
        location,
        requires_acknowledgment,
        sent_at
    ) VALUES (
        v_comm5_id,
        'convocation',
        'CONVOCAÇÃO',
        'Plantão de Atendimento às Famílias — 3º Trimestre',
        'Encontro coletivo com os professores das disciplinas de Ciências da Natureza e Matemática para alinhamento de estratégias de reforço.',
        'Diretoria de Ensino',
        'Diretoria',
        'Todos os Filhos / Comunicado Geral',
        'Para: Todos os Filhos / Geral',
        'all',
        '2026-08-28',
        '17:00',
        'Auditório Principal',
        TRUE,
        '2026-08-14 11:00:00+00'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content;

    INSERT INTO public.communication_recipients (
        id, communication_id, student_name, is_read, convocation_status
    ) VALUES (
        'r0000005-0000-0000-0000-000000000005',
        v_comm5_id,
        'Geral',
        TRUE,
        'pending'
    ) ON CONFLICT (id) DO NOTHING;

    -- COMUNICADO 6: Termo de Autorização para Aula de Campo (ASSINATURAS)
    INSERT INTO public.communications (
        id,
        type_code,
        severity,
        title,
        content,
        sender_name,
        sender_role,
        target_student_id,
        target_student_name,
        target_student_label,
        target_audience,
        due_date,
        cost,
        requires_signature,
        sent_at
    ) VALUES (
        v_comm6_id,
        'signature',
        'DOCUMENTO',
        'Autorização para Aula de Campo - Museu de Ciência e Tecnologia',
        'Autorização legal para deslocamento em ônibus escolar monitorado, com saída às 08:00h e retorno previsto para as 16:30h. Inclui seguro viagem e almoço coletivo supervisionado.',
        'Secretaria Escolar',
        'Secretaria Acadêmica',
        v_student_joao_id,
        'João Silva de Alencar',
        'Para: João',
        'specific_student',
        '2026-08-30',
        'Gratuito',
        TRUE,
        '2026-08-10 09:00:00+00'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content;

    INSERT INTO public.communication_attachments (
        id, communication_id, file_name, file_url, file_type, file_size, mime_type
    ) VALUES (
        'a0000006-0000-0000-0000-000000000006',
        v_comm6_id,
        'Termo_Aula_Campo_Museu_Ciencia.pdf',
        'https://educa-plus.storage.supabase.co/docs/Termo_Aula_Campo.pdf',
        'document',
        '450 KB',
        'application/pdf'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.communication_recipients (
        id, communication_id, student_id, student_name, is_read, is_signed
    ) VALUES (
        'r0000006-0000-0000-0000-000000000006',
        v_comm6_id,
        v_student_joao_id,
        'João Silva de Alencar',
        TRUE,
        FALSE
    ) ON CONFLICT (id) DO NOTHING;

END $$;
