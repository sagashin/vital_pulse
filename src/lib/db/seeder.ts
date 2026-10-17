import {
  db,
  calculateReadinessScore,
  type MealLog,
  type WorkoutLog,
  type SleepLog,
  type BodyMetricLog,
  type ActivityLog,
  formatLocalDate,
} from "./schema";

function formatDate(d: Date): string {
  return formatLocalDate(d);
}

// 擬似乱数（再現性と自然なばらつきのため）
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

const BREAKFAST_PRESETS = [
  { desc: "オートミール・ギリシャヨーグルト・ブルーベリー・プロテイン", cal: 430, p: 36, f: 8, c: 52 },
  { desc: "納豆卵かけ玄米ご飯・鮭の塩焼き・あおさ味噌汁", cal: 510, p: 29, f: 14, c: 64 },
  { desc: "全粒粉トースト・アボカド＆ポーチドエッグ・ソイラテ", cal: 460, p: 21, f: 22, c: 44 },
  { desc: "ホエイプロテイン＆バナナ・ミックスナッツ", cal: 340, p: 28, f: 11, c: 32 },
];

const LUNCH_PRESETS = [
  { desc: "鶏むね肉のグリルサラダボウル・キヌア＆玄米", cal: 620, p: 48, f: 16, c: 68 },
  { desc: "サーモンとアボカドのポキ丼・わかめスープ", cal: 690, p: 34, f: 24, c: 78 },
  { desc: "十割蕎麦と鶏天・温泉卵・季節の小鉢", cal: 640, p: 31, f: 15, c: 88 },
  { desc: "高タンパク牛赤身ステーキ定食（玄米・ブロッコリー）", cal: 740, p: 52, f: 26, c: 66 },
];

const DINNER_PRESETS = [
  { desc: "真鯛のアクアパッツァ・蒸し野菜・雑穀米小盛り", cal: 580, p: 42, f: 16, c: 58 },
  { desc: "豚ヒレ肉の低温ロースト・豆腐と海藻のサラダ・味噌汁", cal: 550, p: 45, f: 15, c: 48 },
  { desc: "サバの塩焼き・冷奴・ほうれん草胡麻和え・玄米", cal: 630, p: 38, f: 25, c: 56 },
  { desc: "鶏つくねとたっぷりキノコの生姜鍋・〆の雑炊", cal: 610, p: 41, f: 14, c: 72 },
];

const SNACK_PRESETS = [
  { desc: "素焼きアーモンド＆高カカオチョコ (85%)", cal: 180, p: 5, f: 14, c: 8 },
  { desc: "オイコス プロテインヨーグルト＆キウイ", cal: 150, p: 13, f: 0, c: 22 },
  { desc: "プロテインバー（ベイクドチョコ）＆ブラックコーヒー", cal: 210, p: 20, f: 8, c: 16 },
];

const WORKOUT_PRESETS = [
  { type: "HIIT & コアトレーニング", duration: 30, intensity: 5 as const, cal: 340, memo: "タバタ式8セット＋プランクサーキット。心拍数ピーク172bpm" },
  { type: "上半身ストレングス（胸・背中）", duration: 50, intensity: 4 as const, cal: 310, memo: "ベンチプレス・懸垂・ダンベルロウ。フォーム重視で漸進的過負荷" },
  { type: "Zone 2 有酸素ランニング", duration: 40, intensity: 3 as const, cal: 380, memo: "鼻呼吸ペース（5:45/km）で脂肪燃焼ゾーン維持" },
  { type: "下半身ストレングス＆モビリティ", duration: 45, intensity: 4 as const, cal: 350, memo: "ブルガリアンスクワット・ルーマニアンDL・股関節ストレッチ" },
  { type: "ナイトリカバリーヨガ＆ストレッチ", duration: 25, intensity: 2 as const, cal: 110, memo: "副交感神経優位にするフォームローラー＆深呼吸ワーク" },
];

