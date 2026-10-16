"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Flame,
  UserCheck,
  Scale,
  Sliders,
  Activity,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { calculateMetabolicAndBioAge } from "@/lib/metabolic";
import type { UserGoalsAndSettings } from "@/lib/settings";

interface BioAgeAndMetabolicCardProps {
  settings: UserGoalsAndSettings;
  currentWeightKg: number;
  currentBodyFatPct: number;
  intakeCalories: number;
  workoutCalories: number;
  steps: number;
  sleepHours: number;
  readinessScore: number;
  onOpenProfileSettings: () => void;
}

export function BioAgeAndMetabolicCard({
  settings,
  currentWeightKg,
  currentBodyFatPct,
  intakeCalories,
  workoutCalories,
  steps,
  sleepHours,
  readinessScore,
  onOpenProfileSettings,
}: BioAgeAndMetabolicCardProps) {
  const summary = useMemo(
    () =>
      calculateMetabolicAndBioAge({
        birthDate: settings.birthDate,
        gender: settings.gender,
        heightCm: settings.heightCm,
        weightKg: currentWeightKg,
        bodyFatPercentage: currentBodyFatPct,
        intakeCalories,
        workoutCalories,
        steps,
        sleepHours,
        readinessScore,
      }),
    [
      settings,
      currentWeightKg,
      currentBodyFatPct,
      intakeCalories,
      workoutCalories,
      steps,
      sleepHours,
      readinessScore,
    ]
  );

  const maxBarScale = Math.max(
    2600,
    summary.estimatedTdee + 200,
    summary.intakeCalories + 200,
    summary.personalBmr + 400
  );

  const stdBmrWidth = Math.min(100, Math.round((summary.standardAgeBmr / maxBarScale) * 100));
  const personalBmrWidth = Math.min(100, Math.round((summary.personalBmr / maxBarScale) * 100));
  const tdeeWidth = Math.min(100, Math.round((summary.estimatedTdee / maxBarScale) * 100));
  const intakeWidth = Math.min(100, Math.round((summary.intakeCalories / maxBarScale) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-sm"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
              <Sparkles className="w-3 h-3" />
              Vital Bio-Age &amp; BMR Energy Balance
            </span>
            <span className="text-xs text-slate-400">
              ({settings.gender === "male" ? "男性" : "女性"} • {settings.heightCm}cm • 誕生日:{" "}
              {settings.birthDate})
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            健康年齢（体内年齢）＆ 年齢別基礎代謝 vs 摂取カロリー比較
          </h3>
        </div>

        <button
          type="button"
          onClick={onOpenProfileSettings}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-teal-300 transition"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>誕生日・身長・性別を編集</span>
        </button>
      </div>

      {/* Main Content Grid: Left 5 cols (Vital Bio-Age & LBM) + Right 7 cols (BMR vs Intake Comparison Bars) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Vital Bio-Age Card */}
        <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-950 to-teal-950/30 border border-slate-800/90 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-teal-400" />
                モニタリング健康年齢 (Vital Bio-Age)
              </span>
              <span
                className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                  summary.bioAgeDiff <= 0
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                実年齢比{" "}
                {summary.bioAgeDiff <= 0
                  ? `${summary.bioAgeDiff}歳 若い`
                  : `+${summary.bioAgeDiff}歳`}
              </span>
            </div>

            <div className="my-5 flex items-baseline justify-center gap-6">
              <div className="text-center">
                <span className="block text-[11px] text-slate-400 mb-0.5">健康年齢</span>
                <span className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-sky-300">
                  {summary.vitalBioAge}
                </span>
                <span className="text-sm font-bold text-teal-300 ml-1">歳</span>
              </div>

              <div className="h-10 w-px bg-slate-800" />

              <div className="text-center">
                <span className="block text-[11px] text-slate-400 mb-0.5">実年齢 (満年齢)</span>
                <span className="text-2xl font-bold text-slate-300">
                  {summary.chronologicalAge}
                </span>
                <span className="text-xs text-slate-500 ml-1">歳</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-900/70 border border-slate-800/70">
              <span className="block text-[10px] text-slate-400">除脂肪体重(LBM)</span>
              <span className="font-bold text-sky-300">{summary.leanBodyMassKg} kg</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/70 border border-slate-800/70">
              <span className="block text-[10px] text-slate-400">BMI指数</span>
              <span className="font-bold text-indigo-300">{summary.bmi}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/70 border border-slate-800/70">
              <span className="block text-[10px] text-slate-400">基礎代謝効率</span>
              <span className="font-bold text-emerald-300">
                {summary.bmrDiffFromStandard >= 0
                  ? `平均+${summary.bmrDiffFromStandard}`
                  : `平均${summary.bmrDiffFromStandard}`}
              </span>
            </div>
          </div>
        </div>

        {/* Right: BMR vs Standard Age BMR vs Intake Calories Comparison */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-950/90 border border-slate-800/90 p-5 flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              同年代の基礎代謝・総消費カロリー・本日の摂取カロリー比較
            </span>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border ${
                  summary.calorieBalance <= 0
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                }`}
              >
                {summary.calorieBalance <= 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5" />
                )}
                本日収支:{" "}
                {summary.calorieBalance > 0
                  ? `+${summary.calorieBalance} kcal (余剰)`
                  : `${summary.calorieBalance} kcal (燃焼)`}
              </span>
            </div>
          </div>

          {/* 4 Comparative Progress Bars */}
          <div className="space-y-3 text-xs">
            {/* 1. Standard Age BMR */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">
                  ① 一般的な{summary.chronologicalAge}歳{settings.gender === "male" ? "男性" : "女性"}の標準基礎代謝
                </span>
                <span className="font-mono font-bold text-slate-300">
                  {summary.standardAgeBmr.toLocaleString()} kcal
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                <div
                  style={{ width: `${stdBmrWidth}%` }}
                  className="h-full rounded-full bg-slate-600"
                />
              </div>
            </div>

            {/* 2. Personal BMR */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sky-300 font-medium">
                  ② あなたの推定基礎代謝 (体組成・除脂肪体重反映)
                </span>
                <span className="font-mono font-bold text-sky-300">
                  {summary.personalBmr.toLocaleString()} kcal{" "}
                  <span className="text-[10px] text-emerald-400">
                    ({summary.bmrDiffFromStandard >= 0 ? `+${summary.bmrDiffFromStandard}` : summary.bmrDiffFromStandard} vs 標準)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${personalBmrWidth}%` }}
                  className="h-full rounded-full bg-sky-400"
                />
              </div>
            </div>

            {/* 3. Total Daily Energy Expenditure (TDEE) */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-emerald-300 font-medium">
                  ③ 本日の総消費カロリー (基礎代謝 + 歩数{steps.toLocaleString()}歩 + 運動)
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  {summary.estimatedTdee.toLocaleString()} kcal
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${tdeeWidth}%` }}
                  className="h-full rounded-full bg-emerald-400"
                />
              </div>
            </div>

            {/* 4. Today's Intake Calories */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-amber-300 font-medium">
                  ④ 本日の摂取カロリー (基礎代謝比:{" "}
                  {summary.balanceVsBmr >= 0
                    ? `+${summary.balanceVsBmr}kcal`
                    : `${summary.balanceVsBmr}kcal`}
                  )
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {summary.intakeCalories.toLocaleString()} kcal
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${intakeWidth}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                />
              </div>
            </div>
          </div>

          {/* AI Metabolic Insight Box */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
            <Activity className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <span>{summary.metabolicComment}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
