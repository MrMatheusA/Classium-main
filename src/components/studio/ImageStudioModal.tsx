import React, { useState } from 'react';
import { ImageAsset } from './EducaStudioTypes';
import { Search, Sparkles, Image as ImageIcon, X, Download, Filter, Wand2, Paintbrush, Palette, Pin, CheckCircle2, ArrowRight } from 'lucide-react';
import { activitiesService } from '../../services/activities/activities.service';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string, caption?: string) => void;
}

// Curated internal image bank with line-art, drawings and pedagogical schemes (Image 3)
const INTERNAL_IMAGE_BANK: ImageAsset[] = [
  {
    id: '1',
    title: 'Bola e Campo de Futebol (Copa do Mundo) - Desenho para Colorir',
    subject: 'Artes',
    category: 'colorir',
    url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&auto=format&fit=crop&q=80',
    tags: ['copa do mundo', 'futebol', 'colorir', 'esporte', 'desenho', 'artes']
  },
  {
    id: '2',
    title: 'Bandeiras e Troféu - Desenho para Colorir',
    subject: 'Artes',
    category: 'colorir',
    url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    tags: ['copa do mundo', 'bandeira', 'trofeu', 'colorir', 'artes']
  },
  {
    id: '3',
    title: 'Fábrica e Máquina a Vapor (Revolução Industrial)',
    subject: 'História',
    category: 'ilustracao',
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80',
    tags: ['revolução industrial', 'história', 'fabrica', 'maquina', 'vapor']
  },
  {
    id: '4',
    title: 'Célula Animal e Organelas - Esquema Didático',
    subject: 'Ciências',
    category: 'esquema',
    url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&auto=format&fit=crop&q=80',
    tags: ['biologia', 'celula', 'ciencias', 'esquema', 'organelas']
  },
  {
    id: '5',
    title: 'Mapa do Brasil e Regiões',
    subject: 'Geografia',
    category: 'mapa',
    url: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=600&auto=format&fit=crop&q=80',
    tags: ['mapa', 'brasil', 'geografia', 'regioes', 'estados']
  },
  {
    id: '6',
    title: 'Animais da Floresta - Desenhos para Colorir (Ed. Infantil)',
    subject: 'Artes',
    category: 'colorir',
    url: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=600&auto=format&fit=crop&q=80',
    tags: ['animais', 'infantil', 'colorir', 'floresta', 'girafa', 'zebra']
  }
];

