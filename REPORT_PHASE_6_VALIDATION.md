# RELATÓRIO 6 — VALIDAÇÃO DAS EVIDÊNCIAS E MATRIZ DE CONTRATOS

## 1. VALIDAÇÃO DAS 24 TABELAS

| Tabela | Arquivo real | Linha real | Trecho resumido | Operação | Campos lidos | Campos enviados | Evidência válida? |
|---|---|---|---|---|---|---|---|
| schools | src/components/admin/AdminDashboardHome.tsx | 160 | `await supabase.from('schools').select('*', { count: 'exact', head: true });` | SELECT (Count) | count | - | SIM |
| profiles | src/components/OnboardingPage.tsx | 346 | `await supabase.from('profiles').upsert({...})` | UPSERT | - | id, name, cpf, role, school_id, password_hash | SIM |
| system_profiles | src/components/admin/AdminDashboardHome.tsx | 393 | `supabase.from('system_profiles').select('id, full_name')` | SELECT | id, full_name | - | SIM |
| students | src/context/PlatformContext.tsx | 1944 | `supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId)` | SELECT (Count) | count | - | SIM |
| guardians | src/components/admin/AdminDashboardHome.tsx | 139 | `supabase.from('guardians').select('*', { count: 'exact', head: true });` | SELECT (Count) | count | - | SIM |
| teachers | src/context/PlatformContext.tsx | 1945 | `supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId)` | SELECT (Count) | count | - | SIM |
| employees | src/components/admin/AdminDashboardHome.tsx | 146 | `await supabase.from('employees').select('*', { count: 'exact', head: true });` | SELECT (Count) | count | - | SIM |
| classes | src/context/PlatformContext.tsx | 1946 | `supabase.from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId)` | SELECT (Count) | count | - | SIM |
| class_schedules | src/components/admin/AdminDashboardHome.tsx | 465 | `supabase.from('class_schedules').select('id, teacher_id, day_of_week, start_time');` | SELECT | id, teacher_id, day_of_week, start_time | - | SIM |
| attendance_records | src/components/admin/AdminDashboardHome.tsx | 267 | `supabase.from('attendance_records').select('date, status')` | SELECT | date, status | - | SIM |
| grading_models | src/components/admin/AdminDashboardHome.tsx | 178 | `supabase.from('grading_models').select('*', { count: 'exact', head: true });` | SELECT (Count) | count | - | SIM |
| grades | src/components/admin/AdminDashboardHome.tsx | 185 | `supabase.from('grades').select('*', { count: 'exact', head: true });` | SELECT (Count) | count | - | SIM |
| communications | src/components/admin/AdminDashboardHome.tsx | 192 | `supabase.from('communications').select('*', { count: 'exact', head: true });` | SELECT (Count) | count | - | SIM |
| digital_signatures | src/components/admin/AdminDashboardHome.tsx | 199 | `supabase.from('digital_signatures').select('*', { count: 'exact', head: true });` | SELECT (Count) | count | - | SIM |
| library_members | src/components/admin/StudentEnrollmentWizard.tsx | 689 | `supabase.from('library_members' as any).insert({...})` | INSERT | - | student_id, school_id, status, allowed_books | SIM |
| library_loans | src/components/admin/AdminDashboardHome.tsx | 208 | `supabase.from('library_loans').select('*', { count: 'exact', head: true });` | SELECT (Count) | count | - | SIM |
| transport_vehicles | src/components/admin/AdminDashboardHome.tsx | 215 | `supabase.from('transport_vehicles').select('*', { count: 'exact', head: true });` | SELECT (Count) | count | - | SIM |
| student_transports | src/components/admin/StudentEnrollmentWizard.tsx | 702 | `supabase.from('student_transports' as any).insert({...})` | INSERT | - | student_id, route_id, status | SIM |
| student_meal_cards | src/components/admin/StudentEnrollmentWizard.tsx | 714 | `supabase.from('student_meal_cards' as any).insert({...})` | INSERT | - | student_id, balance, status, dietary_restrictions | SIM |
| support_tickets | src/components/admin/AdminDashboardHome.tsx | 222 | `supabase.from('support_tickets').select('*', { count: 'exact', head: true });` | SELECT (Count) | count | - | SIM |
| audit_logs | src/context/MasterPortalContext.tsx | 60 | `await supabase.from('audit_logs').insert({...})` | INSERT | - | action, module, description, status, user_name | SIM |
| partner_ads | src/services/partnerPersistenceService.ts | 65 | `supabase.from('partner_ads').upsert(dbRows, { onConflict: 'id' });` | UPSERT | id | dbRows (variados) | SIM |
| professionals | src/services/partnerPersistenceService.ts | 114 | `supabase.from('professionals').upsert(dbRows, { onConflict: 'id' });` | UPSERT | id | dbRows (variados) | SIM |
| service_providers | src/services/partnerPersistenceService.ts | 162 | `supabase.from('service_providers').upsert(dbRows, { onConflict: 'id' });` | UPSERT | id | dbRows (variados) | SIM |

