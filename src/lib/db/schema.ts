import Dexie, { type EntityTable } from "dexie";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealLog {
  id?: number;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO 8601
  mealType: MealType;
  description: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  imageUrl?: string; // 食事写真の圧縮DataURL（オプション）
}

export interface WorkoutLog {
  id?: number;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO 8601
  type: string;
  durationMinutes: number;
  intensity: 1 | 2 | 3 | 4 | 5;
  caloriesBurned: number;
  memo: string;
}

export interface SleepLog {
  id?: number;
  date: string; // YYYY-MM-DD
  bedTime: string; // HH:mm
  wakeTime: string; // HH:mm
  durationHours: number;
  qualityScore: 1 | 2 | 3 | 4 | 5;
}

export interface BodyMetricLog {
  id?: number;
  date: string; // YYYY-MM-DD
  weightKg: number;
  bodyFatPercentage: number;
}

export interface ActivityLog {
  id?: number;
  date: string; // YYYY-MM-DD
  steps: number;
  activeMinutes: number;
  readinessScore: number; // 0-100 自動算出
}

export class HealthDatabase extends Dexie {
  meals!: EntityTable<MealLog, "id">;
  workouts!: EntityTable<WorkoutLog, "id">;
  sleepLogs!: EntityTable<SleepLog, "id">;
  bodyMetrics!: EntityTable<BodyMetricLog, "id">;
  activities!: EntityTable<ActivityLog, "id">;

  constructor() {
    super("VitalPulseLocalDB");
    this.version(1).stores({
      meals: "++id, date, timestamp, mealType",
      workouts: "++id, date, timestamp, type",
      sleepLogs: "++id, date",
      bodyMetrics: "++id, date",
      activities: "++id, date",
    });
  }
}

export const db = new HealthDatabase();

/**
 * 睡眠データと前日の運動負荷からReadiness（今日のコンディション）スコア(0〜100)を算出
 */
export function calculateReadinessScore(
  sleepHours: number,
  sleepQuality: number,
  prevDayWorkoutCalories: number,
  prevDayActiveMinutes: number
): number {
  // 睡眠時間スコア (理想: 7.5〜8.5時間で最大55点)
  const sleepDurationRatio = Math.min(1.1, Math.max(0.3, sleepHours / 7.5));
  const durationPoints = Math.min(55, Math.round(sleepDurationRatio * 50));

  // 睡眠の質スコア (1-5 -> 最大30点)
  const qualityPoints = Math.round((sleepQuality / 5) * 30);

  // 回復・運動バランスボーナス/ペナルティ (-10〜+15点)
  // 適度な運動(200〜450kcal)は+12〜15点、過度な運動(>650kcal)は疲労残りで減点
  let recoveryBalance = 10;
  if (prevDayWorkoutCalories > 650 || prevDayActiveMinutes > 110) {
    recoveryBalance = 3;
  } else if (prevDayWorkoutCalories >= 180 && prevDayWorkoutCalories <= 500) {
    recoveryBalance = 15;
  } else if (prevDayActiveMinutes >= 30) {
    recoveryBalance = 12;
  }

  return Math.max(25, Math.min(99, durationPoints + qualityPoints + recoveryBalance));
}

