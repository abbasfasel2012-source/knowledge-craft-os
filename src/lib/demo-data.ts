export interface DemoCategory {
  id: string;
  name: string;
  slug: string;
}

export interface DemoLesson {
  id: string;
  course_id: string;
  title: string;
  summary: string;
  duration_minutes: number;
  position: number;
  type: "video" | "audio" | "article" | "quiz";
  video_url?: string;
  audio_url?: string;
  pdf_url?: string;
  attachment_url?: string;
  is_preview?: boolean;
}

export interface DemoQuizQuestion {
  id: string;
  question_text: string;
  options: { id: string; text: string; is_correct: boolean }[];
}

export interface DemoQuiz {
  id: string;
  course_id: string;
  title: string;
  description: string;
  pass_score: number;
  time_limit_minutes: number;
  max_attempts: number;
  questions: DemoQuizQuestion[];
}

export interface DemoCourse {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  category_id: string;
  level: "beginner" | "intermediate" | "advanced";
  duration_minutes: number;
  is_free: boolean;
  price: number;
  status: "published";
  cover_url: string;
  brochure_url?: string;
  students_count: number;
  lessons: DemoLesson[];
  quizzes: DemoQuiz[];
}

export const DEMO_CATEGORIES: DemoCategory[] = [
  { id: "cat-1", name: "البرمجة والتقنية", slug: "tech" },
  { id: "cat-2", name: "الذكاء الاصطناعي", slug: "ai" },
  { id: "cat-3", name: "التصميم وتجربة المستخدم", slug: "design" },
  { id: "cat-4", name: "ريادة الأعمال والإدارة", slug: "business" },
];

