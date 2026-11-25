# Project Memory: Instructor Course Management & Status Synchronization

## 1. Project Context
- **Platform**: Edvanz Learning Platform (Instructor & Student Portals)
- **Active Workspace**: `badshah-first-project-`
- **Core Entities**:
  - **Recorded Courses**: Asynchronous video-based courses composed of modules, lessons, and quizzes.
  - **Live Courses**: Synchronous scheduled courses hosted via Zoom/Google Meet with live dates and seats.
- **Problem Statement**:
  - Draft courses created by instructors (such as `"Email marketing"`, ID: `ef1d3ade-b419-42e9-8070-343ef12137de`) were returned by backend API responses (`POST /courses`, `GET /courses/{id}`), but failed to appear in the Instructor Courses list (`/instructor/courses`).
  - Previously, an offline `localStorage` course persistence workaround had been used to cache course objects locally, which was anti-pattern and led to stale data and synchronization breakage.
  - Requirement: Fetch and display courses directly from the API, respect backend status directly, properly handle `DRAFT`, `SUBMITTED`, and `PUBLISHED` states, and never use `localStorage` as the source of truth for course payloads.
  - Constraint: No extra service files created without user permission.
  - Environment: Strict preservation of environment files (`.env`, `.env.dev`, `.env.uat`, `.env.example`). Original `vite.config.ts` without proxy is restored.

---

## 2. API Endpoints & Status Flow

### Backend Endpoint Behavior
1. **`GET /api/courses`**:
   - Public catalog endpoint. Returns published, approved courses.
   - Ignores query parameters like `?status=DRAFT` or `?includeDrafts=true`.
2. **`GET /api/courses/{id}`**:
   - Single course details endpoint.
   - Instructors with valid authentication tokens have full read access to fetch details for any course they own, including drafts (`status: "DRAFT"`).
3. **`GET /api/courses/pending`**:
   - Restricted to `ADMIN` role (returns 403 Forbidden for `INSTRUCTOR`). Gracefully handled with `Promise.allSettled`.
4. **`GET /api/live-courses`**:
   - Auto-scoped to the authenticated instructor. Returns all live courses (drafts, submitted, published, rejected).

### Status Mapping & Flow
| Course Type | API Fields | Normalized Display Status | Tab Filter |
| :--- | :--- | :--- | :--- |
| **Recorded Course** (Draft) | `status: "DRAFT"`, `isPublished: false`, `approvalStatus: "PENDING"` | **`Draft`** | Draft |
| **Recorded Course** (Submitted / Pending Approval) | `status: "PENDING"` or `approvalStatus: "PENDING"` (after publish action) | **`Submitted`** | Submitted |
| **Recorded Course** (Published / Approved) | `status: "PUBLISHED"`, `isPublished: true`, `approvalStatus: "APPROVED"` | **`Published`** | Published |
| **Recorded Course** (Rejected) | `status: "REJECTED"`, `approvalStatus: "REJECTED"` | **`Rejected`** | All Courses |
| **Live Course** (Draft) | `status: "DRAFT"`, `isPublished: false` | **`Draft`** | Draft |
| **Live Course** (Submitted for Approval) | `status: "SUBMITTED"` | **`Submitted`** | Submitted |
| **Live Course** (Published / Approved) | `status: "PUBLISHED"`, `isPublished: true` | **`Published`** | Published |
| **Live Course** (Rejected) | `status: "REJECTED"` | **`Rejected`** | All Courses |

---

## 3. CORS Preflight & Root Cause Analysis

### Live Testing Results:
Direct `OPTIONS` preflight tests against `https://api-dev.edvanz.co/api/courses` and `https://api-uat.edvanz.co/api/courses`:
- **`Access-Control-Allow-Origin`**: `http://localhost:3000` (Allowed)
- **`Access-Control-Allow-Credentials`**: `true` (Allowed)
- **`Access-Control-Allow-Methods`**: `GET,POST,PUT,DELETE,PATCH,OPTIONS` (Allowed)
- **`Access-Control-Allow-Headers`**: `authorization, content-type, x-tenant-id`

### The Root Cause:
1. `src/lib/api-client.ts` automatically attaches `X-Learning-Sector` on every request.
2. The browser requests `Access-Control-Request-Headers: authorization, content-type, x-learning-sector, x-tenant-id`.
3. The server's `Access-Control-Allow-Headers` list **does NOT include `x-learning-sector`**.
4. Per W3C CORS specification, the browser blocks the preflight with:
   `Request header field x-learning-sector is not allowed by Access-Control-Allow-Headers in preflight response.`
5. **Backend Fix Required (Spring Boot)**:
   Add `"X-Learning-Sector"` to `CorsConfiguration.setAllowedHeaders` on `api-dev.edvanz.co` and `api-uat.edvanz.co`.

---

## 4. Implemented Changes

### A. Environment & Vite Configuration
- `vite.config.ts`: Restored to original setup without proxy.
- `.env`: Kept with `VITE_API_URL=https://api-dev.edvanz.co/api` and `VITE_EZAI_API_BASE_URL=https://ezai-dev.edvanz.co`.
- `.env.uat`: Kept with `VITE_API_URL=https://api-uat.edvanz.co/api`.

### B. Instructor Course Listing Page (`src/pages/instructor/InstructorCourses.tsx`)
- Hydrates draft courses directly from `coursesService.getCourseDetails(id)`.
- Deduplicates into a Map and maps backend statuses directly to `"Draft"`, `"Submitted"`, `"Published"`, and `"Rejected"`.
- Zero `localStorage` course persistence.
- Zero extra service files created.