export async function seedThirtyDaysDemoData(): Promise<void> {
  await db.transaction(
    "rw",
    [db.meals, db.workouts, db.sleepLogs, db.bodyMetrics, db.activities],
    async () => {
      await Promise.all([
        db.meals.clear(),
        db.workouts.clear(),
        db.sleepLogs.clear(),
        db.bodyMetrics.clear(),
        db.activities.clear(),
      ]);

      const today = new Date();
      const mealsToInsert: MealLog[] = [];
      const workoutsToInsert: WorkoutLog[] = [];
      const sleepsToInsert: SleepLog[] = [];
      const metricsToInsert: BodyMetricLog[] = [];
      const activitiesToInsert: ActivityLog[] = [];

      // 30日間で 69.4kg -> 約 67.3kg へリアルな水分変動を伴いながら微減トレンドを描く
      const baseStartWeight = 69.4;
      const baseStartFat = 18.6;

      let prevWorkoutCal = 250;
      let prevActiveMin = 45;

      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = formatDate(d);
        const dayIndex = 29 - i; // 0 to 29

        const r1 = pseudoRandom(dayIndex * 11 + 1);
        const r2 = pseudoRandom(dayIndex * 17 + 2);
        const r3 = pseudoRandom(dayIndex * 23 + 3);
        const r4 = pseudoRandom(dayIndex * 31 + 4);

        // 1. 体重・体脂肪（微減トレンド + 日々の水分揺らぎ ±0.45kg）
        const trendReduction = (dayIndex / 29) * 2.05; // 30日で約-2.05kg
        const dailyFluctuation = (r1 - 0.48) * 0.85 + Math.sin(dayIndex * 1.1) * 0.25;
        const weightKg = Number((baseStartWeight - trendReduction + dailyFluctuation).toFixed(1));

        const fatReduction = (dayIndex / 29) * 1.3;
        const fatFluctuation = (r2 - 0.5) * 0.4;
        const bodyFatPercentage = Number((baseStartFat - fatReduction + fatFluctuation).toFixed(1));

        metricsToInsert.push({
          date: dateStr,
          weightKg,
          bodyFatPercentage,
        });

        // 2. 睡眠ログ（6.1h 〜 8.3h、睡眠が良い翌日はカロリーが整いやすい相関を持たせる）
        const isHighSleepDay = r2 > 0.32;
        const durationHours = isHighSleepDay
          ? Number((7.1 + r3 * 1.2).toFixed(1))
          : Number((5.8 + r3 * 1.0).toFixed(1));

        const qualityScore: 1 | 2 | 3 | 4 | 5 =
          durationHours >= 7.6 ? 5 : durationHours >= 7.0 ? 4 : durationHours >= 6.4 ? 3 : 2;

        const bedHour = durationHours >= 7.3 ? 23 : 24;
        const bedMin = Math.floor(r1 * 45);
        const bedTime = `${bedHour === 24 ? "00" : String(bedHour).padStart(2, "0")}:${String(bedMin).padStart(2, "0")}`;

        const wakeTotalMinutes = ((bedHour % 24) * 60 + bedMin + Math.round(durationHours * 60)) % (24 * 60);
        const wakeHour = Math.floor(wakeTotalMinutes / 60);
        const wakeMin = wakeTotalMinutes % 60;
        const wakeTime = `${String(wakeHour).padStart(2, "0")}:${String(wakeMin).padStart(2, "0")}`;

        sleepsToInsert.push({
          date: dateStr,
          bedTime,
          wakeTime,
          durationHours,
          qualityScore,
        });

        // 3. 食事ログ（朝食・昼食・夕食＋間食）
        // 睡眠時間が7時間以上の日は暴食が抑えられる相関も再現
        const bPreset = BREAKFAST_PRESETS[dayIndex % BREAKFAST_PRESETS.length];
        const lPreset = LUNCH_PRESETS[(dayIndex + 1) % LUNCH_PRESETS.length];
        const dPreset = DINNER_PRESETS[(dayIndex + 2) % DINNER_PRESETS.length];
        const sPreset = SNACK_PRESETS[dayIndex % SNACK_PRESETS.length];

        const sleepCalorieFactor = durationHours >= 7.0 ? 0.95 : 1.08;

        mealsToInsert.push(
          {
            date: dateStr,
            timestamp: `${dateStr}T07:45:00`,
            mealType: "breakfast",
            description: bPreset.desc,
            calories: Math.round(bPreset.cal * sleepCalorieFactor),
            protein: bPreset.p,
            fat: bPreset.f,
            carbs: Math.round(bPreset.c * sleepCalorieFactor),
          },
          {
            date: dateStr,
            timestamp: `${dateStr}T12:30:00`,
            mealType: "lunch",
            description: lPreset.desc,
            calories: Math.round(lPreset.cal * sleepCalorieFactor),
            protein: lPreset.p,
            fat: lPreset.f,
            carbs: Math.round(lPreset.c * sleepCalorieFactor),
          },
          {
            date: dateStr,
            timestamp: `${dateStr}T19:30:00`,
            mealType: "dinner",
            description: dPreset.desc,
            calories: Math.round(dPreset.cal * sleepCalorieFactor),
            protein: dPreset.p,
            fat: dPreset.f,
            carbs: Math.round(dPreset.c * sleepCalorieFactor),
          }
        );

        if (r4 > 0.25 || i === 0) {
          mealsToInsert.push({
            date: dateStr,
            timestamp: `${dateStr}T15:30:00`,
            mealType: "snack",
            description: sPreset.desc,
            calories: sPreset.cal,
            protein: sPreset.p,
            fat: sPreset.f,
            carbs: sPreset.c,
          });
        }

        // 4. 運動ログ（週4〜5回ペース + 今日）
        let todayWorkoutCal = 0;
        if (dayIndex % 3 !== 1 || i === 0) {
          const wPreset = WORKOUT_PRESETS[dayIndex % WORKOUT_PRESETS.length];
          todayWorkoutCal = wPreset.cal;
          workoutsToInsert.push({
            date: dateStr,
            timestamp: `${dateStr}T18:15:00`,
            type: wPreset.type,
            durationMinutes: wPreset.duration,
            intensity: wPreset.intensity,
            caloriesBurned: wPreset.cal,
            memo: wPreset.memo,
          });
        }

        // 5. 活動ログ & Readinessスコア算出
        const steps = Math.round(7200 + r1 * 4800 + (todayWorkoutCal > 0 ? 1800 : 0));
        const activeMinutes = Math.round(35 + r2 * 45 + (todayWorkoutCal > 0 ? 25 : 0));
        const readinessScore = calculateReadinessScore(
          durationHours,
          qualityScore,
          prevWorkoutCal,
          prevActiveMin
        );

        activitiesToInsert.push({
          date: dateStr,
          steps,
          activeMinutes,
          readinessScore,
        });

        prevWorkoutCal = todayWorkoutCal;
        prevActiveMin = activeMinutes;
      }

      await Promise.all([
        db.meals.bulkAdd(mealsToInsert),
        db.workouts.bulkAdd(workoutsToInsert),
        db.sleepLogs.bulkAdd(sleepsToInsert),
        db.bodyMetrics.bulkAdd(metricsToInsert),
        db.activities.bulkAdd(activitiesToInsert),
      ]);
    }
  );
}

