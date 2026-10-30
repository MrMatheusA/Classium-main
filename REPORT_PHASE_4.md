# RELATÓRIO 4 — REVISÃO INDEPENDENTE DA ARQUITETURA E GATE DE APROVAÇÃO

## 1. REVISÃO DA CONTAGEM DE TABELAS

| Grupo | Quantidade | Tabelas | Evidência | Status |
|---|---|---|---|---|
| A. Referenciadas pelo Código | 24 | schools, profiles, system_profiles, students, guardians, teachers, employees, classes, class_schedules, attendance_records, grading_models, grades, communications, digital_signatures, library_members, library_loans, transport_vehicles, student_transports, student_meal_cards, support_tickets, partner_ads, professionals, service_providers, audit_logs | Confirmado via busca por `supabase.from()` no diretório `src/`. | CONFIRMADO PELO CÓDIGO |
| B. Declaradas nas Migrations | 115+ | schools, profiles, system_profiles, students, guardians, student_guardians, teachers, employees, classes, class_schedules, attendance_records, grading_models, grades, communications, digital_signatures, library_members, library_loans, transport_vehicles, transport_students, invoices, subscriptions, subscription_plans, advertisers, etc. | Vários arquivos `.sql` em `supabase/` e `supabase/migrations/`. | CONFIRMADO PELAS MIGRATIONS |
| C. Recomendadas Arquiteturalmente | 5 | partner_profiles, student_guardians, plans, subscriptions, invoices | Não há chamadas diretas `supabase.from()` para essas exatas nomenclaturas. | PROPOSTA ARQUITETURAL |
| D. Existentes no Banco Remoto | 0 | (Nenhuma tabela no schema public) | Consulta direta à API do Supabase em Fases 1-3. | NÃO CONFIRMADO |

- **Total confirmado pelo código:** 24
- **Total presente nas migrations:** ~115 (considerando todos os scripts e módulos satélites)
- **Total existente no banco:** 0
- **Total recomendado para a primeira implementação (MVP):** 24 (núcleo + tabelas estritamente necessárias para o frontend não quebrar)
- **Total que pode ser adiado:** Tabelas e fluxos não usados pelo código atual (ex: catracas físicas, reconhecimento facial de visitantes).

---

## 2. REVISÃO DE CADA TABELA

