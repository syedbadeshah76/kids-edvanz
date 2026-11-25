// ============= Revenue Types (Instructor) =============

export interface RevenueStats {
  totalRevenue: number;
  pendingPayout: number;
  thisMonthRevenue: number;
  transactions: number;
}

export interface CourseRevenue {
  courseId: string;
  courseTitle: string;
  courseName?: string;
  sales: number;
  revenue: number;
}

export interface PayoutBreakdown {
  totalRevenue: number;
  platformFee: number;          // absolute amount (e.g. 1967.33)
  platformFeePercent: number;   // e.g. 30
  instructorEarnings: number;
  completedPayouts: number;
  pendingPayout: number;
  nextPayoutDate: string;       // ISO date or formatted
  payoutCycleDays: number;      // e.g. 15
}

export type TransactionStatus =
  | "completed"
  | "pending"
  | "refunded"
  | "failed"
  | "COMPLETED"
  | "PENDING"
  | "REFUNDED"
  | "FAILED"
  | string;

export interface RevenueTransaction {
  id?: string;
  studentId?: string;
  studentName: string;
  courseId?: string;
  courseTitle?: string;
  courseName?: string;
  amount: number;
  date?: string; // ISO
  transactionDate?: string;
  status: TransactionStatus;
}

export interface RevenueTrendPoint {
  month: string; // e.g. "2026-08" or "Aug"
  grossRevenue: number;
  platformFee?: number;
  revenue?: number;
}

export interface RevenueOverview {
  stats: RevenueStats;
  breakdown: PayoutBreakdown;
  revenueByCourse: CourseRevenue[];
  trend: RevenueTrendPoint[];
}

export interface TransactionQueryParams {
  page?: number;
  limit?: number;
  status?: TransactionStatus;
  courseId?: string;
  from?: string;
  to?: string;
}

// ============= Payout Account & Request Types =============

export interface PayoutAccount {
  payoutAccountId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode?: string | null;
  bankCountry: string;
  accountType: string;
  upiId?: string | null;
  payoutMethod: string;
  isPrimary?: boolean;
  verificationStatus: "VERIFIED" | "PENDING" | "REJECTED" | string;
}

export interface PayoutAccountPayload {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode?: string;
  bankCountry: string;
  accountType: string;
  upiId?: string;
  payoutMethod: string;
}

export interface PayoutRequestPayload {
  courseId?: string | null;
  amount: number;
  payoutAccountId: string;
}

export interface PayoutRequestResponse {
  payoutRequestId: string;
  message: string;
  status: string;
}

export interface PayoutHistoryItem {
  payoutRequestId: string;
  courseId: string | null;
  amount: number;
  status: string;
  requestedAt: string;
  approvedAt: string | null;
  processedAt: string | null;
}

