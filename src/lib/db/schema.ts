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

/**
 * ローカルタイムゾーン基準で YYYY-MM-DD 文字列を返す
 */
export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DD 文字列と日数差分を受け取り、タイムゾーン安全に日付を加算した YYYY-MM-DD を返す
 */
export function addDaysToDateStr(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  return formatLocalDate(dt);
}

/**
 * 指定日の睡眠データと前日運動ログからReadinessスコアを自動再計算して activities テーブルを更新/作成する
 */
export async function recalculateAndSaveReadiness(date: string): Promise<number> {
  const sleepRecords = await db.sleepLogs.where("date").equals(date).toArray();
  const sleep = sleepRecords[sleepRecords.length - 1];
  const sleepHours = sleep ? sleep.durationHours : 7.0;
  const sleepQuality = sleep ? sleep.qualityScore : 3;

  const prevDate = addDaysToDateStr(date, -1);
  const prevWorkouts = await db.workouts.where("date").equals(prevDate).toArray();
  const prevWorkoutCalories = prevWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

  const prevActivities = await db.activities.where("date").equals(prevDate).toArray();
  const prevActiveMinutes = prevActivities[prevActivities.length - 1]?.activeMinutes || 0;

  const score = calculateReadinessScore(
    sleepHours,
    sleepQuality,
    prevWorkoutCalories,
    prevActiveMinutes
  );

  const existingActivities = await db.activities.where("date").equals(date).toArray();
  if (existingActivities.length > 0) {
    const primary = existingActivities[0];
    if (primary.id) {
      await db.activities.update(primary.id, { readinessScore: score });
    }
    // 重複レコードがあれば削除
    for (let i = 1; i < existingActivities.length; i++) {
      if (existingActivities[i].id) {
        await db.activities.delete(existingActivities[i].id!);
      }
    }
  } else {
    await db.activities.add({
      date,
      steps: 0,
      activeMinutes: 0,
      readinessScore: score,
    });
  }

  return score;
}

/**
 * bodyMetrics テーブルの1日1件安全なUpsert
 */
export async function upsertBodyMetric(
  date: string,
  weightKg: number,
  bodyFatPercentage: number
): Promise<void> {
  const existing = await db.bodyMetrics.where("date").equals(date).toArray();
  if (existing.length > 0) {
    if (existing[0].id) {
      await db.bodyMetrics.update(existing[0].id, {
        weightKg,
        bodyFatPercentage,
      });
    }
    for (let i = 1; i < existing.length; i++) {
      if (existing[i].id) {
        await db.bodyMetrics.delete(existing[i].id!);
      }
    }
  } else {
    await db.bodyMetrics.add({
      date,
      weightKg,
      bodyFatPercentage,
    });
  }
}

/**
 * sleepLogs テーブルの1日1件安全なUpsert ＆ Readiness自動再計算
 */
export async function upsertSleepLog(log: Omit<SleepLog, "id">): Promise<void> {
  const existing = await db.sleepLogs.where("date").equals(log.date).toArray();
  if (existing.length > 0) {
    if (existing[0].id) {
      await db.sleepLogs.update(existing[0].id, {
        bedTime: log.bedTime,
        wakeTime: log.wakeTime,
        durationHours: log.durationHours,
        qualityScore: log.qualityScore,
      });
    }
    for (let i = 1; i < existing.length; i++) {
      if (existing[i].id) {
        await db.sleepLogs.delete(existing[i].id!);
      }
    }
  } else {
    await db.sleepLogs.add({
      date: log.date,
      bedTime: log.bedTime,
      wakeTime: log.wakeTime,
      durationHours: log.durationHours,
      qualityScore: log.qualityScore,
    });
  }
  await recalculateAndSaveReadiness(log.date);
}

/**
 * activities テーブルの1日1件安全なUpsert ＆ Readiness自動再計算
 */
export async function upsertActivityLog(
  date: string,
  steps: number,
  activeMinutes: number
): Promise<void> {
  const existing = await db.activities.where("date").equals(date).toArray();
  if (existing.length > 0) {
    if (existing[0].id) {
      await db.activities.update(existing[0].id, {
        steps,
        activeMinutes,
      });
    }
    for (let i = 1; i < existing.length; i++) {
      if (existing[i].id) {
        await db.activities.delete(existing[i].id!);
      }
    }
  } else {
    await db.activities.add({
      date,
      steps,
      activeMinutes,
      readinessScore: 75,
    });
  }
  await recalculateAndSaveReadiness(date);
}