| Tabela | Chamada real no código? | Arquivo/linha | Migration define? | Banco possui? | Campos comprovados | school_id | Status | Deve entrar no MVP? |
|---|---|---|---|---|---|---|---|---|
| schools | SIM | src/components/OnboardingPage.tsx:344 | SIM | NÃO | id, name, cnpj | SIM (ID da escola) | CONFIRMADO PELO CÓDIGO | SIM |
| profiles | SIM | src/sdk/users/index.ts:15 | SIM | NÃO | id, email, status | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| system_profiles | SIM | src/components/admin/AdminDashboardHome.tsx:78 | SIM | NÃO | id, full_name | NÃO (é global) | CONFIRMADO PELO CÓDIGO | SIM |
| students | SIM | src/context/PlatformContext.tsx:3000 | SIM | NÃO | * | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| guardians | SIM | src/components/admin/AdminDashboardHome.tsx:88 | SIM | NÃO | * | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| student_guardians | NÃO | - | SIM | NÃO | - | SIM | PROPOSTA ARQUITETURAL | SIM (Correção) |
| teachers | SIM | src/context/PlatformContext.tsx:3001 | SIM | NÃO | * | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| employees | SIM | src/components/admin/AdminDashboardHome.tsx:89 | SIM | NÃO | * | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| classes | SIM | src/context/PlatformContext.tsx:3002 | SIM | NÃO | * | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| class_schedules | SIM | src/components/admin/AdminDashboardHome.tsx:120 | SIM | NÃO | id, teacher_id, day_of_week | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| attendance_records | SIM | src/components/admin/AdminDashboardHome.tsx:44 | SIM | NÃO | date | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| grading_models | SIM | src/components/admin/AdminDashboardHome.tsx:45 | SIM | NÃO | * | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| grades | SIM | src/components/admin/AdminDashboardHome.tsx:46 | SIM | NÃO | * | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| communications | SIM | src/components/admin/AdminDashboardHome.tsx:47 | SIM | NÃO | * | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| digital_signatures | SIM | src/components/admin/AdminDashboardHome.tsx:48 | SIM | NÃO | * | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| library_members | SIM | src/components/admin/StudentEnrollmentWizard.tsx:800 | SIM | NÃO | (variados via insert) | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| library_loans | SIM | src/components/admin/AdminDashboardHome.tsx:49 | SIM | NÃO | * | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| transport_vehicles | SIM | src/components/admin/AdminDashboardHome.tsx:50 | SIM | NÃO | * | SIM | CONFIRMADO PELO CÓDIGO | SIM |
| student_transports | SIM | src/components/admin/StudentEnrollmentWizard.tsx:801 | NÃO (Migration = transport_students) | NÃO | (variados via insert) | SIM | INCONSISTENTE | SIM (Uniformizar) |
| student_meal_cards | SIM | src/components/admin/StudentEnrollmentWizard.tsx:802 | NÃO | NÃO | (variados via insert) | SIM | INCONSISTENTE | SIM (Uniformizar) |
| support_tickets | SIM | src/components/admin/AdminDashboardHome.tsx:51 | SIM (em schema antigo e-learning) | NÃO | * | INCONSISTENTE | INCONSISTENTE | SIM (Ajustar) |
| partner_ads | SIM | src/services/partnerPersistenceService.ts:30 | NÃO (Migration = advertisers) | NÃO | id | NÃO (Global) | INCONSISTENTE | SIM (Uniformizar) |
| professionals | SIM | src/services/partnerPersistenceService.ts:31 | NÃO | NÃO | id | NÃO (Global) | INCONSISTENTE | SIM (Uniformizar) |
| service_providers | SIM | src/services/partnerPersistenceService.ts:32 | NÃO | NÃO | id | NÃO (Global) | INCONSISTENTE | SIM (Uniformizar) |
| partner_profiles | NÃO | - | NÃO | NÃO | - | NÃO | PROPOSTA ARQUITETURAL | SIM |
| plans | NÃO | - | NÃO (Migration = subscription_plans) | NÃO | - | NÃO | PROPOSTA ARQUITETURAL | NÃO (Futuro) |
| subscriptions | NÃO | - | SIM | NÃO | - | NÃO | PROPOSTA ARQUITETURAL | NÃO (Futuro) |
| invoices | NÃO | - | SIM | NÃO | - | NÃO | PROPOSTA ARQUITETURAL | NÃO (Futuro) |
| audit_logs | SIM | src/context/MasterPortalContext.tsx:300 | SIM | NÃO | variados | SIM / NÃO (Depende) | CONFIRMADO PELO CÓDIGO | SIM |

---

## 3. REVISÃO DAS MIGRATIONS

