import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePlatform } from '../context/PlatformContext';
import { Badge, Button, Card, Page, PageHeader, EASE } from './ui/kit';
import { ArrowLeft, Check, ChevronDown, Copy, ExternalLink, Lightbulb, Wand2 } from 'lucide-react';

/*
 * Modelos de prompt para quem desenvolve o Classium (só o admin vê).
 * Já descrevem o padrão visual atual: fundo claro, cor da marca escolhida
 * no tema, login sem escolha de perfil.
 */

interface PromptItem {
  id: number;
  title: string;
  tag: string;
  description: string;
  text: string;
}

const DESIGN_RULES = `Padrão visual do Classium (siga em tudo):
- Fundo claro (branco gelo #F6F7F9 ou azul claro #EAF2FB) e cards brancos com borda suave e cantos arredondados (24px).
- As cores vêm de variáveis CSS do tema: --sidebar-bg, --sidebar-fg, --accent, --accent-soft, --bg-app, --bg-card, --border, --text-heading, --text-muted. Nunca use cor fixa para destaque.
- Títulos em serifa (font-serif), textos em sans. Sem emojis, sem caixa alta em excesso, sem selos decorativos.
- Botões em pílula (rounded-full). Botão principal com background var(--accent).
- Animações discretas com motion/react: entrada com fade + leve subida, nada piscando.
- Textos em português simples, falando com a pessoa ("Seus filhos", "Novo comunicado").
- Use os componentes de src/components/ui/kit.tsx (Page, BrandHero, Card, StatCard, Button, Modal, EmptyState, PillNav).`;

const PROMPTS: PromptItem[] = [
  {
    id: 1,
    title: 'Nova tela de painel',
    tag: 'Painel',
    description: 'Cria uma tela nova dentro dos painéis já no padrão visual, com faixa da marca, indicadores e lista.',
    text: `Crie a tela [NOME DA TELA] do Classium em React + TypeScript + Tailwind.

${DESIGN_RULES}

Estrutura:
1. <Page> com <BrandHero> no topo: título, uma frase do que a tela faz e até dois botões de ação.
2. Uma linha de <StatCard> com os números mais importantes.
3. Conteúdo principal em <Card> com <CardHeader>, e <EmptyState> quando não houver dados.
4. Estado de carregamento com <PageSkeleton>.

Dados: busque pelo cliente Supabase em src/lib/supabase. Mostre mensagens de erro amigáveis, sem detalhes técnicos.`,
  },
  {
    id: 2,
    title: 'Formulário com validação',
    tag: 'Formulário',
    description: 'Gera um formulário acessível com mensagens de erro claras e botão com carregamento.',
    text: `Crie um formulário de [ASSUNTO] para o Classium.

${DESIGN_RULES}

Regras do formulário:
- Use <Field> (label ligado ao campo) e a classe inputCls do kit.
- Valide antes de enviar e mostre o erro num <Alert tone="danger"> acima dos campos.
- Botão <Button type="submit" loading={...}> com texto que muda enquanto salva.
- Máscaras para CPF, telefone e CEP quando houver.
- Depois de salvar, mostre <Alert tone="success"> e limpe os campos.`,
  },
  {
    id: 3,
    title: 'Aba para o portal da família',
    tag: 'Família',
    description: 'Nova seção para responsáveis, com linguagem simples e foco no aluno selecionado.',
    text: `Crie a aba [NOME] do portal da família do Classium.

${DESIGN_RULES}

Contexto:
- O aluno ativo vem de usePlatform().student. Mostre sempre de qual filho são os dados.
- A pessoa é pai, mãe ou responsável: frases curtas, letras confortáveis, nada de termos técnicos.
- Quando não houver informação, explique o que vai aparecer ali e quando.`,
  },
  {
    id: 4,
    title: 'Relatório com gráfico',
    tag: 'Relatório',
    description: 'Monta um relatório com gráfico de barras e tabela, no padrão das cores do tema.',
    text: `Crie o relatório [NOME] do Classium.

${DESIGN_RULES}

Conteúdo:
- Filtros no topo (período, turma) em pílulas.
- Gráfico de barras com a cor var(--accent); valores abaixo da meta em laranja (#F2994A).
- Tabela abaixo do gráfico com cabeçalho fixo e linhas alternadas suaves.
- Botão "Exportar" (PDF e planilha).`,
  },
];

export function AICommandPanel() {
  const { setMode } = usePlatform();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(1);

  const copy = async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // navegadores sem permissão de área de transferência
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Page className="max-w-5xl">
      <button
        type="button"
        onClick={() => setMode('admin')}
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-heading)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao painel
      </button>

      <PageHeader
        icon={Wand2}
        eyebrow="Para quem desenvolve"
        title="Modelos de prompt"
        description="Prompts prontos para criar telas novas já no padrão visual do Classium. Copie, troque o que está entre colchetes e cole no seu assistente de IA."
        actions={
          <Button variant="secondary" icon={ExternalLink} onClick={() => window.open('https://aistudio.google.com', '_blank', 'noopener,noreferrer')}>
            Abrir AI Studio
          </Button>
        }
      />

      <div className="space-y-3">
        {PROMPTS.map((p, i) => {
          const open = openId === p.id;
          const copied = copiedId === p.id;
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.05, ease: EASE }}>
              <Card padded={false} className="overflow-hidden">
                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                  <button type="button" onClick={() => setOpenId(open ? null : p.id)} aria-expanded={open} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[16px] font-semibold text-[var(--text-heading)]">{p.title}</span>
                        <Badge tone="accent">{p.tag}</Badge>
                      </span>
                      <span className="mt-1 block text-[14px] text-[var(--text-muted)]">{p.description}</span>
                    </span>
                  </button>
                  <Button variant={copied ? 'secondary' : 'primary'} size="sm" icon={copied ? Check : Copy} onClick={() => copy(p.id, p.text)}>
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
                      <pre className="mx-5 mb-5 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-[var(--bg-card-alt)] p-4 font-mono text-[12.5px] leading-relaxed text-[var(--text-body)]">
                        {p.text}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />
        <p className="text-[14px] leading-relaxed text-[var(--text-body)]">
          Para o código sair compatível, envie junto os arquivos <code className="rounded bg-[var(--bg-card-alt)] px-1.5 py-0.5 text-[13px]">src/components/ui/kit.tsx</code> e{' '}
          <code className="rounded bg-[var(--bg-card-alt)] px-1.5 py-0.5 text-[13px]">src/types.ts</code> como contexto.
        </p>
      </Card>
    </Page>
  );
}