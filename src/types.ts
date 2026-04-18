export enum QuestionLevel {
  NB = "NB", // Nhận biết
  TH = "TH", // Thông hiểu
  VD = "VD", // Vận dụng
}

export enum QuestionType {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
  SHORT_ANSWER = "SHORT_ANSWER",
}

export interface MultipleChoiceQuestion {
  id: string;
  grade: number;
  subject: string;
  type: QuestionType.MULTIPLE_CHOICE;
  level: QuestionLevel;
  content: string;
  imageUrl?: string;
  imageWidth?: number;
  options: string[];
  correctAnswer: number; // Index 0-3
  schoolYear: string;
  examType: string;
}

export interface TrueFalseQuestion {
  id: string;
  grade: number;
  subject: string;
  type: QuestionType.TRUE_FALSE;
  level: QuestionLevel;
  content: string;
  imageUrl?: string;
  imageWidth?: number;
  subQuestions: {
    text: string;
    correctAnswer: boolean;
  }[];
  schoolYear: string;
  examType: string;
}

export interface ShortAnswerQuestion {
  id: string;
  grade: number;
  subject: string;
  type: QuestionType.SHORT_ANSWER;
  level: QuestionLevel;
  content: string;
  imageUrl?: string;
  imageWidth?: number;
  correctAnswer: string;
  schoolYear: string;
  examType: string;
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | ShortAnswerQuestion;

export interface Student {
  id: string;
  name: string;
  grade: number;
  className: string;
  password: string;
  hasChangedPassword: boolean;
  schoolYear: string;
  birthday?: string;
  gender?: string;
  examType?: string;
  subject?: string;
}

export interface ScoreRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  grade: number;
  subject: string;
  score: number;
  part1Score: number;
  part2Score: number;
  part3Score: number;
  timestamp: number;
  schoolYear: string;
  examType: string;
}

export interface ExamSettings {
  grade: number;
  className?: string | null;
  subject: string;
  schoolYear: string;
  examType: string;
  date: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
}
