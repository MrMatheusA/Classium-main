-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MÓDULO FINANCEIRO ENTERPRISE
-- SCRIPT SQL PRODUCTION-READY COM MULTI-TENANT E REALTIME
-- ====================================================================

-- 1. CONTAS BANCÁRIAS (financial_bank_accounts)
CREATE TABLE IF NOT EXISTS public.financial_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(10),
    agency VARCHAR(20),
    account_number VARCHAR(50),
    account_type VARCHAR(50),
    balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'BRL',
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. CENTROS DE CUSTO (financial_cost_centers)
CREATE TABLE IF NOT EXISTS public.financial_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    code VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    parent_id UUID REFERENCES public.financial_cost_centers(id) ON DELETE SET NULL,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. CATEGORIAS FINANCEIRAS (financial_categories)
CREATE TABLE IF NOT EXISTS public.financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    code VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    parent_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. CONTAS (financial_accounts)
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    account_type VARCHAR(50) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. MÉTODOS DE PAGAMENTO (financial_payment_methods)
CREATE TABLE IF NOT EXISTS public.financial_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. FATURAS (financial_invoices)
CREATE TABLE IF NOT EXISTS public.financial_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    student_id UUID,
    invoice_number VARCHAR(50),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. ITENS DA FATURA (financial_invoice_items)
