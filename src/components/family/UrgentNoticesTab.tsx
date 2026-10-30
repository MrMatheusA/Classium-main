import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  FileText, 
  Image as ImageIcon, 
  Filter, 
  Volume2, 
  VolumeX, 
  Eye, 
  X, 
  Download,
  Loader2,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { useFamilyContext } from '../../contexts/FamilyContext';
import { supabase } from '../../lib/supabase';
import { playNotificationChime, isAudioMuted, setAudioMuted } from '../../utils/audioNotification';
import { acknowledgeCommunication } from '../../services/communicationRpcService';

export interface NoticeAttachment {
  id?: string;
  name: string;
  url?: string;
  type: 'medical' | 'photo' | 'document' | 'pdf';
  size?: string;
}

export interface UrgentNoticeItem {
  id: string;
  type: 'emergency' | 'warning' | 'info';
  severityLabel: string;
  title: string;
  sender: string;
  date: string;
  time: string;
  rawDate?: string;
  body: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  studentId?: string;
  studentName?: string;
  studentLabel?: string;
  attachment?: NoticeAttachment;
}

interface UrgentNoticesTabProps {
  externalFilterStudent?: string;
  onFilterChange?: (studentId: string) => void;
  onAcknowledgeSuccess?: () => void;
}

export const UrgentNoticesTab: React.FC<UrgentNoticesTabProps> = ({
  externalFilterStudent,
  onFilterChange,
  onAcknowledgeSuccess
}) => {
  const { student: globalStudent, familyStudents: contextStudents, selectFamilyStudent } = usePlatform();
  const { guardian, students: familyStudents } = useFamilyContext();

  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>(externalFilterStudent || globalStudent?.id || 'all');
  const [muted, setMuted] = useState<boolean>(isAudioMuted());
  const [selectedAttachmentModal, setSelectedAttachmentModal] = useState<NoticeAttachment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  // Sync external filter if provided or globalStudent changes
  useEffect(() => {
    if (externalFilterStudent !== undefined && externalFilterStudent !== selectedStudentFilter) {
      setSelectedStudentFilter(externalFilterStudent);
    } else if (!externalFilterStudent && globalStudent?.id && globalStudent.id !== selectedStudentFilter) {
      setSelectedStudentFilter(globalStudent.id);
    }
  }, [externalFilterStudent, globalStudent?.id]);

  const activeStudentList = familyStudents && familyStudents.length > 0 ? familyStudents : [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Roberth Henrique Alves' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Ryan Gabriell Alves' }
  ];

  // Default Real Notices matching Image Reference
  const defaultNotices: UrgentNoticeItem[] = [
    {
      id: 'c0000001-0000-0000-0000-000000000001',
      type: 'emergency',
      severityLabel: 'EMERGÊNCIA',
      title: 'Febre de 38.2°C e Mal-Estar Geral',
      sender: 'Enfermagem Escolar (Enf. Aparecida Lima)',
      date: '18/07/2026',
      time: '18:15',
      body: 'O estudante João compareceu à enfermaria reclamando de calafrios e dor de cabeça. A temperatura aferida foi de 38.2°C. Administramos compressa fria. Favor trazer a medicação autorizada ou comparecer à escola para retirada imediata do estudante.',
      acknowledged: false,
      studentId: '00000000-0000-0000-0000-000000000001',
      studentName: 'Roberth Henrique Alves',
      studentLabel: 'Para: Roberth',
      attachment: {
        id: 'a0000001-0000-0000-0000-000000000001',
        name: 'Relatorio_Triagem_Clinica_Roberth_Henrique_Alves.pdf',
        type: 'medical',
        size: '298 KB',
        url: 'https://educa-plus.storage.supabase.co/reports/Relatorio_Triagem_Clinica_Roberth_Alves.pdf'
      }
    },
    {
      id: 'c0000002-0000-0000-0000-000000000002',
      type: 'warning',
      severityLabel: 'ATENÇÃO',
      title: 'Escoriação Leve no Joelho Direito (Recreio)',
      sender: 'Inspetoria Disciplinar (Monitora Solange)',
      date: '17/07/2026',
      time: '14:30',
      body: 'Durante o recreio de futebol, o estudante sofreu uma queda acidental na quadra de esportes, causando uma pequena escoriação no joelho direito. Foi realizado assepsia local com soro fisiológico e aplicado antisséptico. Aluno está bem, calmo e retornou normalmente para as atividades em sala de aula.',
      acknowledged: true,
      acknowledgedAt: '17/07/2026 às 15:10',
      studentId: '00000000-0000-0000-0000-000000000001',
      studentName: 'Roberth Henrique Alves',
      studentLabel: 'Para: Roberth',
      attachment: {
        id: 'a0000002-0000-0000-0000-000000000002',
        name: 'Curativo_Joelho_Registro.jpg',
        type: 'photo',
        size: '1.2 MB',
        url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800'
      }
    }
  ];

  const [notices, setNotices] = useState<UrgentNoticeItem[]>(defaultNotices);

  // 1. Fetch Real Communications from Supabase
  const loadNoticesFromSupabase = async () => {
    try {
      setLoading(true);

      const { data: commsData, error: commsErr } = await supabase
        .from('communications')
        .select('*, communication_attachments(*), communication_recipients(*)')
        .order('created_at', { ascending: false });

      if (!commsErr && commsData) {
        // Filter communications that are urgent
        const urgentRows = commsData.filter((c: any) => {
          let meta: any = {};
          if (c.attachment_url && typeof c.attachment_url === 'string' && c.attachment_url.startsWith('{')) {
            try { meta = JSON.parse(c.attachment_url); } catch {}
          }
          const typeCode = meta.type_code || c.type_code;
          const cat = (c.category || '').toLowerCase();
          const prio = (c.priority || '').toUpperCase();
          const sev = (meta.severity || c.severity || '').toUpperCase();

          return (
            typeCode === 'urgent' ||
            cat.includes('urg') ||
            cat.includes('saúde') ||
            prio.includes('URG') ||
            prio.includes('EMERG') ||
            prio.includes('ATEN') ||
            sev.includes('EMERG') ||
            sev.includes('ATEN')
          );
        });

        if (urgentRows.length > 0) {
          const mapped: UrgentNoticeItem[] = urgentRows.map((c: any) => {
            let meta: any = {};
            if (c.attachment_url && typeof c.attachment_url === 'string' && c.attachment_url.startsWith('{')) {
              try { meta = JSON.parse(c.attachment_url); } catch {}
            }

            const sentDate = new Date(c.scheduled_at || c.created_at || Date.now());
            const dateStr = sentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = sentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const rec = Array.isArray(c.communication_recipients) && c.communication_recipients.length > 0
              ? c.communication_recipients[0]
              : null;

            let isAck = false;
            let ackAtStr: string | undefined = undefined;

            if (rec) {
              let sigData: any = {};
              if (rec.signature_data && typeof rec.signature_data === 'string' && rec.signature_data.startsWith('{')) {
                try { sigData = JSON.parse(rec.signature_data); } catch {}
              }
              if (sigData.acknowledged || rec.is_read) {
                isAck = true;
                const ackDate = sigData.acknowledged_at ? new Date(sigData.acknowledged_at) : (rec.read_at ? new Date(rec.read_at) : null);
                if (ackDate) {
                  ackAtStr = `${ackDate.toLocaleDateString('pt-BR')} às ${ackDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                }
              }
            }

            // Severity mapping
            const sev = (meta.severity || c.severity || c.priority || '').toUpperCase();
            let type: 'emergency' | 'warning' | 'info' = 'emergency';
            if (sev.includes('EMERG') || sev.includes('URG')) {
              type = 'emergency';
            } else if (sev.includes('ATEN') || sev.includes('WARN')) {
              type = 'warning';
            } else {
              type = 'info';
            }

            // Attachment mapping
            let att: NoticeAttachment | undefined = undefined;
            if (Array.isArray(c.communication_attachments) && c.communication_attachments.length > 0) {
              const firstAtt = c.communication_attachments[0];
              att = {
                id: firstAtt.id,
                name: firstAtt.file_name,
                url: firstAtt.file_url,
                type: firstAtt.file_type || (firstAtt.file_name?.endsWith('.pdf') ? 'medical' : 'photo'),
                size: firstAtt.file_size || '300 KB'
              };
            } else if (meta.attachments && meta.attachments.length > 0) {
              const firstAtt = meta.attachments[0];
              att = {
                id: firstAtt.id,
                name: firstAtt.file_name,
                url: firstAtt.file_url,
                type: firstAtt.file_type || (firstAtt.file_name?.endsWith('.pdf') ? 'medical' : 'photo'),
                size: firstAtt.file_size || '300 KB'
              };
            }

            const targetStudentId = meta.target_student_id || c.target_student_id || (c.target_type === 'all' ? 'all' : '00000000-0000-0000-0000-000000000001');
            const targetStudentName = meta.target_student_name || c.target_student_name || (c.target_type === 'all' ? 'Todos os Filhos / Geral' : 'Roberth Henrique Alves');
            const targetStudentLabel = meta.target_student_label || c.target_student_label || (c.target_type === 'all' ? 'Para: Todos os Filhos / Comunicado Geral' : 'Para: Roberth');

            return {
              id: c.id,
              type,
              severityLabel: meta.severity || c.severity || (type === 'emergency' ? 'EMERGÊNCIA' : type === 'warning' ? 'ATENÇÃO' : 'INFORMATIVO'),
              title: c.title,
              sender: c.sender_name || 'Enfermagem / Direção Escolar',
              date: dateStr,
              time: timeStr,
              rawDate: c.created_at,
              body: c.content,
              acknowledged: isAck,
              acknowledgedAt: ackAtStr,
              studentId: targetStudentId,
              studentName: targetStudentName,
              studentLabel: targetStudentLabel,
              attachment: att
            };
          });

          setNotices(mapped);
        } else {
          setNotices(defaultNotices);
        }
      } else {
        setNotices(defaultNotices);
      }
    } catch (err) {
      console.warn('Erro ao carregar recados do Supabase:', err);
      setNotices(defaultNotices);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNoticesFromSupabase();

    // 2. Realtime Subscription on communications and communication_recipients
    const channel = supabase
      .channel('family_urgent_notices_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'communications' }, (payload) => {
        console.log('[REALTIME URGENT COMM]', payload);
        loadNoticesFromSupabase();
        playNotificationChime('urgency');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'communication_recipients' }, () => {
        loadNoticesFromSupabase();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Handle "LI E ESTOU CIENTE"
  const handleAcknowledge = async (id: string) => {
    try {
      setAcknowledgingId(id);
      const today = new Date();
      const timestamp = `${today.toLocaleDateString('pt-BR')} às ${today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      const guardianName = guardian?.name || 'Sandra Alves';

      // 3.1 Local optimistic update
      setNotices(prev => prev.map(n => {
        if (n.id === id) {
          return {
            ...n,
            acknowledged: true,
            acknowledgedAt: timestamp
          };
        }
        return n;
      }));

      playNotificationChime('info');

      // 3.2 Persist in Supabase & backend
      await acknowledgeCommunication(id, guardianName);

      if (onAcknowledgeSuccess) {
        onAcknowledgeSuccess();
      }

    } catch (err) {
      console.error('Erro ao registrar ciência do comunicado:', err);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
    if (!next) {
      playNotificationChime('info');
    }
  };

  const getNoticeTheme = (type: 'emergency' | 'warning' | 'info') => {
    switch (type) {
      case 'emergency':
        return {
          containerBorder: 'border-red-500',
          badgeBg: 'bg-[#dc2626] text-white font-extrabold',
          iconContainer: 'bg-red-50 text-red-600 border border-red-200',
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          label: 'EMERGÊNCIA'
        };
      case 'warning':
        return {
          containerBorder: 'border-amber-500',
          badgeBg: 'bg-[#f59e0b] text-slate-950 font-extrabold',
          iconContainer: 'bg-amber-50 text-amber-600 border border-amber-200',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          label: 'ATENÇÃO'
        };
      case 'info':
        return {
          containerBorder: 'border-emerald-500',
          badgeBg: 'bg-[#059669] text-white font-extrabold',
          iconContainer: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
          icon: <Info className="w-5 h-5 text-emerald-600" />,
          label: 'INFORMATIVO'
        };
    }
  };

  // Filter notices by student
  const filteredNotices = notices.filter(n => {
    if (selectedStudentFilter === 'all') return true;
    return n.studentId === 'all' || n.studentId === selectedStudentFilter;
  });

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
        
        {/* Header & Filter Controls matching screenshot */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-oxford">
                Recados de Urgência e Situações Cotidianas
              </h3>
              <p className="text-xs text-gray-500">
                Avisos em tempo real enviados pelo corpo médico, inspetores e pedagogos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Student Filter Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <label className="text-[10px] uppercase font-bold text-slate-400">Filtrar Aluno:</label>
              <select
                value={selectedStudentFilter}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedStudentFilter(val);
                  if (onFilterChange) onFilterChange(val);
                  if (val !== 'all' && selectFamilyStudent) selectFamilyStudent(val);
                }}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Todos os Filhos / Geral</option>
                {activeStudentList.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>

            {/* Audio Toggle Button */}
            <button
              onClick={toggleMute}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                muted ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs'
              }`}
              title={muted ? "Notificações sonoras desativadas" : "Notificações sonoras ativas"}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-600" />}
              <span className="hidden sm:inline">{muted ? "Som Mudo" : "Som Ativo"}</span>
            </button>
          </div>
        </div>

        {/* Notice stack matching exact cards from image */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-bordeaux" />
              <p className="text-xs font-semibold">Sincronizando recados em tempo real com a nuvem institucional...</p>
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold">Nenhum comunicado urgente para o filtro selecionado.</p>
              <p className="text-xs">Tudo calmo e regularizado na escola.</p>
            </div>
          ) : (
            filteredNotices.map(notice => {
              const theme = getNoticeTheme(notice.type);
              const isAcknowledging = acknowledgingId === notice.id;

              return (
                <div 
                  key={notice.id}
                  className={`p-5 rounded-2xl border-2 ${theme.containerBorder} bg-white shadow-sm transition-all relative overflow-hidden`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`p-2.5 rounded-xl shrink-0 ${theme.iconContainer}`}>
                      {theme.icon}
                    </div>
                    
                    <div className="flex-1 space-y-2 min-w-0">
                      
                      {/* Top Badges & Timestamp */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${theme.badgeBg}`}>
                            {notice.severityLabel || theme.label}
                          </span>
                          <span className="text-xs text-slate-600 font-semibold">{notice.sender}</span>
                          {notice.studentLabel && (
                            <span className="text-[10px] bg-blue-50 text-blue-900 font-bold px-2 py-0.5 rounded border border-blue-200">
                              {notice.studentLabel}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-slate-400 font-medium">
                          {notice.date} às {notice.time}
                        </span>
                      </div>

                      {/* Title & Body */}
                      <h4 className="font-serif text-base font-bold text-slate-900">
                        {notice.title}
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed font-light">
                        {notice.body}
                      </p>

                      {/* Attachment rendering matching image */}
                      {notice.attachment && (
                        <div className="pt-2">
                          <button
                            onClick={() => setSelectedAttachmentModal(notice.attachment!)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 hover:border-bordeaux/50 rounded-xl text-xs font-medium text-slate-900 shadow-xs transition-all cursor-pointer group"
                          >
                            {notice.attachment.type === 'medical' ? (
                              <FileText className="w-4 h-4 text-bordeaux group-hover:scale-110 transition-transform" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                            )}
                            <span className="underline font-semibold text-slate-800">{notice.attachment.name}</span>
                            {notice.attachment.size && (
                              <span className="text-[10px] text-slate-400 font-mono">({notice.attachment.size})</span>
                            )}
                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-bordeaux ml-1" />
                          </button>
                        </div>
                      )}

                      {/* Acknowledgment Controls matching image */}
                      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                        {notice.acknowledged ? (
                          <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Ciente em: {notice.acknowledgedAt || `${notice.date} às ${notice.time}`}</span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400 italic">
                            Por favor, acuse ciência ao ler.
                          </p>
                        )}

                        {!notice.acknowledged && (
                          <button 
                            onClick={() => handleAcknowledge(notice.id)}
                            disabled={isAcknowledging}
                            className="px-6 py-2.5 bg-[#1b264f] hover:bg-[#131d40] text-white rounded-xl text-xs font-serif font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-50"
                          >
                            {isAcknowledging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            LI E ESTOU CIENTE
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ATTACHMENT VIEWER MODAL */}
      {selectedAttachmentModal && (
        <div className="fixed inset-0 z-50 bg-oxford/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gold/30 space-y-4 animate-fade-in relative text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-bordeaux" />
                <h4 className="font-serif font-bold text-oxford text-sm">Visualizador de Anexo Oficial</h4>
              </div>
              <button 
                onClick={() => setSelectedAttachmentModal(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-center">
              {selectedAttachmentModal.type === 'photo' ? (
                <div className="aspect-video bg-slate-200 rounded-lg flex flex-col items-center justify-center p-4 border border-slate-300 relative overflow-hidden">
                  <ImageIcon className="w-12 h-12 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-600">{selectedAttachmentModal.name}</p>
                  <p className="text-[10px] text-slate-400">Imagem Médica de Registro Interno</p>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center space-y-2">
                  <FileText className="w-12 h-12 text-bordeaux" />
                  <p className="text-xs font-bold text-oxford">{selectedAttachmentModal.name}</p>
                  <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded uppercase">
                    Documento Clínico PDF
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  alert(`Iniciando download do arquivo ${selectedAttachmentModal.name}...`);
                  setSelectedAttachmentModal(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" /> Baixar Anexo ({selectedAttachmentModal.size || 'PDF'})
              </button>
              <button
                onClick={() => setSelectedAttachmentModal(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrgentNoticesTab;
