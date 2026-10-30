import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Brain, Cpu, MessageSquare, Database, FileText, Terminal, 
  Settings2, Zap, GraduationCap, Server, Activity, DollarSign, History, 
  Settings, Key, BookOpen, Layers, Network, Globe
} from 'lucide-react';

// Import our modular sub-components
import { IaDashboard } from './ia/IaDashboard';
import { IaAgents } from './ia/IaAgents';
import { IaOrchestrator } from './ia/IaOrchestrator';
import { IaKnowledgeMemory } from './ia/IaKnowledgeMemory';
import { IaAutomationPrompts } from './ia/IaAutomationPrompts';
import { IaModelsSettings } from './ia/IaModelsSettings';

type SubPanelTab = 
  | 'dashboard_ia' | 'agentes' | 'orquestrador' | 'conversas' | 'memoria' 
  | 'conhecimento' | 'documentos' | 'prompts' | 'ferramentas' | 'automacoes' 
  | 'treinamentos' | 'aprendizado' | 'modelos_ia' | 'integracoes' 
  | 'monitoramento' | 'custos' | 'historico' | 'configuracoes';

interface SubMenuItem {
  id: SubPanelTab;
  label: string;
  icon: React.ComponentType<any>;
  badge?: string;
  badgeColor?: string;
}

const SUB_MENU_ITEMS: SubMenuItem[] = [
  // Core AI
  { id: 'dashboard_ia', label: 'Dashboard IA', icon: Activity, badge: 'Live', badgeColor: 'bg-indigo-600' },
  { id: 'agentes', label: 'Agentes', icon: Layers, badge: '26', badgeColor: 'bg-amber-600 animate-pulse' },
  { id: 'orquestrador', label: 'Orquestrador', icon: Cpu, badge: 'RAG', badgeColor: 'bg-emerald-600' },
  { id: 'conversas', label: 'Conversas', icon: MessageSquare },
  
  // Memory & Knowledge Base
  { id: 'memoria', label: 'Memória', icon: Database },
  { id: 'conhecimento', label: 'Conhecimento', icon: Brain },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'prompts', label: 'Prompts', icon: Terminal },
  
  // Integrations & Tools
  { id: 'ferramentas', label: 'Ferramentas', icon: Settings2 },
  { id: 'automacoes', label: 'Automações', icon: Zap },
  { id: 'treinamentos', label: 'Treinamentos', icon: BookOpen },
  { id: 'aprendizado', label: 'Aprendizado', icon: Globe },
  
  // AI Settings & Monitoring
  { id: 'modelos_ia', label: 'Modelos IA', icon: Server },
  { id: 'integracoes', label: 'Integrações', icon: Network },
  { id: 'monitoramento', label: 'Monitoramento', icon: Activity },
  { id: 'custos', label: 'Custos', icon: DollarSign },
  { id: 'historico', label: 'Histórico', icon: History },
  { id: 'configuracoes', label: 'Configurações', icon: Settings }
];

export function SuperIaCenter() {
  const [activeTab, setActiveTab] = useState<SubPanelTab>('dashboard_ia');

  // Render correct subcomponent based on selected tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard_ia':
        return <IaDashboard />;
      case 'agentes':
        return <IaAgents />;
      case 'orquestrador':
      case 'conversas':
        return <IaOrchestrator />;
      case 'memoria':
      case 'conhecimento':
      case 'documentos':
      case 'treinamentos':
      case 'aprendizado':
        return <IaKnowledgeMemory />;
      case 'prompts':
      case 'ferramentas':
      case 'automacoes':
        return <IaAutomationPrompts />;
      case 'modelos_ia':
      case 'integracoes':
      case 'monitoramento':
      case 'custos':
      case 'historico':
      case 'configuracoes':
        return <IaModelsSettings />;
      default:
        return <IaDashboard />;
    }
  };

  return (
    <div id="super_ia_center_panel" className="bg-slate-950 min-h-screen text-white rounded-3xl overflow-hidden border border-slate-900 shadow-2xl flex flex-col">
      
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-slate-950 via-indigo-950/20 to-slate-950 border-b border-slate-900 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-1/4 w-96 h-20 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-black tracking-widest uppercase font-mono px-2.5 py-0.5 rounded-full animate-pulse">
              v5.0 Multi-Agent Platform
            </span>
            <span className="text-[10px] text-amber-500 font-bold border border-amber-500/20 bg-amber-500/5 px-2 py-0.2 rounded-full">
              👑 Prime Enterprise
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#D4AF37] animate-pulse" /> Super IA Classium
          </h1>
          <p className="text-xs text-slate-400">Plataforma de inteligência artificial de múltiplos agentes dedicados e orquestração preditiva.</p>
        </div>

        {/* Global summary badge */}
        <div className="flex gap-4 font-mono text-[10px] bg-slate-900/60 border border-slate-800 px-4 py-2.5 rounded-2xl shrink-0">
          <div>
            <span className="text-slate-500 block">Orquestrações</span>
            <span className="font-bold text-indigo-400">1.2k / dia</span>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <span className="text-slate-500 block">Tempo Médio</span>
            <span className="font-bold text-emerald-400">1.45s</span>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <span className="text-slate-500 block">Status Gateway</span>
            <span className="font-bold text-indigo-400">Conectado</span>
          </div>
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        
        {/* Left inner Sidebar with 18 sub-menus */}
        <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-900 py-4 px-3 flex flex-col justify-between overflow-y-auto shrink-0 select-none">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase font-mono px-3 block mb-2.5">
              Menu Central de IA
            </span>
            <div className="space-y-1">
              {SUB_MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected 
                        ? 'bg-indigo-600/10 text-white border-l-4 border-indigo-500 pl-2' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[8px] font-mono font-bold text-white px-1.5 py-0.2 rounded-full ${item.badgeColor || 'bg-slate-800'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-900 px-3 space-y-1 text-slate-500 text-[10px]">
            <p className="font-bold text-slate-400">Classium Inteligência</p>
            <p className="leading-relaxed">Governança administrativa e pedagógica por modelagem preditiva autônoma.</p>
          </div>
        </aside>

        {/* Right Active View Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-950/40">
          {renderContent()}
        </main>

      </div>
    </div>
  );
}
export default SuperIaCenter;
