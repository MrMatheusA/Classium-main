# Relatório Técnico de Auditoria - Banco de Dados EDUCA+

## 1. Tabelas Existentes

Total de tabelas identificadas: 232

- academic_assignments
- academic_documents
- academic_terms
- academic_years
- access_gates
- access_logs
- access_points
- active_sessions
- advertiser_cards
- advertiser_categories
- advertiser_documents
- advertiser_favorites
- advertiser_leads
- advertiser_messages
- advertiser_notifications
- advertiser_reviews
- advertiser_statistics
- advertisers
- agenda_attachments
- agenda_audit_logs
- agenda_categories
- agenda_event_targets
- agenda_events
- agenda_participants
- agenda_recurrences
- agenda_reminders
- agenda_reservations
- agenda_resources
- announcement_confirmations
- announcement_reads
- announcement_recipients
- announcements
- api_integrations
- attendance_settings
- audit_logs
- audit_security
- authorized_visitors
- background_jobs
- behavior_points
- blocked_users
- calendar_confirmations
- calendar_locations
- calendar_settings
- card_click_logs
- class_schedules
- classes
- classrooms
- communication_attachments
- communication_categories
- communication_channels
- communication_delivery_logs
- communication_history
- communication_notifications
- communication_recipients
- communication_settings
- communication_templates
- communications
- delivery_queue
- departments
- devices
- digital_signatures
- disciplinary_actions
- education_networks
- email_queue
- email_verifications
- event_subscriptions
- exam_calendar
- failed_login_attempts
- family_notifications
- family_occurrence_confirmations
- family_schedule_events
- file_registry
- financial_accounts
- financial_audit_logs
- financial_bank_accounts
- financial_bank_reconciliation
- financial_billing_cycles
- financial_budgets
- financial_cash_flow
- financial_categories
- financial_charge_templates
- financial_closing
- financial_contracts
- financial_cost_centers
- financial_daily_cash
- financial_discounts
- financial_enrollments
- financial_export_logs
- financial_fines
- financial_forecasts
- financial_gateway_logs
- financial_import_logs
- financial_installments
- financial_interest
- financial_invoice_items
- financial_invoices
- financial_notifications
- financial_payment_links
- financial_payment_methods
- financial_payments
- financial_pix
- financial_pix_transactions
- financial_receipts
- financial_refunds
- financial_reports
- financial_student_contracts
- financial_transaction_items
- financial_transactions
- food_menus
- gate_access_logs
- gate_access_rules
- gate_access_tokens
- gate_authorizations
- gate_device_logs
- gate_device_status
- gate_devices
- gate_events
- gate_schedules
- global_event_bus
- global_integration_errors
- global_sync_logs
- grading_models
- holiday_calendar
- integration_errors
- integration_events
- integration_logs
- integration_queue
- invoices
- job_positions
- login_history
- lost_and_found
- marketplace_settings
- meeting_calendar
- message_attachments
- message_threads
- messages
- mfa_settings
- notification_preferences
- notification_queue
- notifications
- password_history
- password_resets
- permission_groups
- permission_history
- permission_matrix
- permissions
- pickup_qrcode_logs
- pickup_qrcodes
- pickup_token_logs
- pickup_tokens
- plan_change_history
- profiles
- promotions
- push_notifications
- refresh_tokens
- roles
- room_reservations
- routine_attachments
- routine_followups
- routine_notifications
- routine_occurrences
- scheduled_messages
- school_calendar
- school_grades
- school_menus
- school_occurrences
- school_settings
- school_shifts
- school_units
- schools
- security_alerts
- security_audit_logs
- security_camera_integrations
- security_device_events
- security_devices
- security_incident_attachments
- security_incidents
- security_integrations
- security_permissions
- security_settings
- security_shift_logs
- security_team_members
- security_teams
- storage_folders
- student_behavior_history
- student_enrollments
- student_pickup_authorizations
- student_pickup_history
- student_schedule_events
- students
- subjects
- subscription_plans
- subscriptions
- sync_history
- system_actions
- system_events
- system_menus
- system_profiles
- system_settings
- system_submenus
- teacher_classes
- teacher_schedule_events
- transport_authorizations
- transport_boarding_logs
- transport_checklists
- transport_drivers
- transport_fuel_logs
- transport_gps_tracking
- transport_insurance
- transport_maintenance
- transport_monitors
- transport_occurrences
- transport_route_stops
- transport_routes
- transport_students
- transport_vehicles
- uploaded_files
- user_devices
- user_multiple_profiles
- user_permissions
- user_preferences
- user_roles
- visitor_badges
- visitor_blacklist
- visitor_checkin
- visitor_checkout
- visitor_documents
- visitor_notifications
- visitor_photos
- visitor_whitelist
- webhooks
- whatsapp_queue

## 2. Colunas de Cada Tabela

**academic_assignments**:
  id, school_id, class_id, subject_id, teacher_id, title, description, due_date, max_score, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**academic_documents**:
  id, school_id, student_id, document_type, file_url, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**academic_terms**:
  id, academic_year_id, name, start_date, end_date, status, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**academic_years**:
  id, school_id, year_number, start_date, end_date, school_days, status, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**access_gates**:
  id, school_id, access_point_id, name, gate_type, direction, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**access_logs**:
  id, user_id, endpoint, method, status_code, ip_address, created_at

**access_points**:
  id, school_id, name, description, location, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**active_sessions**:
  id, user_id, token, refresh_token, login_time, last_activity, expires_at, ip_address, device_info, browser_info, status, created_at

**advertiser_cards**:
  id, advertiser_id, title, subtitle, description, summary, specialties, duration, investment, monthly_fee, discount, whatsapp, website, main_image_url, banner_url, gallery_urls, video_url, card_color, highlight_type, display_order, status, is_published, published_at, created_at, updated_at

**advertiser_categories**:
  id, name, created_at, updated_at

**advertiser_documents**:
  id, advertiser_id, document_type, file_url, status, created_at, updated_at

**advertiser_favorites**:
  id, advertiser_card_id, user_id, created_at, updated_at

**advertiser_leads**:
  id, advertiser_id, name, phone, email, origin, message, status, created_at, updated_at

**advertiser_messages**:
  id, advertiser_id, sender_id, sender_name, message, is_read, created_at, updated_at

**advertiser_notifications**:
  id, advertiser_id, title, message, is_read, created_at, updated_at

**advertiser_reviews**:
  id, advertiser_id, reviewer_id, reviewer_type, rating, comment, status, created_at, updated_at

**advertiser_statistics**:
  id, advertiser_id, views, clicks, conversions, contacts, favorites, shares, date, created_at, updated_at

**advertisers**:
  id, auth_user_id, advertiser_type, cpf, cnpj, name, trade_name, company_name, phone, whatsapp, email, password_hash, photo_url, banner_url, logo_url, city, state, zip_code, address, website, instagram, facebook, linkedin, category_id, plan_id, status, approval_date, admin_responsible_id, created_at, updated_at, deleted_at

**agenda_attachments**:
  id, school_id, event_id, file_name, file_url, file_type, file_size, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**agenda_audit_logs**:
  id, school_id, event_id, action, performed_by, old_data, new_data, ip_address, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**agenda_categories**:
  id, school_id, name, color, icon, description, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**agenda_event_targets**:
  id, school_id, event_id, target_type, target_id, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**agenda_events**:
  id, school_id, category_id, title, description, start_date, end_date, is_all_day, location, status, visibility, recurrence_rule, requires_rsvp, max_participants, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**agenda_participants**:
  id, school_id, event_id, profile_id, status, rsvp_date, comments, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**agenda_recurrences**:
  id, school_id, base_event_id, recurrence_rule, start_date, end_date, exceptions, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**agenda_reminders**:
  id, school_id, event_id, target_profile_id, reminder_time, message, is_sent, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**agenda_reservations**:
  id, school_id, resource_id, event_id, start_time, end_time, status, purpose, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**agenda_resources**:
  id, school_id, name, resource_type, capacity, location, status, description, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**announcement_confirmations**:
  id, announcement_id, school_id, profile_id, confirmed_at, signature_hash, ip_address, device_info, created_by, updated_by, created_at, updated_at, deleted_at