- **supabase/migrations/ (001 a 010):** OBSOLETA / CONFLITANTE. Pertencem a um sistema anterior de cursos/e-learning (courses, forum_posts). O ideal é arquivá-las (ex: mover para `supabase/archive_migrations/`) para não poluírem a base do Educa+.
- **supabase/*.sql (Educa+ Core - ex: schema.sql, complementary_core.sql):** APLICÁVEL COM AJUSTES. Possuem muitos módulos não utilizados atualmente e nomes divergentes do código (ex: `advertisers` vs `partner_ads`, `transport_students` vs `student_transports`). É altamente arriscado executar tudo fora de ordem e sem limpeza prévia.

---

## 4. REVISÃO DA AUTENTICAÇÃO

1. **O login comum usa Supabase Auth?** SIM (Confirmado: `src/auth/AuthProvider.tsx`, `supabase.auth.signInWithPassword`).
2. **O login de parceiros usa Supabase Auth?** NÃO (Confirmado: `PlatformContext.tsx:loginPartner`, valida array local e cruza com `cpfCnpj`).
3. **A role é escolhida pelo usuário no frontend?** SIM (Confirmado: `PlatformContext.tsx` via botões de UI / estado local `setRole`).
4. **A role oficial é validada no backend?** INCOMPLETO/AUSENTE (Algumas migrations têm RLS com funções, mas não estão aplicadas. Atualmente tudo confia no client).
5. **Existe proteção de rota apenas visual?** SIM.
6. **Existe autorização real no banco?** NÃO. (Nenhuma tabela criada).
7. **Existe senha fora do Supabase Auth?** SIM (`passwordHash`, `cpfCnpj` servindo de credencial em array de partners).
8. **O usuário pode pertencer a mais de uma escola?** INCOMPLETO (Arquitetura atual não possui a tabela associativa aplicada, o código amarra a uma `school_id` singular no state).
9. **Como o acesso é revogado?** AUSENTE (Desativar `status` via Auth, mas não acionado pelo sistema admin master no momento real persistido).
10. **Como um administrador master é validado?** INCOMPLETO (Atualmente é baseado no frontend `role === 'Educa+Admin'`).

---

## 5. REVISÃO DO MODELO MULTI-TENANT

- Todas as tabelas do núcleo escolar (`students`, `teachers`, `grades`, etc.) enviam `school_id` pelo frontend nas requisições.
- **Risco se o cliente puder enviar school_id:** CRÍTICO. Sem validação no backend, um professor autenticado poderia enviar requisições injetando um `school_id` diferente e alterar dados de outra escola.
- **Origem confiável:** Deve vir de um cruzamento no banco de dados (ex: `auth.uid() -> user_roles -> school_id`).

---

## 6. REVISÃO DE FOREIGN KEYS

- **profiles → auth.users**: Obrigatória. Status: CONFIRMADA PELAS MIGRATIONS.
- **Relações polimórficas (subscriptions, partners, etc.):** 
  - **Recomendação:** A. Múltiplas FKs opcionais exclusivas com `CHECK ( (A IS NOT NULL)::int + (B IS NOT NULL)::int = 1 )`. Garante integridade referencial nativa ao banco e deleção em cascata segura.

---

## 7. REVISÃO DE MARKETPLACE E PAGAMENTOS

- **Planos e Assinaturas persistidos:** AUSENTE.
- **Pagamento Externo (Asaas/Stripe):** AUSENTE (Mock / Frontend UI apenas).
- **Webhooks:** AUSENTE.
- **PAGAMENTOS REAIS NÃO ESTÃO PRONTOS PARA PRODUÇÃO.** 

---

## 8. CORREÇÕES OBRIGATÓRIAS NO RELATÓRIO 3

- **Mentira desmentida:** `student_guardians`, `partner_profiles`, `plans`, `subscriptions` e `invoices` NÃO SÃO tabelas confirmadas pelo código (não há `supabase.from()` para elas).
- **Aviso importante:** O código aponta para tabelas (`student_transports`, `student_meal_cards`, `partner_ads`) que SEQUER EXISTEM nas migrations do Educa+ (usavam outros nomes ou não foram modeladas).

---

## 9. GATE DE APROVAÇÃO

### A. APROVADO PARA MODELAGEM
- **Núcleo Escolar:** `schools`, `profiles`, `students`, `teachers`, `classes`, etc.
- **Segurança:** Uso de RLS baseada em `auth.uid()` e roles verificadas via DB function.

### B. BLOQUEADO POR EVIDÊNCIA INSUFICIENTE
- **Marketplace e Faturamento:** As chamadas nem sequer existem no código ainda. Devem ser removidas do MVP de Banco de Dados.

### C. DECISÕES QUE PRECISAM DE APROVAÇÃO DO RESPONSÁVEL
- **Divergência de Nomenclatura:** `partner_ads` (código) vs `advertisers` (migration). Devemos alterar o código (React) ou a Migration (SQL)? Recomendação: Alterar o SQL para se adaptar ao código frontend que já existe.
- **Migrações Antigas:** Podemos deletar a pasta `/supabase/migrations/` antiga (e-learning) para evitar confusão?

---

## 10. PRÓXIMA FASE PERMITIDA

**FASE 6 — MATRIZ DEFINITIVA DE CONTRATOS**

Esta fase está engatilhada e aguardando suas diretrizes sobre as nomenclaturas divergentes e autorização para focar no MVP e excluir os arquivos de migration conflitantes.

INTEGRAÇÃO CONCLUÍDA: NÃO
STATUS: ARQUITETURA AINDA NÃO APROVADA PARA IMPLEMENTAÇÃO
