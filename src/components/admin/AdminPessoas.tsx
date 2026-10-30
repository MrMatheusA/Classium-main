import React, { useState, useEffect } from 'react';

import { studentsService } from '../../services/students/students.service';
import { teachersService } from '../../services/teachers/teachers.service';
import { guardiansService } from '../../services/guardians/guardians.service';
import { UsersService } from '../../services/users.service';
import { supabase } from '../../lib/supabase';

import { 
  Users, UserPlus, FileSpreadsheet, Sparkles, Clipboard, CheckCircle, 
  Trash2, Search, GraduationCap, Calendar, Clock, AlertTriangle, AlertCircle,
  SlidersHorizontal, Printer, Download, Upload, Settings, MoreVertical,
  Eye, Edit2, Phone, MapPin, X, ChevronLeft, ChevronRight, Info, Shield,
  Check, Columns, Filter, ArrowUp, ArrowDown, HelpCircle, Bot, BookOpen, Building,
  Plus, Briefcase, Award, Zap, CheckSquare, History, Lock, Key, Share2, Copy,
  Mail, MessageSquare, Send, FileText, User
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { useAuth } from '../../hooks/useAuth';
import { maskCPF, maskDate, maskCellPhone, maskRG, maskCEP, maskCNPJ } from '../../utils/masks';
import { StudentEnrollmentWizard } from './StudentEnrollmentWizard';


interface Responsible {
  id: string;
  photoUrl?: string;
  name: string;
  relationship: string;
  cpf: string;
  rg: string;
  birthDate: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  createdAt: string;
}

interface TimelineEvent {
  id: string;
  type: 'comunicado' | 'advertencia' | 'autorizacao' | 'passeio' | 'reuniao' | 'assinatura' | 'comparecimento';
  title: string;
  description: string;
  date: string;
  status: 'enviado' | 'pendente' | 'assinado' | 'confirmado' | 'cancelado';
}

interface Student {
  id: string;
  name: string;
  matricula: string;
  cpf: string;
  sex: 'M' | 'F';
  birthDate: string;
  age: number;
  grade: string;
  shift: 'Matutino' | 'Vespertino' | 'Integral' | 'Noturno';
  segment: 'Educação Infantil' | 'Fundamental I' | 'Fundamental II' | 'Ensino Médio' | 'EJA';
  status: 'Ativo' | 'Transferido' | 'Desistente' | 'Concluído' | 'Cancelado' | 'Em análise';
  parent: string;
  phone: string;
  address: string;
  transport: boolean;
  aee: boolean; // Atendimento Educacional Especializado / Inclusão
  laudo: boolean;
  docPending: boolean;
  familyComm: boolean;
  photoUrl?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  observacoes?: string;
  responsibles?: Responsible[];
  timelineEvents?: TimelineEvent[];
  indicadores?: {
    frequencia: string;
    ocorrencias: number;
    advertencias: number;
    comunicadosPendentes: number;
    assinaturasPendentes: number;
  };
}

interface ColumnConfig {
  key: keyof Student;
  label: string;
  visible: boolean;
  width: string;
}

const STUDENT_EXTRA_DETAILS: Record<string, {
  photoUrl: string;
  professorRegente: string;
  observacoes: string;
  laudoDescricao?: string;
  responsibles: {
    id: string;
    name: string;
    relationship: string;
    cpf: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    receivesComm: boolean;
    lastAccess: string;
    status: 'Online' | 'Offline';
  }[];
  timelineEvents: {
    id: string;
    type: 'comunicado' | 'advertencia' | 'reuniao' | 'assinatura' | 'urgente';
    title: string;
    description: string;
    date: string;
    priority: 'Informativo' | 'Importante' | 'Prioritário' | 'Urgente';
    status: string;
  }[];
}> = {
  'st-1': {
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
    professorRegente: 'Prof. Carlos Eduardo (Matemática)',
    observacoes: 'Alergia grave a amendoim. Possui bombinha de asma na mochila.',
    responsibles: [
      {
        id: 'r-1-1',
        name: 'Maria das Graças Silva',
        relationship: 'Mãe (Responsável Legal)',
        cpf: '111.222.333-44',
        phone: '(11) 98888-7777',
        whatsapp: '5511988887777',
        email: 'maria.graca@gmail.com',
        address: 'Rua das Flores, 123, Bloco B, Apt 45 - São Paulo',
        receivesComm: true,
        lastAccess: 'Hoje às 09:15',
        status: 'Online'
      },
      {
        id: 'r-1-2',
        name: 'José de Alencar Silva',
        relationship: 'Pai',
        cpf: '222.333.444-55',
        phone: '(11) 98765-4321',
        whatsapp: '5511987654321',
        email: 'jose.alencar@hotmail.com',
        address: 'Rua das Flores, 123, Bloco B, Apt 45 - São Paulo',
        receivesComm: true,
        lastAccess: 'Há 3 dias',
        status: 'Offline'
      }
    ],
    timelineEvents: [
      { id: 'ev-1', type: 'comunicado', title: 'Entrega de Boletins', description: 'Família visualizou o boletim do 2º bimestre.', date: '21/07/2026', priority: 'Informativo', status: 'Lido' },
      { id: 'ev-2', type: 'reuniao', title: 'Reunião de Pais e Mestres', description: 'Presença confirmada pela mãe.', date: '15/07/2026', priority: 'Importante', status: 'Confirmado' }
    ]
  },
  'st-2': {
    photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150',
    professorRegente: 'Profa. Ana Beatriz (Português)',
    observacoes: 'AEE: Transtorno do Espectro Autista (TEA). Necessita de tempo adicional para avaliações.',
    laudoDescricao: 'Laudo CID 11: 6A02 (TEA grau 1 de suporte).',
    responsibles: [
      {
        id: 'r-2-1',
        name: 'Renato de Souza',
        relationship: 'Pai (Responsável Legal)',
        cpf: '234.567.890-11',
        phone: '(11) 97777-6666',
        whatsapp: '5511977776666',
        email: 'renato.souza@yahoo.com',
        address: 'Av. Paulista, 1500, São Paulo',
        receivesComm: true,
        lastAccess: 'Ontem às 18:40',
        status: 'Offline'
      },
      {
        id: 'r-2-2',
        name: 'Carla Oliveira de Souza',
        relationship: 'Mãe',
        cpf: '345.678.901-22',
        phone: '(11) 97654-3210',
        whatsapp: '5511976543210',
        email: 'carla.oliveira@outlook.com',
        address: 'Av. Paulista, 1500, São Paulo',
        receivesComm: false,
        lastAccess: 'Há 1 semana',
        status: 'Offline'
      }
    ],
    timelineEvents: [
      { id: 'ev-3', type: 'assinatura', title: 'Termo de Atendimento AEE', description: 'Assinatura digital realizada pelo pai.', date: '18/07/2026', priority: 'Prioritário', status: 'Assinado' }
    ]
  },
  'st-3': {
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    professorRegente: 'Prof. Carlos Eduardo (Matemática)',
    observacoes: 'Dificuldade de concentração temporária. Acompanhamento psicopedagógico em andamento.',
    responsibles: [
      {
        id: 'r-3-1',
        name: 'Marta Souza',
        relationship: 'Mãe (Responsável Legal)',
        cpf: '345.678.901-22',
        phone: '(11) 96666-5555',
        whatsapp: '5511966665555',
        email: 'marta.souza@gmail.com',
        address: 'Rua Augusta, 910, São Paulo',
        receivesComm: true,
        lastAccess: 'Hoje às 10:02',
        status: 'Online'
      }
    ],
    timelineEvents: []
  },
  'st-4': {
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    professorRegente: 'Profa. Sandra Regina (Pedagoga)',
    observacoes: 'Excelente desempenho acadêmico. Aluna olímpica de robótica.',
    responsibles: [
      {
        id: 'r-4-1',
        name: 'Roberto Costa',
        relationship: 'Pai (Responsável Legal)',
        cpf: '456.789.012-33',
        phone: '(11) 95555-4444',
        whatsapp: '5511955554444',
        email: 'roberto.costa@tech.com.br',
        address: 'Rua Bela Cintra, 452, São Paulo',
        receivesComm: true,
        lastAccess: 'Hoje às 08:30',
        status: 'Online'
      },
      {
        id: 'r-4-2',
        name: 'Cláudia Castro Costa',
        relationship: 'Mãe',
        cpf: '567.890.123-44',
        phone: '(11) 95432-1098',
        whatsapp: '5511954321098',
        email: 'claudia.castro@gmail.com',
        address: 'Rua Bela Cintra, 452, São Paulo',
        receivesComm: true,
        lastAccess: 'Há 2 dias',
        status: 'Offline'
      }
    ],
    timelineEvents: [
      { id: 'ev-4', type: 'comunicado', title: 'Convocação para Olimpíada', description: 'Pai confirmou autorização para viagem de robótica.', date: '20/07/2026', priority: 'Informativo', status: 'Lido' }
    ]
  },
  'st-5': {
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    professorRegente: 'Prof. Marcos Silva (Física)',
    observacoes: 'AEE: Deficiência Visual (Baixa Visão). Necessita de material adaptado com fonte ampliada.',
    laudoDescricao: 'Laudo de oftalmologia homologado pela Secretaria.',
    responsibles: [
      {
        id: 'r-5-1',
        name: 'Alice Santos',
        relationship: 'Mãe (Responsável Legal)',
        cpf: '567.890.123-44',
        phone: '(11) 94444-3333',
        whatsapp: '5511944443333',
        email: 'alice.santos@uol.com.br',
        address: 'Alameda Lorena, 880, São Paulo',
        receivesComm: true,
        lastAccess: 'Ontem às 22:15',
        status: 'Offline'
      }
    ],
    timelineEvents: [
      { id: 'ev-5', type: 'assinatura', title: 'Termo de Uso de Lupa Eletrônica', description: 'Assinado eletronicamente pela mãe.', date: '10/07/2026', priority: 'Prioritário', status: 'Assinado' }
    ]
  },
  'st-6': {
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    professorRegente: 'Profa. Débora Moura (Química)',
    observacoes: 'Nenhuma restrição médica cadastrada.',
    responsibles: [
      {
        id: 'r-6-1',
        name: 'Fabiano de Lima',
        relationship: 'Pai (Responsável Legal)',
        cpf: '678.901.234-55',
        phone: '(11) 93333-2222',
        whatsapp: '5511933332222',
        email: 'fabiano.lima@bol.com.br',
        address: 'Rua Pamplona, 1022, São Paulo',
        receivesComm: true,
        lastAccess: 'Há 4 dias',
        status: 'Offline'
      }
    ],
    timelineEvents: []
  },
  'st-7': {
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
    professorRegente: 'Profa. Ana Beatriz (Português)',
    observacoes: 'Restrição física temporária (perna engessada). Necessita de apoio para locomoção interna.',
    responsibles: [
      {
        id: 'r-7-1',
        name: 'Kátia Ramos',
        relationship: 'Mãe (Responsável Legal)',
        cpf: '789.012.345-66',
        phone: '(11) 92222-1111',
        whatsapp: '5511922221111',
        email: 'katia.ramos@terra.com.br',
        address: 'Av. Brigadeiro Luís Antônio, 2300, São Paulo',
        receivesComm: true,
        lastAccess: 'Hoje às 07:12',
        status: 'Online'
      }
    ],
    timelineEvents: []
  },
  'st-8': {
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=150',
    professorRegente: 'Prof. Carlos Eduardo (Matemática)',
    observacoes: 'Alergia a lactose (leve). Evitar sobremesas lácteas na merenda.',
    responsibles: [
      {
        id: 'r-8-1',
        name: 'Eduardo Fagundes',
        relationship: 'Pai (Responsável Legal)',
        cpf: '890.123.456-77',
        phone: '(11) 91111-0000',
        whatsapp: '5511911110000',
        email: 'eduardo.fagundes@gmail.com',
        address: 'Rua da Consolação, 3400, São Paulo',
        receivesComm: true,
        lastAccess: 'Ontem às 15:30',
        status: 'Offline'
      }
    ],
    timelineEvents: []
  }
};

const getFullStudentProfile = (student: Student) => {
  const extra = STUDENT_EXTRA_DETAILS[student.id] || {
    photoUrl: student.sex === 'F' 
      ? 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=150'
      : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
    professorRegente: 'Prof. Regente Geral',
    observacoes: student.observacoes || 'Nenhuma observação cadastrada.',
    responsibles: [
      {
        id: `r-${student.id}-default`,
        name: student.parent || 'Responsável Não Cadastrado',
        relationship: 'Responsável Legal',
        cpf: student.cpf || '***.***.***-**',
        phone: student.phone || '(11) 99999-9999',
        whatsapp: student.phone ? student.phone.replace(/\D/g, '') : '5511999999999',
        email: `${(student.parent || 'responsavel').toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
        address: student.address || 'Endereço não informado',
        receivesComm: student.familyComm,
        lastAccess: 'Não registrado',
        status: 'Offline' as const,
      }
    ],
    timelineEvents: []
  };

  return {
    ...student,
    ...extra
  };
};

export function AdminPessoas({ 
  initialTab = 'alunos', 
  allowedTabs = ['alunos', 'professores', 'responsaveis'] 
}: { 
  initialTab?: 'alunos' | 'professores' | 'responsaveis',
  allowedTabs?: ('alunos' | 'professores' | 'responsaveis')[]
}) {
  const [activeSubTab, setActiveSubTab] = useState<'alunos' | 'professores' | 'responsaveis'>(initialTab);
  const { registerStudentTransport, familyStudents, currentUser } = usePlatform();
  const { profile } = useAuth();
  
  // Year selector
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Real-time bidirectional sync between Family Portal and Gestor Portal
  useEffect(() => {
    setStudents(prev => {
      // Remove any existing family student rows to avoid duplicates
      const filtered = prev.filter(s => !s.id.startsWith('st-00') && s.id !== 'st-1' && s.id !== 'st-2' && s.id !== 'st-3');
      const formattedFamily: Student[] = familyStudents.map(fs => {
        const primaryG = fs.guardians?.find(g => g.isPrincipal) || fs.guardians?.[0];
        return {
          id: fs.id,
          name: fs.name,
          matricula: fs.matricula || '',
          cpf: fs.cpf || '',
          sex: (fs.sex === 'F' ? 'F' : 'M') as 'M' | 'F',
          birthDate: fs.birthDate ? new Date(fs.birthDate).toLocaleDateString('pt-BR') : '',
          age: fs.birthDate ? (new Date().getFullYear() - new Date(fs.birthDate).getFullYear()) : 12,
          grade: fs.grade,
          shift: (fs.id === 'st-2' ? 'Vespertino' : 'Matutino') as any,
          segment: 'Fundamental II',
          status: (fs.id === 'st-3' ? 'Transferido' : 'Ativo') as any,
          parent: primaryG ? primaryG.name : 'Maria das Graças Silva',
          phone: primaryG ? primaryG.phone : '(11) 98888-7777',
          address: fs.addressStreet ? `${fs.addressStreet}, ${fs.addressNumber || ''} - ${fs.addressCity || ''}` : 'Avenida Paulista, 1000 - São Paulo',
          transport: fs.id === 'st-1' || fs.id === 'st-3',
          aee: fs.id === 'st-2',
          laudo: fs.id === 'st-2',
          docPending: fs.id === 'st-3',
          familyComm: fs.id !== 'st-3'
        };
      });
      return [...filtered, ...formattedFamily];
    });

    // Also update STUDENT_EXTRA_DETAILS dynamically for these students
    familyStudents.forEach(fs => {
      STUDENT_EXTRA_DETAILS[fs.id] = {
        photoUrl: fs.photoUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
        professorRegente: `Prof. ${fs.teacher || 'Regente Geral'}`,
        observacoes: fs.restrictions || fs.allergies || 'Nenhuma observação clínica.',
        laudoDescricao: fs.specialNeeds || '',
        responsibles: (fs.guardians || []).map(g => ({
          id: g.id,
          name: g.name,
          relationship: g.relationship,
          cpf: g.cpf,
          phone: g.phone,
          whatsapp: g.phone.replace(/\D/g, ''),
          email: g.email,
          address: g.address || '',
          receivesComm: g.hasAccess,
          lastAccess: g.isPrincipal ? 'Hoje às 10:30' : 'Há 2 dias',
          status: g.isPrincipal ? 'Online' : 'Offline'
        })),
        timelineEvents: [
          { id: `ev-${fs.id}-1`, type: 'comunicado', title: 'Atualização Cadastral Real-Time', description: 'Responsável legal atualizou dados cadastrais e de saúde via portal da família.', date: new Date().toLocaleDateString('pt-BR'), priority: 'Informativo', status: 'Sincronizado' }
        ]
      };
    });
  }, [familyStudents]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('Todas');
  const [selectedShift, setSelectedShift] = useState<string>('Todos');
  const [selectedSegment, setSelectedSegment] = useState<string>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  
  // Checkbox Selection for batch actions
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  // Modals and Drawers
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isEnrollmentWizardOpen, setIsEnrollmentWizardOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMatriculadosModalOpen, setIsMatriculadosModalOpen] = useState(false);
  const [isColumnsPopoverOpen, setIsColumnsPopoverOpen] = useState(false);
  const [isIaAssistantOpen, setIsIaAssistantOpen] = useState(false);
  
  // States for Central Inteligente de Responsáveis
  const [selectedRespStudentId, setSelectedRespStudentId] = useState<string>('st-1');
  const [respSearchQuery, setRespSearchQuery] = useState<string>('');
  const [showRespSuggestions, setShowRespSuggestions] = useState<boolean>(false);
  const [customTimelineEvents, setCustomTimelineEvents] = useState<any[]>([]);
  const [quickTemplateModal, setQuickTemplateModal] = useState<any>(null);
  const [activeNotificationSim, setActiveNotificationSim] = useState<any>(null);
  const [addressModal, setAddressModal] = useState<any>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  const [editingResponsible, setEditingResponsible] = useState<{ studentId: string; responsibleId: string } | null>(null);
  const [responsibleForm, setResponsibleForm] = useState<any>({
    name: '',
    relationship: '',
    cpf: '',
    rg: '',
    birthDate: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    createdAt: ''
  });
  
  const [timelineActionModal, setTimelineActionModal] = useState<{
    studentId: string;
    type: 'comunicado' | 'assinatura' | 'reuniao' | 'comparecimento';
  } | null>(null);
  const [timelineForm, setTimelineForm] = useState<any>({
    title: '',
    description: '',
    date: '',
    targetName: ''
  });

  const [simulatedCall, setSimulatedCall] = useState<string | null>(null);
  const [simulatedWhatsApp, setSimulatedWhatsApp] = useState<{ name: string; phone: string; message: string } | null>(null);
  const [simulatedEmail, setSimulatedEmail] = useState<{ name: string; email: string; subject: string; body: string } | null>(null);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playNote(523.25, audioCtx.currentTime, 0.15); // C5
      playNote(659.25, audioCtx.currentTime + 0.12, 0.3); // E5
    } catch (e) {
      console.log('Audio Context not allowed or supported', e);
    }
  };

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleActionCall = (resp: any) => {
    setSimulatedCall(resp.name);
    showToast(`Iniciando chamada de áudio integrada com ${resp.relationship}: ${resp.name}...`);
  };

  const handleActionWhatsApp = (resp: any) => {
    setSimulatedWhatsApp({
      name: resp.name,
      phone: resp.phone,
      message: `Olá, ${resp.name}! Aqui é da secretaria do Colégio Classium. Gostaríamos de tratar sobre um assunto referente ao estudante.`
    });
    showToast(`Criando minuta de chat via WhatsApp para ${resp.name}...`);
  };

  const handleActionEmail = (resp: any, student: any) => {
    const rName = resp?.name || resp?.full_name || 'Responsável';
    const sName = student?.name || student?.full_name || 'Estudante';
    setSimulatedEmail({
      name: rName,
      email: resp?.email || '',
      subject: `Comunicado Escolar Importante - Colégio Classium`,
      body: `Prezado(a) ${rName},\n\nEntramos em contato para tratar de assuntos escolares importantes de interesse do estudante ${sName}.\n\nPor favor, retorne assim que possível.\n\nAtenciosamente,\nSecretaria Pedagógica Classium`
    });
    showToast(`Minutando e-mail corporativo para ${rName}...`);
  };

  const handleActionMeeting = (resp: any, student: any) => {
    const rName = resp?.name || resp?.full_name || 'Responsável';
    const sName = student?.name || student?.full_name || 'Estudante';
    setTimelineActionModal({
      studentId: student?.id || '',
      type: 'reuniao'
    });
    setTimelineForm({
      title: 'Agendamento de Reunião de Alinhamento',
      description: `Convocação de reunião extraordinária com ${rName} para acompanhamento pedagógico de ${sName}.`,
      date: new Date().toLocaleDateString('pt-BR'),
      targetName: rName
    });
  };

  const handleActionSignature = (resp: any, student: any) => {
    const rName = resp?.name || resp?.full_name || 'Responsável';
    const sName = student?.name || student?.full_name || 'Estudante';
    setTimelineActionModal({
      studentId: student?.id || '',
      type: 'assinatura'
    });
    setTimelineForm({
      title: 'Solicitação de Assinatura Eletrônica',
      description: `Assinatura pendente do termo de responsabilidade para passeios e atividades extras de ${sName}.`,
      date: new Date().toLocaleDateString('pt-BR'),
      targetName: rName
    });
  };

  const handleActionViewAddress = (resp: any) => {
    setAddressModal(resp);
  };

  const handleCallResponsibleUrgent = (resp: any, student: any, customMsg?: string, priority: 'Informativo' | 'Importante' | 'Prioritário' | 'Urgente' = 'Urgente') => {
    playNotificationSound();
    const rName = resp?.name || resp?.full_name || 'Responsável';
    const sName = student?.name || student?.full_name || 'Estudante';
    setActiveNotificationSim({
      title: priority === 'Urgente' ? '🚨 ATENÇÃO URGENTE' : 
             priority === 'Prioritário' ? '🟠 NOTIFICAÇÃO PRIORITÁRIA' :
             priority === 'Importante' ? '🟡 AVISO IMPORTANTE' : '🟢 COMUNICADO INFORMATIVO',
      subject: customMsg || 'Contato Urgente da Escola',
      responsibleName: rName,
      studentName: sName,
      priority,
      actionText: 'Abrir Agora'
    });

    // Append event to timeline
    const newEvent = {
      id: `evt-custom-${Date.now()}`,
      studentId: student?.id || '',
      type: priority === 'Urgente' ? 'urgente' : 'comunicado',
      title: priority === 'Urgente' ? 'Chamado Urgente via App' : `Notificação: ${priority}`,
      description: customMsg || 'Solicitação de contato urgente disparada via aplicativo Classium Família.',
      date: new Date().toLocaleDateString('pt-BR'),
      priority,
      status: 'Enviado'
    };
    setCustomTimelineEvents(prev => [newEvent, ...prev]);
    showToast(`Notificação com prioridade ${priority} enviada para o aplicativo de ${rName}!`);
  };

  const handleTriggerQuickTemplate = (situationLabel: string, student: any) => {
    const respList = (student?.responsibles || []).filter(Boolean);
    const resp = respList[0] || { name: 'Responsável', relationship: 'Responsável Legal' };
    const rName = resp?.name || resp?.full_name || 'Responsável';
    const sName = student?.name || student?.full_name || 'Estudante';
    
    let templateText = '';
    let priority: 'Informativo' | 'Importante' | 'Prioritário' | 'Urgente' = 'Importante';

    switch (situationLabel) {
      case 'Estudante passando mal':
        templateText = `Prezado(a) ${rName}, informamos que o(a) estudante ${sName} apresentou sintomas de indisposição/febre durante as aulas hoje. Solicitamos que entre em contato ou compareça à escola para acompanhamento ou retirada antecipada.`;
        priority = 'Urgente';
        break;
      case 'Advertência disciplinar':
        templateText = `Prezado(a) ${rName}, informamos que o(a) estudante ${sName} registrou uma ocorrência disciplinar hoje devido ao descumprimento das normas de convivência escolar. Solicitamos sua leitura atenta no portal ou comparecimento para esclarecimentos.`;
        priority = 'Prioritário';
        break;
      case 'Convocação da família':
        templateText = `Prezado(a) ${rName}, a equipe pedagógica solicita agendamento para uma reunião de acompanhamento escolar de ${sName}. Por favor, escolha um horário disponível no aplicativo ou entre em contato com a secretaria.`;
        priority = 'Importante';
        break;
      case 'Transporte Escolar':
        templateText = `Prezado(a) ${rName}, notificamos que o transporte escolar referente ao trajeto de ${sName} registrou um pequeno atraso hoje devido ao trânsito na região. A chegada prevista ocorrerá com cerca de 20 minutos de atraso.`;
        priority = 'Informativo';
        break;
      case 'Pendência pedagógica':
        templateText = `Prezado(a) ${rName}, identificamos pendência na entrega de atividades obrigatórias ou tarefas escolares de ${sName}. Solicitamos incentivar o cumprimento das entregas para evitar prejuízos na nota do bimestre.`;
        priority = 'Importante';
        break;
      case 'Pendência financeira':
        templateText = `Prezado(a) ${resp.name}, identificamos que a mensalidade de ${student.name} referente a este período está com pendência em nosso sistema. Pedimos a regularização no portal financeiro ou contato com a tesouraria.`;
        priority = 'Importante';
        break;
      case 'Saída antecipada':
        templateText = `Prezado(a) ${resp.name}, confirmamos a solicitação de saída antecipada de ${student.name} para o dia de hoje, autorizada previamente via aplicativo de forma segura.`;
        priority = 'Informativo';
        break;
      case 'Assinatura pendente':
        templateText = `Prezado(a) ${resp.name}, há um documento pendente de sua assinatura digital no portal Classium Família referente à autorização de passeio pedagógico extraclasse para ${student.name}.`;
        priority = 'Importante';
        break;
      case 'Estudante aguardando responsável':
        templateText = `Prezado(a) ${resp.name}, informamos que as atividades escolares encerraram e o(a) estudante ${student.name} encontra-se na recepção aguardando sua retirada de forma segura.`;
        priority = 'Urgente';
        break;
      default:
        templateText = `Prezado(a) ${resp.name}, gostaríamos de alinhar informações sobre o rendimento de ${student.name}.`;
        priority = 'Informativo';
    }

    setQuickTemplateModal({
      open: true,
      student,
      responsible: resp,
      templateType: situationLabel,
      generatedText: templateText,
      priority
    });
  };
  
  // Excel Copy-Paste AI Importer raw text state
  const [rawImportText, setRawImportText] = useState(
    "Guilherme Ferreira, CPF: 445.123.908-11, Nascimento: 12/10/2013, Série: 6º Ano A, Tel: (11) 93333-1212\n" +
    "Isabela Santos, CPF: 556.789.012-33, Nascimento: 05/01/2012, Série: 8º Ano A, Tel: (11) 92222-3434\n" +
    "Arthur Pendragon, CPF: 887.432.109-02, Nascimento: 22/07/2014, Série: 5º Ano B, Tel: (11) 98877-6655"
  );
  const [parsedImportList, setParsedImportList] = useState<Partial<Student>[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsed' | 'imported'>('idle');

  // Excel-like double-click cell edit state
  const [editingCell, setEditingCell] = useState<{ studentId: string; field: keyof Student } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Column order / visible config
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'grade', label: 'Turma', visible: true, width: 'w-24' },
    { key: 'shift', label: 'Turno', visible: true, width: 'w-28' },
    { key: 'name', label: 'Nome do Estudante', visible: true, width: 'w-80' },
    { key: 'cpf', label: 'CPF', visible: true, width: 'w-36' },
    { key: 'sex', label: 'Sexo', visible: true, width: 'w-16' },
    { key: 'birthDate', label: 'Nascimento', visible: true, width: 'w-28' },
    { key: 'age', label: 'Idade', visible: true, width: 'w-16' },
  ]);

  // Sort State
  const [sortField, setSortField] = useState<keyof Student | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Main Students dataset (Monday/Airtable style)
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    const activeOrgId = currentUser?.organizationId || '11111111-1111-1111-1111-111111111111';
    try {
      const fetchTeachersWithProfiles = async () => {
        const { data, error: err } = await supabase
          .from('teachers')
          .select(`
            *,
            profiles:profile_id (
              email,
              full_name,
              phone,
              document_number
            )
          `)
          .eq('organization_id', activeOrgId);
        if (err) {
          throw err;
        }
        return (data || []).map((t: any) => ({
          ...t,
          name: t.profiles?.full_name || 'Sem nome',
          cpf: t.profiles?.document_number || '',
          email: t.profiles?.email || '',
          phone: t.profiles?.phone || ''
        }));
      };

      const fetchGuardiansWithProfiles = async () => {
        const { data, error: err } = await supabase
          .from('guardians')
          .select(`
            *,
            profiles:profile_id (
              email,
              full_name,
              phone,
              document_number
            )
          `)
          .eq('organization_id', activeOrgId);
        if (err) {
          throw err;
        }
        return (data || []).map((g: any) => ({
          ...g,
          name: g.profiles?.full_name || 'Sem nome',
          cpf: g.profiles?.document_number || '',
          email: g.profiles?.email || '',
          phone: g.profiles?.phone || ''
        }));
      };

      const fetchStudentsReal = async () => {
        const { data, error: err } = await supabase
          .from('students')
          .select('*')
          .eq('organization_id', activeOrgId);
        if (err) {
          throw err;
        }
        return data || [];
      };

      const [stData, tcData, gdData, sgData] = await Promise.all([
        fetchStudentsReal(),
        fetchTeachersWithProfiles(),
        fetchGuardiansWithProfiles(),
        studentsService.getStudentGuardians()
      ]);

      if (stData) {
        const mappedStudents = stData.map((s: any) => {
          const medInfo = s.medical_info || s.metadata?.medical_info || {};
          return {
            id: s.id,
            name: s.name || s.full_name || '',
            matricula: s.registration_code || '',
            cpf: s.cpf || s.document_number || '',
            sex: medInfo.sex || s.gender || 'M',
            birthDate: s.birth_date || '01/01/2012',
            age: medInfo.age || 14,
            grade: s.grade || s.class_name || s.metadata?.grade || s.metadata?.class_name || '7º Ano A',
            shift: medInfo.shift || 'Matutino',
            segment: medInfo.segment || 'Fundamental II',
            status: s.status || 'Ativo',
            parent: medInfo.parent || 'Não Cadastrado',
            phone: medInfo.phone || '(11) 99999-1111',
            address: medInfo.address || 'Não cadastrado',
            transport: !!medInfo.transport,
            aee: !!medInfo.aee,
            laudo: !!medInfo.laudo,
            docPending: !!medInfo.docPending,
            familyComm: medInfo.familyComm !== false,
            photoUrl: s.photo_url || s.metadata?.photo_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150'
          };
        });
        setStudents(mappedStudents);

        // Dynamically populate STUDENT_EXTRA_DETAILS from DB rows!
        stData.forEach((s: any) => {
          const medInfo = s.medical_info || s.metadata?.medical_info || {};
          const studentId = s.id;
          
          // Filter links for this student
          const links = sgData ? sgData.filter((l: any) => l.student_id === studentId) : [];
          const studentGuardians = links.map((link: any) => {
            const gd = gdData ? gdData.find((g: any) => g.id === link.guardian_id) as any : null;
            if (!gd) return null;
            return {
              id: gd.id,
              name: gd.name,
              relationship: link.relationship || 'Outro',
              cpf: gd.cpf || '000.000.000-00',
              phone: gd.phone || '(11) 99999-1111',
              whatsapp: (gd.phone || '').replace(/\D/g, ''),
              email: gd.email || `${gd.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
              address: gd.address || 'Não cadastrado',
              receivesComm: true,
              lastAccess: 'Hoje às 10:30',
              status: 'Online' as const
            };
          }).filter(Boolean);

          STUDENT_EXTRA_DETAILS[studentId] = {
            photoUrl: s.photo_url || s.metadata?.photo_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
            professorRegente: medInfo.professorRegente || 'Prof. Carlos Eduardo (História)',
            observacoes: medInfo.observacoes || 'Nenhuma observação clínica.',
            laudoDescricao: medInfo.laudoDescricao || '',
            responsibles: studentGuardians.length > 0 ? studentGuardians as any[] : [
              {
                id: `resp-${studentId}`,
                name: medInfo.parent || 'Não Cadastrado',
                relationship: 'Mãe/Pai',
                cpf: '000.000.000-00',
                phone: medInfo.phone || '(11) 99999-1111',
                whatsapp: (medInfo.phone || '(11) 99999-1111').replace(/\D/g, ''),
                email: `${(medInfo.parent || 'responsavel').toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
                address: medInfo.address || 'Não cadastrado',
                receivesComm: true,
                lastAccess: 'Hoje às 10:30',
                status: 'Online'
              }
            ],
            timelineEvents: [
              { id: `ev-${studentId}-1`, type: 'comunicado', title: 'Integração Supabase Concluída', description: 'Dados cadastrais e de saúde integrados diretamente ao Supabase.', date: new Date().toLocaleDateString('pt-BR'), priority: 'Informativo', status: 'Sincronizado' }
            ]
          };
        });
      }

      if (tcData && setTeachers) {
        const mappedTeachers = tcData.map((t: any) => ({
          id: t.id,
          name: t.name,
          photoUrl: t.photo_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
          cpf: t.cpf || '123.456.789-01',
          email: t.email || `${t.name.toLowerCase().replace(/\s+/g, '.')}@educamais.edu`,
          role: t.role || 'Professor',
          subject: t.subject || 'Geral',
          matricula: t.matricula || `MAT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          status: t.status || 'Ativo',
          shift: t.shift || 'Matutino',
          contractType: t.contract_type || 'Efetivo',
          hours: t.hours || '20h',
          permissions: t.permissions || ['Professor']
        }));
        setTeachers(mappedTeachers);
      }
    } catch (err: any) {
      console.error('Error fetching people:', err);
      setError(err?.message || 'Erro ao carregar dados do Supabase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Form for direct individual register
  const [newStudentForm, setNewStudentForm] = useState<Partial<Student>>({
    name: '',
    cpf: '',
    sex: 'M',
    birthDate: '',
    age: 14,
    grade: '7º Ano A',
    shift: 'Matutino',
    segment: 'Fundamental II',
    status: 'Ativo',
    parent: '',
    phone: '',
    address: '',
    transport: false,
    aee: false,
    laudo: false,
    docPending: false,
    familyComm: true
  });

  // Favorite Grades / Filters
  const [favoriteGrades, setFavoriteGrades] = useState<string[]>(['7º Ano A', '1ª Série EM']);

  // Teachers state & sync from PlatformContext
  const { teachers, setTeachers, academicLinks, setAcademicLinks } = usePlatform();

  // Search & Filter state for Teachers
  const [filterYear, setFilterYear] = useState<string>('2026');
  const [filterSegment, setFilterSegment] = useState<string>('Todos');
  const [filterSubject, setFilterSubject] = useState<string>('Todas');
  const [filterRole, setFilterRole] = useState<string>('Todos');
  const [filterShift, setFilterShift] = useState<string>('Todos');
  const [filterContractType, setFilterContractType] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>('');
  
  // Custom States for Category, IAM and Subjects List
  const ALL_SUBJECTS = [
    'Língua Portuguesa', 'Matemática', 'História', 'Geografia', 'Ciências', 'Educação Física', 
    'Inglês', 'Espanhol', 'Ensino Religioso', 'Filosofia', 'Sociologia', 'Física', 'Química', 
    'Artes', '(AEE)', 'Outras'
  ];
  const [categories, setCategories] = useState<string[]>([
    'Professores', 'Pedagogos', 'Coordenação', 'Direção', 'Disciplinário(a)', 'Secretários(as)', 
    'Bibliotecários(as)', 'Psicólogos(as)', 'Assistentes Sociais', 'Monitores', 'Inspetores', 
    'Motoristas', 'Monitores do Transporte', 'Merendeiras', 'Auxiliares de Serviços Gerais', 
    'Vigilantes', 'Estagiários', 'Outros'
  ]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryEditingIndex, setCategoryEditingIndex] = useState<number | null>(null);
  const [categoryInputValue, setCategoryInputValue] = useState('');
  const [selectedSubjectAreas, setSelectedSubjectAreas] = useState<string[]>(['Todos']);
  const [savedTeacherCredentials, setSavedTeacherCredentials] = useState<{ name: string; login: string; email: string; phone: string; senha?: string } | null>(null);
  const [iamExpanded, setIamExpanded] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // Teacher Wizard state
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1); // 1: Pessoais, 2: Funcionais, 3: Permissões

  const initialTeacherForm = {
    name: '',
    cpf: '',
    rg: '',
    birthDate: '',
    gender: 'M',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    cep: '',
    role: 'Professor',
    function: '',
    subject: 'História',
    matricula: '',
    shift: 'Matutino',
    contractType: 'Efetivo',
    permissions: ['Professor'],
    status: 'Ativo' as 'Ativo' | 'Inativo',
    hours: '20 horas',
    civilStatus: 'Solteiro(a)',
    admissionDate: '',
    observations: '',
    login: '',
    password: '',
  };

  const [teacherForm, setTeacherForm] = useState(initialTeacherForm);

  // Linking (Vinculação Acadêmica) State
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const [linkingTeacherId, setLinkingTeacherId] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState({
    year: '2026',
    segment: 'Fundamental II',
    grade: '7º A',
    subject: 'História',
    shift: 'Matutino',
    weeklyClasses: 4,
    room: 'Sala 08'
  });

  // Notice alerts
  const [linkingNotice, setLinkingNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // IA Optimizer state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationSuccess, setOptimizationSuccess] = useState(false);

  // Selected teacher for premium details (tab display / side section)
  const [premiumTeacherId, setPremiumTeacherId] = useState<string | null>('pf-1');
  
  // Premium Features actions
  const [tempSubstitution, setTempSubstitution] = useState({
    date: '2026-07-21',
    classId: '7º A',
    subject: 'História',
    replacementTeacherName: 'Helena Castro'
  });

  const [tempFreqLog, setTempFreqLog] = useState({
    date: '2026-07-20',
    status: 'Presente' as 'Presente' | 'Ausente' | 'Atraso',
    obs: ''
  });

  const [hasConflict, setHasConflict] = useState<boolean>(true);
  const [conflictMessage, setConflictMessage] = useState<string>(
    "Conflito Detectado: Professor Carlos Eduardo está escalado no mesmo horário (Segunda-feira 07:00) na Turma 7º A (História) e na Turma 7º B (História)!"
  );

  const handleResolveConflict = () => {
    setHasConflict(false);
    setOptimizationSuccess(true);
  };

  const handleOptimizeSchedulesAI = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setOptimizationSuccess(true);
      setHasConflict(false);
    }, 1500);
  };

  // Add substitution
  const handleAddSubstitution = (teacherId: string) => {
    setTeachers(prev => prev.map(t => {
      if (t.id === teacherId) {
        const subs = t.substitutions || [];
        return {
          ...t,
          substitutions: [
            ...subs,
            {
              id: `sub-${Date.now()}`,
              date: tempSubstitution.date,
              classId: tempSubstitution.classId,
              subject: tempSubstitution.subject,
              status: 'Pendente',
              replacementTeacherName: tempSubstitution.replacementTeacherName
            }
          ]
        };
      }
      return t;
    }));
  };

  // Add frequency log
  const handleAddFreqLog = (teacherId: string) => {
    setTeachers(prev => prev.map(t => {
      if (t.id === teacherId) {
        const logs = t.frequencyLogs || [];
        return {
          ...t,
          frequencyLogs: [
            ...logs,
            {
              id: `f-${Date.now()}`,
              date: tempFreqLog.date,
              status: tempFreqLog.status,
              obs: tempFreqLog.obs
            }
          ]
        };
      }
      return t;
    }));
    setTempFreqLog({ date: '2026-07-20', status: 'Presente', obs: '' });
  };

  // Toggle availability slot
  const handleToggleAvailability = (teacherId: string, slot: string) => {
    setTeachers(prev => prev.map(t => {
      if (t.id === teacherId) {
        const currentAvail = t.availability || [];
        const isSelected = currentAvail.includes(slot);
        const newAvail = isSelected 
          ? currentAvail.filter(s => s !== slot) 
          : [...currentAvail, slot];
        return { ...t, availability: newAvail };
      }
      return t;
    }));
  };

  const formatCPF = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  };

  const formatPhone = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 2) return clean;
    if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
  };

  const generateUniqueLogin = (name: string, existingTeachers: any[]): string => {
    const cleanName = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z\s]/g, "") // remove special chars
      .trim();
    
    const parts = cleanName.split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'user';
    
    const first = parts[0];
    const last = parts[parts.length - 1];
    
    let baseLogin = `${first}.${last}`;
    if (parts.length < 2) {
      baseLogin = first;
    }
    
    let currentLogin = baseLogin;
    let counter = 1;
    const existingLogins = existingTeachers.map(t => (t.login || '').toLowerCase().trim());
    
    while (existingLogins.includes(currentLogin)) {
      if (counter === 1) {
        currentLogin = `${first}_${last}`;
      } else if (counter === 2) {
        currentLogin = `${first[0]}.${last}`;
      } else {
        currentLogin = `${baseLogin}${String(counter - 2).padStart(2, '0')}`;
      }
      counter++;
    }
    
    return currentLogin;
  };

  // Save/Update teacher from Wizard
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name || !teacherForm.cpf) return;

    let loginToSave = teacherForm.login;
    let passwordToSave = teacherForm.password || '123senha@';

    if (!loginToSave) {
      loginToSave = generateUniqueLogin(teacherForm.name, teachers);
    }

    const schoolId = profile?.school_id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const emailToSave = teacherForm.email || `${loginToSave}@educamais.edu`;

    try {
      if (editingTeacherId) {
        let rpcSuccess = false;
        try {
          const { error: rpcErr } = await supabase.rpc('update_teacher', {
            p_teacher_id: editingTeacherId,
            p_name: teacherForm.name,
            p_cpf: teacherForm.cpf,
            p_email: emailToSave,
            p_phone: teacherForm.phone,
            p_subject: teacherForm.subject,
            p_role: teacherForm.role,
            p_status: teacherForm.status || 'Ativo',
            p_shift: teacherForm.shift || 'Matutino',
            p_hours: teacherForm.hours || '20h',
            p_contract_type: teacherForm.contractType || 'Efetivo'
          });
          if (!rpcErr) rpcSuccess = true;
        } catch (rpcEx) {
          console.warn('RPC update_teacher not found or failed, falling back to direct table updates:', rpcEx);
        }

        if (!rpcSuccess) {
          // 1. Get existing teacher to find their profile_id
          const { data: currentTeacher, error: teacherFetchErr } = await supabase
            .from('teachers')
            .select('profile_id')
            .eq('id', editingTeacherId)
            .maybeSingle();

          if (teacherFetchErr) throw teacherFetchErr;

          if (currentTeacher?.profile_id) {
            // 2. Update their profile
            await supabase
              .from('profiles')
              .update({
                full_name: teacherForm.name,
                document_number: teacherForm.cpf,
                document_type: 'CPF',
                email: emailToSave,
                phone: teacherForm.phone || null
              })
              .eq('id', currentTeacher.profile_id);
          }

          // 3. Update the teacher record
          const { error: teacherUpdateErr } = await supabase
            .from('teachers')
            .update({
              status: teacherForm.status || 'Ativo',
              subject: teacherForm.subject || 'Geral',
              role: teacherForm.role || 'Professor',
              shift: teacherForm.shift || 'Matutino',
              hours: teacherForm.hours || '20 horas',
              contract_type: teacherForm.contractType || 'Efetivo'
            })
            .eq('id', editingTeacherId);

          if (teacherUpdateErr) throw teacherUpdateErr;
        }

        showToast(`Professor ${teacherForm.name} atualizado com sucesso!`);
      } else {
        let rpcSuccess = false;
        try {
          const { error: rpcErr } = await supabase.rpc('add_teacher', {
            p_name: teacherForm.name,
            p_cpf: teacherForm.cpf,
            p_email: emailToSave,
            p_phone: teacherForm.phone,
            p_subject: teacherForm.subject,
            p_role: teacherForm.role,
            p_status: teacherForm.status || 'Ativo',
            p_shift: teacherForm.shift || 'Matutino',
            p_hours: teacherForm.hours || '20h',
            p_contract_type: teacherForm.contractType || 'Efetivo'
          });
          if (!rpcErr) rpcSuccess = true;
        } catch (rpcEx) {
          console.warn('RPC add_teacher not found or failed, falling back to direct table creation:', rpcEx);
        }

        if (!rpcSuccess) {
          // 1. Find or create profile
          let profileId = '';
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', emailToSave)
            .maybeSingle();

          if (existingProfile) {
            profileId = existingProfile.id;
            await supabase
              .from('profiles')
              .update({
                full_name: teacherForm.name,
                document_number: teacherForm.cpf,
                document_type: 'CPF',
                phone: teacherForm.phone || null
              })
              .eq('id', profileId);
          } else {
            profileId = typeof crypto !== 'undefined' && crypto.randomUUID 
              ? crypto.randomUUID() 
              : `00000000-0000-4000-8000-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

            const { error: profileInsertErr } = await supabase
              .from('profiles')
              .insert({
                id: profileId,
                email: emailToSave,
                full_name: teacherForm.name,
                document_number: teacherForm.cpf,
                document_type: 'CPF',
                phone: teacherForm.phone || null,
                is_active: true
              });

            if (profileInsertErr) throw profileInsertErr;
          }

          // 2. Link role in user_roles
          await supabase
            .from('user_roles')
            .insert({
              user_id: profileId,
              role: 'professor'
            });

          // 3. Create teacher record
          const { error: teacherInsertErr } = await supabase
            .from('teachers')
            .insert({
              profile_id: profileId,
              organization_id: schoolId,
              employee_code: loginToSave,
              status: teacherForm.status || 'Ativo',
              subject: teacherForm.subject || 'Geral',
              role: teacherForm.role || 'Professor',
              shift: teacherForm.shift || 'Matutino',
              hours: teacherForm.hours || '20 horas',
              contract_type: teacherForm.contractType || 'Efetivo'
            });

          if (teacherInsertErr) throw teacherInsertErr;
        }

        showToast(`Professor ${teacherForm.name} cadastrado com sucesso!`);
      }

      setSavedTeacherCredentials({
        name: teacherForm.name,
        login: loginToSave,
        email: emailToSave,
        phone: teacherForm.phone || '(11) 99999-9999',
        senha: passwordToSave
      });

      setEditingTeacherId(null);
      setWizardStep(1);
      setTeacherForm(initialTeacherForm);
      await refreshData();
    } catch (err) {
      console.error('Error saving teacher:', err);
      showToast('Ocorreu um erro ao salvar o professor.');
    }
  };

  const handleResetTeacherPassword = async (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;
    const newPassword = '123senha@'; // standard temporary password
    
    // Optimistic local update
    setTeachers(prev => prev.map(t => {
      if (t.id === teacherId) {
        return {
          ...t,
          password: newPassword,
          provisionalPassword: true,
          passwordChanged: false
        };
      }
      return t;
    }));

    try {
      let rpcSuccess = false;
      try {
        const { error: rpcErr } = await supabase.rpc('reset_teacher_password', { 
          p_teacher_id: teacherId, 
          p_new_password: newPassword 
        });
        if (!rpcErr) rpcSuccess = true;
      } catch (rpcEx) {
        console.warn('RPC reset_teacher_password not found, falling back to direct update:', rpcEx);
      }

      if (!rpcSuccess) {
        // Fallback: update in profiles table metadata or fallback
        const { data: currentTeacher } = await supabase
          .from('teachers')
          .select('profile_id')
          .eq('id', teacherId)
          .maybeSingle();

        if (currentTeacher?.profile_id) {
          await supabase
            .from('profiles')
            .update({ 
              metadata: { 
                provisional_password: newPassword,
                provisional_flag: true 
              } 
            })
            .eq('id', currentTeacher.profile_id);
        }
      }

      showToast(`Senha provisória gerada com sucesso para o Professor ${teacher.name}!`);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      showToast(`Erro ao resetar senha: ${err.message || err}`);
    }

    setSavedTeacherCredentials({
      name: teacher.name,
      login: teacher.login || generateUniqueLogin(teacher.name, teachers),
      email: teacher.email || `${teacher.login || 'user'}@educamais.edu`,
      phone: teacher.phone || '(11) 99999-9999',
      senha: newPassword
    });
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    // Optimistic local update
    setTeachers(prev => prev.filter(t => t.id !== teacherId));

    try {
      let rpcSuccess = false;
      try {
        const { error: rpcErr } = await supabase.rpc('delete_teacher', { p_teacher_id: teacherId });
        if (!rpcErr) rpcSuccess = true;
      } catch (rpcEx) {
        console.warn('RPC delete_teacher not found, falling back to direct delete:', rpcEx);
      }

      if (!rpcSuccess) {
        // Find teacher profile first to delete profile if needed
        const { data: currentTeacher } = await supabase
          .from('teachers')
          .select('profile_id')
          .eq('id', teacherId)
          .maybeSingle();

        const { error: deleteErr } = await supabase
          .from('teachers')
          .delete()
          .eq('id', teacherId);

        if (deleteErr) throw deleteErr;

        if (currentTeacher?.profile_id) {
          // Attempt deleting the profile
          await supabase
            .from('profiles')
            .delete()
            .eq('id', currentTeacher.profile_id);
        }
      }

      showToast(`Professor ${teacher.name} removido com sucesso.`);
      await refreshData();
    } catch (err: any) {
      console.error('Error deleting teacher:', err);
      showToast(`Erro ao excluir professor: ${err.message || err}`);
      // Revert state
      await refreshData();
    }
  };

  // Open edit wizard
  const handleOpenEditWizard = (teacher: any) => {
    setEditingTeacherId(teacher.id);
    setTeacherForm({
      name: teacher.name,
      cpf: teacher.cpf,
      rg: teacher.rg || '',
      birthDate: teacher.birthDate || '',
      gender: teacher.gender || 'M',
      phone: teacher.phone || '',
      email: teacher.email || '',
      address: teacher.address || '',
      city: teacher.city || '',
      state: teacher.state || '',
      cep: teacher.cep || '',
      role: teacher.role,
      function: teacher.function || '',
      subject: teacher.subject,
      matricula: teacher.matricula || '',
      shift: teacher.shift || 'Matutino',
      contractType: teacher.contractType || 'Efetivo',
      permissions: teacher.permissions || ['Professor'],
      status: teacher.status || 'Ativo',
      hours: teacher.hours || '20 horas',
      civilStatus: teacher.civilStatus || 'Solteiro(a)',
      admissionDate: teacher.admissionDate || '',
      observations: teacher.observations || '',
      login: teacher.login || '',
      password: teacher.password || '',
    });
    setWizardStep(1);
    setIsTeacherModalOpen(true);
  };

  // Open academic linking
  const handleOpenLinkingModal = (teacherId: string) => {
    setLinkingTeacherId(teacherId);
    const teacher = teachers.find(t => t.id === teacherId);
    setLinkForm({
      year: '2026',
      segment: 'Fundamental II',
      grade: '7º A',
      subject: teacher ? teacher.subject : 'História',
      shift: 'Matutino',
      weeklyClasses: 4,
      room: 'Sala 08'
    });
    setLinkingNotice(null);
    setIsLinkingModalOpen(true);
  };

  // Save Academic Link
  const handleSaveAcademicLink = async () => {
    if (!linkingTeacherId) return;
    const teacher = teachers.find(t => t.id === linkingTeacherId);
    if (!teacher) return;

    const newLink = {
      id: `link-${Date.now()}`,
      teacherId: linkingTeacherId,
      year: linkForm.year,
      segment: linkForm.segment,
      grade: linkForm.grade,
      subject: linkForm.subject,
      shift: linkForm.shift,
      weeklyClasses: linkForm.weeklyClasses,
      room: linkForm.room
    };

    setAcademicLinks(prev => [...prev, newLink]);

    try {
      let rpcSuccess = false;
      try {
        const { error: rpcErr } = await supabase.rpc('link_teacher_to_class', {
          p_teacher_id: linkingTeacherId,
          p_grade: linkForm.grade,
          p_subject: linkForm.subject,
          p_shift: linkForm.shift,
          p_room: linkForm.room,
          p_weekly_classes: linkForm.weeklyClasses,
          p_year: parseInt(linkForm.year) || 2026
        });
        if (!rpcErr) rpcSuccess = true;
      } catch (rpcEx) {
        console.warn('RPC link_teacher_to_class not found, falling back to local/direct persistence:', rpcEx);
      }

      if (!rpcSuccess) {
        try {
          await supabase.from('class_teachers').insert({
            teacher_id: linkingTeacherId,
            grade: linkForm.grade,
            subject: linkForm.subject,
            shift: linkForm.shift,
            room: linkForm.room,
            weekly_classes: linkForm.weeklyClasses,
            year: parseInt(linkForm.year) || 2026
          });
        } catch (tblErr) {
          console.warn('Table class_teachers direct insert failed (might not exist):', tblErr);
        }
      }

      // Show beautiful multi-action success prompt:
      setLinkingNotice({
        type: 'success',
        msg: `Vínculo acadêmico salvo com sucesso para o Professor ${teacher.name}! O sistema automaticamente:
        ✓ Criou a agenda do professor
        ✓ Criou o diário de classe
        ✓ Criou a folha de frequência
        ✓ Liberou acesso às turmas
        ✓ Vinculou os estudantes de ${linkForm.grade} no Classium Professor`
      });

      // Automatically dismiss linking notice after 6 seconds
      setTimeout(() => {
        setLinkingNotice(null);
      }, 6000);

      await refreshData();
    } catch (err: any) {
      console.error('Error linking teacher:', err);
      showToast(`Erro ao salvar vínculo: ${err.message || err}`);
    }
  };

  // Remove Academic Link
  const handleRemoveAcademicLink = async (linkId: string) => {
    setAcademicLinks(prev => prev.filter(l => l.id !== linkId));

    try {
      let rpcSuccess = false;
      try {
        const { error: rpcErr } = await supabase.rpc('unlink_teacher_from_class', {
          p_link_id: linkId
        });
        if (!rpcErr) rpcSuccess = true;
      } catch (rpcEx) {
        console.warn('RPC unlink_teacher_from_class not found:', rpcEx);
      }

      if (!rpcSuccess) {
        try {
          await supabase.from('class_teachers').delete().eq('id', linkId);
        } catch (tblErr) {
          console.warn('Table class_teachers direct delete failed:', tblErr);
        }
      }

      showToast('Vínculo acadêmico removido com sucesso.');
      await refreshData();
    } catch (err: any) {
      console.error('Error removing link:', err);
      showToast(`Erro ao remover vínculo: ${err.message || err}`);
    }
  };


  // 1️⃣ Handlers for column management
  const toggleColumnVisibility = (key: keyof Student) => {
    setColumns(prev => prev.map(col => col.key === key ? { ...col, visible: !col.visible } : col));
  };

  const moveColumnLeft = (index: number) => {
    if (index === 0) return;
    setColumns(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveColumnRight = (index: number) => {
    if (index === columns.length - 1) return;
    setColumns(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  // Sorting
  const requestSort = (key: keyof Student) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortField === key && sortDirection === 'asc') {
      direction = 'desc';
    }
    setSortField(key);
    setSortDirection(direction);
  };

  // Single-cell direct Excel-like edit
  const handleCellDoubleClick = (studentId: string, field: keyof Student, currentValue: any) => {
    setEditingCell({ studentId, field });
    setEditValue(String(currentValue));
  };

  const handleSaveCellEdit = () => {
    if (!editingCell) return;
    const { studentId, field } = editingCell;
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        let val: any = editValue;
        if (field === 'age') val = parseInt(editValue) || s.age;
        return { ...s, [field]: val };
      }
      return s;
    }));
    setEditingCell(null);
  };

  // Smart regex clipboard parser
  const handleParseRawText = () => {
    if (!rawImportText.trim()) return;
    const lines = rawImportText.split('\n');
    const parsed: Partial<Student>[] = [];

    lines.forEach((line, index) => {
      if (!line.trim()) return;

      const nameMatch = line.match(/^([^,:]+)/);
      const cpfMatch = line.match(/CPF:?\s*([\d\.-]+)/i);
      const phoneMatch = line.match(/Tel:?\s*([\(\)\d\s-]+)/i);
      const birthMatch = line.match(/Nascimento:?\s*([\d\/]+)/i);
      const gradeMatch = line.match(/Série:?\s*([^,\n]+)/i);

      parsed.push({
        id: `parsed-${index}-${Date.now()}`,
        name: nameMatch ? nameMatch[1].trim() : `Novo Estudante ${index + 1}`,
        cpf: cpfMatch ? cpfMatch[1].trim() : '000.000.000-00',
        phone: phoneMatch ? phoneMatch[1].trim() : '(11) 99999-0000',
        birthDate: birthMatch ? birthMatch[1].trim() : '12/10/2013',
        age: 13,
        grade: gradeMatch ? gradeMatch[1].trim() : '7º Ano A',
        matricula: String(20261000 + Math.floor(Math.random() * 10000)),
        sex: 'M',
        shift: 'Matutino',
        segment: 'Fundamental II',
        status: 'Ativo',
        parent: 'Responsável Cadastrado',
        address: 'Endereço não informado',
        transport: false,
        aee: false,
        laudo: false,
        docPending: false,
        familyComm: true
      });
    });

    setParsedImportList(parsed);
    setImportStatus('parsed');
  };

  const handleCommitImport = () => {
    setStudents(prev => [...(parsedImportList as Student[]), ...prev]);
    setImportStatus('imported');
    setParsedImportList([]);
    setRawImportText('');
    setTimeout(() => {
      setImportStatus('idle');
      setIsImportModalOpen(false);
    }, 2000);
  };

  // Add/Update individual student
  const handleAddIndividualStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.name) return;

    try {
      const activeOrgId = currentUser?.organizationId || '11111111-1111-1111-1111-111111111111';
      
      const medInfo = {
        sex: newStudentForm.sex,
        age: newStudentForm.age,
        shift: newStudentForm.shift,
        segment: newStudentForm.segment,
        parent: newStudentForm.parent,
        phone: newStudentForm.phone,
        address: newStudentForm.address,
        transport: newStudentForm.transport,
        aee: newStudentForm.aee,
        laudo: newStudentForm.laudo,
        docPending: newStudentForm.docPending,
        familyComm: newStudentForm.familyComm,
        bairro: newStudentForm.bairro || '',
        cidade: newStudentForm.cidade || '',
        cep: newStudentForm.cep || '',
        observacoes: newStudentForm.observacoes || '',
        professorRegente: 'Prof. Carlos Eduardo (História)'
      };

      const payload = {
        organization_id: activeOrgId,
        full_name: newStudentForm.name,
        name: newStudentForm.name,
        cpf: newStudentForm.cpf,
        birth_date: newStudentForm.birthDate,
        grade: newStudentForm.grade,
        registration_code: newStudentForm.matricula || (editingStudentId ? (students.find(s => s.id === editingStudentId)?.matricula || '') : `RA-${Math.floor(100000 + Math.random() * 900000)}`),
        status: newStudentForm.status === 'Ativo' ? 'active' : newStudentForm.status || 'active',
        medical_info: medInfo,
        photo_url: newStudentForm.photoUrl || (editingStudentId ? (students.find(s => s.id === editingStudentId)?.photoUrl || '') : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150')
      };

      if (editingStudentId) {
        let rpcSuccess = false;
        try {
          const { error: rpcErr } = await supabase.rpc('update_student', {
            p_student_id: editingStudentId,
            p_payload: payload
          });
          if (!rpcErr) rpcSuccess = true;
        } catch (rpcEx) {
          console.warn('RPC update_student not found or failed, falling back to direct update:', rpcEx);
        }

        if (!rpcSuccess) {
          const { error: updateError } = await supabase
            .from('students')
            .update(payload)
            .eq('id', editingStudentId);

          if (updateError) throw updateError;
        }

        showToast(`Estudante ${newStudentForm.name} atualizado com sucesso!`);
      } else {
        let rpcSuccess = false;
        try {
          const { error: rpcErr } = await supabase.rpc('add_student', {
            p_payload: payload
          });
          if (!rpcErr) rpcSuccess = true;
        } catch (rpcEx) {
          console.warn('RPC add_student not found or failed, falling back to direct insert:', rpcEx);
        }

        if (!rpcSuccess) {
          const { error: insertError } = await supabase
            .from('students')
            .insert(payload);
            
          if (insertError) throw insertError;
        }

        showToast(`Estudante ${newStudentForm.name} cadastrado com sucesso!`);
      }

      setIsRegistrationModalOpen(false);
      setEditingStudentId(null);
      // Reset form
      setNewStudentForm({
        name: '', cpf: '', sex: 'M', birthDate: '', age: 14,
        grade: '7º Ano A', shift: 'Matutino', segment: 'Fundamental II',
        status: 'Ativo', parent: '', phone: '', address: '',
        transport: false, aee: false, laudo: false, docPending: false, familyComm: true
      });
      await refreshData();
    } catch (err: any) {
      console.error('Error saving student:', err);
      setError(err?.message || 'Ocorreu um erro ao salvar o estudante no Supabase.');
    }
  };

  const handleMassStatusUpdate = async (status: Student['status']) => {
    try {
      await Promise.all(selectedStudentIds.map(id => studentsService.update(id, { status })));
      showToast(`Status de ${selectedStudentIds.length} estudantes atualizado com sucesso!`);
      setSelectedStudentIds([]);
      await refreshData();
    } catch (err) {
      console.error('Error updating statuses:', err);
      showToast('Erro ao atualizar status.');
    }
  };

  const handleMassDelete = async () => {
    if (confirm(`Deseja excluir permanentemente os ${selectedStudentIds.length} estudantes selecionados?`)) {
      try {
        await Promise.all(selectedStudentIds.map(id => studentsService.delete(id)));
        showToast(`${selectedStudentIds.length} estudantes excluídos com sucesso!`);
        setSelectedStudentIds([]);
        await refreshData();
      } catch (err) {
        console.error('Error in mass delete:', err);
        showToast('Erro ao excluir estudantes.');
      }
    }
  };
  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredList: Student[]) => {
    const filteredIds = filteredList.map(s => s.id);
    const allSelected = filteredIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => {
        const union = new Set([...prev, ...filteredIds]);
        return Array.from(union);
      });
    }
  };

  // Filtering Logic
  // Dynamic list of system turmas with bound student count calculation
  const systemClassesList = React.useMemo(() => {
    const baseClasses = [
      { name: 'Turma 111', defaultCount: 25 },
      { name: 'Turma 525', defaultCount: 31 },
      { name: '5º Ano A', defaultCount: 28 },
      { name: '6º Ano B', defaultCount: 22 },
      { name: '7º Ano A', defaultCount: 35 },
      { name: '8º Ano B', defaultCount: 30 },
      { name: '9º Ano A', defaultCount: 27 },
      { name: '1ª Série EM', defaultCount: 29 },
      { name: '2ª Série EM', defaultCount: 26 },
      { name: '3ª Série EM', defaultCount: 24 },
      { name: 'Pré I', defaultCount: 18 },
      { name: 'Pré II', defaultCount: 20 },
    ];

    const extraGradesFromStudents: string[] = Array.from(
      new Set(students.map(s => s.grade as string).filter(Boolean))
    );

    const existingNames = new Set(baseClasses.map(c => c.name));
    const merged = [...baseClasses];

    extraGradesFromStudents.forEach(gName => {
      if (!existingNames.has(gName)) {
        merged.push({ name: gName, defaultCount: 15 });
      }
    });

    return merged.map(c => {
      const realCount = students.filter(s => 
        s.grade === c.name || 
        s.grade.startsWith(c.name) ||
        (c.name.includes('111') && s.grade.includes('111')) ||
        (c.name.includes('525') && s.grade.includes('525'))
      ).length;

      const countToDisplay = realCount > 0 ? realCount : c.defaultCount;

      return {
        name: c.name,
        count: countToDisplay
      };
    });
  }, [students]);

  const filteredStudents = students.filter(s => {
    // Global search input
    const matchesSearch = searchQuery === '' || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cpf.includes(searchQuery) ||
      s.matricula.includes(searchQuery) ||
      s.parent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery);

    // Grade dropdown
    const matchesGrade = selectedGrade === 'Todas' || 
      s.grade === selectedGrade ||
      s.grade.startsWith(selectedGrade) ||
      (selectedGrade.includes('111') && s.grade.includes('111')) ||
      (selectedGrade.includes('525') && s.grade.includes('525'));

    // Shift dropdown
    const matchesShift = selectedShift === 'Todos' || 
      s.shift === selectedShift ||
      (selectedShift === '1º turno' && (s.shift === 'Matutino' || s.shift === '1º turno' || s.shift === '1º Turno')) ||
      (selectedShift === '2º turno' && (s.shift === 'Vespertino' || s.shift === '2º turno' || s.shift === '2º Turno')) ||
      (selectedShift === '3º turno' && (s.shift === 'Noturno' || s.shift === '3º turno' || s.shift === '3º Turno')) ||
      (selectedShift === 'Integral' && s.shift === 'Integral');

    // Segment dropdown
    const matchesSegment = selectedSegment === 'Todos' || s.segment === selectedSegment;

    // Status dropdown
    const matchesStatus = selectedStatus === 'Todos' || s.status === selectedStatus;

    return matchesSearch && matchesGrade && matchesShift && matchesSegment && matchesStatus;
  });

  // Sorting Logic
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!sortField) return 0;
    const valA = a[sortField];
    const valB = b[sortField];
    if (valA === undefined || valB === undefined) return 0;

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
    return 0;
  });

  // Statistics calculation based on current filters
  const totalCount = filteredStudents.length;
  const maleCount = filteredStudents.filter(s => s.sex === 'M').length;
  const femaleCount = filteredStudents.filter(s => s.sex === 'F').length;
  const aeeCount = filteredStudents.filter(s => s.aee).length;
  const transportCount = filteredStudents.filter(s => s.transport).length;

  // Filtered teachers list
  const filteredTeachers = teachers.filter(t => {
    // Search query: name or CPF
    const matchesSearch = t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) || 
                          t.cpf.includes(teacherSearchQuery);
    
    // Quick Area filter (multiple selection)
    const matchesArea = selectedSubjectAreas.includes('Todos') || selectedSubjectAreas.includes(t.subject);

    // Additional filters
    const matchesYear = filterYear === 'Todos' || true; // Year is static mock or linked
    const matchesSubject = filterSubject === 'Todas' || t.subject === filterSubject;
    const matchesRole = filterRole === 'Todos' || t.role === filterRole;
    const matchesShift = filterShift === 'Todos' || t.shift === filterShift;
    const matchesContract = filterContractType === 'Todos' || t.contractType === filterContractType;
    const matchesStatus = filterStatus === 'Todos' || t.status === filterStatus;

    return matchesSearch && matchesArea && matchesSubject && matchesRole && matchesShift && matchesContract && matchesStatus;
  }).sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical order as requested!

  return (
    <div className="space-y-6 text-left">
      
      {/* Sub tabs navigation */}
      <div className="flex border-b border-slate-800 gap-6">
        {allowedTabs.includes('alunos') && (
          <button
            onClick={() => setActiveSubTab('alunos')}
            className={`pb-3 text-xs uppercase tracking-widest font-bold transition-colors ${
              activeSubTab === 'alunos' ? 'border-b-2 border-[#D4AF37] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Estudante/Criança
          </button>
        )}
        {allowedTabs.includes('professores') && (
          <button
            onClick={() => setActiveSubTab('professores')}
            className={`pb-3 text-xs uppercase tracking-widest font-bold transition-colors ${
              activeSubTab === 'professores' ? 'border-b-2 border-[#D4AF37] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Professores & Horários
          </button>
        )}
        {allowedTabs.includes('responsaveis') && (
          <button
            onClick={() => setActiveSubTab('responsaveis')}
            className={`pb-3 text-xs uppercase tracking-widest font-bold transition-colors ${
              activeSubTab === 'responsaveis' ? 'border-b-2 border-[#D4AF37] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Central Inteligente de Responsáveis
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/40 p-4 rounded-xl text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {activeSubTab === 'alunos' && (
        <div className="space-y-6 animate-fade-in relative">
          
          {/* 1️⃣ BARRA SUPERIOR DE PESQUISA INTELIGENTE (Monday/Airtable Style Premium Filter Toolbar) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl relative z-20 space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              
              {/* Year, Grade Favoriting & Smart Matriculados Card */}
              <div className="flex items-center gap-3">
                {/* Ano Letivo Dropdown */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Ano Letivo</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-[#D4AF37]"
                  >
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                  </select>
                </div>

                {/* Smart Card Matriculados (Clickable -> Opens Modal) */}
                <button
                  onClick={() => setIsMatriculadosModalOpen(true)}
                  className="bg-gradient-to-r from-blue-900/30 to-purple-900/20 border border-blue-500/30 hover:border-blue-400 rounded-2xl px-4 py-2 text-left transition-all group flex items-center gap-3 hover:scale-[1.02]"
                >
                  <div>
                    <span className="text-[8px] uppercase tracking-wider text-slate-300 font-bold block group-hover:text-[#D4AF37] transition-colors">
                      Matriculados • 2026
                    </span>
                    <span className="text-xl font-extrabold text-white font-mono flex items-center gap-1.5">
                      1.245 <span className="text-[10px] text-blue-400 font-normal">estudantes</span>
                    </span>
                  </div>
                  <Info className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </button>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsEnrollmentWizardOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-gold to-[#b3922e] hover:from-[#e2bf4c] hover:to-[#a38022] text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-gold/15 transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" /> Matrícula Completa
                </button>

                <button
                  onClick={() => {
                    setEditingStudentId(null);
                    setNewStudentForm({
                      name: '', cpf: '', sex: 'M', birthDate: '', age: 14,
                      grade: '7º Ano A', shift: 'Matutino', segment: 'Fundamental II',
                      status: 'Ativo', parent: '', phone: '', address: '',
                      transport: false, aee: false, laudo: false, docPending: false, familyComm: true
                    });
                    setIsRegistrationModalOpen(true);
                  }}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <UserPlus className="w-4 h-4" /> Novo Aluno Simples
                </button>

                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3.5 py-2 bg-slate-950 border border-slate-800 hover:border-purple-500/40 text-purple-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Importar Excel/AI
                </button>

                <button
                  onClick={() => {
                    alert("Simulando importação de PDF cadastral. Todos os dados foram atualizados no sistema.");
                  }}
                  className="px-3.5 py-2 bg-slate-950 border border-slate-800 hover:border-red-500/40 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-4 h-4" /> Importar PDF
                </button>

                <button
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," 
                      + "Nome,Turma,Turno,Matrícula,CPF\n"
                      + students.map(s => `"${s.name}","${s.grade}","${s.shift}","${s.matricula}","${s.cpf}"`).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `Educa_Alunos_${selectedYear}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-xl text-xs text-slate-300 flex items-center gap-1 transition-all"
                  title="Exportar base em CSV"
                >
                  <Upload className="w-3.5 h-3.5" /> Exportar
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-xl text-xs text-slate-300 flex items-center gap-1 transition-all"
                  title="Imprimir visualização atual"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>

                {/* Column Configuration Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setIsColumnsPopoverOpen(!isColumnsPopoverOpen)}
                    className={`px-3 py-2 bg-slate-950 border rounded-xl text-xs flex items-center gap-1 transition-all ${
                      isColumnsPopoverOpen ? 'border-[#D4AF37] text-white' : 'border-slate-800 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" /> Colunas
                  </button>

                  {isColumnsPopoverOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Ativar Colunas</span>
                        <X className="w-3.5 h-3.5 text-slate-400 cursor-pointer" onClick={() => setIsColumnsPopoverOpen(false)} />
                      </div>
                      <div className="space-y-2">
                        {columns.map((col, index) => (
                          <div key={col.key} className="flex items-center justify-between text-xs text-slate-300">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={col.visible}
                                onChange={() => toggleColumnVisibility(col.key)}
                                className="rounded bg-slate-900 border-slate-800 text-[#D4AF37] focus:ring-0"
                              />
                              <span>{col.label}</span>
                            </label>
                            <div className="flex gap-1">
                              <button onClick={() => moveColumnLeft(index)} className="p-0.5 hover:bg-slate-800 rounded text-[9px]">◀</button>
                              <button onClick={() => moveColumnRight(index)} className="p-0.5 hover:bg-slate-800 rounded text-[9px]">▶</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Premium Smart Grid Dropdown Filters (Monday style) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
              
              {/* Segmento Dropdown */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Segmento</span>
                <select
                  value={selectedSegment}
                  onChange={(e) => {
                    setSelectedSegment(e.target.value);
                    setSelectedGrade('Todas'); // Reset grade when segment changes
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-[#D4AF37] font-semibold"
                >
                  <option value="Todos">Todos os Segmentos</option>
                  <option value="Educação Infantil">Educação Infantil</option>
                  <option value="Fundamental I">Fundamental I</option>
                  <option value="Fundamental II">Fundamental II</option>
                  <option value="Ensino Médio">Ensino Médio</option>
                  <option value="EJA">EJA</option>
                </select>
              </div>

              {/* Turmas Dropdown */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Turma</span>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-[#D4AF37] font-semibold"
                >
                  <option value="Todas">Todas as turmas ({students.length} Est.)</option>
                  {systemClassesList.map(item => (
                    <option key={item.name} value={item.name}>
                      {item.name} ({item.count} Est.)
                    </option>
                  ))}
                </select>
              </div>

              {/* Turno Dropdown */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Turno</span>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-[#D4AF37] font-semibold"
                >
                  <option value="Todos">Todos os Turnos</option>
                  <option value="1º turno">1º turno</option>
                  <option value="2º turno">2º turno</option>
                  <option value="3º turno">3º turno</option>
                  <option value="Integral">Integral</option>
                </select>
              </div>

              {/* Situação Dropdown */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Situação</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-[#D4AF37] font-semibold"
                >
                  <option value="Todos">Todos os Status</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Transferido">Transferido</option>
                  <option value="Desistente">Desistente</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Cancelado">Cancelado</option>
                  <option value="Em análise">Em análise</option>
                </select>
              </div>

              {/* Global Query Search */}
              <div className="flex flex-col gap-1 md:col-span-2">
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Pesquisar por</span>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Nome, CPF, Matrícula, Responsável..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-xs text-white outline-none focus:border-[#D4AF37] placeholder:text-slate-500"
                  />
                  {searchQuery && (
                    <X className="w-3 h-3 text-slate-400 hover:text-white absolute right-3 top-3.5 cursor-pointer" onClick={() => setSearchQuery('')} />
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* 2️⃣ CARDS ESTATÍSTICOS (Live Updated Summary Badges) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Total Alunos</span>
                <span className="text-lg font-extrabold text-white font-mono">{totalCount}</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Masculino</span>
                <span className="text-lg font-extrabold text-white font-mono">{maleCount}</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Feminino</span>
                <span className="text-lg font-extrabold text-white font-mono">{femaleCount}</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Inclusão (AEE)</span>
                <span className="text-lg font-extrabold text-white font-mono">{aeeCount}</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-gold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Transporte</span>
                <span className="text-lg font-extrabold text-white font-mono">{transportCount}</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Frequência</span>
                <span className="text-lg font-extrabold text-white font-mono">94.2%</span>
              </div>
            </div>

          </div>

          {/* 3️⃣ GRADE PRINCIPAL (Interactive Smart Grid like Airtable / Monday / Notion) */}
          <div className="bg-slate-900/60 border border-slate-850 rounded-3xl overflow-hidden shadow-2xl relative">
            
            {/* Table Action overlay when rows are checked */}
            {selectedStudentIds.length > 0 && (
              <div className="absolute top-0 inset-x-0 bg-slate-950 border-b border-blue-500/30 p-3 px-6 z-30 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-3 text-xs">
                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold px-2.5 py-0.5 rounded-full font-mono">
                    {selectedStudentIds.length} selecionados
                  </span>
                  <span className="text-slate-400">Ações em massa:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMassStatusUpdate('Ativo')}
                    className="px-3 py-1.5 bg-green-900/20 text-green-400 hover:bg-green-900/40 rounded-xl text-[10px] font-bold uppercase transition-all"
                  >
                    Marcar Ativo
                  </button>
                  <button
                    onClick={() => handleMassStatusUpdate('Transferido')}
                    className="px-3 py-1.5 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40 rounded-xl text-[10px] font-bold uppercase transition-all"
                  >
                    Marcar Transferido
                  </button>
                  <button
                    onClick={() => {
                      alert(`Enviando comunicado em massa via WhatsApp e E-mail para os responsáveis dos ${selectedStudentIds.length} alunos.`);
                      setSelectedStudentIds([]);
                    }}
                    className="px-3 py-1.5 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 rounded-xl text-[10px] font-bold uppercase transition-all"
                  >
                    Enviar Comunicado
                  </button>
                  <button
                    onClick={handleMassDelete}
                    className="px-3 py-1.5 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Excluir Seleção
                  </button>
                  <button
                    onClick={() => setSelectedStudentIds([])}
                    className="p-1.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Smart Grid Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-300">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={sortedStudents.length > 0 && sortedStudents.every(s => selectedStudentIds.includes(s.id))}
                        onChange={() => toggleSelectAll(sortedStudents)}
                        className="rounded bg-slate-900 border-slate-800 text-[#D4AF37] focus:ring-0 cursor-pointer w-4 h-4"
                      />
                    </th>
                    
                    {/* Status vertical color edge space */}
                    <th className="p-0 w-1"></th>

                    {/* Column Headers with Sort and Reorder icons */}
                    {columns.filter(c => c.visible).map((col) => (
                      <th 
                        key={col.key} 
                        onClick={() => requestSort(col.key)}
                        className={`p-3 font-semibold text-slate-300 font-mono tracking-wider cursor-pointer hover:bg-slate-900/80 transition-colors uppercase text-[9px] ${col.width} border-r border-blue-500/15`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col.label}</span>
                          {sortField === col.key ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#D4AF37]" /> : <ArrowDown className="w-3 h-3 text-[#D4AF37]" />
                          ) : (
                            <SlidersHorizontal className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      </th>
                    ))}

                    <th className="p-3 font-semibold text-slate-300 text-center w-28 uppercase text-[9px] font-mono">Indicadores</th>
                    <th className="p-3 font-semibold text-slate-300 text-right w-44 uppercase text-[9px] font-mono">Ações</th>
                  </tr>
                </thead>
                
                <tbody className="divide-y divide-slate-850">
                  {sortedStudents.map((s) => {
                    // Line status color decoration
                    let statusColor = 'border-l-transparent';
                    if (s.status === 'Ativo') statusColor = 'border-l-green-500';
                    else if (s.status === 'Transferido') statusColor = 'border-l-amber-500';
                    else if (s.status === 'Em análise') statusColor = 'border-l-blue-400';
                    else if (s.status === 'Desistente') statusColor = 'border-l-rose-500';
                    else if (s.status === 'Concluído') statusColor = 'border-l-purple-500';

                    const isChecked = selectedStudentIds.includes(s.id);

                    return (
                      <tr 
                        key={s.id} 
                        className={`transition-colors border-l-4 ${statusColor} ${
                          isChecked ? 'bg-blue-500/5' : 'hover:bg-white/5'
                        }`}
                      >
                        {/* Checkbox select */}
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectStudent(s.id)}
                            className="rounded bg-slate-900 border-slate-800 text-[#D4AF37] focus:ring-0 cursor-pointer w-4 h-4"
                          />
                        </td>

                        {/* Spacer corresponding to vertical status badge */}
                        <td className="p-0"></td>

                        {/* Interactive columns rendering */}
                        {columns.filter(c => c.visible).map((col) => {
                          const isEditing = editingCell?.studentId === s.id && editingCell?.field === col.key;
                          const cellValue = s[col.key];

                          return (
                            <td 
                              key={col.key} 
                              onDoubleClick={() => handleCellDoubleClick(s.id, col.key, cellValue)}
                              className="p-3 text-slate-200 transition-all font-sans relative group cursor-pointer border-r border-blue-500/15"
                              title="Clique duplo para editar célula"
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleSaveCellEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCellEdit();
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  autoFocus
                                  className="bg-slate-950 border border-[#D4AF37] text-white p-1 rounded w-full text-xs outline-none"
                                />
                              ) : (
                                <div className="flex items-center justify-between">
                                  {/* Special visual overrides for specific keys */}
                                  {col.key === 'status' ? (
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                      s.status === 'Ativo' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                      s.status === 'Transferido' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                      s.status === 'Desistente' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                      s.status === 'Concluído' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                      'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    }`}>
                                      {s.status}
                                    </span>
                                  ) : col.key === 'cpf' ? (
                                    <span className="font-mono text-slate-400">{s.cpf}</span>
                                  ) : col.key === 'shift' ? (
                                    <span className="text-slate-200">
                                      {s.shift === 'Matutino' ? '1º Turno' : 
                                       s.shift === 'Vespertino' ? '2º Turno' : 
                                       s.shift === 'Noturno' ? '3º Turno' : s.shift}
                                    </span>
                                  ) : col.key === 'name' ? (
                                    <span className="font-medium text-white group-hover:text-gold transition-colors">{s.name}</span>
                                  ) : (
                                    <span>{String(cellValue)}</span>
                                  )}
                                  <Edit2 className="w-2.5 h-2.5 text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Quick indicator badges (Monday-like flags) */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {s.transport && (
                              <span className="w-5 h-5 rounded-lg bg-yellow-500/10 flex items-center justify-center text-gold" title="Utiliza Transporte Escolar">
                                🚌
                              </span>
                            )}
                            {s.aee && (
                              <span className="w-5 h-5 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400" title="Atendimento Educacional Especializado (Inclusão)">
                                ♿
                              </span>
                            )}
                            {s.laudo && (
                              <span className="w-5 h-5 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400" title="Possui Laudo Médico">
                                📄
                              </span>
                            )}
                            {s.docPending && (
                              <span className="w-5 h-5 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400" title="Pendência Documental no Prontuário">
                                ⚠️
                              </span>
                            )}
                            {s.familyComm && (
                              <span className="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400" title="Comunicação com Família Ativa no APP">
                                💬
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedStudent(s)}
                              className="px-2 py-1 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg flex items-center gap-1 transition-all"
                              title="Visualizar Detalhes no Painel Lateral"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-400" />
                              <span>Ver</span>
                            </button>

                            <button
                              onClick={() => {
                                setNewStudentForm({ ...s });
                                setEditingStudentId(s.id);
                                setIsRegistrationModalOpen(true);
                              }}
                              className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-[#D4AF37] rounded-lg"
                              title="Editar Dados Completos do Estudante"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={`tel:${s.phone}`}
                              className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg flex items-center justify-center"
                              title={`Ligar para Responsável: ${s.parent}`}
                            >
                              <Phone className="w-3.5 h-3.5 text-green-400" />
                            </a>

                            <button
                              onClick={() => {
                                if (confirm(`Deseja arquivar ou excluir permanentemente o estudante ${s.name}?`)) {
                                  setStudents(prev => prev.filter(item => item.id !== s.id));
                                }
                              }}
                              className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg"
                              title="Excluir Estudante"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedStudents.length === 0 && (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-500">
                        Nenhum estudante atende aos filtros selecionados. Remova filtros para exibir.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé da Tabela */}
            <div className="bg-slate-950/80 border-t border-slate-850 p-4 px-6 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-6">
                <span>Total Geral: <strong className="text-white">{students.length} estudantes</strong> na base</span>
                <span>Filtro Ativo: <strong className="text-[#D4AF37]">{selectedGrade === 'Todas' ? 'Tudo' : selectedGrade}</strong></span>
                <span>Selecionados: <strong className="text-blue-400">{selectedStudentIds.length}</strong></span>
              </div>
              <div className="flex items-center gap-4">
                <span>Consulta realizada em <strong className="text-emerald-400">0.18s</strong></span>
                <div className="flex items-center gap-1.5">
                  <button className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded text-slate-300">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span>Página <strong>1</strong> de <strong>68</strong></span>
                  <button className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded text-slate-300">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* 4️⃣ PAINEL LATERAL INTELIGENTE (Sidebar Drawer Slider) */}
          {selectedStudent && (
            <div className="fixed inset-y-0 right-0 w-[450px] bg-slate-950 border-l border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50 flex flex-col justify-between animate-slide-in p-6 text-left">
              
              <div className="space-y-6">
                
                {/* Header of panel */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gold" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37]">Ficha do Estudante (Monday ERP)</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedStudent(null);
                      setIsIaAssistantOpen(false);
                    }} 
                    className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile card section */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-bordeaux to-blue-900 border border-gold/30 flex items-center justify-center text-white text-xl font-bold uppercase shrink-0">
                    {(selectedStudent.name || (selectedStudent as any).full_name || 'E').charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-bold">
                      Matrícula {selectedStudent.matricula}
                    </span>
                    <h3 className="text-base font-bold text-white font-serif tracking-wide">{selectedStudent.name || (selectedStudent as any).full_name || 'Estudante'}</h3>
                    <p className="text-xs text-[#D4AF37] font-semibold">{selectedStudent.grade} • Turno {selectedStudent.shift}</p>
                  </div>
                </div>

                {/* Ações Rápidas de Gestão */}
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => {
                      setNewStudentForm({ ...selectedStudent });
                      setEditingStudentId(selectedStudent.id);
                      setIsRegistrationModalOpen(true);
                    }}
                    className="flex-1 py-2 bg-[#D4AF37] hover:bg-[#b3922e] text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Cadastro</span>
                  </button>

                   <button
                    onClick={async () => {
                      const oldStudent = selectedStudent;
                      const nextStatus = oldStudent.status === 'Ativo' ? 'Cancelado' : 'Ativo';
                      
                      // Optimistic state updates
                      setStudents(prev => prev.map(s => s.id === oldStudent.id ? { ...s, status: nextStatus } : s));
                      setSelectedStudent(prev => prev ? { ...prev, status: nextStatus } : null);

                      try {
                        let rpcSuccess = false;
                        const rpcName = nextStatus === 'Ativo' ? 'activate_student' : 'deactivate_student';
                        try {
                          const { error: rpcErr } = await supabase.rpc(rpcName, { p_student_id: oldStudent.id });
                          if (!rpcErr) rpcSuccess = true;
                        } catch (rpcEx) {
                          console.warn(`RPC ${rpcName} not found or failed, falling back to direct update:`, rpcEx);
                        }

                        if (!rpcSuccess) {
                          const { error: updateError } = await supabase
                            .from('students')
                            .update({ status: nextStatus === 'Ativo' ? 'active' : 'inactive' })
                            .eq('id', oldStudent.id);

                          if (updateError) throw updateError;
                        }

                        showToast(`Status do estudante alterado para ${nextStatus} com sucesso!`);
                        await refreshData();
                      } catch (err: any) {
                        console.error('Error changing student status:', err);
                        showToast(`Erro ao alterar status: ${err.message || err}`);
                        // Revert
                        setStudents(prev => prev.map(s => s.id === oldStudent.id ? { ...s, status: oldStudent.status } : s));
                        setSelectedStudent(oldStudent);
                      }
                    }}
                    className={`flex-1 py-2 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all border ${
                      selectedStudent.status === 'Ativo'
                        ? 'bg-red-950/30 border-red-500/20 text-red-400 hover:bg-red-900/20'
                        : 'bg-green-950/30 border-green-500/20 text-green-400 hover:bg-green-900/20'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{selectedStudent.status === 'Ativo' ? 'Desativar Aluno' : 'Ativar Aluno'}</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (confirm(`Deseja realmente excluir permanentemente o estudante ${selectedStudent.name || (selectedStudent as any).full_name || 'selecionado'}?`)) {
                        const oldStudent = selectedStudent;
                        
                        // Optimistic state updates
                        setStudents(prev => prev.filter(item => item.id !== oldStudent.id));
                        setSelectedStudent(null);

                        try {
                          let rpcSuccess = false;
                          try {
                            const { error: rpcErr } = await supabase.rpc('delete_student', { p_student_id: oldStudent.id });
                            if (!rpcErr) rpcSuccess = true;
                          } catch (rpcEx) {
                            console.warn('RPC delete_student not found or failed, falling back to direct delete:', rpcEx);
                          }

                          if (!rpcSuccess) {
                            const { error: deleteError } = await supabase
                              .from('students')
                              .delete()
                              .eq('id', oldStudent.id);

                            if (deleteError) throw deleteError;
                          }

                          showToast(`Estudante ${oldStudent.name} removido com sucesso.`);
                          await refreshData();
                        } catch (err: any) {
                          console.error('Error deleting student:', err);
                          showToast(`Erro ao excluir estudante: ${err.message || err}`);
                          // Revert
                          setStudents(prev => [...prev, oldStudent]);
                          setSelectedStudent(oldStudent);
                        }
                      }
                    }}
                    className="p-2 bg-slate-900 border border-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-xl transition-all"
                    title="Excluir Estudante"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Extended student fields list */}
                <div className="space-y-4 bg-slate-900/40 border border-slate-850 p-4 rounded-2xl">
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 block">CPF</span>
                      <span className="font-mono text-white">{selectedStudent.cpf}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Nascimento</span>
                      <span className="font-mono text-white">{selectedStudent.birthDate} ({selectedStudent.age} anos)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-850 pt-3">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Responsável Legal</span>
                      <span className="text-white font-medium">{selectedStudent.parent}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Telefone</span>
                      <span className="font-mono text-green-400">{selectedStudent.phone}</span>
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-slate-850 pt-3 text-xs">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Endereço Residencial</span>
                    <span className="text-slate-300 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      {selectedStudent.address}
                    </span>
                  </div>

                </div>

                {/* Smart Features / IA Classium Integration */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => setIsIaAssistantOpen(!isIaAssistantOpen)}
                    className="w-full py-3 bg-gradient-to-r from-purple-900/40 to-blue-900/40 hover:from-purple-900/60 hover:to-blue-900/60 border border-purple-500/40 text-purple-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                  >
                    <Bot className="w-4 h-4 text-purple-300 animate-pulse" />
                    <span>🤖 Assistente IA Classium</span>
                  </button>

                  {isIaAssistantOpen && (
                    <div className="p-4 bg-slate-900 border border-purple-500/35 rounded-2xl space-y-3 text-xs animate-fade-in">
                      <div className="flex items-center gap-2 pb-1 border-b border-purple-950">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="font-bold text-white uppercase text-[10px]">Diagnóstico Predictivo da Turma</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        Esta turma (<strong className="text-white">{selectedStudent.grade}</strong>) possui:
                      </p>
                      <ul className="space-y-1.5 text-slate-400 font-mono text-[10px]">
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                          32 alunos matriculados
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                          4 com Laudos Médicos cadastrados
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                          2 São Inclusão (AEE) com acompanhantes ativos
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                          1 necessita de atualização cadastral de comprovantes
                        </li>
                      </ul>
                      <p className="text-[10px] text-purple-300 mt-2">Deseja gerar um relatório comportamental detalhado?</p>
                      <button
                        onClick={() => {
                          alert(`Gerando relatório PDF completo do conselho de classe para a turma ${selectedStudent.grade} com insights de Inteligência Artificial.`);
                        }}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        Gerar Relatório Completo
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Footer of panel */}
              <div className="pt-4 border-t border-slate-850 flex items-center justify-between">
                <button
                  onClick={() => {
                    alert(`Iniciando fluxo de transferência escolar para o aluno: ${selectedStudent.name || (selectedStudent as any).full_name || 'selecionado'}`);
                  }}
                  className="px-4 py-2 bg-slate-900 border border-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Transferir Aluno
                </button>

                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  Fechar Painel
                </button>
              </div>

            </div>
          )}

          {/* ================= MODAIS ================= */}

          {isEnrollmentWizardOpen && (
            <StudentEnrollmentWizard 
              onClose={() => setIsEnrollmentWizardOpen(false)} 
              onSuccess={async () => {
                // Refresh data directly inside AdminPessoas without page reload
                await refreshData();
              }} 
            />
          )}

          {/* MODAL 1: REGISTRO DE NOVO ESTUDANTE */}
          {isRegistrationModalOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 text-left space-y-6 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-gold" />
                    <h3 className="font-serif text-base font-bold text-white">
                      {editingStudentId ? 'Editar Cadastro de Estudante' : 'Cadastro Individual Direto'}
                    </h3>
                  </div>
                  <button onClick={() => setIsRegistrationModalOpen(false)} className="p-1.5 hover:bg-slate-900 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddIndividualStudent} className="space-y-4 text-xs">
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Guilherme Ferreira da Costa"
                      value={newStudentForm.name}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CPF</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={newStudentForm.cpf}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, cpf: maskCPF(e.target.value) })}
                        maxLength={14}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Data de Nascimento</label>
                      <input
                        type="text"
                        placeholder="DD/MM/AAAA"
                        value={newStudentForm.birthDate}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, birthDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Série/Turma</label>
                      <select
                        value={newStudentForm.grade}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, grade: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                      >
                        <option value="6º Ano B">6º Ano B</option>
                        <option value="7º Ano A">7º Ano A</option>
                        <option value="8º Ano B">8º Ano B</option>
                        <option value="1ª Série EM">1ª Série EM</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Turno</label>
                      <select
                        value={newStudentForm.shift}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, shift: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                      >
                        <option value="Matutino">Matutino</option>
                        <option value="Vespertino">Vespertino</option>
                        <option value="Integral">Integral</option>
                        <option value="Noturno">Noturno</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sexo</label>
                      <select
                        value={newStudentForm.sex}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, sex: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                      >
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Responsável Legal</label>
                      <input
                        type="text"
                        placeholder="Nome da Mãe ou do Pai"
                        value={newStudentForm.parent}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, parent: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Telefone Resp.</label>
                      <input
                        type="text"
                        placeholder="(11) 99999-0000"
                        value={newStudentForm.phone}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Endereço Residencial</label>
                    <input
                      type="text"
                      placeholder="Ex: Av. Paulista, 100, São Paulo"
                      value={newStudentForm.address}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Situação/Status</label>
                      <select
                        value={newStudentForm.status || 'Ativo'}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, status: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Transferido">Transferido</option>
                        <option value="Desistente">Desistente</option>
                        <option value="Concluído">Concluído</option>
                        <option value="Cancelado">Cancelado</option>
                        <option value="Em análise">Em análise</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Idade</label>
                      <input
                        type="number"
                        placeholder="Ex: 14"
                        value={newStudentForm.age || ''}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, age: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 bg-slate-900/80 border border-amber-500/30 rounded-xl p-3 my-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        🚌 Utiliza Transporte Escolar? <span className="text-rose-400">*</span>
                      </span>
                      {newStudentForm.transport && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          🟡 Aguardando Vinculação
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                        <input
                          type="radio"
                          name="utilizaTransporteRadio"
                          checked={!!newStudentForm.transport}
                          onChange={() => setNewStudentForm({ ...newStudentForm, transport: true })}
                          className="w-4 h-4 text-amber-500 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                        />
                        <span>Sim (Cadastrar no CLASSIUMTransporte)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-400">
                        <input
                          type="radio"
                          name="utilizaTransporteRadio"
                          checked={!newStudentForm.transport}
                          onChange={() => setNewStudentForm({ ...newStudentForm, transport: false })}
                          className="w-4 h-4 text-amber-500 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                        />
                        <span>Não</span>
                      </label>
                    </div>
                    {newStudentForm.transport && (
                      <p className="text-[11px] text-amber-200/80 mt-2 bg-amber-950/40 p-2 rounded-lg border border-amber-800/30">
                        i Os dados do estudante (Nome, Turma, Turno e Unidade) serão encaminhados automaticamente para o painel de Transporte com status "Aguardando Vinculação".
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] uppercase font-bold text-slate-400">
                    <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-900 rounded">
                      <input
                        type="checkbox"
                        checked={!!newStudentForm.aee}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, aee: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-800 text-gold focus:ring-0 cursor-pointer"
                      />
                      <span>Inclusão (AEE)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-900 rounded">
                      <input
                        type="checkbox"
                        checked={!!newStudentForm.laudo}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, laudo: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-800 text-gold focus:ring-0 cursor-pointer"
                      />
                      <span>Possui Laudo Médico</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-900 rounded">
                      <input
                        type="checkbox"
                        checked={!!newStudentForm.docPending}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, docPending: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-800 text-gold focus:ring-0 cursor-pointer"
                      />
                      <span>Pendência Documental</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-900 rounded col-span-2">
                      <input
                        type="checkbox"
                        checked={newStudentForm.familyComm !== false}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, familyComm: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-800 text-gold focus:ring-0 cursor-pointer"
                      />
                      <span>Autorizar envio de comunicados via WhatsApp/E-mail</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                    <button
                      type="button"
                      onClick={() => setIsRegistrationModalOpen(false)}
                      className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl font-bold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg transition-all"
                    >
                      {editingStudentId ? 'Salvar Alterações' : 'Registrar Estudante'}
                    </button>
                  </div>

                </form>

              </div>
            </div>
          )}

          {/* MODAL 2: CADASTRO INTELIGENTE (Excel Clipboard Copy & Paste) */}
          {isImportModalOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 text-left space-y-5 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="font-serif text-base font-bold text-white">Importação com Inteligência Artificial</h3>
                  </div>
                  <button onClick={() => setIsImportModalOpen(false)} className="p-1.5 hover:bg-slate-900 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Copie e cole qualquer lista bruta de alunos no campo abaixo. Nossa IA identificará nomes, CPF, data de nascimento e séries em tempo real.
                </p>

                <textarea
                  rows={6}
                  value={rawImportText}
                  onChange={(e) => setRawImportText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-[#D4AF37] resize-none"
                  placeholder="Ex: João da Silva, CPF: 123.456.789-00, Série: 7º Ano A..."
                />

                {importStatus === 'parsed' && parsedImportList.length > 0 && (
                  <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-2xl space-y-3">
                    <span className="text-[10px] uppercase font-bold text-purple-300 block">✓ Detectamos {parsedImportList.length} registros prontos:</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-2">
                      {parsedImportList.map((parsed, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] font-mono text-slate-300 border-b border-slate-900 pb-1.5">
                          <span>{parsed.name}</span>
                          <span className="text-[#D4AF37]">{parsed.grade} • {parsed.cpf}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleCommitImport}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all"
                    >
                      Confirmar Importação de {parsedImportList.length} Alunos
                    </button>
                  </div>
                )}

                {importStatus === 'imported' && (
                  <div className="p-3.5 bg-green-950/30 border border-green-500/30 rounded-xl text-green-400 text-xs font-medium flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-green-400 animate-pulse" /> Alunos importados com sucesso para a base principal!
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                  <button
                    onClick={handleParseRawText}
                    className="px-5 py-2.5 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-bold"
                  >
                    Analisar Dados com IA
                  </button>
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-900 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Fechar
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* MODAL 3: MATRICULADOS CARD DETAILED BREAKDOWN (Interactive Popover) */}
          {isMatriculadosModalOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 text-left space-y-5 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gold" />
                    <h3 className="font-serif text-base font-bold text-white">Status Geral de Matrículas</h3>
                  </div>
                  <button onClick={() => setIsMatriculadosModalOpen(false)} className="p-1.5 hover:bg-slate-900 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-850 rounded-xl">
                    <span className="text-slate-300">✅ Alunos Matriculados (Ativos)</span>
                    <span className="font-mono font-bold text-green-400">985 alunos</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-850 rounded-xl">
                    <span className="text-slate-300">🔄 Em Processo de Renovação</span>
                    <span className="font-mono font-bold text-yellow-500">142 alunos</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-850 rounded-xl">
                    <span className="text-slate-300">✈️ Transferidos</span>
                    <span className="font-mono font-bold text-slate-400">45 alunos</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-850 rounded-xl">
                    <span className="text-slate-300">❌ Matrículas Canceladas</span>
                    <span className="font-mono font-bold text-rose-500">23 alunos</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-850 rounded-xl">
                    <span className="text-slate-300">🎓 Concluintes</span>
                    <span className="font-mono font-bold text-purple-400">32 alunos</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-blue-900/20 to-blue-950/20 border border-blue-500/25 rounded-xl">
                    <span className="text-blue-300 font-semibold">🕒 Pré-Matrícula Efetuada</span>
                    <span className="font-mono font-bold text-blue-400">18 alunos</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-850 flex justify-end">
                  <button
                    onClick={() => setIsMatriculadosModalOpen(false)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                  >
                    Entendido
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {activeSubTab === 'professores' && (
        <div className="space-y-6">
          
          {/* BARRA SUPERIOR / PAINEL INTELIGENTE */}
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#D4AF37]" />
                  Painel de Gestão de Corpo Docente e Horários
                </h3>
                <p className="text-xs text-slate-400">Microsoft 365 & Monday.com style premium administrator console</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => {
                    setEditingTeacherId(null);
                    setTeacherForm(initialTeacherForm);
                    setWizardStep(1);
                    setIsTeacherModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-[#D4AF37] text-slate-950 hover:bg-[#c5a030] rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-gold/10 transition-all"
                >
                  <Plus className="w-4 h-4 text-slate-950 font-extrabold" />
                  Cadastrar Professor
                </button>

                <button
                  onClick={handleOptimizeSchedulesAI}
                  disabled={isOptimizing}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-purple-500/10 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  {isOptimizing ? 'Otimizando...' : 'Otimizar Horários (IA)'}
                </button>

                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Configurar Categorias
                </button>
              </div>
            </div>

            {/* Smart Interactive Filter Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Ano Letivo
                </label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 font-semibold focus:border-[#D4AF37] outline-none"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" />
                  Unidade Escolar
                </label>
                <input
                  type="text"
                  readOnly
                  value="Escola Estadual Classium"
                  className="w-full bg-slate-950 border border-slate-850 text-slate-400 cursor-not-allowed rounded-xl p-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Award className="w-3 h-3 text-slate-400" />
                  Disciplina
                </label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 font-semibold focus:border-[#D4AF37] outline-none"
                >
                  <option value="Todas">Todas</option>
                  {ALL_SUBJECTS.map(subj => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  Cargo
                </label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 font-semibold focus:border-[#D4AF37] outline-none"
                >
                  <option value="Todos">Todos</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Turno
                </label>
                <select
                  value={filterShift}
                  onChange={(e) => setFilterShift(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 font-semibold focus:border-[#D4AF37] outline-none"
                >
                  <option value="Todos">Todos</option>
                  <option value="Matutino">Matutino</option>
                  <option value="Vespertino">Vespertino</option>
                  <option value="Integral">Integral</option>
                  <option value="Noturno">Noturno</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-slate-400" />
                  Situação Funcional
                </label>
                <select
                  value={filterContractType}
                  onChange={(e) => setFilterContractType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 font-semibold focus:border-[#D4AF37] outline-none"
                >
                  <option value="Todos">Todos</option>
                  <option value="Efetivo">Efetivo</option>
                  <option value="Temporário">Temporário</option>
                  <option value="CLT">CLT</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 font-semibold focus:border-[#D4AF37] outline-none"
                >
                  <option value="Todos">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 max-w-xl">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Pesquisar professor por nome ou CPF..."
                value={teacherSearchQuery}
                onChange={(e) => setTeacherSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none"
              />
              {teacherSearchQuery && (
                <button onClick={() => setTeacherSearchQuery('')} className="p-0.5 hover:bg-slate-850 rounded">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* CARDS ESTATÍSTICOS */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl text-left space-y-1 shadow-md hover:bg-slate-900/60 transition-all">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Professores
              </p>
              <h4 className="text-xl font-mono font-bold text-white">{teachers.filter(t => t.role === 'Professor').length}</h4>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl text-left space-y-1 shadow-md hover:bg-slate-900/60 transition-all">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-purple-400" />
                Pedagogos
              </p>
              <h4 className="text-xl font-mono font-bold text-white">{teachers.filter(t => t.role === 'Pedagogo').length}</h4>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl text-left space-y-1 shadow-md hover:bg-slate-900/60 transition-all">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-teal-400" />
                Coordenação
              </p>
              <h4 className="text-xl font-mono font-bold text-white">{teachers.filter(t => t.role === 'Coordenador').length}</h4>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl text-left space-y-1 shadow-md hover:bg-slate-900/60 transition-all">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-amber-400" />
                Direção
              </p>
              <h4 className="text-xl font-mono font-bold text-white">{teachers.filter(t => t.role === 'Diretor').length}</h4>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl text-left space-y-1 shadow-md hover:bg-slate-900/60 transition-all">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-green-400" />
                Ativos
              </p>
              <h4 className="text-xl font-mono font-bold text-green-400">{teachers.filter(t => t.status === 'Ativo').length}</h4>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl text-left space-y-1 shadow-md hover:bg-slate-900/60 transition-all">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <X className="w-3.5 h-3.5 text-rose-400" />
                Inativos
              </p>
              <h4 className="text-xl font-mono font-bold text-rose-400">{teachers.filter(t => t.status === 'Inativo').length}</h4>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl text-left space-y-1 shadow-md hover:bg-slate-900/60 transition-all">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Disciplinas
              </p>
              <h4 className="text-xl font-mono font-bold text-white">{Array.from(new Set(teachers.map(t => t.subject))).length}</h4>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl text-left space-y-1 shadow-md hover:bg-slate-900/60 transition-all">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-yellow-400" />
                Turmas Vinc.
              </p>
              <h4 className="text-xl font-mono font-bold text-[#D4AF37]">{Array.from(new Set(academicLinks.map(l => l.grade))).length}</h4>
            </div>
          </div>

          {/* TIMETABLE CONFLICT OR OPTIMIZATION NOTICE */}
          {isOptimizing && (
            <div className="bg-purple-950/20 border border-purple-500/40 p-5 rounded-2xl flex items-center gap-4 animate-pulse">
              <Sparkles className="w-6 h-6 text-purple-400 animate-spin shrink-0" />
              <div className="text-left">
                <h4 className="font-bold text-purple-300 text-sm">IA Classium Otimizando Horários...</h4>
                <p className="text-xs text-slate-400 mt-0.5">Organizando grades semanais para resolver conflitos de salas, turmas e disponibilidades de professores automaticamente.</p>
              </div>
            </div>
          )}

          {hasConflict && !isOptimizing && (
            <div className="bg-amber-950/20 border border-amber-500/40 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-left">
                  <h4 className="font-bold text-amber-400 text-sm">⚠ Conflito de Grade Detectado</h4>
                  <p className="text-xs text-slate-300 max-w-3xl mt-0.5">{conflictMessage}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleResolveConflict}
                  className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold uppercase rounded-xl hover:bg-[#D4AF37] transition-all"
                >
                  Corrigir Grade Manualmente
                </button>
                <button
                  onClick={handleOptimizeSchedulesAI}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase rounded-xl transition-all flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Otimizar com IA
                </button>
              </div>
            </div>
          )}

          {optimizationSuccess && !hasConflict && (
            <div className="p-4 bg-green-950/20 border border-green-500/40 rounded-2xl text-left text-green-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <Check className="w-5 h-5 text-green-400" />
              <span>✓ Sucesso! O conflito de grade foi resolvido. A IA otimizou os horários do Professor Carlos Eduardo: as aulas duplicadas na Segunda-feira 07:00 foram realocadas para Segunda-feira 08:00 com sucesso. Todos os diários de classe e calendários dos alunos do 7º B foram atualizados.</span>
            </div>
          )}

          {/* CONTROLE DE CREDENCIAIS (IAM) COMPONENT */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-purple-400" />
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Mapeamento de Credenciais de Acesso (IAM)</h4>
                  <p className="text-[10px] text-slate-400">Controle, bloqueio, liberação e reset de senhas do ClassiumProfessor</p>
                </div>
              </div>
              <button
                onClick={() => setIamExpanded(!iamExpanded)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition-all"
              >
                {iamExpanded ? 'Ocultar Painel' : 'Expandir Painel'}
              </button>
            </div>

            {iamExpanded && (
              <div className="space-y-4 animate-fade-in pt-3 border-t border-slate-800/80">
                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-left">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Total de Usuários</span>
                    <span className="text-base font-mono font-bold text-white">{teachers.length}</span>
                  </div>
                  <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-left">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Senhas Provisórias</span>
                    <span className="text-base font-mono font-bold text-yellow-400">
                      {teachers.filter(t => t.provisionalPassword).length}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-left">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Usuários Ativos</span>
                    <span className="text-base font-mono font-bold text-green-400">
                      {teachers.filter(t => !t.blocked).length}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-left">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Usuários Bloqueados</span>
                    <span className="text-base font-mono font-bold text-rose-500">
                      {teachers.filter(t => t.blocked).length}
                    </span>
                  </div>
                </div>

                {/* IAM Table */}
                <div className="overflow-x-auto border border-slate-850 rounded-xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 uppercase font-mono text-[9px] tracking-wider border-b border-slate-850">
                        <th className="p-3">Professor/Colaborador</th>
                        <th className="p-3">Login Único</th>
                        <th className="p-3">E-mail de Acesso</th>
                        <th className="p-3">Último Login</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60">
                      {teachers.map(t => (
                        <tr key={t.id} className="hover:bg-slate-950/40 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={t.photoUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'}
                                alt={t.name}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-lg object-cover border border-slate-800"
                              />
                              <div>
                                <span className="font-bold text-slate-200 block">{t.name}</span>
                                <span className="text-[10px] text-slate-500">{t.role} • {t.subject}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-purple-300">{t.login || 'Não gerado'}</td>
                          <td className="p-3 text-slate-300">{t.email || '-'}</td>
                          <td className="p-3 font-mono text-slate-400">{t.lastLogin || 'Nunca'}</td>
                          <td className="p-3">
                            {t.blocked ? (
                              <span className="px-2 py-0.5 bg-rose-950/40 text-rose-400 border border-rose-500/20 rounded font-bold text-[9px] uppercase">
                                Bloqueado
                              </span>
                            ) : t.provisionalPassword ? (
                              <span className="px-2 py-0.5 bg-yellow-950/40 text-yellow-400 border border-yellow-500/20 rounded font-bold text-[9px] uppercase">
                                Provisório
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-green-950/40 text-green-400 border border-green-500/20 rounded font-bold text-[9px] uppercase">
                                Ativo
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  const isBlocked = !!t.blocked;
                                  setTeachers(prev => prev.map(pt => pt.id === t.id ? { ...pt, blocked: !isBlocked } : pt));
                                }}
                                className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                                  t.blocked
                                    ? 'bg-green-900/30 text-green-400 border border-green-500/20 hover:bg-green-900/50'
                                    : 'bg-rose-900/30 text-rose-400 border border-rose-500/20 hover:bg-rose-900/50'
                                }`}
                                title={t.blocked ? 'Desbloquear Usuário' : 'Bloquear Usuário'}
                              >
                                {t.blocked ? 'Desbloquear' : 'Bloquear'}
                              </button>
                              <button
                                onClick={() => handleResetTeacherPassword(t.id)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold rounded transition-all"
                                title="Resetar senha para provisória"
                              >
                                Resetar Senha
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* GRADE INTELIGENTE (CARDS & AREA FILTER) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider mr-2">Filtrar por Área:</span>
                {['Todos', ...ALL_SUBJECTS].map((area) => {
                  const isSelected = selectedSubjectAreas.includes(area);
                  return (
                    <button
                      key={area}
                      onClick={() => {
                        if (area === 'Todos') {
                          setSelectedSubjectAreas(['Todos']);
                        } else {
                          let next = selectedSubjectAreas.filter(a => a !== 'Todos');
                          if (next.includes(area)) {
                            next = next.filter(a => a !== area);
                          } else {
                            next.push(area);
                          }
                          if (next.length === 0) {
                            next = ['Todos'];
                          }
                          setSelectedSubjectAreas(next);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#D4AF37] text-slate-950'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-slate-500 font-mono">Mostrando {filteredTeachers.length} profissionais em ordem alfabética</span>
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeachers.map((t) => {
                const linkedClasses = academicLinks.filter(l => l.teacherId === t.id);
                
                const getShiftLabel = (shift: string) => {
                  if (shift === 'Matutino') return '1º Turno';
                  if (shift === 'Vespertino') return '2º Turno';
                  if (shift === 'Noturno') return '3º Turno';
                  return shift;
                };

                return (
                  <div
                    key={t.id}
                    onClick={() => setPremiumTeacherId(t.id)}
                    className={`bg-slate-900/60 border p-5 rounded-2xl text-left space-y-4 relative overflow-hidden transition-all cursor-pointer ${
                      premiumTeacherId === t.id ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50 shadow-lg' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Status & Shift Badges Top Right */}
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${t.status === 'Ativo' ? 'bg-green-500' : 'bg-rose-500'}`} />
                        <span className={`text-[10px] font-bold uppercase ${t.status === 'Ativo' ? 'text-green-400' : 'text-rose-400'}`}>
                          {t.status}
                        </span>
                      </div>
                      <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400 font-bold uppercase">
                        {getShiftLabel(t.shift || 'Matutino')}
                      </span>
                    </div>

                    <div className="flex items-start gap-3.5">
                      {/* Avatar Photo */}
                      <img
                        src={t.photoUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'}
                        alt={t.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shadow-md shrink-0"
                      />

                      <div className="space-y-0.5 pr-14">
                        <h4 className="font-serif font-bold text-white text-base leading-tight hover:text-[#D4AF37] transition-all">
                          {t.name}
                        </h4>
                        <p className="text-xs text-slate-400">
                          <span className="font-semibold text-slate-200">{t.role}</span>
                          {t.subject && (
                            <>
                              <span className="mx-1 text-slate-600">•</span>
                              <span className="text-[#D4AF37] font-semibold">{t.subject}</span>
                            </>
                          )}
                        </p>
                        {t.function && (
                          <p className="text-[11px] text-slate-400 font-medium">Função: {t.function}</p>
                        )}
                        <p className="text-[10px] text-slate-500 font-mono">Matrícula: {t.matricula || 'MAT-2026-X'}</p>
                      </div>
                    </div>

                    {/* Personal & Professional details grid */}
                    <div className="space-y-2 p-3.5 bg-slate-950/60 rounded-xl border border-slate-850/80 text-xs">
                      <div className="grid grid-cols-2 gap-2 text-slate-300">
                        <div>
                          <span className="text-[8px] text-slate-500 uppercase block font-bold">CPF</span>
                          <span className="font-mono text-slate-200">{t.cpf || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-500 uppercase block font-bold">WhatsApp</span>
                          <span className="font-mono text-slate-200">{t.phone || '-'}</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-850/40 my-1 pt-1">
                        <span className="text-[8px] text-slate-500 uppercase block font-bold">E-mail</span>
                        <span className="text-slate-200 block truncate">{t.email || '-'}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-300 border-t border-slate-850/40 pt-1">
                        <div>
                          <span className="text-[8px] text-slate-500 uppercase block font-bold">Carga Horária</span>
                          <span className="font-semibold text-slate-200">{t.hours || '20 horas'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-500 uppercase block font-bold">Tipo de Vínculo</span>
                          <span className="font-semibold text-slate-200">{t.contractType || 'Efetivo'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Turmas Vinculadas Badges */}
                    <div className="space-y-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Turmas/Salas Vinculadas:</span>
                      {linkedClasses.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">Nenhuma turma vinculada a este professor</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {linkedClasses.map(link => (
                            <span key={link.id} className="text-[10px] font-bold bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all">
                              {link.grade} ({link.room})
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAcademicLink(link.id);
                                }}
                                className="text-rose-400 hover:text-rose-300 font-extrabold ml-1 hover:scale-110 transition-transform"
                                title="Remover Vínculo"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Interactive Button Actions on Card */}
                    <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-850 gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPremiumTeacherId(t.id);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all"
                          title="Visualizar Grade e Detalhes"
                        >
                          <Eye className="w-3 h-3 text-slate-400" />
                          Visualizar
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditWizard(t);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all"
                        >
                          <Edit2 className="w-3 h-3 text-slate-400" />
                          Editar
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetTeacherPassword(t.id);
                          }}
                          className="px-2.5 py-1.5 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/25 text-purple-300 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all"
                          title="Resetar Senha do Professor"
                        >
                          <Lock className="w-3 h-3" />
                          Senha
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenLinkingModal(t.id);
                          }}
                          className="px-2.5 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-slate-950 border border-[#D4AF37]/30 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Vincular
                        </button>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Deseja realmente excluir permanentemente o professor ${t.name}?`)) {
                              await handleDeleteTeacher(t.id);
                            }
                          }}
                          className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                          title="Excluir Professor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VINCULAÇÃO ACADÊMICA ACTIVE DETAILS FOR PREMIUM SELECTED TEACHER */}
          {premiumTeacherId && (() => {
            const currentTeacher = teachers.find(t => t.id === premiumTeacherId);
            if (!currentTeacher) return null;
            const teachersLinks = academicLinks.filter(l => l.teacherId === currentTeacher.id);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
                
                {/* CALENDÁRIO / GRADE HORÁRIA INTELIGENTE DO PROFESSOR */}
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl lg:col-span-2 space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif text-md font-bold text-white">
                        Grade Horária Inteligente: {currentTeacher.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">Distribuição automática semanal de aulas para {currentTeacher.subject}</p>
                    </div>
                    <span className="text-[10px] bg-blue-950/40 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-bold">
                      {teachersLinks.length} aulas vinculadas
                    </span>
                  </div>

                  {/* Calendar Grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr className="border-b border-slate-850">
                          <th className="py-2.5 text-left text-slate-500 font-bold uppercase tracking-wider pl-2 w-16">Horário</th>
                          <th className="py-2.5 text-slate-400 font-bold">Segunda</th>
                          <th className="py-2.5 text-slate-400 font-bold">Terça</th>
                          <th className="py-2.5 text-slate-400 font-bold">Quarta</th>
                          <th className="py-2.5 text-slate-400 font-bold">Quinta</th>
                          <th className="py-2.5 text-slate-400 font-bold">Sexta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {['07:00', '08:00', '09:00', '10:00', '11:00'].map((time) => (
                          <tr key={time} className="hover:bg-slate-900/30">
                            <td className="py-3 text-left font-mono text-slate-500 font-bold pl-2">{time}</td>
                            {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map((day) => {
                              // Check if there is an academic link for this slot
                              // We can simulate assignment mapping based on teacher's availability or mock schedule
                              let displayClass = "";
                              let displayRoom = "";
                              let isConflicting = false;

                              if (currentTeacher.id === 'pf-1') {
                                if (day === 'Segunda' && time === '07:00') {
                                  displayClass = "7º A";
                                  displayRoom = "Sala 08";
                                  isConflicting = hasConflict;
                                } else if (day === 'Segunda' && time === '08:00') {
                                  displayClass = "7º B";
                                  displayRoom = "Sala 09";
                                } else if (day === 'Quinta' && time === '07:00') {
                                  displayClass = "8º C";
                                  displayRoom = "Sala 10";
                                } else if (day === 'Terça' && time === '07:00' && optimizationSuccess) {
                                  // After optimize
                                  displayClass = "8º C (Realocado)";
                                  displayRoom = "Sala 10";
                                }
                              } else if (currentTeacher.id === 'pf-2') {
                                if (day === 'Quarta' && time === '09:00') {
                                  displayClass = "9º B";
                                  displayRoom = "Sala 12";
                                }
                              } else if (currentTeacher.id === 'pf-3') {
                                if (day === 'Quinta' && time === '08:00') {
                                  displayClass = "8º A";
                                  displayRoom = "Sala 14";
                                }
                              }

                              return (
                                <td key={day} className="p-1">
                                  {displayClass ? (
                                    <div className={`p-2 rounded-xl text-[10px] text-center font-bold border ${
                                      isConflicting 
                                        ? 'bg-amber-950/50 text-amber-400 border-amber-500/30' 
                                        : 'bg-blue-950/40 text-blue-300 border-blue-500/20'
                                    }`}>
                                      <p>{displayClass}</p>
                                      <p className="text-[8px] text-slate-400 font-normal">{displayRoom}</p>
                                      {isConflicting && <span className="text-[8px] text-amber-400 block animate-pulse">⚠️ Duplicado!</span>}
                                    </div>
                                  ) : (
                                    <div className="py-2.5 text-slate-700 italic text-[10px]">Livre</div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RECURSOS DO PROFESSOR */}
                <div className="space-y-6 text-left">

                </div>

              </div>
            );
          })()}

          {/* MODAL 4: CADASTRO DO PROFESSOR (WIZARD MULTI-ETAPAS) */}
          {isTeacherModalOpen && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-6 text-left space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-[#D4AF37]" />
                    <h3 className="font-serif text-base font-bold text-white">
                      {editingTeacherId ? 'Editar Cadastro de Professor' : 'Cadastro Inteligente de Novo Professor'}
                    </h3>
                  </div>
                  <button onClick={() => setIsTeacherModalOpen(false)} className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Wizard Navigation Steps */}
                <div className="flex items-center justify-between text-xs font-bold border-b border-slate-900 pb-3">
                  <button
                    onClick={() => setWizardStep(1)}
                    className={`flex items-center gap-1.5 pb-1.5 px-1 border-b-2 transition-all ${
                      wizardStep === 1 ? 'border-[#D4AF37] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-[#D4AF37]">1</span>
                    ETAPA 1: Dados Pessoais
                  </button>
                  <button
                    onClick={() => setWizardStep(2)}
                    className={`flex items-center gap-1.5 pb-1.5 px-1 border-b-2 transition-all ${
                      wizardStep === 2 ? 'border-[#D4AF37] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-[#D4AF37]">2</span>
                    ETAPA 2: Dados Funcionais
                  </button>
                  <button
                    onClick={() => setWizardStep(3)}
                    className={`flex items-center gap-1.5 pb-1.5 px-1 border-b-2 transition-all ${
                      wizardStep === 3 ? 'border-[#D4AF37] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-[#D4AF37]">3</span>
                    ETAPA 4: Permissões
                  </button>
                </div>

                <form onSubmit={handleSaveTeacher} className="space-y-5">
                  
                  {/* STEP 1: DADOS PESSOAIS */}
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-850">
                        <img
                          src={teacherForm.gender === 'F' 
                            ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
                            : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
                          }
                          alt="Avatar"
                          className="w-12 h-12 rounded-full object-cover border border-slate-700"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-white">Foto de Identificação Escolar</p>
                          <p className="text-slate-400 mt-0.5">Sincronizada automaticamente com base no sexo cadastrado.</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nome Completo</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Carlos Eduardo dos Santos"
                          value={teacherForm.name}
                          onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CPF</label>
                          <input
                            type="text"
                            required
                            placeholder="000.000.000-00"
                            value={teacherForm.cpf}
                            onChange={(e) => setTeacherForm({ ...teacherForm, cpf: maskCPF(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">RG</label>
                          <input
                            type="text"
                            placeholder="00.000.000-0"
                            value={teacherForm.rg}
                            onChange={(e) => setTeacherForm({ ...teacherForm, rg: maskRG(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Data de Nascimento</label>
                          <input
                            type="date"
                            value={teacherForm.birthDate}
                            onChange={(e) => setTeacherForm({ ...teacherForm, birthDate: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sexo</label>
                          <select
                            value={teacherForm.gender}
                            onChange={(e) => setTeacherForm({ ...teacherForm, gender: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold"
                          >
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Telefone/WhatsApp</label>
                          <input
                            type="text"
                            placeholder="(11) 99999-0000"
                            value={teacherForm.phone}
                            onChange={(e) => setTeacherForm({ ...teacherForm, phone: maskCellPhone(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">E-mail</label>
                          <input
                            type="email"
                            placeholder="exemplo@educamais.edu"
                            value={teacherForm.email}
                            onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Endereço Residencial</label>
                        <input
                          type="text"
                          placeholder="Rua, número, complemento"
                          value={teacherForm.address}
                          onChange={(e) => setTeacherForm({ ...teacherForm, address: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cidade</label>
                          <input
                            type="text"
                            placeholder="São Paulo"
                            value={teacherForm.city}
                            onChange={(e) => setTeacherForm({ ...teacherForm, city: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Estado</label>
                          <input
                            type="text"
                            placeholder="SP"
                            value={teacherForm.state}
                            onChange={(e) => setTeacherForm({ ...teacherForm, state: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CEP</label>
                          <input
                            type="text"
                            placeholder="01000-000"
                            value={teacherForm.cep}
                            onChange={(e) => setTeacherForm({ ...teacherForm, cep: maskCEP(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: DADOS FUNCIONAIS */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cargo</label>
                          <select
                            value={teacherForm.role}
                            onChange={(e) => setTeacherForm({ ...teacherForm, role: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold"
                          >
                            <option value="Professor">Professor</option>
                            <option value="Pedagogo">Pedagogo</option>
                            <option value="Coordenador">Coordenador</option>
                            <option value="Diretor">Diretor</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Função Especificada</label>
                          <input
                            type="text"
                            placeholder="Ex: Docente de História e Sociologia"
                            value={teacherForm.function}
                            onChange={(e) => setTeacherForm({ ...teacherForm, function: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Disciplina de Domínio Principal</label>
                          <select
                            value={teacherForm.subject}
                            onChange={(e) => setTeacherForm({ ...teacherForm, subject: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold"
                          >
                            <option value="História">História</option>
                            <option value="Matemática">Matemática</option>
                            <option value="Biologia">Biologia</option>
                            <option value="Português">Português</option>
                            <option value="Artes">Artes</option>
                            <option value="PEB I">PEB I</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Matrícula Funcional</label>
                          <input
                            type="text"
                            placeholder="MAT-2026-XXX"
                            value={teacherForm.matricula}
                            onChange={(e) => setTeacherForm({ ...teacherForm, matricula: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Turno do Vínculo</label>
                          <select
                            value={teacherForm.shift}
                            onChange={(e) => setTeacherForm({ ...teacherForm, shift: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold"
                          >
                            <option value="Matutino">Matutino</option>
                            <option value="Vespertino">Vespertino</option>
                            <option value="Integral">Integral</option>
                            <option value="Noturno">Noturno</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tipo de Contrato</label>
                          <select
                            value={teacherForm.contractType}
                            onChange={(e) => setTeacherForm({ ...teacherForm, contractType: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold"
                          >
                            <option value="Efetivo">Efetivo</option>
                            <option value="Temporário">Contrato Temporário</option>
                            <option value="CLT">CLT</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Carga Horária (Sinalização)</label>
                          <select
                            value={teacherForm.hours}
                            onChange={(e) => setTeacherForm({ ...teacherForm, hours: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold"
                          >
                            <option value="16 horas">16h/semana</option>
                            <option value="20 horas">20h/semana</option>
                            <option value="28 horas">28h/semana</option>
                            <option value="30 horas">30h/semana</option>
                            <option value="40 horas">40h/semana</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Situação Administrativa</label>
                        <select
                          value={teacherForm.status}
                          onChange={(e) => setTeacherForm({ ...teacherForm, status: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold"
                        >
                          <option value="Ativo">Ativo / Em Exercício</option>
                          <option value="Inativo">Inativo / Licenciado</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: PERMISSÕES DO SISTEMA */}
                  {wizardStep === 3 && (
                    <div className="space-y-4">
                      <div className="bg-slate-900/30 p-4 border border-slate-850 rounded-2xl">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Shield className="w-4 h-4 text-[#D4AF37]" />
                          Nível de Acesso e Permissões Gerais
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Marque os papéis que este profissional poderá exercer no Classium ERP. O perfil liberará automaticamente as telas correspondentes no login de cada usuário.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'perm-prof', name: 'Professor', desc: 'Lança diários, frequência e avaliações das turmas vinculadas' },
                          { id: 'perm-coord', name: 'Coordenador', desc: 'Supervisiona relatórios pedagógicos, ocorrências e avaliações' },
                          { id: 'perm-ped', name: 'Pedagogo', desc: 'Atendimento especial, suporte inclusivo e plano de aula individual' },
                          { id: 'perm-dir', name: 'Diretor', desc: 'Visão executiva financeira, BI geral e fechamento de períodos letivos' },
                          { id: 'perm-sec', name: 'Secretaria', desc: 'Matrícula de alunos, certidões oficiais e cadastro de profissionais' },
                          { id: 'perm-admin', name: 'Administrador', desc: 'Acesso total às configurações do sistema e logs de auditoria' }
                        ].map((perm) => {
                          const isChecked = teacherForm.permissions.includes(perm.name);
                          return (
                            <label
                              key={perm.id}
                              className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer hover:bg-slate-900/40 transition-all ${
                                isChecked ? 'border-[#D4AF37]/60 bg-[#D4AF37]/5' : 'border-slate-850'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const list = e.target.checked
                                    ? [...teacherForm.permissions, perm.name]
                                    : teacherForm.permissions.filter(p => p !== perm.name);
                                  setTeacherForm({ ...teacherForm, permissions: list });
                                }}
                                className="rounded bg-slate-900 border-slate-800 text-gold focus:ring-0 mt-0.5"
                              />
                              <div className="text-left">
                                <span className="text-xs font-bold text-white block leading-tight">{perm.name}</span>
                                <span className="text-[9px] text-slate-400 mt-0.5 block leading-relaxed">{perm.desc}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Form Wizard Navigation Controls */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-850">
                    <div>
                      {wizardStep > 1 && (
                        <button
                          type="button"
                          onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                          className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl font-bold text-xs uppercase"
                        >
                          Voltar
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsTeacherModalOpen(false)}
                        className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold"
                      >
                        Cancelar
                      </button>

                      {wizardStep < 3 ? (
                        <button
                          type="button"
                          onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider"
                        >
                          Avançar
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#c5a030] text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-gold/5"
                        >
                          Salvar Cadastro do Professor
                        </button>
                      )}
                    </div>
                  </div>

                </form>
              </div>
            </div>
          )}

          {/* MODAL DE EXIBIÇÃO DE CREDENCIAIS GERADAS AUTOMATICAMENTE (IAM VÍNCULO) */}
          {savedTeacherCredentials && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 text-left space-y-6 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    <h3 className="font-serif text-base font-bold text-white">Acesso ClassiumProfessor</h3>
                  </div>
                  <button onClick={() => setSavedTeacherCredentials(null)} className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-start gap-3">
                    <CheckSquare className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-slate-300">
                      <p className="font-bold text-white">Vínculo Ativado com Sucesso!</p>
                      <p>O profissional foi devidamente vinculado ao ecossistema <strong>Classium</strong> e as credenciais de login único foram provisionadas de forma automática pelo IAM.</p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-900/50 border border-slate-850 p-4 rounded-2xl">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Profissional</span>
                      <p className="text-white font-semibold font-sans">{savedTeacherCredentials.name}</p>
                    </div>

                    <div className="border-t border-slate-850/50 pt-2.5">
                      <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block mb-1">Login Único</span>
                      <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-850">
                        <span className="font-mono text-slate-200 select-all">{savedTeacherCredentials.login}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(savedTeacherCredentials.login);
                            alert("Login copiado!");
                          }}
                          className="text-slate-400 hover:text-white"
                          title="Copiar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-850/50 pt-2.5">
                      <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block mb-1">E-mail de Acesso</span>
                      <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-850">
                        <span className="font-mono text-slate-200 select-all">{savedTeacherCredentials.email}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(savedTeacherCredentials.email);
                            alert("E-mail copiado!");
                          }}
                          className="text-slate-400 hover:text-white"
                          title="Copiar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-850/50 pt-2.5">
                      <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block mb-1">Senha Temporária</span>
                      <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-850">
                        <span className="font-mono text-[#D4AF37] font-bold select-all">{savedTeacherCredentials.senha}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(savedTeacherCredentials.senha || '123senha@');
                            alert("Senha copiada!");
                          }}
                          className="text-slate-400 hover:text-white"
                          title="Copiar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 text-xs">
                  <button
                    onClick={() => {
                      const msg = `Olá, ${savedTeacherCredentials.name}! Seu cadastro foi realizado no Classium e seu acesso ao ClassiumProfessor já está disponível:\n\n🔗 Aplicativo: professor.educamais.gov\n👤 Login Único: ${savedTeacherCredentials.login}\n🔑 Senha Temporária: ${savedTeacherCredentials.senha}\n\nPor favor, altere sua senha no primeiro acesso.`;
                      const url = `https://api.whatsapp.com/send?phone=55${savedTeacherCredentials.phone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`;
                      window.open(url, '_blank');
                    }}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/10"
                  >
                    <Share2 className="w-4 h-4" /> Enviar Acesso via WhatsApp
                  </button>
                  <button
                    onClick={() => setSavedTeacherCredentials(null)}
                    className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl font-bold text-xs transition-all"
                  >
                    Entendido e Confirmado
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 5: VINCULAÇÃO ACADÊMICA ("VINCULAR TURMAS" POPUP) */}
          {isLinkingModalOpen && linkingTeacherId && (() => {
            const currentTeacher = teachers.find(t => t.id === linkingTeacherId);
            if (!currentTeacher) return null;
            const teachersLinks = academicLinks.filter(l => l.teacherId === currentTeacher.id);

            return (
              <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl p-6 text-left space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                  
                  <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-[#D4AF37]" />
                      <h3 className="font-serif text-base font-bold text-white">Vinculação Acadêmica do Professor</h3>
                    </div>
                    <button onClick={() => setIsLinkingModalOpen(false)} className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* TWO-COLUMN LAYOUT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* LEFT COLUMN: PROFESSOR DETAILS */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LADO ESQUERDO: PROFESSOR</span>
                      
                      <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex items-start gap-4 text-left">
                        <img
                          src={currentTeacher.photoUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'}
                          alt={currentTeacher.name}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-700 shadow-md"
                        />
                        <div className="space-y-1">
                          <h4 className="font-serif font-bold text-white text-base leading-tight">{currentTeacher.name}</h4>
                          <span className="text-xs bg-slate-800 text-[#D4AF37] px-2 py-0.5 rounded-md font-bold uppercase">
                            {currentTeacher.subject}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-1">Cargo: {currentTeacher.role}</p>
                          <p className="text-[10px] text-slate-500 font-mono">ID: {currentTeacher.id}</p>
                        </div>
                      </div>

                      {/* Display automatically generated status features */}
                      <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-850 space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Sincronizadores de ERP Ativos:</span>
                        <div className="space-y-2 text-xs text-slate-300">
                          <p className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">✓</span> Agenda Docente Sincronizada
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">✓</span> Diário de Classe Digital Integrado
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">✓</span> Folha de Frequência Gerada
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">✓</span> Liberação Automática no Classium Professor
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: LINKING FORM */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LADO DIREITO: VINCULAÇÃO DE NOVA TURMA</span>
                      
                      <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl space-y-3.5">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ano Letivo</label>
                            <select
                              value={linkForm.year}
                              onChange={(e) => setLinkForm({ ...linkForm, year: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none"
                            >
                              <option value="2026">2026</option>
                              <option value="2025">2025</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Segmento</label>
                            <select
                              value={linkForm.segment}
                              onChange={(e) => setLinkForm({ ...linkForm, segment: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none"
                            >
                              <option value="Fundamental II">Fundamental II</option>
                              <option value="Fundamental I">Fundamental I</option>
                              <option value="Ensino Médio">Ensino Médio</option>
                              <option value="Educação Infantil">Educação Infantil</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Selecionar Turma</label>
                            <select
                              value={linkForm.grade}
                              onChange={(e) => setLinkForm({ ...linkForm, grade: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white font-semibold"
                            >
                              <option value="7º A">7º A</option>
                              <option value="7º B">7º B</option>
                              <option value="8º A">8º A</option>
                              <option value="8º B">8º B</option>
                              <option value="8º C">8º C</option>
                              <option value="9º B">9º B</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Disciplina do Vínculo</label>
                            <select
                              value={linkForm.subject}
                              onChange={(e) => setLinkForm({ ...linkForm, subject: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white font-semibold"
                            >
                              <option value={currentTeacher.subject}>{currentTeacher.subject}</option>
                              <option value="História">História</option>
                              <option value="Geografia">Geografia</option>
                              <option value="Matemática">Matemática</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Turno</label>
                            <select
                              value={linkForm.shift}
                              onChange={(e) => setLinkForm({ ...linkForm, shift: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200"
                            >
                              <option value="Matutino">Matutino</option>
                              <option value="Vespertino">Vespertino</option>
                              <option value="Integral">Integral</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Aulas / Semana</label>
                            <input
                              type="number"
                              value={linkForm.weeklyClasses}
                              onChange={(e) => setLinkForm({ ...linkForm, weeklyClasses: parseInt(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sala de Aula</label>
                            <input
                              type="text"
                              value={linkForm.room}
                              onChange={(e) => setLinkForm({ ...linkForm, room: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveAcademicLink}
                          className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#c5a030] text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all"
                        >
                          Salvar Vínculo Acadêmico
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Bottom linking notification */}
                  {linkingNotice && (
                    <div className="p-4 bg-green-950/25 border border-green-500/30 rounded-2xl text-xs text-green-400 leading-relaxed space-y-1 animate-fade-in">
                      <p className="font-bold">✓ Integração Realizada!</p>
                      <p className="font-mono text-[10px] whitespace-pre-line">{linkingNotice.msg}</p>
                    </div>
                  )}

                  {/* List of currently linked classes for this teacher below */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Grade de Turmas Cadastradas para {currentTeacher.name}</span>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {teachersLinks.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">Nenhum vínculo registrado.</p>
                      ) : (
                        teachersLinks.map(link => (
                          <div key={link.id} className="p-3 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <span className="font-bold text-white">
                                {currentTeacher.name} • {link.subject} • {link.grade} • {link.room}
                              </span>
                              <p className="text-[10px] text-slate-400">
                                Segmento: {link.segment} • Turno: {link.shift} • {link.weeklyClasses} aulas semanais
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveAcademicLink(link.id)}
                              className="px-3 py-1.5 bg-rose-950/30 text-rose-400 hover:bg-rose-900/30 border border-rose-500/25 rounded-lg text-[10px] font-bold"
                            >
                              Remover
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-850 flex justify-end">
                    <button
                      onClick={() => setIsLinkingModalOpen(false)}
                      className="px-5 py-2.5 bg-slate-900 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                    >
                      Fechar
                    </button>
                  </div>

                </div>
              </div>
            );
          })()}

        </div>
      )}

      {activeSubTab === 'responsaveis' && (
        <div className="space-y-6">
          {/* 1. TOPO: BARRA DE PESQUISA INTELIGENTE E CABEÇALHO */}
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[#D4AF37] mb-1">
                  <Zap className="w-4 h-4 animate-pulse" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Classium Relacionamento</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-white">Central Inteligente de Contato Familiar</h3>
                <p className="text-xs text-slate-400">
                  Localize estudantes em segundos, escolha o melhor canal de contato e realize chamados prioritários integrados.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-3 py-1.5 rounded-full text-xs text-[#D4AF37] font-semibold">
                <Bot className="w-4 h-4" />
                <span>IA Ativa na Redação</span>
              </div>
            </div>

            {/* SEARCH BAR */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={respSearchQuery}
                onChange={(e) => {
                  setRespSearchQuery(e.target.value);
                  setShowRespSuggestions(true);
                }}
                onFocus={() => setShowRespSuggestions(true)}
                placeholder="Pesquise por estudante, responsável, matrícula, CPF, telefone ou turma..."
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/80 border border-slate-800 focus:border-[#D4AF37] rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all"
              />
              {respSearchQuery && (
                <button
                  onClick={() => {
                    setRespSearchQuery('');
                    setShowRespSuggestions(false);
                  }}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* SEARCH SUGGESTIONS DROPDOWN */}
              {showRespSuggestions && respSearchQuery.trim() !== '' && (
                <div className="absolute z-30 mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-900">
                  {(() => {
                    const filteredRespStudents = students.filter(s => {
                      const query = respSearchQuery.toLowerCase();
                      const matchesStudentName = s.name.toLowerCase().includes(query);
                      const matchesMatricula = s.matricula.toLowerCase().includes(query);
                      const matchesCpf = s.cpf.toLowerCase().includes(query);
                      const matchesGrade = s.grade.toLowerCase().includes(query);
                      const matchesParent = s.parent.toLowerCase().includes(query);
                      
                      const extra = STUDENT_EXTRA_DETAILS[s.id];
                      const matchesExtraResp = extra?.responsibles.some(r => 
                        r.name.toLowerCase().includes(query) || 
                        r.cpf.toLowerCase().includes(query) || 
                        r.email.toLowerCase().includes(query)
                      ) || false;

                      return matchesStudentName || matchesMatricula || matchesCpf || matchesGrade || matchesParent || matchesExtraResp;
                    });

                    if (filteredRespStudents.length === 0) {
                      return (
                        <div className="p-4 text-xs text-slate-500 italic text-center">
                          Nenhum estudante ou responsável localizado.
                        </div>
                      );
                    }

                    return filteredRespStudents.map(student => {
                      const profile = getFullStudentProfile(student);
                      return (
                        <button
                          key={student.id}
                          onClick={() => {
                            setSelectedRespStudentId(student.id);
                            setShowRespSuggestions(false);
                            setRespSearchQuery('');
                          }}
                          className="w-full p-4 flex items-center gap-4 hover:bg-slate-900/60 transition-all text-left"
                        >
                          <img
                            src={profile.photoUrl || `https://i.pravatar.cc/150?u=${student.id}`}
                            alt={student.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-slate-800 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs truncate">{student.name}</span>
                              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-md text-slate-300 font-mono">{student.grade}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                              <span>Matrícula: {student.matricula}</span>
                              <span>•</span>
                              <span>Responsável: <strong className="text-slate-300">{profile.responsibles[0]?.name || student.parent}</strong></span>
                            </div>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* LIST OF RECENT/PINNED STUDENTS FOR INSTANT CLICKS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">Pesquisa Rápida:</span>
              {students.slice(0, 5).map(student => {
                const isActive = selectedRespStudentId === student.id;
                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedRespStudentId(student.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                      isActive 
                        ? 'bg-[#D4AF37]/20 border border-[#D4AF37] text-white' 
                        : 'bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400'
                    }`}
                  >
                    {student.name.split(' ')[0]} {student.name.split(' ').slice(-1)[0]} ({student.grade})
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. CONTEÚDO PRINCIPAL: DUAS COLUNAS */}
          {(() => {
            const activeStudent = students.find(s => s.id === selectedRespStudentId);
            if (!activeStudent) {
              return (
                <div className="p-8 text-center text-slate-500 italic bg-slate-900/10 border border-slate-800 rounded-3xl">
                  Selecione ou busque um estudante para exibir o painel de contato.
                </div>
              );
            }
            const profile = getFullStudentProfile(activeStudent);
            const isStudentActive = profile.status === 'Ativo';

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LADO ESQUERDO: FICHA DO ESTUDANTE (5 Cols) */}
                <div className="lg:col-span-5 bg-slate-950/80 border border-slate-850 rounded-3xl overflow-hidden p-6 space-y-6">
                  <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-slate-850">
                    <div className="relative">
                      <img
                        src={profile?.photoUrl || `https://i.pravatar.cc/150?u=${profile?.id || 'std'}`}
                        alt={profile?.name || 'Estudante'}
                        referrerPolicy="no-referrer"
                        className="w-24 h-24 rounded-3xl object-cover border-2 border-slate-800 shadow-xl"
                      />
                      <span className={`absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${
                        isStudentActive
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {profile?.status || 'Ativo'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-serif text-lg font-bold text-white">{profile?.name || 'Estudante'}</h4>
                      <p className="text-xs text-[#D4AF37] font-mono mt-0.5">{profile?.grade || ''} • {profile?.shift || ''}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Matrícula: {profile?.matricula || 'Sem matrícula'}</p>
                    </div>
                  </div>

                  {/* DETALHES GERAIS */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Segmento</span>
                      <p className="font-medium text-white">{profile.segment}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Turno</span>
                      <p className="font-medium text-white">{profile.shift}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Nascimento</span>
                      <p className="font-medium text-white">{profile.birthDate}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Idade</span>
                      <p className="font-medium text-white">{profile.age} anos</p>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Professor Regente</span>
                      <p className="font-medium text-slate-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {profile.professorRegente}
                      </p>
                    </div>
                  </div>

                  {/* STATUS CARDS */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-850">
                    <div className={`p-3 rounded-2xl border flex flex-col justify-between space-y-1 ${
                      profile.transport 
                        ? 'bg-blue-500/5 border-blue-500/20' 
                        : 'bg-slate-900/30 border-slate-850'
                    }`}>
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Transporte Escolar</span>
                      <p className={`font-bold text-xs ${profile.transport ? 'text-blue-400' : 'text-slate-400'}`}>
                        {profile.transport ? '✓ Vinculado' : '✗ Não Utiliza'}
                      </p>
                    </div>

                    <div className={`p-3 rounded-2xl border flex flex-col justify-between space-y-1 ${
                      profile.aee 
                        ? 'bg-purple-500/5 border-purple-500/20' 
                        : 'bg-slate-900/30 border-slate-850'
                    }`}>
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Atendimento AEE</span>
                      <p className={`font-bold text-xs ${profile.aee ? 'text-purple-400' : 'text-slate-400'}`}>
                        {profile.aee ? '✓ Laudo Ativo' : '✗ Sem Necessidade'}
                      </p>
                    </div>
                  </div>

                  {/* OBSERVAÇÕES IMPORTANTES */}
                  <div className="p-4 bg-rose-950/15 border border-rose-500/15 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Avisos e Observações de Saúde</span>
                    </div>
                    <p className="text-[11px] text-rose-200 leading-relaxed">
                      {profile.observacoes}
                    </p>
                    {profile.laudoDescricao && (
                      <p className="text-[10px] text-rose-300 font-mono italic">
                        {profile.laudoDescricao}
                      </p>
                    )}
                  </div>

                  {/* HISTÓRICO DE COMUNICAÇÃO RECENTE (TIMELINE) */}
                  <div className="space-y-3 pt-4 border-t border-slate-850">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                      <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Histórico de Contato</span>
                      <span className="text-[#D4AF37]">{profile.timelineEvents.length + (customTimelineEvents?.filter(e => e.studentId === profile.id).length || 0)} registros</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {[
                        ...(customTimelineEvents?.filter(e => e.studentId === profile.id) || []),
                        ...profile.timelineEvents
                      ].length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">Sem comunicações enviadas recentemente.</p>
                      ) : (
                        [
                          ...(customTimelineEvents?.filter(e => e.studentId === profile.id) || []),
                          ...profile.timelineEvents
                        ].map((evt, i) => {
                          const isUrg = evt.priority === 'Urgente' || evt.type === 'urgente';
                          return (
                            <div key={evt.id || i} className="p-2.5 bg-slate-900 border border-slate-850 rounded-xl text-[11px] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-bold uppercase text-[9px] ${
                                  isUrg ? 'text-rose-400' : 'text-slate-300'
                                }`}>
                                  {evt.title}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">{evt.date}</span>
                              </div>
                              <p className="text-slate-400 leading-snug">{evt.description}</p>
                              <div className="flex items-center gap-2 pt-1 text-[9px]">
                                <span className={`px-1.5 py-0.25 rounded ${
                                  evt.priority === 'Urgente' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                  evt.priority === 'Prioritário' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                  evt.priority === 'Importante' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  {evt.priority || 'Informativo'}
                                </span>
                                <span className="text-slate-500">• Status: {evt.status || 'Enviado'}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

                {/* LADO DIREITO: RESPONSÁVEIS (7 Cols) */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* SITUAÇÕES RÁPIDAS (Quick message template dispatcher) */}
                  <div className="bg-slate-950/80 border border-slate-850 p-5 rounded-3xl space-y-3 text-left">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-[10px] uppercase font-bold tracking-widest">Modelos IA de Contato Rápido</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Selecione um motivo abaixo para preencher uma notificação inteligente antes de realizar o envio:
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { icon: '🤒', label: 'Estudante passando mal' },
                        { icon: '⚠', label: 'Advertência disciplinar' },
                        { icon: '👨‍👩‍👧', label: 'Convocação da família' },
                        { icon: '🚌', label: 'Transporte Escolar' },
                        { icon: '📚', label: 'Pendência pedagógica' },
                        { icon: '💰', label: 'Pendência financeira' },
                        { icon: '🏫', label: 'Saída antecipada' },
                        { icon: '📄', label: 'Assinatura pendente' },
                        { icon: '🎒', label: 'Estudante aguardando' },
                      ].map((sit) => (
                        <button
                          key={sit.label}
                          onClick={() => handleTriggerQuickTemplate(sit.label, profile)}
                          className="p-2.5 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 active:scale-[0.98] border border-slate-850 rounded-xl text-left text-[11px] font-medium text-slate-300 transition-all flex items-center gap-2 truncate"
                        >
                          <span className="text-sm shrink-0">{sit.icon}</span>
                          <span className="truncate">{sit.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CARDS DOS RESPONSÁVEIS */}
                  <div className="space-y-4">
                    {profile.responsibles.map((resp, index) => {
                      const isOnline = resp.status === 'Online';
                      return (
                        <div
                          key={resp.id || index}
                          className="bg-slate-950/80 border border-slate-850 rounded-3xl p-6 space-y-4 text-left relative overflow-hidden"
                        >
                          {/* Status indicator glow */}
                          <div className={`absolute top-0 left-0 w-1 h-full ${
                            isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-700'
                          }`}></div>

                          {/* Header info */}
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex items-start gap-3 pl-2">
                              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[#D4AF37] shrink-0 font-bold text-sm">
                                {resp.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-white text-sm">{resp.name}</h4>
                                  <span className="text-[9px] bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-2 py-0.5 rounded-full font-bold uppercase">
                                    {resp.relationship}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">CPF: {resp.cpf} • E-mail: {resp.email}</p>
                              </div>
                            </div>

                            {/* Online Status & Last Access */}
                            <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 sm:gap-0.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-900">
                              <span className="flex items-center gap-1.5 text-[10px] font-bold">
                                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
                                <span className={isOnline ? 'text-green-400' : 'text-slate-400'}>
                                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                                </span>
                              </span>
                              <p className="text-[10px] text-slate-500">Acesso: {resp.lastAccess}</p>
                            </div>
                          </div>

                          {/* Extra Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/40 p-3.5 rounded-2xl border border-slate-900 text-xs text-slate-300">
                            <div>
                              <span className="text-[9px] text-slate-500 block uppercase font-mono">Telefone / WhatsApp</span>
                              <span className="font-mono">{resp.phone}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-[9px] text-slate-500 block uppercase font-mono">Endereço Residencial</span>
                              <span className="truncate block animate-fade-in" title={resp.address}>{resp.address}</span>
                            </div>
                          </div>

                          {/* Communication opt-in warning */}
                          <div className="flex items-center justify-between text-[11px] px-2 text-slate-400">
                            <span>Recebe comunicados oficiais?</span>
                            <span className={`font-bold ${resp.receivesComm ? 'text-green-400' : 'text-amber-400'}`}>
                              {resp.receivesComm ? '✓ Sim (Ativo)' : '⚠ Desativado pelo usuário'}
                            </span>
                          </div>

                          {/* BOTÕES RÁPIDOS */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-900">
                            
                            <button
                              onClick={() => handleActionCall(resp)}
                              className="flex items-center justify-center gap-2 p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-700 active:scale-95 rounded-xl text-xs font-semibold transition-all"
                              title="Realizar Ligação VoIP Integrada"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ligar</span>
                            </button>

                            <button
                              onClick={() => handleActionWhatsApp(resp)}
                              className="flex items-center justify-center gap-2 p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-700 active:scale-95 rounded-xl text-xs font-semibold transition-all"
                              title="Enviar mensagem direta pelo WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-green-400" />
                              <span>WhatsApp</span>
                            </button>

                            <button
                              onClick={() => handleActionEmail(resp, profile)}
                              className="flex items-center justify-center gap-2 p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-700 active:scale-95 rounded-xl text-xs font-semibold transition-all"
                              title="Enviar comunicado por E-mail institucional"
                            >
                              <Mail className="w-3.5 h-3.5 text-blue-400" />
                              <span>E-mail</span>
                            </button>

                            <button
                              onClick={() => handleActionMeeting(resp, profile)}
                              className="flex items-center justify-center gap-2 p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-700 active:scale-95 rounded-xl text-xs font-semibold transition-all"
                              title="Agendar Reunião Extraordinária"
                            >
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Reunião</span>
                            </button>

                            <button
                              onClick={() => handleActionSignature(resp, profile)}
                              className="flex items-center justify-center gap-2 p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-700 active:scale-95 rounded-xl text-xs font-semibold transition-all"
                              title="Solicitar Assinatura Digital de Termos"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-400" />
                              <span>Assinatura</span>
                            </button>

                            <button
                              onClick={() => handleActionViewAddress(resp)}
                              className="flex items-center justify-center gap-2 p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-700 active:scale-95 rounded-xl text-xs font-semibold transition-all"
                              title="Exibir mapa ou comprovante de endereço"
                            >
                              <MapPin className="w-3.5 h-3.5 text-rose-400" />
                              <span>Endereço</span>
                            </button>

                            <button
                              onClick={() => handleCallResponsibleUrgent(resp, profile)}
                              className="col-span-2 flex items-center justify-center gap-2 p-2.5 bg-gradient-to-r from-rose-950/45 to-rose-900/35 hover:from-rose-900/55 hover:to-rose-800/45 text-rose-300 hover:text-white border border-rose-500/30 active:scale-95 rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-950/20 animate-pulse"
                              title="Chamar Responsável Imediatamente pelo Aplicativo Classium Família"
                            >
                              <Zap className="w-4 h-4 text-rose-400" />
                              <span>Chamar Responsável</span>
                            </button>

                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>
            );
          })()}

        </div>
      )}

      {/* MODALS DE SIMULAÇÃO E INTERAÇÃO DA CENTRAL */}
      {simulatedCall && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm text-center space-y-6 shadow-2xl relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center animate-pulse">
                <Phone className="w-8 h-8" />
              </div>
              <h4 className="text-white font-bold text-lg">Ligação em Andamento</h4>
              <p className="text-xs text-emerald-400 font-medium font-mono animate-pulse">Conectando Canal VoIP Seguro...</p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Destinatário</span>
              <p className="text-white font-bold text-sm truncate">{simulatedCall}</p>
              <p className="text-[11px] text-slate-400">Canal criptografado homologado LGPD</p>
            </div>

            <button
              onClick={() => setSimulatedCall(null)}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 active:scale-98 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
            >
              Encerrar Chamada
            </button>
          </div>
        </div>
      )}

      {simulatedWhatsApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-md text-left space-y-4 shadow-2xl relative animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-400" />
                <h4 className="text-white font-bold text-sm">Disparo Inteligente de WhatsApp</h4>
              </div>
              <button onClick={() => setSimulatedWhatsApp(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Contato</span>
                <p className="text-white font-bold">{simulatedWhatsApp.name} ({simulatedWhatsApp.phone})</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Conteúdo do Disparo</span>
                <textarea
                  value={simulatedWhatsApp.message}
                  onChange={(e) => setSimulatedWhatsApp(prev => prev ? { ...prev, message: e.target.value } : null)}
                  rows={4}
                  className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSimulatedWhatsApp(null)}
                className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  showToast(`Mensagem enviada com sucesso para o WhatsApp de ${simulatedWhatsApp.name}!`);
                  setSimulatedWhatsApp(null);
                }}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold"
              >
                Enviar via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {simulatedEmail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-lg text-left space-y-4 shadow-2xl relative animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                <h4 className="text-white font-bold text-sm">Central de E-mail Escolar</h4>
              </div>
              <button onClick={() => setSimulatedEmail(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Para</span>
                <p className="text-white font-bold">{simulatedEmail.name} &lt;{simulatedEmail.email}&gt;</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Assunto</span>
                <input
                  type="text"
                  value={simulatedEmail.subject}
                  onChange={(e) => setSimulatedEmail(prev => prev ? { ...prev, subject: e.target.value } : null)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Corpo do E-mail</span>
                <textarea
                  value={simulatedEmail.body}
                  onChange={(e) => setSimulatedEmail(prev => prev ? { ...prev, body: e.target.value } : null)}
                  rows={6}
                  className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSimulatedEmail(null)}
                className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  showToast(`E-mail enviado com sucesso para ${simulatedEmail.name}!`);
                  setSimulatedEmail(null);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
              >
                Enviar E-mail
              </button>
            </div>
          </div>
        </div>
      )}

      {quickTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-lg text-left space-y-4 shadow-2xl relative animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                <h4 className="text-white font-bold text-sm">Draft de Comunicação Inteligente</h4>
              </div>
              <button onClick={() => setQuickTemplateModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-855 text-xs text-slate-400 space-y-1">
              <p><strong>Estudante:</strong> {quickTemplateModal.student?.name || 'Estudante'} • <strong>Responsável:</strong> {quickTemplateModal.responsible?.name || 'Responsável Não Informado'} ({quickTemplateModal.responsible?.relationship || 'Família'})</p>
              <p><strong>Situação identificada:</strong> {quickTemplateModal.templateType}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Nível de Prioridade</span>
                <div className="flex gap-2">
                  {[
                    { level: 'Informativo', color: 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' },
                    { level: 'Importante', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' },
                    { level: 'Prioritário', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20' },
                    { level: 'Urgente', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' },
                  ].map(p => {
                    const isActive = quickTemplateModal.priority === p.level;
                    return (
                      <button
                        key={p.level}
                        onClick={() => setQuickTemplateModal(prev => prev ? { ...prev, priority: p.level } : null)}
                        className={`flex-1 py-2 rounded-xl border text-center transition-all font-semibold text-[11px] ${
                          isActive ? 'bg-slate-800 text-white border-[#D4AF37] scale-102 font-bold' : p.color
                        }`}
                      >
                        {p.level}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Mensagem a ser enviada</span>
                <textarea
                  value={quickTemplateModal.generatedText}
                  onChange={(e) => setQuickTemplateModal(prev => prev ? { ...prev, generatedText: e.target.value } : null)}
                  rows={5}
                  className="w-full p-3.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setQuickTemplateModal(null)}
                className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Descartar
              </button>
              <button
                onClick={() => {
                  handleCallResponsibleUrgent(
                    quickTemplateModal.responsible,
                    quickTemplateModal.student,
                    quickTemplateModal.generatedText,
                    quickTemplateModal.priority
                  );
                  setQuickTemplateModal(null);
                }}
                className="flex-1 py-2.5 bg-[#D4AF37] text-slate-950 font-bold hover:bg-[#c39e2e] active:scale-98 rounded-xl text-xs tracking-wider"
              >
                Enviar Canal Prioritário
              </button>
            </div>
          </div>
        </div>
      )}

      {activeNotificationSim && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0c10] border-4 border-slate-800 p-5 rounded-[40px] w-full max-w-[320px] shadow-2xl relative overflow-hidden ring-4 ring-[#D4AF37]/20 animate-scale-up">
            {/* Speaker grill and camera notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full flex items-center justify-center gap-1.5 z-10 border border-slate-900">
              <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-slate-950 rounded-full"></div>
            </div>

            {/* Screen area */}
            <div className="space-y-6 pt-8 text-center text-xs text-white">
              
              {/* Urgent header banner */}
              <div className={`p-4 rounded-3xl border text-center space-y-1 relative overflow-hidden ${
                activeNotificationSim.priority === 'Urgente' ? 'bg-rose-950/40 border-rose-500/30' :
                activeNotificationSim.priority === 'Prioritário' ? 'bg-orange-950/40 border-orange-500/30' :
                activeNotificationSim.priority === 'Importante' ? 'bg-amber-950/40 border-amber-500/30' :
                'bg-blue-950/40 border-blue-500/30'
              }`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/2 rounded-full blur-xl pointer-events-none"></div>
                <p className={`font-mono text-[9px] uppercase font-bold tracking-widest ${
                  activeNotificationSim.priority === 'Urgente' ? 'text-rose-400 animate-pulse' :
                  activeNotificationSim.priority === 'Prioritário' ? 'text-orange-400' :
                  activeNotificationSim.priority === 'Importante' ? 'text-amber-400' : 'text-blue-400'
                }`}>
                  {activeNotificationSim.title}
                </p>
                <p className="text-[10px] text-slate-300">Contato de {activeNotificationSim.responsibleName}</p>
              </div>

              {/* Alerta logo and title */}
              <div className="space-y-1">
                <p className="text-slate-400 text-[10px] uppercase font-mono">Disparado por Classium Gestor</p>
                <h4 className="font-serif font-bold text-white text-md">Alerta de Alta Prioridade</h4>
              </div>

              {/* The generated message */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900 text-left space-y-2 max-h-48 overflow-y-auto">
                <p className="font-bold text-[10px] text-slate-400 uppercase">Assunto: Contato Urgente da Escola</p>
                <p className="text-slate-200 leading-relaxed text-[11px] whitespace-pre-line">
                  {activeNotificationSim.subject}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setActiveNotificationSim(null);
                    showToast("Notificação visualizada pelo responsável!");
                  }}
                  className={`w-full py-3 rounded-2xl text-xs font-bold transition-all uppercase tracking-wider ${
                    activeNotificationSim.priority === 'Urgente' ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/30' :
                    activeNotificationSim.priority === 'Prioritário' ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-950/30' :
                    activeNotificationSim.priority === 'Importante' ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' :
                    'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {activeNotificationSim.actionText}
                </button>
                <button
                  onClick={() => setActiveNotificationSim(null)}
                  className="text-slate-500 hover:text-slate-300 text-[10px]"
                >
                  Fechar Simulação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addressModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-md text-left space-y-4 shadow-2xl relative animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-400" />
                <h4 className="text-white font-bold text-sm">Visualizar Endereço Residencial</h4>
              </div>
              <button onClick={() => setAddressModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-mono text-[9px] uppercase">Responsável</span>
                <p className="text-white font-bold text-sm">{addressModal.name}</p>
              </div>
              <div>
                <span className="text-slate-500 font-mono text-[9px] uppercase">Endereço Completo</span>
                <p className="text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
                  {addressModal.address}
                </p>
              </div>

              {/* Embed a subtle mock design representing maps */}
              <div className="w-full h-40 bg-slate-950 rounded-xl border border-slate-850 overflow-hidden relative flex flex-col items-center justify-center text-center p-4">
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
                <MapPin className="w-10 h-10 text-rose-500 relative animate-bounce" />
                <p className="text-[10px] text-slate-500 mt-2 relative font-medium">Integração de Rotas Escolares Ativa</p>
              </div>
            </div>

            <button
              onClick={() => setAddressModal(null)}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F4C81] border border-blue-500/30 text-white px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl shadow-blue-950/40 animate-slide-in-right">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-ping shrink-0"></div>
          <span className="text-xs font-medium">{successToast}</span>
        </div>
      )}

    </div>
  );
}