**announcement_reads**:
  id, announcement_id, school_id, profile_id, read_at, device_info, created_by, updated_by, created_at, updated_at, deleted_at

**announcement_recipients**:
  id, announcement_id, school_id, profile_id, student_id, class_id, delivery_status, created_by, updated_by, created_at, updated_at, deleted_at

**announcements**:
  id, school_id, title, content, category, author_name, target_audience, class_id, requires_signature, requires_confirmation, attachment_url, created_at, updated_at

**api_integrations**:
  id, school_id, name, status, endpoint, public_key, encrypted_secret_key, config, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**attendance_settings**:
  id, school_id, config_json, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by, unique(school_id)

**audit_logs**:
  id, school_id, user_id, user_email, user_role, action, entity, details, ip_address, user_agent, created_at

**audit_security**:
  id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address, created_at

**authorized_visitors**:
  id, school_id, name, document_type, document_number, phone, email, company, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**background_jobs**:
  id, job_name, schedule_cron, last_run_at, next_run_at, status, created_at, updated_at

**behavior_points**:
  id, school_id, student_id, occurrence_id, points, reason, created_by, updated_by, created_at, updated_at, deleted_at

**blocked_users**:
  id, user_id, reason, blocked_at, expires_at, blocked_by, created_at, updated_at

**calendar_confirmations**:
  id, school_id, event_id, profile_id, status, confirmed_at, signature_hash, comments, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**calendar_locations**:
  id, school_id, name, building, floor, capacity, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**calendar_settings**:
  id, school_id, default_view, allow_student_events, allow_family_events, reminder_defaults, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**card_click_logs**:
  id, advertiser_card_id, user_id, click_source, created_at, updated_at

**class_schedules**:
  id, class_id, subject_id, teacher_id, room_id, day_of_week, start_time, end_time, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**classes**:
  id, school_id, unit_id, name, grade, shift, academic_year, max_capacity, created_at, updated_at

**classrooms**:
  id, school_id, name, capacity, block, room_type, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**communication_attachments**:
  id, communication_id, school_id, file_name, file_url, file_type, file_size, created_by, updated_by, created_at, updated_at, deleted_at

**communication_categories**:
  id, school_id, name, description, created_by, updated_by, created_at, updated_at, deleted_at

**communication_channels**:
  id, school_id, channel_name, is_active, config, created_by, updated_by, created_at, updated_at, deleted_at

**communication_delivery_logs**:
  id, school_id, channel, reference_id, status, log_message, created_by, updated_by, created_at, updated_at, deleted_at

**communication_history**:
  id, school_id, communication_id, action, performed_by, description, created_by, updated_by, created_at, updated_at, deleted_at

**communication_notifications**:
  id, school_id, communication_id, profile_id, title, message, notification_type, is_read, read_at, created_by, updated_by, created_at, updated_at, deleted_at

**communication_recipients**:
  id, communication_id, school_id, target_type, class_id, student_id, profile_id, delivery_status, read_status, read_at, confirmed_at, created_by, updated_by, created_at, updated_at, deleted_at

**communication_settings**:
  id, school_id, default_channels, allow_family_replies, auto_publish_app, created_by, updated_by, created_at, updated_at, deleted_at

**communication_templates**:
  id, school_id, template_name, category, html_content, preview_image, is_default, created_by, updated_by, created_at, updated_at, deleted_at

**communications**:
  id, school_id, title, category, document_type, content, template_id, header_image, footer_image, requires_signature, requires_confirmation, publish_date, expiration_date, status, published, published_at, created_by, updated_by, created_at, updated_at, deleted_at

**delivery_queue**:
  id, school_id, channel, payload, status, attempts, created_by, updated_by, created_at, updated_at, deleted_at

**departments**:
  id, school_id, name, description, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**devices**:
  id, user_id, device_id, device_name, last_used_at, is_trusted, created_at, updated_at

**digital_signatures**:
  id, communication_id, school_id, profile_id, signature_type, signature_hash, signed_at, ip_address, device, created_by, updated_by, created_at, updated_at, deleted_at

**disciplinary_actions**:
  id, school_id, student_id, occurrence_id, action_type, description, start_date, end_date, status, responsible_employee, created_by, updated_by, created_at, updated_at, deleted_at

**education_networks**:
  id, name, network_type, cnpj, address, contact, status, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**email_queue**:
  id, school_id, to_email, subject, body_html, status, created_by, updated_by, created_at, updated_at, deleted_at

**email_verifications**:
  id, user_id, verification_token, expires_at, is_verified, created_at, updated_at

**event_subscriptions**:
  id, event_name, subscriber_module, action_to_take, is_active, created_at, updated_at

**exam_calendar**:
  id, school_id, class_id, subject_id, title, exam_date, duration_minutes, weight, description, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**failed_login_attempts**:
  id, user_id, ip_address, attempt_time

**family_notifications**:
  id, school_id, profile_id, student_id, title, message, is_read, read_at, created_by, updated_by, created_at, updated_at, deleted_at

**family_occurrence_confirmations**:
  id, school_id, occurrence_id, profile_id, confirmed, confirmed_at, signature_hash, device, ip_address, created_by, updated_by, created_at, updated_at, deleted_at

**family_schedule_events**:
  id, school_id, family_id, event_id, title, description, start_time, end_time, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**file_registry**:
  id, bucket_id, file_path, file_name, file_size, mime_type, school_id, uploaded_by, is_deleted, deleted_at, deleted_by, module, created_at, updated_at

**financial_accounts**:
  id, school_id, name, description, account_type, balance, is_active, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_audit_logs**:
  id, school_id, table_name, record_id, action, old_data, new_data, performed_by, ip_address, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_bank_accounts**:
  id, school_id, bank_name, bank_code, agency, account_number, account_type, balance, currency, is_active, is_default, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_bank_reconciliation**:
  id, school_id, bank_account_id, period_start, period_end, opening_balance, closing_balance, system_balance, difference, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_billing_cycles**:
  id, school_id, name, frequency, billing_day, is_active, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_budgets**:
  id, school_id, category_id, period_start, period_end, amount, description, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_cash_flow**:
  id, school_id, date, total_inflow, total_outflow, net_flow, accumulated_balance, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_categories**:
  id, school_id, type, code, name, description, is_active, parent_id, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_charge_templates**:
  id, school_id, name, amount, description, category_id, is_active, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_closing**:
  id, school_id, period_month, period_year, status, total_revenue, total_expenses, net_income, closed_by, closed_at, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_contracts**:
  id, school_id, title, provider_name, start_date, end_date, value, status, document_url, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_cost_centers**:
  id, school_id, code, name, description, is_active, parent_id, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_daily_cash**:
  id, school_id, date, opening_balance, closing_balance, status, closed_by, closed_at, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_discounts**:
  id, school_id, name, type, value, is_percentage, is_active, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_enrollments**:
  id, school_id, student_id, student_contract_id, enrollment_fee, is_paid, payment_date, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_export_logs**:
  id, school_id, report_type, file_url, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_fines**:
  id, school_id, name, value, is_percentage, is_active, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_forecasts**:
  id, school_id, category_id, forecast_date, estimated_amount, description, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_gateway_logs**:
  id, school_id, gateway_name, endpoint, request_payload, response_payload, status_code, transaction_id, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_import_logs**:
  id, school_id, file_name, import_type, status, records_processed, errors_found, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_installments**:
  id, school_id, invoice_id, installment_number, due_date, amount, status, amount_paid, payment_date, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_interest**:
  id, school_id, name, rate, period, is_active, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_invoice_items**:
  id, school_id, invoice_id, description, quantity, unit_price, total_price, category_id, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_invoices**:
  id, school_id, profile_id, student_id, invoice_number, issue_date, due_date, status, subtotal, discount, tax, total_amount, amount_paid, notes, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_notifications**:
  id, school_id, profile_id, type, title, message, is_read, reference_id, reference_type, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_payment_links**:
  id, school_id, invoice_id, url, expires_at, is_active, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_payment_methods**:
  id, school_id, name, type, tax_rate, is_active, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_payments**:
  id, school_id, transaction_id, supplier_name, amount, payment_date, due_date, payment_method_id, status, description, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_pix**:
  id, school_id, pix_key, key_type, bank_account_id, is_active, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_pix_transactions**:
  id, school_id, pix_id, transaction_id, e2e_id, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_receipts**:
  id, school_id, invoice_id, transaction_id, receipt_number, amount, issue_date, payment_method_id, notes, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_refunds**:
  id, school_id, invoice_id, amount, refund_date, reason, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_reports**:
  id, school_id, name, report_type, parameters, is_scheduled, schedule_cron, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_student_contracts**:
  id, school_id, student_id, profile_id, contract_number, academic_year, total_amount, installments_count, start_date, end_date, status, signature_hash, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_transaction_items**:
  id, school_id, transaction_id, category_id, cost_center_id, amount, description, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**financial_transactions**:
  id, school_id, bank_account_id, type, status, amount, transaction_date, description, reference_id, reference_type, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**food_menus**:
  id, school_id, date, week_day, menu_type, main_dish, side_dish, salad, dessert, beverage, nutritional_info, pdf_url, created_at

