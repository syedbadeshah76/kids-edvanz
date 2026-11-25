import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useKidzAuth } from "@/contexts/kidz/KidzAuthContext";

const STORAGE_KEY = "kidzy-app-state-v1";

type Persisted = {
  favourites: string[];
  enrolled: string[];
  doneChallenges: string[];
  interests: string[];
  profile: {
    name: string;
    avatar: string;
    bio: string;
    age: number;
    email: string;
    preferredSubjects: string[];
    securityAlerts: boolean;
  };
  quizScores: Record<string, number>;
  courseProgress: Record<string, number>;
  reminders: string[];
  readNotifications: string[];
  dismissedNotifications: string[];
};

const getRegisteredStudentAge = (): number => {
  try {
    const raw = localStorage.getItem("kidz_student_age") || localStorage.getItem("edvanz_student_age");
    if (raw && !isNaN(Number(raw)) && Number(raw) > 0) return Number(raw);
    const uStr = localStorage.getItem("Edvanz_user") || localStorage.getItem("edvanz_user");
    if (uStr) {
      const u = JSON.parse(uStr);
      const val = u.age ?? u.studentAge ?? u.profile?.age;
      if (val && !isNaN(Number(val)) && Number(val) > 0) return Number(val);
    }
  } catch {}
  return 10;
};

const defaultState: Persisted = {
  favourites: [],
  enrolled: [],
  doneChallenges: [],
  interests: [],
  profile: {
    name: "Student",
    avatar: "🦊",
    bio: "",
    age: 10,
    email: "",
    preferredSubjects: [],
    securityAlerts: true,
  },
  quizScores: {},
  courseProgress: {},
  reminders: [],
  readNotifications: [],
  dismissedNotifications: [],
};

type AppStateValue = Persisted & {
  toggleFavourite: (id: string) => boolean;
  isFavourite: (id: string) => boolean;
  enroll: (id: string) => void;
  isEnrolled: (id: string) => boolean;
  toggleChallenge: (task: string) => boolean;
  isChallengeDone: (task: string) => boolean;
  toggleInterest: (name: string) => boolean;
  saveProfile: (p: Persisted["profile"]) => void;
  saveProfilePreferences: (p: Persisted["profile"], interests: string[]) => void;
  setQuizScore: (title: string, score: number) => void;
  updateProgress: (courseId: string, pct: number) => void;
  getCourseProgress: (courseId: string) => number;
  toggleReminder: (topic: string) => boolean;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (ids: string[]) => void;
  clearNotifications: (ids: string[]) => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user } = useKidzAuth();
  const userKey = user?.id
    ? `${STORAGE_KEY}_${user.id}`
    : user?.email
    ? `${STORAGE_KEY}_${user.email}`
    : `${STORAGE_KEY}_guest`;

  const [state, setState] = useState<Persisted>(() => {
    try {
      const raw = localStorage.getItem(userKey);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<Persisted>;
        return {
          ...defaultState,
          ...stored,
          profile: { ...defaultState.profile, ...stored.profile },
        };
      }
    } catch {}
    return defaultState;
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(userKey);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<Persisted>;
        setState({
          ...defaultState,
          ...stored,
          profile: { ...defaultState.profile, ...stored.profile },
        });
        return;
      }
      setState(defaultState);
    } catch {
      /* ignore corrupt storage */
    }
  }, [userKey]);

  const persist = useCallback((next: Persisted) => {
    setState(next);
    try {
      localStorage.setItem(userKey, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, [userKey]);

  const value = useMemo<AppStateValue>(() => {
    const toggleList = (list: string[], item: string) =>
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item];

    return {
      ...state,
      isFavourite: (id) => state.favourites.includes(id),
      toggleFavourite: (id) => {
        const next = toggleList(state.favourites, id);
        persist({ ...state, favourites: next });
        return next.includes(id);
      },
      isEnrolled: (id) => state.enrolled.includes(id),
      enroll: (id) => {
        if (state.enrolled.includes(id)) return;
        persist({ ...state, enrolled: [...state.enrolled, id] });
      },
      isChallengeDone: (task) => state.doneChallenges.includes(task),
      toggleChallenge: (task) => {
        const next = toggleList(state.doneChallenges, task);
        persist({ ...state, doneChallenges: next });
        return next.includes(task);
      },
      toggleInterest: (name) => {
        const next = toggleList(state.interests, name);
        persist({ ...state, interests: next });
        return next.includes(name);
      },
      saveProfile: (profile) => persist({ ...state, profile }),
      saveProfilePreferences: (profile, interests) => persist({ ...state, profile, interests }),
      setQuizScore: (title, score) =>
        persist({
          ...state,
          quizScores: {
            ...state.quizScores,
            [title]: Math.max(score, state.quizScores[title] ?? 0),
          },
        }),
      updateProgress: (courseId, pct) =>
        persist({
          ...state,
          courseProgress: {
            ...(state.courseProgress || {}),
            [courseId]: Math.min(100, Math.max(0, Math.round(pct))),
          },
        }),
      getCourseProgress: (courseId) => state.courseProgress?.[courseId] ?? 0,
      toggleReminder: (topic) => {
        const next = toggleList(state.reminders, topic);
        persist({ ...state, reminders: next });
        return next.includes(topic);
      },
      markNotificationRead: (id) => {
        if (state.readNotifications.includes(id)) return;
        persist({ ...state, readNotifications: [...state.readNotifications, id] });
      },
      markAllNotificationsRead: (ids) =>
        persist({ ...state, readNotifications: [...new Set([...state.readNotifications, ...ids])] }),
      clearNotifications: (ids) =>
        persist({ ...state, dismissedNotifications: [...new Set([...state.dismissedNotifications, ...ids])] }),
    };
  }, [state, persist]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
