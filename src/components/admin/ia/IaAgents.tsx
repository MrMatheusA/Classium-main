import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Search, Filter, Shield, Cpu, ExternalLink, Settings, Sparkles, 
  CheckCircle, Circle, AlertCircle, Edit2, Play, Pause, Save, Terminal
} from 'lucide-react';

interface Agent {
  name: string;
  category: 'Gestão/Direção' | 'Ensino/Pedagogia' | 'Suporte/Operacional' | 'Técnico/Segurança';
  role: string;
  status: 'Ativo' | 'Pausado' | 'Em Execução';
  accuracy: string;
  latency: string;
  calls: number;
  tools: string[];
  systemPrompt: string;
}

const INITIAL_AGENTS_DATA: Agent[] = [
  { name: 'Agente Gestor', category: 'Gestão/Direção', role: 'Visão executiva global da unidade e rede.', status: 'Ativo', accuracy: '99.4%', latency: '1.2s', calls: 1450, tools: ['Database Reader', 'Excel Generator'], systemPrompt: 'Você atua como o Diretor Executivo (CAIO). Consolide relatórios estratégicos...' },
  { name: 'Agente Professor', category: 'Ensino/Pedagogia', role: 'Auxilia na criação de planos de aula e diários de bordo.', status: 'Ativo', accuracy: '98.8%', latency: '1.4s', calls: 3200, tools: ['BNCC Retriever', 'Lesson Planner'], systemPrompt: 'Você é o Agente Professor. Auxilie no planejamento curricular de acordo com a BNCC.' },
  { name: 'Agente Pedagógico', category: 'Ensino/Pedagogia', role: 'Planejamento, acompanhamento curricular e relatórios.', status: 'Ativo', accuracy: '99.1%', latency: '1.3s', calls: 2400, tools: ['Pedagogical Evaluator'], systemPrompt: 'Apoie o pedagogo na supervisão de metodologias e diagnóstico escolar.' },
  { name: 'Agente Secretaria', category: 'Suporte/Operacional', role: 'Triagem de certidões, matrículas e transferências.', status: 'Ativo', accuracy: '99.7%', latency: '1.1s', calls: 4120, tools: ['Document Compiler'], systemPrompt: 'Você é o Agente de Secretaria. Otimize processos cartorários de forma ágil.' },
  { name: 'Agente Disciplinar', category: 'Suporte/Operacional', role: 'Gestão de ocorrências e aconselhamento.', status: 'Ativo', accuracy: '97.5%', latency: '1.5s', calls: 820, tools: ['ECA Reference Finder'], systemPrompt: 'Analise ocorrências com foco no Estatuto da Criança e do Adolescente.' },
  { name: 'Agente Família', category: 'Suporte/Operacional', role: 'Interação e respostas claras no portal Classium Família.', status: 'Ativo', accuracy: '98.2%', latency: '1.2s', calls: 3100, tools: ['Communication Push Sender'], systemPrompt: 'Comunique-se de forma empática, clara e simplificada com pais e responsáveis.' },
  { name: 'Agente Jurídico', category: 'Gestão/Direção', role: 'Consulta de leis educacionais, LDB, ECA e normativas.', status: 'Ativo', accuracy: '99.9%', latency: '1.8s', calls: 450, tools: ['LDB RAG Engine', 'Constitution Reference'], systemPrompt: 'Você é o consultor jurídico. Embase decisões em leis, diretrizes e decretos.' },
  { name: 'Agente BNCC', category: 'Ensino/Pedagogia', role: 'Alinhamento integral com a Base Nacional Comum Curricular.', status: 'Ativo', accuracy: '99.2%', latency: '1.3s', calls: 1840, tools: ['BNCC Standards Database'], systemPrompt: 'Garanta conformidade estrita dos planos pedagógicos com os códigos de competência BNCC.' },
  { name: 'Agente Frequência', category: 'Ensino/Pedagogia', role: 'Detecção de infrequência e alerta de Busca Ativa.', status: 'Ativo', accuracy: '99.4%', latency: '0.9s', calls: 2950, tools: ['Attendance Logs Analytics'], systemPrompt: 'Monitore presenças e acione gatilhos de alerta para busca ativa preventiva.' },
  { name: 'Agente Notas', category: 'Ensino/Pedagogia', role: 'Análise de rendimento escolar e previsão de média.', status: 'Ativo', accuracy: '99.2%', latency: '1.0s', calls: 2410, tools: ['Grades Predictor'], systemPrompt: 'Avalie flutuações de aproveitamento e preveja notas finais por turma.' },
  { name: 'Agente Comunicação', category: 'Suporte/Operacional', role: 'Geração automática de boletins, e-mails e avisos.', status: 'Ativo', accuracy: '98.5%', latency: '1.1s', calls: 1520, tools: ['Email Templates compiler'], systemPrompt: 'Crie e formate comunicados escolares formais e informais.' },
  { name: 'Agente Transporte', category: 'Suporte/Operacional', role: 'Rotas de ônibus, monitoramento de frotas e alunos.', status: 'Ativo', accuracy: '97.2%', latency: '1.6s', calls: 940, tools: ['Routes Optimizer'], systemPrompt: 'Gerencie ocupação e otimize rotas de veículos escolares.' },
  { name: 'Agente Calendário', category: 'Suporte/Operacional', role: 'Orquestração de feriados, datas de conselhos e exames.', status: 'Ativo', accuracy: '99.0%', latency: '1.0s', calls: 1100, tools: ['Calendars Planner'], systemPrompt: 'Sincronize calendários e evite conflitos de datas na instituição.' },
  { name: 'Agente Biblioteca', category: 'Suporte/Operacional', role: 'Gestão de acervo literário e devoluções.', status: 'Ativo', accuracy: '98.9%', latency: '1.2s', calls: 620, tools: ['Library Inventory Finder'], systemPrompt: 'Monitore devoluções de livros e incentive a leitura.' },
  { name: 'Agente Financeiro', category: 'Gestão/Direção', role: 'Análise de mensalidades, inadimplência e custos.', status: 'Ativo', accuracy: '99.8%', latency: '1.4s', calls: 1890, tools: ['Billing Predictor'], systemPrompt: 'Monitore métricas de fluxo de caixa e preveja riscos de inadimplência.' },
  { name: 'Agente Comercial', category: 'Gestão/Direção', role: 'Funil de matrículas para novas captações.', status: 'Ativo', accuracy: '98.1%', latency: '1.3s', calls: 1400, tools: ['CRM Lead Analytics'], systemPrompt: 'Otimize o engajamento de leads e captação de novos estudantes.' },
  { name: 'Agente Analytics', category: 'Gestão/Direção', role: 'Geração de insights preditivos de rede para o prefeito.', status: 'Ativo', accuracy: '99.5%', latency: '1.4s', calls: 1120, tools: ['Big Data Aggregator'], systemPrompt: 'Compile relatórios gerenciais executivos com representações analíticas.' },
  { name: 'Agente Smart Horários', category: 'Suporte/Operacional', role: 'Resolução de grades e alocação livre de conflitos.', status: 'Ativo', accuracy: '99.3%', latency: '1.9s', calls: 1250, tools: ['Scheduling Solvers'], systemPrompt: 'Solucione grades horárias escolares sem choque de micro-horários.' },
  { name: 'Agente ClassiumStudio', category: 'Ensino/Pedagogia', role: 'Auxilia na montagem de apostilas e imagens pedagógicas.', status: 'Ativo', accuracy: '98.4%', latency: '1.8s', calls: 860, tools: ['Image Generative API'], systemPrompt: 'Desenvolva recursos visuais de apoio didático inovadores.' },
  { name: 'Agente Marketplace', category: 'Suporte/Operacional', role: 'Parcerias, materiais escolares e cursos externos.', status: 'Ativo', accuracy: '96.8%', latency: '1.4s', calls: 510, tools: ['Partnerships API'], systemPrompt: 'Gerencie parcerias de benefícios do clube Classium.' },
  { name: 'Agente Carreira', category: 'Gestão/Direção', role: 'Acompanhamento de planos de cargo e carreira dos docentes.', status: 'Ativo', accuracy: '98.9%', latency: '1.5s', calls: 690, tools: ['Career Evolution Tracker'], systemPrompt: 'Avalie evolução funcional de professores por pontuação letiva.' },
  { name: 'Agente Rede Reforço', category: 'Ensino/Pedagogia', role: 'Encaminhamento automatizado para aulas extras.', status: 'Ativo', accuracy: '98.7%', latency: '1.2s', calls: 1350, tools: ['Student Tutoring Matching'], systemPrompt: 'Direcione estudantes com desempenho inferior para grupos de reforço personalizado.' },
  { name: 'Agente Administrativo', category: 'Gestão/Direção', role: 'Monitoramento de recursos físicos e patrimônios.', status: 'Ativo', accuracy: '99.1%', latency: '1.2s', calls: 1040, tools: ['Assets Database'], systemPrompt: 'Monitore depreciação e manutenção preventiva de bens da escola.' },
  { name: 'Agente Infraestrutura', category: 'Gestão/Direção', role: 'Acompanhamento de reformas e compras de ativos.', status: 'Ativo', accuracy: '98.5%', latency: '1.4s', calls: 480, tools: ['Procurement Tracker'], systemPrompt: 'Acompanhe chamados de manutenção física e infraestrutura geral.' },
  { name: 'Agente Segurança', category: 'Técnico/Segurança', role: 'Monitoramento de logins, acessos e políticas de TI.', status: 'Ativo', accuracy: '99.9%', latency: '0.8s', calls: 3200, tools: ['Logs Sentinel'], systemPrompt: 'Monitore padrões de autenticação de usuários e previna vazamento de dados.' },
  { name: 'Agente API', category: 'Técnico/Segurança', role: 'Gateway e integração em tempo real com sistemas externos.', status: 'Ativo', accuracy: '99.9%', latency: '0.6s', calls: 9450, tools: ['Gateway Connector'], systemPrompt: 'Valide requisições externas e realize saneamento de dados de entrada.' }
];

