-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — SUPABASE REALTIME (ENTERPRISE)
-- SCRIPT SQL PRODUCTION-READY PARA ATIVAR O REALTIME
-- ====================================================================

-- 1) Crie a publicação (se não existir) - O Supabase já cria por padrão
-- CREATE PUBLICATION supabase_realtime;

-- 2) Adicione as tabelas do sistema à publicação supabase_realtime
-- Nota: Se alguma tabela já estiver na publicação, o PostgreSQL exibirá 
-- um aviso "already in publication", o que é perfeitamente normal e pode ser ignorado.

ALTER PUBLICATION supabase_realtime ADD TABLE public.schools;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_guardians;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guardian_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_health;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_vaccination;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_transport;
ALTER PUBLICATION supabase_realtime ADD TABLE public.person_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;

-- Marketplace
ALTER PUBLICATION supabase_realtime ADD TABLE public.advertiser_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.advertisers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.advertiser_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.advertiser_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.advertiser_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.advertiser_statistics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_click_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_change_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.advertiser_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.advertiser_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.advertiser_favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.advertiser_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_settings;