export function ImageStudioModal({ isOpen, onClose, onSelectImage }: ImageStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'banco' | 'ia'>('banco');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Todas as Disciplinas');
  const [selectedCategory, setSelectedCategory] = useState('Todas as Categorias');

  // AI Generator state (Image 4)
  const [aiPrompt, setAiPrompt] = useState('naruto com dragon Ball');
  const [aiStyle, setAiStyle] = useState<'pb_colorir' | 'colorido'>('colorido');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(
    'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80'
  );

  if (!isOpen) return null;

  const filteredImages = INTERNAL_IMAGE_BANK.filter(img => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      img.title.toLowerCase().includes(q) ||
      img.tags.some(t => t.toLowerCase().includes(q));
    const matchesSubject = selectedSubject === 'Todas as Disciplinas' || img.subject === selectedSubject;
    const matchesCategory = selectedCategory === 'Todas as Categorias' || 
      (selectedCategory === 'Para Colorir' && img.category === 'colorir') ||
      (selectedCategory === 'Ilustração' && img.category === 'ilustracao') ||
      (selectedCategory === 'Esquema Didático' && img.category === 'esquema') ||
      (selectedCategory === 'Mapa' && img.category === 'mapa');
    return matchesSearch && matchesSubject && matchesCategory;
  });

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const result = await activitiesService.generateDrawing(aiPrompt, aiStyle);
      setGeneratedPreview(result.imageUrl);
    } catch (e) {
      console.warn(e);
      setGeneratedPreview('https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80');
    } finally {
      setIsGenerating(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'colorir':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 uppercase tracking-wider">
            <span>🎨</span> PARA COLORIR
          </span>
        );
      case 'ilustracao':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
            ILUSTRAÇÃO
          </span>
        );
      case 'esquema':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
            ESQUEMA
          </span>
        );
      case 'mapa':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
            MAPA
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300 uppercase tracking-wider">
            {category}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-gold/30 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-[#070a12] border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-gold/40 rounded-xl text-gold">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white tracking-wide">Banco Ilustrado & Gerador de Desenhos IA</h3>
              <p className="text-xs text-slate-400">Pesquise no acervo pedagógico ou gere ilustrações sob medida</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4 pb-2 bg-[#0b0f19] border-b border-slate-800/80 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('banco')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'banco'
                  ? 'bg-slate-900 border border-gold text-gold shadow-lg shadow-gold/5'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Banco Interno & Recursos Licenciados</span>
            </button>
            <button
              onClick={() => setActiveTab('ia')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'ia'
                  ? 'bg-purple-950/60 border border-purple-500 text-purple-300 shadow-lg shadow-purple-900/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Gerador IA de Desenhos (Preto/Branco ou Colorido)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'banco' ? (
            /* TAB 1: Banco Ilustrado (Image 3) */
            <div className="space-y-6">
              {/* Filter Bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por tema (ex: Copa do Mundo, célula, mapa...)"
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-gold"
                  />
                </div>
                <div className="md:col-span-3">
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                  >
                    <option value="Todas as Disciplinas">Todas as Disciplinas</option>
                    <option value="História">História</option>
                    <option value="Geografia">Geografia</option>
                    <option value="Ciências">Ciências</option>
                    <option value="Artes">Artes</option>
                    <option value="Matemática">Matemática</option>
                    <option value="Língua Portuguesa">Língua Portuguesa</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                  >
                    <option value="Todas as Categorias">Todas as Categorias</option>
                    <option value="Para Colorir">Para Colorir</option>
                    <option value="Ilustração">Ilustração</option>
                    <option value="Esquema Didático">Esquema Didático</option>
                    <option value="Mapa">Mapa</option>
                  </select>
                </div>
              </div>

              {/* Grid Cards (Image 3) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredImages.map((img) => (
                  <div
                    key={img.id}
                    className="bg-[#111625] border border-slate-800 hover:border-gold/40 rounded-2xl overflow-hidden flex flex-col group transition-all"
                  >
                    <div className="relative h-40 bg-slate-950 overflow-hidden">
                      <img
                        src={img.url}
                        alt={img.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        {getCategoryBadge(img.category)}
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                          {img.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                          {img.subject}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          onSelectImage(img.url, img.title);
                          onClose();
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-gold/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        INSERIR NO RASCUNHO
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* TAB 2: Gerador IA de Desenhos (Image 4) */
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-gradient-to-b from-[#180e28] to-[#120a1f] border border-purple-500/30 space-y-4">
                <div className="flex items-center gap-2 text-purple-300">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h4 className="font-bold text-sm">Descreva a ilustração que a Super IA Classium deve desenhar</h4>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    PROMPT DESCRITIVO
                  </label>
                  <textarea
                    rows={3}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ex: naruto com dragon Ball, ou macaco jogando futebol na praia..."
                    className="w-full bg-[#0d0716] border border-purple-500/30 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400 leading-relaxed resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    ESTILO VISUAL
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAiStyle('pb_colorir')}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        aiStyle === 'pb_colorir'
                          ? 'bg-[#0d0716] border-purple-400 text-white shadow-md'
                          : 'bg-[#0d0716]/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Pin className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-white">Preto e Branco</div>
                        <div className="text-[11px] text-slate-400">Ideal para colorir em sala</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAiStyle('colorido')}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        aiStyle === 'colorido'
                          ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                          : 'bg-[#0d0716]/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Palette className="w-5 h-5 text-white shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-white">Colorido Vibrante</div>
                        <div className="text-[11px] text-purple-100">Ilustração completa anexada</div>
                      </div>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? 'Gerando Desenho com Super IA...' : 'GERAR DESENHO COM IA'}</span>
                </button>
              </div>

              {/* Result Preview (Image 4) */}
              {generatedPreview && (
                <div className="p-5 rounded-2xl bg-[#111625] border border-slate-800 space-y-4">
                  <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                    RESULTADO GERADO:
                  </span>
                  <div className="relative rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950 max-h-72 flex items-center justify-center">
                    <img
                      src={generatedPreview}
                      alt="Resultado IA"
                      className="w-full h-auto max-h-72 object-contain"
                    />
                  </div>
                  <button
                    onClick={() => {
                      onSelectImage(generatedPreview, `Ilustração IA: ${aiPrompt}`);
                      onClose();
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-gold/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>INSERIR NO DOCUMENTO A4</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
