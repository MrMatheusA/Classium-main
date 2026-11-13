# Classium — Escola Escuta (pacote completo)

## 1. Banco de dados (SQL Editor do Supabase)

**Você já rodou as partes anteriores?** Então rode só:

| Ordem | Arquivo | Para quê |
|---|---|---|
| 1 | `supabase/ESCOLA_ESCUTA_08_INTEGRACOES.sql` | Painel da Família, Participa → Mural, Calendário, evolução das pesquisas |

**Instalação do zero (outro banco):** rode só o `supabase/ESCOLA_ESCUTA_COMPLETO.sql` (já tem tudo, partes 0 a 8).

Arquivos de apoio (só se precisar):
- `ESCOLA_ESCUTA_06_ADMIN_ESCOLAS.sql`: administrador vê todas as escolas
- `ESCOLA_ESCUTA_07_PERMISSOES.sql`: corrige "permission denied for table ..."
- `ESCOLA_ESCUTA_ESCOLA_DEMO.sql`: cria uma escola de demonstração
- `ESCOLA_ESCUTA_DIAGNOSTICO.sql`: diagnóstico do usuário (troque o e-mail na última linha)

Todos podem ser rodados mais de uma vez. Se aparecer `lock timeout`, é só rodar de novo
(o app estava usando a tabela naquele instante).

## 2. Arquivos do app (todos SUBSTITUEM os seus, mesmo caminho)

| No zip | No seu projeto |
|---|---|
| `src/App.tsx` | `src/App.tsx` |
| `src/navigation/portalNav.ts` | `src/navigation/portalNav.ts` |
| `src/components/Sidebar.tsx` | `src/components/Sidebar.tsx` |
| `src/components/GestorDashboard.tsx` | `src/components/GestorDashboard.tsx` |
| `src/components/ProfessorDashboard.tsx` | `src/components/ProfessorDashboard.tsx` |
| `src/components/FamilyDashboard.tsx` | `src/components/FamilyDashboard.tsx` |
| `src/components/escolaEscuta/` (pasta) | apague a antiga e cole esta |
| `src/services/escolaEscuta/api.ts` | `src/services/escolaEscuta/api.ts` |
| `src/services/whatsapp/clarixzapService.ts` | `src/services/whatsapp/clarixzapService.ts` |
| `src/components/admin/*` | `src/components/admin/*` (Comunicados, Estudantes, Matrícula) |
| `src/components/header/MasterPortalSwitcher.tsx` | onde está o seu MasterPortalSwitcher |

A pasta `escolaEscuta` usa o seu `src/services/calendarRpcService.ts` (o mesmo do Calendário Escolar).
Não é preciso mudar nada nele.

## 3. O que cada portal tem

**Gestão** (menu "Escola Escuta"): Mural de Recados · Agenda Família · Agenda Diária (aprovar) · Participa.
Administrador sem escola própria escolhe a escola no topo de cada módulo.

**Professor**: Mural de Recados · Agenda Diária · Participa.

**Família**: Mural de Recados · Agenda Diária · Agendar atendimento · Participa.
No Início da família aparecem os atendimentos marcados, o que está aberto no Participa,
os prazos próximos e os registros da Agenda Diária que pedem resposta.
Em "Recados" também aparecem os registros da Agenda Diária (é o mesmo registro).

## 4. Integrações do roteiro

- **Participa → Mural:** ao publicar iniciativa, encontro ou devolutiva, a opção "Divulgar no Mural"
  (marcada) cria o recado para o mesmo público. Não duplica se clicar de novo.
- **Participa → Calendário:** encontros, reuniões e assembleias vão para o Calendário Escolar
  (opção marcada ao publicar; para os já publicados, botão "Publicar no Calendário").
- **Agenda Diária → Calendário:** em "Avaliações", o professor escolhe um evento já publicado pela
  gestão (não edita o calendário) ou pede a inclusão. A família vê o evento ligado.
- **Evolução das pesquisas:** use "Nova edição" para repetir uma iniciativa. Nos resultados aparece a
  comparação entre as edições (só perguntas com o mesmo enunciado, respeitando o mínimo de privacidade).
- **Ano letivo** no formulário da Agenda Diária.

## 5. Para a apresentação

O banco precisa ter escola, turmas, alunos e responsáveis. Sem turmas e alunos, a Agenda Diária,
a escolha de público e o lado da família aparecem vazios.

## 6. Gerador de Atividades com IA (Gemini, Groq e OpenRouter, gratuitas)

### Banco (SQL Editor)
1. Rode `supabase/CLASSIUM_09_IA_GERADOR.sql`.
2. Crie as chaves gratuitas (sem cartão):
   - Gemini: https://aistudio.google.com/apikey
   - Groq: https://console.groq.com/keys
   - OpenRouter: https://openrouter.ai/settings/keys
3. No SQL Editor, troque o texto e rode (pode cadastrar só uma, duas ou as três):
   ```sql
   select public.ia_definir_chave('gemini',     'SUA_CHAVE_GEMINI');
   select public.ia_definir_chave('groq',       'SUA_CHAVE_GROQ');
   select public.ia_definir_chave('openrouter', 'SUA_CHAVE_OPENROUTER');
   ```
As chaves ficam no cofre do Supabase e nunca vão para o navegador.

### App
| No zip | No seu projeto |
|---|---|
| `src/components/EducaStudio.tsx` | substitui o seu EducaStudio.tsx |
| `src/services/ia/iaService.ts` | arquivo novo (crie a pasta `src/services/ia`) |

### Como funciona para o professor
- Escolhe a IA (ou "Automático"), preenche tema, série, tipos de questão, adaptações
  (TEA, TDAH, baixa visão, dislexia), escreve "O que você precisa?" e, se quiser, cola um texto-base.
- Se a IA escolhida estiver fora do ar ou no limite gratuito, o sistema tenta a próxima sozinho.
- "Pedir ajuste à IA" muda a atividade pronta (ex.: "troque a questão 3 por uma de interpretação de gráfico").
- Limite de 40 gerações por pessoa por dia (muda em `ia_config`, chave `limite_diario_usuario`).

### Se algum modelo mudar de nome
Os modelos ficam na tabela `ia_config` (`gemini_modelo`, `groq_modelo`, `openrouter_modelo`). Exemplo:
```sql
update public.ia_config set valor = 'gemini-flash-lite-latest' where chave = 'gemini_modelo';
```
