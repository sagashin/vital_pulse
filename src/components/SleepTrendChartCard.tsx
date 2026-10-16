"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import { Moon, Sparkles, Clock, BatteryCharging, Plus } from "lucide-react";
import type { SleepLog } from "@/lib/db/schema";

interface SleepTrendChartCardProps {
  sleepLogs: SleepLog[];
  targetSleepHours: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenSleepModal: () => void;
}

export function SleepTrendChartCard({
  sleepLogs,
  targetSleepHours,
  selectedDate,
  onSelectDate,
  onOpenSleepModal,
}: SleepTrendChartCardProps) {
  const chartData = useMemo(() => {
    const sorted = [...sleepLogs].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((item, idx) => {
      const windowSlice = sorted.slice(Math.max(0, idx - 6), idx + 1);
      const avg7d =
        windowSlice.reduce((sum, cur) => sum + cur.durationHours, 0) /
        windowSlice.length;

      return {
        date: item.date.slice(5), // MM-DD
        fullDate: item.date,
        durationHours: item.durationHours,
        movingAvg7d: Number(avg7d.toFixed(2)),
        qualityScore: item.qualityScore,
        bedTime: item.bedTime,
        wakeTime: item.wakeTime,
      };
    });
  }, [sleepLogs]);

  // 睡眠統計サマリー（平均睡眠時間・平均質・直近7日間の睡眠負債/貯金）
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        avgHours: 0,
        avgQuality: 0,
        weeklyDebtOrSurplus: 0,
        consistencyScore: 85,
      };
    }

    const recent7 = chartData.slice(-7);
    const avgHours = Number(
      (
        recent7.reduce((s, d) => s + d.durationHours, 0) / recent7.length
      ).toFixed(1)
    );
    const avgQuality = Number(
      (
        recent7.reduce((s, d) => s + d.qualityScore, 0) / recent7.length
      ).toFixed(1)
    );

    // 7日間の目標睡眠時間に対する収支（プラスなら睡眠貯金、マイナスなら睡眠負債）
    const weeklyDebtOrSurplus = Number(
      recent7
        .reduce((s, d) => s + (d.durationHours - targetSleepHours), 0)
        .toFixed(1)
    );

    return {
      avgHours,
      avgQuality,
      weeklyDebtOrSurplus,
    };
  }, [chartData, targetSleepHours]);

  const getBarColor = (hours: number, quality: number, isSelected: boolean) => {
    if (isSelected) return "#38bdf8"; // 選択中の日はスカイブルーでハイライト
    if (hours >= targetSleepHours && quality >= 4) return "#818cf8"; // 理想的な深い睡眠 (Indigo)
    if (hours >= targetSleepHours - 0.7) return "#6366f1"; // 良好 (Violet/Indigo)
    return "#f59e0b"; // 睡眠不足注意 (Amber)
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-sm flex flex-col justify-between"
    >
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              <Moon className="w-3 h-3" />
              Sleep Architecture &amp; 7-Day Moving Average
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                stats.weeklyDebtOrSurplus >= 0
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-amber-500/15 text-amber-300"
              }`}
            >
              直近7日睡眠収支:{" "}
              {stats.weeklyDebtOrSurplus >= 0
                ? `+${stats.weeklyDebtOrSurplus}h (充足)`
                : `${stats.weeklyDebtOrSurplus}h (睡眠負債)`}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            睡眠時間トレンド ＆ 7日間移動平均・睡眠の質グラフ
          </h2>
        </div>

        {/* Summary Pills & Quick Add */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 text-right">
            <span className="block text-[10px] text-slate-400">7日平均睡眠</span>
            <span className="text-base font-extrabold text-indigo-300">
              {stats.avgHours}
              <span className="text-xs font-normal text-slate-400 ml-0.5">
                h / 目標{targetSleepHours}h
              </span>
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 text-right">
            <span className="block text-[10px] text-slate-400">平均睡眠の質</span>
            <span className="text-base font-extrabold text-teal-300">
              ★ {stats.avgQuality}
              <span className="text-xs font-normal text-slate-400 ml-0.5">/ 5</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenSleepModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 font-bold text-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>睡眠を記録</span>
          </button>
        </div>
      </div>

      {/* Recharts Composed Chart (Bars for Daily Hours + Line for 7d Moving Average) */}
      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2 border border-dashed border-slate-800 rounded-2xl">
            <Moon className="w-6 h-6 text-indigo-400/60" />
            <span>睡眠ログを記録すると、ここに睡眠時間と7日間移動平均トレンドが描画されます</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
              onClick={(state) => {
                if (state?.activePayload?.[0]?.payload?.fullDate) {
                  onSelectDate(state.activePayload[0].payload.fullDate);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                minTickGap={14}
              />
              <YAxis
                domain={[0, (dataMax: number) => Math.max(9.5, Math.ceil(dataMax + 1))]}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                unit="h"
              />
              <Tooltip
                cursor={{ fill: "#1e293b", opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as {
                    fullDate: string;
                    durationHours: number;
                    movingAvg7d: number;
                    qualityScore: number;
                    bedTime: string;
                    wakeTime: string;
                  };
                  return (
                    <div className="rounded-2xl bg-slate-950/95 border border-slate-800 p-3.5 text-xs shadow-2xl space-y-1.5">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1">
                        <span className="font-bold text-white">{data.fullDate}</span>
                        <span className="text-[11px] font-mono text-indigo-300">
                          {data.bedTime} → {data.wakeTime}
                        </span>
                      </div>
                      <p className="text-indigo-300">
                        睡眠時間: <strong>{data.durationHours} 時間</strong> (目標比{" "}
                        {data.durationHours - targetSleepHours >= 0
                          ? `+${(data.durationHours - targetSleepHours).toFixed(1)}h`
                          : `${(data.durationHours - targetSleepHours).toFixed(1)}h`}
                        )
                      </p>
                      <p className="text-teal-300">
                        7日間移動平均: <strong>{data.movingAvg7d} 時間</strong>
                      </p>
                      <p className="text-amber-300">
                        睡眠の質スコア: <strong>{"★".repeat(data.qualityScore)} ({data.qualityScore}/5)</strong>
                      </p>
                    </div>
                  );
                }}
              />
              {/* Target Sleep Hours Reference Line */}
              <ReferenceLine
                y={targetSleepHours}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                strokeOpacity={0.65}
              />
              {/* Daily Sleep Hours Bars */}
              <Bar
                dataKey="durationHours"
                name="睡眠時間"
                radius={[6, 6, 0, 0]}
                maxBarSize={24}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(
                      entry.durationHours,
                      entry.qualityScore,
                      entry.fullDate === selectedDate
                    )}
                    fillOpacity={entry.fullDate === selectedDate ? 1 : 0.8}
                    className="cursor-pointer transition-opacity hover:opacity-100"
                  />
                ))}
              </Bar>
              {/* 7-Day Moving Average Line */}
              <Line
                type="monotone"
                dataKey="movingAvg7d"
                name="7日間移動平均"
                stroke="#2dd4bf"
                strokeWidth={3}
                dot={{ r: 2.5, fill: "#2dd4bf", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#2dd4bf" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend & Footer */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-400 inline-block" />
            目標達成・高回復
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
            睡眠不足注意
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-1 rounded-full bg-teal-400 inline-block" />
            7日間移動平均線
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-sky-400 inline-block" />
            理想目標 ({targetSleepHours}h)
          </span>
        </div>

        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          棒グラフをクリックするとその日の詳細に切り替わります
        </span>
      </div>
    </motion.div>
  );
}
