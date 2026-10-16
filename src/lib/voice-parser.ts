import { type MealType } from "@/lib/db/schema";

export interface ParsedVoiceCommand {
  category: "body" | "meal" | "workout" | "sleep";
  summary: string;
  weightKg?: number;
  bodyFatPercentage?: number;
  mealType?: MealType;
  mealDescription?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  workoutType?: string;
  durationMinutes?: number;
  intensity?: 1 | 2 | 3 | 4 | 5;
  caloriesBurned?: number;
  sleepHours?: number;
  sleepQuality?: 1 | 2 | 3 | 4 | 5;
}

const FOOD_DICTIONARY: Array<{
  keywords: string[];
  name: string;
  cal: number;
  p: number;
  f: number;
  c: number;
}> = [
  { keywords: ["プロテイン", "ホエイ", "protein"], name: "ホエイプロテイン", cal: 120, p: 24, f: 1.5, c: 3 },
  { keywords: ["納豆ご飯", "納豆ごはん", "納豆"], name: "納豆ごはん", cal: 340, p: 12, f: 5, c: 62 },
  { keywords: ["卵かけご飯", "TKG", "たまごかけ"], name: "卵かけご飯", cal: 330, p: 11, f: 6, c: 58 },
  { keywords: ["鶏むね", "サラダチキン", "鶏胸"], name: "鶏むね肉グリル", cal: 195, p: 38, f: 3, c: 1 },
  { keywords: ["オートミール"], name: "オートミールボウル", cal: 260, p: 10, f: 5, c: 45 },
  { keywords: ["バナナ"], name: "バナナ", cal: 86, p: 1.1, f: 0.2, c: 22.5 },
  { keywords: ["ゆで卵", "卵", "たまご"], name: "ゆで卵", cal: 76, p: 6.5, f: 5.2, c: 0.2 },
  { keywords: ["ヨーグルト", "オイコス", "ギリシャ"], name: "ギリシャヨーグルト", cal: 95, p: 11, f: 0, c: 12 },
  { keywords: ["サラダ", "野菜"], name: "グリーンサラダ", cal: 85, p: 3, f: 5, c: 8 },
  { keywords: ["蕎麦", "そば"], name: "十割蕎麦", cal: 360, p: 14, f: 2.5, c: 70 },
  { keywords: ["カレー"], name: "スパイスカレー", cal: 680, p: 22, f: 24, c: 92 },
  { keywords: ["ステーキ", "牛肉", "赤身肉"], name: "赤身ビーフステーキ", cal: 420, p: 44, f: 24, c: 4 },
  { keywords: ["鮭", "サーモン"], name: "焼き鮭・サーモン", cal: 220, p: 26, f: 12, c: 1 },
  { keywords: ["おにぎり", "おむすび"], name: "おにぎり", cal: 185, p: 4.5, f: 1.5, c: 39 },
  { keywords: ["コーヒー", "カフェラテ", "ラテ"], name: "カフェラテ", cal: 110, p: 5.5, f: 5.5, c: 9 },
];

