"use client";

import React, { useMemo, useState } from "react";
import {
  Flame,
  Calendar,
  Award,
  TrendingUp,
  CheckCircle2,
  Moon,
  Dumbbell,
  Utensils,
} from "lucide-react";
import type {
  MealLog,
  WorkoutLog,
  SleepLog,
  BodyMetricLog,
  ActivityLog,
} from "@/lib/db/schema";
import type { UserGoalsAndSettings } from "@/lib/settings";

interface ActivityHeatmapAndReportProps {
  meals: MealLog[];
  workouts: WorkoutLog[];
  sleepLogs: SleepLog[];
  bodyMetrics: BodyMetricLog[];
  activities: ActivityLog[];
  settings: UserGoalsAndSettings;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

type HeatmapMode = "overall" | "workout" | "nutrition" | "sleep";

export function ActivityHeatmapAndReport({
  meals,
  workouts,
  sleepLogs,
  bodyMetrics,
  activities,
  settings,
  selectedDate,
  onSelectDate,
}: ActivityHeatmapAndReportProps) {
  const [mode, setMode] = useState<HeatmapMode>("overall");

  // 過去28日間（4週間）の日次達成スコア＆サマリーを構築
  const calendarDays = useMemo(() => {
    const today = new Date();
    const mealByDate: Record<string, { cal: number; p: number }> = {};
    for (const m of meals) {
      if (!mealByDate[m.date]) mealByDate[m.date] = { cal: 0, p: 0 };
      mealByDate[m.date].cal += m.calories;
      mealByDate[m.date].p += m.protein;
    }

    const workoutByDate: Record<string, { cal: number; min: number; count: number }> = {};
    for (const w of workouts) {
      if (!workoutByDate[w.date]) workoutByDate[w.date] = { cal: 0, min: 0, count: 0 };
      workoutByDate[w.date].cal += w.caloriesBurned;
      workoutByDate[w.date].min += w.durationMinutes;
      workoutByDate[w.date].count += 1;
    }

    const sleepByDate = Object.fromEntries(sleepLogs.map((s) => [s.date, s]));
    const actByDate = Object.fromEntries(activities.map((a) => [a.date, a]));

    const result: Array<{
      date: string;
      shortDate: string;
      dayOfWeek: string;
      overallLevel: 0 | 1 | 2 | 3 | 4;
      workoutLevel: 0 | 1 | 2 | 3 | 4;
      nutritionLevel: 0 | 1 | 2 | 3 | 4;
      sleepLevel: 0 | 1 | 2 | 3 | 4;
      readiness: number;
      workoutCal: number;
      steps: number;
      calories: number;
      protein: number;
      sleepHours: number;
    }> = [];

    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;

      const meal = mealByDate[dateStr] ?? { cal: 0, p: 0 };
      const wk = workoutByDate[dateStr] ?? { cal: 0, min: 0, count: 0 };
      const slp = sleepByDate[dateStr];
      const act = actByDate[dateStr];

      const steps = act?.steps ?? 0;
      const readiness = act?.readinessScore ?? 0;
      const sleepHours = slp?.durationHours ?? 0;

      // 1. 運動レベル (0-4)
      let workoutLevel: 0 | 1 | 2 | 3 | 4 = 0;
      const activeScore = wk.cal + (steps >= settings.targetSteps ? 200 : steps * 0.02);
      if (activeScore >= 480) workoutLevel = 4;
      else if (activeScore >= 340) workoutLevel = 3;
      else if (activeScore >= 200) workoutLevel = 2;
      else if (activeScore > 50) workoutLevel = 1;

      // 2. 栄養＆PFC達成レベル (0-4)
      let nutritionLevel: 0 | 1 | 2 | 3 | 4 = 0;
      if (meal.cal > 0) {
        const calDiffRatio = Math.abs(meal.cal - settings.targetCalories) / settings.targetCalories;
        const proteinRatio = meal.p / settings.targetProteinG;
        if (calDiffRatio <= 0.12 && proteinRatio >= 0.9) nutritionLevel = 4;
        else if (calDiffRatio <= 0.2 && proteinRatio >= 0.75) nutritionLevel = 3;
        else if (calDiffRatio <= 0.3) nutritionLevel = 2;
        else nutritionLevel = 1;
      }

      // 3. 睡眠レベル (0-4)
      let sleepLevel: 0 | 1 | 2 | 3 | 4 = 0;
      if (sleepHours > 0) {
        if (sleepHours >= settings.targetSleepHours) sleepLevel = 4;
        else if (sleepHours >= settings.targetSleepHours - 0.6) sleepLevel = 3;
        else if (sleepHours >= 6.2) sleepLevel = 2;
        else sleepLevel = 1;
      }

      // 4. 総合コンディション＆習慣レベル (0-4)
      const avgLv = Math.round((workoutLevel + nutritionLevel + sleepLevel) / 3) as
        | 0
        | 1
        | 2
        | 3
        | 4;

      result.push({
        date: dateStr,
        shortDate: `${Number(m)}/${Number(day)}`,
        dayOfWeek: weekdays[d.getDay()],
        overallLevel: avgLv,
        workoutLevel,
        nutritionLevel,
        sleepLevel,
        readiness,
        workoutCal: wk.cal,
        steps,
        calories: meal.cal,
        protein: Math.round(meal.p),
        sleepHours,
      });
    }

    return result;
  }, [meals, workouts, sleepLogs, activities, settings]);

