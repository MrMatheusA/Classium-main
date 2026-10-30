import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  Calendar, 
  MessageSquare, 
  Filter, 
  Volume2, 
  VolumeX, 
  Settings, 
  CheckCircle, 
  CheckCircle2, 
  Clock, 
  PenTool, 
  FileText, 
  Eye, 
  Download, 
  X, 
  MapPin, 
  Check, 
  RefreshCw, 
  Bell, 
  Sliders, 
  Radio, 
  Sparkles,
  Volume1,
  FileSignature
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { useFamilyContext } from '../../contexts/FamilyContext';
import { supabase } from '../../lib/supabase';
import { 
  getAudioPreferences, 
  updateAudioPreferences, 
  isAudioMuted, 
  setAudioMuted, 
  playUrgentSound, 
  playSignatureSound, 
  playConvocationSound, 
  playInfoSound, 
  playNotificationChime,
  hasNotificationSoundBeenPlayed,
  markNotificationSoundPlayed,
  AudioPreferences
} from '../../utils/audioNotification';
import { 
  getWebPushStatus, 
  requestNotificationPermission, 
  showBrowserNotification, 
  WebPushStatus 
} from '../../services/webPushNotificationService';
import { 
  acknowledgeCommunication, 
  signCommunicationDocument, 
  respondConvocation 
} from '../../services/communicationRpcService';
import { UrgentNoticesTab } from './UrgentNoticesTab';

export interface SignatureDocItem {
  id: string;
  title: string;
  description: string;
  date: string;
  dueDate?: string;
  signed: boolean;
  signedBy?: string;
  signatureDate?: string;
  studentName?: string;
  studentId?: string;
  studentLabel?: string;
  cost?: string;
  documentUrl?: string;
}

export interface ConvocationItem {
  id: string;
  title: string;
  reason: string;
  date: string;
  time: string;
  location: string;
  contactName: string;
  contactRole: string;
  studentName?: string;
  studentId?: string;
  studentLabel?: string;
  status: 'pending' | 'confirmed' | 'justified' | 'reschedule_requested';
  justificationText?: string;
  rescheduleSuggestion?: string;
  respondedAt?: string;
}

export interface InformativoItem {
  id: string;
  title: string;
  sender: string;
  date: string;
  time?: string;
  body: string;
  category?: string;
  summary?: string;
  fullContent?: string;
  tag?: string;
  requiresAcknowledgment?: boolean;
  acknowledged: boolean;
  acknowledgedAt?: string;
  author?: string;
  authorRole?: string;
  studentId?: string;
  studentName?: string;
  studentLabel?: string;
}

