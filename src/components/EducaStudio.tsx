import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  StudioDocument, DocumentQuestion, HeaderData, HeaderModel 
} from './studio/EducaStudioTypes';
import { HeaderTemplates } from './studio/HeaderTemplates';
import { EditorToolbar } from './studio/EditorToolbar';
import { ImageStudioModal } from './studio/ImageStudioModal';
import { PedagogicalGeneratorModal } from './studio/PedagogicalGeneratorModal';
import { exportToWord, exportToPDF } from './studio/ExportManager';
import { classesService, ClassEntity, DisciplineEntity } from '../services/classes/classes.service';
import { activitiesService, ActivityRecord } from '../services/activities/activities.service';
import { useAuth } from '../hooks/useAuth';

import { 
  Sparkles, Brain, Download, Printer, FileText, 
  ChevronDown, Plus, Minus, Trash2, Settings, Monitor, Smartphone, 
  Image as ImageIcon, BookOpen, Layers,
  Wand2, Shield, Grid, Search, ArrowRight, FileDown, RefreshCw,
  Users, Award, HelpCircle, CheckCircle2, Sliders, ChevronRight,
  Eye, EyeOff, Layout, FileSpreadsheet, Share2,
  Save, CloudUpload, FolderOpen, History, Copy, Database, Check, AlertCircle, Calendar, Tag, FileCheck, X
} from 'lucide-react';

export interface EducaStudioProps {
  teacherId?: string;
  teacherName?: string;
  teacherSubject?: string;
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

export function EducaStudio({
  teacherId = 'prof-carlos',
  teacherName = '',
  teacherSubject = '',
  selectedClass: propSelectedClass,
  onSelectClass: propOnSelectClass,
  classesList: propClassesList,
  onOpenShiftModal
}: EducaStudioProps) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id || '11111111-1111-1111-1111-111111111111';

  // Classes & Disciplines from Database
  const [dbClasses, setDbClasses] = useState<ClassEntity[]>([]);
  const [disciplinesList, setDisciplinesList] = useState<DisciplineEntity[]>([]);

  const activeClasses = useMemo(() => {
    if (propClassesList && propClassesList.length > 0) return propClassesList;
    if (dbClasses.length > 0) {
      return dbClasses.map(c => ({
        id: c.id,
        name: c.name,
        grade: c.grade || `${c.name} - Fundamental`,
        room: c.room || 'Sala de Aula',
        shift: c.shift || 'Matutino',
        subject: c.subject || 'História & Robótica',
        studentsCount: c.students_count || 0,
        isReference: false,
        inProgress: false
      }));
    }
    return [];
  }, [propClassesList, dbClasses]);

  const [internalSelectedClass, setInternalSelectedClass] = useState<string>(propSelectedClass || '');

  useEffect(() => {
    if (!internalSelectedClass && activeClasses.length > 0) {
      setInternalSelectedClass(activeClasses[0].id);
    }
  }, [activeClasses, internalSelectedClass]);

  const currentSelectedClassId = propSelectedClass || internalSelectedClass;
  const currentClassInfo = useMemo(() => {
    return activeClasses.find(c => c.id === currentSelectedClassId) || activeClasses[0] || null;
  }, [activeClasses, currentSelectedClassId]);

  // Config Parameters State
  const [grade, setGrade] = useState('9º Ano Fundamental');
  const [subject, setSubject] = useState('História');
  const [topic, setTopic] = useState('A Revolução Industrial e suas Transformações Sociais');
  const [context, setContext] = useState('Foco nas mudanças sociais, surgimento das fábricas e a migração campo-cidade.');
  const [objective, setObjective] = useState('Compreender o impacto da maquinofatura na organização trabalhista e na estrutura social.');
  const [bncc, setBncc] = useState('EF08HI03');
  const [docType, setDocType] = useState('Atividade');
  const [difficulty, setDifficulty] = useState('Intermediário');
  const [questionCount, setQuestionCount] = useState(4);
  const [isSuggestingTopic, setIsSuggestingTopic] = useState(false);

  const [questionTypes, setQuestionTypes] = useState({
    objetivas: true,
    dissertativas: true,
    vf: true,
    associacao: false,
    complete: false
  });

  const [inclusivity, setInclusivity] = useState({
    autismo: false,
    tdah: false,
    baixaVisao: false,
    dislexia: false
  });

  // Generator & UI states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [previewMode, setPreviewMode] = useState<'notebook' | 'aluno' | 'celular'>('notebook');
  const [showAnswerKey, setShowAnswerKey] = useState(true);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(12);
  const [textColor, setTextColor] = useState('#1e293b');
  const [showHeaderCustomizer, setShowHeaderCustomizer] = useState(false);

  // Modals state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isGeneratorsModalOpen, setIsGeneratorsModalOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // In-document selected image for Image Edit Menu
  const [selectedImageQuestionIdx, setSelectedImageQuestionIdx] = useState<number | null>(null);

  // Loaded generated document state
  const [document, setDocument] = useState<StudioDocument>({
    id: 'doc-101',
    title: "Atividade Avaliativa: A Revolução Industrial e suas Transformações Sociais",
    header: {
      model: 'moderno',
      schoolName: "",
      teacherName: (profile as any)?.name || (profile as any)?.full_name || teacherName || "",
      subject: "História",
      grade: "9º Ano Fundamental - 901",
      date: new Date().toLocaleDateString('pt-BR'),
      studentNameLine: "_________________________________________________",
      maxPoints: "10.0 pts"
    },
    instructions: "Leia atentamente as questões antes de responder. Utilize caneta azul ou preta. Justifique suas respostas nas questões abertas.",
    questions: [
      {
        id: 'q-1',
        number: 1,
        type: "Objetiva",
        difficulty: "Intermediário",
        text: "O surgimento das fábricas durante a Revolução Industrial na Inglaterra promoveu uma grande transformação demográfica e espacial conhecida como:",
        options: [
          "Êxodo rural, com a migração maciça da população camponesa para os centros urbanos industriais.",
          "Êxodo urbano, devido à busca por melhores condições de plantio no campo.",
          "Transumância, caracterizada pelo deslocamento sazonal de operários têxteis.",
          "Migração internacional de retorno, impulsionada pelo monopólio do comércio de carvão."
        ],
        answer: "Alternativa A. Justificativa Pedagógica: O cercamento dos campos (enclosure acts) privou os camponeses de suas terras comunais, forçando o deslocamento em massa para as cidades em busca de emprego nas nascentes manufaturas."
      },
      {
        id: 'q-2',
        number: 2,
        type: "Dissertativa",
        difficulty: "Intermediário",
        text: "Explique como as condições de trabalho nas primeiras fábricas inglesas do século XVIII impactaram a rotina e a saúde física dos operários, destacando a situação das mulheres e crianças.",
        imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80",
        imageCaption: "Operários e maquinário na Revolução Industrial inglesa.",
        answer: "Expectativa de Resposta: As jornadas de trabalho de 14 a 16 horas diárias, a falta de ventilação, iluminação precária e perigo constante causavam deformidades físicas e acidentes frequentes. Mulheres e crianças eram submetidas aos mesmos riscos, recebendo salários inferiores aos dos homens adultos."
      },
      {
        id: 'q-3',
        number: 3,
        type: "Verdadeiro ou Falso",
        difficulty: "Fácil",
        text: "Analise a afirmação a seguir e classifique-a: 'O movimento Ludista, liderado por operários na Inglaterra, propunha a negociação pacífica e greves legais por meio de sindicatos regulamentados pelo Parlamento britânico.'",
        options: [
          "(V) Verdadeira",
          "(F) Falsa"
        ],
        answer: "Falsa. Justificativa: O Ludismo ficou conhecido como o movimento dos 'quebradores de máquinas', pois os operários culpavam a tecnologia pela destruição de postos de trabalho e queda salarial, agindo clandestinamente."
      },
      {
        id: 'q-4',
        number: 4,
        type: "Dissertativa",
        difficulty: "Avançado",
        text: "Estabeleça uma relação crítica entre as inovações tecnológicas da Primeira Revolução Industrial (como a máquina a vapor) e a aceleração do processo de urbanização europeu:",
        answer: "Expectativa de Resposta: A máquina a vapor permitiu que as fábricas fossem instaladas próximas a portos e centros urbanos (e não apenas perto de rios), concentrando mão de obra, comércio e infraestrutura nas cidades."
      }
    ],
    estimatedTimeMinutes: 45,
    bnccHabilites: ["EF08HI03", "EF09HI01"],
    learningIndexExpected: 88,
    createdAt: new Date().toLocaleDateString('pt-BR'),
    updatedAt: new Date().toLocaleDateString('pt-BR'),
    version: 1
  });

