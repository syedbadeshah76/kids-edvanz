/**
 * EDVANZ LMS Student API Type Definitions
 * Strict TypeScript models matching Java Spring Boot REST API
 */

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  last?: boolean;
  first?: boolean;
  empty?: boolean;
}

// ----------------------------------------------------
// Authentication & User Models
// ----------------------------------------------------

export type UserRole = "student" | "instructor" | "admin" | "STUDENT" | "INSTRUCTOR" | "ADMIN";

export interface StudentUser {
  id: string;
  email: string;
  role: "student";
  learningSector?: "IT" | "KIDS";
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  tenantId?: string;
}

export interface AuthVerifyOtpResponse {
  token: string;
  refreshToken: string;
  role: string;
  email: string;
  learningSector?: "IT" | "KIDS";
  userId?: string;
  tenantId?: string;
}

export interface LoginPayload {
  email: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface RegisterPayload {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  country?: string;
  city?: string;
  phone?: string;
  role?: "student" | "STUDENT";
  learningSector?: "IT" | "KIDS";
}

export interface UserDTO {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  learningSector?: "IT" | "KIDS";
  avatarUrl?: string;
  profilePictureUrl?: string;
  phone?: string;
  bio?: string;
  country?: string;
  city?: string;
  skills?: string[];
  interests?: string[];
  educations?: Array<{
    institution?: string;
    degree?: string;
    startYear?: number;
    endYear?: number;
  }>;
  socialLinks?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

// ----------------------------------------------------
// Courses, Modules, Lessons & Progress
// ----------------------------------------------------

export type CourseStatus = "DRAFT" | "PUBLISHED" | "APPROVED" | "ARCHIVED";
export type CourseProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export interface CourseDTO {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  instructorName?: string;
  instructorAvatar?: string;
  category?: string;
  subject?: string;
  level?: "Beginner" | "Intermediate" | "Advanced" | string;
  price?: number;
  isFree?: boolean;
  thumbnailUrl?: string;
  emoji?: string;
  rating?: number;
  ratingCount?: number;
  enrolledStudentsCount?: number;
  totalModules?: number;
  totalLessons?: number;
  totalDurationMinutes?: number;
  duration?: string;
  status?: CourseStatus;
  learningOutcomes?: string[];
  prerequisites?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseModuleDTO {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  orderIndex: number;
  lessonCount?: number;
  durationMinutes?: number;
  lessons?: LessonDTO[];
}

export interface LessonDTO {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  videoUrl?: string;
  streamUrl?: string;
  durationSeconds?: number;
  duration?: string;
  orderIndex?: number;
  isFreePreview?: boolean;
  completed?: boolean;
  resources?: Array<{
    id: string;
    title: string;
    fileUrl: string;
    fileType?: string;
  }>;
}

export interface CourseProgressDTO {
  courseId: string;
  status: CourseProgressStatus;
  progressPercentage: number;
  completedModules: number;
  totalModules: number;
  completedLessons: number;
  totalLessons: number;
  completedLessonIds: string[];
}

export interface LessonSessionDTO {
  lessonId: string;
  watchedSeconds: number;
  lastPositionSeconds: number;
  progressPercentage: number;
  completed: boolean;
}

export interface SaveLessonSessionRequest {
  lastPositionSeconds: number;
  watchedSeconds: number;
  playbackRate?: number;
  progressPercentage: number;
  completed?: boolean;
  completedLesson?: boolean;
  isCompleted?: boolean;
}

// ----------------------------------------------------
// Enrollment & Access
// ----------------------------------------------------

export interface EnrolledCourseDTO {
  enrollmentId: string;
  courseId: string;
  course: CourseDTO;
  enrolledAt: string;
  completedAt?: string;
  progressPercentage: number;
  lastAccessedAt?: string;
  productType?: "COURSE" | "LIVE_COURSE";
}

export interface EnrollmentAccessCheckDTO {
  hasAccess: boolean;
  isEnrolled: boolean;
  accessType?: "FREE" | "PAID" | "SUBSCRIPTION";
  expiresAt?: string;
}

export interface FreeEnrollRequest {
  courseId: string;
  productId?: string;
}

// ----------------------------------------------------
// Quizzes & Practice Tests
// ----------------------------------------------------

export interface QuizDTO {
  id: string;
  moduleId?: string;
  courseId?: string;
  title: string;
  description?: string;
  passingPercentage: number;
  durationMinutes: number;
  maxAttempts?: number;
  questionCount: number;
  bestScore?: number;
  isPracticeTest?: boolean;
}

export interface QuizAttemptResponse {
  attemptId: string;
  quizId?: string;
  startedAt?: string;
  durationMinutes?: number;
}

export interface QuizOptionDTO {
  key: string; // "A" | "B" | "C" | "D"
  text: string;
}

export interface QuizQuestionDTO {
  attemptQuestionId: string;
  questionText: string;
  marks?: number;
  options: QuizOptionDTO[];
}

export interface QuizSubmitAnswer {
  attemptQuestionId: string;
  selectedAnswers: string[];
}

export interface QuizSubmitRequest {
  answers: QuizSubmitAnswer[];
}

export interface QuizResultDTO {
  attemptId?: string;
  score: number;
  maxScore: number;
  percentage: number;
  passingPercentage: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
}

export interface QuizReviewQuestionDTO {
  attemptQuestionId: string;
  questionText: string;
  options: QuizOptionDTO[];
  userSelectedAnswers: string[];
  correctAnswers: string[];
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizReviewDTO {
  attemptId: string;
  quizId: string;
  score: number;
  percentage: number;
  passed: boolean;
  questions: QuizReviewQuestionDTO[];
}

export interface QuizAttemptHistoryItem {
  attemptId: string;
  attemptNumber: number;
  score: number;
  percentage: number;
  passed: boolean;
  completedAt: string;
}

export interface PracticeTestAverageDTO {
  courseId: string;
  studentId: string;
  totalAttempts: number;
  averagePercentage: number;
}

// ----------------------------------------------------
// Certificates & Badges
// ----------------------------------------------------

export interface CertificateDTO {
  id: string;
  courseId: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
  downloadUrl?: string;
  grade?: string;
  studentName?: string;
}

export interface BadgeDTO {
  id: string;
  name: string;
  description: string;
  emoji: string;
  iconUrl?: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  earned: boolean;
  earnedAt?: string;
  progressPercentage?: number;
}

export type CourseBadgeLevel = "GOLD" | "SILVER" | "BRONZE" | string;

export interface CourseAchievementDTO {
  courseId: string;
  courseTitle: string;
  thumbnailUrl: string | null;
  progressPercentage: number;
  badgeLevel: CourseBadgeLevel;
  completed: boolean;
}

export interface StudentAchievementsResponse {
  courseCount: number;
  passedTestCount: number;
  liveCourseCount: number;
  recordedCourseCount: number;
  longestStreak?: number;
  totalXp?: number;
  achievements: CourseAchievementDTO[];
}

export interface StreakDTO {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  streakFreezeRemaining: number;
}

// ----------------------------------------------------
// Live & Demo Classes
// ----------------------------------------------------

export interface LiveClassDTO {
  id: string;
  courseId?: string;
  title: string;
  topic?: string;
  instructorName: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  meetingUrl?: string;
  isLive?: boolean;
  countdownText?: string;
  status?: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
}

export interface DemoClassDTO {
  id: string;
  title: string;
  subject: string;
  instructorName: string;
  startTime: string;
  endTime?: string;
  maxAttendees?: number;
  enrolledAttendees?: number;
  isBooked?: boolean;
  thumbnailUrl?: string;
  meetingJoinUrl?: string;
}

// ----------------------------------------------------
// Notifications
// ----------------------------------------------------

export interface NotificationDTO {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type?: "INFO" | "REMINDER" | "STREAK" | "LIVE_CLASS" | "BADGE" | "SUPPORT";
  actionUrl?: string;
  createdAt: string;
}

// ----------------------------------------------------
// Notes, Discussions & Course Reminders
// ----------------------------------------------------

export interface StudentNoteDTO {
  id: string;
  courseId: string;
  lessonId?: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiscussionDTO {
  id: string;
  courseId: string;
  lessonId?: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  question: string;
  createdAt: string;
  replies?: DiscussionReplyDTO[];
}

export interface DiscussionReplyDTO {
  id: string;
  discussionId: string;
  authorName: string;
  authorRole: "student" | "instructor";
  content: string;
  createdAt: string;
}

export interface CourseReminderDTO {
  id: string;
  courseId: string;
  reminderTime: string;
  message?: string;
  active: boolean;
}

// ----------------------------------------------------
// Cart, Order & Razorpay Payment
// ----------------------------------------------------

export interface CartItemDTO {
  productId: string;
  productType: "COURSE" | "LIVE_COURSE";
  title: string;
  price: number;
  thumbnailUrl?: string;
}

export interface CartDTO {
  items: CartItemDTO[];
  totalAmount: number;
  itemCount: number;
}

export interface CheckoutRequest {
  couponCode?: string;
  coinsToRedeem?: number;
  totalAmount?: number;
  currency?: string;
}

export interface CheckoutOrderResponse {
  id: string;
  orderNumber: string;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
}

export interface PaymentInitiateResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  razorpayKeyId: string;
}

export interface PaymentVerifyRequest {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  orderId: string;
  message?: string;
}
