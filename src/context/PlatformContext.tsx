import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { createCalendarEvent } from '../services/calendarRpcService';
import { 
  fetchOrganizationTransportData, 
  saveTransportVehicle, 
  deleteTransportVehicle as rpcDeleteTransportVehicle, 
  linkStudentToTransport, 
  unlinkStudentFromTransport, 
  updateStudentBoardingStatus as rpcUpdateStudentBoardingStatus 
} from '../services/transportRpcService';
import { getSupabaseEnvConfig } from '../lib/supabase/config';
import { PartnerPersistenceService } from '../services/partnerPersistenceService';
import { PartnerService, CanonicalPartner } from '../services/partnerService';
import { integrationHub } from '../lib/integrationHub';
import { 
  StudentData, 
  Occurrence, 
  AIAlert, 
  PerformanceData, 
  Teacher, 
  AcademicLink, 
  SchoolInfo, 
  SchoolUnit,
  TransportVehicle,
  TransportStudent,
  VehicleType,
  TransportShiftType,
  LostAndFoundItem,
  GateQRCodeToken,
  GateAuditLog,
  GateAlert
} from '../types';
import { 
  AdminMasterTab, 
  AdminUser, 
  AdminPermission, 
  SystemModule, 
  SystemSetting, 
  SystemLog, 
  SystemNotification, 
  SystemVersion, 
  SystemUpdate, 
  AuditLog, 
  FeatureFlag, 
  ImpersonationState 
} from '../types/adminMaster';
import { 
  INITIAL_ADMIN_USERS, 
  INITIAL_ADMIN_PERMISSIONS, 
  INITIAL_SYSTEM_MODULES, 
  INITIAL_SYSTEM_SETTINGS, 
  INITIAL_SYSTEM_LOGS, 
  INITIAL_SYSTEM_NOTIFICATIONS, 
  INITIAL_SYSTEM_VERSIONS, 
  INITIAL_SYSTEM_UPDATES, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_FEATURE_FLAGS 
} from '../data/adminMasterData';
import { RolePermissionMatrix, PermissionSnapshot } from '../types/rbac';
import { DEFAULT_ROLE_PERMISSION_MATRIX, INITIAL_PERMISSION_SNAPSHOTS } from '../data/rbacDefaultData';
import { mockStudent } from '../data';
import { 
  INITIAL_CLASSES, 
  INITIAL_SUBJECTS, 
  INITIAL_TEACHERS, 
  INITIAL_ROOMS, 
  INITIAL_ALERTS, 
  INITIAL_HOURS, 
  INITIAL_ALLOCATIONS 
} from '../components/admin/smart-horarios/data';

import { studentsService } from '../services/students/students.service';
import { teachersService } from '../services/teachers/teachers.service';
import { guardiansService } from '../services/guardians/guardians.service';

import { 
  SmartClass, 
  SmartTeacher, 
  SmartSubject, 
  SmartRoom, 
  SmartAlert, 
  TimePeriod, 
  GridAllocation 
} from '../components/admin/smart-horarios/types';

export type AppMode = 'landing' | 'login' | 'family' | 'professor' | 'admin' | 'commands' | 'onboarding';
export type UserRole = 'admin' | 'admin_master' | 'gestor' | 'docente' | 'familia' | 'family' | string;
export type AdminTab = 
  | 'dashboard'
  | 'instituicao'
  | 'pessoas'
  | 'academico'
  | 'pedagogico'
  | 'financeiro'
  | 'comunicacao'
  | 'agenda'
  | 'horario-aula'
  | 'transporte'
  | 'alimentacao'
  | 'patrimonio'
  | 'biblioteca'
  | 'bi'
  | 'ia'
  | 'gestao-parceiros'
  | 'comercial'
  | 'configuracoes'
  | 'relatorios'
  | 'documentos'
  | 'secretaria-tab'
  | 'diario-disciplinar'
  | 'radar-rotina'
  | 'achados-perdidos'
  | 'portaria-qrcode'
  | 'intelligence_center'
  | 'integration_hub'
  | 'supabase_center'
  | 'super_ia_center'
  | 'smart-horarios';

export type ProfessorTab = 
  | 'dashboard'
  | 'classes'
  | 'alunos'
  | 'seating'
  | 'occurrences'
  | 'reports'
  | 'reconhecimentos'
  | 'calendar'
  | 'relatorios_ia'
  | 'ia'
  | 'carreira'
  | 'studio'
  | 'configuracoes';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  sender: string;
  targetAudience: 'all' | 'family' | 'professor';
  readBy: string[]; // User IDs who read it
}

export interface DigitalAuthorization {
  id: string;
  title: string;
  description: string;
  date: string;
  signed: boolean;
  signedBy?: string;
  signatureDate?: string;
  cost?: string;
}

export interface MeetingSchedule {
  id: string;
  professional: string;
  role: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
}

export interface PremiumCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: string; // key of legends/categories
  color: string; // tailwind color class or hex
  description: string;
  time?: string;
  location?: string;
  icon?: string;
}

export interface LegendCategory {
  id: string;
  label: string;
  color: string; // e.g. "bg-green-500" or hex
  icon?: string;
}

export interface Professional {
  id: string;
  name: string;
  cpf: string;
  specialty: 'Professor Particular' | 'Psicopedagogo' | 'Psicólogo' | 'Fonoaudiólogo' | 'Neuropsicopedagogo' | 'Pedagogo' | 'Professor de Idiomas' | 'Professor de Música' | 'Reforço Escolar' | 'Preparatório ENEM' | 'Preparatório Concursos' | string;
  city: string;
  plan: 'Prata' | 'Ouro' | 'Diamante';
  status: 'Aprovado' | 'Aguardando aprovação' | 'Suspenso';
  views: number;
  contacts: number;
  avatar: string;
}

export interface PartnerAd {
  id: string;
  name: string;
  logo: string;
  banner?: string;
  rating: number;
  reviewCount: number;
  reviewLabel?: string;
  category: string;
  subCategory?: string;
  plan: string;
  planTitle?: string;
  highlights: string[];
  tags?: string[];
  duration?: string;
  modality?: string;
  price?: string;
  originalPrice?: string;
  discountBadge?: string;
  vipExclusive?: boolean;
  isMentisTherapy?: boolean;
  whatsapp: string;
  website: string;
  catalogPdfUrl?: string;
  description: string;
  officialMessage?: string;
  officialPartnerSeal?: boolean;
  sealText?: string;
  status?: string;
  views: number;
  clicks: number;
  leadsGenerated: number;
  conversions?: number;
  ctr?: number;
  location?: string;
  phone?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  colorGradient?: string;
  promoText?: string;
  sideBanner?: string;
  order?: number;
  priority?: 'Alta' | 'Média' | 'Baixa' | string;
  displayMode?: 'Exclusivo' | 'Rotativo' | 'Categoria' | 'Perfil' | 'Localização' | 'Faixa Etária' | 'Interesse' | 'IA Classium';
  audienceCategory?: string;
  audienceProfile?: string;
  audienceLocation?: string;
  audienceAgeGroup?: string;
  audienceInterest?: string;
  scheduleStart?: string;
  scheduleEnd?: string;
  createdAt?: string;
  updatedAt?: string;
  // Portal do Parceiro (RBAC & Auth)
  cpfCnpj?: string;
  email?: string;
  passwordHash?: string;
  isFirstAccess?: boolean;
  isBlocked?: boolean;
  role?: 'ROLE_PARTNER';
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'email' | 'whatsapp';
  lastLogin?: string;
  subscriptionStatus?: 'Ativa' | 'Atrasada' | 'Cancelada' | 'Suspensa' | string;
  billingHistory?: Array<{ id: string; date: string; amount: string; status: 'Pago' | 'Pendente' | 'Cancelado'; plan: string }>;
  leadsList?: Array<{ id: string; name: string; email: string; phone: string; date: string; message: string; status: 'Novo' | 'Atendido' | 'Convertido' }>;
}


/**
 * Canonical Adapter: Maps PostgreSQL public.partners (CanonicalPartner)
 * to presentation ViewModel (PartnerAd).
 */
