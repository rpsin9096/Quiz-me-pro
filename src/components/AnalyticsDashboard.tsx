import { useState, useEffect } from "react";
import {
  Clock,
  TrendingUp,
  Brain,
  Calendar,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { AttemptRecord } from "@/types";
import { storageService } from "@/lib/storage";

export function AnalyticsDashboard() {
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const data = storageService.getAttempts();
    setAttempts(data);
    setIsLoading(false);
  }, []);

  const totalExams = attempts.filter((a) => a.mode === "exam").length;
  const passedExams = attempts.filter((a) => a.mode === "exam" && a.passed).length;
  const passRate = totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0;
  const totalScore = attempts.reduce((acc, a) => acc + a.score, 0);
  const avgScore = attempts.length > 0 ? Math.round(totalScore / attempts.length) : 0;
  const totalTimeSeconds = attempts.reduce((acc, a) => acc + a.timeSpentSeconds, 0);
  const totalTimeMinutes = Math.round(totalTimeSeconds / 60);

  // Group by category
  const categoryStats = attempts.reduce((acc, a) => {
    const cat = a.quizCategory || "General";
    if (!acc[cat]) {
      acc[cat] = { count: 0, totalScore: 0 };
    }
    acc[cat].count += 1;
    acc[cat].totalScore += a.score;
    return acc;
  }, {} as Record<string, { count: number; totalScore: number }>);

  return (
    <div id="analytics-dashboard" className="max-w-5xl mx-auto px-4 py-6 sm:py-10 animate-in fade-in duration-200">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Performance & Learning Analytics
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Detailed metrics tracking your exam scores, study consistency, and retention progression.
        </p>
      </div>

      {/* Hero Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
        <div id="metric-card-passrate" className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Exam Pass Rate
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">{passRate}%</div>
          <p className="text-xs text-slate-500">
            {passedExams} of {totalExams} tests passed
          </p>
        </div>

        <div id="metric-card-avgscore" className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Average Score
            </span>
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">{avgScore}%</div>
          <p className="text-xs text-slate-500">Across {attempts.length} attempts</p>
        </div>

        <div id="metric-card-time" className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Study Time
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">{totalTimeMinutes}m</div>
          <p className="text-xs text-slate-500">Total active testing time</p>
        </div>

        <div id="metric-card-sessions" className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Sessions
            </span>
            <Brain className="w-5 h-5 text-violet-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">{attempts.length}</div>
          <p className="text-xs text-slate-500">Practice + Timed tests</p>
        </div>
      </div>

      {/* Two Column Section: Category Breakdown + Recent Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Mastery by Domain</span>
          </h3>

          <div className="space-y-4">
            {Object.keys(categoryStats).length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No test data recorded yet.</p>
            ) : (
              Object.entries(categoryStats).map(([cat, stat]: [string, { count: number; totalScore: number }]) => {
                const avgCat = Math.round(stat.totalScore / stat.count);
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{cat}</span>
                      <span className="text-indigo-600 font-bold">{avgCat}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${avgCat}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Attempts Log */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span>Recent Test History</span>
          </h3>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading history...</div>
          ) : attempts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No sessions completed yet. Take an exam or practice a deck!
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.slice(0, 8).map((att) => {
                const dateStr = new Date(att.completedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                });
                const mins = Math.floor(att.timeSpentSeconds / 60);
                const secs = att.timeSpentSeconds % 60;

                return (
                  <div
                    key={att.id}
                    id={`attempt-row-${att.id}`}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm line-clamp-1">
                          {att.quizTitle}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            att.mode === "exam"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {att.mode}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {dateStr} • {mins}m {secs}s • {att.correctCount}/{att.totalQuestions} correct
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-sm font-extrabold ${
                          att.passed ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {att.score}%
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          att.passed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {att.passed ? "Passed" : "Failed"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
