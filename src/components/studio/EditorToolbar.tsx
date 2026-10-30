import React, { useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Table, Image as ImageIcon, Sparkles, Type, Palette, Plus, Minus, FileText,
  Square, Shield, QrCode, Signature, HelpCircle, Layers, Droplets, Check, Grid
} from 'lucide-react';

interface EditorToolbarProps {
  onInsertTable: () => void;
  onInsertTextBox: () => void;
  onInsertImageModal: () => void;
  onInsertWatermark: (text: string) => void;
  onInsertQRCode: () => void;
  onInsertSignatureLine: () => void;
  onToggleAnswerKey: () => void;
  showAnswerKey: boolean;
  onOpenGeneratorsModal: () => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  textColor: string;
  setTextColor: (color: string) => void;
}

export function EditorToolbar({
  onInsertTable,
  onInsertTextBox,
  onInsertImageModal,
  onInsertWatermark,
  onInsertQRCode,
  onInsertSignatureLine,
  onToggleAnswerKey,
  showAnswerKey,
  onOpenGeneratorsModal,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  textColor,
  setTextColor
}: EditorToolbarProps) {
  const [activeWatermarkInput, setActiveWatermarkInput] = useState(false);
  const [watermarkText, setWatermarkText] = useState('AVALIAÇÃO OFICIAL');

  const applyCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
  };

  return (
    <div className="no-print bg-slate-900 border border-gold/30 p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs shadow-xl text-white">
      {/* 1. TEXT FORMATTING TOOLS */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
        {/* Font Family */}
        <select
          value={fontFamily}
          onChange={(e) => {
            setFontFamily(e.target.value);
            applyCommand('fontName', e.target.value);
          }}
          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-gold"
        >
          <option value="Inter">Inter (Padrão)</option>
          <option value="Times New Roman">Times New Roman (Clássico)</option>
          <option value="Arial">Arial (Legível)</option>
          <option value="Comic Sans MS">Comic Sans / Lúdico</option>
          <option value="Playfair Display">Playfair (Display)</option>
          <option value="Courier New">Courier (Mono)</option>
        </select>

        {/* Font Size controls */}
        <div className="flex items-center gap-1 border-l border-slate-800 pl-1">
          <button
            type="button"
            onClick={() => setFontSize(Math.max(8, fontSize - 1))}
            className="p-1 hover:bg-slate-800 rounded text-slate-300"
            title="Diminuir Fonte"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="font-mono text-[10px] w-6 text-center text-amber-300 font-bold">{fontSize}pt</span>
          <button
            type="button"
            onClick={() => setFontSize(Math.min(32, fontSize + 1))}
            className="p-1 hover:bg-slate-800 rounded text-slate-300"
            title="Aumentar Fonte"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* TextStyle Buttons */}
        <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1">
          <button
            type="button"
            onClick={() => applyCommand('bold')}
            className="p-1.5 hover:bg-slate-800 rounded font-bold hover:text-gold"
            title="Negrito (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyCommand('italic')}
            className="p-1.5 hover:bg-slate-800 rounded italic hover:text-gold"
            title="Itálico (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyCommand('underline')}
            className="p-1.5 hover:bg-slate-800 rounded underline hover:text-gold"
            title="Sublinhado (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alignments */}
        <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1">
          <button
            type="button"
            onClick={() => applyCommand('justifyLeft')}
            className="p-1.5 hover:bg-slate-800 rounded hover:text-gold"
            title="Alinhar à Esquerda"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyCommand('justifyCenter')}
            className="p-1.5 hover:bg-slate-800 rounded hover:text-gold"
            title="Centralizar"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyCommand('justifyRight')}
            className="p-1.5 hover:bg-slate-800 rounded hover:text-gold"
            title="Alinhar à Direita"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. INSERTION TOOLS */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={onInsertImageModal}
          className="px-2.5 py-1.5 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-purple-500/30 transition-all"
        >
          <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
          <span>+ Imagem / Ilustração</span>
        </button>

        <button
          type="button"
          onClick={onOpenGeneratorsModal}
          className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-gold/30 hover:bg-gold/25 text-gold rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-gold/40 transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
          <span>Geradores Pedagógicos</span>
        </button>

        <button
          type="button"
          onClick={onInsertTable}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
          title="Inserir Tabela"
        >
          <Table className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onInsertTextBox}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
          title="Inserir Caixa de Texto"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onInsertQRCode}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
          title="Inserir QR Code de Áudio / Vídeo"
        >
          <QrCode className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onInsertSignatureLine}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
          title="Inserir Campo de Assinatura"
        >
          <Signature className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. GABARITO TOGGLE BUTTON */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleAnswerKey}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
            showAnswerKey
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
              : 'bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-500/40'
          }`}
          title={showAnswerKey ? 'Clique para Ocultar/Remover Gabarito para Impressão' : 'Clique para Exibir Gabarito'}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{showAnswerKey ? 'Gabarito Visível' : 'Remover Gabarito ⭐'}</span>
        </button>
      </div>
    </div>
  );
}