  // 直近7日間 vs 前週7日間の週間ハイライト比較
  const weeklyReport = useMemo(() => {
    const last7 = calendarDays.slice(-7);
    const prev7 = calendarDays.slice(-14, -7);

    const avg = (arr: typeof last7, fn: (x: (typeof last7)[0]) => number) =>
      arr.length ? arr.reduce((s, x) => s + fn(x), 0) / arr.length : 0;

    const avgReadiness7 = Math.round(avg(last7, (d) => d.readiness || 80));
    const prevReadiness7 = Math.round(avg(prev7, (d) => d.readiness || 78));

    const avgSteps7 = Math.round(avg(last7, (d) => d.steps));
    const avgProtein7 = Math.round(avg(last7, (d) => d.protein));
    const avgSleep7 = Number(avg(last7, (d) => d.sleepHours).toFixed(1));
    const workoutDays7 = last7.filter((d) => d.workoutCal > 0).length;

    // 7日間の体重変化
    const sortedWeights = [...bodyMetrics].sort((a, b) => a.date.localeCompare(b.date));
    const recentWeights = sortedWeights.slice(-7);
    const weightChange7d =
      recentWeights.length >= 2
        ? Number(
            (
              recentWeights[recentWeights.length - 1].weightKg -
              recentWeights[0].weightKg
            ).toFixed(2)
          )
        : 0;

    return {
      avgReadiness7,
      readinessDiff: avgReadiness7 - prevReadiness7,
      avgSteps7,
      avgProtein7,
      avgSleep7,
      workoutDays7,
      weightChange7d,
    };
  }, [calendarDays, bodyMetrics]);

  const getLevelColorClass = (level: 0 | 1 | 2 | 3 | 4) => {
    if (mode === "workout") {
      return [
        "bg-slate-900 border-slate-800 text-slate-500",
        "bg-rose-950/60 border-rose-800/50 text-rose-300",
        "bg-rose-800/50 border-rose-600/60 text-rose-200",
        "bg-rose-600/70 border-rose-500 text-white",
        "bg-rose-500 border-rose-300 text-slate-950 font-extrabold shadow-lg shadow-rose-500/25",
      ][level];
    }
    if (mode === "nutrition") {
      return [
        "bg-slate-900 border-slate-800 text-slate-500",
        "bg-amber-950/60 border-amber-800/50 text-amber-300",
        "bg-amber-800/50 border-amber-600/60 text-amber-200",
        "bg-amber-500/75 border-amber-400 text-slate-950 font-bold",
        "bg-amber-400 border-amber-200 text-slate-950 font-extrabold shadow-lg shadow-amber-500/25",
      ][level];
    }
    if (mode === "sleep") {
      return [
        "bg-slate-900 border-slate-800 text-slate-500",
        "bg-indigo-950/60 border-indigo-800/50 text-indigo-300",
        "bg-indigo-800/50 border-indigo-600/60 text-indigo-200",
        "bg-indigo-600/75 border-indigo-400 text-white font-bold",
        "bg-indigo-400 border-indigo-200 text-slate-950 font-extrabold shadow-lg shadow-indigo-500/25",
      ][level];
    }
    // overall (emerald)
    return [
      "bg-slate-900 border-slate-800 text-slate-500",
      "bg-emerald-950/70 border-emerald-800/50 text-emerald-300",
      "bg-emerald-800/55 border-emerald-600/60 text-emerald-100",
      "bg-emerald-500/75 border-emerald-400 text-slate-950 font-bold",
      "bg-emerald-400 border-emerald-200 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/25",
    ][level];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 7 cols: 28-Day Habit & Activity Calendar Heatmap */}
      <div className="lg:col-span-7 rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-sm flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Calendar className="w-3 h-3" />
                28-Day Consistency Heatmap
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1">
              継続ヒートマップ（日付クリックでタイムトラベル）
            </h3>
          </div>

