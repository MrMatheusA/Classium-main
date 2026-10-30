export type OccurrenceType = 'positive' | 'negative' | 'health' | 'transport';

export interface Occurrence {
  id: string;
  type: OccurrenceType;
  title: string;
  description: string;
  date: string;
  time: string;
  reporter: string;
  severity?: 'low' | 'medium' | 'high' | 'grave' | 'gravissima';
  studentId?: string;
  studentName?: string;
  grade?: string;
  classId?: string;
  status?: 'nova' | 'analise' | 'familia' | 'resolvido';
  confirmedByFamily?: boolean;
  confirmedAt?: string;
  signedByParent?: boolean;
  parentNotes?: string;
  signatureDate?: string;
  applicationResponsable?: string;
  attachmentUrl?: string;
  attachmentPhotoUrl?: string;
}

export interface GuardianData {
  id: string;
  name: string;
  cpf: string;
  rg?: string;
  phone: string;
  email: string;
  relationship: string;
  address?: string;
  notes?: string;
  hasAccess: boolean;
  isPrincipal: boolean;
}

export interface StudentData {
  id: string;
  name: string;
  photoUrl: string;
  grade: string;
  classId: string;
  ibeScore: number;
  attendanceRate: number;
  aiAlerts: AIAlert[];
  occurrences: Occurrence[];
  performance: PerformanceData[];
  
  // Personal & Educational
  cpf?: string;
  rg?: string;
  birthDate?: string;
  sex?: 'M' | 'F' | string;
  matricula?: string;
  schoolYear?: string;
  teacher?: string;
  schoolUnit?: string;
  status?: string;
  
  // Clinical Info
  bloodType?: string;
  allergies?: string;
  medications?: string;
  restrictions?: string;
  specialNeeds?: string;
  disability?: string;
  healthPlan?: string;
  emergencyContact?: string;
  medicalNotes?: string;
  susCard?: string;
  
  // Guardians
  guardians?: GuardianData[];

  // Smart Address Fields
  addressCep?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  addressReference?: string;
}

export interface AIAlert {
  id: string;
  type: 'pedagogical' | 'emotional' | 'attendance';
  message: string;
  severity: 'warning' | 'critical' | 'info';
  date: string;
}

export interface PerformanceData {
  subject: string;
  b1: number;
  b2: number;
  b3: number | null;
  b4: number | null;
  trend: 'up' | 'down' | 'stable';
}

export interface Teacher {
  id: string;
  name: string;
  photoUrl?: string;
  cpf: string;
  rg?: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
  // Professional Data
  role: string; // Cargo: Professor, Pedagogo, Coordenador, Diretor, etc.
  function?: string; // Função
  subject: string; // Disciplina
  matricula: string;
  shift: string; // Turno
  contractType: string; // Tipo de Contrato/Efetivo
  permissions: string[]; // ['Professor', 'Coordenador', 'Pedagogo', 'Diretor', 'Secretaria', 'Administrador']
  status: 'Ativo' | 'Inativo';
  hours: string; // Carga Horária e.g. "20h"
  // Availability & premium features
  availability?: string[]; // e.g., ["Segunda-07:00", "Terça-08:00"]
  bancoHoras?: number;
  horasExtras?: number;
  horasComplementares?: number;
  substitutions?: { id: string; date: string; classId: string; subject: string; status: string; replacementTeacherName: string }[];
  frequencyLogs?: { id: string; date: string; status: 'Presente' | 'Ausente' | 'Atraso'; obs?: string }[];
  login?: string;
  password?: string;
  lastLogin?: string;
  provisionalPassword?: boolean;
  passwordChanged?: boolean;
  blocked?: boolean;
}

export interface AcademicLink {
  id: string;
  teacherId: string;
  year: string;
  segment: string;
  grade: string; // Turma
  subject: string; // Disciplina
  shift: string; // Turno
  weeklyClasses: number;
  room: string;
}

export interface SchoolInfo {
  name: string;
  razaoSocial: string;
  cnpj: string;
  inep: string;
  address: string;
  municipio: string;
  estado: string;
  cep: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  logo: string;
  cover: string;
  director: string;
  schoolYear: string;
  city: string;
}