export async function clearAllHealthData(): Promise<void> {
  await db.transaction(
    "rw",
    [db.meals, db.workouts, db.sleepLogs, db.bodyMetrics, db.activities],
    async () => {
      await Promise.all([
        db.meals.clear(),
        db.workouts.clear(),
        db.sleepLogs.clear(),
        db.bodyMetrics.clear(),
        db.activities.clear(),
      ]);
    }
  );
}

export async function exportAllDataAsJson(): Promise<string> {
  const [meals, workouts, sleepLogs, bodyMetrics, activities] = await Promise.all([
    db.meals.toArray(),
    db.workouts.toArray(),
    db.sleepLogs.toArray(),
    db.bodyMetrics.toArray(),
    db.activities.toArray(),
  ]);

  let settings = null;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("vital_pulse_user_settings_v1");
      if (raw) {
        const parsedSettings = JSON.parse(raw);
        settings = {
          ...parsedSettings,
          geminiApiKey: "", // セキュリティのためマスク
        };
      }
    } catch (e) {
      console.warn("Failed to read user settings for export", e);
    }
  }

  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      data: {
        meals,
        workouts,
        sleepLogs,
        bodyMetrics,
        activities,
      },
    },
    null,
    2
  );
}

export async function importAllDataFromJson(jsonString: string): Promise<void> {
  const parsed = JSON.parse(jsonString);
  const payload = parsed.data ?? parsed;
  const importedSettings = parsed.settings ?? payload.settings;

  if (importedSettings && typeof window !== "undefined") {
    try {
      let currentApiKey = "";
      const currentRaw = window.localStorage.getItem("vital_pulse_user_settings_v1");
      if (currentRaw) {
        const cur = JSON.parse(currentRaw);
        currentApiKey = cur.geminiApiKey || "";
      }
      const mergedSettings = {
        ...importedSettings,
        geminiApiKey: currentApiKey || importedSettings.geminiApiKey || "",
      };
      window.localStorage.setItem(
        "vital_pulse_user_settings_v1",
        JSON.stringify(mergedSettings)
      );
    } catch (e) {
      console.warn("Failed to merge settings on import", e);
    }
  }

  await db.transaction(
    "rw",
    [db.meals, db.workouts, db.sleepLogs, db.bodyMetrics, db.activities],
    async () => {
      // 既存データの読み出し
      const [existingSleeps, existingMetrics, existingActivities] = await Promise.all([
        db.sleepLogs.toArray(),
        db.bodyMetrics.toArray(),
        db.activities.toArray(),
      ]);

      await Promise.all([
        db.meals.clear(),
        db.workouts.clear(),
        db.sleepLogs.clear(),
        db.bodyMetrics.clear(),
        db.activities.clear(),
      ]);

      if (Array.isArray(payload.meals)) {
        await db.meals.bulkAdd(
          payload.meals.map(({ id, ...m }: any) => m)
        );
      }
      if (Array.isArray(payload.workouts)) {
        await db.workouts.bulkAdd(
          payload.workouts.map(({ id, ...w }: any) => w)
        );
      }

      // 1日1件テーブルの重複排除（既存データ + インポートデータ。後から来たインポートデータを優先して最新1件とする）
      // sleepLogs
      const sleepMap = new Map<string, Omit<SleepLog, "id">>();
      for (const s of existingSleeps) {
        const { id, ...rest } = s;
        sleepMap.set(s.date, rest);
      }
      if (Array.isArray(payload.sleepLogs)) {
        for (const s of payload.sleepLogs) {
          const { id, ...rest } = s;
          sleepMap.set(s.date, rest);
        }
      }
      if (sleepMap.size > 0) {
        await db.sleepLogs.bulkAdd(Array.from(sleepMap.values()));
      }

      // bodyMetrics
      const metricMap = new Map<string, Omit<BodyMetricLog, "id">>();
      for (const b of existingMetrics) {
        const { id, ...rest } = b;
        metricMap.set(b.date, rest);
      }
      if (Array.isArray(payload.bodyMetrics)) {
        for (const b of payload.bodyMetrics) {
          const { id, ...rest } = b;
          metricMap.set(b.date, rest);
        }
      }
      if (metricMap.size > 0) {
        await db.bodyMetrics.bulkAdd(Array.from(metricMap.values()));
      }

      // activities
      const activityMap = new Map<string, Omit<ActivityLog, "id">>();
      for (const a of existingActivities) {
        const { id, ...rest } = a;
        activityMap.set(a.date, rest);
      }
      if (Array.isArray(payload.activities)) {
        for (const a of payload.activities) {
          const { id, ...rest } = a;
          activityMap.set(a.date, rest);
        }
      }
      if (activityMap.size > 0) {
        await db.activities.bulkAdd(Array.from(activityMap.values()));
      }
    }
  );
}

