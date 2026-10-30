import React, { useState, useEffect } from 'react';
import { EducaSharedCalendar } from '../common/EducaSharedCalendar';
import { usePlatform } from '../../context/PlatformContext';
import { conductRoutineRadarService } from '../../services/conductRoutineRadarService';

export function SchoolCalendarTab() {
  const { student, familyStudents, activeStudentId, selectedUnit } = usePlatform();
  const [resolvedSchoolId, setResolvedSchoolId] = useState<string | undefined>(student?.school_id || selectedUnit || undefined);

  useEffect(() => {
    async function resolveSchool() {
      const currentStudent = familyStudents?.find(s => s.id === activeStudentId) || student;
      if (currentStudent?.school_id) {
        setResolvedSchoolId(currentStudent.school_id);
      } else {
        const familyList = await conductRoutineRadarService.getFamilyStudents();
        const activeS = familyList.find((s: any) => s.id === activeStudentId) || familyList[0];
        if (activeS?.school_id) {
          setResolvedSchoolId(activeS.school_id);
        } else {
          setResolvedSchoolId(student?.school_id || selectedUnit || undefined);
        }
      }
    }
    resolveSchool();
  }, [activeStudentId, familyStudents, student, selectedUnit]);

  return (
    <div id="school-calendar-container" key={resolvedSchoolId || 'default-school-cal'}>
      <EducaSharedCalendar role="family" selectedUnit={resolvedSchoolId} />
    </div>
  );
}

