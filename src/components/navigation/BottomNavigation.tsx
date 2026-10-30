import React from 'react';
import { Home, BookOpen, Clock, AlertCircle, Menu } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { cn } from '../../lib/utils';

interface BottomNavigationProps {
  onOpenMenu: () => void;
}

export function BottomNavigation({ onOpenMenu }: BottomNavigationProps) {
  const { 
    mode, activeAdminTab, setActiveAdminTab, 
    activeFamilyTab, setActiveFamilyTab, 
    activeProfessorTab, setActiveProfessorTab 
  } = usePlatform();

  const isFamily = mode === 'family';
  const isProfessor = mode === 'professor';

  // Determine active item
  const isHomeActive = 
    (isFamily && activeFamilyTab === 1) ||
    (isProfessor && activeProfessorTab === 'dashboard') ||
    (!isFamily && !isProfessor && activeAdminTab === 'dashboard');

  const isPedagogicoActive = 
    (isFamily && (activeFamilyTab === 15 || activeFamilyTab === 2)) ||
    (isProfessor && (activeProfessorTab === 'alunos' || activeProfessorTab === 'seating')) ||
    (!isFamily && !isProfessor && (activeAdminTab === 'pedagogico' || activeAdminTab === 'academico'));

  const isRadarActive = 
    (isFamily && activeFamilyTab === 4) ||
    (isProfessor && activeProfessorTab === 'calendar') ||
    (!isFamily && !isProfessor && activeAdminTab === 'agenda');

  const isRecadosActive = 
    (isFamily && activeFamilyTab === 3) ||
    (isProfessor && activeProfessorTab === 'occurrences') ||
    (!isFamily && !isProfessor && activeAdminTab === 'comunicacao');

  const handleHomeClick = () => {
    if (isFamily) setActiveFamilyTab(1);
    else if (isProfessor) setActiveProfessorTab('dashboard' as any);
    else setActiveAdminTab('dashboard' as any);
  };

  const handlePedagogicoClick = () => {
    if (isFamily) setActiveFamilyTab(15);
    else if (isProfessor) setActiveProfessorTab('alunos' as any);
    else setActiveAdminTab('pedagogico' as any);
  };

  const handleRadarClick = () => {
    if (isFamily) setActiveFamilyTab(4);
    else if (isProfessor) setActiveProfessorTab('calendar' as any);
    else setActiveAdminTab('agenda' as any);
  };

  const handleRecadosClick = () => {
    if (isFamily) setActiveFamilyTab(3);
    else if (isProfessor) setActiveProfessorTab('occurrences' as any);
    else setActiveAdminTab('comunicacao' as any);
  };

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t pb-safe pt-1 px-2 shadow-md"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'rgba(0, 0, 0, 0.08)'
      }}
    >
      <div className="flex items-center justify-around text-center">
        {/* Home */}
        <button
          onClick={handleHomeClick}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer touch-target",
            isHomeActive ? "font-bold text-[#1E3A5F]" : "text-[#8A8A8A] hover:text-[#1A1A1A]"
          )}
        >
          <Home className={cn("w-5 h-5 transition-transform", isHomeActive && "scale-110")} />
          <span className="text-[10px] mt-1 font-sans">Início</span>
        </button>

        {/* Pedagógico */}
        <button
          onClick={handlePedagogicoClick}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer touch-target",
            isPedagogicoActive ? "font-bold text-[#1E3A5F]" : "text-[#8A8A8A] hover:text-[#1A1A1A]"
          )}
        >
          <BookOpen className={cn("w-5 h-5 transition-transform", isPedagogicoActive && "scale-110")} />
          <span className="text-[10px] mt-1 font-sans">{isFamily ? "Aulas" : "Pedagógico"}</span>
        </button>

        {/* Radar */}
        <button
          onClick={handleRadarClick}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer touch-target",
            isRadarActive ? "font-bold text-[#1E3A5F]" : "text-[#8A8A8A] hover:text-[#1A1A1A]"
          )}
        >
          <Clock className={cn("w-5 h-5 transition-transform", isRadarActive && "scale-110")} />
          <span className="text-[10px] mt-1 font-sans">Radar</span>
        </button>

        {/* Recados */}
        <button
          onClick={handleRecadosClick}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer touch-target",
            isRecadosActive ? "font-bold text-[#1E3A5F]" : "text-[#8A8A8A] hover:text-[#1A1A1A]"
          )}
        >
          <AlertCircle className={cn("w-5 h-5 transition-transform", isRecadosActive && "scale-110")} />
          <span className="text-[10px] mt-1 font-sans">Avisos</span>
        </button>

        {/* Menu (Triggers Drawer) */}
        <button
          onClick={onOpenMenu}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[#8A8A8A] hover:text-[#1A1A1A] transition-all cursor-pointer touch-target"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-sans font-bold">Menu</span>
        </button>
      </div>
    </nav>
  );
}
