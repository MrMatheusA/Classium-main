-- ==============================================================================
-- SCRIPT DE TESTE CONTROLADO: Passo 1.1-C2-C
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- OBJETIVO: Validação funcional da trilha de auditoria (INSERT, UPDATE, DELETE)
-- GARANTIA: Executado em bloco com ROLLBACK obrigatório
-- ==============================================================================

DO $$
DECLARE
    v_partner_id UUID;
    v_insert_count INT;
    v_update_count INT;
    v_delete_count INT;
    v_total_logs INT;
    v_insert_log RECORD;
    v_update_log RECORD;
    v_delete_log RECORD;
BEGIN
    -- 1. INSERT temporário
    INSERT INTO public.partners (
        partner_name,
        description,
        status,
        approval_status,
        is_active
    ) VALUES (
        '__AUDIT_TEST_PARTNER_1_1_C2_C__',
        'initial_description',
        'draft',
        'pending',
        true
    ) RETURNING id INTO v_partner_id;

    -- Validar log de INSERT
    SELECT * INTO v_insert_log 
    FROM public.audit_logs 
    WHERE record_id = v_partner_id AND action = 'INSERT';

    IF v_insert_log.id IS NULL OR v_insert_log.new_data IS NULL OR v_insert_log.old_data IS NOT NULL THEN
        RAISE EXCEPTION 'FALHA NA AUDITORIA DO INSERT: log não encontrado ou inconsistente';
    END IF;

    -- 2. UPDATE temporário
    UPDATE public.partners 
    SET description = 'audit_update_test' 
    WHERE id = v_partner_id;

    -- Validar log de UPDATE
    SELECT * INTO v_update_log 
    FROM public.audit_logs 
    WHERE record_id = v_partner_id AND action = 'UPDATE';

    IF v_update_log.id IS NULL OR v_update_log.old_data IS NULL OR v_update_log.new_data IS NULL OR (v_update_log.old_data->>'description' = v_update_log.new_data->>'description') THEN
        RAISE EXCEPTION 'FALHA NA AUDITORIA DO UPDATE: log não encontrado ou comparação old/new falhou';
    END IF;

    -- 3. DELETE temporário
    DELETE FROM public.partners 
    WHERE id = v_partner_id;

    -- Validar log de DELETE
    SELECT * INTO v_delete_log 
    FROM public.audit_logs 
    WHERE record_id = v_partner_id AND action = 'DELETE';

    IF v_delete_log.id IS NULL OR v_delete_log.old_data IS NULL OR v_delete_log.new_data IS NOT NULL THEN
        RAISE EXCEPTION 'FALHA NA AUDITORIA DO DELETE: log não encontrado ou new_data presente';
    END IF;

    -- 4. Validar quantidade total de logs
    SELECT COUNT(*) INTO v_total_logs 
    FROM public.audit_logs 
    WHERE record_id = v_partner_id;

    IF v_total_logs <> 3 THEN
        RAISE EXCEPTION 'FALHA NA QUANTIDADE DE LOGS: esperado 3, encontrado %', v_total_logs;
    END IF;

    RAISE NOTICE 'TESTE CONCLUÍDO COM SUCESSO: Todos os 3 eventos auditados perfeitamente.';
    
    -- 5. Forçar ROLLBACK automático da transação inteira via exceção de cleanup controlada
    RAISE EXCEPTION USING errcode = 'P0001', message = 'ROLLBACK_SUCCESS_CLEANUP';
END;
$$;