---

## 5. Verification & Testing
- Unit & regression tests in `src/test/instructor-courses-isolation.test.ts`:
  - Verified instructor course isolation.
  - Verified API status normalization for `DRAFT`, `SUBMITTED`, and `PUBLISHED` courses.
  - Direct execution command: `node "node_modules/vitest/vitest.mjs" run src/test/instructor-courses-isolation.test.ts`.

---

## 6. Implementation Plan: Dynamic `X-Learning-Sector` Header for Get Courses API

### Requirement Overview
- **Student Profile**: When a user registers with `role = STUDENT` and `learningSector = IT`, all calls to `GET /api/courses` must include the header:
  `X-Learning-Sector: IT`
- **Kids Profile**: When a user registers with `role = KIDS` and `learningSector = KIDS`, all calls to `GET /api/courses` must include the header:
  `X-Learning-Sector: KIDS`
- **Scope Restriction**: All modifications must be restricted strictly to `badshah-first-project-`. No extra service files.

### Component & Data Flow Analysis
1. **Registration Flow (`src/pages/Register.tsx`)**:
   - `experience === "pro"` triggers registration with `role: "STUDENT"`, `learningSector: "IT"`.
   - `experience === "next"` triggers registration with `role: "KIDS"`, `learningSector: "KIDS"`.
   - *Plan*: On successful registration, immediately call `setLearningSector(sector)` and ensure `localStorage.setItem("learningSector", sector)`. This ensures instantaneous sync before any subsequent API calls fire.
2. **Authentication Context (`src/contexts/AuthContext.tsx`)**:
   - In `loginWithToken(token, refreshToken, role, email, learningSector, ...)`:
     - Immediately invoke `setLearningSector(resolvedSector)` and persist `localStorage.setItem("learningSector", resolvedSector)`.
     - In `minimalUser`, normalize and store `role` and `learningSector` ("IT" or "KIDS") inside `Edvanz_user`.
3. **Sector Resolution & Interceptor (`src/lib/api-client.ts`)**:
   - Update `getLearningSector()` priority order:
     - **Priority 1 (Authenticated User)**: Read `localStorage.getItem("Edvanz_user")`. If present, check:
       - `role` (case-insensitive `KIDS` / `kids` or `learningSector === "KIDS"`) -> `"KIDS"`.
       - `role` (case-insensitive `STUDENT` / `student` or `learningSector === "IT"`) -> `"IT"`.
     - **Priority 2 (Explicit Storage)**: `localStorage.getItem("learningSector")` or `localStorage.getItem("activeSector")`.
     - **Priority 3 (URL Route context for guests)**: `/kidz` -> `"KIDS"`, `/dashboard` -> `"IT"`.
     - **Priority 4 (Fallback)**: Default to `"IT"`.
   - In Axios Request Interceptor:
     - Continue injecting `X-Tenant-Id: 00000000-0000-0000-0000-000000000001`.
     - Inject `Authorization: Bearer <token>` when token is present.
     - Inject `X-Learning-Sector: sector` (normalized uppercase `"IT"` or `"KIDS"`).
4. **Courses Service (`src/services/courses.service.ts`)**:
   - In `getCourses(filters, pagination)`:
     - Retrieve `const activeSector = getLearningSector();`.
     - Explicitly pass `headers: { "X-Learning-Sector": activeSector }` along with `params: { ...filters, ...pagination, learningSector: activeSector }` to `apiClient.get("/courses")`.
     - This guarantees the exact header contract requested:
       - `role = STUDENT` + `learningSector = IT` -> `X-Learning-Sector: IT`
       - `role = KIDS` + `learningSector = KIDS` -> `X-Learning-Sector: KIDS`
5. **Testing & Verification**:
   - Test 1: Simulate registration/login with `role = STUDENT`, `learningSector = IT` -> verify `GET /api/courses` sends `X-Learning-Sector: IT` and receives IT courses (e.g. "React js").
   - Test 2: Simulate registration/login with `role = KIDS`, `learningSector = KIDS` -> verify `GET /api/courses` sends `X-Learning-Sector: KIDS` and receives KIDS courses (e.g. "Java Spring Boot Masterclass By Nagesh", "Photosynthesis -3").

---

## 7. Implementation Status & Completed Changes

### A. Dynamic Learning Sector Extraction (`src/lib/api-client.ts`)
- Refactored `getLearningSector()` with strict priority order:
  1. Authenticated user profile (`localStorage.getItem("Edvanz_user")` / `user`):
     - `role === "KIDS"` / `learningSector === "KIDS"` -> `"KIDS"`
     - `role === "STUDENT"` / `learningSector === "IT"` -> `"IT"`
  2. Direct storage key: `localStorage.getItem("learningSector")` or `activeSector` (`"KIDS"` | `"IT"`).
  3. URL pathname context for unauthenticated guests (`/kidz` -> `"KIDS"`, `/dashboard` -> `"IT"`).
  4. Fallback default: `"IT"`.
- Axios request interceptor ensures uppercase `"IT"` or `"KIDS"` is injected into `X-Learning-Sector` header along with `X-Tenant-Id` and `Authorization: Bearer <token>`.

### B. Immediate Sector Synchronization on Registration (`src/pages/Register.tsx`)
- On successful student or kid registration:
  - Invokes `setLearningSector(resolvedSector)` immediately.
  - Persists `localStorage.setItem("learningSector", resolvedSector)`.
  - Passes `resolvedSector` directly to `loginWithToken`.

