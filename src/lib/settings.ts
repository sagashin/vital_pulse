export type BiologicalSex = "male" | "female";

export interface UserGoalsAndSettings {
  // 基本プロフィール（健康年齢・基礎代謝算出用）
  birthDate: string; // YYYY-MM-DD
  gender: BiologicalSex;
  heightCm: number;

  // 目標設定
  targetWeightKg: number;
  targetBodyFatPct: number;
  targetCalories: number;
  targetProteinG: number;
  targetFatG: number;
  targetCarbsG: number;
  targetSteps: number;
  targetSleepHours: number;

  // AI設定
  geminiApiKey: string;
  geminiModel: string;
}

export const DEFAULT_USER_SETTINGS: UserGoalsAndSettings = {
  birthDate: "1990-05-15",
  gender: "male",
  heightCm: 172,
  targetWeightKg: 65.0,
  targetBodyFatPct: 15.0,
  targetCalories: 2100,
  targetProteinG: 145,
  targetFatG: 60,
  targetCarbsG: 230,
  targetSteps: 10000,
  targetSleepHours: 7.5,
  geminiApiKey: "",
  geminiModel: "auto",
};

const STORAGE_KEY = "vital_pulse_user_settings_v1";

export function loadUserSettings(): UserGoalsAndSettings {
  if (typeof window === "undefined") return DEFAULT_USER_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    const parsed = JSON.parse(raw);
    // 旧世代モデル（Gemini 2.x / 1.x）がローカル保存されている場合は "auto"（Gemini 3系）に自動リセット
    const obsoleteModels = [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ];
    if (obsoleteModels.includes(parsed.geminiModel)) {
      parsed.geminiModel = "auto";
    }
    return {
      ...DEFAULT_USER_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveUserSettings(settings: UserGoalsAndSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * 誕生日(YYYY-MM-DD)から現在の満年齢を算出
 */
export function calculateChronologicalAge(birthDateStr: string): number {
  if (!birthDateStr) return 35;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return 35;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(10, Math.min(110, age));
}
