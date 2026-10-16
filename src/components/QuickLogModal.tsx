"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Utensils,
  Scale,
  Dumbbell,
  Moon,
  Mic,
  MicOff,
  Sparkles,
  Check,
  Footprints,
  Camera,
  Loader2,
  ImagePlus,
} from "lucide-react";
import { db, calculateReadinessScore, type MealType } from "@/lib/db/schema";
import { parseNaturalHealthInput, type ParsedVoiceCommand } from "@/lib/voice-parser";
import {
  analyzeFoodPhotoWithGemini,
  fileToCompressedDataUrl,
  type AnalyzedFoodPhotoResult,
} from "@/lib/gemini-vision";
import type { UserGoalsAndSettings } from "@/lib/settings";

export type QuickLogTab = "ai" | "photo" | "meal" | "body" | "workout" | "sleep";

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: QuickLogTab;
  selectedDate: string;
  settings: UserGoalsAndSettings;
  onSuccess: (message: string) => void;
  onOpenAiSettings?: () => void;
}

export function QuickLogModal({
  isOpen,
  onClose,
  initialTab = "ai",
  selectedDate,
  settings,
  onSuccess,
  onOpenAiSettings,
}: QuickLogModalProps) {
  const [activeTab, setActiveTab] = useState<QuickLogTab>(initialTab);

  // Sync initialTab when opened
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // AI / Voice Smart Input state
  const [smartText, setSmartText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedVoiceCommand[]>([]);

  // Multimodal Food Photo AI state
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>("");
  const [photoHint, setPhotoHint] = useState<string>("");
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [photoAnalysis, setPhotoAnalysis] =
    useState<AnalyzedFoodPhotoResult | null>(null);

  // Meal Form State
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [mealDesc, setMealDesc] = useState("");
  const [calories, setCalories] = useState("580");
  const [protein, setProtein] = useState("38");
  const [fat, setFat] = useState("16");
  const [carbs, setCarbs] = useState("65");

  // Body Form State
  const [weightKg, setWeightKg] = useState("67.2");
  const [bodyFat, setBodyFat] = useState("17.2");

  // Workout Form State
  const [workoutType, setWorkoutType] = useState("上半身ストレングス＆コア");
  const [durationMin, setDurationMin] = useState("45");
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [caloriesBurned, setCaloriesBurned] = useState("320");
  const [workoutMemo, setWorkoutMemo] = useState("フォーム重視で高密度トレーニング");
  const [stepsInput, setStepsInput] = useState("9200");

  // Sleep Form State
  const [bedTime, setBedTime] = useState("23:15");
  const [wakeTime, setWakeTime] = useState("06:45");
  const [sleepHours, setSleepHours] = useState("7.5");
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(4);

  const handleSmartTextChange = (val: string) => {
    setSmartText(val);
    setParsedPreview(parseNaturalHealthInput(val));
  };

  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const sample = "朝ごはんに納豆ご飯とプロテイン飲んだ、あと体重67.1キロ、体脂肪17.0%";
      handleSmartTextChange(sample);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognition as any)();
      recognition.lang = "ja-JP";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const combined = smartText ? `${smartText} ${transcript}` : transcript;
        handleSmartTextChange(combined);
        setIsListening(false);
      };
      recognition.onerror = () => {
        setIsListening(false);
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handlePhotoFileSelect = async (file?: File) => {
    if (!file) return;
    setIsAnalyzingPhoto(true);
    try {
      const { dataUrl, base64Data, mimeType } = await fileToCompressedDataUrl(file);
      setPhotoPreviewUrl(dataUrl);
      const result = await analyzeFoodPhotoWithGemini({
        base64Data,
        mimeType,
        fileName: file.name,
        userHint: photoHint,
        apiKey: settings.geminiApiKey,
        model: settings.geminiModel,
      });
      setPhotoAnalysis(result);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleSimulateSamplePhoto = async (presetName: string) => {
    setIsAnalyzingPhoto(true);
    setPhotoHint(presetName);
    try {
      // SVG食事プレートプレビューを動的生成
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="280" viewBox="0 0 480 280">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#1e293b"/>
          </linearGradient>
        </defs>
        <rect width="480" height="280" rx="24" fill="url(#bg)"/>
        <circle cx="240" cy="140" r="95" fill="#020617" stroke="#334155" stroke-width="4"/>
        <circle cx="205" cy="120" r="36" fill="#10b981" fill-opacity="0.35"/>
        <circle cx="275" cy="125" r="32" fill="#f59e0b" fill-opacity="0.35"/>
        <circle cx="240" cy="175" r="30" fill="#38bdf8" fill-opacity="0.35"/>
        <text x="240" y="145" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="15" font-weight="bold">${presetName}</text>
      </svg>`;
      const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      setPhotoPreviewUrl(dataUrl);

      const result = await analyzeFoodPhotoWithGemini({
        base64Data: "",
        mimeType: "image/jpeg",
        fileName: presetName,
        userHint: presetName,
        apiKey: "",
      });
      setPhotoAnalysis(result);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleSaveAnalyzedPhotoMeal = async () => {
    if (!photoAnalysis) return;
    await db.meals.add({
      date: selectedDate,
      timestamp: new Date().toISOString(),
      mealType: photoAnalysis.mealType,
      description: photoAnalysis.description,
      calories: photoAnalysis.calories,
      protein: photoAnalysis.protein,
      fat: photoAnalysis.fat,
      carbs: photoAnalysis.carbs,
      imageUrl: photoPreviewUrl || undefined,
    });
    setPhotoAnalysis(null);
    setPhotoPreviewUrl("");
    setPhotoHint("");
    onSuccess(`写真AI解析から「${photoAnalysis.description}」を記録しました！`);
    onClose();
  };

  const saveSmartParsedCommands = async () => {
    const commands = parsedPreview.length > 0 ? parsedPreview : parseNaturalHealthInput(smartText);
    if (commands.length === 0) return;

    const nowIso = new Date().toISOString();
    for (const cmd of commands) {
      if (cmd.category === "body" && cmd.weightKg) {
        const existing = await db.bodyMetrics.where("date").equals(selectedDate).first();
        if (existing?.id) {
          await db.bodyMetrics.update(existing.id, {
            weightKg: cmd.weightKg,
            bodyFatPercentage: cmd.bodyFatPercentage ?? 17.5,
          });
        } else {
          await db.bodyMetrics.add({
            date: selectedDate,
            weightKg: cmd.weightKg,
            bodyFatPercentage: cmd.bodyFatPercentage ?? 17.5,
          });
        }
      } else if (cmd.category === "meal") {
        await db.meals.add({
          date: selectedDate,
          timestamp: nowIso,
          mealType: cmd.mealType ?? "lunch",
          description: cmd.mealDescription ?? "AIスマート食事記録",
          calories: cmd.calories ?? 500,
          protein: cmd.protein ?? 30,
          fat: cmd.fat ?? 15,
          carbs: cmd.carbs ?? 55,
        });
      } else if (cmd.category === "workout") {
        await db.workouts.add({
          date: selectedDate,
          timestamp: nowIso,
          type: cmd.workoutType ?? "ワークアウト",
          durationMinutes: cmd.durationMinutes ?? 30,
          intensity: cmd.intensity ?? 4,
          caloriesBurned: cmd.caloriesBurned ?? 240,
          memo: "AI・音声スマート入力から記録",
        });
      } else if (cmd.category === "sleep" && cmd.sleepHours) {
        const existingSleep = await db.sleepLogs.where("date").equals(selectedDate).first();
        const quality = cmd.sleepQuality ?? 4;
        if (existingSleep?.id) {
          await db.sleepLogs.update(existingSleep.id, {
            durationHours: cmd.sleepHours,
            qualityScore: quality,
          });
        } else {
          await db.sleepLogs.add({
            date: selectedDate,
            bedTime: "23:30",
            wakeTime: "07:00",
            durationHours: cmd.sleepHours,
            qualityScore: quality,
          });
        }
      }
    }

    setSmartText("");
    setParsedPreview([]);
    onSuccess(`${commands.length}件のログをAI自動振り分けで保存しました`);
    onClose();
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.meals.add({
      date: selectedDate,
      timestamp: new Date().toISOString(),
      mealType,
      description: mealDesc.trim() || "バランスミール",
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      fat: Number(fat) || 0,
      carbs: Number(carbs) || 0,
    });
    setMealDesc("");
    onSuccess("食事とPFCバランスを記録しました");
    onClose();
  };

  const handleSaveBody = async (e: React.FormEvent) => {
    e.preventDefault();
    const existing = await db.bodyMetrics.where("date").equals(selectedDate).first();
    if (existing?.id) {
      await db.bodyMetrics.update(existing.id, {
        weightKg: Number(weightKg),
        bodyFatPercentage: Number(bodyFat),
      });
    } else {
      await db.bodyMetrics.add({
        date: selectedDate,
        weightKg: Number(weightKg),
        bodyFatPercentage: Number(bodyFat),
      });
    }
    onSuccess(`体重 ${weightKg}kg・体脂肪率 ${bodyFat}% を記録しました`);
    onClose();
  };

  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.workouts.add({
      date: selectedDate,
      timestamp: new Date().toISOString(),
      type: workoutType.trim() || "ワークアウト",
      durationMinutes: Number(durationMin) || 30,
      intensity,
      caloriesBurned: Number(caloriesBurned) || 200,
      memo: workoutMemo,
    });

    const existingAct = await db.activities.where("date").equals(selectedDate).first();
    if (existingAct?.id) {
      await db.activities.update(existingAct.id, {
        steps: Number(stepsInput) || existingAct.steps,
        activeMinutes: existingAct.activeMinutes + (Number(durationMin) || 30),
      });
    } else {
      await db.activities.add({
        date: selectedDate,
        steps: Number(stepsInput) || 8500,
        activeMinutes: Number(durationMin) || 45,
        readinessScore: 84,
      });
    }

    onSuccess("ワークアウトと活動ログを記録しました");
    onClose();
  };

  const handleSaveSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    const hours = Number(sleepHours) || 7.5;
    const existingSleep = await db.sleepLogs.where("date").equals(selectedDate).first();
    if (existingSleep?.id) {
      await db.sleepLogs.update(existingSleep.id, {
        bedTime,
        wakeTime,
        durationHours: hours,
        qualityScore: sleepQuality,
      });
    } else {
      await db.sleepLogs.add({
        date: selectedDate,
        bedTime,
        wakeTime,
        durationHours: hours,
        qualityScore: sleepQuality,
      });
    }

    const newReadiness = calculateReadinessScore(hours, sleepQuality, 300, 50);
    const existingAct = await db.activities.where("date").equals(selectedDate).first();
    if (existingAct?.id) {
      await db.activities.update(existingAct.id, {
        readinessScore: newReadiness,
      });
    } else {
      await db.activities.add({
        date: selectedDate,
        steps: 8000,
        activeMinutes: 45,
        readinessScore: newReadiness,
      });
    }

    onSuccess(`睡眠ログを記録し、Readinessスコア(${newReadiness})を更新しました`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800/90 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800/80">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                  Zero-Friction Multimodal Logger
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                  ライフログの即座記録 ({selectedDate})
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-700/70 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Tabs (6 tabs including Photo AI) */}
            <div className="grid grid-cols-6 gap-1.5 px-6 pt-4">
              {[
                { id: "ai", label: "AI音声", icon: Sparkles, accent: "text-emerald-400" },
                { id: "photo", label: "写真AI", icon: Camera, accent: "text-teal-400" },
                { id: "meal", label: "食事", icon: Utensils, accent: "text-amber-400" },
                { id: "body", label: "体重", icon: Scale, accent: "text-sky-400" },
                { id: "workout", label: "運動", icon: Dumbbell, accent: "text-rose-400" },
                { id: "sleep", label: "睡眠", icon: Moon, accent: "text-indigo-400" },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as QuickLogTab)}
                    className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl border text-[11px] font-medium transition ${
                      active
                        ? "bg-slate-800 border-slate-600 text-white shadow-sm"
                        : "bg-slate-900/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${active ? tab.accent : "text-slate-400"}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Body Content */}
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              {activeTab === "ai" && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed">
                    <strong>ハンズフリー一発記録:</strong> 「朝ごはんに納豆ご飯とプロテイン飲んだ、あと体重67.1キロ、体脂肪17%」のように話しかけるか入力するだけで、複数テーブルへ自動振り分けします。
                  </div>

                  <div className="relative">
                    <textarea
                      rows={3}
                      value={smartText}
                      onChange={(e) => handleSmartTextChange(e.target.value)}
                      placeholder="例: 昼ごはんに鶏むねサラダとオートミール、体重67.1kg、体脂肪17.0%、ランニング30分"
                      className="w-full rounded-2xl bg-slate-950/90 border border-slate-800 p-4 pr-14 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                    />
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      title="音声入力を開始"
                      className={`absolute right-3 bottom-3 p-3 rounded-xl transition ${
                        isListening
                          ? "bg-rose-500 text-white animate-pulse"
                          : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      }`}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Quick Sample Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "朝ごはんに納豆ご飯とプロテイン飲んだ、体重67.0キロ",
                      "昼にサーモンと玄米、筋トレ45分",
                      "睡眠7.5時間、体重66.8kg、体脂肪16.9%",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSmartTextChange(preset)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>

                  {/* Real-time Structured Preview */}
                  {parsedPreview.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold text-slate-400">
                        AI構造化プレビュー ({parsedPreview.length}件検出):
                      </p>
                      {parsedPreview.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                        >
                          <span className="font-medium text-slate-200">{item.summary}</span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 uppercase font-mono text-[10px]">
                            {item.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={parsedPreview.length === 0}
                    onClick={saveSmartParsedCommands}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition"
                  >
                    <Check className="w-4 h-4" />
                    一括でIndexedDBに振り分け保存
                  </button>
                </div>
              )}

              {activeTab === "photo" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/25 text-xs text-teal-200">
                    <div>
                      <strong>マルチモーダル料理写真AI解析:</strong>{" "}
                      {settings.geminiApiKey ? (
                        <span className="text-emerald-300 font-semibold">
                          Gemini API ({settings.geminiModel}) 接続済み
                        </span>
                      ) : (
                        <span>
                          ローカルAI推定モード（実API連携は右の設定から）
                        </span>
                      )}
                    </div>
                    {onOpenAiSettings && (
                      <button
                        type="button"
                        onClick={onOpenAiSettings}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-teal-300 hover:text-white shrink-0 ml-2"
                      >
                        API設定
                      </button>
                    )}
                  </div>

                  {/* Optional Hint Input */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      補足メモ（任意・写真と一緒にAIへ渡されます）
                    </label>
                    <input
                      type="text"
                      value={photoHint}
                      onChange={(e) => setPhotoHint(e.target.value)}
                      placeholder="例: 鶏むね肉180g、玄米少なめ、ドレッシング別添え"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  {/* Dropzone / Upload Trigger */}
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-700 hover:border-teal-400/70 bg-slate-950/70 p-5 text-center transition"
                  >
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoFileSelect(e.target.files?.[0])}
                      className="hidden"
                    />
                    {isAnalyzingPhoto ? (
                      <div className="py-6 flex flex-col items-center justify-center gap-2 text-teal-300">
                        <Loader2 className="w-7 h-7 animate-spin" />
                        <span className="text-xs font-semibold">
                          料理写真からカロリー・PFC・品目をマルチモーダル解析中...
                        </span>
                      </div>
                    ) : photoPreviewUrl ? (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoPreviewUrl}
                          alt="Meal preview"
                          className="mx-auto max-h-40 rounded-xl object-cover border border-slate-800"
                        />
                        <p className="text-[11px] text-slate-400">
                          クリックして別の写真を再選択
                        </p>
                      </div>
                    ) : (
                      <div className="py-4 flex flex-col items-center justify-center gap-2">
                        <div className="p-3 rounded-2xl bg-teal-500/15 text-teal-400">
                          <ImagePlus className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-200">
                          クリックして料理の写真を選択・撮影
                        </p>
                        <p className="text-[11px] text-slate-400">
                          JPEG / PNG / WebP 対応（自動で軽量リサイズ＆PFC解析）
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Demo Photo Simulation Buttons */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] text-slate-400">
                      手元に写真がない場合のワンクリックAI解析デモ:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "グリルチキン＆アボカドサラダボウル",
                        "焼き鮭と納豆・玄米の和食バランス膳",
                        "高タンパク牛赤身ステーキ＆ブロッコリー",
                      ].map((demoName) => (
                        <button
                          key={demoName}
                          type="button"
                          onClick={() => handleSimulateSamplePhoto(demoName)}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 transition"
                        >
                          📸 {demoName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Analyzed Result Card */}
                  {photoAnalysis && (
                    <div className="p-4 rounded-2xl bg-slate-950/90 border border-teal-500/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">
                          {photoAnalysis.description}
                        </h4>
                        <span className="text-sm font-black text-amber-300">
                          {photoAnalysis.calories} kcal
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="block text-[10px] text-slate-400">Protein</span>
                          <span className="font-bold text-emerald-400">
                            {photoAnalysis.protein}g
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="block text-[10px] text-slate-400">Fat</span>
                          <span className="font-bold text-amber-400">
                            {photoAnalysis.fat}g
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="block text-[10px] text-slate-400">Carbs</span>
                          <span className="font-bold text-sky-400">
                            {photoAnalysis.carbs}g
                          </span>
                        </div>
                      </div>

                      {photoAnalysis.items.length > 0 && (
                        <div className="space-y-1 text-[11px] text-slate-300">
                          {photoAnalysis.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>• {it.name}</span>
                              <span className="text-slate-400">
                                {it.calories}kcal (P:{it.protein}g)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-[11px] text-teal-300/90 leading-relaxed">
                        {photoAnalysis.confidenceNote}
                      </p>

                      <button
                        type="button"
                        onClick={handleSaveAnalyzedPhotoMeal}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <Check className="w-4 h-4" />
                        この解析結果と写真をIndexedDBに保存
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "meal" && (
                <form onSubmit={handleSaveMeal} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">食事区分</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          { id: "breakfast", label: "朝食" },
                          { id: "lunch", label: "昼食" },
                          { id: "dinner", label: "夕食" },
                          { id: "snack", label: "間食" },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setMealType(t.id)}
                          className={`py-2 rounded-xl text-xs font-medium border transition ${
                            mealType === t.id
                              ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                              : "bg-slate-950 border-slate-800 text-slate-400"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">メニュー内容</label>
                    <input
                      type="text"
                      required
                      value={mealDesc}
                      onChange={(e) => setMealDesc(e.target.value)}
                      placeholder="例: 鶏むね肉のグリルサラダボウル・玄米"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">カロリー(kcal)</label>
                      <input
                        type="number"
                        value={calories}
                        onChange={(e) => setCalories(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-emerald-400 mb-1">Protein (g)</label>
                      <input
                        type="number"
                        value={protein}
                        onChange={(e) => setProtein(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-amber-400 mb-1">Fat (g)</label>
                      <input
                        type="number"
                        value={fat}
                        onChange={(e) => setFat(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-sky-400 mb-1">Carbs (g)</label>
                      <input
                        type="number"
                        value={carbs}
                        onChange={(e) => setCarbs(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition"
                  >
                    食事ログを保存
                  </button>
                </form>
              )}

              {activeTab === "body" && (
                <form onSubmit={handleSaveBody} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">体重 (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-lg font-bold text-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">体脂肪率 (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={bodyFat}
                        onChange={(e) => setBodyFat(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-lg font-bold text-indigo-400"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    ※ 保存すると即座にダッシュボードの「7日間移動平均トレンドライン」が再計算されます。
                  </p>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition"
                  >
                    体重・体組成を保存
                  </button>
                </form>
              )}

              {activeTab === "workout" && (
                <form onSubmit={handleSaveWorkout} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">トレーニング種目</label>
                    <input
                      type="text"
                      required
                      value={workoutType}
                      onChange={(e) => setWorkoutType(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">時間 (分)</label>
                      <input
                        type="number"
                        value={durationMin}
                        onChange={(e) => setDurationMin(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">消費kcal</label>
                      <input
                        type="number"
                        value={caloriesBurned}
                        onChange={(e) => setCaloriesBurned(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">強度 (1-5)</label>
                      <select
                        value={intensity}
                        onChange={(e) => setIntensity(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            Lv.{lvl}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                      <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                      今日の歩数 (Steps)
                    </label>
                    <input
                      type="number"
                      value={stepsInput}
                      onChange={(e) => setStepsInput(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">メモ</label>
                    <input
                      type="text"
                      value={workoutMemo}
                      onChange={(e) => setWorkoutMemo(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-sm transition"
                  >
                    運動・活動ログを保存
                  </button>
                </form>
              )}

              {activeTab === "sleep" && (
                <form onSubmit={handleSaveSleep} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">就寝時刻</label>
                      <input
                        type="time"
                        value={bedTime}
                        onChange={(e) => setBedTime(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">起床時刻</label>
                      <input
                        type="time"
                        value={wakeTime}
                        onChange={(e) => setWakeTime(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">睡眠時間 (h)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={sleepHours}
                        onChange={(e) => setSleepHours(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-indigo-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">睡眠の質 (1-5)</label>
                      <select
                        value={sleepQuality}
                        onChange={(e) => setSleepQuality(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                      >
                        <option value={5}>5 - 最高に深い睡眠</option>
                        <option value={4}>4 - 良好な回復</option>
                        <option value={3}>3 - 標準</option>
                        <option value={2}>2 - やや浅い</option>
                        <option value={1}>1 - 睡眠不足</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm transition"
                  >
                    睡眠ログを保存してReadinessを更新
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
