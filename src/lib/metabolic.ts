import { calculateChronologicalAge, type BiologicalSex } from "./settings";

export interface MetabolicAndBioAgeSummary {
  chronologicalAge: number;
  vitalBioAge: number; // 健康年齢・体内年齢
  bioAgeDiff: number; // マイナスなら実年齢より若い
  personalBmr: number; // あなたの基礎代謝 (kcal/日)
  standardAgeBmr: number; // 同性・同年代の平均的な基礎代謝 (kcal/日)
  bmrDiffFromStandard: number; // 平均基礎代謝との差
  estimatedTdee: number; // 本日の総消費カロリー (基礎代謝 + 歩数NEAT + 運動消費)
  intakeCalories: number; // 本日の摂取カロリー
  calorieBalance: number; // 摂取 - 総消費 (マイナスなら脂肪燃焼アンダーカロリー)
  balanceVsBmr: number; // 摂取 - 基礎代謝 (基礎代謝割れチェック用)
  bmi: number;
  leanBodyMassKg: number; // 除脂肪体重 (筋肉・骨・内臓)
  metabolicComment: string;
}

/**
 * 日本人の年齢階層別・性別ごとの標準基礎代謝基準値 (厚生労働省「日本人の食事摂取基準」参考)
 */
function getJapaneseStandardBmr(age: number, gender: BiologicalSex): number {
  if (gender === "male") {
    if (age < 30) return 1550;
    if (age < 50) return 1530;
    if (age < 65) return 1400;
    return 1290;
  } else {
    if (age < 30) return 1180;
    if (age < 50) return 1150;
    if (age < 65) return 1100;
    return 1020;
  }
}

/**
 * 年齢・性別ごとの標準体脂肪率中央値
 */
function getStandardBodyFatPct(age: number, gender: BiologicalSex): number {
  if (gender === "male") {
    return age < 30 ? 16.5 : age < 50 ? 18.5 : 20.0;
  }
  return age < 30 ? 23.0 : age < 50 ? 25.0 : 27.0;
}

/**
 * プロフィール＋本日の体組成・活動・食事から「基礎代謝比較」「カロリー収支」「健康年齢（Vital Bio-Age）」を算出
 */