### C. Synchronous Session Sector Persistence (`src/contexts/AuthContext.tsx`)
- In `loginWithToken`:
  - Synchronously invokes `setLearningSector(resolvedImmediateSector)` and `localStorage.setItem("learningSector", resolvedImmediateSector)`.
  - Normalizes `role` and records `learningSector` in `minimalUser` and `Edvanz_user`.
- On session restoration:
  - Synchronizes `setLearningSector(resolvedSector)` and `localStorage.setItem("learningSector", resolvedSector)` from profile/user attributes.

### D. Explicit Header Dispatch in Courses Service (`src/services/courses.service.ts`)
- In `getCourses`:
  - Passes `headers: { "X-Learning-Sector": activeSector }` alongside params to `/courses`.
- In `getPublicCourses`:
  - Passes `headers: { "X-Learning-Sector": activeSector }` alongside params to `/public/courses`.
- In `getMyCourses`:
  - Passes `headers: { "X-Learning-Sector": activeSector }` alongside params to `/student/courses`.

### E. Verification & Regression Testing
- Added unit tests in `src/test/learning-sector-isolation.test.ts`:
  - Verified `role = STUDENT` + `learningSector = IT` dispatches `X-Learning-Sector: IT` to `/courses`.
  - Verified `role = KIDS` + `learningSector = KIDS` dispatches `X-Learning-Sector: KIDS` to `/courses`.
- Full test suite execution: **16 test files passed, 99 tests passed, 0 failures**.
- Production build: **`vite build` completed successfully with exit code 0**.

---

## 8. Kidz Dashboard Course Thumbnail Fix

### Problem
- In `/kidz/explore`, course thumbnails displayed properly.
- In `/kidz` (Dashboard), all cards under "Popular Right Now" and "Continue Learning" displayed the fallback purple 3D cartoon cat image (`storyWorkspaceImg`).

### Root Cause
- In `src/pages/kidz/KidzDashboard.tsx`:
  - `displayedCatalog` and `displayedContinueLearning` mappings omitted `thumbnailUrl`.
  - While `KidzExplore.tsx` mapped `thumbnailUrl: c.thumbnailUrl || (c as any).thumbnail || (c as any).coverImage`, `KidzDashboard.tsx` did not include this property in the object passed to `CourseCard`.
  - In `KidzCourseCard.tsx`, because `course.thumbnailUrl` was undefined, it fell back to `storyWorkspaceImg`.

### Fix Implemented
1. **`src/data/kidz/portal.ts`**:
   - Added `thumbnailUrl?: string | null; thumbnail?: string | null; coverImage?: string | null;` to `export type Course`.
2. **`src/pages/kidz/KidzDashboard.tsx`**:
   - Added `thumbnailUrl: c.thumbnailUrl || (c as any).thumbnail || (c as any).coverImage` in `displayedCatalog`.
   - Added `thumbnailUrl: e.course?.thumbnailUrl || (e.course as any)?.thumbnail || (e.course as any)?.coverImage` in `displayedContinueLearning`.
3. **`src/pages/kidz/KidzMyLearning.tsx`**:
   - Added `thumbnailUrl` mapping for `displayedEnrolled` and `recommendedCourses`.
4. **`src/components/kidz/KidzCourseCard.tsx`**:
   - Enhanced `imageSrc` fallback logic: checks `thumbnailUrl`, `thumbnail`, `coverImage`, and `image`.
   - Added `onError` fallback on `<img />` to prevent broken image displays if an S3 URL 404s.

---

## 9. Kidz Dashboard "Continue Learning" & Enrolled Courses Display Fix

### Problem
- The backend API `GET /api/student/my-courses?productType=COURSE&page=0&size=100` returned a valid enrolled course (`"Current Affairs"`, ID: `4f5e8aae-9666-442c-83bc-dbc5106eb8ef`, `progressPercentage: 0`).
- However, on the Kidz Dashboard (`/kidz`), "Continue Learning" showed the empty state: *"No courses in progress yet!"*, and all enrollment stat cards showed `0 Enrolled Courses`, `0 In Progress`.

### Root Causes
1. **`unwrapArray` Did Not Inspect `courses.content`**:
   - The backend response is structured as:
     `{ summary: { ... }, courses: { content: [ { ... } ], totalElements: 1 } }`.
   - In `src/lib/kidz/kidz-api-client.ts`, `unwrapArray` only checked `content`, `items`, and `data` at root level, completely ignoring nested `courses.content` or `courses`. Thus it returned `[]`.
2. **Missing Normalization of Flat Backend Course Items**:
   - The backend returns flat items (`{ id, title, thumbnailUrl, progressPercentage, totalLessons, ... }`).
   - The Kidz dashboard components (`KidzDashboard.tsx` and `KidzMyLearning.tsx`) expected `{ courseId: string, course: CourseDTO }`.
   - Because `e.course` was undefined, `displayedContinueLearning` mappings failed to resolve `id`, `title`, and `thumbnailUrl`.

### Fix Implemented
1. **`src/lib/kidz/kidz-api-client.ts`**:
   - Updated `unwrapArray` to inspect `maybeObj["courses"]?.["content"]`, `maybeObj["courses"]`, and `maybeObj["liveCourses"]?.["content"]`.
2. **`src/services/kidz/enrollment.service.ts`**:
   - Normalized flat backend course objects into standard `EnrolledCourseDTO` format with both root and nested `course: CourseDTO` properties.
3. **`src/hooks/kidz/useStudentCourses.ts`**:
   - Updated filtering to check both `e.course?.learningSector` and `(e as any).learningSector`.
