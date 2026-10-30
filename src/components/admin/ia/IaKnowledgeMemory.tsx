import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, Brain, FileText, Search, Plus, Trash2, ShieldCheck, 
  RefreshCw, Upload, Globe, Edit3, CheckCircle, AlertCircle, Play
} from 'lucide-react';

interface MemorySlot {
  id: string;
  category: 'Usuário' | 'Escola' | 'Rede' | 'Sessão' | 'Módulo' | 'Fluxo';
  key: string;
  value: string;
  updatedAt: string;
}

interface KnowledgeDoc {
  id: string;
  name: string;
  type: string;
  category: 'Legislação' | 'Regulamentação' | 'Documento Interno' | 'Parâmetro Curricular';
  size: string;
  status: 'Indexado' | 'Processando' | 'Erro';
  indexedAt: string;
}

const INITIAL_MEMORIES: MemorySlot[] = [
  { id: '1', category: 'Usuário', key: 'USER_ROLE_PREFERENCE', value: 'Coordenador Pedagógico', updatedAt: '26/07/2026 14:15' },
  { id: '2', category: 'Escola', key: 'SCHOOL_ABSENCE_ALERT_LIMIT', value: '3 faltas consecutivas', updatedAt: '26/07/2026 12:20' },
  { id: '3', category: 'Rede', key: 'REDE_IDEB_TARGET_2026', value: '6.8', updatedAt: '25/07/2026 09:30' },
  { id: '4', category: 'Sessão', key: 'SESSION_ACTIVE_AGENT_ID', value: 'Agente Pedagógico', updatedAt: '26/07/2026 14:45' },
  { id: '5', category: 'Módulo', key: 'MODULE_SMART_HORARIOS_CONSTRAINTS', value: 'Máximo 5 tempos seguidos', updatedAt: '26/07/2026 10:11' },
  { id: '6', category: 'Fluxo', key: 'FLOW_BUSCA_ATIVA_NOTIF_TEMPLATE', value: 'WhatsApp Família A-1', updatedAt: '26/07/2026 11:42' }
];

const INITIAL_DOCS: KnowledgeDoc[] = [
  { id: '1', name: 'LDB - Lei de Diretrizes e Bases (Lei 9394/96)', type: 'PDF', category: 'Legislação', size: '2.4 MB', status: 'Indexado', indexedAt: '20/07/2026' },
  { id: '2', name: 'ECA - Estatuto da Criança e do Adolescente', type: 'PDF', category: 'Legislação', size: '1.8 MB', status: 'Indexado', indexedAt: '20/07/2026' },
  { id: '3', name: 'BNCC - Base Nacional Comum Curricular Completa', type: 'PDF', category: 'Parâmetro Curricular', size: '12.6 MB', status: 'Indexado', indexedAt: '21/07/2026' },
  { id: '4', name: 'Constituição Federal de 1988 - Cap. Educação', type: 'Word', category: 'Legislação', size: '450 KB', status: 'Indexado', indexedAt: '21/07/2026' },
  { id: '5', name: 'Projeto Político Pedagógico (PPP) Unidade Sede 2026', type: 'PDF', category: 'Documento Interno', size: '1.2 MB', status: 'Indexado', indexedAt: '22/07/2026' },
  { id: '6', name: 'Regimento Escolar Interno - Classium Multiescolas', type: 'PDF', category: 'Documento Interno', size: '920 KB', status: 'Indexado', indexedAt: '22/07/2026' },
  { id: '7', name: 'DCNs - Diretrizes Curriculares Nacionais', type: 'PDF', category: 'Regulamentação', size: '3.1 MB', status: 'Indexado', indexedAt: '23/07/2026' },
  { id: '8', name: 'PNE - Plano Nacional de Educação 2014-2024 (Consol)', type: 'PDF', category: 'Regulamentação', size: '1.5 MB', status: 'Indexado', indexedAt: '24/07/2026' }
];

