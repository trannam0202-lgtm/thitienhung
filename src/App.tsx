/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  GraduationCap, 
  UserCircle, 
  Settings, 
  Eye, 
  EyeOff, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  FileUp,
  Download,
  Save,
  Calendar,
  RotateCcw,
  Image as ImageIcon,
  Upload,
  X,
  Key
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import mammoth from "mammoth";
import { 
  Question, 
  Student, 
  ScoreRecord, 
  ExamSettings, 
  QuestionType, 
  QuestionLevel, 
  MultipleChoiceQuestion, 
  TrueFalseQuestion, 
  ShortAnswerQuestion 
} from "./types";
import { 
  INITIAL_STUDENTS, 
  INITIAL_QUESTIONS, 
  GRADES, 
  CLASSES_PER_GRADE, 
  INITIAL_EXAM_SETTINGS,
  SCHOOL_YEARS,
  EXAM_TYPES,
  SUBJECTS
} from "./constants";
import { cn } from "./lib/utils";
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import ImageResize from 'quill-image-resize-module-react';

if (typeof window !== 'undefined') {
  (window as any).katex = katex;
  try {
    Quill.register('modules/imageResize', ImageResize);
  } catch (e) {
    console.error('Quill register error:', e);
  }
}

import localforage from "localforage";
import { auth, db, OperationType, handleFirestoreError, loginAnonymously, logout } from "./firebase";
import { 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch 
} from "firebase/firestore";

// Configure localforage
localforage.config({
  name: 'thcs_tien_hung',
  storeName: 'app_data'
});