4. **`src/pages/kidz/KidzDashboard.tsx` & `src/pages/kidz/KidzMyLearning.tsx`**:
   - Added robust fallbacks for `e.courseId || c.id`, `c.title || c.courseTitle`, `c.thumbnailUrl || c.thumbnail || c.coverImage`, and `e.progressPercentage ?? c.progressPercentage ?? 0`.
   - Updated `totalLessonsDone` calculation to safely read `curr.course?.totalLessons ?? curr.totalLessons ?? 10`.

### Verification
- Tested with backend response envelope containing `{ courses: { content: [...] } }`.
- Verified enrolled courses render in "Continue Learning" with thumbnail, progress bar, and correct stat card counts.
- Full Vitest suite: **16 test files passed, 99 tests passed, 0 failures**.

---

## 10. Kidz Course Player Screen & Resume Navigation Flow

### Problem
- When an enrolled student clicked the "Resume" button (or the course card) on an enrolled course in the Kidz Dashboard (`/kidz`) or "My Learning" (`/kidz/my-learning`), the app redirected back to the course detail page (`/kidz/courses/:id`).
- On the course detail page (`KidzCourseDetail.tsx`), the primary button said "Continue Learning 🚀", but clicking it also linked back to `/kidz/courses/:id`.
- The student was unable to open the course player to watch lessons, view modules, or take quizzes.
- The user provided the target design mockup from Figma (`media_1793020234524_fd5ac30b.png`), showing:
  - Inside `KidzAppShell` (with `KidzSidebar` on left and `KidzTopBar` on top)
  - Top header: "‹ BACK TO COURSE", Course Title, and a "Course Completion" progress card with percentage
  - Two-column layout:
    - **Left Column**:
      - Current lesson indicator (`Lesson 07 From 20`)
      - Current lesson title & description
      - HTML5 Video Player (`LessonVideoPlayer`) with playback tracking
      - Previous Lesson, Mark as Completed, and Next Lesson controls
      - Tabs below video: "Overview" (with "What you'll Learn" checklist), "Notes" (timestamped student notes), and "Announcement"
    - **Right Column**:
      - "Course Content" card with collapsible module accordions, completed checkmarks, and "Start Quiz" button
      - "Preview Lesson" next lesson card with book illustration, "Remember" badge, and one-click preview button
  - Interactive Quiz integration via `KidzQuizDialog`

### Root Causes
1. **Missing Kidz Course Player Component and Route**:
   - There was no course player inside the `/kidz` route tree.
   - General course player route `/learn/:courseId` was protected with `allowedRoles={["student"]}`, which blocked or redirected users with `role: "kids"` back to `/kidz`.
2. **Circular Navigation Links**:
   - `KidzCourseCard.tsx`: Both `handleAction` and card `onClick` navigated to `/kidz/courses/${course.id}` regardless of `enrolled` state.
   - `KidzCourseDetail.tsx`: Line 1184 linked to `/kidz/courses/${courseId}` instead of the course player route.

### Changes Implemented
1. **Created `src/pages/kidz/KidzCoursePlayer.tsx`**:
   - Full fidelity implementation of the Figma mockup (`media_1793020234524_fd5ac30b.png`).
   - Sourced course and curriculum data from `kidzCoursesService` and `coursesService`.
   - Built-in fallback modules & lessons with video playback via `getLessonMedia` so the player never breaks even if backend modules are empty.
   - Course completion percentage bar with dynamic calculation.
   - Tabs: Overview, Notes (with timestamped capture and local/remote persistence), Announcements.
   - Right sidebar: Course Content accordion with active lesson highlights, completed checkmarks, and "Start Quiz" trigger for `KidzQuizDialog`.
   - Next lesson preview card with thumbnail and "Preview Lesson" navigation.
2. **Exported in `src/pages/kidz/index.ts`**:
   - Exported `KidzCoursePlayer` and `CoursePlayerPage`.
3. **Registered Routes in `src/App.tsx`**:
   - Added `/kidz/courses/:courseId/learn`, `/kidz/course/:courseId/learn`, and `/kidz/learn/:courseId` under `KidzAppShell`.
   - Updated `/learn/:courseId` route to allow both `student` and `kids`.
4. **Enhanced `src/components/auth/ProtectedRoute.tsx`**:
   - Added automatic redirection for kids accessing `/learn/:courseId` to `/kidz/courses/:courseId/learn`.
5. **Fixed Navigation in `src/components/kidz/KidzCourseCard.tsx`**:
   - When `enrolled` is true, clicking "Resume" or clicking the card navigates directly to `/kidz/courses/${course.id}/learn`.
6. **Fixed Navigation in `src/pages/kidz/KidzCourseDetail.tsx`**:
   - Line 1184: "Continue Learning 🚀" button now navigates to `/kidz/courses/${courseId}/learn`.
   - Hero video play button: If `isEnrolled` is true, displays "Resume Course 🚀" and navigates directly to the player.
   - Curriculum lessons list: Clicking an enrolled lesson navigates to `/kidz/courses/${courseId}/learn?lesson=${lesson.id}`.
7. **Enhanced `src/components/kidz/KidzSidebar.tsx`**:
   - "My Learning" nav item is automatically highlighted as active when inside the course player (`pathname.includes("/learn")`), exactly matching Figma design.

### Verification
- 16 test files, 99 vitest tests passed with 0 errors.
- Production build verified.

---

## 11. Removal of Dummy/Mock Modules in Kidz Course Player