export function parseNaturalHealthInput(text: string): ParsedVoiceCommand[] {
  const results: ParsedVoiceCommand[] = [];
  const normalized = text
    .replace(/[０-９．]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .trim();

  // 1. 体重・体脂肪の抽出 ("体重65.4キロ、体脂肪18パーセント" or "67.2kg")
  const weightMatch = normalized.match(/(?:体重\s*)?(\d{2,3}(?:\.\d+)?)\s*(?:kg|キロ|ｷﾛ)/i);
  const fatMatch = normalized.match(/(?:体脂肪(?:率)?\s*)?(\d{1,2}(?:\.\d+)?)\s*(?:%|パーセント|ﾊﾟｰｾﾝﾄ)/i);

  if (weightMatch) {
    const weightKg = parseFloat(weightMatch[1]);
    const bodyFatPercentage = fatMatch ? parseFloat(fatMatch[1]) : 17.5;
    results.push({
      category: "body",
      summary: `体重 ${weightKg}kg / 体脂肪率 ${bodyFatPercentage}%`,
      weightKg,
      bodyFatPercentage,
    });
  }

  // 2. 睡眠の抽出 ("睡眠7.5時間" or "7時間半寝た")
  const sleepMatch = normalized.match(/(?:睡眠\s*)?(\d{1,2}(?:\.\d+)?)\s*時間(半)?(?:寝た|睡眠)?/);
  if (sleepMatch && (normalized.includes("睡眠") || normalized.includes("寝た") || normalized.includes("寝"))) {
    let sleepHours = parseFloat(sleepMatch[1]);
    if (sleepMatch[2]) sleepHours += 0.5;
    const sleepQuality: 1 | 2 | 3 | 4 | 5 = sleepHours >= 7.5 ? 5 : sleepHours >= 6.8 ? 4 : 3;
    results.push({
      category: "sleep",
      summary: `睡眠 ${sleepHours}時間 (質スコア: ${sleepQuality}/5)`,
      sleepHours,
      sleepQuality,
    });
  }

  // 3. 運動の抽出 ("ランニング30分" / "筋トレ45分")
  const workoutKeywords = ["ランニング", "ジョギング", "筋トレ", "ウォーキング", "散歩", "ヨガ", "ストレッチ", "HIIT", "バイク", "水泳", "ジム"];
  const matchedWorkout = workoutKeywords.find((kw) => normalized.includes(kw));
  if (matchedWorkout) {
    const minMatch = normalized.match(/(\d{1,3})\s*分/);
    const durationMinutes = minMatch ? parseInt(minMatch[1], 10) : 30;
    const calPerMin =
      matchedWorkout === "HIIT" ? 11 : matchedWorkout === "ランニング" ? 9.5 : matchedWorkout === "筋トレ" ? 7 : 4.5;
    const caloriesBurned = Math.round(durationMinutes * calPerMin);
    results.push({
      category: "workout",
      summary: `${matchedWorkout} ${durationMinutes}分 (約${caloriesBurned}kcal消費)`,
      workoutType: matchedWorkout,
      durationMinutes,
      intensity: matchedWorkout === "HIIT" ? 5 : matchedWorkout === "ランニング" || matchedWorkout === "筋トレ" ? 4 : 3,
      caloriesBurned,
    });
  }

  // 4. 食事の抽出 ("朝ごはんに納豆ご飯とプロテイン飲んだ" etc.)
  const matchedFoods = FOOD_DICTIONARY.filter((item) =>
    item.keywords.some((kw) => normalized.toLowerCase().includes(kw.toLowerCase()))
  );

  const hasMealKeyword =
    normalized.includes("朝ごはん") ||
    normalized.includes("朝食") ||
    normalized.includes("昼ごはん") ||
    normalized.includes("昼食") ||
    normalized.includes("ランチ") ||
    normalized.includes("夜ごはん") ||
    normalized.includes("夕食") ||
    normalized.includes("間食") ||
    normalized.includes("おやつ") ||
    normalized.includes("食べた") ||
    normalized.includes("飲んだ") ||
    matchedFoods.length > 0;

  if (hasMealKeyword) {
    let mealType: MealType = "lunch";
    if (normalized.includes("朝")) mealType = "breakfast";
    else if (normalized.includes("昼") || normalized.includes("ランチ")) mealType = "lunch";
    else if (normalized.includes("夜") || normalized.includes("夕") || normalized.includes("ディナー")) mealType = "dinner";
    else if (normalized.includes("間食") || normalized.includes("おやつ")) mealType = "snack";

    if (matchedFoods.length > 0) {
      const description = matchedFoods.map((f) => f.name).join("・");
      const calories = matchedFoods.reduce((sum, f) => sum + f.cal, 0);
      const protein = Number(matchedFoods.reduce((sum, f) => sum + f.p, 0).toFixed(1));
      const fat = Number(matchedFoods.reduce((sum, f) => sum + f.f, 0).toFixed(1));
      const carbs = Number(matchedFoods.reduce((sum, f) => sum + f.c, 0).toFixed(1));

      results.push({
        category: "meal",
        summary: `${description} (${calories}kcal / P:${protein}g F:${fat}g C:${carbs}g)`,
        mealType,
        mealDescription: description,
        calories,
        protein,
        fat,
        carbs,
      });
    } else if (!weightMatch && !matchedWorkout && !sleepMatch) {
      // 辞書にない食事名でもカロリー指定などがあれば抽出
      const calMatch = normalized.match(/(\d{2,4})\s*(?:kcal|カロリー|ｶﾛﾘｰ)/i);
      const calories = calMatch ? parseInt(calMatch[1], 10) : 520;
      const cleanDesc = normalized
        .replace(/(朝ごはん|朝食|昼ごはん|昼食|夜ごはん|夕食|に|を|食べた|飲んだ)/g, "")
        .trim() || "AI推定バランスミール";

      results.push({
        category: "meal",
        summary: `${cleanDesc} (推定 ${calories}kcal)`,
        mealType,
        mealDescription: cleanDesc,
        calories,
        protein: Math.round((calories * 0.22) / 4),
        fat: Math.round((calories * 0.26) / 9),
        carbs: Math.round((calories * 0.52) / 4),
      });
    }
  }

  return results;
}