// --- Quill Configuration ---
const getQuillModules = () => {
  const modules: any = {
    toolbar: [
      [{ 'font': [] }, { 'size': [] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image', 'formula'],
      ['clean']
    ]
  };

  if (typeof window !== 'undefined') {
    try {
      modules.imageResize = {
        modules: ['Resize', 'DisplaySize']
      };
    } catch (e) {
      console.error('ImageResize config error:', e);
    }
  }
  return modules;
};

const quillModules = getQuillModules();

const quillFormats = [
  'font', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'script', 'list',
  'blockquote', 'code-block',
  'link', 'image', 'formula'
];

// --- Utilities ---
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// --- Components ---

const Header = () => (
  <header className="bg-blue-700 text-white py-8 px-4 shadow-lg text-center">
    <h1 className="text-2xl md:text-4xl font-bold uppercase tracking-wider mb-2">
      WEBSITE THI TRỰC TUYẾN TRƯỜNG THCS TIẾN HƯNG
    </h1>
    <p className="text-blue-100 text-lg">Phường Bình Phước, tỉnh Đồng Nai</p>
  </header>
);

const Footer = () => (
  <footer className="bg-gray-800 text-gray-300 py-6 px-4 mt-auto text-center border-t border-gray-700">
    <p className="text-sm">
      Thiết kế và Quản trị: <span className="font-semibold text-white">Giáo viên Trần Văn Nam</span>, trường THCS Tiến Hưng
    </p>
  </footer>
);

// --- Main App ---

interface AdminDashboardProps {
  adminActiveTab: "students" | "questions" | "scores" | "settings";
  setAdminActiveTab: (tab: "students" | "questions" | "scores" | "settings") => void;
  adminGrade: number;
  setAdminGrade: (grade: number) => void;
  adminClass: string;
  setAdminClass: (cls: string) => void;
  adminSchoolYear: string;
  setAdminSchoolYear: (year: string) => void;
  adminExamType: string;
  setAdminExamType: (type: string) => void;
  adminSubject: string;
  setAdminSubject: (subject: string) => void;
  importStatus: { message: string, type: 'success' | 'error' } | null;
  setImportStatus: (status: { message: string, type: 'success' | 'error' } | null) => void;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  scores: ScoreRecord[];
  setScores: React.Dispatch<React.SetStateAction<ScoreRecord[]>>;
  examSettings: ExamSettings[];
  setExamSettings: React.Dispatch<React.SetStateAction<ExamSettings[]>>;
  handleLogout: () => void;
  isAdmin: boolean;
  setView: (view: any) => void;
  hasUnsavedStudents: boolean;
  setHasUnsavedStudents: (val: boolean) => void;
  hasUnsavedQuestions: boolean;
  setHasUnsavedQuestions: (val: boolean) => void;
  hasUnsavedSettings: boolean;
  setHasUnsavedSettings: (val: boolean) => void;
  isSyncing: boolean;
  setIsSyncing: (val: boolean) => void;
  editingQuestionId: string | null;
  setEditingQuestionId: (id: string | null) => void;
}

const AdminDashboard = ({
  adminActiveTab,
  setAdminActiveTab,
  adminGrade,
  setAdminGrade,
  adminClass,
  setAdminClass,
  importStatus,
  setImportStatus,
  students,
  setStudents,
  questions,
  setQuestions,
  scores,
  setScores,
  examSettings,
  setExamSettings,
  handleLogout,
  adminSchoolYear,
  setAdminSchoolYear,
  adminExamType,
  setAdminExamType,
  adminSubject,
  setAdminSubject,
  isAdmin,
  setView,
  hasUnsavedStudents,
  setHasUnsavedStudents,
  hasUnsavedQuestions,
  setHasUnsavedQuestions,
  hasUnsavedSettings,
  setHasUnsavedSettings,
  isSyncing,
  setIsSyncing,
  editingQuestionId,
  setEditingQuestionId
}: AdminDashboardProps) => {
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [studentToReset, setStudentToReset] = useState<string | null>(null);

  // Sync adminClass when adminGrade changes to ensure it's valid (e.g. 6A1, 7A1)
  useEffect(() => {
    if (adminClass && !adminClass.startsWith(adminGrade.toString())) {
      setAdminClass(`${adminGrade}${adminClass.substring(adminGrade.toString().length === 1 ? 1 : 2) || "A1"}`);
    }
  }, [adminGrade]);

  const handleSaveStudents = async () => {
    try {
      setImportStatus({ message: "Đang lưu danh sách học sinh...", type: 'success' });
      // Save all students to ensure batch imports across multiple classes are persisted
      const chunks = [];
      for (let i = 0; i < students.length; i += 400) {
        chunks.push(students.slice(i, i + 400));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(s => {
          batch.set(doc(db, "students", s.id), s);
        });
        await batch.commit();
      }

      setHasUnsavedStudents(false);
      setImportStatus({ message: "Đã lưu toàn bộ danh sách học sinh thành công!", type: 'success' });
      setTimeout(() => setImportStatus(null), 3000);
    } catch (e) {
      console.error("Failed to save students:", e);
      setImportStatus({ message: "Lỗi khi lưu danh sách học sinh!", type: 'error' });
    }
  };

  const handleSaveQuestions = async () => {
    // Only save current filtered questions to save quota
    const filteredQuestions = questions.filter(q => 
      q.grade === adminGrade && 
      q.schoolYear === adminSchoolYear && 
      q.examType === adminExamType &&
      q.subject === adminSubject
    );

    if (filteredQuestions.length === 0) {
      setImportStatus({ message: "Không có câu hỏi nào để lưu trong bộ lọc này!", type: 'error' });
      return;
    }

    try {
      setImportStatus({ message: `Đang lưu ${filteredQuestions.length} câu hỏi...`, type: 'success' });
      
      const chunks = [];
      for (let i = 0; i < filteredQuestions.length; i += 400) {
        chunks.push(filteredQuestions.slice(i, i + 400));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(q => {
          batch.set(doc(db, "questions", q.id), q);
        });
        await batch.commit();
      }

      setHasUnsavedQuestions(false);
      setImportStatus({ message: "Đã lưu danh sách câu hỏi theo bộ lọc thành công!", type: 'success' });
      setTimeout(() => setImportStatus(null), 3000);
    } catch (e) {
      console.error("Failed to save questions:", e);
      setImportStatus({ message: "Lỗi khi lưu câu hỏi!", type: 'error' });
    }
  };

  const handleDeleteAllStudents = async () => {
    const studentsToDelete = students.filter(s => s.className === adminClass && s.schoolYear === adminSchoolYear);
    try {
      const batch = writeBatch(db);
      studentsToDelete.forEach(s => {
        batch.delete(doc(db, "students", s.id));
      });
      await batch.commit();
      setStudents(prev => prev.filter(s => !(s.className === adminClass && s.schoolYear === adminSchoolYear)));
      setShowDeleteAllConfirm(false);
      setImportStatus({ message: `Đã xoá toàn bộ học sinh Lớp ${adminClass}`, type: 'success' });
      setTimeout(() => setImportStatus(null), 3000);
    } catch (e) {
      console.error("Failed to delete students:", e);
    }
  };

  const handleDeleteAllQuestions = async () => {
    const questionsToDelete = questions.filter(q => 
      q.grade === adminGrade && 
      q.schoolYear === adminSchoolYear && 
      q.examType === adminExamType &&
      q.subject === adminSubject
    );
    try {
      const batch = writeBatch(db);
      questionsToDelete.forEach(q => {
        batch.delete(doc(db, "questions", q.id));
      });
      await batch.commit();
      setQuestions(prev => prev.filter(q => !(q.grade === adminGrade && q.schoolYear === adminSchoolYear && q.examType === adminExamType && q.subject === adminSubject)));
      setShowDeleteAllQuestionsConfirm(false);
      setImportStatus({ message: "Đã xoá toàn bộ câu hỏi cho lựa chọn hiện tại", type: 'success' });
      setTimeout(() => setImportStatus(null), 3000);
    } catch (e) {
      console.error("Failed to delete questions:", e);
    }
  };

  const handleSaveSettings = async () => {
    // Save only current filtered setting (or current grade's general settings)
    const setting = examSettings.find(s => 
      s.grade === adminGrade && 
      s.className === (adminClass === "All" ? null : adminClass) &&
      s.schoolYear === adminSchoolYear && 
      s.examType === adminExamType &&
      s.subject === adminSubject
    );

    if (!setting) {
      setImportStatus({ message: "Không tìm thấy cài đặt để lưu!", type: 'error' });
      return;
    }

    try {
      setImportStatus({ message: "Đang lưu cài đặt thời gian thi...", type: 'success' });
      const settingId = `${setting.grade}_${setting.className || 'all'}_${setting.schoolYear}_${setting.examType}_${setting.subject}`.replace(/\//g, '-').replace(/\s+/g, '_');
      await setDoc(doc(db, "settings", settingId), setting);
      
      setHasUnsavedSettings(false);
      setImportStatus({ message: "Đã lưu cài đặt thời gian thi thành công!", type: 'success' });
      setTimeout(() => setImportStatus(null), 3000);
    } catch (e) {
      console.error("Failed to save settings:", e);
      setImportStatus({ message: "Lỗi khi lưu cài đặt thời gian thi!", type: 'error' });
    }
  };
  const handleDeleteAllScores = async () => {
    const scoresToDelete = scores.filter(s => 
      s.className === adminClass && 
      s.schoolYear === adminSchoolYear && 
      s.examType === adminExamType && 
      s.subject === adminSubject
    );
    try {
      const batch = writeBatch(db);
      scoresToDelete.forEach(s => {
        batch.delete(doc(db, "scores", s.id));
      });
      await batch.commit();
      setScores(prev => prev.filter(s => !(s.className === adminClass && s.schoolYear === adminSchoolYear && s.examType === adminExamType && s.subject === adminSubject)));
      setShowDeleteAllScoresConfirm(false);
      setImportStatus({ message: "Đã xóa toàn bộ điểm số cho lựa chọn hiện tại", type: 'success' });
      setTimeout(() => setImportStatus(null), 3000);
    } catch (e) {
      console.error("Failed to delete scores:", e);
    }
  };
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showDeleteAllQuestionsConfirm, setShowDeleteAllQuestionsConfirm] = useState(false);
  const [showRestoreDefaultsConfirm, setShowRestoreDefaultsConfirm] = useState(false);
  const [showDeleteAllScoresConfirm, setShowDeleteAllScoresConfirm] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentBirthday, setNewStudentBirthday] = useState("");
  const [newStudentGender, setNewStudentGender] = useState("Nam");
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    grade: adminGrade,
    type: QuestionType.MULTIPLE_CHOICE,
    level: QuestionLevel.NB,
    content: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    subQuestions: [
      { text: "", correctAnswer: true },
      { text: "", correctAnswer: true },
      { text: "", correctAnswer: true },
      { text: "", correctAnswer: true },
    ]
  });

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, questionId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      if (questionId) {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, imageUrl: base64 } : q));
      } else {
        setNewQuestion(prev => ({ ...prev, imageUrl: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setNewQuestion(prev => ({ ...prev, grade: adminGrade }));
  }, [adminGrade]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        if (!data || data.length === 0) {
          setImportStatus({ message: "File Excel trống!", type: 'error' });
          return;
        }

        const newStudents: Student[] = [];
        let startIndex = 0;
        
        if (data.length > 0 && data[0][1]) {
          const firstRowCol2 = String(data[0][1]).toLowerCase();
          if (firstRowCol2.includes("tên") || firstRowCol2.includes("name") || firstRowCol2.includes("họ") || firstRowCol2.includes("full name")) {
            startIndex = 1;
          }
        }

        for (let i = startIndex; i < data.length; i++) {
          const row = data[i];
          if (row && row.length >= 2 && row[1]) {
            const name = String(row[1]).trim();
            const birthday = row[2] ? String(row[2]).trim() : "";
            const gender = row[3] ? String(row[3]).trim() : "";
            if (name && name !== "undefined" && name !== "null" && name !== "") {
              newStudents.push({
                id: Math.random().toString(36).substr(2, 9),
                name: name,
                birthday: birthday,
                gender: gender,
                grade: adminGrade,
                className: adminClass,
                password: "123",
                hasChangedPassword: false,
                schoolYear: adminSchoolYear
              });
            }
          }
        }
        
        if (newStudents.length > 0) {
          setStudents(prev => [...prev, ...newStudents]);
          setHasUnsavedStudents(true);
          setImportStatus({ 
            message: `Đã nhập thành công ${newStudents.length} học sinh. Vui lòng chọn "Lưu danh sách" để hoàn tất.`, 
            type: 'success' 
          });
          setAdminActiveTab("students");
          setTimeout(() => setImportStatus(null), 5000);
        } else {
          setImportStatus({ 
            message: "Không tìm thấy dữ liệu học sinh ở cột thứ 2. Vui lòng kiểm tra lại file Excel.", 
            type: 'error' 
          });
        }
      } catch (err) {
        setImportStatus({ message: "Lỗi khi đọc file Excel! Vui lòng thử lại.", type: 'error' });
      }
      e.target.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const handleAddSingleStudent = async () => {
    if (!newStudentName.trim()) return;
    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      name: newStudentName.trim(),
      birthday: newStudentBirthday,
      gender: newStudentGender,
      grade: adminGrade,
      className: adminClass,
      password: "123",
      hasChangedPassword: false,
      schoolYear: adminSchoolYear
    };
    
    // Update local state
    setStudents(prev => [...prev, newStudent]);
    setHasUnsavedStudents(true);
    
    // Reset form
    setNewStudentName("");
    setNewStudentBirthday("");
    setNewStudentGender("Nam");
    setShowAddStudentModal(false);
    setImportStatus({ message: `Đã thêm học sinh ${newStudent.name}. Vui lòng chọn "Lưu danh sách" để hoàn tất.`, type: 'success' });
    setTimeout(() => setImportStatus(null), 3000);
  };

  const exportScores = () => {
    const filteredScores = scores.filter(s => 
      s.className === adminClass && 
      s.schoolYear === adminSchoolYear && 
      s.examType === adminExamType
    );
    const tableData = filteredScores.map((s, i) => ({
      "STT": i + 1,
      "Họ và tên học sinh": s.studentName,
      "Lớp": s.className,
      "Năm học": s.schoolYear,
      "Kỳ thi": s.examType,
      "Điểm Nhiều lựa chọn": s.part1Score || 0,
      "Điểm Đúng/Sai": s.part2Score || 0,
      "Điểm Trả lời ngắn": s.part3Score || 0,
      "Tổng điểm": s.score
    }));

    const ws = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(ws, [
      ["Trường THCS Tiến Hưng", "", "", "KẾT QUẢ KIỂM TRA ĐÁNH GIÁ MÔN ..."],
      ["", "", "", `Năm học: ${adminSchoolYear} - Kỳ thi: ${adminExamType}`],
      ["", "", "", `Lớp: ${adminClass}`],
      [],
      ["STT", "Họ và tên học sinh", "Lớp", "Năm học", "Kỳ thi", "Điểm Nhiều lựa chọn", "Điểm Đúng/Sai", "Điểm Trả lời ngắn", "Tổng điểm"]
    ], { origin: "A1" });

    XLSX.utils.sheet_add_json(ws, tableData, { origin: "A6", skipHeader: true });

    ws['!cols'] = [
      { wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KetQua");
    XLSX.writeFile(wb, `Ket_Qua_Lop_${adminClass}.xlsx`);
  };

  const exportQuestionTemplate = () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "MẪU NHẬP CÂU HỎI HỆ THỐNG THI TRỰC TUYẾN",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Dạng 1: Trắc nghiệm (MULTIPLE_CHOICE)" }),
          new Paragraph({ text: "Câu hỏi: [Nội dung câu hỏi]" }),
          new Paragraph({ text: "A. [Lựa chọn 1]" }),
          new Paragraph({ text: "B. [Lựa chọn 2]" }),
          new Paragraph({ text: "C. [Lựa chọn 3]" }),
          new Paragraph({ text: "D. [Lựa chọn 4]" }),
          new Paragraph({ text: "Đáp án: A" }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Dạng 2: Đúng/Sai (TRUE_FALSE)" }),
          new Paragraph({ text: "Câu hỏi: [Nội dung câu hỏi]" }),
          new Paragraph({ text: "a. [Phát biểu 1] - Đúng" }),
          new Paragraph({ text: "b. [Phát biểu 2] - Sai" }),
          new Paragraph({ text: "c. [Phát biểu 3] - Đúng" }),
          new Paragraph({ text: "d. [Phát biểu 4] - Sai" }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Dạng 3: Trả lời ngắn (SHORT_ANSWER)" }),
          new Paragraph({ text: "Câu hỏi: [Nội dung câu hỏi]" }),
          new Paragraph({ text: "Đáp án: [Nội dung đáp án]" }),
        ],
      }],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, "Mau_Nhap_Cau_Hoi.docx");
    });
  };

  const handleImportWord = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const arrayBuffer = evt.target?.result as ArrayBuffer;
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      
      // Simple parsing logic (can be improved)
      const lines = text.split('\n').map(l => l.trim()).filter(l => l !== "");
      const newQuestions: Question[] = [];
      
      let currentQ: any = null;
      
      lines.forEach(line => {
        if (line.startsWith("Câu hỏi:")) {
          if (currentQ) newQuestions.push(currentQ);
          currentQ = { 
            id: Math.random().toString(36).substr(2, 9), 
            grade: adminGrade,
            content: line.replace("Câu hỏi:", "").trim(), 
            level: QuestionLevel.NB 
          };
        } else if (line.startsWith("A.") || line.startsWith("B.") || line.startsWith("C.") || line.startsWith("D.")) {
          currentQ.type = QuestionType.MULTIPLE_CHOICE;
          if (!currentQ.options) currentQ.options = [];
          currentQ.options.push(line.substring(2).trim());
        } else if (line.startsWith("Đáp án:")) {
          const ans = line.replace("Đáp án:", "").trim();
          if (currentQ.type === QuestionType.MULTIPLE_CHOICE) {
            currentQ.correctAnswer = ans === "A" ? 0 : ans === "B" ? 1 : ans === "C" ? 2 : 3;
          } else {
            currentQ.type = QuestionType.SHORT_ANSWER;
            currentQ.correctAnswer = ans;
          }
        } else if (line.match(/^[a-d]\./)) {
          currentQ.type = QuestionType.TRUE_FALSE;
          if (!currentQ.subQuestions) currentQ.subQuestions = [];
          const isTrue = line.toLowerCase().includes("đúng");
          currentQ.subQuestions.push({ text: line.split('-')[0].substring(2).trim(), correctAnswer: isTrue });
        }
      });
      if (currentQ) newQuestions.push(currentQ);
      
      // Replace existing questions for this grade
      setQuestions(prev => [
        ...prev.filter(q => q.grade !== adminGrade),
        ...newQuestions
      ]);
      setImportStatus({ message: `Đã nhập thành công ${newQuestions.length} câu hỏi mới cho Khối ${adminGrade} (Đã thay thế câu hỏi cũ)`, type: 'success' });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddQuestion = () => {
    const qId = Math.random().toString(36).substr(2, 9);
    const q = { 
      ...newQuestion, 
      id: qId,
      grade: adminGrade,
      subject: adminSubject,
      schoolYear: adminSchoolYear,
      examType: adminExamType
    } as Question;
    setQuestions(prev => [...prev, q]);
    
    // Sync to Firebase
    if (isAdmin) {
      setDoc(doc(db, "questions", q.id), q)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `questions/${q.id}`));
    }

    setEditingQuestionId(qId);
    setShowAddQuestionModal(false);
    setAdminActiveTab("questions");
    setImportStatus({ message: "Đã lưu câu hỏi mới. Bạn có thể tiếp tục chỉnh sửa bên dưới.", type: 'success' });
    setTimeout(() => setImportStatus(null), 5000);
    
    setNewQuestion({
      grade: adminGrade,
      subject: adminSubject,
      type: QuestionType.MULTIPLE_CHOICE,
      level: QuestionLevel.NB,
      content: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      subQuestions: [
        { text: "", correctAnswer: true },
        { text: "", correctAnswer: true },
        { text: "", correctAnswer: true },
        { text: "", correctAnswer: true },
      ]
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="text-blue-600" /> Bảng điều khiển Quản trị
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 uppercase tracking-wider">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Máy chủ trực tuyến
            </div>
            {isSyncing && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-wider animate-pulse">
                <RotateCcw size={10} className="animate-spin" /> Đang đồng bộ...
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setView("admin_change_password")}
            className="flex items-center gap-2 text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-lg"
          >
            <Key size={18} /> Đổi mật khẩu
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 font-bold hover:bg-red-50 px-4 py-2 rounded-lg">
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { id: "students", label: "Học sinh", icon: GraduationCap },
          { id: "questions", label: "Câu hỏi", icon: FileUp },
          { id: "scores", label: "Điểm số", icon: CheckCircle2 },
          { id: "settings", label: "Cài đặt thi", icon: Clock },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAdminActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 active:shadow-inner",
              adminActiveTab === tab.id ? "bg-blue-600 text-white shadow-lg" : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {importStatus && (
        <div className={cn(
          "mb-6 p-4 rounded-xl font-medium flex items-center gap-2 animate-bounce",
          importStatus.type === 'success' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {importStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {importStatus.message}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8">
        {adminActiveTab === "students" && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-6 rounded-2xl">
              <div>
                <label className="block text-sm font-medium mb-1">Năm học</label>
                <select className="p-2 border rounded-lg" value={adminSchoolYear} onChange={(e) => setAdminSchoolYear(e.target.value)}>
                  {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Khối</label>
                <select className="p-2 border rounded-lg" value={adminGrade} onChange={(e) => setAdminGrade(Number(e.target.value))}>
                  {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lớp</label>
                <select className="p-2 border rounded-lg" value={adminClass} onChange={(e) => setAdminClass(e.target.value)}>
                  {CLASSES_PER_GRADE.map(c => <option key={c} value={`${adminGrade}${c}`}>Lớp {adminGrade}{c}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasUnsavedStudents && (
                  <button 
                    onClick={handleSaveStudents}
                    className="flex items-center gap-2 bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-all font-bold active:scale-95 shadow-lg animate-pulse"
                  >
                    <Save size={18} /> Lưu tất cả học sinh đang chờ
                  </button>
                )}
                {!showDeleteAllConfirm ? (
                  <button 
                    onClick={() => setShowDeleteAllConfirm(true)}
                    className="flex items-center gap-2 bg-red-100 text-red-600 px-6 py-2 rounded-lg hover:bg-red-200 transition-colors font-bold active:scale-95 active:shadow-inner"
                  >
                    <Trash2 size={18} /> Xoá toàn bộ lớp
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg border border-red-200">
                    <span className="text-xs text-red-700 font-bold px-2">Xác nhận xoá?</span>
                    <button 
                      onClick={handleDeleteAllStudents}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold active:scale-95 active:shadow-inner"
                    >
                      Xoá
                    </button>
                    <button 
                      onClick={() => setShowDeleteAllConfirm(false)}
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-bold active:scale-95 active:shadow-inner"
                    >
                      Hủy
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => setShowAddStudentModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-bold active:scale-95 active:shadow-inner"
                >
                  <Plus size={18} /> Thêm học sinh
                </button>
                <div className="relative">
                  <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} accept=".xlsx,.xls,.csv" />
                  <label htmlFor="file-upload" className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-green-700 transition-colors font-bold active:scale-95 active:shadow-inner">
                    <FileUp size={18} /> Nhập từ Excel
                  </label>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="py-4 px-4">STT</th>
                    <th className="py-4 px-4">Họ và Tên</th>
                    <th className="py-4 px-4">Ngày sinh</th>
                    <th className="py-4 px-4">Giới tính</th>
                    <th className="py-4 px-4">Lớp</th>
                    <th className="py-4 px-4">Năm học</th>
                    <th className="py-4 px-4">Mật khẩu</th>
                    <th className="py-4 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {students.filter(s => s.className === adminClass && s.schoolYear === adminSchoolYear).map((s, i) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-4 px-4">{i + 1}</td>
                      <td className="py-4 px-4 font-medium">{s.name}</td>
                      <td className="py-4 px-4 text-sm">{s.birthday || "---"}</td>
                      <td className="py-4 px-4 text-sm">{s.gender || "---"}</td>
                      <td className="py-4 px-4">{s.className}</td>
                      <td className="py-4 px-4">{s.schoolYear}</td>
                      <td className="py-4 px-4 text-gray-400">{s.password}</td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {studentToReset === s.id ? (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={async () => {
                                  const updatedStudent = { ...s, password: "123", hasChangedPassword: false };
                                  setStudents(prev => prev.map(st => st.id === s.id ? updatedStudent : st));
                                  try {
                                    await setDoc(doc(db, "students", s.id), updatedStudent);
                                    setStudentToReset(null);
                                    setImportStatus({ message: `Đã reset mật khẩu cho ${s.name} về 123`, type: 'success' });
                                    setTimeout(() => setImportStatus(null), 3000);
                                  } catch (e) {
                                    console.error("Failed to reset password:", e);
                                  }
                                }}
                                className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold active:scale-95"
                              >
                                Xác nhận Reset
                              </button>
                              <button 
                                onClick={() => setStudentToReset(null)}
                                className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold active:scale-95"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setStudentToReset(s.id)} 
                              className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                              title="Reset mật khẩu về 123"
                            >
                              <RotateCcw size={18} />
                            </button>
                          )}

                          {studentToDelete === s.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={async () => {
                                  try {
                                    await deleteDoc(doc(db, "students", s.id));
                                    setStudents(prev => prev.filter(st => st.id !== s.id));
                                    setStudentToDelete(null);
                                  } catch (e) {
                                    console.error("Failed to delete student:", e);
                                  }
                                }}
                                className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold active:scale-95 active:shadow-inner"
                              >
                                Xoá
                              </button>
                              <button 
                                onClick={() => setStudentToDelete(null)}
                                className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold active:scale-95 active:shadow-inner"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setStudentToDelete(s.id)} 
                              className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                              title="Xoá học sinh"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {students.filter(s => s.className === adminClass && s.schoolYear === adminSchoolYear).length === 0 && (
                <div className="text-center py-12 text-gray-400 italic">
                  Chưa có học sinh nào trong lớp này cho năm học {adminSchoolYear}. Vui lòng nhập danh sách từ Excel (Cột 2 là Họ tên).
                </div>
              )}
            </div>
          </div>
        )}

        {adminActiveTab === "questions" && (
          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <h3 className="text-xl font-bold text-gray-800">Quản lý Ngân hàng Câu hỏi</h3>
              {isSyncing && (
                <div className="flex items-center gap-2 text-xs text-blue-500 font-bold animate-pulse">
                  <RotateCcw size={12} className="animate-spin" /> Đang tự động lưu...
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-6 rounded-2xl mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Năm học</label>
                <select className="p-2 border rounded-lg" value={adminSchoolYear} onChange={(e) => setAdminSchoolYear(e.target.value)}>
                  {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kỳ thi</label>
                <select className="p-2 border rounded-lg" value={adminExamType} onChange={(e) => setAdminExamType(e.target.value)}>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chọn Khối</label>
                <select className="p-2 border rounded-lg" value={adminGrade} onChange={(e) => setAdminGrade(Number(e.target.value))}>
                  {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chọn Bộ đề</label>
                <select className="p-2 border rounded-lg" value={adminSubject} onChange={(e) => setAdminSubject(e.target.value)}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasUnsavedQuestions && (
                  <button 
                    onClick={handleSaveQuestions}
                    className="flex items-center gap-2 bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-all font-bold active:scale-95 shadow-lg animate-pulse"
                  >
                    <Save size={18} /> Lưu câu hỏi Khối {adminGrade} - {adminSubject}
                  </button>
                )}
                {!showDeleteAllQuestionsConfirm ? (
                  <button 
                    onClick={() => setShowDeleteAllQuestionsConfirm(true)}
                    className="flex items-center gap-2 bg-red-100 text-red-600 px-6 py-2 rounded-lg hover:bg-red-200 transition-colors font-bold active:scale-95 active:shadow-inner"
                  >
                    <Trash2 size={18} /> Xoá toàn bộ câu hỏi
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg border border-red-200">
                    <span className="text-xs text-red-700 font-bold px-2">Xác nhận xoá?</span>
                    <button 
                      onClick={handleDeleteAllQuestions}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold active:scale-95 active:shadow-inner"
                    >
                      Xoá
                    </button>
                    <button 
                      onClick={() => setShowDeleteAllQuestionsConfirm(false)}
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-bold active:scale-95 active:shadow-inner"
                    >
                      Hủy
                    </button>
                  </div>
                )}
                {!showRestoreDefaultsConfirm ? (
                  <button 
                    onClick={() => setShowRestoreDefaultsConfirm(true)}
                    className="flex items-center gap-2 bg-blue-100 text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-200 transition-colors font-bold active:scale-95 active:shadow-inner"
                  >
                    <RotateCcw size={18} /> Khôi phục câu hỏi mẫu
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-blue-50 p-1 rounded-lg border border-blue-200">
                    <span className="text-xs text-blue-700 font-bold px-2">Xác nhận khôi phục mẫu?</span>
                    <button 
                      onClick={() => {
                        setQuestions(INITIAL_QUESTIONS);
                        setShowRestoreDefaultsConfirm(false);
                        setImportStatus({ message: "Đã khôi phục toàn bộ câu hỏi mẫu cho tất cả các khối", type: 'success' });
                        setTimeout(() => setImportStatus(null), 3000);
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold active:scale-95 active:shadow-inner"
                    >
                      Khôi phục
                    </button>
                    <button 
                      onClick={() => setShowRestoreDefaultsConfirm(false)}
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-bold active:scale-95 active:shadow-inner"
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-4">
              <h3 className="text-xl font-bold">Ngân hàng câu hỏi {adminSubject} - Khối {adminGrade} - {adminSchoolYear} - {adminExamType}</h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={exportQuestionTemplate}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-bold active:scale-95"
                >
                  <Download size={18} /> Xuất mẫu Word
                </button>
                <div className="relative">
                  <input type="file" id="word-import" className="hidden" onChange={handleImportWord} accept=".docx" />
                  <label htmlFor="word-import" className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-200 font-bold active:scale-95">
                    <FileUp size={18} /> Nhập từ Word
                  </label>
                </div>
                <button 
                  onClick={() => setShowAddQuestionModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-bold active:scale-95 shadow-lg"
                >
                  <Plus size={18} /> Thêm câu hỏi
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {questions.filter(q => 
                q.grade === adminGrade && 
                q.schoolYear === adminSchoolYear && 
                q.examType === adminExamType &&
                q.subject === adminSubject
              ).map((q, i) => (
                <div key={q.id} className="p-6 border rounded-2xl hover:shadow-lg transition-all bg-white relative group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase",
                        q.level === QuestionLevel.NB ? "bg-green-100 text-green-700" :
                        q.level === QuestionLevel.TH ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                      )}>
                        {q.level}
                      </span>
                      <span className="text-xs text-gray-400 font-medium uppercase tracking-widest">{q.type}</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingQuestionId(editingQuestionId === q.id ? null : q.id)}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                      >
                        <Settings size={18} />
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, "questions", q.id));
                            setQuestions(prev => prev.filter(item => item.id !== q.id));
                          } catch (e) {
                            console.error("Failed to delete question:", e);
                          }
                        }}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {editingQuestionId === q.id ? (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-blue-100">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nội dung câu hỏi</label>
                        <span className="text-[10px] text-blue-500 italic">Mẹo: Chèn phân số bằng công thức: \frac{"{tử}"}{"{mẫu}"}</span>
                      </div>
                      <div className="bg-white rounded-lg">
                        <ReactQuill 
                          theme="snow"
                          value={q.content || ""}
                          onChange={(content) => {
                            setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, content } : item));
                            setHasUnsavedQuestions(true);
                          }}
                          modules={quillModules}
                          formats={quillFormats}
                          placeholder="Nội dung câu hỏi..."
                        />
                      </div>
                      {q.type === QuestionType.MULTIPLE_CHOICE && (
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-500 uppercase">Các phương án trả lời</label>
                            <span className="text-[10px] text-blue-500 italic">Mẹo: \frac{"{tử}"}{"{mẫu}"}</span>
                          </div>
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex flex-col gap-1 bg-white p-2 rounded-lg border">
                              <div className="flex items-center gap-2 mb-1">
                                <input 
                                  type="radio" 
                                  checked={q.correctAnswer === optIdx} 
                                  onChange={() => {
                                    setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, correctAnswer: optIdx } : item));
                                    setHasUnsavedQuestions(true);
                                  }}
                                />
                                <span className="font-bold text-blue-600">Phương án {String.fromCharCode(65 + optIdx)}</span>
                              </div>
                              <ReactQuill 
                                theme="snow"
                                value={opt || ""}
                                onChange={(content) => {
                                  setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, options: (item as MultipleChoiceQuestion).options.map((o, idx) => idx === optIdx ? content : o) } : item));
                                  setHasUnsavedQuestions(true);
                                }}
                                modules={quillModules}
                                formats={quillFormats}
                                className="bg-white"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === QuestionType.TRUE_FALSE && (
                        <div className="space-y-4">
                          {q.subQuestions.map((sub, subIdx) => (
                            <div key={subIdx} className="space-y-2 p-3 bg-white rounded border">
                              <div className="flex flex-col gap-2">
                                <span className="font-bold text-blue-600">Ý {String.fromCharCode(97 + subIdx)}.</span>
                                <ReactQuill 
                                  theme="snow"
                                  value={sub.text || ""}
                                  onChange={(content) => {
                                    setQuestions(prev => prev.map(item => item.id === q.id ? { 
                                      ...item, 
                                      subQuestions: (item as TrueFalseQuestion).subQuestions.map((s, idx) => idx === subIdx ? { ...s, text: content } : s) 
                                    } : item));
                                    setHasUnsavedQuestions(true);
                                  }}
                                  modules={quillModules}
                                  formats={quillFormats}
                                />
                              </div>
                              <div className="flex gap-4 pl-1">
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name={`edit-tf-${q.id}-${subIdx}`}
                                    checked={sub.correctAnswer === true}
                                    onChange={() => {
                                      setQuestions(prev => prev.map(item => item.id === q.id ? { 
                                        ...item, 
                                        subQuestions: (item as TrueFalseQuestion).subQuestions.map((s, idx) => idx === subIdx ? { ...s, correctAnswer: true } : s) 
                                      } : item));
                                      setHasUnsavedQuestions(true);
                                    }}
                                  /> Đúng
                                </label>
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name={`edit-tf-${q.id}-${subIdx}`}
                                    checked={sub.correctAnswer === false}
                                    onChange={() => {
                                      setQuestions(prev => prev.map(item => item.id === q.id ? { 
                                        ...item, 
                                        subQuestions: (item as TrueFalseQuestion).subQuestions.map((s, idx) => idx === subIdx ? { ...s, correctAnswer: false } : s) 
                                      } : item));
                                      setHasUnsavedQuestions(true);
                                    }}
                                  /> Sai
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === QuestionType.SHORT_ANSWER && (
                        <input 
                          className="w-full p-2 border rounded"
                          value={q.correctAnswer}
                          onChange={(e) => {
                            setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, correctAnswer: e.target.value } : item));
                            setHasUnsavedQuestions(true);
                          }}
                        />
                      )}
                      <button 
                        onClick={() => setEditingQuestionId(null)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold"
                      >
                        Xong
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div 
                        className="font-bold text-gray-800 text-lg q-content-html"
                        dangerouslySetInnerHTML={{ __html: q.content }}
                      />
                      {q.imageUrl && (
                        <div className="flex justify-center my-4">
                          <img 
                            src={q.imageUrl} 
                            alt="Question" 
                            className="rounded-lg border shadow-sm max-w-full h-auto object-contain" 
                            style={{ 
                              width: q.imageWidth ? `${q.imageWidth}px` : '300px',
                              maxHeight: '300px'
                            }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      {q.type === QuestionType.MULTIPLE_CHOICE && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className={cn(
                              "text-sm p-2 rounded-lg border flex gap-2",
                              q.correctAnswer === optIdx ? "bg-green-50 border-green-200 text-green-700 font-bold shadow-sm" : "border-gray-100 text-gray-600"
                            )}>
                              <span className="shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                              <div dangerouslySetInnerHTML={{ __html: opt }} className="flex-grow overflow-hidden" />
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === QuestionType.TRUE_FALSE && (
                        <div className="space-y-1 pl-4">
                          {q.subQuestions.map((sub, subIdx) => (
                            <div key={subIdx} className="text-sm text-gray-600 flex gap-2 items-center">
                              <span className="shrink-0">{String.fromCharCode(97 + subIdx)}.</span>
                              <div dangerouslySetInnerHTML={{ __html: sub.text }} className="flex-grow" />
                              <span className={sub.correctAnswer ? "text-green-600 font-bold shrink-0" : "text-red-600 font-bold shrink-0"}>
                                - {sub.correctAnswer ? "Đúng" : "Sai"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === QuestionType.SHORT_ANSWER && (
                        <p className="text-sm bg-blue-50 p-2 rounded-lg border border-blue-100 text-blue-700">
                          <span className="font-bold">Đáp án:</span> {q.correctAnswer}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {adminActiveTab === "scores" && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-6 rounded-2xl">
              <div>
                <label className="block text-sm font-medium mb-1">Năm học</label>
                <select className="p-2 border rounded-lg" value={adminSchoolYear} onChange={(e) => setAdminSchoolYear(e.target.value)}>
                  {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kỳ thi</label>
                <select className="p-2 border rounded-lg" value={adminExamType} onChange={(e) => setAdminExamType(e.target.value)}>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Khối</label>
                <select className="p-2 border rounded-lg" value={adminGrade} onChange={(e) => setAdminGrade(Number(e.target.value))}>
                  {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lớp</label>
                <select className="p-2 border rounded-lg" value={adminClass} onChange={(e) => setAdminClass(e.target.value)}>
                  {CLASSES_PER_GRADE.map(c => <option key={c} value={`${adminGrade}${c}`}>Lớp {adminGrade}{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chọn Bộ đề</label>
                <select className="p-2 border rounded-lg" value={adminSubject} onChange={(e) => setAdminSubject(e.target.value)}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button 
                onClick={exportScores}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-bold active:scale-95 transition-all"
              >
                <Download size={18} /> Xuất Excel Điểm
              </button>

              {!showDeleteAllScoresConfirm ? (
                <button 
                  onClick={() => setShowDeleteAllScoresConfirm(true)}
                  className="flex items-center gap-2 bg-red-100 text-red-600 px-6 py-2 rounded-lg hover:bg-red-200 transition-colors font-bold active:scale-95 active:shadow-inner"
                >
                  <Trash2 size={18} /> Xóa toàn bộ điểm
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg border border-red-200">
                  <span className="text-xs text-red-700 font-bold px-2">Xác nhận xóa hết điểm?</span>
                  <button 
                    onClick={handleDeleteAllScores}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold active:scale-95 active:shadow-inner"
                  >
                    Xóa
                  </button>
                  <button 
                    onClick={() => setShowDeleteAllScoresConfirm(false)}
                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-bold active:scale-95 active:shadow-inner"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="py-4 px-4">STT</th>
                    <th className="py-4 px-4">Học sinh</th>
                    <th className="py-4 px-4">Lớp</th>
                    <th className="py-4 px-4">Năm học</th>
                    <th className="py-4 px-4">Kỳ thi</th>
                    <th className="py-4 px-4">Trắc nghiệm</th>
                    <th className="py-4 px-4">Đúng/Sai</th>
                    <th className="py-4 px-4">Trả lời ngắn</th>
                    <th className="py-4 px-4">Tổng điểm</th>
                    <th className="py-4 px-4">Thời gian nộp</th>
                  </tr>
                </thead>
                <tbody>
                  {scores
                    .filter(s => 
                      s.className === adminClass && 
                      s.schoolYear === adminSchoolYear && 
                      s.examType === adminExamType &&
                      s.subject === adminSubject
                    )
                    .map((s, i) => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-4 px-4">{i + 1}</td>
                        <td className="py-4 px-4 font-medium">{s.studentName}</td>
                        <td className="py-4 px-4">{s.className}</td>
                        <td className="py-4 px-4">{s.schoolYear}</td>
                        <td className="py-4 px-4">{s.examType}</td>
                        <td className="py-4 px-4 text-gray-600">{s.part1Score?.toFixed(2) || "0.00"}</td>
                        <td className="py-4 px-4 text-gray-600">{s.part2Score?.toFixed(2) || "0.00"}</td>
                        <td className="py-4 px-4 text-gray-600">{s.part3Score?.toFixed(2) || "0.00"}</td>
                        <td className="py-4 px-4 font-bold text-blue-600">{s.score.toFixed(2)}</td>
                        <td className="py-4 px-4 text-gray-500 text-sm">{new Date(s.timestamp).toLocaleString("vi-VN")}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {scores.filter(s => s.className === adminClass && s.schoolYear === adminSchoolYear && s.examType === adminExamType).length === 0 && (
                <div className="text-center py-12 text-gray-400 italic">
                  Chưa có dữ liệu điểm cho lớp {adminClass} - {adminSchoolYear} - {adminExamType}.
                </div>
              )}
            </div>
          </div>
        )}

        {adminActiveTab === "settings" && (
          <div className="space-y-8">
            <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-6 rounded-2xl mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Năm học</label>
                <select className="p-2 border rounded-lg" value={adminSchoolYear} onChange={(e) => setAdminSchoolYear(e.target.value)}>
                  {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kỳ thi</label>
                <select className="p-2 border rounded-lg" value={adminExamType} onChange={(e) => setAdminExamType(e.target.value)}>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chọn Khối</label>
                <select className="p-2 border rounded-lg" value={adminGrade} onChange={(e) => setAdminGrade(Number(e.target.value))}>
                  {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chọn Lớp</label>
                <select className="p-2 border rounded-lg" value={adminClass} onChange={(e) => setAdminClass(e.target.value)}>
                  <option value="All">Tất cả các lớp (Khối {adminGrade})</option>
                  {CLASSES_PER_GRADE.map(c => <option key={c} value={`${adminGrade}${c}`}>Lớp {adminGrade}{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chọn Bộ đề</label>
                <select className="p-2 border rounded-lg" value={adminSubject} onChange={(e) => setAdminSubject(e.target.value)}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {hasUnsavedSettings && (
                <button 
                  onClick={handleSaveSettings}
                  className="flex items-center gap-2 bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-all font-bold active:scale-95 shadow-lg animate-pulse"
                >
                  <Save size={18} /> Lưu cài đặt cho {adminClass === "All" ? `Khối ${adminGrade}` : `Lớp ${adminClass}`}
                </button>
              )}
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-2xl">
              {(() => {
                const setting = examSettings.find(s => 
                  s.grade === adminGrade && 
                  s.className === (adminClass === "All" ? null : adminClass) &&
                  s.schoolYear === adminSchoolYear && 
                  s.examType === adminExamType &&
                  s.subject === adminSubject
                ) || {
                  grade: adminGrade,
                  className: adminClass === "All" ? null : adminClass,
                  subject: adminSubject,
                  schoolYear: adminSchoolYear,
                  examType: adminExamType,
                  date: "",
                  startDate: "",
                  endDate: "",
                  startTime: "",
                  endTime: "",
                  isActive: false
                };

                const handleUpdateSetting = (updates: Partial<ExamSettings>) => {
                  setExamSettings(prev => {
                    const index = prev.findIndex(s => 
                      s.grade === adminGrade && 
                      s.className === (adminClass === "All" ? null : adminClass) &&
                      s.schoolYear === adminSchoolYear && 
                      s.examType === adminExamType &&
                      s.subject === adminSubject
                    );
                    
                    let newSettings;
                    if (index >= 0) {
                      const updated = [...prev];
                      updated[index] = { ...updated[index], ...updates };
                      newSettings = updated;
                    } else {
                      newSettings = [...prev, { ...setting, ...updates, className: adminClass === "All" ? null : adminClass }];
                    }

                    // Auto-sync setting to Firestore (debounced or immediate for simple toggles)
                    if (isAdmin) {
                      const updatedSetting = newSettings.find(s => 
                        s.grade === adminGrade && 
                        s.className === (adminClass === "All" ? null : adminClass) &&
                        s.schoolYear === adminSchoolYear && 
                        s.examType === adminExamType && 
                        s.subject === adminSubject
                      );
                      if (updatedSetting) {
                        const settingId = `${updatedSetting.grade}_${updatedSetting.className || 'all'}_${updatedSetting.schoolYear}_${updatedSetting.examType}_${updatedSetting.subject}`.replace(/\//g, '-').replace(/\s+/g, '_');
                        setIsSyncing(true);
                        setDoc(doc(db, "settings", settingId), updatedSetting)
                          .then(() => setIsSyncing(false))
                          .catch(err => {
                            console.error("Auto-sync failed:", err);
                            setIsSyncing(false);
                          });
                      }
                    }

                    return newSettings;
                  });
                  setHasUnsavedSettings(false); // No longer "unsaved" as we are auto-syncing
                };

                return (
                  <div className={cn(
                    "p-8 border-2 rounded-3xl transition-all shadow-sm",
                    setting.isActive ? "bg-white border-green-200 shadow-green-100/50" : "bg-gray-50 border-gray-100 opacity-80"
                  )}>
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner",
                          setting.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                        )}>
                          {setting.grade}
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-gray-800">Khối {setting.grade}</h4>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">{adminSchoolYear} - {adminExamType}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleUpdateSetting({ isActive: !setting.isActive })}
                        className={cn(
                          "px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95",
                          setting.isActive ? "bg-green-600 text-white hover:bg-green-700" : "bg-red-600 text-white hover:bg-red-700"
                        )}
                      >
                        {setting.isActive ? "ĐANG MỞ" : "ĐANG ĐÓNG"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {adminExamType === "Kiểm tra thường xuyên" ? (
                        <>
                          <div className="md:col-span-3 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Ngày bắt đầu</label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input 
                                  type="date" 
                                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-2xl bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium"
                                  value={setting.startDate || ""}
                                  onChange={(e) => handleUpdateSetting({ startDate: e.target.value })}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Ngày kết thúc</label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input 
                                  type="date" 
                                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-2xl bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium"
                                  value={setting.endDate || ""}
                                  onChange={(e) => handleUpdateSetting({ endDate: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="md:col-span-3">
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Ngày thi</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input 
                              type="date" 
                              className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-2xl bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium"
                              value={setting.date || ""}
                              onChange={(e) => handleUpdateSetting({ date: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Bắt đầu</label>
                        <input 
                          type="time" 
                          className="w-full p-3 border-2 border-gray-100 rounded-2xl bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium"
                          value={setting.startTime || ""}
                          onChange={(e) => handleUpdateSetting({ startTime: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Kết thúc</label>
                        <input 
                          type="time" 
                          className="w-full p-3 border-2 border-gray-100 rounded-2xl bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium"
                          value={setting.endTime || ""}
                          onChange={(e) => handleUpdateSetting({ endTime: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-1 flex items-end">
                        <div className={cn(
                          "w-full p-3 rounded-2xl text-center text-xs font-bold uppercase border-2",
                          setting.isActive ? "bg-green-50 border-green-100 text-green-600" : "bg-red-50 border-red-100 text-red-600"
                        )}>
                          {setting.isActive ? "Sẵn sàng" : "Chưa kích hoạt"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Add Question Modal */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">Thêm câu hỏi mới</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Khối lớp</label>
                <select 
                  className="w-full p-2 border rounded-lg"
                  value={newQuestion.grade}
                  onChange={(e) => setNewQuestion({ ...newQuestion, grade: Number(e.target.value) })}
                >
                  {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chọn Bộ đề</label>
                <select 
                  className="w-full p-2 border rounded-lg"
                  value={newQuestion.subject}
                  onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })}
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loại câu hỏi</label>
                <select 
                  className="w-full p-2 border rounded-lg"
                  value={newQuestion.type}
                  onChange={(e) => {
                    const newType = e.target.value as QuestionType;
                    const base = { ...newQuestion, type: newType };
                    if (newType === QuestionType.MULTIPLE_CHOICE && !base.options) {
                      base.options = ["", "", "", ""];
                      base.correctAnswer = 0;
                    }
                    if (newType === QuestionType.TRUE_FALSE && !base.subQuestions) {
                      base.subQuestions = [
                        { text: "", correctAnswer: true },
                        { text: "", correctAnswer: true },
                        { text: "", correctAnswer: true },
                        { text: "", correctAnswer: true },
                      ];
                    }
                    if (newType === QuestionType.SHORT_ANSWER) {
                      base.correctAnswer = "";
                    }
                    setNewQuestion(base);
                  }}
                >
                  <option value={QuestionType.MULTIPLE_CHOICE}>Trắc nghiệm nhiều lựa chọn</option>
                  <option value={QuestionType.TRUE_FALSE}>Đúng/Sai</option>
                  <option value={QuestionType.SHORT_ANSWER}>Trả lời ngắn</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mức độ</label>
                <select 
                  className="w-full p-2 border rounded-lg"
                  value={newQuestion.level}
                  onChange={(e) => setNewQuestion({ ...newQuestion, level: e.target.value as QuestionLevel })}
                >
                  <option value={QuestionLevel.NB}>Nhận biết</option>
                  <option value={QuestionLevel.TH}>Thông hiểu</option>
                  <option value={QuestionLevel.VD}>Vận dụng</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">Nội dung câu hỏi</label>
                  <span className="text-[10px] text-blue-500 italic">Mẹo: Chèn phân số bằng công thức: \frac{"{tử}"}{"{mẫu}"}</span>
                </div>
                <div className="bg-white rounded-lg">
                  <ReactQuill 
                    theme="snow"
                    value={newQuestion.content || ""}
                    onChange={(content) => setNewQuestion({ ...newQuestion, content })}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Nhập nội dung câu hỏi..."
                  />
                </div>
              </div>

              {newQuestion.type === QuestionType.MULTIPLE_CHOICE && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium">Các phương án trả lời</label>
                    <span className="text-[10px] text-blue-500 italic">Mẹo: \frac{"{tử}"}{"{mẫu}"}</span>
                  </div>
                  {newQuestion.options?.map((opt, idx) => (
                    <div key={idx} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <input 
                          type="radio" 
                          checked={newQuestion.correctAnswer === idx}
                          onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: idx })}
                        />
                        <span className="font-bold text-blue-600">Phương án {String.fromCharCode(65 + idx)}</span>
                      </div>
                      <ReactQuill 
                        theme="snow"
                        value={opt || ""}
                        onChange={(content) => setNewQuestion({ 
                          ...newQuestion, 
                          options: (newQuestion.options || ["", "", "", ""]).map((o, i) => i === idx ? content : o) 
                        })}
                        modules={quillModules}
                        formats={quillFormats}
                        className="bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {newQuestion.type === QuestionType.TRUE_FALSE && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium">Các ý Đúng/Sai (a, b, c, d)</label>
                  {newQuestion.subQuestions?.map((sub, idx) => (
                    <div key={idx} className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex flex-col gap-2">
                        <span className="font-bold text-blue-600">Ý {String.fromCharCode(97 + idx)}.</span>
                        <ReactQuill 
                          theme="snow"
                          value={sub.text || ""}
                          onChange={(content) => setNewQuestion({ 
                            ...newQuestion, 
                            subQuestions: (newQuestion.subQuestions || []).map((s, i) => i === idx ? { ...s, text: content } : s) 
                          })}
                          modules={quillModules}
                          formats={quillFormats}
                          className="bg-white"
                        />
                      </div>
                      <div className="flex gap-4 pl-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name={`tf-ans-${idx}`}
                            checked={sub.correctAnswer === true}
                            onChange={() => setNewQuestion({ 
                              ...newQuestion, 
                              subQuestions: newQuestion.subQuestions?.map((s, i) => i === idx ? { ...s, correctAnswer: true } : s) 
                            })}
                          />
                          <span className="text-sm text-green-600 font-bold">Đúng</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name={`tf-ans-${idx}`}
                            checked={sub.correctAnswer === false}
                            onChange={() => setNewQuestion({ 
                              ...newQuestion, 
                              subQuestions: newQuestion.subQuestions?.map((s, i) => i === idx ? { ...s, correctAnswer: false } : s) 
                            })}
                          />
                          <span className="text-sm text-red-600 font-bold">Sai</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {newQuestion.type === QuestionType.SHORT_ANSWER && (
                <div>
                  <label className="block text-sm font-medium mb-1">Đáp án đúng</label>
                  <input 
                    className="w-full p-2 border rounded-lg"
                    value={newQuestion.correctAnswer as string}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                  />
                </div>
              )}

              <div className="flex gap-4 mt-8">
                <button 
                  onClick={handleAddQuestion}
                  className="flex-grow bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-95"
                >
                  Lưu câu hỏi
                </button>
                <button 
                  onClick={() => setShowAddQuestionModal(false)}
                  className="flex-grow bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 active:scale-95"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus size={24} /> Thêm học sinh mới
              </h2>
              <button onClick={() => setShowAddStudentModal(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                <p className="text-sm text-blue-700">
                  Thêm học sinh vào lớp <span className="font-bold">{adminClass}</span> - Năm học <span className="font-bold">{adminSchoolYear}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Họ và tên học sinh</label>
                <input 
                  autoFocus
                  type="text" 
                  className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all"
                  placeholder="Nhập họ và tên..."
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ngày sinh</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all"
                    placeholder="DD/MM/YYYY"
                    value={newStudentBirthday}
                    onChange={(e) => setNewStudentBirthday(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Giới tính</label>
                  <select 
                    className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all"
                    value={newStudentGender}
                    onChange={(e) => setNewStudentGender(e.target.value)}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={handleAddSingleStudent}
                  className="flex-grow bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all"
                >
                  Thêm học sinh
                </button>
                <button 
                  onClick={() => setShowAddStudentModal(false)}
                  className="flex-grow bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 active:scale-95 transition-all"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface HomeViewProps {
  selectedGrade: number | null;
  setSelectedGrade: (grade: number | null) => void;
  selectedSubject: string;
  setSelectedSubject: (subject: string) => void;
  setSelectedClass: (cls: string | null) => void;
  setView: (view: any) => void;
}

const HomeView = ({ selectedGrade, setSelectedGrade, selectedSubject, setSelectedSubject, setSelectedClass, setView }: HomeViewProps) => (
  <div className="max-w-6xl mx-auto p-6">
    <div className="flex flex-col items-center mb-12">
      <h2 className="text-xl font-bold text-gray-700 mb-4 uppercase tracking-widest">Chọn khối lớp</h2>
      <nav className="flex flex-wrap justify-center gap-4 border-b pb-6 w-full">
        {GRADES.map(grade => (
          <button
            key={grade}
            onClick={() => { setSelectedGrade(grade); setSelectedClass(null); }}
            className={cn(
              "px-8 py-3 rounded-full font-bold transition-all shadow-md active:scale-95 active:shadow-inner",
              selectedGrade === grade ? "bg-blue-600 text-white scale-105" : "bg-white text-blue-600 hover:bg-blue-50"
            )}
          >
            Khối {grade}
          </button>
        ))}
        <button
          onClick={() => setView("admin_login")}
          className="px-8 py-3 rounded-full font-bold bg-gray-800 text-white hover:bg-gray-900 transition-all shadow-md flex items-center gap-2 active:scale-95 active:shadow-inner"
        >
          <Settings size={18} /> Quản trị
        </button>
      </nav>
    </div>

    <AnimatePresence mode="wait">
      {selectedGrade && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {CLASSES_PER_GRADE.map(cls => (
            <button
              key={cls}
              onClick={() => { setSelectedClass(`${selectedGrade}${cls}`); setView("student_login"); }}
              className="p-6 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-center group active:scale-95 active:shadow-inner"
            >
              <GraduationCap className="mx-auto mb-2 text-blue-500 group-hover:scale-110 transition-transform" size={32} />
              <span className="text-xl font-bold text-gray-800">Lớp {selectedGrade}{cls}</span>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>

    {!selectedGrade && (
      <div className="text-center py-20 bg-blue-50 rounded-3xl border-2 border-dashed border-blue-200">
        <GraduationCap size={64} className="mx-auto text-blue-300 mb-4" />
        <h2 className="text-2xl font-semibold text-blue-800">Chào mừng bạn đến với hệ thống thi trực tuyến</h2>
        <p className="text-blue-600 mt-2">Vui lòng chọn khối lớp để bắt đầu</p>
      </div>
    )}
  </div>
);

interface StudentLoginViewProps {
  students: Student[];
  selectedClass: string | null;
  selectedSubject: string;
  handleStudentLogin: (student: Student, pass: string, schoolYear: string, examType: string, subject: string) => void;
  setView: (view: any) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  loginError: string;
  setLoginError: (error: string) => void;
}

const StudentLoginView = ({ 
  students, 
  selectedClass, 
  selectedSubject,
  handleStudentLogin, 
  setView, 
  showPassword, 
  setShowPassword, 
  loginError, 
  setLoginError 
}: StudentLoginViewProps) => {
  const classStudents = useMemo(() => {
    return students.filter(s => 
      s.className?.toString().trim().toLowerCase() === selectedClass?.toString().trim().toLowerCase()
    );
  }, [students, selectedClass]);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [schoolYear, setSchoolYear] = useState(SCHOOL_YEARS[0]);
  const [examType, setExamType] = useState(EXAM_TYPES[0]);
  const [subject, setSubject] = useState(selectedSubject);

  return (
    <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-2xl shadow-2xl border border-gray-100">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Đăng nhập học sinh - Lớp {selectedClass}</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn bộ Đề thi</label>
          <select 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50 font-bold text-blue-700"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chọn học sinh {classStudents.length > 0 ? `(${classStudents.length} học sinh)` : "(Không thấy học sinh)"}
          </label>
          <select 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            <option value="">-- Chọn tên của bạn --</option>
            {classStudents.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Năm học</label>
            <select 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
            >
              {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kỳ thi</label>
            <select 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
            >
              {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {loginError && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle size={14} /> {loginError}</p>}

        <button
          onClick={() => {
            const student = classStudents.find(s => s.id === selectedStudentId);
            if (student) handleStudentLogin(student, password, schoolYear, examType, subject);
            else setLoginError("Vui lòng chọn học sinh!");
          }}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg active:scale-[0.98] active:shadow-inner"
        >
          Đăng nhập
        </button>
        
        <button onClick={() => setView("home")} className="w-full text-gray-500 text-sm hover:underline active:scale-95">Quay lại</button>
      </div>
    </div>
  );
};

interface AdminLoginViewProps {
  handleAdminLogin: (user: string, pass: string) => void;
  setView: (view: any) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  loginError: string;
  setLoginError: (error: string) => void;
}

const AdminLoginView = ({ 
  handleAdminLogin, 
  setView, 
  showPassword, 
  setShowPassword, 
  loginError, 
  setLoginError 
}: AdminLoginViewProps) => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  return (
    <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-2xl shadow-2xl border border-gray-100">
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-gray-100 rounded-full">
          <Settings size={40} className="text-gray-700" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Đăng nhập Quản trị</h2>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
          <p className="text-sm text-blue-700 font-medium">
            Nhập tên đăng nhập và mật khẩu quản trị để truy cập bảng điều khiển.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
          <input
            type="text"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Nhập tên đăng nhập..."
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu Quản trị</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
              placeholder="Nhập mật khẩu..."
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin(user, pass)}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {loginError && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle size={14} /> {loginError}</p>}

        <button
          onClick={() => handleAdminLogin(user, pass)}
          className="w-full bg-gray-800 text-white py-3 rounded-lg font-bold hover:bg-gray-900 transition-all shadow-lg active:scale-[0.98] active:shadow-inner flex items-center justify-center gap-2"
        >
          Đăng nhập
        </button>
        
        <button onClick={() => setView("home")} className="w-full text-gray-500 text-sm hover:underline active:scale-95">Quay lại</button>
      </div>
    </div>
  );
};

interface AdminChangePasswordViewProps {
  setAdminPassword: (pass: string) => void;
  setView: (view: any) => void;
}

const AdminChangePasswordView = ({ setAdminPassword, setView }: AdminChangePasswordViewProps) => {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (newPass.length < 3) {
      setError("Mật khẩu phải ít nhất 3 ký tự!");
      return;
    }
    if (newPass !== confirmPass) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }
    try {
      // Manual sync to Firebase on password change
      const adminDocRef = doc(db, "admin", "config");
      await setDoc(adminDocRef, { password: newPass }, { merge: true });
      
      setAdminPassword(newPass);
      localStorage.setItem("thcs_admin_password", newPass);
      setView("admin_dashboard");
    } catch (e) {
      console.error("Failed to save admin password:", e);
      setError("Lỗi khi lưu mật khẩu vào máy chủ!");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-2xl shadow-2xl border border-gray-100">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">ĐỔI MẬT KHẨU QUẢN TRỊ</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Mật khẩu mới</label>
          <input
            type="password"
            className="w-full p-3 border rounded-lg"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Xác nhận mật khẩu</label>
          <input
            type="password"
            className="w-full p-3 border rounded-lg"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-grow bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 active:scale-95"
          >
            Đổi mật khẩu
          </button>
          <button
            onClick={() => setView("admin_dashboard")}
            className="flex-grow bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 active:scale-95"
          >
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  );
};

interface ChangePasswordViewProps {
  currentStudent: Student | null;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  setView: (view: any) => void;
}

const ChangePasswordView = ({ currentStudent, setStudents, setView }: ChangePasswordViewProps) => {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (newPass.length < 3) {
      setError("Mật khẩu phải ít nhất 3 ký tự!");
      return;
    }
    if (newPass !== confirmPass) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }
    
    const updatedStudent = { ...currentStudent!, password: newPass, hasChangedPassword: true };
    
    setStudents(prev => prev.map(s => 
      s.id === currentStudent?.id ? updatedStudent : s
    ));

    try {
      // Sync student password change to Firestore immediately
      await setDoc(doc(db, "students", updatedStudent.id), updatedStudent, { merge: true });
      setView("exam");
    } catch (e) {
      console.error("Failed to sync student password:", e);
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại!");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-2xl shadow-2xl border border-gray-100">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Đổi mật khẩu lần đầu</h2>
      <p className="text-sm text-gray-500 mb-6 text-center">Vì lý do bảo mật, vui lòng đổi mật khẩu trước khi bắt đầu thi.</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Mật khẩu mới</label>
          <input
            type="password"
            className="w-full p-3 border rounded-lg"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Xác nhận mật khẩu</label>
          <input
            type="password"
            className="w-full p-3 border rounded-lg"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={handleSave}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 active:scale-95 active:shadow-inner"
        >
          Lưu mật khẩu & Bắt đầu thi
        </button>
      </div>
    </div>
  );
};

interface ExamViewProps {
  questions: Question[];
  currentStudent: Student | null;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  answers: Record<string, any>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setScores: React.Dispatch<React.SetStateAction<ScoreRecord[]>>;
  handleLogout: () => void;
}

const ExamView = ({ 
  questions, 
  currentStudent, 
  timeLeft, 
  setTimeLeft, 
  answers, 
  setAnswers, 
  setScores, 
  handleLogout 
}: ExamViewProps) => {
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  
  // Shuffled questions and options for this session
  const [sessionQuestions, setSessionQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (isStarted && sessionQuestions.length === 0) {
      // Prepare questions with shuffled options
      const prepared = questions.map(q => {
        if (q.type === QuestionType.MULTIPLE_CHOICE) {
          const originalOptions = [...q.options];
          const indexedOptions = originalOptions.map((opt, idx) => ({ text: opt, originalIdx: idx }));
          const shuffled = shuffleArray(indexedOptions);
          return { ...q, shuffledOptions: shuffled };
        }
        if (q.type === QuestionType.TRUE_FALSE) {
          // Shuffle sub-questions order? User said "các ý A, B, C, D hoặc a, b, c, d được đảo vị trí"
          // For Part 2, it's sub-questions a, b, c, d.
          const indexedSub = q.subQuestions.map((sub, idx) => ({ ...sub, originalIdx: idx }));
          const shuffled = shuffleArray(indexedSub);
          return { ...q, shuffledSubQuestions: shuffled };
        }
        return q;
      });
      setSessionQuestions(prepared);
    }
  }, [isStarted, questions]);

  useEffect(() => {
    let timer: any;
    if (isStarted && !isSubmitted && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [isStarted, isSubmitted, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSubmit = () => {
    let totalScore = 0;
    let part1Score = 0;
    let part2Score = 0;
    let part3Score = 0;
    
    questions.forEach(q => {
      if (q.type === QuestionType.MULTIPLE_CHOICE) {
        if (answers[q.id] === q.correctAnswer) {
          part1Score += 0.25;
        }
      } else if (q.type === QuestionType.TRUE_FALSE) {
        q.subQuestions.forEach((sub, idx) => {
          if (answers[`${q.id}-${idx}`] === sub.correctAnswer) {
            part2Score += 0.25;
          }
        });
      } else if (q.type === QuestionType.SHORT_ANSWER) {
        if (answers[q.id]?.trim().toLowerCase() === q.correctAnswer.toLowerCase()) {
          part3Score += 0.5;
        }
      }
    });

    totalScore = part1Score + part2Score + part3Score;
    setScore(totalScore);
    setIsSubmitted(true);
    
    const record: ScoreRecord = {
      id: Math.random().toString(36).substr(2, 9),
      studentId: currentStudent!.id,
      studentName: currentStudent!.name,
      className: currentStudent!.className,
      grade: currentStudent!.grade,
      subject: currentStudent!.subject || "",
      schoolYear: currentStudent!.schoolYear || "",
      examType: currentStudent!.examType || "",
      score: totalScore,
      part1Score,
      part2Score,
      part3Score,
      timestamp: Date.now()
    };
    setScores(prev => [...prev, record]);

    // Sync score to Firebase
    setDoc(doc(db, "scores", record.id), record)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `scores/${record.id}`));
  };

  if (!isStarted) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-10 bg-white rounded-3xl shadow-2xl text-center border border-blue-50">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={40} className="text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Sẵn sàng thi chưa?</h2>
        <div className="text-left bg-gray-50 p-6 rounded-2xl mb-8 space-y-3">
          <p className="flex items-center gap-2 text-gray-700 font-medium"><CheckCircle2 className="text-green-500" size={18} /> Thời gian làm bài: 45 phút</p>
          <p className="flex items-center gap-2 text-gray-700 font-medium"><CheckCircle2 className="text-green-500" size={18} /> Phần 1: 16 câu trắc nghiệm (4 điểm)</p>
          <p className="flex items-center gap-2 text-gray-700 font-medium"><CheckCircle2 className="text-green-500" size={18} /> Phần 2: 4 câu Đúng/Sai (4 điểm)</p>
          <p className="flex items-center gap-2 text-gray-700 font-medium"><CheckCircle2 className="text-green-500" size={18} /> Phần 3: 4 câu trả lời ngắn (2 điểm)</p>
        </div>
        <button
          onClick={() => setIsStarted(true)}
          className="px-12 py-4 bg-blue-600 text-white rounded-full text-xl font-bold hover:bg-blue-700 transform hover:scale-105 transition-all shadow-xl active:scale-95 active:shadow-inner"
        >
          Bắt đầu thi
        </button>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-12 bg-white rounded-3xl shadow-2xl text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={56} className="text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Hoàn thành bài thi!</h2>
        <p className="text-gray-500 mb-8">Kết quả của bạn đã được lưu vào hệ thống.</p>
        <div className="text-6xl font-black text-blue-600 mb-8">{score.toFixed(2)} / 10</div>
        <button
          onClick={handleLogout}
          className="px-8 py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 active:scale-95 active:shadow-inner"
        >
          Đăng xuất
        </button>
      </div>
    );
  }

  const currentQ = sessionQuestions[currentQuestionIdx];
  if (!currentQ) return <div className="text-center p-20">Đang tải câu hỏi...</div>;

  const getPartTitle = (type: QuestionType) => {
    if (type === QuestionType.MULTIPLE_CHOICE) return "PHẦN 1: TRẮC NGHIỆM NHIỀU LỰA CHỌN";
    if (type === QuestionType.TRUE_FALSE) return "PHẦN 2: TRẮC NGHIỆM ĐÚNG/SAI";
    return "PHẦN 3: TRẢ LỜI NGẮN";
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pt-24 md:pt-8">
      <div className="fixed top-4 right-4 z-50 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-blue-100 flex flex-col items-end gap-2 min-w-[200px]">
        <div className={cn(
          "flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-lg font-bold",
          timeLeft < 300 ? "bg-red-100 text-red-600 animate-pulse" : "bg-blue-100 text-blue-600"
        )}>
          <Clock size={18} /> {formatTime(timeLeft)}
        </div>

        <div className="text-right">
          <p className="font-bold text-gray-800 leading-tight">{currentStudent?.name}</p>
          <p className="text-xs text-gray-500 font-medium">Lớp {currentStudent?.className}</p>
        </div>

        <div className="mt-1 w-full flex justify-end">
          {!showSubmitConfirm ? (
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 active:scale-95 transition-all text-sm shadow-md"
            >
              Nộp bài
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-green-50 p-1 rounded-lg border border-green-100">
              <span className="text-[10px] font-bold text-green-700 px-1">Nộp?</span>
              <button
                onClick={handleSubmit}
                className="bg-green-600 text-white px-3 py-1 rounded font-bold hover:bg-green-700 text-xs active:scale-95"
              >
                Có
              </button>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="bg-white text-gray-500 px-3 py-1 rounded font-bold border border-gray-200 text-xs active:scale-95"
              >
                Không
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Question Navigation */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-x-auto custom-scrollbar">
        <div className="flex gap-2 min-w-max md:min-w-0 md:flex-wrap md:justify-center pb-2 md:pb-0">
          {sessionQuestions.map((q, idx) => {
            const isAnswered = q.type === QuestionType.TRUE_FALSE 
              ? q.subQuestions.every((_: any, sIdx: number) => answers[`${q.id}-${sIdx}`] !== undefined)
              : answers[q.id] !== undefined && answers[q.id] !== "";
            
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIdx(idx)}
                className={cn(
                  "w-10 h-10 rounded-lg font-bold transition-all active:scale-90",
                  currentQuestionIdx === idx ? "bg-blue-600 text-white shadow-md" : 
                  isAnswered ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={currentQuestionIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-gray-100 min-h-[400px] flex flex-col"
        >
          <div className="mb-6">
            <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider">
              {getPartTitle(currentQ.type)}
            </span>
            <div className="text-xl md:text-2xl font-bold text-gray-800 mt-4 leading-tight flex gap-2">
              <span className="shrink-0">Câu {currentQuestionIdx + 1}:</span>
              <div dangerouslySetInnerHTML={{ __html: currentQ.content }} className="flex-grow" />
            </div>
            {currentQ.imageUrl && (
              <div className="mt-6 flex justify-center">
                <img 
                  src={currentQ.imageUrl} 
                  alt="Question illustration" 
                  className="rounded-xl shadow-md max-w-full h-auto object-contain border border-gray-100"
                  style={{ 
                    width: currentQ.imageWidth ? `${currentQ.imageWidth}px` : 'auto',
                    maxHeight: '350px'
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>

          <div className="flex-grow">
            {currentQ.type === QuestionType.MULTIPLE_CHOICE && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {currentQ.shuffledOptions.map((opt: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: opt.originalIdx }))}
                    className={cn(
                      "flex items-center gap-3 md:gap-4 text-left p-4 md:p-5 rounded-2xl border-2 transition-all active:scale-[0.98] group",
                      answers[currentQ.id] === opt.originalIdx 
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-inner" 
                        : "border-gray-100 hover:border-blue-200 hover:bg-gray-50"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      answers[currentQ.id] === opt.originalIdx 
                        ? "border-blue-600 bg-blue-600" 
                        : "border-gray-300 group-hover:border-blue-400"
                    )}>
                      {answers[currentQ.id] === opt.originalIdx && (
                        <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex-grow flex gap-2">
                      <span className="font-bold shrink-0 text-base md:text-lg">{String.fromCharCode(65 + i)}.</span>
                      <div dangerouslySetInnerHTML={{ __html: opt.text }} className="flex-grow overflow-hidden" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {currentQ.type === QuestionType.TRUE_FALSE && (
              <div className="space-y-3 md:space-y-4">
                {currentQ.shuffledSubQuestions.map((sub: any, sIdx: number) => (
                  <div key={sIdx} className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-5 bg-gray-50 rounded-2xl gap-3 md:gap-4 border border-gray-100">
                    <div className="text-gray-700 font-medium text-base md:text-lg flex gap-2">
                      <span className="shrink-0">{String.fromCharCode(97 + sIdx)}.</span>
                      <div dangerouslySetInnerHTML={{ __html: sub.text }} className="flex-grow" />
                    </div>
                    <div className="flex gap-2 md:gap-3 w-full md:w-auto">
                      <button
                        onClick={() => setAnswers(prev => ({ ...prev, [`${currentQ.id}-${sub.originalIdx}`]: true }))}
                        className={cn(
                          "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold border-2 transition-all active:scale-95 group text-sm md:text-base",
                          answers[`${currentQ.id}-${sub.originalIdx}`] === true 
                            ? "bg-green-600 text-white border-green-600 shadow-lg" 
                            : "bg-white border-gray-200 hover:border-green-400 text-gray-600"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          answers[`${currentQ.id}-${sub.originalIdx}`] === true 
                            ? "border-white bg-white" 
                            : "border-gray-300 group-hover:border-green-400"
                        )}>
                          {answers[`${currentQ.id}-${sub.originalIdx}`] === true && (
                            <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-green-600" />
                          )}
                        </div>
                        Đúng
                      </button>
                      <button
                        onClick={() => setAnswers(prev => ({ ...prev, [`${currentQ.id}-${sub.originalIdx}`]: false }))}
                        className={cn(
                          "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold border-2 transition-all active:scale-95 group text-sm md:text-base",
                          answers[`${currentQ.id}-${sub.originalIdx}`] === false 
                            ? "bg-red-600 text-white border-red-600 shadow-lg" 
                            : "bg-white border-gray-200 hover:border-red-400 text-gray-600"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          answers[`${currentQ.id}-${sub.originalIdx}`] === false 
                            ? "border-white bg-white" 
                            : "border-gray-300 group-hover:border-red-400"
                        )}>
                          {answers[`${currentQ.id}-${sub.originalIdx}`] === false && (
                            <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-red-600" />
                          )}
                        </div>
                        Sai
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentQ.type === QuestionType.SHORT_ANSWER && (
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Nhập câu trả lời của bạn..."
                  className="w-full p-4 md:p-5 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-lg md:text-xl"
                  value={answers[currentQ.id] || ""}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                />
                <p className="text-xs md:text-sm text-gray-400 mt-4 italic">* Lưu ý: Nhập chính xác kết quả, không phân biệt hoa thường.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-8 md:mt-12 pt-6 md:pt-8 border-t border-gray-100 gap-2">
            <button
              disabled={currentQuestionIdx === 0}
              onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
              className="flex items-center justify-center gap-1 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-all text-sm md:text-base"
            >
              Câu trước
            </button>
            
            {currentQuestionIdx < sessionQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                className="flex items-center justify-center gap-1 md:gap-2 bg-blue-600 text-white px-4 md:px-8 py-2.5 md:py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg active:scale-95 transition-all text-sm md:text-base"
              >
                Câu tiếp theo
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="bg-green-600 text-white px-4 md:px-8 py-2.5 md:py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg active:scale-95 transition-all text-sm md:text-base"
              >
                Nộp bài
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  // Persistence & Auth State
  const [isInitialized, setIsInitialized] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [examSettings, setExamSettings] = useState<ExamSettings[]>(INITIAL_EXAM_SETTINGS);
  const [adminPassword, setAdminPassword] = useState("vannam123");

  // Navigation State
  const [view, setView] = useState<"home" | "student_login" | "admin_login" | "admin_dashboard" | "exam" | "change_password" | "admin_change_password">("home");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

  // Admin Dashboard State
  const [adminActiveTab, setAdminActiveTab] = useState<"students" | "questions" | "scores" | "settings">("students");
  const [adminGrade, setAdminGrade] = useState(6);
  const [adminClass, setAdminClass] = useState("6A1");
  const [adminSchoolYear, setAdminSchoolYear] = useState(SCHOOL_YEARS[0]);
  const [adminExamType, setAdminExamType] = useState(EXAM_TYPES[0]);
  const [adminSubject, setAdminSubject] = useState(SUBJECTS[0]);
  const [importStatus, setImportStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Exam State
  const [examStartTime, setExamStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Unsaved Changes State
  const [hasUnsavedStudents, setHasUnsavedStudents] = useState(false);
  const [hasUnsavedQuestions, setHasUnsavedQuestions] = useState(false);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);

  // Debounced Question Auto-save
  useEffect(() => {
    if (editingQuestionId && isAdmin && questions.some(q => q.id === editingQuestionId)) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      
      debounceTimerRef.current = setTimeout(() => {
        const q = questions.find(item => item.id === editingQuestionId);
        if (q) {
          setIsSyncing(true);
          setDoc(doc(db, "questions", q.id), q)
            .then(() => {
              setIsSyncing(false);
              setHasUnsavedQuestions(false);
            })
            .catch(err => {
              console.error("Auto-sync question failed:", err);
              setIsSyncing(false);
            });
        }
      }, 2000); // 2 second debounce
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [questions, editingQuestionId, isAdmin]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Listeners (Firebase)
  useEffect(() => {
    if (!isInitialized) return;

    const unsubStudents = onSnapshot(collection(db, "students"), (snapshot) => {
      // Only update from Firestore if we don't have local unsaved changes
      if (hasUnsavedStudents) return;
      
      const data = snapshot.docs.map(doc => doc.data() as Student);
      console.log(`Fetched ${data.length} students from Firestore`);
      if (data.length > 0) {
        setStudents(data);
      } else if (isInitialized) {
        // If Firestore is empty but we are initialized, it means there really are no students in the cloud
        setStudents([]);
      }
    }, (err) => console.error("Firestore Students Error:", err));

    const unsubQuestions = onSnapshot(collection(db, "questions"), (snapshot) => {
      // Only update from Firestore if we don't have local unsaved changes
      if (hasUnsavedQuestions) return;
      
      const firestoreQuestions = snapshot.docs.map(doc => doc.data() as Question);
      if (firestoreQuestions.length > 0) {
        setQuestions(prev => {
          // Merge strategy: incoming firestore data overwrites local data for those IDs
          // but we keep local questions that are not in Firestore if we just added them
          const newQuestions = [...prev];
          firestoreQuestions.forEach(fq => {
            const idx = newQuestions.findIndex(q => q.id === fq.id);
            if (idx >= 0) {
              newQuestions[idx] = fq;
            } else {
              newQuestions.push(fq);
            }
          });
          return newQuestions;
        });
      } else if (isInitialized) {
        // Only clear if we are sure there are no questions at all
        // setQuestions([]); // Risky if students are loading - better to keep what we have
      }
    }, (err) => console.error("Firestore Questions Error:", err));

    const unsubScores = onSnapshot(collection(db, "scores"), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as ScoreRecord);
      setScores(data);
    }, (err) => console.error("Firestore Scores Error:", err));

    const unsubSettings = onSnapshot(collection(db, "settings"), (snapshot) => {
      // Only update from Firestore if we don't have local unsaved changes
      if (hasUnsavedSettings) return;
      
      const firestoreSettings = snapshot.docs.map(doc => doc.data() as ExamSettings);
      if (firestoreSettings.length > 0) {
        setExamSettings(prev => {
          const merged = [...prev];
          firestoreSettings.forEach(fs => {
            const idx = merged.findIndex(s => 
              s.grade === fs.grade && 
              s.className === fs.className && 
              s.schoolYear === fs.schoolYear && 
              s.examType === fs.examType && 
              s.subject === fs.subject
            );
            if (idx >= 0) {
              merged[idx] = fs;
            } else {
              merged.push(fs);
            }
          });
          return merged;
        });
      }
    }, (err) => console.error("Firestore Settings Error:", err));

    const unsubAdmin = onSnapshot(doc(db, "admin", "config"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.password) setAdminPassword(data.password);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, "admin/config"));

    return () => {
      unsubStudents();
      unsubQuestions();
      unsubScores();
      unsubSettings();
      unsubAdmin();
    };
  }, [isInitialized, hasUnsavedStudents, hasUnsavedQuestions, hasUnsavedSettings]);

  // Load data from localforage on mount (Migration/Initial Load)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to migrate from localStorage first if it exists
        const oldStudents = localStorage.getItem("thcs_students");
        const oldQuestions = localStorage.getItem("thcs_questions");
        const oldScores = localStorage.getItem("thcs_scores");
        const oldSettings = localStorage.getItem("thcs_settings");
        const oldPass = localStorage.getItem("thcs_admin_password");

        const savedStudents = await localforage.getItem<Student[]>("students") || (oldStudents ? JSON.parse(oldStudents) : null);
        const savedQuestions = await localforage.getItem<Question[]>("questions") || (oldQuestions ? JSON.parse(oldQuestions) : null);
        const savedScores = await localforage.getItem<ScoreRecord[]>("scores") || (oldScores ? JSON.parse(oldScores) : null);
        const savedSettings = await localforage.getItem<ExamSettings[]>("settings") || (oldSettings ? JSON.parse(oldSettings) : null);
        const savedPass = await localforage.getItem<string>("admin_password") || oldPass;

        if (savedStudents) setStudents(savedStudents);
        if (savedQuestions) setQuestions(savedQuestions);
        if (savedScores) setScores(savedScores);
        if (savedSettings) {
          // Merge with initial settings to ensure all fields exist
          const mergedSettings = INITIAL_EXAM_SETTINGS.map(initial => {
            const existing = (savedSettings as any[]).find((p: any) => 
              p.grade === initial.grade && 
              p.subject === initial.subject && 
              p.schoolYear === initial.schoolYear && 
              p.examType === initial.examType
            );
            return existing ? { ...initial, ...existing } : initial;
          });
          setExamSettings(mergedSettings);
        }
        if (savedPass) setAdminPassword(savedPass);

        const sessionIsAdmin = sessionStorage.getItem("isAdmin") === "true";
        if (sessionIsAdmin) setIsAdmin(true);

        // After successful load/migration, clear localStorage to prevent future errors
        if (oldStudents || oldQuestions || oldScores || oldSettings || oldPass) {
          localStorage.removeItem("thcs_students");
          localStorage.removeItem("thcs_questions");
          localStorage.removeItem("thcs_scores");
          localStorage.removeItem("thcs_settings");
          localStorage.removeItem("thcs_admin_password");
        }
      } catch (e) {
        console.error("Failed to load from storage:", e);
      } finally {
        setIsInitialized(true);
      }
    };
    loadData();
  }, []);

  // Sync state changes to Firebase (Debounced or targeted would be better, but keeping it simple for now)
  const syncToFirebase = async (collectionName: string, data: any[]) => {
    if (!isAdmin) return;
    try {
      const batch = writeBatch(db);
      data.forEach(item => {
        const docRef = doc(db, collectionName, item.id || `${item.grade}_${item.subject}_${item.schoolYear}_${item.examType}`);
        batch.set(docRef, item);
      });
      await batch.commit();
    } catch (e) {
      console.error(`Failed to sync ${collectionName} to Firebase:`, e);
    }
  };

  // Save data to localforage & Firebase (Admin only)
  useEffect(() => {
    if (!isInitialized) return;
    
    const saveData = async () => {
      try {
        await localforage.setItem("students", students);
        await localforage.setItem("questions", questions);
        await localforage.setItem("scores", scores);
        await localforage.setItem("settings", examSettings);
        await localforage.setItem("admin_password", adminPassword);

        // NOTE: We do NOT automatically sync to Firebase here anymore to avoid 
        // hitting Firestore write quotas with every local change.
        // Syncing is now manual via "Save" buttons in the Admin Dashboard.
      } catch (e) {
        console.error("Failed to save data:", e);
      }
    };
    saveData();
  }, [students, questions, scores, examSettings, adminPassword, isInitialized, isAdmin]);

  const filteredQuestions = useMemo(() => {
    if (!currentStudent) return [];
    return questions.filter(q => 
      q.grade === currentStudent.grade && 
      q.schoolYear === currentStudent.schoolYear && 
      q.examType === currentStudent.examType &&
      q.subject === currentStudent.subject
    );
  }, [questions, currentStudent]);

  const adminFilteredQuestions = useMemo(() => {
    return questions.filter(q => 
      q.grade === adminGrade && 
      q.schoolYear === adminSchoolYear && 
      q.examType === adminExamType &&
      q.subject === adminSubject
    );
  }, [questions, adminGrade, adminSchoolYear, adminExamType, adminSubject]);

  // --- Handlers ---

  const handleStudentLogin = (student: Student, pass: string, schoolYear: string, examType: string, subject: string) => {
    if (pass === student.password) {
      // Check if student has already taken this exam
      const existingScore = scores.find(s => 
        s.studentId === student.id && 
        s.schoolYear === schoolYear && 
        s.examType === examType && 
        s.subject === subject
      );

      if (existingScore) {
        if (examType === "Kiểm tra thường xuyên") {
          setLoginError("Bạn đã làm bài thi này rồi! Vui lòng liên hệ giáo viên để xoá điểm nếu muốn thi lại.");
          return;
        } else {
          // For other exams, check if password was reset (hasChangedPassword is false)
          if (student.hasChangedPassword) {
            setLoginError("Bạn đã làm bài thi này rồi! Vui lòng liên hệ giáo viên để reset mật khẩu nếu muốn thi lại.");
            return;
          }
        }
      }

      // Check exam settings for this grade, class, schoolYear, examType, and subject
      const settings = examSettings.find(s => 
        s.grade === student.grade && 
        s.className === student.className &&
        s.schoolYear === schoolYear && 
        s.examType === examType &&
        s.subject === subject
      ) || examSettings.find(s => // Fallback to grade-wide settings if no class-specific settings
        s.grade === student.grade && 
        (s.className === null || s.className === undefined) &&
        s.schoolYear === schoolYear && 
        s.examType === examType &&
        s.subject === subject
      );
      const now = new Date();
      // Use local date YYYY-MM-DD
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      let isAllowed = false;
      if (settings && settings.isActive) {
        if (examType === "Kiểm tra thường xuyên") {
          const startDate = settings.startDate ? new Date(settings.startDate) : null;
          const endDate = settings.endDate ? new Date(settings.endDate) : null;
          
          // Reset hours for date comparison
          const todayDate = new Date(today);
          
          if (startDate && endDate) {
            if (todayDate >= startDate && todayDate <= endDate) {
              isAllowed = true;
            }
          }
        } else if (settings.date === today) {
          const [startH, startM] = (settings.startTime || "00:00").split(':').map(Number);
          const [endH, endM] = (settings.endTime || "23:59").split(':').map(Number);
          const startTimeVal = startH * 60 + startM;
          const endTimeVal = endH * 60 + endM;
          
          if (currentTime >= startTimeVal && currentTime <= endTimeVal) {
            isAllowed = true;
          }
        }
      }

      if (!isAllowed) {
        setLoginError(`Trường THCS Tiến Hưng thông báo: Hiện chưa đến giờ thi ${subject} - ${examType} năm học ${schoolYear}, vui lòng đợi!`);
        return;
      }

      setCurrentStudent({ ...student, schoolYear, examType, subject });
      setLoginError("");
      setTimeLeft(45 * 60);
      setAnswers({});
      if (!student.hasChangedPassword && pass === "123") {
        setView("change_password");
      } else {
        setView("exam");
      }
    } else {
      setLoginError("Mật khẩu không chính xác!");
    }
  };

  const handleAdminLogin = async (user: string, pass: string) => {
    if (user === "admin" && pass === adminPassword) {
      setIsAdmin(true);
      setView("admin_dashboard");
      setLoginError("");
      sessionStorage.setItem("isAdmin", "true");
      // Optional: try to login anonymously in the background, but don't block
      loginAnonymously().catch(e => console.warn("Anonymous login failed, but continuing as admin is true in rules:", e));
    } else {
      setLoginError("Tên đăng nhập hoặc mật khẩu không chính xác!");
    }
  };

  const handleLogout = () => {
    setCurrentStudent(null);
    setIsAdmin(false);
    setView("home");
    setSelectedGrade(null);
    setSelectedClass(null);
    setTimeLeft(45 * 60);
    setAnswers({});
    sessionStorage.removeItem("isAdmin");
    logout();
  };

  // --- Views ---

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-gray-900">
      {view !== "exam" && <Header />}
      
      <main className="flex-grow">
        {view === "home" && (
          <HomeView 
            selectedGrade={selectedGrade}
            setSelectedGrade={setSelectedGrade}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            setSelectedClass={setSelectedClass}
            setView={setView}
          />
        )}
        {view === "student_login" && (
          <StudentLoginView 
            students={students}
            selectedClass={selectedClass}
            selectedSubject={selectedSubject}
            handleStudentLogin={handleStudentLogin}
            setView={setView}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loginError={loginError}
            setLoginError={setLoginError}
          />
        )}
        {view === "admin_login" && (
          <AdminLoginView 
            handleAdminLogin={handleAdminLogin}
            setView={setView}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loginError={loginError}
            setLoginError={setLoginError}
          />
        )}
        {view === "change_password" && (
          <ChangePasswordView 
            currentStudent={currentStudent}
            setStudents={setStudents}
            setView={setView}
          />
        )}
        {view === "admin_change_password" && (
          <AdminChangePasswordView 
            setAdminPassword={setAdminPassword}
            setView={setView}
          />
        )}
        {view === "exam" && (
          <ExamView 
            questions={filteredQuestions}
            currentStudent={currentStudent}
            timeLeft={timeLeft}
            setTimeLeft={setTimeLeft}
            answers={answers}
            setAnswers={setAnswers}
            setScores={setScores}
            handleLogout={handleLogout}
          />
        )}
        {view === "admin_dashboard" && (
          <AdminDashboard 
            adminActiveTab={adminActiveTab}
            setAdminActiveTab={setAdminActiveTab}
            adminGrade={adminGrade}
            setAdminGrade={setAdminGrade}
            adminClass={adminClass}
            setAdminClass={setAdminClass}
            adminSchoolYear={adminSchoolYear}
            setAdminSchoolYear={setAdminSchoolYear}
            adminExamType={adminExamType}
            setAdminExamType={setAdminExamType}
            adminSubject={adminSubject}
            setAdminSubject={setAdminSubject}
            importStatus={importStatus}
            setImportStatus={setImportStatus}
            students={students}
            setStudents={setStudents}
            questions={questions}
            setQuestions={setQuestions}
            scores={scores}
            setScores={setScores}
            examSettings={examSettings}
            setExamSettings={setExamSettings}
            handleLogout={handleLogout}
            isAdmin={isAdmin}
            setView={setView}
            hasUnsavedStudents={hasUnsavedStudents}
            setHasUnsavedStudents={setHasUnsavedStudents}
            hasUnsavedQuestions={hasUnsavedQuestions}
            setHasUnsavedQuestions={setHasUnsavedQuestions}
            hasUnsavedSettings={hasUnsavedSettings}
            setHasUnsavedSettings={setHasUnsavedSettings}
            isSyncing={isSyncing}
            setIsSyncing={setIsSyncing}
            editingQuestionId={editingQuestionId}
            setEditingQuestionId={setEditingQuestionId}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
