export interface ClassModel {
  id: string;
  organization_id?: string;
  code?: string;
  name: string;
  grade: string;
  shift: string;
  shift_id?: string;
  room?: string;
  room_id?: string;
  max_capacity?: number;
  max_students?: number;
  academic_year?: string | number;
  academic_year_name?: string;
  status?: string;
  is_active?: boolean;
  students_count?: number;
  teachers_count?: number;
  numeration_status?: boolean | string;
  kit_escolar_status?: boolean | string;
  uniform_status?: boolean | string;
  school_days?: number;
  created_at?: string;
  updated_at?: string;
  students?: ClassEnrolledStudent[];
  teachers?: any[];
  [key: string]: any;
}

export interface ClassEnrolledStudent {
  id: string;
  student_id?: string;
  full_name: string;
  name?: string;
  registration_code?: string;
  birth_date?: string;
  sex?: string;
  gender?: string;
  status: string;
  class_id?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relationship?: string;
  uses_transport?: boolean;
  number_in_class?: number;
  created_at?: string;
}

export interface ClassFiltersState {
  academicYear: string;
  grade: string;
  shift: string;
  searchQuery: string;
  status: string;
}

export interface ClassStats {
  totalClasses: number;
  totalEnrolledStudents: number;
  activeClasses: number;
  totalCapacity: number;
  availableSpots: number;
  averageOccupancy: number;
}