---

## 2. CONTAGEM REPRODUZÍVEL

| Categoria | Quantidade | Lista |
|---|---|---|
| Código com chamada direta | 24 | schools, profiles, system_profiles, students, guardians, teachers, employees, classes, class_schedules, attendance_records, grading_models, grades, communications, digital_signatures, library_members, library_loans, transport_vehicles, student_transports, student_meal_cards, support_tickets, audit_logs, partner_ads, professionals, service_providers |
| Migrations existentes | ~115 | Vários arquivos .sql na pasta supabase/ |
| Apenas proposta arquitetural | 2 | student_guardians, partner_profiles |
| Mockada ou futura | 3 | plans, subscriptions, invoices |
| Banco remoto verificável | 0 | Banco está vazio, sem tabelas no schema public |

---

## 3. CAMPOS E TIPOS

| Tabela | Campo | Origem | Operação | Tipo inferível? | Obrigatório inferido? | Observação |
|---|---|---|---|---|---|---|
| profiles | id, name, cpf, role, school_id, password_hash | OnboardingPage | UPSERT | UUID, TEXT, TEXT, TEXT, UUID, TEXT | SIM |
| system_profiles | id, full_name | AdminDashboardHome | SELECT | UUID, TEXT | SIM |
| classes | id, name, grade, shift | AdminDashboardHome | SELECT | UUID, TEXT, TEXT, TEXT | SIM |
| class_schedules | id, teacher_id, day_of_week, start_time | AdminDashboardHome | SELECT | UUID, UUID, TEXT, TIME | SIM |
| attendance_records | date, status | AdminDashboardHome | SELECT | DATE, TEXT | SIM |
| library_members | student_id, school_id, status, allowed_books | StudentEnrollmentWizard | INSERT | UUID, UUID, TEXT, INT | SIM |
| student_transports | student_id, route_id, status | StudentEnrollmentWizard | INSERT | UUID, TEXT, TEXT | SIM |
| student_meal_cards | student_id, balance, status, dietary_restrictions | StudentEnrollmentWizard | INSERT | UUID, DECIMAL, TEXT, TEXT | SIM |
| audit_logs | action, module, description, status, user_name | MasterPortalContext | INSERT | TEXT, TEXT, TEXT, TEXT, TEXT | SIM |
| *Demais* | count | *Variados* | SELECT | INT | SIM | Múltiplas tabelas apenas contadas (`head: true`) |

---

## 4. REVISÃO DE SCHOOL_ID E RLS

