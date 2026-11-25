import { useAuth } from "@/contexts/AuthContext";
import CourseDetail from "@/pages/CourseDetail";
import PublicCourseDetail from "@/pages/PublicCourseDetail";

/**
 * Route gate for /courses/:id:
 * - If user is authenticated: renders the full authenticated CourseDetail page
 *   (with dashboard chrome, student sidebar, gift course, locked modules, testimonials, demo classes, etc.)
 * - If user is NOT authenticated: renders the public marketing PublicCourseDetail page
 */
export const CourseDetailRouteGate = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <CourseDetail />;
  }

  return <PublicCourseDetail />;
};

export default CourseDetailRouteGate;
