import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { attendanceService, Attendance } from '../../services/attendance/attendance.service';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface AttendanceDiaryProps {
  classId: string;
  date: string;
  students?: any[];
}

export const AttendanceDiary: React.FC<AttendanceDiaryProps> = ({ classId, date, students: initialStudents = [] }) => {
  const [students, setStudents] = useState<any[]>(initialStudents);
  const [attendance, setAttendance] = useState<Record<string, Attendance['status']>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load existing attendance and students
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch students for the class
      const { data: studentsData } = await supabase
        .from('class_students')
        .select('student_id, students(id, name)')
        .eq('class_id', classId);

      // Fetch existing attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('date', date);
      
      if (studentsData) {
        setStudents(studentsData.map(s => (s.students as any)));
      }
      
      if (attendanceData) {
        const initialAttendance: Record<string, Attendance['status']> = {};
        attendanceData.forEach(item => {
          initialAttendance[item.student_id] = item.status;
        });
        setAttendance(initialAttendance);
      }
      setLoading(false);
    };
    fetchData();
  }, [classId, date]);

  const toggleStatus = (studentId: string) => {
    const current = attendance[studentId] || 'present';
    const next: Record<string, Attendance['status']> = {
      'present': 'absent',
      'absent': 'late',
      'late': 'excused',
      'excused': 'present'
    };
    setAttendance(prev => ({ ...prev, [studentId]: next[current] }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    // Real implementation using upsert pattern identified in previous audits
    const updates = Object.entries(attendance).map(([student_id, status]) => ({
      class_id: classId,
      student_id,
      date,
      status
    }));

    await supabase.from('attendance').upsert(updates, { onConflict: 'student_id,class_id,attendance_date' });
    setSaving(false);
  };

  if (loading) return <div className="p-4 text-center"><Loader2 className="animate-spin inline" /> Carregando...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-semibold mb-4 text-slate-800">Diário de Frequência - {date}</h2>
      <div className="space-y-2">
        {students.map(student => (
          <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="font-medium text-slate-700">{student.name}</span>
            <button 
              onClick={() => toggleStatus(student.id)}
              className={`p-2 rounded-full ${
                (attendance[student.id] || 'present') === 'present' ? 'text-emerald-600 bg-emerald-100' :
                (attendance[student.id] || 'present') === 'absent' ? 'text-rose-600 bg-rose-100' :
                (attendance[student.id] || 'present') === 'late' ? 'text-amber-600 bg-amber-100' : 'text-slate-500 bg-slate-200'
              }`}
            >
              {(attendance[student.id] || 'present') === 'present' && <CheckCircle2 size={20} />}
              {(attendance[student.id] || 'present') === 'absent' && <XCircle size={20} />}
              {(attendance[student.id] || 'present') === 'late' && <AlertTriangle size={20} />}
              {(attendance[student.id] || 'present') === 'excused' && <span className="text-xs font-bold">J</span>}
            </button>
          </div>
        ))}
      </div>
      <button 
        onClick={saveAttendance}
        disabled={saving}
        className="mt-6 w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        {saving ? <Loader2 className="animate-spin inline" /> : 'Salvar Frequência'}
      </button>
    </div>
  );
};
