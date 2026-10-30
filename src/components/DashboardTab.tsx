import React from 'react';
import { HorarioDoProfessor } from './professor/HorarioDoProfessor';

interface DashboardTabProps {
  teacherName?: string;
  teacherId?: string;
  teacherSubject?: string;
  counts?: {
    lessons: number;
    students: number;
    diarios: number;
    announcements: number;
    unreadNotifications: number;
  };
  onSelectClass?: (classId: string) => void;
  classes?: Record<string, any> | any[];
  selectedClass?: string;
  onLogout?: () => void;
}

export function DashboardTab({ 
  teacherName, 
  teacherId, 
  teacherSubject,
  onSelectClass,
  classes,
  selectedClass,
  onLogout
}: DashboardTabProps) {
  return (
    <div className="space-y-6 animate-fade-in text-left">
      <HorarioDoProfessor 
        teacherId={teacherId}
        teacherName={teacherName}
        teacherSubject={teacherSubject}
        onSelectClass={onSelectClass}
        classes={classes}
        selectedClass={selectedClass}
        onLogout={onLogout}
      />
    </div>
  );
}
