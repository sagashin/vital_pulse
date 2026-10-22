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

export interface EstimatedMealNutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  matchedItems: string[];
  source: "dictionary" | "gemini" | "heuristic";
}

export const FOOD_DICTIONARY: Array<{
  keywords: string[];
  name: string;
  cal: number;
  p: number;
  f: number;
  c: number;
}> = [
  // プロテイン・サプリ・飲料
  { keywords: ["プロテイン", "ホエイ", "protein", "シェイク"], name: "ホエイプロテイン", cal: 120, p: 24, f: 1.5, c: 3 },
  { keywords: ["プロテインバー", "一本満足"], name: "プロテインバー", cal: 185, p: 16, f: 7, c: 14 },
  { keywords: ["ソイラテ", "豆乳ラテ"], name: "ソイラテ", cal: 115, p: 6, f: 5, c: 11 },
  { keywords: ["カフェラテ", "ラテ", "牛乳", "ミルク"], name: "カフェラテ", cal: 120, p: 5.5, f: 6, c: 9.5 },
  { keywords: ["コーヒー", "ブラックコーヒー", "お茶", "緑茶"], name: "ブラックコーヒー", cal: 6, p: 0.3, f: 0, c: 1 },

  // ご飯・主食・パン・麺類
  { keywords: ["納豆ご飯", "納豆ごはん"], name: "納豆ご飯", cal: 340, p: 12.5, f: 5, c: 60 },
  { keywords: ["卵かけご飯", "TKG", "たまごかけ"], name: "卵かけご飯", cal: 330, p: 11.5, f: 6, c: 56 },
  { keywords: ["玄米", "雑穀米", "もち麦"], name: "玄米ご飯", cal: 248, p: 4.5, f: 1.5, c: 53 },
  { keywords: ["白米", "ご飯", "ごはん", "ライス"], name: "白米ご飯", cal: 252, p: 3.8, f: 0.5, c: 55.7 },
  { keywords: ["おにぎり", "おむすび"], name: "おにぎり", cal: 185, p: 4.5, f: 1.5, c: 39 },
  { keywords: ["オートミール"], name: "オートミール", cal: 220, p: 8, f: 3.5, c: 39 },
  { keywords: ["トースト", "食パン", "パン", "ベーグル"], name: "トースト・パン", cal: 240, p: 7.5, f: 4.5, c: 42 },
  { keywords: ["サンドイッチ", "たまごサンド", "ハムサンド"], name: "サンドイッチ", cal: 340, p: 13, f: 15, c: 38 },
  { keywords: ["蕎麦", "そば", "ざるそば", "かけそば"], name: "蕎麦", cal: 340, p: 14, f: 2.2, c: 66 },
  { keywords: ["うどん", "讃岐うどん", "きつねうどん"], name: "うどん", cal: 360, p: 10.5, f: 2.5, c: 73 },
  { keywords: ["ラーメン", "中華そば", "豚骨", "味噌ラーメン", "醤油ラーメン"], name: "ラーメン", cal: 580, p: 21, f: 22, c: 72 },
  { keywords: ["パスタ", "スパゲッティ", "ペペロンチーノ", "カルボナーラ", "ボロネーゼ"], name: "パスタ", cal: 620, p: 22, f: 21, c: 82 },
  { keywords: ["チャーハン", "炒飯", "ピラフ"], name: "チャーハン", cal: 610, p: 16, f: 22, c: 84 },
  { keywords: ["カレー", "カレーライス", "スパイスカレー"], name: "カレーライス", cal: 690, p: 19, f: 23, c: 98 },
  { keywords: ["牛丼", "親子丼", "カツ丼", "海鮮丼", "ポキ丼", "丼"], name: "丼もの", cal: 680, p: 28, f: 22, c: 88 },
  { keywords: ["寿司", "お寿司", "刺身", "お造り"], name: "寿司・刺身", cal: 490, p: 29, f: 8, c: 72 },
  { keywords: ["ピザ", "マルゲリータ"], name: "ピザ", cal: 640, p: 26, f: 26, c: 74 },

  // 肉・魚・卵・大豆メインおかず
  { keywords: ["鶏むね", "サラダチキン", "鶏胸", "ささみ", "チキン"], name: "鶏むね肉・チキン", cal: 195, p: 36, f: 3.5, c: 1 },
  { keywords: ["焼き鳥", "やきとり", "唐揚げ", "からあげ"], name: "鶏肉料理", cal: 320, p: 26, f: 20, c: 8 },
  { keywords: ["ステーキ", "牛肉", "赤身肉", "ローストビーフ", "焼肉"], name: "ビーフステーキ・牛肉", cal: 410, p: 38, f: 26, c: 3 },
  { keywords: ["ハンバーグ"], name: "ハンバーグ", cal: 430, p: 24, f: 29, c: 16 },
  { keywords: ["豚肉", "生姜焼き", "とんかつ", "豚しゃぶ", "ポーク"], name: "豚肉料理", cal: 380, p: 26, f: 25, c: 10 },
  { keywords: ["餃子", "ぎょうざ", "シュウマイ"], name: "餃子 (6個)", cal: 290, p: 11, f: 15, c: 27 },
  { keywords: ["鮭", "サーモン", "焼き魚", "サバ", "鯖", "ホッケ", "ぶり", "魚"], name: "焼き魚・サーモン", cal: 230, p: 25, f: 13, c: 1 },
  { keywords: ["納豆"], name: "納豆 (1パック)", cal: 95, p: 8.3, f: 4.8, c: 5.4 },
  { keywords: ["豆腐", "冷奴", "湯豆腐", "厚揚げ"], name: "豆腐", cal: 110, p: 9.5, f: 6, c: 3.5 },
  { keywords: ["ゆで卵", "目玉焼き", "温泉卵", "卵焼き", "オムレツ", "卵", "たまご"], name: "卵料理", cal: 90, p: 7.5, f: 6.2, c: 0.5 },

  // 野菜・スープ・乳製品・フルーツ・間食
  { keywords: ["サラダ", "野菜", "ブロッコリー", "トマト", "キャベツ"], name: "サラダ・温野菜", cal: 85, p: 3.5, f: 4.5, c: 8 },
  { keywords: ["アボカド"], name: "アボカド", cal: 130, p: 1.8, f: 13, c: 4 },
  { keywords: ["味噌汁", "みそ汁", "豚汁", "スープ", "わかめスープ"], name: "味噌汁・スープ", cal: 65, p: 4, f: 2, c: 7 },
  { keywords: ["ヨーグルト", "オイコス", "ギリシャヨーグルト"], name: "プロテインヨーグルト", cal: 95, p: 11, f: 0.5, c: 11.5 },
  { keywords: ["バナナ"], name: "バナナ", cal: 86, p: 1.1, f: 0.2, c: 22.5 },
  { keywords: ["りんご", "キウイ", "いちご", "ブルーベリー", "みかん", "フルーツ", "果物"], name: "フルーツ", cal: 75, p: 0.8, f: 0.2, c: 18 },
  { keywords: ["ナッツ", "アーモンド", "くるみ"], name: "ミックスナッツ", cal: 165, p: 5, f: 14, c: 4 },
  { keywords: ["チョコ", "チョコレート", "ケーキ", "アイス", "スイーツ", "お菓子"], name: "スイーツ・チョコ", cal: 240, p: 3.5, f: 14, c: 25 },
  { keywords: ["定食", "弁当", "幕の内"], name: "バランス定食・弁当", cal: 680, p: 28, f: 20, c: 88 },
];