  const [toastMessage, setToastMessage] = useState('');

  // Persistence & banco Integration States
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(null);
  const [activityStatus, setActivityStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isMyActivitiesModalOpen, setIsMyActivitiesModalOpen] = useState(false);
  const [savedActivities, setSavedActivities] = useState<ActivityRecord[]>([]);
  const [isLoadingSavedActivities, setIsLoadingSavedActivities] = useState(false);
  const [savedActivitiesFilter, setSavedActivitiesFilter] = useState({ search: '', status: 'all', subject: 'all' });

  // 1. Fetch Classes & Disciplines dynamically from banco
  useEffect(() => {
    async function loadAcademicData() {
      try {
        const cls = await classesService.getClassesByOrganization(orgId);
        if (cls && cls.length > 0) {
          setDbClasses(cls);
        }
        const discs = await classesService.getDisciplines(orgId);
        if (discs && discs.length > 0) {
          setDisciplinesList(discs);
        }
      } catch (err) {
        console.warn('Erro ao carregar turmas e disciplinas:', err);
      }
    }
    loadAcademicData();
  }, [orgId]);

  // 1.1 Load Saved Activities from banco / Express
  const loadSavedActivities = useCallback(async () => {
    setIsLoadingSavedActivities(true);
    try {
      const res = await activitiesService.getActivities(orgId, { teacherId });
      if (res.success && res.activities) {
        setSavedActivities(res.activities);
      }
    } catch (err) {
      console.warn('Erro ao carregar atividades salvas:', err);
    } finally {
      setIsLoadingSavedActivities(false);
    }
  }, [orgId, teacherId]);

