// ============= Categories Service =============
// Backed by the Edvanz gateway: /api/categories
//
// Endpoints used:
//   GET    /categories                       → list (flat)
//   GET    /categories/tree                  → tree (parents + subcategories)
//   GET    /categories/:id                   → single
//   GET    /categories/:id/subcategories     → children of a category
//   POST   /categories                       → create
//   PUT    /categories/:id                   → update
//   DELETE /categories/:id                   → delete
//
// The axios response interceptor already unwraps AxiosResponse.data, so what
// we receive here IS the backend body. Backend usually wraps as
// { success, data, message } — we normalize that OR a raw entity.

import { apiClient, getLearningSector } from "@/lib/api-client";
import type {
  ApiResponse,
  Category,
  CategoryMetadata,
  CategoryStats,
  CategoryStatus,
  CreateCategoryRequest,
  PaginationMeta,
  UpdateCategoryRequest,
} from "@/types/api.types";

const BASE = "/categories";

// ---------- helpers ----------

type Envelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  meta?: PaginationMeta;
};

function toApiResponse<T>(raw: unknown, fallbackMessage = ""): ApiResponse<T> {
  if (raw && typeof raw === "object" && "data" in (raw as Envelope<T>)) {
    const env = raw as Envelope<T>;
    return {
      success: env.success ?? true,
      data: env.data as T,
      message: env.message ?? fallbackMessage,
      meta: env.meta,
    };
  }
  return {
    success: true,
    data: raw as T,
    message: fallbackMessage,
  };
}

function pickArray(input: unknown): any[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object") {
    const o = input as Record<string, unknown>;
    if (Array.isArray(o.content)) return o.content as any[];
    if (Array.isArray(o.items)) return o.items as any[];
    if (Array.isArray(o.categories)) return o.categories as any[];
    if (Array.isArray(o.results)) return o.results as any[];
    if (Array.isArray(o.data)) return o.data as any[];
  }
  return [];
}

function normalizeCategory(input: any): Category {
  const children = pickArray(
    input?.subcategories ?? input?.children ?? input?.subCategories,
  );

  const totalCourses = Number(
    input?.totalCourses ??
      input?.total_courses ??
      input?.courseCount ??
      input?.course_count ??
      (Array.isArray(input?.courses) ? input.courses.length : 0),
  );

  const totalStudents = Number(
    input?.totalStudents ??
      input?.total_students ??
      input?.studentCount ??
      input?.student_count ??
      input?.studentsCount ??
      input?.students_count ??
      input?.enrolledStudents ??
      0,
  );

  let status: CategoryStatus = "active";
  if (input?.status) {
    status =
      input.status === "inactive" || input.status === "archived"
        ? "archived"
        : "active";
  } else if (typeof input?.isActive === "boolean") {
    status = input.isActive ? "active" : "archived";
  } else if (typeof input?.is_active === "boolean") {
    status = input.is_active ? "active" : "archived";
  }

  const rawColor = input?.color ?? input?.colorCode ?? input?.colour;
  const color =
    typeof rawColor === "string" && rawColor.trim()
      ? rawColor.trim()
      : "#2563EB";

  const rawIcon = input?.iconUrl ?? input?.icon_url;
  const iconUrl =
    typeof rawIcon === "string" && rawIcon.trim() ? rawIcon.trim() : undefined;

  return {
    id: String(input?.id ?? input?._id ?? input?.categoryId ?? ""),
    name: String(input?.name ?? input?.title ?? "").trim(),
    slug: String(input?.slug ?? "").trim(),
    description: String(input?.description ?? "").trim(),
    iconUrl,
    color,
    parentId: input?.parentId ? String(input.parentId) : null,
    learningSector: (input?.learningSector ?? input?.learning_sector) as ("IT" | "KIDS" | undefined),
    sortOrder: Number(input?.sortOrder ?? input?.sort_order ?? 0),
    metadata: (input?.metadata ?? undefined) as CategoryMetadata | undefined,

    subcategories: children.length ? children.map(normalizeCategory) : undefined,

    courseCount: totalCourses,
    studentCount: totalStudents,
    totalCourses,
    totalStudents,
    isActive:
      typeof input?.isActive === "boolean"
        ? input.isActive
        : typeof input?.is_active === "boolean"
        ? input.is_active
        : status === "active",
    status,
    courses: Array.isArray(input?.courses)
      ? input.courses.map((c: any) => ({
          id: String(c?.id ?? ""),
          title: c?.title ?? "",
        }))
      : undefined,
    createdAt: input?.createdAt ?? input?.created_at,
    updatedAt: input?.updatedAt ?? input?.updated_at,
  };
}

