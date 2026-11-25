/**
 * EDVANZ Kidz Learning Portal — Domain Types & Static UI Categories
 * Mock business data has been removed; data is sourced directly from the Spring Boot API.
 */

export type Course = {
  id: string;
  categoryId?: string;
  title: string;
  teacher: string;
  subject: string;
  thumbnailUrl?: string | null;
  thumbnail?: string | null;
  coverImage?: string | null;
  emoji: string;
  rating: number;
  students: number;
  lessons: number;
  duration: string;
  age: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  price: "Free" | "Premium";
  tint: string;
  progress?: number;
  nextLesson?: string;
  courseType?: "RECORDED" | "LIVE";
  isLive?: boolean;
  schedule?: any;
  discountedPrice?: number | null;
  originalPrice?: number | null;
};

export const subjects = [
  { name: "Math", emoji: "➗", tint: "bg-sky/25" },
  { name: "Science", emoji: "🔬", tint: "bg-mint/25" },
  { name: "English", emoji: "📖", tint: "bg-sun/25" },
  { name: "Coding", emoji: "💻", tint: "bg-primary-soft" },
  { name: "Art", emoji: "🎨", tint: "bg-primary-soft" },
  { name: "Music", emoji: "🎵", tint: "bg-sun/25" },
  { name: "Robotics", emoji: "🦾", tint: "bg-sky/25" },
  { name: "Languages", emoji: "🗣️", tint: "bg-mint/25" },
  { name: "General Knowledge", emoji: "🧠", tint: "bg-primary-soft" },
];