export function IaKnowledgeMemory() {
  const [activeSubTab, setActiveSubTab] = useState<'memory' | 'rag' | 'train'>('memory');
  
  // Memory States
  const [memories, setMemories] = useState<MemorySlot[]>(INITIAL_MEMORIES);
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryVal, setNewMemoryVal] = useState('');
  const [newMemoryCat, setNewMemoryCat] = useState<'Usuário' | 'Escola' | 'Rede' | 'Sessão' | 'Módulo' | 'Fluxo'>('Usuário');

  // Knowledge base States
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>(INITIAL_DOCS);
  const [searchTerm, setSearchTerm] = useState('');

  // Upload Training States
  const [trainingText, setTrainingText] = useState('');
  const [trainingUrl, setTrainingUrl] = useState('');
  const [isTrainingProgress, setIsTrainingProgress] = useState(false);
  const [trainingLog, setTrainingLog] = useState<string[]>([]);

  // Add memory slot
  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryKey.trim() || !newMemoryVal.trim()) return;
    
    const timestamp = new Date().toLocaleString('pt-BR');
    const newSlot: MemorySlot = {
      id: String(Date.now()),
      category: newMemoryCat,
      key: newMemoryKey.toUpperCase().replace(/\s+/g, '_'),
      value: newMemoryVal,
      updatedAt: timestamp
    };

    setMemories([newSlot, ...memories]);
    setNewMemoryKey('');
    setNewMemoryVal('');
  };

  const handleDeleteMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  // Run Training Job Simulation
  const handleStartTraining = (type: 'text' | 'url') => {
    setIsTrainingProgress(true);
    setTrainingLog([]);

    const steps = [
      'Iniciando pipeline de processamento cognitivo...',
      'Quebrando texto em chunks de 512 tokens com overlapping de 10%...',
      'Gerando embeddings vetoriais via text-embedding-004...',
      'Indexando vetores na base vetorial integrada do Classium...',
      'Ajustando pesos de relevância e atualizando índice de busca semântica...',
      'Treinamento de base concluído com sucesso!'
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        setTrainingLog(prev => [...prev, steps[current]]);
        current++;
      } else {
        clearInterval(interval);
        setIsTrainingProgress(false);

        // Append a mock document to the knowledge base representing this training
        const newDocName = type === 'text' ? 'Anotação Pedagógica Personalizada' : `Artigo Web: ${trainingUrl}`;
        const newDoc: KnowledgeDoc = {
          id: String(Date.now()),
          name: newDocName,
          type: type === 'text' ? 'Txt' : 'WebLink',
          category: 'Documento Interno',
          size: '12 KB',
          status: 'Indexado',
          indexedAt: new Date().toLocaleDateString('pt-BR')
        };
        setKnowledgeDocs(prev => [newDoc, ...prev]);
        setTrainingText('');
        setTrainingUrl('');
      }
    }, 800);
  };

  const filteredDocs = knowledgeDocs.filter(doc => 
    doc && (
      (doc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div id="ia_knowledge_memory_subview" className="space-y-6 text-left">
      
      {/* Sub tabs inside memory knowledge */}
      <div className="flex gap-2 border-b border-slate-800/60 pb-3">
        <button 
          onClick={() => setActiveSubTab('memory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'memory' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Memória Contextual
        </button>
        <button 
          onClick={() => setActiveSubTab('rag')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'rag' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Base de Conhecimento (RAG)
        </button>
        <button 
          onClick={() => setActiveSubTab('train')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'train' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Treinamento & Aprendizado
        </button>
      </div>

      <AnimatePresence mode="wait">
        
        {/* 1. MEMORY SUB-TAB */}
        {activeSubTab === 'memory' && (
          <motion.div 
            key="memory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Form to insert new memory context key-value */}
              <div className="md:col-span-1 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-[#D4AF37]" /> Injetar Memória Ativa
                </h4>
                
                <form onSubmit={handleAddMemory} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono">Segmentação</label>
                    <select 
                      value={newMemoryCat}
                      onChange={(e) => setNewMemoryCat(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="Usuário">Usuário</option>
                      <option value="Escola">Escola</option>
                      <option value="Rede">Rede</option>
                      <option value="Sessão">Sessão</option>
                      <option value="Módulo">Módulo</option>
                      <option value="Fluxo">Fluxo</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono">Chave Contexto</label>
                    <input 
                      type="text" 
                      placeholder="Ex: TARGET_ID_GRADE_C"
                      value={newMemoryKey}
                      onChange={(e) => setNewMemoryKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase placeholder-slate-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono">Valor Memorizado</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Turma do 9º ano A"
                      value={newMemoryVal}
                      onChange={(e) => setNewMemoryVal(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-2 text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Registrar Memória
                  </button>
                </form>
              </div>

              {/* Memory Logs Viewer list */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-400" /> Registro Contextual de Variáveis
                  </h4>
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono">Conformidade LGPD</span>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
                  {memories.map((m) => (
                    <div 
                      key={m.id} 
                      className="bg-slate-950 border border-slate-900 p-3 rounded-xl flex justify-between items-center text-xs hover:border-slate-800 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                            {m.category}
                          </span>
                          <span className="font-mono text-[10px] text-white font-bold">{m.key}</span>
                        </div>
                        <p className="text-slate-400">{m.value}</p>
                        <span className="text-[9px] text-slate-600 block">Atualizado em: {m.updatedAt}</span>
                      </div>

                      <button 
                        onClick={() => handleDeleteMemory(m.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* 2. BASE DE CONHECIMENTO (RAG) */}
        {activeSubTab === 'rag' && (
          <motion.div 
            key="rag"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" /> Indexação de Documentos para RAG
                </h4>
                <p className="text-[10px] text-slate-400">Leis nacionais, normativas internas, PPP e regimentos escolares indexados para ancoragem semântica dos agentes.</p>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input 
                  type="text" 
                  placeholder="Filtrar base de conhecimento..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500 w-52 placeholder-slate-600"
                />
              </div>
            </div>

            {/* List of Documents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredDocs.map((doc) => (
                <div 
                  key={doc.id} 
                  className="bg-slate-900/40 border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between text-xs hover:border-slate-700 transition-all"
                >
                  <div className="flex gap-3 items-center">
                    <div className="bg-indigo-500/10 text-indigo-400 px-2 py-2 rounded-lg font-mono font-black text-[10px]">
                      {doc.type}
                    </div>
                    <div className="space-y-0.5">
                      <h5 className="font-bold text-white">{doc.name}</h5>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded text-[9px] uppercase font-mono">{doc.category}</span>
                        <span>•</span>
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span>Sincronizado: {doc.indexedAt}</span>
                      </div>
                    </div>
                  </div>

                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 3. TREINAMENTO & APRENDIZADO WORKSPACE */}
        {activeSubTab === 'train' && (
          <motion.div 
            key="train"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Active forms for web url or raw text training */}
              <div className="md:col-span-7 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-400 animate-pulse" /> Treinamento Dinâmico em Tempo Real
                </h4>
                
                <div className="space-y-4">
                  {/* Training Type A - Raw Text Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Injetar Texto Pedagógico / Normativo</label>
                    <textarea 
                      rows={4}
                      placeholder="Cole aqui regulamentos internos, ementas de disciplinas, portarias ou notas de conselho de classe..."
                      value={trainingText}
                      onChange={(e) => setTrainingText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]"
                      disabled={isTrainingProgress}
                    />
                    <button 
                      onClick={() => handleStartTraining('text')}
                      disabled={isTrainingProgress || !trainingText.trim()}
                      className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 w-fit"
                    >
                      <Play className="w-3.5 h-3.5" /> Treinar Anotação
                    </button>
                  </div>

                  {/* Training Type B - Web URL Crawler */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/50">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Indexar URL de Legislação (Web Crawler)</label>
                    <div className="flex gap-2">
                      <input 
                        type="url" 
                        placeholder="https://www.planalto.gov.br/ccivil_03/leis/l9394.htm"
                        value={trainingUrl}
                        onChange={(e) => setTrainingUrl(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        disabled={isTrainingProgress}
                      />
                      <button 
                        onClick={() => handleStartTraining('url')}
                        disabled={isTrainingProgress || !trainingUrl.trim()}
                        className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5" /> Indexar URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Console Pipeline feedback block */}
              <div className="md:col-span-5 bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col justify-between min-h-[250px]">
                <div className="space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                    <span className="text-[10px] font-mono text-[#D4AF37] font-bold">PIPELINE TERMINAL</span>
                    {isTrainingProgress && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                  </div>

                  <div className="font-mono text-[9px] text-slate-400 space-y-1.5 overflow-y-auto max-h-[200px]">
                    {trainingLog.length === 0 ? (
                      <p className="italic text-slate-600">Aguardando gatilho de treinamento dinâmico...</p>
                    ) : (
                      trainingLog.map((log, idx) => (
                        <p key={idx} className={idx === trainingLog.length - 1 ? 'text-indigo-400 font-bold' : ''}>
                          &gt; {log}
                        </p>
                      ))
                    )}
                  </div>
                </div>

                <div className="text-[10px] bg-indigo-950/20 border border-indigo-500/20 p-2.5 rounded-lg text-slate-300">
                  <p className="font-bold text-indigo-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> No-Code Sinc
                  </p>
                  <p className="text-[9px] mt-0.5 leading-relaxed">Você pode alimentar a Super IA instantaneamente. Embeddings gerados são salvos em base vetorial local.</p>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
