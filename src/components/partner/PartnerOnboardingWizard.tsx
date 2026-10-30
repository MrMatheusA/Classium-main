import React, { useState } from 'react';
import { 
  X, Check, CheckCircle2, ShieldCheck, Sparkles, User, Building2, 
  Phone, Mail, Globe, MapPin, Upload, AlertCircle, RefreshCw, Star, ArrowRight,
  CreditCard, QrCode, Copy, Layers, Lock
} from 'lucide-react';
import { usePlatform, PartnerAd } from '../../context/PlatformContext';
import { PartnerPersistenceService } from '../../services/partnerPersistenceService';
import { PartnerService } from '../../services/partnerService';
import { SupabaseStorageService } from '../../lib/supabase/storage';
import { 
  maskCPF, maskCNPJ, maskCellPhone, maskCPFOrCNPJ, 
  isValidCPF, isValidCNPJ, isValidCPFOrCNPJ 
} from '../../utils/masks';

export type OnboardingWizardCategory = 'profissional' | 'empresa' | 'prestador';

interface PartnerOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: OnboardingWizardCategory;
  onOpenPartnerDashboard?: () => void;
}

export function PartnerOnboardingWizard({
  isOpen,
  onClose,
  initialCategory = 'profissional',
  onOpenPartnerDashboard
}: PartnerOnboardingWizardProps) {
  const { addPartnerAd, addProfessional, addServiceProvider, setCurrentPartner, addAuditLog } = usePlatform();

  const [wizardType, setWizardType] = useState<OnboardingWizardCategory>(initialCategory);
  const [wizardStep, setWizardStep] = useState<number>(1);

  // PLAN CONFIGURATION
  const getInitialPlanName = (cat: OnboardingWizardCategory) => {
    if (cat === 'profissional') return 'Essencial Profissional';
    if (cat === 'empresa') return 'Premium Institucional';
    return 'Corporativo Soluções';
  };

  // CANONICAL PLAN PRICES (Persisted Configuration Sync)
  const getPlanPrice = (cat: OnboardingWizardCategory) => {
    if (cat === 'profissional') return 99.90; // Plano Essencial Profissional
    if (cat === 'empresa') return 299.00;      // Plano Premium Institucional
    return 399.00;                             // Plano Corporativo Soluções
  };

  const [selectedPlan, setSelectedPlan] = useState<string>(() => getInitialPlanName(initialCategory));

  // Reset or adjust when category changes
  const handleSelectCategory = (cat: OnboardingWizardCategory) => {
    setWizardType(cat);
    setSelectedPlan(getInitialPlanName(cat));
    setWizardStep(1);
    setFormErrors({});
  };

  // STEP 2: FORMS PER CATEGORY
  // A) Professional Form
  const [profDocType, setProfDocType] = useState<'cpf' | 'cnpj'>('cpf');
  const [profForm, setProfForm] = useState({
    name: '',
    document: '',
    specialty: 'Psicopedagogo',
    city: '',
    whatsapp: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200'
  });

  // B) Company Form
  const [empForm, setEmpForm] = useState({
    name: '',
    cnpj: '',
    category: 'formacao',
    subCategory: 'Cursos & Capacitação',
    location: '',
    whatsapp: '',
    email: '',
    website: '',
    description: '',
    highlights: 'Selo MEC, Suporte 24h, Kits Educacionais Inclusos, +100 escolas parceiras',
    logo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
    banner: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600'
  });

  // C) Service Provider Form
  const [prestForm, setPrestForm] = useState({
    name: '',
    cnpj: '',
    category: 'Reforma & Manutenção',
    location: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    description: '',
    logo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150',
    banner: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600'
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // STEP 3: CARD CUSTOMIZATION
  const [cardCustomForm, setCardCustomForm] = useState({
    foto: '',
    banner: '',
    nome: '',
    subtitulo: '',
    descricao: '',
    destaques: '',
    investimento: '',
    descontos: '',
    whatsapp: '',
    website: ''
  });

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showConfirmSaveCardModal, setShowConfirmSaveCardModal] = useState(false);

  const getDestaquesArray = () => {
    if (Array.isArray(cardCustomForm?.destaques)) return cardCustomForm.destaques;
    if (typeof cardCustomForm?.destaques === 'string' && cardCustomForm.destaques.trim() !== '') {
      return cardCustomForm.destaques.split(',').map(s => s.trim());
    }
    return ['Selo Homologado', 'Suporte Especializado'];
  };

  // STEP 4: PAYMENT
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit'>('pix');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [creditCardForm, setCreditCardForm] = useState({
    name: '',
    number: '',
    expiry: '',
    cvc: ''
  });
  const [pixCopied, setPixCopied] = useState(false);

  // Registered partner state after successful payment
  const [registeredPartner, setRegisteredPartner] = useState<PartnerAd | null>(null);

  if (!isOpen) return null;

  // Mask handlers
  const handlePhoneChange = (val: string, setter: (v: string) => void) => {
    setter(maskCellPhone(val));
  };

