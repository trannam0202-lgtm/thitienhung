import { Question, QuestionLevel, QuestionType, Student, ExamSettings } from "./types";

export const SCHOOL_YEARS = [
  "2025 - 2026", "2026 - 2027", "2027 - 2028", "2028 - 2029",
  "2029 - 2030", "2030 - 2031", "2031 - 2032", "2032 - 2033",
  "2033 - 2034", "2034 - 2035", "2035 - 2036", "2036 - 2037",
  "2037 - 2038", "2038 - 2039", "2039 - 2040", "2040 - 2041",
  "2041 - 2042"
];

export const EXAM_TYPES = [
  "Giữa kỳ 1", "Cuối kỳ 1", "Giữa kỳ 2", "Cuối kỳ 2", "Kiểm tra thường xuyên"
];

export const SUBJECTS = ["Đề thi số 1", "Đề thi số 2"];

export const INITIAL_STUDENTS: Student[] = [
  { id: "1", name: "Nguyễn Văn A", grade: 6, className: "6A1", password: "123", hasChangedPassword: false, schoolYear: SCHOOL_YEARS[0], subject: SUBJECTS[0] },
  { id: "2", name: "Trần Thị B", grade: 6, className: "6A1", password: "123", hasChangedPassword: false, schoolYear: SCHOOL_YEARS[0], subject: SUBJECTS[0] },
  { id: "3", name: "Lê Văn C", grade: 7, className: "7A1", password: "123", hasChangedPassword: false, schoolYear: SCHOOL_YEARS[0], subject: SUBJECTS[0] },
];

