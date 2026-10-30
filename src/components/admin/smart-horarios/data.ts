import { 
  SmartClass, 
  SmartSubject, 
  SmartTeacher, 
  SmartRoom, 
  SmartConstraint,
  SmartAlert, 
  TimePeriod, 
  GridAllocation 
} from './types';

export const INITIAL_CLASSES: SmartClass[] = [];

export const INITIAL_SUBJECTS: SmartSubject[] = [];

export const INITIAL_TEACHERS: SmartTeacher[] = [];

export const INITIAL_ROOMS: SmartRoom[] = [];

export const INITIAL_HOURS: TimePeriod[] = [
  { id: 'h1', name: '1º Horário', start: '07:00', end: '07:50' },
  { id: 'h2', name: '2º Horário', start: '07:50', end: '08:40' },
  { id: 'h3', name: '3º Horário', start: '08:40', end: '09:30' },
  { id: 'h4', name: '4º Horário', start: '09:50', end: '10:40' },
  { id: 'h5', name: '5º Horário', start: '10:40', end: '11:30' }
];

export const INITIAL_ALERTS: SmartAlert[] = [];

export const INITIAL_CONSTRAINTS: SmartConstraint[] = [];

export const INITIAL_ALLOCATIONS: GridAllocation[] = [];