| Tabela | school_id observado no código? | school_id enviado pelo cliente? | Origem confiável identificada? | Risco |
|---|---|---|---|---|
| schools | SIM (implicitamente ID da escola) | NÃO | - | Baixo |
| profiles | SIM | SIM (no UPSERT do Onboarding) | Parcialmente (Onboarding) | Médio (precisa de RLS sólida) |
| students | SIM (Filtro eq) | NÃO (Filtra na leitura) | NÃO | Alto (Cliente injeta via API se não houver RLS) |
| guardians | NÃO | NÃO | NÃO | Alto (Sem filtro no painel admin, lista todos se não houver RLS) |
| teachers | SIM (Filtro eq) | NÃO | NÃO | Alto (Depende puramente do frontend sem RLS) |
| employees | NÃO | NÃO | NÃO | Alto (Listando sem filtro) |
| classes | SIM (Filtro eq) | NÃO | NÃO | Alto (Depende do frontend sem RLS) |
| grades | NÃO | NÃO | NÃO | Alto |
| attendance_records | NÃO | NÃO | NÃO | Alto |
| communications | NÃO | NÃO | NÃO | Alto |
| library_members | SIM (INSERT) | SIM (formData.schoolId) | NÃO | CRÍTICO (Cliente define a escola ao inserir) |
| library_loans | NÃO | NÃO | NÃO | Alto |
| transport_vehicles | NÃO | NÃO | NÃO | Alto |
| student_transports | NÃO (não visto no insert) | NÃO | NÃO | Alto |
| student_meal_cards | NÃO (não visto no insert) | NÃO | NÃO | Alto |
| support_tickets | NÃO | NÃO | NÃO | Alto |
| audit_logs | NÃO | NÃO | NÃO | Alto |
| partner_ads | NÃO | NÃO | NÃO (Global) | Baixo (Escopo Global) |
| professionals | NÃO | NÃO | NÃO (Global) | Baixo (Escopo Global) |
| service_providers | NÃO | NÃO | NÃO (Global) | Baixo (Escopo Global) |

**Regras RLS Necessárias (Linguagem Natural):**
O sistema necessita de uma diretriz RLS Multi-Tenant severa, onde qualquer tabela pertencente a uma escola possua a coluna `school_id`, e a política de leitura/escrita exija que o `school_id` da linha seja igual ao `school_id` presente no `profile` associado ao usuário logado (`auth.uid()`). A exceção seria o Administrador Master (`Educa+Admin`). A tabela `schools` só poderia ser lida se for pública ou se corresponder ao `school_id` do usuário. Tabelas de escopo global como `partner_ads` precisam de políticas baseadas no tipo de conta de parceiro ou serem de leitura pública.

---

## 5. TABELAS NÃO CONFIRMADAS DIRETAMENTE

### TABELAS ARQUITETURALMENTE NECESSÁRIAS, MAS NÃO CONFIRMADAS POR CHAMADAS DIRETAS
- **student_guardians**:
  - Motivo arquitetural: Relação NxN entre Estudantes e Responsáveis.
  - Problema que resolve: Impede anomalias de normalização e repetição de dados.
  - Evidência indireta: A interface tem campos para adicionar mais de um responsável a um aluno.
  - Evidência direta ausente: Nenhuma chamada a `supabase.from('student_guardians')`.
  - Dependência para implementação: Mudança no frontend para ler/escrever nesta tabela.
  - Entra no MVP? SIM (Como correção de modelagem de dados).

- **partner_profiles**:
  - Motivo arquitetural: Prover integração com Supabase Auth para parceiros, pois atualmente usam mock.
  - Problema que resolve: Remove o uso perigoso de senha em texto plano (CPF/CNPJ) hardcoded num array em memória.
  - Evidência indireta: O sistema possui lógica inteira de login, bloqueio e auditoria para parceiros (`loginPartner`).
  - Evidência direta ausente: O login não chama o Supabase Auth. Não existe `supabase.from('partner_profiles')`.
  - Dependência para implementação: Refatorar o fluxo `loginPartner` para bater no Auth real e cruzar com esta tabela.
  - Entra no MVP? SIM (Como correção crítica de segurança e autenticação).

### FUNCIONALIDADES MOCKADAS OU FUTURAS
- **plans**: MOCK (Usado apenas visualmente, sem persistência remota verificada no código).
- **subscriptions**: MOCK / FUTURA (Pagamentos não estão integrados).
- **invoices**: MOCK / FUTURA (Faturamento não implementado em backend).

---

## 6. REVISÃO DAS MIGRATIONS

* `supabase/migrations/001_initial_schema.sql` até `008_support_tickets.sql` (Antigo e-learning):
  - Classificação: OBSOLETO / CONFLITANTE.
  - Riscos: Conflitam com a lógica do Educa+ (trazem módulos de cursos, fóruns) em vez de alunos e responsáveis.
  - Preservar? SIM (Como ditado nas regras, mas candidatas a arquivamento na próxima fase).