  useEffect(() => {
    loadSavedActivities();

    // Subscribe to Realtime updates on activities table
    const channel = supabase
      .channel(`activities-realtime-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities' },
        () => {
          loadSavedActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, loadSavedActivities]);

  // 1.2 Explicit Persistence: Save to banco (Draft or Published)
  const handleSaveActivity = async (targetStatus: 'draft' | 'published' = 'published') => {
    setIsSaving(true);
    try {
      const selectedCls = activeClasses.find(c => c.id === currentSelectedClassId);
      
      const activityPayload: Partial<ActivityRecord> = {
        id: currentActivityId || undefined,
        organization_id: orgId,
        teacher_id: teacherId,
        user_id: profile?.id,
        class_id: currentSelectedClassId || undefined,
        title: document.title || `Atividade de ${subject}: ${topic}`,
        grade: grade,
        subject: subject,
        topic: topic,
        context: context,
        objective: objective,
        bncc_code: bncc,
        doc_type: docType,
        difficulty: difficulty,
        question_count: document.questions.length,
        header_model: document.header.model || 'moderno',
        header_data: document.header,
        instructions: document.instructions,
        document_payload: document,
        estimated_time_minutes: document.estimatedTimeMinutes || 45,
        bncc_habilities: document.bnccHabilites || [bncc],
        status: targetStatus
      };

      const result = await activitiesService.saveActivity(activityPayload);
      if (result.success && result.activity) {
        setCurrentActivityId(result.activity.id);
        setActivityStatus(result.activity.status as any || targetStatus);
        setLastSavedTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setHasUnsavedChanges(false);
        await loadSavedActivities();
        showToast(
          targetStatus === 'published'
            ? ' Atividade salva e publicada com sucesso!'
            : ' Rascunho salvo com sucesso!'
        );
      } else {
        throw new Error(result.error || 'Erro ao persistir atividade.');
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 1.3 Load an existing activity into the canvas
  const handleLoadActivity = (activity: ActivityRecord) => {
    try {
      setCurrentActivityId(activity.id);
      setActivityStatus(activity.status || 'published');
      setGrade(activity.grade || '9º Ano Fundamental');
      setSubject(activity.subject || 'História');
      setTopic(activity.topic || '');
      setContext(activity.context || '');
      setObjective(activity.objective || '');
      setBncc(activity.bncc_code || 'EF08HI03');
      setDocType(activity.doc_type || 'Atividade');
      setDifficulty(activity.difficulty || 'Médio');
      setQuestionCount(activity.question_count || 4);

      if (activity.class_id) {
        setInternalSelectedClass(activity.class_id);
      }

      if (activity.document_payload && activity.document_payload.questions) {
        setDocument(activity.document_payload);
      } else {
        // Construct from record
        setDocument({
          id: activity.id,
          title: activity.title,
          header: activity.header_data || {
            model: (activity.header_model as any) || 'moderno',
            schoolName: "",
            teacherName: profile?.name || teacherName,
            subject: activity.subject,
            grade: activity.grade,
            date: new Date().toLocaleDateString('pt-BR'),
            studentNameLine: "_________________________________________________",
            maxPoints: "10.0 pts"
          },
          instructions: activity.instructions || "Leia atentamente as questões antes de responder.",
          questions: [],
          estimatedTimeMinutes: activity.estimated_time_minutes || 45,
          bnccHabilites: activity.bncc_habilities || [activity.bncc_code || 'EF08HI03'],
          learningIndexExpected: 90,
          createdAt: new Date(activity.created_at).toLocaleDateString('pt-BR'),
          updatedAt: new Date(activity.updated_at).toLocaleDateString('pt-BR'),
          version: activity.version || 1
        });
      }

      setLastSavedTime(new Date(activity.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      setHasUnsavedChanges(false);
      setIsMyActivitiesModalOpen(false);
      showToast(` Atividade "${activity.title}" carregada com sucesso!`);
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao carregar os dados da atividade.');
    }
  };

  // 1.4 Delete an activity from banco
  const handleDeleteSavedActivity = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir esta atividade persistida?')) return;
    try {
      const res = await activitiesService.deleteActivity(id, teacherId);
      if (res.success) {
        setSavedActivities(prev => prev.filter(a => a.id !== id));
        if (currentActivityId === id) {
          setCurrentActivityId(null);
          setHasUnsavedChanges(true);
        }
        showToast(' Atividade excluída com sucesso.');
      }
    } catch (err) {
      showToast('Erro ao excluir atividade.');
    }
  };

  // 1.5 Start New Activity
  const handleNewActivity = () => {
    if (hasUnsavedChanges && !confirm('Existem alterações não salvas. Deseja iniciar uma nova atividade em branco?')) return;
    setCurrentActivityId(null);
    setActivityStatus('draft');
    setLastSavedTime(null);
    setHasUnsavedChanges(false);
    setTopic('Novo Tema Pedagógico');
    setContext('');
    setObjective('');
    setDocument({
      id: `doc-${Date.now()}`,
      title: `Nova Atividade: ${subject}`,
      header: {
        model: 'moderno',
        schoolName: "",
        teacherName: profile?.name || teacherName || "",
        subject: subject,
        grade: grade,
        date: new Date().toLocaleDateString('pt-BR'),
        studentNameLine: "_________________________________________________",
        maxPoints: "10.0 pts"
      },
      instructions: "Leia atentamente as questões antes de responder. Utilize caneta azul ou preta.",
      questions: [
        {
          id: `q-${Date.now()}-1`,
          number: 1,
          type: "Objetiva",
          difficulty: "Intermediário",
          text: "Enunciado da primeira questão...",
          options: ["Opção A", "Opção B", "Opção C", "Opção D"],
          answer: "Gabarito de referência."
        }
      ],
      estimatedTimeMinutes: 45,
      bnccHabilites: [bncc],
      learningIndexExpected: 88,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      updatedAt: new Date().toLocaleDateString('pt-BR'),
      version: 1
    });
    showToast(' Novo documento pronto para edição.');
  };

  // 2. Handle Selecting a Class Card
  const handleSelectClassCard = (clsId: string) => {
    if (propOnSelectClass) {
      propOnSelectClass(clsId);
    } else {
      setInternalSelectedClass(clsId);
    }

    const cls = activeClasses.find(c => c.id === clsId);
    if (cls) {
      if (cls.name.includes('9º Ano')) {
        setGrade('9º Ano Fundamental');
        setSubject(cls.subject || '');
        setDocument(prev => ({
          ...prev,
          header: {
            ...prev.header,
            grade: '9º Ano Fundamental - 901',
            subject: cls.subject || ''
          }
        }));
      } else if (cls.name.includes('8º Ano')) {
        setGrade('8º Ano Fundamental');
        setSubject(cls.subject || 'História Contemporânea');
        setDocument(prev => ({
          ...prev,
          header: {
            ...prev.header,
            grade: '8º Ano Fundamental - 802',
            subject: cls.subject || 'História Contemporânea'
          }
        }));
      } else if (cls.name.includes('7º Ano')) {
        setGrade('7º Ano Fundamental');
        setSubject(cls.subject || 'História Geral');
        setDocument(prev => ({
          ...prev,
          header: {
            ...prev.header,
            grade: '7º Ano Fundamental - 701',
            subject: cls.subject || 'História Geral'
          }
        }));
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // 3. AI Topic Suggestion
  const handleSuggestTopic = async (subj: string, gr: string) => {
    setIsSuggestingTopic(true);
    try {
      const suggestion = await activitiesService.suggestTopic(subj, gr);
      if (suggestion.topic) setTopic(suggestion.topic);
      if (suggestion.bncc) setBncc(suggestion.bncc);
      if (suggestion.objective) setObjective(suggestion.objective);
      showToast(`Tema sugerido para ${subj}: "${suggestion.topic}"`);
    } catch (err) {
      console.warn('Erro na sugestão:', err);
    } finally {
      setIsSuggestingTopic(false);
    }
  };

  // Generation Steps for animation
  const generationSteps = [
    "Analisando parâmetros curriculares e matriz BNCC...",
    `Consultando descritores curriculares para ${grade}...`,
    "Estruturando enunciados cognitivos, níveis de Bloom e formatação A4...",
    "Adaptando linguagem com critérios pedagógicos inclusivos...",
    "Finalizando cabeçalho institucional e gabarito de referência..."
  ];

  // 4. AI Generation trigger
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationStep(0);

    const interval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev < generationSteps.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1200);

    try {
      const result = await activitiesService.generateActivityAI({
        grade,
        subject,
        topic,
        context,
        objective,
        bncc,
        type: docType,
        difficulty,
        questionCount,
        questionTypes,
        inclusivity,
        teacherName: profile?.name || teacherName,
        schoolName: document.header.schoolName || ""
      });

      if (!result.success || !result.data) {
        throw new Error('Falha no processamento da IA.');
      }

      const data = result.data;
      
      const newDoc: StudioDocument = {
        id: `doc-${Date.now()}`,
        title: data.title || `Atividade de ${subject}: ${topic}`,
        header: {
          ...document.header,
          subject: subject,
          grade: grade,
          date: new Date().toLocaleDateString('pt-BR'),
        },
        instructions: data.instructions || "Leia atentamente as questões antes de responder. Utilize caneta azul ou preta. Justifique suas respostas nas questões abertas.",
        questions: data.questions ? data.questions.map((q: any, idx: number) => ({
          id: `q-${Date.now()}-${idx}`,
          number: idx + 1,
          type: q.type || 'Objetiva',
          difficulty: q.difficulty || difficulty,
          text: q.text,
          options: q.options,
          answer: q.answer
        })) : [],
        estimatedTimeMinutes: data.estimatedTimeMinutes || 45,
        bnccHabilites: data.bnccHabilites || [bncc],
        learningIndexExpected: data.learningIndexExpected || 88,
        createdAt: new Date().toLocaleDateString('pt-BR'),
        updatedAt: new Date().toLocaleDateString('pt-BR'),
        version: 1
      };

      setDocument(newDoc);
      showToast(" Nova atividade gerada com sucesso!");
    } catch (err: any) {
      console.error(err);
      showToast('Atividade estruturada com parâmetros padrão.');
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  // 5. Quick AI Action buttons
  const triggerAIAction = async (action: string) => {
    if (action === 'remover_gabarito') {
      setShowAnswerKey(false);
      showToast(" Gabarito ocultado para impressão!");
      return;
    }
    if (action === 'mostrar_gabarito') {
      setShowAnswerKey(true);
      showToast(" Gabarito de referência reexibido!");
      return;
    }

    setIsGenerating(true);
    setGenerationStep(0);
    try {
      const promptMap: Record<string, string> = {
        'reescrever': 'Reescreva a introdução e torne os enunciados mais instigantes e contextualizados.',
        'facilitar': 'Reduza a complexidade das perguntas para um nível mais introdutório.',
        'dificultar': 'Aumente o nível crítico do documento com perguntas reflexivas.',
        'inclusao': 'Adapte esta atividade para alta legibilidade AEE (autismo e TDAH).'
      };

      const descriptionPrompt = promptMap[action] || `Modifique: ${action}`;

      const res = await activitiesService.generateActivityAI({
        grade,
        subject,
        topic: `${topic} (${descriptionPrompt})`,
        context: `Documento atual: ${JSON.stringify(document)}`,
        objective,
        bncc,
        type: docType,
        difficulty,
        questionCount: document.questions.length,
        questionTypes,
        inclusivity,
        teacherName: profile?.name || teacherName,
        schoolName: document.header.schoolName
      });

      if (!res.success || !res.data) throw new Error('Falha na adaptação rápida.');

      const data = res.data;
      const updatedQuestions = data.questions ? data.questions.map((q: any, idx: number) => ({
        id: `q-upd-${idx}`,
        number: idx + 1,
        type: q.type || 'Dissertativa',
        difficulty: q.difficulty || difficulty,
        text: q.text,
        options: q.options,
        answer: q.answer
      })) : document.questions;

      const updatedDoc = {
        ...document,
        title: data.title || document.title,
        instructions: data.instructions || document.instructions,
        questions: updatedQuestions
      };

      setDocument(updatedDoc);
      showToast(`Ação "${action.toUpperCase()}" aplicada com sucesso!`);
    } catch (err: any) {
      showToast(`Erro na IA: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Add Question manually
  const handleAddQuestion = () => {
    const newQ: DocumentQuestion = {
      id: `q-custom-${Date.now()}`,
      number: document.questions.length + 1,
      type: 'Dissertativa',
      difficulty: 'Intermediário',
      text: 'Escreva aqui o novo enunciado da questão...',
      answer: 'Escreva aqui a resposta / gabarito esperado para o professor...'
    };
    setDocument({ ...document, questions: [...document.questions, newQ] });
  };

  // Delete question
  const handleDeleteQuestion = (idx: number) => {
    const updated = document.questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, number: i + 1 }));
    setDocument({ ...document, questions: updated });
  };