### Problem
- When opening an enrolled course such as `"Current Affairs"` (ID: `4f5e8aae-9666-442c-83bc-dbc5106eb8ef`) where the backend returned `totalModules: 0`, `totalLessons: 0`, and `modules: []`, the UI previously synthesized mock fallback modules (`Module 1`, `Module 2`, `Module 3`, `Module 4`) with fake lessons (`Lesson 1: Introduction & Fundamentals`, `Lesson 2: Characters & Motivations`, etc.) and fake "What you'll Learn" bullet points.
- Requirement: Strictly remove all dummy/mock data. If a course has 0 modules or 0 lessons from the API, render the real empty states without fabricating content.

### Fix Implemented (`src/pages/kidz/KidzCoursePlayer.tsx`)
1. **Removed All Mock Modules & Lessons**:
   - Eliminated the static fallback array that was injecting fake modules and lessons.
   - `modules` and `lessons` are sourced 100% from the API.
2. **Course Content Empty State**:
   - When `modules.length === 0`, displays a clear, elegant empty state: *"No content available yet. The instructor has not added modules to this course yet."*
3. **Video Player & Empty Lesson State**:
   - When `totalLessons === 0` and no video is available, displays a banner with course thumbnail and notice: *"No Lessons Published Yet. The instructor has not uploaded lessons for this course yet."*
   - Lesson navigation controls (`‹ Previous Lesson`, `Mark as Completed`, `Next Lesson ›`) are hidden when `totalLessons === 0`.
4. **Overview & Learning Outcomes**:
   - Removed hardcoded story text. Shows real `course.description` directly from API.
   - "What you'll Learn" checklist is only rendered if the API provides non-empty `whatYouWillLearn` / `learningOutcomes`.
5. **Next Lesson Preview Card**:
   - Hidden when `nextLesson` is null or `totalLessons === 0`.
6. **Start Quiz Button**:
   - Only shown on a module if the module actually has a real quiz (`mod.quizId`).

### Verification
- Vitest: All 16 test files, 99 tests passed.
- Production build verified.

---

## 12. Student Notes API Integration (`/api/student_notes`)

### Endpoint & Contract Overview
- **Backend Model**:
  - `POST /api/student_notes`: Creates a note with `{ courseId, moduleId?, lessonId?, title, noteContent }`.
    - Returns `{ id, courseId, moduleId, lessonId, title, noteContent, createdAt, updatedAt }`.
  - `GET /api/student_notes/course/{courseId}`: Fetches all notes for the course (returns a Spring Page `{ content: [...], totalElements, pageable }` or direct array).
  - `PUT /api/student_notes/{noteId}`: Updates note with `{ title, noteContent }`.
  - `DELETE /api/student_notes/{noteId}`: Deletes note by its UUID.
- **Timestamp Encoding**:
  - The video timestamp is encoded in the note's `title` prefix as `[t:<seconds>] <cleanTitle>` (e.g. `"[t:122] first video"`).
  - On retrieval, `decodeNoteTitle` extracts `timestamp: 122` and `title: "first video"`.
  - Content is mapped from `noteContent` (with fallback to `content` / `note`).

### Fixes & Enhancements Implemented
1. **`src/services/notes.service.ts`**:
   - Enhanced `toArray<T>()` to check Spring Pageable `content`, `items`, `notes`, `studentNotes`, and `data` arrays.
   - Enhanced `normalizeNote()` to prioritize explicit numerical timestamps (`dto.timestamp ?? dto.videoTimestamp`) with fallback to decoded title timestamp `[t:<seconds>]`.
   - Mapped `noteContent ?? dto.content ?? dto.note` ensuring compatibility across backend versions.
   - Handled `note_id`, `noteId`, and `id` for primary keys.
2. **`src/pages/kidz/KidzCoursePlayer.tsx`**:
   - Connected `notesService.listByCourse(courseId)` on mount and on refresh.
   - Added `handleAddNote()`:
     - Sends `courseId`, `moduleId`, `lessonId`, `title` (lesson title or course title), `content` (from `noteContent`), and `timestamp` (current playhead position in seconds).
     - Directly stores the real backend UUID (`res.data.id`) into state.
   - Added `handleDeleteNote()`:
     - Calls `DELETE /api/student_notes/{noteId}` with the real UUID.
   - Added `handleUpdateNote()`:
     - Provides inline editing with `PUT /api/student_notes/{noteId}`.
   - Video Playback Seeking:
     - Clicking any note's timestamp button (`▶ 02:02`) immediately seeks the video player to that exact second and resumes playback.

### Verification
- Vitest: All 16 test files, 99 tests passed.
- Production build verified.

---

## 13. Instructor Learning Sector Specification & Strict Separation (IT vs KIDS)

### Problem Statement & Requirements
The backend team requires instructors to declare which learning sector they teach (`IT` or `KIDS`) during registration. All subsequent operations (login, course creation, practice tests, student data access) must strictly adhere to the instructor's declared sector.
1. **Instructor Registration**: Add a `learningSector` dropdown to the instructor registration form with two options: `IT` and `KIDS`. Send the selected value to the backend during registration (`/auth/register`).
2. **Instructor Login & Persistence**: Store and maintain the instructor's resolved `learningSector` after OTP login and session restoration (`/auth/me`).
3. **Course Creation Restrictions**:
   - Instructors with `learningSector = KIDS` can only create Kids-related courses.
   - Instructors with `learningSector = IT` can only create IT-related courses.
   - Instructors cannot switch or create courses for the other learning sector.
