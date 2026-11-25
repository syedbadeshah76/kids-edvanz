import { useCallback, useEffect, useRef, useState } from "react";

import { coursesService } from "@/services/kidz/courses.service";
import type { LessonSessionDTO } from "@/types/kidz/api.types";

export function useLessonSession(lessonId?: string) {
  const [session, setSession] = useState<LessonSessionDTO | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);

  const lastSavedPositionRef = useRef(0);
  const lastSavedWatchedRef = useRef(0);

  // Load existing session state when lessonId changes
  useEffect(() => {
    if (!lessonId) return;

    let mounted = true;
    coursesService
      .getLessonSession(lessonId)
      .then((data) => {
        if (!mounted) return;
        setSession(data);
        setIsCompleted(data.completed);
        setProgressPercentage(data.progressPercentage);
        lastSavedPositionRef.current = data.lastPositionSeconds;
        lastSavedWatchedRef.current = data.watchedSeconds;
      })
      .catch(() => {
        // First time opening lesson, start fresh session
        if (!mounted) return;
        setSession(null);
        setIsCompleted(false);
        setProgressPercentage(0);
      });

    return () => {
      mounted = false;
    };
  }, [lessonId]);

  /**
   * Save playback progress to backend
   * If progress >= 80%, completed is marked true
   */
  const saveProgress = useCallback(
    async (currentSeconds: number, totalDurationSeconds: number, playbackRate = 1.0) => {
      if (!lessonId || totalDurationSeconds <= 0) return;

      const calculatedPercent = Math.min(
        100,
        Math.max(0, Math.round((currentSeconds / totalDurationSeconds) * 100)),
      );

      const watchedSeconds = Math.max(
        lastSavedWatchedRef.current,
        Math.floor(currentSeconds),
      );

      try {
        const updated = await coursesService.saveLessonSession(lessonId, {
          lastPositionSeconds: Math.floor(currentSeconds),
          watchedSeconds,
          playbackRate,
          progressPercentage: calculatedPercent,
        });

        setSession(updated);
        setProgressPercentage(updated.progressPercentage);
        if (updated.completed) {
          setIsCompleted(true);
        }
        lastSavedPositionRef.current = updated.lastPositionSeconds;
        lastSavedWatchedRef.current = updated.watchedSeconds;
      } catch (err) {
        console.warn("Failed to persist lesson session:", err);
      }
    },
    [lessonId],
  );

  return {
    session,
    isCompleted,
    progressPercentage,
    saveProgress,
  };
}