  // Insert image to question
  const handleInsertImageToQuestion = (imageUrl: string, caption?: string) => {
    if (selectedImageQuestionIdx !== null && document.questions[selectedImageQuestionIdx]) {
      const updatedQ = [...document.questions];
      updatedQ[selectedImageQuestionIdx] = {
        ...updatedQ[selectedImageQuestionIdx],
        imageUrl,
        imageCaption: caption || 'Ilustração anexada à questão.'
      };
      setDocument({ ...document, questions: updatedQ });
      setSelectedImageQuestionIdx(null);
    } else {
      const newQ: DocumentQuestion = {
        id: `q-img-${Date.now()}`,
        number: document.questions.length + 1,
        type: 'Desenho',
        difficulty: 'Fácil',
        text: 'Observe a ilustração a seguir e realize a atividade solicitada:',
        imageUrl,
        imageCaption: caption || 'Ilustração pedagógica.',
        answer: 'Verifique a realização da interpretação gráfica.'
      };
      setDocument({ ...document, questions: [...document.questions, newQ] });
    }
    showToast("Ilustração inserida no rascunho com sucesso!");
  };

  // Insert Custom Generator question (Cruzadinha, Caça-Palavras, etc.)
  const handleInsertGeneratorQuestion = (qData: any) => {
    const newQ: DocumentQuestion = {
      id: `q-gen-${Date.now()}`,
      number: document.questions.length + 1,
      ...qData
    };
    setDocument({ ...document, questions: [...document.questions, newQ] });
    showToast(`Recurso "${qData.type}" adicionado ao documento!`);
  };

  // Dynamic Pagination Calculation (4 questions per A4 sheet)
  const QUESTIONS_PER_PAGE = 4;
  const paginatedQuestionGroups = useMemo(() => {
    const groups: DocumentQuestion[][] = [];
    for (let i = 0; i < document.questions.length; i += QUESTIONS_PER_PAGE) {
      groups.push(document.questions.slice(i, i + QUESTIONS_PER_PAGE));
    }
    return groups.length > 0 ? groups : [[]];
  }, [document.questions]);

