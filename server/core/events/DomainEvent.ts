export interface DomainEvent<T = any> {
  eventId: string;
  eventName: string;
  timestamp: string;
  schoolId?: string;
  payload: T;
  metadata?: {
    userId?: string;
    correlationId?: string;
    source?: string;
  };
}

export type EventName =
  | 'EnrollmentCompleted'
  | 'StudentCreated'
  | 'GuardianLinked'
  | 'FamilyAccountCreated'
  | 'AttendanceCreated'
  | 'AttendanceUpdated'
  | 'GradeCreated'
  | 'GradeUpdated'
  | 'CommunicationCreated'
  | 'CommunicationDelivered'
  | 'CommunicationRead'
  | 'DigitalSignatureCompleted'
  | 'TeacherAssigned'
  | 'ClassCreated'
  | 'AcademicYearOpened'
  | 'AcademicYearClosed';