export const DEMO_COURSES: DemoCourse[] = [
  {
    id: "course-1",
    title: "مقدمة شاملة في الذكاء الاصطناعي التوليدي وهندسة الأوامر",
    slug: "generative-ai-prompt-engineering",
    summary:
      "تعلم أحدث تقنيات الذكاء الاصطناعي التوليدي وكيفية كتابة أوامر فعالة ونماذج اللغة الكبيرة.",
    description:
      "دورة تدريبية عملية متكاملة تأخذك من الصفر في عالم الذكاء الاصطناعي التوليدي. ستتعلم هيكلية النماذج اللغوية، مبادئ هندسة التلقين، وتقنيات استخدام النماذج في حل مشكلات واقعية.",
    category_id: "cat-2",
    level: "beginner",
    duration_minutes: 120,
    is_free: true,
    price: 0,
    status: "published",
    cover_url:
      "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=80",
    brochure_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    students_count: 432,
    lessons: [
      {
        id: "les-101",
        course_id: "course-1",
        title: "المدخل إلى نماذج الذكاء الاصطناعي التوليدي",
        summary: "فهم المفاهيم الأساسية لنماذج اللغة وتطور الذكاء الاصطناعي التوليدي.",
        duration_minutes: 25,
        position: 1,
        type: "video",
        video_url:
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        pdf_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        is_preview: true,
      },
      {
        id: "les-102",
        course_id: "course-1",
        title: "أساسيات هندسة الأوامر (Prompt Engineering)",
        summary: "كيف تصيغ أوامر واضحة ودقيقة للحصول على أفضل المخرجات من النماذج.",
        duration_minutes: 35,
        position: 2,
        type: "video",
        video_url:
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        attachment_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        is_preview: true,
      },
      {
        id: "les-103",
        course_id: "course-1",
        title: "تطبيقات متقدمة وسيناريوهات عملية",
        summary: "بناء تطبيقات ذكية وأتمتة المهام اليومية باستخدام واجهات الذكاء الاصطناعي.",
        duration_minutes: 60,
        position: 3,
        type: "video",
        video_url:
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        pdf_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    quizzes: [
      {
        id: "quiz-1",
        course_id: "course-1",
        title: "اختبار مهارات الذكاء الاصطناعي التوليدي",
        description: "اختبر استيعابك للمفاهيم الأساسية وهندسة الأوامر للحصول على الشهادة.",
        pass_score: 70,
        time_limit_minutes: 15,
        max_attempts: 3,
        questions: [
          {
            id: "q-101",
            question_text: "ما هو الهدف الأساسي من هندسة الأوامر (Prompt Engineering)؟",
            options: [
              {
                id: "o-1",
                text: "توجيه النموذج للحصول على مخرجات دقيقة وملائمة للغرض",
                is_correct: true,
              },
              { id: "o-2", text: "كتابة شيفرات برمجية لتجميع النواة", is_correct: false },
              { id: "o-3", text: "تسريع سرعة معالج الرسوميات فقط", is_correct: false },
            ],
          },
          {
            id: "q-102",
            question_text: "أي من هذه التقنيات تساعد في تقليل هلوسة النماذج اللغوية؟",
            options: [
              {
                id: "o-4",
                text: "التوليد المعزز بالاسترجاع (RAG) وتوفير سياق موثوق",
                is_correct: true,
              },
              { id: "o-5", text: "زيادة درجة الحرارة إلى أعلى قيمة ممكنة", is_correct: false },
              { id: "o-6", text: "حذف التعليمات التوجيهية", is_correct: false },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "course-2",
    title: "تطوير تطبيقات الويب الحديثة باستخدام React و TypeScript",
    slug: "modern-react-typescript-mastery",
    summary:
      "احترف بناء واجهات مستخدم سريعة وقابلة للتوسع باستخدام React 19 و TypeScript و Tailwind.",
    description:
      "مسار تدريبي عملي يركز على أفضل الممارسات في كتابة الكود النظيف، إدارة الحالة بكفاءة، وربط الواجهات بخدمات السحابة وقواعد البيانات.",
    category_id: "cat-1",
    level: "intermediate",
    duration_minutes: 180,
    is_free: false,
    price: 49,
    status: "published",
    cover_url:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
    brochure_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    students_count: 285,
    lessons: [
      {
        id: "les-201",
        course_id: "course-2",
        title: "إعداد بيئة العمل وهيكلة المشروع الحديث",
        summary: "استخدام Vite و TypeScript و Tailwind لإنشاء مشاريع فائقة السرعة.",
        duration_minutes: 30,
        position: 1,
        type: "video",
        video_url:
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        is_preview: true,
      },
      {
        id: "les-202",
        course_id: "course-2",
        title: "مكونات React الحديثة وإدارة الحالة",
        summary: "التعامل مع Hooks و TanStack Query لتحديث البيانات تلقائياً.",
        duration_minutes: 50,
        position: 2,
        type: "video",
        video_url:
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      },
    ],
    quizzes: [
      {
        id: "quiz-2",
        course_id: "course-2",
        title: "اختبار React & TypeScript",
        description: "تقييم معرفتك بإدارة الحالة والأنواع الصارمة في TypeScript.",
        pass_score: 80,
        time_limit_minutes: 20,
        max_attempts: 2,
        questions: [
          {
            id: "q-201",
            question_text: "ما هي الفائدة الرئيسية لاستخدام TypeScript مع React؟",
            options: [
              {
                id: "o-201",
                text: "اكتشاف الأخطاء البرمجية أثناء وقت التطوير وضمان سلامة الأنواع",
                is_correct: true,
              },
              { id: "o-202", text: "جعل المتصفح يترجم الملفات بدون خادم", is_correct: false },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "course-3",
    title: "مبادئ تصميم تجربة وواجهة المستخدم (UI/UX Design)",
    slug: "ui-ux-design-principles",
    summary: "تعلم أسس التصميم البصري، التباين اللوني، وهندسة التفاعل لبناء منتجات رقمية محبوبة.",
    description:
      "دورة مكثفة تغطي أبحاث المستخدمين، بناء الإطارات الهيكلية (Wireframes)، وتصميم النماذج التفاعلية المتقنة.",
    category_id: "cat-3",
    level: "beginner",
    duration_minutes: 90,
    is_free: true,
    price: 0,
    status: "published",
    cover_url:
      "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80",
    students_count: 512,
    lessons: [
      {
        id: "les-301",
        course_id: "course-3",
        title: "أساسيات التسلسل الهرمي البصري والتايبوغرافي",
        summary: "كيف توازن المسافات والأحجام والألوان لخلق تجربة قراءة مريحة.",
        duration_minutes: 40,
        position: 1,
        type: "video",
        video_url:
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
        is_preview: true,
      },
    ],
    quizzes: [],
  },
];
