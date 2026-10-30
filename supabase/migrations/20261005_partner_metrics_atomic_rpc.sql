-- ==============================================================================
-- MIGRATION: 20261005_partner_metrics_atomic_rpc.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- FASE: Etapa P2.274.126
-- OBJETIVO: RPC PostgreSQL atômica e SECURITY DEFINER para incremento de telemetria
--           de parceiros (views, clicks, leadsGenerated) diretamente no JSONB metadata.
-- REGRAS DE ARQUITETURA E SEGURANÇA:
--  - Execução atômica in-place via jsonb_set (elimina race conditions e lost updates)
--  - Whitelist restrita de métricas: 'view', 'click', 'lead'
--  - Mapeamento estrito:
--      * 'view'  -> metadata.views
--      * 'click' -> metadata.clicks
--      * 'lead'  -> metadata.leadsGenerated
--  - Rejeição de qualquer chave customizada informada pelo chamador
--  - Regra de visibilidade e elegibilidade:
--      * is_active = true
--      * status = 'active'
--      * approval_status = 'approved'
--  - Blindagem de colunas: nenhuma coluna cadastral ou administrativa é modificada
--  - SECURITY DEFINER com search_path = public, pg_temp (proteção contra search_path hijacking)
--  - Execução permitida para anon, authenticated e service_role (viabiliza telemetria pública)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.increment_partner_metric(
    p_partner_id UUID,
    p_metric_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_target_key TEXT;
    v_new_val INTEGER;
    v_partner_exists BOOLEAN;
BEGIN
    -- 1. Validação de obrigatoriedade dos parâmetros
    IF p_partner_id IS NULL THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: p_partner_id não pode ser nulo.';
    END IF;

    IF p_metric_type IS NULL OR trim(p_metric_type) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: p_metric_type não pode ser nulo ou vazio.';
    END IF;

    -- 2. Mapeamento rígido e sanitização do tipo de métrica permitido (Whitelist)
    CASE lower(trim(p_metric_type))
        WHEN 'view' THEN
            v_target_key := 'views';
        WHEN 'click' THEN
            v_target_key := 'clicks';
        WHEN 'lead' THEN
            v_target_key := 'leadsGenerated';
        ELSE
            RAISE EXCEPTION 'VALIDATION_ERROR: Tipo de métrica inválido ("%"). Valores aceitos: view, click, lead.', p_metric_type;
    END CASE;

    -- 3. Atualização Atômica Direta no PostgreSQL (Lock a nível de linha durante o update)
    -- Aplica filtro rigoroso de elegibilidade pública e extração segura do valor numérico existente
    UPDATE public.partners
    SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        ARRAY[v_target_key],
        to_jsonb(
            CASE
                WHEN (metadata->>v_target_key) ~ '^[0-9]+$'
                THEN (metadata->>v_target_key)::integer
                ELSE 0
            END + 1
        )
    )
    WHERE id = p_partner_id
      AND is_active = true
      AND status = 'active'
      AND approval_status = 'approved'
    RETURNING (metadata->>v_target_key)::integer INTO v_new_val;

    -- 4. Tratamento de Casos de Não Atualização (Inexistente vs Inelegível)
    IF NOT FOUND THEN
        SELECT EXISTS(SELECT 1 FROM public.partners WHERE id = p_partner_id) INTO v_partner_exists;
        IF NOT v_partner_exists THEN
            RAISE EXCEPTION 'PARTNER_NOT_FOUND: Parceiro não encontrado (ID: %).', p_partner_id;
        ELSE
            RAISE EXCEPTION 'PARTNER_NOT_ELIGIBLE: Parceiro não está ativo ou homologado para receber telemetria.';
        END IF;
    END IF;

    -- 5. Retorno estruturado com o valor atualizado da métrica
    RETURN jsonb_build_object(
        'success', true,
        'partner_id', p_partner_id,
        'metric', v_target_key,
        'current_value', v_new_val
    );
END;
$$;

-- 6. Configuração de Privilégios Estritos de Execução
REVOKE ALL ON FUNCTION public.increment_partner_metric(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_partner_metric(UUID, TEXT) FROM anon;

GRANT EXECUTE ON FUNCTION public.increment_partner_metric(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_partner_metric(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_partner_metric(UUID, TEXT) TO service_role;

-- 7. Recarregar cache de schema do PostgREST
NOTIFY pgrst, 'reload schema';