  // Available standard disciplines
  const allDisciplines = useMemo(() => {
    const defaultList = [
      "História", "Robótica Educacional & IA", "Geografia", "Ciências", "Matemática", "Português", 
      "Artes", "Educação Física", "Filosofia", "Sociologia", "Inglês", 
      "Biologia", "Química", "Física", "Projeto de Vida"
    ];
    if (disciplinesList.length > 0) {
      const dbNames = disciplinesList.map(d => d.name);
      return Array.from(new Set([...defaultList, ...dbNames]));
    }
    return defaultList;
  }, [disciplinesList]);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3 rounded-2xl shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] text-[var(--accent)] font-bold text-xs flex items-center gap-2 no-print">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Minhas Atividades Salvas Modal */}
      {isMyActivitiesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-card)]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 rounded-2xl border border-[var(--border)] text-[var(--accent)]">
                  <FolderOpen className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
                    Banco de Atividades Pedagógicas
                    <span className="text-[10px] font-mono bg-[var(--accent-soft)] text-[var(--accent)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                      {savedActivities.length} {savedActivities.length === 1 ? 'atividade' : 'atividades'}
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Repositório integrado com controle de versão e status.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadSavedActivities}
                  className="p-2 hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  title="Atualizar lista"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingSavedActivities ? 'animate-spin text-[var(--accent)]' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMyActivitiesModalOpen(false)}
                  className="p-2 hover:bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--text-heading)] rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="p-4 bg-[var(--bg-card-alt)] border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por tema, título ou disciplina..."
                  value={savedActivitiesFilter.search}
                  onChange={(e) => setSavedActivitiesFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-heading)] placeholder-slate-500 outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-muted)] font-bold">Status:</span>
                {(['all', 'published', 'draft'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSavedActivitiesFilter(prev => ({ ...prev, status: st }))}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      savedActivitiesFilter.status === st
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-md'
                        : 'bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                    }`}
                  >
                    {st === 'all' ? 'Todas' : st === 'published' ? 'Publicadas' : 'Rascunhos'}
                  </button>
                ))}
              </div>
            </div>

            {/* Activities List / Grid */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3 custom-scrollbar">
              {isLoadingSavedActivities ? (
                <div className="py-12 text-center text-[var(--text-muted)] space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--accent)] mx-auto" />
                  <p className="text-xs">Consultando banco de atividades...</p>
                </div>
              ) : savedActivities.length === 0 ? (
                <div className="py-12 text-center text-[var(--text-muted)] space-y-3">
                  <BookOpen className="w-10 h-10 text-[var(--text-body)] mx-auto" />
                  <p className="text-sm font-medium text-[var(--text-body)]">Nenhuma atividade salva encontrada.</p>
                  <p className="text-xs max-w-sm mx-auto text-[var(--text-muted)]">
                    Clique em "Salvar Rascunho" ou "Publicar" no topo do editor para persistir seu primeiro material pedagógico.
                  </p>
                </div>
              ) : (
                savedActivities
                  .filter(a => {
                    const matchSearch = !savedActivitiesFilter.search || 
                      a.title.toLowerCase().includes(savedActivitiesFilter.search.toLowerCase()) ||
                      a.subject.toLowerCase().includes(savedActivitiesFilter.search.toLowerCase()) ||
                      a.topic.toLowerCase().includes(savedActivitiesFilter.search.toLowerCase());
                    const matchStatus = savedActivitiesFilter.status === 'all' || a.status === savedActivitiesFilter.status;
                    return matchSearch && matchStatus;
                  })
                  .map(act => (
                    <div
                      key={act.id}
                      onClick={() => handleLoadActivity(act)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                        currentActivityId === act.id
                          ? 'bg-[var(--bg-card-alt)] border-[var(--accent)] shadow-lg '
                          : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-alt)] border-[var(--border)]'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                            act.status === 'published'
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-amber-50 border-amber-200'
                          }`}>
                            {act.status === 'published' ? ' Publicada' : ' Rascunho'}
                          </span>
                          <span className="text-[10px] text-amber-700 font-bold bg-[var(--bg-card-alt)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                            {act.subject} • {act.grade}
                          </span>
                          {act.bncc_code && (
                            <span className="text-[9px] text-[var(--text-muted)] font-mono bg-[var(--bg-card-alt)] px-1.5 py-0.5 rounded">
                              {act.bncc_code}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-serif font-bold text-[var(--text-heading)] leading-snug">
                          {act.title}
                        </h4>

                        <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)] flex-wrap">
                          <span>{act.question_count || 4} Questões</span>
                          <span>•</span>
                          <span>{act.difficulty || 'Médio'}</span>
                          <span>•</span>
                          <span>Atualizado em: {new Date(act.updated_at).toLocaleDateString('pt-BR')} às {new Date(act.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Action buttons inside card */}
                      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleLoadActivity(act)}
                          className="px-3 py-1.5 bg-[var(--accent-soft)] hover:bg-[var(--accent)] text-[var(--accent)] hover:text-[var(--accent-fg)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Abrir no Editor</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedActivity(act.id, e)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border)] flex justify-between items-center text-xs text-[var(--text-muted)]">
              <span className="text-[11px]">Banco de atividades sincronizado em tempo real.</span>
              <button
                type="button"
                onClick={() => setIsMyActivitiesModalOpen(false)}
                className="px-4 py-1.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-heading)] rounded-xl text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topo do gerador */}
      <section className="no-print relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6">
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
        <div className="relative flex flex-col gap-5">
          <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
              <Sparkles className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-[24px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)]">Gerador de atividades</h2>
              <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-[var(--text-muted)]">
                Exercícios, provas e simulados alinhados à BNCC. Edite na folha, salve, exporte para Word ou PDF e imprima.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                {teacherSubject && <span className="rounded-full bg-[var(--bg-card-alt)] px-2.5 py-1 text-[var(--text-body)]">{teacherSubject}</span>}
                {currentActivityId ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold"
                    style={activityStatus === 'published' ? { background: '#E7F6EE', color: '#127A4B' } : { background: '#FEF4E6', color: '#A15C07' }}
                  >
                    <Database className="h-3 w-3" />
                    {activityStatus === 'published' ? 'Publicada' : 'Rascunho salvo'}
                    {lastSavedTime ? ` às ${lastSavedTime}` : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-card-alt)] px-2.5 py-1 text-[var(--text-muted)]">
                    <AlertCircle className="h-3 w-3" />
                    Ainda não salva
                  </span>
                )}
              </div>
            </div>
          </div>

        {/* Action Buttons: Repository, Persistence, Export and Print */}
        <div className="relative flex shrink-0 flex-wrap items-center gap-2">
          {/* Minhas Atividades Button */}
          <button
            type="button"
            onClick={() => {
              loadSavedActivities();
              setIsMyActivitiesModalOpen(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[13px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)] disabled:opacity-50 cursor-pointer"
            title="Abrir atividades salvas"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Minhas atividades</span>
            {savedActivities.length > 0 && (
              <span className="rounded-full bg-[var(--accent-soft)] px-1.5 text-[11px] text-[var(--accent)]">
                {savedActivities.length}
              </span>
            )}
          </button>

          {/* Nova Atividade Button */}
          <button
            type="button"
            onClick={handleNewActivity}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[13px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)] disabled:opacity-50 cursor-pointer"
            title="Iniciar nova atividade pedagógica em branco"
          >
            <Plus className="w-4 h-4" />
            <span>Nova</span>
          </button>

          {/* Salvar Rascunho Button */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveActivity('draft')}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[13px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)] disabled:opacity-50 cursor-pointer"
            title="Salvar como rascunho"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar rascunho'}</span>
          </button>

          {/* Salvar e Publicar Button */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveActivity('published')}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-fg)] shadow-[0_8px_20px_-12px_rgba(16,24,40,0.5)] transition-all hover:brightness-[1.06] disabled:opacity-50 cursor-pointer"
            title="Salvar e publicar para acesso institucional"
          >
            <CloudUpload className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Publicar'}</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[13px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)] disabled:opacity-50 cursor-pointer"
              title="Exportar documento pedagógico"
            >
              <FileDown className="w-4 h-4" />
              <span>Exportar</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] p-2 z-50 space-y-1 animate-fade-in">
                <button
                  onClick={() => {
                    exportToWord(document, showAnswerKey && previewMode !== 'aluno');
                    setIsExportDropdownOpen(false);
                    showToast("Documento Word (.docx) exportado com sucesso!");
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[var(--text-heading)] hover:bg-[var(--bg-card-alt)] rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[var(--accent)]" />
                  <span>Salvar como Word (.docx)</span>
                </button>
                <button
                  onClick={() => {
                    exportToPDF();
                    setIsExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[var(--text-heading)] hover:bg-[var(--bg-card-alt)] rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-red-700" />
                  <span>Salvar como PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Botão Imprimir */}
          <button
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[13px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)] disabled:opacity-50 cursor-pointer"
            title="Imprimir atividade diretamente em formato A4 oficial"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
        </div>
      </section>

      {/* 2. MAIN WORKSPACE GRID: Parâmetros Curriculares (Col 4) & Live A4 Editor Canvas (Col 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Parâmetros Curriculares (Col 4) */}
        <div className="lg:col-span-4 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-3xl p-6 space-y-5 h-fit max-h-[90vh] overflow-y-auto custom-scrollbar no-print shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--accent)]">Parâmetros Curriculares</span>
            </div>
            <span className="text-[9px] bg-amber-50 text-[var(--accent)] px-2 py-0.5 rounded-full border border-[var(--border)] font-bold">
              BNCC / Automática
            </span>
          </div>

          <div className="space-y-4">
            {/* Turma / Integração com Minhas Turmas */}
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-muted)] font-bold block">
                Vincular a Minhas Turmas (Automático)
              </label>
              <select 
                value={currentSelectedClassId}
                onChange={(e) => handleSelectClassCard(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[var(--accent)] transition-colors"
              >
                {activeClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.subject || 'Geral'})
                  </option>
                ))}
              </select>
            </div>

            {/* Ano Escolar */}
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-muted)] font-bold block">Ano Escolar</label>
              <select 
                value={grade}
                onChange={(e) => {
                  setGrade(e.target.value);
                  handleSuggestTopic(subject, e.target.value);
                }}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-heading)] outline-none focus:border-[var(--accent)] transition-colors"
              >
                {[
                  "1º Ano Fundamental", "2º Ano Fundamental", "3º Ano Fundamental", 
                  "4º Ano Fundamental", "5º Ano Fundamental", "6º Ano Fundamental", 
                  "7º Ano Fundamental", "8º Ano Fundamental", "9º Ano Fundamental", 
                  "1º Ensino Médio", "2º Ensino Médio", "3º Ensino Médio"
                ].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Disciplina */}
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-muted)] font-bold block">Disciplina</label>
              <select 
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  handleSuggestTopic(e.target.value, grade);
                }}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-heading)] outline-none focus:border-[var(--accent)] transition-colors"
              >
                {allDisciplines.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Tema Principal / Conteúdo (com Sugestão por IA) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-[var(--text-muted)] font-bold block">
                  Tema / Conteúdo / Texto-Base
                </label>
                <button
                  type="button"
                  onClick={() => handleSuggestTopic(subject, grade)}
                  disabled={isSuggestingTopic}
                  className="text-[9px] text-[var(--accent)] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Sugerir novo tema pedagógico com IA"
                >
                  <Sparkles className={`w-3 h-3 text-[var(--accent)] ${isSuggestingTopic ? 'animate-spin' : ''}`} />
                  <span>{isSuggestingTopic ? 'Sugerindo...' : 'Sugerir IA'}</span>
                </button>
              </div>
              <input 
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: A Revolução Industrial e suas Transformações..."
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-heading)] outline-none focus:border-[var(--accent)] transition-colors font-medium"
              />
            </div>

            {/* Destaque / Foco Pedagógico */}
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-muted)] font-bold block">
                Destaque / Foco Pedagógico (O que enfatizar?)
              </label>
              <textarea 
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                placeholder="Foco nas mudanças sociais, surgimento das fábricas e emigração campo-cidade..."
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--text-heading)] outline-none focus:border-[var(--accent)] transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Dificuldade */}
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-muted)] font-bold block">Dificuldade</label>
              <select 
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-heading)] outline-none focus:border-[var(--accent)] transition-colors"
              >
                {["Fácil", "Intermediário", "Avançado", "Desafio Olímpico"].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Tipo de Documento */}
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-muted)] font-bold block">Tipo de Documento</label>
              <select 
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-heading)] outline-none focus:border-[var(--accent)] transition-colors"
              >
                {["Atividade", "Prova Bimestral", "Simulado Diagnóstico", "Exercício de Fixação", "Caça-Palavras / Cruzadinha", "Lista de Exercícios", "Recuperação Paralela"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Quantidade de Questões */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-muted)]">
                <span>Quantidade de Questões</span>
                <span className="text-[var(--accent)] font-mono font-bold text-xs">{questionCount}</span>
              </div>
              <input 
                type="range"
                min="1"
                max="20"
                step="1"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                className="w-full accent-gold bg-[var(--bg-card)] cursor-pointer"
              />
            </div>

            {/* Formatos de Questão */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] text-[var(--text-muted)] font-bold block">
                Formatos de Questão
              </label>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-body)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={questionTypes.objetivas} 
                    onChange={(e) => setQuestionTypes({ ...questionTypes, objetivas: e.target.checked })}
                    className="accent-gold rounded"
                  />
                  <span>Objetivas (M.E.)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={questionTypes.dissertativas} 
                    onChange={(e) => setQuestionTypes({ ...questionTypes, dissertativas: e.target.checked })}
                    className="accent-gold rounded"
                  />
                  <span>Dissertativas</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={questionTypes.vf} 
                    onChange={(e) => setQuestionTypes({ ...questionTypes, vf: e.target.checked })}
                    className="accent-gold rounded"
                  />
                  <span>V / F</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={questionTypes.associacao} 
                    onChange={(e) => setQuestionTypes({ ...questionTypes, associacao: e.target.checked })}
                    className="accent-gold rounded"
                  />
                  <span>Associação</span>
                </label>
              </div>
            </div>

            {/* Acessibilidade & Inclusão */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] text-purple-700 font-bold block flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-700" />
                <span>Adaptação Inclusiva / AEE</span>
              </label>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-body)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={inclusivity.autismo} 
                    onChange={(e) => setInclusivity({ ...inclusivity, autismo: e.target.checked })}
                    className="accent-purple-500 rounded"
                  />
                  <span>TEA / Autismo</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={inclusivity.tdah} 
                    onChange={(e) => setInclusivity({ ...inclusivity, tdah: e.target.checked })}
                    className="accent-purple-500 rounded"
                  />
                  <span>TDAH</span>
                </label>
              </div>
            </div>

            {/* GENERATE BUTTON */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-[var(--accent)] to-purple-600 hover:brightness-110 active:scale-[0.99] text-[var(--accent-fg)] rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              <Sparkles className="w-4 h-4 text-[var(--text-heading)] animate-pulse" />
              <span>{isGenerating ? 'Gerando com IA...' : 'Gerar atividade com IA'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Document Workspace Area (Col 8) */}
        <div className="lg:col-span-8 space-y-4 flex flex-col">
          
          {/* RTE Toolbar */}
          <EditorToolbar
            onInsertTable={() => {
              const tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #cbd5e1;"><tr style="background:#f1f5f9;"><th style="border:1px solid #cbd5e1; padding:6px;">Item</th><th style="border:1px solid #cbd5e1; padding:6px;">Descrição</th></tr><tr><td style="border:1px solid #cbd5e1; padding:6px;">---</td><td style="border:1px solid #cbd5e1; padding:6px;">---</td></tr></table>`;
              const updatedQuestions = [...document.questions];
              if (updatedQuestions[0]) {
                updatedQuestions[0].text += `<br/>${tableHtml}`;
                setDocument({ ...document, questions: updatedQuestions });
              }
            }}
            onInsertTextBox={() => {
              const boxHtml = `<div style="padding: 10px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; margin: 10px 0;"><strong>Caixa Destaque:</strong> Insira aqui o texto de apoio ou citação...</div>`;
              const updatedQuestions = [...document.questions];
              if (updatedQuestions[0]) {
                updatedQuestions[0].text += `<br/>${boxHtml}`;
                setDocument({ ...document, questions: updatedQuestions });
              }
            }}
            onInsertImageModal={() => setIsImageModalOpen(true)}
            onInsertWatermark={(text) => {
              setDocument({
                ...document,
                header: { ...document.header, watermarkText: text, showWatermark: true }
              });
            }}
            onInsertQRCode={() => showToast("QR Code de apoio pedagógico inserido!")}
            onInsertSignatureLine={() => {
              const sigQ: DocumentQuestion = {
                id: `q-sig-${Date.now()}`,
                number: document.questions.length + 1,
                type: 'Dissertativa',
                difficulty: 'Fácil',
                text: 'Assinatura do Responsável / Professor(a):\n_________________________________________________',
                answer: 'Visto pedagógico retido.'
              };
              setDocument({ ...document, questions: [...document.questions, sigQ] });
            }}
            onToggleAnswerKey={() => {
              const nextVal = !showAnswerKey;
              setShowAnswerKey(nextVal);
              showToast(nextVal ? " Gabarito visível no documento!" : " Gabarito removido para impressão do aluno!");
            }}
            showAnswerKey={showAnswerKey}
            onOpenGeneratorsModal={() => setIsGeneratorsModalOpen(true)}
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
            fontSize={fontSize}
            setFontSize={setFontSize}
            textColor={textColor}
            setTextColor={setTextColor}
          />

          {/* VIEW / QUICK ACTIONS STRIP */}
          <div className="bg-[var(--bg-card-alt)] border border-[var(--border)] p-3 rounded-2xl flex flex-wrap gap-3 items-center justify-between no-print text-xs shadow-md">
            {/* View Mode Buttons */}
            <div className="flex gap-1.5 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border)] font-semibold">
              <button 
                onClick={() => {
                  setPreviewMode('notebook');
                  setShowAnswerKey(true);
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  previewMode === 'notebook' ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border)]' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Modo Documento</span>
              </button>
              <button 
                onClick={() => {
                  setPreviewMode('aluno');
                  setShowAnswerKey(false);
                  showToast("Visualização Aluno ativada: Gabarito ocultado e linhas abertas prontas para preenchimento.");
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  previewMode === 'aluno' ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border)]' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Visualização Aluno</span>
              </button>
              <button 
                onClick={() => setPreviewMode('celular')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  previewMode === 'celular' ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border)]' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Visualização Mobile</span>
              </button>
            </div>

            {/* Quick AI Action buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-[var(--accent)] font-bold">Ações Rápidas:</span>
              <button 
                onClick={() => triggerAIAction('reescrever')}
                className="px-2.5 py-1 bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] border border-[var(--border)] rounded-lg text-[10px] font-bold text-[var(--text-body)] transition-all cursor-pointer"
              >
                 Reescrever
              </button>
              <button 
                onClick={() => triggerAIAction('facilitar')}
                className="px-2.5 py-1 bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] border border-[var(--border)] rounded-lg text-[10px] font-bold text-[var(--text-body)] transition-all cursor-pointer"
              >
                 Diminuir Rigor
              </button>
              <button 
                onClick={() => triggerAIAction('dificultar')}
                className="px-2.5 py-1 bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] border border-[var(--border)] rounded-lg text-[10px] font-bold text-[var(--text-body)] transition-all cursor-pointer"
              >
                 Aumentar Rigor
              </button>
              <button 
                onClick={() => triggerAIAction('inclusao')}
                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-50 border border-purple-200 rounded-lg text-[10px] font-bold text-purple-300 transition-all cursor-pointer"
              >
                 Inclusão AEE
              </button>
            </div>
          </div>

          {/* CABEÇALHO REPOSICIONADO: Aba/Card acima da folha A4 (no-print) */}
          <div className="bg-[var(--bg-card-alt)] border border-[var(--border)] p-4 rounded-2xl space-y-3 no-print shadow-md">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-xs font-bold text-[var(--text-heading)]">
                  Personalização de Cabeçalho da Atividade
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHeaderCustomizer(!showHeaderCustomizer)}
                className="text-[11px] text-[var(--accent)] font-bold underline cursor-pointer"
              >
                {showHeaderCustomizer ? 'Ocultar Opções' : 'Configurar Cabeçalho & Logo'}
              </button>
            </div>

            {showHeaderCustomizer && (
              <div className="pt-2 border-t border-[var(--border)] space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] text-[var(--text-muted)] font-bold">Modelo:</span>
                  {[
                    { id: 'tradicional', label: '1. Tradicional' },
                    { id: 'moderno', label: '2. Moderno' },
                    { id: 'infantil', label: '3. Ed. Infantil' },
                    { id: 'municipal', label: '4. Rede Municipal' },
                    { id: 'estadual', label: '5. Rede Estadual' },
                    { id: 'particular', label: '6. Colégio Particular' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDocument({
                        ...document,
                        header: { ...document.header, model: m.id as HeaderModel }
                      })}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        document.header.model === m.id
                          ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-semibold shadow-sm'
                          : 'bg-[var(--bg-card-alt)] text-[var(--text-body)] hover:text-[var(--text-heading)]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] font-bold block mb-1">Nome da Escola</label>
                    <input
                      type="text"
                      value={document.header.schoolName}
                      onChange={(e) => setDocument({
                        ...document,
                        header: { ...document.header, schoolName: e.target.value }
                      })}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-heading)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] font-bold block mb-1">Nome do Professor(a)</label>
                    <input
                      type="text"
                      value={document.header.teacherName}
                      onChange={(e) => setDocument({
                        ...document,
                        header: { ...document.header, teacherName: e.target.value }
                      })}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-heading)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loading Animation */}
          {isGenerating ? (
            <div className="bg-[var(--bg-card-alt)] border border-[var(--border)] p-12 rounded-3xl flex-1 flex flex-col items-center justify-center text-center space-y-6 min-h-[500px]">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-purple-500 opacity-30"></span>
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center border border-purple-500">
                  <Brain className="w-6 h-6 text-purple-700 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-[var(--text-heading)]">IA Generativa em Execução</h4>
                <div className="text-xs text-purple-700 font-mono mt-1">
                  {generationSteps[generationStep]}
                </div>
                <div className="w-64 h-1.5 bg-oxford/50 rounded-full overflow-hidden mx-auto border border-[var(--border)]">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-[var(--accent)] rounded-full transition-all duration-1000" 
                    style={{ width: `${((generationStep + 1) / generationSteps.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            /* A4 DOCUMENT PAGINATION RENDER */
            <div className="space-y-8">
              {paginatedQuestionGroups.map((pageQuestions, pageIdx) => (
                <div 
                  key={pageIdx}
                  className={`print-canvas-only bg-[var(--bg-card)] text-[var(--text-heading)] p-8 md:p-12 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] transition-all duration-300 relative border border-[var(--border)] rounded-2xl min-h-[850px] flex flex-col justify-between ${
                    previewMode === 'celular' ? 'max-w-[390px] mx-auto text-[11px] p-4' : 'w-full text-xs'
                  }`}
                  style={{ fontFamily }}
                >
                  <div>
                    {/* Header on Page 1 (or condensed on subsequent pages) */}
                    {pageIdx === 0 ? (
                      <HeaderTemplates
                        headerData={document.header}
                        onChangeHeader={(updatedHeader) => setDocument({ ...document, header: updatedHeader })}
                        isEditable={false}
                      />
                    ) : (
                      <div className="border-b border-[var(--border)] pb-2 mb-6 flex justify-between items-center text-[10px] text-[var(--text-muted)]">
                        <span className="font-bold">{document.header.schoolName}</span>
                        <span>{document.title} • Página {pageIdx + 1} de {paginatedQuestionGroups.length}</span>
                      </div>
                    )}

                    {/* Title & Instructions on Page 1 */}
                    {pageIdx === 0 && (
                      <div className="space-y-4 mb-6">
                        <input
                          type="text"
                          value={document.title}
                          onChange={(e) => setDocument({ ...document, title: e.target.value })}
                          className="w-full text-center text-base md:text-xl font-serif font-semibold text-[var(--text-heading)] bg-transparent outline-none focus:bg-amber-50 rounded p-1"
                        />
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 leading-relaxed italic text-[11px]">
                          <strong className="text-amber-900">Instruções:</strong>{' '}
                          <input
                            type="text"
                            value={document.instructions}
                            onChange={(e) => setDocument({ ...document, instructions: e.target.value })}
                            className="w-full bg-transparent outline-none italic text-amber-950 font-medium mt-0.5"
                          />
                        </div>
                      </div>
                    )}

                    {/* Questions on this Page */}
                    <div className="space-y-6">
                      {pageQuestions.map((quest, qIdx) => {
                        const globalIndex = pageIdx * QUESTIONS_PER_PAGE + qIdx;
                        return (
                          <div key={quest.id || globalIndex} className="space-y-3 group/quest relative border border-transparent hover:border-[var(--border)] p-2 rounded-xl transition-all">
                            
                            {/* Question controls bar (no-print) */}
                            <div className="no-print opacity-0 group-hover/quest:opacity-100 transition-opacity absolute top-1 right-1 flex items-center gap-1 bg-[var(--bg-card-alt)] p-1 rounded-lg border border-[var(--border)] text-[9px] text-[var(--text-heading)] z-20">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedImageQuestionIdx(globalIndex);
                                  setIsImageModalOpen(true);
                                }}
                                className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 rounded font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <ImageIcon className="w-3 h-3" />
                                <span>+ Imagem</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(globalIndex)}
                                className="p-1 text-red-700 hover:text-red-300 hover:bg-red-50 rounded cursor-pointer"
                                title="Excluir Questão"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="flex items-start gap-3">
                              {/* Question Number Badge */}
                              <span className="w-6 h-6 rounded-full bg-[var(--bg-card-alt)] border border-[var(--border)] text-[var(--text-heading)] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                {quest.number || (globalIndex + 1)}
                              </span>

                              <div className="flex-1 space-y-2">
                                {/* Question Text (Editable) */}
                                <textarea
                                  rows={2}
                                  value={quest.text}
                                  onChange={(e) => {
                                    const updated = [...document.questions];
                                    updated[globalIndex].text = e.target.value;
                                    setDocument({ ...document, questions: updated });
                                  }}
                                  className="w-full font-medium text-[var(--text-heading)] leading-relaxed bg-transparent outline-none focus:bg-amber-50 rounded p-1 border border-transparent focus:border-[var(--border)] resize-y"
                                />

                                {/* Attached Illustration / Drawing */}
                                {quest.imageUrl && (
                                  <div className="my-3 p-3 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl space-y-2 max-w-md relative group/img">
                                    <img
                                      src={quest.imageUrl}
                                      alt="Ilustração"
                                      className="w-full max-h-64 object-contain rounded-lg border border-[var(--border)]"
                                    />
                                    {quest.imageCaption && (
                                      <p className="text-[10px] italic text-[var(--text-muted)] text-center font-medium">
                                        {quest.imageCaption}
                                      </p>
                                    )}

                                    {/* In-document Image Controls (no-print) */}
                                    <div className="no-print flex flex-wrap gap-1 pt-1 justify-center border-t border-[var(--border)]">
                                      <button
                                        type="button"
                                        onClick={() => showToast(" Estilo de linha PB para colorir!")}
                                        className="px-2 py-1 bg-[var(--bg-card-alt)] hover:bg-[var(--border)] text-[var(--text-heading)] rounded text-[9px] font-bold cursor-pointer"
                                      >
                                        Colorir / PB
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedImageQuestionIdx(globalIndex);
                                          setIsImageModalOpen(true);
                                        }}
                                        className="px-2 py-1 bg-[var(--bg-card-alt)] hover:bg-[var(--border)] text-[var(--text-heading)] rounded text-[9px] font-bold cursor-pointer"
                                      >
                                        Trocar Imagem
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...document.questions];
                                          delete updated[globalIndex].imageUrl;
                                          setDocument({ ...document, questions: updated });
                                        }}
                                        className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-[9px] font-bold cursor-pointer"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Multiple Choice Options */}
                                {quest.options && quest.options.length > 0 && (
                                  <div className="grid grid-cols-1 gap-1.5 pl-2 my-2">
                                    {quest.options.map((opt, oIdx) => (
                                      <div key={oIdx} className="flex items-center gap-2 text-[var(--text-body)]">
                                        <span className="w-5 h-5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[10px] font-bold flex items-center justify-center shrink-0 font-mono">
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) => {
                                            const updated = [...document.questions];
                                            if (updated[globalIndex].options) {
                                              updated[globalIndex].options![oIdx] = e.target.value;
                                              setDocument({ ...document, questions: updated });
                                            }
                                          }}
                                          className="w-full bg-transparent outline-none focus:bg-amber-50 rounded px-1 font-medium text-xs"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Open Question Writing Lines for Student Mode */}
                                {(!quest.options || quest.options.length === 0) && (
                                  <div className="py-2 space-y-3">
                                    <div className="h-4 border-b border-[var(--border)] border-dashed"></div>
                                    <div className="h-4 border-b border-[var(--border)] border-dashed"></div>
                                    <div className="h-4 border-b border-[var(--border)] border-dashed"></div>
                                  </div>
                                )}

                                {/* Gabarito Docente de Referência */}
                                {showAnswerKey && previewMode !== 'aluno' ? (
                                  <div className="mt-2.5 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[10px] font-mono leading-relaxed">
                                    <span className="font-bold text-emerald-950 block text-[8px] mb-0.5">
                                       Gabarito Docente de Referência & Habilidade BNCC
                                    </span>
                                    <input
                                      type="text"
                                      value={quest.answer}
                                      onChange={(e) => {
                                        const updated = [...document.questions];
                                        updated[globalIndex].answer = e.target.value;
                                        setDocument({ ...document, questions: updated });
                                      }}
                                      className="w-full bg-transparent outline-none font-bold text-emerald-900"
                                    />
                                  </div>
                                ) : (
                                  <div className="no-print p-1 text-[9px] italic text-[var(--text-muted)]">
                                    (Gabarito ocultado para o caderno de prova do aluno)
                                  </div>
                                )}

                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer on each A4 Page */}
                  <div className="pt-6 border-t border-[var(--border)] flex justify-between items-center text-[9px] text-[var(--text-muted)] font-mono mt-6">
                    <div>
                      <strong>Habilidades BNCC:</strong> {document.bnccHabilites.join(', ')}
                    </div>
                    <div>
                      Página {pageIdx + 1} de {paginatedQuestionGroups.length}
                    </div>
                  </div>

                </div>
              ))}

              {/* Add Question Button (no-print) */}
              <div className="no-print pt-2">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full py-3 border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] rounded-xl text-[var(--text-muted)] font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Nova Questão Manualmente</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}