          {/* Heatmap Mode Filter */}
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { id: "overall", label: "総合", icon: Award },
              { id: "workout", label: "運動", icon: Dumbbell },
              { id: "nutrition", label: "PFC栄養", icon: Utensils },
              { id: "sleep", label: "睡眠", icon: Moon },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id as HeatmapMode)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition ${
                    active
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 7x4 Grid of Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((d) => {
            const level =
              mode === "workout"
                ? d.workoutLevel
                : mode === "nutrition"
                ? d.nutritionLevel
                : mode === "sleep"
                ? d.sleepLevel
                : d.overallLevel;
            const isSelected = d.date === selectedDate;

            return (
              <button
                key={d.date}
                type="button"
                onClick={() => onSelectDate(d.date)}
                title={`${d.date} (${d.dayOfWeek}) | Readiness:${d.readiness} / 摂取:${d.calories}kcal (P:${d.protein}g) / 運動:${d.workoutCal}kcal / 睡眠:${d.sleepHours}h`}
                className={`group relative rounded-2xl p-2.5 border text-left transition transform hover:-translate-y-0.5 ${getLevelColorClass(
                  level
                )} ${
                  isSelected
                    ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between text-[10px] opacity-80">
                  <span>{d.shortDate}</span>
                  <span>{d.dayOfWeek}</span>
                </div>
                <div className="mt-1.5 text-xs font-mono font-bold truncate">
                  {mode === "workout" && `${d.workoutCal}kcal`}
                  {mode === "nutrition" && `P:${d.protein}g`}
                  {mode === "sleep" && `${d.sleepHours}h`}
                  {mode === "overall" && `R:${d.readiness || "--"}`}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>※ セルをクリックするとその日のダッシュボード記録に切り替わります</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">Low</span>
            {[0, 1, 2, 3, 4].map((lv) => (
              <span
                key={lv}
                className={`w-3.5 h-3.5 rounded-md border ${getLevelColorClass(
                  lv as 0 | 1 | 2 | 3 | 4
                )}`}
              />
            ))}
            <span className="text-[11px]">Peak</span>
          </div>
        </div>
      </div>

      {/* Right 5 cols: Weekly Executive Summary Report */}
      <div className="lg:col-span-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                Weekly Performance Digest
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                直近7日間のエグゼクティブレポート
              </h3>
            </div>
            <div className="p-2.5 rounded-2xl bg-teal-500/15 text-teal-300">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80">
              <span className="text-[11px] text-slate-400">週間平均Readiness</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-400">
                  {weeklyReport.avgReadiness7}
                </span>
                <span className="text-xs font-semibold text-teal-300">
                  {weeklyReport.readinessDiff >= 0
                    ? `+${weeklyReport.readinessDiff} pt (前週比)`
                    : `${weeklyReport.readinessDiff} pt`}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80">
              <span className="text-[11px] text-slate-400">週間ワークアウト頻度</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-rose-400">
                  {weeklyReport.workoutDays7}
                </span>
                <span className="text-xs text-slate-400">/ 7日間達成</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80">
              <span className="text-[11px] text-slate-400">平均タンパク質摂取</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-amber-300">
                  {weeklyReport.avgProtein7}g
                </span>
                <span className="text-[11px] text-slate-400">
                  (目標 {settings.targetProteinG}g)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80">
              <span className="text-[11px] text-slate-400">週間平均睡眠 / 歩数</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-indigo-300">
                  {weeklyReport.avgSleep7}h
                </span>
                <span className="text-xs text-slate-400">
                  • {(weeklyReport.avgSteps7 / 1000).toFixed(1)}k歩
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Summary AI Assessment */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-slate-950 to-indigo-500/10 border border-emerald-500/25 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>週間トレンド総評 (直近7日体重変化: {weeklyReport.weightChange7d}kg)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            直近7日間は平均タンパク質 <strong>{weeklyReport.avgProtein7}g</strong>・睡眠{" "}
            <strong>{weeklyReport.avgSleep7}時間</strong> を維持できており、除脂肪体重（筋肉量）を守りながら理想的なペースでコンディションが推移しています。
          </p>
        </div>
      </div>
    </div>
  );
}
