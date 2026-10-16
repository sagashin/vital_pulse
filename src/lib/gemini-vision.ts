import { type MealType } from "@/lib/db/schema";

export interface AnalyzedFoodPhotoResult {
  description: string;
  mealType: MealType;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  confidenceNote: string;
  items: Array<{
    name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  }>;
  source: "gemini" | "local-estimate";
  errorMessage?: string;
}

/**
 * 画像ファイルをリサイズ＆JPEG Base64に変換（IndexedDB保存やAPI送信の高速化）
 */
export async function fileToCompressedDataUrl(
  file: File,
  maxWidth = 1024
): Promise<{ dataUrl: string; base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const mimeType = "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, 0.85);
        const base64Data = dataUrl.split(",")[1] ?? "";
        resolve({ dataUrl, base64Data, mimeType });
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Gemini Multimodal APIを使って料理画像（＋補足テキスト）からカロリー・PFCを構造化JSONで推定する
 * API呼び出しの成功/失敗を明示し、失敗時にも理由を表示
 */
export async function analyzeFoodPhotoWithGemini(params: {
  base64Data: string;
  mimeType: string;
  fileName?: string;
  userHint?: string;
  apiKey?: string;
  model?: string;
}): Promise<AnalyzedFoodPhotoResult> {
  const {
    base64Data,
    mimeType,
    fileName = "",
    userHint = "",
    apiKey = "",
    model = "gemini-2.5-flash",
  } = params;

  const trimmedKey = apiKey.trim();
  let apiErrorMessage = "";

  if (trimmedKey && base64Data) {
    // 試行するモデル候補（設定値 -> gemini-2.5-flash -> gemini-1.5-flash）
    const candidateModels = Array.from(
      new Set([model.trim() || "gemini-2.5-flash", "gemini-2.5-flash", "gemini-1.5-flash"])
    );

    for (const targetModel of candidateModels) {
      try {
        const prompt = `あなたはプロの管理栄養士AIです。添付された料理・食事の写真${
          userHint ? `（ユーザー補足メモ: ${userHint}）` : ""
        }を正確に観察して解析し、必ず以下のJSONスキーマ形式のみで回答してください。マークダウンの\`\`\`jsonブロックなどは一切含めず、純粋なJSON文字列のみを出力してください。
{
  "description": "写真に写っている料理全体の具体的な日本語タイトル（例: 醤油ラーメン・半チャーハンセット、鶏むね肉の照り焼きと白米 など）",
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "calories": 数値(kcal),
  "protein": 数値(g),
  "fat": 数値(g),
  "carbs": 数値(g),
  "confidenceNote": "写真から判定した食材と栄養バランスの講評（1文）",
  "items": [
    { "name": "写真に見える個別の品目名", "calories": 数値, "protein": 数値, "fat": 数値, "carbs": 数値 }
  ]
}`;

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${encodeURIComponent(
          trimmedKey
        )}`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType || "image/jpeg",
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status} (${targetModel}): ${errText}`);
        }

        const json = await res.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
        const cleaned = rawText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```$/i, "")
          .trim();
        const parsed = JSON.parse(cleaned);

        return {
          description: parsed.description || "AI画像解析ミール",
          mealType: parsed.mealType || "lunch",
          calories: Math.round(Number(parsed.calories) || 520),
          protein: Number(Number(parsed.protein || 28).toFixed(1)),
          fat: Number(Number(parsed.fat || 15).toFixed(1)),
          carbs: Number(Number(parsed.carbs || 60).toFixed(1)),
          confidenceNote:
            parsed.confidenceNote ||
            `Gemini (${targetModel}) のマルチモーダル画像解析により、写真の料理を検出しました。`,
          items: Array.isArray(parsed.items) ? parsed.items : [],
          source: "gemini",
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Gemini API attempt with ${targetModel} failed:`, msg);
        apiErrorMessage = msg;
      }
    }
  }

  // APIキー未入力、または通信エラー時のフォールバック処理
  const hour = new Date().getHours();
  const defaultMealType: MealType =
    hour < 10 ? "breakfast" : hour < 15 ? "lunch" : hour < 21 ? "dinner" : "snack";

  // ユーザーの補足メモがある場合は、メモのキーワードから計算
  const hintText = (userHint || fileName).trim();
  const cleanDesc = hintText ? hintText : "スマート推定プレート";

  let estCal = 550;
  let estP = 32;
  let estF = 16;
  let estC = 62;

  const lower = hintText.toLowerCase();
  if (lower.includes("ラーメン") || lower.includes("そば") || lower.includes("うどん") || lower.includes("麺")) {
    estCal = 650;
    estP = 22;
    estF = 20;
    estC = 88;
  } else if (lower.includes("肉") || lower.includes("ステーキ") || lower.includes("牛") || lower.includes("チキン")) {
    estCal = 620;
    estP = 46;
    estF = 24;
    estC = 48;
  } else if (lower.includes("サラダ") || lower.includes("野菜")) {
    estCal = 380;
    estP = 24;
    estF = 12;
    estC = 38;
  }

  const reason = !trimmedKey
    ? "Gemini APIキーが設定されていないため、写真解析が行えませんでした。「目標・AI設定」からAPIキーを入力してください。"
    : `Gemini API通信エラー (${apiErrorMessage || "モデル接続失敗"}) が発生したため、写真の解析に失敗しました。キーの権限またはモデル設定をご確認ください。`;

  return {
    description: cleanDesc,
    mealType: defaultMealType,
    calories: estCal,
    protein: estP,
    fat: estF,
    carbs: estC,
    confidenceNote: reason,
    items: [{ name: cleanDesc, calories: estCal, protein: estP, fat: estF, carbs: estC }],
    source: "local-estimate",
    errorMessage: !trimmedKey ? undefined : apiErrorMessage,
  };
}