export function calculateMetabolicAndBioAge(params: {
  birthDate: string;
  gender: BiologicalSex;
  heightCm: number;
  weightKg: number;
  bodyFatPercentage: number;
  intakeCalories: number;
  workoutCalories: number;
  steps: number;
  sleepHours: number;
  readinessScore: number;
}): MetabolicAndBioAgeSummary {
  const {
    birthDate,
    gender,
    heightCm,
    weightKg,
    bodyFatPercentage,
    intakeCalories,
    workoutCalories,
    steps,
    sleepHours,
    readinessScore,
  } = params;

  const chronologicalAge = calculateChronologicalAge(birthDate);
  const heightM = Math.max(1.2, heightCm / 100);
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  // 除脂肪体重 (LBM)
  const leanBodyMassKg = Number(
    (weightKg * (1 - Math.min(55, Math.max(4, bodyFatPercentage)) / 100)).toFixed(1)
  );

  // 1. 基礎代謝 (BMR) の算出
  // ミフリン・セントジョール式 (身長・体重・年齢・性別) と ッチ・マカードル式 (除脂肪体重ベース) のハイブリッドで筋肉量も反映
  const mifflinBmr =
    gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * chronologicalAge + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * chronologicalAge - 161;

  const katchBmr = 370 + 21.6 * leanBodyMassKg;
  const personalBmr = Math.round(mifflinBmr * 0.55 + katchBmr * 0.45);

  // 同年代・同性の一般的な基礎代謝
  const standardAgeBmr = getJapaneseStandardBmr(chronologicalAge, gender);
  const bmrDiffFromStandard = personalBmr - standardAgeBmr;

  // 2. 総消費カロリー (TDEE) の算出
  // 基礎代謝 × 1.2 (安静・日常基本動作) + 歩数による消費 + ワークアウト消費
  const neatAndStepsCal = Math.round(personalBmr * 0.2 + steps * 0.035);
  const estimatedTdee = personalBmr + neatAndStepsCal + workoutCalories;

  const calorieBalance = intakeCalories - estimatedTdee;
  const balanceVsBmr = intakeCalories - personalBmr;

  // 3. 健康年齢・体内年齢 (Vital Bio-Age) の算出
  // (A) 体脂肪率スコア (-5歳 〜 +6歳)
  const stdFat = getStandardBodyFatPct(chronologicalAge, gender);
  const fatDiff = bodyFatPercentage - stdFat;
  const fatAgeOffset = Math.max(-5, Math.min(6, fatDiff * 0.8));

  // (B) 基礎代謝効率スコア (体重あたりの基礎代謝が高い＝筋肉質で若い: -3歳 〜 +3歳)
  const bmrPerKg = personalBmr / Math.max(35, weightKg);
  const stdBmrPerKg = gender === "male" ? 23.0 : 21.2;
  const bmrAgeOffset = Math.max(-3.5, Math.min(3.5, (stdBmrPerKg - bmrPerKg) * 1.1));

  // (C) 睡眠・活動・Readinessによるライフスタイル年齢補正 (-4歳 〜 +3歳)
  let lifestyleOffset = 0;
  if (readinessScore >= 82) lifestyleOffset -= 2.0;
  else if (readinessScore < 65) lifestyleOffset += 1.5;

  if (steps >= 8500) lifestyleOffset -= 1.2;
  else if (steps < 4500) lifestyleOffset += 1.0;

  if (sleepHours >= 7.0 && sleepHours <= 8.5) lifestyleOffset -= 1.0;
  else if (sleepHours < 6.0) lifestyleOffset += 1.2;

  const rawBioAge = Math.round(
    chronologicalAge + fatAgeOffset + bmrAgeOffset + lifestyleOffset
  );
  const vitalBioAge = Math.max(18, Math.min(95, rawBioAge));
  const bioAgeDiff = vitalBioAge - chronologicalAge;

  // 4. カロリー収支と基礎代謝のスマート講評
  let metabolicComment = "";
  if (intakeCalories === 0) {
    metabolicComment = `あなたの基礎代謝は ${personalBmr} kcal（同年代平均比 ${
      bmrDiffFromStandard >= 0 ? `+${bmrDiffFromStandard}` : bmrDiffFromStandard
    } kcal）です。食事を記録すると基礎代謝・総消費とのバランスをリアルタイム判定します。`;
  } else if (intakeCalories < personalBmr * 0.85) {
    metabolicComment = `⚠️ 現在の摂取カロリー（${intakeCalories}kcal）が基礎代謝（${personalBmr}kcal）を大きく下回っています。筋肉分解や代謝低下を防ぐため、タンパク質を中心に最低でも基礎代謝付近まで補給しましょう。`;
  } else if (calorieBalance >= -550 && calorieBalance <= -150) {
    metabolicComment = `🔥 基礎代謝（${personalBmr}kcal）をしっかり上回りつつ、総消費カロリー（${estimatedTdee}kcal）に対して ${Math.abs(
      calorieBalance
    )}kcal の理想的なアンダーカロリー（脂肪燃焼ゾーン）を維持できています！`;
  } else if (calorieBalance > -150 && calorieBalance <= 150) {
    metabolicComment = `✨ 摂取カロリー（${intakeCalories}kcal）と総消費カロリー（${estimatedTdee}kcal）がほぼ均衡しており、現在の体型・筋肉量の維持に最適なバランスです。`;
  } else {
    metabolicComment = `⚡ 本日は総消費カロリー（${estimatedTdee}kcal）に対して +${calorieBalance}kcal のオーバーカロリー状態です。筋肥大期でなければ、明日の有酸素運動または炭水化物量の微調整がおすすめです。`;
  }

  return {
    chronologicalAge,
    vitalBioAge,
    bioAgeDiff,
    personalBmr,
    standardAgeBmr,
    bmrDiffFromStandard,
    estimatedTdee,
    intakeCalories,
    calorieBalance,
    balanceVsBmr,
    bmi,
    leanBodyMassKg,
    metabolicComment,
  };
}
