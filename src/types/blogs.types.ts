// ============= EDVANZ CMS WordPress Blog Types =============
// Models the response contracts returned by /wp-json/edvanz/v1

export interface BlogAuthor {
  id: number;
  name: string;
  slug: string;
  avatar: string;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  link?: string;
  description?: string;
  count?: number;
}

export interface BlogFeaturedImage {
  id: number;
  url: string;
  alt: string;
  width?: number;
  height?: number;
  srcset?: string;
  sizes?: string;
}

export interface BlogSeo {
  title: string;
  description: string;
  focusKeyword?: string;
}

export interface BlogTableOfContentsItem {
  number?: string;
  level: number;
  title: string;
  anchor: string;
}

export interface BlogContent {
  html: string;
  blocks?: any[];
}

/**
 * Summary representation of a blog post, used in the listing grid and in related blogs.
 */
export interface BlogSummary {
  id: number;
  title: string;
  slug: string;
  url?: string;
  excerpt?: string;
  date: string; // ISO 8601
  modified?: string; // ISO 8601
  author: BlogAuthor;
  categories: BlogCategory[];
  featuredImage: BlogFeaturedImage | null;
  isFeatured?: boolean;
  seo?: BlogSeo;
  /** Estimated reading time in minutes (computed or provided) */
  readingTime?: number;
}

/**
 * Full representation of a single blog post for the detail page.
 */
export interface BlogDetail extends BlogSummary {
  tableOfContents?: BlogTableOfContentsItem[];
  content: BlogContent;
  relatedBlogs?: BlogSummary[];
}

export interface BlogPagination {
  currentPage: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface BlogListResponse {
  data: BlogSummary[];
  pagination: BlogPagination;
}

export interface BlogQueryParams {
  page?: number;
  per_page?: number;
  category?: string;
  search?: string;
  author?: string | number;
}

