# BRAND MIGRATION CHANGELOG: EDUCA+ → CLASSIUM

## 1. DADOS DA MIGRAÇÃO
- **Data da Execução:** 05/08/2026
- **Marca Anterior:** Educa+ (EducaPlus / Educa)
- **Nova Marca:** Classium
- **Escopo:** Substituição exclusivamente visual e de apresentação da marca comercial.

---

## 2. REGISTRO DE ALTERAÇÕES DE INTERFACE E APRESENTAÇÃO

| Arquivo | Seção / Componente | Rótulo Anterior | Novo Rótulo | Finalidade |
| :--- | :--- | :--- | :--- | :--- |
| `index.html` | `<title>` | Educa+ Família | Classium Família | Título da aba do navegador |
| `metadata.json` | `description` | ...Educa+ Builder AI | ...Classium Builder AI | Descrição dos metadados da aplicação |
| `src/components/LandingPage.tsx` | Hero & Features | Educa+ | Classium | Marca principal do ecossistema educacional |
| `src/components/admin_master/` | Suíte Admin Master | Educa+Admin / Educa+Studio | Classium Admin / Classium Studio | Apresentação das ferramentas executivas |
| `src/components/commercial/` | Planos & Checkout | Checkout Seguro Educa+ | Checkout Seguro Classium | Experiência de contratação e rede parceira |
| `src/context/PlatformContext.tsx` | Nomes de Serviços | Super IA Educa+ / Educa+Conecta | Super IA Classium / Classium Conecta | Módulos e suítes do sistema |
| `src/types/rbac.ts` | Rótulos de Perfil | Educa+Gestor / Educa+Docente | Classium Gestor / Classium Docente | Descrição amigável dos perfis de acesso |

---

## 3. COMPATIBILIDADE TÉCNICA E PRESERVAÇÃO DE DADOS
- **Banco de Dados Supabase:** Intacto. Zero alterações de DDL, schemas, tabelas ou colunas.
- **Buckets de Armazenamento:** Preservados (`educamais-profiles`, `educamais-private`, `educa_fotos`, etc.).
- **Caminhos de Arquivos e Módulos:** Todos os arquivos de código mantidos nos seus caminhos originais para evitar links quebrados ou falhas de importação.
- **Build de Produção:** Compilado e validado via `compile_applet`.

---

INTEGRAÇÃO DE MARCA CONCLUÍDA: SIM
DADOS DAS ORGANIZAÇÕES PRESERVADOS: SIM
DADOS DO SUPABASE ALTERADOS: NÃO
TESTES CRÍTICOS: APROVADOS
DEPLOY EM PRODUÇÃO: SIM
STATUS: MIGRAÇÃO EDUCA+ → CLASSIUM APROVADA
