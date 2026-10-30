import { maskCellPhone, maskPlaca } from "../../utils/masks";
import React, { useState, useEffect, useRef } from 'react';
import {  
  Building, Radio, Calendar, Bus, Utensils, Package, Book, 
  BarChart3, Brain, Settings, Sparkles, Upload, MapPin, Plus, Trash2, 
  Download, ArrowRight, CheckCircle, AlertTriangle, AlertCircle, Eye, ShieldCheck, 
  Key, HardDrive, RefreshCw, Pencil, Camera, ZoomIn, ZoomOut, Check, X, Sliders, Image, EyeOff, Layout, Laptop,
  Users, GraduationCap, Clock, Printer, Share2, CalendarDays, FileSpreadsheet, FileText,
  ChevronLeft, ChevronRight, Search, Copy, Phone, Home, Navigation, ChevronDown
} from 'lucide-react';
import {  
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import {  usePlatform, generateAutoCalendarEventsForYear } from '../../context/PlatformContext';
import {  CentralAlimentacaoEscolar } from './CentralAlimentacaoEscolar';
import {  AdminLostFound } from './AdminLostFound';
import {  AdminGateQRCode } from './AdminGateQRCode';
import {  EducaCarreiraEBeneficios } from '../carreira/EducaCarreiraEBeneficios';
import {  CommercialAdminModule } from '../commercial/CommercialAdminModule';
import {  AdminInstituicao } from './AdminInstituicao';
import {  AdminTransporte } from './AdminTransporte';
import {  EducaSharedCalendar } from '../common/EducaSharedCalendar';
import {  SchoolInfo, SchoolUnit } from '../../types';

interface OutrosProps {
  tab: string;
  demoMode: boolean;
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
}

export function AdminOutros({ tab, demoMode, selectedUnit, setSelectedUnit }: OutrosProps) {
  const { 
    schoolInfo, 
    setSchoolInfo, 
    schoolUnits, 
    setSchoolUnits, 
    setRole, 
    setMode,
    transportVehicles,
    setTransportVehicles,
    transportStudents,
    setTransportStudents,
    addTransportVehicle,
    updateTransportVehicle,
    deleteTransportVehicle,
    linkStudentToVehicle,
    unlinkStudentFromVehicle,
    updateStudentBoardingStatus,
    addAnnouncement
  } = usePlatform();

  // CLASSIUMTransporte UI States
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('Todos');
  const [searchVehicleQuery, setSearchVehicleQuery] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [studentSearchStatusFilter, setStudentSearchStatusFilter] = useState<'todos' | 'vinculados' | 'aguardando'>('todos');
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState<boolean>(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleToDeleteId, setVehicleToDeleteId] = useState<string | null>(null);
  const [viewingVehicleId, setViewingVehicleId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [activeReportTab, setActiveReportTab] = useState<'drivers' | 'capacity' | 'unlinked' | 'routes'>('drivers');
  const [selectedVehicleForStudent, setSelectedVehicleForStudent] = useState<Record<string, string>>({});
  const [vehicleForm, setVehicleForm] = useState<{
    numero: string;
    tipo: 'Ônibus' | 'Van' | 'Micro-ônibus';
    driverName: string;
    driverPhone: string;
    driverCnh: string;
    monitorName: string;
    monitorPhone: string;
    placa: string;
    rota: string;
    turno: '1º Turno' | '2º Turno' | '3º Turno' | 'Educação Infantil' | 'EJA';
    capacidade: number;
    observacoes: string;
  }>({
    numero: '',
    tipo: 'Ônibus',
    driverName: '',
    driverPhone: '',
    driverCnh: '',
    monitorName: '',
    monitorPhone: '',
    placa: '',
    rota: '',
    turno: '1º Turno',
    capacidade: 48,
    observacoes: ''
  });

  // References for local computer/mobile file uploads
  const fileInputLogoRef = useRef<HTMLInputElement>(null);
  const fileInputCoverRef = useRef<HTMLInputElement>(null);
  const prevSelectedUnitRef = useRef<string>('');

  // 1. INSTITUICAO PREMIUM STATES
  const [newBranchName, setNewBranchName] = useState('');
  const [editingField, setEditingField] = useState<keyof SchoolInfo | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Auto-sync institution form with currently active unit from "database" (Multiunidades)
  useEffect(() => {
    if (selectedUnit && selectedUnit !== prevSelectedUnitRef.current) {
      prevSelectedUnitRef.current = selectedUnit;
      const activeUnit = schoolUnits.find(u => u.id === selectedUnit);
      if (activeUnit) {
        setSchoolInfo({
          name: activeUnit?.name || 'Unidade Sede',
          razaoSocial: schoolInfo?.razaoSocial || activeUnit?.name || '',
          cnpj: schoolInfo?.cnpj || '',
          inep: activeUnit?.inep || '',
          address: activeUnit?.address || '',
          municipio: schoolInfo?.municipio || activeUnit?.city || '',
          estado: schoolInfo?.estado || '',
          cep: schoolInfo?.cep || '',
          telefone: activeUnit?.phone || schoolInfo?.telefone || '',
          whatsapp: schoolInfo?.whatsapp || '',
          email: activeUnit?.email || schoolInfo?.email || '',
          site: schoolInfo?.site || '',
          logo: activeUnit?.logo || schoolInfo?.logo || '',
          cover: activeUnit?.cover || schoolInfo?.cover || '',
          director: activeUnit?.director || schoolInfo?.director || '',
          schoolYear: schoolInfo?.schoolYear || 'Ano Letivo 2026',
          city: activeUnit?.city || schoolInfo?.city || ''
        });
      }
    }
  }, [selectedUnit, schoolUnits]);

  // Handle Quick and Easy Unit Deletion
  const [unitToDelete, setUnitToDelete] = useState<string | null>(null);

  const handleDeleteUnit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setUnitToDelete(id);
  };

  const confirmDeleteUnit = () => {
    if (unitToDelete) {
      const updated = schoolUnits.filter(u => u.id !== unitToDelete);
      setSchoolUnits(updated);
      if (selectedUnit === unitToDelete && updated.length > 0) {
        setSelectedUnit(updated[0].id);
      }
      setUnitToDelete(null);
    }
  };

  // Brasão/Logo Modal
  const [logoModalOpen, setLogoModalOpen] = useState<boolean>(false);
  const [logoUploadSource, setLogoUploadSource] = useState<'upload' | 'camera' | 'url'>('upload');
  const [logoUrlInput, setLogoUrlInput] = useState<string>('');
  const [logoZoom, setLogoZoom] = useState<number>(1);
  const [logoRotation, setLogoRotation] = useState<number>(0);
  const [logoX, setLogoX] = useState<number>(0);
  const [logoY, setLogoY] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraPhoto, setCameraPhoto] = useState<string | null>(null);
  const [cameraCountdown, setCameraCountdown] = useState<number | null>(null);

  // Capa Modal
  const [coverModalOpen, setCoverModalOpen] = useState<boolean>(false);

  // Nova Unidade Modal
  const [newUnitModalOpen, setNewUnitModalOpen] = useState<boolean>(false);
  const [newUnitForm, setNewUnitForm] = useState<Omit<SchoolUnit, 'id'>>({
    name: '',
    inep: '',
    address: '',
    director: '',
    phone: '',
    email: '',
    logo: 'https://images.unsplash.com/photo-1592066575517-58df903152f2?q=80&w=200&auto=format&fit=crop',
    cover: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop',
    primaryColor: '#0F4C81',
    secondaryColor: '#D4AF37',
    status: 'Homologada',
    city: 'São Paulo',
    students: 0,
    teachers: 0,
    classes: 0,
    shifts: 'Matutino / Vespertino'
  });

  const handleAddBranch = () => {
    if (!newBranchName) return;
    setSchoolUnits([...schoolUnits, {
      id: `branch-${Date.now()}`,
      name: newBranchName,
      inep: '3521' + Math.floor(Math.random() * 9000 + 1000),
      address: 'Nova Unidade Cadastrada',
      director: 'Diretor a definir',
      students: 0,
      teachers: 0,
      classes: 0,
      shifts: 'Matutino / Vespertino',
      phone: '(11) 3456-0000',
      email: 'contato@mariaaparecida.edu.br',
      logo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=200&auto=format&fit=crop',
      cover: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop',
      primaryColor: '#0F4C81',
      secondaryColor: '#D4AF37',
      status: 'Homologada',
      city: 'São Paulo'
    }]);
    setNewBranchName('');
  };

  // 2. COMUNICACAO STATES
  const [commMessage, setCommMessage] = useState('Prezados responsáveis, comunicamos que na próxima sexta-feira teremos reunião pedagógica.');
  const [commTarget, setCommTarget] = useState('7A');
  const [channels, setChannels] = useState({ whatsapp: true, email: true, sms: false, pdf: true });
  const [commSent, setCommSent] = useState(false);

  const handleSendComm = () => {
    setCommSent(true);
    setTimeout(() => setCommSent(false), 3000);
  };

  // 3. PREMIUM CALENDAR / AGENDA STATES & HELPERS
  const { 
    premiumEvents, setPremiumEvents, legendCategories, setLegendCategories,
    addPremiumEvent, updatePremiumEvent, deletePremiumEvent
  } = usePlatform();

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // July 2026 (0-indexed)
  const [activeSubTab, setActiveSubTab] = useState<'annual' | 'monthly'>('monthly');
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editorForm, setEditorForm] = useState({
    title: '',
    category: 'evento_escolar',
    color: 'bg-orange-500',
    description: '',
    time: '08:00',
    location: '',
    date: '2026-02-02',
    endDate: '2026-02-02'
  });
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState<boolean>(false);
  const [printLayout, setPrintLayout] = useState<'annual' | 'monthly'>('monthly');
  const [isEditingHeader, setIsEditingHeader] = useState<boolean>(false);
  const [headerForm, setHeaderForm] = useState({
    logo: schoolInfo?.logo || 'https://images.unsplash.com/photo-1592066575517-58df903152f2?q=80&w=200&auto=format&fit=crop',
    municipio: schoolInfo?.municipio || 'São Paulo',
    secretaria: 'Secretaria Municipal de Educação',
    schoolName: schoolInfo?.name || 'Escola Municipal Professora Maria Aparecida',
    schoolYear: 'Ano Letivo 2026'
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [observations, setObservations] = useState<string>('O calendário letivo de 2026 prevê 200 dias letivos conforme diretrizes do MEC. Reuniões pedagógicas ocorrem às quartas-feiras no contraturno.');
  const [notifyGuardians, setNotifyGuardians] = useState<boolean>(false);
  const [editingLegendCategory, setEditingLegendCategory] = useState<any | null>(null);
  const [legendForm, setLegendForm] = useState({ label: '', color: '' });

  // MANUAL SCHOOL DAYS & PRINTING CONFIGS
  const [manualSchoolDays, setManualSchoolDays] = useState<Record<number, number>>({});
  const [isEditingSchoolDays, setIsEditingSchoolDays] = useState<boolean>(false);
  const [editingSchoolDaysValue, setEditingSchoolDaysValue] = useState<number>(0);

  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printScale, setPrintScale] = useState<number>(100);
  const [printShowLegend, setPrintShowLegend] = useState<boolean>(true);
  const [printShowHeader, setPrintShowHeader] = useState<boolean>(true);
  const [printShowFooter, setPrintShowFooter] = useState<boolean>(true);
  const [previewZoom, setPreviewZoom] = useState<number>(100);

  // Helper to determine if a color class is light or dark
  const isLightColor = (colorClass: string) => {
    if (!colorClass) return false;
    return colorClass.includes('yellow') || 
           colorClass.includes('orange-200') || 
           colorClass.includes('amber-200') || 
           colorClass.includes('white') || 
           colorClass.includes('beige');
  };

  // Helper to calculate automatic school days for a given month
  const getAutoSchoolDaysForMonth = (year: number, monthIdx: number): number => {
    const days = getDaysInMonth(year, monthIdx);
    let count = 0;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, monthIdx, d).getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const dayEvents = premiumEvents.filter(e => e.date === dateStr);
      
      // If it contains a recess, holiday or non-school day event
      const hasNonSchoolEvent = dayEvents.some(e => {
        const cat = e.category;
        return cat === 'recesso_escolar' || 
               cat === 'feriado_nacional' || 
               cat === 'feriado_municipal' || 
               cat === 'ponto_facultativo';
      });

      // Special check: is there a Saturday school day?
      const isSabadoLetivo = dayEvents.some(e => e.category === 'sabado_letivo');

      if (isSabadoLetivo) {
        count++;
      } else if (!isWeekend && !hasNonSchoolEvent) {
        count++;
      }
    }
    return count;
  };

  // Returns overridden school days or automatically calculated ones
  const getSchoolDaysForMonth = (monthIdx: number): number => {
    if (manualSchoolDays[monthIdx] !== undefined) {
      return manualSchoolDays[monthIdx];
    }
    return getAutoSchoolDaysForMonth(selectedYear, monthIdx);
  };

  // Aggregated annual total school days
  const getTotalSchoolDays = (): number => {
    let total = 0;
    for (let m = 0; m < 12; m++) {
      total += getSchoolDaysForMonth(m);
    }
    return total;
  };

  // Smart validation of calendar integrity
  const validateCalendar = () => {
    const issues: string[] = [];
    const schoolDaysTotal = getTotalSchoolDays();

    // 1. Minimum 200 school days (LDB)
    if (schoolDaysTotal < 200) {
      issues.push(`O ano letivo possui apenas ${schoolDaysTotal} dias letivos. O mínimo legal é de 200 dias de efetivo trabalho escolar.`);
    } else if (schoolDaysTotal > 220) {
      issues.push(`O ano letivo possui ${schoolDaysTotal} dias letivos, o que excede consideravelmente a grade recomendada.`);
    }

    // 2. Overlapping events on the same date
    const dateCounts: Record<string, number> = {};
    premiumEvents.forEach(e => {
      dateCounts[e.date] = (dateCounts[e.date] || 0) + 1;
    });
    const overlappingDates = Object.keys(dateCounts).filter(d => dateCounts[d] > 1);
    if (overlappingDates.length > 0) {
      const sample = overlappingDates[0].split('-').reverse().join('/');
      issues.push(`Há ${overlappingDates.length} data(s) com múltiplos eventos sobrepostos (ex: ${sample}).`);
    }

    // 3. Events scheduled on Sundays (non-standard)
    const sundayEvents = premiumEvents.filter(e => {
      const parts = e.date.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.getDay() === 0; // 0 = Sunday
    });
    if (sundayEvents.length > 0) {
      const sample = sundayEvents[0];
      const sampleDate = sample.date.split('-').reverse().join('/');
      issues.push(`Há ${sundayEvents.length} evento(s) agendados em Domingos (ex: "${sample.title}" em ${sampleDate}).`);
    }

    // 4. Recovery tests scheduled during school recesses
    const recoveryInRecess = premiumEvents.filter(e => {
      if (e.category === 'recuperacao') {
        return premiumEvents.some(other => other.date === e.date && other.category === 'recesso_escolar');
      }
      return false;
    });
    if (recoveryInRecess.length > 0) {
      const sampleDate = recoveryInRecess[0].date.split('-').reverse().join('/');
      issues.push(`Existem provas de Recuperação agendadas em período de Recesso Escolar (ex: data ${sampleDate}).`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  };

  // Generate complete Intelligent School Calendar (recess + national holidays)
  const handleGenerateIntelligentCalendar = () => {
    const autoEvents = generateAutoCalendarEventsForYear(selectedYear);
    setPremiumEvents(autoEvents);
    setManualSchoolDays({}); // clear manual overrides to let auto recalculate
    
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActionLogs(prev => [
      { id: `log-${Date.now()}`, text: `Gerou Calendário Inteligente Automático de ${selectedYear}`, time: timeString },
      ...prev.slice(0, 19)
    ]);

    alert(`Classium Inteligente: Calendário Letivo ${selectedYear} gerado com sucesso!\n\nForam pré-preenchidos automaticamente:\n✓ Feriados Nacionais oficiais em Vermelho (01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 20/11, 25/12)\n✓ Recesso Escolar integral de Janeiro em Cinza\n✓ Todos os Sábados e Domingos em Cinza\n✓ Recesso de Julho (3ª e 4ª semana) em Cinza\n✓ Recesso de Outubro (Semana do 12/10) em Cinza\n✓ Recesso de Final de Ano (20/12 a 31/12) em Cinza`);
  };

  // Export to Word (HTML template method for maximum editability)
  const handleExportWord = () => {
    const filename = "Calendario_Escolar_Oficial_2026.doc";
    
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Calendário Escolar Oficial</title>
        <style>
          body { font-family: 'Georgia', serif; font-size: 11pt; color: #333; margin: 1in; }
          h1 { font-family: 'Georgia', serif; font-size: 16pt; color: #000; text-align: center; font-weight: bold; margin-bottom: 5px; }
          h2 { font-family: 'Georgia', serif; font-size: 12pt; color: #444; text-align: center; margin-bottom: 15px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .header-table td { padding: 10px; border: 1px solid #ddd; }
          .observations { background-color: #f5f5f5; border: 1px solid #ccc; padding: 10px; margin-bottom: 20px; font-size: 9pt; }
          .calendar-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .calendar-table th, .calendar-table td { border: 1px solid #999; padding: 6px; text-align: center; font-size: 10pt; }
          .calendar-table th { background-color: #e0e0e0; font-weight: bold; }
          .legend-container { border: 1px solid #999; padding: 10px; margin-top: 20px; }
          .legend-item { display: inline-block; margin-right: 15px; font-size: 9pt; }
          .legend-color { width: 12px; height: 12px; display: inline-block; border: 1px solid #000; vertical-align: middle; margin-right: 5px; }
          .signature-section { margin-top: 50px; width: 100%; }
          .signature-line { border-top: 1px solid #000; width: 80%; margin: 40px auto 5px auto; text-align: center; font-weight: bold; font-size: 10pt; }
          .stamp-box { border: 2px dashed #000; width: 80px; height: 80px; margin: 10px auto; text-align: center; line-height: 80px; font-size: 8pt; font-weight: bold; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 20px;">
          <h2>PREFEITURA DE ${headerForm.municipio.toUpperCase()} - SECRETARIA DE EDUCAÇÃO</h2>
          <h1>${headerForm.schoolName.toUpperCase()}</h1>
          <h3>CALENDÁRIO LETIVO INTEGRADO - ANO DE EXERCÍCIO 2026</h3>
        </div>
        
        <div class="observations">
          <strong>Portaria de Homologação:</strong> Este documento rege o planejamento pedagógico letivo homologado em conformidade com o artigo 23 da Lei de Diretrizes e Bases da Educação Nacional (LDB - nº 9.394/96). Total previsto de 200 dias letivos.
          <br/><br/>
          <strong>Anotações Gerais:</strong> ${observations}
        </div>
    `;

    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const daysInM = getDaysInMonth(selectedYear, mIdx);
      const firstDayOfM = getFirstDayOfMonth(selectedYear, mIdx);
      const schoolDays = getSchoolDaysForMonth(mIdx);

      html += `
        <div style="page-break-inside: avoid; margin-bottom: 25px;">
          <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">${getMonthName(mIdx).toUpperCase()} - ${schoolDays} Dias Letivos</h3>
          <table class="calendar-table">
            <thead>
              <tr>
                <th>D</th><th>S</th><th>T</th><th>Q</th><th>Q</th><th>S</th><th>S</th>
              </tr>
            </thead>
            <tbody>
              <tr>
      `;

      let colCount = 0;
      for (let i = 0; i < firstDayOfM; i++) {
        html += `<td></td>`;
        colCount++;
      }

      for (let dNum = 1; dNum <= daysInM; dNum++) {
        if (colCount === 7) {
          html += `</tr><tr>`;
          colCount = 0;
        }

        const dStr = `${selectedYear}-${String(mIdx + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
        const dEvents = premiumEvents.filter(e => e.date === dStr);
        let cellStyle = "";
        let eventText = "";

        if (dEvents.length > 0) {
          const cat = dEvents[0].category;
          let colorHex = "#ffffff";
          if (cat === 'feriado_nacional') colorHex = "#ef4444";
          else if (cat === 'recesso_escolar') colorHex = "#9ca3af";
          else if (cat === 'conselho_classe') colorHex = "#3b82f6";
          else if (cat === 'inicio_letivo') colorHex = "#10b981";
          else if (cat === 'avaliacoes') colorHex = "#fbbf24";
          else if (cat === 'evento_escolar') colorHex = "#f97316";

          cellStyle = `style="background-color: ${colorHex}; font-weight: bold;"`;
          eventText = `<br/><span style="font-size: 7pt; font-weight: normal;">${dEvents[0].title}</span>`;
        }

        html += `<td ${cellStyle}>${dNum}${eventText}</td>`;
        colCount++;
      }

      while (colCount < 7) {
        html += `<td></td>`;
        colCount++;
      }

      html += `
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    html += `
      <div class="legend-container" style="page-break-inside: avoid;">
        <h4>Legendas e Convenções Adotadas</h4>
    `;
    legendCategories.forEach(cat => {
      let colorHex = "#999999";
      if (cat.id === 'feriado_nacional') colorHex = "#ef4444";
      else if (cat.id === 'recesso_escolar') colorHex = "#9ca3af";
      else if (cat.id === 'conselho_classe') colorHex = "#3b82f6";
      else if (cat.id === 'inicio_letivo') colorHex = "#10b981";
      else if (cat.id === 'avaliacoes') colorHex = "#fbbf24";
      else if (cat.id === 'evento_escolar') colorHex = "#f97316";

      html += `
        <div class="legend-item" style="display: inline-block; margin-right: 15px; margin-bottom: 5px;">
          <span style="background-color: ${colorHex}; border: 1px solid #333; display: inline-block; width: 10px; height: 10px; margin-right: 4px;"></span>
          <span>${cat.label}</span>
        </div>
      `;
    });
    html += `</div>`;

    html += `
      <table class="signature-section" style="page-break-inside: avoid; margin-top: 40px; width: 100%;">
        <tr>
          <td style="width: 50%; text-align: center; border: none; padding: 20px;">
            <div class="signature-line" style="border-top: 1px solid #000; width: 80%; margin: 40px auto 5px auto;">${headerForm.secretaria.toUpperCase()}</div>
            <div style="font-size: 8pt; color: #555;">Parecer de Homologação Final</div>
          </td>
          <td style="width: 50%; text-align: center; border: none; padding: 20px;">
            <div style="border: 2px dashed #999; width: 80px; height: 80px; margin: 10px auto; line-height: 80px; font-size: 8pt; font-weight: bold; color: #666;">CARIMBO</div>
            <div class="signature-line" style="border-top: 1px solid #000; width: 80%; margin: 10px auto 5px auto;">ASSINATURA DIRETOR</div>
            <div style="font-size: 8pt; color: #555;">Direção Geral Escolar</div>
          </td>
        </tr>
      </table>
    `;

    html += `
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export to Excel (CSV compatible format)
  const handleExportExcel = () => {
    const filename = "Calendario_Escolar_Planilha_2026.csv";
    let csv = "CLASSIUM - CALENDÁRIO LETIVO INTEGRADO DE 2026\r\n";
    csv += `Escola:;${headerForm.schoolName}\r\n`;
    csv += `Secretaria:;${headerForm.secretaria}\r\n`;
    csv += `Municipio:;${headerForm.municipio}\r\n\r\n`;
    
    csv += "RESUMO ANUAL DE DIAS LETIVOS\r\n";
    csv += "Mês;Dias Letivos Cadastrados\r\n";
    for (let m = 0; m < 12; m++) {
      csv += `${getMonthName(m)};${getSchoolDaysForMonth(m)}\r\n`;
    }
    csv += `TOTAL DO ANO DE EXERCÍCIO:;${getTotalSchoolDays()} dias\r\n\r\n`;

    csv += "RELAÇÃO DETALHADA DE EVENTOS E CONVENÇÕES\r\n";
    csv += "Data;Mês;Dia;Categoria;Título do Evento;Descrição do Planejamento\r\n";
    
    const sortedEvents = [...premiumEvents].sort((a, b) => a.date.localeCompare(b.date));
    sortedEvents.forEach(e => {
      const parts = e.date.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const mName = getMonthName(d.getMonth());
      const day = d.getDate();
      const catObj = legendCategories.find(c => c.id === e.category);
      const catLabel = catObj ? catObj.label : e.category;
      csv += `${e.date};${mName};${day};${catLabel};"${e.title.replace(/"/g, '""')}";"${(e.description || '').replace(/"/g, '""')}"\r\n`;
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // SMART COLOR PALETTE STATES & LOGIC
  const [selectedColor, setSelectedColor] = useState<string | null>(null); // matches LegendCategory.id
  const [toolMode, setToolMode] = useState<'paint' | 'erase' | 'picker' | 'none'>('none');
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  
  // Undo/Redo & Actions History Stack
  const [historyStack, setHistoryStack] = useState<any[][]>([]);
  const [redoStack, setRedoStack] = useState<any[][]>([]);
  const [actionLogs, setActionLogs] = useState<{ id: string; text: string; time: string }[]>([]);
  
  // Palette settings modal
  const [isPaletteConfigOpen, setIsPaletteConfigOpen] = useState<boolean>(false);
  const [editingPaletteCat, setEditingPaletteCat] = useState<any | null>(null);
  const [paletteCatForm, setPaletteCatForm] = useState({ label: '', color: '', icon: '' });
  const [newPaletteCatForm, setNewPaletteCatForm] = useState({ label: '', color: 'bg-red-600', icon: '' });

  const pushStateToHistory = (currentState: any[], actionText: string) => {
    // Keep a deep/shallow copy snapshot of current events
    setHistoryStack(prev => [...prev, [...currentState]]);
    setRedoStack([]); // Clear redo stack on new action
    
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActionLogs(prev => [
      { id: `log-${Date.now()}`, text: actionText, time: timeString },
      ...prev.slice(0, 19)
    ]);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    
    const previousState = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, [...premiumEvents]]);
    
    setPremiumEvents(previousState);
    
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActionLogs(prev => [
      { id: `log-${Date.now()}`, text: 'Desfez última alteração', time: timeString },
      ...prev.slice(0, 19)
    ]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setHistoryStack(prev => [...prev, [...premiumEvents]]);
    
    setPremiumEvents(nextState);
    
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActionLogs(prev => [
      { id: `log-${Date.now()}`, text: 'Refez última alteração', time: timeString },
      ...prev.slice(0, 19)
    ]);
  };

  const handleDayInteracted = (dateString: string) => {
    if (toolMode === 'none') return;
    
    const dateFormatted = dateString.split('-').reverse().join('/');
    
    if (toolMode === 'paint' && selectedColor) {
      const category = legendCategories.find(c => c.id === selectedColor);
      if (!category) return;
      
      const existing = premiumEvents.find(e => e.date === dateString);
      
      // Prevent redundant history steps if identical
      if (existing && existing.category === category.id && existing.color === category.color) {
        return;
      }
      
      pushStateToHistory(premiumEvents, `Pintou dia ${dateFormatted} com ${category.label}`);
      
      if (existing) {
        const updated = {
          ...existing,
          category: category.id,
          color: category.color,
          title: category.label,
          description: category.label
        };
        updatePremiumEvent(updated);
      } else {
        const newEvent = {
          date: dateString,
          title: category.label,
          category: category.id,
          color: category.color,
          description: category.label,
          time: '08:00',
          location: ''
        };
        addPremiumEvent(newEvent);
      }
    } else if (toolMode === 'erase') {
      const existing = premiumEvents.find(e => e.date === dateString);
      if (!existing) return;
      
      pushStateToHistory(premiumEvents, `Removeu cor do dia ${dateFormatted}`);
      deletePremiumEvent(existing.id);
    } else if (toolMode === 'picker') {
      const existing = premiumEvents.find(e => e.date === dateString);
      if (existing) {
        const category = legendCategories.find(c => c.id === existing.category);
        if (category) {
          setSelectedColor(category.id);
          setToolMode('paint');
          
          const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setActionLogs(prev => [
            { id: `log-${Date.now()}`, text: `Capturou cor "${category.label}" do dia ${dateFormatted}`, time: timeString },
            ...prev.slice(0, 19)
          ]);
        }
      }
    }
  };

  const handleCopyColor = (dateString: string) => {
    const existing = premiumEvents.find(e => e.date === dateString);
    if (existing) {
      setCopiedColor(existing.category);
      
      const category = legendCategories.find(c => c.id === existing.category);
      const categoryLabel = category ? category.label : 'Cor';
      const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setActionLogs(prev => [
        { id: `log-${Date.now()}`, text: `Copiou cor do dia ${dateString.split('-').reverse().join('/')} (${categoryLabel})`, time: timeString },
        ...prev.slice(0, 19)
      ]);
    }
  };

  const handlePasteColor = (dateString: string) => {
    if (!copiedColor) return;
    const category = legendCategories.find(c => c.id === copiedColor);
    if (!category) return;
    
    const dateFormatted = dateString.split('-').reverse().join('/');
    const existing = premiumEvents.find(e => e.date === dateString);
    
    if (existing && existing.category === category.id && existing.color === category.color) {
      return;
    }
    
    pushStateToHistory(premiumEvents, `Colou cor no dia ${dateFormatted} (${category.label})`);
    
    if (existing) {
      const updated = {
        ...existing,
        category: category.id,
        color: category.color,
        title: category.label,
        description: category.label
      };
      updatePremiumEvent(updated);
    } else {
      const newEvent = {
        date: dateString,
        title: category.label,
        category: category.id,
        color: category.color,
        description: category.label,
        time: '08:00',
        location: ''
      };
      addPremiumEvent(newEvent);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process shortcuts if not typing in inputs/textarea
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isTyping) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key.toLowerCase() === 'c') {
          if (hoveredDate) {
            e.preventDefault();
            handleCopyColor(hoveredDate);
          }
        } else if (e.key.toLowerCase() === 'v') {
          if (hoveredDate) {
            e.preventDefault();
            handlePasteColor(hoveredDate);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredDate, premiumEvents, copiedColor, selectedColor, toolMode, legendCategories]);

  // Global mouse up to finish drag painting safety
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Update header form if schoolInfo changes in platform context
  useEffect(() => {
    setHeaderForm(prev => ({
      ...prev,
      schoolName: schoolInfo.name || prev.schoolName,
      logo: schoolInfo.logo || prev.logo,
      municipio: schoolInfo.municipio || prev.municipio
    }));
  }, [schoolInfo]);

  // Utility to generate days in month and find start day
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getMonthName = (monthIdx: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIdx];
  };

  // Automated Holiday importer
  const handleImportHolidays = () => {
    const year = selectedYear;
    const holidays = [
      { date: `${year}-01-01`, title: 'Confraternização Universal', category: 'feriado_nacional', color: 'bg-red-600', description: 'Início do ano civil. Feriado Nacional.' },
      { date: `${year}-02-17`, title: 'Recesso de Carnaval', category: 'recesso_escolar', color: 'bg-neutral-500', description: 'Suspensão de atividades letivas.' },
      { date: `${year}-04-03`, title: 'Sexta-feira Santa', category: 'feriado_nacional', color: 'bg-red-600', description: 'Celebração de Corpus Christi / Sexta-Feira Santa.' },
      { date: `${year}-04-21`, title: 'Dia de Tiradentes', category: 'feriado_nacional', color: 'bg-red-600', description: 'Feriado Nacional.' },
      { date: `${year}-05-01`, title: 'Dia do Trabalho', category: 'feriado_nacional', color: 'bg-red-600', description: 'Feriado Nacional do Trabalhador.' },
      { date: `${year}-06-04`, title: 'Corpus Christi', category: 'feriado_nacional', color: 'bg-red-600', description: 'Ponto facultativo municipal/estadual.' },
      { date: `${year}-09-07`, title: 'Independência do Brasil', category: 'feriado_nacional', color: 'bg-red-600', description: 'Feriado Oficial de Independência do País.' },
      { date: `${year}-10-12`, title: 'Nossa Senhora Aparecida', category: 'feriado_nacional', color: 'bg-red-600', description: 'Feriado Religioso de Nossa Senhora Aparecida.' },
      { date: `${year}-10-15`, title: 'Dia do Professor', category: 'feriado_municipal', color: 'bg-sky-500', description: 'Recesso escolar oficial do magistério.' },
      { date: `${year}-11-02`, title: 'Dia de Finados', category: 'feriado_nacional', color: 'bg-red-600', description: 'Feriado Nacional religioso.' },
      { date: `${year}-11-15`, title: 'Proclamação da República', category: 'feriado_nacional', color: 'bg-red-600', description: 'Proclamação da República em 1889.' },
      { date: `${year}-11-20`, title: 'Dia Nacional da Consciência Negra', category: 'feriado_nacional', color: 'bg-red-600', description: 'Homenagem a Zumbi dos Palmares.' },
      { date: `${year}-12-25`, title: 'Natal', category: 'feriado_nacional', color: 'bg-red-600', description: 'Feriado de Natal.' }
    ];

    let addedCount = 0;
    holidays.forEach(h => {
      const exists = premiumEvents.some(e => e.date === h.date && e.title === h.title);
      if (!exists) {
        addPremiumEvent(h);
        addedCount++;
      }
    });

    alert(`Feriados de ${year} importados com sucesso! Adicionados ${addedCount} novos feriados oficiais ao calendário do Classium.`);
  };

  // 4. TRANSPORTE STATES (GPS SIMULATOR)
  const [busProgress, setBusProgress] = useState(20);
  useEffect(() => {
    const timer = setInterval(() => {
      setBusProgress(prev => (prev >= 100 ? 0 : prev + 10));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const busRouteStops = ['Garagem Central', 'Metrô Paraíso', 'Av. Paulista', 'Rua Augusta', 'Portão da Escola'];
  const getActiveStop = () => {
    const idx = Math.floor((busProgress / 100) * busRouteStops.length);
    return busRouteStops[Math.min(idx, busRouteStops.length - 1)];
  };

  // 5. ALIMENTACAO STATES
  const foodStock = [
    { item: 'Arroz Tipo 1', qty: '150 kg', status: 'normal' },
    { item: 'Leite Integral', qty: '12 L', status: 'low' },
    { item: 'Feijão Carioca', qty: '80 kg', status: 'normal' },
    { item: 'Frango em Cubos', qty: '110 kg', status: 'normal' }
  ];

  const allergiesList = [
    { student: 'João Silva', allergy: 'Glúten & Lactose (Grave)' },
    { student: 'Beatriz Costa', allergy: 'Amendoim & Castanhas' }
  ];

  // 6. PATRIMONIO STATES
  const patrimonioItems = [
    { code: 'PAT-001', name: 'Microscópio Óptico Binocular', room: 'Laboratório de Biologia', status: 'Ativo', warranty: '2028' },
    { code: 'PAT-102', name: 'Projetor Smart BenQ 4K', room: 'Auditório Principal', status: 'Em Manutenção', warranty: '2027' },
    { code: 'PAT-254', name: 'Notebook Dell Latitude Core i7', room: 'Secretaria Executiva', status: 'Ativo', warranty: '2029' }
  ];
  const [selectedPat, setSelectedPat] = useState<string | null>(null);

  // 7. BIBLIOTECA STATES
  const bookLoans = [
    { code: 'LIV-54', title: 'Dom Casmurro', author: 'Machado de Assis', borrower: 'João Silva', dueDate: '2026-07-15', fine: 'R$ 10,00' },
    { code: 'LIV-98', title: 'A Hora da Estrela', author: 'Clarice Lispector', borrower: 'Ana Costa', dueDate: '2026-07-22', fine: 'R$ 0,00' }
  ];

  // 8. BI STATES (RECHARTS DATA)
  const [biFilter, setBiFilter] = useState('2026');
  const chartData = [
    { month: 'Jan', matriculas: 120, faturamento: 110000, ibe: 80 },
    { month: 'Fev', matriculas: 150, faturamento: 125000, ibe: 82 },
    { month: 'Mar', matriculas: 180, faturamento: 142000, ibe: 84 },
    { month: 'Abr', matriculas: 210, faturamento: 154200, ibe: 85 },
    { month: 'Mai', matriculas: 205, faturamento: 151000, ibe: 86 },
    { month: 'Jun', matriculas: 220, faturamento: 158000, ibe: 87 }
  ];

  // 9. AUTOMATION STATES (SE X FACA Y)
  const [automationRules, setAutomationRules] = useState([
    { id: 'r1', trigger: 'Aluno acumular 5 faltas consecutivas', action: 'Enviar WhatsApp para família e criar tarefa para coordenação', active: true },
    { id: 'r2', trigger: 'Nota bimetral abaixo de 5.0 em Matemática', action: 'Disparar convite automático para Rede de Apoio e Reforço', active: true }
  ]);
  const [newTrigger, setNewTrigger] = useState('');
  const [newAction, setNewAction] = useState('');

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrigger || !newAction) return;
    setAutomationRules([...automationRules, {
      id: `r-${Date.now()}`,
      trigger: newTrigger,
      action: newAction,
      active: true
    }]);
    setNewTrigger('');
    setNewAction('');
  };

  // 10. CONFIGURACOES STATES
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [permissions, setPermissions] = useState({
    admin: { viewFin: true, editGrades: true, authUsers: true },
    coordenacao: { viewFin: false, editGrades: true, authUsers: true },
    secretaria: { viewFin: true, editGrades: false, authUsers: false },
    professor: { viewFin: false, editGrades: true, authUsers: false }
  });

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. TAB INSTITUICAO - 100% SUPABASE MULTI-TENANT RPC INTEGRATION */}
      {tab === 'instituicao' && <AdminInstituicao />}

      {/* 2. TAB COMUNICACAO */}
      {tab === 'comunicacao' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#D4AF37]" /> Disparador de Recados Multicanal
            </h3>

            {commSent && (
              <div className="p-3 bg-green-950/30 border border-green-500/20 rounded-xl text-green-400 text-xs font-semibold">
                ✓ Mensagem disparada com sucesso para todos os canais homologados!
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Mensagem Oficial</label>
                <textarea
                  rows={4}
                  value={commMessage}
                  onChange={(e) => setCommMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Segmentação da Escola</label>
                  <select
                    value={commTarget}
                    onChange={(e) => setCommTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-semibold"
                  >
                    <option value="all">Todos os Alunos (Escola Geral)</option>
                    <option value="7A">Apenas 7º Ano A</option>
                    <option value="8B">Apenas 8º Ano B</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Remetente</label>
                  <p className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300">Diretoria Geral (João)</p>
                </div>
              </div>

              {/* Channels checkboxes */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Canais de Disparo Ativos</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-[11px]">
                    <input type="checkbox" checked={channels.whatsapp} onChange={(e) => setChannels({...channels, whatsapp: e.target.checked})} />
                    WhatsApp Direct Sync
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-[11px]">
                    <input type="checkbox" checked={channels.email} onChange={(e) => setChannels({...channels, email: e.target.checked})} />
                    E-mail Corporativo
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-[11px]">
                    <input type="checkbox" checked={channels.sms} onChange={(e) => setChannels({...channels, sms: e.target.checked})} />
                    SMS em Lote
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-[11px]">
                    <input type="checkbox" checked={channels.pdf} onChange={(e) => setChannels({...channels, pdf: e.target.checked})} />
                    Gerar Carta PDF Oficial
                  </label>
                </div>
              </div>

              <button
                onClick={handleSendComm}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider rounded-lg transition-colors"
              >
                Transmitir Comunicado Oficial
              </button>
            </div>
          </div>

          {/* PDF letter preview */}
          <div className="lg:col-span-7 bg-white text-slate-900 p-8 rounded-3xl space-y-6 shadow-xl border border-slate-300">
            <div className="border-b-2 border-slate-800 pb-4 text-center">
              <span className="font-serif text-xl font-bold uppercase tracking-widest text-slate-900 block">CLASSIUM</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500">Documento Oficial de Registro de Comunicação</span>
            </div>

            <div className="space-y-4 text-xs font-serif leading-relaxed">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Ref: Carta Circular 18/2026</span>
                <span>São Paulo, 18 de Março de 2026</span>
              </div>

              <p className="font-bold text-slate-800">Assunto: Comunicado à Comunidade Escolar - {commTarget === 'all' ? 'Institucional Geral' : `Turma ${commTarget}`}</p>
              
              <p className="text-slate-700 whitespace-pre-wrap">{commMessage}</p>

              <div className="pt-8 text-center border-t border-slate-300 w-48 mx-auto space-y-1">
                <span className="font-bold text-xs text-slate-800 block">João Silva</span>
                <span className="text-[9px] text-slate-500 uppercase block">Diretor Pedagógico</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CALENDÁRIO/AGENDA PREMIUM (SUPABASE RPC & REALTIME) */}
      {tab === 'agenda' && (
        <EducaSharedCalendar role="admin" selectedUnit={selectedUnit} />
      )}
      {false && (
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-[#D4AF37] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  Módulo Premium
                </span>
                <h3 className="font-serif text-lg font-bold text-white">Calendário Escolar Oficial</h3>
              </div>
              <p className="text-xs text-slate-400">Totalmente editável, com identidade visual Classium, exportações e padrão de impressão A4.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Year Select */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                <span className="text-slate-500 mr-2 uppercase font-mono tracking-wider font-bold">Ano</span>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent border-none text-white outline-none font-bold"
                >
                  <option value={2025} className="bg-slate-950">2025</option>
                  <option value={2026} className="bg-slate-950">2026</option>
                  <option value={2027} className="bg-slate-950">2027</option>
                </select>
              </div>

              {/* View Switcher */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button 
                  onClick={() => setActiveSubTab('monthly')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activeSubTab === 'monthly' ? 'bg-bordeaux text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mensal Detalhado
                </button>
                <button 
                  onClick={() => setActiveSubTab('annual')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activeSubTab === 'annual' ? 'bg-bordeaux text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Anual Oficial (12 Meses)
                </button>
              </div>

              {/* Action Buttons */}
              <button 
                onClick={handleGenerateIntelligentCalendar}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500/10 to-emerald-500/20 hover:from-emerald-500/20 hover:to-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                title="Gera automaticamente recessos escolares de Janeiro, Julho, Outubro e Dezembro, mais feriados oficiais"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Inicializar Calendário Letivo Inteligente</span>
              </button>

              <button 
                onClick={handleImportHolidays}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500/10 to-amber-500/20 hover:from-amber-500/20 hover:to-amber-500/30 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                title="Sincroniza automaticamente feriados nacionais e do MEC para o ano letivo"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Importar Feriados</span>
              </button>

              <button 
                onClick={() => setIsPrintPreviewOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-[#D4AF37] font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                title="Visualizar para Impressão em padrão A4"
              >
                <Printer className="w-4 h-4" />
                <span>Visualizar p/ Impressão</span>
              </button>
            </div>
          </div>

          {/* Official Administrative Header (Totally Editable Inline) */}
          <div className="bg-gradient-to-br from-slate-900/60 to-slate-950/60 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-bordeaux via-gold to-green-600"></div>
            
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37] font-bold">Identidade Visual do Cabeçalho Escolar</span>
              <button 
                onClick={() => {
                  if (isEditingHeader) {
                    // Save changes to PlatformContext
                    setSchoolInfo(prev => ({
                      ...prev,
                      name: headerForm.schoolName,
                      logo: headerForm.logo,
                      municipio: headerForm.municipio
                    }));
                  }
                  setIsEditingHeader(!isEditingHeader);
                }}
                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg px-3 py-1.5 transition-all"
              >
                {isEditingHeader ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Alterações</span>
                  </>
                ) : (
                  <>
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar Cabeçalho</span>
                  </>
                )}
              </button>
            </div>

            {isEditingHeader ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">URL do Brasão / Logotipo</label>
                  <input 
                    type="text" 
                    value={headerForm.logo}
                    onChange={(e) => setHeaderForm({ ...headerForm, logo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-[#D4AF37] outline-none"
                    placeholder="https://exemplo.com/logo.png"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Nome do Município / Cidade</label>
                  <input 
                    type="text" 
                    value={headerForm.municipio}
                    onChange={(e) => setHeaderForm({ ...headerForm, municipio: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-[#D4AF37] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Secretaria Vinculada</label>
                  <input 
                    type="text" 
                    value={headerForm.secretaria}
                    onChange={(e) => setHeaderForm({ ...headerForm, secretaria: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-[#D4AF37] outline-none"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Nome Oficial da Escola</label>
                  <input 
                    type="text" 
                    value={headerForm.schoolName}
                    onChange={(e) => setHeaderForm({ ...headerForm, schoolName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-[#D4AF37] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Ano de Exercício</label>
                  <input 
                    type="text" 
                    value={headerForm.schoolYear}
                    onChange={(e) => setHeaderForm({ ...headerForm, schoolYear: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-[#D4AF37] outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                <img 
                  src={headerForm.logo} 
                  alt="Logo Escola" 
                  className="w-16 h-16 rounded-xl object-cover border border-gold/30 bg-white p-1 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="text-center sm:text-left space-y-1">
                  <h4 className="font-serif text-lg font-bold text-white leading-tight uppercase">{headerForm.schoolName}</h4>
                  <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-medium">
                    <span className="text-gold font-bold uppercase tracking-wider">{headerForm.secretaria}</span>
                    <span className="text-slate-600">•</span>
                    <span>Prefeitura de {headerForm.municipio}</span>
                    <span className="text-slate-600">•</span>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">{headerForm.schoolYear}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MAIN CALENDAR VISUALS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT / LARGE SIDE: ACTIVE CALENDAR GRID (12 MONTHS OR SINGLE MONTH) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* 🎨 PALETA INTELIGENTE DE CORES BAR */}
              <div id="smart-color-palette" className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950/80 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl select-none">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="space-y-0.5">
                    <h4 className="font-serif text-sm font-bold text-white flex items-center gap-2">
                      <span>🎨</span> Paleta Inteligente de Cores
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">Selecione uma cor para ativar o modo de pintura rápida no calendário.</p>
                  </div>
                  
                  {/* Tool Actions (Eraser, Picker, Config) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Eraser */}
                    <button
                      id="tool-erase"
                      onClick={() => {
                        if (toolMode === 'erase') {
                          setToolMode('none');
                        } else {
                          setToolMode('erase');
                          setSelectedColor(null);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                        toolMode === 'erase'
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 ring-2 ring-rose-500/20 scale-105'
                          : 'bg-slate-950 border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title="Borracha: Clique sobre qualquer dia para remover a cor (🩶 Limpar Cor)"
                    >
                      <span>🩶</span>
                      <span>Limpar Cor</span>
                    </button>

                    {/* Picker (Eyedropper) */}
                    <button
                      id="tool-picker"
                      onClick={() => {
                        if (toolMode === 'picker') {
                          setToolMode('none');
                        } else {
                          setToolMode('picker');
                          setSelectedColor(null);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                        toolMode === 'picker'
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-400 ring-2 ring-sky-500/20 scale-105'
                          : 'bg-slate-950 border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title="Conta-gotas: Capture cor de um dia colorido (🎯 Capturar Cor)"
                    >
                      <span>🎯</span>
                      <span>Capturar Cor</span>
                    </button>

                    {/* Configure */}
                    <button
                      id="btn-edit-palette"
                      onClick={() => setIsPaletteConfigOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-950 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                      title="Configurações da Paleta (⚙ Editar Paleta)"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Editar Paleta</span>
                    </button>

                    {/* Quick Undo/Redo */}
                    <div className="flex items-center bg-slate-950 rounded-xl border border-slate-850 p-0.5">
                      <button
                        onClick={handleUndo}
                        disabled={historyStack.length === 0}
                        className={`p-1.5 rounded-lg transition-all ${
                          historyStack.length > 0
                            ? 'text-slate-300 hover:text-white hover:bg-slate-900'
                            : 'text-slate-600 cursor-not-allowed'
                        }`}
                        title="Desfazer Ação (CTRL + Z)"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        className={`p-1.5 rounded-lg transition-all ${
                          redoStack.length > 0
                            ? 'text-slate-300 hover:text-white hover:bg-slate-900'
                            : 'text-slate-600 cursor-not-allowed'
                        }`}
                        title="Refazer Ação (CTRL + Y)"
                      >
                        <RefreshCw className="w-3.5 h-3.5 transform scale-x-[-1]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 15 Colors Palette Row */}
                <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950/40 rounded-2xl border border-slate-900">
                  <span className="text-[10px] font-bold uppercase text-slate-500 mr-1.5 tracking-wider font-mono">Cores:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { name: 'Vermelho', class: 'bg-red-600', categoryId: 'feriado_nacional', tooltip: 'Feriado Nacional' },
                      { name: 'Azul', class: 'bg-blue-600', categoryId: 'conselho_classe', tooltip: 'Conselho de Classe' },
                      { name: 'Verde', class: 'bg-emerald-500', categoryId: 'inicio_letivo', tooltip: 'Início do Ano Letivo' },
                      { name: 'Amarelo', class: 'bg-yellow-400', categoryId: 'avaliacoes', tooltip: 'Avaliações' },
                      { name: 'Laranja', class: 'bg-orange-500', categoryId: 'evento_escolar', tooltip: 'Evento Escolar' },
                      { name: 'Roxo', class: 'bg-purple-600', categoryId: 'formacao_continuada', tooltip: 'Formação Continuada' },
                      { name: 'Marrom', class: 'bg-amber-800', categoryId: 'atividade_pratica', tooltip: 'Atividade Prática' },
                      { name: 'Preto', class: 'bg-slate-900', categoryId: 'fim_bimestre', tooltip: 'Encerramento de Bimestre' },
                      { name: 'Cinza', class: 'bg-neutral-500', categoryId: 'recesso_escolar', tooltip: 'Recesso Escolar' },
                      { name: 'Rosa', class: 'bg-pink-500', categoryId: 'provas_internas', tooltip: 'Provas Internas' },
                      { name: 'Azul Claro', class: 'bg-sky-500', categoryId: 'atividade_maker', tooltip: 'Atividade Maker' },
                      { name: 'Verde Claro', class: 'bg-teal-500', categoryId: 'projeto_pedagogico', tooltip: 'Projeto Pedagógico' },
                      { name: 'Dourado', class: 'bg-yellow-600', categoryId: 'recuperacao', tooltip: 'Recuperação' },
                      { name: 'Lilás', class: 'bg-purple-400', categoryId: 'reuniao_pais', tooltip: 'Reunião de Pais' },
                      { name: 'Bege', class: 'bg-orange-200', categoryId: 'planejamento_pedagogico', tooltip: 'Planejamento Pedagógico' }
                    ].map((col) => {
                      const category = legendCategories.find(c => c.id === col.categoryId);
                      const label = category ? category.label : col.tooltip;
                      const colorClass = category ? category.color : col.class;
                      const isActive = selectedColor === col.categoryId && toolMode === 'paint';
                      
                      const isLightColor = colorClass.includes('yellow') || colorClass.includes('orange-200') || colorClass.includes('amber-200') || colorClass.includes('white');
                      const checkColor = isLightColor ? 'text-slate-950' : 'text-white';

                      return (
                        <div key={col.categoryId} className="relative group/color">
                          <button
                            onClick={() => {
                              setSelectedColor(col.categoryId);
                              setToolMode('paint');
                            }}
                            className={`w-7 h-7 rounded-lg transition-all duration-200 hover:scale-115 flex items-center justify-center border ${colorClass} ${
                              isActive
                                ? 'ring-2 ring-white border-white scale-110 shadow-lg shadow-white/30'
                                : 'border-slate-800 hover:border-slate-500'
                            }`}
                            style={{ transition: 'all 200ms ease' }}
                          >
                            {isActive && (
                              <Check className={`w-4 h-4 ${checkColor} stroke-[3.5]`} />
                            )}
                          </button>
                          
                          {/* Rich Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover/color:flex flex-col items-center z-40 whitespace-nowrap pointer-events-none">
                            <div className="bg-slate-950 text-white border border-slate-800 text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                              <span>{label}</span>
                            </div>
                            <div className="w-1.5 h-1.5 bg-slate-950 border-r border-b border-slate-800 transform rotate-45 -mt-1"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mode Indicator Banner */}
                {toolMode !== 'none' && (
                  <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800/80 px-4 py-2.5 rounded-2xl text-[11px] text-slate-300 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>
                        Modo Ativo: {toolMode === 'paint' ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                            Pincel de Pintura com <span className={`inline-block w-3 h-3 rounded-full ${legendCategories.find(c => c.id === selectedColor)?.color}`} /> "{legendCategories.find(c => c.id === selectedColor)?.label}"
                          </span>
                        ) : toolMode === 'erase' ? (
                          <span className="text-rose-400 font-bold">Borracha (Clique e arraste para limpar cores)</span>
                        ) : (
                          <span className="text-sky-400 font-bold">Conta-gotas (Clique sobre um dia para selecionar sua cor)</span>
                        )}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        setToolMode('none');
                        setSelectedColor(null);
                      }}
                      className="text-[9px] uppercase font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-800 transition-all"
                    >
                      Desativar
                    </button>
                  </div>
                )}
              </div>
              
              {/* MONTHLY VIEW */}
              {activeSubTab === 'monthly' && (
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-6">
                  {/* Month Selection Bar */}
                  <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                    <button 
                      onClick={() => setSelectedMonth(prev => prev === 0 ? 11 : prev - 1)}
                      className="p-2 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-3">
                      <h4 className="font-serif text-base font-bold text-white uppercase tracking-wider">
                        {getMonthName(selectedMonth)} {selectedYear}
                      </h4>
                      <div 
                        onClick={() => {
                          setEditingSchoolDaysValue(getSchoolDaysForMonth(selectedMonth));
                          setIsEditingSchoolDays(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-full text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
                        title="Clique para editar os dias letivos deste mês"
                      >
                        <span>{getSchoolDaysForMonth(selectedMonth)} Dias Letivos</span>
                        <Pencil className="w-3 h-3 text-emerald-400" />
                      </div>
                    </div>

                    <button 
                      onClick={() => setSelectedMonth(prev => prev === 11 ? 0 : prev + 1)}
                      className="p-2 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {/* Weekdays */}
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                      <div 
                        key={idx} 
                        className={`text-xs font-black uppercase font-mono tracking-wider py-2 rounded-lg ${
                          idx === 0 ? 'text-red-500 bg-red-500/5' : 'text-slate-400 bg-slate-950/20'
                        }`}
                      >
                        {day}
                      </div>
                    ))}

                    {/* Pre-padding empty days */}
                    {Array.from({ length: getFirstDayOfMonth(selectedYear, selectedMonth) }).map((_, i) => (
                      <div key={'empty-' + i} className="p-1 min-h-[5.5rem] bg-slate-950/10 border border-slate-950/30 rounded-2xl opacity-20"></div>
                    ))}

                    {/* Active Days */}
                    {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const dayEvents = premiumEvents.filter(e => e.date === dateString);
                      const isToday = new Date().toISOString().split('T')[0] === dateString;
                      const hasEvent = dayEvents.length > 0;
                      const mainColor = hasEvent ? dayEvents[0].color : '';

                      return (
                        <div 
                          key={dayNum} 
                          onClick={(e) => {
                            if (toolMode !== 'none') {
                              e.stopPropagation();
                              handleDayInteracted(dateString);
                            } else {
                              setEditorForm({
                                title: '',
                                category: 'evento_escolar',
                                color: 'bg-orange-500',
                                description: '',
                                time: '08:00',
                                location: '',
                                date: dateString
                              });
                              setEditingEvent(null);
                              setIsEditorOpen(true);
                            }
                          }}
                          onMouseDown={(e) => {
                            if (toolMode !== 'none') {
                              e.preventDefault();
                              setIsMouseDown(true);
                              handleDayInteracted(dateString);
                            }
                          }}
                          onMouseEnter={() => {
                            setHoveredDate(dateString);
                            if (isMouseDown && toolMode !== 'none') {
                              handleDayInteracted(dateString);
                            }
                          }}
                          onMouseLeave={() => {
                            if (hoveredDate === dateString) {
                              setHoveredDate(null);
                            }
                          }}
                          style={{ 
                            cursor: toolMode === 'paint' ? 'cell' : toolMode === 'erase' ? 'not-allowed' : toolMode === 'picker' ? 'crosshair' : 'pointer' 
                          }}
                          className={`min-h-[5.5rem] border p-2 rounded-2xl flex flex-col justify-between items-start transition-all duration-200 select-none group text-left relative overflow-hidden ${
                            isToday 
                              ? 'border-[#D4AF37] bg-slate-950/80 shadow-md ring-1 ring-gold/20' 
                              : hasEvent 
                                ? `border-slate-800 ${mainColor}/10 hover:${mainColor}/20 hover:border-slate-700 shadow-sm shadow-black/5` 
                                : 'border-slate-850 hover:bg-slate-950/40 hover:border-slate-800'
                          } ${hoveredDate === dateString && toolMode !== 'none' ? 'ring-2 ring-white/20 scale-[0.99]' : ''}`}
                        >
                          <div className="w-full flex justify-between items-start">
                            <span className={`text-xs font-mono font-bold leading-none px-2 py-1 rounded-md ${
                              isToday 
                                ? 'bg-[#D4AF37] text-slate-950 shadow-sm' 
                                : new Date(dateString).getDay() === 0 
                                  ? 'text-red-500 bg-red-500/10' 
                                  : 'text-slate-400 bg-slate-950/40'
                            }`}>
                              {dayNum}
                            </span>
                            
                            {/* Little brush icon indicating clipboard hovered */}
                            {hoveredDate === dateString && toolMode === 'paint' && (
                              <span className="text-[10px] opacity-75 text-emerald-400 animate-pulse">🖌</span>
                            )}
                            {hoveredDate === dateString && toolMode === 'erase' && (
                              <span className="text-[10px] opacity-75 text-red-500 animate-pulse">🧹</span>
                            )}
                          </div>
                          
                          {/* Event Markers list */}
                          <div className="w-full space-y-1 mt-1.5 overflow-hidden">
                            {dayEvents.slice(0, 2).map((ev) => (
                              <div 
                                key={ev.id}
                                onClick={(e) => {
                                  if (toolMode !== 'none') {
                                    e.stopPropagation();
                                    handleDayInteracted(dateString);
                                  } else {
                                    e.stopPropagation();
                                    setEditingEvent(ev);
                                    setEditorForm({
                                      title: ev.title,
                                      category: ev.category,
                                      color: ev.color,
                                      description: ev.description || '',
                                      time: ev.time || '08:00',
                                      location: ev.location || '',
                                      date: ev.date
                                    });
                                    setIsEditorOpen(true);
                                  }
                                }}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold truncate text-white border border-white/5 shadow-sm block ${ev.color} hover:brightness-110`}
                                title={ev.title}
                              >
                                {ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <span className="text-[8px] text-amber-400 font-mono font-black pl-1 block">
                                +{dayEvents.length - 2} eventos
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Observations Section inside Month view */}
                  <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37] font-bold flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Notas e Observações do Mês
                      </span>
                      <span className="text-[8px] text-slate-500 italic font-mono">Totalmente Editável</span>
                    </div>
                    <textarea 
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="w-full bg-slate-900/40 border border-slate-850 focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-slate-300 outline-none resize-none leading-relaxed"
                      rows={2}
                      placeholder="Espaço livre para anotações pedagógicas gerais..."
                    />
                  </div>
                </div>
              )}

              {/* ANNUAL 12-MONTHS MATRIX */}
              {activeSubTab === 'annual' && (
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h4 className="font-serif text-sm font-bold text-white">Matriz do Calendário Letivo {selectedYear}</h4>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">12 Meses Sincronizados</span>
                  </div>

                  {/* 12-Months Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {Array.from({ length: 12 }).map((_, monthIdx) => {
                      const mDays = getDaysInMonth(selectedYear, monthIdx);
                      const mFirstDay = getFirstDayOfMonth(selectedYear, monthIdx);

                      return (
                        <div 
                          key={monthIdx}
                          onClick={() => {
                            setSelectedMonth(monthIdx);
                            setActiveSubTab('monthly');
                          }}
                          className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl hover:border-slate-700 hover:bg-slate-950/70 transition-all cursor-pointer group space-y-2.5"
                        >
                          <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                            <span className="font-serif text-xs font-bold text-slate-200 uppercase tracking-wider group-hover:text-[#D4AF37] transition-colors">
                              {getMonthName(monthIdx)}
                            </span>
                            <span className="text-[9px] text-emerald-400 font-bold font-mono bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded">{getSchoolDaysForMonth(monthIdx)} Dias Letivos</span>
                          </div>

                          {/* Mini Grid */}
                          <div className="grid grid-cols-7 gap-0.5 text-center text-[8px]">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                              <div key={i} className="font-bold text-slate-600 font-mono py-0.5">{d}</div>
                            ))}
                            
                            {/* Empty days spacing */}
                            {Array.from({ length: mFirstDay }).map((_, i) => (
                              <div key={'empty-' + i} className="py-0.5"></div>
                            ))}

                            {/* Active days */}
                            {Array.from({ length: mDays }).map((_, i) => {
                              const dayNum = i + 1;
                              const dateString = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                              const dayOfWeek = new Date(selectedYear, monthIdx, dayNum).getDay();
                              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                              const dayEvents = premiumEvents.filter(e => e.date === dateString);
                              const isNationalHoliday = dayEvents.some(e => e.category === 'feriado_nacional');
                              const isRecess = dayEvents.some(e => e.category === 'recesso_escolar');
                              const isSabadoLetivo = dayEvents.some(e => e.category === 'sabado_letivo');
                              const hasOtherEvent = dayEvents.some(e => e.category !== 'feriado_nacional' && e.category !== 'recesso_escolar');
                              const mainEventColor = dayEvents.length > 0 ? dayEvents[0].color : '';

                              let dayStyle = 'text-slate-400 hover:bg-slate-800';
                              if (isNationalHoliday) {
                                dayStyle = 'bg-rose-600 text-white font-bold shadow-sm shadow-rose-950/60 ring-1 ring-rose-400';
                              } else if (isRecess || (isWeekend && !isSabadoLetivo)) {
                                dayStyle = 'bg-[#333d52] text-slate-200 font-bold border border-slate-600/50 shadow-sm';
                              } else if (hasOtherEvent) {
                                dayStyle = `${mainEventColor} text-white font-bold shadow-sm ring-1 ring-white/10`;
                              }

                              return (
                                <div 
                                  key={dayNum}
                                  onClick={(e) => {
                                    if (toolMode !== 'none') {
                                      e.stopPropagation();
                                      handleDayInteracted(dateString);
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    if (toolMode !== 'none') {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setIsMouseDown(true);
                                      handleDayInteracted(dateString);
                                    }
                                  }}
                                  onMouseEnter={() => {
                                    setHoveredDate(dateString);
                                    if (isMouseDown && toolMode !== 'none') {
                                      handleDayInteracted(dateString);
                                    }
                                  }}
                                  onMouseLeave={() => {
                                    if (hoveredDate === dateString) {
                                      setHoveredDate(null);
                                    }
                                  }}
                                  style={{ 
                                    cursor: toolMode === 'paint' ? 'cell' : toolMode === 'erase' ? 'not-allowed' : toolMode === 'picker' ? 'crosshair' : 'pointer' 
                                  }}
                                  className={`py-0.5 rounded-full font-mono flex items-center justify-center relative transition-all duration-200 select-none ${dayStyle} ${hoveredDate === dateString && toolMode !== 'none' ? 'scale-125 ring-2 ring-white/40 z-10' : ''}`}
                                  title={dayEvents.length > 0 ? `${dayNum}: ${dayEvents.map(e => e.title).join(', ')}` : isWeekend ? `${dayNum}: Fim de Semana` : ''}
                                >
                                  {dayNum}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT SIDE: INTELLIGENT LEGEND & SUMMARY INSIGHTS */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* LEGEND CARD ("Legenda Inteligente" fully editable) */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h3 className="font-serif text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-emerald-400" /> Legenda Inteligente
                  </h3>
                  <span className="text-[9px] text-slate-500 font-mono">Gerenciável</span>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {legendCategories.map((cat) => (
                    <div 
                      key={cat.id} 
                      className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-900 hover:border-slate-800 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3.5 h-3.5 rounded-full ${cat.color} shrink-0`} />
                        {editingLegendCategory?.id === cat.id ? (
                          <input 
                            type="text" 
                            value={legendForm.label}
                            onChange={(e) => setLegendForm({ ...legendForm, label: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white max-w-[120px]"
                            autoFocus
                          />
                        ) : (
                          <span className="text-xs font-medium text-slate-300">{cat.label}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {editingLegendCategory?.id === cat.id ? (
                          <>
                            {/* Color Selector dropdown list */}
                            <select 
                              value={legendForm.color}
                              onChange={(e) => setLegendForm({ ...legendForm, color: e.target.value })}
                              className="bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300"
                            >
                              <option value="bg-emerald-500">Verde</option>
                              <option value="bg-rose-500">Rosa</option>
                              <option value="bg-amber-500">Laranja escuro</option>
                              <option value="bg-blue-500">Azul</option>
                              <option value="bg-purple-500">Roxo</option>
                              <option value="bg-red-600">Vermelho</option>
                              <option value="bg-sky-500">Ciano</option>
                              <option value="bg-orange-500">Laranja</option>
                              <option value="bg-neutral-500">Cinza</option>
                              <option value="bg-pink-500">Fúcsia</option>
                              <option value="bg-teal-500">Teal</option>
                              <option value="bg-yellow-600">Amarelo</option>
                            </select>
                            <button 
                              onClick={() => {
                                setLegendCategories(prev => prev.map(c => c.id === cat.id ? { ...c, label: legendForm.label, color: legendForm.color } : c));
                                setEditingLegendCategory(null);
                              }}
                              className="text-emerald-400 hover:text-white"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => {
                              setEditingLegendCategory(cat);
                              setLegendForm({ label: cat.label, color: cat.color });
                            }}
                            className="text-slate-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* HISTÓRICO DE AÇÕES EM TEMPO REAL PANEL */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h3 className="font-serif text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" /> Histórico de Alterações
                  </h3>
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  </span>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {actionLogs.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider">Histórico Vazio</p>
                      <p className="text-[9px] text-slate-600">Suas ações de pintura e edição aparecerão aqui em tempo real.</p>
                    </div>
                  ) : (
                    actionLogs.map((log) => (
                      <div key={log.id} className="p-2 bg-slate-950/40 rounded-xl border border-slate-900/80 flex justify-between items-start gap-2 text-[10px]">
                        <span className="text-slate-300 font-medium leading-relaxed">{log.text}</span>
                        <span className="text-[8px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded shrink-0">{log.time}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Undo / Redo controls inside sidebar for rich utility */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900/80">
                  <button
                    onClick={handleUndo}
                    disabled={historyStack.length === 0}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      historyStack.length > 0
                        ? 'bg-slate-950 border-slate-850 hover:border-slate-700 text-slate-200 hover:text-white'
                        : 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <span>Desfazer</span>
                    <span className="text-[8px] opacity-40 font-mono">Ctrl+Z</span>
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      redoStack.length > 0
                        ? 'bg-slate-950 border-slate-850 hover:border-slate-700 text-slate-200 hover:text-white'
                        : 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <span>Refazer</span>
                    <span className="text-[8px] opacity-40 font-mono">Ctrl+Y</span>
                  </button>
                </div>
              </div>

              {/* STATS & METRICS SUMMARY CARD */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37] font-bold">Sumário do Ano de Exercício</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-900 space-y-0.5">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Dias Letivos</span>
                    <span className="font-serif text-lg font-black text-emerald-400 block">{getTotalSchoolDays()} dias</span>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-900 space-y-0.5">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Eventos Cadastrados</span>
                    <span className="font-serif text-lg font-black text-[#D4AF37] block">{premiumEvents.length}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed text-center">
                  *Conforme a Lei de Diretrizes e Bases da Educação Nacional (LDB - Lei nº 9.394/1996), o ano letivo deve possuir no mínimo 200 dias de trabalho escolar efetivo.
                </p>
              </div>

            </div>

          </div>

          {/* CHRONOLOGICAL EVENTS TIMELINE SECTION */}
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-0.5">
                <h4 className="font-serif text-sm font-bold text-white">Agenda Cronológica de Atividades</h4>
                <p className="text-xs text-slate-400">Pesquise e gerencie eventos e reuniões de forma imediata.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar evento..."
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                  />
                </div>

                <select 
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-850 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">Todas Categorias</option>
                  {legendCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>

                <button 
                  onClick={() => {
                    setEditorForm({
                      title: '',
                      category: 'evento_escolar',
                      color: 'bg-orange-500',
                      description: '',
                      time: '08:00',
                      location: '',
                      date: `${selectedYear}-02-02`,
                      endDate: `${selectedYear}-02-02`
                    });
                    setEditingEvent(null);
                    setIsEditorOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-bordeaux hover:bg-bordeaux/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-bordeaux/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Evento</span>
                </button>
              </div>
            </div>

            {/* Timeline List */}
            <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
              {premiumEvents
                .filter(ev => {
                  const matchSearch = ev.title.toLowerCase().includes(searchTerm.toLowerCase()) || (ev.description || '').toLowerCase().includes(searchTerm.toLowerCase());
                  const matchCat = selectedCategoryFilter === 'all' || ev.category === selectedCategoryFilter;
                  return matchSearch && matchCat;
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((ev) => {
                  const cat = legendCategories.find(c => c.id === ev.category);
                  const formattedDate = ev.date.split('-').reverse().join('/');

                  return (
                    <div 
                      key={ev.id} 
                      className="p-4 bg-slate-950/40 rounded-2xl border border-slate-850 hover:border-slate-800 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-3.5 h-12 rounded-full ${ev.color} shrink-0`} />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-serif text-sm font-bold text-white">{ev.title}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full text-white font-bold ${ev.color}`}>
                              {cat?.label || 'Evento'}
                            </span>
                            {ev.time && (
                              <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {ev.time}
                              </span>
                            )}
                            {ev.location && (
                              <span className="text-[10px] text-slate-400 font-mono bg-slate-950 border border-slate-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {ev.location}
                              </span>
                            )}
                          </div>
                          
                          {ev.description && (
                            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{ev.description}</p>
                          )}

                          <span className="text-[10px] text-slate-500 font-mono font-bold block pt-1">
                            📅 Data Programada: {formattedDate}
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1.5 md:opacity-0 group-hover:opacity-100 transition-all self-end md:self-center">
                        <button 
                          onClick={() => {
                            setEditingEvent(ev);
                            setEditorForm({
                              title: ev.title,
                              category: ev.category,
                              color: ev.color,
                              description: ev.description || '',
                              time: ev.time || '08:00',
                              location: ev.location || '',
                              date: ev.date
                            });
                            setIsEditorOpen(true);
                          }}
                          className="p-2 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg transition-all"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={() => {
                            // Duplicate Action
                            const duplicated = {
                              ...ev,
                              title: `${ev.title} (Cópia)`
                            };
                            delete (duplicated as any).id;
                            addPremiumEvent(duplicated);
                            alert('Evento duplicado com sucesso!');
                          }}
                          className="p-2 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg transition-all"
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button 
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja excluir o evento "${ev.title}"?`)) {
                              deletePremiumEvent(ev.id);
                            }
                          }}
                          className="p-2 bg-slate-900 border border-slate-850 hover:border-red-500/50 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* EVENT EDITOR MODAL PANEL */}
          {isEditorOpen && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-slate-900 border-2 border-gold/30 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-left">
                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gold" />
                    <span className="font-serif text-sm font-bold text-white uppercase tracking-wider">
                      {editingEvent ? 'Editar Evento Escolar' : `Criar Novo Evento Escolar - ${selectedYear}`}
                    </span>
                  </div>
                  <button onClick={() => setIsEditorOpen(false)} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome do Evento / Atividade</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Reunião Geral de Encerramento"
                      value={editorForm.title}
                      onChange={(e) => setEditorForm({ ...editorForm, title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoria de Legenda</label>
                      <select 
                        value={editorForm.category}
                        onChange={(e) => {
                          const catId = e.target.value;
                          const selectedCat = legendCategories.find(c => c.id === catId);
                          setEditorForm({ 
                            ...editorForm, 
                            category: catId,
                            color: selectedCat ? selectedCat.color : 'bg-orange-500'
                          });
                        }}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#D4AF37] rounded-xl px-3 py-3 text-xs text-slate-300 outline-none"
                      >
                        {legendCategories.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cor Personalizada</label>
                      <select 
                        value={editorForm.color}
                        onChange={(e) => setEditorForm({ ...editorForm, color: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#D4AF37] rounded-xl px-3 py-3 text-xs text-slate-300 outline-none"
                      >
                        <option value="bg-emerald-500">Esmeralda</option>
                        <option value="bg-rose-500">Vermelho Claro</option>
                        <option value="bg-amber-500">Âmbar</option>
                        <option value="bg-blue-500">Azul Royal</option>
                        <option value="bg-purple-500">Púrpura</option>
                        <option value="bg-red-600">Bordeaux / Vermelho</option>
                        <option value="bg-sky-500">Ciano</option>
                        <option value="bg-orange-500">Laranja</option>
                        <option value="bg-neutral-500">Cinza Neutro</option>
                        <option value="bg-pink-500">Rosa Choque</option>
                        <option value="bg-teal-500">Teal</option>
                        <option value="bg-yellow-600">Amarelo</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Data Início</label>
                      <input 
                        type="date"
                        required
                        value={editorForm.date}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditorForm(prev => ({
                            ...prev,
                            date: val,
                            endDate: (!prev.endDate || prev.endDate < val) ? val : prev.endDate
                          }));
                        }}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#D4AF37] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Data Fim</label>
                      <input 
                        type="date"
                        required
                        value={editorForm.endDate || editorForm.date}
                        onChange={(e) => setEditorForm(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#D4AF37] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Horário</label>
                      <input 
                        type="time"
                        value={editorForm.time}
                        onChange={(e) => setEditorForm({ ...editorForm, time: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#D4AF37] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Local</label>
                      <input 
                        type="text"
                        placeholder="Ex: Auditório"
                        value={editorForm.location}
                        onChange={(e) => setEditorForm({ ...editorForm, location: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#D4AF37] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição detalhada</label>
                    <textarea 
                      placeholder="Descreva detalhes ou pauta deste evento para conhecimento geral..."
                      value={editorForm.description}
                      onChange={(e) => setEditorForm({ ...editorForm, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-[#D4AF37] rounded-xl px-4 py-2.5 text-xs text-white outline-none resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Parental dispatch integrations */}
                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-850/80 flex items-start gap-3">
                    <input 
                      type="checkbox"
                      id="notify-guardians-checkbox"
                      checked={notifyGuardians}
                      onChange={(e) => setNotifyGuardians(e.target.checked)}
                      className="mt-1 accent-gold"
                    />
                    <div className="space-y-0.5 text-xs text-slate-300">
                      <label htmlFor="notify-guardians-checkbox" className="font-bold cursor-pointer hover:text-white flex items-center gap-1.5">
                        📢 Notificar pais e professores imediatamente
                      </label>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Ao marcar esta opção, um comunicado automático multicanal será encaminhado aos responsáveis via SMS, WhatsApp e Notificação Push no aplicativo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="p-5 border-t border-slate-800 flex justify-between items-center bg-slate-950/20">
                  <div>
                    {editingEvent && (
                      <button 
                        onClick={() => {
                          if (confirm(`Excluir o evento "${editingEvent.title}"?`)) {
                            deletePremiumEvent(editingEvent.id);
                            setIsEditorOpen(false);
                          }
                        }}
                        className="text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-400"
                      >
                        Excluir Evento
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsEditorOpen(false)}
                      className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => {
                        if (!editorForm.title.trim()) {
                          alert('Por favor digite um título válido para o evento.');
                          return;
                        }

                        const payload = {
                          date: editorForm.date,
                          endDate: editorForm.endDate || editorForm.date,
                          title: editorForm.title,
                          category: editorForm.category,
                          color: editorForm.color,
                          description: editorForm.description,
                          time: editorForm.time,
                          location: editorForm.location
                        };

                        if (editingEvent) {
                          updatePremiumEvent({ id: editingEvent.id, ...payload });
                        } else {
                          addPremiumEvent(payload);
                        }

                        // Dispatch alert if checked
                        if (notifyGuardians) {
                          alert(`Sucesso! Comunicado enviado aos canais integrados dos responsáveis com as informações de "${editorForm.title}".`);
                        }

                        setIsEditorOpen(false);
                        setNotifyGuardians(false);
                      }}
                      className="px-6 py-2 bg-bordeaux hover:bg-bordeaux/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      {editingEvent ? 'Atualizar Evento' : 'Salvar Evento'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EDIT SCHOOL DAYS DIALOG MODAL (Section 1) */}
          {isEditingSchoolDays && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-left">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-slate-850 flex justify-between items-center bg-slate-950/40">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-emerald-400" />
                    <span className="font-serif text-sm font-bold text-white uppercase tracking-wider">
                      Editar Dias Letivos
                    </span>
                  </div>
                  <button onClick={() => setIsEditingSchoolDays(false)} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    setManualSchoolDays(prev => ({
                      ...prev,
                      [selectedMonth]: editingSchoolDaysValue
                    }));
                    setIsEditingSchoolDays(false);
                    
                    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    setActionLogs(prev => [
                      { id: `log-${Date.now()}`, text: `Alterou dias letivos de ${getMonthName(selectedMonth)} para ${editingSchoolDaysValue}`, time: timeString },
                      ...prev.slice(0, 19)
                    ]);
                  }} 
                  className="p-6 space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Mês Referência
                    </label>
                    <input 
                      type="text" 
                      value={getMonthName(selectedMonth)} 
                      disabled 
                      className="w-full bg-slate-950 border border-slate-850 text-slate-400 px-3.5 py-2 rounded-xl text-xs font-bold uppercase cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Dias Letivos Regulamentados
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      max="31"
                      value={editingSchoolDaysValue} 
                      onChange={(e) => setEditingSchoolDaysValue(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold focus:border-emerald-500/50 focus:ring-0"
                      required
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-850">
                    <button 
                      type="button"
                      onClick={() => setIsEditingSchoolDays(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20"
                    >
                      Salvar Alteração
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PALETTE CONFIGURATION MODAL PANEL */}
          {isPaletteConfigOpen && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-slate-900 border-2 border-gold/30 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl text-left flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gold" />
                    <span className="font-serif text-sm font-bold text-white uppercase tracking-wider">
                      Configurar Paleta Inteligente
                    </span>
                  </div>
                  <button onClick={() => setIsPaletteConfigOpen(false)} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body with categories list */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  {/* Explanation card */}
                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-850 text-slate-300 text-xs space-y-1">
                    <span className="font-bold text-emerald-400">💡 Customização Total</span>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Gerencie as categorias de legenda que aparecem na sua Paleta Inteligente de Cores e no Calendário Escolar Oficial. Você pode editar os nomes e as cores de identificação em tempo real.
                    </p>
                  </div>

                  {/* List of categories */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest block">Categorias Atuais ({legendCategories.length})</label>
                    
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {legendCategories.map((cat) => (
                        <div key={cat.id} className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 flex items-center justify-between gap-3 group">
                          {editingPaletteCat?.id === cat.id ? (
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <input 
                                type="text" 
                                value={paletteCatForm.label}
                                onChange={(e) => setPaletteCatForm({ ...paletteCatForm, label: e.target.value })}
                                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                placeholder="Nome da Categoria"
                                autoFocus
                              />
                              <select 
                                value={paletteCatForm.color}
                                onChange={(e) => setPaletteCatForm({ ...paletteCatForm, color: e.target.value })}
                                className="bg-slate-900 border border-slate-800 rounded-lg px-2 text-xs text-slate-300"
                              >
                                <option value="bg-red-600">Vermelho</option>
                                <option value="bg-blue-600">Azul</option>
                                <option value="bg-emerald-500">Verde</option>
                                <option value="bg-yellow-400">Amarelo</option>
                                <option value="bg-orange-500">Laranja</option>
                                <option value="bg-purple-600">Roxo</option>
                                <option value="bg-amber-800">Marrom</option>
                                <option value="bg-slate-900">Preto</option>
                                <option value="bg-neutral-500">Cinza</option>
                                <option value="bg-pink-500">Rosa</option>
                                <option value="bg-sky-500">Azul Claro</option>
                                <option value="bg-teal-500">Verde Claro</option>
                                <option value="bg-yellow-600">Dourado</option>
                                <option value="bg-purple-400">Lilás</option>
                                <option value="bg-orange-200">Bege</option>
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full ${cat.color} shrink-0`} />
                              <span className="text-xs font-semibold text-slate-200">{cat.label}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 shrink-0">
                            {editingPaletteCat?.id === cat.id ? (
                              <>
                                <button 
                                  onClick={() => {
                                    if (!paletteCatForm.label.trim()) return;
                                    setLegendCategories(prev => prev.map(c => c.id === cat.id ? { ...c, label: paletteCatForm.label, color: paletteCatForm.color } : c));
                                    setEditingPaletteCat(null);
                                  }}
                                  className="p-1 text-emerald-400 hover:text-white bg-slate-900 rounded"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setEditingPaletteCat(null)}
                                  className="p-1 text-slate-500 hover:text-white bg-slate-900 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => {
                                    setEditingPaletteCat(cat);
                                    setPaletteCatForm({ label: cat.label, color: cat.color, icon: cat.icon || '' });
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-400 bg-slate-900 rounded transition-all"
                                  title="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (legendCategories.length <= 5) {
                                      alert('Mantenha pelo menos 5 categorias de legenda para o calendário letivo.');
                                      return;
                                    }
                                    if (confirm(`Remover a categoria "${cat.label}"?`)) {
                                      setLegendCategories(prev => prev.filter(c => c.id !== cat.id));
                                    }
                                  }}
                                  className="p-1 text-slate-500 hover:text-red-500 bg-slate-900 rounded transition-all"
                                  title="Remover"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add New Category segment */}
                  <div className="bg-slate-950/20 p-4 rounded-2xl border border-slate-800 space-y-3.5">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">➕ Adicionar Nova Categoria</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Nome da Categoria</label>
                        <input 
                          type="text"
                          placeholder="Ex: Formatura Escolar"
                          value={newPaletteCatForm.label}
                          onChange={(e) => setNewPaletteCatForm({ ...newPaletteCatForm, label: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Cor de Identificação</label>
                        <select 
                          value={newPaletteCatForm.color}
                          onChange={(e) => setNewPaletteCatForm({ ...newPaletteCatForm, color: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                        >
                          <option value="bg-red-600">Vermelho</option>
                          <option value="bg-blue-600">Azul</option>
                          <option value="bg-emerald-500">Verde</option>
                          <option value="bg-yellow-400">Amarelo</option>
                          <option value="bg-orange-500">Laranja</option>
                          <option value="bg-purple-600">Roxo</option>
                          <option value="bg-amber-800">Marrom</option>
                          <option value="bg-slate-900">Preto</option>
                          <option value="bg-neutral-500">Cinza</option>
                          <option value="bg-pink-500">Rosa</option>
                          <option value="bg-sky-500">Azul Claro</option>
                          <option value="bg-teal-500">Verde Claro</option>
                          <option value="bg-yellow-600">Dourado</option>
                          <option value="bg-purple-400">Lilás</option>
                          <option value="bg-orange-200">Bege</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!newPaletteCatForm.label.trim()) {
                          alert('Digite um nome para a nova categoria.');
                          return;
                        }
                        const newId = 'cat_' + Date.now();
                        const newCat = {
                          id: newId,
                          label: newPaletteCatForm.label,
                          color: newPaletteCatForm.color
                        };
                        setLegendCategories(prev => [...prev, newCat]);
                        setNewPaletteCatForm({ label: '', color: 'bg-emerald-500', icon: '' });
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                      Criar Categoria
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-800 bg-slate-950/20 text-right">
                  <button 
                    onClick={() => setIsPaletteConfigOpen(false)}
                    className="px-6 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Fechar Configurações
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PRINT PREVIEW VIEW MODAL (A4 STRICT FORMAT) */}
          {isPrintPreviewOpen && (
            <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col lg:flex-row animate-fade-in text-slate-100">
              
              {/* LEFT SIDEBAR: Professional Control Panel & Smart Validation */}
              <div className="w-full lg:w-96 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between overflow-y-auto no-print space-y-6">
                
                <div className="space-y-6">
                  {/* Sidebar Header */}
                  <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Printer className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h3 className="font-serif text-sm font-bold text-white uppercase tracking-wider">Painel de Impressão</h3>
                        <p className="text-[10px] text-slate-400">Padrão A4 Oficial MEC</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsPrintPreviewOpen(false)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 1. Layout Mode & Orientation */}
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Modo de Layout</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button 
                        onClick={() => setPrintLayout('monthly')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          printLayout === 'monthly' ? 'bg-bordeaux text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Mensal Focado
                      </button>
                      <button 
                        onClick={() => setPrintLayout('annual')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          printLayout === 'annual' ? 'bg-bordeaux text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Anual Geral
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setPrintOrientation('portrait')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                          printOrientation === 'portrait' 
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' 
                            : 'border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="w-4 h-6 border-2 border-current rounded-sm mb-1.5 flex items-start p-0.5 justify-center">
                          <div className="w-full h-1 bg-current opacity-40"></div>
                        </div>
                        <span>Vertical (Retrato)</span>
                      </button>
                      <button 
                        onClick={() => setPrintOrientation('landscape')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                          printOrientation === 'landscape' 
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' 
                            : 'border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="w-6 h-4 border-2 border-current rounded-sm mb-1.5 flex items-start p-0.5 justify-center">
                          <div className="w-full h-1 bg-current opacity-40"></div>
                        </div>
                        <span>Horizontal (Paisagem)</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Scalability Presets */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Escala do Documento (A4)</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[100, 95, 90, 80].map(sc => (
                        <button
                          key={sc}
                          onClick={() => setPrintScale(sc)}
                          className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                            printScale === sc 
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                              : 'border-slate-800 hover:border-slate-700 text-slate-400'
                          }`}
                        >
                          {sc}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Visibility Toggles */}
                  <div className="space-y-2.5 bg-slate-950 p-4 rounded-xl border border-slate-850">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Filtros de Exibição</label>
                    <div className="space-y-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                        <input 
                          type="checkbox" 
                          checked={printShowHeader} 
                          onChange={(e) => setPrintShowHeader(e.target.checked)}
                          className="rounded border-slate-800 text-bordeaux focus:ring-bordeaux h-4 w-4 bg-slate-900" 
                        />
                        <span>Mostrar Cabeçalho Oficial</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                        <input 
                          type="checkbox" 
                          checked={printShowLegend} 
                          onChange={(e) => setPrintShowLegend(e.target.checked)}
                          className="rounded border-slate-800 text-bordeaux focus:ring-bordeaux h-4 w-4 bg-slate-900" 
                        />
                        <span>Mostrar Legenda Dinâmica</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                        <input 
                          type="checkbox" 
                          checked={printShowFooter} 
                          onChange={(e) => setPrintShowFooter(e.target.checked)}
                          className="rounded border-slate-800 text-bordeaux focus:ring-bordeaux h-4 w-4 bg-slate-900" 
                        />
                        <span>Mostrar Assinaturas e Carimbo</span>
                      </label>
                    </div>
                  </div>

                  {/* 4. VALIDAÇÃO INTELIGENTE (Section 14) */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Validação Inteligente de Integridade</label>
                    {(() => {
                      const result = validateCalendar();
                      return result.valid ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-left space-y-1">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            ✓ Calendário Validado
                          </span>
                          <p className="text-[10px] text-slate-300">Todas as exigências legais do MEC e diretrizes da LDB foram preenchidas sem nenhuma inconsistência encontrada.</p>
                        </div>
                      ) : (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-left space-y-1.5">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            ⚠ Alertas de Homologação ({result.issues.length})
                          </span>
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                            {result.issues.map((iss, index) => (
                              <p key={index} className="text-[9px] text-slate-300 leading-snug border-l border-amber-500/30 pl-1.5">{iss}</p>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 5. Document Zoom (Section 13) */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Zoom de Visualização Tela</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[100, 125, 150, 200].map(zm => (
                        <button
                          key={zm}
                          onClick={() => setPreviewZoom(zm)}
                          className={`py-1 rounded text-[10px] font-mono transition-all ${
                            previewZoom === zm 
                              ? 'bg-slate-800 text-white font-bold' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {zm}%
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Export Buttons Section */}
                <div className="pt-4 border-t border-slate-800 space-y-2 bg-slate-900 sticky bottom-0">
                  <button 
                    onClick={() => window.print()}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir A4</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handleExportWord}
                      className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-200 hover:text-white rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span>Word</span>
                    </button>
                    <button 
                      onClick={handleExportExcel}
                      className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-200 hover:text-white rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* RIGHT VIEWPORT: Strict Simulated A4 Sheet Page Container */}
              <div className="flex-1 bg-slate-950/90 p-8 overflow-y-auto flex justify-center items-start scrollbar-thin">
                
                <div 
                  className="bg-white text-black shadow-2xl relative flex flex-col justify-between print-area transition-all duration-300"
                  style={{ 
                    width: printOrientation === 'portrait' ? '210mm' : '297mm',
                    minHeight: printOrientation === 'portrait' ? '297mm' : '210mm',
                    padding: '20mm',
                    transform: `scale(${previewZoom / 100})`, 
                    transformOrigin: 'top center',
                    marginBottom: `${(previewZoom / 100 - 1) * 297 + 24}mm`,
                    contentVisibility: 'auto'
                  }}
                >
                  {/* Web-to-Print Stylesheet injected for exact browser rendering */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                      @page {
                        size: A4 ${printOrientation};
                        margin: 0;
                      }
                      body {
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                      .no-print {
                        display: none !important;
                      }
                      .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: ${printOrientation === 'portrait' ? '210mm' : '297mm'} !important;
                        height: ${printOrientation === 'portrait' ? '297mm' : '210mm'} !important;
                        padding: 15mm !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        transform: scale(${printScale / 100}) !important;
                        transform-origin: top left !important;
                      }
                    }
                  `}} />

                  <div className="space-y-6">
                    {/* Municipal Letterhead (Conditional Header) */}
                    {printShowHeader && (
                      <div className="flex items-center gap-4 border-b-2 border-black pb-4 text-left">
                        <img 
                          src={headerForm.logo} 
                          alt="Brasão" 
                          className="w-16 h-16 object-cover border border-slate-400 p-1"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1">
                          <span className="text-[10px] font-bold tracking-widest text-slate-500 block uppercase">
                            Prefeitura Municipal de {headerForm.municipio} • Secretaria de Educação
                          </span>
                          <h2 className="font-serif text-base font-extrabold tracking-wide uppercase text-black leading-tight">
                            {headerForm.secretaria}
                          </h2>
                          <h1 className="font-serif text-lg font-black uppercase text-black leading-tight">
                            {headerForm.schoolName}
                          </h1>
                          <div className="flex justify-between items-center pt-1 text-[10px] font-bold text-slate-600 font-mono">
                            <span>SISTEMA DE GESTÃO - PLANO DE TRABALHO DOCENTE</span>
                            <span>{headerForm.schoolYear}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Portaria Homologação Text Block */}
                    <div className="p-3 bg-slate-100 border border-slate-300 text-[9px] leading-relaxed text-slate-800 text-left">
                      <strong>Portaria de Homologação:</strong> Este documento rege o planejamento pedagógico letivo homologado em conformidade com o artigo 23 da Lei de Diretrizes e Bases da Educação Nacional (LDB - nº 9.394/96). O calendário prevê {getTotalSchoolDays()} dias letivos de trabalho escolar efetivo, cumprindo integralmente as disposições legais.
                    </div>

                    {/* CONTENT AREA: Monthly view or 12-Month Matrix */}
                    {printLayout === 'monthly' ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-400 pb-1 flex-row">
                          <h3 className="font-serif text-sm font-black uppercase text-black">
                            {getMonthName(selectedMonth)} {selectedYear}
                          </h3>
                          <span className="text-[10px] text-emerald-600 font-bold font-mono">
                            {getSchoolDaysForMonth(selectedMonth)} Dias Letivos Cadastrados
                          </span>
                        </div>

                        {/* Month grid with colors matching calendar screen */}
                        <div className="grid grid-cols-7 gap-1 text-center text-xs">
                          {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'].map((w, idx) => (
                            <div key={idx} className="font-extrabold text-slate-700 py-1 border-b border-slate-300 font-serif bg-slate-50 text-[9px]">{w}</div>
                          ))}
                          
                          {/* Fill preceding days */}
                          {Array.from({ length: getFirstDayOfMonth(selectedYear, selectedMonth) }).map((_, i) => (
                            <div key={'empty-' + i} className="bg-slate-50/50 border border-slate-100 min-h-[4.5rem]"></div>
                          ))}

                          {/* Render and color days exactly like on screen */}
                          {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }).map((_, i) => {
                            const dNum = i + 1;
                            const dStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
                            const dEvents = premiumEvents.filter(e => e.date === dStr);
                            const isSpecial = dEvents.length > 0;
                            const firstEvent = dEvents[0];
                            const eventColor = isSpecial ? firstEvent.color : '';
                            const isLight = isSpecial ? isLightColor(eventColor) : false;
                            const textColor = isSpecial 
                              ? (isLight ? 'text-slate-950 font-extrabold' : 'text-white font-extrabold') 
                              : 'text-slate-700';

                            return (
                              <div 
                                key={dNum} 
                                className={`border border-slate-200 p-1 min-h-[4.5rem] flex flex-col justify-between items-start transition-all ${
                                  isSpecial ? `${eventColor} ${textColor}` : 'bg-white'
                                }`}
                              >
                                <span className={`text-[9px] font-bold font-mono ${isSpecial ? (isLight ? 'text-slate-950/60' : 'text-white/70') : 'text-slate-400'}`}>
                                  {dNum}
                                </span>
                                <div className="w-full space-y-0.5 mt-0.5 overflow-hidden">
                                  {dEvents.slice(0, 2).map(e => (
                                    <div 
                                      key={e.id} 
                                      className={`text-[7px] font-serif font-extrabold pl-1 leading-tight truncate border-l-2 ${
                                        isSpecial 
                                          ? (isLight ? 'border-slate-950 text-slate-900' : 'border-white text-white') 
                                          : 'border-slate-600 text-black'
                                      }`}
                                    >
                                      {e.title}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Observations block */}
                        <div className="text-left space-y-1 pt-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Informações e Eventos Recorrentes deste Período</span>
                          <p className="text-[9px] text-slate-700 leading-relaxed bg-slate-50 p-2.5 border border-slate-200">
                            {observations}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border-b border-slate-400 pb-1.5 flex justify-between items-center">
                          <h3 className="font-serif text-sm font-black uppercase text-black">
                            Calendário Anual Consolidado ({selectedYear})
                          </h3>
                          <span className="text-[10px] text-emerald-600 font-bold font-mono">
                            Ano Letivo: {getTotalSchoolDays()} Dias Letivos Totais
                          </span>
                        </div>

                        {/* 12-Month Matrix Print View preserving color highlights */}
                        <div className="grid grid-cols-3 gap-3">
                          {Array.from({ length: 12 }).map((_, mIdx) => {
                            const daysInM = getDaysInMonth(selectedYear, mIdx);
                            const firstDayOfM = getFirstDayOfMonth(selectedYear, mIdx);
                            const sDays = getSchoolDaysForMonth(mIdx);

                            return (
                              <div key={mIdx} className="border border-slate-200 p-2 bg-white text-left space-y-1">
                                <div className="flex justify-between items-center border-b border-slate-200 pb-0.5">
                                  <span className="font-serif text-[10px] font-extrabold text-black uppercase">
                                    {getMonthName(mIdx)}
                                  </span>
                                  <span className="text-[8px] text-emerald-600 font-bold font-mono">{sDays} DL</span>
                                </div>
                                
                                <div className="grid grid-cols-7 gap-0.5 text-center text-[7px] font-mono font-bold text-slate-600">
                                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((wd, idx) => (
                                    <div key={idx} className="py-0.5">{wd}</div>
                                  ))}

                                  {Array.from({ length: firstDayOfM }).map((_, i) => (
                                    <div key={'empty-' + i}></div>
                                  ))}

                                  {Array.from({ length: daysInM }).map((_, i) => {
                                    const dN = i + 1;
                                    const dSt = `${selectedYear}-${String(mIdx + 1).padStart(2, '0')}-${String(dN).padStart(2, '0')}`;
                                    const dDayOfWeek = new Date(selectedYear, mIdx, dN).getDay();
                                    const dIsWeekend = dDayOfWeek === 0 || dDayOfWeek === 6;

                                    const dEvs = premiumEvents.filter(e => e.date === dSt);
                                    const isNationalHoliday = dEvs.some(e => e.category === 'feriado_nacional');
                                    const isRecess = dEvs.some(e => e.category === 'recesso_escolar');
                                    const isSabadoLetivo = dEvs.some(e => e.category === 'sabado_letivo');
                                    const isSpecial = dEvs.length > 0;

                                    let cellStyle = 'text-slate-700';
                                    if (isNationalHoliday) {
                                      cellStyle = 'bg-red-600 text-white font-black shadow-sm';
                                    } else if (isRecess || (dIsWeekend && !isSabadoLetivo)) {
                                      cellStyle = 'bg-gray-500 text-white font-bold';
                                    } else if (isSpecial) {
                                      cellStyle = `${dEvs[0].color} text-white font-bold`;
                                    }

                                    return (
                                      <div 
                                        key={dN} 
                                        className={`py-0.5 rounded-full text-center text-[8px] ${cellStyle}`}
                                      >
                                        {dN}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Print Legend Grid (Conditional) */}
                    {printShowLegend && (
                      <div className="pt-4 border-t border-slate-300 text-left">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Legendas e Convenções Adotadas</span>
                        <div className="grid grid-cols-4 gap-2 text-[9px] text-slate-700 font-serif">
                          {legendCategories.map(cat => (
                            <div key={cat.id} className="flex items-center gap-1.5">
                              <div className={`w-2.5 h-2.5 rounded-full ${cat.color} border border-slate-300`} />
                              <span className="font-medium text-black">{cat.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SIGNATURE & STAMP SPACE WITH CARIMBO BOX (Conditional) */}
                  {printShowFooter && (
                    <div className="border-t border-slate-400 pt-6 mt-6">
                      <div className="grid grid-cols-2 gap-12 text-center text-xs font-serif">
                        {/* Secretaria de Ensino Side */}
                        <div className="space-y-1 flex flex-col items-center justify-end">
                          <div className="h-10"></div>
                          <div className="w-full border-t border-black pt-1">
                            <p className="text-black font-extrabold text-[10px] uppercase">
                              {headerForm.secretaria}
                            </p>
                            <p className="text-[8px] text-slate-500 italic uppercase">Parecer de Homologação Final</p>
                          </div>
                        </div>

                        {/* Director / Stamp Box Side */}
                        <div className="space-y-1.5 flex flex-col items-center justify-end">
                          <div className="h-10 flex items-center justify-center">
                            <div className="w-16 h-16 border-2 border-dashed border-blue-400/60 rounded-full flex items-center justify-center text-[7px] text-blue-400 font-bold uppercase rotate-12 -mt-3">
                              [ Carimbo ]
                            </div>
                          </div>
                          <div className="w-full border-t border-black pt-1">
                            <p className="text-black font-extrabold text-[10px] uppercase">
                              Assinatura Diretor
                            </p>
                            <p className="text-[8px] text-slate-500 italic uppercase">Unidade Sede - Registro nº 3521</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* System Audit Trail stamp */}
                      <div className="flex justify-between items-center text-[7px] text-slate-400 font-mono mt-6 border-t border-slate-200 pt-2 uppercase">
                        <span>Classium Portal Gestão Sincronizada • Código de Autenticidade: DRE-MEC-2026-X8</span>
                        <span>Documento Auditado com Assinatura Digital Ativa</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* 4. TAB TRANSPORTE - CLASSIUMTransporte INTELIGENTE */}
      {tab === 'transporte' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Bus className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-serif font-bold text-white tracking-wide">
                  CLASSIUMTransporte <span className="text-xs font-mono font-normal text-amber-400/90 ml-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">Gestão Inteligente de Frota</span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Centro unificado de gestão de veículos, motoristas, capacidade de vagas, turnos e rotas escolares.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setEditingVehicleId(null);
                  setVehicleForm({
                    numero: '',
                    tipo: 'Ônibus',
                    driverName: '',
                    driverPhone: '',
                    driverCnh: '',
                    monitorName: '',
                    monitorPhone: '',
                    placa: '',
                    rota: '',
                    turno: '1º Turno',
                    capacidade: 48,
                    observacoes: ''
                  });
                  setIsAddVehicleModalOpen(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/10"
              >
                <Plus className="w-4 h-4" /> Cadastrar Transporte
              </button>

              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 border border-slate-700 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Relatórios do Transporte
              </button>
            </div>
          </div>

          {/* KPI Analytics Cards */}
          {(() => {
            const totalVehicles = transportVehicles.length;
            const totalCapacity = transportVehicles.reduce((acc, v) => acc + v.capacidade, 0);
            const totalLinked = transportStudents.filter(s => s.status === 'Vinculado').length;
            const totalUnlinked = transportStudents.filter(s => s.status === 'Aguardando Vinculação').length;
            const globalOccupancy = totalCapacity > 0 ? Math.round((totalLinked / totalCapacity) * 100) : 0;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Frota Ativa</span>
                    <span className="text-2xl font-bold font-serif text-white">{totalVehicles} <span className="text-xs font-sans text-slate-400 font-normal">veículos</span></span>
                  </div>
                  <span className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                    <Bus className="w-5 h-5" />
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Capacidade Total</span>
                    <span className="text-2xl font-bold font-serif text-white">{totalCapacity} <span className="text-xs font-sans text-slate-400 font-normal">vagas</span></span>
                  </div>
                  <span className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                    <Users className="w-5 h-5" />
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Ocupação Geral</span>
                    <span className={`text-2xl font-bold font-serif ${globalOccupancy > 90 ? 'text-rose-400' : globalOccupancy > 75 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {globalOccupancy}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{totalLinked} estudantes embarcados</span>
                  </div>
                  <span className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    <BarChart3 className="w-5 h-5" />
                  </span>
                </div>

                <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block flex items-center gap-1">
                      🟡 Aguardando Vinculação
                    </span>
                    <span className="text-2xl font-bold font-serif text-amber-200">{totalUnlinked} <span className="text-xs font-sans text-amber-300/80 font-normal">estudantes</span></span>
                    <span className="text-[10px] text-amber-300/70 block mt-0.5">Cadastrados na matrícula</span>
                  </div>
                  <span className="p-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl animate-pulse">
                    <AlertTriangle className="w-5 h-5" />
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Banner: Unlinked Students Pending Assignment */}
          {(() => {
            const unlinkedList = transportStudents.filter(s => s.status === 'Aguardando Vinculação');
            if (unlinkedList.length === 0) return null;

            return (
              <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <AlertCircle className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Estudantes Solicitantes de Transporte Sem Veículo Definido
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        {unlinkedList.length} pendentes
                      </span>
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Vincule a um veículo disponível respeitando o limite de capacidade de vagas.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {unlinkedList.map(st => {
                    const selectedVehId = selectedVehicleForStudent[st.id] || "";
                    const selectedVehicle = transportVehicles.find(v => v.id === selectedVehId);
                    
                    return (
                    <div key={st.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg transition-colors hover:border-slate-700">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                              <span className="text-lg">👦</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-white line-clamp-1" title={st.name}>{st.name}</h4>
                            </div>
                          </div>
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-full font-bold flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Aguardando
                          </span>
                        </div>

                        {/* Bloco Escolar */}
                        <div className="flex items-center gap-6 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <GraduationCap className="w-4 h-4 text-blue-400" />
                            <span>{st.grade}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <Clock className="w-4 h-4 text-emerald-400" />
                            <span>{st.shift}</span>
                          </div>
                        </div>

                        {/* Bloco Localização e Bloco Familiar */}
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
                          <div className="space-y-3">
                            <div>
                              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1"><MapPin className="w-3.5 h-3.5 text-blue-400" /> Bairro</span>
                              <p className="text-xs text-slate-300">Jardim Primavera</p>
                            </div>
                            <div>
                              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1"><Home className="w-3.5 h-3.5 text-emerald-400" /> Endereço</span>
                              <p className="text-xs text-slate-300 truncate" title={st.address}>{st.address || 'Não cadastrado'}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1"><Users className="w-3.5 h-3.5 text-purple-400" /> Responsável</span>
                              <p className="text-xs text-slate-300 truncate">{st.parentName}</p>
                            </div>
                            <div>
                              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1"><Phone className="w-3.5 h-3.5 text-sky-400" /> Telefone</span>
                              <p className="text-xs text-slate-300">{st.parentPhone}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Indicadores Adicionais */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/40">
                          <span className="flex items-center gap-1"><Navigation className="w-3.5 h-3.5 text-slate-500" /> Distância: 2,4 km</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-500" /> Rota: Norte</span>
                        </div>
                      </div>

                      {/* Seleção do ônibus */}
                      <div className="border-t border-slate-800/60 mt-4 pt-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Bus className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold text-white">Vincular ao veículo</span>
                        </div>
                        
                        <div className="relative">
                          <select
                            value={selectedVehId}
                            onChange={(e) => {
                              setSelectedVehicleForStudent(prev => ({ ...prev, [st.id]: e.target.value }));
                            }}
                            className="w-full appearance-none bg-slate-950 border border-slate-700 hover:border-amber-500/50 text-slate-300 text-xs rounded-xl pl-3 pr-8 py-2.5 outline-none transition-colors focus:border-amber-500"
                          >
                            <option value="">Selecione um veículo ▼</option>
                            {transportVehicles.map(v => {
                              const isFull = v.studentsIds.length >= v.capacidade;
                              return (
                                <option key={v.id} value={v.id} disabled={isFull}>
                                  {v.tipo} {v.numero} - {isFull ? 'Lotado' : `${v.capacidade - v.studentsIds.length} vagas`}
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {selectedVehicle && (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg animate-fade-in">
                            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 mb-1">
                              🟢 {selectedVehicle.tipo} {selectedVehicle.numero} • {selectedVehicle.capacidade - selectedVehicle.studentsIds.length} vagas livres
                            </span>
                            <span className="text-[10px] text-slate-400 block ml-4">
                              Motorista: {selectedVehicle.driverName} • Rota: {selectedVehicle.rota}
                            </span>
                          </div>
                        )}

                        <button
                          disabled={!selectedVehId}
                          onClick={() => {
                            if (!selectedVehId) return;
                            const success = linkStudentToVehicle(st.id, selectedVehId);
                            if (!success) {
                              alert("⚠️ Veículo Lotado! A capacidade máxima de vagas deste veículo já foi atingida.");
                            } else {
                              setSelectedVehicleForStudent(prev => {
                                const newObj = { ...prev };
                                delete newObj[st.id];
                                return newObj;
                              });
                            }
                          }}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md mt-2 flex items-center justify-center gap-2 ${
                            selectedVehId 
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-emerald-500/20 cursor-pointer' 
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" /> Vincular Aluno
                        </button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Turn Filters & Vehicle Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
            {/* Shift Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {['Todos', '1º Turno', '2º Turno', '3º Turno', 'Educação Infantil', 'EJA'].map(shift => {
                const count = shift === 'Todos' 
                  ? transportVehicles.length 
                  : transportVehicles.filter(v => v.turno === shift).length;

                return (
                  <button
                    key={shift}
                    onClick={() => setSelectedShiftFilter(shift)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedShiftFilter === shift
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{shift}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      selectedShiftFilter === shift ? 'bg-slate-950/30 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}

              {/* ABA PESQUISAR ESTUDANTE */}
              <button
                onClick={() => setSelectedShiftFilter('Pesquisar Estudante')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ml-1 border ${
                  selectedShiftFilter === 'Pesquisar Estudante'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-amber-400 hover:text-amber-300 border-amber-500/30 hover:border-amber-500/60'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Pesquisar Estudante</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedShiftFilter === 'Pesquisar Estudante' ? 'bg-slate-950/40 text-slate-950 font-extrabold' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {transportStudents.length}
                </span>
              </button>
            </div>

            {/* Search Input for Vehicles */}
            {selectedShiftFilter !== 'Pesquisar Estudante' && (
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar veículo, motorista, rota ou placa..."
                  value={searchVehicleQuery}
                  onChange={(e) => setSearchVehicleQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500/50"
                />
              </div>
            )}
          </div>

          {/* VIEW: Search Student or Vehicle Grid */}
          {selectedShiftFilter === 'Pesquisar Estudante' ? (
            <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5 space-y-5 shadow-2xl">
              {/* Header & Status Filter Pills */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
                    <Search className="w-5 h-5 text-amber-400" /> Pesquisa de Estudantes & Transporte Escolar Vinculado
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Consulte o estudante para saber a qual ônibus/van ele pertence, seu motorista, rota e status de embarque.
                  </p>
                </div>

                {/* Filter Status Pills */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
                  <button
                    onClick={() => setStudentSearchStatusFilter('todos')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      studentSearchStatusFilter === 'todos'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({transportStudents.length})
                  </button>
                  <button
                    onClick={() => setStudentSearchStatusFilter('vinculados')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      studentSearchStatusFilter === 'vinculados'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🟢 Vinculados ({transportStudents.filter(s => s.status === 'Vinculado').length})
                  </button>
                  <button
                    onClick={() => setStudentSearchStatusFilter('aguardando')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      studentSearchStatusFilter === 'aguardando'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🟡 Sem Veículo ({transportStudents.filter(s => s.status === 'Aguardando Vinculação').length})
                  </button>
                </div>
              </div>

              {/* Big Search Input */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-amber-400" />
                <input
                  type="text"
                  placeholder="Digite o nome do estudante, número de matrícula, turma, responsável ou endereço..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-10 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500/80 transition-colors shadow-inner"
                />
                {studentSearchQuery && (
                  <button
                    onClick={() => setStudentSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Student Results List */}
              {(() => {
                const filteredStudents = transportStudents.filter(st => {
                  const matchesStatus = 
                    studentSearchStatusFilter === 'todos' ||
                    (studentSearchStatusFilter === 'vinculados' && st.status === 'Vinculado') ||
                    (studentSearchStatusFilter === 'aguardando' && st.status === 'Aguardando Vinculação');
                  
                  const q = studentSearchQuery.toLowerCase().trim();
                  const matchesQuery = !q ||
                    st.name.toLowerCase().includes(q) ||
                    st.matricula.toLowerCase().includes(q) ||
                    st.grade.toLowerCase().includes(q) ||
                    st.parentName.toLowerCase().includes(q) ||
                    st.address.toLowerCase().includes(q);

                  return matchesStatus && matchesQuery;
                });

                if (filteredStudents.length === 0) {
                  return (
                    <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
                      <Users className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-sm font-bold text-slate-300">Nenhum estudante encontrado com o termo informado.</p>
                      <p className="text-xs text-slate-500">Verifique se o nome, matrícula ou responsável foi digitado corretamente.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredStudents.map(st => {
                      const linkedVehicle = st.vehicleId ? transportVehicles.find(v => v.id === st.vehicleId) : null;

                      return (
                        <div 
                          key={st.id}
                          className={`bg-slate-950 border rounded-2xl p-4 space-y-3 transition-all ${
                            st.status === 'Vinculado' ? 'border-emerald-500/30 bg-gradient-to-b from-slate-950 to-slate-900/50' : 'border-amber-500/30'
                          }`}
                        >
                          {/* Student Info Header */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-850 pb-2.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm shrink-0">
                                {st.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-white truncate">{st.name}</h4>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                  <span className="font-mono text-amber-400 font-semibold">Matrícula: {st.matricula}</span>
                                  <span>•</span>
                                  <span>{st.grade} ({st.shift})</span>
                                </div>
                              </div>
                            </div>

                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                              st.status === 'Vinculado'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            }`}>
                              {st.status === 'Vinculado' ? '🟢 Vinculado' : '🟡 Sem Veículo'}
                            </span>
                          </div>

                          {/* Family & Address Info */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-850">
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Responsável</span>
                              <span className="font-semibold text-slate-200">{st.parentName}</span>
                              <span className="block font-mono text-[10px] text-slate-400">{st.parentPhone}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Endereço Residencial</span>
                              <span className="font-medium text-slate-300 truncate block" title={st.address}>{st.address}</span>
                            </div>
                          </div>

                          {/* Transport Attachment Box */}
                          {linkedVehicle ? (
                            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1">
                                  <Bus className="w-3.5 h-3.5" /> Transportado por:
                                </span>
                                <span className="text-[11px] font-mono font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                                  {linkedVehicle.tipo} {linkedVehicle.numero} ({linkedVehicle.placa})
                                </span>
                              </div>

                              <div className="text-xs space-y-1 text-slate-300">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Linha / Rota:</span>
                                  <span className="font-bold text-white">{linkedVehicle.rota}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Turno:</span>
                                  <span className="font-semibold text-slate-200">{linkedVehicle.turno}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Motorista:</span>
                                  <span className="font-semibold text-white">{linkedVehicle.driverName} ({linkedVehicle.driverPhone})</span>
                                </div>
                                {linkedVehicle.monitorName && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Monitora:</span>
                                    <span className="text-slate-200">{linkedVehicle.monitorName} ({linkedVehicle.monitorPhone})</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                                <button
                                  onClick={() => setViewingVehicleId(linkedVehicle.id)}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold rounded-lg flex items-center gap-1 border border-slate-700 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Ver Veículo Completo
                                </button>

                                <button
                                  onClick={() => unlinkStudentFromVehicle(st.id)}
                                  className="px-2 py-1.5 bg-rose-950/40 hover:bg-rose-950/80 text-rose-300 text-[11px] font-bold rounded-lg border border-rose-800/40 transition-colors"
                                >
                                  Desvincular
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 space-y-2">
                              <span className="text-[11px] font-bold text-amber-300 block">
                                ⚠️ Este estudante ainda não possui veículo de transporte vinculado.
                              </span>
                              <div className="flex items-center gap-2">
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    const vehId = e.target.value;
                                    if (!vehId) return;
                                    const ok = linkStudentToVehicle(st.id, vehId);
                                    if (!ok) alert("⚠️ Veículo Lotado! Capacidade máxima atingida.");
                                  }}
                                  className="bg-slate-900 border border-amber-500/50 text-amber-200 font-bold text-xs rounded-xl p-2 outline-none w-full cursor-pointer hover:border-amber-400"
                                >
                                  <option value="" disabled>+ Selecionar e Vincular Veículo...</option>
                                  {transportVehicles.map(v => {
                                    const isFull = v.studentsIds.length >= v.capacidade;
                                    return (
                                      <option key={v.id} value={v.id} disabled={isFull}>
                                        {v.tipo} {v.numero} ({v.turno}) - {v.studentsIds.length}/{v.capacidade} {isFull ? '❌ LOTADO' : '✅ Vagas'}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Vehicle Cards Grid */
            (() => {
              const filteredVehicles = transportVehicles.filter(v => {
                const matchesShift = selectedShiftFilter === 'Todos' || v.turno === selectedShiftFilter;
                const query = searchVehicleQuery.toLowerCase();
                const matchesQuery = !query || 
                  v.numero.toLowerCase().includes(query) ||
                  v.tipo.toLowerCase().includes(query) ||
                  v.driverName.toLowerCase().includes(query) ||
                  v.rota.toLowerCase().includes(query) ||
                  v.placa.toLowerCase().includes(query);
                return matchesShift && matchesQuery;
              });

              if (filteredVehicles.length === 0) {
                return (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                    <Bus className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-300">Nenhum veículo de transporte encontrado</p>
                    <p className="text-xs text-slate-500">Tente ajustar os filtros por turno ou cadastrar um novo transporte escolar.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredVehicles.map(veh => {
                    const occupied = veh.studentsIds.length;
                    const capacity = veh.capacidade;
                    const freeSlots = capacity - occupied;
                    const isFull = occupied >= capacity;
                    const occPercent = Math.round((occupied / capacity) * 100);

                    // Progress bar color logic
                    let barColor = 'bg-emerald-500';
                    if (occPercent > 95 || isFull) barColor = 'bg-rose-500';
                    else if (occPercent >= 75) barColor = 'bg-amber-500';

                    return (
                      <div 
                        key={veh.id} 
                        className={`bg-slate-900/80 border rounded-2xl p-5 space-y-4 flex flex-col justify-between transition-all hover:border-slate-700 ${
                          isFull ? 'border-rose-500/40 shadow-lg shadow-rose-950/20' : 'border-slate-800'
                        }`}
                      >
                        <div>
                          {/* Vehicle Title & Status Badge */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="p-2.5 rounded-xl bg-slate-950 text-amber-400 border border-slate-800">
                                <Bus className="w-5 h-5" />
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-serif font-bold text-white text-base">
                                    {veh.tipo} {veh.numero}
                                  </h3>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    {veh.placa}
                                  </span>
                                </div>
                                <span className="text-[11px] text-amber-400/90 font-medium block">
                                  📍 Rota: {veh.rota}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                {veh.turno}
                              </span>
                              {isFull ? (
                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1">
                                  ⚠️ LOTADO
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {freeSlots} {freeSlots === 1 ? 'vaga livre' : 'vagas livres'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Crew Info */}
                          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="text-slate-400 font-medium flex items-center gap-1">
                                👨‍✈️ Motorista:
                              </span>
                              <span className="font-bold text-white">{veh.driverName}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                              <span>CNH: {veh.driverCnh}</span>
                              <span>Tel: {veh.driverPhone}</span>
                            </div>

                            <div className="border-t border-slate-850 pt-1.5 flex items-center justify-between text-slate-300">
                              <span className="text-slate-400 font-medium flex items-center gap-1">
                                👩‍🏫 Monitora:
                              </span>
                              <span className="font-semibold text-white">{veh.monitorName || 'Não cadastrada'}</span>
                            </div>
                            {veh.monitorPhone && (
                              <div className="text-right text-[11px] text-slate-400 font-mono">
                                Tel: {veh.monitorPhone}
                              </div>
                            )}
                          </div>

                          {/* Occupancy Progress Bar */}
                          <div className="space-y-1.5 pt-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-medium">Ocupação do Veículo</span>
                              <span className="font-mono font-bold text-white">
                                {occupied} / {capacity} <span className="text-slate-400 font-normal text-[10px]">({occPercent}%)</span>
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                                style={{ width: `${Math.min(occPercent, 100)}%` }} 
                              />
                            </div>
                          </div>

                          {veh.observacoes && (
                            <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-lg mt-3 border border-slate-850">
                              💡 {veh.observacoes}
                            </p>
                          )}
                        </div>

                        {/* Card Action Buttons */}
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80">
                          <button
                            onClick={() => setViewingVehicleId(veh.id)}
                            className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors border border-slate-700"
                            title="Visualizar Passageiros e Rota"
                          >
                            <Eye className="w-3.5 h-3.5" /> Passageiros
                          </button>

                          <button
                            onClick={() => {
                              setEditingVehicleId(veh.id);
                              setVehicleForm({
                                numero: veh.numero,
                                tipo: veh.tipo,
                                driverName: veh.driverName,
                                driverPhone: veh.driverPhone,
                                driverCnh: veh.driverCnh,
                                monitorName: veh.monitorName,
                                monitorPhone: veh.monitorPhone,
                                placa: veh.placa,
                                rota: veh.rota,
                                turno: veh.turno,
                                capacidade: veh.capacidade,
                                observacoes: veh.observacoes || ''
                              });
                              setIsAddVehicleModalOpen(true);
                            }}
                            className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors border border-slate-700"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>

                          <button
                            onClick={() => {
                              setVehicleToDeleteId(veh.id);
                            }}
                            className="px-2 py-2 bg-slate-800 hover:bg-rose-950/50 text-rose-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors border border-slate-700 hover:border-rose-800/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}

          {/* MODAL 1: Cadastrar / Editar Veículo de Transporte */}
          {isAddVehicleModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 my-8 shadow-2xl relative">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Bus className="w-5 h-5" />
                    </span>
                    <h3 className="font-serif text-lg font-bold text-white">
                      {editingVehicleId ? 'Editar Cadastro de Transporte' : 'Cadastrar Novo Transporte Escolar'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsAddVehicleModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!vehicleForm.numero || !vehicleForm.driverName || !vehicleForm.placa) {
                      alert("Por favor, preencha os campos obrigatórios (Número, Placa e Motorista).");
                      return;
                    }

                    if (editingVehicleId) {
                      updateTransportVehicle({
                        id: editingVehicleId,
                        ...vehicleForm,
                        studentsIds: transportVehicles.find(v => v.id === editingVehicleId)?.studentsIds || []
                      });
                    } else {
                      addTransportVehicle(vehicleForm);
                    }

                    setIsAddVehicleModalOpen(false);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Tipo de Veículo *
                      </label>
                      <select
                        value={vehicleForm.tipo}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, tipo: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                      >
                        <option value="Ônibus">Ônibus</option>
                        <option value="Van">Van</option>
                        <option value="Micro-ônibus">Micro-ônibus</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Prefixo / Número *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 05, 12, A-01"
                        value={vehicleForm.numero}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, numero: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Placa do Veículo *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: ABC-1D23"
                        value={vehicleForm.placa}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, placa: maskPlaca(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white uppercase outline-none focus:border-amber-500/50"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Turno de Atendimento *
                      </label>
                      <select
                        value={vehicleForm.turno}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, turno: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                      >
                        <option value="1º Turno">1º Turno (Matutino)</option>
                        <option value="2º Turno">2º Turno (Vespertino)</option>
                        <option value="3º Turno">3º Turno (Noturno)</option>
                        <option value="Educação Infantil">Educação Infantil</option>
                        <option value="EJA">EJA</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Capacidade Máxima (Vagas) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={vehicleForm.capacidade}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, capacidade: Number(e.target.value) || 15 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Linha / Rota *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Zona Norte - Centro"
                        value={vehicleForm.rota}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, rota: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                        required
                      />
                    </div>
                  </div>

                  {/* Motorista e Monitora */}
                  <div className="border-t border-slate-800 pt-3 space-y-3">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Equipe do Veículo (Motorista e Monitora)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Nome do Motorista *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: José Carlos Silveira"
                          value={vehicleForm.driverName}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Telefone do Motorista
                        </label>
                        <input
                          type="text"
                          placeholder="(31) 99999-8888"
                          value={vehicleForm.driverPhone}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, driverPhone: maskCellPhone(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          CNH do Motorista
                        </label>
                        <input
                          type="text"
                          placeholder="12345678900"
                          value={vehicleForm.driverCnh}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, driverCnh: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Nome da Monitora
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Maria Oliveira"
                          value={vehicleForm.monitorName}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, monitorName: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Telefone da Monitora
                        </label>
                        <input
                          type="text"
                          placeholder="(31) 98888-7777"
                          value={vehicleForm.monitorPhone}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, monitorPhone: maskCellPhone(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Observações / Acessibilidade
                    </label>
                    <textarea
                      placeholder="Ex: Veículo com elevador PWD e ar-condicionado."
                      value={vehicleForm.observacoes}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, observacoes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500/50 h-20 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddVehicleModalOpen(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10"
                    >
                      {editingVehicleId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL 2: Visualizar Detalhes do Veículo e Lista de Passageiros */}
          {(() => {
            if (!viewingVehicleId) return null;
            const targetVehicle = transportVehicles.find(v => v.id === viewingVehicleId);
            if (!targetVehicle) return null;

            const vehicleStudents = transportStudents.filter(s => targetVehicle.studentsIds.includes(s.id));
            const occupied = targetVehicle.studentsIds.length;
            const capacity = targetVehicle.capacidade;
            const isFull = occupied >= capacity;
            const unlinkedStudents = transportStudents.filter(s => s.status === 'Aguardando Vinculação');

            return (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 space-y-5 my-8 shadow-2xl relative max-h-[90vh] flex flex-col">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Bus className="w-6 h-6" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-xl font-bold text-white">
                            {targetVehicle.tipo} {targetVehicle.numero}
                          </h3>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {targetVehicle.placa}
                          </span>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            {targetVehicle.turno}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          📍 Rota: <strong className="text-white">{targetVehicle.rota}</strong> • Motorista: <strong className="text-white">{targetVehicle.driverName}</strong> ({targetVehicle.driverPhone})
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setViewingVehicleId(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body Content - Scrollable */}
                  <div className="space-y-5 overflow-y-auto pr-1 flex-1">
                    {/* Capacity Badge Banner */}
                    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="space-y-1 w-full sm:w-auto">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Ocupação e Vagas Inteligentes</span>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold font-serif text-white">{occupied} / {capacity}</span>
                          {isFull ? (
                            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              ⚠️ VEÍCULO LOTADO
                            </span>
                          ) : (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ✅ {capacity - occupied} vagas livres
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Add Unlinked Student to this Vehicle */}
                      <div className="w-full sm:w-auto">
                        {isFull ? (
                          <div className="text-xs text-rose-400 font-bold bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40 text-center">
                            ⛔ Capacidade máxima atingida. Não é possível vincular novos alunos.
                          </div>
                        ) : (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              const stId = e.target.value;
                              if (!stId) return;
                              const ok = linkStudentToVehicle(stId, targetVehicle.id);
                              if (!ok) alert("Veículo Lotado!");
                              e.target.value = "";
                            }}
                            className="bg-slate-900 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl p-2.5 outline-none cursor-pointer w-full"
                          >
                            <option value="" disabled>+ Incluir Estudante neste Veículo</option>
                            {unlinkedStudents.map(st => (
                              <option key={st.id} value={st.id}>
                                {st.name} ({st.grade} - {st.shift})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Passenger Manifest */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-serif text-sm font-bold text-white flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-400" /> Relação Oficial de Passageiros
                        </h4>
                        <span className="text-xs text-slate-400">
                          Total: {vehicleStudents.length} estudantes
                        </span>
                      </div>

                      {vehicleStudents.length === 0 ? (
                        <div className="p-8 text-center bg-slate-950/50 border border-slate-800 rounded-xl text-slate-500 text-xs">
                          Nenhum estudante vinculado a este veículo ainda.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {vehicleStudents.map(st => (
                            <div key={st.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-white">{st.name}</span>
                                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-800 text-slate-300">
                                    Matrícula: {st.matricula}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {st.grade} ({st.classId}) • Responsável: <strong className="text-slate-300">{st.parentName}</strong> ({st.parentPhone})
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Boarding Status Toggle Buttons */}
                                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 gap-1">
                                  <button
                                    onClick={() => updateStudentBoardingStatus(st.id, 'Embarcado')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                                      st.boardingStatus === 'Embarcado'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    🟢 Embarcado
                                  </button>
                                  <button
                                    onClick={() => updateStudentBoardingStatus(st.id, 'Aguardando')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                                      st.boardingStatus === 'Aguardando'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    🟡 Aguardando
                                  </button>
                                  <button
                                    onClick={() => updateStudentBoardingStatus(st.id, 'Ausente')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                                      st.boardingStatus === 'Ausente'
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    🔴 Ausente
                                  </button>
                                </div>

                                <button
                                  onClick={() => unlinkStudentFromVehicle(st.id)}
                                  className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-800/30 transition-colors"
                                  title="Desvincular estudante do veículo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* GPS Route Tracker Live Simulator */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-emerald-400" /> Rastreamento e Telemetria de Rota em Tempo Real
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold animate-pulse">
                          GPS Online
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                          <span className="text-[9px] text-slate-400 block uppercase">Origem</span>
                          <span className="font-bold text-white">Garagem Central</span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                          <span className="text-[9px] text-slate-400 block uppercase">Status da Linha</span>
                          <span className="font-bold text-emerald-400">Em Rota de Coleta</span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                          <span className="text-[9px] text-slate-400 block uppercase">Destino</span>
                          <span className="font-bold text-amber-300">Unidade Sede Classium</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end pt-3 border-t border-slate-800">
                    <button
                      onClick={() => setViewingVehicleId(null)}
                      className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* MODAL 3: Relatórios do Transporte Escolar */}
          {isReportModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 space-y-5 my-8 shadow-2xl relative">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <h3 className="font-serif text-lg font-bold text-white">
                      Relatórios Gerenciais do Transporte Escolar
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsReportModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Report Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                  <button
                    onClick={() => setActiveReportTab('drivers')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                      activeReportTab === 'drivers'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Motoristas & Monitores
                  </button>

                  <button
                    onClick={() => setActiveReportTab('capacity')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                      activeReportTab === 'capacity'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Capacidade & Ocupação
                  </button>

                  <button
                    onClick={() => setActiveReportTab('unlinked')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                      activeReportTab === 'unlinked'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Estudantes Sem Transporte ({transportStudents.filter(s => s.status === 'Aguardando Vinculação').length})
                  </button>

                  <button
                    onClick={() => setActiveReportTab('routes')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                      activeReportTab === 'routes'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Passageiros por Rota
                  </button>
                </div>

                {/* Printable Report Output Container */}
                <div className="bg-white text-slate-900 rounded-xl p-6 space-y-4 max-h-[60vh] overflow-y-auto font-sans shadow-inner">
                  {/* Official Header */}
                  <div className="text-center border-b border-slate-200 pb-4">
                    <h2 className="text-lg font-bold font-serif uppercase tracking-wide text-slate-900">
                      {schoolInfo?.name || 'CLASSIUM SISTEMAS EDUCACIONAIS'}
                    </h2>
                    <p className="text-xs font-bold text-slate-600 uppercase">
                      RELATÓRIO OFICIAL DE TRANSPORTE ESCOLAR INTELIGENTE
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')} • Sistema Auditado
                    </p>
                  </div>

                  {/* Tab 1: Motoristas e Monitores */}
                  {activeReportTab === 'drivers' && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase border-b pb-1">
                        RELAÇÃO DE VEÍCULOS, MOTORISTAS E MONITORES
                      </h3>
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                            <th className="p-2">Veículo</th>
                            <th className="p-2">Placa</th>
                            <th className="p-2">Turno</th>
                            <th className="p-2">Motorista (CNH / Tel)</th>
                            <th className="p-2">Monitora (Tel)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {transportVehicles.map(v => (
                            <tr key={v.id} className="hover:bg-slate-50">
                              <td className="p-2 font-bold">{v.tipo} {v.numero}</td>
                              <td className="p-2 font-mono">{v.placa}</td>
                              <td className="p-2">{v.turno}</td>
                              <td className="p-2">{v.driverName} <span className="text-[10px] text-slate-500 block">CNH: {v.driverCnh} • Tel: {v.driverPhone}</span></td>
                              <td className="p-2">{v.monitorName || 'N/A'} <span className="text-[10px] text-slate-500 block">{v.monitorPhone}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tab 2: Capacidade e Ocupação */}
                  {activeReportTab === 'capacity' && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase border-b pb-1">
                        DEMONSTRATIVO DE CAPACIDADE E OCUPAÇÃO DE VAGAS
                      </h3>
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                            <th className="p-2">Veículo</th>
                            <th className="p-2">Turno</th>
                            <th className="p-2">Capacidade Max.</th>
                            <th className="p-2">Passageiros Vinculados</th>
                            <th className="p-2">Vagas Livres</th>
                            <th className="p-2">Taxa de Ocupação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {transportVehicles.map(v => {
                            const occ = v.studentsIds.length;
                            const cap = v.capacidade;
                            const pct = Math.round((occ / cap) * 100);
                            return (
                              <tr key={v.id} className="hover:bg-slate-50">
                                <td className="p-2 font-bold">{v.tipo} {v.numero}</td>
                                <td className="p-2">{v.turno}</td>
                                <td className="p-2 font-mono font-bold">{cap}</td>
                                <td className="p-2 font-mono font-bold text-blue-700">{occ}</td>
                                <td className="p-2 font-mono font-bold text-emerald-700">{cap - occ}</td>
                                <td className="p-2 font-mono font-bold">{pct}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tab 3: Estudantes Sem Transporte */}
                  {activeReportTab === 'unlinked' && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase border-b pb-1">
                        ESTUDANTES SOLICITANTES DE TRANSPORTE SEM VINCULAÇÃO
                      </h3>
                      {transportStudents.filter(s => s.status === 'Aguardando Vinculação').length === 0 ? (
                        <p className="text-xs text-slate-500 p-4 text-center">Nenhum estudante aguardando vinculação.</p>
                      ) : (
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                              <th className="p-2">Nome do Estudante</th>
                              <th className="p-2">Turma</th>
                              <th className="p-2">Turno</th>
                              <th className="p-2">Responsável Legal</th>
                              <th className="p-2">Telefone Contato</th>
                              <th className="p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {transportStudents.filter(s => s.status === 'Aguardando Vinculação').map(st => (
                              <tr key={st.id} className="hover:bg-slate-50">
                                <td className="p-2 font-bold">{st.name}</td>
                                <td className="p-2">{st.grade}</td>
                                <td className="p-2">{st.shift}</td>
                                <td className="p-2">{st.parentName}</td>
                                <td className="p-2 font-mono">{st.parentPhone}</td>
                                <td className="p-2 font-bold text-amber-600">🟡 Aguardando Vinculação</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Tab 4: Relação de Passageiros por Rota */}
                  {activeReportTab === 'routes' && (
                    <div className="space-y-4">
                      {transportVehicles.map(v => {
                        const passengers = transportStudents.filter(s => v.studentsIds.includes(s.id));
                        return (
                          <div key={v.id} className="border border-slate-300 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between items-center bg-slate-100 p-2 rounded">
                              <span className="font-bold text-xs text-slate-900">
                                {v.tipo} {v.numero} • Rota: {v.rota} ({v.turno})
                              </span>
                              <span className="text-[11px] font-mono text-slate-600 font-bold">
                                Motorista: {v.driverName} • Passageiros: {passengers.length}/{v.capacidade}
                              </span>
                            </div>

                            {passengers.length === 0 ? (
                              <p className="text-[11px] text-slate-500 italic p-2">Sem passageiros cadastrados.</p>
                            ) : (
                              <table className="w-full text-[11px] text-left border-collapse">
                                <thead>
                                  <tr className="border-b text-slate-600 font-bold">
                                    <th className="p-1">Estudante</th>
                                    <th className="p-1">Turma</th>
                                    <th className="p-1">Responsável</th>
                                    <th className="p-1">Telefone</th>
                                    <th className="p-1">Status Embarque</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {passengers.map(p => (
                                    <tr key={p.id} className="border-b border-slate-100">
                                      <td className="p-1 font-bold">{p.name}</td>
                                      <td className="p-1">{p.grade}</td>
                                      <td className="p-1">{p.parentName}</td>
                                      <td className="p-1 font-mono">{p.parentPhone}</td>
                                      <td className="p-1 font-bold">{p.boardingStatus || 'Aguardando'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Print & Action Controls */}
                <div className="flex justify-between items-center border-t border-slate-800 pt-3">
                  <span className="text-xs text-slate-400">
                    Sincronizado em tempo real com o banco de dados do Classium
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-4 h-4" /> Imprimir Relatório
                    </button>
                    <button
                      onClick={() => setIsReportModalOpen(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB ALIMENTACAO */}
      {tab === 'alimentacao' && (
        <CentralAlimentacaoEscolar schoolId={selectedUnit} />
      )}

      {/* 6. TAB PATRIMONIO */}
      {tab === 'patrimonio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-serif text-sm font-bold text-white">Inventário de Ativos (QR Code Label)</h3>
            <p className="text-xs text-slate-400">Clique em qualquer patrimônio físico para ler os registros de manutenção e termos de garantia.</p>

            <div className="space-y-3">
              {patrimonioItems.map(p => (
                <div 
                  key={p.code} 
                  onClick={() => setSelectedPat(p.code)}
                  className={`p-3 border rounded-xl flex justify-between items-center cursor-pointer transition-all ${
                    selectedPat === p.code 
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37]' 
                      : 'bg-slate-950 border-slate-850 hover:border-slate-800'
                  }`}
                >
                  <div className="text-xs">
                    <span className="font-mono text-[9px] text-[#D4AF37] font-bold block">{p.code}</span>
                    <span className="font-bold text-white block">{p.name}</span>
                    <span className="text-[10px] text-slate-400 block">{p.room}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    p.status === 'Ativo' ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-400'
                  }`}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between min-h-[250px] text-center">
            {selectedPat ? (
              <div className="space-y-4 text-xs text-left">
                <span className="text-xs bg-[#D4AF37]/20 text-[#D4AF37] px-3 py-1 rounded-full font-bold uppercase">QR Code Escaneado: {selectedPat}</span>
                
                <div className="p-4 bg-slate-950 rounded-xl space-y-2 border border-slate-800">
                  <p><strong>Fabricante/Modelo:</strong> Dell Latitude 5430</p>
                  <p><strong>Garantia Estendida:</strong> Válida até Março/2029</p>
                  <p><strong>Última Manutenção:</strong> Limpeza e formatação em 12/02/2026</p>
                </div>
              </div>
            ) : (
              <div className="my-auto space-y-2">
                <Package className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400 italic">Selecione um ativo físico do inventário escolar para ler dados e relatórios de garantia.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. TAB BIBLIOTECA */}
      {tab === 'biblioteca' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-serif text-sm font-bold text-white">Acervo e Controle de Empréstimos</h3>
            <p className="text-xs text-slate-400">Gerencie multas de livros atrasados e reservas de alunos.</p>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-2">Livro</th>
                    <th className="pb-2">Retirado por</th>
                    <th className="pb-2">Prazo</th>
                    <th className="pb-2 text-right">Multa Acumulada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {bookLoans.map(b => (
                    <tr key={b.code} className="text-slate-300 hover:bg-white/5">
                      <td className="py-2.5"><strong>{b.title}</strong><span className="block text-[10px] text-slate-500">{b.author}</span></td>
                      <td className="py-2.5">{b.borrower}</td>
                      <td className="py-2.5 font-mono">{b.dueDate}</td>
                      <td className={`py-2.5 text-right font-mono font-bold ${b.fine !== 'R$ 0,00' ? 'text-rose-400' : 'text-green-400'}`}>{b.fine}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-serif text-sm font-bold text-white border-b border-slate-800 pb-2">Acervo Digital QR Code</h3>
            <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2 text-center">
              <div className="w-24 h-24 bg-white mx-auto p-2 rounded-lg flex items-center justify-center">
                <span className="text-xs font-mono font-bold text-slate-900">[QR CODE]</span>
              </div>
              <p className="text-xs font-bold text-white mt-2">QRCode de Matrícula da Biblioteca</p>
              <p className="text-[10px] text-slate-400">Estudantes utilizam este código unificado na portaria para efetuar empréstimos rápidos.</p>
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB BI (BUSINESS INTELLIGENCE) */}
      {tab === 'bi' && (
        <div className="space-y-6">
          
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-serif text-md font-bold text-white">Central de Business Intelligence (+80 Indicadores)</h3>
              <p className="text-xs text-slate-400">Cruzamento global de dados com gráficos interativos.</p>
            </div>
            
            <div className="flex gap-2 text-xs">
              <select value={biFilter} onChange={(e) => setBiFilter(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-semibold">
                <option value="2026">Ano Letivo: 2026</option>
                <option value="2025">Ano Letivo: 2025</option>
              </select>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl text-left">
              <h4 className="font-serif text-xs font-bold text-white mb-4 uppercase tracking-wider">Histórico de Faturamento e Receita</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="month" stroke="#94A3B8" style={{ fontSize: '10px' }} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '10px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#fff' }} />
                    <Area type="monotone" dataKey="faturamento" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorFat)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl text-left">
              <h4 className="font-serif text-xs font-bold text-white mb-4 uppercase tracking-wider">Adesão e Novas Matrículas</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="month" stroke="#94A3B8" style={{ fontSize: '10px' }} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '10px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#fff' }} />
                    <Bar dataKey="matriculas" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB CARREIRA & BENEFÍCIOS (CLASSIUM CARREIRA & BENEFÍCIOS MARKETPLACE) */}
      {(tab === 'ia' || tab === 'carreira') && (
        <EducaCarreiraEBeneficios />
      )}

      {/* 9.5. TAB ECOSISTEMA COMERCIAL & HOMOLOGAÇÃO */}
      {tab === 'comercial' && (
        <CommercialAdminModule />
      )}

      {/* 10. TAB CONFIGURACOES & SEGURANÇA */}
      {tab === 'configuracoes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4 text-left">
            <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#D4AF37]" /> Configurações de Controle de Acesso (RBAC)
            </h3>
            <p className="text-xs text-slate-400">Configure permissões exclusivas por cargo para proteção de dados conforme a LGPD.</p>

            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-left border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[9px]">
                    <th className="pb-2">Nível de Cargo</th>
                    <th className="pb-2 text-center">Visualizar Finanças</th>
                    <th className="pb-2 text-center">Alterar Notas</th>
                    <th className="pb-2 text-center">Auditar Usuários</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr className="text-slate-300">
                    <td className="py-2 font-bold text-white">Diretoria Executiva</td>
                    <td className="py-2 text-center">✓ Sim</td>
                    <td className="py-2 text-center">✓ Sim</td>
                    <td className="py-2 text-center">✓ Sim</td>
                  </tr>
                  <tr className="text-slate-300">
                    <td className="py-2 font-bold text-white">Secretaria Geral</td>
                    <td className="py-2 text-center">✓ Sim</td>
                    <td className="py-2 text-center text-rose-400">✗ Não</td>
                    <td className="py-2 text-center text-rose-400">✗ Não</td>
                  </tr>
                  <tr className="text-slate-300">
                    <td className="py-2 font-bold text-white">Coordenação Pedagógica</td>
                    <td className="py-2 text-center text-rose-400">✗ Não</td>
                    <td className="py-2 text-center">✓ Sim</td>
                    <td className="py-2 text-center">✓ Sim</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* MFA Security box */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <div className="space-y-1">
                <p className="font-bold text-white">Autenticação Multifator Obrigatória (MFA)</p>
                <p className="text-[10px] text-slate-400">Exige verificação extra por celular ao acessar dados do DRE.</p>
              </div>
              <button 
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase text-[10px] transition-all ${
                  mfaEnabled ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {mfaEnabled ? 'Habilitado' : 'Desabilitado'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#D4AF37]" /> Integridade e Saúde da Plataforma
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Espaço em Nuvem</span>
                  <span className="text-[#D4AF37]">4.2 GB / 50 GB</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: '8.4%' }} />
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-mono">Status de Backups</p>
                <p className="font-bold text-white">Diário Agendado Ativo</p>
                <p className="text-[10px] text-green-400">✓ Próximo envio agendado: Hoje às 23:59</p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-mono">Latência do Servidor</p>
                <p className="font-bold text-white">12 ms (Estável)</p>
                <p className="text-[10px] text-green-400">✓ Conectado ao Cloud Run em São Paulo</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11. TAB ACHADOS & PERDIDOS */}
      {tab === 'achados-perdidos' && (
        <AdminLostFound />
      )}

      {/* 12. TAB QR CODE PORTARIA */}
      {tab === 'portaria-qrcode' && (
        <AdminGateQRCode />
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE UNIDADE (EVITA O WINDOW.CONFIRM QUE É BLOQUEADO NO IFRAME) */}
      {unitToDelete && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-rose-500/30 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 text-left space-y-6">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-white">Confirmar Exclusão de Unidade</h4>
                <p className="text-[10px] text-slate-400">Esta ação é irreversível.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Deseja realmente excluir a unidade escolar <strong className="text-white">"{schoolUnits.find(u => u.id === unitToDelete)?.name}"</strong>? Todos os dados cadastrais associados serão removidos do painel.
            </p>

            <div className="flex gap-3 justify-end text-xs">
              <button
                onClick={() => setUnitToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteUnit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-rose-950/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Unidade</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE VEÍCULO (EVITA O WINDOW.CONFIRM QUE É BLOQUEADO NO IFRAME) */}
      {vehicleToDeleteId && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-rose-500/30 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 text-left space-y-6">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-white">Confirmar Exclusão de Veículo</h4>
                <p className="text-[10px] text-slate-400">Esta ação é irreversível.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Deseja realmente excluir o veículo de transporte <strong className="text-white">"{transportVehicles.find(v => v.id === vehicleToDeleteId)?.tipo} {transportVehicles.find(v => v.id === vehicleToDeleteId)?.numero}"</strong>? Os passageiros vinculados serão desvinculados para o painel de pendências automaticamente.
            </p>

            <div className="flex gap-3 justify-end text-xs">
              <button
                onClick={() => setVehicleToDeleteId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteTransportVehicle(vehicleToDeleteId);
                  setVehicleToDeleteId(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-rose-950/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Veículo</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
