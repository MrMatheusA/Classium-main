import React, { useState } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { PartnerRegistrationFlow } from '../commercial/PartnerRegistrationFlow';
import { 
  Search, MapPin, Star, Filter, MessageSquare, Briefcase, Award, CheckCircle, AlertCircle,
  Calendar, Clock, Video, Phone, ShieldCheck, Shield, Check, ExternalLink, Sparkles, BookOpen,
  GraduationCap, UserCheck, FileText, Lock, Plus, ChevronRight, X, Zap, DollarSign, Crown,
  Globe, Instagram, ThumbsUp, Heart, Share2, Send, CheckCircle2, User, Play, Map, ShieldAlert, BadgeCheck,
  Building2, ArrowRight
} from 'lucide-react';

export interface Professional {
  id: string;
  name: string;
  displayName?: string;
  title: string;
  roleType: string;
  category?: string;
  subjects: string[];
  pricePerHour: number;
  pricingType?: string;
  discountBadge?: string;
  rating: number;
  reviewCount: number;
  location: string;
  neighborhood: string;
  city?: string;
  state?: string;
  avatarUrl: string;
  coverUrl: string;
  videoUrl?: string;
  planTier: 'basico' | 'prata' | 'ouro' | 'diamante' | 'premium' | 'destaque' | string;
  planName?: string;
  isVerified: boolean;
  cpfValidated?: boolean;
  degrees: string[];
  secondDegree?: string;
  postGraduation: string;
  specialization?: string;
  masterDegree?: string;
  doctorateDegree?: string;
  certifications?: string;
  experienceYears: number;
  servicedCount?: number;
  targetAudience?: string[];
  bio: string;
  methodology?: string;
  materialsUsed?: string;
  languages?: string[];
  university: string;
  modalities: ('Presencial' | 'Online' | 'Híbrido')[];
  availableDays: string[];
  availablePeriods?: string[];
  scheduleSlots: { day: string; time: string; status: 'Livre' | 'Ocupado' }[];
  whatsapp: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
  reviews: { id: string; author: string; date: string; rating: number; comment: string }[];
}

