export interface SmartClass {
  id: string;
  name: string;
  shift: string;
  room: string;
  studentsCount: number;
  coordinator: string;
  status: 'Ativa' | 'Inativa';
  anoCiclo?: string;
  weeklyClasses?: number;
}

export interface SmartSubject {
  id: string;
  name: string;
  weeklyClasses: number;
  defaultTeacherId: string;
  mandatory: boolean;
  color: string; // e.g., 'blue', 'orange', 'green', 'purple', 'red', 'teal'
  observations?: string;
}

export interface SmartTeacher {
  id: string;
  name: string;
  subject: string;
  weeklyClasses: number;
  grades: string[];
  shifts?: string[];
  disciplines?: string[];
  email?: string;
  phone?: string;
  classAllocations?: Record<string, number>; // classId or className -> weeklyClasses
  availableDays: string[]; // e.g., ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
  unavailableTimes: { day: string; time: string }[]; // e.g., { day: 'Terça', time: '07:00' }
  preference: 'Primeiro horário' | 'Último horário' | 'Nenhuma';
  avoidSplitClasses: boolean;
  acceptWindows: boolean;
  maxClassesPerDay: number;
  avatar?: string;
}

export interface SmartRoom {
  id: string;
  name: string;
  capacity: number;
  type: 'Laboratório' | 'Informática' | 'Quadra' | 'Biblioteca' | 'Sala comum' | 'Sala Maker' | 'Laboratório Ciências';
}

export interface SmartConstraint {
  id: string;
  title: string;
  description: string;
  type: 'teacher' | 'class' | 'room' | 'general';
  active: boolean;
}

export interface SmartAlert {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  message: string;
}

export interface TimePeriod {
  id: string;
  name: string; // e.g. "1º horário"
  start: string; // e.g. "07:00"
  end: string;   // e.g. "07:50"
  isInterval?: boolean;
}

export interface GridAllocation {
  id: string;
  day: string; // 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado'
  timeSlot: string; // e.g. "07:00 - 07:50"
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
}
