-- ==============================================================================
-- CLASSIUM EDUCACIONAL - MIGRATION 0064
-- INTEGRAÇÃO EM TEMPO REAL: "HORÁRIO DE AULA" (PORTAL DA FAMÍLIA & SMART HORÁRIOS)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE TURNOS ESCOLARES (school_shifts)
CREATE TABLE IF NOT EXISTS public.school_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL, -- Ex: '1º Turno (Matutino)', '2º Turno (Vespertino)', 'Integral'
    shift_code TEXT,
    start_time TIME NOT NULL DEFAULT '07:30:00',
    end_time TIME NOT NULL DEFAULT '12:30:00',
    interval_start TIME DEFAULT '08:50:00',
    interval_end TIME DEFAULT '09:10:00',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir / Atualizar Turnos padrão
INSERT INTO public.school_shifts (id, name, shift_code, start_time, end_time, interval_start, interval_end)
VALUES 
    ('s0000001-0000-0000-0000-000000000001'::uuid, '1º Turno (Matutino)', 'MAT', '07:30:00', '12:30:00', '08:50:00', '09:10:00'),
    ('s0000001-0000-0000-0000-000000000002'::uuid, '2º Turno (Vespertino)', 'VESP', '13:00:00', '18:00:00', '14:40:00', '15:00:00'),
    ('s0000001-0000-0000-0000-000000000003'::uuid, 'Integral', 'INT', '07:30:00', '17:30:00', '12:00:00', '13:00:00')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, 
    start_time = EXCLUDED.start_time, 
    end_time = EXCLUDED.end_time,
    interval_start = EXCLUDED.interval_start,
    interval_end = EXCLUDED.interval_end;

-- 2. TABELA DE SALAS DE AULA (classrooms)
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT,
    capacity INTEGER DEFAULT 36,
    building TEXT DEFAULT 'Bloco Principal',
    floor TEXT DEFAULT '1º Andar',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.classrooms (id, name, code, capacity, building, floor)
VALUES 
    ('a0000001-0000-0000-0000-000000000008'::uuid, 'Sala 08', 'SL-08', 35, 'Bloco A', '1º Andar'),
    ('a0000001-0000-0000-0000-000000000009'::uuid, 'Sala 09', 'SL-09', 35, 'Bloco A', '1º Andar'),
    ('a0000001-0000-0000-0000-000000000010'::uuid, 'Sala 10', 'SL-10', 35, 'Bloco A', '2º Andar'),
    ('a0000001-0000-0000-0000-000000000011'::uuid, 'Sala 11', 'SL-11', 35, 'Bloco A', '2º Andar'),
    ('a0000001-0000-0000-0000-000000000012'::uuid, 'Sala 12', 'SL-12', 36, 'Bloco B', '1º Andar'),
    ('a0000001-0000-0000-0000-000000000004'::uuid, 'Sala Multimídia 04', 'SL-04', 40, 'Bloco B', 'Térreo'),
    ('a0000001-0000-0000-0000-000000000002'::uuid, 'Laboratório Maker 02', 'LAB-02', 32, 'Bloco Tech', 'Térreo'),
    ('a0000001-0000-0000-0000-000000000003'::uuid, 'Laboratório Ciências', 'LAB-CIEN', 32, 'Bloco Tech', '1º Andar'),
    ('a0000001-0000-0000-0000-000000000005'::uuid, 'Quadra Poliesportiva', 'QUADRA', 60, 'Complexo Esportivo', 'Térreo')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, code = EXCLUDED.code, capacity = EXCLUDED.capacity;

-- 3. TABELA DE DISCIPLINAS (disciplines) & PROFESSORES (teachers)
CREATE TABLE IF NOT EXISTS public.disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'blue',
    weekly_classes INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.disciplines (id, code, name, color, weekly_classes)
VALUES 
    ('d0000001-0000-0000-0000-000000000001'::uuid, 's-port', 'Português', 'blue', 6),
    ('d0000001-0000-0000-0000-000000000002'::uuid, 's-mat', 'Matemática', 'orange', 6),
    ('d0000001-0000-0000-0000-000000000003'::uuid, 's-hist', 'História', 'green', 4),
    ('d0000001-0000-0000-0000-000000000004'::uuid, 's-geo', 'Geografia', 'purple', 4),
    ('d0000001-0000-0000-0000-000000000005'::uuid, 's-ef', 'Educação Física', 'red', 2),
    ('d0000001-0000-0000-0000-000000000006'::uuid, 's-cien', 'Ciências', 'teal', 4),
    ('d0000001-0000-0000-0000-000000000007'::uuid, 's-rob', 'Robótica & IA', 'blue', 2),
    ('d0000001-0000-0000-0000-000000000008'::uuid, 's-art', 'Artes Visuais', 'purple', 2)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, color = EXCLUDED.color;

CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_code TEXT UNIQUE,
    name TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    subject TEXT,
    discipline_id UUID REFERENCES public.disciplines(id),
    avatar_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.teachers (id, teacher_code, name, full_name, email, phone, subject, avatar_url)
VALUES 
    ('t0000001-0000-0000-0000-000000000001'::uuid, 't-carlos', 'Carlos Eduardo', 'Prof. Carlos Eduardo Alencar', 'carlos.alencar@escola.gmc.br', '(11) 98765-4321', 'Português', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'),
    ('t0000001-0000-0000-0000-000000000002'::uuid, 't-ana', 'Ana Julia', 'Profa. Ana Julia Ramos', 'ana.julia@escola.gmc.br', '(11) 98765-4322', 'Matemática', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
    ('t0000001-0000-0000-0000-000000000003'::uuid, 't-marcus', 'Marcos Vinícius', 'Prof. Marcos Vinícius Toledo', 'marcos.vinicius@escola.gmc.br', '(11) 98765-4323', 'História', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'),
    ('t0000001-0000-0000-0000-000000000004'::uuid, 't-marina', 'Marcos Polonio', 'Prof. Marcos Polonio Lima', 'marcos.polonio@escola.gmc.br', '(11) 98765-4324', 'Geografia', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
    ('t0000001-0000-0000-0000-000000000005'::uuid, 't-roberto', 'Roberto Rocha', 'Prof. Roberto Rocha Gomes', 'roberto.rocha@escola.gmc.br', '(11) 98765-4325', 'Educação Física', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'),
    ('t0000001-0000-0000-0000-000000000006'::uuid, 't-elaine', 'Elaine Santos', 'Profa. Elaine Santos Oliveira', 'elaine.santos@escola.gmc.br', '(11) 98765-4326', 'Ciências', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'),
    ('t0000001-0000-0000-0000-000000000007'::uuid, 't-vivian', 'Vivian Freitas', 'Profa. Vivian Freitas', 'vivian.freitas@escola.gmc.br', '(11) 98765-4327', 'Robótica & IA', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150')
ON CONFLICT (teacher_code) DO UPDATE 
SET name = EXCLUDED.name, full_name = EXCLUDED.full_name, subject = EXCLUDED.subject, avatar_url = EXCLUDED.avatar_url;

-- 4. TABELA DE CORPO DIRETIVO E PEDAGÓGICO (school_staff)
CREATE TABLE IF NOT EXISTS public.school_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id UUID,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    shift_id UUID REFERENCES public.school_shifts(id) ON DELETE SET NULL,
    shift_name TEXT DEFAULT '1º Turno (Matutino)',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.school_staff (id, full_name, role, email, phone, shift_name)
VALUES 
    ('f0000001-0000-0000-0000-000000000001'::uuid, 'Dra. Maria Helena Albuquerque', 'DIRETORA GERAL', 'diretoria@escola.gmc.br', '(11) 98877-1122', '1º Turno (Matutino)'),
    ('f0000001-0000-0000-0000-000000000002'::uuid, 'Prof. Roberto Mendes', 'VICE-DIRETOR OPERACIONAL', 'roberto.mendes@escola.gmc.br', '(11) 98877-1155', '1º Turno (Matutino)'),
    ('f0000001-0000-0000-0000-000000000003'::uuid, 'Profa. Elaine Santos', 'PEDAGOGA DO ENSINO FUNDAMENTAL II', 'pedagogia@escola.gmc.br', '(11) 98877-1166', '1º Turno (Matutino)'),
    ('f0000001-0000-0000-0000-000000000004'::uuid, 'Prof. Marcos Vinícius', 'COORDENADOR PEDAGÓGICO ENSINO MÉDIO', 'coordenacao@escola.gmc.br', '(11) 98877-1199', '1º Turno (Matutino)')
ON CONFLICT (id) DO UPDATE 
SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, email = EXCLUDED.email, phone = EXCLUDED.phone;

-- 5. TABELA DE GRADE HORÁRIA OFICIAL (class_schedules)
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    class_id TEXT NOT NULL,
    class_name TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    start_time TIME NOT NULL DEFAULT '07:30:00',
    end_time TIME NOT NULL DEFAULT '08:15:00',
    subject_id TEXT NOT NULL DEFAULT 's-port',
    subject_name TEXT NOT NULL DEFAULT 'Português',
    teacher_id TEXT NOT NULL DEFAULT 't-carlos',
    teacher_name TEXT NOT NULL DEFAULT 'Carlos Eduardo',
    teacher_avatar TEXT,
    room_id TEXT NOT NULL DEFAULT 'r-08',
    room_name TEXT NOT NULL DEFAULT 'Sala 08',
    status TEXT DEFAULT 'scheduled',
    is_interval BOOLEAN DEFAULT false,
    schedule_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Limpar grades antigas dessas turmas para recriar completas
DELETE FROM public.class_schedules WHERE class_id IN ('c-7a', 'c-8b', 'c-9a', 'c-5a', '7º Ano A', '8º Ano B', '9º Ano A', '5º Ano A');

-- ==============================================================================
-- 5.1 SEED COMPLETO: 7º ANO A (JOÃO SILVA DE ALENCAR - TURMA C-7A)
-- ==============================================================================
INSERT INTO public.class_schedules 
(class_id, class_name, day_of_week, time_slot, start_time, end_time, subject_id, subject_name, teacher_id, teacher_name, teacher_avatar, room_id, room_name, is_interval)
VALUES
-- SEGUNDA
('c-7a', '7º Ano A', 'Segunda', '07:30 - 08:15', '07:30:00', '08:15:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Segunda', '08:15 - 08:50', '08:15:00', '08:50:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Segunda', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-7a', '7º Ano A', 'Segunda', '09:10 - 09:55', '09:10:00', '09:55:00', 's-geo', 'Geografia', 't-marina', 'Marcos Polonio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Segunda', '09:55 - 10:40', '09:55:00', '10:40:00', 's-geo', 'Geografia', 't-marina', 'Marcos Polonio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Segunda', '10:40 - 11:30', '10:40:00', '11:30:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false),

-- TERÇA
('c-7a', '7º Ano A', 'Terça', '07:30 - 08:15', '07:30:00', '08:15:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Terça', '08:15 - 08:50', '08:15:00', '08:50:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Terça', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-7a', '7º Ano A', 'Terça', '09:10 - 09:55', '09:10:00', '09:55:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Terça', '09:55 - 10:40', '09:55:00', '10:40:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Terça', '10:40 - 11:30', '10:40:00', '11:30:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-08', 'Sala 08', false),

-- QUARTA
('c-7a', '7º Ano A', 'Quarta', '07:30 - 08:15', '07:30:00', '08:15:00', 's-ef', 'Educação Física', 't-roberto', 'Roberto Rocha', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'r-05', 'Quadra Poliesportiva', false),
('c-7a', '7º Ano A', 'Quarta', '08:15 - 08:50', '08:15:00', '08:50:00', 's-ef', 'Educação Física', 't-roberto', 'Roberto Rocha', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'r-05', 'Quadra Poliesportiva', false),
('c-7a', '7º Ano A', 'Quarta', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-7a', '7º Ano A', 'Quarta', '09:10 - 09:55', '09:10:00', '09:55:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Quarta', '09:55 - 10:40', '09:55:00', '10:40:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Quarta', '10:40 - 11:30', '10:40:00', '11:30:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false),

-- QUINTA
('c-7a', '7º Ano A', 'Quinta', '07:30 - 08:15', '07:30:00', '08:15:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Quinta', '08:15 - 08:50', '08:15:00', '08:50:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Quinta', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-7a', '7º Ano A', 'Quinta', '09:10 - 09:55', '09:10:00', '09:55:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Quinta', '09:55 - 10:40', '09:55:00', '10:40:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Quinta', '10:40 - 11:30', '10:40:00', '11:30:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),

-- SEXTA
('c-7a', '7º Ano A', 'Sexta', '07:30 - 08:15', '07:30:00', '08:15:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Sexta', '08:15 - 08:50', '08:15:00', '08:50:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),
('c-7a', '7º Ano A', 'Sexta', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-7a', '7º Ano A', 'Sexta', '09:10 - 09:55', '09:10:00', '09:55:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false),
('c-7a', '7º Ano A', 'Sexta', '09:55 - 10:40', '09:55:00', '10:40:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false),
('c-7a', '7º Ano A', 'Sexta', '10:40 - 11:30', '10:40:00', '11:30:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-08', 'Sala 08', false);

-- ==============================================================================
-- 5.2 SEED COMPLETO: 8º ANO B (MARIA OLIVEIRA DE SOUZA - TURMA C-8B)
-- ==============================================================================
INSERT INTO public.class_schedules 
(class_id, class_name, day_of_week, time_slot, start_time, end_time, subject_id, subject_name, teacher_id, teacher_name, teacher_avatar, room_id, room_name, is_interval)
VALUES
('c-8b', '8º Ano B', 'Segunda', '07:30 - 08:15', '07:30:00', '08:15:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Segunda', '08:15 - 08:50', '08:15:00', '08:50:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Segunda', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-8b', '8º Ano B', 'Segunda', '09:10 - 09:55', '09:10:00', '09:55:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Segunda', '09:55 - 10:40', '09:55:00', '10:40:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Segunda', '10:40 - 11:30', '10:40:00', '11:30:00', 's-geo', 'Geografia', 't-marina', 'Marcos Polonio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'r-09', 'Sala 09', false),

('c-8b', '8º Ano B', 'Terça', '07:30 - 08:15', '07:30:00', '08:15:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Terça', '08:15 - 08:50', '08:15:00', '08:50:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Terça', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-8b', '8º Ano B', 'Terça', '09:10 - 09:55', '09:10:00', '09:55:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false),
('c-8b', '8º Ano B', 'Terça', '09:55 - 10:40', '09:55:00', '10:40:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false),
('c-8b', '8º Ano B', 'Terça', '10:40 - 11:30', '10:40:00', '11:30:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-09', 'Sala 09', false),

('c-8b', '8º Ano B', 'Quarta', '07:30 - 08:15', '07:30:00', '08:15:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Quarta', '08:15 - 08:50', '08:15:00', '08:50:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Quarta', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-8b', '8º Ano B', 'Quarta', '09:10 - 09:55', '09:10:00', '09:55:00', 's-geo', 'Geografia', 't-marina', 'Marcos Polonio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Quarta', '09:55 - 10:40', '09:55:00', '10:40:00', 's-geo', 'Geografia', 't-marina', 'Marcos Polonio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Quarta', '10:40 - 11:30', '10:40:00', '11:30:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-09', 'Sala 09', false),

('c-8b', '8º Ano B', 'Quinta', '07:30 - 08:15', '07:30:00', '08:15:00', 's-ef', 'Educação Física', 't-roberto', 'Roberto Rocha', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'r-05', 'Quadra Poliesportiva', false),
('c-8b', '8º Ano B', 'Quinta', '08:15 - 08:50', '08:15:00', '08:50:00', 's-ef', 'Educação Física', 't-roberto', 'Roberto Rocha', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'r-05', 'Quadra Poliesportiva', false),
('c-8b', '8º Ano B', 'Quinta', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-8b', '8º Ano B', 'Quinta', '09:10 - 09:55', '09:10:00', '09:55:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Quinta', '09:55 - 10:40', '09:55:00', '10:40:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Quinta', '10:40 - 11:30', '10:40:00', '11:30:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-09', 'Sala 09', false),

('c-8b', '8º Ano B', 'Sexta', '07:30 - 08:15', '07:30:00', '08:15:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Sexta', '08:15 - 08:50', '08:15:00', '08:50:00', 's-rob', 'Robótica & IA', 't-vivian', 'Vivian Freitas', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'r-02', 'Laboratório Maker 02', false),
('c-8b', '8º Ano B', 'Sexta', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-8b', '8º Ano B', 'Sexta', '09:10 - 09:55', '09:10:00', '09:55:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Sexta', '09:55 - 10:40', '09:55:00', '10:40:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-09', 'Sala 09', false),
('c-8b', '8º Ano B', 'Sexta', '10:40 - 11:30', '10:40:00', '11:30:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-09', 'Sala 09', false);

-- ==============================================================================
-- 5.3 SEED COMPLETO: 9º ANO A (PEDRO HENRIQUE SOUZA NETO - TURMA C-9A)
-- ==============================================================================
INSERT INTO public.class_schedules 
(class_id, class_name, day_of_week, time_slot, start_time, end_time, subject_id, subject_name, teacher_id, teacher_name, teacher_avatar, room_id, room_name, is_interval)
VALUES
('c-9a', '9º Ano A', 'Segunda', '07:30 - 08:15', '07:30:00', '08:15:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Segunda', '08:15 - 08:50', '08:15:00', '08:50:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Segunda', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-9a', '9º Ano A', 'Segunda', '09:10 - 09:55', '09:10:00', '09:55:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Segunda', '09:55 - 10:40', '09:55:00', '10:40:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Segunda', '10:40 - 11:30', '10:40:00', '11:30:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false),

('c-9a', '9º Ano A', 'Terça', '07:30 - 08:15', '07:30:00', '08:15:00', 's-geo', 'Geografia', 't-marina', 'Marcos Polonio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Terça', '08:15 - 08:50', '08:15:00', '08:50:00', 's-geo', 'Geografia', 't-marina', 'Marcos Polonio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Terça', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-9a', '9º Ano A', 'Terça', '09:10 - 09:55', '09:10:00', '09:55:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Terça', '09:55 - 10:40', '09:55:00', '10:40:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Terça', '10:40 - 11:30', '10:40:00', '11:30:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-12', 'Sala 12', false),

('c-9a', '9º Ano A', 'Quarta', '07:30 - 08:15', '07:30:00', '08:15:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Quarta', '08:15 - 08:50', '08:15:00', '08:50:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Quarta', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-9a', '9º Ano A', 'Quarta', '09:10 - 09:55', '09:10:00', '09:55:00', 's-ef', 'Educação Física', 't-roberto', 'Roberto Rocha', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'r-05', 'Quadra Poliesportiva', false),
('c-9a', '9º Ano A', 'Quarta', '09:55 - 10:40', '09:55:00', '10:40:00', 's-ef', 'Educação Física', 't-roberto', 'Roberto Rocha', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'r-05', 'Quadra Poliesportiva', false),
('c-9a', '9º Ano A', 'Quarta', '10:40 - 11:30', '10:40:00', '11:30:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false),

('c-9a', '9º Ano A', 'Quinta', '07:30 - 08:15', '07:30:00', '08:15:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Quinta', '08:15 - 08:50', '08:15:00', '08:50:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Quinta', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-9a', '9º Ano A', 'Quinta', '09:10 - 09:55', '09:10:00', '09:55:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Quinta', '09:55 - 10:40', '09:55:00', '10:40:00', 's-rob', 'Robótica & IA', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-02', 'Laboratório Maker 02', false),
('c-9a', '9º Ano A', 'Quinta', '10:40 - 11:30', '10:40:00', '11:30:00', 's-rob', 'Robótica & IA', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-02', 'Laboratório Maker 02', false),

('c-9a', '9º Ano A', 'Sexta', '07:30 - 08:15', '07:30:00', '08:15:00', 's-geo', 'Geografia', 't-marina', 'Marcos Polonio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Sexta', '08:15 - 08:50', '08:15:00', '08:50:00', 's-geo', 'Geografia', 't-marina', 'Marcos Polonio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Sexta', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-9a', '9º Ano A', 'Sexta', '09:10 - 09:55', '09:10:00', '09:55:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-12', 'Sala 12', false),
('c-9a', '9º Ano A', 'Sexta', '09:55 - 10:40', '09:55:00', '10:40:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false),
('c-9a', '9º Ano A', 'Sexta', '10:40 - 11:30', '10:40:00', '11:30:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false);

-- ==============================================================================
-- 5.4 SEED COMPLETO: 5º ANO A (GABRIEL HENRIQUE SILVA - TURMA C-5A)
-- ==============================================================================
INSERT INTO public.class_schedules 
(class_id, class_name, day_of_week, time_slot, start_time, end_time, subject_id, subject_name, teacher_id, teacher_name, teacher_avatar, room_id, room_name, is_interval)
VALUES
('c-5a', '5º Ano A', 'Segunda', '07:30 - 08:15', '07:30:00', '08:15:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Segunda', '08:15 - 08:50', '08:15:00', '08:50:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Segunda', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-5a', '5º Ano A', 'Segunda', '09:10 - 09:55', '09:10:00', '09:55:00', 's-geo', 'Geografia', 't-marina', 'Marcos Polonio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Segunda', '09:55 - 10:40', '09:55:00', '10:40:00', 's-geo', 'Geografia', 't-marina', 'Marcos Polonio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Segunda', '10:40 - 11:30', '10:40:00', '11:30:00', 's-geo', 'Geografia', 't-marina', 'Marcos Polonio', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'r-08', 'Sala 08', false),

('c-5a', '5º Ano A', 'Terça', '07:30 - 08:15', '07:30:00', '08:15:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Terça', '08:15 - 08:50', '08:15:00', '08:50:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Terça', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-5a', '5º Ano A', 'Terça', '09:10 - 09:55', '09:10:00', '09:55:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Terça', '09:55 - 10:40', '09:55:00', '10:40:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Terça', '10:40 - 11:30', '10:40:00', '11:30:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),

('c-5a', '5º Ano A', 'Quarta', '07:30 - 08:15', '07:30:00', '08:15:00', 's-ef', 'Educação Física', 't-roberto', 'Roberto Rocha', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'r-05', 'Quadra Poliesportiva', false),
('c-5a', '5º Ano A', 'Quarta', '08:15 - 08:50', '08:15:00', '08:50:00', 's-ef', 'Educação Física', 't-roberto', 'Roberto Rocha', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'r-05', 'Quadra Poliesportiva', false),
('c-5a', '5º Ano A', 'Quarta', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-5a', '5º Ano A', 'Quarta', '09:10 - 09:55', '09:10:00', '09:55:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Quarta', '09:55 - 10:40', '09:55:00', '10:40:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Quarta', '10:40 - 11:30', '10:40:00', '11:30:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),

('c-5a', '5º Ano A', 'Quinta', '07:30 - 08:15', '07:30:00', '08:15:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Quinta', '08:15 - 08:50', '08:15:00', '08:50:00', 's-hist', 'História', 't-marcus', 'Marcos Vinícius', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Quinta', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-5a', '5º Ano A', 'Quinta', '09:10 - 09:55', '09:10:00', '09:55:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Quinta', '09:55 - 10:40', '09:55:00', '10:40:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Quinta', '10:40 - 11:30', '10:40:00', '11:30:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'r-08', 'Sala 08', false),

('c-5a', '5º Ano A', 'Sexta', '07:30 - 08:15', '07:30:00', '08:15:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Sexta', '08:15 - 08:50', '08:15:00', '08:50:00', 's-mat', 'Matemática', 't-ana', 'Ana Julia', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'r-08', 'Sala 08', false),
('c-5a', '5º Ano A', 'Sexta', '08:50 - 09:10', '08:50:00', '09:10:00', 's-int', 'Intervalo Escolar', '', 'Coordenação', '', 'r-patio', 'Pátio Central', true),
('c-5a', '5º Ano A', 'Sexta', '09:10 - 09:55', '09:10:00', '09:55:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false),
('c-5a', '5º Ano A', 'Sexta', '09:55 - 10:40', '09:55:00', '10:40:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false),
('c-5a', '5º Ano A', 'Sexta', '10:40 - 11:30', '10:40:00', '11:30:00', 's-cien', 'Ciências', 't-elaine', 'Elaine Santos', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'r-03', 'Laboratório Ciências', false);

-- 6. RPC: GET STUDENT WEEKLY SCHEDULE WITH ROBUST MATCHING
CREATE OR REPLACE FUNCTION public.get_student_weekly_schedule(
    p_student_id UUID DEFAULT NULL,
    p_class_id TEXT DEFAULT NULL,
    p_class_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    class_id TEXT,
    class_name TEXT,
    day_of_week TEXT,
    time_slot TEXT,
    start_time TIME,
    end_time TIME,
    subject_id TEXT,
    subject_name TEXT,
    teacher_id TEXT,
    teacher_name TEXT,
    teacher_avatar TEXT,
    room_id TEXT,
    room_name TEXT,
    is_interval BOOLEAN,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_class_id TEXT := p_class_id;
    v_class_name TEXT := p_class_name;
BEGIN
    IF p_student_id IS NOT NULL THEN
        SELECT COALESCE(c.id::text, s.shift, 'c-7a'), COALESCE(c.name, '7º Ano A')
        INTO v_class_id, v_class_name
        FROM public.students s
        LEFT JOIN public.classes c ON c.id = s.class_id
        WHERE s.id = p_student_id;
    END IF;

    IF v_class_id IS NULL AND v_class_name IS NULL THEN
        v_class_id := 'c-7a';
    END IF;

    RETURN QUERY
    SELECT 
        cs.id,
        cs.class_id,
        cs.class_name,
        cs.day_of_week,
        cs.time_slot,
        cs.start_time,
        cs.end_time,
        cs.subject_id,
        cs.subject_name,
        cs.teacher_id,
        cs.teacher_name,
        COALESCE(cs.teacher_avatar, t.avatar_url, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'),
        cs.room_id,
        cs.room_name,
        cs.is_interval,
        COALESCE(cs.status, 'scheduled')
    FROM public.class_schedules cs
    LEFT JOIN public.teachers t ON t.teacher_code = cs.teacher_id OR t.name ILIKE cs.teacher_name
    WHERE (v_class_id IS NOT NULL AND cs.class_id = v_class_id)
       OR (v_class_name IS NOT NULL AND cs.class_name ILIKE '%' || v_class_name || '%')
       OR (cs.class_id = 'c-7a' AND v_class_id IS NULL)
    ORDER BY 
        CASE cs.day_of_week
            WHEN 'Segunda' THEN 1
            WHEN 'Terça' THEN 2
            WHEN 'Quarta' THEN 3
            WHEN 'Quinta' THEN 4
            WHEN 'Sexta' THEN 5
            WHEN 'Sábado' THEN 6
            ELSE 7
        END,
        cs.start_time;
END;
$$;

-- 7. RPC: GET ASSIGNED TEACHERS FOR CLASS
CREATE OR REPLACE FUNCTION public.get_class_assigned_teachers(
    p_class_id TEXT DEFAULT 'c-7a',
    p_class_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    teacher_id TEXT,
    name TEXT,
    full_name TEXT,
    subject TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        cs.teacher_id,
        cs.teacher_name AS name,
        COALESCE(t.full_name, cs.teacher_name) AS full_name,
        cs.subject_name AS subject,
        COALESCE(cs.teacher_avatar, t.avatar_url, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150') AS avatar_url
    FROM public.class_schedules cs
    LEFT JOIN public.teachers t ON t.teacher_code = cs.teacher_id OR t.name ILIKE cs.teacher_name
    WHERE (cs.class_id = p_class_id OR (p_class_name IS NOT NULL AND cs.class_name ILIKE '%' || p_class_name || '%') OR cs.class_id = 'c-7a')
      AND cs.is_interval = false
      AND cs.teacher_name != ''
      AND cs.teacher_name IS NOT NULL
    ORDER BY cs.subject_name;
END;
$$;

-- 8. GRANT DE PERMISSÕES
GRANT EXECUTE ON FUNCTION public.get_student_weekly_schedule(UUID, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_class_assigned_teachers(TEXT, TEXT) TO authenticated, anon;

-- 9. POLÍTICAS ROW LEVEL SECURITY (RLS)
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_class_schedules_public ON public.class_schedules;
CREATE POLICY p_class_schedules_public ON public.class_schedules FOR ALL USING (true);

DROP POLICY IF EXISTS p_school_shifts_public ON public.school_shifts;
CREATE POLICY p_school_shifts_public ON public.school_shifts FOR ALL USING (true);

DROP POLICY IF EXISTS p_classrooms_public ON public.classrooms;
CREATE POLICY p_classrooms_public ON public.classrooms FOR ALL USING (true);

DROP POLICY IF EXISTS p_disciplines_public ON public.disciplines;
CREATE POLICY p_disciplines_public ON public.disciplines FOR ALL USING (true);

DROP POLICY IF EXISTS p_teachers_public ON public.teachers;
CREATE POLICY p_teachers_public ON public.teachers FOR ALL USING (true);

DROP POLICY IF EXISTS p_school_staff_public ON public.school_staff;
CREATE POLICY p_school_staff_public ON public.school_staff FOR ALL USING (true);

-- 10. PUBLICAÇÃO REALTIME
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.class_schedules; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.school_shifts; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.classrooms; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.disciplines; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.teachers; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.school_staff; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;