4. **Remove Learning Sector Selection from Course Forms**:
   - Remove the learning sector selection buttons/dropdowns from `InstructorCourseForm.tsx`, `InstructorLiveCourseForm.tsx`, and `InstructorPracticeTestPage.tsx`.
   - Derives sector directly from the authenticated instructor's profile (`user.learningSector`).
5. **Remove Unnecessary `X-Learning-Sector` Headers**:
   - Remove manually attached `X-Learning-Sector` headers from `coursesService.createCourse`, `coursesService.updateCourse`, `liveCoursesService.create`, `liveCoursesService.update`, `categoriesService.getCategories`, and `categoriesService.getSubcategories`.
   - Adhere strictly to the backend API contract.
6. **Student Data Filtering**:
   - In `InstructorStudents.tsx` and `instructorService.getStudents`, filter student data so IT instructors only see IT students, and Kids instructors only see Kids students.
7. **Admin Separation**:
   - Keep admin category management and admin approvals unchanged; backend handles Kids Admin flow separately.
8. **Complete Flow Verification**:
   - Verify registration payload, login session restoration, course form restrictions, and student data filtering with vitest test suite.

---

## 14. Elimination of Admin Pending Courses Endpoint from Instructor Portal

### Problem Statement
On the Instructor My Courses page (`/instructor/courses`), an unusual request to `GET /api/courses/pending` was fired in `InstructorCourses.tsx`. Because `/api/courses/pending` requires admin privileges (`admin`, `super_admin`, or `content_admin`), instructors (role: `INSTRUCTOR`) received a red `403 Forbidden` error in DevTools:
```json
{
  "status": 403,
  "error": "Forbidden",
  "message": "This endpoint requires administrator privileges. Your current role: INSTRUCTOR. Required roles: admin, super_admin, or content_admin.",
  "path": "/api/courses/pending"
}
```

### Fix Implemented
- In `src/pages/instructor/InstructorCourses.tsx`:
  - Removed `coursesService.getPendingCourses()` from `Promise.allSettled`.
  - Removed `pendingCoursesRes` and `pendingRows` from the courses deduplication map.
  - Instructors now cleanly query only their own valid endpoints (`instructorService.getMyCourses(...)`, `liveCoursesService.list()`, and specific draft hydration), completely eliminating the 403 Forbidden error.

---

## 15. Kidz Explore Page: Recorded Courses vs Live Courses with Strict KIDS Sector Isolation

### Problem Statement & Requirements
In the Kidz Explore Courses page (`/kidz/explore`):
1. Add 2 prominent toggle tabs/buttons: **Recorded Courses** and **Live Courses**.
2. When **Recorded Courses** is selected:
   - Hit `/api/public/courses?page=0&size=50&learningSector=KIDS`.
   - Display only courses belonging to the KIDS learning sector.
3. When **Live Courses** is selected:
   - Hit `/api/catalog/live-courses?status=PUBLISHED&learningSector=KIDS`.
   - The backend `/catalog/live-courses` endpoint returns mixed courses (both IT and KIDS courses).
   - Strictly filter the response to only display courses where `(course.learningSector || "").toUpperCase() === "KIDS"`.
   - Ensure NO IT courses are shown in the Kidz portal.
4. Kidz Course Card Display:
   - When a course is a live course (`course.isLive || course.courseType === "LIVE"`), render an eye-catching `LIVE` badge with a pulsing indicator on the card image.
   - Show weekly session schedule or live cohort info in the card metadata.
   - Navigate to `/kidz/courses/:courseId` passing `{ state: { course, isLive: true } }` for seamless detail hydration.
5. Search & Filters:
   - Search input (query by title, instructor, category), subject chips, level chips, and price chips work seamlessly across both course types.
   - Tab counts update dynamically (e.g. `Recorded Courses (50)`, `Live Courses (7)`).

### Files Modified & Created
- `src/data/kidz/portal.ts`: Added `courseType?: "RECORDED" | "LIVE"`, `isLive?: boolean`, `schedule?: any`, `discountedPrice?: number | null`, `originalPrice?: number | null` to `Course` type.
- `src/services/kidz/courses.service.ts`:
  - Added `getRecordedCourses(params)` calling `/public/courses?page=0&size=50&learningSector=KIDS` with strict KIDS filtering.
  - Added `getLiveCourses(params)` calling `/catalog/live-courses?status=PUBLISHED&learningSector=KIDS` with strict KIDS filtering.
- `src/pages/kidz/KidzExplore.tsx`:
  - Implemented 2 toggle buttons (`Recorded Courses` and `Live Courses`) with active state styling, count badges, and live indicator dot.
  - Synced active tab with URL query parameter `?type=recorded` / `?type=live`.
  - Added strict sector isolation (`(c.learningSector || "").toUpperCase() === "KIDS"`) so IT courses never appear in Kidz Explore.
- `src/components/kidz/KidzCourseCard.tsx`:
  - Added animated `LIVE` badge next to the Free/Premium badge when `course.isLive || course.courseType === "LIVE"`.
  - Displays session frequency (`X days/wk` or `Live cohort`) for live courses.
  - Passed `{ state: { course, isLive } }` during navigation.
- `src/pages/kidz/KidzCourseDetail.tsx`:
  - Added `useLocation` hook and `stateCourse` support so clicking any live course immediately renders course details without blank flashes.
- `src/test/kidz-explore-course-type.test.ts`:
  - 4 comprehensive unit tests verifying endpoint calls, KIDS sector isolation, `isCourseFree`, and `normalizeLevel`.

### Verification
- Vitest: All 17 test files, 104 tests passed.
- Production build verified: `built in 1m 19s` with 0 errors.

