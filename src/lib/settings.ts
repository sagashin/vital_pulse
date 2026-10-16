export interface UserGoalsAndSettings {
  targetWeightKg: number;
  targetBodyFatPct: number;
  targetCalories: number;
  targetProteinG: number;
  targetFatG: number;
  targetCarbsG: number;
  targetSteps: number;
  targetSleepHours: number;
  geminiApiKey: string;
  geminiModel: string;
}

export const DEFAULT_USER_SETTINGS: UserGoalsAndSettings = {
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
    // 旧デフォルト(gemini-2.5-flash / gemini-1.5-flash)が保存されていた場合は最新自動選択(auto)へマイグレーション
    if (
      parsed.geminiModel === "gemini-2.5-flash" ||
      parsed.geminiModel === "gemini-1.5-flash"
    ) {
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