/**
 * 入力された食事テキスト（例: "鮭おにぎりとサラダチキンと味噌汁"）から、
 * だいたいのカロリーとPFC（タンパク質・脂質・炭水化物）を瞬時に自動推定する
 */
export function estimateNutritionFromMealText(text: string): EstimatedMealNutrition {
  const normalized = text
    .replace(/[０-９．]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .trim();

  if (!normalized) {
    return {
      calories: 550,
      protein: 30,
      fat: 16,
      carbs: 65,
      matchedItems: [],
      source: "heuristic",
    };
  }

  // 「納豆ご飯」がマッチしたときに「納豆」と「ご飯」が二重加算されないように、長いキーワードを優先してマッチング
  let remainingText = normalized.toLowerCase();
  const matched: typeof FOOD_DICTIONARY = [];

  const sortedDict = [...FOOD_DICTIONARY].sort(
    (a, b) => Math.max(...b.keywords.map((k) => k.length)) - Math.max(...a.keywords.map((k) => k.length))
  );

  for (const entry of sortedDict) {
    const sortedKeywords = [...entry.keywords].sort((a, b) => b.length - a.length);
    const hitKw = sortedKeywords.find((kw) => remainingText.includes(kw.toLowerCase()));
    if (hitKw) {
      matched.push(entry);
      // マッチしたキーワード部分を消費して二重カウントを防ぐ
      remainingText = remainingText.replaceAll(hitKw.toLowerCase(), " ");
    }
  }

  // 大盛り・小盛り・個数の補正
  let portionMultiplier = 1.0;
  if (normalized.includes("大盛") || normalized.includes("特盛") || normalized.includes("たっぷり")) {
    portionMultiplier = 1.25;
  } else if (normalized.includes("小盛") || normalized.includes("少なめ") || normalized.includes("半分")) {
    portionMultiplier = 0.78;
  }

  if (matched.length > 0) {
    const rawCal = matched.reduce((s, f) => s + f.cal, 0) * portionMultiplier;
    const rawP = matched.reduce((s, f) => s + f.p, 0) * portionMultiplier;
    const rawF = matched.reduce((s, f) => s + f.f, 0) * portionMultiplier;
    const rawC = matched.reduce((s, f) => s + f.c, 0) * portionMultiplier;

    return {
      calories: Math.round(rawCal),
      protein: Number(rawP.toFixed(1)),
      fat: Number(rawF.toFixed(1)),
      carbs: Number(rawC.toFixed(1)),
      matchedItems: matched.map((m) => m.name),
      source: "dictionary",
    };
  }

  // 辞書にない未知のメニュー名でもヒューリスティックでだいたいの数値を算出
  const calMatch = normalized.match(/(\d{2,4})\s*(?:kcal|カロリー|ｶﾛﾘｰ)/i);
  const calories = Math.round((calMatch ? parseInt(calMatch[1], 10) : 540) * portionMultiplier);

  return {
    calories,
    protein: Math.round((calories * 0.22) / 4),
    fat: Math.round((calories * 0.26) / 9),
    carbs: Math.round((calories * 0.52) / 4),
    matchedItems: [normalized],
    source: "heuristic",
  };
}

/**
 * Gemini APIキーが設定されている場合、テキストだけでどんな複雑な外食・自炊メニューでも高精度にPFCを推定する
 */
export async function estimateMealTextWithGemini(params: {
  mealText: string;
  apiKey?: string;
}): Promise<EstimatedMealNutrition> {
  const { mealText, apiKey = "" } = params;
  const localEst = estimateNutritionFromMealText(mealText);
  const trimmedKey = apiKey.trim();

  if (!trimmedKey || !mealText.trim()) {
    return localEst;
  }

  try {
    const prompt = `あなたは管理栄養士AIです。以下の食事内容テキストから、だいたいの総カロリー(kcal)とPFC(g)を推定し、純粋なJSONのみで回答してください。
食事内容: "${mealText}"
JSON形式:
{
  "calories": 数値,
  "protein": 数値,
  "fat": 数値,
  "carbs": 数値,
  "items": ["内訳品目1", "内訳品目2"]
}`;

    const modelsToTry = [
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
    ];
    for (const model of modelsToTry) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          trimmedKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        }
      );

      if (!res.ok) continue;
      const json = await res.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.calories) {
        return {
          calories: Math.round(Number(parsed.calories)),
          protein: Number(Number(parsed.protein || 25).toFixed(1)),
          fat: Number(Number(parsed.fat || 15).toFixed(1)),
          carbs: Number(Number(parsed.carbs || 60).toFixed(1)),
          matchedItems: Array.isArray(parsed.items) ? parsed.items : [mealText],
          source: "gemini",
        };
      }
    }
  } catch {
    // 失敗時はローカル推定をそのまま返す
  }

  return localEst;
}