export function IaAgents() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editPrompt, setEditPrompt] = useState('');

  const filteredAgents = agents.filter(agent => {
    if (!agent) return false;
    const matchesSearch = (agent.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (agent.role || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || agent.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleToggleStatus = (indexInFiltered: number) => {
    const targetAgent = filteredAgents[indexInFiltered];
    if (!targetAgent) return;
    const targetAgentName = targetAgent.name;
    setAgents(prev => prev.map(a => {
      if (a?.name === targetAgentName) {
        const nextStatus = a.status === 'Ativo' ? 'Pausado' : 'Ativo';
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  const handleOpenPromptEditor = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditPrompt(agent.systemPrompt);
  };

  const handleSavePrompt = () => {
    if (!selectedAgent) return;
    setAgents(prev => prev.map(a => {
      if (a.name === selectedAgent.name) {
        return { ...a, systemPrompt: editPrompt };
      }
      return a;
    }));
    setSelectedAgent(null);
  };

  return (
    <div id="ia_agents_subview" className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800/60">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D4AF37]" /> Agentes Especialistas ({agents.length})
          </h3>
          <p className="text-slate-400 text-xs">Cada setor do ecossistema possui um especialista dedicado com prompts, memória e ferramentas próprias.</p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Pesquisar especialista..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="Todos">Todas as Categorias</option>
            <option value="Gestão/Direção">Gestão & Direção</option>
            <option value="Ensino/Pedagogia">Ensino & Pedagogia</option>
            <option value="Suporte/Operacional">Suporte & Operacional</option>
            <option value="Técnico/Segurança">Técnico & Segurança</option>
          </select>
        </div>
      </div>

      {/* Grid List of 26 Agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent, idx) => {
          return (
            <div 
              key={idx} 
              className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all duration-300"
            >
              <div className="space-y-2.5">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {agent.category}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">{agent.name}</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    agent.status === 'Ativo' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Circle className={`w-2 h-2 fill-current ${agent.status === 'Ativo' ? 'animate-pulse' : ''}`} />
                    {agent.status}
                  </span>
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">{agent.role}</p>

                {/* Micro indicators */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/50 font-mono text-[10px] text-slate-400">
                  <div>
                    <span className="block text-slate-500 text-[9px]">Acurácia</span>
                    <span className="font-bold text-white">{agent.accuracy}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[9px]">Latência</span>
                    <span className="font-bold text-white">{agent.latency}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[9px]">Sessões</span>
                    <span className="font-bold text-white">{agent.calls}</span>
                  </div>
                </div>

                {/* Associated Tools */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-mono block">Ferramentas Ativas:</span>
                  <div className="flex flex-wrap gap-1">
                    {agent.tools.map((t, tid) => (
                      <span key={tid} className="text-[9px] bg-slate-850 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/40">
                <button 
                  onClick={() => handleToggleStatus(idx)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-bold border border-slate-800 hover:bg-slate-850 text-slate-300 transition-all"
                >
                  {agent.status === 'Ativo' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{agent.status === 'Ativo' ? 'Pausar' : 'Ativar'}</span>
                </button>
                
                <button 
                  onClick={() => handleOpenPromptEditor(agent)}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-400 hover:text-white transition-all flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Prompt
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over Prompt Customizer Dialog */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl text-left space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#D4AF37]" /> Personalizar Instruções do {selectedAgent.name}
                  </h4>
                  <p className="text-xs text-slate-400">Instruções de sistema de alta prioridade que modelam a personalidade e precisão do agente especialista.</p>
                </div>
                <button 
                  onClick={() => setSelectedAgent(null)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
                >
                  Fechar
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" /> SYSTEM INSTRUCTIONS
                </label>
                <textarea 
                  rows={8}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex justify-end gap-3.5 pt-2">
                <button 
                  onClick={() => setSelectedAgent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-850"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSavePrompt}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Salvar Prompt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
