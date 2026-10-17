"use client";

import React, { useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Sparkles, TrendingUp, ArrowRightLeft } from "lucide-react";
import {
  type MealLog,
  type WorkoutLog,
  type SleepLog,
  type BodyMetricLog,
  type ActivityLog,
  addDaysToDateStr,
} from "@/lib/db/schema";

interface CorrelationAnalyzerProps {
  meals: MealLog[];
  workouts: WorkoutLog[];
  sleepLogs: SleepLog[];
  bodyMetrics: BodyMetricLog[];
  activities: ActivityLog[];
}

type MetricKey =
  | "sleepHours"
  | "nextDayCalories"
  | "sameDayCalories"
  | "workoutCalories"
  | "steps"
  | "readinessScore"
  | "weightKg";

const METRIC_OPTIONS: Record<
  MetricKey,
  { label: string; unit: string; color: string }
> = {
  sleepHours: { label: "睡眠時間", unit: "h", color: "#818cf8" },
  nextDayCalories: { label: "翌日の摂取カロリー", unit: "kcal", color: "#fbbf24" },
  sameDayCalories: { label: "当日の摂取カロリー", unit: "kcal", color: "#f59e0b" },
  workoutCalories: { label: "運動消費カロリー", unit: "kcal", color: "#fb7185" },
  steps: { label: "歩数 (Steps)", unit: "歩", color: "#34d399" },
  readinessScore: { label: "Readinessスコア", unit: "pt", color: "#2dd4bf" },
  weightKg: { label: "体重", unit: "kg", color: "#38bdf8" },
};

function computePearsonR(points: Array<{ x: number; y: number }>): number {
  if (points.length < 3) return 0;
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  return denom === 0 ? 0 : Number((num / denom).toFixed(2));
}

