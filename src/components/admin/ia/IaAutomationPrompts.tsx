import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Star, Terminal, ToggleLeft, ToggleRight, CheckCircle, 
  Settings2, Activity, Play, Zap, HelpCircle, ShieldAlert, Plus, Eye
} from 'lucide-react';

interface PromptTemplate {
  id: string;
  title: string;
  category: 'Geral' | 'Pedagógico' | 'Financeiro' | 'Jurídico';
  version: string;
  favorited: boolean;
  content: string;
}

interface IaTool {
  id: string;
  name: string;
  description: string;
  status: 'Ativo' | 'Pausado';
  agentsAllowed: string[];
}

interface IaWorkflow {
  id: string;
  name: string;
  trigger: string;
  action: string;
  lastExecuted: string;
  status: 'Ativo' | 'Inativo';
}

const INITIAL_PROMPTS: PromptTemplate[] = [
  { id: '1', title: 'Acolhimento de Alunos Indisciplinados', category: 'Pedagógico', version: 'v3.2', favorited: true, content: 'Siga estritamente as diretrizes do ECA, priorizando o acolhimento psicológico...' },
  { id: '2', title: 'Notificação de Inadimplência Sensível', category: 'Financeiro', version: 'v2.1', favorited: false, content: 'Comunique a pendência sem expor o aluno de forma vexatória, propondo acordo...' },
  { id: '3', title: 'Plano de Recuperação Orientada BNCC', category: 'Pedagógico', version: 'v4.0', favorited: true, content: 'Identifique os códigos de habilidades em atraso e sugira 3 atividades de reforço...' },
  { id: '4', title: 'Consolidação de Parecer Jurídico LDB', category: 'Jurídico', version: 'v1.5', favorited: false, content: 'Fundamente o parecer utilizando os decretos federais de ensino público de 1996...' }
];

const INITIAL_TOOLS: IaTool[] = [
  { id: 't1', name: 'Leitor de Banco de Dados', description: 'Permite consultar notas, presenças e fichas cadastrais dos alunos.', status: 'Ativo', agentsAllowed: ['Agente Notas', 'Agente Frequência', 'Agente Gestor'] },
  { id: 't2', name: 'Notificador Push / SMS / WhatsApp', description: 'Dispara notificações para os responsáveis diretamente no celular.', status: 'Ativo', agentsAllowed: ['Agente Família', 'Agente Comunicação'] },
  { id: 't3', name: 'BNCC Standards RAG API', description: 'Consulta a base oficial da BNCC para alinhar planos de aula.', status: 'Ativo', agentsAllowed: ['Agente Professor', 'Agente BNCC', 'Agente Pedagógico'] },
  { id: 't4', name: 'Boleto Billing Generator', description: 'Gera links de cobrança e parcelamento de mensalidades.', status: 'Pausado', agentsAllowed: ['Agente Financeiro'] }
];

const INITIAL_WORKFLOWS: IaWorkflow[] = [
  { id: 'w1', name: 'Gatilho de Busca Ativa Conselho Tutelar', trigger: 'Presença < 70% no bimestre', action: 'Gerar Ofício Oficial e Enviar Notificação no WhatsApp da Família', lastExecuted: 'Hoje, 10:14', status: 'Ativo' },
  { id: 'w2', name: 'Plano de Estudos de Recuperação Semanal', trigger: 'Média de Língua Portuguesa < 5.0', action: 'Gerar Caderno de Atividades Personalizado no Classium Studio', lastExecuted: 'Ontem, 16:45', status: 'Ativo' },
  { id: 'w3', name: 'Notificação Inteligente de Boletos em Atraso', trigger: 'Fatura vencida há 15 dias', action: 'Enviar mensagem amigável no Portal Família', lastExecuted: '24/07/2026', status: 'Ativo' }
];

