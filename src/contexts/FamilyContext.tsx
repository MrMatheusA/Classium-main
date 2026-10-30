import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export interface GuardianInfo {
  id: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
}

export interface SchoolInfo {
  school_id: string;
  school_name: string;
  school_logo?: string;
  school_unit?: string;
}

export interface FamilyContextType {
  guardian: GuardianInfo | null;
  currentSchool: SchoolInfo | null;
  currentStudent: any | null;
  schools: SchoolInfo[];
  students: any[];
  loading: boolean;
  refreshContext: () => Promise<void>;
  changeCurrentSchool: (schoolId: string) => void;
  changeCurrentStudent: (studentId: string) => void;
}

const FamilyContext = createContext<FamilyContextType>({
  guardian: null,
  currentSchool: null,
  currentStudent: null,
  schools: [],
  students: [],
  loading: true,
  refreshContext: async () => {},
  changeCurrentSchool: () => {},
  changeCurrentStudent: () => {},
});

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [guardian, setGuardian] = useState<GuardianInfo | null>(null);
  const [schools, setSchools] = useState<SchoolInfo[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [currentSchool, setCurrentSchool] = useState<SchoolInfo | null>(null);
  const [currentStudent, setCurrentStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const resolveGuardianProfile = async (authUserId: string): Promise<{ profileId: string; guardianData: GuardianInfo | null }> => {
    try {
      // 1. Get profile
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', authUserId)
        .maybeSingle();

      // 2. Get guardian by user_id, profile_id or id
      let guardianRow: any = null;
      const { data: gByUser } = await supabase
        .from('guardians')
        .select('*')
        .eq('user_id', authUserId)
        .maybeSingle();

      if (gByUser) {
        guardianRow = gByUser;
      } else {
        const { data: gByProfile } = await supabase
          .from('guardians')
          .select('*')
          .eq('profile_id', authUserId)
          .maybeSingle();

        if (gByProfile) {
          guardianRow = gByProfile;
        } else {
          const { data: gById } = await supabase
            .from('guardians')
            .select('*')
            .eq('id', authUserId)
            .maybeSingle();

          if (gById) guardianRow = gById;
        }
      }

      if (!guardianRow && !profileRow) {
        console.warn('Profile or Guardian not found for authUserId:', authUserId);
        return {
          profileId: authUserId,
          guardianData: null
        };
      }

      const guardianInfo: GuardianInfo = {
        id: guardianRow?.id || authUserId,
        name: guardianRow?.full_name || guardianRow?.name || profileRow?.full_name || 'Responsável Familiar',
        cpf: guardianRow?.cpf || 'Não informado',
        email: guardianRow?.email || profileRow?.email || 'responsavel@classium.com',
        phone: guardianRow?.phone || 'Não informado'
      };

      return { profileId: guardianRow?.id || authUserId, guardianData: guardianInfo };
    } catch (err) {
      console.error('Error in resolveGuardianProfile:', err);
      return {
        profileId: authUserId,
        guardianData: null
      };
    }
  };

  const refreshContext = useCallback(async () => {
    if (!user) {
      setGuardian(null);
      setSchools([]);
      setStudents([]);
      setCurrentSchool(null);
      setCurrentStudent(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { profileId, guardianData } = await resolveGuardianProfile(user.id);
      if (!guardianData) {
        setSchools([]);
        setStudents([]);
        setCurrentSchool(null);
        setCurrentStudent(null);
        setLoading(false);
        return;
      }
      setGuardian(guardianData);

      // Collect student IDs from all possible link tables
      const foundStudentIds = new Set<string>();

      // 1. student_responsible_links
      try {
        const { data: srl } = await supabase
          .from('student_responsible_links')
          .select('student_id')
          .or(`guardian_id.eq.${profileId},guardian_user_id.eq.${user.id}`);
        if (srl) {
          srl.forEach((l: any) => { if (l.student_id) foundStudentIds.add(l.student_id); });
        }
      } catch (_) {}

      // 2. student_guardians
      try {
        const { data: sg } = await supabase
          .from('student_guardians')
          .select('student_id')
          .eq('guardian_id', profileId);
        if (sg) {
          sg.forEach((l: any) => { if (l.student_id) foundStudentIds.add(l.student_id); });
        }
      } catch (_) {}

      // 3. family_links
      try {
        const { data: fl } = await supabase
          .from('family_links')
          .select('student_id')
          .eq('guardian_id', profileId);
        if (fl) {
          fl.forEach((l: any) => { if (l.student_id) foundStudentIds.add(l.student_id); });
        }
      } catch (_) {}

      // 4. Fallback search by CPF or Name in students table
      if (foundStudentIds.size === 0 && guardianData.cpf && guardianData.cpf !== 'Não informado') {
        try {
          const rawCpf = guardianData.cpf.replace(/\D/g, '');
          const { data: stCpf } = await supabase
            .from('students')
            .select('id')
            .or(`guardian_cpf.eq.${guardianData.cpf},guardian_cpf.eq.${rawCpf}`);
          if (stCpf) {
            stCpf.forEach((s: any) => { if (s.id) foundStudentIds.add(s.id); });
          }
        } catch (_) {}
      }

      const studentIds = Array.from(foundStudentIds);

      if (studentIds.length === 0) {
        setSchools([]);
        setCurrentSchool(null);
        setStudents([]);
        setCurrentStudent(null);
        setLoading(false);
        return;
      }

      // 2. Get students from Supabase
      const { data: studentList, error: studentError } = await supabase
        .from('students')
        .select('*')
        .in('id', studentIds);

      if (!studentError && studentList && studentList.length > 0) {
        // Fetch class information for these students from class_students -> classes
        const { data: classStudents } = await supabase
          .from('class_students')
          .select('student_id, class_id, classes:class_id(id, name)')
          .in('student_id', studentIds);

        const classMap: Record<string, { id: string; name: string }> = {};
        if (classStudents) {
          classStudents.forEach((cs: any) => {
            if (cs.classes) {
              classMap[cs.student_id] = cs.classes as any;
            }
          });
        }

        const mappedStudents = studentList.map((s: any) => {
          const cls = (classMap && classMap[s.id]) || { id: 'sem-turma', name: 'Sem Turma' };
          return {
            ...s,
            name: s.full_name || s.name || 'Estudante',
            school_id: s.organization_id || s.school_id,
            grade: cls?.name || 'Sem Turma',
            classId: cls?.name || 'Sem Turma'
          };
        });

        setStudents(mappedStudents);
        
        setCurrentStudent((prevStudent: any) => {
          if (prevStudent && mappedStudents.some((s: any) => s.id === prevStudent.id)) {
            return prevStudent;
          }
          return mappedStudents[0];
        });

        // 3. Get schools/organizations linked via students
        const orgIds = Array.from(new Set(studentList.map((s: any) => s.organization_id || s.school_id).filter(Boolean)));
        if (orgIds.length > 0) {
          const { data: orgList, error: orgError } = await supabase
            .from('organizations')
            .select('id, name')
            .in('id', orgIds);

          if (!orgError && orgList && orgList.length > 0) {
            const mappedSchools: SchoolInfo[] = orgList.map((sch: any) => ({
              school_id: sch?.id || '',
              school_name: sch?.name || 'Organização Escolar',
              school_logo: '',
              school_unit: '',
            }));
            setSchools(mappedSchools);

            setCurrentSchool((prevSchool: any) => {
              if (prevSchool && mappedSchools.some(s => s.school_id === prevSchool.school_id)) {
                return prevSchool;
              }
              return mappedSchools[0];
            });
          } else {
            setSchools([]);
            setCurrentSchool(null);
          }
        } else {
          setSchools([]);
          setCurrentSchool(null);
        }
      } else {
        setStudents([]);
        setCurrentStudent(null);
        setSchools([]);
        setCurrentSchool(null);
      }
    } catch (err) {
      console.error('Error in FamilyProvider refreshContext:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) {
      refreshContext();
    }
  }, [authLoading, user?.id, refreshContext]);

  const changeCurrentSchool = useCallback((schoolId: string) => {
    const found = schools.find(s => s.school_id === schoolId);
    if (found) {
      setCurrentSchool(found);
      const studentsInSchool = students.filter(st => st.school_id === schoolId);
      if (studentsInSchool.length > 0) {
        if (!currentStudent || currentStudent.school_id !== schoolId) {
          setCurrentStudent(studentsInSchool[0]);
        }
      }
    }
  }, [schools, students, currentStudent]);

  const changeCurrentStudent = useCallback((studentId: string) => {
    const found = students.find(s => s.id === studentId);
    if (found) {
      setCurrentStudent(found);
      if (found.school_id) {
        const schoolFound = schools.find(s => s.school_id === found.school_id);
        if (schoolFound) {
          setCurrentSchool(schoolFound);
        }
      }
    }
  }, [students, schools]);

  const value = useMemo(() => ({
    guardian,
    currentSchool,
    currentStudent,
    schools,
    students,
    loading: loading || authLoading,
    refreshContext,
    changeCurrentSchool,
    changeCurrentStudent,
  }), [guardian, currentSchool, currentStudent, schools, students, loading, authLoading, refreshContext, changeCurrentSchool, changeCurrentStudent]);

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamilyContext = () => useContext(FamilyContext);