export function CorrelationAnalyzer({
  meals,
  workouts,
  sleepLogs,
  bodyMetrics,
  activities,
}: CorrelationAnalyzerProps) {
  const [xAxisKey, setXAxisKey] = useState<MetricKey>("sleepHours");
  const [yAxisKey, setYAxisKey] = useState<MetricKey>("nextDayCalories");

  const dailyRecords = useMemo(() => {
    const dates = Array.from(
      new Set([
        ...sleepLogs.map((s) => s.date),
        ...bodyMetrics.map((b) => b.date),
        ...activities.map((a) => a.date),
        ...meals.map((m) => m.date),
        ...workouts.map((w) => w.date),
      ])
    ).sort();

    const mealCalByDate: Record<string, number> = {};
    for (const m of meals) {
      mealCalByDate[m.date] = (mealCalByDate[m.date] ?? 0) + m.calories;
    }

    const workoutCalByDate: Record<string, number> = {};
    for (const w of workouts) {
      workoutCalByDate[w.date] = (workoutCalByDate[w.date] ?? 0) + w.caloriesBurned;
    }

    const sleepByDate = Object.fromEntries(sleepLogs.map((s) => [s.date, s]));
    const bodyByDate = Object.fromEntries(bodyMetrics.map((b) => [b.date, b]));
    const actByDate = Object.fromEntries(activities.map((a) => [a.date, a]));

    return dates.map((date) => {
      const actualNextDate = addDaysToDateStr(date, 1);
      return {
        date,
        sleepHours: sleepByDate[date]?.durationHours ?? 0,
        sameDayCalories: mealCalByDate[date] ?? 0,
        nextDayCalories: mealCalByDate[actualNextDate] ?? 0,
        workoutCalories: workoutCalByDate[date] ?? 0,
        steps: actByDate[date]?.steps ?? 0,
        readinessScore: actByDate[date]?.readinessScore ?? 0,
        weightKg: bodyByDate[date]?.weightKg ?? 0,
      };
    });
  }, [meals, workouts, sleepLogs, bodyMetrics, activities]);

  const scatterPoints = useMemo(() => {
    return dailyRecords
      .filter((r) => r[xAxisKey] > 0 && r[yAxisKey] > 0)
      .map((r) => ({
        date: r.date.slice(5),
        x: r[xAxisKey],
        y: r[yAxisKey],
      }));
  }, [dailyRecords, xAxisKey, yAxisKey]);

  const rValue = useMemo(() => computePearsonR(scatterPoints), [scatterPoints]);

  // 自動クロス分析インサイトの算出
  const crossInsightText = useMemo(() => {
    const highSleepDays = dailyRecords.filter((d) => d.sleepHours >= 7.0 && d.nextDayCalories > 0);
    const lowSleepDays = dailyRecords.filter((d) => d.sleepHours > 0 && d.sleepHours < 7.0 && d.nextDayCalories > 0);

    if (highSleepDays.length > 0 && lowSleepDays.length > 0) {
      const avgHighCal =
        highSleepDays.reduce((s, d) => s + d.nextDayCalories, 0) / highSleepDays.length;
      const avgLowCal =
        lowSleepDays.reduce((s, d) => s + d.nextDayCalories, 0) / lowSleepDays.length;

      if (avgHighCal < avgLowCal) {
        const diffPct = Math.round(((avgLowCal - avgHighCal) / avgLowCal) * 100);
        return `睡眠時間が7時間以上の翌日は、7時間未満の日と比べて平均摂取カロリーが約${diffPct}%（${Math.round(avgHighCal)}kcal vs ${Math.round(avgLowCal)}kcal）抑えられており、ホルモンバランスと食欲制御が安定しています。`;
      } else if (avgHighCal > avgLowCal) {
        const diffPct = Math.round(((avgHighCal - avgLowCal) / avgLowCal) * 100);
        return `睡眠時間が7時間以上の翌日は、7時間未満の日と比べて平均摂取カロリーが約${diffPct}%（${Math.round(avgHighCal)}kcal vs ${Math.round(avgLowCal)}kcal）多く、活動量やエネルギー代謝の活発さが反映されています。`;
      } else {
        return `睡眠時間が7時間以上の日と7時間未満の日で、翌日の平均摂取カロリー（${Math.round(avgHighCal)}kcal）に顕著な差は見られません。`;
      }
    }
    return "データが蓄積されるほど、睡眠・運動・栄養の統計的なクロス相関がここに自動抽出されます。";
  }, [dailyRecords]);

  const meanX =
    scatterPoints.length > 0
      ? scatterPoints.reduce((s, p) => s + p.x, 0) / scatterPoints.length
      : 0;
  const meanY =
    scatterPoints.length > 0
      ? scatterPoints.reduce((s, p) => s + p.y, 0) / scatterPoints.length
      : 0;

  return (
    <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-sm flex flex-col justify-between">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-3 h-3" />
              Cross-Metric Correlation Analyzer
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400">
              相関係数 r = {rValue > 0 ? `+${rValue}` : rValue}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-100 mt-1.5">
            自分専用の「掛け合わせ相関アナライザー」
          </h3>
        </div>

        {/* Axis Selectors */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5">
            <span className="text-slate-400 font-mono">X軸:</span>
            <select
              value={xAxisKey}
              onChange={(e) => setXAxisKey(e.target.value as MetricKey)}
              className="bg-transparent text-slate-100 font-medium focus:outline-none"
            >
              {Object.entries(METRIC_OPTIONS).map(([k, v]) => (
                <option key={k} value={k} className="bg-slate-900 text-white">
                  {v.label} ({v.unit})
                </option>
              ))}
            </select>
          </div>

          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />

          <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5">
            <span className="text-slate-400 font-mono">Y軸:</span>
            <select
              value={yAxisKey}
              onChange={(e) => setYAxisKey(e.target.value as MetricKey)}
              className="bg-transparent text-slate-100 font-medium focus:outline-none"
            >
              {Object.entries(METRIC_OPTIONS).map(([k, v]) => (
                <option key={k} value={k} className="bg-slate-900 text-white">
                  {v.label} ({v.unit})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scatter Plot */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="x"
              name={METRIC_OPTIONS[xAxisKey].label}
              unit={METRIC_OPTIONS[xAxisKey].unit}
              domain={["auto", "auto"]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={METRIC_OPTIONS[yAxisKey].label}
              unit={METRIC_OPTIONS[yAxisKey].unit}
              domain={["auto", "auto"]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#475569" }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const pt = payload[0].payload as { date: string; x: number; y: number };
                return (
                  <div className="rounded-xl bg-slate-950/95 border border-slate-800 px-3 py-2 text-xs shadow-xl">
                    <p className="font-semibold text-slate-300 mb-1">日付: {pt.date}</p>
                    <p className="text-indigo-300">
                      {METRIC_OPTIONS[xAxisKey].label}: <strong>{pt.x}</strong>{" "}
                      {METRIC_OPTIONS[xAxisKey].unit}
                    </p>
                    <p className="text-amber-300">
                      {METRIC_OPTIONS[yAxisKey].label}: <strong>{pt.y}</strong>{" "}
                      {METRIC_OPTIONS[yAxisKey].unit}
                    </p>
                  </div>
                );
              }}
            />
            {meanX > 0 && (
              <ReferenceLine x={meanX} stroke="#334155" strokeDasharray="4 4" />
            )}
            {meanY > 0 && (
              <ReferenceLine y={meanY} stroke="#334155" strokeDasharray="4 4" />
            )}
            <Scatter
              name="Daily Correlation"
              data={scatterPoints}
              fill="#818cf8"
              fillOpacity={0.85}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Statistical Insight Banner */}
      <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0 mt-0.5">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-indigo-300 mr-1.5">AI クロス分析インサイト:</span>
          {crossInsightText}
        </div>
      </div>
    </div>
  );
}

