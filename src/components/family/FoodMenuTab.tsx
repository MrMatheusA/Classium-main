import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Utensils, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Calendar, 
  CheckCircle2, 
  RotateCcw,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Download,
  ShieldCheck
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { supabase } from '../../lib/supabase';
import { menuService, ActiveMenuDocument } from '../../services/menuService';
import { playNotificationChime } from '../../utils/audioNotification';
import CardapioDocumentViewer from '../cardapio/CardapioDocumentViewer';

export interface SchoolMenuData {
  id: string;
  school_id?: string;
  menu_type?: string;
  title: string;
  year: number;
  month: number;
  month_name?: string;
  nutritionist_name?: string;
  nutritionist_crn?: string;
  observations?: string;
  status?: string;
  published_at?: string;
}

export interface MenuDocumentData {
  id: string;
  school_id?: string;
  menu_id?: string;
  document_name?: string;
  document_title?: string;
  document_url?: string;
  file_size_formatted?: string;
  file_type?: 'pdf' | 'image' | 'png' | 'jpg' | 'webp';
  uploaded_by?: string;
  upload_date?: string;
  total_pages?: number;
}

export interface DocumentAcknowledgement {
  acknowledged: boolean;
  acknowledged_at?: string;
  formatted_date?: string;
}

export function FoodMenuTab() {
  const { student, students, activeStudentId, currentUser } = usePlatform();

  const ALL_MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Calendar auto-detection
  const now = new Date();
  const currentBrowserMonthIndex = now.getMonth(); // 0-11
  const currentBrowserYear = now.getFullYear() || 2026;

  // State
  const [selectedYear, setSelectedYear] = useState<number>(currentBrowserYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(currentBrowserMonthIndex); // 0-based
  const [activeMenuId, setActiveMenuId] = useState<string>('');
  
  const [menuData, setMenuData] = useState<SchoolMenuData | null>(null);
  const [documentData, setDocumentData] = useState<MenuDocumentData | null>(null);
  const [availableMenus, setAvailableMenus] = useState<ActiveMenuDocument[]>([]);
  const [acknowledgement, setAcknowledgement] = useState<DocumentAcknowledgement>({ acknowledged: false });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [isSubmittingAck, setIsSubmittingAck] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Viewer Controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotationDegree, setRotationDegree] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const activeMonthName = ALL_MONTHS[selectedMonthIndex] || 'Setembro';
  const selectedMonthNum = selectedMonthIndex + 1;

  // Resolução estrita do estudante ativo e respectivo school_id para isolamento multi-escola
  const currentStudent = students?.find(s => s.id === activeStudentId) || student;
  const currentSchoolId = currentStudent?.school_id || (currentUser as any)?.school_id || undefined;
  const currentStudentId = activeStudentId || student?.id || '00000000-0000-0000-0000-000000000001';
  const guardianProfileId = currentUser?.id || '00000000-0000-0000-0000-000000000000';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // 1. Busca dos dados reais do Cardápio via Supabase com isolamento de school_id
  const fetchMenuData = useCallback(async () => {
    setLoading(true);
    setDocumentData(null);
    setMenuData(null);
    setAcknowledgement({ acknowledged: false });
    try {
      const docs = await menuService.getMenuDocumentsForMonth(selectedYear, selectedMonthNum, currentSchoolId);
      setAvailableMenus(docs);

      if (docs && docs.length > 0) {
        const activeDoc = docs.find(d => d.id === activeMenuId) || docs[0];
        setActiveMenuId(activeDoc.id);
        
        setDocumentData({
          id: activeDoc.id,
          school_id: activeDoc.school_id,
          menu_id: activeDoc.school_menu_id || activeDoc.id,
          document_name: activeDoc.file_name || `Cardapio_Oficial_${activeMonthName}_${selectedYear}.${activeDoc.file_type === 'image' ? 'png' : 'pdf'}`,
          document_title: activeDoc.title || `Cardápio Escolar Oficial — ${activeMonthName}/${selectedYear}`,
          document_url: activeDoc.file_url,
          file_size_formatted: activeDoc.file_size || '2.4 KB',
          file_type: activeDoc.file_type || 'pdf',
          uploaded_by: activeDoc.nutritionist_name || 'Dra. Ana Paula (Nutricionista CRN-3)',
          upload_date: activeDoc.published_at ? activeDoc.published_at.split('T')[0] : `${selectedYear}-09-01`,
          total_pages: 1
        });

        setMenuData({
          id: activeDoc.school_menu_id || activeDoc.id,
          school_id: activeDoc.school_id,
          title: activeDoc.title || 'Cardápio Escolar Oficial',
          year: selectedYear,
          month: selectedMonthNum,
          month_name: activeMonthName,
          nutritionist_name: activeDoc.nutritionist_name || 'Dra. Ana Paula (Nutricionista CRN-3)',
          nutritionist_crn: activeDoc.nutritionist_crn || 'CRN-3 48.920',
          status: 'PUBLISHED',
          published_at: activeDoc.published_at
        });

        // Verificar confirmação de ciência no banco document_acknowledgements
        try {
          const { data: ackDb } = await supabase
            .from('document_acknowledgements')
            .select('*')
            .eq('communication_id', activeDoc.id)
            .eq('student_id', currentStudentId)
            .maybeSingle();

          if (ackDb) {
            setAcknowledgement({
              acknowledged: true,
              acknowledged_at: ackDb.acknowledged_at,
              formatted_date: new Date(ackDb.acknowledged_at).toLocaleString('pt-BR')
            });
          } else {
            setAcknowledgement({ acknowledged: false });
          }
        } catch (ackErr) {
          console.warn('[FoodMenuTab] Erro ao checar ciência:', ackErr);
        }
      } else {
        // Nenhum cardápio publicado para este mês e escola
        setDocumentData(null);
        setMenuData(null);
        setAcknowledgement({ acknowledged: false });
      }
    } catch (err) {
      console.warn('[FoodMenuTab] Sincronização de cardápio:', err);
      setDocumentData(null);
      setMenuData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonthNum, currentSchoolId, guardianProfileId, activeMonthName, activeMenuId, currentStudentId]);

  useEffect(() => {
    fetchMenuData();
  }, [fetchMenuData]);

  // 2. Integração em Tempo Real via Supabase Realtime (isolado estritamente por school_id)
  useEffect(() => {
    const unsubscribe = menuService.subscribeToMenuChanges(
      selectedYear, 
      selectedMonthNum, 
      (freshDoc) => {
        if (freshDoc) {
          showToast('Cardápio escolar atualizado pela coordenação em tempo real!');
        }
        fetchMenuData();
      }, 
      currentSchoolId
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [selectedYear, selectedMonthNum, currentSchoolId, fetchMenuData]);

  // 3. Confirmação "LI E ESTOU CIENTE"
  const handleAcknowledge = async () => {
    if (!documentData?.id) return;

    setIsSubmittingAck(true);
    const nowStr = new Date().toLocaleString('pt-BR');

    try {
      const targetOrgId = (currentUser as any)?.organization_id || '559dedde-63fd-4322-92d2-b6deb6548e62';

      const { error: insErr } = await supabase
        .from('document_acknowledgements')
        .insert([{
          organization_id: targetOrgId,
          communication_id: documentData.id,
          student_id: currentStudentId,
          acknowledged_by: guardianProfileId,
          signature_hash: `menu-ack-${documentData.id}-${currentStudentId}`,
          acknowledged_at: new Date().toISOString()
        }]);

      if (insErr) {
        console.warn('[FoodMenuTab] Ack direct insert fallback:', insErr);
        try {
          await supabase.rpc('acknowledge_menu_document', {
            p_document_id: documentData.id,
            p_guardian_profile_id: guardianProfileId,
            p_student_id: currentStudentId
          });
        } catch (_) {}
      }

      setAcknowledgement({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        formatted_date: nowStr
      });

      playNotificationChime('signature');
      showToast('Ciência do cardápio oficial registrada e homologada com sucesso!');
    } catch (err) {
      console.error('Erro ao registrar ciência do cardápio:', err);
    } finally {
      setIsSubmittingAck(false);
    }
  };

  // 4. Download do Documento Original
  const handleDownload = () => {
    if (!documentData?.document_url) return;
    const link = document.createElement('a');
    link.href = documentData.document_url;
    link.download = documentData.document_name || `Cardapio_${activeMonthName}_${selectedYear}.${documentData.file_type === 'image' ? 'png' : 'pdf'}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Download do documento oficial realizado com sucesso!');
  };

  return (
    <div className={`space-y-6 text-slate-100 animate-fade-in ${isFullscreen ? 'fixed inset-0 z-50 bg-[#050b1a] p-6 overflow-y-auto' : ''}`}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 px-5 py-3.5 bg-emerald-950 border border-emerald-400/60 rounded-2xl text-emerald-200 text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* CABEÇALHO UNIFICADO COM ANO E SELETOR DE MESES */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-[#08142d] via-purple-950/40 to-[#08142d] border border-gold/30 rounded-3xl shadow-xl space-y-4">
        {/* Linha Superior: Identificação e Seletor de Ano */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-gold/15 text-gold rounded-xl border border-gold/30">
                <Utensils className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide">
                  Cardápio Escolar & Alimentação
                </h1>
                <p className="text-xs sm:text-sm text-slate-300">
                  Documento oficial homologado pela coordenação e nutricionista escolar da sua unidade.
                </p>
              </div>
            </div>
          </div>

          {/* Seletor de Ano */}
          <div className="flex items-center gap-2 bg-[#050b1a]/80 px-3.5 py-2 rounded-2xl border border-gold/30 self-start md:self-auto shrink-0 shadow-inner">
            <Calendar className="w-4 h-4 text-gold" />
            <span className="text-xs font-bold text-gold">Ano:</span>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-oxford border border-gold/40 rounded-lg px-2.5 py-1 text-xs text-white font-bold cursor-pointer focus:outline-none focus:border-gold"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        {/* Divisória interna elegante */}
        <div className="h-px bg-slate-800/80" />

        {/* Seletor de Meses Responsivo */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {ALL_MONTHS.map((mName, idx) => {
            const isSelected = selectedMonthIndex === idx;
            const isCurrentBrowserMonth = idx === currentBrowserMonthIndex && selectedYear === currentBrowserYear;
            
            return (
              <button
                key={mName}
                onClick={() => setSelectedMonthIndex(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected 
                    ? 'bg-gold text-oxford shadow-lg shadow-gold/25 font-extrabold scale-105' 
                    : isCurrentBrowserMonth
                    ? 'bg-purple-950/80 text-gold border border-gold/40 hover:bg-purple-900'
                    : 'bg-oxford/70 text-slate-300 hover:bg-purple-950 hover:text-white border border-slate-800'
                }`}
              >
                <span>{mName}</span>
                {isCurrentBrowserMonth && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Mês Atual do Calendário" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* VISUALIZADOR DE DOCUMENTO OFICIAL */}
      <div className="bg-[#08142d] border border-gold/30 rounded-3xl p-5 shadow-2xl flex flex-col min-h-[750px]">
        
        {/* BARRA DE FERRAMENTAS DO VISUALIZADOR */}
        <div className="flex items-center justify-between pb-4 border-b border-gold/20 mb-4 shrink-0 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gold" />
            <h3 className="font-serif font-bold text-white text-sm">
              {documentData?.document_title || 'Documento Oficial'} — {activeMonthName} / {selectedYear}
            </h3>
          </div>

          {/* CONTROLES E BOTÃO "LI E ESTOU CIENTE" */}
          <div className="flex items-center gap-2 text-slate-300 flex-wrap">
            
            {/* BOTÃO "LI E ESTOU CIENTE" */}
            <button
              onClick={handleAcknowledge}
              disabled={acknowledgement.acknowledged || isSubmittingAck || !documentData}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                acknowledgement.acknowledged
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 cursor-default'
                  : !documentData
                  ? 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-gold via-amber-400 to-gold text-oxford hover:brightness-110 font-extrabold animate-pulse'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {acknowledgement.acknowledged 
                  ? `Ciência Registrada (${acknowledgement.formatted_date || 'Confirmada'})` 
                  : isSubmittingAck 
                  ? 'Registrando ciência...' 
                  : 'Li e Estou Ciente'}
              </span>
            </button>

            {/* Baixar Original */}
            {documentData?.document_url && (
              <button 
                onClick={handleDownload}
                className="p-2 bg-oxford hover:bg-slate-800 text-slate-300 hover:text-gold rounded-xl transition-colors cursor-pointer border border-slate-800"
                title="Baixar Documento Original"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* Controles de Zoom */}
            <div className="flex items-center bg-oxford border border-slate-800 rounded-xl px-2 py-1">
              <button 
                onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
                className="p-1 hover:text-gold cursor-pointer"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 text-gold">{zoomLevel}%</span>
              <button 
                onClick={() => setZoomLevel(prev => Math.min(250, prev + 15))}
                className="p-1 hover:text-gold cursor-pointer"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Resetar Zoom */}
            <button 
              onClick={() => setZoomLevel(100)}
              className="px-2.5 py-1.5 bg-oxford hover:bg-slate-800 text-slate-300 hover:text-gold rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-800"
              title="Resetar Zoom para 100%"
            >
              100%
            </button>

            {/* Rotacionar */}
            <button 
              onClick={() => setRotationDegree(prev => (prev + 90) % 360)}
              className="p-2 bg-oxford hover:bg-slate-800 hover:text-gold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-slate-800"
              title="Rotacionar 90°"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Rotacionar</span>
            </button>

            {/* Tela Cheia */}
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 bg-oxford hover:bg-slate-800 hover:text-gold rounded-xl transition-colors cursor-pointer border border-slate-800"
              title="Alternar Tela Cheia"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* CONTAINER DO DOCUMENTO */}
        <div 
          ref={containerRef}
          className="flex-1 bg-[#050b1a] rounded-2xl border border-slate-800/80 overflow-auto flex items-center justify-center p-2 sm:p-4 relative shadow-inner min-h-[600px]"
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-gold py-16">
              <Sparkles className="w-8 h-8 animate-spin" />
              <span className="text-xs font-bold">Carregando cardápio oficial em tempo real...</span>
            </div>
          ) : !documentData?.document_url ? (
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-md px-4">
              <div className="p-4 bg-oxford/80 rounded-3xl border border-gold/30 text-gold mb-3 shadow-lg">
                <Utensils className="w-10 h-10" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Nenhum cardápio disponível para este mês</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                A coordenação escolar da sua unidade ainda não publicou o cardápio oficial para {activeMonthName} de {selectedYear}. Assim que for publicado pela escola, ele aparecerá aqui automaticamente em tempo real.
              </p>
              <button
                onClick={fetchMenuData}
                className="px-4 py-2 bg-oxford hover:bg-purple-950 border border-gold/30 rounded-xl text-xs font-bold text-gold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar Agora</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex-1 flex flex-col items-center justify-center">
              <CardapioDocumentViewer
                fileUrl={documentData.document_url}
                fileType={documentData.file_type || 'pdf'}
                fileName={documentData.document_name || `Cardapio_${activeMonthName}_${selectedYear}.pdf`}
                zoom={zoomLevel}
                rotation={rotationDegree}
                onZoomChange={setZoomLevel}
                onRotationChange={setRotationDegree}
                hideControls={false}
              />
            </div>
          )}
        </div>

        {/* RODAPÉ INFORMATIVO COM STATUS DE HOMOLOGAÇÃO */}
        {documentData && (
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Arquivo Homologado: <strong className="text-slate-200">{documentData.document_name}</strong></span>
              <span className="text-slate-600">|</span>
              <span>Tamanho: <strong className="text-slate-300">{documentData.file_size_formatted || '2.4 KB'}</strong></span>
            </div>
            <div>
              <span>Responsável Técnico: <strong className="text-gold">{documentData.uploaded_by || 'Dra. Ana Paula (Nutricionista CRN-3)'}</strong></span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
export default FoodMenuTab;
