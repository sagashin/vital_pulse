"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Upload,
  Database,
  Trash2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  seedThirtyDaysDemoData,
  clearAllHealthData,
  exportAllDataAsJson,
  importAllDataFromJson,
} from "@/lib/db/seeder";
import { formatLocalDate } from "@/lib/db/schema";

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export function DataManagementModal({
  isOpen,
  onClose,
  onNotify,
}: DataManagementModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleSeedDemo = async () => {
    setIsBusy(true);
    try {
      await seedThirtyDaysDemoData();
      onNotify("過去30日分のリアルなデモデータをIndexedDBへ投入しました！");
      onClose();
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportJson = async () => {
    setIsBusy(true);
    try {
      const jsonStr = await exportAllDataAsJson();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const todayStr = formatLocalDate();
      a.href = url;
      a.download = `vitalpulse-backup-${todayStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onNotify("全データのJSONバックアップをダウンロードしました");
    } finally {
      setIsBusy(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsBusy(true);
    try {
      const text = await file.text();
      await importAllDataFromJson(text);
      onNotify("JSONバックアップファイルから全データを復元しました！");
      onClose();
    } catch {
      onNotify("JSONファイルの形式が正しくありません");
    } finally {
      setIsBusy(false);
    }
  };

  const handleClearAll = async () => {
    setIsBusy(true);
    try {
      await clearAllHealthData();
      onNotify("IndexedDB内の全データをリセットしました");
      onClose();
    } finally {
      setIsBusy(false);
    }
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
            className="relative z-10 w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    ローカルDB管理 &amp; バックアップ
                  </h3>
                  <p className="text-xs text-slate-400">
                    Dexie.js (IndexedDB) 完全ローカルストレージ
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

            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed">
                すべての健康ログは外部サーバーに送信されず、お使いのブラウザ内の{" "}
                <code className="text-teal-300 font-mono">IndexedDB</code>{" "}
                に高速保存されます。キャッシュ削除に備えていつでもJSON出力・復元が可能です。
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={isBusy}
                onClick={handleSeedDemo}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 flex items-center justify-between text-left transition"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-300">
                    <Sparkles className="w-4 h-4" />
                    30日分のリアルなデモデータを再生成
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    体重の微減トレンド・睡眠相関・PFC・運動ログを一括投入
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleExportJson}
                  className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold text-slate-200 transition"
                >
                  <Download className="w-4 h-4 text-sky-400" />
                  JSONエクスポート
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold text-slate-200 transition"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  JSONインポート復元
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </div>

              <button
                type="button"
                disabled={isBusy}
                onClick={handleClearAll}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 flex items-center justify-center gap-2 text-xs font-semibold text-rose-300 transition"
              >
                <Trash2 className="w-4 h-4" />
                全データを空にリセットする
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