**gate_access_logs**:
  id, school_id, gate_id, profile_id, student_id, visitor_id, access_type, access_time, access_method, is_granted, denial_reason, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**gate_access_rules**:
  id, school_id, rule_name, description, target_type, target_id, action, priority, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**gate_access_tokens**:
  id, school_id, student_id, token_code, authorized_person_name, authorized_person_cpf, relationship, valid_from, valid_until, status, created_at

**gate_authorizations**:
  id, school_id, profile_id, gate_id, start_date, end_date, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**gate_device_logs**:
  id, school_id, device_id, log_type, message, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**gate_device_status**:
  id, school_id, device_id, last_ping, is_online, firmware_version, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**gate_devices**:
  id, school_id, gate_id, device_name, device_type, ip_address, mac_address, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**gate_events**:
  id, school_id, gate_id, event_type, event_date, details, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**gate_schedules**:
  id, school_id, name, start_time, end_time, days_of_week, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**global_event_bus**:
  event_id, event_type, origin_module, destination_module, school_id, user_id, payload_json, status, retry_count, created_at, updated_at

**global_integration_errors**:
  id, event_id, error_message, stack_trace, created_at, resolved_at, resolved

**global_sync_logs**:
  id, event_id, user_id, ip_address, panel, module, table_name, record_id, execution_time_ms, created_at

**grading_models**:
  id, school_id, name, config_json, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**holiday_calendar**:
  id, school_id, name, holiday_date, is_recurring, description, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**integration_errors**:
  id, queue_id, error_message, stack_trace, resolved, created_at, resolved_at

**integration_events**:
  id, school_id, event_type, module_source, title, description, payload, user_email, user_role, created_at

**integration_logs**:
  id, queue_id, action, details, created_at

**integration_queue**:
  id, event_name, payload, school_id, triggered_by, status, retry_count, max_retries, next_retry_at, created_at, updated_at

**invoices**:
  id, subscription_id, advertiser_id, invoice_number, amount, status, pix_code, card_transaction_id, payment_link, receipt_url, due_date, paid_at, created_at, updated_at

**job_positions**:
  id, school_id, department_id, name, description, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**login_history**:
  id, user_id, school_id, profile_id, login_time, ip_address, city, state, country, device_type, os, browser, result, session_duration_minutes, logout_time, created_at

**lost_and_found**:
  id, school_id, item_name, category, description, location_found, sector, date_found, time_found, photo_url, status, registered_by, reserved_by_student, reserved_by_parent, reserved_at, delivered_by, delivered_at, created_at, updated_at, deleted_at

**marketplace_settings**:
  id, config_key, config_value, created_at, updated_at

**meeting_calendar**:
  id, school_id, title, meeting_type, start_time, end_time, location_link, description, is_mandatory, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**message_attachments**:
  id, school_id, message_id, file_name, file_url, file_type, file_size, created_by, updated_by, created_at, updated_at, deleted_at

**message_threads**:
  id, school_id, title, context_type, context_id, status, created_by, updated_by, created_at, updated_at, deleted_at

**messages**:
  id, school_id, thread_id, sender_id, content, is_read, read_at, created_by, updated_by, created_at, updated_at, deleted_at

**mfa_settings**:
  id, user_id, mfa_type, is_enabled, secret, recovery_codes, created_at, updated_at

**notification_preferences**:
  id, user_id, email_alerts, sms_alerts, push_alerts, in_app_alerts, created_at, updated_at

**notification_queue**:
  id, user_id, type, title, body, data, status, sent_at, created_at, updated_at

**notifications**:
  id, user_id, school_id, title, message, type, priority, origin, module, is_read, read_at, created_at, deleted_at

**password_history**:
  id, user_id, password_hash, created_at

**password_resets**:
  id, user_id, reset_token, expires_at, is_used, created_at, updated_at

**permission_groups**:
  id, name, description, created_at, updated_at

**permission_history**:
  id, school_id, changed_by, target_user_id, target_profile_id, entity_type, entity_id, old_value, new_value, change_type, created_at

**permission_matrix**:
  id, system_profile_id, menu_id, submenu_id, action_id, is_allowed, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**permissions**:
  id, group_id, name, description, module, created_at, updated_at

**pickup_qrcode_logs**:
  id, school_id, qrcode_id, scanned_at, gate_id, scan_result, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**pickup_qrcodes**:
  id, school_id, student_id, authorization_id, qr_hash, valid_until, usage_limit, usage_count, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**pickup_token_logs**:
  id, school_id, token_id, used_at, gate_id, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**pickup_tokens**:
  id, school_id, student_id, token_value, valid_until, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**plan_change_history**:
  id, advertiser_id, old_plan_id, new_plan_id, changed_by, reason, created_at, updated_at

**profiles**:
  id, school_id, full_name, email, cpf, role, phone, avatar_url, is_active, metadata, created_at, updated_at, deleted_at

**promotions**:
  id, advertiser_card_id, promotional_price, start_date, end_date, show_timer, is_active, created_at, updated_at

**push_notifications**:
  id, school_id, profile_id, device_token, payload, status, created_by, updated_by, created_at, updated_at, deleted_at

**refresh_tokens**:
  id, user_id, token, expires_at, is_revoked, created_at, updated_at

**roles**:
  id, name, description, created_at, updated_at

**room_reservations**:
  id, school_id, room_id, event_id, reserved_by, start_time, end_time, purpose, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**routine_attachments**:
  id, school_id, occurrence_id, file_name, file_url, file_size, file_type, created_by, updated_by, created_at, updated_at, deleted_at

**routine_followups**:
  id, school_id, occurrence_id, employee_id, followup_description, next_action, scheduled_date, completed, completed_at, created_by, updated_by, created_at, updated_at, deleted_at

**routine_notifications**:
  id, school_id, occurrence_id, profile_id, notification_title, notification_message, notification_type, read, read_at, created_by, updated_by, created_at, updated_at, deleted_at

**routine_occurrences**:
  id, school_id, student_id, class_id, employee_id, occurrence_type, occurrence_category, severity, title, description, action_taken, requires_family_notification, requires_signature, requires_followup, status, event_date, created_by, updated_by, created_at, updated_at, deleted_at

**scheduled_messages**:
  id, school_id, message_payload, scheduled_for, status, created_by, updated_by, created_at, updated_at, deleted_at