---

## 16. Kidz Live Course Detail: "Book a Demo" Button & Flow Integration

### Problem Statement & Requirements
In the Kidz Course Detail page (`/kidz/courses/:courseId`) for live courses:
- Add the **"Book a Free Demo Class"** section directly underneath the **"Apply Coupon"** form in the right sidebar.
- Mirror the exact same robust implementation and API contract from the main student `CourseDetail.tsx`:
  - `GET /api/demo-classes/course/{courseId}`: Loads available demo class slots for the live course.
  - `POST /api/demo-classes/{demoClassId}/book`: Books the selected free demo class slot for the authenticated student.
  - `GET /api/demo-classes/{demoClassId}/join`: Fetches meeting join URL when the demo is live.
  - Interactive modal dialog `<BookFreeDemoModal />`: Displays slot selection, scheduled date/times, and booking actions.
  - Dynamic button states:
    - Default: `Book a Demo` (triggers modal)
    - Already booked: `Demo Booked · View Details`
    - Demo live now: `🔴 Join Demo Now`
  - Graceful fallback: If the live course does not have separate demo records created yet, dynamically synthesizes a slot from the live course's schedule so the student can still request/book a demo seamlessly.

### Files Modified & Created
- `src/pages/kidz/KidzCourseDetail.tsx`:
  - Integrated `demoClassService.getDemoClassesByCourse(courseId)`.
  - Added `resolvedDemoClasses`, `bookedDemo`, `isDemoLiveNow`, `handleJoinDemo`, and `handleBookingSuccess`.
  - Added the **Book a Free Demo Class** box right under the Apply Coupon form.
  - Added `<BookFreeDemoModal />` at the bottom of the page.
- `src/test/kidz-live-demo-booking.test.ts`:
  - 3 unit tests verifying demo class listing, demo booking, and live session joining API calls.

### Verification
- Vitest: All 18 test files, 107 tests passed cleanly.
- Production build verified: `built in 45.17s` with zero errors.


---

## 17. Instructor Meetings: Live Courses Dropdown Fix for Schedule Demo Class & Schedule Class Modals

### Problem Statement & Root Cause
1. **Empty Dropdown in Modals**:
   - In `/instructor/meetings` (`ScheduleDemoClassModal`) and `/instructor/meetings/schedule` (`ScheduleMeetingForm`), the "Select Course" dropdown showed `"No live courses found"` and `"⚠️ You haven't created any Live Courses yet. Please create a Live Course first."`, even though the network tab showed `GET /api/live-courses?learningSector=KIDS` returning `200 OK` with the instructor's live courses (e.g. `"Srikant sir Maths class"`, ID `45a021a1-9849-440c-a9ee-e86ca72b8f00`).
2. **Root Cause Analysis**:
   - `demoClassService.getInstructorLiveCourses(user)` was applying an overly strict client-side filter:
     ```ts
     const isLive = course.courseType === "LIVE" || course.productType === "LIVE_COURSE" || course.schedule != null;
     if (!isLive) return false;
     ```
   - In backend responses from `GET /api/live-courses`, courses do not include `courseType` or `productType`, and a newly created live course has `schedule: null` until classes are scheduled.
   - Consequently, `isLive` evaluated to `false`, discarding the live course completely.
   - Additionally, strict ID matching against `myInstructorIds` failed when the user's Auth account UUID differed from the instructor record UUID, returning `false` instead of trusting the already instructor-scoped `/api/live-courses` response.
3. **Demo Booking 404 DCL_001 Fix**:
   - In `KidzCourseDetail.tsx`, when no demo class had been created by the instructor in `/api/demo-classes`, a fallback object was using `course.id` as `demoClassId`. Clicking "Book" resulted in `POST /api/demo-classes/{courseId}/book` failing with `404 DCL_001 Demo class not found`.
   - Fixed by removing the fake fallback in `KidzCourseDetail.tsx`, filtering `validDemoClasses`, and updating `BookFreeDemoModal.tsx` to display a friendly "No demo sessions scheduled yet" banner with a disabled "No Demo Available" button when no slot is available, guarding against sending course IDs to the endpoint.

### Solution & Changes
- `src/services/demoClass.service.ts`:
  - Updated `getInstructorLiveCourses(user)` to:
    - Treat every item returned by `/api/live-courses` as a live course.
    - Enforce learning sector isolation (`KIDS` vs `IT`) based on the authenticated instructor's sector.
    - Check instructor candidate IDs where available, but never drop courses returned from the instructor's own scoped endpoint.
- `src/components/meetings/ScheduleMeetingForm.tsx`:
  - Added `setValue` to auto-select single live courses and updated placeholder to indicate `"No live courses found"` or `"Select a course"`.
- `src/components/courses/BookFreeDemoModal.tsx`:
  - Added early guard preventing `courseId` from being submitted as `demoClassId`.
  - Added informational notice when `safeDemoClasses.length === 0`.
  - Disabled button with label `"No Demo Available"` when no active demo slot is scheduled.
- `src/pages/kidz/KidzCourseDetail.tsx`:
  - Replaced `resolvedDemoClasses` with `validDemoClasses`.
  - Sidebar under coupon renders appropriate state: `"Booked ✓"`, `"Free Demo"`, or `"Upcoming"`.
- `src/test/kidz-live-demo-booking.test.ts`:
  - Added tests verifying courses with `schedule=null` are included in `getInstructorLiveCourses`, sector isolation is enforced, and empty demo classes are handled gracefully.