// Client-side lightweight image compression for preview & storage resiliency
const compressImageFile = (file: File, maxWidth: number, maxHeight: number, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => resolve(String(readerEvent.target?.result || ''));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(readerEvent.target?.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(readerEvent.target?.result || '');
    };
    reader.readAsDataURL(file);
  });
};

  // Upload handler for card image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'foto' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    // Validations: format, MIME type, size (< 5MB)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Formato inválido. Apenas imagens JPEG, PNG ou WEBP são permitidas.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Arquivo muito grande. O limite máximo permitido é de 5MB.');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const storageService = new SupabaseStorageService();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `partners/${Date.now()}_${sanitizedName}`;

      const res = await storageService.uploadFile('educa_fotos', filePath, file);
      if (res.success && res.publicUrl) {
        setCardCustomForm(prev => ({ ...prev, [target]: res.publicUrl! }));
      } else {
        // High-efficiency fallback: compress image on-the-fly to protect localStorage quota
        const maxW = target === 'foto' ? 400 : 800;
        const maxH = target === 'foto' ? 400 : 350;
        const compressed = await compressImageFile(file, maxW, maxH, 0.75);
        if (compressed) {
          setCardCustomForm(prev => ({ ...prev, [target]: compressed }));
        }
      }
    } catch (err: any) {
      console.warn('Upload fallback note:', err);
      const maxW = target === 'foto' ? 400 : 800;
      const maxH = target === 'foto' ? 400 : 350;
      const compressed = await compressImageFile(file, maxW, maxH, 0.75);
      if (compressed) {
        setCardCustomForm(prev => ({ ...prev, [target]: compressed }));
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Step 2 Validation & Advancement to Step 3
  const handleAdvanceToCardCustomization = () => {
    const errors: Record<string, string> = {};

    if (wizardType === 'profissional') {
      if (!profForm.name.trim()) errors.name = 'Nome completo é obrigatório.';
      
      const cleanDoc = profForm.document.replace(/\D/g, '');
      if (!cleanDoc) {
        errors.document = 'Documento é obrigatório.';
      } else if (profDocType === 'cpf' && !isValidCPF(cleanDoc)) {
        errors.document = 'CPF inválido. Verifique os dígitos digitados.';
      } else if (profDocType === 'cnpj' && !isValidCNPJ(cleanDoc)) {
        errors.document = 'CNPJ inválido. Verifique os dígitos digitados.';
      }

      if (!profForm.whatsapp.trim()) {
        errors.whatsapp = 'WhatsApp comercial é obrigatório.';
      } else if (profForm.whatsapp.replace(/\D/g, '').length < 10) {
        errors.whatsapp = 'Informe um telefone/WhatsApp válido com DDD.';
      }

      if (profForm.email && !/\S+@\S+\.\S+/.test(profForm.email)) {
        errors.email = 'E-mail em formato inválido.';
      }

      if (!profForm.city.trim()) errors.city = 'Cidade/UF de atuação é obrigatória.';
      if (!profForm.description.trim()) errors.description = 'Breve biografia/descrição é obrigatória.';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
      setFormErrors({});

      // Prepopulate card customization form
      setCardCustomForm({
        foto: profForm.avatar || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200',
        banner: '',
        nome: profForm.name,
        subtitulo: profForm.specialty,
        descricao: profForm.description,
        destaques: 'Atendimento Humanizado, Reforço Escolar, Acompanhamento Individualizado',
        investimento: 'R$ 150 / sessão',
        descontos: '50% OFF na 1ª Sessão',
        whatsapp: profForm.whatsapp,
        website: profForm.website
      });

    } else if (wizardType === 'empresa') {
      if (!empForm.name.trim()) errors.name = 'Nome da Empresa / Instituição é obrigatório.';
      
      const cleanCnpj = empForm.cnpj.replace(/\D/g, '');
      if (!cleanCnpj) {
        errors.cnpj = 'CNPJ é obrigatório.';
      } else if (!isValidCNPJ(cleanCnpj)) {
        errors.cnpj = 'CNPJ inválido. Verifique os números digitados.';
      }

      if (!empForm.location.trim()) errors.location = 'Localidade de atuação é obrigatória.';
      
      if (!empForm.whatsapp.trim()) {
        errors.whatsapp = 'WhatsApp comercial é obrigatório.';
      } else if (empForm.whatsapp.replace(/\D/g, '').length < 10) {
        errors.whatsapp = 'Informe um WhatsApp válido com DDD.';
      }

      if (!empForm.description.trim()) errors.description = 'Breve descrição comercial / pitch é obrigatória.';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
      setFormErrors({});

      setCardCustomForm({
        foto: empForm.logo || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
        banner: empForm.banner || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
        nome: empForm.name,
        subtitulo: empForm.subCategory,
        descricao: empForm.description,
        destaques: empForm.highlights || 'Selo MEC, Suporte 24h, Kits Educacionais Inclusos',
        investimento: 'Sob Consulta',
        descontos: 'Condições Exclusivas para Escolas',
        whatsapp: empForm.whatsapp,
        website: empForm.website
      });

    } else if (wizardType === 'prestador') {
      if (!prestForm.name.trim()) errors.name = 'Razão Social / Nome Fantasia é obrigatório.';

      const cleanCnpj = prestForm.cnpj.replace(/\D/g, '');
      if (!cleanCnpj) {
        errors.cnpj = 'CNPJ é obrigatório.';
      } else if (!isValidCNPJ(cleanCnpj)) {
        errors.cnpj = 'CNPJ inválido. Verifique os números digitados.';
      }

      if (!prestForm.location.trim()) errors.location = 'Região/Cidade de atuação é obrigatória.';

      if (prestForm.email && !/\S+@\S+\.\S+/.test(prestForm.email)) {
        errors.email = 'E-mail corporativo em formato inválido.';
      }

      if (!prestForm.phone.trim() && !prestForm.whatsapp.trim()) {
        errors.phone = 'Telefone Comercial / WhatsApp é obrigatório.';
      }

      if (!prestForm.description.trim()) errors.description = 'Descrição de capacidade de atendimento é obrigatória.';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
      setFormErrors({});

      setCardCustomForm({
        foto: prestForm.logo || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150',
        banner: prestForm.banner || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600',
        nome: prestForm.name,
        subtitulo: prestForm.category,
        descricao: prestForm.description,
        destaques: 'Equipe Certificada, Atendimento Emergencial, Insumos Homologados',
        investimento: 'Orçamento Sob Medida',
        descontos: 'Orçamento Gratuito em 24h',
        whatsapp: prestForm.whatsapp || prestForm.phone,
        website: prestForm.website
      });
    }

    setWizardStep(3);
  };

  // Step 4: Confirm Payment & Save Partner (Canonical REST API Flow)
  const handleConfirmPaymentAndPublish = async () => {
    setIsProcessingPayment(true);

    try {
      const planPrice = getPlanPrice(wizardType);
      const documentNumber = wizardType === 'profissional' ? profForm.document : wizardType === 'empresa' ? empForm.cnpj : prestForm.cnpj;
      const partnerName = cardCustomForm.nome || (wizardType === 'profissional' ? profForm.name : wizardType === 'empresa' ? empForm.name : prestForm.name);
      const contactEmail = wizardType === 'profissional' ? profForm.email : wizardType === 'empresa' ? empForm.email : prestForm.email;
      const contactPhone = wizardType === 'profissional' ? profForm.whatsapp : wizardType === 'empresa' ? empForm.whatsapp : (prestForm.whatsapp || prestForm.phone);
      const specialty = wizardType === 'profissional' ? profForm.specialty : wizardType === 'empresa' ? empForm.subCategory : prestForm.category;

      const cleanDocNumber = (documentNumber || '').replace(/\D/g, '');
      const docType = wizardType === 'profissional' ? 'CPF' : (cleanDocNumber.length <= 11 ? 'CPF' : 'CNPJ');

      // 1. Canonical Creation via POST /api/partners/onboarding -> admin_create_partner_onboarding RPC
      const canonicalPartner = await PartnerService.createPartner({
        partner_name: partnerName,
        legal_name: partnerName,
        document_type: docType,
        document_number: documentNumber,
        email: contactEmail || 'contato@parceiro.com',
        phone: contactPhone,
        website: cardCustomForm.website || null,
        description: cardCustomForm.descricao || null,
        category: wizardType,
        plan_id: selectedPlan,
        metadata: {
          city: wizardType === 'profissional' ? profForm.city : wizardType === 'empresa' ? empForm.location : prestForm.location,
          location: wizardType === 'profissional' ? profForm.city : wizardType === 'empresa' ? empForm.location : prestForm.location,
          specialtyOrCategory: specialty,
          card: cardCustomForm,
          payment: {
            method: paymentMethod,
            amount: planPrice,
            cardName: creditCardForm.name,
            cardLast4: creditCardForm.number.slice(-4)
          }
        }
      });

      // 2. Map canonical PostgreSQL partner record to PartnerAd UI interface
      const mappedPartnerAd: PartnerAd = {
        id: canonicalPartner.id,
        category: wizardType,
        plan: selectedPlan,
        name: canonicalPartner.partner_name,
        cpfCnpj: documentNumber,
        email: canonicalPartner.email || 'contato@parceiro.com',
        phone: canonicalPartner.phone || '',
        whatsapp: cardCustomForm.whatsapp || contactPhone,
        website: canonicalPartner.website || '',
        location: wizardType === 'profissional' ? profForm.city : wizardType === 'empresa' ? empForm.location : prestForm.location,
        logo: cardCustomForm.foto || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
        banner: cardCustomForm.banner || '',
        description: canonicalPartner.description || '',
        rating: 5.0,
        reviewCount: 1,
        highlights: getDestaquesArray(),
        views: 0,
        clicks: 0,
        leadsGenerated: 0,
        createdAt: canonicalPartner.created_at || new Date().toISOString(),
        updatedAt: canonicalPartner.updated_at || new Date().toISOString()
      };

      setRegisteredPartner(mappedPartnerAd);

      // 3. Sync Context State
      if (wizardType === 'profissional') {
        addProfessional({
          name: partnerName,
          title: specialty,
          category: 'Profissionais da Educação',
          roleType: 'Profissionais da Educação',
          subjects: getDestaquesArray(),
          pricePerHour: 150,
          rating: 5.0,
          reviewCount: 1,
          location: profForm.city || 'São Paulo - SP',
          city: profForm.city || 'São Paulo',
          state: 'SP',
          avatarUrl: cardCustomForm.foto,
          coverUrl: cardCustomForm.banner,
          planTier: 'ouro',
          isVerified: true,
          cpfValidated: true,
          bio: cardCustomForm.descricao,
          whatsapp: cardCustomForm.whatsapp,
          email: profForm.email,
          website: cardCustomForm.website
        });
      } else if (wizardType === 'empresa') {
        addPartnerAd(mappedPartnerAd);
      } else if (wizardType === 'prestador') {
        addServiceProvider({
          name: partnerName,
          cnpj: prestForm.cnpj,
          email: prestForm.email,
          phone: prestForm.phone || prestForm.whatsapp,
          category: prestForm.category,
          location: prestForm.location,
          description: cardCustomForm.descricao,
          website: cardCustomForm.website,
          rating: 5.0,
          reviewCount: 1,
          status: 'Ativo',
          plan: selectedPlan
        });
      }

      // Log Audit Entry
      addAuditLog?.(
        'PARTNER_ONBOARDING_COMPLETED',
        'Portal do Parceiro',
        `Novo parceiro cadastrado e ativado: ${partnerName}`,
        `Plano: ${selectedPlan} | R$ ${planPrice.toFixed(2)} | Método: ${paymentMethod.toUpperCase()}`
      );

      // Advance to step 5
      setWizardStep(5);
    } catch (err: any) {
      alert(`Falha no processamento do onboarding: ${err?.message || 'Erro inesperado ao registrar parceiro'}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Helper for dynamic PIX payload
  const currentPlanPrice = getPlanPrice(wizardType);
  const pixCodeString = `00020126580014br.gov.bcb.pix0136dd18a972-7ecd-42d2-8b76-e82b922f8451520400005303986540${currentPlanPrice.toFixed(2).length}${currentPlanPrice.toFixed(2)}5802BR5916CLASSIUM_GESTAO6009SAO_PAULO62070503***6304`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in text-left">
      <div className="bg-[#0B1120] border border-slate-800 rounded-3xl w-full max-w-2xl relative shadow-2xl overflow-hidden flex flex-col my-4">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
              {wizardType === 'profissional' ? '👨‍🏫' : wizardType === 'empresa' ? '🏛️' : '🏢'}
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-base sm:text-lg">
                {wizardType === 'profissional' 
                  ? 'Cadastro de Profissional Parceiro' 
                  : wizardType === 'empresa' 
                  ? 'Divulgação de Empresa/Instituição' 
                  : 'Cadastro de Empresa (Apoio & Infraestrutura)'}
              </h3>
              <p className="text-[10px] text-[#D4AF37] uppercase tracking-wider font-mono font-bold">
                Ecossistema Classium • Passo {wizardStep} de 5
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5-STEPS INDICATOR BAR */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-900 flex items-center justify-between text-[10px] font-bold tracking-widest text-slate-500 uppercase overflow-x-auto scrollbar-none gap-2">
          <span className={wizardStep === 1 ? 'text-[#D4AF37]' : wizardStep > 1 ? 'text-emerald-400' : ''}>
            1. Escolher Plano
          </span>
          <div className="h-px bg-slate-800 flex-1 min-w-[8px]"></div>
          <span className={wizardStep === 2 ? 'text-[#D4AF37]' : wizardStep > 2 ? 'text-emerald-400' : ''}>
            2. Informações
          </span>
          <div className="h-px bg-slate-800 flex-1 min-w-[8px]"></div>
          <span className={wizardStep === 3 ? 'text-[#D4AF37]' : wizardStep > 3 ? 'text-emerald-400' : ''}>
            3. Personalização
          </span>
          <div className="h-px bg-slate-800 flex-1 min-w-[8px]"></div>
          <span className={wizardStep === 4 ? 'text-[#D4AF37]' : wizardStep > 4 ? 'text-emerald-400' : ''}>
            4. Pagamento
          </span>
          <div className="h-px bg-slate-800 flex-1 min-w-[8px]"></div>
          <span className={wizardStep === 5 ? 'text-emerald-400' : ''}>
            5. Concluído
          </span>
        </div>

        {/* SCROLLABLE MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[60vh] space-y-6">

          {/* ========================================================= */}
          {/* ETAPA 1: ESCOLHER PLANO                                    */}
          {/* ========================================================= */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Selecione o nível de visibilidade e recursos que deseja para seu perfil. Você pode alterar seu plano a qualquer momento.
              </p>

              {/* CATEGORY TABS SWITCHER (Permite alternar entre as 3 opções mantendo o padrão) */}
              <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl gap-1 text-[11px] font-bold uppercase">
                <button
                  type="button"
                  onClick={() => handleSelectCategory('profissional')}
                  className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${
                    wizardType === 'profissional' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Profissional Autônomo
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectCategory('empresa')}
                  className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${
                    wizardType === 'empresa' 
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Empresas & Instituições
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectCategory('prestador')}
                  className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${
                    wizardType === 'prestador' 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Apoio & Infraestrutura
                </button>
              </div>

              {/* CARD DO PLANO PROFISSIONAL (R$ 99,90/mês) */}
              {wizardType === 'profissional' && (
                <div className="max-w-xl mx-auto w-full pt-2">
                  <div 
                    onClick={() => setSelectedPlan('Essencial Profissional')}
                    className="p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between border-[#D4AF37] bg-gradient-to-b from-[#1a1508] via-slate-900 to-slate-950 shadow-xl relative text-left"
                  >
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#D4AF37] text-slate-950 text-[9px] font-black tracking-widest rounded-full uppercase shadow">
                      PLANO ÚNICO CONSOLIDADO
                    </span>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-[#D4AF37]">Plano Essencial Profissional</p>
                        <span className="text-[10px] text-slate-400 font-medium">Profissionais Autônomos</span>
                      </div>
                      <p className="text-3xl font-bold text-white mt-1">
                        R$ 99,90<span className="text-xs font-light text-slate-400">/mês</span>
                      </p>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Apresentação e consolidação de visibilidade, conexão direta com famílias e gestores, agenda digital, suporte pedagógico e selo homologado Classium.
                      </p>

                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 mt-3 text-[11px] text-slate-300">
                        <strong className="text-amber-400 block mb-1">Finalidade do Plano:</strong>
                        Conectar professores particulares, psicopedagogos, terapeutas e especialistas a milhares de pais e colégios que procuram profissionais qualificados diariamente.
                      </div>

                      <ul className="text-xs text-slate-300 space-y-2 mt-4 pt-4 border-t border-slate-800/80">
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Perfil Profissional Completo com Cartão Virtual 3D</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Destaque nos Portais Docente, Gestor e Família</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Agenda Digital Ativa com Agendamento Integrado</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Canal Direto para WhatsApp & Redes Sociais</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Relatório Analítico de Impressões e Cliques de Leads</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Selo Homologado Classium Verificado</li>
                      </ul>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="w-full py-3 rounded-xl text-xs font-black mt-6 bg-[#D4AF37] text-slate-950 hover:bg-amber-400 uppercase tracking-wider transition-all shadow-lg shadow-[#D4AF37]/20 cursor-pointer"
                    >
                      ASSINAR PLANO ESSENCIAL PROFISSIONAL (R$ 99,90/mês)
                    </button>
                  </div>
                </div>
              )}

              {/* CARD DO PLANO EMPRESAS & INSTITUIÇÕES (R$ 299/mês) */}
              {wizardType === 'empresa' && (
                <div className="max-w-xl mx-auto w-full pt-2">
                  <div 
                    onClick={() => setSelectedPlan('Premium Institucional')}
                    className="p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between border-blue-500 bg-gradient-to-b from-[#08142d] via-slate-900 to-slate-950 shadow-xl relative text-left"
                  >
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-[9px] font-black tracking-widest rounded-full uppercase shadow">
                      PLANO ÚNICO CONSOLIDADO
                    </span>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-blue-400">Plano Premium Institucional</p>
                        <span className="text-[10px] text-slate-400 font-medium">Empresas & Instituições</span>
                      </div>
                      <p className="text-3xl font-bold text-white mt-1">
                        R$ 299<span className="text-xs font-light text-slate-400">/mês</span>
                      </p>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Solução completa para escolas e cursos com divulgação massiva, envio de leads e branding institucional.
                      </p>
                      <ul className="text-xs text-slate-300 space-y-2 mt-4 pt-4 border-t border-slate-800/80">
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Divulgação Massiva nos Painéis Docente & Gestor</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Captação & Encaminhamento de Leads WhatsApp</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Divulgação de Campanhas, Bolsas & Cupons</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Co-branding Oficial e Relatório Analítico</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Suporte Corporativo Prioritário</li>
                      </ul>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="w-full py-3 rounded-xl text-xs font-black mt-6 bg-blue-500 text-white hover:bg-blue-400 uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
                    >
                      ASSINAR PLANO PREMIUM INSTITUCIONAL (R$ 299/mês)
                    </button>
                  </div>
                </div>
              )}

              {/* CARD DO PLANO APOIO & INFRAESTRUTURA (R$ 399/mês) */}
              {wizardType === 'prestador' && (
                <div className="max-w-xl mx-auto w-full pt-2">
                  <div 
                    onClick={() => setSelectedPlan('Corporativo Soluções')}
                    className="p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between border-purple-500 bg-gradient-to-b from-[#1b0835] via-slate-900 to-slate-950 shadow-xl relative text-left"
                  >
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 text-white text-[9px] font-black tracking-widest rounded-full uppercase shadow">
                      PLANO ÚNICO CONSOLIDADO
                    </span>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-purple-300">Plano Corporativo Soluções</p>
                        <span className="text-[10px] text-slate-400 font-medium">Prestadores & Obras</span>
                      </div>
                      <p className="text-3xl font-bold text-white mt-1">
                        R$ 399<span className="text-xs font-light text-slate-400">/mês</span>
                      </p>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Hub para fornecedores com acesso a licitações escolares, central de cotações e portfólio de obras homologado.
                      </p>
                      <ul className="text-xs text-slate-300 space-y-2 mt-4 pt-4 border-t border-slate-800/80">
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Canal Integrado de Avisos de Licitações e Cotações</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Central Ativa de Pedidos de Orçamento Escolar</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Portfólio & Galeria Ativa de Obras e Serviços</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Selo de Homologação Gestora Classium</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Suporte Técnico e Comercial Especializado</li>
                      </ul>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="w-full py-3 rounded-xl text-xs font-black mt-6 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:brightness-110 uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                    >
                      ASSINAR PLANO CORPORATIVO SOLUÇÕES (R$ 399/mês)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ETAPA 2: INFORMAÇÕES (FORMULÁRIOS ESPECÍFICOS)             */}
          {/* ========================================================= */}
          {wizardStep === 2 && (
            <div className="space-y-4 animate-fade-in text-left">
              <p className="text-xs text-slate-400">
                Insira as informações comerciais que serão visualizadas por nosso comitê de segurança e posteriormente publicadas no ecossistema Classium.
              </p>

              {/* FORMULÁRIO DO PROFISSIONAL AUTÔNOMO */}
              {wizardType === 'profissional' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Nome Completo ou Nome Profissional <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={profForm.name}
                      onChange={e => setProfForm({...profForm, name: e.target.value})}
                      placeholder="Ex: Dra. Mariana Albuquerque"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none"
                    />
                    {formErrors.name && <p className="text-[10px] text-red-400 font-bold">{formErrors.name}</p>}
                  </div>

                  {/* DOCUMENTO: CPF OU CNPJ */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Documento ({profDocType.toUpperCase()}) <span className="text-red-400">*</span>
                      </label>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            setProfDocType('cpf');
                            setProfForm({...profForm, document: ''});
                          }}
                          className={`font-bold uppercase ${profDocType === 'cpf' ? 'text-amber-400 underline' : 'text-slate-500'}`}
                        >
                          CPF
                        </button>
                        <span className="text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setProfDocType('cnpj');
                            setProfForm({...profForm, document: ''});
                          }}
                          className={`font-bold uppercase ${profDocType === 'cnpj' ? 'text-amber-400 underline' : 'text-slate-500'}`}
                        >
                          CNPJ
                        </button>
                      </div>
                    </div>
                    <input 
                      type="text" 
                      value={profForm.document}
                      onChange={e => {
                        const val = e.target.value;
                        const masked = profDocType === 'cpf' ? maskCPF(val) : maskCNPJ(val);
                        setProfForm({...profForm, document: masked});
                      }}
                      maxLength={profDocType === 'cpf' ? 14 : 18}
                      placeholder={profDocType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none font-mono"
                    />
                    {formErrors.document && <p className="text-[10px] text-red-400 font-bold">{formErrors.document}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Especialidade Principal <span className="text-red-400">*</span>
                    </label>
                    <select 
                      value={profForm.specialty}
                      onChange={e => setProfForm({...profForm, specialty: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none"
                    >
                      <option value="Professor Particular">Professor Particular</option>
                      <option value="Reforço Escolar">Reforço Escolar</option>
                      <option value="Psicopedagogo">Psicopedagogo</option>
                      <option value="Psicólogo">Psicólogo</option>
                      <option value="Fonoaudiólogo">Fonoaudiólogo</option>
                      <option value="Neuropsicopedagogo">Neuropsicopedagogo</option>
                      <option value="Pedagogo">Pedagogo</option>
                      <option value="Professor de Idiomas">Professor de Idiomas</option>
                      <option value="Professor de Música">Professor de Música</option>
                      <option value="Preparatório ENEM">Preparatório ENEM</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Cidade / UF de Atuação <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={profForm.city}
                      onChange={e => setProfForm({...profForm, city: e.target.value})}
                      placeholder="Ex: São Paulo - SP / Atendimento Online"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none"
                    />
                    {formErrors.city && <p className="text-[10px] text-red-400 font-bold">{formErrors.city}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      WhatsApp Comercial (Com DDD) <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={profForm.whatsapp}
                      onChange={e => handlePhoneChange(e.target.value, (v) => setProfForm({...profForm, whatsapp: v}))}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none font-mono"
                    />
                    {formErrors.whatsapp && <p className="text-[10px] text-red-400 font-bold">{formErrors.whatsapp}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      E-mail Profissional
                    </label>
                    <input 
                      type="email" 
                      value={profForm.email}
                      onChange={e => setProfForm({...profForm, email: e.target.value})}
                      placeholder="doutora.mariana@exemplo.com"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none"
                    />
                    {formErrors.email && <p className="text-[10px] text-red-400 font-bold">{formErrors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Website ou Redes Sociais
                    </label>
                    <input 
                      type="text" 
                      value={profForm.website}
                      onChange={e => setProfForm({...profForm, website: e.target.value})}
                      placeholder="https://instagram.com/perfil"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Breve Descrição Profissional / Biografia Comercial <span className="text-red-400">*</span>
                    </label>
                    <textarea 
                      value={profForm.description}
                      onChange={e => setProfForm({...profForm, description: e.target.value})}
                      placeholder="Conte detalhes sobre sua metodologia, experiência com escolas/alunos e diferenciais pedagógicos."
                      rows={3}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl text-xs text-white resize-none outline-none"
                    />
                    {formErrors.description && <p className="text-[10px] text-red-400 font-bold">{formErrors.description}</p>}
                  </div>
                </div>
              )}

              {/* FORMULÁRIO EMPRESA / INSTITUIÇÃO */}
              {wizardType === 'empresa' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Nome da Empresa / Instituição <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={empForm.name}
                      onChange={e => setEmpForm({...empForm, name: e.target.value})}
                      placeholder="Ex: Robótica Play S.A."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none"
                    />
                    {formErrors.name && <p className="text-[10px] text-red-400 font-bold">{formErrors.name}</p>}
                  </div>

                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      CNPJ <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={empForm.cnpj}
                      onChange={e => setEmpForm({...empForm, cnpj: maskCNPJ(e.target.value)})}
                      maxLength={18}
                      placeholder="00.000.000/0001-00"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none font-mono"
                    />
                    {formErrors.cnpj && <p className="text-[10px] text-red-400 font-bold">{formErrors.cnpj}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Categoria Principal <span className="text-red-400">*</span>
                    </label>
                    <select 
                      value={empForm.category}
                      onChange={e => {
                        const subCats: Record<string, string> = {
                          formacao: 'Cursos & Capacitação',
                          robotica: 'Equipamentos & Tecnologia',
                          universidades: 'Pós-Graduação & EAD',
                          softwares: 'Sistemas Escolares & SaaS'
                        };
                        setEmpForm({
                          ...empForm, 
                          category: e.target.value,
                          subCategory: subCats[e.target.value] || 'Educação'
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none"
                    >
                      <option value="formacao">Formação de Professores</option>
                      <option value="robotica">Equipamentos & Robótica</option>
                      <option value="universidades">Universidades & Faculdades</option>
                      <option value="softwares">Sistemas & Tecnologia</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Localidade de Atuação <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={empForm.location}
                      onChange={e => setEmpForm({...empForm, location: e.target.value})}
                      placeholder="Ex: Todo o Brasil / Nacional"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none"
                    />
                    {formErrors.location && <p className="text-[10px] text-red-400 font-bold">{formErrors.location}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      WhatsApp Comercial <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={empForm.whatsapp}
                      onChange={e => handlePhoneChange(e.target.value, (v) => setEmpForm({...empForm, whatsapp: v}))}
                      placeholder="(11) 98888-8888"
                      maxLength={15}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none font-mono"
                    />
                    {formErrors.whatsapp && <p className="text-[10px] text-red-400 font-bold">{formErrors.whatsapp}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Website Oficial
                    </label>
                    <input 
                      type="text" 
                      value={empForm.website}
                      onChange={e => setEmpForm({...empForm, website: e.target.value})}
                      placeholder="https://empresa.com.br"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Breve Descrição Comercial / Pitch de Vendas <span className="text-red-400">*</span>
                    </label>
                    <textarea 
                      value={empForm.description}
                      onChange={e => setEmpForm({...empForm, description: e.target.value})}
                      placeholder="Apresente seus diferenciais para atrair e gerar leads de gestores e educadores."
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white resize-none outline-none"
                    />
                    {formErrors.description && <p className="text-[10px] text-red-400 font-bold">{formErrors.description}</p>}
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Highlights de Destaque (Separados por Vírgulas)
                    </label>
                    <input 
                      type="text" 
                      value={empForm.highlights}
                      onChange={e => setEmpForm({...empForm, highlights: e.target.value})}
                      placeholder="Selo MEC, Suporte 24h, Kits Educacionais Inclusos, +100 escolas parceiras"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* FORMULÁRIO PRESTADOR DE SERVIÇO / APOIO & INFRAESTRUTURA */}
              {wizardType === 'prestador' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Razão Social / Nome Fantasia <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={prestForm.name}
                      onChange={e => setPrestForm({...prestForm, name: e.target.value})}
                      placeholder="Ex: ClimaForte Escolas Ltda"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                    />
                    {formErrors.name && <p className="text-[10px] text-red-400 font-bold">{formErrors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      CNPJ <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={prestForm.cnpj}
                      onChange={e => setPrestForm({...prestForm, cnpj: maskCNPJ(e.target.value)})}
                      maxLength={18}
                      placeholder="00.000.000/0001-00"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none font-mono"
                    />
                    {formErrors.cnpj && <p className="text-[10px] text-red-400 font-bold">{formErrors.cnpj}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Categoria de Serviço <span className="text-red-400">*</span>
                    </label>
                    <select 
                      value={prestForm.category}
                      onChange={e => setPrestForm({...prestForm, category: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                    >
                      <option value="Reforma & Manutenção">Reforma & Pintura</option>
                      <option value="Limpeza & Sanitização">Sanitização & Limpeza</option>
                      <option value="Segurança Escolar">Segurança & Portaria</option>
                      <option value="Uniformes">Uniformes & Têxtil</option>
                      <option value="Logística & Transporte">Transporte Escolar</option>
                      <option value="Dedetização">Dedetização</option>
                      <option value="Tecnologia & Energia">Sistemas Solar & Redes</option>
                      <option value="Alimentação Escolar">Catering & Nutrição</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Região / Cidade de Atuação <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={prestForm.location}
                      onChange={e => setPrestForm({...prestForm, location: e.target.value})}
                      placeholder="Ex: Grande São Paulo e Região"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                    />
                    {formErrors.location && <p className="text-[10px] text-red-400 font-bold">{formErrors.location}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      E-mail Comercial
                    </label>
                    <input 
                      type="email" 
                      value={prestForm.email}
                      onChange={e => setPrestForm({...prestForm, email: e.target.value})}
                      placeholder="vendas@empresa.com.br"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                    />
                    {formErrors.email && <p className="text-[10px] text-red-400 font-bold">{formErrors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Telefone Comercial / WhatsApp <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={prestForm.phone}
                      onChange={e => handlePhoneChange(e.target.value, (v) => setPrestForm({...prestForm, phone: v, whatsapp: v}))}
                      placeholder="(11) 3344-5566"
                      maxLength={15}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none font-mono"
                    />
                    {formErrors.phone && <p className="text-[10px] text-red-400 font-bold">{formErrors.phone}</p>}
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Website ou Portfólio
                    </label>
                    <input 
                      type="text" 
                      value={prestForm.website}
                      onChange={e => setPrestForm({...prestForm, website: e.target.value})}
                      placeholder="https://empresa.com.br"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Descrição de Capacidade de Atendimento <span className="text-red-400">*</span>
                    </label>
                    <textarea 
                      value={prestForm.description}
                      onChange={e => setPrestForm({...prestForm, description: e.target.value})}
                      placeholder="Descreva seu contingente técnico, certificações corporativas e materiais/insumos utilizados."
                      rows={3}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white resize-none outline-none"
                    />
                    {formErrors.description && <p className="text-[10px] text-red-400 font-bold">{formErrors.description}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ETAPA 3: PERSONALIZAÇÃO DO CARD (LIVE PREVIEW EM TEMPO REAL)*/}
          {/* ========================================================= */}
          {wizardStep === 3 && (
            <div className="space-y-6 animate-fade-in text-left">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Personalização do Card Visual</h4>
                <p className="text-[10px] text-slate-400 mt-1">
                  Edite as informações e acompanhe no Live Preview em tempo real. Seu card será publicado no portal correspondente à sua categoria.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* FORMULÁRIO DE CONTROLES DO CARD */}
                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
                  
                  {/* FOTO OU LOGO */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                      <span>Foto / Logo</span>
                      <span className="text-[9px] text-slate-500 font-normal">URL ou Arquivo Real</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cardCustomForm.foto}
                        onChange={e => setCardCustomForm({...cardCustomForm, foto: e.target.value})}
                        placeholder="https://..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                      />
                      <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={e => handleFileUpload(e, 'foto')}
                        />
                      </label>
                    </div>
                    {isUploadingPhoto && <p className="text-[10px] text-amber-400 animate-pulse">Enviando imagem com validação de segurança...</p>}
                    {uploadError && <p className="text-[10px] text-red-400">{uploadError}</p>}
                  </div>

                  {/* BANNER DE FUNDO (SE EMPRESA OU PRESTADOR) */}
                  {(wizardType === 'empresa' || wizardType === 'prestador') && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                        <span>Banner de Fundo</span>
                        <span className="text-[9px] text-slate-500 font-normal">URL ou Arquivo</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={cardCustomForm.banner}
                          onChange={e => setCardCustomForm({...cardCustomForm, banner: e.target.value})}
                          placeholder="https://..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                        />
                        <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                            onChange={e => handleFileUpload(e, 'banner')}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Exibido</label>
                      <input
                        type="text"
                        value={cardCustomForm.nome}
                        onChange={e => setCardCustomForm({...cardCustomForm, nome: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Especialidade / Categoria</label>
                      <input
                        type="text"
                        value={cardCustomForm.subtitulo}
                        onChange={e => setCardCustomForm({...cardCustomForm, subtitulo: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Descrição Curta / Biografia</label>
                    <textarea
                      rows={2}
                      value={cardCustomForm.descricao}
                      onChange={e => setCardCustomForm({...cardCustomForm, descricao: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Principais Destaques (Separados por Vírgula)</label>
                    <input
                      type="text"
                      value={cardCustomForm.destaques}
                      onChange={e => setCardCustomForm({...cardCustomForm, destaques: e.target.value})}
                      placeholder="Selo MEC, Suporte 24h, Acompanhamento"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Investimento / Valor</label>
                      <input
                        type="text"
                        value={cardCustomForm.investimento}
                        onChange={e => setCardCustomForm({...cardCustomForm, investimento: e.target.value})}
                        placeholder="R$ 150 / sessão"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Selo de Desconto / Condição</label>
                      <input
                        type="text"
                        value={cardCustomForm.descontos}
                        onChange={e => setCardCustomForm({...cardCustomForm, descontos: e.target.value})}
                        placeholder="50% OFF na 1ª sessão"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp Comercial</label>
                      <input
                        type="text"
                        value={cardCustomForm.whatsapp}
                        onChange={e => handlePhoneChange(e.target.value, (v) => setCardCustomForm({...cardCustomForm, whatsapp: v}))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Website Oficial</label>
                      <input
                        type="text"
                        value={cardCustomForm.website}
                        onChange={e => setCardCustomForm({...cardCustomForm, website: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* LIVE PREVIEW DO CARD EM TEMPO REAL (FIEL À IMAGEM 3) */}
                <div className="bg-[#050b1a] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 border-b border-slate-800 pb-2 mb-3">
                    <span className="flex items-center gap-1.5 font-bold uppercase">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> LIVE PREVIEW DO CARD
                    </span>
                    <span className="text-slate-500 font-bold uppercase">PLANO: {selectedPlan}</span>
                  </div>

                  {/* CARD PREVIEW RENDER */}
                  <div className="bg-[#0b1120] border border-[#D4AF37]/50 shadow-2xl rounded-2xl p-4 space-y-3 my-auto">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-slate-700 flex items-center justify-center text-white">
                        {cardCustomForm.foto ? (
                          <img src={cardCustomForm.foto} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h5 className="font-serif font-bold text-white text-sm flex items-center gap-1">
                          {cardCustomForm.nome || 'Seu Nome ou Empresa'}
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                        </h5>
                        <span className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider block">
                          {cardCustomForm.subtitulo || 'Especialidade / Ramo'}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 5.0 (1,420)
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                      {cardCustomForm.descricao || 'Apresente seus diferenciais para atrair e gerar leads de gestores e educadores.'}
                    </p>

                    <div className="space-y-1 border-t border-slate-800 pt-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Destaques:</span>
                      <div className="flex flex-wrap gap-1">
                        {getDestaquesArray().map((d, i) => (
                          <span key={i} className="text-[9px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                            ✓ {d.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 uppercase font-mono">Investimento:</span>
                      <span className="text-xs font-bold text-emerald-400">{cardCustomForm.investimento || 'Sob Consulta'}</span>
                    </div>

                    {cardCustomForm.descontos && (
                      <div className="bg-amber-950/40 border border-amber-500/30 text-amber-400 text-[9px] font-bold uppercase tracking-wider p-2 rounded-xl text-center flex items-center justify-center gap-1.5">
                        <span>🎁</span>
                        <span>{cardCustomForm.descontos}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-slate-500 text-center font-mono border-t border-slate-800 pt-2 mt-2">
                    Publicado em: <strong className="text-[#D4AF37]">
                      {wizardType === 'profissional' 
                        ? 'Classium Docente / Classium Família' 
                        : wizardType === 'empresa' 
                        ? 'Classium Docente / Classium Gestor' 
                        : 'Classium Gestor / Rede de Apoio'}
                    </strong>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ETAPA 4: PAGAMENTO (CHECKOUT SEGURO PIX OU CARTÃO)         */}
          {/* ========================================================= */}
          {wizardStep === 4 && (
            <div className="space-y-6 animate-fade-in text-left">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Checkout Seguro Classium</h4>
                <p className="text-[10px] text-slate-400 mt-1">
                  Processamento seguro com criptografia RSA 2048-bits. Plano escolhido: <span className="text-[#D4AF37] font-bold">{selectedPlan}</span> (R$ {currentPlanPrice.toFixed(2).replace('.', ',')}/mês)
                </p>
              </div>

              {/* PAYMENT METHOD TOGGLE */}
              <div className="flex gap-4 p-1 bg-slate-950 rounded-xl border border-slate-900">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'pix' 
                      ? 'bg-slate-900 text-[#D4AF37] border border-slate-800 shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📱 PIX Dinâmico
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'credit' 
                      ? 'bg-slate-900 text-[#D4AF37] border border-slate-800 shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  💳 Cartão de Crédito
                </button>
              </div>

              {/* MÉTODO 1: PIX DINÂMICO */}
              {paymentMethod === 'pix' ? (
                <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-900 flex flex-col items-center text-center space-y-4">
                  <div className="w-44 h-44 bg-white p-2.5 rounded-2xl border-2 border-[#D4AF37]/50 shadow-lg flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pixCodeString)}`} 
                      alt="QR Code PIX Dinâmico" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-white font-bold">QR Code de Assinatura Recorrente</p>
                    <p className="text-[10px] text-slate-400 max-w-sm">
                      Escaneie o código com seu aplicativo do banco para ativar a assinatura mensal de <strong>R$ {currentPlanPrice.toFixed(2).replace('.', ',')}</strong> com confirmação instantânea.
                    </p>
                  </div>

                  <div className="w-full bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2">
                    <p className="text-[9px] text-slate-400 font-mono truncate max-w-xs font-bold">
                      {pixCodeString.slice(0, 36)}...
                    </p>
                    <button 
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(pixCodeString);
                        setPixCopied(true);
                        setTimeout(() => setPixCopied(false), 3000);
                      }}
                      className="text-[10px] text-[#D4AF37] font-bold uppercase hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{pixCopied ? 'CÓDIGO COPIADO!' : 'COPIAR CÓDIGO'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* MÉTODO 2: CARTÃO DE CRÉDITO */
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Nome do Titular (Como impresso no cartão)
                    </label>
                    <input 
                      type="text" 
                      value={creditCardForm.name}
                      onChange={e => setCreditCardForm({...creditCardForm, name: e.target.value.toUpperCase()})}
                      placeholder="ALAN TURING DA SILVA"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Número do Cartão de Crédito
                    </label>
                    <input 
                      type="text" 
                      value={creditCardForm.number}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                        const masked = v.replace(/(\d{4})/g, '$1 ').trim();
                        setCreditCardForm({...creditCardForm, number: masked});
                      }}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Expiração</label>
                      <input 
                        type="text" 
                        value={creditCardForm.expiry}
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                          if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                          setCreditCardForm({...creditCardForm, expiry: v});
                        }}
                        placeholder="MM/AA"
                        maxLength={5}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Código CVC</label>
                      <input 
                        type="password" 
                        value={creditCardForm.cvc}
                        onChange={e => setCreditCardForm({...creditCardForm, cvc: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                        placeholder="•••"
                        maxLength={4}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5 p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <p className="text-[10px] text-slate-400 leading-normal">
                  Ao prosseguir, você concorda com o faturamento mensal recorrente. Seu card será publicado automaticamente no painel correspondente à sua categoria com isolamento RBAC.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ETAPA 5: CONCLUÍDO (FIEL À IMAGEM 5)                       */}
          {/* ========================================================= */}
          {wizardStep === 5 && (
            <div className="py-4 text-center space-y-4 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto shadow-2xl">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="px-4 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-black uppercase tracking-widest inline-block">
                  STATUS: ASSINATURA ATIVA & CARD PUBLICADO
                </span>
                <h4 className="text-2xl font-serif font-black text-white">Inscrição Enviada e Card Ativo!</h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-lg mx-auto">
                  Seu anúncio foi gravado no ecossistema Classium e já está visível para os usuários da plataforma.
                </p>
              </div>

              {/* CARD DE RECURSOS LIBERADOS */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/60 max-w-md mx-auto text-left space-y-2 text-xs">
                <p className="font-bold text-white">Recursos Liberados no seu Painel:</p>
                <ul className="space-y-1.5 text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Card editável em tempo real no Editor do Anunciante.</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Relatório de visualizações e cliques de leads.</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Canal direto de WhatsApp para atração de clientes.</li>
                </ul>
              </div>

              {/* CREDENCIAIS DE PRIMEIRO ACESSO */}
              <div className="p-4 bg-amber-950/30 rounded-2xl border border-amber-500/30 max-w-md mx-auto text-left space-y-1.5 text-xs text-amber-200">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Lock className="w-4 h-4" />
                  <span>Instruções de Primeiro Acesso ao Portal:</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  • <strong>Usuário:</strong> Seu CPF ou CNPJ cadastrado.<br />
                  • <strong>Senha inicial:</strong> Seu CPF ou CNPJ cadastrado.<br />
                  • Por segurança, no primeiro acesso será <strong>obrigatória a alteração</strong> para sua senha definitiva.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER BUTTONS */}
        <div className="p-5 sm:p-6 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
          {wizardStep > 1 && wizardStep < 5 ? (
            <button
              type="button"
              onClick={() => setWizardStep(wizardStep - 1)}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 rounded-xl cursor-pointer"
            >
              Voltar
            </button>
          ) : (
            <div></div>
          )}

          {wizardStep === 1 ? (
            <button
              type="button"
              onClick={() => setWizardStep(2)}
              className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-[#D4AF37]/10 cursor-pointer"
            >
              Continuar
            </button>
          ) : wizardStep === 2 ? (
            <button
              type="button"
              onClick={handleAdvanceToCardCustomization}
              className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-[#D4AF37]/10 cursor-pointer"
            >
              Personalizar Card
            </button>
          ) : wizardStep === 3 ? (
            <button
              type="button"
              onClick={() => setShowConfirmSaveCardModal(true)}
              className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-[#D4AF37]/10 flex items-center gap-2 cursor-pointer"
            >
              <span>SALVAR CARD</span>
              <Check className="w-4 h-4" />
            </button>
          ) : wizardStep === 4 ? (
            <button
              type="button"
              disabled={isProcessingPayment}
              onClick={handleConfirmPaymentAndPublish}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 flex items-center gap-2 cursor-pointer"
            >
              {isProcessingPayment ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <span>Confirmar Pagamento & Publicar</span>
              )}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (registeredPartner) {
                    setCurrentPartner(registeredPartner);
                    PartnerPersistenceService.saveCurrentPartnerSession(registeredPartner);
                  }
                  if (onOpenPartnerDashboard) {
                    onOpenPartnerDashboard();
                  }
                }}
                className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow cursor-pointer"
              >
                Meu Painel
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          )}
        </div>

      </div>

      {/* CONFIRMATION POPUP FOR STEP 3 */}
      {showConfirmSaveCardModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border-2 border-[#D4AF37]/50 rounded-2xl p-6 max-w-md w-full space-y-4 text-center shadow-2xl animate-fade-in">
            <div className="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full w-12 h-12 flex items-center justify-center mx-auto border border-[#D4AF37]/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif font-black text-white text-lg">Todas as informações estão corretas?</h4>
              <p className="text-xs text-slate-400 mt-1">
                Seu card visual foi configurado com sucesso e será gravado no seu perfil comercial do ecossistema Classium.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSaveCardModal(false)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                VOLTAR
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmSaveCardModal(false);
                  setWizardStep(4);
                }}
                className="px-5 py-2.5 bg-[#D4AF37] text-slate-950 hover:bg-amber-400 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                CONTINUAR PARA PAGAMENTO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
