import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

export const FamilyAttendanceView: React.FC<{ studentId: string }> = ({ studentId }) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });
      
      if (data) setAttendance(data);
      setLoading(false);
    };
    fetchAttendance();
  }, [studentId]);

  if (loading) return <div className="p-4 text-center"><Loader2 className="animate-spin inline" /> Carregando...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-semibold mb-4 text-slate-800">Histórico de Frequência</h2>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="pb-2">Data</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map(item => (
            <tr key={item.id} className="border-b border-slate-100 last:border-0">
              <td className="py-3">{item.date}</td>
              <td className="py-3">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  item.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                  item.status === 'absent' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.status.toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
