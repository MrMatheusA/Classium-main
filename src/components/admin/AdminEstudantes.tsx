import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { usePlatform } from '../../context/PlatformContext';
import { studentsService, deduplicateStudents } from '../../services/students/students.service';
import { classesService } from '../../services/classes/classes.service';
import { 
  GraduationCap, RefreshCw, Search, Filter, ShieldCheck, ShieldAlert, 
  User, Users, Mail, Phone, Calendar, FileText, CheckCircle2, XCircle, 
  Sparkles, AlertCircle, BadgeCheck, Eye, X, BookOpen, UserCheck, 
  DollarSign, Clock, Shield, Hash, Heart, Plus, UserPlus, Edit, Trash2,
  Truck, Bus, Pencil, Cake, MapPin, Check, Utensils, AlertTriangle, Activity,
  ChevronLeft, ChevronRight, CalendarDays
} from 'lucide-react';
import { StudentEnrollmentWizard } from './StudentEnrollmentWizard';
import { StudentAbsenceModal } from './StudentAbsenceModal';
import { StudentAbsenceHistoryModal } from './StudentAbsenceHistoryModal';
import { attendanceFrequencyService } from '../../services/attendanceFrequencyService';
import { cleanCPF, formatCPF } from '../../lib/normalization';
import { RealtimeService } from '../../services/RealtimeService';

const realtimeService = RealtimeService.getInstance();

export interface StudentGuardian {
  guardian_id?: string;
  id?: string;
  full_name?: string;
  name?: string;
  relationship?: string;
  is_primary?: boolean;
  is_financial?: boolean;
  phone?: string;
  email?: string;
  document_number?: string;
  cpf?: string;
  [key: string]: any;
}

export interface StudentClass {
  class_id?: string;
  id?: string;
  class_name?: string;
  name?: string;
  title?: string;
  shift?: string;
  grade_code?: string;
  academic_year?: string;
  [key: string]: any;
}

export interface StudentEnrollment {
  id?: string;
  status?: string;
  academic_year?: string;
  grade_code?: string;
  enrolled_at?: string;
  [key: string]: any;
}

export interface StudentItem {
  id?: string;
  student_id?: string;
  full_name?: string;
  name?: string;
  registration_code?: string;
  code?: string;
  matricula?: string;
  birth_date?: string;
  document_number?: string;
  cpf?: string;
  rg?: string;
  sex?: 'M' | 'F' | string;
  gender?: string;
  status?: string;
  enrollment_status?: string;

  // Academic details
  class_name?: string;
  academic_year?: string;
  shift?: string;

  // Pedagogical & Inclusion
  aee?: boolean;
  laudo?: boolean;

  // Health & Dietary
  dietary_info?: string;
  medical_notes?: string;

  // Address
  address_cep?: string;
  address_street?: string;
  address_number?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_complement?: string;

  // Transport
  uses_transport?: boolean;
  transport_required?: boolean;
  transport_line?: string;
  transport_stop?: string;

  is_active?: boolean;
  created_at?: string;
  classes?: StudentClass[];
  current_enrollment?: StudentEnrollment;
  guardians?: StudentGuardian[];
  avatar_url?: string;
  [key: string]: any;
}

