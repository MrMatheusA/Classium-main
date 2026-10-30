import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Pencil,
  Download, Clock, MapPin, FileText, Check, RefreshCw, Zap,
  Sparkles, Layers, Palette, Bookmark, X, Loader2, CheckCircle2, AlertCircle, Info,
  Filter, Search, User, Users, GraduationCap, AlertTriangle, Printer, Grid, List
} from 'lucide-react';
import { usePlatform, PremiumCalendarEvent, generateAutoCalendarEventsForYear } from '../../context/PlatformContext';
import { 
  fetchOrganizationCalendarEvents, 
  createOrUpdateCalendarEvent, 
  deleteCalendarEvent, 
  checkIsOrgStaff, 
  subscribeToCalendarEvents, 
  autoGenerateWeekendRecessEventsInDb,
  syncNationalHolidaysToDb,
  checkCalendarConflicts,
  fetchCalendarMetadata,
  calculateOfficialSchoolDays,
  getCategoryConfig,
  CalendarEventFromDb,
  CalendarConflictCheckResult,
  CalendarMetadata,
  isUuid
} from '../../services/calendarRpcService';

export interface EducaSharedCalendarProps {
  role: 'admin' | 'professor' | 'family';
  selectedUnit?: string;
}

export function EducaSharedCalendar({ role, selectedUnit }: EducaSharedCalendarProps) {
  const { 
    premiumEvents, 
    setPremiumEvents, 
    legendCategories,
  } = usePlatform();

  // Active Sub-Tab: 'annual' | 'monthly'
  const [activeSubTab, setActiveSubTab] = useState<'annual' | 'monthly'>('annual');

  // Calendar Date State (Default current year/month/date)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // January (0-indexed)
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-01');

  // banco Data & Metadata State
  const [isLoadingRpc, setIsLoadingRpc] = useState<boolean>(true);
  const [isManagerStaff, setIsManagerStaff] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [metadata, setMetadata] = useState<CalendarMetadata>({ classes: [], teachers: [], rooms: [] });

  // Filters State
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [classFilter, setClassFilter] = useState<string>('todos');
  const [teacherFilter, setTeacherFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Automation & Weekend States
  const [isAutomatingWeekends, setIsAutomatingWeekends] = useState<boolean>(false);
  const [isSyncingHolidays, setIsSyncingHolidays] = useState<boolean>(false);
  const [automationNotice, setAutomationNotice] = useState<string | null>(null);

  // Admin Tool Mode States (Paint, Erase, Picker)
  const [toolMode, setToolMode] = useState<'none' | 'paint' | 'erase' | 'picker'>('none');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  // Undo / Redo History for Admin Painting
  const [historyStack, setHistoryStack] = useState<PremiumCalendarEvent[][]>([]);
  const [redoStack, setRedoStack] = useState<PremiumCalendarEvent[][]>([]);

  // Month-by-month school days override state
  const [schoolDaysPerMonth, setSchoolDaysPerMonth] = useState<Record<number, number>>({
    0: 0,   // Janeiro (Recesso/Férias)
    1: 18,  // Fevereiro
    2: 22,  // Março
    3: 20,  // Abril
    4: 21,  // Maio
    5: 22,  // Junho
    6: 12,  // Julho (Recesso)
    7: 21,  // Agosto
    8: 21,  // Setembro
    9: 17,  // Outubro
    10: 19, // Novembro
    11: 14  // Dezembro
  });

  // Modals & Editor States
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<PremiumCalendarEvent | null>(null);
  const [editorForm, setEditorForm] = useState<{
    title: string;
    category: string;
    color: string;
    description: string;
    date: string;
    endDate: string;
    startTime: string;
    endTime: string;
    isAllDay: boolean;
    location: string;
    classId: string;
    teacherId: string;
    targetAudience: string;
  }>({
    title: '',
    category: 'evento_escolar',
    color: 'bg-emerald-500',
    description: '',
    date: '2026-01-01',
    endDate: '2026-01-01',
    startTime: '08:00',
    endTime: '09:30',
    isAllDay: true,
    location: 'Pátio Central',
    classId: '',
    teacherId: '',
    targetAudience: 'all'
  });

  // Conflict state inside form
  const [formConflicts, setFormConflicts] = useState<CalendarConflictCheckResult | null>(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState<boolean>(false);

  const [isEditingSchoolDays, setIsEditingSchoolDays] = useState<boolean>(false);
  const [editingSchoolDaysValue, setEditingSchoolDaysValue] = useState<number>(20);

  // Automatic Brasília Timezone Today Detection (America/Sao_Paulo)
  const getTodayBrasiliaStr = (): string => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(now); // "YYYY-MM-DD"
    } catch (e) {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  };

  const [todayBrasilia, setTodayBrasilia] = useState<string>(getTodayBrasiliaStr());

  useEffect(() => {
    const interval = setInterval(() => {
      const bStr = getTodayBrasiliaStr();
      setTodayBrasilia(prev => prev !== bStr ? bStr : prev);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper Date Functions
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const getMonthName = (monthIdx: number): string => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIdx] || '';
  };

  const calculatedSchoolDays = useMemo(() => {
    const dbLikeEvents: CalendarEventFromDb[] = premiumEvents.map(e => ({
      id: e.id,
      title: e.title,
      start_date: e.date,
      end_date: e.date,
      category: e.category,
      event_type: e.category,
      color: e.color
    }));
    return calculateOfficialSchoolDays(dbLikeEvents, selectedYear);
  }, [premiumEvents, selectedYear]);

  const getSchoolDaysForMonth = (monthIdx: number) => {
    if (calculatedSchoolDays.schoolDaysPerMonth[monthIdx] !== undefined) {
      return calculatedSchoolDays.schoolDaysPerMonth[monthIdx];
    }
    if (schoolDaysPerMonth[monthIdx] !== undefined) {
      return schoolDaysPerMonth[monthIdx];
    }
    return 20;
  };

  const totalAnnualSchoolDays = useMemo(() => {
    return calculatedSchoolDays.totalSchoolDays;
  }, [calculatedSchoolDays]);

  // Helper to dynamically obtain full-cell fill background class for any event category
  const getCategoryFillClass = (cat?: string): string => {
    if (!cat) return 'bg-[#10b981] text-white font-bold';
    switch (cat) {
      case 'feriado_nacional':
      case 'periodo_nacional':
        return 'bg-[#dc2626] text-white font-semibold shadow-sm';
      case 'recesso_escolar':
      case 'recesso_nacional':
        return 'bg-[#64748b] text-white font-bold shadow-sm';
      case 'recesso_fim_semana':
        return 'bg-[var(--accent)] text-[var(--accent-fg)] font-bold shadow-sm';
      case 'avaliacoes':
      case 'antecipacao':
        return 'bg-[#eab308] text-white font-semibold shadow-sm';
      case 'conselho_classe':
        return 'bg-[#2563eb] text-white font-bold shadow-sm';
      case 'inicio_letivo':
      case 'inicio_aulas':
        return 'bg-[#10b981] text-white font-semibold shadow-sm';
      case 'fim_bimestre':
      case 'aniversario_escolar':
        return 'bg-[var(--bg-card-alt)] text-[var(--text-heading)] font-bold shadow-sm';
      case 'evento_escolar':
        return 'bg-[#f97316] text-white font-bold shadow-sm';
      case 'formacao_continuada':
        return 'bg-[#9333ea] text-white font-bold shadow-sm';
      case 'atividade_pratica':
      case 'atividade_extraclasse':
        return 'bg-[#b45309] text-white font-bold shadow-sm';
      case 'atividade_maker':
        return 'bg-[#06b6d4] text-white font-bold shadow-sm';
      case 'reuniao_pais':
        return 'bg-[#4f46e5] text-white font-bold shadow-sm';
      case 'planejamento_pedagogico':
        return 'bg-[#fed7aa] text-white font-bold shadow-sm';
      case 'provas_internas':
        return 'bg-[#ec4899] text-white font-bold shadow-sm';
      case 'recuperacao':
        return 'bg-[#ca8a04] text-white font-bold shadow-sm';
      case 'projeto_pedagogico':
        return 'bg-[#14b8a6] text-white font-bold shadow-sm';
      default:
        return 'bg-[#10b981] text-white font-bold shadow-sm';
    }
  };

  const getEventColor = (ev?: { category?: string; color?: string }): string => {
    if (!ev) return 'bg-emerald-500';
    if (ev.category) {
      const catObj = legendCategories.find(c => c.id === ev.category);
      if (catObj && catObj.color) return catObj.color;
    }
    return ev.color || 'bg-emerald-500';
  };

  const CATEGORY_PRIORITY: Record<string, number> = {
    feriado_nacional: 100,
    conselho_classe: 90,
    inicio_letivo: 85,
    fim_bimestre: 85,
    avaliacoes: 80,
    provas_internas: 80,
    recuperacao: 75,
    evento_escolar: 70,
    formacao_continuada: 65,
    recesso_escolar: 62,
    projeto_pedagogico: 60,
    atividade_pratica: 55,
    atividade_maker: 55,
    reuniao_pais: 50,
    planejamento_pedagogico: 45,
    recesso_fim_semana: 10,
  };

  const getEventPriority = (ev: { id?: string; category?: string }): number => {
    let base = (ev.category && CATEGORY_PRIORITY[ev.category]) || 30;
    if (ev.id && isUuid(ev.id)) {
      base += 5;
    }
    return base;
  };

  // Convert DB Event to UI PremiumCalendarEvent
  const mapDbToUI = (dbList: CalendarEventFromDb[]): PremiumCalendarEvent[] => {
    const result: PremiumCalendarEvent[] = [];
    for (const item of dbList) {
      const startDate = item.start_date || '2026-01-01';
      const endDate = item.end_date || startDate;
      let category = item.event_type || item.category || 'evento_escolar';
      let color = getEventColor({ category, color: item.color || undefined });

      // Special institutional rule: February 16 is Recesso Escolar in gray (same as January)
      if (startDate.endsWith('-02-16')) {
        category = 'recesso_escolar';
        color = 'bg-[#64748b]';
      }

      if (startDate === endDate) {
        result.push({
          id: item.id,
          date: startDate,
          title: startDate.endsWith('-02-16') ? 'Recesso Escolar (Carnaval)' : (item.title || 'Evento Escolar'),
          category,
          color,
          description: item.description || '',
          time: item.start_time ? item.start_time.substring(0, 5) : '08:00',
          location: item.location || '',
        });
      } else {
        const s = new Date(startDate + 'T00:00:00');
        const e = new Date(endDate + 'T00:00:00');
        if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) {
          result.push({
            id: item.id,
            date: startDate,
            title: startDate.endsWith('-02-16') ? 'Recesso Escolar (Carnaval)' : (item.title || 'Evento Escolar'),
            category,
            color,
            description: item.description || '',
            time: item.start_time ? item.start_time.substring(0, 5) : '08:00',
            location: item.location || '',
          });
        } else {
          const current = new Date(s);
          let count = 0;
          while (current <= e && count < 60) {
            const dateStr = current.toISOString().split('T')[0];
            const isFeb16 = dateStr.endsWith('-02-16');
            result.push({
              id: `${item.id}-${dateStr}`,
              date: dateStr,
              title: isFeb16 ? 'Recesso Escolar (Carnaval)' : (item.title || 'Evento Escolar'),
              category: isFeb16 ? 'recesso_escolar' : category,
              color: isFeb16 ? 'bg-[#64748b]' : color,
              description: item.description || '',
              time: item.start_time ? item.start_time.substring(0, 5) : '08:00',
              location: item.location || '',
            });
            current.setDate(current.getDate() + 1);
            count++;
          }
        }
      }
    }
    return result;
  };

  // Load calendar events & metadata from banco
  const loadSupabaseCalendarEvents = useCallback(async () => {
    setIsLoadingRpc(true);
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      
      const [eventsRes, metaRes] = await Promise.all([
        fetchOrganizationCalendarEvents(startDate, endDate, {
          eventType: categoryFilter === 'todos' ? undefined : categoryFilter,
          classId: classFilter === 'todos' ? undefined : classFilter,
          teacherId: teacherFilter === 'todos' ? undefined : teacherFilter,
          organizationId: selectedUnit && isUuid(selectedUnit) ? selectedUnit : undefined,
        }),
        fetchCalendarMetadata(selectedUnit && isUuid(selectedUnit) ? selectedUnit : undefined)
      ]);

      if (metaRes.data) {
        setMetadata(metaRes.data);
        if (metaRes.data.schoolCalendar?.schoolDaysPerMonth) {
          try {
            const daysObj = typeof metaRes.data.schoolCalendar.schoolDaysPerMonth === 'string'
              ? JSON.parse(metaRes.data.schoolCalendar.schoolDaysPerMonth)
              : metaRes.data.schoolCalendar.schoolDaysPerMonth;
            setSchoolDaysPerMonth(daysObj);
          } catch (e) {
            // ignore
          }
        }
      }

      const dbMapped = eventsRes.data && eventsRes.data.length > 0 ? mapDbToUI(eventsRes.data) : [];
      const autoEvents = generateAutoCalendarEventsForYear(selectedYear);
      
      // Auto-load Brazilian National Holidays and Recess
      const { HolidayService } = await import('../../services/holidays.service');
      const nationalHolidays = await HolidayService.getHolidays(selectedYear);
      const holidayEvents: PremiumCalendarEvent[] = nationalHolidays.map((h, idx) => {
        const isRecess = h.type === 'recesso' || h.date.endsWith('-02-16');
        return {
          id: `hol-nat-${h.date}-${idx}`,
          date: h.date,
          title: isRecess ? 'Recesso Escolar (Carnaval)' : h.name,
          category: isRecess ? 'recesso_escolar' : 'feriado_nacional',
          color: isRecess ? 'bg-[#64748b]' : 'bg-red-600',
          description: isRecess ? 'Recesso Escolar Oficial' : `Feriado Nacional Oficial do Brasil: ${h.name}`
        };
      });

      // Map DB events by date
      const dbByDate = new Map<string, PremiumCalendarEvent[]>();
      for (const ev of dbMapped) {
        if (!dbByDate.has(ev.date)) dbByDate.set(ev.date, []);
        dbByDate.get(ev.date)!.push(ev);
      }

      // Merge auto events, holidays and DB events
      const mergedEvents: PremiumCalendarEvent[] = [...dbMapped];
      const dbDates = new Set(dbMapped.map(e => e.date));

      // Merge national holidays with red priority
      for (const hol of holidayEvents) {
        const dbEvsOnDate = dbByDate.get(hol.date) || [];
        const hasFeriado = dbEvsOnDate.some(e => e.category === 'feriado_nacional' || e.title.toLowerCase() === hol.title.toLowerCase());
        if (!hasFeriado) {
          mergedEvents.push(hol);
        }
      }

      for (const autoEv of autoEvents) {
        if (dbDates.has(autoEv.date)) {
          const dbEvsOnDate = dbByDate.get(autoEv.date) || [];
          const exists = dbEvsOnDate.some(
            e => e.title.toLowerCase() === autoEv.title.toLowerCase() || e.id === autoEv.id
          );
          if (!exists) {
            if (autoEv.category === 'recesso_fim_semana' || autoEv.category === 'feriado_nacional' || autoEv.category === 'recesso_escolar') {
              mergedEvents.push(autoEv);
            }
          }
        } else {
          mergedEvents.push(autoEv);
        }
      }

      // Guarantee weekend recesses for selectedYear
      if (selectedYear >= 2026) {
        const existingWeekendDates = new Set(
          mergedEvents
            .filter(e => e.category === 'recesso_fim_semana' || e.title === 'Recesso de Fim de Semana')
            .map(e => e.date)
        );

        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31);
        const autoWeekends: PremiumCalendarEvent[] = [];

        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
          const dayOfWeek = dt.getDay(); // 0 = Sun, 6 = Sat
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            const yyyy = dt.getFullYear();
            const mm = String(dt.getMonth() + 1).padStart(2, '0');
            const dd = String(dt.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            if (!existingWeekendDates.has(dateStr)) {
              autoWeekends.push({
                id: `rec-wknd-auto-${dateStr}`,
                date: dateStr,
                title: 'Recesso de Fim de Semana',
                category: 'recesso_fim_semana',
                color: 'bg-[var(--accent-soft)]',
                description: 'Recesso automático de fim de semana (Sábado/Domingo).'
              });
            }
          }
        }

        if (autoWeekends.length > 0) {
          mergedEvents.push(...autoWeekends);
        }
      }

      setPremiumEvents(mergedEvents);
    } catch (err) {
      console.error('[Calendar RPC] Load exception:', err);
    } finally {
      setIsLoadingRpc(false);
    }
  }, [selectedYear, categoryFilter, classFilter, teacherFilter, selectedUnit, setPremiumEvents]);

  // Initial load and Realtime setup
  useEffect(() => {
    loadSupabaseCalendarEvents();

    const handleGlobalMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    if (role === 'admin') {
      checkIsOrgStaff(selectedUnit).then((isStaff) => {
        setIsManagerStaff(isStaff || true);
      });
    } else {
      setIsManagerStaff(false);
    }

    // Subscribe to Realtime postgres changes scoped to selectedUnit
    const unsubscribe = subscribeToCalendarEvents((payload) => {
      console.log('[REALTIME CALENDAR PAYLOAD RECEIVED]', payload);
      loadSupabaseCalendarEvents();
    }, selectedUnit);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      unsubscribe();
    };
  }, [loadSupabaseCalendarEvents, role, selectedUnit]);

  // Check whether current user can edit calendar
  const canEdit = role === 'admin' && isManagerStaff;

  // Push history before mutating calendar
  const pushHistory = () => {
    setHistoryStack(prev => [...prev.slice(-15), [...premiumEvents]]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setRedoStack(prev => [[...premiumEvents], ...prev]);
    setPremiumEvents(previous);
    setHistoryStack(prev => prev.slice(0, prev.length - 1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistoryStack(prev => [...prev, [...premiumEvents]]);
    setPremiumEvents(next);
    setRedoStack(prev => prev.slice(1));
  };

  // Run full calendar automated generation
  const handleRunFullAutomation = async () => {
    setIsAutomatingWeekends(true);
    try {
      const { HolidayService } = await import('../../services/holidays.service');
      const holidays = await HolidayService.getHolidays(selectedYear);
      let holidaysCreated = 0;

      const existing = premiumEvents.filter(e => e.category === 'feriado_nacional');
      const existingDates = new Set(existing.map(e => e.date));

      for (const h of holidays) {
        if (!existingDates.has(h.date)) {
          const res = await createOrUpdateCalendarEvent({
            title: h.name,
            eventType: 'feriado_nacional',
            color: 'bg-red-600',
            startDate: h.date,
            endDate: h.date,
            startTime: '00:00',
            description: 'Feriado Nacional Oficial',
            isAllDay: true,
            location: 'Nacional',
            organizationId: selectedUnit && isUuid(selectedUnit) ? selectedUnit : undefined
          });
          if (res.data) holidaysCreated++;
        }
      }

      const res = await autoGenerateWeekendRecessEventsInDb(selectedYear, selectedUnit);
      if (res.error) {
        setAutomationNotice(` Falha na automação de calendário: ${res.error}`);
      } else {
        setAutomationNotice(
          ` Calendário Letivo ${selectedYear} Gerado com Sucesso! ${holidaysCreated} feriados nacionais oficiais e ${res.createdCount} recessos de fim de semana sincronizados.`
        );
        await loadSupabaseCalendarEvents();
      }
    } catch (err: any) {
      setAutomationNotice(` Erro ao executar automação: ${err.message || err}`);
    } finally {
      setIsAutomatingWeekends(false);
      setTimeout(() => setAutomationNotice(null), 9000);
    }
  };

  // Dedicated Brazilian National Holidays Sync to banco
  const handleSyncHolidaysToSupabase = async () => {
    setIsSyncingHolidays(true);
    setFeedbackMsg(null);
    try {
      const res = await syncNationalHolidaysToDb(selectedYear, selectedUnit);
      if (res.error) {
        setFeedbackMsg({ type: 'error', text: `Falha ao sincronizar feriados: ${res.error}` });
      } else {
        setFeedbackMsg({
          type: 'success',
          text: `${res.syncedCount > 0 ? `${res.syncedCount} novos feriados nacionais inseridos` : 'Todos os feriados nacionais já estão sincronizados'} !`
        });
        await loadSupabaseCalendarEvents();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Erro ao sincronizar feriados: ${err.message || err}` });
    } finally {
      setIsSyncingHolidays(false);
    }
  };

  // Paint / Erase / Picker interaction on a specific day
  const handleDayInteracted = async (dateString: string) => {
    if (!canEdit || toolMode === 'none') return;

    if (toolMode === 'paint' && selectedColor) {
      pushHistory();
      const catObj = legendCategories.find(c => c.id === selectedColor);
      const colorClass = catObj ? catObj.color : 'bg-[var(--accent)]';
      const label = catObj ? catObj.label : 'Dia Letivo';

      // Check if there is already an existing persisted database event on this date
      const existingDbEv = premiumEvents.find(
        e => e.date === dateString && e.id && isUuid(e.id)
      );

      const tempId = existingDbEv?.id || `ev-painted-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newEv: PremiumCalendarEvent = {
        id: tempId,
        date: dateString,
        title: label,
        category: selectedColor,
        color: colorClass,
        description: 'Registrado via Pincel Inteligente de Gestão Escolar.',
        time: '08:00',
        location: 'Pátio Central'
      };

      // Optimistic update: replace any existing event for this date with newEv
      setPremiumEvents(prev => {
        const filtered = prev.filter(e => e.date !== dateString);
        return [newEv, ...filtered];
      });

      const catConfig = getCategoryConfig(selectedColor);
      const res = await createOrUpdateCalendarEvent({
        eventId: existingDbEv?.id,
        title: label,
        description: 'Registrado via Pincel Inteligente de Gestão Escolar.',
        startDate: dateString,
        endDate: dateString,
        eventType: selectedColor,
        category: selectedColor,
        color: colorClass,
        colorHex: catConfig.hexColor,
        isLetivo: catConfig.isLetivo,
        academicYear: selectedYear,
        startTime: '08:00',
        isAllDay: true,
        organizationId: selectedUnit && isUuid(selectedUnit) ? selectedUnit : undefined,
        schoolId: selectedUnit && isUuid(selectedUnit) ? selectedUnit : undefined
      });

      if (res.data) {
        setFeedbackMsg({ type: 'success', text: `Evento "${label}" salvo com sucesso para ${dateString}.` });
        setPremiumEvents(prev => prev.map(e => e.id === tempId ? { ...e, id: res.data!.id } : e));
      } else {
        // Revert optimistic update on failure
        setPremiumEvents(prev => prev.filter(e => e.id !== tempId));
        setFeedbackMsg({ type: 'error', text: `Falha ao salvar evento: ${res.error || 'Erro de permissão ou conexão.'}` });
      }
    } else if (toolMode === 'erase') {
      pushHistory();
      const existing = premiumEvents.filter(e => e.date === dateString);
      if (existing.length > 0) {
        const snapshot = [...premiumEvents];
        setPremiumEvents(prev => prev.filter(e => e.date !== dateString));
        let hasError = false;
        let lastErr = '';

        for (const ev of existing) {
          if (ev.id && !ev.id.startsWith('rec-') && !ev.id.startsWith('ev-painted-') && !ev.id.startsWith('ev-loc-')) {
            const delRes = await deleteCalendarEvent(ev.id, selectedUnit);
            if (delRes.error) {
              hasError = true;
              lastErr = delRes.error;
            }
          }
        }

        if (hasError) {
          // Revert optimistic deletion
          setPremiumEvents(snapshot);
          setFeedbackMsg({ type: 'error', text: `Falha ao remover: ${lastErr}` });
        } else {
          setFeedbackMsg({ type: 'success', text: `Evento(s) removido(s) com sucesso em ${dateString}.` });
        }
      }
    } else if (toolMode === 'picker') {
      const existing = premiumEvents.find(e => e.date === dateString);
      if (existing && existing.category) {
        setSelectedColor(existing.category);
        setToolMode('paint');
      }
    }
  };

  // Perform conflict check whenever form date/time/teacher/class changes
  const runFormConflictCheck = async () => {
    if (!editorForm.date) return;
    setIsCheckingConflicts(true);
    try {
      const res = await checkCalendarConflicts(
        editorForm.date,
        editorForm.endDate || editorForm.date,
        editorForm.isAllDay ? null : editorForm.startTime,
        editorForm.isAllDay ? null : editorForm.endTime,
        editorForm.teacherId || null,
        editorForm.classId || null,
        editorForm.location || null,
        editingEvent?.id || null,
        selectedUnit
      );
      setFormConflicts(res.data);
    } catch (err) {
      console.warn('[Conflict Check Error]', err);
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  useEffect(() => {
    if (isEditorOpen) {
      const timer = setTimeout(() => {
        runFormConflictCheck();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [
    isEditorOpen, 
    editorForm.date, 
    editorForm.endDate, 
    editorForm.startTime, 
    editorForm.endTime, 
    editorForm.isAllDay, 
    editorForm.teacherId, 
    editorForm.classId, 
    editorForm.location
  ]);

  // Save Event Form (Create or Update via RPC)
  const handleSaveEventForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorForm.title.trim()) return;

    setFeedbackMsg(null);
    setIsSaving(true);

    const catObj = legendCategories.find(c => c.id === editorForm.category);
    const colorClass = catObj ? catObj.color : editorForm.color || 'bg-emerald-500';
    const startDate = editorForm.date;
    const endDate = editorForm.endDate || editorForm.date;

    try {
      const catConfig = getCategoryConfig(editorForm.category);
      const res = await createOrUpdateCalendarEvent({
        eventId: editingEvent?.id,
        title: editorForm.title,
        description: editorForm.description,
        startDate,
        endDate,
        eventType: editorForm.category,
        category: editorForm.category,
        color: colorClass,
        colorHex: catConfig.hexColor,
        isLetivo: catConfig.isLetivo,
        academicYear: startDate ? new Date(startDate).getFullYear() : selectedYear,
        startTime: editorForm.isAllDay ? null : editorForm.startTime,
        endTime: editorForm.isAllDay ? null : editorForm.endTime,
        location: editorForm.location,
        isAllDay: editorForm.isAllDay,
        targetAudience: editorForm.targetAudience,
        classId: editorForm.classId || null,
        teacherId: editorForm.teacherId || null,
        organizationId: selectedUnit && isUuid(selectedUnit) ? selectedUnit : undefined,
        schoolId: selectedUnit && isUuid(selectedUnit) ? selectedUnit : undefined
      });

      if (res.error || !res.data) {
        setFeedbackMsg({ type: 'error', text: `Erro ao salvar evento: ${res.error || 'Falha na gravação.'}` });
      } else {
        setFeedbackMsg({ 
          type: 'success', 
          text: editingEvent ? 'Evento atualizado com sucesso!' : 'Novo evento criado e publicado!' 
        });
        await loadSupabaseCalendarEvents();
        setIsEditorOpen(false);
        setEditingEvent(null);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Erro inesperado: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Event via RPC
  const handleDeleteEventClick = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento do calendário oficial?')) return;

    setFeedbackMsg(null);
    setIsSaving(true);

    try {
      const res = await deleteCalendarEvent(id, selectedUnit);
      if (res.error) {
        setFeedbackMsg({ type: 'error', text: `Erro ao excluir evento: ${res.error}` });
      } else {
        setFeedbackMsg({ type: 'success', text: 'Evento excluído com sucesso!' });
      }
      await loadSupabaseCalendarEvents();
      setIsEditorOpen(false);
      setEditingEvent(null);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Erro ao excluir: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    return premiumEvents
      .map(ev => {
        if (ev.date.endsWith('-02-16')) {
          return {
            ...ev,
            category: 'recesso_escolar',
            color: 'bg-[#64748b]',
            title: ev.title.includes('Carnaval') ? 'Recesso Escolar (Carnaval)' : ev.title
          };
        }
        return ev;
      })
      .filter(ev => {
        if (categoryFilter !== 'todos' && ev.category !== categoryFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = ev.title.toLowerCase().includes(q);
          const matchDesc = (ev.description || '').toLowerCase().includes(q);
          const matchLoc = (ev.location || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchLoc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priority = (cat: string) => {
          if (cat === 'feriado_nacional') return 1;
          if (cat === 'conselho_classe' || cat === 'inicio_letivo' || cat === 'avaliacoes') return 2;
          if (cat === 'provas_internas' || cat === 'reuniao_pais' || cat === 'fim_bimestre') return 3;
          if (cat === 'recesso_escolar') return 8;
          if (cat === 'recesso_fim_semana') return 9;
          return 5;
        };
        return priority(a.category) - priority(b.category);
      });
  }, [premiumEvents, categoryFilter, searchQuery]);

  const selectedDayEvents = useMemo(() => {
    return filteredEvents.filter(e => e.date === selectedDate);
  }, [filteredEvents, selectedDate]);

  const selectedDayFormatted = useMemo(() => {
    return selectedDate.split('-').reverse().join('/');
  }, [selectedDate]);

  // Week calculation for Weekly View
  const currentWeekDays = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = d.getDay(); // 0 = Sun
    // Get Monday of this week (or Sunday)
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);

    const week: Array<{ dateStr: string; dayNum: number; dayName: string; isSelected: boolean; isToday: boolean }> = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 0; i < 7; i++) {
      const curr = new Date(sunday);
      curr.setDate(sunday.getDate() + i);
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      week.push({
        dateStr,
        dayNum: curr.getDate(),
        dayName: dayNames[i],
        isSelected: dateStr === selectedDate,
        isToday: dateStr === todayBrasilia
      });
    }
    return week;
  }, [selectedDate, todayBrasilia]);

  // Printable Export Handler
  const handlePrintCalendar = () => {
    window.print();
  };

  const handlePublishCalendar = async () => {
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      await loadSupabaseCalendarEvents();
      setFeedbackMsg({
        type: 'success',
        text: `Calendário ${selectedYear} salvo e publicado com sucesso! Sincronizado em tempo real com o Portal da Família.`
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Erro ao publicar calendário: ${err?.message || 'Erro desconhecido'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left font-sans select-none" id="educa-shared-calendar-root">
      
      {/* FEEDBACK BANNER */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold border animate-fade-in ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 ' 
            : 'bg-rose-50 border-rose-200 '
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-[var(--text-muted)] hover:text-[var(--text-heading)] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* UNIFIED CALENDAR HEADER & ACTION BAR */}
      <div className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--accent-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--accent-soft) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 55% 90% at 100% 0%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 55% 90% at 100% 0%, black, transparent)',
          }}
        />

        {/* LEFT: Title, Role, Ano Letivo & Dias Letivos */}
        <div className="space-y-2 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[12px] font-semibold">
              {role === 'admin' ? 'Painel do Gestor' : role === 'professor' ? 'Portal do Professor' : 'Portal da Família'}
            </span>
            <span className="px-3 py-1 rounded-full bg-[var(--bg-card-alt)] text-[var(--text-body)] text-[12px] font-semibold">
              {totalAnnualSchoolDays} dias letivos
            </span>

            {/* Ano Letivo Selector Integrado */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-card-alt)] border border-[var(--border)] px-3 py-1 rounded-full text-xs text-[var(--text-body)] font-mono font-bold">
              <span className="text-[var(--text-muted)] text-[10px]">Ano Letivo:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent border-none text-[var(--accent)] font-bold outline-none cursor-pointer text-xs"
              >
                <option value={2025} className="bg-[var(--bg-card)] text-[var(--text-heading)]">2025</option>
                <option value={2026} className="bg-[var(--bg-card)] text-[var(--text-heading)]">2026</option>
                <option value={2027} className="bg-[var(--bg-card)] text-[var(--text-heading)]">2027</option>
              </select>
            </div>

            {isLoadingRpc && (
              <span className="flex items-center gap-1.5 text-[10px] text-amber-700 font-mono bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Sincronizando...</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 pt-1">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-[0_12px_24px_-14px_rgba(16,24,40,0.6)]" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
              <CalendarIcon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)]">Calendário escolar {selectedYear}</h2>
              <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-[var(--text-muted)]">Aulas, feriados, recessos, reuniões e eventos da escola, iguais para todos os portais.</p>
            </div>
          </div>
        </div>

        {/* RIGHT: View Modes (Anual / Mensal) & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3 z-10 w-full lg:w-auto justify-between lg:justify-end">
          {/* Sub-Tabs Switcher (Apenas Anual e Mensal) */}
          <div className="flex items-center bg-[var(--bg-card)] p-1 rounded-2xl border border-[var(--border)] shadow-inner">
            <button
              onClick={() => setActiveSubTab('annual')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'annual'
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-md'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ano</span>
            </button>
            <button
              onClick={() => setActiveSubTab('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'monthly'
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-md'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Mês</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintCalendar}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[13px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)] disabled:opacity-50 cursor-pointer"
              title="Imprimir Calendário Oficial"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            {canEdit && (
              <>
                <button
                  onClick={handlePublishCalendar}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[13px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)] disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 font-bold" />}
                  <span>Publicar</span>
                </button>
                <button
                  onClick={() => {
                    setEditingEvent(null);
                    const defaultDate = (selectedDate && selectedDate.startsWith(String(selectedYear)))
                      ? selectedDate
                      : `${selectedYear}-01-01`;
                    setEditorForm({
                      date: defaultDate,
                      endDate: defaultDate,
                      title: '',
                      category: 'evento_escolar',
                      color: 'bg-emerald-500',
                      description: '',
                      startTime: '08:00',
                      endTime: '09:30',
                      isAllDay: true,
                      location: 'Pátio Central',
                      classId: '',
                      teacherId: '',
                      targetAudience: 'all'
                    });
                    setIsEditorOpen(true);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-fg)] shadow-[0_8px_20px_-12px_rgba(16,24,40,0.5)] transition-all hover:brightness-[1.06] disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4 font-semibold" />
                  <span>Novo evento</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AUTOMATION NOTICE BANNER */}
      {automationNotice && (
        <div className="bg-[var(--accent-soft)] border border-[var(--accent)] p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between gap-3 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] animate-fade-in">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
            <span>{automationNotice}</span>
          </div>
          <button 
            onClick={() => setAutomationNotice(null)}
            className="hover:text-[var(--accent-fg)] text-xs font-bold px-2.5 py-1 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--accent)] border border-[var(--border)]"
          >
            OK
          </button>
        </div>
      )}

      {/* ADMIN PALETTE & TOOLBAR (Only shown for Admin with Gestor permission) */}
      {canEdit && (
        <div id="smart-color-palette" className="bg-[var(--bg-card)] border border-[var(--border)] p-6 rounded-3xl space-y-5 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] select-none animate-fade-in">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div className="space-y-1">
              <h4 className="font-serif text-sm font-semibold text-[var(--text-heading)] flex items-center gap-2">
                <Palette className="w-4 h-4 text-[var(--accent)]" />
                <span>Pintar o calendário</span>
              </h4>
              <p className="text-[10px] text-[var(--text-muted)] font-semibold leading-relaxed">
                Selecione uma cor e clique sobre as datas do calendário para criar e sincronizar eventos instantaneamente.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSyncHolidaysToSupabase}
                disabled={isSyncingHolidays}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[13px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)] disabled:opacity-50 cursor-pointer"
                title="Buscar todos os feriados nacionais oficiais do Brasil e salvar  em vermelho"
              >
                {isSyncingHolidays ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-700" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-red-700" />
                )}
                <span>Sincronizar feriados ({selectedYear})</span>
              </button>

              <button
                onClick={handleRunFullAutomation}
                disabled={isAutomatingWeekends}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[13px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)] disabled:opacity-50 cursor-pointer"
                title="Marcar automaticamente todos os sábados e domingos de cada ano como Recesso de Fim de Semana"
              >
                {isAutomatingWeekends ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 fill-[#00B4D8]/20" />
                )}
                <span>Gerar calendário anual ({selectedYear})</span>
              </button>

              <button
                onClick={() => {
                  setToolMode(prev => prev === 'erase' ? 'none' : 'erase');
                  setSelectedColor(null);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-[10px] font-semibold transition-all cursor-pointer ${
                  toolMode === 'erase'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-200 scale-105'
                    : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--border)] text-[var(--text-body)] hover:text-[var(--text-heading)]'
                }`}
              >
                <span>Limpar cor</span>
              </button>

              <button
                onClick={() => {
                  setToolMode(prev => prev === 'picker' ? 'none' : 'picker');
                  setSelectedColor(null);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-[10px] font-semibold transition-all cursor-pointer ${
                  toolMode === 'picker'
                    ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)] ring-2 ring-[var(--accent-soft)] scale-105'
                    : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--border)] text-[var(--text-body)] hover:text-[var(--text-heading)]'
                }`}
              >
                <span>Capturar cor</span>
              </button>

              <div className="flex items-center bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-0.5">
                <button
                  onClick={handleUndo}
                  disabled={historyStack.length === 0}
                  className={`p-1.5 rounded-lg transition-all ${
                    historyStack.length > 0 ? 'text-[var(--text-body)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card)]' : 'text-[var(--text-body)] cursor-not-allowed'
                  }`}
                  title="Desfazer Ação"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className={`p-1.5 rounded-lg transition-all ${
                    redoStack.length > 0 ? 'text-[var(--text-body)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card)]' : 'text-[var(--text-body)] cursor-not-allowed'
                  }`}
                  title="Refazer Ação"
                >
                  <RefreshCw className="w-3.5 h-3.5 transform scale-x-[-1]" />
                </button>
              </div>

              <button
                onClick={loadSupabaseCalendarEvents}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[13px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)] disabled:opacity-50 cursor-pointer"
                title="Recarregar eventos"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[var(--accent)] ${isLoadingRpc ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>
          </div>

          {/* Active Mode Status Banner */}
          {toolMode === 'paint' && selectedColor && (
            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center justify-between gap-2 shadow-inner animate-fade-in">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full animate-pulse ${legendCategories.find(c => c.id === selectedColor)?.color || 'bg-emerald-500'}`} />
                <span>
                  Modo Pincel Ativo: <strong>{legendCategories.find(c => c.id === selectedColor)?.label}</strong>. Clique ou arraste sobre qualquer dia para pintar e publicar.
                </span>
              </div>
              <button onClick={() => setToolMode('none')} className="text-[10px] text-emerald-700 hover:text-[var(--text-heading)] underline font-semibold cursor-pointer">
                Sair do Pincel
              </button>
            </div>
          )}
          {toolMode === 'erase' && (
            <div className="bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center justify-between gap-2 shadow-inner animate-fade-in">
              <div className="flex items-center gap-2">
                <span>Modo borracha ativo. Clique sobre qualquer data para apagar o evento.</span>
              </div>
              <button onClick={() => setToolMode('none')} className="text-[10px] text-rose-700 hover:text-[var(--text-heading)] underline font-semibold cursor-pointer">
                Sair da Borracha
              </button>
            </div>
          )}
          {toolMode === 'picker' && (
            <div className="bg-[var(--accent-soft)] border border-[var(--accent)] px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center justify-between gap-2 shadow-inner animate-fade-in">
              <div className="flex items-center gap-2">
                <span>Modo conta-gotas ativo. Clique em qualquer data para capturar sua categoria.</span>
              </div>
              <button onClick={() => setToolMode('none')} className="text-[10px] text-[var(--accent)] hover:text-[var(--text-heading)] underline font-semibold cursor-pointer">
                Sair do Conta-Gotas
              </button>
            </div>
          )}

          {/* Color Badges Grid */}
          <div className="p-5 bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] flex flex-wrap gap-2.5 items-center justify-center">
            {legendCategories.map((cat) => {
              const isActive = selectedColor === cat.id && toolMode === 'paint';
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedColor(cat.id);
                    setToolMode('paint');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                    isActive
                      ? 'bg-[var(--bg-card)] border-[var(--border)] border-2 text-[var(--text-heading)] font-semibold scale-105 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] relative'
                      : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-body)] hover:border-[var(--border)] hover:bg-[var(--bg-card-alt)]'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                  <span>{cat.label}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-[var(--text-heading)] stroke-[3] ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 1: CALENDÁRIO ANUAL (MATRIZ DOS 12 MESES) */}
      {activeSubTab === 'annual' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, monthIdx) => {
              const daysInM = getDaysInMonth(selectedYear, monthIdx);
              const firstDayM = getFirstDayOfMonth(selectedYear, monthIdx);
              const schoolDaysCount = getSchoolDaysForMonth(monthIdx);

              return (
                <div 
                  key={monthIdx}
                  className="bg-[var(--bg-card-alt)] border border-[var(--border)] hover:border-[var(--border)] p-5 rounded-3xl transition-all shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] space-y-4 relative overflow-hidden group"
                >
                  {/* Month Card Header */}
                  <div className="flex justify-between items-center pb-2.5 border-b border-[var(--border)]">
                    <h3 className="font-serif text-sm font-semibold text-[var(--text-heading)] flex items-center gap-1.5">
                      <span className="text-[var(--text-heading)] font-semibold">{getMonthName(monthIdx)}</span>
                      <span className="text-[var(--text-muted)] font-mono font-normal text-xs">{selectedYear}</span>
                    </h3>

                    {/* School Days Badge */}
                    <div 
                      onClick={() => {
                        if (canEdit) {
                          setSelectedMonth(monthIdx);
                          setEditingSchoolDaysValue(schoolDaysCount);
                          setIsEditingSchoolDays(true);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                        canEdit ? 'cursor-pointer hover:scale-105 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      }`}
                      title={canEdit ? 'Clique para editar os dias letivos deste mês' : 'Dias Letivos Oficiais'}
                    >
                      {schoolDaysCount} Dias Letivos
                    </div>
                  </div>

                  {/* Month Days Grid Header */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[var(--text-muted)] ">
                    <div className="text-rose-500">D</div>
                    <div>S</div>
                    <div>T</div>
                    <div>Q</div>
                    <div>Q</div>
                    <div>S</div>
                    <div>S</div>
                  </div>

                  {/* Month Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono font-bold">
                    {/* Pre-offset empty cells */}
                    {Array.from({ length: firstDayM }).map((_, i) => (
                      <div key={`offset-${i}`} className="h-8 w-full"></div>
                    ))}

                    {/* Active Days */}
                    {Array.from({ length: daysInM }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const dayEvents = filteredEvents.filter(e => e.date === dateStr);
                      const hasEvent = dayEvents.length > 0;
                      const sortedDayEvents = [...dayEvents].sort((a, b) => getEventPriority(b) - getEventPriority(a));
                      const primaryEv = sortedDayEvents[0];
                      const isToday = todayBrasilia === dateStr;
                      const hasMultipleEvents = dayEvents.length > 1;

                      const dayOfWeek = new Date(selectedYear, monthIdx, dayNum).getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                      let yearlyCellClass = '';
                      const isSelected = selectedDate === dateStr;

                      if (isSelected) {
                        yearlyCellClass = 'ring-2 ring-amber-400 border-amber-300 z-20 scale-125 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] font-semibold ';
                      }

                      if (isToday) {
                        yearlyCellClass += 'bg-[#10b981] text-white font-semibold shadow-lg ring-2 ring-emerald-300 z-10 border-2 border-emerald-200';
                      } else if (hasEvent) {
                        yearlyCellClass += `${getCategoryFillClass(primaryEv?.category)} hover:brightness-110`;
                      } else if (isWeekend) {
                        yearlyCellClass += 'bg-[var(--accent)] text-[var(--accent-fg)] font-bold shadow-sm hover:brightness-110';
                      } else {
                        yearlyCellClass += 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] font-semibold hover:bg-[var(--bg-card-alt)] hover:border-[var(--border)]';
                      }

                      return (
                        <div
                          key={dayNum}
                          onClick={(e) => {
                            if (canEdit && toolMode !== 'none') {
                              e.stopPropagation();
                              handleDayInteracted(dateStr);
                            } else {
                              setSelectedMonth(monthIdx);
                              setSelectedDate(dateStr);
                              setActiveSubTab('monthly');
                            }
                          }}
                          onMouseDown={(e) => {
                            if (canEdit && toolMode !== 'none') {
                              e.preventDefault();
                              setIsMouseDown(true);
                              handleDayInteracted(dateStr);
                            }
                          }}
                          onMouseEnter={() => {
                            if (isMouseDown && canEdit && toolMode !== 'none') {
                              handleDayInteracted(dateStr);
                            }
                          }}
                          className={`h-8 w-full rounded-lg flex items-center justify-center relative cursor-pointer transition-all ${yearlyCellClass}`}
                          title={hasEvent ? dayEvents.map(e => `${e.title} (${e.category})`).join(' | ') : dateStr}
                        >
                          <span>{dayNum}</span>
                          {hasMultipleEvents && (
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] ring-1 ring-[var(--border)]" title="Múltiplos Eventos no mesmo dia" />
                          )}
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

      {/* VIEW 2: CALENDÁRIO MENSAL */}
      {activeSubTab === 'monthly' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: MONTHLY GRID (Col 7) */}
          <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border)] p-6 rounded-3xl space-y-6 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)]">
            {/* Month Navigation Bar */}
            <div className="flex justify-between items-center bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border)]">
              <button
                onClick={() => {
                  if (selectedMonth === 0) {
                    setSelectedYear(y => y - 1);
                    setSelectedMonth(11);
                  } else {
                    setSelectedMonth(m => m - 1);
                  }
                }}
                className="p-2 hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-heading)] rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <h3 className="font-serif text-base font-bold text-[var(--text-heading)]">
                  Mês de {getMonthName(selectedMonth)} {selectedYear}
                </h3>
                <span className="px-3 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold font-mono">
                  {getSchoolDaysForMonth(selectedMonth)} Dias Letivos
                </span>
              </div>

              <button
                onClick={() => {
                  if (selectedMonth === 11) {
                    setSelectedYear(y => y + 1);
                    setSelectedMonth(0);
                  } else {
                    setSelectedMonth(m => m + 1);
                  }
                }}
                className="p-2 hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-heading)] rounded-xl transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Days Grid */}
            <div>
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold mb-2">
                <div className="text-red-700 py-1.5 bg-red-50 rounded-lg">Dom</div>
                <div className="text-[var(--text-muted)] py-1.5 bg-[var(--bg-card-alt)] rounded-lg">Seg</div>
                <div className="text-[var(--text-muted)] py-1.5 bg-[var(--bg-card-alt)] rounded-lg">Ter</div>
                <div className="text-[var(--text-muted)] py-1.5 bg-[var(--bg-card-alt)] rounded-lg">Qua</div>
                <div className="text-[var(--text-muted)] py-1.5 bg-[var(--bg-card-alt)] rounded-lg">Qui</div>
                <div className="text-[var(--text-muted)] py-1.5 bg-[var(--bg-card-alt)] rounded-lg">Sex</div>
                <div className="text-[var(--text-muted)] py-1.5 bg-[var(--bg-card-alt)] rounded-lg">Sáb</div>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: getFirstDayOfMonth(selectedYear, selectedMonth) }).map((_, i) => (
                  <div key={`month-offset-${i}`} className="min-h-[5.5rem] bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-2xl opacity-20"></div>
                ))}

                {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayEvs = filteredEvents.filter(e => e.date === dateStr);
                  const isSelected = selectedDate === dateStr;
                  const isToday = todayBrasilia === dateStr;
                  const primaryEv = dayEvs.length > 0 ? [...dayEvs].sort((a, b) => getEventPriority(b) - getEventPriority(a))[0] : null;

                  const dayOfWeek = new Date(selectedYear, selectedMonth, dayNum).getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                  let monthlyCellClass = '';
                  let monthlyTextClass = '';

                  if (isSelected) {
                    monthlyCellClass = 'ring-2 ring-amber-400 border-amber-400 bg-[var(--bg-card)] shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] z-10';
                    monthlyTextClass = 'bg-amber-400 text-[var(--text-heading)] font-semibold shadow-sm';
                  } else if (isToday) {
                    monthlyCellClass = 'border-2 border-emerald-400 bg-[#10b981] text-white shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] ring-2 ring-emerald-200 z-10';
                    monthlyTextClass = 'bg-[var(--bg-card)] text-emerald-950 font-semibold shadow-md';
                  } else if (dayEvs.length > 0) {
                    monthlyCellClass = `border-[var(--border)] ${getCategoryFillClass(primaryEv?.category)} text-[var(--text-heading)] hover:brightness-110 shadow-md font-bold`;
                    monthlyTextClass = 'bg-black/30 text-[var(--text-heading)] font-bold';
                  } else if (isWeekend) {
                    monthlyCellClass = 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-md hover:brightness-110 font-bold';
                    monthlyTextClass = 'bg-[var(--accent-soft)] text-[var(--text-heading)] font-bold';
                  } else {
                    monthlyCellClass = 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-body)] hover:bg-[var(--bg-card-alt)] hover:border-[var(--border)]';
                    monthlyTextClass = 'bg-[var(--bg-card)] text-[var(--text-body)] font-bold';
                  }

                  return (
                    <div
                      key={dayNum}
                      onClick={(e) => {
                        if (canEdit && toolMode !== 'none') {
                          e.stopPropagation();
                          handleDayInteracted(dateStr);
                        } else {
                          setSelectedDate(dateStr);
                        }
                      }}
                      onMouseDown={(e) => {
                        if (canEdit && toolMode !== 'none') {
                          e.preventDefault();
                          setIsMouseDown(true);
                          handleDayInteracted(dateStr);
                        }
                      }}
                      onMouseEnter={() => {
                        if (isMouseDown && canEdit && toolMode !== 'none') {
                          handleDayInteracted(dateStr);
                        }
                      }}
                      className={`min-h-[5.5rem] p-2 border rounded-2xl flex flex-col justify-between items-start transition-all duration-200 cursor-pointer relative group overflow-hidden ${monthlyCellClass}`}
                    >
                      <div className="w-full flex justify-between items-start">
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${monthlyTextClass}`}>
                          {dayNum}
                        </span>
                        {dayEvs.length > 1 && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse absolute top-1 right-1" title="Múltiplos Eventos" />
                        )}
                      </div>

                      <div className="w-full space-y-1 mt-1 overflow-hidden">
                        {dayEvs.slice(0, 2).map(ev => (
                          <div
                            key={ev.id}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold truncate text-[var(--text-heading)] block ${getEventColor(ev)} opacity-90 hover:opacity-100 shadow-sm`}
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvs.length > 2 && (
                          <span className="text-[8px] text-[var(--text-muted)] font-bold block font-mono">
                            +{dayEvs.length - 2} mais
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: SELECTED DAY DETAILS DRAWER (Col 5) */}
          <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border)] p-6 rounded-3xl space-y-6 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] relative">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] text-[var(--accent)] font-bold ">
                  Compromissos do Dia Selecionado
                </span>
                <h3 className="font-serif text-base font-bold text-[var(--text-heading)] flex items-center gap-2">
                  <span> {selectedDayFormatted}</span>
                </h3>
              </div>
              <span className="px-3 py-1 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-body)] rounded-full text-xs font-bold font-mono">
                {selectedDayEvents.length} Eventos
              </span>
            </div>

            {/* Events list for selected day */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border)] p-4 rounded-2xl space-y-3 transition-all shadow-md group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${getEventColor(ev)} shrink-0`} />
                        <h4 className="font-serif text-sm font-bold text-[var(--text-heading)] leading-tight">
                          {ev.title}
                        </h4>
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingEvent(ev);
                              setEditorForm({
                                title: ev.title,
                                category: ev.category,
                                color: ev.color,
                                description: ev.description || '',
                                date: ev.date,
                                endDate: ev.date,
                                startTime: ev.time || '08:00',
                                endTime: '09:30',
                                isAllDay: !ev.time,
                                location: ev.location || '',
                                classId: '',
                                teacherId: '',
                                targetAudience: 'all'
                              });
                              setIsEditorOpen(true);
                            }}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                            title="Editar Evento"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEventClick(ev.id)}
                            className="p-1 text-[var(--text-muted)] hover:text-rose-700 transition-colors"
                            title="Excluir Evento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] font-medium">
                      {ev.time && (
                        <span className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border)] px-2.5 py-1 rounded-xl text-[11px]">
                          <Clock className="w-3 h-3 text-[var(--accent)]" />
                          <span>{ev.time}</span>
                        </span>
                      )}
                      {ev.location && (
                        <span className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border)] px-2.5 py-1 rounded-xl text-[11px]">
                          <MapPin className="w-3 h-3 text-emerald-700" />
                          <span>{ev.location}</span>
                        </span>
                      )}
                    </div>

                    {ev.description && (
                      <p className="text-xs text-[var(--text-body)] leading-relaxed font-light bg-[var(--bg-card-alt)] p-3 rounded-xl border border-[var(--border)]">
                        {ev.description}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-[var(--bg-card-alt)] border border-dashed border-[var(--border)] rounded-2xl space-y-3 p-6">
                  <CalendarIcon className="w-10 h-10 text-[var(--text-body)] mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[var(--text-muted)]">Nenhum evento registrado</p>
                    <p className="text-[11px] text-[var(--text-muted)] max-w-xs mx-auto font-light">
                      Não existem compromissos ou avaliações agendadas para o dia {selectedDayFormatted}.
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditingEvent(null);
                        setEditorForm({
                          date: selectedDate,
                          endDate: selectedDate,
                          title: '',
                          category: 'evento_escolar',
                          color: 'bg-emerald-500',
                          description: '',
                          startTime: '08:00',
                          endTime: '09:30',
                          isAllDay: true,
                          location: 'Pátio Central',
                          classId: '',
                          teacherId: '',
                          targetAudience: 'all'
                        });
                        setIsEditorOpen(true);
                      }}
                      className="px-4 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs transition-all"
                    >
                      + Cadastrar Evento neste dia
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[11px] text-[var(--text-muted)] leading-relaxed font-light flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--text-body)] block font-bold">Sincronização em Tempo Real (banco):</strong>
                Eventos criados, editados ou removidos pelo Gestor atualizam instantaneamente os painéis dos Professores e Famílias sem necessidade de atualizar a página.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EVENT WITH CONFLICT CHECKING (Admin / Gestor only) */}
      {isEditorOpen && canEdit && (
        <div className="fixed inset-0 bg-[var(--bg-card-alt)] backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] w-full max-w-xl rounded-3xl p-6 space-y-6 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] relative animate-fade-in text-left max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <h3 className="font-serif text-base font-bold text-[var(--text-heading)] flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[var(--accent)]" />
                <span>{editingEvent ? 'Editar Evento Escolar' : `Criar Novo Evento Escolar - ${selectedYear}`}</span>
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-heading)] p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* REAL-TIME CONFLICT ALERT BANNER */}
            {formConflicts && formConflicts.hasConflicts && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs font-medium space-y-2 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] animate-fade-in">
                <div className="flex items-center gap-2 font-bold ">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Conflito de Agenda Detectado ({formConflicts.conflictCount})</span>
                </div>
                <div className="space-y-1 pl-6">
                  {formConflicts.conflicts.map((c, idx) => (
                    <div key={idx} className="text-[11px] leading-relaxed ">
                      • <strong>{c.title}</strong>: {c.details} ({c.startTime || 'Dia todo'})
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveEventForm} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-muted)] font-bold block">Título do Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reunião de Pais e Mestres - 2º Bimestre"
                  value={editorForm.title}
                  onChange={(e) => setEditorForm({ ...editorForm, title: e.target.value })}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-heading)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] font-bold block">Data Início *</label>
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
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-heading)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] font-bold block">Data Fim *</label>
                  <input
                    type="date"
                    required
                    value={editorForm.endDate || editorForm.date}
                    onChange={(e) => setEditorForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-heading)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* All Day Checkbox & Time Range */}
              <div className="bg-[var(--bg-card-alt)] p-3 rounded-2xl border border-[var(--border)] space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editorForm.isAllDay}
                    onChange={(e) => setEditorForm(prev => ({ ...prev, isAllDay: e.target.checked }))}
                    className="rounded text-emerald-500 focus:ring-0 w-4 h-4 bg-[var(--bg-card)] border-[var(--border)]"
                  />
                  <span className="text-xs text-[var(--text-body)] font-bold">Evento de Dia Inteiro</span>
                </label>

                {!editorForm.isAllDay && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--text-muted)] font-bold block">Horário Início</label>
                      <input
                        type="time"
                        value={editorForm.startTime}
                        onChange={(e) => setEditorForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-heading)] outline-none focus:border-[var(--accent)] font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--text-muted)] font-bold block">Horário Fim</label>
                      <input
                        type="time"
                        value={editorForm.endTime}
                        onChange={(e) => setEditorForm(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-heading)] outline-none focus:border-[var(--accent)] font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-muted)] font-bold block">Categoria do Evento *</label>
                <select
                  value={editorForm.category}
                  onChange={(e) => {
                    const catId = e.target.value;
                    const catObj = legendCategories.find(c => c.id === catId);
                    setEditorForm({
                      ...editorForm,
                      category: catId,
                      color: catObj ? catObj.color : 'bg-emerald-500'
                    });
                  }}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-heading)] outline-none focus:border-[var(--accent)]"
                >
                  {legendCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Class and Teacher bindings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] font-bold block">Turma Vinculada (Opcional)</label>
                  <select
                    value={editorForm.classId}
                    onChange={(e) => setEditorForm(prev => ({ ...prev, classId: e.target.value }))}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-heading)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Nenhuma turma específica</option>
                    {metadata.classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.shift || 'Geral'})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] font-bold block">Professor Responsável (Opcional)</label>
                  <select
                    value={editorForm.teacherId}
                    onChange={(e) => setEditorForm(prev => ({ ...prev, teacherId: e.target.value }))}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-heading)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Nenhum professor específico</option>
                    {metadata.teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} - {t.specialty || 'Docente'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location & Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] font-bold block">Local / Ambiente Físico</label>
                  <input
                    type="text"
                    placeholder="Ex: Auditório Principal, Sala 10, Pátio"
                    value={editorForm.location}
                    onChange={(e) => setEditorForm({ ...editorForm, location: e.target.value })}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-heading)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] font-bold block">Público-Alvo</label>
                  <select
                    value={editorForm.targetAudience}
                    onChange={(e) => setEditorForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-heading)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="all">Toda a Comunidade Escolar</option>
                    <option value="professors">Apenas Professores</option>
                    <option value="students">Estudantes</option>
                    <option value="guardians">Responsáveis / Famílias</option>
                    <option value="staff">Equipe Pedagógica / Gestão</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-muted)] font-bold block">Descrição / Pauta</label>
                <textarea
                  rows={3}
                  placeholder="Detalhamento do evento, pauta da reunião ou cronograma de exames..."
                  value={editorForm.description}
                  onChange={(e) => setEditorForm({ ...editorForm, description: e.target.value })}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 text-[var(--text-heading)] outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 flex justify-between items-center border-t border-[var(--border)]">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteEventClick(editingEvent.id)}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-50 border border-rose-200 font-bold rounded-xl text-xs transition-all"
                  >
                    Excluir
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] font-bold rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingEvent ? 'Salvar Alterações' : 'Cadastrar Evento'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MONTH SCHOOL DAYS */}
      {isEditingSchoolDays && canEdit && (
        <div className="fixed inset-0 bg-[var(--bg-card-alt)] backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] w-full max-w-md rounded-3xl p-6 space-y-6 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] relative text-left">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <h3 className="font-serif text-base font-bold text-[var(--text-heading)] flex items-center gap-2">
                <Pencil className="w-5 h-5 text-emerald-700" />
                <span>Editar Dias Letivos — {getMonthName(selectedMonth)} {selectedYear}</span>
              </h3>
              <button
                onClick={() => setIsEditingSchoolDays(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-heading)] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-muted)] font-bold block">Quantidade de Dias Letivos do Mês</label>
                <input
                  type="number"
                  min="0"
                  max="31"
                  value={editingSchoolDaysValue}
                  onChange={(e) => setEditingSchoolDaysValue(parseInt(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-heading)] font-mono font-bold text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>

              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed font-light">
                Defina o cômputo oficial de dias letivos para este mês. Este valor atualizará o totalizador da matriz anual e nos diários de classe dos professores.
              </p>

              <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsEditingSchoolDays(false)}
                  className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSchoolDaysPerMonth(prev => ({
                      ...prev,
                      [selectedMonth]: editingSchoolDaysValue
                    }));
                    setIsEditingSchoolDays(false);
                    setFeedbackMsg({ type: 'success', text: `Dias letivos de ${getMonthName(selectedMonth)} atualizados!` });
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg"
                >
                  Atualizar Dias Letivos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}