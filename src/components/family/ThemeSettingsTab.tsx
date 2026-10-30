import React, { useState, useEffect } from 'react';
import { Palette, CheckCircle2, Sparkles, Sun, Moon, Shield, RefreshCw, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface ThemeConfig {
  id: string;
  name: string;
  category: 'dark' | 'light';
  description: string;
  previewBg: string;
  previewCard: string;
  previewAccent: string;
  previewText: string;
  containerClass: string;
  cardClass: string;
  accentClass: string;
  headerBg: string;
  activeBadge: string;
}

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'padrao',
    name: 'Padrão (Escuro/Verde)',
    category: 'dark',
    description: 'Interface escura elegante com acentos em verde esmeralda e alto contraste visual.',
    previewBg: '#0B0F19',
    previewCard: '#1E293B',
    previewAccent: '#059669',
    previewText: '#F8FAFC',
    containerClass: 'bg-[#0B0F19] text-slate-100',
    cardClass: 'bg-slate-900 border-slate-800 text-white',
    accentClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    headerBg: 'bg-slate-900/90 border-slate-800',
    activeBadge: 'bg-emerald-500 text-slate-950',
  },
  {
    id: 'vermelho_bordo',
    name: 'Vermelho Bordô',
    category: 'dark',
    description: 'Tema institucional nobre em tons bordô, oxford e detalhes dourados.',
    previewBg: '#1A0B12',
    previewCard: '#2D121F',
    previewAccent: '#D4AF37',
    previewText: '#FFFBF0',
    containerClass: 'bg-[#1A0B12] text-amber-50',
    cardClass: 'bg-[#2D121F] border-[#4A1D33] text-amber-50',
    accentClass: 'bg-[#8B1E3F] hover:bg-[#A3234B] text-amber-100 border border-[#D4AF37]/40',
    headerBg: 'bg-[#250D1B] border-[#4A1D33]',
    activeBadge: 'bg-[#D4AF37] text-slate-950 font-bold',
  },
  {
    id: 'verde_claro',
    name: 'Verde Claro',
    category: 'light',
    description: 'Visual moderno e suave em fundo hortelã claro com acentos florestais.',
    previewBg: '#F0FDF4',
    previewCard: '#FFFFFF',
    previewAccent: '#047857',
    previewText: '#064E3B',
    containerClass: 'bg-[#F0FDF4] text-emerald-950',
    cardClass: 'bg-white border-emerald-200/80 text-emerald-950 shadow-sm',
    accentClass: 'bg-emerald-700 hover:bg-emerald-600 text-white',
    headerBg: 'bg-white/90 border-emerald-200',
    activeBadge: 'bg-emerald-700 text-white',
  },
  {
    id: 'lilas_classico',
    name: 'Lilás Clássico',
    category: 'light',
    description: 'Layout aconchegante e contemporâneo com tons lavanda e violeta profundo.',
    previewBg: '#F5F3FF',
    previewCard: '#FFFFFF',
    previewAccent: '#6D28D9',
    previewText: '#3B0764',
    containerClass: 'bg-[#F5F3FF] text-purple-950',
    cardClass: 'bg-white border-purple-200/80 text-purple-950 shadow-sm',
    accentClass: 'bg-purple-700 hover:bg-purple-600 text-white',
    headerBg: 'bg-white/90 border-purple-200',
    activeBadge: 'bg-purple-700 text-white',
  },
  {
    id: 'preto_abrangente',
    name: 'Preto Abrangente',
    category: 'dark',
    description: 'Visual dark minimalista total em tom ônix/obsidiana com acentos em prata e ciano.',
    previewBg: '#000000',
    previewCard: '#121212',
    previewAccent: '#38BDF8',
    previewText: '#FFFFFF',
    containerClass: 'bg-black text-white',
    cardClass: 'bg-[#121212] border-zinc-800 text-white',
    accentClass: 'bg-zinc-100 hover:bg-white text-black font-bold',
    headerBg: 'bg-[#0A0A0A] border-zinc-800',
    activeBadge: 'bg-cyan-400 text-black font-bold',
  },
];

interface ThemeSettingsTabProps {
  currentThemeId: string;
  onSelectTheme: (themeId: string) => void;
}

