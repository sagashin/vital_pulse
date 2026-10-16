"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sliders,
  KeyRound,
  Target,
  Check,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import {
  DEFAULT_USER_SETTINGS,
  type UserGoalsAndSettings,
} from "@/lib/settings";

interface GoalsAndAiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserGoalsAndSettings;
  onSaveSettings: (next: UserGoalsAndSettings) => void;
}

export function GoalsAndAiSettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}: GoalsAndAiSettingsModalProps) {
  const [form, setForm] = useState<UserGoalsAndSettings>(settings);

  useEffect(() => {
    if (isOpen) {
      setForm(settings);
    }
  }, [isOpen, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    onClose();
  };

  const handleResetDefaults = () => {
    setForm({
      ...DEFAULT_USER_SETTINGS,
      geminiApiKey: form.geminiApiKey,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-10 w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    パーソナル目標 &amp; Gemini AI設定
                  </h3>
                  <p className="text-xs text-slate-400">
                    目標PFC・カロリー・体重・マルチモーダル画像解析キーの設定
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Target Body & Activity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-400">
                    <Target className="w-3.5 h-3.5" />
                    1. 身体・アクティビティ目標
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    <RotateCcw className="w-3 h-3" />
                    標準値に戻す
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      目標体重 (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.targetWeightKg}
                      onChange={(e) =>
                        setForm({ ...form, targetWeightKg: Number(e.target.value) })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      目標体脂肪 (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.targetBodyFatPct}
                      onChange={(e) =>
                        setForm({ ...form, targetBodyFatPct: Number(e.target.value) })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      目標歩数 (歩)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={form.targetSteps}
                      onChange={(e) =>
                        setForm({ ...form, targetSteps: Number(e.target.value) })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      理想睡眠 (h)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.targetSleepHours}
                      onChange={(e) =>
                        setForm({ ...form, targetSleepHours: Number(e.target.value) })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Target Calories & PFC */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  2. 1日の目標摂取カロリー &amp; PFCバランス
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      目標カロリー
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={form.targetCalories}
                      onChange={(e) =>
                        setForm({ ...form, targetCalories: Number(e.target.value) })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-emerald-400 mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      value={form.targetProteinG}
                      onChange={(e) =>
                        setForm({ ...form, targetProteinG: Number(e.target.value) })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-emerald-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-amber-400 mb-1">
                      Fat (g)
                    </label>
                    <input
                      type="number"
                      value={form.targetFatG}
                      onChange={(e) =>
                        setForm({ ...form, targetFatG: Number(e.target.value) })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-amber-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-sky-400 mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      value={form.targetCarbsG}
                      onChange={(e) =>
                        setForm({ ...form, targetCarbsG: Number(e.target.value) })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-sky-300 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Gemini Multimodal API Key (Local Storage only) */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <KeyRound className="w-3.5 h-3.5" />
                  3. Gemini API キー（食事写真のマルチモーダルAI解析用）
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Google AI StudioのAPIキーを入力すると、料理写真のドロップ時に直接{" "}
                  <code className="text-emerald-300 font-mono">gemini-2.5-flash</code>{" "}
                  で画像解析しPFCを自動算出します（ブラウザ内のlocalStorageにのみ保存されます。未設定でもローカル推定モードで動作します）。
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Gemini API Key (AIza...)
                    </label>
                    <input
                      type="password"
                      value={form.geminiApiKey}
                      onChange={(e) =>
                        setForm({ ...form, geminiApiKey: e.target.value })
                      }
                      placeholder="未設定時はローカルAI推定に自動フォールバック"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      使用モデル
                    </label>
                    <select
                      value={form.geminiModel}
                      onChange={(e) =>
                        setForm({ ...form, geminiModel: e.target.value })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                    >
                      <option value="auto">自動選択 (推奨・最新Flash)</option>
                      <option value="gemini-3.8-flash">gemini-3.8-flash</option>
                      <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                      <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite</option>
                      <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50"
              >
                <Check className="w-4 h-4" />
                目標とAI設定を保存する
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