* `supabase/schema.sql`, `supabase/module_*.sql` (Educa+ Core):
  - Classificação: APLICÁVEL COM AJUSTES.
  - Divergências de nomes: `advertisers` (em vez de `partner_ads`), `transport_students` (em vez de `student_transports`).
  - Risco de execução: Médio (É preciso unificar os scripts para evitar dupla criação, garantir as colunas exatas e remover conflitos).

---

## 7. PONTOS CRÍTICOS A VALIDAR

1. Se login de parceiro utiliza memória ou Supabase Auth: **CONFIRMADO** (Usa memória, `PlatformContext.tsx:2059`).
2. Se existem passwordHash, senha ou CPF usados como credencial fora do Auth: **CONFIRMADO** (`PlatformContext.tsx:2075` usa `cpfCnpj` como credencial fallback).
3. Se o frontend permite escolher ROLE_ADMIN_MASTER: **CONFIRMADO** (`setRole('Educa+Admin')` acessível na UI de debug).
4. Se audit_logs recebe INSERT direto do frontend: **CONFIRMADO** (`MasterPortalContext.tsx:60`).
5. Se school_id é controlado pelo cliente: **CONFIRMADO** (No onboarding e em inserts no wizard, vem do client side state).
6. Se profiles está vinculado a auth.users: **INCOMPLETO** (Há UPSERT, mas no banco não há FK sem criar a tabela via SQL).
7. Se system_profiles está vinculado a auth.users: **AUSENTE** (Não há insert direto).
8. Se partner_profiles aparece apenas como proposta: **CONFIRMADO**.
9. Se student_guardians aparece apenas como proposta: **CONFIRMADO**.
10. Se partner_ads é o nome usado, e não advertisers: **CONFIRMADO** (`partnerPersistenceService.ts`).
11. Se student_transports é o nome usado, e não transport_students: **CONFIRMADO** (`StudentEnrollmentWizard.tsx`).
12. Se existe qualquer persistência real para plans, subscriptions ou invoices: **AUSENTE**.

---

## 8. MATRIZ FINAL VALIDADA