**school_calendar**:
  id, school_id, title, description, start_date, end_date, event_type, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**school_grades**:
  id, school_id, name, description, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**school_menus**:
  id, school_id, menu_date, meal_type, items, allergens, nutritional_info, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**school_occurrences**:
  id, school_id, student_id, student_name, grade, type, severity, description, registered_by, status, created_at, updated_at

**school_settings**:
  id, school_id, academic_year, school_days, default_schedule, class_duration_minutes, classes_per_day, report_card_template, certificate_template, logo_url, banner_url, phone, email, website, social_networks, qrcode_config, notification_config, family_config, teacher_config, manager_config, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by, unique(school_id)

**school_shifts**:
  id, school_id, name, start_time, end_time, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**school_units**:
  id, school_id, unit_name, code, address, created_at, updated_at

**schools**:
  id, code, name, legal_name, cnpj, phone, email, street, city, state, zip_code, logo_url, subscription_plan, status, created_at, updated_at, deleted_at, deleted_by

**security_alerts**:
  id, school_id, alert_type, message, severity, is_resolved, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**security_audit_logs**:
  id, school_id, action, target_type, target_id, old_data, new_data, performed_by, ip_address, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**security_camera_integrations**:
  id, school_id, camera_id, provider, stream_url, settings, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**security_device_events**:
  id, school_id, device_id, event_type, event_time, details, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**security_devices**:
  id, school_id, name, device_type, location, ip_address, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**security_incident_attachments**:
  id, school_id, incident_id, file_url, file_type, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**security_incidents**:
  id, school_id, title, description, severity, incident_date, location, reported_by, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**security_integrations**:
  id, school_id, provider_name, api_key, api_secret, webhook_url, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**security_permissions**:
  id, school_id, profile_id, permission_level, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**security_settings**:
  id, school_id, setting_key, setting_value, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**security_shift_logs**:
  id, school_id, profile_id, shift_start, shift_end, notes, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**security_team_members**:
  id, school_id, team_id, profile_id, role, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**security_teams**:
  id, school_id, name, description, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**storage_folders**:
  id, school_id, name, bucket_name, description, folder_type, is_private, parent_folder_id, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**student_behavior_history**:
  id, school_id, student_id, occurrence_id, summary, severity, registered_by, created_by, updated_by, created_at, updated_at, deleted_at

