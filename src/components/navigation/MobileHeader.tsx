import React from 'react';
import { Menu, Bell, MessageSquare, GraduationCap, Building2, User } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { useFamilyContext } from '../../contexts/FamilyContext';
import { PortalSwitcher } from '../header/PortalSwitcher';
import { MasterPortalSwitcher } from '../master/MasterPortalSwitcher';
import { useMasterPortal } from '../../context/MasterPortalContext';
import { useAuth } from '../../hooks/useAuth';

interface MobileHeaderProps {
  onOpenDrawer: () => void;
}

export function MobileHeader({ onOpenDrawer }: MobileHeaderProps) {
  const { mode, role, student, familyStudents, selectFamilyStudent, currentUser } = usePlatform();
  const { currentSchool, schools, changeCurrentSchool, students, changeCurrentStudent, guardian } = useFamilyContext();
  const { isAdminMaster } = useMasterPortal();
  const { profile } = useAuth();

  const getPortalTitle = () => {
    if (mode === 'commands') return 'Comandos AI';
    if (mode === 'family') return 'Classium Família';
    if (mode === 'professor') return 'Classium Docente';
    if (role === 'pedagogo') return 'Pedagógico';
    if (role === 'secretaria') return 'Secretaria';
    if (role === 'disciplinario') return 'Disciplinar';
    return 'Classium Gestor';
  };

  const getInitials = () => {
    if (guardian?.name && typeof guardian.name === 'string' && guardian.name.trim()) {
      const parts = guardian.name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return guardian.name.substring(0, 2).toUpperCase();
    }
    if (currentUser?.name && typeof currentUser.name === 'string' && currentUser.name.trim()) {
      const parts = currentUser.name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return currentUser.name.substring(0, 2).toUpperCase();
    }
    return 'C';
  };

  const activeStudentList = (students.length > 0 ? students : familyStudents).filter(Boolean);

  return (
    <header 
      className="lg:hidden sticky top-0 z-30 border-b px-4 py-2.5 flex flex-col gap-2 shadow-xs"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'rgba(0, 0, 0, 0.08)',
        color: 'var(--text-heading)'
      }}
    >
      {/* Top Bar Row */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenDrawer}
            className="w-10 h-10 rounded-xl bg-black/5 border border-black/10 flex items-center justify-center text-[#1A1A1A] hover:bg-black/10 active:scale-95 transition-all cursor-pointer touch-target"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center font-heading font-serif font-bold text-white text-base shrink-0 shadow-xs"
              style={{ backgroundColor: mode === 'professor' ? '#14291F' : '#1E3A5F' }}
            >
              C
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className="font-heading font-serif text-sm font-bold text-[#1A1A1A] tracking-wide">
                CLASSIUM
              </span>
              <span className="text-[9px] text-[#8A8A8A] uppercase tracking-wider font-extrabold">
                {getPortalTitle()}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions (Notifications, Switcher / Profile) */}
        <div className="flex items-center gap-1.5">
          <button
            className="w-9 h-9 rounded-xl bg-black/5 border border-black/10 flex items-center justify-center text-[#4B4B4B] hover:text-[#1A1A1A] active:scale-95 transition-all relative cursor-pointer"
            title="Notificações"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>

          {isAdminMaster ? (
            <MasterPortalSwitcher />
          ) : (mode === 'admin' || role === 'gestor') ? (
            <PortalSwitcher />
          ) : (
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0"
              style={{ backgroundColor: mode === 'professor' ? '#14291F' : '#1E3A5F' }}
            >
              {getInitials()}
            </div>
          )}
        </div>
      </div>

      {/* Sub-Bar for Family Portal Context Selection on Mobile */}
      {mode === 'family' && (
        <div className="flex items-center gap-2 pt-1 border-t border-black/10 text-xs overflow-x-auto scrollbar-none pb-0.5">
          {/* School Selector */}
          {schools.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[var(--bg-card-alt)] border border-black/10 rounded-lg px-2.5 py-1 text-[11px] text-[#1A1A1A] shrink-0">
              <Building2 className="w-3.5 h-3.5 text-[#1E3A5F] shrink-0" />
              {schools.length > 1 ? (
                <select
                  value={currentSchool?.school_id || ''}
                  onChange={(e) => changeCurrentSchool(e.target.value)}
                  className="bg-transparent text-[#1A1A1A] font-medium outline-none cursor-pointer max-w-[130px] truncate"
                >
                  {schools.map((s) => (
                    <option key={s.school_id} value={s.school_id} className="bg-white text-[#1A1A1A]">
                      {s.school_name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[#1A1A1A] font-medium truncate max-w-[130px]">
                  {currentSchool?.school_name || 'Classium Escola'}
                </span>
              )}
            </div>
          )}

          {/* Student Selector */}
          <div className="flex items-center gap-1.5 bg-[#E3F1FB] border border-[#1E3A5F]/20 rounded-lg px-2.5 py-1 text-[11px] text-[#1E3A5F] font-bold shrink-0">
            <GraduationCap className="w-3.5 h-3.5 text-[#1E3A5F] shrink-0" />
            {activeStudentList.length > 1 ? (
              <select
                value={student?.id || ''}
                onChange={(e) => {
                  selectFamilyStudent(e.target.value);
                  changeCurrentStudent(e.target.value);
                }}
                className="bg-transparent text-[#1E3A5F] font-bold outline-none cursor-pointer max-w-[130px] truncate"
              >
                {activeStudentList.map((st) => (
                  <option key={st?.id || 'st'} value={st?.id || ''} className="bg-white text-[#1A1A1A] font-medium">
                    {st?.name || 'Estudante'} ({st?.grade || 'Aluno'})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[#1E3A5F] font-bold truncate max-w-[130px]">
                {student?.name || 'Estudante'}
              </span>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