| Tabela | Categoria | Evidência real | Arquivo/linha | Operação | Campos confirmados | Tenant | RLS necessária | Entra no MVP? | Confiança |
|---|---|---|---|---|---|---|---|---|---|
| schools | A | SIM | AdminDashboardHome:160 | SELECT | count | Raiz | SIM | SIM | ALTA |
| profiles | A | SIM | OnboardingPage:346 | UPSERT | id, name, cpf, role, school_id | Vinculada | SIM | SIM | ALTA |
| system_profiles | A | SIM | AdminDashboardHome:393 | SELECT | id, full_name | Global | SIM | SIM | ALTA |
| students | A | SIM | PlatformContext:1944 | SELECT | count | Vinculada | SIM | SIM | ALTA |
| guardians | A | SIM | AdminDashboardHome:139 | SELECT | count | Vinculada | SIM | SIM | ALTA |
| teachers | A | SIM | PlatformContext:1945 | SELECT | count | Vinculada | SIM | SIM | ALTA |
| employees | A | SIM | AdminDashboardHome:146 | SELECT | count | Vinculada | SIM | SIM | ALTA |
| classes | A | SIM | PlatformContext:1946 | SELECT | count | Vinculada | SIM | SIM | ALTA |
| class_schedules | A | SIM | AdminDashboardHome:465 | SELECT | id, teacher_id, day_of_week | Vinculada | SIM | SIM | ALTA |
| attendance_records | A | SIM | AdminDashboardHome:267 | SELECT | date, status | Vinculada | SIM | SIM | ALTA |
| grading_models | A | SIM | AdminDashboardHome:178 | SELECT | count | Vinculada | SIM | SIM | ALTA |
| grades | A | SIM | AdminDashboardHome:185 | SELECT | count | Vinculada | SIM | SIM | ALTA |
| communications | A | SIM | AdminDashboardHome:192 | SELECT | count | Vinculada | SIM | SIM | ALTA |
| digital_signatures | A | SIM | AdminDashboardHome:199 | SELECT | count | Vinculada | SIM | SIM | ALTA |
| library_members | A | SIM | StudentEnrollmentWizard:689 | INSERT | student_id, school_id, status | Vinculada | SIM | SIM | ALTA |
| library_loans | A | SIM | AdminDashboardHome:208 | SELECT | count | Vinculada | SIM | SIM | ALTA |
| transport_vehicles | A | SIM | AdminDashboardHome:215 | SELECT | count | Vinculada | SIM | SIM | ALTA |
| student_transports | A | SIM | StudentEnrollmentWizard:702 | INSERT | student_id, route_id, status | Vinculada | SIM | SIM | ALTA |
| student_meal_cards | A | SIM | StudentEnrollmentWizard:714 | INSERT | student_id, balance, status | Vinculada | SIM | SIM | ALTA |
| support_tickets | A | SIM | AdminDashboardHome:222 | SELECT | count | Vinculada | SIM | SIM | ALTA |
| audit_logs | A | SIM | MasterPortalContext:60 | INSERT | action, module, description | Vinculada | SIM | SIM | ALTA |
| partner_ads | A | SIM | partnerPersistenceService:65 | UPSERT | id | Global | SIM | SIM | ALTA |
| professionals | A | SIM | partnerPersistenceService:114 | UPSERT | id | Global | SIM | SIM | ALTA |
| service_providers | A | SIM | partnerPersistenceService:162 | UPSERT | id | Global | SIM | SIM | ALTA |
| student_guardians | C | NÃO | - | - | - | Vinculada | SIM | SIM | ALTA |
| partner_profiles | C | NÃO | - | - | - | Global | SIM | SIM | ALTA |
| plans | D | NÃO | - | - | - | - | - | NÃO | ALTA |
| subscriptions | D | NÃO | - | - | - | - | - | NÃO | ALTA |
| invoices | D | NÃO | - | - | - | - | - | NÃO | ALTA |

---

## 9. GATE DE SAÍDA

1. **Contagem validada das tabelas:** 24 confirmadas.
2. **Tabelas confirmadas pelo código:** schools, profiles, system_profiles, students, guardians, teachers, employees, classes, class_schedules, attendance_records, grading_models, grades, communications, digital_signatures, library_members, library_loans, transport_vehicles, student_transports, student_meal_cards, support_tickets, audit_logs, partner_ads, professionals, service_providers.
3. **Tabelas sem evidência direta:** student_guardians, partner_profiles, plans, subscriptions, invoices.
4. **Tabelas apenas presentes nas migrations:** Mais de 90 tabelas complementares não ativas (ex: gate_events, advertiser_reviews, etc).
5. **Divergências de nomenclatura:** `advertisers` -> `partner_ads`, `transport_students` -> `student_transports`.
6. **Campos que ainda não podem ser definidos:** A tipagem completa de tabelas em que o frontend só faz `select('count')`. Vamos adotar os tipos inferidos pela documentação anterior.
7. **Riscos críticos:** A falta de verificação back-end de `school_id` em Inserts e a lógica de login de parceiros feita em memória.
8. **Riscos altos:** Falta de FK entre perfis e usuários do Supabase, tabelas expostas.
9. **Tabelas candidatas ao MVP:** As 24 confirmadas + `student_guardians` e `partner_profiles`.
10. **Tabelas que devem ficar para fase posterior:** plans, subscriptions, invoices, e todo o módulo de marketplace complexo e portarias físicas.
11. **Decisões que ainda precisam de aprovação:** Podemos arquivar os scripts em `supabase/migrations/*` que conflitam com o core?
12. **Ordem segura da próxima etapa:** FASE 7 — DESENHO E REVISÃO DA AUTENTICAÇÃO, AUTORIZAÇÃO E RLS.

INTEGRAÇÃO CONCLUÍDA: NÃO
STATUS: FASE 6 VALIDADA — AGUARDANDO APROVAÇÃO PARA A FASE 7