// ---------- payload mappers ----------

function toCreatePayload(req: CreateCategoryRequest) {
  const payload: Record<string, unknown> = {
    name: req.name.trim(),
    slug: req.slug.trim(),
    description: (req.description ?? "").trim(),
  };
  if (req.learningSector) payload.learningSector = req.learningSector;
  if (req.iconUrl && req.iconUrl.trim()) payload.iconUrl = req.iconUrl.trim();
  if (req.color) payload.color = req.color;
  if (req.parentId) payload.parentId = req.parentId;
  if (typeof req.sortOrder === "number") payload.sortOrder = req.sortOrder;
  if (req.metadata) payload.metadata = req.metadata;
  return payload;
}

function toUpdatePayload(req: UpdateCategoryRequest) {
  const out: Record<string, unknown> = {};
  if (req.name !== undefined) out.name = req.name.trim();
  if (req.slug !== undefined) out.slug = req.slug.trim();
  if (req.description !== undefined) out.description = req.description.trim();
  if (req.iconUrl !== undefined) out.iconUrl = req.iconUrl?.trim() || null;
  if (req.color !== undefined) out.color = req.color;
  if (req.parentId !== undefined) out.parentId = req.parentId; // null = top-level
  if (req.sortOrder !== undefined) out.sortOrder = req.sortOrder;
  if (req.metadata !== undefined) out.metadata = req.metadata;
  if (req.status !== undefined) out.status = req.status;
  return out;
}

// ---------- service ----------

export interface GetCategoriesParams {
  learningSector?: "IT" | "KIDS" | string;
  search?: string;
  status?: CategoryStatus | "all";
  parentId?: string | null;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** Aggregate stats client-side from the tree (backend has no /stats endpoint). */
function computeStats(tree: Category[]): CategoryStats {
  let total = 0;
  let active = 0;
  let courses = 0;
  let students = 0;

  const walk = (nodes: Category[]) => {
    for (const n of nodes) {
      total += 1;
      if (n.status === "active" || n.isActive) active += 1;
      courses += n.totalCourses ?? n.courseCount ?? 0;
      students += n.totalStudents ?? n.studentCount ?? 0;
      if (n.subcategories?.length) walk(n.subcategories);
    }
  };
  walk(tree);

  return {
    totalCategories: total,
    activeCategories: active,
    totalCourses: courses,
    totalStudents: students,
  };
}

/** Group a flat list into a parent→children tree using parentId and attach parentName. */
function buildTree(flat: Category[]): Category[] {
  const byId = new Map<string, Category>();
  flat.forEach((c) => byId.set(c.id, { ...c, subcategories: [] }));
  const roots: Category[] = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      const parent = byId.get(node.parentId)!;
      node.parentName = parent.name;
      parent.subcategories!.push(node);
    } else {
      roots.push(node);
    }
  });
  // Sort by sortOrder then name
  const sortRec = (list: Category[]) => {
    list.sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.name.localeCompare(b.name),
    );
    list.forEach((n) => n.subcategories && sortRec(n.subcategories));
  };
  sortRec(roots);
  return roots;
}