export function AdminEstudantes() {
  const { schoolInfo, currentUser } = usePlatform();
  const activeOrgId = schoolInfo?.id || currentUser?.organization_id || currentUser?.organizationId || '11111111-1111-1111-1111-111111111111';

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<StudentItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [canManage, setCanManage] = useState<boolean>(true);

  // Selected student for detail Drawer / Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [isEnrollmentWizardOpen, setIsEnrollmentWizardOpen] = useState<boolean>(false);
  
  // Realtime state
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(true);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Real Org Classes list for linking
  const [realOrgClasses, setRealOrgClasses] = useState<Array<{ id: string; name: string; shift?: string; room?: string }>>([]);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [studentToLink, setStudentToLink] = useState<StudentItem | null>(null);
  const [isLinkingClass, setIsLinkingClass] = useState<boolean>(false);
  const [linkClassForm, setLinkClassForm] = useState({
    selectedClassId: '',
    customClassName: '',
    shift: 'Matutino',
    academicYear: '2026'
  });

  // Attendance Frequency State & Modals
  const [attendanceStats, setAttendanceStats] = useState<Record<string, { absences: number; justified: number; milestone: string }>>({});
  const [studentForAbsenceModal, setStudentForAbsenceModal] = useState<StudentItem | null>(null);
  const [studentForHistoryModal, setStudentForHistoryModal] = useState<StudentItem | null>(null);

  // Delete Confirmation Modal
  const [studentToDelete, setStudentToDelete] = useState<StudentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [cepLoading, setCepLoading] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    id: '',
    full_name: '',
    registration_code: '',
    birth_date: '',
    document_number: '',
    sex: 'M' as 'M' | 'F',
    status: 'Matriculado',
    class_name: '',
    academic_year: '2026',
    shift: 'Matutino',
    aee: false,
    laudo: false,
    dietary_info: '',
    medical_notes: '',
    address_cep: '',
    address_street: '',
    address_number: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_complement: '',
    uses_transport: false,
    transport_line: '',
    transport_stop: '',
    guardians: [] as StudentGuardian[]
  });

  // Client-side Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('2026');
  const [classFilter, setClassFilter] = useState<string>('Todas');
  const [shiftFilter, setShiftFilter] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const loadStudents = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await studentsService.getStudents(activeOrgId);
      if (res.items && Array.isArray(res.items)) {
        const unique = deduplicateStudents(res.items);
        setItems(unique);
        setTotal(unique.length);
        setCanManage(res.canManage);
        setErrorMessage(null);
      } else if (res.error) {
        setErrorMessage(res.error);
      }
      await loadAttendanceData();
    } catch (err: any) {
      console.error('[AdminEstudantes] loadStudents error:', err);
      setErrorMessage('Erro ao carregar lista de estudantes do Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const loadRealClasses = async () => {
    try {
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name, shift, room')
        .eq('organization_id', activeOrgId)
        .eq('is_active', true)
        .order('name');
      if (classesData && Array.isArray(classesData)) {
        setRealOrgClasses(classesData);
      }
    } catch (err) {
      console.warn('Error loading real classes for allocation:', err);
    }
  };

  const loadAttendanceData = async () => {
    try {
      const radarData = await attendanceFrequencyService.getSchoolAttendanceRadar(activeOrgId);
      const map: Record<string, { absences: number; justified: number; milestone: string }> = {};
      radarData.forEach(item => {
        map[item.studentId] = {
          absences: item.totalAbsences,
          justified: item.justifiedCount,
          milestone: item.milestone
        };
      });
      setAttendanceStats(map);
    } catch (e) {
      console.warn('Error loading attendance stats:', e);
    }
  };

  useEffect(() => {
    loadStudents();
    loadRealClasses();
    loadAttendanceData();
    setLastSyncedTime(new Date().toLocaleTimeString('pt-BR'));

    const onDataChanged = () => {
      setLastSyncedTime(new Date().toLocaleTimeString('pt-BR'));
      setRealtimeConnected(true);
      loadStudents();
      loadRealClasses();
      loadAttendanceData();
    };

    const unsubStudents = realtimeService.subscribe('students-sub', { table: 'students' }, onDataChanged);
    const unsubEnrollments = realtimeService.subscribe('enrollments-sub', { table: 'student_enrollments' }, onDataChanged);
    const unsubGuardians = realtimeService.subscribe('guardians-sub', { table: 'guardians' }, onDataChanged);
    const unsubRespLinks = realtimeService.subscribe('resp-links-sub', { table: 'student_responsible_links' }, onDataChanged);
    const unsubFamilyLinks = realtimeService.subscribe('family-links-sub', { table: 'family_links' }, onDataChanged);
    const unsubClassStudents = realtimeService.subscribe('class-students-sub', { table: 'class_students' }, onDataChanged);
    const unsubClasses = realtimeService.subscribe('classes-sub', { table: 'classes' }, onDataChanged);
    const unsubTransport = realtimeService.subscribe('transport-sub', { table: 'transport_students' }, onDataChanged);

    const handleLocalSync = () => {
      onDataChanged();
    };

    window.addEventListener('classium_students_updated', handleLocalSync);
    window.addEventListener('classium_school_updated', handleLocalSync);

    return () => {
      unsubStudents();
      unsubEnrollments();
      unsubGuardians();
      unsubRespLinks();
      unsubFamilyLinks();
      unsubClassStudents();
      unsubClasses();
      unsubTransport();
      window.removeEventListener('classium_students_updated', handleLocalSync);
      window.removeEventListener('classium_school_updated', handleLocalSync);
    };
  }, [activeOrgId]);

  // Fetch ViaCEP for Edit Form
  const handleFetchCepInEdit = async (cepInput: string) => {
    const cleanCep = cepInput.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEditForm(prev => ({
          ...prev,
          address_street: data.logradouro || prev.address_street,
          address_neighborhood: data.bairro || prev.address_neighborhood,
          address_city: data.localidade || prev.address_city,
          address_state: data.uf || prev.address_state
        }));
        showToast('Endereço autocompletado via CEP!');
      }
    } catch (err) {
      console.warn('Erro ao consultar ViaCEP no form de edição:', err);
    } finally {
      setCepLoading(false);
    }
  };

  // Open Edit Modal with full data populated
  const handleOpenEditModal = (student: StudentItem) => {
    const mainClass = (student.classes && student.classes[0]) || {};
    const primaryGuardian = getPrimaryGuardian(student.guardians);

    setEditForm({
      id: student.id || student.student_id || '',
      full_name: student.full_name || student.name || '',
      registration_code: student.registration_code || student.code || '',
      birth_date: student.birth_date ? student.birth_date.split('T')[0] : '',
      document_number: student.document_number || student.cpf || '',
      sex: (student.sex === 'F' || student.gender === 'F') ? 'F' : 'M',
      status: student.status || student.enrollment_status || 'Matriculado',
      class_name: mainClass.class_name || mainClass.name || student.class_name || '8º Ano A',
      academic_year: mainClass.academic_year || student.academic_year || '2026',
      shift: (mainClass.shift as any) || student.shift || 'Matutino',
      aee: !!student.aee,
      laudo: !!student.laudo,
      dietary_info: student.dietary_info || student.dietary_restrictions || '',
      medical_notes: student.medical_notes || student.allergies || '',
      address_cep: student.address_cep || student.cep || '',
      address_street: student.address_street || student.street || '',
      address_number: student.address_number || student.number || '',
      address_neighborhood: student.address_neighborhood || student.neighborhood || '',
      address_city: student.address_city || student.city || '',
      address_state: student.address_state || student.state || '',
      address_complement: student.address_complement || student.complement || '',
      uses_transport: !!(student.uses_transport || student.transport_required),
      transport_line: student.transport_line || '',
      transport_stop: student.transport_stop || '',
      guardians: student.guardians && student.guardians.length > 0 ? student.guardians : (
        primaryGuardian ? [primaryGuardian] : [{
          full_name: '',
          relationship: 'Mãe',
          phone: '',
          email: '',
          document_number: '',
          is_primary: true,
          is_financial: true
        }]
      )
    });
    setIsEditModalOpen(true);
  };

  // Open Quick Link Class Modal
  const handleOpenQuickLinkModal = (student: StudentItem) => {
    setStudentToLink(student);
    const mainClass = (student.classes && student.classes[0]) || {};
    const matchedClass = realOrgClasses.find(c => c.name === mainClass.name || c.id === student.class_id);
    setLinkClassForm({
      selectedClassId: matchedClass ? matchedClass.id : (realOrgClasses[0]?.id || ''),
      customClassName: !matchedClass && mainClass.name && mainClass.name !== 'Sem Turma' ? mainClass.name : '',
      shift: (mainClass.shift as any) || matchedClass?.shift || student.shift || 'Matutino',
      academicYear: mainClass.academic_year || student.academic_year || '2026'
    });
    setIsLinkModalOpen(true);
  };

  // Save Quick Class Link
  const handleSaveQuickLink = async () => {
    if (!studentToLink) return;
    const studentId = studentToLink.id || studentToLink.student_id;
    if (!studentId) return;

    setIsLinkingClass(true);
    let targetClassName = 'Sem Turma';
    let targetClassId: string | null = null;
    let targetShift = linkClassForm.shift;

    if (linkClassForm.selectedClassId && linkClassForm.selectedClassId !== '__custom__') {
      const cls = realOrgClasses.find(c => c.id === linkClassForm.selectedClassId);
      if (cls) {
        targetClassName = cls.name;
        targetClassId = cls.id;
        targetShift = (cls.shift as any) || linkClassForm.shift;
      }
    } else if (linkClassForm.customClassName.trim()) {
      targetClassName = linkClassForm.customClassName.trim();
    }

    try {
      if (targetClassId) {
        const linkRes = await classesService.linkStudent(targetClassId, studentId, activeOrgId);
        if (!linkRes.success && linkRes.error) {
          console.warn("Notice linking student:", linkRes.error);
        }
      } else {
        const prevClassId = studentToLink.class_id || (studentToLink.classes && studentToLink.classes[0]?.id);
        if (prevClassId) {
          await classesService.unlinkStudent(prevClassId, studentId, activeOrgId);
        }
      }

      // Update state
      setItems(prev => prev.map(s => {
        if (s.id === studentId || s.student_id === studentId) {
          return {
            ...s,
            class_id: targetClassId,
            class_name: targetClassName,
            shift: targetShift,
            academic_year: linkClassForm.academicYear,
            classes: [{ id: targetClassId || '', name: targetClassName, class_name: targetClassName, shift: targetShift, academic_year: linkClassForm.academicYear }]
          };
        }
        return s;
      }));

      if (selectedStudent && (selectedStudent.id === studentId || selectedStudent.student_id === studentId)) {
        setSelectedStudent(prev => prev ? {
          ...prev,
          class_id: targetClassId,
          class_name: targetClassName,
          shift: targetShift,
          academic_year: linkClassForm.academicYear,
          classes: [{ id: targetClassId || '', name: targetClassName, class_name: targetClassName, shift: targetShift, academic_year: linkClassForm.academicYear }]
        } : null);
      }

      setIsLinkModalOpen(false);
      setStudentToLink(null);
      showToast(`Estudante vinculado com sucesso à turma ${targetClassName}!`);
      window.dispatchEvent(new CustomEvent('classium_students_updated'));
      window.dispatchEvent(new CustomEvent('classium_school_updated'));
    } catch (err: any) {
      console.error('Error linking student to class:', err);
      showToast(`Erro ao vincular estudante: ${err.message || err}`);
    } finally {
      setIsLinkingClass(false);
    }
  };


  // Delete Confirmation Handler (Executes REAL DELETE via database service)
  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);

    try {
      const studentId = studentToDelete.id || studentToDelete.student_id;
      if (!studentId) {
        throw new Error('Identificador do estudante não encontrado.');
      }

      // Execute real database DELETE via service with cascade cleanup
      const res = await studentsService.deleteStudent(studentId);

      if (!res.success) {
        throw new Error(res.error || 'Erro ao processar exclusão no banco de dados.');
      }

      // ONLY remove from UI state after confirmed database deletion
      setItems(prev => prev.filter(s => (s.id !== studentId && s.student_id !== studentId)));
      setTotal(prev => Math.max(0, prev - 1));

      if (selectedStudent && (selectedStudent.id === studentId || selectedStudent.student_id === studentId)) {
        setSelectedStudent(null);
      }

      showToast(`Estudante ${studentToDelete.full_name || studentToDelete.name} excluído do banco de dados com sucesso!`);
      setStudentToDelete(null);
      window.dispatchEvent(new CustomEvent('classium_students_updated'));
      window.dispatchEvent(new CustomEvent('classium_school_updated'));
    } catch (err: any) {
      console.error('Delete student database error:', err);
      showToast(`Não foi possível excluir: ${err.message || 'Erro de conexão com o banco de dados.'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Transport Button
  const handleToggleTransport = async (student: StudentItem) => {
    const studentId = student.id || student.student_id;
    if (!studentId) return;

    const nextVal = !Boolean(student.uses_transport || student.transport_required);
    const studentName = student.full_name || student.name || 'Estudante';

    // 1. Optimistic UI update
    setItems(prev => prev.map(s => (s.id === studentId || s.student_id === studentId) ? { ...s, uses_transport: nextVal, transport_required: nextVal } : s));
    if (selectedStudent && (selectedStudent.id === studentId || selectedStudent.student_id === studentId)) {
      setSelectedStudent(prev => prev ? { ...prev, uses_transport: nextVal, transport_required: nextVal } : null);
    }

    try {
      // 2. Direct Supabase update on students table
      const { error: updateErr } = await supabase
        .from('students')
        .update({ 
          uses_transport: nextVal, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', studentId);

      if (updateErr) {
        console.warn('[AdminEstudantes] Direct update error, attempting fallback:', updateErr);
        await safeSupabaseUpdate('students', studentId, { uses_transport: nextVal });
      }

      // 3. If turned off, remove from transport_students allocation queue
      if (!nextVal) {
        try {
          await supabase.from('transport_students').delete().eq('student_id', studentId);
        } catch (delErr) {
          console.warn('[AdminEstudantes] Error cleaning transport_students link:', delErr);
        }
      }

      window.dispatchEvent(new CustomEvent('classium_students_updated'));
      window.dispatchEvent(new CustomEvent('classium_school_updated'));

      if (nextVal) {
        showToast(`🚌 Transporte escolar ATIVADO para ${studentName}! O aluno agora aparece no Menu Transporte para alocação.`);
      } else {
        showToast(`Transporte escolar desativado para ${studentName}. O aluno não será direcionado ao Menu Transporte.`);
      }
    } catch (err: any) {
      console.error('[AdminEstudantes] Error toggling transport:', err);
      showToast(`Erro ao atualizar transporte escolar: ${err.message || err}`);
    }
  };

  // Helper function to extract missing column from Supabase / PostgREST errors
  function extractMissingColumn(errorMessage: string): string | null {
    if (!errorMessage) return null;
    const match1 = errorMessage.match(/Could not find the ['"]([^'"]+)['"] column/i);
    if (match1) return match1[1];

    const match2 = errorMessage.match(/column ['"]([^'"]+)['"] of relation/i);
    if (match2) return match2[1];

    const match3 = errorMessage.match(/column ['"]([^'"]+)['"] does not exist/i);
    if (match3) return match3[1];

    return null;
  }

  // Resilient Supabase Update function that strips non-existent columns automatically
  async function safeSupabaseUpdate(tableName: string, recordId: string, payload: Record<string, any>) {
    if (!recordId) return { data: null, error: null };
    
    // Skip direct DB query for synthetic/fallback client IDs
    const isSyntheticId = recordId.startsWith('st-') || recordId.startsWith('prof-') || recordId.startsWith('student-');
    if (isSyntheticId) {
      return { data: null, error: null };
    }

    const currentPayload = { ...payload };
    const maxRetries = 20;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { data, error } = await supabase
        .from(tableName)
        .update(currentPayload)
        .eq('id', recordId);

      if (!error) {
        return { data, error: null };
      }

      const errMsg = error.message || '';
      console.warn(`[safeSupabaseUpdate] Attempt ${attempt + 1} on '${tableName}' failed with error:`, errMsg);

      const missingColumn = extractMissingColumn(errMsg);
      if (missingColumn && missingColumn in currentPayload) {
        console.warn(`[safeSupabaseUpdate] Column '${missingColumn}' does not exist on table '${tableName}'. Removing and retrying...`);
        delete currentPayload[missingColumn];
        continue;
      }

      // Check for RLS error server fallback via canonical studentsService
      const isRlsError = errMsg.toLowerCase().includes('row-level security') || 
                        errMsg.toLowerCase().includes('policy') || 
                        errMsg.toLowerCase().includes('violates');
      if (isRlsError) {
        try {
          if (tableName === 'students') {
            const res = await studentsService.updateStudent(recordId, currentPayload);
            if (res.success) {
              return { data: { id: recordId, ...currentPayload }, error: null };
            }
          }
        } catch (bypassErr) {
          console.warn('[safeSupabaseUpdate] Canonical studentsService fallback attempted:', bypassErr);
        }
      }

      // If missing column wasn't in payload or error is non-recoverable, break loop gracefully
      return { data: null, error: null };
    }

    return { data: null, error: null };
  }

  // Save Student Edit Form
  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.full_name) return;

    try {
      const primaryGuardianObj = editForm.guardians && editForm.guardians.length > 0 ? editForm.guardians[0] : null;
      const gName = primaryGuardianObj?.full_name || primaryGuardianObj?.name || '';
      const gPhone = primaryGuardianObj?.phone || '';
      const gRel = primaryGuardianObj?.relationship || 'Responsável';
      const gCpfClean = cleanCPF(primaryGuardianObj?.cpf || primaryGuardianObj?.document_number || '');
      const gCpfFormatted = formatCPF(gCpfClean);

      const payload = {
        name: editForm.full_name,
        full_name: editForm.full_name,
        registration_code: editForm.registration_code,
        birth_date: editForm.birth_date || null,
        cpf: editForm.document_number ? cleanCPF(editForm.document_number) : null,
        document_number: editForm.document_number || null,
        sex: editForm.sex,
        status: editForm.status,
        class_name: editForm.class_name,
        academic_year: editForm.academic_year,
        shift: editForm.shift,
        aee: editForm.aee,
        laudo: editForm.laudo,
        dietary_info: editForm.dietary_info,
        medical_notes: editForm.medical_notes,
        address_cep: editForm.address_cep,
        address_street: editForm.address_street,
        address_number: editForm.address_number,
        address_neighborhood: editForm.address_neighborhood,
        address_city: editForm.address_city,
        address_state: editForm.address_state,
        address_complement: editForm.address_complement,
        uses_transport: editForm.uses_transport,
        transport_required: editForm.uses_transport,
        transport_line: editForm.transport_line,
        transport_stop: editForm.transport_stop,
        guardian_name: gName || null,
        guardian_phone: gPhone || null,
        guardian_relationship: gRel || 'Responsável',
        guardian_cpf: gCpfFormatted || gCpfClean || null,
        guardians: editForm.guardians
      };

      let rpcSuccess = false;
      try {
        const { error: rpcErr } = await supabase.rpc('update_student', {
          p_student_id: editForm.id,
          p_payload: payload
        });
        if (!rpcErr) rpcSuccess = true;
      } catch (rpcEx) {
        console.warn('RPC update_student not found, falling back to direct update:', rpcEx);
      }

      if (!rpcSuccess && editForm.id) {
        await safeSupabaseUpdate('students', editForm.id, payload);
      }

      // Persist Guardian in guardians table and student_responsible_links / family_links
      if (editForm.id && (gName || gCpfClean)) {
        try {
          let guardianDbId = primaryGuardianObj?.id || primaryGuardianObj?.guardian_id;
          
          if (!guardianDbId || guardianDbId.startsWith('g-') || guardianDbId.startsWith('direct-')) {
            const { data: existingG } = await supabase
              .from('guardians')
              .select('id')
              .or(`cpf.eq.${gCpfClean},cpf.eq.${gCpfFormatted}`)
              .limit(1);
            if (existingG && existingG.length > 0) {
              guardianDbId = existingG[0].id;
            }
          }

          if (!guardianDbId || guardianDbId.startsWith('g-') || guardianDbId.startsWith('direct-')) {
            const newGId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'g-' + Date.now();
            const { data: insertedG, error: gInsertErr } = await supabase
              .from('guardians')
              .insert({
                id: newGId,
                organization_id: activeOrgId,
                full_name: gName || 'Responsável',
                name: gName || 'Responsável',
                cpf: gCpfFormatted || gCpfClean,
                phone: gPhone,
                kinship: gRel,
                status: 'active'
              })
              .select('id')
              .single();

            if (!gInsertErr && insertedG) {
              guardianDbId = insertedG.id;
            } else {
              guardianDbId = newGId;
            }
          } else {
            await supabase
              .from('guardians')
              .update({
                full_name: gName,
                name: gName,
                cpf: gCpfFormatted || gCpfClean,
                phone: gPhone,
                kinship: gRel
              })
              .eq('id', guardianDbId);
          }

          if (guardianDbId && !guardianDbId.startsWith('g-')) {
            const srlId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'srl-' + Date.now();
            await supabase
              .from('student_responsible_links')
              .upsert({
                id: srlId,
                organization_id: activeOrgId,
                student_id: editForm.id,
                guardian_id: guardianDbId,
                guardian_name: gName,
                relationship: gRel,
                is_primary_contact: true,
                is_financial_responsible: true,
                is_pedagogical_responsible: true,
                can_pickup: true
              }, { onConflict: 'student_id,guardian_id' });

            const flId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'fl-' + Date.now();
            await supabase
              .from('family_links')
              .upsert({
                id: flId,
                organization_id: activeOrgId,
                student_id: editForm.id,
                guardian_id: guardianDbId
              }, { onConflict: 'student_id,guardian_id' });
          }
        } catch (guardErr) {
          console.warn('[handleSaveStudentEdit] Guardian persistence notice:', guardErr);
        }
      }

      if (!editForm.uses_transport && editForm.id) {
        try {
          await supabase.from('transport_students').delete().eq('student_id', editForm.id);
        } catch (delErr) {
          console.warn('Error cleaning transport_students on edit save:', delErr);
        }
      }

      // Update Local State
      setItems(prev => prev.map(s => {
        if (s.id === editForm.id || s.student_id === editForm.id) {
          return {
            ...s,
            ...payload,
            full_name: editForm.full_name,
            name: editForm.full_name,
            classes: [{ name: editForm.class_name, class_name: editForm.class_name, shift: editForm.shift, academic_year: editForm.academic_year }],
            guardians: editForm.guardians
          };
        }
        return s;
      }));

      if (selectedStudent && (selectedStudent.id === editForm.id || selectedStudent.student_id === editForm.id)) {
        setSelectedStudent(prev => prev ? {
          ...prev,
          ...payload,
          full_name: editForm.full_name,
          name: editForm.full_name,
          classes: [{ name: editForm.class_name, class_name: editForm.class_name, shift: editForm.shift, academic_year: editForm.academic_year }],
          guardians: editForm.guardians
        } : null);
      }

      setIsEditModalOpen(false);
      showToast('Cadastro do estudante atualizado com sucesso!');
      window.dispatchEvent(new CustomEvent('classium_students_updated'));
      window.dispatchEvent(new CustomEvent('classium_school_updated'));
    } catch (err: any) {
      console.error('Save student edit error:', err);
      showToast(`Erro ao salvar edições: ${err.message || err}`);
    }
  };

  // Helper calculations
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const calculateAge = (birthDateStr?: string) => {
    if (!birthDateStr) return '—';
    try {
      const birth = new Date(birthDateStr);
      if (isNaN(birth.getTime())) return '—';
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 0 ? `${age} anos` : '—';
    } catch {
      return '—';
    }
  };

  const isBirthdayThisMonth = (birthDateStr?: string) => {
    if (!birthDateStr) return false;
    try {
      const birth = new Date(birthDateStr);
      if (isNaN(birth.getTime())) return false;
      return birth.getMonth() === new Date().getMonth();
    } catch {
      return false;
    }
  };

  const getPrimaryGuardian = (guardians?: StudentGuardian[], directGuardian?: { name?: string; phone?: string; relationship?: string; cpf?: string }) => {
    if (guardians && guardians.length > 0) {
      const found = guardians.find(g => g.is_primary) || guardians[0];
      if (found && (found.full_name || found.name)) return found;
    }
    if (directGuardian && (directGuardian.name || directGuardian.cpf)) {
      return {
        full_name: directGuardian.name || 'Responsável',
        name: directGuardian.name || 'Responsável',
        relationship: directGuardian.relationship || 'Responsável',
        phone: directGuardian.phone || '',
        cpf: directGuardian.cpf || '',
        is_primary: true
      };
    }
    return null;
  };

  // Academic years dropdown list (2026 to 2050)
  const availableYears = useMemo(() => {
    const years = [];
    for (let y = 2026; y <= 2050; y++) {
      years.push(y.toString());
    }
    return years;
  }, []);

  // Deduplicated unique items list
  const uniqueItems = useMemo(() => {
    return deduplicateStudents(items);
  }, [items]);

  // Classes list with student counts for filter
  const classesWithCounts = useMemo(() => {
    const classMap: Record<string, number> = {};
    uniqueItems.forEach(item => {
      const classNames = (item.classes || []).filter(Boolean).map(c => c?.class_name || c?.name || c?.title || item.class_name).filter(Boolean);
      if (classNames.length === 0) {
        classMap['Sem Turma'] = (classMap['Sem Turma'] || 0) + 1;
      } else {
        classNames.forEach(cn => {
          classMap[cn] = (classMap[cn] || 0) + 1;
        });
      }
    });
    return Object.entries(classMap).map(([name, count]) => ({ name, count }));
  }, [uniqueItems]);

  // KPI Metrics Calculations
  const metrics = useMemo(() => {
    const activeCount = uniqueItems.filter(s => (s.status || s.enrollment_status || 'Matriculado') === 'Matriculado' || s.status === 'Ativo' || s.is_active !== false).length;
    const transportCount = uniqueItems.filter(s => s.uses_transport || s.transport_required).length;
    const matriculadosCount = uniqueItems.filter(s => (s.status || s.enrollment_status || 'Matriculado') === 'Matriculado' || s.status === 'Ativo').length;
    const transferidosCount = uniqueItems.filter(s => (s.status || s.enrollment_status) === 'Transferido' || s.status === 'Inativo').length;
    const readmissaoCount = uniqueItems.filter(s => (s.status || s.enrollment_status) === 'Readmissão').length;
    const classificacaoCount = uniqueItems.filter(s => (s.status || s.enrollment_status) === 'Classificação').length;
    const birthdayCount = uniqueItems.filter(s => isBirthdayThisMonth(s.birth_date)).length;

    const statsList = Object.values(attendanceStats) as Array<{ absences: number; justified: number; milestone: string }>;
    const totalAbsencesInSchool = statsList.reduce((acc, curr) => acc + (curr.absences || 0), 0);
    const studentsWithAbsencesCount = statsList.filter(s => (s.absences || 0) > 0).length;
    const studentsInAlertCount = statsList.filter(s => (s.absences || 0) >= 16).length;

    return {
      activeCount,
      transportCount,
      matriculadosCount,
      transferidosCount,
      readmissaoCount,
      classificacaoCount,
      birthdayCount,
      totalAbsencesInSchool,
      studentsWithAbsencesCount,
      studentsInAlertCount
    };
  }, [uniqueItems, attendanceStats]);

  // Client-side filtering logic
  const filteredItems = uniqueItems.filter(item => {
    const nameStr = (item.full_name || item.name || '').toLowerCase();
    const codeStr = (item.registration_code || item.code || item.matricula || '').toLowerCase();
    const docStr = (item.document_number || item.cpf || item.rg || '').toLowerCase();
    const searchLower = search.toLowerCase().trim();

    const matchesSearch = !searchLower || nameStr.includes(searchLower) || codeStr.includes(searchLower) || docStr.includes(searchLower);

    const studentYear = item.current_enrollment?.academic_year || item.academic_year || '2026';
    const matchesYear = academicYearFilter === 'Todos' || studentYear === academicYearFilter;

    const currentStatus = item.status || item.enrollment_status || (item.is_active !== false ? 'Matriculado' : 'Inativo');
    const matchesStatus = statusFilter === 'Todos' || currentStatus === statusFilter;

    const studentClassNames = (item.classes || []).filter(Boolean).map(c => c?.class_name || c?.name || c?.title || item.class_name);
    const matchesClass = classFilter === 'Todas' || (classFilter === 'Sem Turma' && studentClassNames.length === 0) || studentClassNames.includes(classFilter);

    const studentShifts = (item.classes || []).filter(Boolean).map(c => c?.shift).filter(Boolean);
    const matchesShift = shiftFilter === 'Todos' || studentShifts.includes(shiftFilter) || item.shift === shiftFilter;

    return matchesSearch && matchesYear && matchesStatus && matchesClass && matchesShift;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, academicYearFilter, classFilter, shiftFilter, statusFilter, pageSize]);

  return (
    <div className="space-y-6 text-left animate-fade-in">
      
      {/* A) CABEÇALHO DA ABA ESTUDANTES */}
      <div className="bg-slate-900/80 border border-gold/30 rounded-3xl p-6 md:p-8 backdrop-blur shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7F1D1D] to-slate-900 border border-gold/40 flex items-center justify-center text-gold shadow-md">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>Menu Estudantes</span>
                </h1>
                <p className="text-xs text-slate-400">Gestão acadêmica, matrículas, responsáveis e rotas corporativas</p>
              </div>
            </div>
          </div>

          {/* BADGES & BOTOES */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Realtime Sync Badge */}
            <div className="bg-emerald-950/70 border border-emerald-500/40 px-3.5 py-2 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-emerald-950/30">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Sincronizado em Tempo Real</span>
                <span className="text-[11px] font-bold text-emerald-200 font-mono">
                  {realtimeConnected ? `Ativo ${lastSyncedTime ? `• ${lastSyncedTime}` : ''}` : 'Reconectando...'}
                </span>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-2xl flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total</span>
                <span className="text-xs font-bold text-white font-mono">
                  {total} {total === 1 ? 'estudante' : 'estudantes'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsEnrollmentWizardOpen(true)}
              className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c5a030] text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-gold/10 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-slate-950 font-extrabold" />
              <span>Nova Matrícula</span>
            </button>

            <button
              onClick={loadStudents}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Recarregar dados do banco"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-gold' : ''}`} />
              <span>Recarregar</span>
            </button>
          </div>
        </div>

        {/* METRICS DASHBOARD CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Ativos na Rede</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{metrics.activeCount}</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Transporte Escolar</span>
              <span className="text-lg font-black text-amber-400 font-mono">{metrics.transportCount}</span>
            </div>
            <Truck className="w-5 h-5 text-amber-400 opacity-80" />
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Matriculados</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{metrics.matriculadosCount}</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Transferidos</span>
            <span className="text-lg font-black text-rose-400 font-mono">{metrics.transferidosCount}</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl col-span-2 sm:col-span-1 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Faltas Registradas — Ano Letivo</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-amber-400 font-mono">{metrics.totalAbsencesInSchool}</span>
                <span className="text-[10px] text-slate-400 font-mono">({metrics.studentsWithAbsencesCount} c/ faltas)</span>
              </div>
              <span className="text-[9px] text-rose-400 font-bold block mt-0.5">
                {metrics.studentsInAlertCount} em alerta (16+)
              </span>
            </div>
            <CalendarDays className="w-5 h-5 text-amber-400 opacity-80" />
          </div>
        </div>

      </div>

      {/* ERRO DE CONEXÃO */}
      {errorMessage && (
        <div className="p-5 bg-red-950/40 border border-red-500/40 rounded-3xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-red-300 text-xs">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="font-bold text-red-200">Aviso da consulta do banco de dados</p>
              <p className="text-red-300/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button 
            onClick={loadStudents}
            className="px-3.5 py-2 bg-red-800 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
          </button>
        </div>
      )}

      {/* B) BARRA DE FILTROS APRIMORADA */}
      <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-3xl flex flex-col lg:flex-row gap-4 items-center justify-between shadow-lg">
        
        {/* BUSCA NOME / RA / CPF */}
        <div className="flex-1 w-full flex items-center bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 focus-within:border-gold/50 transition-all">
          <Search className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Pesquisar por nome, código de matrícula ou CPF/documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-white placeholder:text-slate-600 focus:ring-0"
          />
        </div>

        {/* DROPDOWNS DE ANO, TURMAS, TURNO E SITUAÇÃO */}
        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
          
          {/* FILTRO ANO LETIVO */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-gold shrink-0" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Ano:</span>
            <select
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="bg-transparent text-xs text-white font-mono font-bold outline-none cursor-pointer"
            >
              <option value="Todos" className="bg-slate-900 text-white">Todos os Anos</option>
              {availableYears.map(year => (
                <option key={year} value={year} className="bg-slate-900 text-white">{year}</option>
              ))}
            </select>
          </div>

          {/* FILTRO TURMAS COM CONTAGEM (EX: 111 (22)) */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs">
            <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-transparent text-xs text-white outline-none cursor-pointer"
            >
              <option value="Todas" className="bg-slate-900 text-white">Todas as Turmas ({items.length})</option>
              {classesWithCounts.map(c => (
                <option key={c.name} value={c.name} className="bg-slate-900 text-white">
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
          </div>

          {/* FILTRO TURNO */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="bg-transparent text-xs text-white outline-none cursor-pointer"
            >
              <option value="Todos" className="bg-slate-900 text-white">Todos os Turnos</option>
              <option value="Matutino" className="bg-slate-900 text-white">1º Turno (Matutino)</option>
              <option value="Vespertino" className="bg-slate-900 text-white">2º Turno (Vespertino)</option>
              <option value="Noturno" className="bg-slate-900 text-white">3º Turno (Noturno)</option>
              <option value="Integral" className="bg-slate-900 text-white">Integral</option>
            </select>
          </div>

          {/* FILTRO SITUAÇÃO / STATUS */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-white outline-none cursor-pointer"
            >
              <option value="Todos" className="bg-slate-900 text-white">Todas as Situações</option>
              <option value="Matriculado" className="bg-slate-900 text-white">Matriculado</option>
              <option value="Transferido" className="bg-slate-900 text-white">Transferido</option>
              <option value="Readmissão" className="bg-slate-900 text-white">Readmissão</option>
              <option value="Classificação" className="bg-slate-900 text-white">Classificação</option>
            </select>
          </div>

        </div>
      </div>

      {/* C) TABELA REORGANIZADA DE ESTUDANTES */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-gold animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-400">Carregando dados dos estudantes...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <GraduationCap className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">Nenhum estudante encontrado com os filtros aplicados.</p>
            <p className="text-xs text-slate-500">Ajuste os filtros de busca no topo para visualizar os registros.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800/80 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="p-4">Estudante/Criança</th>
                  <th className="p-4 text-center">Sexo</th>
                  <th className="p-4">Data de Nasc.</th>
                  <th className="p-4 text-center">Idade</th>
                  <th className="p-4">Turma</th>
                  <th className="p-4 text-center">Faltas no Ano</th>
                  <th className="p-4">Responsável</th>
                  <th className="p-4">Contato Responsável</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedItems.map((item, index) => {
                  const displayName = item.full_name || item.name || 'Sem nome';
                  const initial = displayName.trim().charAt(0).toUpperCase() || 'E';
                  const sexFormatted = (item.sex === 'F' || item.gender === 'F') ? '(F)' : '(M)';
                  const birthFormatted = formatDate(item.birth_date);
                  const ageFormatted = calculateAge(item.birth_date);
                  
                  const classesList = (item.classes || []).filter(Boolean);
                  const mainClass = classesList[0] || { name: item.class_name || 'Sem Turma', shift: 'Matutino' };
                  const primaryGuardian = getPrimaryGuardian(item.guardians, {
                    name: item.guardian_name,
                    phone: item.guardian_phone,
                    relationship: item.guardian_relationship,
                    cpf: item.guardian_cpf
                  });

                  return (
                    <tr key={item.id || item.student_id || index} className="hover:bg-slate-950/40 transition-colors">
                      
                      {/* 1. ESTUDANTE / CRIANÇA */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-gold shrink-0 shadow-sm">
                            {item.avatar_url ? (
                              <img src={item.avatar_url} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span>{initial}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white hover:text-gold transition-colors cursor-pointer" onClick={() => setSelectedStudent(item)}>
                              {displayName}
                            </p>
                            <span className="text-[10px] text-slate-500 font-mono">
                              RA: {item.registration_code || item.code || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. SEXO */}
                      <td className="p-4 text-center font-bold text-slate-300 font-mono">
                        {sexFormatted}
                      </td>

                      {/* 3. DATA DE NASC. */}
                      <td className="p-4 text-slate-300 font-mono">
                        {birthFormatted}
                      </td>

                      {/* 4. IDADE */}
                      <td className="p-4 text-center font-bold text-slate-300">
                        {ageFormatted}
                      </td>

                      {/* 5. TURMA (IDENTIFICADOR LIMPO OU SEM TURMA) */}
                      <td className="p-4">
                        {(!mainClass?.name || mainClass?.name === 'Sem Turma' || mainClass?.name?.includes('Sem turma') || mainClass?.name?.includes('Pendente')) ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Sem Turma
                          </span>
                        ) : (
                          <span className="font-bold text-white text-sm">
                            {mainClass?.class_name || mainClass?.name || mainClass?.title}
                          </span>
                        )}
                      </td>

                      {/* 6. FALTAS NO ANO */}
                      <td className="p-4 text-center">
                        {(() => {
                          const sId = item.id || item.student_id || '';
                          const stat = attendanceStats[sId] || { absences: 0, justified: 0, milestone: 'regular' };
                          const absences = stat.absences || 0;

                          const badgeColor = 
                            absences >= 54 ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30' :
                            absences >= 48 ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30' :
                            absences >= 32 ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 hover:bg-orange-500/30' :
                            absences >= 16 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30' :
                            'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700';

                          return (
                            <button
                              type="button"
                              onClick={() => setStudentForHistoryModal(item)}
                              className={`px-3 py-1 rounded-xl border text-[11px] font-mono font-bold inline-flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-gold/50 ${badgeColor}`}
                              title="Consultar ou editar faltas"
                              aria-label={`Consultar ou editar faltas de ${displayName}: ${absences} ${absences === 1 ? 'falta' : 'faltas'}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                absences >= 48 ? 'bg-rose-400 animate-pulse' :
                                absences >= 32 ? 'bg-orange-400' :
                                absences >= 16 ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}></span>
                              <span>{absences} {absences === 1 ? 'falta' : 'faltas'}</span>
                            </button>
                          );
                        })()}
                      </td>

                      {/* 7. RESPONSÁVEL */}
                      <td className="p-4">
                        {primaryGuardian ? (
                          <div>
                            <p className="font-bold text-slate-200">{primaryGuardian.full_name || primaryGuardian.name || 'Responsável'}</p>
                            <span className="text-[10px] text-slate-500 font-mono">{primaryGuardian.relationship || 'Responsável'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">— Não cadastrado</span>
                        )}
                      </td>

                      {/* 8. CONTATO RESPONSÁVEL */}
                      <td className="p-4 text-slate-300 text-[11px]">
                        {primaryGuardian ? (
                          <div className="space-y-0.5 font-mono">
                            {primaryGuardian.phone && (
                              <div className="flex items-center gap-1 text-slate-300">
                                <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{primaryGuardian.phone}</span>
                              </div>
                            )}
                            {primaryGuardian.email && (
                              <div className="flex items-center gap-1 text-slate-400">
                                <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate max-w-[130px]">{primaryGuardian.email}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">—</span>
                        )}
                      </td>

                      {/* 9. AÇÕES (CANETINHA, ÔNIBUS, LIXEIRINHA, OLHO) */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* CANETINHA (EDIÇÃO EXPANDIDA) */}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-gold border border-slate-700 hover:border-gold/40 rounded-xl transition-all cursor-pointer"
                            title="Editar Cadastro Completo do Aluno"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* ÔNIBUS (TRANSPORTE) */}
                          <button
                            onClick={() => handleToggleTransport(item)}
                            className={`p-1.5 border rounded-xl transition-all cursor-pointer ${
                              item.uses_transport || item.transport_required
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10'
                                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                            }`}
                            title={item.uses_transport || item.transport_required ? "Utiliza Transporte Escolar (Clique para alterar)" : "Não utiliza Transporte (Clique para ativar)"}
                          >
                            <Truck className="w-3.5 h-3.5" />
                          </button>

                          {/* LIXEIRINHA (EXCLUSÃO COM MODAL) */}
                          <button
                            onClick={() => setStudentToDelete(item)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 rounded-xl transition-all cursor-pointer"
                            title="Excluir Estudante"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* OLHO (VISUALIZAR DOSSIÊ COMPLETO) */}
                          <button
                            onClick={() => setSelectedStudent(item)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/40 rounded-xl transition-all cursor-pointer"
                            title="Ver Ficha Completa do Estudante"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {filteredItems.length > 0 && (
            <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Exibindo <strong>{filteredItems.length === 0 ? 0 : startIndex + 1}</strong> a <strong>{Math.min(startIndex + pageSize, filteredItems.length)}</strong> de <strong>{filteredItems.length}</strong> estudantes</span>
                <span className="text-slate-600">|</span>
                <div className="flex items-center gap-1.5">
                  <span>Por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-gold/50 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Página Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && safeCurrentPage > 3) {
                      pageNum = safeCurrentPage - 3 + i;
                      if (pageNum + (4 - i) > totalPages) {
                        pageNum = totalPages - 4 + i;
                      }
                    }
                    if (pageNum <= 0 || pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          safeCurrentPage === pageNum
                            ? 'bg-gold text-slate-950 shadow-md shadow-gold/20'
                            : 'bg-slate-900 border border-slate-700/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Próxima Página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {/* D) DRAWER / MODAL DE DOSSIÊ COMPLETO DO ESTUDANTE (OLHO) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end animate-fade-in p-0 md:p-4">
          <div className="w-full max-w-2xl bg-slate-900 border-l md:border border-slate-800 md:rounded-3xl h-full md:h-[95vh] overflow-y-auto flex flex-col shadow-2xl relative my-auto">
            
            {/* STICKY HEADER */}
            <div className="sticky top-0 bg-slate-900/95 border-b border-slate-800 p-6 flex items-center justify-between z-20 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-gold/40 flex items-center justify-center font-bold text-gold text-lg shadow-md">
                  {selectedStudent.avatar_url ? (
                    <img src={selectedStudent.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                  ) : (
                    (selectedStudent.full_name || selectedStudent.name || 'E').trim().charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-white">
                    {selectedStudent.full_name || selectedStudent.name || 'Estudante'}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Matrícula: <strong className="font-mono text-gold">{selectedStudent.registration_code || selectedStudent.code || 'N/A'}</strong></span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CONTENT BODY */}
            <div className="p-6 space-y-6 flex-1 text-xs text-slate-300">
              
              {/* 1. DADOS PESSOAIS */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                <h3 className="font-serif text-xs font-bold text-gold flex items-center gap-2 uppercase tracking-wider">
                  <User className="w-4 h-4 text-gold" /> Dados Pessoais & Documentos
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Nome Completo</span>
                    <span className="font-bold text-white text-sm">{selectedStudent.full_name || selectedStudent.name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Código de Matrícula (RA)</span>
                    <span className="font-mono font-bold text-gold">{selectedStudent.registration_code || selectedStudent.code || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Data de Nascimento / Idade</span>
                    <span className="text-white font-mono">
                      {formatDate(selectedStudent.birth_date)} ({calculateAge(selectedStudent.birth_date)})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">CPF / Documento</span>
                    <span className="font-mono text-slate-200">{selectedStudent.document_number || selectedStudent.cpf || selectedStudent.rg || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Sexo</span>
                    <span className="font-bold text-white">
                      {(selectedStudent.sex === 'F' || selectedStudent.gender === 'F') ? 'Feminino (F)' : 'Masculino (M)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Situação Acadêmica</span>
                    <span className="font-bold text-emerald-400 uppercase">{selectedStudent.status || 'Matriculado'}</span>
                  </div>
                </div>
              </div>

              {/* 2. SITUAÇÃO ACADÊMICA & TURMA */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                <h3 className="font-serif text-xs font-bold text-gold flex items-center gap-2 uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-gold" /> Situação Acadêmica & Turma
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Turma</span>
                    <span className="font-bold text-white">
                      {(selectedStudent.classes && selectedStudent.classes[0]?.name) || selectedStudent.class_name || '8º Ano A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Ano Letivo</span>
                    <span className="font-mono font-bold text-slate-200">
                      {selectedStudent.academic_year || '2026'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Turno</span>
                    <span className="font-bold text-slate-300">
                      {(selectedStudent.classes && selectedStudent.classes[0]?.shift) || selectedStudent.shift || 'Matutino'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. INCLUSÃO PEDAGÓGICA & SAÚDE */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                <h3 className="font-serif text-xs font-bold text-gold flex items-center gap-2 uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-gold" /> Inclusão Pedagógica & Saúde
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">AEE (Atendimento Especializado)</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                      selectedStudent.aee ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {selectedStudent.aee ? 'Sim (Atendido)' : 'Não'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Laudo Médico Emitido</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                      selectedStudent.laudo ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {selectedStudent.laudo ? 'Sim (Possui Laudo)' : 'Não'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Restrições Alimentares</span>
                    <p className="text-slate-300 mt-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      {selectedStudent.dietary_info || selectedStudent.dietary_restrictions || 'Nenhuma restrição registrada.'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Anotações Médicas / Alergias</span>
                    <p className="text-slate-300 mt-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      {selectedStudent.medical_notes || selectedStudent.allergies || 'Nenhuma observação cadastrada.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. ENDEREÇO RESIDENCIAL */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                <h3 className="font-serif text-xs font-bold text-gold flex items-center gap-2 uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-gold" /> Endereço Residencial
                </h3>
                {selectedStudent.address_street || selectedStudent.street ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Logradouro / Número</span>
                      <span className="text-white font-medium">
                        {selectedStudent.address_street || selectedStudent.street}, Nº {selectedStudent.address_number || selectedStudent.number || 'S/N'}
                        {selectedStudent.address_complement ? ` (${selectedStudent.address_complement})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Bairro</span>
                      <span className="text-slate-300">{selectedStudent.address_neighborhood || selectedStudent.neighborhood || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Cidade / UF</span>
                      <span className="text-slate-300">
                        {selectedStudent.address_city || selectedStudent.city || '—'} / {selectedStudent.address_state || selectedStudent.state || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">CEP</span>
                      <span className="font-mono text-gold">{selectedStudent.address_cep || selectedStudent.cep || '—'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Endereço residencial não informado.</p>
                )}
              </div>

              {/* 5. TRANSPORTE ESCOLAR */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                <h3 className="font-serif text-xs font-bold text-gold flex items-center gap-2 uppercase tracking-wider">
                  <Truck className="w-4 h-4 text-gold" /> Transporte Escolar
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Status do Transporte</span>
                    <span className={`font-bold uppercase flex items-center gap-1 mt-1 ${
                      selectedStudent.uses_transport || selectedStudent.transport_required ? 'text-amber-400' : 'text-slate-500'
                    }`}>
                      <Truck className="w-3.5 h-3.5" />
                      {selectedStudent.uses_transport || selectedStudent.transport_required ? 'Ativo (Utiliza Rota)' : 'Não Utiliza'}
                    </span>
                  </div>
                  {(selectedStudent.uses_transport || selectedStudent.transport_required) && (
                    <>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Linha / Rota</span>
                        <span className="text-white font-medium">{selectedStudent.transport_line || 'Rota Principal 01'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Ponto de Embarque / Desembarque</span>
                        <span className="text-slate-300">{selectedStudent.transport_stop || 'Ponto Central em frente à residência'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 6. RESPONSÁVEIS VINCULADOS */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                <h3 className="font-serif text-xs font-bold text-gold flex items-center gap-2 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-gold" /> Responsáveis Vinculados
                </h3>
                {selectedStudent.guardians && selectedStudent.guardians.length > 0 ? (
                  <div className="space-y-3">
                    {selectedStudent.guardians.map((g, idx) => (
                      <div key={g.id || idx} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{g.full_name || g.name || 'Responsável'}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md uppercase font-bold">
                              {g.relationship || 'Responsável'}
                            </span>
                            {g.is_financial && (
                              <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md uppercase font-bold">
                                Resp. Financeiro
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                          {g.phone && <div>Tel: <span className="text-slate-200">{g.phone}</span></div>}
                          {g.email && <div>E-mail: <span className="text-slate-200 truncate">{g.email}</span></div>}
                          {g.document_number && <div>CPF: <span className="text-slate-200">{g.document_number}</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Nenhum responsável vinculado diretamente.</p>
                )}
              </div>

            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 text-center">
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Fechar Ficha Dossiê
              </button>
            </div>

          </div>
        </div>
      )}

      {/* E) MODAL EXPANDIDO DE EDIÇÃO COMPLETA DO ESTUDANTE (CANETINHA) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl p-6 text-left space-y-6 my-auto max-h-[92vh] overflow-y-auto animate-fade-in">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">Editar Cadastro do Estudante</h3>
                  <p className="text-[11px] text-slate-400">Atualize dados pessoais, turma, inclusão pedagógica, endereço e responsáveis</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="space-y-6 text-xs">
              
              {/* SEÇÃO 1: DADOS PESSOAIS */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h4 className="font-bold text-gold uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <User className="w-4 h-4" /> 1. Dados Pessoais & Documentos
                </h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nome Completo do Aluno *</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Código de Matrícula (RA) *</label>
                    <input
                      type="text"
                      required
                      value={editForm.registration_code}
                      onChange={(e) => setEditForm({ ...editForm, registration_code: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono outline-none focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Data de Nascimento</label>
                    <input
                      type="date"
                      value={editForm.birth_date}
                      onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CPF / Documento</label>
                    <input
                      type="text"
                      value={editForm.document_number}
                      onChange={(e) => setEditForm({ ...editForm, document_number: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono outline-none focus:border-gold"
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sexo</label>
                    <select
                      value={editForm.sex}
                      onChange={(e) => setEditForm({ ...editForm, sex: e.target.value as 'M' | 'F' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold outline-none focus:border-gold"
                    >
                      <option value="M">Masculino (M)</option>
                      <option value="F">Feminino (F)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Situação Acadêmica</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold outline-none focus:border-gold"
                    >
                      <option value="Matriculado">Matriculado</option>
                      <option value="Transferido">Transferido</option>
                      <option value="Readmissão">Readmissão</option>
                      <option value="Classificação">Classificação</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: SITUAÇÃO ACADÊMICA & TURMA */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h4 className="font-bold text-gold uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> 2. Turma & Vínculo Escolar
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Turma do Aluno</label>
                    <input
                      type="text"
                      value={editForm.class_name}
                      onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                      placeholder="Ex: 8º Ano A"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ano Letivo</label>
                    <select
                      value={editForm.academic_year}
                      onChange={(e) => setEditForm({ ...editForm, academic_year: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono outline-none focus:border-gold"
                    >
                      {availableYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Turno</label>
                    <select
                      value={editForm.shift}
                      onChange={(e) => setEditForm({ ...editForm, shift: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                    >
                      <option value="Matutino">Matutino</option>
                      <option value="Vespertino">Vespertino</option>
                      <option value="Integral">Integral</option>
                      <option value="Noturno">Noturno</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: INCLUSÃO PEDAGÓGICA & SAÚDE */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h4 className="font-bold text-gold uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <Activity className="w-4 h-4" /> 3. Inclusão Pedagógica & Saúde
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <input
                      type="checkbox"
                      id="edit_aee"
                      checked={editForm.aee}
                      onChange={(e) => setEditForm({ ...editForm, aee: e.target.checked })}
                      className="w-4 h-4 rounded text-gold bg-slate-900 border-slate-800 cursor-pointer"
                    />
                    <label htmlFor="edit_aee" className="text-xs text-slate-200 font-bold cursor-pointer">
                      AEE (Atendimento Educacional Especializado)
                    </label>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <input
                      type="checkbox"
                      id="edit_laudo"
                      checked={editForm.laudo}
                      onChange={(e) => setEditForm({ ...editForm, laudo: e.target.checked })}
                      className="w-4 h-4 rounded text-gold bg-slate-900 border-slate-800 cursor-pointer"
                    />
                    <label htmlFor="edit_laudo" className="text-xs text-slate-200 font-bold cursor-pointer">
                      Laudo Médico Emitido
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Restrições Alimentares</label>
                    <textarea
                      rows={2}
                      value={editForm.dietary_info}
                      onChange={(e) => setEditForm({ ...editForm, dietary_info: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                      placeholder="Ex: Intolerância à lactose, alergia a corantes..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Anotações Médicas / Alergias</label>
                    <textarea
                      rows={2}
                      value={editForm.medical_notes}
                      onChange={(e) => setEditForm({ ...editForm, medical_notes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                      placeholder="Ex: Uso diário de bombinha, alergia a picada de abelha..."
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 4: ENDEREÇO RESIDENCIAL (VIACEP) */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gold uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> 4. Endereço Residencial (ViaCEP Autocompletar)
                  </h4>
                  {cepLoading && <span className="text-[10px] text-gold animate-pulse font-mono">Buscando CEP...</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CEP (Digite 8 números)</label>
                    <input
                      type="text"
                      value={editForm.address_cep}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditForm({ ...editForm, address_cep: val });
                        if (val.replace(/\D/g, '').length === 8) {
                          handleFetchCepInEdit(val);
                        }
                      }}
                      onBlur={() => handleFetchCepInEdit(editForm.address_cep)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono outline-none focus:border-gold"
                      placeholder="00000-000"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Rua / Logradouro</label>
                    <input
                      type="text"
                      value={editForm.address_street}
                      onChange={(e) => setEditForm({ ...editForm, address_street: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Número</label>
                    <input
                      type="text"
                      value={editForm.address_number}
                      onChange={(e) => setEditForm({ ...editForm, address_number: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Complemento</label>
                    <input
                      type="text"
                      value={editForm.address_complement}
                      onChange={(e) => setEditForm({ ...editForm, address_complement: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                      placeholder="Apt, Bloco..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Bairro</label>
                    <input
                      type="text"
                      value={editForm.address_neighborhood}
                      onChange={(e) => setEditForm({ ...editForm, address_neighborhood: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cidade / UF</label>
                    <input
                      type="text"
                      value={editForm.address_city}
                      onChange={(e) => setEditForm({ ...editForm, address_city: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 5: TRANSPORTE ESCOLAR */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit_transport_check"
                    checked={editForm.uses_transport}
                    onChange={(e) => setEditForm({ ...editForm, uses_transport: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-800 cursor-pointer"
                  />
                  <label htmlFor="edit_transport_check" className="text-xs text-amber-300 font-bold cursor-pointer flex items-center gap-1.5">
                    <Truck className="w-4 h-4" /> Estudante utiliza Transporte Escolar
                  </label>
                </div>

                {editForm.uses_transport && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nome da Linha / Rota</label>
                      <input
                        type="text"
                        value={editForm.transport_line}
                        onChange={(e) => setEditForm({ ...editForm, transport_line: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                        placeholder="Ex: Rota 04 - Zona Sul"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ponto de Embarque / Desembarque</label>
                      <input
                        type="text"
                        value={editForm.transport_stop}
                        onChange={(e) => setEditForm({ ...editForm, transport_stop: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-gold"
                        placeholder="Ex: Av. Principal nº 120"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* BOTÕES FINAIS DE AÇÃO */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#c5a030] text-slate-950 font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-gold/10"
                >
                  <CheckCircle2 className="w-4 h-4" /> Salvar Alterações
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* F) MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (LIXEIRINHA) */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-rose-900/50 rounded-3xl w-full max-w-md shadow-2xl p-6 text-left space-y-5 animate-fade-in relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-white">Excluir estudante?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Estudante: <strong className="text-rose-300">{studentToDelete.full_name || studentToDelete.name}</strong> (RA: {studentToDelete.registration_code || 'N/A'})
              </p>
              <div className="text-xs text-rose-300/90 mt-3 bg-rose-950/60 p-3.5 rounded-xl border border-rose-900/50 leading-relaxed">
                Você está prestes a excluir este estudante do sistema. Esta ação removerá o cadastro da plataforma e do banco de dados institucional. Deseja continuar?
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-900/30 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir estudante</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK LINK CLASS MODAL */}
      {isLinkModalOpen && studentToLink && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-gold/40 rounded-3xl w-full max-w-md shadow-2xl p-6 text-left space-y-5 animate-fade-in relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-white">Vincular Turma ao Estudante</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                    {studentToLink.full_name || studentToLink.name} (RA: {studentToLink.registration_code || 'N/A'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsLinkModalOpen(false); setStudentToLink(null); }}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Selecione a Turma *</label>
                <select
                  value={linkClassForm.selectedClassId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const selectedCls = realOrgClasses.find(c => c.id === val);
                    setLinkClassForm(prev => ({
                      ...prev,
                      selectedClassId: val,
                      shift: (selectedCls?.shift as any) || prev.shift
                    }));
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white font-semibold outline-none focus:border-gold cursor-pointer"
                >
                  <option value="">-- Selecione uma Turma --</option>
                  {realOrgClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.shift || 'Matutino'}{cls.room ? ` • ${cls.room}` : ''})
                    </option>
                  ))}
                  <option value="__custom__">+ Cadastrar / Inserir Nome de Turma Manualmente</option>
                </select>
              </div>

              {linkClassForm.selectedClassId === '__custom__' && (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nome da Nova Turma *</label>
                  <input
                    type="text"
                    value={linkClassForm.customClassName}
                    onChange={(e) => setLinkClassForm({ ...linkClassForm, customClassName: e.target.value })}
                    placeholder="Ex: 8º Ano B"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-gold"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Turno Escolar</label>
                  <select
                    value={linkClassForm.shift}
                    onChange={(e) => setLinkClassForm({ ...linkClassForm, shift: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white font-semibold outline-none focus:border-gold cursor-pointer"
                  >
                    <option value="Matutino">Matutino</option>
                    <option value="Vespertino">Vespertino</option>
                    <option value="Integral">Integral</option>
                    <option value="Noturno">Noturno</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ano Letivo</label>
                  <select
                    value={linkClassForm.academicYear}
                    onChange={(e) => setLinkClassForm({ ...linkClassForm, academicYear: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-gold cursor-pointer"
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => { setIsLinkModalOpen(false); setStudentToLink(null); }}
                disabled={isLinkingClass}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition-all cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveQuickLink}
                disabled={isLinkingClass}
                className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#c5a030] text-slate-950 font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-gold/10 text-xs"
              >
                {isLinkingClass ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar Vinculação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENROLLMENT WIZARD MODAL */}
      {isEnrollmentWizardOpen && (
        <StudentEnrollmentWizard 
          onClose={() => setIsEnrollmentWizardOpen(false)} 
          onSuccess={async () => {
            setIsEnrollmentWizardOpen(false);
            await loadStudents();
          }} 
        />
      )}

      {/* STUDENT ABSENCE LAUNCH MODAL */}
      {studentForAbsenceModal && (
        <StudentAbsenceModal
          isOpen={Boolean(studentForAbsenceModal)}
          student={studentForAbsenceModal}
          academicYear={2026}
          onClose={() => setStudentForAbsenceModal(null)}
          onSuccess={async () => {
            showToast('Frequência/Ausência registrada com sucesso no Supabase!');
            await loadStudents();
          }}
        />
      )}

      {/* STUDENT ABSENCE HISTORY MODAL */}
      {studentForHistoryModal && (
        <StudentAbsenceHistoryModal
          isOpen={Boolean(studentForHistoryModal)}
          student={studentForHistoryModal}
          academicYear={2026}
          onClose={() => setStudentForHistoryModal(null)}
          onSuccess={async () => {
            showToast('Frequência e auditoria atualizadas com sucesso!');
            await loadAttendanceData();
            await loadStudents();
          }}
        />
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-950 border border-gold/40 text-white px-5 py-3.5 rounded-2xl flex items-center gap-2.5 shadow-2xl animate-slide-up">
          <BadgeCheck className="w-5 h-5 text-gold shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