export function CentralComunicacaoTab() {
  const { student: globalStudent, familyStudents: contextStudents, selectFamilyStudent } = usePlatform();
  const { guardian, students: familyStudents } = useFamilyContext();

  const [activeSubTab, setActiveSubTab] = useState<'urgentes' | 'assinaturas' | 'convocacoes' | 'informativos'>('urgentes');
  const [muted, setMuted] = useState<boolean>(isAudioMuted());
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>(globalStudent?.id || 'all');
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  // Sync selectedStudentFilter whenever globalStudent changes from header / PlatformContext
  useEffect(() => {
    if (globalStudent?.id && globalStudent.id !== selectedStudentFilter) {
      setSelectedStudentFilter(globalStudent.id);
    }
  }, [globalStudent?.id]);

  // Audio & Notification Settings Modal State
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false);
  const [audioPrefs, setAudioPrefs] = useState<AudioPreferences>(getAudioPreferences());
  const [pushStatus, setPushStatus] = useState<WebPushStatus | null>(null);

  const activeStudentList = familyStudents && familyStudents.length > 0 ? familyStudents : [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Roberth Henrique Alves' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Ryan Gabriell Alves' }
  ];

  const [urgentCount, setUrgentCount] = useState<number>(1);

  // --- STATE 1: ASSINATURAS ---
  const [signatureDocs, setSignatureDocs] = useState<SignatureDocItem[]>([
    {
      id: 'c0000006-0000-0000-0000-000000000006',
      title: 'Autorização para Aula de Campo - Museu de Ciência e Tecnologia',
      description: 'Autorização legal para deslocamento em ônibus escolar monitorado, com saída às 08:00h e retorno previsto para as 16:30h. Inclui seguro viagem e almoço coletivo supervisionado.',
      date: '10/08/2026',
      dueDate: '30/08/2026',
      signed: false,
      studentName: 'Roberth Henrique Alves',
      studentId: '00000000-0000-0000-0000-000000000001',
      studentLabel: 'Para: Roberth',
      cost: 'Gratuito',
      documentUrl: 'https://educa-plus.storage.supabase.co/docs/Termo_Aula_Campo.pdf'
    },
    {
      id: 'doc-auth-2',
      title: 'Termo de Cessão e Autorização de Uso de Imagem Institucional 2026/2027',
      description: 'Termo que autoriza a veiculação de fotos e vídeos em atividades pedagógicas, feiras culturais e redes sociais oficiais da escola.',
      date: '01/08/2026',
      dueDate: '20/08/2026',
      signed: false,
      studentName: 'Ryan Gabriell Alves',
      studentId: '00000000-0000-0000-0000-000000000002',
      studentLabel: 'Para: Ryan',
      cost: 'Gratuito'
    },
    {
      id: 'doc-auth-3',
      title: 'Ficha de Atualização Médica e Fisioterápica - Educação Física',
      description: 'Declaração de aptidão física e especificação de alergias ou contraindicações para práticas esportivas do segundo semestre.',
      date: '25/06/2026',
      signed: true,
      signedBy: guardian?.name || 'Sandra Alves',
      signatureDate: '26/06/2026 às 14:20',
      studentName: 'Roberth Henrique Alves',
      studentId: '00000000-0000-0000-0000-000000000001',
      studentLabel: 'Para: Roberth'
    }
  ]);

  // --- STATE 2: CONVOCAÇÕES ---
  const [convocations, setConvocations] = useState<ConvocationItem[]>([
    {
      id: 'c0000004-0000-0000-0000-000000000004',
      title: 'Reunião Individual de Acompanhamento e Alinhamento Pedagógico',
      reason: 'Discussão do acompanhamento de rendimento escolar, desenvolvimento socioemocional e plano de apoio pedagógico individualizado.',
      date: '25/08/2026',
      time: '14:30',
      location: 'Sala de Reuniões Pedagógicas - Bloco B',
      contactName: 'Profa. Elaine Santos',
      contactRole: 'Pedagoga e Orientadora Educacional',
      studentName: 'Roberth Henrique Alves',
      studentId: '00000000-0000-0000-0000-000000000001',
      studentLabel: 'Para: Roberth',
      status: 'pending'
    },
    {
      id: 'c0000005-0000-0000-0000-000000000005',
      title: 'Plantão de Atendimento às Famílias — 3º Trimestre',
      reason: 'Encontro coletivo com os professores das disciplinas de Ciências da Natureza e Matemática para alinhamento de estratégias de reforço.',
      date: '28/08/2026',
      time: '17:00',
      location: 'Auditório Principal',
      contactName: 'Diretoria de Ensino',
      contactRole: 'Diretoria Escolar',
      studentName: 'Todos os Filhos / Geral',
      studentId: 'all',
      studentLabel: 'Para: Todos os Filhos / Geral',
      status: 'pending'
    }
  ]);

  // --- STATE 3: INFORMATIVOS ---
  const [informativosList, setInformativosList] = useState<InformativoItem[]>([
    {
      id: 'c0000003-0000-0000-0000-000000000003',
      title: 'Recomendação de Agasalho e Garrafa Térmica',
      sender: 'Coordenação Geral',
      date: '16/07/2026',
      time: '08:00',
      body: 'Devido à forte frente fria que atingirá nossa região nos próximos dias, solicitamos aos responsáveis que enviem os estudantes devidamente agasalhados com o uniforme oficial da escola e que tragam suas garrafinhas térmicas com água, de modo a evitar o compartilhamento direto de bebedouros.',
      acknowledged: true,
      acknowledgedAt: '16/07/2026 às 09:45',
      studentId: 'all',
      studentName: 'Todos os Filhos / Comunicado Geral',
      studentLabel: 'Para: Todos os Filhos / Comunicado Geral'
    },
    {
      id: 'inf-1',
      title: 'Início do Período de Inscrições para a Feira de Ciências e Robótica 2026',
      sender: 'Coordenação de Tecnologia & Inovação',
      date: '12/08/2026',
      time: '09:00',
      body: 'Estão abertas as inscrições para as equipes da Feira de Ciências. Os estudantes interessados devem formar grupos de até 4 integrantes e apresentar a proposta inicial ao professor orientador.',
      acknowledged: false,
      studentId: 'all',
      studentName: 'Todos os Filhos / Geral',
      studentLabel: 'Para: Todos os Filhos / Geral'
    },
    {
      id: 'inf-2',
      title: 'Comunicado sobre o Recesso Escolar do Dia do Estudante',
      sender: 'Secretaria Geral',
      date: '08/08/2026',
      time: '10:00',
      body: 'Lembramos a todas as famílias que na próxima segunda-feira não haverá aula em virtude do Recesso Acadêmico Programado. As atividades administrativas funcionarão em plantão.',
      acknowledged: true,
      acknowledgedAt: '08/08/2026 às 10:15',
      studentId: 'all',
      studentName: 'Todos os Filhos / Geral',
      studentLabel: 'Para: Todos os Filhos / Geral'
    }
  ]);

  // Load Push status on mount
  useEffect(() => {
    getWebPushStatus().then(setPushStatus);
  }, []);

  // Load all communication types from Supabase
  const loadCommsFromSupabase = async () => {
    try {
      setLoadingStats(true);
      const { data, error } = await supabase
        .from('communications')
        .select('*, communication_attachments(*), communication_recipients(*)')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // 1. Calculate urgent count
        const urgentPending = data.filter((c: any) => {
          let meta: any = {};
          if (c.attachment_url && typeof c.attachment_url === 'string' && c.attachment_url.startsWith('{')) {
            try { meta = JSON.parse(c.attachment_url); } catch {}
          }
          const typeCode = meta.type_code || c.type_code;
          const cat = (c.category || '').toLowerCase();
          const prio = (c.priority || '').toUpperCase();
          const sev = (meta.severity || c.severity || '').toUpperCase();
          const isUrgent = typeCode === 'urgent' || cat.includes('urg') || cat.includes('saúde') || prio.includes('URG') || prio.includes('EMERG') || prio.includes('ATEN') || sev.includes('EMERG') || sev.includes('ATEN');
          if (!isUrgent) return false;

          const rec = Array.isArray(c.communication_recipients) && c.communication_recipients.length > 0 ? c.communication_recipients[0] : null;
          if (!rec) return true;
          let sigData: any = {};
          if (rec.signature_data && typeof rec.signature_data === 'string' && rec.signature_data.startsWith('{')) {
            try { sigData = JSON.parse(rec.signature_data); } catch {}
          }
          return !rec.is_read && !sigData.acknowledged && !rec.is_acknowledged;
        }).length;
        setUrgentCount(urgentPending);

        // 2. Parse signature documents
        const sigItems = data.filter((c: any) => {
          let meta: any = {};
          if (c.attachment_url && typeof c.attachment_url === 'string' && c.attachment_url.startsWith('{')) {
            try { meta = JSON.parse(c.attachment_url); } catch {}
          }
          return c.type_code === 'signature' || c.requires_signature || meta.type_code === 'signature' || meta.requires_signature || c.category === 'signature';
        });

        if (sigItems.length > 0) {
          const parsedSignatures: SignatureDocItem[] = sigItems.map((c: any) => {
            let meta: any = {};
            if (c.attachment_url && typeof c.attachment_url === 'string' && c.attachment_url.startsWith('{')) {
              try { meta = JSON.parse(c.attachment_url); } catch {}
            }

            const rec = Array.isArray(c.communication_recipients) && c.communication_recipients.length > 0 ? c.communication_recipients[0] : null;
            const sentD = new Date(c.scheduled_at || c.created_at || Date.now());
            const dateStr = sentD.toLocaleDateString('pt-BR');
            let dueStr: string | undefined = undefined;
            const rawDue = meta.due_date || c.due_date;
            if (rawDue) {
              const dD = new Date(rawDue);
              dueStr = dD.toLocaleDateString('pt-BR');
            }

            let isSigned = false;
            let signedByName: string | undefined = undefined;
            let sigDateStr: string | undefined = undefined;

            if (rec) {
              let sigData: any = {};
              if (rec.signature_data && typeof rec.signature_data === 'string' && rec.signature_data.startsWith('{')) {
                try { sigData = JSON.parse(rec.signature_data); } catch {}
              }
              if (sigData.signed || rec.is_signed) {
                isSigned = true;
                signedByName = sigData.signer_name || rec.signed_by_name || 'Responsável Legal';
                const sDate = sigData.signed_at ? new Date(sigData.signed_at) : (rec.signed_at ? new Date(rec.signed_at) : null);
                if (sDate) {
                  sigDateStr = `${sDate.toLocaleDateString('pt-BR')} às ${sDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                }
              }
            }

            let docUrl: string | undefined = undefined;
            if (Array.isArray(c.communication_attachments) && c.communication_attachments.length > 0) {
              docUrl = c.communication_attachments[0].file_url;
            } else if (meta.attachments && meta.attachments.length > 0) {
              docUrl = meta.attachments[0].file_url;
            }

            return {
              id: c.id,
              title: c.title,
              description: c.content,
              date: dateStr,
              dueDate: dueStr || rawDue || undefined,
              signed: isSigned,
              signedBy: signedByName,
              signatureDate: sigDateStr,
              studentName: meta.target_student_name || c.target_student_name || 'Roberth Henrique Alves',
              studentId: meta.target_student_id || c.target_student_id || '00000000-0000-0000-0000-000000000001',
              studentLabel: meta.target_student_label || c.target_student_label || 'Para: Roberth',
              cost: meta.cost || c.cost || 'Gratuito',
              documentUrl: docUrl
            };
          });
          setSignatureDocs(parsedSignatures);
        }

        // 3. Parse convocations
        const convItems = data.filter((c: any) => {
          let meta: any = {};
          if (c.attachment_url && typeof c.attachment_url === 'string' && c.attachment_url.startsWith('{')) {
            try { meta = JSON.parse(c.attachment_url); } catch {}
          }
          return c.type_code === 'convocation' || meta.type_code === 'convocation' || c.category === 'convocation';
        });

        if (convItems.length > 0) {
          const parsedConvs: ConvocationItem[] = convItems.map((c: any) => {
            let meta: any = {};
            if (c.attachment_url && typeof c.attachment_url === 'string' && c.attachment_url.startsWith('{')) {
              try { meta = JSON.parse(c.attachment_url); } catch {}
            }

            const rec = Array.isArray(c.communication_recipients) && c.communication_recipients.length > 0 ? c.communication_recipients[0] : null;
            let status: ConvocationItem['status'] = 'pending';
            let justText: string | undefined = undefined;
            let reschedText: string | undefined = undefined;
            let respAtStr: string | undefined = undefined;

            if (rec) {
              let sigData: any = {};
              if (rec.signature_data && typeof rec.signature_data === 'string' && rec.signature_data.startsWith('{')) {
                try { sigData = JSON.parse(rec.signature_data); } catch {}
              }
              const st = sigData.convocation_status || rec.convocation_status;
              if (st === 'confirmed') status = 'confirmed';
              else if (st === 'justified') status = 'justified';
              else if (st === 'rescheduled') status = 'reschedule_requested';

              justText = sigData.justification || rec.justification_text || rec.justification || undefined;
              reschedText = sigData.reschedule_suggestion || rec.reschedule_suggestion || undefined;
              if (sigData.responded_at || rec.read_at) {
                const rDate = new Date(sigData.responded_at || rec.read_at);
                respAtStr = `${rDate.toLocaleDateString('pt-BR')} às ${rDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
              }
            }

            const evDate = meta.event_date || c.scheduled_date || c.event_date;
            const evDateFormatted = evDate ? new Date(evDate).toLocaleDateString('pt-BR') : '25/08/2026';

            return {
              id: c.id,
              title: c.title,
              reason: c.content,
              date: evDateFormatted,
              time: meta.event_time || c.scheduled_time || c.event_time || '14:30',
              location: meta.event_location || c.location || c.event_location || 'Sala de Reuniões Pedagógicas - Bloco B',
              contactName: c.sender_name || 'Coordenação Pedagógica',
              contactRole: c.sender_role || 'Orientadora Educacional',
              studentName: meta.target_student_name || c.target_student_name || 'Roberth Henrique Alves',
              studentId: meta.target_student_id || c.target_student_id || '00000000-0000-0000-0000-000000000001',
              studentLabel: meta.target_student_label || c.target_student_label || 'Para: Roberth',
              status,
              justificationText: justText,
              rescheduleSuggestion: reschedText,
              respondedAt: respAtStr
            };
          });
          setConvocations(parsedConvs);
        }

        // 4. Parse informativos
        const infoItems = data.filter((c: any) => {
          let meta: any = {};
          if (c.attachment_url && typeof c.attachment_url === 'string' && c.attachment_url.startsWith('{')) {
            try { meta = JSON.parse(c.attachment_url); } catch {}
          }
          const tc = meta.type_code || c.type_code;
          return tc === 'info' || (tc !== 'convocation' && tc !== 'signature' && !c.requires_signature && !meta.requires_signature && tc !== 'urgent');
        });

        if (infoItems.length > 0) {
          const parsedInfos: InformativoItem[] = infoItems.map((c: any) => {
            let meta: any = {};
            if (c.attachment_url && typeof c.attachment_url === 'string' && c.attachment_url.startsWith('{')) {
              try { meta = JSON.parse(c.attachment_url); } catch {}
            }

            const rec = Array.isArray(c.communication_recipients) && c.communication_recipients.length > 0 ? c.communication_recipients[0] : null;
            const sentDate = c.scheduled_at || c.created_at;
            const dateFormatted = sentDate ? new Date(sentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Hoje';
            
            let isAck = false;
            let ackDateStr: string | undefined = undefined;
            if (rec) {
              let sigData: any = {};
              if (rec.signature_data && typeof rec.signature_data === 'string' && rec.signature_data.startsWith('{')) {
                try { sigData = JSON.parse(rec.signature_data); } catch {}
              }
              if (rec.is_read || rec.is_acknowledged || sigData.acknowledged) {
                isAck = true;
                const d = sigData.acknowledged_at ? new Date(sigData.acknowledged_at) : (rec.acknowledged_at ? new Date(rec.acknowledged_at) : (rec.read_at ? new Date(rec.read_at) : null));
                if (d) {
                  ackDateStr = `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                }
              }
            }

            return {
              id: c.id,
              title: c.title,
              sender: c.sender_name || 'Coordenação Geral',
              body: c.content || '',
              date: dateFormatted,
              category: c.category || 'Informativo Geral',
              summary: (c.content || '').replace(/<[^>]*>?/gm, '').substring(0, 160) + '...',
              fullContent: c.content || '',
              tag: c.category || 'Geral',
              requiresAcknowledgment: !!(c.requires_acknowledgment ?? meta.requires_acknowledgment),
              acknowledged: isAck,
              acknowledgedAt: ackDateStr,
              author: c.sender_name || 'Coordenação Geral',
              authorRole: c.sender_role || 'Direção Escolar',
              studentId: meta.target_student_id || c.target_student_id || 'all',
              studentName: meta.target_student_name || c.target_student_name || 'Todos os Estudantes',
              studentLabel: meta.target_student_label || c.target_student_label || 'Para: Toda a Família'
            };
          });
          setInformativosList(parsedInfos);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do Supabase:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadCommsFromSupabase();
  }, []);

  // Realtime Subscription with Sound & Browser Push Dispatching
  useEffect(() => {
    const channel = supabase
      .channel('family_central_comms_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'communications' }, (payload: any) => {
        const newComm = payload.new;
        if (newComm && newComm.id && !hasNotificationSoundBeenPlayed(newComm.id)) {
          markNotificationSoundPlayed(newComm.id);
          const typeCode = newComm.type_code || 'info';
          playNotificationChime(typeCode, newComm.id);

          // Trigger browser notification
          showBrowserNotification(newComm.title || 'Novo Comunicado Classium', {
            body: (newComm.content || '').replace(/<[^>]*>?/gm, '').substring(0, 120),
            tag: typeCode,
            url: window.location.href,
            requireInteraction: typeCode === 'urgent'
          });
        }
        loadCommsFromSupabase();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'communications' }, () => {
        loadCommsFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'communication_recipients' }, () => {
        loadCommsFromSupabase();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Digital Signature Modal State
  const [activeSignDoc, setActiveSignDoc] = useState<SignatureDocItem | null>(null);
  const [signerName, setSignerName] = useState(guardian?.name || 'Maria das Graças Silva');
  const [signaturePin, setSignaturePin] = useState('');
  const [signMethod, setSignMethod] = useState<'draw' | 'pin'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewDocModal, setPreviewDocModal] = useState<SignatureDocItem | null>(null);

  // Initialize canvas for drawing signature
  useEffect(() => {
    if (activeSignDoc && signMethod === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [activeSignDoc, signMethod]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0B1B3D';
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSignSubmit = async () => {
    if (!signerName.trim()) {
      alert('Por favor, insira o nome do assinante legal.');
      return;
    }
    if (signMethod === 'pin' && signaturePin !== '1234' && signaturePin.length > 0) {
      alert('Assinatura Digital Negada: Senha de assinatura incorreta.');
      return;
    }

    const today = new Date();
    const timestamp = today.toLocaleDateString('pt-BR') + ' às ' + today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (activeSignDoc) {
      const docId = activeSignDoc.id;

      // Optimistic update
      setSignatureDocs(prev => prev.map(doc => {
        if (doc.id === docId) {
          return {
            ...doc,
            signed: true,
            signedBy: signerName,
            signatureDate: timestamp
          };
        }
        return doc;
      }));

      // Persist signature via RPC / direct DB fallback
      await signCommunicationDocument(
        docId, 
        signerName, 
        signMethod === 'pin' ? 'PIN_SECURE_AUTH' : 'CANVAS_BIOMETRIC_DATA',
        activeSignDoc.studentId
      );

      // Refresh communication list
      await loadCommsFromSupabase();
    }

    playSignatureSound();
    setActiveSignDoc(null);
    setSignaturePin('');
    alert('Documento assinado digitalmente com êxito! Validade jurídica registrada com carimbo de tempo ICP-Brasil.');
  };

  // Modal State for Convocation Response Actions
  const [activeConvocationAction, setActiveConvocationAction] = useState<{
    convocation: ConvocationItem;
    type: 'justify' | 'reschedule';
  } | null>(null);
  const [convocationInputText, setConvocationInputText] = useState('');

  const handleConfirmConvocation = async (id: string) => {
    const today = new Date();
    const timestamp = today.toLocaleDateString('pt-BR') + ' às ' + today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    setConvocations(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: 'confirmed',
          respondedAt: timestamp
        };
      }
      return c;
    }));

    await respondConvocation(id, 'confirmed', {
      guardianName: guardian?.name || 'Sandra Alves'
    });

    await loadCommsFromSupabase();

    playConvocationSound();
    alert('Presença confirmada! A coordenação e o profissional responsável já receberam seu aviso de comparecimento.');
  };

  const handleConvocationActionSubmit = async () => {
    if (!activeConvocationAction) return;
    const { convocation, type } = activeConvocationAction;

    if (!convocationInputText.trim()) {
      alert('Por favor, preencha o campo de mensagem antes de enviar.');
      return;
    }

    const today = new Date();
    const timestamp = today.toLocaleDateString('pt-BR') + ' às ' + today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    setConvocations(prev => prev.map(c => {
      if (c.id === convocation.id) {
        return {
          ...c,
          status: type === 'justify' ? 'justified' : 'reschedule_requested',
          justificationText: type === 'justify' ? convocationInputText : undefined,
          rescheduleSuggestion: type === 'reschedule' ? convocationInputText : undefined,
          respondedAt: timestamp
        };
      }
      return c;
    }));

    await respondConvocation(
      convocation.id,
      type === 'justify' ? 'justified' : 'rescheduled',
      {
        justification: type === 'justify' ? convocationInputText : undefined,
        rescheduleSuggestion: type === 'reschedule' ? convocationInputText : undefined,
        guardianName: guardian?.name || 'Sandra Alves'
      }
    );

    await loadCommsFromSupabase();

    playInfoSound();
    setActiveConvocationAction(null);
    setConvocationInputText('');
    alert(type === 'justify' 
      ? 'Justificativa enviada à coordenação pedagógica com sucesso.' 
      : 'Solicitação de reagendamento enviada. A secretaria entrará em contato para confirmar o novo horário.'
    );
  };

  const handleAcknowledgeInformativo = async (id: string) => {
    const today = new Date();
    const timestamp = today.toLocaleDateString('pt-BR') + ' às ' + today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const guardianName = guardian?.name || 'Sandra Alves';

    setInformativosList(prev => prev.map(inf => {
      if (inf.id === id) {
        return {
          ...inf,
          acknowledged: true,
          acknowledgedAt: timestamp
        };
      }
      return inf;
    }));

    await acknowledgeCommunication(id, guardianName);
    await loadCommsFromSupabase();

    playInfoSound();
    alert('Obrigado! Sua ciência de leitura foi registrada na secretaria escolar.');
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
    setAudioPrefs(prev => ({ ...prev, masterMuted: next }));
    if (!next) {
      playInfoSound();
    }
  };

  const handleRequestPushPermission = async () => {
    const result = await requestNotificationPermission();
    const updated = await getWebPushStatus();
    setPushStatus(updated);
    if (result === 'granted') {
      showBrowserNotification('Notificações Classium Ativadas', {
        body: 'Você receberá avisos importantes e urgentes da escola neste dispositivo.'
      });
    }
  };

  // Counts for category badges
  const pendingSignaturesCount = signatureDocs.filter(d => !d.signed).length;
  const pendingConvocationsCount = convocations.filter(c => c.status === 'pending').length;
  const unreadInformativosCount = informativosList.filter(i => !i.acknowledged).length;

  // Filtering lists by student
  const filteredSignatures = signatureDocs.filter(d => {
    if (selectedStudentFilter === 'all') return true;
    return d.studentId === 'all' || d.studentId === selectedStudentFilter;
  });

  const filteredConvocations = convocations.filter(c => {
    if (selectedStudentFilter === 'all') return true;
    return c.studentId === 'all' || c.studentId === selectedStudentFilter;
  });

  const filteredInformativos = informativosList.filter(i => {
    if (selectedStudentFilter === 'all') return true;
    return i.studentId === 'all' || i.studentId === selectedStudentFilter;
  });

  return (
    <div className="space-y-6 text-slate-800 text-left">
      
      {/* 1. CENTRAL DE COMUNICAÇÃO INTELIGENTE (TOP CARD) */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bordeaux/10 flex items-center justify-center border border-bordeaux/20">
              <ShieldCheck className="w-5 h-5 text-bordeaux" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-oxford">Central de Comunicação Inteligente</h3>
              <p className="text-xs text-gray-500">Comunicações em tempo real, assinaturas e convocações pedagógicas.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter by student */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <label className="text-[10px] uppercase font-bold text-slate-400">Filtrar Aluno:</label>
              <select
                value={selectedStudentFilter}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedStudentFilter(val);
                  if (val !== 'all' && selectFamilyStudent) {
                    selectFamilyStudent(val);
                  }
                }}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Todos os Filhos / Geral</option>
                {activeStudentList.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>

            {/* Audio chime toggle */}
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

            {/* Audio Settings Button */}
            <button
              onClick={() => setShowAudioSettings(true)}
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Configurar volumes e notificações sonoras"
            >
              <Sliders className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Ajustar Sons</span>
            </button>

            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Sincronizado em Tempo Real
            </span>
          </div>
        </div>

        {/* 4 CATEGORY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          
          {/* Urgentes Tab (Red) */}
          <button
            onClick={() => setActiveSubTab('urgentes')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all relative cursor-pointer ${
              activeSubTab === 'urgentes'
                ? 'bg-[#DC2626] text-white border-red-700 shadow-lg scale-[1.02]'
                : 'bg-slate-50 border-gray-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <AlertCircle className={`w-5 h-5 mb-1.5 ${activeSubTab === 'urgentes' ? 'text-white' : 'text-red-600'}`} />
            <span className="text-xs font-serif font-bold">Urgentes</span>
            {urgentCount > 0 && (
              <span className={`absolute -top-1.5 -right-1 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md ${
                activeSubTab === 'urgentes' ? 'bg-white text-red-700' : 'bg-red-600 text-white animate-pulse'
              }`}>
                {urgentCount}
              </span>
            )}
          </button>

          {/* Assinaturas Tab (Amarelo / Dourado #EAB308) */}
          <button
            onClick={() => setActiveSubTab('assinaturas')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all relative cursor-pointer ${
              activeSubTab === 'assinaturas'
                ? 'bg-[#EAB308] text-slate-950 border-amber-600 shadow-lg scale-[1.02] font-bold'
                : 'bg-slate-50 border-gray-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <ShieldCheck className={`w-5 h-5 mb-1.5 ${activeSubTab === 'assinaturas' ? 'text-slate-950' : 'text-amber-500'}`} />
            <span className="text-xs font-serif font-bold">Assinaturas</span>
            {pendingSignaturesCount > 0 && (
              <span className={`absolute -top-1.5 -right-1 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm ${
                activeSubTab === 'assinaturas' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500 text-slate-950'
              }`}>
                {pendingSignaturesCount}
              </span>
            )}
          </button>

          {/* Convocações Tab (Azul #2563EB) */}
          <button
            onClick={() => setActiveSubTab('convocacoes')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all relative cursor-pointer ${
              activeSubTab === 'convocacoes'
                ? 'bg-[#2563EB] text-white border-blue-700 shadow-lg scale-[1.02] font-bold'
                : 'bg-slate-50 border-gray-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Calendar className={`w-5 h-5 mb-1.5 ${activeSubTab === 'convocacoes' ? 'text-white' : 'text-blue-500'}`} />
            <span className="text-xs font-serif font-bold">Convocações</span>
            {pendingConvocationsCount > 0 && (
              <span className={`absolute -top-1.5 -right-1 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm ${
                activeSubTab === 'convocacoes' ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'
              }`}>
                {pendingConvocationsCount}
              </span>
            )}
          </button>

          {/* Informativos Tab (Verde #16A34A) */}
          <button
            onClick={() => setActiveSubTab('informativos')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all relative cursor-pointer ${
              activeSubTab === 'informativos'
                ? 'bg-[#16A34A] text-white border-emerald-700 shadow-lg scale-[1.02] font-bold'
                : 'bg-slate-50 border-gray-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <MessageSquare className={`w-5 h-5 mb-1.5 ${activeSubTab === 'informativos' ? 'text-white' : 'text-emerald-500'}`} />
            <span className="text-xs font-serif font-bold">Informativos</span>
            {unreadInformativosCount > 0 && (
              <span className={`absolute -top-1.5 -right-1 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm ${
                activeSubTab === 'informativos' ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white'
              }`}>
                {unreadInformativosCount}
              </span>
            )}
          </button>

        </div>
      </div>

      {/* 2. ACTIVE SUBTAB CONTENT VIEWPORT */}
      <div className="space-y-4">
        
        {/* SUBTAB 1: RECADOS URGENTES (DEFAULT) */}
        {activeSubTab === 'urgentes' && (
          <UrgentNoticesTab 
            externalFilterStudent={selectedStudentFilter}
            onFilterChange={setSelectedStudentFilter}
            onAcknowledgeSuccess={loadCommsFromSupabase}
          />
        )}

        {/* SUBTAB 2: ABA ASSINATURAS */}
        {activeSubTab === 'assinaturas' && (
          <div className="space-y-4">
            
            {/* Pending List */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-serif text-base font-bold text-oxford flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  Documentos & Termos para Assinatura Legal
                </h4>
                <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                  {pendingSignaturesCount} Pendente(s)
                </span>
              </div>

              <div className="space-y-3">
                {filteredSignatures.map(doc => (
                  <div 
                    key={doc.id}
                    className={`p-4 rounded-xl border transition-all ${
                      doc.signed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-gray-200 hover:border-bordeaux/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {doc.signed ? (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Assinado Digitalmente
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" /> Aguardando Assinatura
                            </span>
                          )}
                          <span className="text-gray-500">Publicado em: {doc.date}</span>
                          {doc.dueDate && !doc.signed && (
                            <span className="text-red-600 font-semibold font-mono">Vencimento: {doc.dueDate}</span>
                          )}
                          {doc.studentLabel && (
                            <span className="text-[10px] bg-blue-50 text-blue-900 font-bold px-2 py-0.5 rounded border border-blue-200">
                              {doc.studentLabel}
                            </span>
                          )}
                        </div>

                        <h5 className="font-serif text-sm font-bold text-oxford">{doc.title}</h5>
                        <p className="text-xs text-gray-600 leading-relaxed font-light">{doc.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {doc.signed ? (
                          <button
                            onClick={() => setPreviewDocModal(doc)}
                            className="px-3.5 py-2 bg-white border border-gray-200 hover:border-gold rounded-xl text-xs font-bold text-oxford flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" /> Ver Comprovante
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveSignDoc(doc);
                              setSignerName(guardian?.name || 'Maria das Graças Silva');
                            }}
                            className="px-5 py-2.5 bg-bordeaux hover:bg-bordeaux/90 text-gold rounded-xl text-xs font-serif font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer"
                          >
                            <PenTool className="w-3.5 h-3.5 text-gold" /> Assinar Termo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: ABA CONVOCAÇÕES */}
        {activeSubTab === 'convocacoes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-serif text-base font-bold text-oxford flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Convocações Pedagógicas & Reuniões Escolares
                </h4>
                <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
                  {pendingConvocationsCount} Pendente(s)
                </span>
              </div>

              <div className="space-y-3">
                {filteredConvocations.map(conv => (
                  <div 
                    key={conv.id}
                    className="p-5 rounded-2xl border border-gray-200 bg-white hover:border-blue-300 transition-all space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                          CONVOCAÇÃO PEDAGÓGICA
                        </span>
                        <span className="text-gray-500 font-semibold">{conv.contactName} ({conv.contactRole})</span>
                        {conv.studentLabel && (
                          <span className="text-[10px] bg-blue-50 text-blue-900 font-bold px-2 py-0.5 rounded border border-blue-200">
                            {conv.studentLabel}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-mono font-bold text-blue-950 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{conv.date} às {conv.time}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-serif text-base font-bold text-oxford">{conv.title}</h5>
                      <p className="text-xs text-gray-700 leading-relaxed font-light">{conv.reason}</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>Local:</strong> {conv.location}</span>
                    </div>

                    {/* Response actions */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100">
                      {conv.status === 'confirmed' && (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Presença confirmada ({conv.respondedAt})
                        </div>
                      )}

                      {conv.status === 'justified' && (
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                          <Clock className="w-4 h-4 text-amber-600" />
                          Ausência justificada: "{conv.justificationText}"
                        </div>
                      )}

                      {conv.status === 'reschedule_requested' && (
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                          <RefreshCw className="w-4 h-4 text-blue-600" />
                          Reagendamento solicitado: "{conv.rescheduleSuggestion}"
                        </div>
                      )}

                      {conv.status === 'pending' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleConfirmConvocation(conv.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" /> Confirmar Presença
                          </button>
                          <button
                            onClick={() => setActiveConvocationAction({ convocation: conv, type: 'justify' })}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Justificar Ausência
                          </button>
                          <button
                            onClick={() => setActiveConvocationAction({ convocation: conv, type: 'reschedule' })}
                            className="px-3.5 py-2 border border-gray-200 hover:border-blue-400 text-blue-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Pedir Reagendamento
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: ABA INFORMATIVOS */}
        {activeSubTab === 'informativos' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-serif text-base font-bold text-oxford flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                  Boletins & Comunicados Informativos
                </h4>
                <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                  {unreadInformativosCount} Não lido(s)
                </span>
              </div>

              <div className="space-y-3">
                {filteredInformativos.map(inf => (
                  <div 
                    key={inf.id}
                    className="p-5 rounded-2xl border border-gray-200 bg-white hover:border-emerald-300 transition-all space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                          INFORMATIVO
                        </span>
                        <span className="text-gray-500 font-semibold">{inf.sender}</span>
                        {inf.studentLabel && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
                            {inf.studentLabel}
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-mono text-gray-400">{inf.date}</span>
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-serif text-base font-bold text-oxford">{inf.title}</h5>
                      <p className="text-xs text-gray-700 leading-relaxed font-light">{inf.body}</p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-gray-100 text-xs">
                      {inf.acknowledged ? (
                        <div className="flex items-center gap-2 text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          Leitura confirmada ({inf.acknowledgedAt})
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAcknowledgeInformativo(inf.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer ml-auto"
                        >
                          Acusar Leitura
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* AUDIO & NOTIFICATION SETTINGS MODAL */}
      {showAudioSettings && (
        <div className="fixed inset-0 z-50 bg-oxford/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-fade-in relative text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Sliders className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-oxford text-base">Configurações de Áudio & Alertas</h4>
                  <p className="text-[11px] text-gray-500">Ajuste volumes e teste os sons característicos por categoria</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAudioSettings(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Master Mute & Voice Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Som Principal</p>
                  <p className="text-[10px] text-slate-500">{audioPrefs.masterMuted ? 'Silenciado' : 'Ativo'}</p>
                </div>
                <button
                  onClick={() => {
                    const next = !audioPrefs.masterMuted;
                    const updated = updateAudioPreferences({ masterMuted: next });
                    setAudioPrefs(updated);
                    setMuted(next);
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    audioPrefs.masterMuted ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-emerald-500 text-white border-emerald-600'
                  }`}
                >
                  {audioPrefs.masterMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Voz de Leitura (TTS)</p>
                  <p className="text-[10px] text-slate-500">{audioPrefs.voiceEnabled ? 'Voz Ativa' : 'Desativada'}</p>
                </div>
                <button
                  onClick={() => {
                    const next = !audioPrefs.voiceEnabled;
                    const updated = updateAudioPreferences({ voiceEnabled: next });
                    setAudioPrefs(updated);
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    audioPrefs.voiceEnabled ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Volume Sliders & Test Buttons per Category */}
            <div className="space-y-3.5 pt-1">
              
              {/* 1. Urgentes */}
              <div className="p-3 rounded-xl border border-red-100 bg-red-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                    <span className="text-xs font-bold text-slate-800">1. Alertas Urgentes & Médicos</span>
                  </div>
                  <button
                    onClick={() => playUrgentSound(audioPrefs.urgentVolume)}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" /> Testar Som
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioPrefs.urgentVolume}
                    onChange={e => {
                      const vol = parseFloat(e.target.value);
                      const updated = updateAudioPreferences({ urgentVolume: vol });
                      setAudioPrefs(updated);
                    }}
                    className="w-full accent-red-600"
                  />
                  <span className="text-xs font-mono font-bold text-slate-600 w-9 text-right">
                    {Math.round(audioPrefs.urgentVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* 2. Assinaturas */}
              <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-bold text-slate-800">2. Termos & Assinaturas Legais</span>
                  </div>
                  <button
                    onClick={() => playSignatureSound(audioPrefs.signatureVolume, audioPrefs.voiceEnabled)}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" /> Testar Som
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioPrefs.signatureVolume}
                    onChange={e => {
                      const vol = parseFloat(e.target.value);
                      const updated = updateAudioPreferences({ signatureVolume: vol });
                      setAudioPrefs(updated);
                    }}
                    className="w-full accent-amber-500"
                  />
                  <span className="text-xs font-mono font-bold text-slate-600 w-9 text-right">
                    {Math.round(audioPrefs.signatureVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* 3. Convocações */}
              <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span className="text-xs font-bold text-slate-800">3. Convocações Pedagógicas</span>
                  </div>
                  <button
                    onClick={() => playConvocationSound(audioPrefs.convocationVolume)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" /> Testar Som
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioPrefs.convocationVolume}
                    onChange={e => {
                      const vol = parseFloat(e.target.value);
                      const updated = updateAudioPreferences({ convocationVolume: vol });
                      setAudioPrefs(updated);
                    }}
                    className="w-full accent-blue-600"
                  />
                  <span className="text-xs font-mono font-bold text-slate-600 w-9 text-right">
                    {Math.round(audioPrefs.convocationVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* 4. Informativos */}
              <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <span className="text-xs font-bold text-slate-800">4. Boletins & Informativos Gerais</span>
                  </div>
                  <button
                    onClick={() => playInfoSound(audioPrefs.infoVolume)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" /> Testar Som
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioPrefs.infoVolume}
                    onChange={e => {
                      const vol = parseFloat(e.target.value);
                      const updated = updateAudioPreferences({ infoVolume: vol });
                      setAudioPrefs(updated);
                    }}
                    className="w-full accent-emerald-600"
                  />
                  <span className="text-xs font-mono font-bold text-slate-600 w-9 text-right">
                    {Math.round(audioPrefs.infoVolume * 100)}%
                  </span>
                </div>
              </div>

            </div>

            {/* Web Push Banner */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-slate-600" />
                <div>
                  <p className="font-bold text-slate-800">Notificações Push no Navegador</p>
                  <p className="text-[10px] text-slate-500">
                    {pushStatus?.permission === 'granted' 
                      ? 'Ativas neste dispositivo' 
                      : pushStatus?.permission === 'denied' 
                        ? 'Bloqueadas no navegador' 
                        : 'Permissão não solicitada'}
                  </p>
                </div>
              </div>
              {pushStatus?.permission !== 'granted' && (
                <button
                  onClick={handleRequestPushPermission}
                  className="px-3 py-1.5 bg-oxford hover:bg-oxford/90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  Permitir Push
                </button>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAudioSettings(false)}
                className="px-5 py-2 bg-oxford hover:bg-oxford/90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIGITAL SIGNATURE MODAL */}
      {activeSignDoc && (
        <div className="fixed inset-0 z-50 bg-oxford/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gold/40 space-y-5 animate-fade-in relative text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-bordeaux/10 flex items-center justify-center">
                  <PenTool className="w-4 h-4 text-bordeaux" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-oxford text-base">Assinatura Digital Oficial</h4>
                  <p className="text-[10px] text-gray-400">Ambiente de Segurança Criptográfica Classium</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveSignDoc(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <strong className="text-oxford font-serif block">{activeSignDoc.title}</strong>
              <p className="text-gray-500 text-[11px]">Estudante: {activeSignDoc.studentName}</p>
            </div>

            {/* Signer Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Nome do Responsável Legal:</label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Nome completo do responsável"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-oxford outline-none focus:border-gold"
              />
            </div>

            {/* Signature Method Toggle */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <button
                onClick={() => setSignMethod('draw')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  signMethod === 'draw' ? 'bg-bordeaux text-gold' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Desenhar Rubrica na Tela
              </button>
              <button
                onClick={() => setSignMethod('pin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  signMethod === 'pin' ? 'bg-bordeaux text-gold' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Assinar com Senha / PIN
              </button>
            </div>

            {/* Draw signature viewport */}
            {signMethod === 'draw' ? (
              <div className="space-y-2">
                <div className="border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden relative bg-slate-50 touch-none">
                  <canvas
                    ref={canvasRef}
                    width={420}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={() => setIsDrawing(false)}
                    onMouseLeave={() => setIsDrawing(false)}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={() => setIsDrawing(false)}
                    className="w-full h-40 cursor-crosshair block"
                  />
                  <span className="absolute bottom-2 left-3 text-[10px] text-gray-400 pointer-events-none select-none">
                    Rubrique ou assine com o mouse / dedo
                  </span>
                  <button
                    onClick={clearCanvas}
                    className="absolute top-2 right-2 text-[10px] font-bold bg-white/90 border border-gray-200 px-2 py-1 rounded shadow-xs text-gray-600 hover:text-red-600 cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <label className="text-xs font-bold text-slate-700 block">PIN de Segurança do Responsável:</label>
                <input
                  type="password"
                  maxLength={4}
                  value={signaturePin}
                  onChange={e => setSignaturePin(e.target.value)}
                  placeholder="Digite sua senha de 4 dígitos (Ex: 1234)"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-center text-lg tracking-widest font-mono font-bold text-oxford outline-none focus:border-gold"
                />
                <p className="text-[10px] text-gray-400 text-center">Para este ambiente, a senha padrão é <strong>1234</strong>.</p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setActiveSignDoc(null)}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSignSubmit}
                className="px-6 py-2.5 bg-bordeaux hover:bg-bordeaux/90 text-gold rounded-xl text-xs font-serif font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Confirmar Assinatura Legal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONVOCATION ACTION MODAL (JUSTIFY OR RESCHEDULE) */}
      {activeConvocationAction && (
        <div className="fixed inset-0 z-50 bg-oxford/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gold/40 space-y-4 animate-fade-in relative text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h4 className="font-serif font-bold text-oxford text-base">
                  {activeConvocationAction.type === 'justify' ? 'Justificar Ausência na Reunião' : 'Solicitar Reagendamento'}
                </h4>
              </div>
              <button 
                onClick={() => setActiveConvocationAction(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <strong className="text-oxford font-serif block">{activeConvocationAction.convocation.title}</strong>
              <p className="text-gray-500 text-[11px]">Data: {activeConvocationAction.convocation.date} às {activeConvocationAction.convocation.time}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                {activeConvocationAction.type === 'justify' 
                  ? 'Motivo da impossibilidade de comparecimento:' 
                  : 'Sugestão de datas e horários alternativos para o encontro:'}
              </label>
              <textarea
                rows={4}
                value={convocationInputText}
                onChange={e => setConvocationInputText(e.target.value)}
                placeholder={activeConvocationAction.type === 'justify' 
                  ? 'Descreva o motivo (Ex: compromisso médico inadiável no horário marcado)...' 
                  : 'Ex: Sugiro a próxima quinta-feira às 15:30h ou sexta-feira pela manhã...'}
                className="w-full p-3 border border-gray-300 rounded-xl text-xs text-slate-800 outline-none focus:border-gold"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setActiveConvocationAction(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConvocationActionSubmit}
                className="px-5 py-2 bg-bordeaux hover:bg-bordeaux/90 text-gold rounded-xl text-xs font-serif font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Enviar Resposta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDocModal && (
        <div className="fixed inset-0 z-50 bg-oxford/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gold/40 space-y-4 animate-fade-in relative text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h4 className="font-serif font-bold text-oxford text-sm">Comprovante de Assinatura Digital</h4>
              </div>
              <button 
                onClick={() => setPreviewDocModal(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Documento Válido e Autenticado
              </div>
              <p><strong>Documento:</strong> {previewDocModal.title}</p>
              <p><strong>Assinado por:</strong> {previewDocModal.signedBy || 'Responsável Legal'}</p>
              <p><strong>Carimbo de Tempo:</strong> {previewDocModal.signatureDate || previewDocModal.date}</p>
              <p className="text-[10px] text-gray-500 font-mono">Hash SHA-256: 8f4b29c0a...e718b29c</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  alert('Iniciando download do comprovante em PDF...');
                  setPreviewDocModal(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" /> Baixar PDF com Carimbo
              </button>
              <button
                onClick={() => setPreviewDocModal(null)}
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
}

export default CentralComunicacaoTab;
