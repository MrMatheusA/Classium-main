import { usePlatform } from '../context/PlatformContext';
import { AIAlertPanel } from './AIAlertPanel';
import { IBEWidget } from './IBEWidget';
import { OccurrencesList } from './OccurrencesList';
import { PerformanceChartWidget } from './PerformanceChartWidget';
import { Calendar, FileText, Phone, UserCheck } from 'lucide-react';

export function Dashboard() {
  const { activeFamilyStudent, familyStudents, selectedStudentId } = usePlatform();
  const student = activeFamilyStudent || (familyStudents && familyStudents.length > 0 ? familyStudents[0] : null);

  if (!student) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center py-20 bg-dark-panel rounded-2xl border border-gold/10">
        <UserCheck className="w-12 h-12 text-gold/50 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Nenhum estudante vinculado</h3>
        <p className="text-xs text-slate-400">Os dados acadêmicos e comportamentais serão exibidos assim que houver um estudante associado.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Student Profile Header */}
      <div className="bg-dark-panel rounded-2xl p-6 border border-gold/10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative overflow-hidden shadow-lg shadow-black/20">
        {/* Decorative background shape */}
        <div className="absolute -right-20 -top-40 w-96 h-96 bg-white/5 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        <div className="flex items-center gap-6 relative z-10">
          <img 
            src={student.photoUrl || `https://i.pravatar.cc/150?u=${student.id}`} 
            alt={student.name} 
            className="w-20 h-20 rounded-full object-cover border-2 border-gold shadow-md p-1 bg-oxford"
          />
          <div>
            <h2 className="text-2xl font-serif font-bold text-ice tracking-wide">{student.name}</h2>
            <p className="text-ice/60 font-medium text-sm mt-1">{student.grade} • Turma {student.classId}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 tracking-widest uppercase">
                Presença: {student.attendanceRate}%
              </span>
              <span className="text-xs text-gold/60 font-bold uppercase tracking-widest">RA: 202301923</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-oxford border border-gold/30 rounded-full text-xs font-bold text-gold uppercase tracking-widest hover:bg-gold/10 transition-colors shadow-sm">
            <FileText className="w-4 h-4" />
            Autorizações
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-bordeaux border border-bordeaux text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-bordeaux/90 transition-colors shadow-lg shadow-bordeaux/20">
            <Calendar className="w-4 h-4" />
            Agendar Reunião
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Alerts & Performance */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <AIAlertPanel alerts={student.aiAlerts} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PerformanceChartWidget data={student.performance} />
            <div className="space-y-6 flex flex-col">
               <IBEWidget score={student.ibeScore} />
               <div className="bg-bordeaux/20 rounded-2xl p-6 border border-bordeaux/40 text-ice flex-1 flex flex-col justify-between shadow-lg shadow-black/20">
                  <div>
                    <h3 className="text-[10px] text-gold font-bold uppercase mb-3 tracking-widest flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Rede de Apoio
                    </h3>
                    <p className="text-xs text-ice/80 leading-relaxed italic">
                      A escola disponibiliza reforço de matemática focado nas dificuldades detectadas da aluna.
                    </p>
                  </div>
                  <button className="mt-4 w-full py-2.5 bg-oxford text-gold rounded-full text-xs font-bold uppercase tracking-widest border border-gold/50 hover:bg-gold/10 transition-colors shadow-sm">
                    Ver Opções de Reforço
                  </button>
               </div>
            </div>
          </div>
          
        </div>

        {/* Right Column - Timeline */}
        <div className="lg:col-span-1 flex flex-col">
          <OccurrencesList occurrences={student.occurrences} />
        </div>

      </div>
    </div>
  );
}
