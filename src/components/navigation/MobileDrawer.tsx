import React, { useState } from 'react';
import { 
  X, Search, Home, Users, BookOpen, HeartPulse, Bus, Calendar, LogOut,
  User, ShieldCheck, UserCheck, AlertCircle, Clock, Shirt, QrCode, Palette,
  Building, GraduationCap, Utensils, Library, Zap, Crown, Briefcase, ChevronRight, FileText, Layers
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { logout } = useAuth();
  const { hasPermission } = usePermissions();
  const { 
    setMode, role, mode, activeFamilyTab, setActiveFamilyTab, 
    activeAdminTab, setActiveAdminTab, activeProfessorTab, setActiveProfessorTab,
    permissionMatrix 
  } = usePlatform();

  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const isFamily = mode === 'family' || role === 'familia';
  const isProfessor = mode === 'professor' || role === 'docente';
  const isAdmin = (mode === 'admin' || mode === 'commands') && (role === 'admin' || role === 'gestor');

  // Menu items definitions
  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, category: 'Geral' },
    { id: 'pessoas', label: 'Estudantes', icon: Users, category: 'Acadêmico' },
    { id: 'horario-aula', label: 'Horário de Aula', icon: Clock, category: 'Acadêmico' },
    { id: 'smart-horarios', label: 'Smart Horários', icon: Zap, category: 'Pedagógico' },
    { id: 'pedagogico', label: 'Pedagógico', icon: BookOpen, category: 'Pedagógico' },
    { id: 'comunicacao', label: 'Comunicação', icon: AlertCircle, category: 'Comunicação' },
    { id: 'agenda', label: 'Calendário/Agenda', icon: Calendar, category: 'Geral' },
    { id: 'transporte', label: 'Transporte', icon: Bus, category: 'Operacional' },
    { id: 'alimentacao', label: 'Cardápio', icon: Utensils, category: 'Operacional' },
    { id: 'achados-perdidos', label: 'Achados & Perdidos', icon: Shirt, category: 'Operacional' },
    { id: 'portaria-qrcode', label: 'Controle de Acesso', icon: QrCode, category: 'Operacional' },
    { id: 'ia', label: 'Carreira & Benefícios', icon: Briefcase, category: 'Ferramentas' },
    { id: 'gestao-parceiros', label: 'Gestão de Parceiros', icon: Building, category: 'Administrativo' }
  ];

  const familyMenuItems = [
    { id: 2, label: 'Alunos & Vinculação', icon: UserCheck },
    { id: 1, label: 'Dados Cadastrais', icon: User },
    { id: 15, label: 'Horário de Aula', icon: Clock },
    { id: 3, label: 'Recados & Comunicação', icon: AlertCircle },
    { id: 4, label: 'Radar de Rotina', icon: Clock },
    { id: 5, label: 'Calendário Escolar', icon: Calendar },
    { id: 13, label: 'Alimentação Escolar', icon: Utensils },
    { id: 7, label: 'Controle de Acesso', icon: QrCode },
    { id: 6, label: 'Achados e Perdidos', icon: Shirt },
    { id: 9, label: 'Encontre Especialista', icon: BookOpen },
    { id: 14, label: 'Configurações & Temas', icon: Palette }
  ];

  const professorMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'seating', label: 'Visão da Sala', icon: GraduationCap },
    { id: 'occurrences', label: 'Diário de Bordo', icon: AlertCircle },
    { id: 'calendar', label: 'Calendário', icon: Calendar },
    { id: 'relatorios_ia', label: '📋 Central de Relatórios', icon: FileText },
    { id: 'ia', label: 'Carreira & Benefícios', icon: Briefcase },
    { id: 'studio', label: '👑 Classium Studio', icon: Crown }
  ];

  const filteredAdmin = adminMenuItems.filter(i => i.label.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredFamily = familyMenuItems.filter(i => i.label.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredProfessor = professorMenuItems.filter(i => i.label.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelectAdmin = (id: string) => {
    setActiveAdminTab(id as any);
    onClose();
  };

  const handleSelectFamily = (id: number) => {
    setActiveFamilyTab(id);
    onClose();
  };

  const handleSelectProfessor = (id: string) => {
    setActiveProfessorTab(id as any);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fade-in-fast"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className="relative w-4/5 max-w-xs h-full flex flex-col shadow-2xl z-10 animate-slide-up"
        style={{ 
          backgroundColor: 'var(--sidebar-bg)', 
          color: 'var(--sidebar-text)',
          borderRight: '1px solid var(--sidebar-border)'
        }}
      >
        {/* Header */}
        <div 
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--sidebar-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center font-heading font-bold text-lg shadow-sm"
              style={{
                backgroundColor: isFamily ? '#1E3A5F' : 'rgba(255, 255, 255, 0.15)',
                color: isFamily ? '#FFFFFF' : '#FFFFFF'
              }}
            >
              C
            </div>
            <div>
              <h2 className="font-heading text-sm font-bold tracking-wider">CLASSIUM</h2>
              <p className="text-[10px] opacity-75 uppercase tracking-widest font-bold">
                {isFamily ? 'Portal Família' : (isProfessor ? 'Portal Docente' : 'Portal Gestor')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center opacity-70 hover:opacity-100 active:scale-95 transition-all cursor-pointer"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div 
          className="p-3"
          style={{ borderBottom: '1px solid var(--sidebar-border)' }}
        >
          <div 
            className="flex items-center rounded-xl px-3 py-2 text-xs"
            style={{ 
              backgroundColor: isFamily ? 'rgba(30, 58, 95, 0.06)' : 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--sidebar-border)'
            }}
          >
            <Search className="w-4 h-4 mr-2 shrink-0 opacity-60" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar menu..."
              className="bg-transparent border-none outline-none text-xs w-full placeholder:opacity-40"
              style={{ color: 'var(--sidebar-text)' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="opacity-60 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Item List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {isAdmin && (
            <div className="space-y-1">
              {filteredAdmin.map((item) => {
                const Icon = item.icon;
                const isActive = activeAdminTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectAdmin(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all text-left cursor-pointer touch-target",
                      isActive
                        ? "font-bold shadow-sm"
                        : "hover:bg-white/10"
                    )}
                    style={{
                      backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                      color: 'var(--sidebar-text)'
                    }}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "opacity-100" : "opacity-70")} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                  </button>
                );
              })}
            </div>
          )}

          {isFamily && (
            <div className="space-y-1">
              {filteredFamily.map((item) => {
                const Icon = item.icon;
                const isActive = activeFamilyTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectFamily(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all text-left cursor-pointer touch-target",
                      isActive
                        ? "font-bold shadow-sm"
                        : "hover:bg-black/5"
                    )}
                    style={{
                      backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                      color: 'var(--sidebar-text)'
                    }}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "opacity-100" : "opacity-70")} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                  </button>
                );
              })}
            </div>
          )}

          {isProfessor && (
            <div className="space-y-1">
              {filteredProfessor.map((item) => {
                const Icon = item.icon;
                const isActive = activeProfessorTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectProfessor(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all text-left cursor-pointer touch-target",
                      isActive
                        ? "font-bold shadow-sm"
                        : "hover:bg-white/10"
                    )}
                    style={{
                      backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                      color: 'var(--sidebar-text)'
                    }}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "opacity-100" : "opacity-70")} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Footer Logout & Settings */}
        <div 
          className="p-3 pb-safe"
          style={{ 
            borderTop: '1px solid var(--sidebar-border)',
            backgroundColor: 'rgba(0, 0, 0, 0.1)'
          }}
        >
          <button
            onClick={async () => {
              onClose();
              await logout();
              setMode('landing');
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-target opacity-80 hover:opacity-100"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              color: '#EF4444'
            }}
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Plataforma</span>
          </button>
        </div>
      </div>
    </div>
  );
}