export const categoriesService = {
  /** Flat list from categories endpoint */
  async getCategories(
    params: GetCategoriesParams = {},
  ): Promise<ApiResponse<Category[]>> {
    const query: Record<string, string | number> = {};
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.status && params.status !== "all") query.status = params.status;
    if (params.parentId !== undefined && params.parentId !== null)
      query.parentId = params.parentId;
    if (params.page !== undefined) query.page = params.page;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.sortBy) query.sortBy = params.sortBy;
    if (params.sortOrder) query.sortOrder = params.sortOrder;

    if (params.learningSector) {
      query.learningSector = params.learningSector;
    }

    try {
      const raw = await apiClient.get<unknown>(BASE, {
        params: Object.keys(query).length > 0 ? query : undefined,
      });
      const res = toApiResponse<unknown>(raw);
      let list = pickArray(res.data).map(normalizeCategory);
      if (params.learningSector) {
        const sec = params.learningSector.toUpperCase();
        list = list.filter((cat) => {
          const catSec = (cat.learningSector || (sec === "KIDS" ? "" : "IT")).toUpperCase();
          return sec === "KIDS" ? catSec === "KIDS" : catSec !== "KIDS";
        });
      }
      if (list.length > 0) {
        return {
          success: res.success,
          data: list,
          message: res.message,
          meta: res.meta,
        };
      }
    } catch {
      // In browser, backend CORS rejects X-Learning-Sector or returns 400 when stripped;
      // gracefully fall back to /public/categories
    }

    return this.getPublicCategories(params.learningSector as any);
  },

  /** Direct summary list with course and student counts */
  async getCategoriesSummary(learningSector?: string): Promise<ApiResponse<Category[]>> {
    return this.getCategories({ learningSector });
  },

  /**
   * Tree view: parents with `subcategories` nested.
   */
  async getCategoryTree(learningSector?: string): Promise<ApiResponse<Category[]>> {
    const res = await this.getCategories({ learningSector });
    return {
      ...res,
      data: buildTree(res.data),
    };
  },

  async getCategoryById(id: string): Promise<ApiResponse<Category>> {
    const raw = await apiClient.get<unknown>(`${BASE}/${id}`);
    const res = toApiResponse<unknown>(raw);
    return { ...res, data: normalizeCategory(res.data) };
  },

  async getSubcategories(
    parentId: string,
    learningSector?: string,
  ): Promise<ApiResponse<Category[]>> {
    const params: Record<string, string> = {};
    if (learningSector) {
      params.learningSector = learningSector;
    }
    try {
      const raw = await apiClient.get<unknown>(`${BASE}/${parentId}/subcategories`, {
        params: Object.keys(params).length > 0 ? params : undefined,
      });
      const res = toApiResponse<unknown>(raw);
      const list = pickArray(res.data).map(normalizeCategory);
      if (list.length > 0) {
        return {
          ...res,
          data: list,
        };
      }
    } catch {
      // fallback
    }
    const publicCats = await this.getPublicCategories(learningSector as any);
    const subcats = (publicCats.data || []).filter((c) => String(c.parentId) === String(parentId));
    return {
      success: true,
      data: subcats,
      message: "",
    };
  },

  /** Client-side aggregate — backend has no /stats endpoint. Reuses tree to avoid duplicate network calls. */
  async getCategoryStats(
    treeParam?: Category[],
  ): Promise<ApiResponse<CategoryStats>> {
    const tree = treeParam ?? (await this.getCategoryTree()).data;
    return {
      success: true,
      data: computeStats(tree),
      message: "",
    };
  },

  async createCategory(
    payload: CreateCategoryRequest,
  ): Promise<ApiResponse<Category>> {
    const raw = await apiClient.post<unknown>(BASE, toCreatePayload(payload));
    const res = toApiResponse<unknown>(raw, "Category created successfully");
    return { ...res, data: normalizeCategory(res.data) };
  },

  async updateCategory(
    id: string,
    payload: UpdateCategoryRequest,
  ): Promise<ApiResponse<Category>> {
    // Backend uses PUT for update.
    const raw = await apiClient.put<unknown>(
      `${BASE}/${id}`,
      toUpdatePayload(payload),
    );
    const res = toApiResponse<unknown>(raw, "Category updated successfully");
    return { ...res, data: normalizeCategory(res.data) };
  },

  async deleteCategory(id: string): Promise<ApiResponse<null>> {
    const raw = await apiClient.delete<unknown>(`${BASE}/${id}`);
    const res = toApiResponse<null>(raw, "Category deleted successfully");
    return { ...res, data: null };
  },

  /** No dedicated /status endpoint — piggyback on PUT. */
  async toggleCategoryStatus(
    id: string,
    status: CategoryStatus,
  ): Promise<ApiResponse<Category>> {
    return this.updateCategory(id, { status });
  },

  /** Public categories list from GET /public/categories */
  async getPublicCategories(learningSector?: "IT" | "KIDS"): Promise<ApiResponse<Category[]>> {
    const activeSector = (learningSector || getLearningSector()).toUpperCase() as "IT" | "KIDS";
    try {
      const raw = await apiClient.get<unknown>("/public/categories", {
        params: { page: 0, size: 100, learningSector: activeSector },
      });
      const res = toApiResponse<unknown>(raw);
      let list = pickArray(res.data).map(normalizeCategory);
      if (activeSector) {
        list = list.filter((cat) => {
          const sec = (cat.learningSector || (activeSector === "KIDS" ? "" : "IT")).toUpperCase();
          return activeSector === "KIDS" ? sec === "KIDS" : sec !== "KIDS";
        });
      }
      return {
        success: true,
        data: list,
        message: res.message,
        meta: res.meta,
      };
    } catch {
      return {
        success: false,
        data: [],
        message: "Failed to fetch public categories",
      };
    }
  },
};

export { computeStats, buildTree };
export default categoriesService;
