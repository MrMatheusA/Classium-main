export interface QuestionOption {
  id: string;
  text: string;
}

export interface DocumentQuestion {
  id: string;
  number: number;
  type: string;
  difficulty: string;
  text: string;
  options?: string[];
  answer: string;
  imageUrl?: string;
  imageCaption?: string;
  columnA?: string[];
  columnB?: string[];
  crosswordWords?: { word: string; clue: string }[];
  crosswordData?: any;
  wordSearchWords?: string[];
  wordSearchData?: any;
  dottedText?: string;
  mazeData?: any;
}

export type HeaderModel = 'tradicional' | 'moderno' | 'infantil' | 'municipal' | 'estadual' | 'particular';

export interface HeaderData {
  model: HeaderModel;
  schoolName: string;
  departmentName?: string;
  teacherName: string;
  subject: string;
  grade: string;
  date: string;
  studentNameLine: string;
  maxPoints?: string;
  logoUrl?: string;
  watermarkText?: string;
  showWatermark?: boolean;
}

export interface StudioDocument {
  id: string;
  title: string;
  header: HeaderData;
  instructions: string;
  questions: DocumentQuestion[];
  estimatedTimeMinutes: number;
  bnccHabilites: string[];
  learningIndexExpected: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  label: string;
  timestamp: string;
  document: StudioDocument;
}

export interface ImageAsset {
  id: string;
  title: string;
  subject: string;
  category: 'colorir' | 'ilustracao' | 'esquema' | 'mapa' | 'icones';
  url: string;
  tags: string[];
}