### Verification
- Vitest: All 18 test files, 111 tests passed cleanly.
- Production build verified: `built in 55.81s` with 0 errors.


---

## 18. Schedule Demo Class Modal: Zoom Start Time & Duration Enhancements

### Context & Observation
- In the instructor UI (`/instructor/meetings`), "Srikant sir Maths class" was successfully loaded and selectable.
- When an instructor submitted a time in the past (e.g. `03:33 PM` when local time was `03:55 PM`), Zoom returned `400 Bad Request` with `code: "ZOM_002"`.
- When tested with future times (`16:06:00`), Zoom accepted the meeting and returned `startUrl` and `joinUrl`.
- On the student side, `GET /api/demo-classes/course/{courseId}` successfully returned the scheduled demo classes (`6f3e947c-530b-4f76-8f01-13888dfa0bd6`, `7dd87d48-c0f1-4d86-a4ac-d4668f2fa43b`), and `POST /api/demo-classes/{demoClassId}/book` booked them.

### Fixes & Enhancements
1. **Validation & UX in `ScheduleDemoClassModal.tsx`**:
   - Added auto-defaulting of `date` to today and `time` to 30 minutes in the future when the modal opens.
   - Added pre-submit validation ensuring `scheduledDate` cannot be in the past, displaying a clear alert: *"Meeting start time cannot be in the past. Please select a future date and time."*
   - Added error message translation for `ZOM_002` so that if Zoom rejects a past time, the user receives an explicit, friendly message instead of a blank error.
   - Added a `Duration` selector with options (30, 45, 60, 90 minutes, defaulting to 30 minutes).
2. **Item Normalization in `demoClass.service.ts`**:
   - Normalized items in `getDemoClassesByCourse` so that both `courseId` and `liveCourseId` are explicitly set.
3. **Student Flow in `KidzCourseDetail.tsx` & `BookFreeDemoModal.tsx`**:
   - Student sees the real scheduled demo slots, selects a slot, and calls `POST /api/demo-classes/{demoClassId}/book`.
   - Live demo join URL opens via `GET /api/demo-classes/{demoClassId}/join`.

### Verification
- Vitest: All 18 test files, 111 tests passed.
- Production build: Succeeded in 35.69s with zero errors.

---

## 19. Kids Live Classes Page: Real Live Class API Integration & Exclusion of Demo Classes

### Context & User Requirement
- On the Kidz Live Classes page (`/kidz/live-classes`), corrupted mock cards (`âž`, `ðŸ'—`, `ðŸ'Ž`, `ðŸ'“`) were previously displayed.
- The user instructed:
  1. Integrate the real live classes API: `GET /api/student/live-classes`.
  2. Implement the live class joining endpoint: `GET /api/live-classes/{liveClassId}/join`.
  3. **Explicitly exclude live demo classes from this page**:
     *"{"totalClasses":0,"liveNow":0,"upcoming":0,"classes":[]} live demo class ni batana hain isme live class ki api yeah wali /api/student/live-classes ka data batana hain"*
  4. When `classes: []` (empty array) is returned by `/api/student/live-classes`, render only the clean empty state ("No Live Classes Right Now") and a CTA to "Explore Live Courses 🚀".
  5. Never merge or display demo classes on this page.

### Solution & Changes
1. **`src/pages/kidz/KidzLiveClasses.tsx`**:
   - Removed all mock arrays and removed `demoClassService.getStudentBookedDemoClasses()`.
   - Fetches strictly from `liveClassService.getStudentLiveClasses()`, which calls `GET /api/student/live-classes`.
   - Safely unwraps `classes` from `{ totalClasses, liveNow, upcoming, classes: [] }` via `unwrapArray` in `kidz-api-client.ts`.
   - In `handleJoin()`, calls `liveClassService.joinLiveClass(liveClass.id)` (`GET /api/live-classes/{id}/join`) to retrieve `joinUrl` and open Zoom.
   - If not yet started by the instructor, displays a friendly warning toast: *"Wait for the instructor to start the meeting"*.
   - Renders a clean empty state whenever `classesList.length === 0`.
   - Clean UTF-8 icons (`Video`, `Timer`, `Sparkles`, `BookOpen`, `GraduationCap`, `Calendar`, `RefreshCw`).
2. **`src/test/kidz-live-classes-page.test.tsx`**:
   - Added unit and integration tests verifying:
     - Only `GET /api/student/live-classes` is invoked and demo class service is NOT called.
     - Real live class cards are rendered when `classes` has items.
     - "Join Class" button calls `liveClassService.joinLiveClass(id)` and launches Zoom URL.
     - Empty state is displayed when `classes: []`.

### Verification
- Vitest: All 19 test files and 115 tests passed cleanly.
- Production build: `npm run build` completed with 0 errors.

### Completed Live Class Handling
- When a live class has `status: "COMPLETED"`, `"ENDED"`, `"CANCELLED"`, or ended over 90 minutes ago:
  - Top badge displays: `"Completed"` (in a clean neutral badge `bg-slate-100 text-slate-600`).
  - Timer pill displays: `"Completed"` (replacing the previous erroneous `"Start in Completed"`).
  - Button state: Permanently **disabled** with label `"Completed"` (`bg-slate-200 text-slate-500 cursor-not-allowed`).
  - Card style: Muted opacity (`bg-slate-50/80 border-slate-200 opacity-80`).
  - Sorting: Active and upcoming classes are prioritized at the top; completed classes appear gracefully at the bottom.
  - Guard: `handleJoin` prevents joining if `liveClass.isCompleted`.