export function IaAutomationPrompts() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>(INITIAL_PROMPTS);
  const [tools, setTools] = useState<IaTool[]>(INITIAL_TOOLS);
  const [workflows, setWorkflows] = useState<IaWorkflow[]>(INITIAL_WORKFLOWS);
  
  // Automation execution states
  const [executingWorkflowId, setExecutingWorkflowId] = useState<string | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  const toggleFavoritePrompt = (id: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, favorited: !p.favorited } : p));
  };

  const toggleToolStatus = (id: string) => {
    setTools(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'Ativo' ? 'Pausado' : 'Ativo' } : t));
  };

  const handleRunWorkflow = (wf: IaWorkflow) => {
    setExecutingWorkflowId(wf.id);
    setExecutionMessage('Iniciando orquestrador...');

    const logs = [
      'Identificando estudantes elegíveis para o gatilho...',
      'Processando chaves contextuais e base legal...',
      'Disparando ações sequenciais autorizadas...',
      'Enviando logs de conformidade LGPD para auditoria de TI...',
      'Gatilho executado e consolidado com sucesso!'
    ];

    let step = 0;
    const interval = setInterval(() => {
      if (step < logs.length) {
        setExecutionMessage(logs[step]);
        step++;
      } else {
        clearInterval(interval);
        setExecutingWorkflowId(null);
        setExecutionMessage(null);
        alert(`Sucesso! Automação "${wf.name}" executada perfeitamente de forma síncrona.`);
      }
    }, 900);
  };

  return (
    <div id="ia_automation_prompts_subview" className="space-y-6 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Prompts & Tools */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Prompts Library */}
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-amber-500 animate-pulse" /> Biblioteca de Prompts Oficiais
              </h4>
              <span className="text-[9px] bg-slate-850 px-2 py-0.5 rounded text-slate-400 font-mono">v5.0 Core</span>
            </div>

            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 scrollbar-none">
              {prompts.map((p) => (
                <div key={p.id} className="bg-slate-950 border border-slate-900 p-3 rounded-xl flex justify-between items-start hover:border-slate-800 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500/10 text-amber-400 text-[8px] font-bold uppercase tracking-wider font-mono px-1.5 py-0.5 rounded">
                        {p.category}
                      </span>
                      <span className="text-[11px] font-bold text-white">{p.title}</span>
                      <span className="text-[8px] text-slate-500 font-mono">{p.version}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic line-clamp-1">"{p.content}"</p>
                  </div>

                  <button 
                    onClick={() => toggleFavoritePrompt(p.id)}
                    className={`p-1 hover:bg-slate-900 rounded ${p.favorited ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tools & Permissions */}
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-indigo-400" /> Ferramentas & Permissões da IA
              </h4>
              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono">Gateway Ativo</span>
            </div>

            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 scrollbar-none">
              {tools.map((t) => (
                <div key={t.id} className="bg-slate-950 border border-slate-900 p-3 rounded-xl flex justify-between items-center hover:border-slate-800 transition-all">
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      {t.name}
                      <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'Ativo' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    </h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed max-w-sm">{t.description}</p>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {t.agentsAllowed.map((ag, aid) => (
                        <span key={aid} className="text-[8px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-mono">
                          {ag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => toggleToolStatus(t.id)}
                    className={`p-1 rounded-full transition-all ${t.status === 'Ativo' ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {t.status === 'Ativo' ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right column: Dynamic Workflows & Automation Engine */}
        <div className="lg:col-span-6 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-400 animate-bounce" /> Automações & Gatilhos Inteligentes
                </h4>
                <p className="text-[10px] text-slate-400">Automatize o envio de alertas de busca ativa, comunicados de recuperação ou avisos oficiais com base em eventos.</p>
              </div>
              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono">3 Ativos</span>
            </div>

            <div className="space-y-4 pr-1">
              {workflows.map((wf) => {
                const isThisExecuting = executingWorkflowId === wf.id;
                return (
                  <div 
                    key={wf.id} 
                    className={`p-4 rounded-xl border transition-all ${
                      isThisExecuting 
                        ? 'bg-indigo-950/20 border-indigo-500' 
                        : 'bg-slate-950 border-slate-900 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 text-xs">
                        <h5 className="font-bold text-white">{wf.name}</h5>
                        <div className="space-y-0.5 text-[10px] text-slate-400">
                          <p><span className="text-slate-500 font-mono">Gatilho (Trigger):</span> <span className="text-indigo-400 font-bold">{wf.trigger}</span></p>
                          <p><span className="text-slate-500 font-mono">Ação (Action):</span> <span className="text-amber-500 font-bold">{wf.action}</span></p>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleRunWorkflow(wf)}
                        disabled={executingWorkflowId !== null}
                        className={`py-1 px-3 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                          isThisExecuting 
                            ? 'bg-indigo-600 text-white animate-pulse'
                            : 'bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-400 hover:text-white'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5" /> Executar
                      </button>
                    </div>

                    {isThisExecuting && (
                      <div className="mt-3 bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-[9px] font-mono text-indigo-300 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-400 animate-ping rounded-full shrink-0" />
                        <span>{executionMessage}</span>
                      </div>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-slate-900 flex justify-between items-center text-[9px] text-slate-500">
                      <span>Último processamento: {wf.lastExecuted}</span>
                      <span className="text-emerald-400 font-bold">✓ Sincronizado</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/40 text-[10px] text-slate-500 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Todos os fluxos são auditados em conformidade com as restrições LGPD do setor administrativo.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
