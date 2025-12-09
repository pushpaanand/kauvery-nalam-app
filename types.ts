
export type Language = 'en' | 'ta';
export type Mode = 'self' | 'parent';

export interface LocalizedString {
  en: string;
  ta: string;
}

export interface Option {
  val: string;
  label: LocalizedString;
}

export interface Question {
  id: string;
  label: LocalizedString;
  options: Option[];
  dependsOn?: string;
  requiredValues?: string[]; // Values in dependsOn that trigger this question
}

export interface AssessmentData {
  [key: string]: string;
}

export interface AssessmentResult {
  zone: 'RED' | 'AMBER' | 'GREEN';
  code?: string;
  timestamp: string;
}

export interface UserInfo {
  name: string;
  dob: string;
  age: number;
  phone: string;
  email: string;
  location: string;
}

export interface AppState {
  language: Language; // Language is now always defined (defaults to en)
  hasStarted: boolean; // Track if user passed the welcome screen
  isUserInfoCollected: boolean;
  userInfo: UserInfo | null;
  userId: string | null; // User ID from database after user creation
  mode: Mode;
  step: number;
  answers: AssessmentData;
  result: AssessmentResult | null;
  unit: string;
  qrNo?: string | null;
  isSubmitting: boolean;
}
