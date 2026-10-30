import React, { useState } from 'react';
import { X, Sparkles, Grid, Search, GitCommit, Compass, PenTool, Trash2, Plus, ArrowRight } from 'lucide-react';

interface PedagogicalGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCustomGenerator: (questionData: any) => void;
}

interface CrosswordItem {
  id: string;
  word: string;
  clue: string;
}

export function PedagogicalGeneratorModal({ isOpen, onClose, onInsertCustomGenerator }: PedagogicalGeneratorModalProps) {
  const [selectedTool, setSelectedTool] = useState<'cruzadinha' | 'caca_palavras' | 'ligue_colunas' | 'caligrafia' | 'labirinto'>('cruzadinha');

  // Cruzadinha state (Image 5)
  const [crosswordTitle, setCrosswordTitle] = useState('Cruzadinha Pedagógica');
  const [crosswordItems, setCrosswordItems] = useState<CrosswordItem[]>([
    { id: '1', word: 'BRASIL', clue: 'País onde o futebol é paixão nacional' },
    { id: '2', word: 'BOLA', clue: 'Objeto esférico utilizado no jogo' },
    { id: '3', word: 'GOL', clue: 'O momento máximo da partida de futebol' },
    { id: '4', word: 'CAMPEAO', clue: 'Aquele que vence o torneio ou campeonato' }
  ]);
  const [newWord, setNewWord] = useState('');
  const [newClue, setNewClue] = useState('');

  // Caça-Palavras state
  const [wordSearchTitle, setWordSearchTitle] = useState('Caça-Palavras Temático');
  const [wordSearchWords, setWordSearchWords] = useState('BRASIL, FUTEBOL, VITORIA, TORCIDA, APITO, ESTADIO');
  const [gridSize, setGridSize] = useState<'10x10' | '12x12' | '15x15'>('12x12');

  // Ligue as Colunas state
  const [matchColTitle, setMatchColTitle] = useState('Relacione as Colunas');
  const [colAText, setColAText] = useState('Inglaterra, Fatos Históricos, Ludismo, Tear Mecânico');
  const [colBText, setColBText] = useState('Berço da Revolução, Século XVIII, Quebradores de Máquinas, Invenção Têxtil');

  // Caligrafia e Pontilhado state
  const [caligraphyTitle, setCaligraphyTitle] = useState('Treino de Caligrafia e Pontilhado');
  const [dottedText, setDottedText] = useState('A educação transforma o mundo e constrói o futuro.');

  // Labirinto & Lógica state
  const [mazeTitle, setMazeTitle] = useState('Desafio de Raciocínio Lógico e Labirinto');
  const [mazeTheme, setMazeTheme] = useState('Ajude o estudante a encontrar o caminho até a biblioteca escolar!');

  if (!isOpen) return null;

  const handleAddCrosswordItem = () => {
    if (!newWord.trim() || !newClue.trim()) return;
    setCrosswordItems(prev => [
      ...prev,
      {
        id: `cw-${Date.now()}`,
        word: newWord.toUpperCase().trim(),
        clue: newClue.trim()
      }
    ]);
    setNewWord('');
    setNewClue('');
  };

  const handleRemoveCrosswordItem = (id: string) => {
    setCrosswordItems(prev => prev.filter(item => item.id !== id));
  };

  const handleInsertCrossword = () => {
    onInsertCustomGenerator({
      type: 'Cruzadinha',
      difficulty: 'Médio',
      text: `${crosswordTitle}: Preencha a grade da cruzadinha com as palavras correspondentes a cada uma das pistas indicadas abaixo:`,
      crosswordData: {
        title: crosswordTitle,
        items: crosswordItems
      },
      answer: `Gabarito da Cruzadinha: ${crosswordItems.map(i => `${i.word} (${i.clue})`).join(' | ')}`
    });
    onClose();
  };

  const handleInsertWordSearch = () => {
    const words = wordSearchWords.split(',').map(w => w.trim().toUpperCase()).filter(Boolean);
    onInsertCustomGenerator({
      type: 'Caça-Palavras',
      difficulty: 'Fácil',
      text: `${wordSearchTitle}: Localize no quadro de letras as seguintes palavras: ${words.join(', ')}.`,
      wordSearchData: {
        title: wordSearchTitle,
        words: words,
        gridSize: gridSize
      },
      answer: `Gabarito do Caça-Palavras: Palavras a encontrar: ${words.join(', ')}.`
    });
    onClose();
  };

  const handleInsertMatchColumns = () => {
    const itemsA = colAText.split(',').map(s => s.trim()).filter(Boolean);
    const itemsB = colBText.split(',').map(s => s.trim()).filter(Boolean);

    onInsertCustomGenerator({
      type: 'Ligue-Colunas',
      difficulty: 'Médio',
      text: `${matchColTitle}: Relacione a Coluna A com a Coluna B correspondente, associando os conceitos aos seus respectivos significados:`,
      columnA: itemsA,
      columnB: itemsB,
      answer: `Gabarito das Colunas: ${itemsA.map((a, idx) => `[${a}] -> [${itemsB[idx] || '...'}]`).join(' | ')}`
    });
    onClose();
  };

  const handleInsertCalligraphy = () => {
    onInsertCustomGenerator({
      type: 'Pontilhado',
      difficulty: 'Fácil',
      text: `${caligraphyTitle}: Cubra os pontilhados da frase com atenção e repita a escrita nas pautas de caligrafia:\n"${dottedText}"`,
      dottedText: dottedText,
      answer: 'Critério Pedagógico: Avaliar precisão motora, firmeza de traço e respeito às linhas da pauta.'
    });
    onClose();
  };

  const handleInsertMaze = () => {
    onInsertCustomGenerator({
      type: 'Labirinto',
      difficulty: 'Médio',
      text: `${mazeTitle}: ${mazeTheme} Trace a rota correta sem cruzar as barreiras.`,
      mazeData: {
        title: mazeTitle,
        theme: mazeTheme
      },
      answer: 'Gabarito do Labirinto: Seguir pela rota central evitando os bloqueios laterais.'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-gold/30 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-[#070a12] border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-gold/40 rounded-xl text-gold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white tracking-wide">Geradores de Recursos Pedagógicos</h3>
              <p className="text-xs text-slate-400">Monte jogos didáticos, passatempos e atividades de apoio automaticamente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav + Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Nav */}
          <div className="md:col-span-4 bg-[#070a12]/90 p-4 border-r border-slate-800 space-y-1.5 text-xs font-bold shrink-0">
            {[
              { id: 'cruzadinha', label: '1. Cruzadinhas', icon: Grid },
              { id: 'caca_palavras', label: '2. Caça-Palavras', icon: Search },
              { id: 'ligue_colunas', label: '3. Ligue as Colunas', icon: GitCommit },
              { id: 'caligrafia', label: '4. Caligrafia e Pontilhado', icon: PenTool },
              { id: 'labirinto', label: '5. Labirintos & Lógica', icon: Compass },
            ].map(tool => {
              const Icon = tool.icon;
              const isSel = selectedTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id as any)}
                  className={`w-full text-left p-3.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                    isSel
                      ? 'bg-amber-500/15 text-gold border border-gold/40 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 text-gold shrink-0" />
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form Content */}
          <div className="md:col-span-8 p-6 overflow-y-auto max-h-[70vh] space-y-5 bg-[#0b0f19]">
            {/* 1. Cruzadinha (Image 5) */}
            {selectedTool === 'cruzadinha' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    TÍTULO DA CRUZADINHA
                  </label>
                  <input
                    type="text"
                    value={crosswordTitle}
                    onChange={(e) => setCrosswordTitle(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    PALAVRAS E PISTAS ({crosswordItems.length})
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {crosswordItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#111625] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-3"
                      >
                        <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 uppercase tracking-wider shrink-0">
                          {item.word}
                        </span>
                        <span className="text-xs text-slate-300 truncate flex-1">
                          {item.clue}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCrosswordItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 transition-all shrink-0"
                          title="Remover palavra"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2">
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        placeholder="PALAVRA (EX: COPA)"
                        value={newWord}
                        onChange={(e) => setNewWord(e.target.value.toUpperCase())}
                        className="w-full bg-[#111625] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white uppercase placeholder:text-slate-500 focus:outline-none focus:border-gold font-bold"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        placeholder="PISTA / DICA DA PALAVRA"
                        value={newClue}
                        onChange={(e) => setNewClue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddCrosswordItem(); }}
                        className="w-full bg-[#111625] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddCrosswordItem}
                        className="w-full h-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-purple-900/30"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleInsertCrossword}
                  className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-gold/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>GERAR E INSERIR CRUZADINHA NO DOCUMENTO</span>
                </button>
              </div>
            )}

            {/* 2. Caça-Palavras */}
            {selectedTool === 'caca_palavras' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    TÍTULO DO CAÇA-PALAVRAS
                  </label>
                  <input
                    type="text"
                    value={wordSearchTitle}
                    onChange={(e) => setWordSearchTitle(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    PALAVRAS A ENCONTRAR (SEPARADAS POR VÍRGULA)
                  </label>
                  <textarea
                    rows={3}
                    value={wordSearchWords}
                    onChange={(e) => setWordSearchWords(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-gold resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    DIMENSÃO DA GRADE
                  </label>
                  <div className="flex gap-3">
                    {(['10x10', '12x12', '15x15'] as const).map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setGridSize(size)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          gridSize === size
                            ? 'bg-amber-500/20 border-gold text-gold'
                            : 'bg-[#111625] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Grade {size}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleInsertWordSearch}
                  className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-gold/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>GERAR E INSERIR CAÇA-PALAVRAS NO DOCUMENTO</span>
                </button>
              </div>
            )}

            {/* 3. Ligue as Colunas */}
            {selectedTool === 'ligue_colunas' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    TÍTULO DA ATIVIDADE
                  </label>
                  <input
                    type="text"
                    value={matchColTitle}
                    onChange={(e) => setMatchColTitle(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    COLUNA A (TERMOS SEPARADOS POR VÍRGULA)
                  </label>
                  <textarea
                    rows={2}
                    value={colAText}
                    onChange={(e) => setColAText(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-gold resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    COLUNA B (DEFINIÇÕES CORRESPONDENTES)
                  </label>
                  <textarea
                    rows={2}
                    value={colBText}
                    onChange={(e) => setColBText(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-gold resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleInsertMatchColumns}
                  className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-gold/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>GERAR E INSERIR LIGUE-COLUNAS NO DOCUMENTO</span>
                </button>
              </div>
            )}

            {/* 4. Caligrafia e Pontilhado */}
            {selectedTool === 'caligrafia' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    TÍTULO DA ATIVIDADE
                  </label>
                  <input
                    type="text"
                    value={caligraphyTitle}
                    onChange={(e) => setCaligraphyTitle(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    FRASE OU PALAVRAS PARA PONTILHADO & CALIGRAFIA
                  </label>
                  <textarea
                    rows={3}
                    value={dottedText}
                    onChange={(e) => setDottedText(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-gold resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleInsertCalligraphy}
                  className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-gold/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>GERAR E INSERIR CALIGRAFIA NO DOCUMENTO</span>
                </button>
              </div>
            )}

            {/* 5. Labirintos & Lógica */}
            {selectedTool === 'labirinto' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    TÍTULO DO DESAFIO
                  </label>
                  <input
                    type="text"
                    value={mazeTitle}
                    onChange={(e) => setMazeTitle(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    ENUNCIADO / MISSÃO DO LABIRINTO
                  </label>
                  <textarea
                    rows={3}
                    value={mazeTheme}
                    onChange={(e) => setMazeTheme(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-gold resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleInsertMaze}
                  className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-gold/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>GERAR E INSERIR LABIRINTO NO DOCUMENTO</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
