# BACKLOG DE IMPLEMENTAÇÃO E MANUTENÇÃO — SUPABASE & CLASSIUM
**Documento Técnico para a Equipe de Engenharia**
**Arquivo:** `SUPABASE_IMPLEMENTATION_BACKLOG.md`

---

## PRIORIDADE P0 — SEGURANÇA CRÍTICA & MULTI-TENANT

### ITEM 01: Validação Contínua de RLS em Tabelas com Chave de Organização
* **Módulo:** Gestão de Segurança & Controle de Acesso
* **Descrição:** Garantir que todas as tabelas contendo `organization_id` tenham policies estritas que barrem qualquer tentativa de leitura ou escrita cruzada entre escolas.
* **Origem:** Auditoria de Segurança Multi-Tenant
* **Impacto:** Alto (Garantia de isolamento de dados entre diferentes instituições)
* **Risco:** Crítico (Risco de vazamento de dados caso a policy seja desativada)
* **Arquivos envolvidos:** `supabase/0038_comprehensive_rls_security_hardening.sql`, `supabase/0047_bulletproof_schema_and_rls.sql`
* **Tabela envolvida:** `public.profiles`, `public.students`, `public.classes`, `public.attendance`
* **Dependências:** Funções auxiliares `auth.organization_id()` e `auth.user_role()`
* **Critério de Aceite:** Tentativas de SELECT ou UPDATE em registros de outra organização retornam 0 linhas ou erro de permissão.
* **Recomendação:** Executar periodicamente o script `supabase_schema_audit_readonly.sql` na homologação.
* **Exige Migration:** Não (já coberto nas migrations existentes).
* **Exige Alteração de RLS:** Não.
* **Exige Aprovação Humana:** Sim (Revisão periódica do time de segurança).

---

## PRIORIDADE P1 — INTEGRAÇÃO NECESSÁRIA & DADOS REAIS

### ITEM 02: Unificação de Nomenclatura nas Consultas de Responsáveis
* **Módulo:** Portal da Família / Matrículas
* **Descrição:** Padronizar o acesso aos dados de parentesco e responsáveis utilizando prioritariamente a tabela `public.student_responsible_links` ou view compatível, eliminando referências residuais à entidade genérica `guardians`.
* **Origem:** Auditoria de Modelagem de Dados
* **Impacto:** Médio (Melhoria da manutenibilidade e consistência)
* **Risco:** Baixo
* **Arquivos envolvidos:** `src/services/familyService.ts`, `src/services/studentService.ts`
* **Tabela envolvida:** `public.student_responsible_links`, `public.student_guardians`
* **Dependências:** Nenhuma
* **Critério de Aceite:** Todas as consultas no portal da família realizam queries na tabela `student_responsible_links` com dados reais do Supabase.
* **Recomendação:** Manter testes automatizados de integração na camada de serviço.
* **Exige Migration:** Não.
* **Exige Alteração de RLS:** Não.
* **Exige Aprovação Humana:** Não.

---

## PRIORIDADE P2 — CORREÇÕES FUNCIONAIS & USABILIDADE

### ITEM 03: Telemetria e Logs de Auditoria de Ações Administrativas
* **Módulo:** Painel do Gestor (Admin)
* **Descrição:** Registrar no log de auditoria (`public.audit_logs`) todas as alterações de papéis (`roles`), exclusão de usuários e edições críticas de turmas.
* **Origem:** Conformidade LGPD & Auditoria Escolar
* **Impacto:** Médio (Rastreabilidade completa de ações administrativas)
* **Risco:** Baixo
* **Arquivos envolvidos:** `src/services/staffService.ts`, `src/services/employeeService.ts`
* **Tabela envolvida:** `public.audit_logs`
* **Dependências:** RPC `delete_employee_and_user`
* **Critério de Aceite:** Cada exclusão ou alteração de funcionário gera uma linha com timestamp, autor e metadados em `public.audit_logs`.
* **Recomendação:** Manter a rotina atômica ativa dentro das RPCs.
* **Exige Migration:** Não (já implementado na migration 0070).
* **Exige Alteração de RLS:** Não.
* **Exige Aprovação Humana:** Não.

---

## PRIORIDADE P3 — PERFORMANCE & OTIMIZAÇÃO

### ITEM 04: Monitoramento de Índices em Tabelas de Alta Frequência
* **Módulo:** Frequência Escolar & Portaria
* **Descrição:** Verificar a seletividade dos índices B-Tree nas tabelas `attendance` e `gate_access_logs` à medida que o volume de registros diários cresce.
* **Origem:** Planejamento de Escala
* **Impacto:** Alto a longo prazo (Tempo de resposta das queries de relatório)
* **Risco:** Baixo
* **Arquivos envolvidos:** `supabase/0036_optimization_indexes_triggers.sql`
* **Tabela envolvida:** `public.attendance`, `public.gate_access_logs`
* **Dependências:** Nenhuma
* **Critério de Aceite:** Tempo de execução de queries de frequência inferior a 50ms para 100.000+ registros.
* **Recomendação:** Avaliar particionamento por ano letivo (`academic_year`) caso a base supere 1 milhão de registros.
* **Exige Migration:** Não neste momento.
* **Exige Alteração de RLS:** Não.
* **Exige Aprovação Humana:** Sim (Antes de criar novas partições).

---

## PRIORIDADE P4 — MELHORIAS FUTURAS & EXPANSÃO

### ITEM 05: Integração com Câmeras e Reconhecimento Facial na Portaria
* **Módulo:** Controle de Acesso & Segurança Escolar
* **Descrição:** Ativação dos schemas de suporte a dispositivos IoT e reconhecimento biométrico previstos nas tabelas `security_device_events` e `visitor_photos`.
* **Origem:** Roadmap Tecnológico Enterprise
* **Impacto:** Inovação / Automação
* **Risco:** Médio (Privacidade e consentimento biométrico)
* **Arquivos envolvidos:** `supabase/module_security_gate_enterprise.sql`
* **Tabela envolvida:** `public.security_devices`, `public.security_device_events`
* **Dependências:** Hardware / Câmeras IP homologadas
* **Critério de Aceite:** Detecção de eventos e sincronização via Supabase Realtime para a guarita da escola.
* **Recomendação:** Propor migration e fluxo de consentimento LGPD antes da ativação.
* **Exige Migration:** Sim (quando o módulo for contratado).
* **Exige Alteração de RLS:** Sim.
* **Exige Aprovação Humana:** Sim (Aprovação jurídica e técnica).

---

## NOTA DE CONFORMIDADE
Este backlog reflete estritamente o estado diagnosticado na auditoria e **não aplica nenhuma alteração automática** no banco de dados Supabase ou no código de produção.