export function TutorsMarketplaceTab() {
  const { professionals, partnerAds, updatePartnerAd } = usePlatform();

  // Mentis Therapy Dynamic Ad
  const mentisAd = partnerAds?.find(ad => ad.isMentisTherapy || ad.id === 'mentis-therapy-1') || partnerAds?.[0] || null;

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [selectedModality, setSelectedModality] = useState<string>('todas');
  const [selectedCity, setSelectedCity] = useState<string>('todas');
  const [maxPrice, setMaxPrice] = useState<number>(150);
  const [onlyVerified, setOnlyVerified] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);

  // Active modal views
  const [activeProfessional, setActiveProfessional] = useState<Professional | null>(null);
  const [showPlansModal, setShowPlansModal] = useState<boolean>(false);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);
  const [showBookingModal, setShowBookingModal] = useState<Professional | null>(null);

  // Booking Form State
  const [bookingDate, setBookingDate] = useState<string>('2026-07-28');
  const [bookingTime, setBookingTime] = useState<string>('09:00');
  const [bookingModality, setBookingModality] = useState<'Presencial' | 'Online'>('Presencial');
  const [bookingSubject, setBookingSubject] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);

  // Registration Form State
  const [regForm, setRegForm] = useState({
    name: '',
    cpf: '',
    role: 'Professor de reforço',
    city: 'Curitiba - PR',
    hourlyRate: '80',
    plan: 'premium',
    docUploaded: false
  });
  const [regSubmitted, setRegSubmitted] = useState(false);

  // Auto-detect Student Performance AI Recommendation
  const [smartAiAlert] = useState({
    active: true,
    studentName: 'João Silva de Alencar',
    grade: '7º Ano A',
    lowSubject: 'Matemática',
    average: '6.0',
    recommendation: 'A Super IA Classium identificou uma oscilação na média de Matemática (6.0). Encontramos 8 especialistas verificados próximos à sua residência recomendados para recomposição de aprendizagem.',
  });

  // Main broad categories tabs
  const broadCategories = [
    { id: 'todas', label: '🌟 Todos os Especialistas', icon: Sparkles },
    { id: 'Profissionais da Educação', label: '🎓 Profissionais da Educação', icon: GraduationCap },
    { id: 'Profissionais da Saúde', label: '🩺 Profissionais da Saúde', icon: Heart },
    { id: 'Serviços Domésticos', label: '🧹 Serviços Domésticos', icon: Building2 },
    { id: 'Outros Especialistas', label: '💡 Outros Especialistas', icon: Award }
  ];

  // Categories list for filter dropdown / buttons
  const categoriesList = [
    { value: 'todas', label: 'Todas as Especialidades' },
    { value: 'Profissionais da Educação', label: '🎓 Todos da Educação' },
    { value: 'Professor de reforço', label: '• Reforço Escolar (Matemática, Física, Química)' },
    { value: 'Psicopedagogo', label: '• Psicopedagogia & Neuropsicopedagogia' },
    { value: 'AEE / Inclusiva', label: '• Educação Inclusiva (AEE / Autismo / TDAH)' },
    { value: 'Alfabetização', label: '• Alfabetização & Letramento' },
    { value: 'Professor de idiomas', label: '• Idiomas (Inglês, Espanhol, Francês)' },
    { value: 'Profissionais da Saúde', label: '🩺 Todos da Saúde' },
    { value: 'Psicólogo', label: '• Psicologia & Psicanálise Infantil/Familiar' },
    { value: 'Dentista', label: '• Odontopediatria & Saude Bucal' },
    { value: 'Oftalmologista', label: '• Oftalmologia Pediatrica' },
    { value: 'Fonoaudiólogo', label: '• Fonoaudiologia Escolar' },
    { value: 'Serviços Domésticos', label: '🧹 Todos de Serviços Domésticos' },
    { value: 'Empregada Doméstica', label: '• Empregada Doméstica & Organização' },
    { value: 'Cuidadora', label: '• Cuidadora Infantil & Babá' },
    { value: 'Outros Especialistas', label: '💡 Outros Serviços' },
    { value: 'Robótica & Programação', label: '• Robótica, Programação & IA' },
    { value: 'Música & Instrumentos', label: '• Música, Canto & Instrumentos' }
  ];

  // Filter logic
  const filteredProfessionals = professionals.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.roleType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesCategory = selectedCategory === 'todas';
    if (!matchesCategory) {
      if (selectedCategory === 'Profissionais da Educação') {
        matchesCategory = ['professor', 'pedagogo', 'psicopedagogo', 'alfabetização', 'aee', 'reforço', 'idiomas', 'redação', 'educação'].some(k => 
          (p.roleType || '').toLowerCase().includes(k) || (p.title || '').toLowerCase().includes(k)
        );
      } else if (selectedCategory === 'Profissionais da Saúde') {
        matchesCategory = ['psicólogo', 'psicóloga', 'psicanalista', 'dentista', 'oftalmologista', 'fonoaudiólogo', 'nutricionista', 'terapeuta', 'médico', 'saúde', 'mentis'].some(k => 
          (p.roleType || '').toLowerCase().includes(k) || (p.title || '').toLowerCase().includes(k)
        );
      } else if (selectedCategory === 'Serviços Domésticos') {
        matchesCategory = ['empregada', 'doméstica', 'cuidadora', 'babá', 'apoio doméstico', 'cozinheira', 'limpeza'].some(k => 
          (p.roleType || '').toLowerCase().includes(k) || (p.title || '').toLowerCase().includes(k)
        );
      } else if (selectedCategory === 'Outros Especialistas') {
        matchesCategory = ['robótica', 'programação', 'música', 'artes', 'oratória', 'xadrez', 'esportes'].some(k => 
          (p.roleType || '').toLowerCase().includes(k) || (p.title || '').toLowerCase().includes(k)
        );
      } else {
        matchesCategory = p.roleType === selectedCategory || (p.title || '').toLowerCase().includes(selectedCategory.toLowerCase());
      }
    }

    const matchesModality = selectedModality === 'todas' || p.modalities.includes(selectedModality as any);
    const matchesCity = selectedCity === 'todas' || p.location.includes(selectedCity);
    const matchesPrice = p.pricePerHour <= maxPrice;
    const matchesVerified = !onlyVerified || p.isVerified;
    const matchesRating = p.rating >= minRating;

    return matchesSearch && matchesCategory && matchesModality && matchesCity && matchesPrice && matchesVerified && matchesRating;
  });

  const handleOpenBooking = (prof: Professional) => {
    setShowBookingModal(prof);
    setBookingSubject(prof.subjects?.[0] || 'Reforço Pedagógico');
    setBookingSuccess(false);
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSuccess(true);

    if (showBookingModal) {
      fetch('/api/family/specialists/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialist_id: showBookingModal.id,
          specialist_name: showBookingModal.name,
          student_id: 'std-1',
          student_name: smartAiAlert?.studentName || 'João Silva de Alencar',
          guardian_name: 'Maria das Graças Silva',
          guardian_phone: '(11) 98765-4321',
          booking_date: bookingDate,
          booking_time: bookingTime,
          modality: bookingModality,
          subject: bookingSubject,
          notes: bookingNotes
        })
      }).catch(() => {});
    }

    setTimeout(() => {
      setBookingSuccess(false);
      setShowBookingModal(null);
    }, 2500);
  };

  const handleSubmitReg = (e: React.FormEvent) => {
    e.preventDefault();
    setRegSubmitted(true);
    setTimeout(() => {
      setRegSubmitted(false);
      setShowRegistrationModal(false);
    }, 2500);
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. HERO HEADER BANNER - ENCONTRE UM ESPECIALISTA WITH PREMIUM REGISTRATION PANEL */}
      <div className="bg-gradient-to-r from-oxford via-[#0e1d3e] to-[#1a1138] rounded-3xl p-6 sm:p-8 text-white border border-gold/40 shadow-2xl relative overflow-hidden">
        {/* Decorative blur glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-12 -bottom-12 w-80 h-80 bg-gold/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-stretch justify-between gap-6">
          {/* LEFT CONTENT FOR FAMILIES */}
          <div className="space-y-4 max-w-xl flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-gradient-to-r from-amber-400 via-gold to-yellow-500 text-slate-950 font-serif text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" /> ENCONTRE UM ESPECIALISTA
                </span>
                <span className="bg-gold/15 text-gold text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-gold/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-gold" /> 100% Verificados
                </span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                Encontre um Especialista
              </h2>
              <p className="text-xs sm:text-sm text-ice/90 font-light leading-relaxed">
                Conecte-se com professores de reforço, Psicólogos, Psicanalistas, Dentistas, Oftalmologistas, Empregada doméstica, Cuidadora, Reforço Escolar, Psicopedagogos, Educadores de Inclusão (AEE) entre outros profissionais que podem ajudar sua família.
              </p>

              {/* Quick stats pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs text-emerald-300 font-medium flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" /> Aferição de CPF, Registro Profissional & Antecedentes
                </span>
                <span className="text-xs text-amber-300 font-medium flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Integração com Histórico Escolar do Aluno
                </span>
              </div>
            </div>

            {/* Selo de Segurança button */}
            <div className="pt-2">
              <button
                onClick={() => setShowSecurityModal(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 text-ice hover:bg-white/15 font-bold text-xs uppercase tracking-wider border border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Selo de Segurança & Homologação
              </button>
            </div>
          </div>

          {/* ELEGANT DIVIDER LINE */}
          <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-gold/50 to-transparent my-2"></div>
          <div className="block lg:hidden h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent my-1"></div>

          {/* RIGHT CONTENT: PAINEL PREMIUM DOURADO DE CAPTAÇÃO DE PROFISSIONAIS */}
          <div className="w-full lg:w-[460px] shrink-0 bg-gradient-to-b from-slate-900 via-[#181228] to-slate-950 border-2 border-gold/60 backdrop-blur-xl rounded-2xl p-5 shadow-[0_0_25px_rgba(212,175,55,0.25)] relative flex flex-col justify-between space-y-4 text-left">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-gradient-to-r from-gold/30 via-amber-400/20 to-gold/30 text-gold text-[10px] font-serif font-black uppercase tracking-widest px-3 py-1 rounded-full border border-gold/50 flex items-center gap-1.5 shadow-sm">
                  <Crown className="w-3.5 h-3.5 text-gold animate-pulse" /> Cadastro de Profissionais
                </span>
                <span className="text-[10px] text-amber-300 font-bold bg-amber-950/80 border border-gold/50 px-2.5 py-0.5 rounded-full">
                  Rede de Parceiros
                </span>
              </div>

              <h3 className="font-serif text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-gold to-yellow-400 leading-snug">
                É um profissional da Educação, Saúde, Particular?
              </h3>

              <p className="text-xs text-amber-100/90 font-light leading-relaxed">
                Cadastre-se agora e conecte-se com milhares de famílias Classium em busca dos seus serviços!
              </p>

              {/* Lista complementar de profissionais */}
              <div className="p-3 bg-black/50 border border-gold/30 rounded-xl text-[10px] text-slate-200 leading-relaxed max-h-24 overflow-y-auto shadow-inner">
                <strong className="text-gold block mb-1 font-serif">Áreas e Especialidades atendidas:</strong>
                Professores de reforço • Psicólogos • Psicanalistas • Dentistas • Oftalmologistas • Empregada doméstica • Cuidadora • Reforço Escolar • Psicopedagogos • Educadores de Inclusão (AEE) • Fonoaudiólogos • Nutricionistas • Babás • Professores de Idiomas e Música.
              </div>

              {/* Indicadores Dourados Premium */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-ice font-medium">
                <div className="flex items-center gap-1 text-amber-300"><Check className="w-3.5 h-3.5 text-gold shrink-0" /> Perfil Verificado</div>
                <div className="flex items-center gap-1 text-amber-300"><Check className="w-3.5 h-3.5 text-gold shrink-0" /> Publicação Destaque Gold</div>
                <div className="flex items-center gap-1 text-amber-300"><Check className="w-3.5 h-3.5 text-gold shrink-0" /> Leads em Tempo Real</div>
                <div className="flex items-center gap-1 text-amber-300"><Check className="w-3.5 h-3.5 text-gold shrink-0" /> Contato Direto via WhatsApp</div>
              </div>
            </div>

            {/* Botão principal de cadastro com estilo Dourado Premium */}
            <button
              onClick={() => setShowRegistrationModal(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-gold to-yellow-500 text-slate-950 font-serif font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 border border-yellow-200 cursor-pointer"
            >
              🚀 CADASTRE-SE AGORA
            </button>
          </div>
        </div>
      </div>

      {/* 2. OFFICIAL MENTIS THERAPY PREMIUM BANNER */}
      {mentisAd && (
        <div className="bg-gradient-to-r from-[#1d0831] via-[#110d2c] to-[#0a1228] border-2 border-gold/50 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden text-white group backdrop-blur-xl">
          {/* Subtle gold ambient glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -left-12 -bottom-12 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-5">
            {/* TOP ROW: LOGO, TITLE, BADGE, RATING & PRICE CARD */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-purple-500/20 pb-5">
              
              {/* Left: Branding & Ratings */}
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <img 
                    src={mentisAd.logo} 
                    alt={mentisAd.name} 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-gold shadow-lg"
                  />
                  {mentisAd.officialPartnerSeal && (
                    <span className="absolute -bottom-2 -right-1 bg-gold text-oxford p-1 rounded-full shadow">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {mentisAd.name}
                    </h3>
                    <span className="bg-purple-900/80 border border-gold/60 text-gold text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <Award className="w-3 h-3 text-gold" /> {mentisAd.sealText || 'PARCEIRO OFICIAL CLASSIUM'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-purple-200/90 font-medium">
                    {mentisAd.subCategory}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-amber-300 font-bold pt-0.5">
                    <div className="flex text-amber-400">
                      {'★'.repeat(Math.floor(mentisAd.rating))}
                    </div>
                    <span className="text-white font-black">{mentisAd.rating.toFixed(1)}</span>
                    <span className="text-purple-300 font-normal">({mentisAd.reviewCount} {mentisAd.reviewLabel || 'avaliações de professores'})</span>
                  </div>
                </div>
              </div>

              {/* Right: Plan Highlight Card */}
              <div className="bg-purple-950/70 border-2 border-purple-500/40 rounded-2xl p-4 sm:p-5 flex flex-col items-start md:items-end justify-center shadow-inner shrink-0 w-full md:w-auto">
                <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest font-serif">
                  {mentisAd.planTitle || 'PLANO PARA PROFESSORES & GESTORES'}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-serif">
                    {mentisAd.price || 'R$ 89,90 / sessão'}
                  </span>
                </div>
                {mentisAd.discountBadge && (
                  <span className="bg-purple-900/90 border border-purple-400/40 text-purple-200 text-[10px] font-bold px-3 py-0.5 rounded-full mt-1.5 shadow">
                    {mentisAd.discountBadge}
                  </span>
                )}
              </div>
            </div>

            {/* MIDDLE ROW: OFFICIAL MESSAGE BOX & TAGS */}
            <div className="bg-slate-950/60 border border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-3 relative">
              <div className="flex items-center gap-2 text-gold text-xs font-bold font-serif uppercase tracking-wider">
                <Heart className="w-4 h-4 text-pink-400 fill-pink-400/30 animate-pulse" />
                MENSAGEM OFICIAL DA PLATAFORMA MENTIS THERAPY PARA EDUCATORES:
              </div>

              <p className="text-xs sm:text-sm text-purple-100/90 italic font-light leading-relaxed">
                "{mentisAd.officialMessage || mentisAd.description}"
              </p>

              {/* Tags row */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-900/40">
                {(mentisAd.tags || mentisAd.highlights).map((tag, idx) => (
                  <span 
                    key={idx}
                    className="bg-purple-950/90 border border-purple-500/40 text-purple-200 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* BOTTOM ROW: ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
              <div className="text-xs text-purple-300/80 font-medium text-center sm:text-left">
                {mentisAd.promoText || 'Milhares de educadores já transformaram sua jornada com a Mentis Therapy.'}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <a
                  href={mentisAd.primaryButtonLink || mentisAd.website || 'https://mentistherapy.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (mentisAd) {
                      updatePartnerAd({
                        ...mentisAd,
                        clicks: (mentisAd.clicks || 0) + 1,
                        views: (mentisAd.views || 0) + 1
                      });
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold via-amber-400 to-yellow-500 text-oxford font-serif font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 border border-yellow-200"
                >
                  🚀 {mentisAd.primaryButtonText || 'VISITAR SITE OFICIAL'}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SUPER IA CLASSIUM RECOMMENDATION ALERT */}
      {smartAiAlert.active && (
        <div className="p-5 bg-gradient-to-r from-blue-950 via-oxford to-indigo-950 text-white rounded-2xl border border-gold/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-gradient-to-br from-gold/20 to-amber-500/20 rounded-2xl border border-gold/40 text-gold shrink-0">
              <Sparkles className="w-6 h-6 text-gold animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-gold font-serif">
                  Recomendação Inteligente Super IA Classium
                </span>
                <span className="bg-red-500/20 text-red-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                  Alerta Pedagógico
                </span>
              </div>
              <p className="text-xs text-ice leading-relaxed max-w-3xl">
                {smartAiAlert.recommendation}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0 w-full md:w-auto">
            <button 
              onClick={() => {
                setSelectedCategory('Professor de reforço');
                setSearchTerm('Matemática');
              }}
              className="px-4 py-2 bg-gold text-oxford rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-md flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" /> Ver Tutores de Matemática
            </button>
            <button 
              onClick={() => {
                setSelectedCategory('Psicopedagogo');
                setSearchTerm('');
              }}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium border border-white/20 transition-all"
            >
              Psicopedagogos
            </button>
          </div>
        </div>
      )}

      {/* 3. BROAD CATEGORY TABS & SMART SEARCH */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-5">
        
        {/* TOP BROAD CATEGORY TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-gray-100">
          {broadCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-oxford to-slate-900 text-gold border-gold shadow-md font-serif'
                    : 'bg-slate-50 text-slate-700 border-gray-200 hover:bg-slate-100 hover:text-oxford'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-gold' : 'text-slate-500'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-serif text-base font-bold text-oxford flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600" />
              Busca Inteligente de Especialistas
            </h3>
            <p className="text-xs text-gray-500">
              Filtre por disciplina, saúde, psicologia, odonto, serviços domésticos, valores e cidade.
            </p>
          </div>

          {/* Quick reset filters */}
          {(searchTerm || selectedCategory !== 'todas' || selectedModality !== 'todas' || selectedCity !== 'todas' || onlyVerified) && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('todas');
                setSelectedModality('todas');
                setSelectedCity('todas');
                setMaxPrice(150);
                setOnlyVerified(false);
                setMinRating(0);
              }}
              className="text-xs text-bordeaux hover:underline font-bold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Limpar Filtros
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome (ex: Prof. Carlos), matéria (ex: Matemática, Inglês), especialidade (ex: TDAH, ENEM, Robótica)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs text-oxford outline-none focus:border-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filter dropdowns grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Especialidade / Função */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Especialidade / Perfil</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford font-medium outline-none focus:border-emerald-500"
            >
              {categoriesList.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Modalidade */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modalidade</label>
            <select 
              value={selectedModality}
              onChange={(e) => setSelectedModality(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford font-medium outline-none focus:border-emerald-500"
            >
              <option value="todas">Todas as Modalidades</option>
              <option value="Presencial">🏠 Atendimento Presencial</option>
              <option value="Online">💻 Aulas Online</option>
            </select>
          </div>

          {/* Cidade */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cidade / Região</label>
            <select 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford font-medium outline-none focus:border-emerald-500"
            >
              <option value="todas">Todas as Cidades</option>
              <option value="Curitiba">Curitiba - PR</option>
              <option value="São Paulo">São Paulo - SP</option>
              <option value="Rio de Janeiro">Rio de Janeiro - RJ</option>
            </select>
          </div>

          {/* Slider Valor Máximo */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor Máximo / Hora</label>
              <span className="text-xs font-black text-emerald-700">R$ {maxPrice}/h</span>
            </div>
            <input 
              type="range"
              min={40}
              max={200}
              step={10}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>
        </div>

        {/* Checkbox pills */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700 select-none">
            <input 
              type="checkbox"
              checked={onlyVerified}
              onChange={(e) => setOnlyVerified(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Somente Verificados pelo Classium
            </span>
          </label>

          <span className="text-gray-300">|</span>

          <span className="text-gray-500 font-light">
            Exibindo <strong>{filteredProfessionals.length}</strong> de {professionals.length} profissionais cadastrados.
          </span>
        </div>
      </div>

      {/* 4. PREMIUM CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProfessionals.map((prof) => {
          const tier = (prof.planTier || prof.planName || '').toLowerCase();
          const isDiamante = tier === 'diamante' || tier === 'destaque' || tier === 'premium';
          const isOuro = tier === 'ouro';
          const isPrata = tier === 'prata' || tier === 'basico';

          return (
            <div 
              key={prof.id}
              className={`rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between text-left relative overflow-hidden group ${
                isDiamante 
                  ? 'bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-950 border-purple-500/50 shadow-lg hover:shadow-2xl text-white' 
                  : isOuro
                  ? 'bg-gradient-to-br from-slate-900 via-amber-950/30 to-slate-950 border-gold/60 shadow-md hover:shadow-xl text-white'
                  : 'bg-white border-gray-200 shadow-sm hover:shadow-md text-oxford'
              }`}
            >
              {/* Ribbon Badge by Plan Tier */}
              {isDiamante && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 via-fuchsia-400 to-amber-300 text-slate-950 font-serif font-black text-[9px] px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm flex items-center gap-1 border-b border-l border-purple-300">
                  <Sparkles className="w-3 h-3 text-slate-950 fill-slate-950" /> Destaque Diamante
                </div>
              )}
              {isOuro && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 via-gold to-yellow-500 text-oxford font-serif font-black text-[9px] px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm flex items-center gap-1 border-b border-l border-amber-300">
                  <Crown className="w-3 h-3 text-oxford" /> Destaque Ouro
                </div>
              )}
              {isPrata && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-800 font-serif font-bold text-[9px] px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm flex items-center gap-1 border-b border-l border-slate-300">
                  <Shield className="w-3 h-3 text-slate-800" /> Destaque Prata
                </div>
              )}

              <div className="space-y-4">
                {/* Header info */}
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <img 
                      src={prof.avatarUrl} 
                      alt={prof.name} 
                      className={`w-16 h-16 rounded-2xl object-cover border-2 shadow-sm ${
                        isDiamante ? 'border-purple-400' : isOuro ? 'border-gold' : 'border-slate-300'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                    {prof.isVerified && (
                      <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1 shadow" title="Verificado pelo Classium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap pr-12">
                      <h4 className={`font-serif text-base font-bold truncate ${isDiamante || isOuro ? 'text-white' : 'text-oxford'}`}>
                        {prof.displayName || prof.name}
                      </h4>
                    </div>

                    <p className={`text-xs font-semibold line-clamp-1 ${isDiamante || isOuro ? 'text-emerald-400' : 'text-emerald-800'}`}>
                      {prof.title}
                    </p>

                    {/* Rating and Review Count */}
                    <div className="flex items-center gap-2 text-xs pt-0.5">
                      <div className="flex items-center text-amber-400 font-bold gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{prof.rating.toFixed(1)}</span>
                      </div>
                      <span className={`text-[11px] ${isDiamante || isOuro ? 'text-slate-400' : 'text-gray-400'}`}>({prof.reviewCount} avaliações)</span>
                    </div>
                  </div>
                </div>

                {/* Badges checklist */}
                <div className={`grid grid-cols-2 gap-1.5 text-[11px] p-2.5 rounded-xl border ${
                  isDiamante || isOuro 
                    ? 'bg-black/40 text-slate-200 border-white/10' 
                    : 'bg-slate-50/80 text-gray-700 border-gray-100'
                }`}>
                  <div className="flex items-center gap-1.5 font-medium truncate">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{prof.degrees?.[0] || 'Graduação Homologada'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium truncate">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{prof.experienceYears} anos de experiência</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium truncate">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{prof.postGraduation ? prof.postGraduation.slice(0, 24) : 'Especialização'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400 truncate">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">Selo Verificado Classium</span>
                  </div>
                </div>

                {/* Location, Modality & Price */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="space-y-1">
                    <p className={`font-medium flex items-center gap-1 text-[11px] ${isDiamante || isOuro ? 'text-slate-300' : 'text-gray-500'}`}>
                      <MapPin className="w-3.5 h-3.5 text-pink-500" /> {prof.location}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {prof.modalities.map(m => (
                        <span key={m} className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isDiamante || isOuro
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {m === 'Presencial' ? '🏠 Presencial' : m === 'Online' ? '💻 Online' : '⚡ Híbrido'}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-[10px] uppercase font-bold block ${isDiamante || isOuro ? 'text-slate-400' : 'text-gray-400'}`}>Valor Hora/Aula</span>
                    <span className={`text-base font-serif font-black ${isDiamante || isOuro ? 'text-emerald-400' : 'text-oxford'}`}>
                      R$ {prof.pricePerHour}<span className={`text-xs font-sans font-normal ${isDiamante || isOuro ? 'text-slate-400' : 'text-gray-500'}`}>/h</span>
                    </span>
                  </div>
                </div>

                {/* Discount Badge */}
                {prof.discountBadge && (
                  <div className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider p-1.5 rounded-lg text-center">
                    🎁 {prof.discountBadge}
                  </div>
                )}

                {/* Available Days */}
                <div className={`text-xs pt-1 border-t flex items-center gap-2 ${isDiamante || isOuro ? 'border-white/10' : 'border-gray-100'}`}>
                  <span className={`text-[10px] font-bold uppercase shrink-0 ${isDiamante || isOuro ? 'text-slate-400' : 'text-gray-400'}`}>Disponível:</span>
                  <div className="flex flex-wrap gap-1">
                    {prof.availableDays.map(day => (
                      <span key={day} className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                        isDiamante || isOuro ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-oxford'
                      }`}>
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`pt-4 mt-4 border-t grid grid-cols-2 gap-3 ${isDiamante || isOuro ? 'border-white/10' : 'border-gray-100'}`}>
                <button
                  onClick={() => setActiveProfessional(prof)}
                  className={`px-3 py-2.5 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 ${
                    isDiamante || isOuro
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
                      : 'bg-slate-100 hover:bg-slate-200 text-oxford'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" /> Ver Perfil
                </button>
                <button
                  onClick={() => handleOpenBooking(prof)}
                  className={`px-3 py-2.5 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1 ${
                    isDiamante
                      ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:brightness-110'
                      : isOuro
                      ? 'bg-gold hover:bg-amber-400 text-slate-900'
                      : 'bg-oxford hover:bg-oxford/90 text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" /> Solicitar Aula
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProfessionals.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 space-y-3">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto" />
          <h4 className="font-serif text-base font-bold text-oxford">Nenhum profissional encontrado</h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Tente ajustar os filtros de pesquisa, faixa de preço ou especialidade para visualizar outros especialistas credenciados.
          </p>
        </div>
      )}

      {/* 5. FULL PROFILE MODAL (Ao Clicar [VER PERFIL]) */}
      {activeProfessional && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-gold/30 max-h-[90vh] flex flex-col text-left">
            
            {/* Header with cover photo */}
            <div className="relative h-44 bg-oxford shrink-0">
              <img 
                src={activeProfessional.coverUrl} 
                alt="Capa" 
                className="w-full h-full object-cover opacity-60"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setActiveProfessional(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute -bottom-10 left-6 flex items-end gap-4">
                <img 
                  src={activeProfessional.avatarUrl} 
                  alt={activeProfessional.name} 
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-xl bg-white"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Profile Body Content */}
            <div className="pt-12 p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
              {/* Title & Verification */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-2xl font-bold text-oxford">{activeProfessional.name}</h3>
                    {activeProfessional.isVerified && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300 uppercase">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verificado Classium
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-emerald-800">{activeProfessional.title}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-bordeaux" /> {activeProfessional.location} • {activeProfessional.neighborhood}
                  </p>
                </div>

                <div className="text-left sm:text-right bg-emerald-50 p-3 rounded-2xl border border-emerald-100 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Investimento Hora/Aula</span>
                  <span className="text-2xl font-serif font-black text-oxford">R$ {activeProfessional.pricePerHour}</span>
                </div>
              </div>

              {/* Presentation Video Placeholder */}
              <div className="space-y-2">
                <h4 className="font-serif text-xs font-bold text-oxford uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-bordeaux" /> Vídeo de Apresentação
                </h4>
                <div className="bg-slate-900 rounded-2xl h-48 relative overflow-hidden flex items-center justify-center group shadow-md">
                  <img 
                    src={activeProfessional.coverUrl} 
                    alt="Video thumbnail" 
                    className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-2">
                    <div className="w-14 h-14 rounded-full bg-gold text-oxford flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-oxford ml-1" />
                    </div>
                    <span className="text-xs font-bold bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
                      Assista à apresentação do especialista (1:30 min)
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio & Curriculum */}
              <div className="space-y-3">
                <h4 className="font-serif text-xs font-bold text-oxford uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" /> Mini Currículo
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-gray-100">
                  {activeProfessional.bio}
                </p>
              </div>

              {/* Methodology & Materials if available */}
              {(activeProfessional.methodology || activeProfessional.materialsUsed) && (
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                  <h4 className="font-serif text-xs font-bold text-oxford uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-700" /> Metodologia & Materiais de Ensino
                  </h4>
                  {activeProfessional.methodology && (
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <strong>Metodologia:</strong> {activeProfessional.methodology}
                    </p>
                  )}
                  {activeProfessional.materialsUsed && (
                    <p className="text-xs text-gray-700">
                      <strong>Materiais Utilizados:</strong> {activeProfessional.materialsUsed}
                    </p>
                  )}
                </div>
              )}

              {/* Formation, Diplomas & University */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 space-y-2">
                  <h5 className="font-serif text-xs font-bold text-oxford flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-bordeaux" /> Formação Acadêmica
                  </h5>
                  <p className="text-xs font-bold text-oxford">{activeProfessional.university}</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {(activeProfessional.degrees || []).map((d, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {d}
                      </li>
                    ))}
                    {activeProfessional.postGraduation && (
                      <li className="flex items-center gap-1.5 font-medium text-emerald-800">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {activeProfessional.postGraduation}
                      </li>
                    )}
                  </ul>
                  {activeProfessional.certifications && (
                    <div className="pt-2 border-t border-gray-200/60 text-[11px] text-gray-600">
                      <strong>Certificações:</strong> {activeProfessional.certifications}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 space-y-2">
                  <h5 className="font-serif text-xs font-bold text-oxford flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-gold" /> Especializações & Destaques
                  </h5>
                  <p className="text-xs text-gray-700"><strong>Tempo de Atuação:</strong> {activeProfessional.experienceYears} anos de experiência.</p>
                  {activeProfessional.servicedCount && (
                    <p className="text-xs text-gray-700"><strong>Alunos Atendidos:</strong> +{activeProfessional.servicedCount}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(activeProfessional.subjects || []).map(s => (
                      <span key={s} className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                  {activeProfessional.languages && activeProfessional.languages.length > 0 && (
                    <div className="pt-2 text-[11px] text-gray-600">
                      <strong>Idiomas:</strong> {activeProfessional.languages.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Contacts & Social Links */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h5 className="font-serif text-xs font-bold text-oxford">Canais Diretos de Contato</h5>
                  <p className="text-[11px] text-gray-600">Comunique-se diretamente com o profissional credenciado.</p>
                </div>

                <div className="flex items-center gap-2">
                  <a 
                    href={`https://wa.me/${activeProfessional.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                  {activeProfessional.instagram && (
                    <span className="p-2 bg-white rounded-xl border border-gray-200 text-pink-600 font-bold text-xs flex items-center gap-1">
                      <Instagram className="w-4 h-4" /> {activeProfessional.instagram}
                    </span>
                  )}
                  {activeProfessional.website && (
                    <a 
                      href={activeProfessional.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-white rounded-xl border border-gray-200 text-oxford font-bold text-xs flex items-center gap-1 hover:bg-gray-50"
                    >
                      <Globe className="w-4 h-4 text-blue-600" /> Website
                    </a>
                  )}
                </div>
              </div>

              {/* Interactive Schedule Table */}
              <div className="space-y-3">
                <h4 className="font-serif text-xs font-bold text-oxford uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gold" /> Agenda de Horários Disponíveis
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeProfessional.scheduleSlots.map((slot, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
                        slot.status === 'Livre' 
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900' 
                          : 'bg-gray-100 border-gray-200 text-gray-400'
                      }`}
                    >
                      <div>
                        <span className="block font-bold">{slot.day}</span>
                        <span className="text-[10px]">{slot.time}</span>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        slot.status === 'Livre' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {slot.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="space-y-3 pt-2">
                <h4 className="font-serif text-xs font-bold text-oxford uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" /> Avaliações das Famílias ({activeProfessional.reviews.length})
                </h4>

                {activeProfessional.reviews.length > 0 ? (
                  <div className="space-y-3">
                    {activeProfessional.reviews.map(rev => (
                      <div key={rev.id} className="p-4 bg-slate-50 rounded-2xl border border-gray-100 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-oxford">{rev.author}</span>
                          <span className="text-[10px] text-gray-400">{rev.date}</span>
                        </div>
                        <div className="flex text-amber-400">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                        <p className="text-gray-600 italic">"{rev.comment}"</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Nenhuma avaliação registrada ainda. Seja a primeira família a avaliar após a aula!</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setActiveProfessional(null)}
                className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100 transition-all"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  const prof = activeProfessional;
                  setActiveProfessional(null);
                  handleOpenBooking(prof);
                }}
                className="px-6 py-2.5 bg-oxford hover:bg-oxford/90 text-white font-serif font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-gold" /> Solicitar Aula com este Especialista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. BOOKING REQUEST MODAL (Solicitar Aula) */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gold/30 text-left space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-oxford">Solicitar Aula</h3>
                <p className="text-xs text-emerald-800 font-medium">Com {showBookingModal.name}</p>
              </div>
              <button 
                onClick={() => setShowBookingModal(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="p-6 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-200 text-center space-y-3 animate-fade-in">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="font-serif text-base font-bold">Solicitação Enviada com Sucesso!</h4>
                <p className="text-xs leading-relaxed text-emerald-800">
                  Sua solicitação de aula foi encaminhada para <strong>{showBookingModal.name}</strong>. O profissional entrará em contato via WhatsApp/Notificação para confirmar o horário.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitBooking} className="space-y-4 text-xs">
                {/* Student Selector */}
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Estudante</label>
                  <input 
                    type="text"
                    disabled
                    value="João Silva de Alencar (7º Ano A)"
                    className="w-full bg-slate-100 border border-gray-200 rounded-xl px-3 py-2 text-oxford font-medium cursor-not-allowed"
                  />
                </div>

                {/* Subject selection */}
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Disciplina / Foco da Aula</label>
                  <select 
                    value={bookingSubject}
                    onChange={(e) => setBookingSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-oxford font-medium outline-none focus:border-emerald-500"
                  >
                    {(showBookingModal.subjects || []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Data Preferencial</label>
                    <input 
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-oxford font-medium outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Horário</label>
                    <input 
                      type="time"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-oxford font-medium outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Modality */}
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Modalidade</label>
                  <div className="grid grid-cols-2 gap-2">
                    {showBookingModal.modalities.map(m => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setBookingModality(m)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                          bookingModality === m 
                            ? 'bg-oxford text-white border-gold shadow-sm' 
                            : 'bg-slate-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        {m === 'Presencial' ? '🏠 Presencial' : '💻 Online'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Observações para o Professor</label>
                  <textarea 
                    rows={3}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Descreva as principais dúvidas ou conteúdos da prova escolar..."
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-oxford outline-none focus:border-emerald-500 resize-none"
                  ></textarea>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(null)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-oxford hover:bg-oxford/90 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-gold" /> Confirmar Solicitação
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 7. PLANS FOR PROFESSIONALS MODAL (Planos do Classium Conecta) */}
      {showPlansModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-gold/30 max-h-[90vh] flex flex-col text-left">
            
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="bg-gold/20 text-oxford font-serif text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  Recorrência & Visibilidade
                </span>
                <h3 className="font-serif text-2xl font-bold text-oxford pt-1">Planos para Profissionais & Especialistas</h3>
                <p className="text-xs text-gray-500">
                  Anuncie seu perfil para milhares de famílias de colégios parceiros do ecossistema Classium.
                </p>
              </div>
              <button 
                onClick={() => setShowPlansModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Plans comparison cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 overflow-y-auto">
              {/* Plano Básico */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-gray-200 flex flex-col justify-between space-y-4 hover:border-gray-300 transition-all">
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Plano Básico</span>
                  <div className="flex items-baseline text-oxford">
                    <span className="text-3xl font-serif font-black">R$ 39</span>
                    <span className="text-sm font-bold text-gray-500">,90/mês</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Ideal para professores que estão iniciando no atendimento particular e buscam presença no catálogo.
                  </p>

                  <ul className="space-y-2 text-xs text-gray-700 pt-2 border-t border-gray-200">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Perfil individual com foto</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Contato de WhatsApp direto</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Até 3 disciplinas cadastradas</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Selo de verificação de documentos</li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setShowPlansModal(false);
                    setRegForm({ ...regForm, plan: 'basico' });
                    setShowRegistrationModal(true);
                  }}
                  className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-oxford font-bold text-xs rounded-xl transition-all"
                >
                  Assinar Básico
                </button>
              </div>

              {/* Plano Premium (Featured) */}
              <div className="bg-gradient-to-b from-oxford to-[#0e1e3f] text-white rounded-2xl p-6 border-2 border-gold flex flex-col justify-between space-y-4 shadow-xl relative scale-[1.02]">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-oxford text-[10px] font-serif font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                  Mais Popular ⭐
                </span>

                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gold block">Plano Premium</span>
                  <div className="flex items-baseline text-white">
                    <span className="text-3xl font-serif font-black text-gold">R$ 69</span>
                    <span className="text-sm font-bold text-ice/80">,90/mês</span>
                  </div>
                  <p className="text-xs text-ice/90 leading-relaxed">
                    Acesso à agenda online, recomendação por IA para famílias e destaque na busca das disciplinas.
                  </p>

                  <ul className="space-y-2 text-xs text-ice pt-2 border-t border-white/10">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> <strong>Tudo do Básico</strong></li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Agenda online com horários livres</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Recomendação pela Super IA Classium</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Avaliações e comentários de alunos</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Selo Premium em destaque</li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setShowPlansModal(false);
                    setRegForm({ ...regForm, plan: 'premium' });
                    setShowRegistrationModal(true);
                  }}
                  className="w-full py-2.5 bg-gold hover:bg-amber-400 text-oxford font-serif font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
                >
                  Assinar Premium
                </button>
              </div>

              {/* Plano Destaque */}
              <div className="bg-gradient-to-b from-amber-500/10 via-yellow-500/5 to-white rounded-2xl p-6 border border-gold flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block">Plano Destaque</span>
                  <div className="flex items-baseline text-oxford">
                    <span className="text-3xl font-serif font-black text-oxford">R$ 119</span>
                    <span className="text-sm font-bold text-gray-500">,90/mês</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Máxima visibilidade com Card Dourado, topo das buscas, relatórios de métricas e leads ilimitados.
                  </p>

                  <ul className="space-y-2 text-xs text-gray-700 pt-2 border-t border-amber-200">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600 shrink-0" /> <strong>Tudo do Premium</strong></li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600 shrink-0" /> Primeiros resultados das buscas</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600 shrink-0" /> Card Dourado com alta conversão</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600 shrink-0" /> Relatórios de estatísticas de cliques</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600 shrink-0" /> Leads e contatos ilimitados</li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setShowPlansModal(false);
                    setRegForm({ ...regForm, plan: 'destaque' });
                    setShowRegistrationModal(true);
                  }}
                  className="w-full py-2.5 bg-oxford hover:bg-oxford/90 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Assinar Destaque
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-gray-200 flex justify-between items-center shrink-0">
              <span className="text-xs text-gray-500">Todos os planos passam por verificação prévia de documentação.</span>
              <button
                onClick={() => setShowPlansModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. PROFESSIONAL REGISTRATION FORM MODAL */}
      {showRegistrationModal && (
        <PartnerRegistrationFlow
          onClose={() => setShowRegistrationModal(false)}
          initialCategory="profissional"
        />
      )}

      {/* 9. SECURITY & VERIFICATION MODAL */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gold/30 text-left space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <h3 className="font-serif text-lg font-bold text-oxford">Selo Verificado pelo Classium</h3>
              </div>
              <button 
                onClick={() => setShowSecurityModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
              <p>
                Para garantir a segurança das famílias e a excelência no atendimento pedagógico, todos os profissionais do <strong>Classium Conecta</strong> passam por um processo rigoroso de checagem:
              </p>

              <div className="space-y-2 pt-1">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-oxford block">Validação de CPF & Antecedentes</strong>
                    Aferição oficial de histórico de conduta e autenticidade cadastral.
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-oxford block">Autenticação de Diplomas & Licenciaturas</strong>
                    Verificação direta com instituições de ensino superior (MEC).
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-oxford block">Integração Pedagógica</strong>
                    Acompanhamento integrado ao progresso escolar do aluno pelo portal Classium.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSecurityModal(false)}
                className="px-5 py-2.5 bg-oxford text-white font-bold rounded-xl text-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