export function parseNaturalHealthInput(text: string): ParsedVoiceCommand[] {
  const results: ParsedVoiceCommand[] = [];
  const normalized = text
    .replace(/[０-９．]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .trim();

  // 1. 体重・体脂肪の抽出
  const exerciseKeywords = ["ランニング", "走", "ベンチ", "スクワット", "ダンベル", "筋トレ", "挙上"];
  const hasExerciseKeyword = exerciseKeywords.some((kw) => normalized.includes(kw));

  const explicitWeightMatch = normalized.match(/(?:体重|今朝は|計測)\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|キロ|ｷﾛ)/i);
  const generalWeightMatch = normalized.match(/(\d{2,3}(?:\.\d+)?)\s*(?:kg|キロ|ｷﾛ)/i);

  let extractedWeight: number | null = null;
  if (explicitWeightMatch) {
    const val = parseFloat(explicitWeightMatch[1]);
    if (!isNaN(val)) extractedWeight = val;
  } else if (!hasExerciseKeyword && generalWeightMatch) {
    const val = parseFloat(generalWeightMatch[1]);
    if (!isNaN(val) && val >= 35 && val <= 180) {
      extractedWeight = val;
    }
  }

  const fatMatch = normalized.match(/(?:体脂肪(?:率)?\s*)?(\d{1,2}(?:\.\d+)?)\s*(?:%|パーセント|ﾊﾟｰｾﾝﾄ)/i);

  if (extractedWeight !== null) {
    const weightKg = extractedWeight;
    const bodyFatPercentage = fatMatch ? parseFloat(fatMatch[1]) : 17.5;
    results.push({
      category: "body",
      summary: `体重 ${weightKg}kg / 体脂肪率 ${bodyFatPercentage}%`,
      weightKg,
      bodyFatPercentage,
    });
  }

  // 2. 睡眠の抽出
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

  // 3. 運動の抽出
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

  // 4. 食事の抽出
  const est = estimateNutritionFromMealText(normalized);
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
    est.source === "dictionary";

  if (hasMealKeyword) {
    let mealType: MealType = "lunch";
    if (normalized.includes("朝")) mealType = "breakfast";
    else if (normalized.includes("昼") || normalized.includes("ランチ")) mealType = "lunch";
    else if (normalized.includes("夜") || normalized.includes("夕") || normalized.includes("ディナー")) mealType = "dinner";
    else if (normalized.includes("間食") || normalized.includes("おやつ")) mealType = "snack";

    if (est.source === "dictionary") {
      const description = est.matchedItems.join("・");
      results.push({
        category: "meal",
        summary: `${description} (推定 ${est.calories}kcal / P:${est.protein}g F:${est.fat}g C:${est.carbs}g)`,
        mealType,
        mealDescription: description,
        calories: est.calories,
        protein: est.protein,
        fat: est.fat,
        carbs: est.carbs,
      });
    } else if (extractedWeight === null && !matchedWorkout && !sleepMatch) {
      const cleanDesc =
        normalized
          .replace(/(朝ごはん|朝食|昼ごはん|昼食|夜ごはん|夕食|に|を|食べた|飲んだ)/g, "")
          .trim() || "AI推定バランスミール";

      results.push({
        category: "meal",
        summary: `${cleanDesc} (推定 ${est.calories}kcal / P:${est.protein}g F:${est.fat}g C:${est.carbs}g)`,
        mealType,
        mealDescription: cleanDesc,
        calories: est.calories,
        protein: est.protein,
        fat: est.fat,
        carbs: est.carbs,
      });
    }
  }

  return results;
}