export interface SchoolUnit {
  id: string;
  name: string;
  inep: string;
  address: string;
  director: string;
  students: number;
  teachers: number;
  classes: number;
  shifts: string;
  phone: string;
  email: string;
  logo: string;
  cover: string;
  primaryColor: string;
  secondaryColor: string;
  status: 'Ativa' | 'Homologada' | 'Pendente';
  city: string;
}

export type VehicleType = 'Ônibus' | 'Van' | 'Micro-ônibus';
export type TransportShiftType = '1º Turno' | '2º Turno' | '3º Turno' | 'Educação Infantil' | 'EJA';

export interface TransportStudent {
  id: string;
  name: string;
  grade: string;
  classId: string;
  shift: string;
  schoolUnit: string;
  matricula: string;
  parentName: string;
  parentPhone: string;
  address: string;
  status: 'Aguardando Vinculação' | 'Vinculado';
  vehicleId?: string | null;
  boardingStatus?: 'Aguardando' | 'Embarcado' | 'Ausente';
}

export interface TransportVehicle {
  id: string;
  numero: string;
  tipo: VehicleType;
  driverName: string;
  driverPhone: string;
  driverCnh: string;
  monitorName: string;
  monitorPhone: string;
  placa: string;
  rota: string;
  turno: TransportShiftType;
  capacidade: number;
  observacoes?: string;
  studentsIds: string[];
}

export interface LostAndFoundItem {
  id: string;
  photoUrl: string;
  name: string;
  category: 'Vestuário' | 'Material Escolar' | 'Acessórios/Eletrônicos' | 'Garrafas/Utensílios' | 'Outros';
  description: string;
  locationFound: string;
  dateFound: string; // YYYY-MM-DD or DD/MM/YYYY
  timeFound: string; // HH:mm
  status: 'disponivel' | 'reservado' | 'entregue' | 'arquivado';
  registeredBy: string;
  setor: string; // e.g. 'Quadra Poliesportiva', 'Refeitório', 'Pátio', 'Biblioteca', 'Bloco A'
  
  // Reservation Info
  reservedByResponsible?: string;
  reservedByStudentName?: string;
  reservedByStudentId?: string;
  reservedByGrade?: string;
  reservedByPhone?: string;
  reservationDate?: string;
  reservationTime?: string;

  // Delivery Info
  deliveredDate?: string;
  deliveredTime?: string;
  deliveredByStaff?: string;
  deliveryNotes?: string;
}

export interface GateQRCodeToken {
  id: string;
  token: string; // e.g. EDP-2026-A91XF73
  studentId: string;
  studentName: string;
  studentGrade: string;
  studentPhotoUrl?: string;
  students?: {
    studentId: string;
    studentName: string;
    studentGrade: string;
    studentPhotoUrl?: string;
  }[];
  responsibleName: string;
  responsiblePhone?: string;
  
  // Picker info
  pickerName: string;
  pickerCpf: string;
  pickerRelation: string; // 'Pai/Mãe', 'Tio/Tia', 'Avô/Avó', 'Motorista Credenciado', 'Outro'
  pickerPhone?: string;
  pickerPhotoUrl?: string;
  
  date: string; // YYYY-MM-DD
  expectedTime: string; // e.g. '16:30'
  reason: string; // e.g. 'Consulta Médica', 'Saída Convencional', 'Compromisso Familiar'
  notes?: string;
  
  status: 'ativo' | 'utilizado' | 'expirado' | 'negado';
  createdAt: string;
  
  // Validation Details
  validatedAt?: string;
  validatedByStaff?: string;
  gateUnit?: string;
  refusalReason?: string;
}

export interface GateAuditLog {
  id: string;
  tokenId?: string;
  studentId: string;
  studentName: string;
  studentGrade: string;
  responsibleName: string;
  pickerName: string;
  pickerCpf: string;
  pickerRelation: string;
  timestamp: string; // DD/MM/YYYY HH:mm
  date: string; // YYYY-MM-DD
  status: 'sucesso' | 'recusado' | string;
  staffName: string;
  gateLocation: string;
  notes?: string;
  movementType?: string;
  reason?: string;
  shift?: string;
  room?: string;
}

export interface GateAlert {
  id: string;
  timestamp: string;
  type: 'qr_created' | 'qr_used' | 'qr_expired' | 'qr_denied';
  title: string;
  message: string;
  target: 'all' | 'gestor' | 'family';
  studentId?: string;
  read: boolean;
}



