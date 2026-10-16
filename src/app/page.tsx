"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  Flame,
  Moon,
  Scale,
  Utensils,
  Dumbbell,
  Database,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Zap,
  CheckCircle2,
  HeartPulse,
  Mic,
  TrendingDown,
  Award,
  Trash2,
  Sliders,
  Camera,
} from "lucide-react";
import { db } from "@/lib/db/schema";
import { seedThirtyDaysDemoData } from "@/lib/db/seeder";
import {
  DEFAULT_USER_SETTINGS,
  loadUserSettings,
  saveUserSettings,
  type UserGoalsAndSettings,
} from "@/lib/settings";
import { QuickLogModal, type QuickLogTab } from "@/components/QuickLogModal";
import { CorrelationAnalyzer } from "@/components/CorrelationAnalyzer";
import { DataManagementModal } from "@/components/DataManagementModal";
import { ActivityHeatmapAndReport } from "@/components/ActivityHeatmapAndReport";
import { GoalsAndAiSettingsModal } from "@/components/GoalsAndAiSettingsModal";
import { BioAgeAndMetabolicCard } from "@/components/BioAgeAndMetabolicCard";
import { SleepTrendChartCard } from "@/components/SleepTrendChartCard";

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HealthDashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickLogTab, setQuickLogTab] = useState<QuickLogTab>("ai");
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [settings, setSettings] =
    useState<UserGoalsAndSettings>(DEFAULT_USER_SETTINGS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3800);
  };

  // Load user custom goals & Gemini API key from localStorage
  useEffect(() => {
    setSettings(loadUserSettings());
  }, []);

  const handleSaveUserSettings = (next: UserGoalsAndSettings) => {
    setSettings(next);
    saveUserSettings(next);
    showToast("パーソナル目標とGemini AI設定を保存しました");
  };

  // Live Queries from Dexie.js IndexedDB
  const meals = useLiveQuery(() => db.meals.toArray(), []) ?? [];
  const workouts = useLiveQuery(() => db.workouts.toArray(), []) ?? [];
  const sleepLogs = useLiveQuery(() => db.sleepLogs.toArray(), []) ?? [];
  const bodyMetrics = useLiveQuery(() => db.bodyMetrics.orderBy("date").toArray(), []) ?? [];
  const activities = useLiveQuery(() => db.activities.toArray(), []) ?? [];

  // 初回起動時にデータが空なら自動的に30日分のデモデータをシード
  useEffect(() => {
    let mounted = true;
    async function checkAndAutoSeed() {
      const count = await db.bodyMetrics.count();
      if (count === 0 && mounted) {
        await seedThirtyDaysDemoData();
        if (mounted) {
          showToast("初回起動: 過去30日分のリアルなデモデータをIndexedDBに自動投入しました");
        }
      }
    }
    checkAndAutoSeed();
    return () => {
      mounted = false;
    };
  }, []);

  // 利用可能な日付リスト
  const availableDates = useMemo(() => {
    const set = new Set<string>([
      getTodayDateString(),
      ...bodyMetrics.map((b) => b.date),
      ...sleepLogs.map((s) => s.date),
      ...activities.map((a) => a.date),
    ]);
    return Array.from(set).sort();
  }, [bodyMetrics, sleepLogs, activities]);

  // 選択中の日付のデータ
  const todayMeals = useMemo(
    () => meals.filter((m) => m.date === selectedDate),
    [meals, selectedDate]
  );
  const todayWorkouts = useMemo(
    () => workouts.filter((w) => w.date === selectedDate),
    [workouts, selectedDate]
  );
  const todaySleep = useMemo(
    () => sleepLogs.find((s) => s.date === selectedDate),
    [sleepLogs, selectedDate]
  );
  const todayBody = useMemo(
    () => bodyMetrics.find((b) => b.date === selectedDate),
    [bodyMetrics, selectedDate]
  );
  const todayActivity = useMemo(
    () => activities.find((a) => a.date === selectedDate),
    [activities, selectedDate]
  );

  // 1. Readiness スコア & アドバイス
  const readinessScore = todayActivity?.readinessScore ?? 84;
  const readinessInfo = useMemo(() => {
    if (readinessScore >= 85) {
      return {
        status: "OPTIMAL PEAK",
        color: "#10b981",
        badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        advice:
          "睡眠と自律神経の回復が理想的です。高強度トレーニング（HIITや高重量ストレングス）に最適な1日です。",
      };
    }
    if (readinessScore >= 70) {
      return {
        status: "GOOD BALANCE",
        color: "#38bdf8",
        badgeBg: "bg-sky-500/15 text-sky-300 border-sky-500/30",
        advice:
          "コンディションは安定しています。Zone 2の有酸素運動や標準ボリュームのワークアウトで代謝を高めましょう。",
      };
    }
    return {
      status: "RECOVERY NEEDED",
      color: "#f59e0b",
      badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      advice:
        "睡眠負債または前日の運動疲労が残っています。今日は激しい運動を控え、モビリティストレッチと早めの就寝を優先しましょう。",
    };
  }, [readinessScore]);

  // 2. 体重トレンドグラフ（生データ + 7日間移動平均線）
  const weightChartData = useMemo(() => {
    const sorted = [...bodyMetrics].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((item, idx) => {
      const windowSlice = sorted.slice(Math.max(0, idx - 6), idx + 1);
      const avg7d =
        windowSlice.reduce((sum, cur) => sum + cur.weightKg, 0) / windowSlice.length;
      return {
        date: item.date.slice(5), // MM-DD
        fullDate: item.date,
        rawWeight: item.weightKg,
        movingAvg7d: Number(avg7d.toFixed(2)),
        bodyFat: item.bodyFatPercentage,
      };
    });
  }, [bodyMetrics]);

  const weightDelta30d = useMemo(() => {
    if (weightChartData.length < 2) return 0;
    const first = weightChartData[0].movingAvg7d;
    const last = weightChartData[weightChartData.length - 1].movingAvg7d;
    return Number((last - first).toFixed(1));
  }, [weightChartData]);

  // 3. 今日の栄養＆PFC集計（ユーザー設定の目標値と連動）
  const nutritionSummary = useMemo(() => {
    const totalCal = todayMeals.reduce((s, m) => s + m.calories, 0);
    const totalP = Number(todayMeals.reduce((s, m) => s + m.protein, 0).toFixed(1));
    const totalF = Number(todayMeals.reduce((s, m) => s + m.fat, 0).toFixed(1));
    const totalC = Number(todayMeals.reduce((s, m) => s + m.carbs, 0).toFixed(1));
    return {
      totalCal,
      targetCal: settings.targetCalories,
      totalP,
      targetP: settings.targetProteinG,
      totalF,
      targetF: settings.targetFatG,
      totalC,
      targetC: settings.targetCarbsG,
    };
  }, [todayMeals, settings]);

  // 4. 連続記録ストリーク日数
  const streakDays = useMemo(() => {
    return availableDates.length;
  }, [availableDates]);

  const openQuickModal = (tab: QuickLogTab) => {
    setQuickLogTab(tab);
    setQuickLogOpen(true);
  };

  const shiftSelectedDate = (delta: number) => {
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex === -1) return;
    const nextIdx = Math.max(0, Math.min(availableDates.length - 1, currentIndex + delta));
    setSelectedDate(availableDates[nextIdx]);
  };

  const handleDeleteMeal = async (id?: number) => {
    if (!id) return;
    await db.meals.delete(id);
    showToast("食事ログを削除しました");
  };

  // Readiness SVG Circle constants
  const circleRadius = 64;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset =
    circleCircumference - (readinessScore / 100) * circleCircumference;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 relative overflow-x-hidden">
      {/* Ambient Top Glow */}
      <div className="pointer-events-none fixed inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emerald-500/20 via-sky-500/15 to-indigo-500/20 opacity-60 sm:left-[calc(50%-20rem)] sm:w-[68rem]"
        />
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500/95 text-slate-950 font-bold text-xs shadow-2xl shadow-emerald-950/60"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/75 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <HeartPulse className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  VITAL PULSE
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  PWA • LOCAL-FIRST AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                IndexedDB (Dexie.js) • Multimodal Photo &amp; Voice Lifelog OS
              </p>
            </div>
          </div>

          {/* Date Selector & Streak & Settings/Backup */}
          <div className="flex items-center gap-2">
            {/* Streak Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
              <Award className="w-4 h-4 text-amber-400" />
              <span>{streakDays}日連続記録中</span>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => shiftSelectedDate(-1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="前日"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-semibold text-slate-200 px-2 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => shiftSelectedDate(1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="翌日"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Goals & Gemini API Key Button */}
            <button
              type="button"
              onClick={() => setGoalsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition"
              title="目標PFC・体重・Gemini API設定"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline">目標・AI設定</span>
            </button>

            {/* Demo Seeder & Backup Button */}
            <button
              type="button"
              onClick={() => setDataModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition"
              title="IndexedDBバックアップ・デモデータ再生成"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">DB管理</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Bento Grid Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Row: Bento Grid (Readiness Ring 4 cols + Weight Trend Chart 8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card 1: Today's Readiness Ring (4 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-sm flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Daily Readiness
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  今日のコンディション
                </h2>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${readinessInfo.badgeBg}`}
              >
                {readinessInfo.status}
              </span>
            </div>

            {/* Animated SVG Ring */}
            <div className="my-6 flex items-center justify-center relative">
              <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={circleRadius}
                  stroke="#1e293b"
                  strokeWidth="12"
                  fill="transparent"
                />
                <motion.circle
                  cx="80"
                  cy="80"
                  r={circleRadius}
                  stroke={readinessInfo.color}
                  strokeWidth="12"
                  strokeDasharray={circleCircumference}
                  initial={{ strokeDashoffset: circleCircumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black tracking-tight text-white">
                  {readinessScore}
                </span>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
                  SCORE / 100
                </span>
              </div>
            </div>

            {/* Sub-metrics & AI Recommendation */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/70 flex items-center justify-between">
                  <span className="text-slate-400">睡眠回復</span>
                  <span className="font-bold text-indigo-300">
                    {todaySleep ? `${todaySleep.durationHours}h` : "7.5h"}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/70 flex items-center justify-between">
                  <span className="text-slate-400">活動バランス</span>
                  <span className="font-bold text-emerald-300">
                    {todayActivity ? `${todayActivity.activeMinutes}分` : "55分"}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-emerald-400 mr-1">AI Coach:</span>
                {readinessInfo.advice}
              </div>
            </div>
          </motion.div>

          {/* Card 2: Weight Trend & 7-Day Moving Average Chart (8 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="lg:col-span-8 rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-sm flex flex-col justify-between"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                    Weight &amp; Moving Average Trend
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-300">
                    <TrendingDown className="w-3.5 h-3.5" />
                    30日トレンド {weightDelta30d <= 0 ? `${weightDelta30d}kg` : `+${weightDelta30d}kg`}
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    (目標: {settings.targetWeightKg}kg)
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  体重推移と7日間移動平均線（水分ブレ分離）
                </h2>
              </div>

              {/* Current Metrics Pills */}
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 text-right">
                  <span className="block text-[10px] text-slate-400">本日の体重</span>
                  <span className="text-lg font-extrabold text-sky-400">
                    {todayBody?.weightKg ?? "--"}
                    <span className="text-xs font-normal text-slate-400 ml-0.5">kg</span>
                  </span>
                </div>
                <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 text-right">
                  <span className="block text-[10px] text-slate-400">体脂肪率</span>
                  <span className="text-lg font-extrabold text-indigo-400">
                    {todayBody?.bodyFatPercentage ?? "--"}
                    <span className="text-xs font-normal text-slate-400 ml-0.5">%</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Recharts Composed Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={weightChartData}
                  margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    domain={["dataMin - 0.6", "dataMax + 0.6"]}
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    unit="kg"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as {
                        fullDate: string;
                        rawWeight: number;
                        movingAvg7d: number;
                        bodyFat: number;
                      };
                      return (
                        <div className="rounded-2xl bg-slate-950/95 border border-slate-800 p-3 text-xs shadow-2xl space-y-1">
                          <p className="font-bold text-slate-200">{data.fullDate}</p>
                          <p className="text-sky-300">
                            実測体重 (Raw): <strong>{data.rawWeight} kg</strong>
                          </p>
                          <p className="text-emerald-300">
                            7日移動平均 (Trend): <strong>{data.movingAvg7d} kg</strong>
                          </p>
                          <p className="text-indigo-300">
                            体脂肪率: <strong>{data.bodyFat} %</strong>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={settings.targetWeightKg}
                    stroke="#38bdf8"
                    strokeDasharray="4 4"
                    strokeOpacity={0.45}
                  />
                  <Area
                    type="monotone"
                    dataKey="movingAvg7d"
                    fill="url(#weightAreaGrad)"
                    stroke="none"
                  />
                  {/* Raw Daily Weight Dots */}
                  <Line
                    type="monotone"
                    dataKey="rawWeight"
                    name="実測値"
                    stroke="#475569"
                    strokeWidth={1.25}
                    strokeDasharray="3 3"
                    dot={{ r: 3.5, fill: "#38bdf8", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#38bdf8" }}
                  />
                  {/* 7-Day Moving Average Smooth Line */}
                  <Line
                    type="monotone"
                    dataKey="movingAvg7d"
                    name="7日間移動平均"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                  日次実測値（水分変動あり）
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-1 rounded-full bg-emerald-400 inline-block" />
                  7日間移動平均線（真の体脂肪・体重トレンド）
                </span>
              </div>
              <button
                type="button"
                onClick={() => openQuickModal("body")}
                className="text-sky-400 hover:text-sky-300 font-semibold"
              >
                + 今日の体重を更新 →
              </button>
            </div>
          </motion.div>
        </div>

        {/* Middle Row: Bento Grid (Nutrition & PFC 5 cols + Sleep & Recovery 3 cols + Activity & Workout 4 cols) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 3: Nutrition & PFC Balance (5 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Nutrition &amp; Macros
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    摂取カロリー＆PFCバランス
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openQuickModal("photo")}
                    className="px-2.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>写真AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openQuickModal("meal")}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
                  >
                    + 手入力
                  </button>
                </div>
              </div>

              {/* Total Calorie Progress */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80 mb-4">
                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <span className="text-2xl font-black text-white">
                      {nutritionSummary.totalCal.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">
                      / {nutritionSummary.targetCal.toLocaleString()} kcal
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">
                    残り{" "}
                    {Math.max(
                      0,
                      nutritionSummary.targetCal - nutritionSummary.totalCal
                    ).toLocaleString()}{" "}
                    kcal
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (nutritionSummary.totalCal / nutritionSummary.targetCal) * 100
                        )
                      )}%`,
                    }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400"
                  />
                </div>
              </div>

              {/* PFC Progress Bars */}
              <div className="space-y-3">
                {[
                  {
                    label: "Protein (タンパク質)",
                    current: nutritionSummary.totalP,
                    target: nutritionSummary.targetP,
                    color: "bg-emerald-400",
                    text: "text-emerald-300",
                  },
                  {
                    label: "Fat (脂質)",
                    current: nutritionSummary.totalF,
                    target: nutritionSummary.targetF,
                    color: "bg-amber-400",
                    text: "text-amber-300",
                  },
                  {
                    label: "Carbs (炭水化物)",
                    current: nutritionSummary.totalC,
                    target: nutritionSummary.targetC,
                    color: "bg-sky-400",
                    text: "text-sky-300",
                  },
                ].map((macro) => {
                  const pct = Math.min(100, Math.round((macro.current / macro.target) * 100));
                  return (
                    <div key={macro.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-medium">{macro.label}</span>
                        <span className={`font-bold ${macro.text}`}>
                          {macro.current}g{" "}
                          <span className="text-slate-500 font-normal">/ {macro.target}g</span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${macro.color}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Today's Meals Mini List */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2 max-h-44 overflow-y-auto">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                本日の食事ログ ({todayMeals.length}件)
              </p>
              {todayMeals.length === 0 ? (
                <p className="text-xs text-slate-500">まだ本日の食事記録がありません</p>
              ) : (
                todayMeals.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/60 border border-slate-800/60"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {m.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.imageUrl}
                          alt={m.description}
                          className="w-7 h-7 rounded-lg object-cover shrink-0 border border-slate-700"
                        />
                      )}
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 shrink-0">
                        {m.mealType}
                      </span>
                      <span className="text-slate-200 truncate">{m.description}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-amber-300">{m.calories}kcal</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMeal(m.id)}
                        className="text-slate-500 hover:text-rose-400"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Card 4: Sleep & Recovery Summary (3 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="md:col-span-3 rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Sleep Architecture
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">睡眠＆回復</h3>
                </div>
                <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-400">
                  <Moon className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80 text-center my-2">
                <span className="text-3xl font-black text-indigo-300">
                  {todaySleep?.durationHours ?? 7.5}
                </span>
                <span className="text-sm text-slate-400 ml-1">
                  / {settings.targetSleepHours}h
                </span>
                <div className="mt-2 flex items-center justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`w-2.5 h-2.5 rounded-full ${
                        star <= (todaySleep?.qualityScore ?? 4)
                          ? "bg-indigo-400"
                          : "bg-slate-800"
                      }`}
                    />
                  ))}
                  <span className="text-[11px] text-slate-400 ml-1.5">
                    質 Lv.{todaySleep?.qualityScore ?? 4}/5
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-4 text-xs">
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/70">
                  <span className="block text-[10px] text-slate-400">就寝時刻</span>
                  <span className="text-sm font-bold text-slate-100 mt-0.5 block font-mono">
                    {todaySleep?.bedTime ?? "23:15"}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/70">
                  <span className="block text-[10px] text-slate-400">起床時刻</span>
                  <span className="text-sm font-bold text-slate-100 mt-0.5 block font-mono">
                    {todaySleep?.wakeTime ?? "06:45"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openQuickModal("sleep")}
              className="mt-5 w-full py-2.5 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition"
            >
              睡眠ログを編集
            </button>
          </motion.div>

          {/* Card 5: Activity & Workout Summary (4 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                    Active Energy &amp; Steps
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    運動＆アクティビティ
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => openQuickModal("workout")}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                >
                  + 運動記録
                </button>
              </div>

              {/* Steps & Active Minutes */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <Footprints className="w-4 h-4" />
                    <span>歩数 (Steps)</span>
                  </div>
                  <p className="text-2xl font-black text-white mt-1">
                    {(todayActivity?.steps ?? 8940).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    目標 {settings.targetSteps.toLocaleString()}歩
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                    <Flame className="w-4 h-4" />
                    <span>活動時間</span>
                  </div>
                  <p className="text-2xl font-black text-white mt-1">
                    {todayActivity?.activeMinutes ?? 55}
                    <span className="text-xs font-normal text-slate-400 ml-1">分</span>
                  </p>
                  <p className="text-[11px] text-slate-400">中〜高強度ゾーン</p>
                </div>
              </div>

              {/* Today's Workouts */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  ワークアウトセッション ({todayWorkouts.length}件)
                </p>
                {todayWorkouts.length === 0 ? (
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 text-xs text-slate-400">
                    本日はレストデイ（休養日）または未記録です。
                  </div>
                ) : (
                  todayWorkouts.map((w) => (
                    <div
                      key={w.id}
                      className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-100 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-rose-400" />
                          {w.type}
                        </span>
                        <span className="font-bold text-rose-300">
                          -{w.caloriesBurned} kcal ({w.durationMinutes}分)
                        </span>
                      </div>
                      {w.memo && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">{w.memo}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>総消費アクティブカロリー</span>
              <span className="font-bold text-rose-400">
                {todayWorkouts.reduce((s, w) => s + w.caloriesBurned, 0) +
                  Math.round((todayActivity?.steps ?? 8000) * 0.035)}{" "}
                kcal
              </span>
            </div>
          </motion.div>
        </div>

        {/* Row 2.5: Vital Bio-Age (健康年齢) & BMR vs Intake Calorie Comparison */}
        <BioAgeAndMetabolicCard
          settings={settings}
          currentWeightKg={
            todayBody?.weightKg ??
            bodyMetrics[bodyMetrics.length - 1]?.weightKg ??
            settings.targetWeightKg
          }
          currentBodyFatPct={
            todayBody?.bodyFatPercentage ??
            bodyMetrics[bodyMetrics.length - 1]?.bodyFatPercentage ??
            settings.targetBodyFatPct
          }
          intakeCalories={nutritionSummary.totalCal}
          workoutCalories={todayWorkouts.reduce((s, w) => s + w.caloriesBurned, 0)}
          steps={todayActivity?.steps ?? 8000}
          sleepHours={todaySleep?.durationHours ?? 7.5}
          readinessScore={readinessScore}
          onOpenProfileSettings={() => setGoalsModalOpen(true)}
        />

        {/* Row 2.6: Sleep Duration & 7-Day Moving Average Trend Chart */}
        <SleepTrendChartCard
          sleepLogs={sleepLogs}
          targetSleepHours={settings.targetSleepHours}
          selectedDate={selectedDate}
          onSelectDate={(dateStr) => {
            setSelectedDate(dateStr);
            showToast(`${dateStr} の睡眠・ライフログに切り替えました`);
          }}
          onOpenSleepModal={() => openQuickModal("sleep")}
        />

        {/* Row 3: 28-Day Calendar Heatmap & Weekly Executive Digest */}
        <ActivityHeatmapAndReport
          meals={meals}
          workouts={workouts}
          sleepLogs={sleepLogs}
          bodyMetrics={bodyMetrics}
          activities={activities}
          settings={settings}
          selectedDate={selectedDate}
          onSelectDate={(dateStr) => {
            setSelectedDate(dateStr);
            showToast(`${dateStr} のライフログに切り替えました`);
          }}
        />

        {/* Row 4: Interactive Cross-Metric Correlation Analyzer */}
        <CorrelationAnalyzer
          meals={meals}
          workouts={workouts}
          sleepLogs={sleepLogs}
          bodyMetrics={bodyMetrics}
          activities={activities}
        />
      </main>

      {/* Floating Action Bar (Quick Record Launcher) */}
      <div className="fixed bottom-5 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 p-2 rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl shadow-black/80 backdrop-blur-xl"
        >
          <button
            type="button"
            onClick={() => openQuickModal("ai")}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-950/50 transition"
          >
            <Mic className="w-4 h-4 stroke-[2.5]" />
            <span>音声・AI</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickModal("photo")}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-200 font-bold text-xs transition"
          >
            <Camera className="w-4 h-4 text-teal-300" />
            <span>写真AI</span>
          </button>

          <div className="h-6 w-px bg-slate-800 mx-0.5" />

          <button
            type="button"
            onClick={() => openQuickModal("meal")}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
          >
            <Utensils className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">食事</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickModal("body")}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
          >
            <Scale className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">体重</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickModal("workout")}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
          >
            <Dumbbell className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">運動</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickModal("sleep")}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">睡眠</span>
          </button>
        </motion.div>
      </div>

      {/* Quick Log Modal */}
      <QuickLogModal
        isOpen={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        initialTab={quickLogTab}
        selectedDate={selectedDate}
        settings={settings}
        onSuccess={showToast}
        onOpenAiSettings={() => {
          setQuickLogOpen(false);
          setGoalsModalOpen(true);
        }}
      />

      {/* Custom Goals & Gemini AI Settings Modal */}
      <GoalsAndAiSettingsModal
        isOpen={goalsModalOpen}
        onClose={() => setGoalsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveUserSettings}
      />

      {/* DB Management & JSON Export/Import Modal */}
      <DataManagementModal
        isOpen={dataModalOpen}
        onClose={() => setDataModalOpen(false)}
        onNotify={showToast}
      />
    </div>
  );
}
