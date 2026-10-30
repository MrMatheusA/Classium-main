import React, { useState, useEffect } from 'react';
import { 
  Settings, ShieldCheck, CheckCircle2, RefreshCw, Smartphone, 
  Sparkles, Key, Check, Copy, ExternalLink, FileCheck, Award, 
  AlertCircle, Sliders, Users, Layers, Lock, Laptop
} from 'lucide-react';
import { teacherSettingsService, TeacherSettings, DEFAULT_TEACHER_SETTINGS } from '../../services/teachers/teacherSettings.service';
import { supabase } from '../../lib/supabase';

export interface TeacherSettingsTabProps {
  teacherId?: string;
  teacherName?: string;
  organizationId?: string;
  selectedClass?: string;
  onSelectClass?: (classId: string) => void;
  classesList?: {
    id: string;
    name: string;
    room?: string;
    shift?: string;
    subject?: string;
    studentsCount?: number;
    isReference?: boolean;
    inProgress?: boolean;
  }[];
  onOpenShiftModal?: () => void;
}

export function TeacherSettingsTab({
  teacherId = '',
  teacherName = 'Professor Docente',
  organizationId = '',
  selectedClass,
  onSelectClass,
  classesList = [],
  onOpenShiftModal
}: TeacherSettingsTabProps) {
  const [settings, setSettings] = useState<TeacherSettings>({
    ...DEFAULT_TEACHER_SETTINGS,
    teacher_id: teacherId,
    organization_id: organizationId
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCopiedToken, setIsCopiedToken] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Load settings on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await teacherSettingsService.getSettings(teacherId, organizationId);
        setSettings(data);
      } catch (err) {
        console.warn('Erro ao carregar configurações:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [teacherId, organizationId]);

  // 2. Realtime WebSocket Subscription with Supabase
  useEffect(() => {
    const channel = supabase
      .channel(`realtime_settings_${teacherId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_settings' },
        (payload: any) => {
          if (payload.new && (payload.new.teacher_id === teacherId || !payload.new.teacher_id)) {
            setSettings(prev => ({ ...prev, ...payload.new }));
            showToast('⚡ Configurações sincronizadas em tempo real via Supabase!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId]);

  // 3. Handle toggle change
  const handleToggle = (key: keyof TeacherSettings) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      setHasUnsavedChanges(true);
      return updated;
    });
  };

  // 4. Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await teacherSettingsService.updateSettings(settings, teacherId, organizationId);
      if (res.success) {
        setHasUnsavedChanges(false);
        showToast('✓ Configurações salvas e propagadas no Supabase com sucesso!');
      } else {
        showToast('⚠️ Configurações salvas localmente.');
      }
    } catch (err: any) {
      showToast(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Reset to defaults
  const handleReset = async () => {
    if (!window.confirm('Deseja realmente restaurar todas as preferências para os valores padrão de fábrica?')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await teacherSettingsService.resetSettings(teacherId, organizationId);
      setSettings(res.settings);
      setHasUnsavedChanges(false);
      showToast('✓ Preferências restauradas com sucesso!');
    } catch (err: any) {
      showToast(`Erro ao restaurar: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // 6. Copy token to clipboard
  const handleCopyToken = () => {
    navigator.clipboard.writeText(settings.digital_signature_token || 'SHA256: 7F9A-4E12-B890-C81D-2026');
    setIsCopiedToken(true);
    setTimeout(() => setIsCopiedToken(false), 2000);
    showToast('Token de assinatura copiado para a área de transferência!');
  };

  // 7. Test Digital Signature Certificate with ICP-Brasil
  const handleValidateCertificate = async () => {
    setIsValidatingToken(true);
    try {
      const res = await teacherSettingsService.validateDigitalSignature(settings.digital_signature_token);
      setValidationResult(res);
      setShowCertModal(true);
    } catch (err) {
      showToast('Erro ao validar certificado.');
    } finally {
      setIsValidatingToken(false);
    }
  };

  // Classes passed from parent or active state
  const activeClasses = classesList;

  return (
    <div className="space-y-6 text-left animate-fade-in relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#0a1835] border border-gold/40 px-4 py-3 rounded-2xl shadow-2xl text-gold font-bold text-xs flex items-center gap-2 animate-bounce no-print">
          <Sparkles className="w-4 h-4 text-gold shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Certificate Validation Modal */}
      {showCertModal && validationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="bg-[#0b1736] border border-gold/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-left space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-serif text-sm font-bold text-white uppercase tracking-wider">
                  Certificado Digital ICP-Brasil Validado
                </h3>
              </div>
              <button 
                onClick={() => setShowCertModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Autoridade Certificadora:</span>
                <span className="font-bold text-emerald-300">{validationResult.issuer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status da Chave:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                  {validationResult.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Número de Série:</span>
                <span className="font-mono text-gray-300">{validationResult.serialNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Algoritmo Criptográfico:</span>
                <span className="font-mono text-gray-300">{validationResult.algorithm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Validade Jurídica:</span>
                <span className="font-mono text-emerald-400 font-bold">Até 31/12/2027</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-300 font-light leading-relaxed">
              Este certificado está em conformidade com a MP 2.200-2/2001 e a Lei 14.063/2020. Todos os diários de classe, frequências e pareceres gerados contam com carimbo de tempo inviolável.
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowCertModal(false)}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANNER PRINCIPAL: Configurações do Portal Classium Professor */}
      <div className="bg-[#0e2149] p-6 rounded-3xl border border-gold/15 shadow-xl">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="p-1.5 bg-amber-500/10 rounded-xl border border-amber-500/30 text-gold">
            <Settings className="w-5 h-5 text-gold" />
          </span>
          <h3 className="text-base font-serif font-bold text-white">
            Configurações do Portal Classium Professor
          </h3>
          <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
            Preferências do Docente
          </span>
        </div>
        <p className="text-xs text-gray-300 max-w-4xl font-light leading-relaxed">
          Personalize sua experiência de uso no diário de classe. Modifique parâmetros de visualização, notificações automáticas para os familiares e integre suas turmas com a Base Nacional Comum Curricular (BNCC).
        </p>
      </div>

      {/* 3. GRID PRINCIPAL (2 COLUNAS CONFORME IMAGEM 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: Preferências de Visualização e Filtros (Col 7) */}
        <div className="lg:col-span-7 bg-[#09152f] border border-gold/15 p-6 rounded-3xl space-y-6 shadow-xl">
          <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
            <h4 className="font-serif text-sm font-bold text-gold">
              Preferências de Visualização e Filtros
            </h4>
            {hasUnsavedChanges && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold animate-pulse">
                ● Alterações não salvas
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            {/* Toggle 1: Efeito Ultra Glassmorphism */}
            <div className="flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.03] p-3.5 rounded-2xl border border-white/5 transition-all">
              <div className="max-w-[80%]">
                <span className="text-xs font-bold text-white block">Efeito Ultra Glassmorphism</span>
                <span className="text-[10px] text-gray-400 font-light block mt-0.5 leading-relaxed">
                  Ativa fundos translúcidos premium e desfoques de alta fidelidade baseados em hardware.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('ultra_glassmorphism')}
                className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors cursor-pointer ${
                  settings.ultra_glassmorphism 
                    ? 'bg-[#881337] justify-end border border-rose-500/40' 
                    : 'bg-slate-800 justify-start border border-slate-700'
                }`}
                title={settings.ultra_glassmorphism ? 'Ativado' : 'Desativado'}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform"></div>
              </button>
            </div>

            {/* Toggle 2: Brilho Pulsante nas Carteiras */}
            <div className="flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.03] p-3.5 rounded-2xl border border-white/5 transition-all">
              <div className="max-w-[80%]">
                <span className="text-xs font-bold text-white block">Brilho Pulsante nas Carteiras</span>
                <span className="text-[10px] text-gray-400 font-light block mt-0.5 leading-relaxed">
                  Adiciona efeito neon em tempo real na visão 3D para indicar alunos que necessitam de apoio especial (AEE).
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('pulsing_seat_glow')}
                className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors cursor-pointer ${
                  settings.pulsing_seat_glow 
                    ? 'bg-[#881337] justify-end border border-rose-500/40' 
                    : 'bg-slate-800 justify-start border border-slate-700'
                }`}
                title={settings.pulsing_seat_glow ? 'Ativado' : 'Desativado'}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform"></div>
              </button>
            </div>

            {/* Toggle 3: Envio em Lote via WhatsApp Web */}
            <div className="flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.03] p-3.5 rounded-2xl border border-white/5 transition-all">
              <div className="max-w-[80%]">
                <span className="text-xs font-bold text-white block">Envio em Lote via WhatsApp Web</span>
                <span className="text-[10px] text-gray-400 font-light block mt-0.5 leading-relaxed">
                  Sincroniza todas as ocorrências e notas de forma consolidada no final do turno para evitar dezenas de mensagens isoladas aos pais.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('send_whatsapp_messages')}
                className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors cursor-pointer ${
                  settings.send_whatsapp_messages 
                    ? 'bg-[#152e1f] border border-emerald-500/35 justify-end' 
                    : 'bg-slate-800 border border-slate-700 justify-start'
                }`}
                title={settings.send_whatsapp_messages ? 'Ativado' : 'Desativado'}
              >
                <div className={`w-4 h-4 rounded-full shadow-md ${settings.send_whatsapp_messages ? 'bg-emerald-400' : 'bg-gray-400'}`}></div>
              </button>
            </div>

            {/* Toggle 4: Ocultar Alunos Ghost / Incompletos */}
            <div className="flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.03] p-3.5 rounded-2xl border border-white/5 transition-all">
              <div className="max-w-[80%]">
                <span className="text-xs font-bold text-white block">Ocultar Alunos Ghost / Incompletos</span>
                <span className="text-[10px] text-gray-400 font-light block mt-0.5 leading-relaxed">
                  Remove temporariamente da visão 3D e da chamada alunos em processo de transferência ou com dados pendentes.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('show_ghost_students')}
                className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors cursor-pointer ${
                  settings.show_ghost_students 
                    ? 'bg-[#881337] justify-end border border-rose-500/40' 
                    : 'bg-slate-800 justify-start border border-slate-700'
                }`}
                title={settings.show_ghost_students ? 'Ativado' : 'Desativado'}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform"></div>
              </button>
            </div>

            {/* Toggle 5: Botão Padrão na Chamada Rápida */}
            <div className="flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.03] p-3.5 rounded-2xl border border-white/5 transition-all">
              <div className="max-w-[80%]">
                <span className="text-xs font-bold text-white block">Botão Padrão na Chamada Rápida</span>
                <span className="text-[10px] text-gray-400 font-light block mt-0.5 leading-relaxed">
                  Exibe o botão de presença rápida ("Todos Presentes") no diário de classe.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('show_quick_call')}
                className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors cursor-pointer ${
                  settings.show_quick_call 
                    ? 'bg-[#152e1f] border border-emerald-500/35 justify-end' 
                    : 'bg-slate-800 border border-slate-700 justify-start'
                }`}
                title={settings.show_quick_call ? 'Ativado' : 'Desativado'}
              >
                <div className={`w-4 h-4 rounded-full shadow-md ${settings.show_quick_call ? 'bg-emerald-400' : 'bg-gray-400'}`}></div>
              </button>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
            <button 
              type="button"
              onClick={handleReset}
              disabled={isResetting || isLoading}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 active:scale-95 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
            >
              {isResetting ? 'Restaurando...' : 'Restaurar Padrões'}
            </button>
            <button 
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-5 py-2.5 bg-gradient-to-r from-bordeaux to-rose-900 hover:brightness-110 active:scale-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA: ASSINATURA DIGITAL ICP-BRASIL (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#09152f] border border-gold/15 p-6 rounded-3xl space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h4 className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span>Assinatura Digital ICP-Brasil</span>
              </h4>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                Em Conformidade
              </span>
            </div>
            
            {/* Bloco de Detalhes da Certificadora */}
            <div className="p-4 bg-gold/5 rounded-2xl border border-gold/10 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Emissor Autorizado</span>
                <span className="font-bold text-white tracking-wide">
                  {settings.digital_signature_issuer || 'CLASSIUM CERTIFICADORA'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Validade Token</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {settings.digital_signature_expiry || 'Até 12/2027'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status Chave</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/35 text-emerald-400 text-[10px] font-bold font-mono">
                  {settings.digital_signature_status || 'ATIVO'}
                </span>
              </div>
            </div>

            {/* Token Hash com botão de cópia */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Chave Criptográfica / Token de Integridade
              </span>
              <div className="flex items-center justify-between p-2.5 bg-[#050c1e] border border-white/10 rounded-xl text-xs font-mono text-slate-300">
                <span className="truncate text-[11px] font-medium text-amber-200">
                  {settings.digital_signature_token || 'SHA256: 7F9A-4E12-B890-C81D-2026'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="p-1 hover:bg-white/10 text-gold rounded transition-colors ml-2 shrink-0 cursor-pointer"
                  title="Copiar Token"
                >
                  {isCopiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Texto Descritivo Oficial */}
            <div className="text-[11px] text-gray-400 leading-relaxed font-light">
              Seu token de assinatura eletrônica está validado. Todas as chamadas salvas e pareceres gerados recebem a estampa de integridade digital do docente de forma automática.
            </div>

            {/* Botão de Validação do Certificado */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleValidateCertificate}
                disabled={isValidatingToken}
                className="w-full py-2.5 bg-[#12244a] hover:bg-[#183163] active:scale-[0.99] border border-gold/30 text-gold hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Key className="w-3.5 h-3.5 text-gold" />
                <span>{isValidatingToken ? 'Validando...' : 'Validar Integridade ICP-Brasil'}</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 4. FOOTER INFORMATIVO OFICIAL CONFORME IMAGEM 1 */}
      <div className="pt-8 text-center no-print">
        <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
          PAINEL DE ADMINISTRAÇÃO DOCENTE E PEDAGÓGICA CLASSIUM PROFESSOR — CONEXÃO SEGURA TLS 1.3
        </p>
        <p className="text-[9px] text-slate-600 mt-0.5">
          Ambiente de uso exclusivo para docentes autorizados. Todas as ações neste diário geram trilhas auditadas de auditoria.
        </p>
      </div>
    </div>
  );
}
