import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Medal, Sparkles, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiClient, unwrapArray } from "@/lib/kidz/kidz-api-client";
import { useAuth } from "@/contexts/kidz/KidzAuthContext";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";

const medals = ["🥇", "🥈", "🥉"];

export interface LeaderboardPlayer {
  rank: number;
  name: string;
  avatar?: string;
  xp: number;
  level: string;
  you?: boolean;
}

export function LeaderboardPage() {
  useDocumentMeta(
    "Leaderboard - EDVANZ",
    "See how your weekly XP stacks up against other learners in your league.",
  );

  const { user, profile } = useAuth();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .get<LeaderboardPlayer[]>("/student/leaderboard")
      .then((res) => unwrapArray<LeaderboardPlayer>(res))
      .then((leaderboardData) => {
        setPlayers(leaderboardData);
      })
      .catch(() => {
        setPlayers([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const studentName = user?.displayName || user?.firstName || profile?.firstName || "Learner";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-12">
      {/* Header */}
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">THIS WEEK</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">Leaderboard</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Resets every Sunday night. Top students keep their crown badge.
        </p>
      </div>

      {/* Student Rank Card */}
      <div className="flex items-center justify-between rounded-3xl border border-blue-300 bg-[#ede9fe] p-5 shadow-sm ring-2 ring-blue-500/20">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-xs">
            🦊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">{studentName}</h3>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-600">
                You
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500">Student Learner</p>
          </div>
        </div>

        <div className="text-sm font-black text-slate-600">
          Ranked Learner
        </div>
      </div>

      {/* Rows List */}
      {players.length > 0 ? (
        <div className="space-y-3.5">
          {players.map((player, index) => (
            <div
              key={`${player.name}-${index}`}
              className={`flex items-center justify-between rounded-3xl border ${
                player.you
                  ? "border-blue-300 bg-[#ede9fe] shadow-sm ring-2 ring-blue-500/20"
                  : "border-[#ddd6fe] bg-[#ede9fe]/70"
              } px-5 py-4 transition-transform hover:-translate-y-0.5`}
            >
              <div className="flex items-center gap-4">
                <span className="w-6 text-center text-xl font-extrabold">
                  {medals[index] ?? player.rank}
                </span>

                <div className="flex size-11 items-center justify-center rounded-full bg-white text-xl shadow-xs">
                  {player.avatar || "🎓"}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">{player.name}</h3>
                    {player.you && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-600">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-400">{player.level}</p>
                </div>
              </div>

              <div className="text-base font-black text-slate-900">
                {player.xp.toLocaleString()} XP
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="grid size-16 place-items-center rounded-2xl bg-purple-50 text-purple-600 mb-3">
            <Trophy className="size-8" />
          </div>
          <h3 className="text-xl font-black text-slate-800">Weekly League Opening Soon</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500 max-w-md">
            Complete your daily lessons, pass quizzes, and earn XP to be ranked on this week&apos;s leaderboard.
          </p>
          <Button asChild className="mt-6 rounded-full bg-blue-600 px-6 font-bold text-white shadow-md hover:bg-blue-700">
            <Link to="/kidz/quizzes">
              <Sparkles className="mr-2 size-4" /> Practice Quizzes
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export const KidzLeaderboard = LeaderboardPage;
export default KidzLeaderboard;
