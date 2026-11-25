import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Play,
  Check,
  BookOpen,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  VideoOff,
  Save,
  X,
  Megaphone,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import LessonVideoPlayer from "@/components/video/LessonVideoPlayer";
import { KidzQuizDialog } from "@/components/kidz/KidzQuizDialog";

import { coursesService } from "@/services/courses.service";
import { coursesService as kidzCoursesService } from "@/services/kidz/courses.service";
import { announcementService, mapAnnouncement } from "@/services/announcements.service";
import { AnnouncementHtml } from "@/components/announcements/AnnouncementHtml";
import { deriveTitle } from "@/lib/announcement.utils";
import type { Announcement } from "@/types/announcement.types";
import { notesService } from "@/services/notes.service";
import { useAppState } from "@/lib/kidz/kidz-app-state";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

import heroBooksImg from "@/assets/kidz/hero-books-stack.jpg";
import "./kidz.css";

interface KidzLesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  duration?: string;
  durationSeconds?: number;
  videoUrl?: string;
  order?: number;
}

interface KidzModule {
  id: string;
  title: string;
  quizId?: string;
  quizTitle?: string;
  lessons: KidzLesson[];
}

interface KidzNote {
  id: string;
  lessonId?: string;
  moduleId?: string;
  title?: string;
  timestamp: number;
  content: string;
  createdAt: string;
}