export function ThemeSettingsTab({ currentThemeId, onSelectTheme }: ThemeSettingsTabProps) {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const activeTheme = THEME_PRESETS.find(t => t.id === currentThemeId) || THEME_PRESETS[0];

  const handleApplyTheme = async (themeId: string) => {
    onSelectTheme(themeId);
    setSaving(true);
    setSaveMessage(null);

    try {
      // Save to localStorage immediately
      localStorage.setItem('family_portal_theme', themeId);

      // Save to Supabase user_preferences
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (userId) {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            theme_name: themeId,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (error) {
          console.warn('Erro ao salvar no Supabase user_preferences (usando fallback local):', error);
        }
      }

      // REST Backend dual-sync
      fetch('/api/family/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme_id: themeId,
          user_id: userId || 'default_family_user'
        })
      }).catch(() => {});

      setSaveMessage('Esquema de cores aplicado e sincronizado com sucesso!');
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (err) {
      console.error('Erro ao salvar tema:', err);
      setSaveMessage('Tema alterado localmente.');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-oxford to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#D4AF37] font-semibold text-xs uppercase tracking-widest mb-1">
              <Palette className="w-4 h-4" />
              <span>Personalização de Layout • Portal da Família</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-white">
              Esquemas de Cores e Temas Visuais
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Escolha a paleta de cores preferida da sua família. A personalização é salva e sincronizada em tempo real em todos os seus dispositivos.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-2xl shrink-0">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <div className="text-left">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Tema Ativo</span>
              <span className="text-xs font-bold text-[#D4AF37]">{activeTheme.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Message alert */}
      {saveMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs font-medium flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveMessage}</span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-emerald-900/60 px-2 py-0.5 rounded">Sincronizado</span>
        </div>
      )}

      {/* Grid of 5 Requested Themes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {THEME_PRESETS.map((theme) => {
          const isSelected = theme.id === currentThemeId;

          return (
            <div
              key={theme.id}
              onClick={() => handleApplyTheme(theme.id)}
              className={`group relative rounded-3xl p-5 border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-xl ${
                isSelected
                  ? 'border-[#D4AF37] bg-slate-900 text-white ring-4 ring-[#D4AF37]/20 scale-[1.02]'
                  : 'border-slate-200 hover:border-slate-400 bg-white text-slate-900'
              }`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {theme.category === 'dark' ? (
                      <Moon className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {theme.category === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D4AF37] text-black shadow-xs">
                      <Check className="w-3 h-3" />
                      Ativo
                    </span>
                  )}
                </div>

                {/* Title and Description */}
                <h3 className={`font-serif text-lg font-bold mb-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {theme.name}
                </h3>
                <p className={`text-xs mb-4 line-clamp-2 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                  {theme.description}
                </p>

                {/* Color Palette Visual Swatches */}
                <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 mb-4 space-y-2">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Amostra Visual</span>
                    <span className="text-[9px] text-[#D4AF37]">Paleta Oficial</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 h-10 rounded-xl overflow-hidden p-1 bg-slate-900 border border-slate-800">
                    <div 
                      className="h-full rounded-lg flex items-center justify-center text-[9px] font-bold shadow-inner" 
                      style={{ backgroundColor: theme.previewBg, color: theme.previewText }}
                      title="Fundo Principal"
                    >
                      Bg
                    </div>
                    <div 
                      className="h-full rounded-lg flex items-center justify-center text-[9px] font-bold shadow-inner" 
                      style={{ backgroundColor: theme.previewCard, color: theme.previewText }}
                      title="Cartão"
                    >
                      Card
                    </div>
                    <div 
                      className="h-full rounded-lg flex items-center justify-center text-[9px] font-bold shadow-inner" 
                      style={{ backgroundColor: theme.previewAccent, color: '#FFFFFF' }}
                      title="Acento Primário"
                    >
                      Btn
                    </div>
                    <div 
                      className="h-full rounded-lg flex items-center justify-center text-[9px] font-bold shadow-inner" 
                      style={{ backgroundColor: theme.previewText, color: theme.previewBg }}
                      title="Texto"
                    >
                      Txt
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApplyTheme(theme.id);
                }}
                disabled={saving}
                className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#D4AF37] hover:bg-[#c29f2f] text-black shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Esquema Selecionado</span>
                  </>
                ) : (
                  <>
                    <Palette className="w-4 h-4" />
                    <span>Aplicar Este Tema</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Info footer box */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#D4AF37] shrink-0" />
          <span>Suas preferências de tema são associadas à sua conta de responsável e persistem automaticamente nas suas próximas conexões.</span>
        </div>
      </div>

    </div>
  );
}