**student_enrollments**:
  id, student_id, class_id, academic_year_id, shift_id, status, enrollment_date, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by, unique(student_id,

**student_pickup_authorizations**:
  id, school_id, student_id, guardian_id, authorized_person_name, authorized_person_doc, relationship, authorization_type, start_date, end_date, photo_url, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**student_pickup_history**:
  id, school_id, student_id, authorization_id, picked_up_by_name, pickup_time, gate_id, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**student_schedule_events**:
  id, school_id, student_id, event_id, title, description, start_time, end_time, is_mandatory, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**students**:
  id, school_id, class_id, name, registration_code, grade, class_name, birth_date, cpf, parent_id, photo_url, medical_info, status, created_at, updated_at, deleted_at

**subjects**:
  id, school_id, name, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**subscription_plans**:
  id, category_id, name, price, promotional_price, description, card_color, highlight_color, position, photo_limit, banner_limit, video_limit, highlight_limit, allow_whatsapp, allow_website, allow_statistics, allow_leads, allow_ai, status, created_at, updated_at

**subscriptions**:
  id, advertiser_id, plan_id, amount, payment_method, pix_key, card_info, status, renewal_date, next_due_date, grace_period_days, is_cancelled, cancelled_at, created_at, updated_at

**sync_history**:
  id, entity_type, entity_id, source_module, target_module, status, synced_at

**system_actions**:
  id, name, action_key, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**system_events**:
  id, event_name, description, module, is_active, created_at, updated_at

**system_menus**:
  id, name, icon, route, sort_order, is_active, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**system_profiles**:
  id, name, description, icon, color, sort_order, is_active, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**system_settings**:
  id, platform_name, version, theme, logo_url, primary_color, secondary_color, language, timezone, maintenance_mode, auto_backup, ai_config, email_config, sms_config, whatsapp_config, pix_config, mercadopago_config, stripe_config, asaas_config, storage_config, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**system_submenus**:
  id, menu_id, name, route, sort_order, is_active, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**teacher_classes**:
  id, teacher_id, subject_id, class_id, class_count, workload_hours, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by, unique(teacher_id,

**teacher_schedule_events**:
  id, school_id, teacher_id, title, event_type, start_time, end_time, description, is_available, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_authorizations**:
  id, school_id, student_id, guardian_id, authorized_by, valid_until, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_boarding_logs**:
  id, school_id, student_id, route_id, action_type, action_time, latitude, longitude, logged_by, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_checklists**:
  id, school_id, vehicle_id, driver_id, checklist_date, items, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_drivers**:
  id, school_id, profile_id, license_number, license_category, license_expiration, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_fuel_logs**:
  id, school_id, vehicle_id, fuel_date, liters, cost, mileage, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_gps_tracking**:
  id, school_id, vehicle_id, route_id, latitude, longitude, speed, recorded_at, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_insurance**:
  id, school_id, vehicle_id, provider, policy_number, start_date, end_date, cost, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_maintenance**:
  id, school_id, vehicle_id, maintenance_date, description, cost, provider, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_monitors**:
  id, school_id, profile_id, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_occurrences**:
  id, school_id, vehicle_id, route_id, driver_id, occurrence_date, description, severity, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_route_stops**:
  id, school_id, route_id, name, address, latitude, longitude, order_index, estimated_time, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_routes**:
  id, school_id, name, vehicle_id, driver_id, monitor_id, shift, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_students**:
  id, school_id, student_id, route_id, stop_id, boarding_type, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**transport_vehicles**:
  id, school_id, plate, model, brand, year, capacity, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**uploaded_files**:
  id, folder_id, school_id, bucket_name, file_url, file_name, file_type, extension, size_bytes, file_hash, uploaded_by, module_source, created_at, updated_at, deleted_at, deleted_by

**user_devices**:
  id, user_id, device_type, brand, model, os, os_version, push_token, last_access, created_at, updated_at

**user_multiple_profiles**:
  id, user_id, school_id, system_profile_id, job_position_id, is_default, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by, unique(user_id,

**user_permissions**:
  id, user_id, school_id, menu_id, submenu_id, action_id, is_allowed, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

**user_preferences**:
  id, user_id, theme, language, favorite_menu, home_page, notifications_enabled, dark_mode, font_size, created_at, updated_at, unique(user_id)

**user_roles**:
  id, user_id, role_id, school_id, granted_by, created_at, updated_at

**visitor_badges**:
  id, school_id, badge_number, rfid_tag, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**visitor_blacklist**:
  id, school_id, document_number, name, reason, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**visitor_checkin**:
  id, school_id, visitor_id, checkin_time, gate_id, host_profile_id, purpose, badge_number, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**visitor_checkout**:
  id, school_id, checkin_id, checkout_time, gate_id, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**visitor_documents**:
  id, school_id, visitor_id, document_url, document_type, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**visitor_notifications**:
  id, school_id, visitor_id, host_profile_id, notification_type, message, is_read, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**visitor_photos**:
  id, school_id, visitor_id, photo_url, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**visitor_whitelist**:
  id, school_id, document_number, name, reason, status, created_by, updated_by, created_at, updated_at, deleted_at, metadata

**webhooks**:
  id, school_id, url, secret, events, is_active, created_at, updated_at

**whatsapp_queue**:
  id, school_id, phone_number, message_text, status, created_by, updated_by, created_at, updated_at, deleted_at


## 3. Tabelas sem Row Level Security (RLS)

- academic_assignments
- access_gates
- access_points
- agenda_attachments
- agenda_audit_logs
- agenda_categories
- agenda_event_targets
- agenda_events
- agenda_participants
- agenda_recurrences
- agenda_reminders
- agenda_reservations
- agenda_resources
- announcement_confirmations
- announcement_reads
- announcement_recipients
- authorized_visitors
- calendar_confirmations
- calendar_locations
- calendar_settings
- communication_categories
- communication_channels
- communication_delivery_logs
- communication_settings
- delivery_queue
- email_queue
- email_verifications
- exam_calendar
- family_notifications
- family_schedule_events
- financial_accounts
- financial_audit_logs
- financial_bank_accounts
- financial_bank_reconciliation
- financial_billing_cycles
- financial_budgets
- financial_cash_flow
- financial_categories
- financial_charge_templates
- financial_closing
- financial_contracts
- financial_cost_centers
- financial_daily_cash
- financial_discounts
- financial_enrollments
- financial_export_logs
- financial_fines
- financial_forecasts
- financial_gateway_logs
- financial_import_logs
- financial_installments
- financial_interest
- financial_invoice_items
- financial_invoices
- financial_notifications
- financial_payment_links
- financial_payment_methods
- financial_payments
- financial_pix
- financial_pix_transactions
- financial_receipts
- financial_refunds
- financial_reports
- financial_student_contracts
- financial_transaction_items
- financial_transactions
- gate_access_logs
- gate_access_rules
- gate_authorizations
- gate_device_logs
- gate_device_status
- gate_devices
- gate_events
- gate_schedules
- holiday_calendar
- meeting_calendar
- message_attachments
- message_threads
- messages
- password_resets
- pickup_qrcode_logs
- pickup_qrcodes
- pickup_token_logs
- pickup_tokens
- push_notifications
- room_reservations
- scheduled_messages
- school_menus
- security_alerts
- security_audit_logs
- security_camera_integrations
- security_device_events
- security_devices
- security_incident_attachments
- security_incidents
- security_integrations
- security_permissions
- security_settings
- security_shift_logs
- security_team_members
- security_teams
- student_pickup_authorizations
- student_pickup_history
- student_schedule_events
- teacher_schedule_events
- visitor_badges
- visitor_blacklist
- visitor_checkin
- visitor_checkout
- visitor_documents
- visitor_notifications
- visitor_photos
- visitor_whitelist
- whatsapp_queue

## 4. Tabelas sem Índices Importantes

- communication_categories (Falta índice em school_id)
- communication_categories (Falta índice em deleted_at)
- communication_channels (Falta índice em school_id)
- communication_channels (Falta índice em deleted_at)
- communication_settings (Falta índice em school_id)
- communication_settings (Falta índice em deleted_at)
- communication_templates (Falta índice em deleted_at)
- announcement_recipients (Falta índice em school_id)
- announcement_recipients (Falta índice em deleted_at)
- announcement_reads (Falta índice em school_id)
- announcement_reads (Falta índice em deleted_at)
- announcement_confirmations (Falta índice em school_id)
- announcement_confirmations (Falta índice em deleted_at)
- message_threads (Falta índice em school_id)
- message_threads (Falta índice em deleted_at)
- messages (Falta índice em school_id)
- messages (Falta índice em deleted_at)
- message_attachments (Falta índice em school_id)
- message_attachments (Falta índice em deleted_at)
- communication_attachments (Falta índice em deleted_at)
- communication_notifications (Falta índice em deleted_at)
- family_notifications (Falta índice em school_id)
- family_notifications (Falta índice em deleted_at)
- scheduled_messages (Falta índice em school_id)
- scheduled_messages (Falta índice em deleted_at)
- delivery_queue (Falta índice em school_id)
- delivery_queue (Falta índice em deleted_at)
- push_notifications (Falta índice em school_id)
- push_notifications (Falta índice em deleted_at)
- email_queue (Falta índice em school_id)
- email_queue (Falta índice em deleted_at)
- whatsapp_queue (Falta índice em school_id)
- whatsapp_queue (Falta índice em deleted_at)
- communication_delivery_logs (Falta índice em school_id)
- communication_delivery_logs (Falta índice em deleted_at)
- file_registry (Falta índice em school_id)
- file_registry (Falta índice em deleted_at)
- routine_occurrences (Falta índice em deleted_at)
- routine_followups (Falta índice em deleted_at)
- routine_notifications (Falta índice em deleted_at)
- disciplinary_actions (Falta índice em deleted_at)
- behavior_points (Falta índice em deleted_at)
- routine_attachments (Falta índice em deleted_at)
- student_behavior_history (Falta índice em deleted_at)
- family_occurrence_confirmations (Falta índice em deleted_at)
- schools (Falta índice em deleted_at)
- profiles (Falta índice em deleted_at)
- students (Falta índice em deleted_at)
- lost_and_found (Falta índice em deleted_at)
- integration_queue (Falta índice em school_id)
- webhooks (Falta índice em school_id)
- advertisers (Falta índice em deleted_at)
- school_units (Falta índice em school_id)
- classes (Falta índice em school_id)
- food_menus (Falta índice em school_id)
- gate_access_tokens (Falta índice em school_id)
- integration_events (Falta índice em school_id)
- user_roles (Falta índice em school_id)
- user_permissions (Falta índice em school_id)
- user_permissions (Falta índice em deleted_at)
- communications (Falta índice em deleted_at)
- communication_recipients (Falta índice em deleted_at)
- digital_signatures (Falta índice em deleted_at)
- communication_history (Falta índice em deleted_at)
- global_event_bus (Falta índice em school_id)
- system_profiles (Falta índice em deleted_at)
- departments (Falta índice em deleted_at)
- job_positions (Falta índice em deleted_at)
- user_multiple_profiles (Falta índice em deleted_at)
- system_menus (Falta índice em deleted_at)
- system_submenus (Falta índice em deleted_at)
- system_actions (Falta índice em deleted_at)
- permission_matrix (Falta índice em deleted_at)
- system_settings (Falta índice em deleted_at)
- school_settings (Falta índice em deleted_at)
- notifications (Falta índice em deleted_at)
- storage_folders (Falta índice em deleted_at)
- uploaded_files (Falta índice em deleted_at)
- api_integrations (Falta índice em deleted_at)
- agenda_categories (Falta índice em school_id)
- agenda_categories (Falta índice em deleted_at)
- agenda_events (Falta índice em school_id)
- agenda_events (Falta índice em deleted_at)
- agenda_event_targets (Falta índice em school_id)
- agenda_event_targets (Falta índice em deleted_at)
- agenda_resources (Falta índice em school_id)
- agenda_resources (Falta índice em deleted_at)
- agenda_reservations (Falta índice em school_id)
- agenda_reservations (Falta índice em deleted_at)
- agenda_participants (Falta índice em school_id)
- agenda_participants (Falta índice em deleted_at)
- agenda_attachments (Falta índice em school_id)
- agenda_attachments (Falta índice em deleted_at)
- agenda_audit_logs (Falta índice em school_id)
- agenda_audit_logs (Falta índice em deleted_at)
- education_networks (Falta índice em deleted_at)
- academic_years (Falta índice em deleted_at)
- academic_terms (Falta índice em deleted_at)
- school_shifts (Falta índice em deleted_at)
- school_grades (Falta índice em school_id)
- school_grades (Falta índice em deleted_at)
- classrooms (Falta índice em deleted_at)
- subjects (Falta índice em deleted_at)
- student_enrollments (Falta índice em deleted_at)
- teacher_classes (Falta índice em deleted_at)
- class_schedules (Falta índice em deleted_at)
- school_calendar (Falta índice em deleted_at)
- attendance_settings (Falta índice em school_id)
- attendance_settings (Falta índice em deleted_at)
- grading_models (Falta índice em school_id)
- grading_models (Falta índice em deleted_at)
- academic_documents (Falta índice em school_id)
- academic_documents (Falta índice em deleted_at)
- calendar_settings (Falta índice em school_id)
- calendar_settings (Falta índice em deleted_at)
- holiday_calendar (Falta índice em school_id)
- holiday_calendar (Falta índice em deleted_at)
- exam_calendar (Falta índice em school_id)
- exam_calendar (Falta índice em deleted_at)
- meeting_calendar (Falta índice em school_id)
- meeting_calendar (Falta índice em deleted_at)
- teacher_schedule_events (Falta índice em school_id)
- teacher_schedule_events (Falta índice em deleted_at)
- calendar_locations (Falta índice em school_id)
- calendar_locations (Falta índice em deleted_at)
- calendar_confirmations (Falta índice em school_id)
- calendar_confirmations (Falta índice em deleted_at)
- financial_bank_accounts (Falta índice em school_id)
- financial_bank_accounts (Falta índice em deleted_at)
- financial_cost_centers (Falta índice em school_id)
- financial_cost_centers (Falta índice em deleted_at)
- financial_categories (Falta índice em school_id)
- financial_categories (Falta índice em deleted_at)
- financial_accounts (Falta índice em school_id)
- financial_accounts (Falta índice em deleted_at)
- financial_payment_methods (Falta índice em school_id)
- financial_payment_methods (Falta índice em deleted_at)
- financial_invoices (Falta índice em school_id)
- financial_invoices (Falta índice em deleted_at)
- financial_invoice_items (Falta índice em school_id)
- financial_invoice_items (Falta índice em deleted_at)
- financial_installments (Falta índice em school_id)
- financial_installments (Falta índice em deleted_at)
- financial_transactions (Falta índice em school_id)
- financial_transactions (Falta índice em deleted_at)
- financial_transaction_items (Falta índice em school_id)
- financial_transaction_items (Falta índice em deleted_at)
- financial_receipts (Falta índice em school_id)
- financial_receipts (Falta índice em deleted_at)
- financial_payments (Falta índice em school_id)
- financial_payments (Falta índice em deleted_at)
- financial_discounts (Falta índice em school_id)
- financial_discounts (Falta índice em deleted_at)
- financial_interest (Falta índice em school_id)
- financial_interest (Falta índice em deleted_at)
- financial_fines (Falta índice em school_id)
- financial_fines (Falta índice em deleted_at)
- financial_refunds (Falta índice em school_id)
- financial_refunds (Falta índice em deleted_at)
- financial_pix (Falta índice em school_id)
- financial_pix (Falta índice em deleted_at)
- financial_pix_transactions (Falta índice em school_id)
- financial_pix_transactions (Falta índice em deleted_at)
- financial_bank_reconciliation (Falta índice em school_id)
- financial_bank_reconciliation (Falta índice em deleted_at)
- financial_cash_flow (Falta índice em school_id)
- financial_cash_flow (Falta índice em deleted_at)
- financial_daily_cash (Falta índice em school_id)
- financial_daily_cash (Falta índice em deleted_at)
- financial_closing (Falta índice em school_id)
- financial_closing (Falta índice em deleted_at)
- financial_budgets (Falta índice em school_id)
- financial_budgets (Falta índice em deleted_at)
- financial_forecasts (Falta índice em school_id)
- financial_forecasts (Falta índice em deleted_at)
- financial_reports (Falta índice em school_id)
- financial_reports (Falta índice em deleted_at)
- financial_contracts (Falta índice em school_id)
- financial_contracts (Falta índice em deleted_at)
- financial_student_contracts (Falta índice em school_id)
- financial_student_contracts (Falta índice em deleted_at)
- financial_enrollments (Falta índice em school_id)
- financial_enrollments (Falta índice em deleted_at)
- financial_billing_cycles (Falta índice em school_id)
- financial_billing_cycles (Falta índice em deleted_at)
- financial_charge_templates (Falta índice em school_id)
- financial_charge_templates (Falta índice em deleted_at)
- financial_payment_links (Falta índice em school_id)
- financial_payment_links (Falta índice em deleted_at)
- financial_gateway_logs (Falta índice em school_id)
- financial_gateway_logs (Falta índice em deleted_at)
- financial_import_logs (Falta índice em school_id)
- financial_import_logs (Falta índice em deleted_at)
- financial_export_logs (Falta índice em school_id)
- financial_export_logs (Falta índice em deleted_at)
- financial_notifications (Falta índice em school_id)
- financial_notifications (Falta índice em deleted_at)
- financial_audit_logs (Falta índice em school_id)
- financial_audit_logs (Falta índice em deleted_at)
- access_points (Falta índice em school_id)
- access_points (Falta índice em deleted_at)
- access_gates (Falta índice em school_id)
- access_gates (Falta índice em deleted_at)
- gate_devices (Falta índice em school_id)
- gate_devices (Falta índice em deleted_at)
- gate_device_logs (Falta índice em school_id)
- gate_device_logs (Falta índice em deleted_at)
- gate_device_status (Falta índice em school_id)
- gate_device_status (Falta índice em deleted_at)
- gate_events (Falta índice em school_id)
- gate_events (Falta índice em deleted_at)
- gate_access_logs (Falta índice em school_id)
- gate_access_logs (Falta índice em deleted_at)
- gate_access_rules (Falta índice em school_id)
- gate_access_rules (Falta índice em deleted_at)
- gate_schedules (Falta índice em school_id)
- gate_schedules (Falta índice em deleted_at)
- gate_authorizations (Falta índice em school_id)
- gate_authorizations (Falta índice em deleted_at)
- student_pickup_authorizations (Falta índice em school_id)
- student_pickup_authorizations (Falta índice em deleted_at)
- student_pickup_history (Falta índice em school_id)
- student_pickup_history (Falta índice em deleted_at)
- pickup_qrcodes (Falta índice em school_id)
- pickup_qrcodes (Falta índice em deleted_at)
- pickup_qrcode_logs (Falta índice em school_id)
- pickup_qrcode_logs (Falta índice em deleted_at)
- pickup_tokens (Falta índice em school_id)
- pickup_tokens (Falta índice em deleted_at)
- pickup_token_logs (Falta índice em school_id)
- pickup_token_logs (Falta índice em deleted_at)
- authorized_visitors (Falta índice em school_id)
- authorized_visitors (Falta índice em deleted_at)
- visitor_documents (Falta índice em school_id)
- visitor_documents (Falta índice em deleted_at)
- visitor_photos (Falta índice em school_id)
- visitor_photos (Falta índice em deleted_at)
- visitor_checkin (Falta índice em school_id)
- visitor_checkin (Falta índice em deleted_at)
- visitor_checkout (Falta índice em school_id)
- visitor_checkout (Falta índice em deleted_at)
- visitor_badges (Falta índice em school_id)
- visitor_badges (Falta índice em deleted_at)
- visitor_blacklist (Falta índice em school_id)
- visitor_blacklist (Falta índice em deleted_at)
- visitor_whitelist (Falta índice em school_id)
- visitor_whitelist (Falta índice em deleted_at)
- visitor_notifications (Falta índice em school_id)
- visitor_notifications (Falta índice em deleted_at)
- security_incidents (Falta índice em school_id)
- security_incidents (Falta índice em deleted_at)
- security_incident_attachments (Falta índice em school_id)
- security_incident_attachments (Falta índice em deleted_at)
- security_alerts (Falta índice em school_id)
- security_alerts (Falta índice em deleted_at)
- security_settings (Falta índice em school_id)
- security_settings (Falta índice em deleted_at)
- security_permissions (Falta índice em school_id)
- security_permissions (Falta índice em deleted_at)
- security_shift_logs (Falta índice em school_id)
- security_shift_logs (Falta índice em deleted_at)
- security_teams (Falta índice em school_id)
- security_teams (Falta índice em deleted_at)
- security_team_members (Falta índice em school_id)
- security_team_members (Falta índice em deleted_at)
- security_audit_logs (Falta índice em school_id)
- security_audit_logs (Falta índice em deleted_at)
- security_devices (Falta índice em school_id)
- security_devices (Falta índice em deleted_at)
- security_device_events (Falta índice em school_id)
- security_device_events (Falta índice em deleted_at)
- security_camera_integrations (Falta índice em school_id)
- security_camera_integrations (Falta índice em deleted_at)
- security_integrations (Falta índice em school_id)
- security_integrations (Falta índice em deleted_at)
- academic_assignments (Falta índice em school_id)
- academic_assignments (Falta índice em deleted_at)
- student_schedule_events (Falta índice em school_id)
- student_schedule_events (Falta índice em deleted_at)
- family_schedule_events (Falta índice em school_id)
- family_schedule_events (Falta índice em deleted_at)
- room_reservations (Falta índice em school_id)
- room_reservations (Falta índice em deleted_at)
- school_menus (Falta índice em school_id)
- school_menus (Falta índice em deleted_at)
- agenda_reminders (Falta índice em school_id)
- agenda_reminders (Falta índice em deleted_at)
- agenda_recurrences (Falta índice em school_id)
- agenda_recurrences (Falta índice em deleted_at)

## 5. Tabelas sem Trigger de updated_at

- academic_assignments
- access_gates
- access_points
- agenda_attachments
- agenda_audit_logs
- agenda_categories
- agenda_event_targets
- agenda_events
- agenda_participants
- agenda_recurrences
- agenda_reminders
- agenda_reservations
- agenda_resources
- announcement_confirmations
- announcement_reads
- announcement_recipients
- announcements
- authorized_visitors
- background_jobs
- behavior_points
- calendar_confirmations
- calendar_locations
- calendar_settings
- classes
- communication_categories
- communication_channels
- communication_delivery_logs
- communication_settings
- delivery_queue
- disciplinary_actions
- email_queue
- event_subscriptions
- exam_calendar
- family_notifications
- family_occurrence_confirmations
- family_schedule_events
- financial_accounts
- financial_audit_logs
- financial_bank_accounts
- financial_bank_reconciliation
- financial_billing_cycles
- financial_budgets
- financial_cash_flow
- financial_categories
- financial_charge_templates
- financial_closing
- financial_contracts
- financial_cost_centers
- financial_daily_cash
- financial_discounts
- financial_enrollments
- financial_export_logs
- financial_fines
- financial_forecasts
- financial_gateway_logs
- financial_import_logs
- financial_installments
- financial_interest
- financial_invoice_items
- financial_invoices
- financial_notifications
- financial_payment_links
- financial_payment_methods
- financial_payments
- financial_pix
- financial_pix_transactions
- financial_receipts
- financial_refunds
- financial_reports
- financial_student_contracts
- financial_transaction_items
- financial_transactions
- gate_access_logs
- gate_access_rules
- gate_authorizations
- gate_device_logs
- gate_device_status
- gate_devices
- gate_events
- gate_schedules
- holiday_calendar
- integration_queue
- lost_and_found
- meeting_calendar
- message_attachments
- message_threads
- messages
- notification_queue
- pickup_qrcode_logs
- pickup_qrcodes
- pickup_token_logs
- pickup_tokens
- push_notifications
- room_reservations
- routine_attachments
- routine_followups
- routine_notifications
- routine_occurrences
- scheduled_messages
- school_menus
- school_occurrences
- school_units
- security_alerts
- security_audit_logs
- security_camera_integrations
- security_device_events
- security_devices
- security_incident_attachments
- security_incidents
- security_integrations
- security_permissions
- security_settings
- security_shift_logs
- security_team_members
- security_teams
- student_behavior_history
- student_pickup_authorizations
- student_pickup_history
- student_schedule_events
- system_events
- teacher_schedule_events
- transport_authorizations
- transport_boarding_logs
- transport_checklists
- transport_drivers
- transport_fuel_logs
- transport_gps_tracking
- transport_insurance
- transport_maintenance
- transport_monitors
- transport_occurrences
- transport_route_stops
- transport_routes
- transport_students
- transport_vehicles
- visitor_badges
- visitor_blacklist
- visitor_checkin
- visitor_checkout
- visitor_documents
- visitor_notifications
- visitor_photos
- visitor_whitelist
- webhooks
- whatsapp_queue

## 6. Tabelas não adicionadas ao Supabase Realtime

- academic_assignments
- academic_documents
- academic_terms
- academic_years
- access_gates
- access_logs
- access_points
- active_sessions
- advertiser_cards
- advertiser_categories
- advertiser_documents
- advertiser_favorites
- advertiser_leads
- advertiser_messages
- advertiser_notifications
- advertiser_reviews
- advertiser_statistics
- advertisers
- agenda_attachments
- agenda_audit_logs
- agenda_categories
- agenda_event_targets
- agenda_events
- agenda_participants
- agenda_recurrences
- agenda_reminders
- agenda_reservations
- agenda_resources
- announcement_confirmations
- announcement_reads
- announcement_recipients
- announcements
- api_integrations
- attendance_settings
- audit_logs
- audit_security
- authorized_visitors
- background_jobs
- blocked_users
- calendar_confirmations
- calendar_locations
- calendar_settings
- card_click_logs
- class_schedules
- classes
- classrooms
- communication_categories
- communication_channels
- communication_delivery_logs
- communication_settings
- delivery_queue
- departments
- devices
- email_queue
- email_verifications
- event_subscriptions
- exam_calendar
- failed_login_attempts
- family_notifications
- family_schedule_events
- file_registry
- financial_accounts
- financial_audit_logs
- financial_bank_accounts
- financial_bank_reconciliation
- financial_billing_cycles
- financial_budgets
- financial_cash_flow
- financial_categories
- financial_charge_templates
- financial_closing
- financial_contracts
- financial_cost_centers
- financial_daily_cash
- financial_discounts
- financial_enrollments
- financial_export_logs
- financial_fines
- financial_forecasts
- financial_gateway_logs
- financial_import_logs
- financial_installments
- financial_interest
- financial_invoice_items
- financial_invoices
- financial_notifications
- financial_payment_links
- financial_payment_methods
- financial_payments
- financial_pix
- financial_pix_transactions
- financial_receipts
- financial_refunds
- financial_reports
- financial_student_contracts
- financial_transaction_items
- financial_transactions
- food_menus
- gate_access_logs
- gate_access_rules
- gate_access_tokens
- gate_authorizations
- gate_device_logs
- gate_device_status
- gate_devices
- gate_events
- gate_schedules
- global_integration_errors
- global_sync_logs
- grading_models
- holiday_calendar
- integration_errors
- integration_events
- integration_logs
- integration_queue
- invoices
- job_positions
- login_history
- lost_and_found
- marketplace_settings
- meeting_calendar
- message_attachments
- message_threads
- messages
- mfa_settings
- notification_preferences
- notification_queue
- notifications
- password_history
- password_resets
- permission_groups
- permission_history
- permission_matrix
- permissions
- pickup_qrcode_logs
- pickup_qrcodes
- pickup_token_logs
- pickup_tokens
- plan_change_history
- profiles
- promotions
- push_notifications
- refresh_tokens
- roles
- room_reservations
- scheduled_messages
- school_calendar
- school_grades
- school_menus
- school_occurrences
- school_settings
- school_shifts
- school_units
- schools
- security_alerts
- security_audit_logs
- security_camera_integrations
- security_device_events
- security_devices
- security_incident_attachments
- security_incidents
- security_integrations
- security_permissions
- security_settings
- security_shift_logs
- security_team_members
- security_teams
- storage_folders
- student_enrollments
- student_pickup_authorizations
- student_pickup_history
- student_schedule_events
- students
- subjects
- subscription_plans
- subscriptions
- sync_history
- system_actions
- system_events
- system_menus
- system_submenus
- teacher_classes
- teacher_schedule_events
- transport_authorizations
- transport_boarding_logs
- transport_checklists
- transport_drivers
- transport_fuel_logs
- transport_gps_tracking
- transport_insurance
- transport_maintenance
- transport_monitors
- transport_occurrences
- transport_route_stops
- transport_routes
- transport_students
- transport_vehicles
- uploaded_files
- user_devices
- user_multiple_profiles
- user_permissions
- user_preferences
- user_roles
- visitor_badges
- visitor_blacklist
- visitor_checkin
- visitor_checkout
- visitor_documents
- visitor_notifications
- visitor_photos
- visitor_whitelist
- webhooks
- whatsapp_queue

## 7. Tabelas com Colunas Duplicadas ou Desnecessárias

Nenhuma coluna duplicada identificada através da análise estática.


## 8. Tabelas com Campos Obrigatórios Faltando

- communication_categories: faltam (metadata)
- communication_channels: faltam (metadata)
- communication_settings: faltam (metadata)
- communication_templates: faltam (metadata)
- announcements: faltam (metadata, deleted_at)
- announcement_recipients: faltam (metadata)
- announcement_reads: faltam (metadata)
- announcement_confirmations: faltam (metadata)
- message_threads: faltam (metadata)
- messages: faltam (metadata)
- message_attachments: faltam (metadata)
- communication_attachments: faltam (metadata)
- communication_notifications: faltam (metadata)
- family_notifications: faltam (metadata)
- scheduled_messages: faltam (metadata)
- delivery_queue: faltam (metadata)
- push_notifications: faltam (metadata)
- email_queue: faltam (metadata)
- whatsapp_queue: faltam (metadata)
- communication_delivery_logs: faltam (metadata)
- file_registry: faltam (metadata)
- routine_occurrences: faltam (metadata)
- routine_followups: faltam (metadata)
- routine_notifications: faltam (metadata)
- disciplinary_actions: faltam (metadata)
- behavior_points: faltam (metadata)
- routine_attachments: faltam (metadata)
- student_behavior_history: faltam (metadata)
- family_occurrence_confirmations: faltam (metadata)
- schools: faltam (school_id, metadata)
- students: faltam (metadata)
- lost_and_found: faltam (metadata)
- school_occurrences: faltam (metadata, deleted_at)
- audit_logs: faltam (updated_at, metadata, deleted_at)
- system_events: faltam (school_id, metadata, deleted_at)
- integration_queue: faltam (metadata, deleted_at)
- integration_logs: faltam (school_id, metadata, deleted_at, updated_at)
- event_subscriptions: faltam (school_id, metadata, deleted_at)
- webhooks: faltam (metadata, deleted_at)
- sync_history: faltam (school_id, deleted_at, created_at, updated_at, metadata)
- integration_errors: faltam (school_id, metadata, deleted_at, updated_at)
- notification_queue: faltam (school_id, metadata, deleted_at)
- background_jobs: faltam (school_id, metadata, deleted_at)
- advertiser_categories: faltam (school_id, metadata, deleted_at)
- subscription_plans: faltam (school_id, metadata, deleted_at)
- advertisers: faltam (school_id, metadata)
- advertiser_cards: faltam (school_id, metadata, deleted_at)
- subscriptions: faltam (school_id, metadata, deleted_at)
- invoices: faltam (school_id, metadata, deleted_at)
- advertiser_leads: faltam (school_id, metadata, deleted_at)
- advertiser_messages: faltam (school_id, metadata, deleted_at)
- advertiser_statistics: faltam (school_id, metadata, deleted_at)
- promotions: faltam (school_id, metadata, deleted_at)
- card_click_logs: faltam (school_id, metadata, deleted_at)
- plan_change_history: faltam (school_id, metadata, deleted_at)
- advertiser_documents: faltam (school_id, metadata, deleted_at)
- advertiser_reviews: faltam (school_id, metadata, deleted_at)
- advertiser_favorites: faltam (school_id, metadata, deleted_at)
- advertiser_notifications: faltam (school_id, metadata, deleted_at)
- marketplace_settings: faltam (school_id, metadata, deleted_at)
- school_units: faltam (metadata, deleted_at)
- classes: faltam (metadata, deleted_at)
- food_menus: faltam (updated_at, metadata, deleted_at)
- gate_access_tokens: faltam (updated_at, metadata, deleted_at)
- integration_events: faltam (updated_at, metadata, deleted_at)
- roles: faltam (school_id, metadata, deleted_at)
- permission_groups: faltam (school_id, metadata, deleted_at)
- permissions: faltam (school_id, metadata, deleted_at)
- user_roles: faltam (metadata, deleted_at)
- user_permissions: faltam (metadata)
- login_history: faltam (updated_at, metadata, deleted_at)
- active_sessions: faltam (school_id, metadata, deleted_at, updated_at)
- refresh_tokens: faltam (school_id, metadata, deleted_at)
- password_history: faltam (school_id, metadata, deleted_at, updated_at)
- mfa_settings: faltam (school_id, metadata, deleted_at)
- devices: faltam (school_id, metadata, deleted_at)
- audit_security: faltam (school_id, metadata, deleted_at, updated_at)
- access_logs: faltam (school_id, metadata, deleted_at, updated_at)
- failed_login_attempts: faltam (school_id, deleted_at, created_at, updated_at, metadata)
- blocked_users: faltam (school_id, metadata, deleted_at)
- password_resets: faltam (school_id, metadata, deleted_at)
- email_verifications: faltam (school_id, metadata, deleted_at)
- user_preferences: faltam (school_id, metadata, deleted_at)
- notification_preferences: faltam (school_id, metadata, deleted_at)
- communications: faltam (metadata)
- communication_recipients: faltam (metadata)
- digital_signatures: faltam (metadata)
- communication_history: faltam (metadata)
- global_event_bus: faltam (metadata, deleted_at)
- global_sync_logs: faltam (school_id, metadata, deleted_at, updated_at)
- global_integration_errors: faltam (school_id, metadata, deleted_at, updated_at)
- system_profiles: faltam (school_id, metadata)
- departments: faltam (metadata)
- job_positions: faltam (metadata)
- user_multiple_profiles: faltam (metadata)
- system_menus: faltam (school_id, metadata)
- system_submenus: faltam (school_id, metadata)
- system_actions: faltam (school_id, metadata)
- permission_matrix: faltam (school_id, metadata)
- permission_history: faltam (updated_at, metadata, deleted_at)
- system_settings: faltam (school_id, metadata)
- school_settings: faltam (metadata)
- user_devices: faltam (school_id, metadata, deleted_at)
- notifications: faltam (updated_at, metadata)
- storage_folders: faltam (metadata)
- uploaded_files: faltam (metadata)
- api_integrations: faltam (metadata)
- education_networks: faltam (school_id, metadata)
- academic_years: faltam (metadata)
- academic_terms: faltam (school_id, metadata)
- school_shifts: faltam (metadata)
- school_grades: faltam (metadata)
- classrooms: faltam (metadata)
- subjects: faltam (metadata)
- student_enrollments: faltam (school_id, metadata)
- teacher_classes: faltam (school_id, metadata)
- class_schedules: faltam (school_id, metadata)
- school_calendar: faltam (metadata)
- attendance_settings: faltam (metadata)
- grading_models: faltam (metadata)
- academic_documents: faltam (metadata)

## 9. Tabelas que parecem não ser utilizadas

Através da análise estática do banco de dados, é difícil determinar com precisão tabelas não utilizadas sem analisar o código fonte do backend e logs de query. No entanto, tabelas de módulos 'satélite' isolados sem referências (FKs) a alunos ou turmas (ex: tabelas de logs puramente isoladas) podem ser candidatas à revisão.


## 10. Funcionalidades no Frontend sem tabelas correspondentes

Baseado nos dados analisados, funcionalidades como:
- **Assinaturas Digitais Avançadas e Termos de Aceite Dinâmicos** (além das autorizações simples)
- **Gamificação e Recompensas para Alunos** (Sistema de pontos, badges)
- **Integração Completa de RH** (Folha de pagamento, benefícios)
- **Biblioteca Escolar e Empréstimos**
- **CRM de Captação Avançado** (Funnels de admissão de alunos, leads de marketing)
Ainda parecem não possuir representação robusta ou módulo completo no esquema de banco de dados atual.