const formatSeconds = (sec: number): string => {
  if (!sec || isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export function KidzCoursePlayer() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateProgress, getCourseProgress } = useAppState();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<KidzModule[]>([]);
  const [currentLesson, setCurrentLesson] = useState<KidzLesson | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [backendProgress, setBackendProgress] = useState<
    Awaited<ReturnType<typeof kidzCoursesService.getCourseProgress>> | null
  >(null);
  const [lessonSession, setLessonSession] = useState<
    Awaited<ReturnType<typeof kidzCoursesService.getLessonSession>> | null
  >(null);
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Media playback state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const maxWatchedRef = useRef<number>(0);
  const activeSessionAbortRef = useRef<AbortController | null>(null);
  const activeSaveSeqRef = useRef<number>(0);
  const isSavingRef = useRef<boolean>(false);
  const isRestoringRef = useRef<boolean>(false);
  const lastSavedLessonRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<{ lessonId: string; pos: number } | null>(null);
  const initialPlaySavedRef = useRef<boolean>(false);
  const currentLessonRef = useRef<KidzLesson | null>(null);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const completedLessonIdsRef = useRef<string[]>([]);
  const updateProgressRef = useRef(updateProgress);

  useEffect(() => {
    updateProgressRef.current = updateProgress;
  }, [updateProgress]);

  // Tabs: overview, notes, announcements
  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState<KidzNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Quiz Modal State
  const [quizOpen, setQuizOpen] = useState(false);
  const [activeQuizTitle, setActiveQuizTitle] = useState("");
  const [activeQuizId, setActiveQuizId] = useState<string | undefined>(undefined);

  // Refresh student notes from /api/student_notes/course/{courseId}
  const refreshNotes = useCallback(async () => {
    if (!courseId) return;
    try {
      const res = await notesService.listByCourse(courseId);
      if (res.success && Array.isArray(res.data)) {
        setNotes(
          res.data.map((n) => ({
            id: String(n.id),
            lessonId: String(n.lessonId || ""),
            moduleId: String(n.moduleId || ""),
            title: n.title || "Note",
            timestamp: n.timestamp || 0,
            content: n.content || "",
            createdAt: n.createdAt || new Date().toISOString(),
          }))
        );
      }
    } catch (err) {
      console.warn("Failed to load student notes:", err);
    }
  }, [courseId]);

  // Load Course and Modules directly from API
  useEffect(() => {
    if (!courseId) return;
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch Course Details from API
        let courseData: any = null;
        try {
          courseData = await kidzCoursesService.get(courseId);
        } catch {}

        if (!courseData) {
          try {
            courseData = await coursesService.getStudentCourseDetails(courseId);
          } catch {}
        }

        if (!courseData) {
          try {
            courseData = await coursesService.get(courseId);
          } catch {}
        }

        if (!courseData) {
          courseData = {
            id: courseId,
            title: "Course",
            description: "",
          };
        }

        if (isMounted) {
          setCourse(courseData);
        }

        // 2. Fetch Curriculum / Modules directly from API
        let rawModules: any[] = [];
        try {
          const mRes = await kidzCoursesService.getModulesByCourse(courseId);
          if (Array.isArray(mRes) && mRes.length > 0) rawModules = mRes;
        } catch {}

        if (rawModules.length === 0) {
          try {
            const mRes: any = await coursesService.getCourseCurriculum(courseId);
            const mData = mRes?.data ?? mRes;
            if (Array.isArray(mData) && mData.length > 0) rawModules = mData;
          } catch {}
        }

        if (rawModules.length === 0 && Array.isArray(courseData.modules) && courseData.modules.length > 0) {
          rawModules = courseData.modules;
        }

        // 3. Enrich lessons for each module from API
        let normalizedModules: KidzModule[] = [];
        if (rawModules.length > 0) {
          normalizedModules = await Promise.all(
            rawModules.map(async (mod: any, mIdx: number) => {
              const modId = String(mod.id ?? mod.moduleId ?? `mod-${mIdx}`);
              let rawLessons = Array.isArray(mod.lessons) ? mod.lessons : [];

              if (rawLessons.length === 0 && mod.id) {
                try {
                  const lRes: any = await kidzCoursesService
                    .getLessonsByModule(mod.id)
                    .catch(() => coursesService.getLessonsByModule(mod.id));
                  const lData = lRes?.data ?? lRes;
                  if (Array.isArray(lData)) rawLessons = lData;
                } catch {}
              }

              const lessons: KidzLesson[] = rawLessons.map((l: any, lIdx: number) => ({
                id: String(l.id ?? l.lessonId ?? `lesson-${mIdx}-${lIdx}`),
                moduleId: modId,
                title: l.title || `Lesson ${lIdx + 1}`,
                description: l.description || "",
                duration: l.duration || (l.videoDurationSeconds ? formatSeconds(l.videoDurationSeconds) : ""),
                durationSeconds: l.videoDurationSeconds || l.durationSeconds || 0,
                videoUrl: l.videoUrl || l.playbackUrl || l.streamUrl || "",
                order: l.sortOrder ?? l.order ?? lIdx,
              }));

              const quizId = mod.quizId || mod.quiz?.id || mod.quiz?.quizId;
              const quizTitle = mod.quiz?.title || (quizId ? `${mod.title || `Module ${mIdx + 1}`} Quiz` : undefined);

              return {
                id: modId,
                title: mod.title || `Module ${mIdx + 1}`,
                quizId,
                quizTitle,
                lessons,
              };
            })
          );
        }

        // 4. Load progress from API before selecting initial lesson so we can resume lastLessonId
        let initialProg: Awaited<ReturnType<typeof kidzCoursesService.getCourseProgress>> | null =
          null;
        let initialCompletedIds: string[] = [];
        try {
          initialProg = await kidzCoursesService.getCourseProgress(courseId);
          if (
            Array.isArray(initialProg?.completedLessonIds) &&
            initialProg.completedLessonIds.length > 0
          ) {
            initialCompletedIds = initialProg.completedLessonIds.map((id: any) => String(id));
          }
        } catch {}

        if (
          initialProg?.status === "NOT_STARTED" &&
          Number(initialProg?.progressPercentage ?? 0) === 0
        ) {
          initialCompletedIds = [];
          try {
            localStorage.removeItem(`kidz_course_progress_${courseId}`);
          } catch {}
        } else if (initialCompletedIds.length === 0) {
          try {
            const cached = localStorage.getItem(`kidz_course_progress_${courseId}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) {
                initialCompletedIds = parsed.map((id: any) => String(id));
              }
            }
          } catch {}
        }

        // Set real modules only (NO mock/dummy fallback)
        if (isMounted) {
          setModules(normalizedModules);
          if (initialProg) {
            setBackendProgress(initialProg);
            const initialApiPct = Math.min(
              100,
              Math.max(0, Math.round(Number(initialProg.progressPercentage ?? 0) || 0)),
            );
            updateProgressRef.current(courseId, initialApiPct);
          }
          setCompletedLessonIds(initialCompletedIds);
          completedLessonIdsRef.current = initialCompletedIds;

          const requestedLessonId = searchParams.get("lesson");
          let savedLastLessonId: string | null = initialProg?.lastLessonId || null;
          if (!savedLastLessonId) {
            try {
              savedLastLessonId = localStorage.getItem(`edvanz_last_lesson_${courseId}`);
            } catch {}
          }

          const allLessonsList = normalizedModules.flatMap((m) => m.lessons);
          if (allLessonsList.length > 0) {
            const found =
              (requestedLessonId && allLessonsList.find((l) => l.id === requestedLessonId)) ||
              (savedLastLessonId && allLessonsList.find((l) => l.id === savedLastLessonId)) ||
              allLessonsList[0];
            setCurrentLesson(found);
            currentLessonRef.current = found;
            setOpenModules(
              found?.moduleId
                ? { [found.moduleId]: true }
                : normalizedModules.length > 0
                ? { [normalizedModules[0].id]: true }
                : {},
            );
          } else {
            setCurrentLesson(null);
            currentLessonRef.current = null;
            setOpenModules(normalizedModules.length > 0 ? { [normalizedModules[0].id]: true } : {});
          }
        }

        // 5. Load Announcements from API (/api/course_announcements/course/{courseId})
        try {
          const rawAnn = await announcementService.getAnnouncementsByCourse(courseId);
          const courseMeta = {
            courseId: courseId,
            courseName: courseData?.title || courseData?.courseName || "Course",
            courseType: "recorded" as const,
            studentCount: courseData?.students ?? 0,
          };
          const mapped = (Array.isArray(rawAnn) ? rawAnn : []).map((raw) =>
            mapAnnouncement(raw, courseMeta),
          );
          if (isMounted) {
            setAnnouncements(mapped);
          }
        } catch (err) {
          console.warn("Failed to load course announcements:", err);
          if (isMounted) setAnnouncements([]);
        }

        // 6. Load Student Notes from API
        await refreshNotes();
      } catch (err) {
        console.error("Failed to load course player data:", err);
        toast.error("Could not load course. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [courseId, refreshNotes, searchParams]);

  // Flattened all real lessons
  const allLessons = useMemo(() => {
    return modules.flatMap((m) => m.lessons);
  }, [modules]);

  const totalLessons = allLessons.length;
  const currentLessonIndex = useMemo(() => {
    if (!currentLesson) return 0;
    const idx = allLessons.findIndex((l) => l.id === currentLesson.id);
    return idx >= 0 ? idx : 0;
  }, [allLessons, currentLesson]);

  const nextLesson = useMemo(() => {
    if (totalLessons > 0 && currentLessonIndex < allLessons.length - 1) {
      return allLessons[currentLessonIndex + 1];
    }
    return null;
  }, [allLessons, currentLessonIndex, totalLessons]);

  // Progress percentage strictly from backend API (/student/courses/{courseId}/progress)
  const progressPercentage = useMemo(() => {
    if (backendProgress) {
      const pct = Number(backendProgress.progressPercentage ?? 0);
      return Number.isFinite(pct) ? Math.min(100, Math.max(0, Math.round(pct))) : 0;
    }
    if (
      course?.progressPercentage != null &&
      Number.isFinite(Number(course.progressPercentage))
    ) {
      return Math.min(100, Math.max(0, Math.round(Number(course.progressPercentage))));
    }
    const appStatePct = getCourseProgress(courseId);
    return Number.isFinite(appStatePct) ? Math.min(100, Math.max(0, Math.round(appStatePct))) : 0;
  }, [backendProgress, course?.progressPercentage, courseId, getCourseProgress]);

  // Resolve media for current lesson or course promo (strictly avoid hardcoded default videos)
  const resolvedMedia = useMemo(() => {
    let validVideoUrl = "";
    if (
      currentLesson?.videoUrl &&
      typeof currentLesson.videoUrl === "string" &&
      currentLesson.videoUrl.trim().startsWith("http")
    ) {
      validVideoUrl = currentLesson.videoUrl.trim();
    } else if (
      course?.videoUrl &&
      typeof course.videoUrl === "string" &&
      course.videoUrl.trim().startsWith("http")
    ) {
      validVideoUrl = course.videoUrl.trim();
    } else if (
      course?.promoVideoUrl &&
      typeof course.promoVideoUrl === "string" &&
      course.promoVideoUrl.trim().startsWith("http")
    ) {
      validVideoUrl = course.promoVideoUrl.trim();
    }

    return {
      videoUrl: validVideoUrl,
      poster: course?.thumbnailUrl || course?.thumbnail || course?.coverImage || heroBooksImg,
      captionsSrc: undefined,
    };
  }, [course, currentLesson]);

  // Toggle Module Accordion
  const toggleModule = (modId: string) => {
    setOpenModules((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  const lessonSessionRef = useRef(lessonSession);

  useEffect(() => {
    currentLessonRef.current = currentLesson;
  }, [currentLesson]);

  useEffect(() => {
    completedLessonIdsRef.current = completedLessonIds;
  }, [completedLessonIds]);

  useEffect(() => {
    lessonSessionRef.current = lessonSession;
  }, [lessonSession]);

  const applyCourseProgress = useCallback(
    (prog: Awaited<ReturnType<typeof kidzCoursesService.getCourseProgress>>) => {
      setBackendProgress(prog);
      const apiIds = Array.isArray(prog.completedLessonIds)
        ? prog.completedLessonIds.map((id) => String(id))
        : [];
      if (apiIds.length > 0) {
        const merged = Array.from(new Set([...completedLessonIdsRef.current, ...apiIds]));
        completedLessonIdsRef.current = merged;
        setCompletedLessonIds(merged);
        try {
          localStorage.setItem(`kidz_course_progress_${courseId}`, JSON.stringify(merged));
        } catch {}
      }
      const apiPct = Math.min(
        100,
        Math.max(0, Math.round(Number(prog.progressPercentage ?? 0) || 0)),
      );
      updateProgressRef.current(courseId, apiPct);
    },
    [courseId],
  );

  const refreshCourseProgress = useCallback(async () => {
    if (!courseId) return null;
    try {
      const freshProg = await kidzCoursesService.getCourseProgress(courseId);
      applyCourseProgress(freshProg);
      return freshProg;
    } catch {
      return null;
    }
  }, [applyCourseProgress, courseId]);

  // Persist current lesson video playback session (/api/student/lessons/{lessonId}/session)
  // and sync course progress (/api/student/courses/{courseId}/progress)
  const saveCurrentSession = useCallback(
    async (
      forceCompleted = false,
      snapshot?: {
        lesson?: KidzLesson | null;
        pos?: number;
        dur?: number;
        watched?: number;
        playbackRate?: number;
      },
    ) => {
      const targetLesson = snapshot?.lesson ?? currentLessonRef.current;
      if (!targetLesson?.id) return null;

      if (isRestoringRef.current && !forceCompleted) return null;

      const el = videoRef.current;
      const rawPos =
        snapshot?.pos ??
        (el && Number.isFinite(el.currentTime) ? el.currentTime : currentTimeRef.current);
      const rawDur =
        snapshot?.dur ??
        (el && Number.isFinite(el.duration) && el.duration > 0
          ? el.duration
          : durationRef.current);
      const playbackRate =
        snapshot?.playbackRate ??
        (el && Number.isFinite(el.playbackRate) ? el.playbackRate : 1.0);

      const safePos = Math.max(0, rawPos || 0);
      const safeDur = Math.max(0, rawDur || 0);
      const isActiveCurrentLesson = currentLessonRef.current?.id === targetLesson.id;

      let safeWatched = Math.max(safePos, snapshot?.watched ?? 0);
      if (isActiveCurrentLesson) {
        maxWatchedRef.current = Math.max(
          maxWatchedRef.current,
          safePos,
          snapshot?.watched ?? 0,
        );
        safeWatched = Math.max(safePos, maxWatchedRef.current);
      }

      if (!forceCompleted && safePos <= 0 && safeWatched <= 0) {
        return null;
      }

      if (isSavingRef.current && !forceCompleted && !snapshot?.lesson) {
        return null;
      }

      const alreadyCompleted = completedLessonIdsRef.current.includes(targetLesson.id);
      let pct = safeDur > 0 ? Math.min(100, Math.round((safeWatched / safeDur) * 100)) : 0;
      const existingSession = lessonSessionRef.current;
      if (existingSession?.lessonId === targetLesson.id && existingSession.progressPercentage > pct) {
        pct = existingSession.progressPercentage;
      }
      if (forceCompleted || alreadyCompleted) {
        pct = Math.max(pct, 100);
      }

      if (courseId) {
        try {
          localStorage.setItem(
            `edvanz_pos_${courseId}_${targetLesson.id}`,
            String(Math.floor(safePos)),
          );
          localStorage.setItem(`edvanz_last_lesson_${courseId}`, targetLesson.id);
        } catch {}
      }

      const seq = ++activeSaveSeqRef.current;
      isSavingRef.current = true;

      try {
        const saved = await kidzCoursesService.saveLessonSession(targetLesson.id, {
          lastPositionSeconds: Math.floor(safePos),
          watchedSeconds: Math.floor(safeWatched),
          playbackRate,
          progressPercentage: pct,
          completed: forceCompleted || alreadyCompleted || pct >= 80,
        });

        lastSavedLessonRef.current = targetLesson.id;
        lastSavedSnapshotRef.current = {
          lessonId: targetLesson.id,
          pos: Math.floor(safePos),
        };

        if (currentLessonRef.current?.id === targetLesson.id) {
          lessonSessionRef.current = saved;
          setLessonSession(saved);
        }

        const becameCompleted = Boolean(saved.completed || saved.progressPercentage >= 80);
        if (becameCompleted && !completedLessonIdsRef.current.includes(targetLesson.id)) {
          const merged = [...completedLessonIdsRef.current, targetLesson.id];
          completedLessonIdsRef.current = merged;
          setCompletedLessonIds(merged);
          if (courseId) {
            try {
              localStorage.setItem(`kidz_course_progress_${courseId}`, JSON.stringify(merged));
            } catch {}
          }
        }

        if (courseId) {
          try {
            const freshProg = await kidzCoursesService.getCourseProgress(courseId);
            applyCourseProgress(freshProg);
          } catch {}
        }

        return saved;
      } catch (err) {
        console.warn("Failed to save lesson session:", err);
        return null;
      } finally {
        if (activeSaveSeqRef.current === seq) {
          isSavingRef.current = false;
        }
      }
    },
    [applyCourseProgress, courseId],
  );

  const saveCurrentSessionRef = useRef(saveCurrentSession);
  useEffect(() => {
    saveCurrentSessionRef.current = saveCurrentSession;
  }, [saveCurrentSession]);

  // Restore saved playback session when opening or switching lessons
  useEffect(() => {
    if (loading || !currentLesson?.id) return;
    const lessonId = currentLesson.id;

    if (activeSessionAbortRef.current) {
      activeSessionAbortRef.current.abort();
    }
    const controller = new AbortController();
    activeSessionAbortRef.current = controller;

    maxWatchedRef.current = 0;
    initialPlaySavedRef.current = false;
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setDuration(0);
    durationRef.current = 0;
    lessonSessionRef.current = null;
    setLessonSession(null);

    if (courseId) {
      try {
        localStorage.setItem(`edvanz_last_lesson_${courseId}`, lessonId);
      } catch {}
    }

    const hasVideoElement = Boolean(videoRef.current);
    isRestoringRef.current = true;
    if (hasVideoElement) {
      setIsRestoringSession(true);
    }

    let attachedVideoEl: HTMLVideoElement | null = null;
    let loadedMetaHandler: (() => void) | null = null;

    const restoreSession = async () => {
      try {
        const session = await kidzCoursesService.getLessonSession(
          lessonId,
          controller.signal,
        );
        if (controller.signal.aborted) return;

        let savedPos = Math.max(0, Number(session.lastPositionSeconds ?? 0) || 0);
        if (savedPos <= 0 && courseId) {
          try {
            const localPos = Number(
              localStorage.getItem(`edvanz_pos_${courseId}_${lessonId}`) || 0,
            );
            if (Number.isFinite(localPos) && localPos > 0) {
              savedPos = localPos;
            }
          } catch {}
        }

        maxWatchedRef.current = Math.max(
          savedPos,
          Number(session.watchedSeconds ?? 0) || 0,
        );
        lessonSessionRef.current = session;
        setLessonSession(session);

        if (session.completed || session.progressPercentage >= 80) {
          if (!completedLessonIdsRef.current.includes(lessonId)) {
            const merged = [...completedLessonIdsRef.current, lessonId];
            completedLessonIdsRef.current = merged;
            setCompletedLessonIds(merged);
            if (courseId) {
              try {
                localStorage.setItem(
                  `kidz_course_progress_${courseId}`,
                  JSON.stringify(merged),
                );
              } catch {}
            }
          }
        }

        const el = videoRef.current;
        if (el) {
          const trySeek = () => {
            const vid = videoRef.current;
            if (!vid || controller.signal.aborted) return;
            const vidDur = vid.duration;
            if (Number.isFinite(vidDur) && vidDur > 0) {
              if (savedPos > 0 && savedPos < Math.max(0, vidDur - 3)) {
                try {
                  vid.currentTime = savedPos;
                  setCurrentTime(savedPos);
                  currentTimeRef.current = savedPos;
                } catch {}
              } else if (savedPos <= 0 && vid.currentTime > 1) {
                try {
                  vid.currentTime = 0;
                  setCurrentTime(0);
                  currentTimeRef.current = 0;
                } catch {}
              }
            } else if (savedPos > 0) {
              try {
                vid.currentTime = savedPos;
                setCurrentTime(savedPos);
                currentTimeRef.current = savedPos;
              } catch {}
            }
          };

          if (el.readyState >= 1) {
            trySeek();
          } else {
            attachedVideoEl = el;
            loadedMetaHandler = () => {
              if (attachedVideoEl && loadedMetaHandler) {
                attachedVideoEl.removeEventListener("loadedmetadata", loadedMetaHandler);
              }
              trySeek();
            };
            el.addEventListener("loadedmetadata", loadedMetaHandler);
          }
        }
      } catch (err: any) {
        if (
          err?.name === "CanceledError" ||
          err?.name === "AbortError" ||
          err?.code === "ERR_CANCELED"
        ) {
          return;
        }
      } finally {
        if (!controller.signal.aborted) {
          isRestoringRef.current = false;
          setIsRestoringSession(false);
        }
      }
    };

    void restoreSession();

    return () => {
      controller.abort();
      if (attachedVideoEl && loadedMetaHandler) {
        attachedVideoEl.removeEventListener("loadedmetadata", loadedMetaHandler);
      }
      isRestoringRef.current = false;
      setIsRestoringSession(false);
    };
  }, [courseId, currentLesson?.id, loading]);

  // Periodically save lesson session every 15s while video is playing
  useEffect(() => {
    if (loading || !currentLesson?.id) return;

    const timer = window.setInterval(() => {
      const el = videoRef.current;
      if (el && !el.paused && !el.ended && el.duration > 0) {
        void saveCurrentSessionRef.current(false);
      }
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [currentLesson?.id, loading]);

  // Flush playback session on page unload or leaving player
  useEffect(() => {
    const flushSession = () => {
      const lesson = currentLessonRef.current;
      if (!lesson?.id || isRestoringRef.current) return;
      const el = videoRef.current;
      const pos =
        el && Number.isFinite(el.currentTime) ? el.currentTime : currentTimeRef.current;
      const dur =
        el && Number.isFinite(el.duration) && el.duration > 0
          ? el.duration
          : durationRef.current;
      const watched = Math.max(pos, maxWatchedRef.current);
      if (pos <= 0 && watched <= 0) return;

      const last = lastSavedSnapshotRef.current;
      if (last && last.lessonId === lesson.id && Math.abs(Math.floor(pos) - last.pos) < 1) {
        return;
      }

      void saveCurrentSessionRef.current(false, {
        lesson,
        pos,
        dur,
        watched,
        playbackRate: el && Number.isFinite(el.playbackRate) ? el.playbackRate : 1.0,
      });
    };

    window.addEventListener("beforeunload", flushSession);
    return () => {
      window.removeEventListener("beforeunload", flushSession);
      flushSession();
    };
  }, []);

  // Mark Lesson as Completed
  const markLessonComplete = useCallback(
    async (lessonId: string) => {
      if (!lessonId || completedLessonIdsRef.current.includes(lessonId)) return;

      const updated = [...completedLessonIdsRef.current, lessonId];
      completedLessonIdsRef.current = updated;
      setCompletedLessonIds(updated);

      try {
        localStorage.setItem(`kidz_course_progress_${courseId}`, JSON.stringify(updated));
      } catch {}

      const el = videoRef.current;
      const isSameLesson = currentLessonRef.current?.id === lessonId;
      const pos = isSameLesson
        ? el && Number.isFinite(el.currentTime)
          ? el.currentTime
          : currentTimeRef.current
        : 0;
      const dur = isSameLesson
        ? el && Number.isFinite(el.duration) && el.duration > 0
          ? el.duration
          : durationRef.current
        : 0;
      const watched = isSameLesson
        ? Math.max(pos, maxWatchedRef.current, dur || 60)
        : 60;
      const playbackRate =
        isSameLesson && el && Number.isFinite(el.playbackRate) ? el.playbackRate : 1.0;

      try {
        const saved = await kidzCoursesService.saveLessonSession(lessonId, {
          lastPositionSeconds: Math.floor(pos),
          watchedSeconds: Math.floor(watched),
          playbackRate,
          progressPercentage: 100,
          completed: true,
        });
        lastSavedLessonRef.current = lessonId;
        lastSavedSnapshotRef.current = { lessonId, pos: Math.floor(pos) };
        if (isSameLesson) {
          lessonSessionRef.current = saved;
          setLessonSession(saved);
        }
      } catch (err) {
        console.warn("Failed to save lesson session:", err);
      }

      if (courseId) {
        try {
          let freshProg = await kidzCoursesService.getCourseProgress(courseId);
          const hasPendingQuizzes =
            (freshProg?.totalQuizzes ?? 0) > (freshProg?.completedQuizzes ?? 0);

          if (
            totalLessons > 0 &&
            updated.length >= totalLessons &&
            !hasPendingQuizzes &&
            freshProg?.status !== "COMPLETED" &&
            Number(freshProg?.progressPercentage ?? 0) < 100
          ) {
            try {
              await kidzCoursesService.completeCourse(courseId);
              freshProg = await kidzCoursesService.getCourseProgress(courseId);
            } catch {}
          }

          applyCourseProgress(freshProg);
        } catch {}
      }

      toast.success("Lesson completed! 🎉 ⭐ +50 XP");
    },
    [applyCourseProgress, courseId, totalLessons],
  );

  // Switch Lesson (save outgoing lesson playback session first)
  const selectLesson = (lesson: KidzLesson) => {
    const outgoingLesson = currentLessonRef.current;
    if (outgoingLesson && outgoingLesson.id !== lesson.id) {
      const el = videoRef.current;
      const pos =
        el && Number.isFinite(el.currentTime) ? el.currentTime : currentTimeRef.current;
      const dur =
        el && Number.isFinite(el.duration) && el.duration > 0
          ? el.duration
          : durationRef.current;
      const watched = Math.max(pos, maxWatchedRef.current);
      const playbackRate =
        el && Number.isFinite(el.playbackRate) ? el.playbackRate : 1.0;

      if (!isRestoringRef.current && (pos > 0 || watched > 0)) {
        void saveCurrentSession(false, {
          lesson: outgoingLesson,
          pos,
          dur,
          watched,
          playbackRate,
        });
      }
    }

    setCurrentLesson(lesson);
    currentLessonRef.current = lesson;
    setOpenModules((prev) => ({ ...prev, [lesson.moduleId]: true }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Video Time & Completion triggers
  const handleTimeUpdate = (ct: number, total: number) => {
    setCurrentTime(ct);
    currentTimeRef.current = ct;
    setDuration(total);
    durationRef.current = total;
    if (!isRestoringRef.current) {
      maxWatchedRef.current = Math.max(maxWatchedRef.current, ct);
    }

    const activeLesson = currentLessonRef.current;
    if (
      activeLesson &&
      !isRestoringRef.current &&
      !initialPlaySavedRef.current &&
      ct >= 3 &&
      lastSavedLessonRef.current !== activeLesson.id
    ) {
      initialPlaySavedRef.current = true;
      void saveCurrentSession(false);
    }

    if (total > 0 && ct / total >= 0.8 && activeLesson) {
      void markLessonComplete(activeLesson.id);
    }
  };

  const handleVideoPause = () => {
    if (videoRef.current?.ended || isRestoringRef.current) return;
    void saveCurrentSession(false);
  };

  const handleVideoEnded = () => {
    const lesson = currentLessonRef.current;
    if (!lesson) return;
    if (!completedLessonIdsRef.current.includes(lesson.id)) {
      void markLessonComplete(lesson.id);
    } else {
      void saveCurrentSession(true, {
        lesson,
        pos: durationRef.current || currentTimeRef.current,
        dur: durationRef.current,
        watched: Math.max(
          durationRef.current,
          currentTimeRef.current,
          maxWatchedRef.current,
        ),
      });
    }
  };

  // ── Notes Operations (Integrated with /api/student_notes) ──

  // Add Note (POST /api/student_notes)
  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !courseId) return;
    setSavingNote(true);

    try {
      const content = newNoteContent.trim();
      const timestamp = Math.floor(currentTime);
      const lessonTitle = currentLesson?.title?.replace(/^Lesson \d+:\s*/, "") || course?.title || "Note";
      const moduleId = currentLesson?.moduleId;
      const lessonId = currentLesson?.id;

      const res = await notesService.create({
        courseId,
        moduleId: moduleId || undefined,
        lessonId: lessonId || undefined,
        title: lessonTitle,
        content,
        timestamp,
      });

      if (res.success && res.data) {
        const createdNote: KidzNote = {
          id: String(res.data.id),
          lessonId: res.data.lessonId || lessonId || "",
          moduleId: res.data.moduleId || moduleId || "",
          title: res.data.title || lessonTitle,
          timestamp: res.data.timestamp ?? timestamp,
          content: res.data.content,
          createdAt: res.data.createdAt,
        };

        setNotes((prev) => [createdNote, ...prev.filter((n) => n.id !== createdNote.id)]);
        setNewNoteContent("");
        toast.success(`Note saved at ${formatSeconds(timestamp)} ⭐`);
      } else {
        toast.error("Could not save note. Please try again.");
      }
    } catch (err: any) {
      console.error("Error creating student note:", err);
      toast.error(err?.message || "Could not save note.");
    } finally {
      setSavingNote(false);
    }
  };

  // Delete Note (DELETE /api/student_notes/{noteId})
  const handleDeleteNote = async (noteId: string) => {
    const previous = notes;
    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    try {
      await notesService.remove(noteId);
      toast.message("Note deleted");
    } catch (err: any) {
      console.error("Error deleting student note:", err);
      setNotes(previous);
      toast.error(err?.message || "Could not delete note.");
    }
  };

  // Update Note (PUT /api/student_notes/{noteId})
  const handleUpdateNote = async (noteId: string) => {
    if (!editingNoteContent.trim()) return;
    setSavingNote(true);

    try {
      const existing = notes.find((n) => n.id === noteId);
      const res = await notesService.update(noteId, {
        title: existing?.title || "Note",
        content: editingNoteContent.trim(),
        timestamp: existing?.timestamp ?? 0,
      });

      if (res.success && res.data) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId ? { ...n, content: res.data.content } : n
          )
        );
        setEditingNoteId(null);
        setEditingNoteContent("");
        toast.success("Note updated");
      }
    } catch (err: any) {
      console.error("Error updating note:", err);
      toast.error(err?.message || "Could not update note.");
    } finally {
      setSavingNote(false);
    }
  };

  // Start Module Quiz
  const handleStartQuiz = (mod: KidzModule) => {
    if (!mod.quizId && !mod.quizTitle) return;
    setActiveQuizTitle(mod.quizTitle || `${mod.title} Quiz`);
    setActiveQuizId(mod.quizId);
    setQuizOpen(true);
  };

  // Real Learning Outcomes from API ONLY (no dummy fallback)
  const whatYoullLearnPoints: string[] = useMemo(() => {
    const raw =
      course?.whatYouWillLearn ||
      course?.whatYoullLearn ||
      course?.learningOutcomes ||
      course?.objectives;

    if (Array.isArray(raw)) {
      return raw.filter((item) => typeof item === "string" && item.trim().length > 0);
    }
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, [course]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="size-10 animate-spin text-blue-600" />
        <p className="text-sm font-bold text-slate-700">Loading your course studio...</p>
      </div>
    );
  }

  const hasLessons = totalLessons > 0;
  const hasModules = modules.length > 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-20">
      {/* ── TOP HEADER ── */}
      <div>
        <Link
          to={`/kidz/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors mb-2"
        >
          <ChevronLeft className="size-4 stroke-[3]" />
          BACK TO COURSE
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {course?.title || "Course Player"}
        </h1>

        {/* Course Completion Card */}
        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-600">
            <span>Course Completion</span>
            <span className="font-black text-slate-900">{progressPercentage}%</span>
          </div>
          <div className="mt-2.5 h-3 w-full rounded-full bg-purple-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN MAIN CONTENT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── LEFT COLUMN (Video & Content) ── */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Current Lesson Header or Course Header */}
          {hasLessons && currentLesson ? (
            <div>
              <p className="text-xs font-extrabold text-blue-600 tracking-wide uppercase">
                Lesson {(currentLessonIndex + 1).toString().padStart(2, "0")} From{" "}
                {totalLessons.toString().padStart(2, "0")}
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {currentLesson.title}
              </h2>
              {currentLesson.description && (
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 leading-relaxed">
                  {currentLesson.description}
                </p>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {course?.title || "Course Overview"}
              </h2>
              {course?.description && (
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 leading-relaxed">
                  {course.description}
                </p>
              )}
            </div>
          )}

          {/* Video Player or Empty State (No hardcoded video fallback) */}
          {resolvedMedia.videoUrl ? (
            <div className="rounded-2xl overflow-hidden shadow-sm bg-black border border-slate-200 aspect-video relative">
              <LessonVideoPlayer
                ref={videoRef}
                videoUrl={resolvedMedia.videoUrl}
                poster={resolvedMedia.poster}
                captionsSrc={resolvedMedia.captionsSrc}
                onTimeUpdate={handleTimeUpdate}
                onPause={handleVideoPause}
                onEnded={handleVideoEnded}
              />
              {isRestoringSession && (
                <div className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  Syncing progress...
                </div>
              )}
            </div>
          ) : (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 flex flex-col items-center justify-center text-center p-6 border border-slate-200 shadow-sm">
              {course?.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="absolute inset-0 size-full object-cover opacity-25"
                />
              ) : null}
              <div className="relative z-10 max-w-md space-y-2 text-white">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/10 backdrop-blur-md">
                  <VideoOff className="size-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-black">No Video Available</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The instructor has not added modules or uploaded a video for this course yet.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Controls below Video (only if lessons exist) */}
          {hasLessons && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentLessonIndex === 0}
                onClick={() => {
                  if (currentLessonIndex > 0) {
                    selectLesson(allLessons[currentLessonIndex - 1]);
                  }
                }}
                className="rounded-full text-xs font-bold"
              >
                ‹ Previous Lesson
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  if (currentLesson) {
                    void markLessonComplete(currentLesson.id);
                  }
                }}
                className={cn(
                  "rounded-full text-xs font-extrabold shadow-sm transition-all",
                  currentLesson && completedLessonIds.includes(currentLesson.id)
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
              >
                {currentLesson && completedLessonIds.includes(currentLesson.id) ? (
                  <>
                    <Check className="mr-1.5 size-3.5 stroke-[3]" /> Completed
                  </>
                ) : (
                  "Mark as Completed"
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={!nextLesson}
                onClick={() => {
                  if (nextLesson) selectLesson(nextLesson);
                }}
                className="rounded-full text-xs font-bold"
              >
                Next Lesson ›
              </Button>
            </div>
          )}

          {/* ── TABS (Overview, Notes, Announcement) ── */}
          <div className="mt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start rounded-none p-0 h-auto gap-8">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent px-1 py-3 text-sm font-extrabold text-slate-500 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className="rounded-none border-b-2 border-transparent px-1 py-3 text-sm font-extrabold text-slate-500 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
                >
                  Notes ({notes.length})
                </TabsTrigger>
                <TabsTrigger
                  value="announcement"
                  className="rounded-none border-b-2 border-transparent px-1 py-3 text-sm font-extrabold text-slate-500 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
                >
                  Announcement {announcements.length > 0 ? `(${announcements.length})` : ""}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab Content */}
              <TabsContent value="overview" className="pt-6 space-y-6">
                <div className="space-y-3 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
                  {course?.description ? (
                    <p>{course.description}</p>
                  ) : (
                    <p className="text-slate-400">No description provided for this course.</p>
                  )}
                </div>

                {/* What you'll Learn (Rendered ONLY if provided by API) */}
                {whatYoullLearnPoints.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-slate-900 mb-3">What you&apos;ll Learn</h3>
                    <div className="space-y-2.5">
                      {whatYoullLearnPoints.map((point: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700"
                        >
                          <div className="grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                            <Check className="size-3 stroke-[3]" />
                          </div>
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Notes Tab Content */}
              <TabsContent value="notes" className="pt-6 space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>
                      {duration > 0
                        ? `Take a Note at ${formatSeconds(currentTime)}`
                        : "Take a Note"}
                    </span>
                    <span className="text-blue-600 font-semibold">Synced to Edvanz Cloud</span>
                  </div>
                  <Textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Type your notes here... (e.g. key point to remember)"
                    className="resize-none text-xs rounded-xl border-slate-200"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={savingNote || !newNoteContent.trim()}
                      className="rounded-full bg-blue-600 text-white font-bold text-xs gap-1.5 hover:bg-blue-700"
                    >
                      {savingNote ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5 stroke-[3]" />
                      )}
                      Add Note
                    </Button>
                  </div>
                </div>

                {/* Notes List */}
                <div className="space-y-3">
                  {notes.length === 0 ? (
                    <p className="text-center py-8 text-xs font-semibold text-slate-400">
                      No notes yet for this course. Start jotting down your creative ideas!
                    </p>
                  ) : (
                    notes.map((note) => {
                      const isEditing = editingNoteId === note.id;

                      return (
                        <div
                          key={note.id}
                          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-200 transition-colors space-y-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {note.timestamp > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (videoRef.current && Number.isFinite(note.timestamp)) {
                                      videoRef.current.currentTime = note.timestamp;
                                      videoRef.current.play().catch(() => {});
                                    }
                                  }}
                                  className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 hover:bg-blue-100 transition-colors shrink-0"
                                >
                                  ▶ {formatSeconds(note.timestamp)}
                                </button>
                              ) : null}
                              <p className="font-bold text-xs text-slate-800 truncate">
                                {note.title || "Note"}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isEditing ? (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateNote(note.id)}
                                  disabled={savingNote || !editingNoteContent.trim()}
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-100"
                                >
                                  <Save className="size-3" /> Save
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNoteId(note.id);
                                    setEditingNoteContent(note.content);
                                  }}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                  aria-label="Edit note"
                                >
                                  <Edit2 className="size-3.5" />
                                </button>
                              )}

                              {isEditing ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setEditingNoteContent("");
                                  }}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                  aria-label="Cancel edit"
                                >
                                  <X className="size-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNote(note.id)}
                                  aria-label="Delete note"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="pt-1">
                              <Textarea
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                className="min-h-[70px] text-xs rounded-xl border-slate-200"
                                rows={2}
                              />
                            </div>
                          ) : (
                            <p className="text-xs font-medium text-slate-600 whitespace-pre-wrap break-words leading-relaxed pl-1">
                              {note.content}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              {/* Announcement Tab Content */}
              <TabsContent value="announcement" className="pt-6 space-y-4">
                {announcements.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Megaphone className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      No announcements posted yet
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Announcements from your instructor will appear here.
                    </p>
                  </div>
                ) : (
                  announcements.map((ann, idx) => {
                    const displayTitle =
                      ann.title ||
                      deriveTitle(ann.htmlContent || (ann as any).content || "") ||
                      "Announcement";
                    const displayDate = ann.createdAt
                      ? new Date(ann.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "";

                    return (
                      <div
                        key={ann.id || idx}
                        className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3 transition hover:border-blue-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                              <Megaphone className="h-4 w-4" />
                            </div>
                            <h4 className="text-sm font-extrabold text-slate-900 break-words line-clamp-2">
                              {displayTitle}
                            </h4>
                          </div>
                          {displayDate && (
                            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                              {displayDate}
                            </span>
                          )}
                        </div>

                        {ann.htmlContent ? (
                          <AnnouncementHtml
                            html={ann.htmlContent}
                            className="text-xs font-medium text-slate-600 leading-relaxed"
                          />
                        ) : (
                          <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {(ann as any).content || (ann as any).message || ""}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* ── RIGHT COLUMN (Course Content & Next Lesson) ── */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-20">
          {/* Course Content Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Course Content</h3>
              {hasLessons && (
                <span className="text-xs font-bold text-slate-400">
                  {totalLessons} {totalLessons === 1 ? "Lesson" : "Lessons"}
                </span>
              )}
            </div>

            {hasModules ? (
              <div className="space-y-3">
                {modules.map((mod) => {
                  const isOpen = !!openModules[mod.id];
                  const modLessons = mod.lessons || [];

                  return (
                    <div key={mod.id} className="rounded-2xl overflow-hidden border border-slate-100">
                      {/* Module Accordion Header */}
                      <button
                        type="button"
                        onClick={() => toggleModule(mod.id)}
                        className={cn(
                          "flex w-full items-center justify-between px-4 py-3 text-xs sm:text-sm font-extrabold transition-colors",
                          isOpen
                            ? "bg-blue-50/80 text-blue-900"
                            : "bg-slate-50/80 hover:bg-slate-100 text-slate-800"
                        )}
                      >
                        <span>{mod.title}</span>
                        {isOpen ? (
                          <ChevronUp className="size-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="size-4 text-slate-500" />
                        )}
                      </button>

                      {/* Module Lessons List */}
                      {isOpen && (
                        <div className="p-3 bg-white space-y-2">
                          {modLessons.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic py-2 text-center">
                              No lessons in this module yet.
                            </p>
                          ) : (
                            modLessons.map((lesson) => {
                              const isActive = currentLesson?.id === lesson.id;
                              const isDone = completedLessonIds.includes(lesson.id);

                              return (
                                <button
                                  key={lesson.id}
                                  type="button"
                                  onClick={() => selectLesson(lesson)}
                                  className={cn(
                                    "flex w-full items-center justify-between gap-2.5 rounded-xl border p-2.5 text-left text-xs transition-all",
                                    isActive
                                      ? "border-blue-500 bg-blue-50/40 font-bold text-blue-700 shadow-2xs"
                                      : "border-slate-100 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {isDone ? (
                                      <div className="grid size-4 place-items-center rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                                        <Check className="size-2.5 stroke-[3]" />
                                      </div>
                                    ) : isActive ? (
                                      <div className="grid size-4 place-items-center rounded-full bg-blue-600 text-white shrink-0">
                                        <Play className="size-2 fill-white ml-0.5" />
                                      </div>
                                    ) : (
                                      <div className="size-4 rounded-full border border-slate-300 shrink-0" />
                                    )}
                                    <span className="truncate">{lesson.title}</span>
                                  </div>
                                  {lesson.duration ? (
                                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                      {lesson.duration}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })
                          )}

                          {/* Start Quiz Button (rendered ONLY if module has a real quiz) */}
                          {mod.quizId && (
                            <button
                              type="button"
                              onClick={() => handleStartQuiz(mod)}
                              className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-extrabold text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50/50 group"
                            >
                              <span className="group-hover:text-blue-600 transition-colors">Start Quiz</span>
                              <div className="grid size-6 place-items-center rounded-full bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                                <Play className="size-3 fill-white ml-0.5" />
                              </div>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center space-y-2">
                <div className="mx-auto grid size-10 place-items-center rounded-full bg-blue-50 text-blue-600">
                  <BookOpen className="size-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">No content available yet</p>
                <p className="text-[11px] text-slate-400">
                  The instructor has not added modules to this course yet.
                </p>
              </div>
            )}
          </div>

          {/* Next Lesson Preview Card (Rendered ONLY if nextLesson actually exists) */}
          {nextLesson && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-2xl overflow-hidden bg-amber-50 border border-amber-100 shrink-0">
                  <img
                    src={course?.thumbnailUrl || heroBooksImg}
                    alt={nextLesson.title}
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-slate-900 truncate">{nextLesson.title}</h4>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                    Next Up
                  </p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Lesson {(currentLessonIndex + 2).toString().padStart(2, "0")} - {totalLessons}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => selectLesson(nextLesson)}
                className="w-full rounded-2xl bg-blue-600 py-3 text-xs font-extrabold text-white shadow-md hover:bg-blue-700 active:scale-[0.99] transition-all"
              >
                Preview Lesson
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── QUIZ DIALOG ── */}
      <KidzQuizDialog
        quizId={activeQuizId}
        title={activeQuizTitle}
        open={quizOpen}
        onOpenChange={(open) => {
          setQuizOpen(open);
          if (!open) {
            void refreshCourseProgress();
          }
        }}
      />
    </div>
  );
}

export default KidzCoursePlayer;