CREATE TABLE IF NOT EXISTS public.financial_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    invoice_id UUID NOT NULL REFERENCES public.financial_invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 8. PARCELAS (financial_installments)
CREATE TABLE IF NOT EXISTS public.financial_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    invoice_id UUID NOT NULL REFERENCES public.financial_invoices(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    amount_paid DECIMAL(15,2) DEFAULT 0,
    payment_date DATE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 9. TRANSAÇÕES (financial_transactions)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    bank_account_id UUID REFERENCES public.financial_bank_accounts(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
    status VARCHAR(50) DEFAULT 'COMPLETED',
    amount DECIMAL(15,2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 10. ITENS DE TRANSAÇÃO (financial_transaction_items)
CREATE TABLE IF NOT EXISTS public.financial_transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    transaction_id UUID NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
    cost_center_id UUID REFERENCES public.financial_cost_centers(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 11. RECIBOS (financial_receipts)
CREATE TABLE IF NOT EXISTS public.financial_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    invoice_id UUID REFERENCES public.financial_invoices(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    receipt_number VARCHAR(50),
    amount DECIMAL(15,2) NOT NULL,
    issue_date DATE NOT NULL,
    payment_method_id UUID REFERENCES public.financial_payment_methods(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 12. PAGAMENTOS (financial_payments)
CREATE TABLE IF NOT EXISTS public.financial_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    supplier_name VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    due_date DATE,
    payment_method_id UUID REFERENCES public.financial_payment_methods(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    description TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 13. DESCONTOS (financial_discounts)
CREATE TABLE IF NOT EXISTS public.financial_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    is_percentage BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 14. JUROS (financial_interest)
CREATE TABLE IF NOT EXISTS public.financial_interest (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    period VARCHAR(20) DEFAULT 'MONTHLY',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 15. MULTAS (financial_fines)
CREATE TABLE IF NOT EXISTS public.financial_fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    is_percentage BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 16. REEMBOLSOS (financial_refunds)
CREATE TABLE IF NOT EXISTS public.financial_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    invoice_id UUID REFERENCES public.financial_invoices(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    refund_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 17. CONFIGURAÇÕES PIX (financial_pix)
CREATE TABLE IF NOT EXISTS public.financial_pix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    pix_key VARCHAR(255) NOT NULL,
    key_type VARCHAR(50) NOT NULL,
    bank_account_id UUID REFERENCES public.financial_bank_accounts(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 18. TRANSAÇÕES PIX (financial_pix_transactions)
CREATE TABLE IF NOT EXISTS public.financial_pix_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    pix_id UUID REFERENCES public.financial_pix(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
    e2e_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 19. CONCILIAÇÃO BANCÁRIA (financial_bank_reconciliation)
CREATE TABLE IF NOT EXISTS public.financial_bank_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    bank_account_id UUID REFERENCES public.financial_bank_accounts(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    opening_balance DECIMAL(15,2) NOT NULL,
    closing_balance DECIMAL(15,2) NOT NULL,
    system_balance DECIMAL(15,2) NOT NULL,
    difference DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 20. FLUXO DE CAIXA (financial_cash_flow)
CREATE TABLE IF NOT EXISTS public.financial_cash_flow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    date DATE NOT NULL,
    total_inflow DECIMAL(15,2) DEFAULT 0,
    total_outflow DECIMAL(15,2) DEFAULT 0,
    net_flow DECIMAL(15,2) DEFAULT 0,
    accumulated_balance DECIMAL(15,2) DEFAULT 0,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 21. CAIXA DIÁRIO (financial_daily_cash)
CREATE TABLE IF NOT EXISTS public.financial_daily_cash (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    date DATE NOT NULL,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    closing_balance DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'OPEN',
    closed_by UUID,
    closed_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 22. FECHAMENTO DE PERÍODO (financial_closing)
CREATE TABLE IF NOT EXISTS public.financial_closing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'CLOSED',
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_expenses DECIMAL(15,2) DEFAULT 0,
    net_income DECIMAL(15,2) DEFAULT 0,
    closed_by UUID,
    closed_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 23. ORÇAMENTOS (financial_budgets)
CREATE TABLE IF NOT EXISTS public.financial_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 24. PREVISÕES FINANCEIRAS (financial_forecasts)
CREATE TABLE IF NOT EXISTS public.financial_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    estimated_amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 25. RELATÓRIOS SALVOS (financial_reports)
CREATE TABLE IF NOT EXISTS public.financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb,
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_cron VARCHAR(50),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 26. CONTRATOS GERAIS (financial_contracts)
CREATE TABLE IF NOT EXISTS public.financial_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    provider_name VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    value DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    document_url TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 27. CONTRATOS DE ALUNOS (financial_student_contracts)
CREATE TABLE IF NOT EXISTS public.financial_student_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    contract_number VARCHAR(100),
    academic_year VARCHAR(10),
    total_amount DECIMAL(15,2) NOT NULL,
    installments_count INTEGER DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    signature_hash TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 28. MATRÍCULAS FINANCEIRAS (financial_enrollments)
CREATE TABLE IF NOT EXISTS public.financial_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL,
    student_contract_id UUID REFERENCES public.financial_student_contracts(id) ON DELETE CASCADE,
    enrollment_fee DECIMAL(15,2) DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_date DATE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 29. CICLOS DE FATURAMENTO (financial_billing_cycles)
CREATE TABLE IF NOT EXISTS public.financial_billing_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    frequency VARCHAR(50) DEFAULT 'MONTHLY',
    billing_day INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 30. TEMPLATES DE COBRANÇA (financial_charge_templates)
CREATE TABLE IF NOT EXISTS public.financial_charge_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 31. LINKS DE PAGAMENTO (financial_payment_links)
CREATE TABLE IF NOT EXISTS public.financial_payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    invoice_id UUID REFERENCES public.financial_invoices(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 32. LOGS DE GATEWAY (financial_gateway_logs)
CREATE TABLE IF NOT EXISTS public.financial_gateway_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    gateway_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255),
    request_payload JSONB,
    response_payload JSONB,
    status_code INTEGER,
    transaction_id UUID,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 33. LOGS DE IMPORTAÇÃO (financial_import_logs)
CREATE TABLE IF NOT EXISTS public.financial_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    import_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PROCESSING',
    records_processed INTEGER DEFAULT 0,
    errors_found JSONB DEFAULT '[]'::jsonb,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 34. LOGS DE EXPORTAÇÃO (financial_export_logs)
CREATE TABLE IF NOT EXISTS public.financial_export_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    file_url TEXT,
    status VARCHAR(50) DEFAULT 'PROCESSING',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 35. NOTIFICAÇÕES FINANCEIRAS (financial_notifications)
CREATE TABLE IF NOT EXISTS public.financial_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 36. LOGS DE AUDITORIA (financial_audit_logs)
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by UUID,
    ip_address VARCHAR(45),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ====================================================================
-- ÍNDICES (Performance)
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'financial_bank_accounts', 'financial_cost_centers', 'financial_categories',
            'financial_accounts', 'financial_payment_methods', 'financial_invoices',
            'financial_invoice_items', 'financial_installments', 'financial_transactions',
            'financial_transaction_items', 'financial_receipts', 'financial_payments',
            'financial_discounts', 'financial_interest', 'financial_fines',
            'financial_refunds', 'financial_pix', 'financial_pix_transactions',
            'financial_bank_reconciliation', 'financial_cash_flow', 'financial_daily_cash',
            'financial_closing', 'financial_budgets', 'financial_forecasts',
            'financial_reports', 'financial_contracts', 'financial_student_contracts',
            'financial_enrollments', 'financial_billing_cycles', 'financial_charge_templates',
            'financial_payment_links', 'financial_gateway_logs', 'financial_import_logs',
            'financial_export_logs', 'financial_notifications', 'financial_audit_logs'
        ])
    LOOP
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_school_id ON public.%I(school_id)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_created_at ON public.%I(created_at)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_metadata ON public.%I USING GIN (metadata)', t_name, t_name);
    END LOOP;
END;
$$;

-- Índices Específicos
CREATE INDEX IF NOT EXISTS idx_fin_invoices_profile ON public.financial_invoices(profile_id);
CREATE INDEX IF NOT EXISTS idx_fin_invoices_student ON public.financial_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_fin_invoices_status ON public.financial_invoices(status);
CREATE INDEX IF NOT EXISTS idx_fin_invoices_due_date ON public.financial_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_fin_transactions_date ON public.financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_fin_transactions_status ON public.financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_fin_installments_due_date ON public.financial_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_fin_student_contracts_student ON public.financial_student_contracts(student_id);
CREATE INDEX IF NOT EXISTS idx_fin_notifications_profile ON public.financial_notifications(profile_id);


-- ====================================================================
-- TRIGGERS PARA UPDATED_AT
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
        FOR t_name IN 
            SELECT unnest(ARRAY[
                'financial_bank_accounts', 'financial_cost_centers', 'financial_categories',
                'financial_accounts', 'financial_payment_methods', 'financial_invoices',
                'financial_invoice_items', 'financial_installments', 'financial_transactions',
                'financial_transaction_items', 'financial_receipts', 'financial_payments',
                'financial_discounts', 'financial_interest', 'financial_fines',
                'financial_refunds', 'financial_pix', 'financial_pix_transactions',
                'financial_bank_reconciliation', 'financial_cash_flow', 'financial_daily_cash',
                'financial_closing', 'financial_budgets', 'financial_forecasts',
                'financial_reports', 'financial_contracts', 'financial_student_contracts',
                'financial_enrollments', 'financial_billing_cycles', 'financial_charge_templates',
                'financial_payment_links', 'financial_gateway_logs', 'financial_import_logs',
                'financial_export_logs', 'financial_notifications', 'financial_audit_logs'
            ])
        LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_upd ON public.%I', t_name, t_name);
            EXECUTE format('CREATE TRIGGER trg_%I_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp()', t_name, t_name);
        END LOOP;
    ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        FOR t_name IN 
            SELECT unnest(ARRAY[
                'financial_bank_accounts', 'financial_cost_centers', 'financial_categories',
                'financial_accounts', 'financial_payment_methods', 'financial_invoices',
                'financial_invoice_items', 'financial_installments', 'financial_transactions',
                'financial_transaction_items', 'financial_receipts', 'financial_payments',
                'financial_discounts', 'financial_interest', 'financial_fines',
                'financial_refunds', 'financial_pix', 'financial_pix_transactions',
                'financial_bank_reconciliation', 'financial_cash_flow', 'financial_daily_cash',
                'financial_closing', 'financial_budgets', 'financial_forecasts',
                'financial_reports', 'financial_contracts', 'financial_student_contracts',
                'financial_enrollments', 'financial_billing_cycles', 'financial_charge_templates',
                'financial_payment_links', 'financial_gateway_logs', 'financial_import_logs',
                'financial_export_logs', 'financial_notifications', 'financial_audit_logs'
            ])
        LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_upd ON public.%I', t_name, t_name);
            EXECUTE format('CREATE TRIGGER trg_%I_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t_name, t_name);
        END LOOP;
    END IF;
END;
$$;


-- ====================================================================
-- ROW LEVEL SECURITY (RLS) E POLICIES
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'financial_bank_accounts', 'financial_cost_centers', 'financial_categories',
            'financial_accounts', 'financial_payment_methods', 'financial_invoices',
            'financial_invoice_items', 'financial_installments', 'financial_transactions',
            'financial_transaction_items', 'financial_receipts', 'financial_payments',
            'financial_discounts', 'financial_interest', 'financial_fines',
            'financial_refunds', 'financial_pix', 'financial_pix_transactions',
            'financial_bank_reconciliation', 'financial_cash_flow', 'financial_daily_cash',
            'financial_closing', 'financial_budgets', 'financial_forecasts',
            'financial_reports', 'financial_contracts', 'financial_student_contracts',
            'financial_enrollments', 'financial_billing_cycles', 'financial_charge_templates',
            'financial_payment_links', 'financial_gateway_logs', 'financial_import_logs',
            'financial_export_logs', 'financial_notifications', 'financial_audit_logs'
        ])
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS p_%I_access ON public.%I', t_name, t_name);
        
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_access_school') THEN
            EXECUTE format('CREATE POLICY p_%I_access ON public.%I FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL)', t_name, t_name);
        ELSE
            EXECUTE format('CREATE POLICY p_%I_access ON public.%I FOR ALL USING (deleted_at IS NULL)', t_name, t_name);
        END IF;
    END LOOP;
END;
$$;


-- ====================================================================
-- SUPABASE REALTIME PUBLICATION
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'financial_bank_accounts', 'financial_cost_centers', 'financial_categories',
            'financial_accounts', 'financial_payment_methods', 'financial_invoices',
            'financial_invoice_items', 'financial_installments', 'financial_transactions',
            'financial_transaction_items', 'financial_receipts', 'financial_payments',
            'financial_discounts', 'financial_interest', 'financial_fines',
            'financial_refunds', 'financial_pix', 'financial_pix_transactions',
            'financial_bank_reconciliation', 'financial_cash_flow', 'financial_daily_cash',
            'financial_closing', 'financial_budgets', 'financial_forecasts',
            'financial_reports', 'financial_contracts', 'financial_student_contracts',
            'financial_enrollments', 'financial_billing_cycles', 'financial_charge_templates',
            'financial_payment_links', 'financial_gateway_logs', 'financial_import_logs',
            'financial_export_logs', 'financial_notifications', 'financial_audit_logs'
        ])
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t_name);
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END LOOP;
END;
$$;


-- ====================================================================
-- FUNÇÕES AUXILIARES
-- ====================================================================
CREATE OR REPLACE FUNCTION public.calculate_interest(p_amount DECIMAL, p_rate DECIMAL, p_days INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN p_amount * (p_rate / 100) * (p_days / 30.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.calculate_fine(p_amount DECIMAL, p_rate DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    RETURN p_amount * (p_rate / 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.generate_invoice(p_student_contract_id UUID)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
BEGIN
    -- Lógica placeholder (exemplo)
    RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generate_pix(p_invoice_id UUID)
RETURNS TEXT AS $$
BEGIN
    -- Lógica placeholder
    RETURN 'pix_payload_string';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.close_financial_period(p_school_id UUID, p_month INTEGER, p_year INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Lógica placeholder
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.reopen_financial_period(p_school_id UUID, p_month INTEGER, p_year INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Lógica placeholder
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


-- ====================================================================
-- VIEWS
-- ====================================================================
CREATE OR REPLACE VIEW public.view_financial_dashboard AS
SELECT 
    school_id,
    COUNT(id) AS total_invoices,
    SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_invoices,
    SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) AS total_received,
    SUM(CASE WHEN status = 'PENDING' AND due_date < CURRENT_DATE THEN total_amount ELSE 0 END) AS total_overdue
FROM public.financial_invoices
WHERE deleted_at IS NULL
GROUP BY school_id;

CREATE OR REPLACE VIEW public.view_accounts_receivable AS
SELECT 
    school_id,
    id AS invoice_id,
    invoice_number,
    profile_id,
    due_date,
    total_amount,
    status
FROM public.financial_invoices
WHERE status IN ('PENDING', 'OVERDUE') AND deleted_at IS NULL;

CREATE OR REPLACE VIEW public.view_accounts_payable AS
SELECT 
    school_id,
    id AS payment_id,
    supplier_name,
    due_date,
    amount,
    status
FROM public.financial_payments
WHERE status IN ('PENDING', 'SCHEDULED') AND deleted_at IS NULL;

CREATE OR REPLACE VIEW public.view_cash_flow AS
SELECT 
    school_id,
    date,
    total_inflow,
    total_outflow,
    net_flow,
    accumulated_balance
FROM public.financial_cash_flow
WHERE deleted_at IS NULL
ORDER BY date DESC;

CREATE OR REPLACE VIEW public.view_default_students AS
SELECT 
    i.school_id,
    i.student_id,
    COUNT(i.id) AS overdue_invoices,
    SUM(i.total_amount - i.amount_paid) AS total_debt
FROM public.financial_invoices i
WHERE i.status = 'PENDING' AND i.due_date < CURRENT_DATE AND i.deleted_at IS NULL
GROUP BY i.school_id, i.student_id;

CREATE OR REPLACE VIEW public.view_monthly_revenue AS
SELECT 
    school_id,
    EXTRACT(YEAR FROM transaction_date) AS year,
    EXTRACT(MONTH FROM transaction_date) AS month,
    SUM(amount) AS total_revenue
FROM public.financial_transactions
WHERE type = 'INCOME' AND status = 'COMPLETED' AND deleted_at IS NULL
GROUP BY school_id, EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date);

CREATE OR REPLACE VIEW public.view_monthly_expenses AS
SELECT 
    school_id,
    EXTRACT(YEAR FROM transaction_date) AS year,
    EXTRACT(MONTH FROM transaction_date) AS month,
    SUM(amount) AS total_expenses
FROM public.financial_transactions
WHERE type = 'EXPENSE' AND status = 'COMPLETED' AND deleted_at IS NULL
GROUP BY school_id, EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date);

CREATE OR REPLACE VIEW public.view_financial_summary AS
SELECT 
    school_id,
    (SELECT SUM(balance) FROM public.financial_bank_accounts WHERE school_id = s.school_id AND deleted_at IS NULL) AS total_balance,
    (SELECT SUM(total_amount - amount_paid) FROM public.financial_invoices WHERE school_id = s.school_id AND status = 'PENDING' AND deleted_at IS NULL) AS total_receivables,
    (SELECT SUM(amount) FROM public.financial_payments WHERE school_id = s.school_id AND status = 'PENDING' AND deleted_at IS NULL) AS total_payables
FROM (SELECT DISTINCT school_id FROM public.financial_transactions) s;

CREATE OR REPLACE VIEW public.view_financial_kpis AS
SELECT 
    school_id,
    COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS ytd_income,
    COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS ytd_expense
FROM public.financial_transactions
WHERE EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE) AND status = 'COMPLETED' AND deleted_at IS NULL
GROUP BY school_id;

CREATE OR REPLACE VIEW public.view_financial_balance AS
SELECT 
    school_id,
    bank_name,
    account_number,
    balance
FROM public.financial_bank_accounts
WHERE is_active = TRUE AND deleted_at IS NULL;