export function mapCanonicalPartnerToPartnerAd(partner: CanonicalPartner): PartnerAd {
  const meta = partner.metadata || {};
  let highlightsArr: string[] = [];
  if (Array.isArray(meta.highlights)) {
    highlightsArr = meta.highlights;
  } else if (typeof meta.highlights === "string") {
    try {
      const parsed = JSON.parse(meta.highlights);
      if (Array.isArray(parsed)) highlightsArr = parsed;
      else highlightsArr = [meta.highlights];
    } catch {
      highlightsArr = meta.highlights.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }

  let tagsArr: string[] = [];
  if (Array.isArray(meta.tags)) {
    tagsArr = meta.tags;
  } else if (typeof meta.tags === "string") {
    try {
      const parsed = JSON.parse(meta.tags);
      if (Array.isArray(parsed)) tagsArr = parsed;
      else tagsArr = [meta.tags];
    } catch {
      tagsArr = meta.tags.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }

  return {
    id: partner.id,
    name: partner.partner_name || "Parceiro Educacional",
    logo: meta.logo || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150",
    banner: meta.banner,
    rating: Number(meta.rating) || 5.0,
    reviewCount: Number(meta.reviewCount) || 0,
    category: partner.category || "formacao",
    subCategory: meta.subCategory || "",
    plan: partner.plan_id || "ouro",
    highlights: highlightsArr,
    duration: meta.duration,
    modality: meta.modality || "Online",
    price: meta.price,
    originalPrice: meta.originalPrice,
    discountBadge: meta.discountBadge,
    vipExclusive: Boolean(meta.vipExclusive),
    isMentisTherapy: Boolean(meta.isMentisTherapy),
    whatsapp: partner.phone || meta.whatsapp || "",
    website: partner.website || "",
    catalogPdfUrl: meta.catalogPdfUrl,
    description: partner.description || "",
    officialPartnerSeal: Boolean(meta.officialPartnerSeal ?? true),
    status: (partner.status === "active" && partner.approval_status === "approved") ? "aprovado" : "pendente",
    views: Number(meta.views) || 0,
    clicks: Number(meta.clicks) || 0,
    leadsGenerated: Number(meta.leadsGenerated) || 0,
    location: meta.location || "Nacional",
    primaryButtonLink: meta.primaryButtonLink || partner.website || "",
    tags: tagsArr,
    officialMessage: meta.officialMessage,
    promoText: meta.promoText,
    planTitle: meta.planTitle,
    primaryButtonText: meta.primaryButtonText,
    secondaryButtonText: meta.secondaryButtonText,
    colorGradient: meta.colorGradient,
    sealText: meta.sealText,
    cpfCnpj: partner.document_number || undefined,
    email: partner.email || undefined
  };
}

export interface ServiceProvider {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  category: string;
  plan: 'Bronze' | 'Prata' | 'Ouro' | 'Diamante';
  status: 'Aprovado' | 'Aguardando aprovação' | 'Suspenso';
  description: string;
  location: string;
  rating: number;
  reviewCount: number;
  views: number;
  clicks: number;
  leadsGenerated: number;
  whatsapp: string;
  website: string;
}

interface PlatformContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
  student: StudentData;
  setStudent: React.Dispatch<React.SetStateAction<StudentData>>;
  currentFamilyStudent: StudentData;
  announcements: Announcement[];
  addAnnouncement: (title: string, content: string, sender: string, target: 'all' | 'family' | 'professor') => void;
  authorizations: DigitalAuthorization[];
  addAuthorization: (title: string, description: string, cost?: string) => void;
  signAuthorization: (id: string, parentName: string) => void;
  schedules: MeetingSchedule[];
  requestSchedule: (professional: string, role: string, date: string, time: string, notes?: string) => void;
  confirmSchedule: (id: string) => void;
  addOccurrence: (occurrence: Omit<Occurrence, 'id'>) => void;
  confirmOccurrenceRead: (id: string, notes?: string) => void;
  addGateMovementLog: (log: Omit<GateAuditLog, 'id'>) => void;
  updateGrade: (subject: string, bimester: 'b1' | 'b2' | 'b3' | 'b4', value: number) => void;
  calculateIBE: (student: StudentData) => number;
  activeFamilyTab: number;
  setActiveFamilyTab: (tab: number) => void;
  activeAdminTab: AdminTab;
  setActiveAdminTab: (tab: AdminTab) => void;
  activeProfessorTab: ProfessorTab;
  setActiveProfessorTab: (tab: ProfessorTab) => void;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  academicLinks: AcademicLink[];
  setAcademicLinks: React.Dispatch<React.SetStateAction<AcademicLink[]>>;
  schoolOccurrences: Occurrence[];
  updateOccurrenceStatus: (id: string, status: 'nova' | 'analise' | 'familia' | 'resolvido') => void;
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  schoolUnits: SchoolUnit[];
  setSchoolUnits: React.Dispatch<React.SetStateAction<SchoolUnit[]>>;
  premiumEvents: PremiumCalendarEvent[];
  setPremiumEvents: React.Dispatch<React.SetStateAction<PremiumCalendarEvent[]>>;
  legendCategories: LegendCategory[];
  setLegendCategories: React.Dispatch<React.SetStateAction<LegendCategory[]>>;
  addPremiumEvent: (event: Omit<PremiumCalendarEvent, 'id'>) => void;
  updatePremiumEvent: (event: PremiumCalendarEvent) => void;
  deletePremiumEvent: (id: string) => void;
  // CLASSIUMTransporte State & Methods
  transportVehicles: TransportVehicle[];
  setTransportVehicles: React.Dispatch<React.SetStateAction<TransportVehicle[]>>;
  transportStudents: TransportStudent[];
  setTransportStudents: React.Dispatch<React.SetStateAction<TransportStudent[]>>;
  addTransportVehicle: (vehicle: Omit<TransportVehicle, 'id' | 'studentsIds'>) => void;
  updateTransportVehicle: (vehicle: TransportVehicle) => void;
  deleteTransportVehicle: (id: string) => void;
  linkStudentToVehicle: (studentId: string, vehicleId: string) => boolean;
  unlinkStudentFromVehicle: (studentId: string) => void;
  registerStudentTransport: (studentData: Omit<TransportStudent, 'id' | 'status' | 'vehicleId'>) => void;
  updateStudentBoardingStatus: (studentId: string, status: 'Aguardando' | 'Embarcado' | 'Ausente') => void;

  // Central de Alimentação Escolar State & Methods
  foodMonthlyMenus: MonthlyMenuData[];
  foodActiveMonth: string;
  setFoodActiveMonth: (month: string) => void;
  saveMonthlyMenu: (menu: MonthlyMenuData) => void;
  attachOfficialFoodDocument: (doc: OfficialFoodDocument) => void;
  foodBackupArchive: MonthlyMenuData[];

  // Smart Horários Real-Time State & Methods
  smartHorariosAllocations: GridAllocation[];
  setSmartHorariosAllocations: React.Dispatch<React.SetStateAction<GridAllocation[]>>;
  smartHorariosTeachers: SmartTeacher[];
  setSmartHorariosTeachers: React.Dispatch<React.SetStateAction<SmartTeacher[]>>;
  smartHorariosClasses: SmartClass[];
  smartHorariosSubjects: SmartSubject[];
  smartHorariosRooms: SmartRoom[];
  smartHorariosHours: TimePeriod[];
  smartHorariosAlerts: SmartAlert[];
  smartHorariosNotifications: Array<{ id: string; timestamp: string; teacherId: string; message: string; type: string }>;
  activeTeacherId: string;
  setActiveTeacherId: (id: string) => void;
  updateSmartHorariosAllocations: (newAllocations: GridAllocation[], notifMsg?: string, targetTeacherId?: string) => void;

  // Family Multiple Children Sincronizacao
  familyStudents: StudentData[];
  setFamilyStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  selectFamilyStudent: (studentId: string) => void;
  updateFamilyStudent: (studentId: string, updatedData: Partial<StudentData>) => void;

  // Session & Staff Provisioning States
  currentUser: any;
  setCurrentUser: (user: any) => void;
  gestorAccount: any;
  setGestorAccount: (account: any) => void;
  addStaffMember: (staff: any) => void;
  loginFlow: 'login' | 'reset-temp-password' | 'register-gestor' | 'register-family';
  setLoginFlow: (flow: 'login' | 'reset-temp-password' | 'register-gestor' | 'register-family') => void;

  // Achados & Perdidos Real-Time State & Methods
  lostAndFoundItems: LostAndFoundItem[];
  addLostAndFoundItem: (item: Omit<LostAndFoundItem, 'id' | 'status'>) => void;
  reserveLostAndFoundItem: (itemId: string, studentId: string, studentName: string, grade: string, parentName: string, phone: string) => void;
  deliverLostAndFoundItem: (itemId: string, staffName: string, notes?: string) => void;
  archiveLostAndFoundItem: (itemId: string) => void;

  // Portaria QR Code Real-Time State & Methods
  gateQRCodes: GateQRCodeToken[];
  gateAuditLogs: GateAuditLog[];
  gateAlerts: GateAlert[];
  createGateQRCode: (data: Omit<GateQRCodeToken, 'id' | 'token' | 'status' | 'createdAt'>) => GateQRCodeToken;
  validateGateQRCode: (tokenStr: string, staffName: string, approve: boolean, refusalReason?: string, gateLocation?: string) => { success: boolean; message: string; codeData?: GateQRCodeToken };
  cancelGateQRCode: (tokenStr: string) => void;
  purgeOldGateAuditLogs: () => void;

  // CLASSIUMADMIN MASTER GLOBAL STATE & METHODS
  activeAdminMasterTab: AdminMasterTab;
  setActiveAdminMasterTab: (tab: AdminMasterTab) => void;
  adminUsers: AdminUser[];
  adminPermissions: AdminPermission[];
  systemModules: SystemModule[];
  systemSettings: SystemSetting[];
  systemLogs: SystemLog[];
  systemNotifications: SystemNotification[];
  systemVersions: SystemVersion[];
  systemUpdates: SystemUpdate[];
  auditLogs: AuditLog[];
  featureFlags: FeatureFlag[];
  impersonation: ImpersonationState;
  addAuditLog: (action: string, moduleName: string, detailsBefore?: string, detailsAfter?: string) => void;
  startImpersonation: (user: { id: string; name: string; email: string; role: string; schoolName?: string }) => void;
  stopImpersonation: () => void;
  toggleFeatureFlag: (flagKey: string) => void;
  updateSystemSetting: (key: string, value: string) => void;

  // RBAC Permission Matrix & Snapshots
  permissionMatrix: RolePermissionMatrix;
  setPermissionMatrix: React.Dispatch<React.SetStateAction<RolePermissionMatrix>>;
  permissionSnapshots: PermissionSnapshot[];
  setPermissionSnapshots: React.Dispatch<React.SetStateAction<PermissionSnapshot[]>>;

  // Marketplace Manager State and Methods
  professionals: Professional[];
  setProfessionals: React.Dispatch<React.SetStateAction<Professional[]>>;
  partnerAds: PartnerAd[];
  setPartnerAds: React.Dispatch<React.SetStateAction<PartnerAd[]>>;
  serviceProviders: ServiceProvider[];
  setServiceProviders: React.Dispatch<React.SetStateAction<ServiceProvider[]>>;
  addProfessional: (prof: Omit<Professional, 'id' | 'views' | 'contacts'>) => void;
  updateProfessional: (prof: Professional) => void;
  deleteProfessional: (id: string) => void;
  addPartnerAd: (ad: Omit<PartnerAd, 'id' | 'views' | 'clicks' | 'leadsGenerated'> | PartnerAd) => void;
  updatePartnerAd: (ad: PartnerAd) => void;
  deletePartnerAd: (id: string) => void;

  // Portal do Parceiro Auth & RBAC
  currentPartner: PartnerAd | null;
  setCurrentPartner: React.Dispatch<React.SetStateAction<PartnerAd | null>>;
  loginPartner: (loginDoc: string, pass: string) => { success: boolean; isFirstAccess?: boolean; partner?: PartnerAd; error?: string };
  changePartnerPassword: (partnerId: string, newPass: string) => { success: boolean; error?: string };
  requestPasswordRecovery: (loginDoc: string, channel: 'email' | 'whatsapp') => { success: boolean; code?: string; target?: string; error?: string };
  resetPasswordWithCode: (loginDoc: string, code: string, newPass: string) => { success: boolean; error?: string };
  logoutPartner: () => void;
  toggleBlockPartner: (partnerId: string) => void;
  resetPartnerPasswordToDefault: (partnerId: string) => void;
  changePartnerPlan: (partnerId: string, newPlan: string) => void;

  addServiceProvider: (provider: Omit<ServiceProvider, 'id' | 'views' | 'clicks' | 'leadsGenerated' | 'rating' | 'reviewCount'>) => void;
  updateServiceProvider: (provider: ServiceProvider) => void;
  deleteServiceProvider: (id: string) => void;
}

export interface MealItem {
  id: string;
  dayOfWeek: string;
  cafeManha: string;
  almoco: string;
  lancheTarde: string;
  calorias?: string;
  alergencicos?: string[];
}

export interface OfficialFoodDocument {
  id: string;
  monthName: string;
  year: number;
  title?: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'xlsx' | 'ods' | 'odt' | 'image';
  fileUrl?: string;
  fileSize?: string;
  uploadDate: string;
  uploadedBy: string;
  totalPages: number;
  thumbnails?: string[];
  rotation_angle?: number;
  detected_rotation?: number;
  document_orientation_status?: 'original' | 'corrected' | 'manual';
}

export interface MonthlyMenuData {
  id: string;
  monthName: string;
  year: number;
  published: boolean;
  publishedAt?: string;
  publishedBy?: string;
  meals: MealItem[];
  document?: OfficialFoodDocument;
}

const initialSchoolOccurrences: Occurrence[] = [];

const initialAnnouncements: Announcement[] = [];

const initialAuthorizations: DigitalAuthorization[] = [];

const initialSchedules: MeetingSchedule[] = [];

const isDbConfigured = getSupabaseEnvConfig().isConfigured;

const initialTeachers: Teacher[] = [];

const initialAcademicLinks: AcademicLink[] = [];

const initialSchoolInfo: SchoolInfo = {
  name: 'ESCOLA EM IMPLANTAÇÃO',
  razaoSocial: '',
  cnpj: '',
  inep: '',
  address: '',
  municipio: '',
  estado: '',
  cep: '',
  telefone: '',
  whatsapp: '',
  email: '',
  site: '',
  logo: '',
  cover: '',
  director: '',
  schoolYear: 'Ano Letivo 2026',
  city: ''
};

const initialSchoolUnits: SchoolUnit[] = [];

export const defaultLegendCategories: LegendCategory[] = [
  { id: 'feriado_nacional', label: 'Feriado Nacional', color: 'bg-red-600' },
  { id: 'conselho_classe', label: 'Conselho de Classe', color: 'bg-blue-600' },
  { id: 'inicio_letivo', label: 'Início do Ano Letivo', color: 'bg-emerald-500' },
  { id: 'avaliacoes', label: 'Avaliações', color: 'bg-yellow-400' },
  { id: 'evento_escolar', label: 'Evento Escolar', color: 'bg-orange-500' },
  { id: 'formacao_continuada', label: 'Formação Continuada', color: 'bg-purple-600' },
  { id: 'atividade_pratica', label: 'Atividade Prática', color: 'bg-amber-800' },
  { id: 'fim_bimestre', label: 'Encerramento de Bimestre', color: 'bg-slate-900' },
  { id: 'recesso_escolar', label: 'Recesso Escolar', color: 'bg-slate-500' },
  { id: 'recesso_fim_semana', label: 'Recesso de Fim de Semana', color: 'bg-blue-400' },
  { id: 'provas_internas', label: 'Provas Internas', color: 'bg-pink-500' },
  { id: 'atividade_maker', label: 'Atividade Maker', color: 'bg-sky-500' },
  { id: 'projeto_pedagogico', label: 'Projeto Pedagógico', color: 'bg-teal-500' },
  { id: 'recuperacao', label: 'Recuperação', color: 'bg-yellow-600' },
  { id: 'reuniao_pais', label: 'Reunião de Pais', color: 'bg-purple-400' },
  { id: 'planejamento_pedagogico', label: 'Planejamento Pedagógico', color: 'bg-orange-200' }
];

export function generateAutoCalendarEventsForYear(year: number): PremiumCalendarEvent[] {
  return [];
}

export const defaultPremiumCalendarEvents: PremiumCalendarEvent[] = [];

const initialTransportVehicles: TransportVehicle[] = [];

const initialTransportStudents: TransportStudent[] = [];

const initialFamilyStudentsList: StudentData[] = [];

const initialLostAndFoundItems: LostAndFoundItem[] = [];

const initialGateQRCodes: GateQRCodeToken[] = [];

const initialGateAuditLogs: GateAuditLog[] = [];

const initialProfessionalsList: Professional[] = [];

const initialGlobalPartnerAds: PartnerAd[] = [];

const initialGlobalServiceProvidersList: ServiceProvider[] = [];

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { user, profile, role: authRole } = useAuth();

  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(initialSchoolInfo);
  const [schoolUnits, setSchoolUnits] = useState<SchoolUnit[]>(initialSchoolUnits);
  const [mode, setModeState] = useState<AppMode>('landing');
  // Autoridade canônica: o papel é derivado exclusivamente de useAuth().role
  const role: UserRole | null = authRole;

  // Real-time Supabase School Synchronization for active user/profile
  useEffect(() => {
    async function syncSchoolFromSupabase() {
      const schoolId = profile?.school_id;
      if (!schoolId) return;

      try {
        const { data: schoolData, error } = await supabase
          .from('schools')
          .select('*')
          .eq('id', schoolId)
          .maybeSingle();

        if (error || !schoolData) return;

        // Count actual records from Supabase tables for zero-seed accuracy
        const [{ count: studentCount }, { count: teacherCount }, { count: classCount }] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase.from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId)
        ]);

        const loadedInfo: SchoolInfo = {
          name: schoolData.name || 'Escola Cadastrada',
          razaoSocial: schoolData.razao_social || schoolData.name || '',
          cnpj: schoolData.cnpj || '',
          inep: schoolData.inep || '',
          address: schoolData.address || '',
          municipio: schoolData.municipio || schoolData.city || '',
          estado: schoolData.estado || schoolData.state || '',
          cep: schoolData.cep || '',
          telefone: schoolData.telefone || schoolData.phone || '',
          whatsapp: schoolData.whatsapp || '',
          email: schoolData.email || '',
          site: schoolData.site || '',
          logo: schoolData.logo || '',
          cover: schoolData.cover || '',
          director: schoolData.director || '',
          schoolYear: schoolData.school_year || 'Ano Letivo 2026',
          city: schoolData.municipio || schoolData.city || ''
        };

        const loadedUnit: SchoolUnit = {
          id: schoolData.id,
          name: schoolData.name || 'Unidade Sede',
          inep: schoolData.inep || '',
          address: schoolData.address || '',
          director: schoolData.director || '',
          students: studentCount || 0,
          teachers: teacherCount || 0,
          classes: classCount || 0,
          shifts: 'Matutino / Vespertino',
          phone: schoolData.telefone || schoolData.phone || '',
          email: schoolData.email || '',
          logo: schoolData.logo || '',
          cover: schoolData.cover || '',
          primaryColor: '#0F4C81',
          secondaryColor: '#D4AF37',
          status: 'Homologada',
          city: schoolData.municipio || schoolData.city || ''
        };

        setSchoolInfo(loadedInfo);
        setSchoolUnits([loadedUnit]);
      } catch (err) {
        console.warn('Sync school from Supabase note:', err);
      }
    }

    syncSchoolFromSupabase();
  }, [profile?.school_id, user?.id]);

  // Load real family students when family role is active
  useEffect(() => {
    async function loadFamilyStudents() {
      if (!user) return;

      try {
        const { data, error } = await supabase.rpc('get_my_family_children');
        console.log('[FAMILIA CHILDREN]', { data, error });

        if (error || !data || data.ok !== true || !Array.isArray(data.children)) {
          return;
        }

        if (data.children.length === 0) {
          setFamilyStudents([]);
          return;
        }

        const mappedStudents: StudentData[] = data.children.map((c: any) => ({
          ...mockStudent,
          id: c.student_id,
          name: c.full_name || 'Estudante Sem Nome',
          photoUrl: `https://i.pravatar.cc/150?u=st-${c.student_id}`,
          grade: c.class_name || 'Sem Turma',
          classId: c.class_name || 'Sem Turma',
          attendanceRate: 100,
          status: c.status === 'active' || c.status === 'Ativo' ? 'Ativo' : (c.status || 'Ativo'),
          guardians: [
            {
              id: c.guardian_id || 'g-1',
              name: c.guardian_name || 'Responsável',
              relationship: c.relationship || 'Responsável',
              phone: '',
              email: '',
              cpf: 'Informado',
              hasAccess: true,
              isPrincipal: true
            }
          ],
          occurrences: [],
          aiAlerts: [],
          performance: []
        }));

        setFamilyStudents(mappedStudents);
        if (mappedStudents.length > 0) {
          setStudent(mappedStudents[0]);
        }
      } catch (err) {
        console.error('Error loading family children via RPC:', err);
      }
    }

    loadFamilyStudents();
  }, [user, profile]);

  // CLASSIUMADMIN MASTER GLOBAL STATE
  const [activeAdminMasterTab, setActiveAdminMasterTab] = useState<AdminMasterTab>('dashboard');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);
  const [adminPermissions, setAdminPermissions] = useState<AdminPermission[]>(INITIAL_ADMIN_PERMISSIONS);
  const [systemModules, setSystemModules] = useState<SystemModule[]>(INITIAL_SYSTEM_MODULES);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>(INITIAL_SYSTEM_SETTINGS);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>(INITIAL_SYSTEM_LOGS);
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>(INITIAL_SYSTEM_NOTIFICATIONS);
  const [systemVersions, setSystemVersions] = useState<SystemVersion[]>(INITIAL_SYSTEM_VERSIONS);
  const [systemUpdates, setSystemUpdates] = useState<SystemUpdate[]>(INITIAL_SYSTEM_UPDATES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>(INITIAL_FEATURE_FLAGS);
  const [impersonation, setImpersonation] = useState<ImpersonationState>({
    isImpersonating: false,
    originalAdminName: 'Engenheiro Master Classium'
  });

  // Marketplace Manager Global States & Methods (Durable Local + Supabase Sync)
  const [professionals, setProfessionals] = useState<Professional[]>(() => 
    PartnerPersistenceService.loadProfessionals(initialProfessionalsList)
  );
  const [partnerAds, setPartnerAds] = useState<PartnerAd[]>([]);
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>(() => 
    PartnerPersistenceService.loadServiceProviders(initialGlobalServiceProvidersList)
  );
  const [currentPartner, setCurrentPartner] = useState<PartnerAd | null>(() => 
    PartnerPersistenceService.loadCurrentPartnerSession()
  );

  // Sync with Supabase on mount if remote records exist
  useEffect(() => {
    PartnerService.listPartners()
      .then(canonicalList => {
        if (Array.isArray(canonicalList) && canonicalList.length > 0) {
          const mapped = canonicalList.map(mapCanonicalPartnerToPartnerAd);
          setPartnerAds(mapped);
        } else {
          setPartnerAds([]);
        }
      })
      .catch(err => {
        console.warn("[PlatformContext] Falha ao carregar parceiros canônicos:", err);
        setPartnerAds([]);
      });

    PartnerPersistenceService.fetchRemoteProfessionals().then(remoteProfs => {
      if (remoteProfs && remoteProfs.length > 0) {
        setProfessionals(remoteProfs);
        PartnerPersistenceService.saveProfessionals(remoteProfs);
      }
    });

    // Supabase Realtime Subscription for professionals table
    const channelProfs = supabase
      .channel('professionals_realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'professionals' }, () => {
        PartnerPersistenceService.fetchRemoteProfessionals().then(remoteProfs => {
          if (remoteProfs) {
            setProfessionals(remoteProfs);
            PartnerPersistenceService.saveProfessionals(remoteProfs);
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelProfs);
    };
  }, []);

  const loginPartner = (loginDoc: string, pass: string) => {
    const rawDoc = String(loginDoc || '');
    const cleanDoc = rawDoc.replace(/\D/g, '').toLowerCase().trim();
    const cleanPass = (pass || '').trim();

    let partner = partnerAds.find(ad => {
      const pCpf = (ad.cpfCnpj || '').replace(/\D/g, '').toLowerCase();
      const pEmail = (ad.email || '').toLowerCase().trim();
      const pPhone = (ad.whatsapp || '').replace(/\D/g, '');
      return (cleanDoc && pCpf === cleanDoc) || (pEmail && pEmail === rawDoc.toLowerCase().trim()) || (cleanDoc && pPhone === cleanDoc) || ad.id === rawDoc;
    });

    if (!partner && currentPartner) {
      const pCpf = (currentPartner.cpfCnpj || '').replace(/\D/g, '').toLowerCase();
      const pEmail = (currentPartner.email || '').toLowerCase().trim();
      const pPhone = (currentPartner.whatsapp || '').replace(/\D/g, '');
      if ((cleanDoc && pCpf === cleanDoc) || (pEmail && pEmail === rawDoc.toLowerCase().trim()) || (cleanDoc && pPhone === cleanDoc) || currentPartner.id === rawDoc) {
        partner = currentPartner;
      }
    }

    if (!partner) {
      addAuditLog('FAILED_PARTNER_LOGIN', 'Portal do Parceiro', `Login tentado: ${loginDoc}`, 'Inexistente');
      return { success: false, error: 'CPF, CNPJ ou E-mail não encontrado no cadastro de parceiros.' };
    }

    if (partner.isBlocked) {
      addAuditLog('BLOCKED_PARTNER_LOGIN_ATTEMPT', 'Portal do Parceiro', `Parceiro: ${partner.name}`, '403 — Acesso Negado (Conta Bloqueada)');
      return { success: false, error: '403 — Acesso Negado: Sua conta de parceiro está suspensa ou bloqueada pelo Administrador.' };
    }

    const expectedPass = partner.passwordHash || (partner.cpfCnpj || '').replace(/\D/g, '') || partner.whatsapp;
    const isPassMatch = cleanPass === expectedPass || cleanPass === (partner.cpfCnpj || '') || cleanPass === (partner.cpfCnpj || '').replace(/\D/g, '');

    if (!isPassMatch) {
      addAuditLog('FAILED_PARTNER_LOGIN', 'Portal do Parceiro', `Parceiro: ${partner.name}`, 'Senha Incorreta');
      return { success: false, error: 'Senha incorreta. A senha inicial é o próprio CPF/CNPJ informado no cadastro.' };
    }

    // First access is only true if explicitly marked or if password is still raw initial CPF/CNPJ and not explicitly flagged as done
    const isFirstAccess = partner.isFirstAccess === true || (partner.isFirstAccess !== false && (!partner.passwordHash || partner.passwordHash === (partner.cpfCnpj || '').replace(/\D/g, '')));

    if (isFirstAccess) {
      addAuditLog('FIRST_ACCESS_PARTNER', 'Portal do Parceiro', `Parceiro: ${partner.name}`, 'Redirecionando troca obrigatória de senha');
      return { success: true, isFirstAccess: true, partner };
    }

    const updatedPartner = {
      ...partner,
      isFirstAccess: false,
      lastLogin: new Date().toISOString()
    };
    setCurrentPartner(updatedPartner);
    PartnerPersistenceService.saveCurrentPartnerSession(updatedPartner);

    setPartnerAds(prev => {
      const exists = prev.some(p => p.id === partner.id);
      return exists ? prev.map(p => p.id === partner.id ? updatedPartner : p) : [...prev, updatedPartner];
    });

    addAuditLog('PARTNER_LOGIN_SUCCESS', 'Portal do Parceiro', `Parceiro: ${partner.name}`, 'Sessão RBAC Iniciada');
    return { success: true, isFirstAccess: false, partner: updatedPartner };
  };

  const changePartnerPassword = (partnerId: string, newPass: string) => {
    let partner = partnerAds.find(p => p.id === partnerId);
    if (!partner && currentPartner?.id === partnerId) {
      partner = currentPartner;
    }
    if (!partner) return { success: false, error: 'Parceiro não localizado.' };

    const updated: PartnerAd = {
      ...partner,
      passwordHash: newPass,
      isFirstAccess: false,
      lastLogin: new Date().toISOString()
    };

    setPartnerAds(prev => {
      const exists = prev.some(p => p.id === partnerId);
      return exists 
        ? prev.map(p => p.id === partnerId ? updated : p) 
        : [...prev, updated];
    });

    // Synchronize session immediately so dashboard access is ready
    setCurrentPartner(updated);
    PartnerPersistenceService.saveCurrentPartnerSession(updated);

    addAuditLog('CHANGE_PARTNER_PASSWORD', 'Portal do Parceiro', `Parceiro: ${partner.name}`, 'Senha alterada com sucesso');
    return { success: true, partner: updated };
  };

  const requestPasswordRecovery = (loginDoc: string, channel: 'email' | 'whatsapp') => {
    const rawDoc = String(loginDoc || '');
    const cleanDoc = rawDoc.replace(/\D/g, '').toLowerCase().trim();
    const partner = partnerAds.find(ad => {
      const pCpf = (ad.cpfCnpj || '').replace(/\D/g, '').toLowerCase();
      const pEmail = (ad.email || '').toLowerCase().trim();
      return (cleanDoc && pCpf === cleanDoc) || (pEmail && pEmail === rawDoc.toLowerCase().trim());
    });

    if (!partner) {
      return { success: false, error: 'Nenhum parceiro localizado com o documento/e-mail informado.' };
    }

    const code = '849201';
    const target = channel === 'email' ? (partner.email || 'contato@parceiro.com') : (partner.whatsapp || '(11) 99999-9999');

    addAuditLog('RECOVERY_CODE_SENT', 'Portal do Parceiro', `Parceiro: ${partner.name}`, `Código enviado via ${channel.toUpperCase()}`);
    return { success: true, code, target };
  };

  const resetPasswordWithCode = (loginDoc: string, code: string, newPass: string) => {
    if (code !== '849201') {
      return { success: false, error: 'Código de verificação inválido ou expirado.' };
    }

    const rawDoc = String(loginDoc || '');
    const cleanDoc = rawDoc.replace(/\D/g, '').toLowerCase().trim();
    const partner = partnerAds.find(ad => {
      const pCpf = (ad.cpfCnpj || '').replace(/\D/g, '').toLowerCase();
      const pEmail = (ad.email || '').toLowerCase().trim();
      return (cleanDoc && pCpf === cleanDoc) || (pEmail && pEmail === rawDoc.toLowerCase().trim());
    });

    if (!partner) return { success: false, error: 'Parceiro não encontrado.' };

    return changePartnerPassword(partner.id, newPass);
  };

  const logoutPartner = () => {
    if (currentPartner) {
      addAuditLog('PARTNER_LOGOUT', 'Portal do Parceiro', `Parceiro: ${currentPartner.name}`, 'Sessão encerrada');
    }
    setCurrentPartner(null);
    PartnerPersistenceService.saveCurrentPartnerSession(null);
  };

  const toggleBlockPartner = (partnerId: string) => {
    setPartnerAds(prev => {
      const updatedList = prev.map(p => {
        if (p.id === partnerId) {
          const nextState = !p.isBlocked;
          addAuditLog('TOGGLE_BLOCK_PARTNER', 'ClassiumAdmin', `Parceiro: ${p.name}`, nextState ? 'Bloqueado (403)' : 'Desbloqueado');
          if (currentPartner?.id === partnerId && nextState) {
            setCurrentPartner(null);
            PartnerPersistenceService.saveCurrentPartnerSession(null);
          }
          return { ...p, isBlocked: nextState };
        }
        return p;
      });
      return updatedList;
    });
  };

  const resetPartnerPasswordToDefault = (partnerId: string) => {
    setPartnerAds(prev => {
      const updatedList = prev.map(p => {
        if (p.id === partnerId) {
          const defaultPass = p.cpfCnpj || p.whatsapp || '12.345.678/0001-90';
          addAuditLog('RESET_PARTNER_PASS', 'ClassiumAdmin', `Parceiro: ${p.name}`, 'Senha resetada para CPF/CNPJ inicial');
          return {
            ...p,
            passwordHash: defaultPass,
            isFirstAccess: true
          };
        }
        return p;
      });
      return updatedList;
    });
  };

  const changePartnerPlan = (partnerId: string, newPlan: string) => {
    setPartnerAds(prev => {
      const updatedList = prev.map(p => {
        if (p.id === partnerId) {
          addAuditLog('CHANGE_PARTNER_PLAN', 'ClassiumAdmin', `Parceiro: ${p.name}`, `Plano alterado para ${newPlan}`);
          return { ...p, plan: newPlan, subscriptionStatus: 'Ativa' };
        }
        return p;
      });
      return updatedList;
    });
  };

  const addProfessional = (prof: Omit<Professional, 'id' | 'views' | 'contacts'>) => {
    const newProf: Professional = {
      ...prof,
      id: `prof-${Date.now()}`,
      views: 0,
      contacts: 0
    };
    setProfessionals(prev => {
      const updated = [...prev, newProf];
      PartnerPersistenceService.saveProfessionals(updated);
      return updated;
    });
    addAuditLog('ADD_PROFESSIONAL', 'Marketplace', '', `Profissional cadastrado: ${prof.name}`);
  };

  const updateProfessional = (prof: Professional) => {
    setProfessionals(prev => {
      const updated = prev.map(p => p.id === prof.id ? prof : p);
      PartnerPersistenceService.saveProfessionals(updated);
      return updated;
    });
    addAuditLog('UPDATE_PROFESSIONAL', 'Marketplace', '', `Profissional atualizado: ${prof.name}`);
  };

  const deleteProfessional = (id: string) => {
    setProfessionals(prev => {
      const target = prev.find(p => p.id === id);
      if (target) {
        addAuditLog('DELETE_PROFESSIONAL', 'Marketplace', `Profissional: ${target.name}`, 'Excluído');
      }
      const updated = prev.filter(p => p.id !== id);
      PartnerPersistenceService.saveProfessionals(updated);
      return updated;
    });
  };

  const addPartnerAd = (ad: Omit<PartnerAd, 'id' | 'views' | 'clicks' | 'leadsGenerated'> | PartnerAd) => {
    const partnerAdItem: PartnerAd = {
      views: 0,
      clicks: 0,
      leadsGenerated: 0,
      ...ad,
      // Preserve canonical PostgreSQL UUID; never generate parallel ad IDs
      id: (ad as any).id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `partner-${Date.now()}`)
    };
    setPartnerAds(prev => {
      const exists = prev.some(p => p.id === partnerAdItem.id);
      return exists ? prev.map(p => p.id === partnerAdItem.id ? partnerAdItem : p) : [...prev, partnerAdItem];
    });
    if ((ad as any).id) {
      setCurrentPartner(partnerAdItem);
    }
    addAuditLog('ADD_ADVERTISER', 'Marketplace', '', `Anunciante sincronizado no estado: ${ad.name}`);
  };

  const updatePartnerAd = (ad: PartnerAd) => {
    setPartnerAds(prev => prev.map(a => a.id === ad.id ? ad : a));
    if (currentPartner?.id === ad.id) {
      setCurrentPartner(ad);
    }
    addAuditLog('UPDATE_ADVERTISER', 'Marketplace', '', `Anunciante atualizado no estado: ${ad.name}`);
  };

  const deletePartnerAd = (id: string) => {
    setPartnerAds(prev => {
      const target = prev.find(a => a.id === id);
      if (target) {
        addAuditLog('DELETE_ADVERTISER', 'Marketplace', `Anunciante: ${target.name}`, 'Excluído do estado');
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const addServiceProvider = (provider: Omit<ServiceProvider, 'id' | 'views' | 'clicks' | 'leadsGenerated' | 'rating' | 'reviewCount'>) => {
    const newProvider: ServiceProvider = {
      ...provider,
      id: `prov-${Date.now()}`,
      views: 0,
      clicks: 0,
      leadsGenerated: 0,
      rating: 5.0,
      reviewCount: 1
    };
    setServiceProviders(prev => {
      const updated = [...prev, newProvider];
      PartnerPersistenceService.saveServiceProviders(updated);
      return updated;
    });
    addAuditLog('ADD_PROVIDER', 'Marketplace', '', `Prestador de Serviço cadastrado: ${provider.name}`);
  };

  const updateServiceProvider = (provider: ServiceProvider) => {
    setServiceProviders(prev => prev.map(p => p.id === provider.id ? provider : p));
    addAuditLog('UPDATE_PROVIDER', 'Marketplace', '', `Prestador de Serviço atualizado: ${provider.name}`);
  };

  const deleteServiceProvider = (id: string) => {
    setServiceProviders(prev => {
      const target = prev.find(p => p.id === id);
      if (target) {
        addAuditLog('DELETE_PROVIDER', 'Marketplace', `Prestador: ${target.name}`, 'Excluído');
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const addAuditLog = (action: string, moduleName: string, detailsBefore?: string, detailsAfter?: string) => {
    const now = new Date();
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      userId: currentUser?.email || 'adm-001',
      userName: currentUser?.name || 'Admin Master',
      userRole: role || '',
      action,
      module: moduleName,
      timestamp: `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      ip: '189.120.45.12',
      browser: 'Chrome (Cloud Run Cloud)',
      device: 'Workstation Admin',
      stateBefore: detailsBefore,
      stateAfter: detailsAfter
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const startImpersonation = (user: { id: string; name: string; email: string; role: string; schoolName?: string }) => {
    setImpersonation({
      isImpersonating: true,
      originalAdminName: currentUser?.name || 'Engenheiro Master Classium',
      impersonatedUser: user
    });
    addAuditLog('IMPERSONATE_USER_START', 'Segurança & Impersonação', 'Nenhum impersonamento ativo', `Sessão assumida: ${user.name} (${user.role}) - ${user.schoolName || 'Global'}`);
  };

  const stopImpersonation = () => {
    const previous = impersonation.impersonatedUser?.name;
    setImpersonation({
      isImpersonating: false,
      originalAdminName: currentUser?.name || 'Engenheiro Master Classium'
    });
    addAuditLog('IMPERSONATE_USER_STOP', 'Segurança & Impersonação', `Impersonando ${previous}`, 'Retornado para ClassiumAdmin Master');
  };

  const toggleFeatureFlag = (flagKey: string) => {
    setFeatureFlags(prev => prev.map(f => {
      if (f.key === flagKey) {
        const nextState = !f.enabled;
        addAuditLog('TOGGLE_FEATURE_FLAG', 'Configurações de IA & Módulos', `Flag ${flagKey}: ${f.enabled}`, `Flag ${flagKey}: ${nextState}`);
        return { ...f, enabled: nextState };
      }
      return f;
    }));
  };

  const updateSystemSetting = (key: string, value: string) => {
    setSystemSettings(prev => prev.map(s => {
      if (s.key === key) {
        addAuditLog('UPDATE_SYSTEM_SETTING', 'Configurações Globais', `${s.key} = ${s.value}`, `${s.key} = ${value}`);
        return { ...s, value, updatedAt: new Date().toISOString().split('T')[0], updatedBy: currentUser?.name || 'Admin Master' };
      }
      return s;
    }));
  };

  // RBAC Permission Matrix & Snapshots State
  const [permissionMatrix, setPermissionMatrix] = useState<RolePermissionMatrix>(DEFAULT_ROLE_PERMISSION_MATRIX);
  const [permissionSnapshots, setPermissionSnapshots] = useState<PermissionSnapshot[]>(INITIAL_PERMISSION_SNAPSHOTS);

  const [premiumEvents, setPremiumEvents] = useState<PremiumCalendarEvent[]>(defaultPremiumCalendarEvents);
  const [legendCategories, setLegendCategories] = useState<LegendCategory[]>(defaultLegendCategories);

  const addPremiumEvent = (event: Omit<PremiumCalendarEvent, 'id'> & { endDate?: string }) => {
    const startDate = event.date;
    const endDate = event.endDate || startDate;
    const newEvents: PremiumCalendarEvent[] = [];

    if (startDate === endDate) {
      newEvents.push({
        ...event,
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      });
    } else {
      const s = new Date(startDate + 'T00:00:00');
      const e = new Date(endDate + 'T00:00:00');
      const baseId = `ev-${Date.now()}`;
      if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) {
        newEvents.push({
          ...event,
          id: `${baseId}-single`
        });
      } else {
        const current = new Date(s);
        let count = 0;
        while (current <= e && count < 60) {
          const dateStr = current.toISOString().split('T')[0];
          newEvents.push({
            ...event,
            date: dateStr,
            id: `${baseId}-${dateStr}`
          });
          current.setDate(current.getDate() + 1);
          count++;
        }
      }
    }

    setPremiumEvents(prev => [...newEvents, ...prev]);

    // Persist in Supabase DB asynchronously
    createCalendarEvent({
      title: event.title,
      description: event.description,
      startDate,
      endDate,
      eventType: event.category,
      color: event.color,
      startTime: event.time,
      location: event.location,
      isAllDay: true,
      targetAudience: 'all'
    }).catch(err => console.error('[addPremiumEvent RPC sync error]:', err));
  };

  const updatePremiumEvent = (event: PremiumCalendarEvent) => {
    setPremiumEvents(prev => prev.map(e => e.id === event.id ? event : e));
  };

  const deletePremiumEvent = (id: string) => {
    setPremiumEvents(prev => prev.filter(e => e.id !== id));
  };

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
  };

  const setRole = (_newRole: UserRole | null) => {
    // Neutralizado na etapa P2.274.17: o PlatformContext não possui mais autoridade para alterar papéis.
    // A autoridade de papel pertence exclusivamente ao Supabase Auth via AuthProvider / useAuth().
  };
  const [familyStudents, setFamilyStudents] = useState<StudentData[]>(initialFamilyStudentsList);

  // Achados & Perdidos State
  const [lostAndFoundItems, setLostAndFoundItems] = useState<LostAndFoundItem[]>(initialLostAndFoundItems);

  // Portaria QR Code State
  const [gateQRCodes, setGateQRCodes] = useState<GateQRCodeToken[]>(initialGateQRCodes);
  const [gateAuditLogs, setGateAuditLogs] = useState<GateAuditLog[]>(initialGateAuditLogs);
  const [gateAlerts, setGateAlerts] = useState<GateAlert[]>([]);

  // Achados & Perdidos Methods
  const addLostAndFoundItem = (item: Omit<LostAndFoundItem, 'id' | 'status'>) => {
    const newItem: LostAndFoundItem = {
      ...item,
      id: `lost-${Date.now()}`,
      status: 'disponivel'
    };
    setLostAndFoundItems(prev => [newItem, ...prev]);

    integrationHub.publishEvent({
      type: 'ItemCreated',
      moduleSource: 'Gestor',
      targetScope: { targetType: 'all', targetName: 'Toda a Comunidade' },
      entity: 'achados_perdidos',
      action: 'Objeto Cadastrado no Gestor',
      title: item.name,
      description: `Item catalogado em ${item.locationFound || 'Pátio Central'}. Sincronizado instantaneamente no Portal da Família.`,
      user: { name: item.registeredBy || 'Inspetor Gestor', role: 'Gestão Escolar', ip: '189.120.44.10' }
    });
  };

  const reserveLostAndFoundItem = (
    itemId: string, 
    studentId: string, 
    studentName: string, 
    grade: string, 
    parentName: string, 
    phone: string
  ) => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-BR');
    const timeStr = today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let targetItemName = 'Objeto Escolar';

    setLostAndFoundItems(prev => prev.map(item => {
      if (item.id === itemId) {
        targetItemName = item.name;
        return {
          ...item,
          status: 'reservado',
          reservedByResponsible: parentName,
          reservedByStudentName: studentName,
          reservedByStudentId: studentId,
          reservedByGrade: grade,
          reservedByPhone: phone,
          reservationDate: dateStr,
          reservationTime: timeStr
        };
      }
      return item;
    }));

    integrationHub.publishEvent({
      type: 'Reserved',
      moduleSource: 'Familia',
      targetScope: { targetType: 'class', targetId: grade, targetName: `Turma ${grade}` },
      entity: 'achados_perdidos',
      action: 'Reserva Solicitada pela Família',
      title: `Reserva: ${targetItemName}`,
      description: `Responsável ${parentName} solicitou a reserva para o aluno ${studentName} (${grade}). Sincronizado na Secretaria do Gestor.`,
      user: { name: parentName, role: 'Responsável Legal', ip: '200.180.22.15' }
    });
  };

  const deliverLostAndFoundItem = (itemId: string, staffName: string, notes?: string) => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-BR');
    const timeStr = today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let targetItemName = 'Objeto Escolar';

    setLostAndFoundItems(prev => prev.map(item => {
      if (item.id === itemId) {
        targetItemName = item.name;
        return {
          ...item,
          status: 'entregue',
          deliveredDate: dateStr,
          deliveredTime: timeStr,
          deliveredByStaff: staffName,
          deliveryNotes: notes || 'Entrega presencial confirmada na secretaria.'
        };
      }
      return item;
    }));

    integrationHub.publishEvent({
      type: 'Delivered',
      moduleSource: 'Gestor',
      targetScope: { targetType: 'all', targetName: 'Secretaria & Família' },
      entity: 'achados_perdidos',
      action: 'Retirada e Entrega Efetuada',
      title: `Entregue: ${targetItemName}`,
      description: `Objeto entregue presencialmente por ${staffName}. Status atualizado para Entregue em tempo real.`,
      user: { name: staffName, role: 'Atendimento Secretaria', ip: '189.120.44.11' }
    });
  };

  const archiveLostAndFoundItem = (itemId: string) => {
    setLostAndFoundItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, status: 'arquivado' };
      }
      return item;
    }));

    integrationHub.publishEvent({
      type: 'ItemDeleted',
      moduleSource: 'Gestor',
      targetScope: { targetType: 'all', targetName: 'Gestão Escolar' },
      entity: 'achados_perdidos',
      action: 'Objeto Arquivado',
      title: 'Item Arquivado no Sistema',
      description: 'Objeto movido para o histórico de arquivados.',
      user: { name: 'Operador Gestor', role: 'Gestão Escolar', ip: '189.120.44.10' }
    });
  };

  // Portaria QR Code Methods
  const createGateQRCode = (data: Omit<GateQRCodeToken, 'id' | 'token' | 'status' | 'createdAt'>) => {
    let generatedToken = '';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      generatedToken = `CLS_SEC_${hex}`;
    } else {
      const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
      generatedToken = `CLS_SEC_${hex}`;
    }
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newToken: GateQRCodeToken = {
      ...data,
      id: `qr-${Date.now()}`,
      token: generatedToken,
      status: 'ativo',
      createdAt: `Hoje às ${timeFormatted}`
    };

    setGateQRCodes(prev => [newToken, ...prev]);

    // Push alert for Gestor and Family for each student involved
    const studentNames = data.students && data.students.length > 0 
      ? data.students.map(s => s.studentName).join(', ')
      : data.studentName;

    const newAlert: GateAlert = {
      id: `alt-${Date.now()}`,
      timestamp: `${now.toLocaleDateString('pt-BR')} ${timeFormatted}`,
      type: 'qr_created',
      title: '🔐 Novo QR Code de Portaria',
      message: `Token ${generatedToken} gerado para retirada de [${studentNames}] por ${data.pickerName}. Validade 24h.`,
      target: 'all',
      studentId: data.studentId,
      read: false
    };
    setGateAlerts(prev => [newAlert, ...prev]);

    return newToken;
  };

  const validateGateQRCode = (
    tokenStr: string, 
    staffName: string, 
    approve: boolean, 
    refusalReason?: string,
    gateLocation: string = 'Portaria Principal'
  ) => {
    const cleaned = tokenStr.trim().toUpperCase();
    const codeObj = gateQRCodes.find(q => q.token.toUpperCase() === cleaned || q.id === cleaned);

    if (!codeObj) {
      return { success: false, message: 'QR Code ou Token não encontrado no sistema.' };
    }

    if (codeObj.status === 'utilizado') {
      return { success: false, message: 'Este QR Code já foi utilizado e encontra-se EXPIRADO.' };
    }

    if (codeObj.status === 'expirado' || codeObj.status === 'negado') {
      return { success: false, message: `Este QR Code está inativo (Status: ${codeObj.status.toUpperCase()}).` };
    }

    const now = new Date();
    const dateIso = now.toISOString().split('T')[0];
    const timestampFormatted = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const studentsInvolved = codeObj.students && codeObj.students.length > 0 
      ? codeObj.students 
      : [{ studentId: codeObj.studentId, studentName: codeObj.studentName, studentGrade: codeObj.studentGrade }];

    const studentNamesFormatted = studentsInvolved.map(s => s.studentName).join(' e ');

    if (approve) {
      // Mark as USED
      setGateQRCodes(prev => prev.map(q => {
        if (q.id === codeObj.id) {
          return {
            ...q,
            status: 'utilizado',
            validatedAt: timestampFormatted,
            validatedByStaff: staffName
          };
        }
        return q;
      }));

      // Add audit log for each student involved to maintain complete searchable indexing
      studentsInvolved.forEach((st, idx) => {
        const newAuditLog: GateAuditLog = {
          id: `log-${Date.now()}-${idx}`,
          tokenId: codeObj.id,
          studentId: st.studentId,
          studentName: st.studentName,
          studentGrade: st.studentGrade,
          responsibleName: codeObj.responsibleName,
          pickerName: codeObj.pickerName,
          pickerCpf: codeObj.pickerCpf,
          pickerRelation: codeObj.pickerRelation,
          timestamp: timestampFormatted,
          date: dateIso,
          status: 'sucesso',
          staffName,
          gateLocation
        };
        setGateAuditLogs(prev => [newAuditLog, ...prev]);
      });

      // Add alert for families/gestor
      const alertItem: GateAlert = {
        id: `alt-${Date.now()}`,
        timestamp: timestampFormatted,
        type: 'qr_used',
        title: '✅ Saída Autorizada na Portaria',
        message: `✅ Saída autorizada. ${studentNamesFormatted} foi retirado(a) por ${codeObj.pickerName}. Data: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Portaria: ${gateLocation}. Validador: ${staffName}`,
        target: 'all',
        studentId: codeObj.studentId,
        read: false
      };
      setGateAlerts(prev => [alertItem, ...prev]);

      return {
        success: true,
        message: `Saída de ${studentNamesFormatted} autorizada com sucesso por ${staffName}. Token EXPIRADO.`,
        codeData: codeObj
      };
    } else {
      // Mark as DENIED
      setGateQRCodes(prev => prev.map(q => {
        if (q.id === codeObj.id) {
          return {
            ...q,
            status: 'negado',
            refusalReason: refusalReason || 'Recusado pela portaria por divergência de dados.',
            validatedAt: timestampFormatted,
            validatedByStaff: staffName
          };
        }
        return q;
      }));

      // Add audit log for each student involved
      studentsInvolved.forEach((st, idx) => {
        const newAuditLog: GateAuditLog = {
          id: `log-${Date.now()}-${idx}`,
          tokenId: codeObj.id,
          studentId: st.studentId,
          studentName: st.studentName,
          studentGrade: st.studentGrade,
          responsibleName: codeObj.responsibleName,
          pickerName: codeObj.pickerName,
          pickerCpf: codeObj.pickerCpf,
          pickerRelation: codeObj.pickerRelation,
          timestamp: timestampFormatted,
          date: dateIso,
          status: 'recusado',
          staffName,
          gateLocation,
          notes: refusalReason
        };
        setGateAuditLogs(prev => [newAuditLog, ...prev]);
      });

      // Add alert
      const alertItem: GateAlert = {
        id: `alt-${Date.now()}`,
        timestamp: timestampFormatted,
        type: 'qr_denied',
        title: '❌ Saída Recusada na Portaria',
        message: `A tentativa de retirada de ${studentNamesFormatted} por ${codeObj.pickerName} foi RECUSADA. Motivo: ${refusalReason || 'Segurança'}. Portaria: ${gateLocation}.`,
        target: 'all',
        studentId: codeObj.studentId,
        read: false
      };
      setGateAlerts(prev => [alertItem, ...prev]);

      return {
        success: false,
        message: `Saída RECUSADA. Motivo: ${refusalReason || 'Divergência de segurança'}.`,
        codeData: codeObj
      };
    }
  };

  const cancelGateQRCode = (tokenStr: string) => {
    setGateQRCodes(prev => prev.map(q => {
      if (q.token === tokenStr || q.id === tokenStr) {
        return { ...q, status: 'expirado' as const };
      }
      return q;
    }));
    addAuditLog('CANCEL_GATE_QR', 'Portaria & Segurança', `Token: ${tokenStr}`, 'Cancelado pelo responsável antes do uso');
  };

  const purgeOldGateAuditLogs = () => {
    // Retain logs from last 30 days (rolling window) as requested by the user
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffIso = thirtyDaysAgo.toISOString().split('T')[0];

    setGateAuditLogs(prev => prev.filter(log => log.date >= cutoffIso));
  };
  const [student, setStudent] = useState<StudentData>(mockStudent);

  const selectFamilyStudent = (studentId: string) => {
    const found = familyStudents.find(s => s.id === studentId);
    if (found) {
      setStudent(found);
    }
  };

  const updateFamilyStudent = (studentId: string, updatedData: Partial<StudentData>) => {
    setFamilyStudents(prev => {
      const updatedList = prev.map(s => {
        if (s.id === studentId) {
          return { ...s, ...updatedData };
        }
        
        // Sincronizacao automatica em tempo real para todos os irmaos/estudantes vinculados se dados compartilhados de responsaveis ou endereco mudarem
        const sharedFields: Partial<StudentData> = {};
        if (updatedData.addressCep !== undefined) sharedFields.addressCep = updatedData.addressCep;
        if (updatedData.addressStreet !== undefined) sharedFields.addressStreet = updatedData.addressStreet;
        if (updatedData.addressNumber !== undefined) sharedFields.addressNumber = updatedData.addressNumber;
        if (updatedData.addressComplement !== undefined) sharedFields.addressComplement = updatedData.addressComplement;
        if (updatedData.addressNeighborhood !== undefined) sharedFields.addressNeighborhood = updatedData.addressNeighborhood;
        if (updatedData.addressCity !== undefined) sharedFields.addressCity = updatedData.addressCity;
        if (updatedData.addressState !== undefined) sharedFields.addressState = updatedData.addressState;
        if (updatedData.addressCountry !== undefined) sharedFields.addressCountry = updatedData.addressCountry;
        if (updatedData.addressReference !== undefined) sharedFields.addressReference = updatedData.addressReference;
        if (updatedData.guardians !== undefined) sharedFields.guardians = updatedData.guardians;
        
        return { ...s, ...sharedFields };
      });
      return updatedList;
    });
  };

  // Keep active student in sync with the array state
  React.useEffect(() => {
    const found = familyStudents.find(s => s.id === student.id);
    if (found) {
      setStudent(found);
    }
  }, [familyStudents, student.id]);



  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => { 
    if (profile) {
      setCurrentUser({ 
        ...profile, 
        organizationId: profile.organization_id,
        name: profile.name || (profile as any).full_name || 'Administrador', 
        email: profile.email || '', 
        role: authRole 
      }); 
    } 
  }, [profile, authRole]);
  const [gestorAccount, setGestorAccount] = useState<any>(null);
  const [loginFlow, setLoginFlow] = useState<'login' | 'reset-temp-password' | 'register-gestor' | 'register-family'>('login');

  useEffect(() => {
    const loadRealTeachers = async () => {
      try {
        const tcData = await teachersService.getAll();
        if (tcData && tcData.length > 0) {
          const mappedTeachers = tcData.map((t: any) => ({
            id: t.id,
            name: t.name || 'Professor',
            photoUrl: t.photo_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
            cpf: t.cpf || '123.456.789-01',
            email: t.email || `${(t.name || 'professor').toLowerCase().replace(/\s+/g, '.')}@educamais.edu`,
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
      } catch (err) {
        console.warn('Error loading real teachers in platform context:', err);
      }
    };
    if (profile) {
      loadRealTeachers();
    }
  }, [profile]);

  const addStaffMember = async (staff: any) => {
    const newStaff: Teacher = {
      ...staff,
      id: `pf-${Date.now()}`,
      matricula: `MAT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      provisionalPassword: true,
      passwordChanged: false,
      status: 'Ativo'
    };
    
    try {
      const payload: any = {
        name: staff.name,
        cpf: staff.cpf || '000.000.000-00',
        email: staff.email || `${(staff.name || 'staff').toLowerCase().replace(/\s+/g, '')}@educamais.edu`,
        status: 'Ativo',
        school_id: profile?.school_id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      };
      await teachersService.create(payload);
      
      const tcData = await teachersService.getAll();
      if (tcData) {
        const mappedTeachers = tcData.map((t: any) => ({
          id: t.id,
          name: t.name || 'Professor',
          photoUrl: t.photo_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
          cpf: t.cpf || '123.456.789-01',
          email: t.email || `${(t.name || 'professor').toLowerCase().replace(/\s+/g, '.')}@educamais.edu`,
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
      } else {
        setTeachers(prev => [...prev, newStaff]);
      }
    } catch (err) {
      console.error('Error adding staff to database:', err);
      setTeachers(prev => [...prev, newStaff]);
    }
  };
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [authorizations, setAuthorizations] = useState<DigitalAuthorization[]>(initialAuthorizations);
  const [schedules, setSchedules] = useState<MeetingSchedule[]>(initialSchedules);
  const [activeFamilyTab, setActiveFamilyTab] = useState<number>(1);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('dashboard');
  const [activeProfessorTab, setActiveProfessorTab] = useState<ProfessorTab>('dashboard');
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [academicLinks, setAcademicLinks] = useState<AcademicLink[]>(initialAcademicLinks);
  const [schoolOccurrences, setSchoolOccurrences] = useState<Occurrence[]>(initialSchoolOccurrences);

  // Smart Horários Real-Time State & Synchronization Engine
  const [smartHorariosAllocations, setSmartHorariosAllocationsState] = useState<GridAllocation[]>(() => {
    try {
      const cached = localStorage.getItem('educa_smart_horarios_allocations');
      return cached ? JSON.parse(cached) : INITIAL_ALLOCATIONS;
    } catch {
      return INITIAL_ALLOCATIONS;
    }
  });

  const [smartHorariosTeachers, setSmartHorariosTeachers] = useState<SmartTeacher[]>(INITIAL_TEACHERS);
  const [smartHorariosClasses] = useState<SmartClass[]>(INITIAL_CLASSES);
  const [smartHorariosSubjects] = useState<SmartSubject[]>(INITIAL_SUBJECTS);
  const [smartHorariosRooms] = useState<SmartRoom[]>(INITIAL_ROOMS);
  const [smartHorariosHours] = useState<TimePeriod[]>(INITIAL_HOURS);
  const [smartHorariosAlerts] = useState<SmartAlert[]>(INITIAL_ALERTS);

  const [activeTeacherId, setActiveTeacherId] = useState<string>('');
  const [smartHorariosNotifications, setSmartHorariosNotifications] = useState<Array<{ id: string; timestamp: string; teacherId: string; message: string; type: string }>>([]);

  const updateSmartHorariosAllocations = (newAllocations: GridAllocation[], notifMsg?: string, targetTeacherId?: string) => {
    setSmartHorariosAllocationsState(newAllocations);
    try {
      localStorage.setItem('educa_smart_horarios_allocations', JSON.stringify(newAllocations));
    } catch (e) {
      console.warn('Cache error:', e);
    }

    if (notifMsg) {
      const newNotif = {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        teacherId: targetTeacherId || 'all',
        message: notifMsg,
        type: 'update'
      };
      setSmartHorariosNotifications(prev => [...prev, newNotif]);
    }
  };

  
  // CLASSIUMTransporte States & Functions
  const [transportVehicles, setTransportVehicles] = useState<TransportVehicle[]>(initialTransportVehicles);
  const [transportStudents, setTransportStudents] = useState<TransportStudent[]>(initialTransportStudents);

  const fetchVehicles = async () => {
    try {
      const res = await fetchOrganizationTransportData();
      if (!res.error) {
        setTransportVehicles((res.vehicles || []) as any);
        setTransportStudents((res.students || []) as any);
      }
    } catch (err) {
      console.warn('[PlatformContext] fetchVehicles warning:', err);
    }
  };

  useEffect(() => {
    fetchVehicles();
    const chan = supabase.channel('transport_changes_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_vehicles' }, () => {
        fetchVehicles();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_students' }, () => {
        fetchVehicles();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchVehicles();
      })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, []);

  const addTransportVehicle = async (vehicleData: Omit<TransportVehicle, 'id' | 'studentsIds'>) => {
    const tempId = `veh-${Date.now()}`;
    const newVehicle: TransportVehicle = {
      ...vehicleData,
      id: tempId,
      studentsIds: []
    };
    setTransportVehicles(prev => [...prev, newVehicle]);

    try {
      await saveTransportVehicle({
        numero: vehicleData.numero,
        tipo: vehicleData.tipo,
        placa: vehicleData.placa,
        capacidade: Number(vehicleData.capacidade),
        rota: vehicleData.rota,
        turno: vehicleData.turno,
        driverName: vehicleData.driverName,
        driverPhone: vehicleData.driverPhone,
        driverCnh: vehicleData.driverCnh,
        monitorName: vehicleData.monitorName,
        monitorPhone: vehicleData.monitorPhone,
        observacoes: vehicleData.observacoes || ''
      });
      fetchVehicles();
    } catch (err) {
      console.warn('[PlatformContext] addTransportVehicle exception:', err);
    }
  };

  const updateTransportVehicle = async (vehicle: TransportVehicle) => {
    setTransportVehicles(prev => prev.map(v => v.id === vehicle.id ? vehicle : v));
    try {
      await saveTransportVehicle({
        id: vehicle.id,
        numero: vehicle.numero,
        tipo: vehicle.tipo,
        placa: vehicle.placa,
        capacidade: Number(vehicle.capacidade),
        rota: vehicle.rota,
        turno: vehicle.turno,
        driverName: vehicle.driverName,
        driverPhone: vehicle.driverPhone,
        driverCnh: vehicle.driverCnh,
        monitorName: vehicle.monitorName,
        monitorPhone: vehicle.monitorPhone,
        observacoes: vehicle.observacoes || ''
      });
      fetchVehicles();
    } catch (err) {
      console.warn('[PlatformContext] updateTransportVehicle exception:', err);
    }
  };

  const deleteTransportVehicle = async (id: string) => {
    setTransportVehicles(prev => prev.filter(v => v.id !== id));
    setTransportStudents(prev => prev.map(s => {
      if (s.vehicleId === id) {
        return {
          ...s,
          status: 'Aguardando Vinculação',
          vehicleId: null,
          boardingStatus: undefined
        };
      }
      return s;
    }));

    try {
      await rpcDeleteTransportVehicle(id);
      fetchVehicles();
    } catch (err) {
      console.warn('[PlatformContext] deleteTransportVehicle exception:', err);
    }
  };

  const linkStudentToVehicle = (studentId: string, vehicleId: string): boolean => {
    const targetVehicle = transportVehicles.find(v => v.id === vehicleId);
    if (!targetVehicle) return false;

    if (targetVehicle.studentsIds.length >= targetVehicle.capacidade) {
      return false; // Full
    }

    setTransportVehicles(prev => prev.map(v => {
      if (v.id === vehicleId) {
        if (!v.studentsIds.includes(studentId)) {
          return { ...v, studentsIds: [...v.studentsIds, studentId] };
        }
      } else if (v.studentsIds.includes(studentId)) {
        return { ...v, studentsIds: v.studentsIds.filter(id => id !== studentId) };
      }
      return v;
    }));

    setTransportStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          status: 'Vinculado',
          vehicleId,
          boardingStatus: 'Aguardando'
        };
      }
      return s;
    }));

    linkStudentToTransport(studentId, vehicleId).catch(err => {
      console.warn('[PlatformContext] linkStudentToTransport background sync:', err);
    });

    return true;
  };

  const unlinkStudentFromVehicle = (studentId: string) => {
    setTransportVehicles(prev => prev.map(v => ({
      ...v,
      studentsIds: v.studentsIds.filter(id => id !== studentId)
    })));

    setTransportStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          status: 'Aguardando Vinculação',
          vehicleId: null,
          boardingStatus: undefined
        };
      }
      return s;
    }));

    unlinkStudentFromTransport(studentId).catch(err => {
      console.warn('[PlatformContext] unlinkStudentFromTransport background sync:', err);
    });
  };

  const updateStudentBoardingStatus = (studentId: string, status: 'Embarcado' | 'Aguardando' | 'Ausente') => {
    setTransportStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, boardingStatus: status };
      }
      return s;
    }));

    rpcUpdateStudentBoardingStatus(studentId, status).catch(err => {
      console.warn('[PlatformContext] updateStudentBoardingStatus background sync:', err);
    });
  };

  const registerStudentTransport = (studentData: Omit<TransportStudent, 'id' | 'status' | 'vehicleId'>) => {
    const newStudent: TransportStudent = {
      ...studentData,
      id: `st-trans-${Date.now()}`,
      status: 'Aguardando Vinculação',
      vehicleId: null
    };
    setTransportStudents(prev => [newStudent, ...prev]);
  };

  // Helper for Month Ordering in 3-Month Retention
  function getMonthIndexNumber(monthName: string): number {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const idx = months.indexOf(monthName);
    return idx >= 0 ? idx + 1 : 1;
  }

  // Central de Alimentação Escolar State
  const ALL_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const initialCurrentDate = new Date();
  const initialMonthName = ALL_MONTHS[initialCurrentDate.getMonth()] || 'Agosto';
  const initialYear = initialCurrentDate.getFullYear() || 2026;
  const [foodActiveMonth, setFoodActiveMonth] = useState<string>(`${initialMonthName} ${initialYear}`);
  const [foodBackupArchive, setFoodBackupArchive] = useState<MonthlyMenuData[]>([]);
  
  const generateInitial12Months = (): MonthlyMenuData[] => {
    return [];
  };

  const [foodMonthlyMenus, setFoodMonthlyMenus] = useState<MonthlyMenuData[]>([]);

  const saveMonthlyMenu = (menuData: MonthlyMenuData) => {
    setFoodMonthlyMenus(prev => {
      const existingIdx = prev.findIndex(m => m.monthName === menuData.monthName && m.year === menuData.year);
      let list = [...prev];
      if (existingIdx >= 0) {
        list[existingIdx] = menuData;
      } else {
        list.push(menuData);
      }
      return list;
    });

    addAnnouncement(
      `Novo Cardápio Escolar (${menuData.monthName}/${menuData.year})`,
      `O cardápio nutricional oficial do mês de ${menuData.monthName}/${menuData.year} foi publicado e está disponível para consulta completa.`,
      `Nutricionista Dra. Ana Paula (CRN-3)`,
      'family'
    );
  };

  const attachOfficialFoodDocument = (doc: OfficialFoodDocument) => {
    setFoodMonthlyMenus(prev => {
      let list = prev.map(m => {
        if (m.monthName === doc.monthName && m.year === doc.year) {
          return {
            ...m,
            document: doc,
            published: true,
            publishedAt: new Date().toISOString().split('T')[0],
            publishedBy: doc.uploadedBy
          };
        }
        return m;
      });

      if (!list.some(m => m.monthName === doc.monthName && m.year === doc.year)) {
        list.push({
          id: `menu-${String(doc.monthName || 'geral').toLowerCase()}-${doc.year || 2026}`,
          monthName: doc.monthName,
          year: doc.year,
          published: true,
          publishedAt: new Date().toISOString().split('T')[0],
          publishedBy: doc.uploadedBy,
          meals: [],
          document: doc
        });
      }

      if (list.length > 3) {
        const sorted = [...list].sort((a, b) => (b.year * 12 + getMonthIndexNumber(b.monthName)) - (a.year * 12 + getMonthIndexNumber(a.monthName)));
        const active3 = sorted.slice(0, 3).reverse();
        const archived = sorted.slice(3);
        setFoodBackupArchive(archPrev => [...archPrev, ...archived]);
        return active3;
      }

      return list;
    });

    addAnnouncement(
      `Novo Documento de Cardápio Oficial (${doc.monthName}/${doc.year})`,
      `Documento oficial de cardápio escolar anexado: ${doc.fileName}. Acesse para visualizar na íntegra sem necessidade de download.`,
      doc.uploadedBy,
      'family'
    );
  };

  // Helper to dynamically calculate IBE index (Índice de Bem-Estar Escolar, from 0 to 100)
  const calculateIBE = (studentData: StudentData): number => {
    // 1. Attendance score (Max 30 points)
    const attendanceScore = (studentData.attendanceRate / 100) * 30;

    // 2. Academic score (Max 30 points)
    const validGrades = studentData.performance.map(p => {
      const gList = [p.b1, p.b2, p.b3, p.b4].filter(g => g !== null) as number[];
      return gList.length > 0 ? gList.reduce((a, b) => a + b, 0) / gList.length : 7.0;
    });
    const avgGrade = validGrades.reduce((a, b) => a + b, 0) / validGrades.length;
    const academicScore = (avgGrade / 10) * 30;

    // 3. Behavior score (Max 40 points)
    let negativePoints = 0;
    studentData.occurrences.forEach(occ => {
      if (occ.type === 'negative') {
        if (occ.severity === 'high') negativePoints += 15;
        else if (occ.severity === 'medium') negativePoints += 8;
        else negativePoints += 4;
      } else if (occ.type === 'health') {
        negativePoints += 1; // minor deduction for nursing events just to reflect active logs
      }
    });
    const behaviorScore = Math.max(0, 40 - negativePoints);

    return Math.round(attendanceScore + academicScore + behaviorScore);
  };

  const addAnnouncement = (title: string, body: string, sender: string, target: 'all' | 'family' | 'professor') => {
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title,
      body,
      date: new Date().toISOString().split('T')[0],
      sender,
      targetAudience: target,
      readBy: []
    };
    setAnnouncements(prev => [newAnn, ...prev]);
  };

  const signAuthorization = (id: string, parentName: string) => {
    setAuthorizations(prev => prev.map(auth => {
      if (auth.id === id) {
        return {
          ...auth,
          signed: true,
          signedBy: parentName,
          signatureDate: new Date().toISOString()
        };
      }
      return auth;
    }));
  };

  const addAuthorization = (title: string, description: string, cost?: string) => {
    const newAuth: DigitalAuthorization = {
      id: `auth-${Date.now()}`,
      title,
      description,
      date: new Date().toLocaleDateString('pt-BR'),
      signed: false,
      cost: cost || 'Gratuito'
    };
    setAuthorizations(prev => [newAuth, ...prev]);
  };

  const requestSchedule = (professional: string, role: string, date: string, time: string, notes?: string) => {
    const newSchedule: MeetingSchedule = {
      id: `sch-${Date.now()}`,
      professional,
      role,
      date,
      time,
      status: 'pending',
      notes
    };
    setSchedules(prev => [...prev, newSchedule]);
  };

  const confirmSchedule = (id: string) => {
    setSchedules(prev => prev.map(sch => {
      if (sch.id === id) {
        return { ...sch, status: 'confirmed' };
      }
      return sch;
    }));
  };

  const addOccurrence = (occurrence: Omit<Occurrence, 'id'>) => {
    const newOcc: Occurrence = {
      ...occurrence,
      id: `occ-${Date.now()}`,
      status: occurrence.status || 'nova'
    };

    // Always update school-wide occurrences
    setSchoolOccurrences(prev => [newOcc, ...prev]);

    // Helper to match student ID/Name
    const isStudentMatch = (studentId: string | undefined, studentName: string | undefined, checkId: string, checkName: string) => {
      if (studentId && checkId === studentId) return true;
      if (studentId === 'st-801a-001' && checkId === 'st-001') return true;
      const sLower = String(studentName || '').toLowerCase().trim();
      const cLower = String(checkName || '').toLowerCase().trim();
      if (sLower && cLower && sLower === cLower) return true;
      if (sLower && cLower && sLower.includes('joão pedro') && cLower.includes('joão pedro')) return true;
      return false;
    };

    // 1. Update familyStudents
    setFamilyStudents(prevList => {
      return prevList.map(s => {
        const isThisStudent = isStudentMatch(occurrence.studentId, occurrence.studentName, s.id, s.name);
        if (isThisStudent) {
          const updatedOccurrences = [newOcc, ...s.occurrences];
          
          // Recalculate AI Alerts
          let updatedAlerts = [...s.aiAlerts];
          const negativeOccs = updatedOccurrences.filter(o => o.type === 'negative');
          
          if (occurrence.type === 'negative' && negativeOccs.length >= 3) {
            if (!updatedAlerts.some(a => a.message.includes('Múltiplas indisciplinas') || a.message.includes('Frequência elevada'))) {
              updatedAlerts.push({
                id: `al-neg-${Date.now()}`,
                type: 'emotional',
                message: 'Alerta Comportamental: Frequência elevada de indisciplina em sala de aula nas últimas semanas. Recomenda-se orientação pedagógica.',
                severity: 'warning',
                date: new Date().toISOString()
              });
            }
          }

          const occTitleLower = String(occurrence.title || '').toLowerCase();
          const occDescLower = String(occurrence.description || '').toLowerCase();
          const containsCriticalWords = ['bullying', 'racismo', 'agressão', 'droga', 'homofobia', 'vandalismo', 'celular'].some(
            word => occTitleLower.includes(word) || occDescLower.includes(word)
          );
          if (containsCriticalWords && !updatedAlerts.some(a => a.message.includes(occurrence.title || 'incidente'))) {
            updatedAlerts.push({
              id: `al-crit-${Date.now()}`,
              type: 'emotional',
              message: `ALERTA CRÍTICO: Registrado incidente grave (${occurrence.title || 'ocorrência'}). Acionando protocolo pedagógico imediato de proteção escolar.`,
              severity: 'critical',
              date: new Date().toISOString()
            });
          }

          const updatedStudent = {
            ...s,
            occurrences: updatedOccurrences,
            aiAlerts: updatedAlerts
          };

          updatedStudent.ibeScore = calculateIBE(updatedStudent);

          // Auto-trigger Convocação Obrigatória document if negative occurrences exceed 20
          if (negativeOccs.length > 20) {
            const documentTitle = `Convocação Obrigatória — ${s.name}`;
            const alreadyHasConvocacao = authorizations.some(auth => String(auth.title || '').toLowerCase().includes('convocação') && String(auth.title || '').includes(s.name));
            if (!alreadyHasConvocacao) {
              setTimeout(() => {
                addAuthorization(
                  documentTitle,
                  `Devido ao número elevado de ocorrências disciplinares registradas no Livro Digital de Conduta do Classium (atualmente ${negativeOccs.length} ocorrências de comportamento negativo), a equipe pedagógica emite esta Convocação Obrigatória para os responsáveis legais comparecerem à sala de coordenação da Unidade de Ensino a fim de definir um plano de metas de melhoria comportamental conjunto. Por favor, assine digitalmente para atestar recebimento.`,
                  'Gratuito'
                );
              }, 300);
            }
          }

          return updatedStudent;
        }
        return s;
      });
    });

    // 2. Also update currently active student view
    setStudent(prev => {
      const isThisStudent = isStudentMatch(occurrence.studentId, occurrence.studentName, prev.id, prev.name);
      const updatedOccurrences = isThisStudent ? [newOcc, ...prev.occurrences] : prev.occurrences;
      
      let updatedAlerts = [...prev.aiAlerts];
      
      if (isThisStudent && occurrence.type === 'negative') {
        const negativeOccs = updatedOccurrences.filter(o => o.type === 'negative');
        if (negativeOccs.length >= 3) {
          if (!updatedAlerts.some(a => a.message.includes('Múltiplas indisciplinas') || a.message.includes('Frequência elevada'))) {
            updatedAlerts.push({
              id: `al-neg-${Date.now()}`,
              type: 'emotional',
              message: 'Alerta Comportamental: Frequência elevada de indisciplina em sala de aula nas últimas semanas. Recomenda-se orientação pedagógica.',
              severity: 'warning',
              date: new Date().toISOString()
            });
          }
        }
        
        const occTitleLower = String(occurrence.title || '').toLowerCase();
        const occDescLower = String(occurrence.description || '').toLowerCase();
        const containsCriticalWords = ['bullying', 'racismo', 'agressão', 'droga', 'homofobia', 'vandalismo', 'celular'].some(
          word => occTitleLower.includes(word) || occDescLower.includes(word)
        );
        if (containsCriticalWords && !updatedAlerts.some(a => a.message.includes(occurrence.title || 'incidente'))) {
          updatedAlerts.push({
            id: `al-crit-${Date.now()}`,
            type: 'emotional',
            message: `ALERTA CRÍTICO: Registrado incidente grave (${occurrence.title || 'ocorrência'}). Acionando protocolo pedagógico imediato de proteção escolar.`,
            severity: 'critical',
            date: new Date().toISOString()
          });
        }
      }

      const tempStudent = {
        ...prev,
        occurrences: updatedOccurrences,
        aiAlerts: updatedAlerts
      };

      tempStudent.ibeScore = calculateIBE(tempStudent);
      return tempStudent;
    });
  };

  const updateOccurrenceStatus = (id: string, status: 'nova' | 'analise' | 'familia' | 'resolvido') => {
    setSchoolOccurrences(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    setStudent(prev => {
      const updatedOccs = prev.occurrences.map(o => o.id === id ? { ...o, status } : o);
      return { ...prev, occurrences: updatedOccs };
    });
  };

  const confirmOccurrenceRead = (id: string, notes?: string) => {
    const timestamp = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    setSchoolOccurrences(prev => prev.map(o => {
      if (o.id === id) {
        return {
          ...o,
          confirmedByFamily: true,
          confirmedAt: timestamp,
          signedByParent: true,
          parentNotes: notes || o.parentNotes || '',
          signatureDate: timestamp,
          status: 'resolvido'
        };
      }
      return o;
    }));

    setStudent(prev => ({
      ...prev,
      occurrences: prev.occurrences.map(o => {
        if (o.id === id) {
          return {
            ...o,
            confirmedByFamily: true,
            confirmedAt: timestamp,
            signedByParent: true,
            parentNotes: notes || o.parentNotes || '',
            signatureDate: timestamp,
            status: 'resolvido'
          };
        }
        return o;
      })
    }));

    setFamilyStudents(prevList => prevList.map(s => ({
      ...s,
      occurrences: s.occurrences.map(o => {
        if (o.id === id) {
          return {
            ...o,
            confirmedByFamily: true,
            confirmedAt: timestamp,
            signedByParent: true,
            parentNotes: notes || o.parentNotes || '',
            signatureDate: timestamp,
            status: 'resolvido'
          };
        }
        return o;
      })
    })));
  };

  const addGateMovementLog = (log: Omit<GateAuditLog, 'id'>) => {
    const newLog: GateAuditLog = {
      ...log,
      id: `gate-mov-${Date.now()}`
    };
    setGateAuditLogs(prev => [newLog, ...prev]);
  };

  const updateGrade = (subject: string, bimester: 'b1' | 'b2' | 'b3' | 'b4', value: number) => {
    setStudent(prev => {
      const updatedPerf = prev.performance.map(p => {
        if (p.subject === subject) {
          // Determine trend
          const oldAvg = (p.b1 + (p.b2 || 0)) / 2;
          const newAvg = (p.b1 + (p.b2 || 0) + value) / 3;
          const trend = newAvg > oldAvg ? 'up' as const : newAvg < oldAvg ? 'down' as const : 'stable' as const;
          
          return {
            ...p,
            [bimester]: value,
            trend
          };
        }
        return p;
      });

      // Launch an alert if math grades dropdown is sharp
      let updatedAlerts = [...prev.aiAlerts];
      if (subject === 'Matemática' && value < 6.0) {
        if (!updatedAlerts.some(a => a.message.includes('baixo rendimento em Matemática'))) {
          updatedAlerts.push({
            id: `al-grade-${Date.now()}`,
            type: 'pedagogical',
            message: 'Risco de Repetência: Baixo rendimento em Matemática. Recomenda-se acionamento da rede de apoio ou reforço escolar.',
            severity: 'warning',
            date: new Date().toISOString()
          });
        }
      }

      const tempStudent = {
        ...prev,
        performance: updatedPerf,
        aiAlerts: updatedAlerts
      };

      tempStudent.ibeScore = calculateIBE(tempStudent);
      return tempStudent;
    });
  };

  return (
    <PlatformContext.Provider value={{
      mode,
      setMode,
      role,
      setRole,
      student,
      setStudent,
      currentFamilyStudent: student,
      announcements,
      addAnnouncement,
      authorizations,
      addAuthorization,
      signAuthorization,
      schedules,
      requestSchedule,
      confirmSchedule,
      addOccurrence,
      confirmOccurrenceRead,
      addGateMovementLog,
      updateGrade,
      calculateIBE,
      activeFamilyTab,
      setActiveFamilyTab,
      activeAdminTab,
      setActiveAdminTab,
      activeProfessorTab,
      setActiveProfessorTab,
      teachers,
      setTeachers,
      academicLinks,
      setAcademicLinks,
      schoolOccurrences,
      updateOccurrenceStatus,
      schoolInfo,
      setSchoolInfo,
      schoolUnits,
      setSchoolUnits,
      premiumEvents,
      setPremiumEvents,
      legendCategories,
      setLegendCategories,
      addPremiumEvent,
      updatePremiumEvent,
      deletePremiumEvent,
      transportVehicles,
      setTransportVehicles,
      transportStudents,
      setTransportStudents,
      addTransportVehicle,
      updateTransportVehicle,
      deleteTransportVehicle,
      linkStudentToVehicle,
      unlinkStudentFromVehicle,
      registerStudentTransport,
      updateStudentBoardingStatus,
      foodMonthlyMenus,
      foodActiveMonth,
      setFoodActiveMonth,
      saveMonthlyMenu,
      attachOfficialFoodDocument,
      foodBackupArchive,
      smartHorariosAllocations,
      setSmartHorariosAllocations: setSmartHorariosAllocationsState,
      smartHorariosTeachers,
      setSmartHorariosTeachers,
      smartHorariosClasses,
      smartHorariosSubjects,
      smartHorariosRooms,
      smartHorariosHours,
      smartHorariosAlerts,
      smartHorariosNotifications,
      activeTeacherId,
      setActiveTeacherId,
      updateSmartHorariosAllocations,
      familyStudents,
      setFamilyStudents,
      selectFamilyStudent,
      updateFamilyStudent,
      currentUser,
      setCurrentUser,
      gestorAccount,
      setGestorAccount,
      addStaffMember,
      loginFlow,
      setLoginFlow,
      lostAndFoundItems,
      addLostAndFoundItem,
      reserveLostAndFoundItem,
      deliverLostAndFoundItem,
      archiveLostAndFoundItem,
      gateQRCodes,
      gateAuditLogs,
      gateAlerts,
      createGateQRCode,
      validateGateQRCode,
      cancelGateQRCode,
      purgeOldGateAuditLogs,
      activeAdminMasterTab,
      setActiveAdminMasterTab,
      adminUsers,
      adminPermissions,
      systemModules,
      systemSettings,
      systemLogs,
      systemNotifications,
      systemVersions,
      systemUpdates,
      auditLogs,
      featureFlags,
      impersonation,
      addAuditLog,
      startImpersonation,
      stopImpersonation,
      toggleFeatureFlag,
      updateSystemSetting,
      permissionMatrix,
      setPermissionMatrix,
      permissionSnapshots,
      setPermissionSnapshots,
      professionals,
      setProfessionals,
      partnerAds,
      setPartnerAds,
      serviceProviders,
      setServiceProviders,
      addProfessional,
      updateProfessional,
      deleteProfessional,
      addPartnerAd,
      updatePartnerAd,
      deletePartnerAd,
      currentPartner,
      setCurrentPartner,
      loginPartner,
      changePartnerPassword,
      requestPasswordRecovery,
      resetPasswordWithCode,
      logoutPartner,
      toggleBlockPartner,
      resetPartnerPasswordToDefault,
      changePartnerPlan,
      addServiceProvider,
      updateServiceProvider,
      deleteServiceProvider
    }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}