export const INITIAL_QUESTIONS: Question[] = SUBJECTS.flatMap(subject => 
  [6, 7, 8, 9].flatMap(grade => 
    SCHOOL_YEARS.slice(0, 17).flatMap(schoolYear =>
      EXAM_TYPES.flatMap(examType => {
      const questions: Question[] = [];
        
        // Topics based on Subject, Grade, and Exam Type
        const getTopic = (s: string, g: number, et: string) => {
          if (s === "Đề thi số 2") {
            if (g === 6) {
              if (et.includes("1")) return "Máy tính và cộng đồng, Mạng máy tính";
              return "Internet, Soạn thảo văn bản, Trình chiếu";
            }
            if (g === 7) {
              if (et.includes("1")) return "Thiết bị vào ra, Phần mềm máy tính";
              return "Bảng tính điện tử, Trình chiếu";
            }
            if (g === 8) {
              if (et.includes("1")) return "Lịch sử máy tính, Dữ liệu trong máy tính";
              return "Sử dụng bảng tính, Lập trình trực quan";
            }
            if (g === 9) {
              if (et.includes("1")) return "Mạng máy tính và Internet, Tổ chức lưu trữ";
              return "Trình chiếu nâng cao, Đa phương tiện";
            }
          } else { // Đề thi số 1 (Toán học)
            if (g === 6) {
              if (et.includes("1")) return "Số tự nhiên, Số nguyên";
              return "Phân số, Số thập phân, Hình học trực quan";
            }
            if (g === 7) {
              if (et.includes("1")) return "Số hữu tỉ, Số thực";
              return "Góc và đường thẳng song song, Tam giác";
            }
            if (g === 8) {
              if (et.includes("1")) return "Đa thức, Phân thức đại số";
              return "Hàm số và đồ thị, Hình khối trong thực tiễn";
            }
            if (g === 9) {
              if (et.includes("1")) return "Phương trình và hệ phương trình";
              return "Hàm số bậc hai, Hình học không gian";
            }
          }
          return "Kiến thức tổng hợp";
        };

        const topic = getTopic(subject, grade, examType);

        const getSampleMC = (s: string, g: number, et: string, i: number) => {
          if (s === "Đề thi số 2") {
            if (g === 6) {
              const qs = [
                "Thiết bị nào sau đây là bộ não của máy tính?",
                "Đâu là một ví dụ về mạng máy tính?",
                "Internet là gì?",
                "Phần mềm nào dùng để soạn thảo văn bản?",
                "Để trình chiếu, ta sử dụng phần mềm nào?",
                "Thông tin trong máy tính được biểu diễn dưới dạng?",
                "Một byte bằng bao nhiêu bit?",
                "Thiết bị nào dùng để nhập dữ liệu vào máy tính?"
              ];
              return qs[(i - 1) % qs.length] || `Câu hỏi Tin 6 số ${i}`;
            }
            if (g === 7) {
              const qs = [
                "Thiết bị nào sau đây là thiết bị vào?",
                "Đâu là phần mềm hệ điều hành?",
                "Trong Excel, hàm nào dùng để tính tổng?",
                "Phím tắt để lưu văn bản là gì?",
                "Thiết bị nào dùng để xuất âm thanh?",
                "Đơn vị đo dung lượng bộ nhớ nhỏ nhất là gì?",
                "Địa chỉ ô B3 nằm ở cột nào?",
                "Ký hiệu phép nhân trong Excel là gì?"
              ];
              return qs[(i - 1) % qs.length] || `Câu hỏi Tin 7 số ${i}`;
            }
            if (g === 8) {
              const qs = [
                "Máy tính thế hệ thứ nhất dùng linh kiện gì?",
                "Trong Scratch, khối lệnh nào dùng để lặp lại?",
                "1 Byte bằng bao nhiêu Bit?",
                "Ngôn ngữ lập trình trực quan phổ biến cho học sinh là?",
                "Linh kiện máy tính hiện đại dùng công nghệ gì?",
                "Biến trong lập trình dùng để làm gì?",
                "Câu lệnh 'if' dùng để làm gì?",
                "Thế hệ máy tính hiện nay là thế hệ thứ mấy?"
              ];
              return qs[(i - 1) % qs.length] || `Câu hỏi Tin 8 số ${i}`;
            }
            if (g === 9) {
              const qs = [
                "Mạng máy tính trong một tòa nhà gọi là gì?",
                "WWW là viết tắt của từ gì?",
                "Phần mềm nào dùng để trình chiếu?",
                "Đâu là một trình duyệt web?",
                "Dịch vụ lưu trữ đám mây phổ biến là?",
                "Hiệu ứng chuyển trang trong PowerPoint gọi là?",
                "Tệp trình chiếu có phần mở rộng là gì?",
                "Internet ra đời vào khoảng thời gian nào?"
              ];
              return qs[(i - 1) % qs.length] || `Câu hỏi Tin 9 số ${i}`;
            }
          } else { // Toán học
            if (g === 6) {
              const qs = [
                "Số tự nhiên nhỏ nhất là số nào?",
                "Tập hợp các số nguyên bao gồm?",
                "Kết quả của phép tính 1/2 + 1/4 là?",
                "Số thập phân 0.5 viết dưới dạng phân số là?",
                "Hình nào sau đây là hình tam giác đều?",
                "Ước chung lớn nhất của 12 và 18 là?",
                "Số đối của số -5 là?",
                "Chu vi hình vuông cạnh 4cm là?"
              ];
              return qs[(i - 1) % qs.length] || `Câu hỏi Toán 6 số ${i}`;
            }
            if (g === 7) {
              const qs = [
                "Số hữu tỉ là số viết được dưới dạng?",
                "Kết quả của 1/2 + 1/3 là?",
                "Hai góc kề bù có tổng số đo bằng?",
                "Số thực bao gồm số hữu tỉ và số?",
                "Tam giác có ba cạnh bằng nhau gọi là?",
                "Giá trị tuyệt đối của -5 là?",
                "Đường thẳng song song là hai đường thẳng?",
                "Tổng ba góc trong một tam giác bằng?"
              ];
              return qs[(i - 1) % qs.length] || `Câu hỏi Toán 7 số ${i}`;
            }
            if (g === 8) {
              const qs = [
                "Khai triển (x+y)^2 ta được?",
                "Hình chóp tam giác đều có mặt bên là hình gì?",
                "Đơn thức là biểu thức đại số gồm?",
                "Tứ giác có 4 cạnh bằng nhau là hình gì?",
                "Hằng đẳng thức đáng nhớ có bao nhiêu cái cơ bản?",
                "Đồ thị hàm số y = ax (a khác 0) là?",
                "Phân thức đại số có dạng?",
                "Diện tích hình vuông cạnh a là?"
              ];
              return qs[(i - 1) % qs.length] || `Câu hỏi Toán 8 số ${i}`;
            }
            if (g === 9) {
              const qs = [
                "Nghiệm của hệ phương trình x+y=3, x-y=1 là?",
                "Hình trụ có bao nhiêu mặt đáy?",
                "Căn bậc hai của 16 là?",
                "Hàm số y = ax^2 (a > 0) đồng biến khi?",
                "Đường tròn ngoại tiếp tam giác là?",
                "Thể tích hình cầu bán kính R là?",
                "Phương trình bậc nhất hai ẩn có dạng?",
                "Sin của góc 30 độ bằng?"
              ];
              return qs[(i - 1) % qs.length] || `Câu hỏi Toán 9 số ${i}`;
            }
          }
          return `[${subject} ${grade} - ${examType}] Câu hỏi ${i}: Về ${topic}...`;
        };

        // Part 1: 16 Multiple Choice
        for (let i = 1; i <= 16; i++) {
          questions.push({
            id: `mc-${subject}-${grade}-${schoolYear.replace(/\s/g, '')}-${examType}-${i}`,
            grade,
            subject,
            type: QuestionType.MULTIPLE_CHOICE,
            level: i <= 8 ? QuestionLevel.NB : i <= 14 ? QuestionLevel.TH : QuestionLevel.VD,
            content: getSampleMC(subject, grade, examType, i),
            options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
            correctAnswer: i % 4,
            schoolYear,
            examType
          });
        }

        const getSampleTF = (s: string, g: number, et: string, i: number) => {
          if (s === "Đề thi số 2") {
            if (g === 6) return [
              { text: "Bàn phím là thiết bị vào", correctAnswer: true },
              { text: "Màn hình là thiết bị vào", correctAnswer: false },
              { text: "CPU là thiết bị ra", correctAnswer: false },
              { text: "Máy in là thiết bị ra", correctAnswer: true }
            ];
            if (g === 7) return [
              { text: "Chuột là thiết bị vào", correctAnswer: true },
              { text: "Màn hình là thiết bị vào", correctAnswer: false },
              { text: "Loa là thiết bị ra", correctAnswer: true },
              { text: "Bàn phím là thiết bị ra", correctAnswer: false }
            ];
            if (g === 8) return [
              { text: "1 Byte = 8 Bit", correctAnswer: true },
              { text: "CPU là bộ não của máy tính", correctAnswer: true },
              { text: "RAM là bộ nhớ ngoài", correctAnswer: false },
              { text: "Ổ cứng là bộ nhớ trong", correctAnswer: false }
            ];
            if (g === 9) return [
              { text: "Internet là mạng toàn cầu", correctAnswer: true },
              { text: "LAN là mạng diện rộng", correctAnswer: false },
              { text: "Chrome là trình duyệt web", correctAnswer: true },
              { text: "Facebook là hệ điều hành", correctAnswer: false }
            ];
          } else {
            if (g === 6) return [
              { text: "Số 0 là số tự nhiên", correctAnswer: true },
              { text: "Số -1 là số tự nhiên", correctAnswer: false },
              { text: "1/2 là một phân số", correctAnswer: true },
              { text: "Hình vuông có 4 cạnh bằng nhau", correctAnswer: true }
            ];
            if (g === 7) return [
              { text: "Tổng 3 góc tam giác là 180 độ", correctAnswer: true },
              { text: "Số 0 là số hữu tỉ dương", correctAnswer: false },
              { text: "Số thực bao gồm số hữu tỉ và vô tỉ", correctAnswer: true },
              { text: "Tam giác cân có 3 cạnh bằng nhau", correctAnswer: false }
            ];
            if (g === 8) return [
              { text: "(a+b)^2 = a^2 + 2ab + b^2", correctAnswer: true },
              { text: "Hình thoi là hình vuông", correctAnswer: false },
              { text: "Tứ giác có 4 góc vuông là hình chữ nhật", correctAnswer: true },
              { text: "Đơn thức không chứa phép cộng", correctAnswer: true }
            ];
            if (g === 9) return [
              { text: "Căn bậc hai của 9 là 3", correctAnswer: true },
              { text: "Phương trình x^2=4 có 1 nghiệm", correctAnswer: false },
              { text: "Hình cầu có mặt cắt là hình tròn", correctAnswer: true },
              { text: "Sin 90 độ bằng 0", correctAnswer: false }
            ];
          }
          return [
            { text: "Ý a: Nội dung khẳng định đúng", correctAnswer: true },
            { text: "Ý b: Nội dung khẳng định sai", correctAnswer: false },
            { text: "Ý c: Nội dung khẳng định đúng", correctAnswer: true },
            { text: "Ý d: Nội dung khẳng định sai", correctAnswer: false }
          ];
        };

        const getSampleSA = (s: string, g: number, et: string, i: number) => {
          if (s === "Đề thi số 2") {
            if (g === 6) return "CPU";
            if (g === 7) return "SUM";
            if (g === 8) return "8";
            if (g === 9) return "LAN";
          } else {
            if (g === 6) return "0";
            if (g === 7) return "180";
            if (g === 8) return "4";
            if (g === 9) return "2";
          }
          return "Đáp án";
        };

        // Part 2: 4 True/False
        for (let i = 1; i <= 4; i++) {
          questions.push({
            id: `tf-${subject}-${grade}-${schoolYear.replace(/\s/g, '')}-${examType}-${i}`,
            grade,
            subject,
            type: QuestionType.TRUE_FALSE,
            level: i <= 2 ? QuestionLevel.NB : QuestionLevel.TH,
            content: `[${subject} ${grade} - ${examType}] Câu hỏi đúng sai ${i}: Xác định tính đúng sai của các khẳng định sau:`,
            subQuestions: getSampleTF(subject, grade, examType, i),
            schoolYear,
            examType
          });
        }

        // Part 3: 4 Short Answer
        for (let i = 1; i <= 4; i++) {
          questions.push({
            id: `sa-${subject}-${grade}-${schoolYear.replace(/\s/g, '')}-${examType}-${i}`,
            grade,
            subject,
            type: QuestionType.SHORT_ANSWER,
            level: QuestionLevel.VD,
            content: `[${subject} ${grade} - ${examType}] Câu hỏi trả lời ngắn ${i}: Nhập kết quả hoặc từ khóa đúng nhất.`,
            correctAnswer: getSampleSA(subject, grade, examType, i),
            schoolYear,
            examType
          });
        }

        return questions;
      })
    )
  )
);

export const GRADES = [6, 7, 8, 9];
export const CLASSES_PER_GRADE = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"];

export const INITIAL_EXAM_SETTINGS: ExamSettings[] = SUBJECTS.flatMap(subject =>
  GRADES.flatMap(grade => 
    SCHOOL_YEARS.slice(0, 17).flatMap(schoolYear =>
      EXAM_TYPES.slice(0, 5).map(examType => ({
        grade,
        className: null,
        subject,
        schoolYear,
        examType,
        date: new Date().toISOString().split('T')[0],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startTime: "07:00",
        endTime: "17:00",
        isActive: true,
      }))
    )
  )
);
